// Elastic Space curator — reusable in-world gallery curation.
// Loaded by a world only when it boots with ?curate=1 (the admin panel's curate
// pill). The world hands us an adapter (see mandala-shop/world.js):
//   THREE, scene, camera, renderer, stage — the live three.js world
//   slug, layout                          — world id + the live layout object
//   walls, wallInset, floorY, railY      — analytic placement geometry
//   slots { add, remove, update, reset } — slot CRUD (world rebuilds meshes)
//   clickables, meshFor, getTexture      — art meshes + shared texture cache
//   toBlender, protectedIds, setInputLocks
// Layout geometry stays in Blender Z-up meters (the layout.js convention);
// everything here works in three.js space and converts on write.

export function initCurator(adapter) {
  const {
    THREE, scene, camera, stage, slug, layout,
    walls, wallInset, floorY, railY,
    slots, clickables, meshFor, getTexture, toBlender,
    protectedIds = [], setInputLocks,
  } = adapter;

  const clamp = THREE.MathUtils.clamp;
  const rad = THREE.MathUtils.degToRad;
  const kitNames = Object.keys(layout.kit ?? {});
  const defaultStyle = kitNames[0] ?? 'walnut';

  // ------------------------------------------------------------------ state
  let artFiles = [];
  const aspects = new Map();            // filename -> naturalWidth / naturalHeight
  let carrying = null;                  // { file, style, kindPref, w, h, ghost, hit }
  let selection = [];                   // slot ids (a triptych selects as a trio)
  let pieceDrag = null;                 // { moved } while dragging a selected piece
  let pointerDown = null;               // { x, y, moved, at } for click detection
  const undoStack = [];
  let undoTag = '', undoTagAt = 0;
  let dirty = false;
  let preview = false;
  const mouse = new THREE.Vector2(2, 2);   // offscreen until first move
  const raycaster = new THREE.Raycaster();
  const outlines = [];
  let idCounter = 1;

  // ------------------------------------------------------------- undo/dirty
  function snapshot(tag) {
    // Coalesce bursts of the same operation (nudge, resize) into one undo step.
    const now = performance.now();
    if (tag && tag === undoTag && now - undoTagAt < 900) { undoTagAt = now; return; }
    undoTag = tag ?? ''; undoTagAt = now;
    undoStack.push(JSON.parse(JSON.stringify(layout.slots)));
    if (undoStack.length > 60) undoStack.shift();
  }

  function markDirty() {
    dirty = true;
    ui.dirtyDot.classList.add('on');
    refreshBadges();
  }

  function undo() {
    const snap = undoStack.pop();
    if (!snap) { toast('Nothing to undo.'); return; }
    undoTag = '';
    deselect();
    slots.reset(snap);
    markDirty();
    toast('Undone.');
  }

  // ------------------------------------------------------------------- UI
  const ui = buildUi();

  function buildUi() {
    document.body.classList.add('curating');
    const style = document.createElement('style');
    style.textContent = `
      body.curating #help { display: none; }
      .cur-ui { font-family: "Palatino Linotype", Palatino, Georgia, serif; color: #e8d9bf;
        user-select: none; -webkit-user-select: none; }
      .cur-panel { background: rgba(23,16,10,0.92); border: 1px solid #4a3a22; border-radius: 5px; }
      #cur-dock { position: fixed; left: 0; top: 0; bottom: 0; z-index: 42;
        display: flex; flex-direction: column; align-items: flex-start; gap: 0; }
      #cur-topbar { display: flex; align-items: center; gap: 0.7rem; padding: 0.55rem 0.9rem;
        border-top: none; border-left: none; border-radius: 0 0 5px 0; }
      #cur-topbar .cur-title { letter-spacing: 0.22em; font-size: 1.05rem; color: #c9a24b; }
      #cur-dirty { width: 11px; height: 11px; border-radius: 50%; background: #453724; }
      #cur-dirty.on { background: #e0a53c; box-shadow: 0 0 7px #e0a53c; }
      .cur-btn { background: none; border: 1px solid #6b552f; border-radius: 4px; color: #e8d9bf;
        font: inherit; font-size: 1rem; letter-spacing: 0.06em; padding: 0.3rem 0.8rem;
        cursor: pointer; }
      .cur-btn:hover { border-color: #c9a24b; color: #ffe9bd; }
      .cur-btn.primary { border-color: #c9a24b; color: #ffd77e; }
      #cur-tray { flex: 1; min-height: 0; display: flex; flex-direction: column;
        width: fit-content; padding: 12px; border-left: none; border-top: none;
        border-radius: 0 0 5px 0; }
      #cur-tray .cur-tray-head { margin-bottom: 12px; }
      #cur-tray .cur-tray-head .cur-btn { width: 140px; }
      #cur-tiles { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 12px;
        overflow-y: auto; overflow-x: hidden; scrollbar-width: none; }
      #cur-tiles::-webkit-scrollbar { display: none; }
      .cur-tile { position: relative; flex: 0 0 auto; width: 140px; height: 140px; border-radius: 4px;
        border: 1px solid #4a3a22; overflow: hidden; cursor: pointer; background: #241a10;
        padding: 0; }
      .cur-tile:hover, .cur-tile.carrying { border-color: #c9a24b; }
      .cur-tile img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .cur-tile .cur-count { position: absolute; right: 3px; bottom: 3px; background: rgba(23,16,10,0.85);
        color: #c9a24b; border-radius: 3px; font-size: 0.9rem; padding: 0.05rem 0.35rem; }
      .cur-tile.blank { display: flex; align-items: center; justify-content: center;
        background: #e6dcc4; color: #6b552f; font-size: 0.85rem; letter-spacing: 0.08em; }
      #cur-hudwrap { position: fixed; left: 50%; transform: translateX(-50%); bottom: 1rem;
        z-index: 43; display: none; align-items: stretch; gap: 10px; max-width: min(94vw, 1100px); }
      #cur-hudwrap.show { display: flex; }
      #cur-hud { padding: 0.6rem 1rem; }
      #cur-hud .cur-row { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap;
        justify-content: center; }
      #cur-hud .cur-hint { font-size: 0.85rem; opacity: 0.65; margin-top: 0.45rem; text-align: center; }
      #cur-hud .cur-name { font-size: 0.95rem; opacity: 0.85; }
      #cur-frames { padding: 0.5rem 0.9rem; display: none; flex-direction: column;
        justify-content: center; gap: 0.4rem; }
      #cur-frames.show { display: flex; }
      #cur-frames .cur-frames-label { font-size: 0.78rem; letter-spacing: 0.2em; color: #c9a24b;
        opacity: 0.85; text-align: center; }
      #cur-frames .cur-swatches { display: grid; grid-template-columns: repeat(5, auto);
        gap: 7px; justify-content: center; }
      .cur-pill { border: 1px solid #6b552f; border-radius: 999px; background: none; color: #e8d9bf;
        font: inherit; font-size: 0.92rem; padding: 0.2rem 0.75rem; cursor: pointer; }
      .cur-pill.on { border-color: #c9a24b; color: #ffd77e; }
      .cur-swatch { width: 27px; height: 27px; border-radius: 50%; border: 2px solid #4a3a22;
        cursor: pointer; padding: 0; }
      .cur-swatch.on { border-color: #ffd77e; }
      #cur-toast { position: fixed; bottom: 6.5rem; left: 50%; transform: translateX(-50%);
        z-index: 60; padding: 0.6rem 1.1rem; font-size: 0.95rem; border-color: #c9a24b;
        display: none; max-width: 80vw; text-align: center; }
      body.cur-preview #cur-dock, body.cur-preview #cur-hudwrap { display: none; }
      #cur-preview-chip { position: fixed; top: 0.7rem; left: 0.7rem; z-index: 45; display: none;
        padding: 0.4rem 0.85rem; font-size: 0.92rem; cursor: pointer; letter-spacing: 0.1em; }
      body.cur-preview #cur-preview-chip { display: block; }
    `;
    document.head.appendChild(style);

    const topbar = el(`<div id="cur-topbar" class="cur-ui cur-panel">
      <span class="cur-title">CURATOR</span><span id="cur-dirty" title="unsaved changes"></span>
      <button class="cur-btn" data-act="undo" title="Ctrl+Z">undo</button>
      <button class="cur-btn" data-act="clearall" title="take down every piece">clear all</button>
      <button class="cur-btn primary" data-act="save">save</button>
      <button class="cur-btn" data-act="revert" title="reload the last saved layout">revert</button>
      <button class="cur-btn" data-act="preview" title="hide the curator chrome">preview</button>
      <button class="cur-btn" data-act="exit" title="leave curator mode">exit</button>
    </div>`);
    const tray = el(`<div id="cur-tray" class="cur-ui cur-panel">
      <div class="cur-tray-head">
        <button class="cur-btn" data-act="rescan" title="re-read assets/art/">rescan</button>
      </div>
      <div id="cur-tiles"></div>
    </div>`);
    const hudwrap = el(`<div id="cur-hudwrap" class="cur-ui"></div>`);
    const hud = el(`<div id="cur-hud" class="cur-panel"></div>`);
    const frames = el(`<div id="cur-frames" class="cur-panel"></div>`);
    hudwrap.append(hud, frames);
    const toastBox = el(`<div id="cur-toast" class="cur-ui cur-panel"></div>`);
    const previewChip = el(`<div id="cur-preview-chip" class="cur-ui cur-panel">&larr; curating</div>`);
    // Control bar rides the tray: one dock, bar pinned to the tray's left edge,
    // 10px above it, whatever width the tray takes.
    const dock = el(`<div id="cur-dock" class="cur-ui"></div>`);
    dock.append(topbar, tray);
    document.body.append(dock, hudwrap, toastBox, previewChip);

    topbar.addEventListener('click', onAction);
    tray.addEventListener('click', onAction);
    hudwrap.addEventListener('click', onAction);
    previewChip.addEventListener('click', () => togglePreview(false));

    return {
      topbar, tray, hudwrap, hud, frames, toastBox, previewChip,
      tiles: tray.querySelector('#cur-tiles'),
      dirtyDot: topbar.querySelector('#cur-dirty'),
    };
  }

  function el(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  let toastTimer = 0;
  function toast(msg) {
    ui.toastBox.textContent = msg;
    ui.toastBox.style.display = 'block';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { ui.toastBox.style.display = 'none'; }, 4000);
  }

  // ---------------------------------------------------------------- tray
  async function loadArt() {
    try {
      const res = await fetch(`/api/worlds/${slug}/art`, { cache: 'no-store' });
      if (!res.ok) throw new Error((await res.json()).error ?? res.statusText);
      artFiles = (await res.json()).files;
      renderTray();
    } catch (err) {
      toast(`Couldn't read the art folder: ${err.message}`);
    }
  }

  function placementCount(file) {
    const seen = new Set();
    let n = 0;
    for (const s of layout.slots) {
      if (s.art !== file) continue;
      const key = s.group ?? s.id;
      if (!seen.has(key)) { seen.add(key); n++; }
    }
    return n;
  }

  function renderTray() {
    ui.tiles.textContent = '';
    const blank = el(`<button class="cur-tile blank" data-file="" title="a blank frame">blank</button>`);
    ui.tiles.appendChild(blank);
    for (const file of artFiles) {
      const tile = el(`<button class="cur-tile" data-file="${file}" title="${file}"></button>`);
      const img = document.createElement('img');
      img.src = layout.artDir + file;
      img.alt = file;
      img.addEventListener('load', () => aspects.set(file, img.naturalWidth / img.naturalHeight));
      tile.appendChild(img);
      tile.appendChild(el(`<span class="cur-count"></span>`));
      ui.tiles.appendChild(tile);
    }
    refreshBadges();
  }

  function refreshBadges() {
    for (const tile of ui.tiles.querySelectorAll('.cur-tile[data-file]')) {
      const file = tile.dataset.file;
      if (!file) continue;
      const count = placementCount(file);
      const badge = tile.querySelector('.cur-count');
      if (badge) badge.textContent = count ? `×${count}` : '';
    }
  }

  // ------------------------------------------------------------- geometry
  // Walls are 2D half-planes (three.js x/z) with segment endpoints; art hangs
  // wallInset inside the plane, facing the room.
  function wallYawDeg(wall) {
    return THREE.MathUtils.radToDeg(Math.atan2(-wall.n[0], -wall.n[1]));
  }

  function wallRightDir(wall) {
    // Visual right for a viewer facing this wall = outwardNormal × up.
    // (Checked against the shipped triptych: slice 0 sits on the viewer's left.)
    return new THREE.Vector3(wall.n[0], 0, wall.n[1]).cross(new THREE.Vector3(0, 1, 0));
  }

  // Clamp a desired center point onto a wall: returns { point, yaw } or null.
  function clampToWall(wall, desired, totalW, h, kind) {
    const [ax, az] = wall.a, [bx, bz] = wall.b;
    const ex = bx - ax, ez = bz - az;
    const len2 = ex * ex + ez * ez, len = Math.sqrt(len2);
    let s = ((desired.x - ax) * ex + (desired.z - az) * ez) / len2;
    const halfS = (totalW / 2 + 0.08) / len;
    if (halfS >= 0.5) return null;                        // wider than the wall
    s = clamp(s, halfS, 1 - halfS);

    const yMin = h / 2 + 0.08;
    const yMax = kind === 'cord' ? railY - h / 2 - 0.07 : railY + 0.55;
    if (yMax < yMin) return null;                          // cord can't reach the rail
    const y = clamp(desired.y, yMin, yMax);

    if (wall.door && y - h / 2 < wall.door.top) {
      const lo = wall.door.s0 - halfS, hi = wall.door.s1 + halfS;
      if (s > lo && s < hi) {
        const left = lo >= halfS ? lo : null;
        const right = hi <= 1 - halfS ? hi : null;
        if (left === null && right === null) return null;
        if (left === null) s = right;
        else if (right === null) s = left;
        else s = s - lo < hi - s ? left : right;
      }
    }

    const px = ax + s * ex - wall.n[0] * wallInset;
    const pz = az + s * ez - wall.n[1] * wallInset;
    return { point: new THREE.Vector3(px, y, pz), yaw: wallYawDeg(wall), wall };
  }

  // Raycast the analytic walls; returns nearest { wall, point (unclamped) } or null.
  function castWalls(origin, dir) {
    let best = null;
    for (const wall of walls) {
      const nx = wall.n[0], nz = wall.n[1];
      const denom = nx * dir.x + nz * dir.z;
      if (denom <= 1e-6) continue;                        // moving away from this wall
      const t = (wall.d - wallInset - (nx * origin.x + nz * origin.z)) / denom;
      if (t < 0.15 || (best && t >= best.t)) continue;
      const point = origin.clone().addScaledVector(dir, t);
      if (point.y < -0.2 || point.y > railY + 1.6) continue;
      // must be within this wall's segment (with slack; clamp handles the rest)
      const [ax, az] = wall.a, [bx, bz] = wall.b;
      const ex = bx - ax, ez = bz - az;
      const s = ((point.x - ax) * ex + (point.z - az) * ez) / (ex * ex + ez * ez);
      if (s < -0.08 || s > 1.08) continue;
      best = { t, wall, point };
    }
    return best;
  }

  function castFloor(origin, dir) {
    if (dir.y >= -1e-6) return null;
    const t = (floorY - origin.y) / dir.y;
    if (t < 0.15) return null;
    const point = origin.clone().addScaledVector(dir, t);
    // keep floor placements inside the room with body clearance
    for (const wall of walls) {
      const dist = wall.n[0] * point.x + wall.n[1] * point.z;
      const lim = wall.d - 0.55;
      if (dist > lim) {
        point.x -= wall.n[0] * (dist - lim);
        point.z -= wall.n[1] * (dist - lim);
      }
    }
    return { point };
  }

  function nearestWall(point) {
    let best = null, bestGap = Infinity;
    for (const wall of walls) {
      const gap = wall.d - (wall.n[0] * point.x + wall.n[1] * point.z);
      if (gap < bestGap) { bestGap = gap; best = wall; }
    }
    return best;
  }

  function cameraYawToward(point) {
    return THREE.MathUtils.radToDeg(
      Math.atan2(camera.position.x - point.x, camera.position.z - point.z));
  }

  // --------------------------------------------------------------- carrying
  function startCarry(file) {
    cancelCarry();
    const aspect = file ? aspects.get(file) ?? 1 : 1;
    const w = file ? (aspect >= 1 ? 1.0 : aspect) : 0.6;
    const h = file ? w / aspect : 0.6;
    carrying = { file: file || null, style: defaultStyle, kindPref: 'wall', w, h, hit: null, ghost: null };
    buildGhost();
    for (const tile of ui.tiles.querySelectorAll('.cur-tile')) {
      tile.classList.toggle('carrying', tile.dataset.file === (file ?? ''));
    }
    renderHud();
    updateLocks();
  }

  function cancelCarry() {
    if (!carrying) return;
    destroyGhost();
    carrying = null;
    for (const tile of ui.tiles.querySelectorAll('.cur-tile')) tile.classList.remove('carrying');
    renderHud();
    updateLocks();
  }

  function panelSpec() {
    // Returns the panels the current carry drops: 1 for singles, 3 for a triptych.
    const c = carrying;
    if (c.kindPref === 'triptych' && c.file) {
      const aspect = aspects.get(c.file) ?? 1;
      const h = c.h * 1.9;                                // triptychs run tall
      const pw = Math.max(0.2, (h * aspect) / 3);
      const gap = Math.max(0.08, pw * 0.2);
      return { count: 3, pw, h, gap, total: pw * 3 + gap * 2 };
    }
    return { count: 1, pw: c.w, h: c.h, gap: 0, total: c.w };
  }

  function buildGhost() {
    destroyGhost();
    const c = carrying;
    const spec = panelSpec();
    const group = new THREE.Group();
    group.visible = false;
    const panels = [];
    for (let i = 0; i < spec.count; i++) {
      let mat;
      if (c.file) {
        let tex = getTexture(c.file);
        if (spec.count > 1) {
          tex = tex.clone();
          tex.repeat.set(1 / spec.count, 1);
          tex.offset.set(i / spec.count, 0);
          tex.userData.ghostClone = true;
        }
        mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.8 });
      } else {
        mat = new THREE.MeshBasicMaterial({ color: 0xe6dcc4, transparent: true, opacity: 0.7 });
      }
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(spec.pw, spec.h), mat);
      const edge = new THREE.LineSegments(
        new THREE.EdgesGeometry(mesh.geometry),
        new THREE.LineBasicMaterial({ color: 0xc9a24b }));
      mesh.add(edge);
      group.add(mesh);
      panels.push(mesh);
    }
    scene.add(group);
    c.ghost = { group, panels, spec };
  }

  function destroyGhost() {
    const ghost = carrying?.ghost;
    if (!ghost) return;
    scene.remove(ghost.group);
    ghost.group.traverse((o) => {
      o.geometry?.dispose();
      if (o.material) {
        if (o.material.map?.userData.ghostClone) o.material.map.dispose();
        o.material.dispose();
      }
    });
    carrying.ghost = null;
  }

  // Recomputed every frame while carrying: where would this drop?
  function trackGhost() {
    const c = carrying;
    if (!c?.ghost) return;
    raycaster.setFromCamera(mouse, camera);
    const { origin, direction } = raycaster.ray;
    const spec = c.ghost.spec;
    let hit = null;

    const wallCast = castWalls(origin, direction);
    const floorCast = castFloor(origin, direction);
    const wallKinds = new Set(['wall', 'cord', 'triptych']);
    // The surface under the cursor decides wall-vs-floor; kindPref picks within it.
    const useWall = wallCast && (!floorCast || wallCast.t <= floorCast.t);

    if (useWall) {
      let kind = wallKinds.has(c.kindPref) ? c.kindPref : 'wall';
      if (kind === 'triptych' && spec.count === 1) kind = 'wall';   // blanks don't slice
      const spot = clampToWall(wallCast.wall, wallCast.point, spec.total, spec.h,
        kind === 'cord' ? 'cord' : 'wall');
      if (spot) hit = { surface: 'wall', kind, ...spot };
    } else if (floorCast && spec.count === 1) {   // no triptychs on easels
      const kind = c.kindPref === 'lean' ? 'lean' : 'easel';
      if (kind === 'lean') {
        const wall = nearestWall(floorCast.point);
        const gap = Math.max(0.15, spec.h * 0.21 + 0.12);
        const point = new THREE.Vector3(
          floorCast.point.x, spec.h / 2 * 0.978 + 0.04, floorCast.point.z);
        const along = clampToWall(wall, point, spec.total, spec.h * 0.5, 'wall');
        if (along) {
          point.x = along.point.x - wall.n[0] * (gap - wallInset);
          point.z = along.point.z - wall.n[1] * (gap - wallInset);
          point.y = spec.h / 2 * 0.978 + 0.04;
          hit = { surface: 'floor', kind, point, yaw: wallYawDeg(wall), wall };
        }
      } else {
        const point = floorCast.point.clone();
        point.y = spec.h / 2 + 0.675;
        hit = { surface: 'floor', kind, point, yaw: cameraYawToward(point) };
      }
    }

    c.hit = hit;
    const ghost = c.ghost.group;
    if (!hit) { ghost.visible = false; return; }
    ghost.visible = !preview;
    ghost.position.copy(hit.point);
    ghost.rotation.set(0, rad(hit.yaw), 0);
    if (hit.kind === 'lean' || hit.kind === 'easel') ghost.rotateX(-0.21);
    if (hit.kind === 'cord') ghost.rotateX(0.07);
    if (c.ghost.spec.count > 1) {
      const step = c.ghost.spec.pw + c.ghost.spec.gap;
      c.ghost.panels.forEach((panel, i) => { panel.position.x = (i - 1) * step; });
    }
    renderHud();   // cheap: only rewrites when content changes
  }

  function uniqueId(base) {
    let id = `${base}_${idCounter}`;
    while (layout.slots.some((s) => s.id === id)) id = `${base}_${++idCounter}`;
    idCounter += 1;
    return id;
  }

  function idBase(file) {
    if (!file) return 'blank';
    const stem = file.toLowerCase().replace(/\.[^.]+$/, '').replace(/[^a-z0-9]+/g, '');
    return stem.slice(0, 10) || 'art';
  }

  function dropCarry() {
    const c = carrying;
    if (!c?.hit) return;
    snapshot();
    const spec = c.ghost.spec;
    const hit = c.hit;
    const placed = [];
    if (spec.count > 1) {
      const group = uniqueId(idBase(c.file));
      const right = wallRightDir(hit.wall);
      const step = spec.pw + spec.gap;
      for (let i = 0; i < 3; i++) {
        const p = hit.point.clone().addScaledVector(right, (i - 1) * step);
        const id = uniqueId(idBase(c.file));
        slots.add({
          id, art: c.file, kind: 'wall',
          pos: bpos(p), yaw: round3(hit.yaw), w: round3(spec.pw), h: round3(spec.h),
          style: c.style, slice: [i, 3], group,
        });
        placed.push(id);
      }
    } else {
      const id = uniqueId(idBase(c.file));
      slots.add({
        id, art: c.file, kind: hit.kind,
        pos: bpos(hit.point), yaw: round3(hit.yaw),
        w: round3(spec.pw), h: round3(spec.h), style: c.style,
      });
      placed.push(id);
    }
    markDirty();
    cancelCarry();
    select(placed);   // the piece you just hung is the one you're now adjusting
  }

  function round3(v) { return Math.round(v * 1000) / 1000; }

  // -------------------------------------------------------------- selection
  function slotById(id) { return layout.slots.find((s) => s.id === id); }

  function select(ids) {
    deselect();
    selection = ids.filter((id) => slotById(id));
    rebuildOutlines();
    renderHud();
    updateLocks();
  }

  function deselect() {
    selection = [];
    endPieceDrag();
    clearOutlines();
    renderHud();
    updateLocks();
  }

  function clearOutlines() {
    for (const helper of outlines) {
      scene.remove(helper);
      helper.geometry?.dispose();
      helper.material?.dispose();
    }
    outlines.length = 0;
  }

  function rebuildOutlines() {
    clearOutlines();
    for (const id of selection) {
      const mesh = meshFor(id);
      if (!mesh) continue;
      mesh.parent.updateWorldMatrix(true, true);   // freshly rebuilt groups are stale
      const helper = new THREE.BoxHelper(mesh.parent, 0xc9a24b);
      helper.visible = !preview;
      scene.add(helper);
      outlines.push(helper);
    }
  }

  function selectedSlots() { return selection.map(slotById).filter(Boolean); }

  // A linked triptych (shared group, sliced) vs an ad-hoc shift-click multi-selection.
  function isTrio(list) {
    return list.length > 1 && !!list[0].group && list.every((s) => s.group === list[0].group);
  }

  function applyToSelection(fn, tag) {
    const list = selectedSlots();
    if (!list.length) return;
    snapshot(tag);
    for (const slot of list) { fn(slot); slots.update(slot); }
    markDirty();
    rebuildOutlines();
    renderHud();
  }

  function slotWall(slot) {
    // Which wall does this slot hang on? Nearest plane at matching yaw.
    const p = new THREE.Vector3(slot.pos[0], slot.pos[2], -slot.pos[1]);
    let best = null, bestGap = Infinity;
    for (const wall of walls) {
      const gap = Math.abs(wall.d - wallInset - (wall.n[0] * p.x + wall.n[1] * p.z));
      if (gap < bestGap) { bestGap = gap; best = wall; }
    }
    return best;
  }

  function bpos(v) { return toBlender(v).map(round3); }

  function moveSelection(fn, tag, targetWall = null) {
    // fn mutates a desired three-space center per slot; re-clamped to a wall
    // (the slot's own, or targetWall when dragging onto a different one).
    const list = selectedSlots();
    if (!list.length) return;
    snapshot(tag);
    const onWall = list[0].kind === 'wall' || list[0].kind === 'cord';
    if (onWall && isTrio(list)) {
      // trio: clamp the shared center, then respace panels at their current gap
      const centerSlot = list[Math.floor(list.length / 2)];
      const wall = targetWall ?? slotWall(centerSlot);
      const desired = new THREE.Vector3(
        centerSlot.pos[0], centerSlot.pos[2], -centerSlot.pos[1]);
      fn(desired, centerSlot);
      const step = trioStep(list);
      const total = (list.length - 1) * step + list[0].w;
      const spot = clampToWall(wall, desired, total, list[0].h, centerSlot.kind);
      if (!spot) return;
      const right = wallRightDir(wall);
      list.forEach((slot, i) => {
        const p = spot.point.clone().addScaledVector(right, (i - Math.floor(list.length / 2)) * step);
        slot.pos = bpos(p); slot.yaw = round3(spot.yaw);
        slots.update(slot);
      });
    } else {
      for (const slot of list) {
        const desired = new THREE.Vector3(slot.pos[0], slot.pos[2], -slot.pos[1]);
        fn(desired, slot);
        if (onWall) {
          const wall = targetWall ?? slotWall(slot);
          const spot = clampToWall(wall, desired, slot.w, slot.h, slot.kind);
          if (!spot) continue;
          slot.pos = bpos(spot.point); slot.yaw = round3(spot.yaw);
        } else {
          // floor piece: keep inside the room (leans live nearly against the wall)
          for (const wall of walls) {
            const dist = wall.n[0] * desired.x + wall.n[1] * desired.z;
            const lim = wall.d - (slot.kind === 'lean' ? 0.1 : 0.3);
            if (dist > lim) {
              desired.x -= wall.n[0] * (dist - lim);
              desired.z -= wall.n[1] * (dist - lim);
            }
          }
          slot.pos = bpos(desired);
        }
        slots.update(slot);
      }
    }
    markDirty();
    rebuildOutlines();
    renderHud();
  }

  function nudge(dx, dy, big) {
    const step = big ? 0.1 : 0.01;
    const list = selectedSlots();
    if (!list.length) return;
    const onWall = list[0].kind === 'wall' || list[0].kind === 'cord';
    if (onWall) {
      const right = wallRightDir(slotWall(list[0]));
      moveSelection((p) => {
        p.addScaledVector(right, dx * step);
        p.y += dy * step;
      }, 'nudge');
    } else {
      // floor: nudge relative to where the camera looks
      const fwd = new THREE.Vector3();
      camera.getWorldDirection(fwd);
      fwd.y = 0; fwd.normalize();
      const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
      moveSelection((p) => {
        p.addScaledVector(right, dx * step);
        p.addScaledVector(fwd, dy * step);
      }, 'nudge');
    }
  }

  function resizeSelection(factor) {
    const list = selectedSlots();
    if (!list.length) return;
    const maxDim = Math.max(...list.map((s) => Math.max(s.w, s.h)));
    if (maxDim * factor > 3.6 || maxDim * factor < 0.22) return;
    const onWall = list[0].kind === 'wall' || list[0].kind === 'cord';
    if (isTrio(list) && onWall) {
      // trio: scale panels AND their gap around the center panel
      snapshot('resize');
      const centerSlot = list[Math.floor(list.length / 2)];
      const wall = slotWall(centerSlot);
      const right = wallRightDir(wall);
      const w = round3(list[0].w * factor), h = round3(list[0].h * factor);
      const step = trioStep(list) * factor;
      const total = (list.length - 1) * step + w;
      const center = new THREE.Vector3(
        centerSlot.pos[0], centerSlot.pos[2], -centerSlot.pos[1]);
      const spot = clampToWall(wall, center, total, h, centerSlot.kind);
      if (!spot) return;
      list.forEach((slot, i) => {
        slot.w = w; slot.h = h;
        const p = spot.point.clone().addScaledVector(right, (i - Math.floor(list.length / 2)) * step);
        slot.pos = bpos(p); slot.yaw = round3(spot.yaw);
        slots.update(slot);
      });
      markDirty();
      rebuildOutlines();
      renderHud();
      return;
    }
    applyToSelection((slot) => {
      slot.w = round3(slot.w * factor);
      slot.h = round3(slot.h * factor);
      const p = new THREE.Vector3(slot.pos[0], slot.pos[2], -slot.pos[1]);
      if (slot.kind === 'wall' || slot.kind === 'cord') {
        const spot = clampToWall(slotWall(slot), p, slot.w, slot.h, slot.kind);
        if (spot) { slot.pos = bpos(spot.point); slot.yaw = round3(spot.yaw); }
      } else if (slot.kind === 'easel') {
        p.y = slot.h / 2 + 0.675;
        slot.pos = bpos(p);
      } else if (slot.kind === 'lean') {
        p.y = slot.h / 2 * 0.978 + 0.04;
        slot.pos = bpos(p);
      }
    }, 'resize');
  }

  // Distance between adjacent panel centers (the gap is step minus panel width).
  function trioStep(list) {
    const a = list[0].pos, b = list[1].pos;
    return Math.hypot(a[0] - b[0], a[1] - b[1]);
  }

  // ------------------------------------------------- multi-selection tools
  // "First piece you selected" is the reference for size and edge alignment.

  function reclampSlot(slot) {
    const p = new THREE.Vector3(slot.pos[0], slot.pos[2], -slot.pos[1]);
    if (slot.kind === 'wall' || slot.kind === 'cord') {
      const spot = clampToWall(slotWall(slot), p, slot.w, slot.h, slot.kind);
      if (spot) { slot.pos = bpos(spot.point); slot.yaw = round3(spot.yaw); }
    } else if (slot.kind === 'easel') {
      p.y = slot.h / 2 + 0.675;
      slot.pos = bpos(p);
    } else if (slot.kind === 'lean') {
      p.y = slot.h / 2 * 0.978 + 0.04;
      slot.pos = bpos(p);
    }
  }

  function matchSize(exact) {
    const list = selectedSlots();
    if (list.length < 2) return;
    const ref = list[0];
    snapshot();
    for (const slot of list) {
      if (slot === ref) continue;
      if (exact) { slot.w = ref.w; slot.h = ref.h; }
      else {   // same height, width keeps each piece's own aspect
        slot.w = round3(slot.w * (ref.h / slot.h));
        slot.h = ref.h;
      }
      reclampSlot(slot);
      slots.update(slot);
    }
    markDirty();
    rebuildOutlines();
    renderHud();
  }

  function alignRow(edge) {   // 'top' | 'bottom' — wall/cord pieces only
    const all = selectedSlots();
    const list = all.filter((s) => s.kind === 'wall' || s.kind === 'cord');
    if (list.length < 2) { toast('Aligning needs two or more wall pieces.'); return; }
    const ref = list[0];
    const refY = ref.pos[2] + (edge === 'top' ? ref.h / 2 : -ref.h / 2);
    snapshot();
    for (const slot of list) {
      if (slot === ref) continue;
      const y = edge === 'top' ? refY - slot.h / 2 : refY + slot.h / 2;
      const p = new THREE.Vector3(slot.pos[0], y, -slot.pos[1]);
      const spot = clampToWall(slotWall(slot), p, slot.w, slot.h, slot.kind);
      if (spot) { slot.pos = bpos(spot.point); slot.yaw = round3(spot.yaw); }
      slots.update(slot);
    }
    markDirty();
    rebuildOutlines();
    renderHud();
  }

  function respaceRow(delta) {
    // Even gutters for a shift-click row: wall/cord pieces sharing one wall,
    // respaced left-to-right around the row's current center. Each keeps its y.
    const list = selectedSlots();
    if (list.length < 2) return;
    if (!list.every((s) => s.kind === 'wall' || s.kind === 'cord')) {
      toast('Gutter spacing works on wall pieces.'); return;
    }
    const wall = slotWall(list[0]);
    if (!list.every((s) => slotWall(s) === wall)) {
      toast('Gutter spacing needs the pieces on one wall.'); return;
    }
    const right = wallRightDir(wall);
    const proj = (x, z) => x * right.x + z * right.z;
    const sorted = [...list].sort((a, b) =>
      proj(a.pos[0], -a.pos[1]) - proj(b.pos[0], -b.pos[1]));
    const first = sorted[0], last = sorted[sorted.length - 1];
    const totalW = sorted.reduce((sum, s) => sum + s.w, 0);
    const span = (proj(last.pos[0], -last.pos[1]) + last.w / 2)
      - (proj(first.pos[0], -first.pos[1]) - first.w / 2);
    const gaps = sorted.length - 1;
    const current = (span - totalW) / gaps;
    const gutter = clamp(current + delta, 0, 2);
    const total = totalW + gutter * gaps;
    // clamp the whole row on the wall around its current center
    const center = new THREE.Vector3(first.pos[0], first.pos[2], -first.pos[1])
      .addScaledVector(right, span / 2 - first.w / 2);
    const maxH = Math.max(...sorted.map((s) => s.h));
    center.y = clamp(center.y, maxH / 2 + 0.1, railY);   // neutral y for the fit check
    const spot = clampToWall(wall, center, total, maxH, 'wall');
    if (!spot) { toast('No room on this wall for that gutter.'); return; }
    snapshot('respace');
    const spotProj = proj(spot.point.x, spot.point.z);
    let edge = spotProj - total / 2;
    for (const slot of sorted) {
      const off = edge + slot.w / 2 - spotProj;
      slot.pos = bpos(new THREE.Vector3(
        spot.point.x + right.x * off, slot.pos[2], spot.point.z + right.z * off));
      slot.yaw = round3(wallYawDeg(wall));
      slots.update(slot);
      edge += slot.w + gutter;
    }
    markDirty();
    rebuildOutlines();
    renderHud();
  }

  function spreadSelection(delta) {
    const list = selectedSlots();
    if (list.length < 2) { toast('Spread adjusts a triptych — select one first.'); return; }
    if (!isTrio(list)) { respaceRow(delta); return; }
    const w = list[0].w;
    const current = trioStep(list) - w;
    const gap = clamp(current + delta, 0, w * 1.5);
    if (Math.abs(gap - current) < 1e-6) return;
    const centerSlot = list[Math.floor(list.length / 2)];
    const wall = slotWall(centerSlot);
    const step = w + gap;
    const total = (list.length - 1) * step + w;
    const center = new THREE.Vector3(
      centerSlot.pos[0], centerSlot.pos[2], -centerSlot.pos[1]);
    const spot = clampToWall(wall, center, total, list[0].h, centerSlot.kind);
    if (!spot) { toast('No room on this wall to spread further.'); return; }
    snapshot('spread');
    const right = wallRightDir(wall);
    list.forEach((slot, i) => {
      const p = spot.point.clone().addScaledVector(right, (i - Math.floor(list.length / 2)) * step);
      slot.pos = bpos(p); slot.yaw = round3(spot.yaw);
      slots.update(slot);
    });
    markDirty();
    rebuildOutlines();
    renderHud();
  }

  function rotateSelection(deg) {
    const list = selectedSlots();
    if (!list.length || (list[0].kind !== 'easel' && list[0].kind !== 'lean')) return;
    applyToSelection((slot) => { slot.yaw = round3(slot.yaw + deg); }, 'rotate');
  }

  function clearAll() {
    const removable = layout.slots.filter((s) => !protectedIds.includes(s.id));
    if (!removable.length) { toast('The walls are already bare.'); return; }
    if (!confirm(`Take down all ${removable.length} pieces and start from bare walls? ` +
      'Ctrl+Z brings the whole hang back, and nothing is saved until you hit save.')) return;
    snapshot();
    cancelCarry();
    deselect();
    for (const slot of removable) slots.remove(slot.id);
    markDirty();
    toast('Bare walls. The drifting blank stays — Ctrl+Z restores everything else.');
  }

  function mirrorSelection() {
    const list = selectedSlots();
    if (!list.length) return;
    if (!list.some((s) => s.art)) { toast('Blank frames have nothing to mirror.'); return; }
    applyToSelection((slot) => {
      if (!slot.art) return;
      if (slot.flip) delete slot.flip;
      else slot.flip = true;
      // a mirrored triptych also swaps its outer slices so the composition flips whole
      if (slot.slice) slot.slice = [slot.slice[1] - 1 - slot.slice[0], slot.slice[1]];
    }, null);
  }

  function deleteSelection() {
    const list = selectedSlots();
    if (!list.length) return;
    const kept = list.filter((s) => protectedIds.includes(s.id));
    const gone = list.filter((s) => !protectedIds.includes(s.id));
    if (gone.length) {
      snapshot();
      for (const slot of gone) slots.remove(slot.id);
      markDirty();
    }
    if (kept.length) toast('That shimmering blank is a door between worlds — it stays.');
    deselect();
  }

  function setSelectionKind(kind) {
    // Pre-check: a cord piece must fit below the rail before we commit.
    for (const slot of selectedSlots()) {
      const p = new THREE.Vector3(slot.pos[0], slot.pos[2], -slot.pos[1]);
      if (!clampToWall(slotWall(slot), p, slot.w, slot.h, kind)) {
        toast('Too tall to hang from the rail — shrink it first.');
        return;
      }
    }
    applyToSelection((slot) => {
      slot.kind = kind;
      const p = new THREE.Vector3(slot.pos[0], slot.pos[2], -slot.pos[1]);
      const spot = clampToWall(slotWall(slot), p, slot.w, slot.h, kind);
      if (spot) slot.pos = bpos(spot.point);
    }, null);
  }

  // ------------------------------------------------------------------- HUD
  // Frame swatches live in their own little palette panel beside the main bar.
  function framesHtml(current, attr) {
    const swatches = kitNames.map((k) =>
      `<button class="cur-swatch ${current === k ? 'on' : ''}" ${attr}="${k}"
        style="background:${layout.kit[k].color}" title="${k}"></button>`).join('');
    return `<div class="cur-frames-label">FRAME</div>
      <div class="cur-swatches">${swatches}</div>`;
  }

  let hudHtml = '';
  function renderHud() {
    let html = '';
    let frames = '';
    if (carrying) {
      const surface = carrying.hit?.surface;
      const kinds = surface === 'floor' ? ['easel', 'lean'] : ['wall', 'cord', 'triptych'];
      const pills = kinds.map((k, i) =>
        `<button class="cur-pill ${carrying.kindPref === k || (!kinds.includes(carrying.kindPref) && i === 0) ? 'on' : ''}"
          data-kind="${k}">${i + 1} · ${k}</button>`).join('');
      html = `<div class="cur-row">${pills}</div>
        <div class="cur-hint">click to hang &middot; wheel sizes it &middot; right-click or Esc puts it back</div>`;
      frames = framesHtml(carrying.style, 'data-style');
    } else if (selection.length) {
      const list = selectedSlots();
      const s = list[0];
      const trio = isTrio(list);
      const multi = list.length > 1 && !trio;
      const name = trio
        ? `triptych &middot; ${(trioStep(list) - s.w).toFixed(2)}m gap`
        : multi ? `${list.length} pieces`
        : `${s.art ?? 'blank frame'} &middot; ${s.w.toFixed(2)}&times;${s.h.toFixed(2)}m`;
      const kindPills = multi ? ''
        : (s.kind === 'wall' || s.kind === 'cord') && !trio
        ? ['wall', 'cord'].map((k) =>
            `<button class="cur-pill ${s.kind === k ? 'on' : ''}" data-setkind="${k}">${k}</button>`).join('')
        : `<span class="cur-pill on">${s.kind}</span>`;
      const rotHint = (s.kind === 'easel' || s.kind === 'lean') ? ' &middot; Q / E turns it' : '';
      const mirrorBtn = s.art && !multi
        ? `<button class="cur-btn ${s.flip ? 'primary' : ''}" data-act="mirror" title="M">mirror</button>`
        : '';
      const spreadBtns = trio || multi
        ? `<button class="cur-btn" data-act="spread-in" title=",">closer</button>
           <button class="cur-btn" data-act="spread-out" title=".">apart</button>`
        : '';
      const multiBtns = multi
        ? `<button class="cur-btn" data-act="match-h" title="heights match the first piece; widths keep their aspect">same height</button>
           <button class="cur-btn" data-act="match-wh" title="exact width and height of the first piece">same size</button>
           <button class="cur-btn" data-act="align-top" title="line up the top edges">tops</button>
           <button class="cur-btn" data-act="align-bottom" title="line up the bottom edges">bottoms</button>`
        : '';
      const hint = multi
        ? 'the first piece you selected sets sizes and edges &middot; , . sets the gutter &middot; ' +
          'arrows nudge everything &middot; shift-click adds or removes &middot; Esc lets go'
        : `drag it along the wall &middot; arrows nudge (shift = 10cm) &middot; wheel or [ ] resizes` +
          `${trio ? ' &middot; , . sets the gap' : ''}${rotHint} &middot; M mirrors &middot; ` +
          'shift-click gathers more &middot; Esc lets go';
      html = `<div class="cur-row">
          <span class="cur-name">${name}</span>
          ${kindPills}${multiBtns}${spreadBtns}${mirrorBtn}
          <button class="cur-btn" data-act="delete">take down</button>
        </div>
        <div class="cur-hint">${hint}</div>`;
      frames = framesHtml(s.style, 'data-selstyle');
    }
    const combined = html + ' ' + frames;
    if (combined !== hudHtml) {
      hudHtml = combined;
      ui.hud.innerHTML = html;
      ui.frames.innerHTML = frames;
      ui.frames.classList.toggle('show', !!frames);
      ui.hudwrap.classList.toggle('show', !!html);
    }
  }

  // ----------------------------------------------------------------- save
  async function save() {
    try {
      const res = await fetch(`/api/worlds/${slug}/layout`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(layout),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? res.statusText);
      dirty = false;
      ui.dirtyDot.classList.remove('on');
      toast(`Saved ${body.slots} placements. Backup: ${body.backup}`);
    } catch (err) {
      toast(`Save failed: ${err.message}`);
    }
  }

  function revert() {
    if (!dirty) { toast('Nothing to revert — the room matches the last save.'); return; }
    if (confirm('Throw away unsaved changes and reload the last saved layout?')) {
      location.reload();
    }
  }

  function exit() {
    if (dirty && !confirm('Unsaved changes — leave curator mode anyway?')) return;
    location.href = location.pathname;
  }

  function togglePreview(on) {
    preview = on ?? !preview;
    document.body.classList.toggle('cur-preview', preview);
    for (const helper of outlines) helper.visible = !preview;
    if (carrying?.ghost) carrying.ghost.group.visible = !preview && !!carrying.hit;
  }

  // ---------------------------------------------------------------- events
  function onAction(e) {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.act) {
      const act = btn.dataset.act;
      if (act === 'save') save();
      else if (act === 'revert') revert();
      else if (act === 'undo') undo();
      else if (act === 'clearall') clearAll();
      else if (act === 'preview') togglePreview(true);
      else if (act === 'exit') exit();
      else if (act === 'rescan') { loadArt(); toast('Rescanned the art folder.'); }
      else if (act === 'delete') deleteSelection();
      else if (act === 'mirror') mirrorSelection();
      else if (act === 'spread-in') spreadSelection(-0.05);
      else if (act === 'spread-out') spreadSelection(0.05);
      else if (act === 'match-h') matchSize(false);
      else if (act === 'match-wh') matchSize(true);
      else if (act === 'align-top') alignRow('top');
      else if (act === 'align-bottom') alignRow('bottom');
      return;
    }
    if (btn.classList.contains('cur-tile')) { startCarry(btn.dataset.file || null); return; }
    if (btn.dataset.kind && carrying) {
      carrying.kindPref = btn.dataset.kind;
      buildGhost();                       // panel count / size may change
      renderHud();
      return;
    }
    if (btn.dataset.style && carrying) { carrying.style = btn.dataset.style; renderHud(); return; }
    if (btn.dataset.setkind) { setSelectionKind(btn.dataset.setkind); return; }
    if (btn.dataset.selstyle) {
      applyToSelection((slot) => { slot.style = btn.dataset.selstyle; }, null);
    }
  }

  function overUi(e) { return !!e.target.closest?.('.cur-ui'); }

  function raycastArt(e) {
    mouse.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    raycaster.setFromCamera(mouse, camera);
    return raycaster.intersectObjects(clickables, false)[0]?.object ?? null;
  }

  addEventListener('pointermove', (e) => {
    mouse.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    if (pointerDown) {
      pointerDown.moved += Math.abs(e.clientX - pointerDown.x) + Math.abs(e.clientY - pointerDown.y);
      pointerDown.x = e.clientX; pointerDown.y = e.clientY;
    }
    if (pieceDrag) dragMove();
  }, { capture: true });

  addEventListener('pointerdown', (e) => {
    if (preview || overUi(e) || e.button !== 0) return;
    pointerDown = { x: e.clientX, y: e.clientY, moved: 0, at: performance.now() };
    if (!carrying && selection.length) {
      const hitMesh = raycastArt(e);
      if (hitMesh && selection.includes(hitMesh.userData.slot?.id)) {
        pieceDrag = { started: false };
        e.stopImmediatePropagation();     // keep the world's drag-look out of it
      }
    }
  }, { capture: true });

  addEventListener('pointerup', (e) => {
    if (preview || e.button !== 0) return;
    const down = pointerDown;
    pointerDown = null;
    const wasDrag = pieceDrag?.started;
    endPieceDrag();
    if (overUi(e) || wasDrag) return;
    if (!down || down.moved > 7 || performance.now() - down.at > 450) return;
    // a genuine click
    if (carrying) { dropCarry(); return; }
    const hitMesh = raycastArt(e);
    if (!hitMesh) { if (!e.shiftKey) deselect(); return; }
    const slot = hitMesh.userData.slot;
    const ids = slot.group
      ? layout.slots.filter((s) => s.group === slot.group).map((s) => s.id)
      : [slot.id];
    if (e.shiftKey && selection.length) {
      // shift-click toggles membership; a trio joins or leaves whole
      const already = ids.every((id) => selection.includes(id));
      select(already
        ? selection.filter((id) => !ids.includes(id))
        : [...selection, ...ids.filter((id) => !selection.includes(id))]);
    } else {
      select(ids);
    }
  }, { capture: true });

  addEventListener('contextmenu', (e) => {
    if (carrying) { e.preventDefault(); cancelCarry(); }
  });

  function dragMove() {
    pieceDrag.started = true;
    const now = performance.now();
    if (pieceDrag.last && now - pieceDrag.last < 32) return;
    pieceDrag.last = now;
    raycaster.setFromCamera(mouse, camera);
    const { origin, direction } = raycaster.ray;
    const list = selectedSlots();
    if (!list.length) return;
    if (list.length > 1 && !isTrio(list)) return;   // ad-hoc multi: nudge with arrows, not drag
    const onWall = list[0].kind === 'wall' || list[0].kind === 'cord';
    if (onWall) {
      const cast = castWalls(origin, direction);
      if (!cast) return;
      moveSelection((p) => { p.copy(cast.point); }, 'drag', cast.wall);
    } else {
      const cast = castFloor(origin, direction);
      if (!cast) return;
      moveSelection((p, slot) => {
        if (slot.kind === 'easel') {
          p.x = cast.point.x; p.z = cast.point.z;
          p.y = slot.h / 2 + 0.675;
          slot.yaw = round3(cameraYawToward(cast.point));   // easel keeps facing you
        } else {
          // lean: slide along the nearest wall at lean distance
          const wall = nearestWall(cast.point);
          const gap = Math.max(0.15, slot.h * 0.21 + 0.12);
          const probe = new THREE.Vector3(cast.point.x, slot.h / 2, cast.point.z);
          const spot = clampToWall(wall, probe, slot.w, slot.h * 0.5, 'wall');
          if (spot) {
            p.x = spot.point.x - wall.n[0] * (gap - wallInset);
            p.z = spot.point.z - wall.n[1] * (gap - wallInset);
          } else {
            p.x = cast.point.x; p.z = cast.point.z;
          }
          p.y = slot.h / 2 * 0.978 + 0.04;
          slot.yaw = round3(wallYawDeg(wall));
        }
      }, 'drag');
    }
  }

  function endPieceDrag() { pieceDrag = null; }

  addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.code === 'KeyZ') { e.preventDefault(); undo(); return; }
    if (preview) { if (e.code === 'Escape') togglePreview(false); return; }
    if (carrying) {
      if (e.code === 'Escape') { cancelCarry(); e.stopPropagation(); return; }
      const kinds = carrying.hit?.surface === 'floor' ? ['easel', 'lean'] : ['wall', 'cord', 'triptych'];
      const n = ['Digit1', 'Digit2', 'Digit3'].indexOf(e.code);
      if (n >= 0 && kinds[n]) {
        carrying.kindPref = kinds[n];
        buildGhost();
        renderHud();
      }
      return;
    }
    if (!selection.length) return;
    const big = e.shiftKey;
    switch (e.code) {
      case 'ArrowLeft': nudge(-1, 0, big); break;
      case 'ArrowRight': nudge(1, 0, big); break;
      case 'ArrowUp': nudge(0, 1, big); break;
      case 'ArrowDown': nudge(0, -1, big); break;
      case 'BracketLeft': resizeSelection(1 / 1.04); break;
      case 'BracketRight': resizeSelection(1.04); break;
      case 'KeyQ': rotateSelection(4); break;
      case 'KeyE': rotateSelection(-4); break;
      case 'KeyM': mirrorSelection(); break;
      case 'Comma': spreadSelection(big ? -0.1 : -0.02); break;
      case 'Period': spreadSelection(big ? 0.1 : 0.02); break;
      case 'Delete': case 'Backspace': deleteSelection(); break;
      case 'Escape': deselect(); e.stopPropagation(); return;
      default: return;
    }
    e.preventDefault();
    e.stopPropagation();
  }, { capture: true });

  addEventListener('wheel', (e) => {
    if (preview || overUi(e)) return;
    if (carrying) {
      e.preventDefault(); e.stopImmediatePropagation();
      const f = e.deltaY < 0 ? 1.05 : 1 / 1.05;
      carrying.w = clamp(carrying.w * f, 0.15, 3.4);
      carrying.h = clamp(carrying.h * f, 0.15, 3.4);
      buildGhost();
    } else if (selection.length) {
      e.preventDefault(); e.stopImmediatePropagation();
      resizeSelection(e.deltaY < 0 ? 1.04 : 1 / 1.04);
    }
  }, { capture: true, passive: false });

  function updateLocks() {
    setInputLocks({
      arrows: selection.length > 0,
      wheel: selection.length > 0 || !!carrying,
    });
  }

  // ----------------------------------------------------------------- loop
  let frame = 0;
  (function loop() {
    requestAnimationFrame(loop);
    frame++;
    if (carrying) trackGhost();
    if (frame % 3 === 0 && !preview) {
      if (carrying) stage.style.cursor = carrying.hit ? 'copy' : 'not-allowed';
      else if (pieceDrag) stage.style.cursor = 'grabbing';
      else {
        raycaster.setFromCamera(mouse, camera);
        stage.style.cursor =
          raycaster.intersectObjects(clickables, false).length ? 'pointer' : 'grab';
      }
    }
  })();

  // ----------------------------------------------------------------- boot
  loadArt();
  toast('Curator mode — pick a piece from the tray, or click one on the wall.');
}
