(() => {
  const scriptUrl = document.currentScript?.src;
  const entries = globalThis.ELASTIC_SPACE_WORLDS;
  if (!scriptUrl || !Array.isArray(entries)) return;

  const STATE_KEY = "elastic-space-drift-session-v1";
  const STATE_PARAM = "_drift";
  const worldsUrl = new URL("../worlds/", scriptUrl);
  const worlds = entries.map((path) => ({
    id: path.split("/")[0],
    url: new URL(path, worldsUrl).href,
  }));
  const worldIds = new Set(worlds.map((world) => world.id));
  const normalize = (url) => {
    const parsed = new URL(url, document.baseURI);
    parsed.search = "";
    parsed.hash = "";
    return parsed.href;
  };
  const currentWorld = worlds.find((world) => normalize(world.url) === normalize(window.location.href));

  let storage = null;
  if (window.location.protocol !== "file:") {
    try {
      storage = window.sessionStorage;
      storage.getItem(STATE_KEY);
    } catch {
      storage = null;
    }
  }

  function emptyState() {
    return { version: 1, cycle: 1, seen: [], visits: {} };
  }

  function cleanState(value) {
    const state = emptyState();
    if (!value || typeof value !== "object") return state;

    state.cycle = Number.isInteger(value.cycle) && value.cycle > 0 ? value.cycle : 1;
    state.seen = [...new Set(Array.isArray(value.seen) ? value.seen : [])]
      .filter((id) => worldIds.has(id));

    if (value.visits && typeof value.visits === "object") {
      for (const id of worldIds) {
        const count = Number(value.visits[id]);
        if (Number.isInteger(count) && count > 0) state.visits[id] = count;
      }
    }
    return state;
  }

  function parseState(raw) {
    try {
      return cleanState(JSON.parse(raw));
    } catch {
      return emptyState();
    }
  }

  function readState() {
    if (storage) return parseState(storage.getItem(STATE_KEY));
    return parseState(new URL(window.location.href).searchParams.get(STATE_PARAM));
  }

  function saveState(state) {
    if (storage) storage.setItem(STATE_KEY, JSON.stringify(state));
    globalThis.ELASTIC_SPACE_SESSION = state;
  }

  const state = readState();
  if (currentWorld) {
    if (!state.seen.includes(currentWorld.id)) state.seen.push(currentWorld.id);
    state.visits[currentWorld.id] = (state.visits[currentWorld.id] || 0) + 1;
  }
  saveState(state);

  function randomUnseenWorld() {
    let choices = worlds.filter((world) =>
      world.id !== currentWorld?.id && !state.seen.includes(world.id));

    if (choices.length === 0 && worlds.length > 1) {
      state.cycle += 1;
      state.seen = currentWorld ? [currentWorld.id] : [];
      choices = worlds.filter((world) => world.id !== currentWorld?.id);
      saveState(state);
    }

    return choices[Math.floor(Math.random() * choices.length)];
  }

  document.addEventListener("click", (event) => {
    const portal = event.target?.closest?.("[data-drift]");
    if (!portal || event.defaultPrevented) return;

    const world = randomUnseenWorld();
    if (!world) return;

    event.preventDefault();
    const destination = new URL(world.url);
    if (!storage) destination.searchParams.set(STATE_PARAM, JSON.stringify(state));
    window.location.assign(destination.href);
  });
})();
