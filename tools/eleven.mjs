#!/usr/bin/env node
// ElevenLabs asset-generation helper for Elastic Space.
// Authoring-time only: reads ELEVENLABS_API_KEY from the repo-root .env (gitignored)
// and writes audio files that get committed. The key must never ship in world code.
//
// Usage:
//   node tools/eleven.mjs voices [search]
//   node tools/eleven.mjs sfx "prompt" out.mp3 [--seconds N]
//   node tools/eleven.mjs tts "text" out.mp3 --voice <id or name> [--model <model_id>]
//   node tools/eleven.mjs music "prompt" out.mp3 [--ms N]   (experimental)

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const API = "https://api.elevenlabs.io/v1";
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function apiKey() {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY;
  try {
    const env = readFileSync(join(repoRoot, ".env"), "utf8");
    const m = env.match(/^ELEVENLABS_API_KEY=(.+)$/m);
    if (m) return m[1].trim();
  } catch {}
  fail("No ELEVENLABS_API_KEY found in environment or .env at repo root.");
}

function fail(msg) {
  console.error("eleven: " + msg);
  process.exit(1);
}

function flag(args, name, fallback) {
  const i = args.indexOf(name);
  if (i === -1) return fallback;
  return args[i + 1];
}

async function request(path, { method = "GET", body } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: {
      "xi-api-key": apiKey(),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    fail(`${method} ${path} -> HTTP ${res.status}\n${text.slice(0, 600)}`);
  }
  return res;
}

async function saveAudio(res, outPath) {
  const buf = Buffer.from(await res.arrayBuffer());
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, buf);
  console.log(`wrote ${outPath} (${(buf.length / 1024).toFixed(1)} KB)`);
}

async function listVoices(search) {
  const res = await request("/voices");
  const { voices = [] } = await res.json();
  const q = (search || "").toLowerCase();
  for (const v of voices) {
    const line = `${v.name} :: ${v.voice_id}`;
    if (!q || line.toLowerCase().includes(q)) console.log(line);
  }
}

async function resolveVoice(idOrName) {
  if (/^[A-Za-z0-9]{20,}$/.test(idOrName)) return idOrName;
  const res = await request("/voices");
  const { voices = [] } = await res.json();
  const hit = voices.find((v) => v.name.toLowerCase().includes(idOrName.toLowerCase()));
  if (!hit) fail(`No voice matching "${idOrName}". Run: node tools/eleven.mjs voices`);
  console.log(`voice: ${hit.name} (${hit.voice_id})`);
  return hit.voice_id;
}

const [cmd, ...args] = process.argv.slice(2);

switch (cmd) {
  case "voices":
    await listVoices(args[0]);
    break;

  case "sfx": {
    const [prompt, out] = args;
    if (!prompt || !out) fail('usage: sfx "prompt" out.mp3 [--seconds N]');
    const seconds = flag(args, "--seconds");
    const body = { text: prompt };
    if (seconds) body.duration_seconds = Number(seconds);
    const res = await request("/sound-generation", { method: "POST", body });
    await saveAudio(res, out);
    break;
  }

  case "tts": {
    const [text, out] = args;
    const voice = flag(args, "--voice");
    if (!text || !out || !voice) fail('usage: tts "text" out.mp3 --voice <id or name> [--model <model_id>]');
    const voiceId = await resolveVoice(voice);
    const body = {
      text,
      model_id: flag(args, "--model", "eleven_multilingual_v2"),
    };
    const res = await request(`/text-to-speech/${voiceId}`, { method: "POST", body });
    await saveAudio(res, out);
    break;
  }

  case "music": {
    const [prompt, out] = args;
    if (!prompt || !out) fail('usage: music "prompt" out.mp3 [--ms N]');
    const body = { prompt };
    const ms = flag(args, "--ms");
    if (ms) body.music_length_ms = Number(ms);
    const res = await request("/music", { method: "POST", body });
    await saveAudio(res, out);
    break;
  }

  default:
    fail("commands: voices | sfx | tts | music (see header comment for usage)");
}
