import { openSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import http from "node:http";

const rootDir = fileURLToPath(new URL("..", import.meta.url));
const runtimeDir = join(rootDir, ".codex", "runtime");
const pidPath = join(runtimeDir, "local-server.pid");
const outPath = join(runtimeDir, "local-server.out.log");
const errPath = join(runtimeDir, "local-server.err.log");
const host = process.env.ELASTIC_SPACE_HOST || "127.0.0.1";
const port = Number(process.env.ELASTIC_SPACE_PORT || "4174");
const healthUrl = `http://${host}:${port}/healthz`;

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function readPid() {
  try {
    return Number(readFileSync(pidPath, "utf8").trim()) || null;
  } catch {
    return null;
  }
}

function safeUnlink(filePath) {
  try {
    unlinkSync(filePath);
  } catch {
    // Ignore stale-lock cleanup failures and let status continue.
  }
}

function processIsAlive(pid) {
  if (!pid) {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function healthCheck() {
  return new Promise((resolve) => {
    const request = http.get(
      healthUrl,
      {
        timeout: 1200,
      },
      (response) => {
        response.resume();
        resolve(response.statusCode === 200);
      },
    );

    request.on("error", () => {
      resolve(false);
    });

    request.on("timeout", () => {
      request.destroy();
      resolve(false);
    });
  });
}

function cleanupPidFileIfStale() {
  const pid = readPid();
  if (pid && !processIsAlive(pid)) {
    safeUnlink(pidPath);
  }
}

async function ensureRuntimeDir() {
  await mkdir(runtimeDir, { recursive: true });
}

function tail(text, lines = 20) {
  return text.split(/\r?\n/).slice(-lines).join("\n").trim();
}

function readLogSnippet() {
  const stdout = (() => {
    try {
      return readFileSync(outPath, "utf8");
    } catch {
      return "";
    }
  })();
  const stderr = (() => {
    try {
      return readFileSync(errPath, "utf8");
    } catch {
      return "";
    }
  })();

  return {
    stdout: tail(stdout),
    stderr: tail(stderr),
  };
}

async function startServer() {
  await ensureRuntimeDir();
  cleanupPidFileIfStale();

  const existingPid = readPid();
  if (existingPid && processIsAlive(existingPid) && (await healthCheck())) {
    console.log(`already running at http://${host}:${port}`);
    return;
  }

  const outFd = openSync(outPath, "a");
  const errFd = openSync(errPath, "a");

  const child = spawn(process.execPath, ["server.mjs"], {
    cwd: rootDir,
    detached: true,
    stdio: ["ignore", outFd, errFd],
    env: {
      ...process.env,
      ELASTIC_SPACE_HOST: host,
      ELASTIC_SPACE_PORT: String(port),
    },
  });

  child.unref();
  writeFileSync(pidPath, `${child.pid}\n`, "utf8");

  for (let attempt = 0; attempt < 25; attempt += 1) {
    if (await healthCheck()) {
      console.log(`running at http://${host}:${port}`);
      return;
    }
    await sleep(200);
  }

  const logs = readLogSnippet();
  throw new Error(
    [
      `server failed to become healthy at ${healthUrl}`,
      logs.stdout ? `stdout:\n${logs.stdout}` : "",
      logs.stderr ? `stderr:\n${logs.stderr}` : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
  );
}

async function stopServer() {
  cleanupPidFileIfStale();
  const pid = readPid();

  if (!pid) {
    console.log("not running");
    return;
  }

  try {
    process.kill(pid, "SIGTERM");
  } catch {
    safeUnlink(pidPath);
    console.log("not running");
    return;
  }

  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (!processIsAlive(pid)) {
      safeUnlink(pidPath);
      console.log("stopped");
      return;
    }
    await sleep(150);
  }

  process.kill(pid, "SIGKILL");
  if (processIsAlive(pid)) {
    throw new Error(`failed to stop process ${pid}`);
  }

  safeUnlink(pidPath);
  console.log("stopped");
}

async function printStatus() {
  cleanupPidFileIfStale();
  const pid = readPid();
  const healthy = await healthCheck();

  if (!pid && healthy) {
    console.log(`healthy at http://${host}:${port} (not pid-managed)`);
    return;
  }

  if (!pid || !processIsAlive(pid)) {
    console.log("not running");
    return;
  }

  console.log(healthy ? `running at http://${host}:${port} (pid ${pid})` : `process alive but unhealthy (pid ${pid})`);
}

async function restartServer() {
  await stopServer();
  await startServer();
}

const command = process.argv[2] || "status";

try {
  if (command === "start") {
    await startServer();
  } else if (command === "stop") {
    await stopServer();
  } else if (command === "restart") {
    await restartServer();
  } else if (command === "status") {
    await printStatus();
  } else {
    throw new Error(`unknown command "${command}"`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
