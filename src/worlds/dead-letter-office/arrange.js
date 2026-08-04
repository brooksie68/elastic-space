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
    setEye, getEye,
  } = ctx;

  const isArt = (item) => Boolean(WALL_ART[item.type]);
  const isSurf = (item) => Boolean(FURNITURE[item.type]?.surf);
  const SURF_Y_MAX = 2.2;            // highest surface clutter can ride
  const ROT_STEP = Math.PI / 4;      // 8 rotations: 4 wall-square + 4 diagonal
  const snapRot = (r) => Math.round(r / ROT_STEP) * ROT_STEP;
  const ART_Y_MIN = 0.35, ART_Y_MAX = 3.8;   // widened 2026-08-04 with drag-carried height

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const floorHit = new THREE.Vector3();
  const PM_R = 0.3;
  const INSET = 0.55;                 // dropped items keep a hand's width off the walls

  let selected = null;               // a record from ctx.records
  let dragging = false;
  let carrying = false;              // fresh from the palette: rides the cursor until a click sets it down
  const grabOffset = new THREE.Vector2();
  let helper = null;

  /* ---------------- panel ---------------- */

  const css = document.createElement('style');
  css.textContent = `
    #arrange-panel { position: fixed; left: 14px; bottom: 14px; z-index: 40;
      background: rgba(16, 18, 15, 0.92); border: 1px solid #4a5244; border-radius: 6px;
      padding: 10px 12px; width: 244px; color: #cfd6c4;
      font: 13px "Courier New", monospace; user-select: none;
      max-height: calc(100vh - 28px); overflow-y: auto; }
    #arrange-panel .pal-head { margin: 6px 0 3px; color: #8a927e; font-size: 12px;
      letter-spacing: 0.08em; }
    #arrange-panel h2 { margin: 0 0 2px; font-size: 14px; color: #e8eedb; }
    #arrange-panel .hint { margin: 0 0 8px; color: #8a927e; font-size: 12px; line-height: 1.35; }
    #arrange-panel .palette { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 8px; }
    #arrange-panel .palette button { font: 12px "Courier New", monospace; color: #cfd6c4;
      background: #232720; border: 1px solid #4a5244; border-radius: 4px;
      padding: 4px 3px; cursor: pointer; }
    #arrange-panel .palette button:hover { background: #2f352a; }
    #arrange-panel .palette button.sel { border-color: #d8e8a0; color: #e8eedb;
      background: #2f3a28; }
    #arrange-panel .palette button.sel.locked-sel { border-color: #ff8800; }
    #arrange-panel label { display: block; margin: 6px 0 1px; color: #a8b098; }
    #arrange-panel input[type=range] { width: 100%; accent-color: #7a8a5c; }
    #arrange-panel .row { display: flex; gap: 4px; margin-top: 8px; }
    #arrange-panel .row button { flex: 1; font: 12px "Courier New", monospace; color: #cfd6c4;
      background: #232720; border: 1px solid #4a5244; border-radius: 4px;
      padding: 5px 2px; cursor: pointer; }
    #arrange-panel .row button:hover { background: #2f352a; }
    #arrange-panel .row button.save { background: #33402a; }
    #arrange-panel .row button.danger { background: #402a2a; border-color: #6a4a44; }
    #arrange-panel .row button.danger:hover { background: #523430; }
    #arrange-panel #arrange-status { margin: 8px 0 0; min-height: 26px;
      color: #a8b098; font-size: 12px; line-height: 1.3; }
    #arrange-panel .row button.locked { background: #3a3f2c; border-color: #7a8a5c; }
    #arrange-panel #arrange-status.bad { color: #d88a70; }
    #arrange-panel .disabled { opacity: 0.4; pointer-events: none; }
  `;
  document.head.appendChild(css);

  const panel = document.createElement('div');
  panel.id = 'arrange-panel';
  panel.innerHTML = `
    <h2>arrange the office</h2>
    <p class="hint">click an item to pick it up &middot; drag on the floor &middot;
      wheel rotates (8 stops) &middot; wall art sticks to walls, wheel = height &middot;
      tabletop pieces land on whatever you drop them on &middot;
      Del removes &middot; L locks/unlocks the selected item &middot;
      R / F raises and lowers your eye</p>
    <div class="pal-head">furniture</div>
    <div class="palette"></div>
    <div class="pal-head">tabletop</div>
    <div class="palette palette-surf"></div>
    <div class="pal-head">wall art</div>
    <div class="palette palette-art"></div>
    <div class="ctl">
      <label>size <span data-v="scale"></span></label>
      <input type="range" data-k="scale" min="0.6" max="1.6" step="0.01">
      <label>shade <span data-v="shade"></span></label>
      <input type="range" data-k="shade" min="0.5" max="2.5" step="0.01">
    </div>
    <div class="row">
      <button data-act="lock">lock in place</button>
      <button data-act="dup">duplicate</button>
      <button data-act="del">remove</button>
    </div>
    <div class="row">
      <button data-act="clear" class="danger">clear the room</button>
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

  // palettes fill alphabetically by label (James, 2026-08-03); paletteButtons
  // maps type → button so a world click can light up its palette entry
  const paletteSurf = panel.querySelector('.palette-surf');
  const paletteArt = panel.querySelector('.palette-art');
  const byLabel = (a, b) => a[1].label.localeCompare(b[1].label);
  const paletteButtons = {};
  for (const [type, def] of Object.entries(FURNITURE).sort(byLabel)) {
    const b = document.createElement('button');
    b.textContent = def.label;
    b.addEventListener('click', () => spawn(type));
    paletteButtons[type] = b;
    // the rug is surf-flagged (no keep-out) but reads as furniture, not tabletop
    (def.surf && !def.rug ? paletteSurf : palette).appendChild(b);
  }
  for (const [type, def] of Object.entries(WALL_ART).sort(byLabel)) {
    const b = document.createElement('button');
    b.textContent = def.label;
    b.addEventListener('click', () => spawn(type));
    paletteButtons[type] = b;
    paletteArt.appendChild(b);
  }
  function highlightPalette(rec) {
    for (const b of Object.values(paletteButtons)) b.classList.remove('sel', 'locked-sel');
    if (!rec) return;
    const b = paletteButtons[rec.item.type];
    if (b) {
      b.classList.add('sel');
      if (rec.item.locked) b.classList.add('locked-sel');
      b.scrollIntoView({ block: 'nearest' });
    }
  }
  const lockBtn = panel.querySelector('[data-act=lock]');
  lockBtn.addEventListener('click', () => {
    if (!selected) { setStatus('select an item first, then lock it'); return; }
    selected.item.locked = !selected.item.locked;
    select(selected);                  // refresh helper color, button, status
  });
  panel.querySelector('[data-act=dup]').addEventListener('click', () => {
    if (selected) spawn(selected.item.type, selected.item);
  });
  panel.querySelector('[data-act=del]').addEventListener('click', removeSelected);
  panel.querySelector('[data-act=clear]').addEventListener('click', () => {
    if (!records.length) { setStatus('the room is already bare'); return; }
    if (!window.confirm(
      `Put away all ${records.length} placed items — furniture, clutter, and wall art?\n` +
      'Nothing is saved until you press "save layout".')) return;
    for (const rec of [...records]) removeFurnitureItem(rec);
    rebuildKeepOuts();
    select(null);
    setStatus('room cleared — save layout to keep it, or exit to abandon');
  });
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
      const locked = Boolean(rec.item.locked);
      helper = new THREE.BoxHelper(rec.group, locked ? 0xff8800 : 0xd8e8a0);   // orange = locked
      scene.add(helper);
      sliders.scale.value = rec.item.scale;
      sliders.shade.value = rec.item.shade;
      ctl.classList.toggle('disabled', locked);   // a locked item stays exactly as placed
      lockBtn.textContent = locked ? 'unlock' : 'lock in place';
      lockBtn.classList.toggle('locked', locked);
      showValues();
      const def = FURNITURE[rec.item.type] || WALL_ART[rec.item.type];
      setStatus(locked
        ? `${def.label} — locked. It stays. (unlock to move it)`
        : isArt(rec.item)
          ? `${def.label} — sticks to walls or furniture fronts; wheel raises/lowers`
          : isSurf(rec.item)
            ? `${def.label} — drops onto tables, shelves, or the floor; wheel rotates`
            : `${def.label} — drag to move, wheel rotates (8 stops)`);
    } else {
      ctl.classList.add('disabled');
      lockBtn.textContent = 'lock in place';
      lockBtn.classList.remove('locked');
      setStatus('nothing selected');
    }
    highlightPalette(rec);
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
      delete item.locked;               // a duplicate starts free
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
      if (FURNITURE[type]?.surf) item.y = 0;   // lands on the floor until dragged onto a surface
    }
    layout.items.push(item);
    const rec = art ? buildArtItem(item) : buildFurnitureItem(item);
    rebuildKeepOuts();
    select(rec);
    // in-hand placement (James, 2026-08-04): the new item rides the cursor —
    // spawning blind onto the floor kept burying lamps inside desks
    carrying = true;
    setStatus(`${(FURNITURE[item.type] || WALL_ART[item.type]).label} in hand — move the mouse, click to set it down (Esc cancels)`);
  }

  function removeSelected() {
    if (!selected) return;
    if (selected.item.locked) { setStatus('locked — unlock it before removing'); return; }
    removeFurnitureItem(selected);
    rebuildKeepOuts();
    select(null);
  }

  const clampX = (x) => Math.min(ROOM.x1 - INSET, Math.max(ROOM.x0 + INSET, x));
  const clampZ = (z) => Math.min(ROOM.z1 - INSET, Math.max(ROOM.z0 + INSET, z));

  // furniture clamps by its own rotated footprint, not the blanket inset — a
  // bookshelf's BACK can kiss the wall even though its center can't (James,
  // 2026-08-04: "I can only get it a foot up to the wall")
  const WALL_GAP = 0.02;
  function itemExtents(item) {
    const def = FURNITURE[item.type];
    if (!def) return { ex: INSET, ez: INSET };
    const hw = (def.fw * (item.scale ?? 1)) / 2, hd = (def.fd * (item.scale ?? 1)) / 2;
    const c = Math.abs(Math.cos(item.rotY ?? 0)), s = Math.abs(Math.sin(item.rotY ?? 0));
    return { ex: hw * c + hd * s, ez: hw * s + hd * c };
  }
  function clampItemXZ(item, x, z) {
    const { ex, ez } = itemExtents(item);
    item.x = Math.min(ROOM.x1 - ex - WALL_GAP, Math.max(ROOM.x0 + ex + WALL_GAP, x));
    item.z = Math.min(ROOM.z1 - ez - WALL_GAP, Math.max(ROOM.z0 + ez + WALL_GAP, z));
  }

  /* ---------------- the nav warning (red = he walks through it) ------------- */

  // TEMPORARILY OFF (James, 2026-08-03): the postmaster is benched while the
  // room is re-furnished, so nothing can "block his walk" — no red warnings,
  // place anything anywhere. Flip back on when he's rehired and repathed.
  const NAV_WARN = true;   // back on with the postmaster (2026-08-04)

  function blocksNav(item) {
    if (!NAV_WARN) return false;
    if (!FURNITURE[item.type] || FURNITURE[item.type].surf) return false;   // art + clutter: no footprint
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
      for (const m of rec.mats) {
        if (m.userData?.keepEmissive) continue;   // lamp glow / radio dial keep theirs
        m.emissive?.setHex(blocked ? 0x5a1408 : 0x000000);
      }
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

  // wall art drags against the actual WALLS, not the floor — intersecting the
  // floor plane with a high grab point put the anchor meters away and made the
  // snap ricochet between corners (the pendulum-clock bug, 2026-08-04)
  const WALL_PLANES = [
    new THREE.Plane(new THREE.Vector3(1, 0, 0), -ROOM.x0),   // west, faces +x
    new THREE.Plane(new THREE.Vector3(-1, 0, 0), ROOM.x1),   // east, faces -x
    new THREE.Plane(new THREE.Vector3(0, 0, 1), -ROOM.z0),   // north, faces +z
    new THREE.Plane(new THREE.Vector3(0, 0, -1), ROOM.z1),   // south, faces -z
  ];
  // art can also mount on a VERTICAL furniture face (the JOHN DOUGH sign on
  // the desk front, James 2026-08-04): raycast the furniture; a wall-ish face
  // (near-horizontal normal) wins over the room wall behind it
  function artFacePoint(e) {
    ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const meshes = [];
    for (const rec of records) {
      if (rec === selected || rec.art) continue;
      rec.group.traverse((o) => { if (o.isMesh) meshes.push(o); });
    }
    const hit = raycaster.intersectObjects(meshes, false)[0];
    if (!hit || !hit.face) return null;
    const n = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
    if (Math.abs(n.y) > 0.35) return null;            // top/bottom face — not art territory
    return {
      x: hit.point.x + n.x * 0.02,
      y: Math.min(ART_Y_MAX, Math.max(0.15, hit.point.y)),
      z: hit.point.z + n.z * 0.02,
      rotY: Math.atan2(n.x, n.z),
    };
  }

  const wallHitV = new THREE.Vector3();
  function wallPoint(e) {
    ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    let best = null, bestD = Infinity;
    for (const plane of WALL_PLANES) {
      if (raycaster.ray.direction.dot(plane.normal) >= 0) continue;   // back side
      const hit = raycaster.ray.intersectPlane(plane, wallHitV);
      if (!hit) continue;
      if (hit.y < 0 || hit.y > ROOM.h) continue;
      if (hit.x < ROOM.x0 - 0.05 || hit.x > ROOM.x1 + 0.05
        || hit.z < ROOM.z0 - 0.05 || hit.z > ROOM.z1 + 0.05) continue;
      const d = raycaster.ray.origin.distanceTo(hit);
      if (d < bestD) { bestD = d; best = hit.clone(); }
    }
    return best;
  }

  // surface clutter rides the first thing under the cursor — another item's
  // top (table, shelf, crate, even another parcel) or, failing that, the floor
  function surfacePoint(e) {
    ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const meshes = [];
    for (const rec of records) {
      if (rec === selected || rec.art) continue;
      rec.group.traverse((o) => { if (o.isMesh) meshes.push(o); });
    }
    const hit = raycaster.intersectObjects(meshes, false)[0];
    if (hit) {
      return { x: hit.point.x, y: Math.max(0, Math.min(SURF_Y_MAX, hit.point.y)), z: hit.point.z };
    }
    const p = raycaster.ray.intersectPlane(floorPlane, floorHit) ? floorHit : null;
    return p ? { x: p.x, y: 0, z: p.z } : null;
  }

  stage.addEventListener('pointerdown', (e) => {
    if (e.target.closest?.('#arrange-panel')) return;
    if (carrying && selected) {
      carrying = false;                 // the click sets the carried item down
      rebuildKeepOuts();
      select(selected);                 // refresh status to the normal hints
      e.stopImmediatePropagation();
      return;
    }
    const rec = pickRecord(e);
    if (rec && rec.item.locked) {
      select(rec);                      // shows the lock state; no pickup, the
      return;                           // camera drag proceeds right over it
    }
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
    if (!(dragging || carrying) || !selected) return;
    let moved = false;
    if (isArt(selected.item)) {
      const fp = artFacePoint(e);         // a furniture face under the cursor wins…
      if (fp) {
        selected.item.x = fp.x;
        selected.item.y = fp.y;
        selected.item.z = fp.z;
        selected.item.rotY = fp.rotY;
        selected.group.position.set(fp.x, fp.y, fp.z);
        selected.group.rotation.y = fp.rotY;
        moved = true;
      } else {
        const wp = wallPoint(e);          // …else straight to the wall
        if (wp) {
          snapArtToWall(selected.item, wp);
          // the drag carries height too now (James, 2026-08-04: "up and down,
          // just like the Mandala shop") — the wheel stays for fine-tuning
          selected.item.y = Math.min(ART_Y_MAX, Math.max(ART_Y_MIN, wp.y));
          selected.group.position.set(selected.item.x, selected.item.y, selected.item.z);
          selected.group.rotation.y = selected.item.rotY;
          moved = true;
        }
      }
    } else if (isSurf(selected.item)) {
      const sp = surfacePoint(e);         // no grab offset: the hit height must match the cursor
      if (sp) {
        clampItemXZ(selected.item, sp.x, sp.z);
        selected.item.y = sp.y;
        selected.group.position.set(selected.item.x, selected.item.y, selected.item.z);
        moved = true;
      }
    } else {
      const p = floorPoint(e);
      if (p) {
        clampItemXZ(selected.item, p.x + grabOffset.x, p.z + grabOffset.y);
        selected.group.position.set(selected.item.x, 0, selected.item.z);
        moved = true;
      }
    }
    if (moved) {
      syncTransforms(selected);
      refreshWarn();
    }
    if (dragging) e.stopImmediatePropagation();   // carrying still lets the camera look around
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
    if (selected.item.locked) return;   // locked: the wheel dollies right past it
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
        // a rotation can swing the footprint into the wall — nudge back in
        clampItemXZ(selected.item, selected.item.x, selected.item.z);
        selected.group.position.x = selected.item.x;
        selected.group.position.z = selected.item.z;
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
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS') {
      e.preventDefault();               // the browser's save-page dialog never helps
      e.stopImmediatePropagation();
      save();
      return;
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selected) { removeSelected(); e.stopImmediatePropagation(); }
    } else if (e.key === 'Escape' && selected) {
      if (carrying) {                   // cancel the carry: the item goes back in the box
        carrying = false;
        removeFurnitureItem(selected);
        rebuildKeepOuts();
        select(null);
        setStatus('put back');
        e.stopImmediatePropagation();
        return;
      }
      select(null);
      e.stopImmediatePropagation();
    } else if (e.code === 'KeyL' && selected) {
      selected.item.locked = !selected.item.locked;
      select(selected);                 // refresh outline color, button, status
      e.stopImmediatePropagation();
    }
    // (R/F eye height moved into world.js 2026-08-04 — it works everywhere
    // now, smooth while held; the world's key tracker drives it)
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
