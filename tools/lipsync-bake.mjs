// lipsync-bake.mjs — bake Rhubarb Lip Sync viseme timelines for voice clips.
//
// Usage:
//   node tools/lipsync-bake.mjs <audio.wav> [more.wav ...]     bake specific clips
//   node tools/lipsync-bake.mjs <folder>                       bake every un-baked wav/ogg in a folder
//
// For each clip this writes `<name>.visemes.json` next to the audio file —
// Rhubarb's JSON output ({ mouthCues: [{start, end, value}, ...] }) — which the
// Face Lab dialog bench and src/core/face-life.js consume directly.
//
// Accuracy tip: put the spoken text in `<name>.txt` next to the clip; when that
// file exists it is passed to Rhubarb as --dialogFile, which noticeably improves
// phoneme detection.
//
// Rhubarb itself eats WAV and OGG only. MP3 clips are handled by converting
// through Blender's bundled ffmpeg (aud module) first — no ffmpeg install
// needed on this machine. WAV from ElevenLabs is still the cleanest input.
// The Rhubarb binary lives under tools/rhubarb/ (gitignored). If missing,
// download Rhubarb-Lip-Sync-1.14.0-Windows.zip from
// https://github.com/DanielSWolf/rhubarb-lip-sync/releases and unzip it there.

import { execFile } from "node:child_process";
import { existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const toolsDir = dirname(fileURLToPath(import.meta.url));

function findRhubarb() {
  const root = join(toolsDir, "rhubarb");
  if (!existsSync(root)) return null;
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) stack.push(full);
      else if (name.toLowerCase() === "rhubarb.exe") return full;
    }
  }
  return null;
}

const rhubarb = findRhubarb();
if (!rhubarb) {
  console.error(
    "rhubarb.exe not found under tools/rhubarb/.\n" +
    "Download Rhubarb-Lip-Sync-1.14.0-Windows.zip from\n" +
    "https://github.com/DanielSWolf/rhubarb-lip-sync/releases and unzip into tools/rhubarb/.",
  );
  process.exit(1);
}

const BLENDER = process.env.BLENDER_PATH ||
  "C:\\Program Files\\Blender Foundation\\Blender 5.1\\blender.exe";

// Convert an mp3 to a temp mono 16kHz WAV via Blender's bundled ffmpeg. The aud
// module sometimes throws on the final partial frame after writing the whole
// file, so a non-zero exit is fine as long as the WAV came out non-trivial.
async function mp3ToWav(mp3) {
  if (!existsSync(BLENDER)) {
    throw new Error(`Blender not found at ${BLENDER} (needed for mp3 conversion; set BLENDER_PATH)`);
  }
  const wav = mp3.replace(/\.mp3$/i, ".tmp-bake.wav");
  const expr =
    "import aud\n" +
    `s = aud.Sound(r'${mp3}')\n` +
    "try:\n" +
    `    s.write(r'${wav}', 16000, aud.CHANNELS_MONO, aud.FORMAT_S16, aud.CONTAINER_WAV, aud.CODEC_PCM, 0, 0)\n` +
    "except Exception as e:\n" +
    "    print('aud tail error (ok if file is complete):', e)\n";
  try {
    await execFileAsync(BLENDER, ["--background", "--python-expr", expr]);
  } catch {
    // Blender exit code is unreliable here — judge by the output file instead.
  }
  if (!existsSync(wav) || statSync(wav).size < 1000) {
    throw new Error("mp3 conversion produced no usable WAV");
  }
  return wav;
}

const args = process.argv.slice(2);
if (!args.length) {
  console.error("Usage: node tools/lipsync-bake.mjs <audio.wav|.ogg|.mp3|folder> [...]");
  process.exit(1);
}

const clips = [];
for (const arg of args) {
  const full = resolve(arg);
  if (!existsSync(full)) {
    console.error("skip (not found):", arg);
    continue;
  }
  if (statSync(full).isDirectory()) {
    for (const name of readdirSync(full)) {
      if (/\.(wav|ogg|mp3)$/i.test(name) && !/\.tmp-bake\.wav$/i.test(name)) {
        clips.push(join(full, name));
      }
    }
  } else if (/\.(wav|ogg|mp3)$/i.test(full)) {
    clips.push(full);
  } else {
    console.error("skip (not wav/ogg/mp3):", arg);
  }
}

let baked = 0;
for (const clip of clips) {
  const out = clip.replace(/\.(wav|ogg|mp3)$/i, ".visemes.json");
  const dialog = clip.replace(/\.(wav|ogg|mp3)$/i, ".txt");
  process.stdout.write(`baking ${clip} ...`);
  let input = clip;
  let tempWav = null;
  try {
    if (/\.mp3$/i.test(clip)) {
      input = tempWav = await mp3ToWav(clip);
    }
    const cmd = ["-f", "json", "-o", out, "--extendedShapes", "GHX"];
    if (existsSync(dialog)) cmd.push("--dialogFile", dialog);
    cmd.push(input);
    await execFileAsync(rhubarb, cmd);
    console.log(` -> ${out}${existsSync(dialog) ? " (with dialog text)" : ""}`);
    baked += 1;
  } catch (err) {
    console.log(" FAILED");
    console.error(String(err.stderr || err.message).slice(0, 500));
  } finally {
    if (tempWav && existsSync(tempWav)) rmSync(tempWav);
  }
}
console.log(`done — ${baked}/${clips.length} clips baked`);
