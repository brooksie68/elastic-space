// radio-bake.mjs — squash an MP3 into a tinny 1957 AM-radio version.
// No ffmpeg on this machine: decode with audio-decode, DSP in plain JS
// (RBJ biquads), encode with @breezystack/lamejs. RMS-matched to the source
// so the bake doesn't just read as "quieter".
//
// Usage:
//   node tools/radio-bake.mjs <in.mp3> [more.mp3 ...] [--flags]
// Output: <in>-radio.mp3 next to each source (originals untouched).
//
// Tunables (defaults are the "aggressive AM" chain):
//   --hp <Hz>       high-pass corner, 4th-order   (default 300)
//   --lp <Hz>       low-pass corner, 4th-order    (default 3500)
//   --box <dB>      boxy midrange peak at 1.4kHz  (default 4)
//   --squash <dB>   compressor threshold below peak; bigger = more squash (default 20)
//   --drive <x>     soft-clip drive, keep low     (default 1.4)
//   --static <dB>   static bed level rel. to program, -60 = off (default -34)
//   --crackle <n>   dust ticks per second, 0 = off (default 1.5)
//   --kbps <n>      MP3 bitrate, mono              (default 128)

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import decode from 'audio-decode';
import lamejs from '@breezystack/lamejs';

const args = process.argv.slice(2);
const files = [];
const opt = { hp: 300, lp: 3500, box: 4, squash: 20, drive: 1.4, static: -34, crackle: 1.5, kbps: 128 };
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) { opt[args[i].slice(2)] = Number(args[++i]); }
  else files.push(args[i]);
}
if (!files.length) { console.error('usage: node tools/radio-bake.mjs <in.mp3> [--hp 300 --lp 3500 ...]'); process.exit(1); }

// RBJ cookbook biquad, processed in-place
function biquad(x, sr, type, f0, q, dbGain = 0) {
  const A = Math.pow(10, dbGain / 40);
  const w0 = 2 * Math.PI * f0 / sr, cw = Math.cos(w0), sw = Math.sin(w0);
  const al = sw / (2 * q);
  let b0, b1, b2, a0, a1, a2;
  if (type === 'hp') {
    b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = (1 + cw) / 2;
    a0 = 1 + al; a1 = -2 * cw; a2 = 1 - al;
  } else if (type === 'lp') {
    b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = (1 - cw) / 2;
    a0 = 1 + al; a1 = -2 * cw; a2 = 1 - al;
  } else { // peaking
    b0 = 1 + al * A; b1 = -2 * cw; b2 = 1 - al * A;
    a0 = 1 + al / A; a1 = -2 * cw; a2 = 1 - al / A;
  }
  b0 /= a0; b1 /= a0; b2 /= a0; a1 /= a0; a2 /= a0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const y = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = y; x[i] = y;
  }
}

const rms = (x) => {
  let s = 0;
  for (let i = 0; i < x.length; i++) s += x[i] * x[i];
  return Math.sqrt(s / x.length);
};

for (const file of files) {
  const buf = await decode(await readFile(file));
  const sr = buf.sampleRate;
  // audio-decode v4 returns {channelData: Float32Array[], sampleRate}
  const chans = buf.channelData;
  const n = chans[0].length;
  // mono sum
  const x = new Float32Array(n);
  for (const ch of chans) {
    for (let i = 0; i < n; i++) x[i] += ch[i] / chans.length;
  }
  const srcRms = rms(x);

  // AM bandwidth: 4th-order Butterworth HP + LP (cascaded biquads, Q pair .541/1.307)
  biquad(x, sr, 'hp', opt.hp, 0.541); biquad(x, sr, 'hp', opt.hp, 1.307);
  biquad(x, sr, 'lp', opt.lp, 0.541); biquad(x, sr, 'lp', opt.lp, 1.307);
  // small-speaker boxiness
  if (opt.box) biquad(x, sr, 'peak', 1400, 1.2, opt.box);

  // squash: feed-forward compressor (5ms attack, 120ms release, 5:1) then gentle soft clip
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(x[i]));
  const thresh = peak * Math.pow(10, -opt.squash / 20);
  const aAtk = Math.exp(-1 / (0.005 * sr)), aRel = Math.exp(-1 / (0.12 * sr));
  let env = 0;
  for (let i = 0; i < n; i++) {
    const a = Math.abs(x[i]);
    env = a > env ? aAtk * env + (1 - aAtk) * a : aRel * env + (1 - aRel) * a;
    let g = 1;
    if (env > thresh) g = Math.pow(env / thresh, (1 / 5) - 1); // ratio 5:1
    x[i] = Math.tanh(x[i] * g * opt.drive / peak) * peak;
  }

  // static bed + dust crackle, band-limited like the program
  if (opt.static > -60 || opt.crackle > 0) {
    const noise = new Float32Array(n);
    const bedGain = rms(x) * Math.pow(10, opt.static / 20);
    for (let i = 0; i < n; i++) noise[i] = (Math.random() * 2 - 1) * bedGain;
    const ticks = Math.floor(opt.crackle * n / sr);
    for (let t = 0; t < ticks; t++) {
      const at = Math.floor(Math.random() * (n - 50));
      const amp = (0.02 + Math.random() * 0.05) * (Math.random() < 0.5 ? -1 : 1);
      for (let j = 0; j < 40; j++) noise[at + j] += amp * Math.exp(-j / 6);
    }
    biquad(noise, sr, 'hp', 400, 0.707);
    biquad(noise, sr, 'lp', opt.lp, 0.707);
    for (let i = 0; i < n; i++) x[i] += noise[i];
  }

  // RMS-match to source, then safety peak limit
  const g = srcRms / rms(x);
  let post = 0;
  for (let i = 0; i < n; i++) post = Math.max(post, Math.abs(x[i] * g));
  const lim = post > 0.98 ? 0.98 / post : 1;
  const pcm = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, x[i] * g * lim));
    pcm[i] = v < 0 ? v * 32768 : v * 32767;
  }

  const enc = new lamejs.Mp3Encoder(1, sr, opt.kbps);
  const chunks = [];
  for (let i = 0; i < n; i += 1152) {
    const d = enc.encodeBuffer(pcm.subarray(i, Math.min(i + 1152, n)));
    if (d.length) chunks.push(Buffer.from(d));
  }
  const flush = enc.flush();
  if (flush.length) chunks.push(Buffer.from(flush));

  const out = file.replace(/\.mp3$/i, '') + '-radio.mp3';
  await writeFile(out, Buffer.concat(chunks));
  console.log(`${path.basename(file)} -> ${path.basename(out)}  ` +
    `(${(n / sr).toFixed(1)}s, srcRMS ${srcRms.toFixed(4)} -> outRMS ${(rms(x) * g * lim).toFixed(4)}, limiter x${lim.toFixed(3)})`);
}
