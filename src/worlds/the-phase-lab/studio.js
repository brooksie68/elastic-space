// The Phase Lab — the studio. One open 1970s control room in three.js: the reel wall at the
// back (four Meshy reel-to-reel machines on a walnut credenza, reels turning at each track's own
// rate), monitors on the sides, and a walnut desk in front. The console itself is flat DOM (world.js +
// world.css) laid over the bottom of the window — no perspective on the software (James, 2026-09-07).
// The camera is fixed.
// world.js hands it a state object every frame: studio.update({ playing, master, tracks }).
import * as THREE from 'three';
import { GLTFLoader } from '../../lib/three/loaders/GLTFLoader.js';

const ROOM = { w: 13, d: 11, h: 3.9 };
const CAM = { x: 0, y: 1.62, z: 3.35, fov: 58, pitch: -0.09 };
const MACHINE_X = [-1.72, -0.58, 0.58, 1.72], MACHINE_Z = -1.95, MACHINE_H = 1.3, CREDENZA_H = 1.72;   // the credenza is tall so the whole deck clears the standing console
const MONITOR = { h: 2.2, y: 2.55, z: [-5.6, -3.9] };   // two per side, big and high on the side walls, angled to the seat
const D2R = Math.PI / 180;

export function createStudio({ canvas, base = './', panels = {} }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));

  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x07060a);
  scene.fog = new THREE.Fog(0x0a0908, 9, 22);
  const camera = new THREE.PerspectiveCamera(CAM.fov, 1, 0.05, 60);
  camera.position.set(CAM.x, CAM.y, CAM.z);

  const tex = new THREE.TextureLoader();
  function tile(name, rx, ry, srgb = true) {
    const t = tex.load(base + 'assets/tiles/' + name);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t;
  }

  // ---- the room ---------------------------------------------------------------------------
  const room = new THREE.Group(); scene.add(room);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.w, ROOM.d), new THREE.MeshStandardMaterial({ map: tile('carpet.png', 7, 6), roughness: 0.95, metalness: 0 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -ROOM.d / 2 + 3.2); floor.receiveShadow = true; room.add(floor);
  const zBack = -ROOM.d + 3.2, zFront = 3.2;
  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.w, ROOM.h), new THREE.MeshStandardMaterial({ map: tile('slats.png', 9, 2.6), roughness: 0.85 }));
  backWall.position.set(0, ROOM.h / 2, zBack); backWall.receiveShadow = true; room.add(backWall);
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x2a231c, roughness: 0.92 });
  const left = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.d, ROOM.h), wallMat); left.rotation.y = Math.PI / 2; left.position.set(-ROOM.w / 2, ROOM.h / 2, (zBack + zFront) / 2); room.add(left);
  const right = left.clone(); right.rotation.y = -Math.PI / 2; right.position.x = ROOM.w / 2; room.add(right);
  const front = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.w, ROOM.h), wallMat); front.rotation.y = Math.PI; front.position.set(0, ROOM.h / 2, zFront); room.add(front);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.w, ROOM.d), new THREE.MeshStandardMaterial({ map: tile('walnut.png', 6, 5), color: 0x5a5048, roughness: 0.8 }));
  ceil.rotation.x = Math.PI / 2; ceil.position.set(0, ROOM.h, (zBack + zFront) / 2); room.add(ceil);
  // soft cloud lights on the ceiling (James's sketch): glowing lozenges
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xfff1d8, emissive: 0xffe2b8, emissiveIntensity: 0.55, roughness: 1 });
  for (const [x, z, w] of [[-3.2, -4.5, 1.3], [0.4, -3.0, 1.7], [3.4, -5.2, 1.2], [-1.6, -0.4, 1.4], [2.6, 0.6, 1.1]]) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(w / 2, w / 2, 0.05, 28), cloudMat); c.scale.z = 0.45; c.position.set(x, ROOM.h - 0.03, z); room.add(c);
  }
  const foamMat = new THREE.MeshStandardMaterial({ map: tile('foam.png', 1, 1), roughness: 1 });
  const foamGeo = new THREE.BoxGeometry(0.06, 0.9, 0.9);
  for (const sx of [-1, 1]) for (let i = 0; i < 8; i++) for (let j = 0; j < 3; j++) {
    if ((i + j) % 2) continue;
    const f = new THREE.Mesh(foamGeo, foamMat); f.position.set(sx * (ROOM.w / 2 - 0.03), 0.75 + j * 1.05, zBack + 0.9 + i * 1.15); room.add(f);
  }
  const walnut = new THREE.MeshStandardMaterial({ map: tile('walnut.png', 3, 1), roughness: 0.55, metalness: 0.05 });
  const walnutFine = new THREE.MeshStandardMaterial({ map: tile('walnut.png', 1.2, 0.5), roughness: 0.5, metalness: 0.05 });
  const dado = new THREE.Mesh(new THREE.BoxGeometry(ROOM.w, 0.9, 0.08), walnut); dado.position.set(0, 0.45, zBack + 0.05); dado.receiveShadow = true; room.add(dado);
  const credenza = new THREE.Mesh(new THREE.BoxGeometry(4.7, CREDENZA_H, 0.8), walnut); credenza.position.set(0, CREDENZA_H / 2, MACHINE_Z); credenza.castShadow = credenza.receiveShadow = true; room.add(credenza);
  const credTop = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.04, 0.9), new THREE.MeshStandardMaterial({ color: 0x1a1613, roughness: 0.5, metalness: 0.2 })); credTop.position.set(0, CREDENZA_H + 0.02, MACHINE_Z); credTop.receiveShadow = true; room.add(credTop);
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 3.4), new THREE.MeshStandardMaterial({ color: 0x5a2f22, roughness: 1 }));
  rug.rotation.x = -Math.PI / 2; rug.position.set(0, 0.004, 0.9); rug.receiveShadow = true; room.add(rug);

  // ---- the desk: a plain walnut desk in the picture, under the flat console --------------------
  const bench = new THREE.Group(); scene.add(bench);
  const brushed = new THREE.MeshStandardMaterial({ color: 0x2a2823, roughness: 0.45, metalness: 0.7 });
  const top = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.05, 1.0), walnutFine); top.position.set(0, 0.86, 1.3); top.castShadow = top.receiveShadow = true; bench.add(top);
  const inset = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.012, 0.8), brushed); inset.position.set(0, 0.89, 1.3); bench.add(inset);
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.82, 0.6), walnut); plinth.position.set(0, 0.41, 1.15); plinth.castShadow = plinth.receiveShadow = true; bench.add(plinth);

  // ---- lights ------------------------------------------------------------------------------
  scene.add(new THREE.HemisphereLight(0x6b5a46, 0x0d0a08, 0.55));
  function spot(x, y, z, tx, ty, tz, color, intensity, angle, penumbra, shadow) {
    const s = new THREE.SpotLight(color, intensity, 0, angle, penumbra, 1.6); s.position.set(x, y, z); s.target.position.set(tx, ty, tz);
    s.castShadow = !!shadow; if (shadow) { s.shadow.mapSize.set(1024, 1024); s.shadow.bias = -0.0008; s.shadow.radius = 4; }
    scene.add(s); scene.add(s.target); return s;
  }
  spot(0, ROOM.h - 0.05, 1.6, 0, 1.0, 1.3, 0xffd6a4, 40, 0.7, 0.55, true);          // the bench pool
  spot(0, ROOM.h - 0.05, MACHINE_Z + 1.5, 0, CREDENZA_H + 0.65, MACHINE_Z, 0xffe0b8, 70, 0.95, 0.5, true); // the machines
  for (const sx of [-1, 1]) for (const z of MONITOR.z) spot(sx * (ROOM.w / 2 - 1.6), ROOM.h - 0.05, z + 0.4, sx * ROOM.w / 2, MONITOR.y, z, 0xffcf98, 30, 0.5, 0.6, false);
  for (const sx of [-2.6, 0, 2.6]) spot(sx, ROOM.h - 0.05, zBack + 1.2, sx, 1.4, zBack, 0xffd0a0, 16, 0.85, 0.9, false);
  const washes = [];
  for (const sx of [-1, 1]) { const p = new THREE.PointLight(0xff9a4a, 6, 7, 1.8); p.position.set(sx * (ROOM.w / 2 - 0.6), 1.2, -4.8); scene.add(p); washes.push(p); }
  const practical = new THREE.PointLight(0x7fb7ff, 3, 5, 1.8); practical.position.set(5.6, 1.05, zBack + 0.3); scene.add(practical);

  // ---- the machines ---------------------------------------------------------------------------
  const loader = new GLTFLoader();
  const machines = [];
  const reelMats = {
    flange: new THREE.MeshPhysicalMaterial({ color: 0x2a2a30, roughness: 0.3, metalness: 0.6, clearcoat: 0.5 }),
    tape: new THREE.MeshStandardMaterial({ color: 0x3a2418, roughness: 0.75, metalness: 0.05 }),
    hub: new THREE.MeshStandardMaterial({ color: 0xcfcfd2, roughness: 0.35, metalness: 0.9 }),
  };
  function makeReel(r) {
    const g = new THREE.Group();
    const flangeGeo = new THREE.CylinderGeometry(r, r, 0.004, 48);
    for (const z of [0.021, -0.021]) { const f = new THREE.Mesh(flangeGeo, reelMats.flange); f.rotation.x = Math.PI / 2; f.position.z = z; g.add(f); }
    const tape = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.82, r * 0.82, 0.036, 48), reelMats.tape); tape.rotation.x = Math.PI / 2; g.add(tape);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.24, r * 0.24, 0.056, 24), reelMats.hub); hub.rotation.x = Math.PI / 2; g.add(hub);
    const spokeGeo = new THREE.BoxGeometry(0.014, r * 0.72, 0.006);
    for (let i = 0; i < 3; i++) { const s = new THREE.Mesh(spokeGeo, reelMats.hub); s.position.set(Math.sin(i * 2.094) * r * 0.58, Math.cos(i * 2.094) * r * 0.58, 0.026); s.rotation.z = -i * 2.094; g.add(s); }
    return g;
  }
  function fitToHeight(obj, h) {
    const box = new THREE.Box3().setFromObject(obj); const size = box.getSize(new THREE.Vector3());
    const s = h / size.y; obj.scale.setScalar(s);
    const box2 = new THREE.Box3().setFromObject(obj); obj.position.y -= box2.min.y; obj.position.x -= (box2.min.x + box2.max.x) / 2; obj.position.z -= (box2.min.z + box2.max.z) / 2;
    return new THREE.Box3().setFromObject(obj);
  }
  function prep(gltf) { gltf.scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; if (o.material && o.material.map) o.material.map.anisotropy = 8; } }); return gltf.scene; }

  loader.load(base + 'assets/models/tape.glb', gltf => {
    const proto = prep(gltf);
    MACHINE_X.forEach((x, i) => {
      const g = new THREE.Group(); const body = proto.clone(); const box = fitToHeight(body, MACHINE_H); g.add(body);
      const w = box.max.x - box.min.x, h = box.max.y - box.min.y, zf = box.max.z;
      const r = w * 0.262;
      const reels = [makeReel(r), makeReel(r)];
      reels[0].position.set(-w * 0.242, h * 0.82, zf + 0.02); reels[1].position.set(w * 0.242, h * 0.82, zf + 0.02); reels.forEach(rl => g.add(rl));
      const tally = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), new THREE.MeshStandardMaterial({ color: 0x220000, emissive: 0xff2010, emissiveIntensity: 0 }));
      tally.position.set(0, h * 0.56, zf + 0.012); g.add(tally);
      g.position.set(x, CREDENZA_H + 0.04, MACHINE_Z); g.rotation.y = -x * 0.12;
      scene.add(g); machines.push({ group: g, reels, tally, spin: 0 });
    });
  }, undefined, e => console.warn('tape.glb', e));
  const monitors = [];
  loader.load(base + 'assets/models/monitor.glb', gltf => {
    const proto = prep(gltf);
    // four cabinets: two per side wall, up high, on walnut wall brackets, toed toward the seat
    for (const sx of [-1, 1]) for (const z of MONITOR.z) {
      const m = proto.clone(); const box = fitToHeight(m, MONITOR.h); const g = new THREE.Group(); g.add(m);
      const d = box.max.z - box.min.z;
      g.position.set(sx * (ROOM.w / 2 - d / 2 - 0.08), MONITOR.y - MONITOR.h / 2, z); g.rotation.y = -sx * (Math.PI / 2 - 0.35); scene.add(g); monitors.push(g);
      const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, d + 0.2), walnut); bracket.position.set(sx * (ROOM.w / 2 - d / 2 - 0.1), MONITOR.y - MONITOR.h / 2 - 0.05, z); bracket.rotation.y = -sx * (Math.PI / 2 - 0.35); bracket.castShadow = true; room.add(bracket);
    }
  }, undefined, e => console.warn('monitor.glb', e));

  // ---- the look: the whole view drifts a little with the mouse, eased ----------------------
  const look = { yaw: 0, pitch: 0, tyaw: 0, tpitch: 0 };
  // NO mouse movement (James, 2026-09-06: "kill the mouse movement entirely"). The look state stays at zero.

  // ---- state + frame ---------------------------------------------------------------------
  let state = { playing: false, master: 0, tracks: [] }, smooth = { master: 0 }, lastT = performance.now();
  function update(s) { state = s; }
  let sized = { w: 0, h: 0 };
  function resize() { const w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight; if (!w || !h || (w === sized.w && h === sized.h)) return; sized = { w, h }; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  window.addEventListener('resize', resize); resize();
  function render(dt) {
    resize();
    const k = 1 - Math.pow(0.002, dt);
    look.yaw += (look.tyaw - look.yaw) * k * 0.5; look.pitch += (look.tpitch - look.pitch) * k * 0.5;
    camera.rotation.set(look.pitch + CAM.pitch, look.yaw, 0, 'YXZ');
    camera.updateMatrixWorld(); camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
    smooth.master += (state.master - smooth.master) * Math.min(1, dt * 14);
    const lv = Math.min(1, smooth.master * 5);
    washes.forEach(p => { p.intensity = 4 + 14 * lv; });
    monitors.forEach(g => { g.scale.z = 1 + 0.02 * lv; });
    machines.forEach((mc, i) => {
      const t = state.tracks[i]; const on = !!(t && state.playing); const rate = t ? t.rate : 1;
      if (on) mc.spin += dt * 2.6 * rate;
      mc.reels[0].rotation.z = -mc.spin; mc.reels[1].rotation.z = -mc.spin * 0.82;
      mc.tally.material.emissiveIntensity = t ? (on ? 2.2 + 2 * Math.min(1, (t.level || 0) * 6) : 0.35) : 0;
    });
    renderer.render(scene, camera);
  }
  function frame() { const now = performance.now(); const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now; render(dt); requestAnimationFrame(frame); }
  requestAnimationFrame(frame);

  async function snapshot(name) {
    render(0.016);
    return fetch('/api/dev-snapshot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, dataUrl: canvas.toDataURL('image/jpeg', 0.9) }) }).then(r => r.json()).catch(e => ({ error: String(e) }));
  }
  const api = { update, snapshot, look, scene, camera, renderer, machines, setLook: (y, p) => { look.tyaw = y; look.tpitch = p; look.yaw = y; look.pitch = p; } };
  window.PhaseStudio = api;
  return api;
}
