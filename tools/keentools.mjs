#!/usr/bin/env node
// KeenTools Cloud API pipeline — photos in, professional 3D head out.
// Key from repo-root .env (KEENTOOLS_API_KEY). Docs: https://cloud.keentools.io/docs
//
// Usage:
//   node tools/keentools.mjs build <out-dir> <focal-mm> <photo1> [photo2 ...]
//   node tools/keentools.mjs status <avatar-id>
//   node tools/keentools.mjs fetch <avatar-id> <out-dir>     (BILLED once per call)
//
// BILLING RULES (from their docs — do not "improve" this):
//   /process is billed on acceptance (released on failure).
//   /get-3d-model bills EVERY response with event:redirect, repeats included.
//   Poll get-status (free) until completed, then call get-3d-model ONCE;
//   inside it, retry-after responses are free — stop at first redirect.

import fs from 'node:fs';
import path from 'node:path';

const API = 'https://api.keentools.workers.dev';
const repo = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const envPath = path.join(repo, '..', '.env');
const KEY = fs.readFileSync(envPath, 'utf8').match(/KEENTOOLS_API_KEY\s*=\s*(\S+)/)?.[1];
if (!KEY) { console.error('no KEENTOOLS_API_KEY in .env'); process.exit(1); }

const auth = { Authorization: `Bearer ${KEY}` };
const log = (...a) => console.log('[keentools]', ...a);
const delay = (s) => new Promise((r) => setTimeout(r, s * 1000));

async function api(method, route, body) {
  const res = await fetch(API + route, {
    method,
    headers: { ...auth, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${route} -> ${res.status}: ${text}`);
  try { return JSON.parse(text); } catch { return text; }
}

async function getStatus(id) {
  return api('GET', `/v1/avatar/${id}/get-status`);
}

async function fetchModel(id, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const q = 'mesh_format=glb&mesh_lod=high_poly&blendshapes=arkit,expression&texture=png';
  // retry-after responses are free; the single redirect response is the charge
  for (;;) {
    const r = await api('GET', `/v1/avatar/${id}/get-3d-model?${q}`);
    if (r.event === 'retry-after') {
      log(`model not ready, waiting ${r.data.time_sec}s`);
      await delay(r.data.time_sec);
      continue;
    }
    if (r.event === 'redirect') {
      log('redirect received (billed) — downloading');
      const bin = await fetch(r.data.url);
      if (!bin.ok) throw new Error(`download failed: ${bin.status}`);
      const buf = Buffer.from(await bin.arrayBuffer());
      const out = path.join(outDir, 'head.glb');
      fs.writeFileSync(out, buf);
      log(`saved ${out} (${(buf.length / 1e6).toFixed(1)} MB)`);
      return out;
    }
    throw new Error('unexpected response: ' + JSON.stringify(r).slice(0, 300));
  }
}

const [cmd, ...args] = process.argv.slice(2);

if (cmd === 'status') {
  log(JSON.stringify(await getStatus(args[0]), null, 1));
} else if (cmd === 'fetch') {
  await fetchModel(args[0], args[1] || '.');
} else if (cmd === 'build') {
  const [outDir, focalStr, ...photos] = args;
  const focal = parseFloat(focalStr);
  if (!outDir || !focal || photos.length < 2) {
    console.error('usage: build <out-dir> <focal-mm> <photo1> <photo2> [...]');
    process.exit(1);
  }
  for (const p of photos) if (!fs.existsSync(p)) { console.error('missing', p); process.exit(1); }

  log(`init: ${photos.length} photos`);
  const init = await api('POST', '/v1/avatar/init', { image_count: photos.length });
  log('avatar_id:', init.avatar_id);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'avatar-id.txt'), init.avatar_id);

  for (let i = 0; i < photos.length; i++) {
    const bytes = fs.readFileSync(photos[i]);
    const ctype = photos[i].toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
    const up = await fetch(init.img_urls[i], {
      method: 'PUT', headers: { 'Content-Type': ctype }, body: bytes,
    });
    if (!up.ok) throw new Error(`upload ${i} failed: ${up.status}`);
    log(`uploaded ${path.basename(photos[i])} (${(bytes.length / 1024).toFixed(0)} KB)`);
  }

  log(`process: expressions on, focal ${focal}mm x${photos.length} (BILLED)`);
  await api('POST', `/v1/avatar/${init.avatar_id}/process`, {
    expressions_enabled: true,
    focal_length_type: {
      focal_length_type: 'manual',
      focal_length_values: photos.map(() => focal),
    },
  });

  for (;;) {
    await delay(10);
    const st = await getStatus(init.avatar_id);
    const s = typeof st === 'object' ? (st.status || JSON.stringify(st)) : st;
    log('status:', typeof s === 'string' ? s : JSON.stringify(s));
    const flat = JSON.stringify(st);
    if (flat.includes('completed')) break;
    if (flat.includes('failed')) { console.error('reconstruction failed'); process.exit(2); }
  }
  await fetchModel(init.avatar_id, outDir);
} else {
  console.error('commands: build | status | fetch');
  process.exit(1);
}
