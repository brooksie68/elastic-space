/*
 * Arrange mode for the Dead Letter Office archive (2026-07-27, James's brief:
 * "not full curate mode" — a palette of shelves/boxes/crates he can drop, drag,
 * wheel-rotate, size and shade, so the layout reads human-designed).
 *
 * Loaded dynamically by world.js when ?arrange=1 on the served copy. All item
 * math lives in world.js (builders, keep-outs, fuzz); this module is only the
 * interaction surface. Saves PUT /api/worlds/dead-letter-office/layout — the
 * server backs up the previous layout file on every save.
 */

export function initArrange(ctx) {
  const {
    THREE, scene, camera, stage, ROOM, FURNITURE, WALL_ART,
    layout, records, buildFurnitureItem, buildArtItem, removeFurnitureItem,
    rebuildKeepOuts, fuzzKeepOuts, itemKeepOut, applyShade, nav,
  } = ctx;

  const isArt = (item) => Boolean(WALL_ART[item.type]);
  const ROT_STEP = Math.PI / 4;      // 8 rotations: 4 wall-square + 4 diagonal
  const snapRot = (r) => Math.round(r / ROT_STEP) * ROT_STEP;
  const ART_Y_MIN = 0.7, ART_Y_MAX = 3.5;

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const floorHit = new THREE.Vector3();
  const PM_R = 0.3;
  const INSET = 0.55;                 // dropped items keep a hand's width off the walls

  let selected = null;               // a record from ctx.records
  let dragging = false;
  const grabOffset = new THREE.Vector2();
  let helper = null;

  /* ---------------- panel ---------------- */

  const css = document.createElement('style');
  css.textContent = `
    #arrange-panel { position: fixed; left: 14px; bottom: 14px; z-index: 40;
      background: rgba(16, 18, 15, 0.92); border: 1px solid #4a5244; border-radius: 6px;
      padding: 10px 12px; width: 232px; color: #cfd6c4;
      font: 12px "Courier New", monospace; user-select: none; }
    #arrange-panel h2 { margin: 0 0 2px; font-size: 13px; color: #e8eedb; }
    #arrange-panel .hint { margin: 0 0 8px; color: #8a927e; font-size: 11px; line-height: 1.35; }
    #arrange-panel .palette { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 8px; }
    #arrange-panel .palette button { font: 11px "Courier New", monospace; color: #cfd6c4;
      background: #232720; border: 1px solid #4a5244; border-radius: 4px;
      padding: 4px 3px; cursor: pointer; }
    #arrange-panel .palette button:hover { background: #2f352a; }
    #arrange-panel label { display: block; margin: 6px 0 1px; color: #a8b098; }
    #arrange-panel input[type=range] { width: 100%; accent-color: #7a8a5c; }
    #arrange-panel .row { display: flex; gap: 4px; margin-top: 8px; }
    #arrange-panel .row button { flex: 1; font: 11px "Courier New", monospace; color: #cfd6c4;
      background: #232720; border: 1px solid #4a5244; border-radius: 4px;
      padding: 5px 2px; cursor: pointer; }
    #arrange-panel .row button:hover { background: #2f352a; }
    #arrange-panel .row button.save { background: #33402a; }
    #arrange-panel #arrange-status { margin: 8px 0 0; min-height: 26px;
      color: #a8b098; font-size: 11px; line-height: 1.3; }
    #arrange-panel #arrange-status.bad { color: #d88a70; }
    #arrange-panel .disabled { opacity: 0.4; pointer-events: none; }
  `;
  document.head.appendChild(css);

  const panel = document.createElement('div');
  panel.id = 'arrange-panel';
  panel.innerHTML = `
    <h2>arrange the archive</h2>
    <p class="hint">click an item to pick it up &middot; drag on the floor &middot;
      wheel rotates (8 stops) &middot; wall art sticks to walls, wheel = height &middot;
      Del removes &middot; red = blocking the postmaster's walk</p>
    <div class="palette"></div>
    <div class="palette palette-art"></div>
    <div class="ctl">
      <label>size <span data-v="scale"></span></label>
      <input type="range" data-k="scale" min="0.6" max="1.6" step="0.01">
      <label>shade <span data-v="shade"></span></label>
      <input type="range" data-k="shade" min="0.5" max="1.5" step="0.01">
    </div>
    <div class="row">
      <button data-act="dup">duplicate</button>
      <button data-act="del">remove</button>
    </div>
    <div class="row">
      <button data-act="save" class="save">save layout</button>
      <button data-act="exit">exit</button>
    </div>
    <p id="arrange-status">nothing selected</p>
  `;
  document.body.appendChild(panel);
  const palette = panel.querySelector('.palette');
  const status = panel.querySelector('#arrange-status');
  const ctl = panel.querySelector('.ctl');
  const sliders = {};
  for (const input of panel.querySelectorAll('input[type=range]')) {
    sliders[input.dataset.k] = input;
    input.addEventListener('input', () => {
      if (!selected) return;
      const k = input.dataset.k;
      selected.item[k] = Number(input.value);
      if (k === 'scale') selected.group.scale.setScalar(selected.item.scale);
      else applyShade(selected.mats, selected.item.shade);
      syncTransforms(selected);
      refreshWarn();
      showValues();
    });
    input.addEventListener('change', rebuildKeepOuts);
  }

  for (const [type, def] of Object.entries(FURNITURE)) {
    const b = document.createElement('button');
    b.textContent = def.label;
    b.addEventListener('click', () => spawn(type));
    palette.appendChild(b);
  }
  const paletteArt = panel.querySelector('.palette-art');
  for (const [type, def] of Object.entries(WALL_ART)) {
    const b = document.createElement('button');
    b.textContent = def.label;
    b.addEventListener('click', () => spawn(type));
    paletteArt.appendChild(b);
  }
  panel.querySelector('[data-act=dup]').addEventListener('click', () => {
    if (selected) spawn(selected.item.type, selected.item);
  });
  panel.querySelector('[data-act=del]').addEventListener('click', removeSelected);
  panel.querySelector('[data-act=save]').addEventListener('click', save);
  panel.querySelector('[data-act=exit]').addEventListener('click', () => {
    location.href = location.pathname;
  });

  /* ---------------- selection + transforms ---------------- */

  function syncTransforms(rec) {
    rec.group.traverse((o) => o.updateMatrix?.());
    rec.group.updateMatrix();
    rec.group.updateMatrixWorld(true);
    if (helper) helper.update();
  }

  function showValues() {
    if (!selected) return;
    panel.querySelector('[data-v=scale]').textContent = selected.item.scale.toFixed(2);
    panel.querySelector('[data-v=shade]').textContent = selected.item.shade.toFixed(2);
  }

  function select(rec) {
    if (helper) { scene.remove(helper); helper.dispose(); helper = null; }
    selected = rec;
    if (rec) {
      helper = new THREE.BoxHelper(rec.group, 0xd8e8a0);
      scene.add(helper);
      sliders.scale.value = rec.item.scale;
      sliders.shade.value = rec.item.shade;
      ctl.classList.remove('disabled');
      showValues();
      const def = FURNITURE[rec.item.type] || WALL_ART[rec.item.type];
      setStatus(isArt(rec.item)
        ? `${def.label} — drag along the walls, wheel raises/lowers`
        : `${def.label} — drag to move, wheel rotates (8 stops)`);
    } else {
      ctl.classList.add('disabled');
      setStatus('nothing selected');
    }
    refreshWarn();
  }

  function setStatus(text, bad = false) {
    status.textContent = text;
    status.classList.toggle('bad', bad);
  }

  // wall art lives ON a wall: snap the item to whichever wall is nearest the
  // point, facing into the room, with a tiny per-item offset against z-fighting
  function snapArtToWall(item, p) {
    const off = 0.025 + ((item.seed ?? 0) % 7) * 0.004;
    const walls = [
      [Math.abs(p.x - ROOM.x0), () => { item.x = ROOM.x0 + off; item.z = clampZ(p.z); item.rotY = Math.PI / 2; }],
      [Math.abs(ROOM.x1 - p.x), () => { item.x = ROOM.x1 - off; item.z = clampZ(p.z); item.rotY = -Math.PI / 2; }],
      [Math.abs(p.z - ROOM.z0), () => { item.z = ROOM.z0 + off; item.x = clampX(p.x); item.rotY = 0; }],
      [Math.abs(ROOM.z1 - p.z), () => { item.z = ROOM.z1 - off; item.x = clampX(p.x); item.rotY = Math.PI; }],
    ];
    walls.sort((a, b) => a[0] - b[0])[0][1]();
  }

  function spawn(type, from = null) {
    const art = Boolean(WALL_ART[type]);
    const fwd = new THREE.Vector3();
    camera.getWorldDirection(fwd);
    let item;
    if (from) {
      item = { ...from, x: clampX(from.x + 0.6), z: clampZ(from.z + 0.6) };
      if (art) snapArtToWall(item, { x: from.x + 0.6, z: from.z + 0.6 });
    } else if (art) {
      item = {
        type, x: 0, z: 0, y: 2.0, rotY: 0, scale: 1, shade: 1,
        seed: 1 + Math.floor(Math.random() * 1e9),
      };
      // hang it on the wall the camera is looking toward
      snapArtToWall(item, {
        x: camera.position.x + fwd.x * 20,
        z: camera.position.z + fwd.z * 20,
      });
    } else {
      item = {
        type,
        x: clampX(camera.position.x + fwd.x * 3),
        z: clampZ(camera.position.z + fwd.z * 3),
        rotY: snapRot(Math.atan2(camera.position.x - clampX(camera.position.x + fwd.x * 3),
          camera.position.z - clampZ(camera.position.z + fwd.z * 3))),
        scale: 1, shade: 1,
        seed: 1 + Math.floor(Math.random() * 1e9),
      };
    }
    layout.items.push(item);
    const rec = art ? buildArtItem(item) : buildFurnitureItem(item);
    rebuildKeepOuts();
    select(rec);
  }

  function removeSelected() {
    if (!selected) return;
    removeFurnitureItem(selected);
    rebuildKeepOuts();
    select(null);
  }

  const clampX = (x) => Math.min(ROOM.x1 - INSET, Math.max(ROOM.x0 + INSET, x));
  const clampZ = (z) => Math.min(ROOM.z1 - INSET, Math.max(ROOM.z0 + INSET, z));

  /* ---------------- the nav warning (red = he walks through it) ------------- */

  function blocksNav(item) {
    if (!FURNITURE[item.type]) return false;   // wall art has no footprint
    const [x0, x1, z0, z1] = itemKeepOut(item);
    const inside = (x, z) => x > x0 - PM_R && x < x1 + PM_R && z > z0 - PM_R && z < z1 + PM_R;
    for (const [aKey, bKey] of nav.edges) {
      const a = nav.nodes[aKey], b = nav.nodes[bKey];
      for (let t = 0; t <= 1.0001; t += 0.05) {
        if (inside(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t)) return true;
      }
    }
    return false;
  }

  function refreshWarn() {
    let anyBlocked = false;
    for (const rec of records) {
      const blocked = blocksNav(rec.item);
      anyBlocked = anyBlocked || blocked;
      for (const m of rec.mats) m.emissive?.setHex(blocked ? 0x5a1408 : 0x000000);
    }
    if (anyBlocked) setStatus('red item blocks the postmaster’s walk — he will clip through it', true);
  }

  /* ---------------- pointer interaction (capture phase beats the camera) ---- */

  function pickRecord(e) {
    ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const meshes = [];
    for (const rec of records) rec.group.traverse((o) => { if (o.isMesh) { o.userData.arrangeRec = rec; meshes.push(o); } });
    const hit = raycaster.intersectObjects(meshes, false)[0];
    return hit ? hit.object.userData.arrangeRec : null;
  }

  function floorPoint(e) {
    ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    return raycaster.ray.intersectPlane(floorPlane, floorHit) ? floorHit : null;
  }

  stage.addEventListener('pointerdown', (e) => {
    if (e.target.closest?.('#arrange-panel')) return;
    const rec = pickRecord(e);
    if (rec) {
      select(rec);
      const p = floorPoint(e);
      if (p) grabOffset.set(rec.item.x - p.x, rec.item.z - p.z);
      dragging = true;
      stage.setPointerCapture(e.pointerId);
      e.stopImmediatePropagation();     // the camera never sees this drag
    } else if (selected) {
      select(null);                     // click-away deselects; camera drag proceeds
    }
  }, true);

  stage.addEventListener('pointermove', (e) => {
    if (!dragging || !selected) return;
    const p = floorPoint(e);
    if (p) {
      if (isArt(selected.item)) {
        snapArtToWall(selected.item, { x: p.x + grabOffset.x, z: p.z + grabOffset.y });
        selected.group.position.set(selected.item.x, selected.item.y ?? 2.0, selected.item.z);
        selected.group.rotation.y = selected.item.rotY;
      } else {
        selected.item.x = clampX(p.x + grabOffset.x);
        selected.item.z = clampZ(p.z + grabOffset.y);
        selected.group.position.set(selected.item.x, 0, selected.item.z);
      }
      syncTransforms(selected);
      refreshWarn();
    }
    e.stopImmediatePropagation();
  }, true);

  stage.addEventListener('pointerup', (e) => {
    if (!dragging) return;
    dragging = false;
    rebuildKeepOuts();
    e.stopImmediatePropagation();
  }, true);

  addEventListener('wheel', (e) => {
    if (e.target.closest?.('#arrange-panel')) {
      e.stopImmediatePropagation();     // no dolly under the panel
      return;
    }
    if (!selected) return;              // no selection: the wheel still dollies
    if (isArt(selected.item)) {
      // wall art: the wall owns the rotation; the wheel moves it up and down
      selected.item.y = Math.min(ART_Y_MAX, Math.max(ART_Y_MIN,
        (selected.item.y ?? 2.0) - e.deltaY * 0.002));
      selected.group.position.y = selected.item.y;
    } else {
      // furniture: 8 stops only — 4 wall-square, 4 diagonal (James 2026-07-28)
      wheelAcc += e.deltaY;
      const steps = Math.trunc(wheelAcc / 100);
      if (steps) {
        wheelAcc -= steps * 100;
        selected.item.rotY = snapRot(selected.item.rotY) + steps * ROT_STEP;
        selected.group.rotation.y = selected.item.rotY;
      }
    }
    syncTransforms(selected);
    refreshWarn();
    clearTimeout(wheelSettle);          // settle keep-outs once the wheel rests
    wheelSettle = setTimeout(rebuildKeepOuts, 300);
    e.preventDefault();
    e.stopImmediatePropagation();
  }, { capture: true, passive: false });
  let wheelSettle = null;
  let wheelAcc = 0;

  addEventListener('keydown', (e) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selected) { removeSelected(); e.stopImmediatePropagation(); }
    } else if (e.key === 'Escape' && selected) {
      select(null);
      e.stopImmediatePropagation();
    }
  }, true);

  /* ---------------- save ---------------- */

  async function save() {
    setStatus('saving…');
    try {
      const res = await fetch('/api/worlds/dead-letter-office/layout', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'furniture', items: layout.items }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || res.statusText);
      rebuildKeepOuts();
      const traps = fuzzKeepOuts(6000);
      if (traps.length) {
        setStatus(`saved, BUT this layout can trap the walker near ` +
          `(${traps[0][0].toFixed(1)}, ${traps[0][1].toFixed(1)}) — open up that gap`, true);
      } else {
        setStatus(`saved ✓ ${layout.items.length} items (previous layout backed up)`);
      }
    } catch (err) {
      setStatus(`save failed: ${err.message}`, true);
    }
  }

  rebuildKeepOuts();
  refreshWarn();
  select(null);
}
