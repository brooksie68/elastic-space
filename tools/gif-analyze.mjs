// GIF anatomy dump: frames, delays, palette, per-frame mean luminance.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2];

function lzwDecode(minCodeSize, data, pixelCount) {
  const out = new Uint8Array(pixelCount);
  let outPos = 0;
  const clear = 1 << minCodeSize;
  const eoi = clear + 1;
  let codeSize = minCodeSize + 1;
  let dict = [];
  const resetDict = () => {
    dict = [];
    for (let i = 0; i < clear; i++) dict[i] = [i];
    dict[clear] = []; dict[eoi] = null;
    codeSize = minCodeSize + 1;
  };
  resetDict();
  let bitPos = 0, prev = null;
  const readCode = () => {
    let code = 0;
    for (let i = 0; i < codeSize; i++) {
      const byte = data[bitPos >> 3];
      if (byte === undefined) return eoi;
      code |= ((byte >> (bitPos & 7)) & 1) << i;
      bitPos++;
    }
    return code;
  };
  while (outPos < pixelCount) {
    const code = readCode();
    if (code === clear) { resetDict(); prev = null; continue; }
    if (code === eoi) break;
    let entry;
    if (code < dict.length && dict[code]) entry = dict[code];
    else if (prev) entry = [...prev, prev[0]];
    else break;
    for (const p of entry) { if (outPos < pixelCount) out[outPos++] = p; }
    if (prev) {
      dict.push([...prev, entry[0]]);
      if (dict.length === (1 << codeSize) && codeSize < 12) codeSize++;
    }
    prev = entry;
  }
  return out;
}

function analyze(path) {
  const b = readFileSync(path);
  const sig = b.toString('ascii', 0, 6);
  const width = b.readUInt16LE(6), height = b.readUInt16LE(8);
  const packed = b[10];
  const gctFlag = packed >> 7, gctSize = 2 ** ((packed & 7) + 1);
  let pos = 13;
  let gct = null;
  if (gctFlag) {
    gct = [];
    for (let i = 0; i < gctSize; i++) gct.push([b[pos + i * 3], b[pos + i * 3 + 1], b[pos + i * 3 + 2]]);
    pos += gctSize * 3;
  }
  const frames = [];
  let pendingDelay = 0, pendingTransparent = null, loop = null;
  while (pos < b.length) {
    const block = b[pos];
    if (block === 0x3b) break; // trailer
    if (block === 0x21) { // extension
      const label = b[pos + 1];
      pos += 2;
      if (label === 0xf9) { // graphics control
        const size = b[pos];
        const flags = b[pos + 1];
        pendingDelay = b.readUInt16LE(pos + 2); // 1/100 s
        pendingTransparent = (flags & 1) ? b[pos + 4] : null;
        pos += size + 1;
        while (b[pos] !== 0) pos += b[pos] + 1;
        pos++;
      } else if (label === 0xff) { // application (NETSCAPE loop)
        const size = b[pos];
        const app = b.toString('ascii', pos + 1, pos + 1 + 8);
        pos += size + 1;
        while (b[pos] !== 0) {
          if (app === 'NETSCAPE' && b[pos] >= 3 && b[pos + 1] === 1) loop = b.readUInt16LE(pos + 2);
          pos += b[pos] + 1;
        }
        pos++;
      } else { // skip other extensions
        pos++;
        while (b[pos] !== 0) pos += b[pos] + 1;
        pos++;
      }
    } else if (block === 0x2c) { // image descriptor
      const fx = b.readUInt16LE(pos + 1), fy = b.readUInt16LE(pos + 3);
      const fw = b.readUInt16LE(pos + 5), fh = b.readUInt16LE(pos + 7);
      const fpacked = b[pos + 9];
      pos += 10;
      let palette = gct;
      if (fpacked >> 7) {
        const lctSize = 2 ** ((fpacked & 7) + 1);
        palette = [];
        for (let i = 0; i < lctSize; i++) palette.push([b[pos + i * 3], b[pos + i * 3 + 1], b[pos + i * 3 + 2]]);
        pos += lctSize * 3;
      }
      const minCodeSize = b[pos]; pos++;
      const chunks = [];
      while (b[pos] !== 0) { chunks.push(b.subarray(pos + 1, pos + 1 + b[pos])); pos += b[pos] + 1; }
      pos++;
      const data = Buffer.concat(chunks);
      const indices = lzwDecode(minCodeSize, data, fw * fh);
      let sum = 0, n = 0;
      const counts = new Map();
      for (const idx of indices) {
        if (idx === pendingTransparent) continue;
        const c = palette[idx] || [0, 0, 0];
        sum += (c[0] + c[1] + c[2]) / 3;
        n++;
        counts.set(idx, (counts.get(idx) || 0) + 1);
      }
      frames.push({
        rect: `${fw}x${fh}@${fx},${fy}`,
        delay: pendingDelay,
        mean: n ? Math.round(sum / n) : null,
        transparentPx: fw * fh - n,
        distinctColors: counts.size,
      });
      pendingDelay = 0; pendingTransparent = null;
    } else pos++;
  }
  return { sig, width, height, loop, gctSize: gctFlag ? gctSize : 0, frames };
}

for (const f of readdirSync(dir).filter(f => f.endsWith('.gif')).sort()) {
  const a = analyze(join(dir, f));
  console.log(`\n=== ${f} — ${a.width}x${a.height}, ${a.frames.length} frame(s), loop=${a.loop}, gct=${a.gctSize}`);
  const total = a.frames.reduce((s, fr) => s + fr.delay, 0);
  console.log(`  cycle: ${total} cs (${(total / 100).toFixed(2)}s)`);
  for (const [i, fr] of a.frames.entries()) {
    console.log(`  f${String(i).padStart(2)}: delay=${String(fr.delay).padStart(3)}cs mean-lum=${String(fr.mean).padStart(3)} colors=${fr.distinctColors} rect=${fr.rect}${fr.transparentPx ? ` transp=${fr.transparentPx}px` : ''}`);
  }
}
