(() => {
  "use strict";

  const canvas = document.querySelector("#game");
  const ctx = canvas.getContext("2d");
  const mapCanvas = document.querySelector("#minimap");
  const mapCtx = mapCanvas.getContext("2d");
  const titleScreen = document.querySelector("#title-screen");
  const pauseScreen = document.querySelector("#pause-screen");
  const endScreen = document.querySelector("#end-screen");
  const hud = document.querySelector("#hud");
  const touchControls = document.querySelector("#touch-controls");
  const missionTitle = document.querySelector("#mission-title");
  const missionDetail = document.querySelector("#mission-detail");
  const missionLabel = document.querySelector("#mission-label");
  const districtEl = document.querySelector("#district");
  const wantedEl = document.querySelector("#wanted");
  const cashEl = document.querySelector("#cash");
  const speedEl = document.querySelector("#speed");
  const healthBar = document.querySelector("#health-bar");
  const vehicleBar = document.querySelector("#vehicle-bar");
  const promptEl = document.querySelector("#prompt");
  const toastEl = document.querySelector("#toast");
  const soundButton = document.querySelector("#sound-button");

  const WORLD = 5200;
  const ROAD = 170;
  const GRID = 650;
  const HALF = ROAD / 2;
  const roadLines = Array.from({ length: 8 }, (_, index) => 325 + index * GRID);
  const carColors = ["#f14f8a", "#23d5d5", "#ffd34e", "#8d6bff", "#e8e5db", "#ea654f", "#55cf72"];
  const neonColors = ["#ff3d9d", "#33e5dc", "#f7d548", "#9f78ff"];
  const keys = Object.create(null);
  const justPressed = new Set();
  const buildings = [];
  const traffic = [];
  const police = [];
  const particles = [];
  const rain = [];

  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let gameState = "title";
  let lastTime = 0;
  let worldTime = 0;
  let shake = 0;
  let toastTimer = 0;
  let audio = null;
  let soundOn = true;
  let engineOsc = null;
  let engineGain = null;

  const game = {
    mission: 0,
    missionTime: 0,
    cash: 120,
    wanted: 0,
    wantedCooldown: 0,
    evadeTime: 0,
    collisions: 0,
    carsStolen: 0,
    startedAt: 0,
    completed: false,
  };

  const player = {
    x: 525,
    y: 575,
    angle: 0,
    health: 100,
    vehicle: null,
    invulnerable: 0,
  };

  const missionCar = makeCar(975, 370, Math.PI / 2, "#ff3d9d", false);
  missionCar.special = true;
  missionCar.name = "SUNFIRE";
  const checkpoint = { x: 4550, y: 4225, radius: 115 };

  function seeded(seed) {
    const value = Math.sin(seed * 9283.17) * 43758.5453;
    return value - Math.floor(value);
  }

  function makeCar(x, y, angle, color, ai = true) {
    return {
      x,
      y,
      angle,
      color,
      ai,
      speed: ai ? 85 + Math.random() * 45 : 0,
      maxSpeed: 440,
      health: 100,
      length: 58,
      width: 31,
      dead: false,
      police: false,
      special: false,
      name: "COUPE",
      hitTime: 0,
    };
  }

  function generateCity() {
    buildings.length = 0;
    for (let ix = 0; ix < roadLines.length - 1; ix += 1) {
      for (let iy = 0; iy < roadLines.length - 1; iy += 1) {
        const left = roadLines[ix] + HALF + 28;
        const right = roadLines[ix + 1] - HALF - 28;
        const top = roadLines[iy] + HALF + 28;
        const bottom = roadLines[iy + 1] - HALF - 28;
        const split = seeded(ix * 31 + iy * 11) > 0.55;
        const baseHue = 205 + Math.floor(seeded(ix * 17 + iy) * 60);

        if (split) {
          const gap = 22;
          const vertical = seeded(ix + iy * 21) > 0.5;
          if (vertical) {
            const middle = left + (right - left) * (0.42 + seeded(ix * 8 + iy) * 0.16);
            addBuilding(left, top, middle - left - gap / 2, bottom - top, baseHue, ix, iy);
            addBuilding(middle + gap / 2, top, right - middle - gap / 2, bottom - top, baseHue + 15, ix + 4, iy);
          } else {
            const middle = top + (bottom - top) * (0.42 + seeded(ix + iy * 8) * 0.16);
            addBuilding(left, top, right - left, middle - top - gap / 2, baseHue, ix, iy);
            addBuilding(left, middle + gap / 2, right - left, bottom - middle - gap / 2, baseHue + 15, ix, iy + 4);
          }
        } else {
          addBuilding(left, top, right - left, bottom - top, baseHue, ix, iy);
        }
      }
    }

    traffic.length = 0;
    traffic.push(missionCar);
    for (let index = 0; index < 32; index += 1) {
      spawnTraffic(index);
    }

    rain.length = 0;
    for (let index = 0; index < 130; index += 1) {
      rain.push({
        x: Math.random(),
        y: Math.random(),
        length: 10 + Math.random() * 22,
        speed: 0.7 + Math.random() * 1.2,
      });
    }
  }

  function addBuilding(x, y, w, h, hue, ix, iy) {
    buildings.push({
      x,
      y,
      w,
      h,
      height: 18 + seeded(ix * 53 + iy * 97) * 46,
      hue,
      sign: seeded(ix * 77 + iy * 13) > 0.73,
      signSide: seeded(ix * 19 + iy * 43) > 0.5,
      label: ["VICE", "HOTEL", "NOVA", "CLUB", "24H", "MOTEL"][Math.floor(seeded(ix * 7 + iy * 9) * 6)],
    });
  }

  function spawnTraffic(index) {
    const vertical = index % 2 === 0;
    const line = roadLines[Math.floor(Math.random() * roadLines.length)];
    const direction = Math.random() > 0.5 ? 1 : -1;
    const lane = direction > 0 ? 26 : -26;
    const car = vertical
      ? makeCar(line + lane, Math.random() * WORLD, direction > 0 ? Math.PI / 2 : -Math.PI / 2, carColors[index % carColors.length])
      : makeCar(Math.random() * WORLD, line + lane, direction > 0 ? 0 : Math.PI, carColors[index % carColors.length]);
    car.speed *= direction;
    car.axis = vertical ? "y" : "x";
    traffic.push(car);
  }

  function resize() {
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  }

  function resetGame() {
    Object.assign(game, {
      mission: 0,
      missionTime: 0,
      cash: 120,
      wanted: 0,
      wantedCooldown: 0,
      evadeTime: 0,
      collisions: 0,
      carsStolen: 0,
      startedAt: performance.now(),
      completed: false,
    });
    Object.assign(player, {
      x: 525,
      y: 575,
      angle: 0,
      health: 100,
      vehicle: null,
      invulnerable: 0,
    });
    missionCar.x = 975;
    missionCar.y = 370;
    missionCar.angle = Math.PI / 2;
    missionCar.speed = 0;
    missionCar.health = 100;
    missionCar.dead = false;
    missionCar.ai = false;
    missionCar.special = true;
    police.length = 0;
    particles.length = 0;
    generateCity();
    updateMissionText();
  }

  function startGame() {
    resetGame();
    gameState = "play";
    titleScreen.classList.remove("active");
    pauseScreen.classList.remove("active");
    endScreen.classList.remove("active");
    hud.classList.add("active");
    touchControls.classList.add("active");
    ensureAudio();
    showToast("Welcome to Vice State", 1900);
  }

  function togglePause(force) {
    if (gameState === "title" || gameState === "end") return;
    const shouldPause = typeof force === "boolean" ? force : gameState === "play";
    gameState = shouldPause ? "paused" : "play";
    pauseScreen.classList.toggle("active", shouldPause);
  }

  function ensureAudio() {
    if (!soundOn) return;
    if (!audio) {
      audio = new (window.AudioContext || window.webkitAudioContext)();
      const filter = audio.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 720;
      engineOsc = audio.createOscillator();
      engineGain = audio.createGain();
      engineOsc.type = "sawtooth";
      engineOsc.frequency.value = 40;
      engineGain.gain.value = 0;
      engineOsc.connect(filter);
      filter.connect(engineGain);
      engineGain.connect(audio.destination);
      engineOsc.start();
    }
    if (audio.state === "suspended") audio.resume();
  }

  function blip(frequency = 440, duration = 0.08, type = "square", volume = 0.045) {
    if (!audio || !soundOn) return;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, audio.currentTime);
    gain.gain.setValueAtTime(volume, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + duration);
  }

  function showToast(text, duration = 1500) {
    toastEl.textContent = text;
    toastEl.classList.add("show");
    toastTimer = duration / 1000;
  }

  function setMission(index) {
    game.mission = index;
    game.missionTime = 0;
    updateMissionText();
    blip(660, 0.16, "square", 0.07);
  }

  function updateMissionText() {
    const missions = [
      ["Boost the Sunfire", "Find the pink Sunfire and press E to take it."],
      ["Neon Delivery", "Get the Sunfire to Glitter Docks before the timer runs out."],
      ["Lose the Heat", "Break police line of sight until the wanted stars clear."],
      ["Vice State Royalty", "The city is yours. Drive anywhere."],
    ];
    missionTitle.textContent = missions[game.mission][0];
    missionDetail.textContent = missions[game.mission][1];
    missionLabel.textContent = game.mission === 3 ? "Complete" : `Mission ${game.mission + 1} / 3`;
  }

  function pressed(key) {
    if (!justPressed.has(key)) return false;
    justPressed.delete(key);
    return true;
  }

  function nearestCar(maxDistance = 72) {
    let closest = null;
    let distance = maxDistance;
    for (const car of traffic) {
      if (car.dead || car.police) continue;
      const d = Math.hypot(car.x - player.x, car.y - player.y);
      if (d < distance) {
        distance = d;
        closest = car;
      }
    }
    return closest;
  }

  function enterCar(car) {
    player.vehicle = car;
    car.ai = false;
    car.speed *= 0.45;
    player.x = car.x;
    player.y = car.y;
    player.angle = car.angle;
    game.carsStolen += 1;
    addWanted(1);
    blip(150, 0.16, "sawtooth", 0.06);
    if (car === missionCar && game.mission === 0) {
      game.cash += 500;
      setMission(1);
      showToast("Vehicle acquired · $500", 1700);
    }
  }

  function exitCar() {
    const car = player.vehicle;
    if (!car || Math.abs(car.speed) > 75) return;
    const side = Math.random() > 0.5 ? 1 : -1;
    player.x = car.x + Math.cos(car.angle + Math.PI / 2) * 48 * side;
    player.y = car.y + Math.sin(car.angle + Math.PI / 2) * 48 * side;
    player.angle = car.angle;
    player.vehicle = null;
    car.ai = false;
  }

  function addWanted(amount) {
    game.wanted = Math.max(0, Math.min(5, game.wanted + amount));
    game.wantedCooldown = 13;
    syncPolice();
  }

  function syncPolice() {
    const desired = Math.ceil(game.wanted * 1.35);
    while (police.length < desired) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 650 + Math.random() * 280;
      const car = makeCar(
        clamp(player.x + Math.cos(angle) * distance, 100, WORLD - 100),
        clamp(player.y + Math.sin(angle) * distance, 100, WORLD - 100),
        angle + Math.PI,
        "#202735",
        false,
      );
      car.police = true;
      car.maxSpeed = 390 + game.wanted * 22;
      police.push(car);
    }
    while (police.length > desired) police.pop();
  }

  function update(dt) {
    worldTime += dt;
    if (gameState !== "play") return;

    game.missionTime += dt;
    player.invulnerable = Math.max(0, player.invulnerable - dt);
    toastTimer -= dt;
    if (toastTimer <= 0) toastEl.classList.remove("show");

    if (pressed("Escape")) togglePause();
    if (gameState !== "play") return;

    if (player.vehicle) updatePlayerCar(dt);
    else updateOnFoot(dt);
    updateTraffic(dt);
    updatePolice(dt);
    updateParticles(dt);
    updateMissions(dt);
    updateWanted(dt);
    updateAudio();
    updateHud();

    if (player.health <= 0) {
      player.health = 100;
      player.x = 525;
      player.y = 575;
      player.vehicle = null;
      game.cash = Math.max(0, game.cash - 250);
      game.wanted = 0;
      police.length = 0;
      showToast("Wasted · Hospital bill $250", 2200);
    }
  }

  function updateOnFoot(dt) {
    let dx = 0;
    let dy = 0;
    if (keys.w || keys.ArrowUp) dy -= 1;
    if (keys.s || keys.ArrowDown) dy += 1;
    if (keys.a || keys.ArrowLeft) dx -= 1;
    if (keys.d || keys.ArrowRight) dx += 1;
    if (dx || dy) {
      const length = Math.hypot(dx, dy);
      dx /= length;
      dy /= length;
      player.angle = Math.atan2(dy, dx);
      moveEntity(player, dx * 195 * dt, dy * 195 * dt, 13);
    }
    const near = nearestCar();
    promptEl.textContent = near ? `E · steal ${near.name.toLowerCase()}` : "";
    promptEl.classList.toggle("show", Boolean(near));
    if (near && pressed("e")) enterCar(near);
  }

  function updatePlayerCar(dt) {
    const car = player.vehicle;
    promptEl.textContent = Math.abs(car.speed) < 75 ? "E · exit vehicle" : "";
    promptEl.classList.toggle("show", Math.abs(car.speed) < 75);
    if (pressed("e")) {
      exitCar();
      return;
    }

    const throttle = keys.w || keys.ArrowUp ? 1 : keys.s || keys.ArrowDown ? -0.7 : 0;
    const steer = keys.a || keys.ArrowLeft ? -1 : keys.d || keys.ArrowRight ? 1 : 0;
    const onRoad = isOnRoad(car.x, car.y);
    const traction = onRoad ? 1 : 0.56;
    car.speed += throttle * 335 * traction * dt;
    car.speed *= Math.pow(keys[" "] ? 0.82 : throttle ? 0.992 : 0.968, dt * 60);
    car.speed = clamp(car.speed, -150, car.maxSpeed * traction);

    if (Math.abs(car.speed) > 8) {
      const steerScale = clamp(Math.abs(car.speed) / 90, 0.25, 1.25);
      car.angle += steer * 2.25 * steerScale * dt * Math.sign(car.speed);
    }

    const oldX = car.x;
    const oldY = car.y;
    const dx = Math.cos(car.angle) * car.speed * dt;
    const dy = Math.sin(car.angle) * car.speed * dt;
    car.x += dx;
    car.y += dy;

    if (collidesBuilding(car.x, car.y, 24) || car.x < 28 || car.y < 28 || car.x > WORLD - 28 || car.y > WORLD - 28) {
      car.x = oldX;
      car.y = oldY;
      impact(car, Math.min(18, Math.abs(car.speed) * 0.045));
      car.speed *= -0.25;
    }

    for (const other of [...traffic, ...police]) {
      if (other === car || other.dead) continue;
      const distance = Math.hypot(other.x - car.x, other.y - car.y);
      if (distance < 42) {
        const nx = (car.x - other.x) / Math.max(distance, 1);
        const ny = (car.y - other.y) / Math.max(distance, 1);
        car.x += nx * (44 - distance);
        car.y += ny * (44 - distance);
        other.x -= nx * 4;
        other.y -= ny * 4;
        impact(car, Math.min(12, Math.abs(car.speed - other.speed) * 0.035));
        if (!other.police) addWanted(0.35);
        car.speed *= 0.7;
      }
    }

    player.x = car.x;
    player.y = car.y;
    player.angle = car.angle;

    if (car.health <= 0) {
      burst(car.x, car.y, "#ff8f3d", 38);
      shake = 18;
      car.dead = true;
      player.vehicle = null;
      player.health -= 45;
      player.x += 50;
      showToast("Ride destroyed", 1400);
      blip(55, 0.5, "sawtooth", 0.1);
    }
  }

  function impact(car, damage) {
    if (car.hitTime > 0) return;
    car.health -= damage;
    car.hitTime = 0.22;
    game.collisions += 1;
    shake = Math.min(14, shake + damage * 0.5);
    burst(car.x, car.y, "#ffd36a", 7);
    blip(80 + Math.random() * 40, 0.12, "square", 0.06);
  }

  function updateTraffic(dt) {
    for (const car of traffic) {
      car.hitTime = Math.max(0, car.hitTime - dt);
      if (!car.ai || car.dead) continue;
      if (car.axis === "x") {
        car.x += car.speed * dt;
        if (car.x < -80) car.x = WORLD + 80;
        if (car.x > WORLD + 80) car.x = -80;
      } else {
        car.y += car.speed * dt;
        if (car.y < -80) car.y = WORLD + 80;
        if (car.y > WORLD + 80) car.y = -80;
      }
    }
  }

  function updatePolice(dt) {
    const target = player.vehicle || player;
    for (const cop of police) {
      const desired = Math.atan2(target.y - cop.y, target.x - cop.x);
      const diff = wrapAngle(desired - cop.angle);
      cop.angle += clamp(diff, -2.5 * dt, 2.5 * dt);
      cop.speed += 260 * dt;
      cop.speed = Math.min(cop.maxSpeed, cop.speed);
      const oldX = cop.x;
      const oldY = cop.y;
      cop.x += Math.cos(cop.angle) * cop.speed * dt;
      cop.y += Math.sin(cop.angle) * cop.speed * dt;
      if (collidesBuilding(cop.x, cop.y, 22)) {
        cop.x = oldX;
        cop.y = oldY;
        cop.angle += (Math.random() - 0.5) * 2.2;
        cop.speed *= -0.2;
      }
      const distance = Math.hypot(cop.x - target.x, cop.y - target.y);
      if (distance < 45 && player.invulnerable <= 0) {
        player.health -= 5 + game.wanted * 0.8;
        player.invulnerable = 0.45;
        shake = 9;
        if (player.vehicle) player.vehicle.health -= 3;
      }
    }
  }

  function updateWanted(dt) {
    if (game.wanted <= 0) return;
    const nearest = police.reduce((best, cop) => Math.min(best, Math.hypot(cop.x - player.x, cop.y - player.y)), Infinity);
    if (nearest < 430) {
      game.wantedCooldown = Math.max(game.wantedCooldown, 4.5);
      game.evadeTime = 0;
    } else {
      game.wantedCooldown -= dt;
      game.evadeTime += dt;
      if (game.wantedCooldown <= 0) {
        game.wanted = Math.max(0, game.wanted - 1);
        game.wantedCooldown = game.wanted ? 5 : 0;
        syncPolice();
        blip(820, 0.08, "sine", 0.04);
      }
    }
  }

  function updateMissions(dt) {
    if (game.mission === 1) {
      const remaining = Math.max(0, 75 - game.missionTime);
      missionDetail.textContent = `Deliver the Sunfire to Glitter Docks · ${Math.ceil(remaining)} seconds`;
      if (remaining <= 0) {
        game.missionTime = 0;
        game.cash = Math.max(0, game.cash - 100);
        showToast("Late fee · $100", 1400);
      }
      if (player.vehicle === missionCar && Math.hypot(player.x - checkpoint.x, player.y - checkpoint.y) < checkpoint.radius) {
        game.cash += 1500;
        game.wanted = 3;
        game.wantedCooldown = 10;
        syncPolice();
        setMission(2);
        showToast("Delivery complete · $1,500", 2000);
      }
    } else if (game.mission === 2) {
      const progress = Math.min(100, Math.round(game.evadeTime / 12 * 100));
      missionDetail.textContent = `Break line of sight and stay hidden · ${progress}%`;
      if (game.wanted <= 0 && game.evadeTime >= 12) {
        game.cash += 3000;
        setMission(3);
        game.completed = true;
        setTimeout(finishGame, 1200);
      }
    }
  }

  function finishGame() {
    if (!game.completed) return;
    gameState = "end";
    hud.classList.remove("active");
    touchControls.classList.remove("active");
    endScreen.classList.add("active");
    const minutes = Math.max(1, Math.round((performance.now() - game.startedAt) / 60000));
    document.querySelector("#end-stats").textContent =
      `$${String(Math.floor(game.cash)).padStart(6, "0")} earned · ${game.carsStolen} rides stolen · ${game.collisions} things dented · ${minutes} minute story`;
    showToast("Mission passed", 1000);
  }

  function updateParticles(dt) {
    for (let index = particles.length - 1; index >= 0; index -= 1) {
      const p = particles[index];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.pow(0.96, dt * 60);
      p.vy *= Math.pow(0.96, dt * 60);
      if (p.life <= 0) particles.splice(index, 1);
    }
  }

  function burst(x, y, color, count) {
    for (let index = 0; index < count; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 180;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.25 + Math.random() * 0.55,
        maxLife: 0.8,
        color,
        size: 2 + Math.random() * 4,
      });
    }
  }

  function moveEntity(entity, dx, dy, radius) {
    const nextX = clamp(entity.x + dx, radius, WORLD - radius);
    if (!collidesBuilding(nextX, entity.y, radius)) entity.x = nextX;
    const nextY = clamp(entity.y + dy, radius, WORLD - radius);
    if (!collidesBuilding(entity.x, nextY, radius)) entity.y = nextY;
  }

  function collidesBuilding(x, y, radius) {
    return buildings.some((b) =>
      x + radius > b.x && x - radius < b.x + b.w && y + radius > b.y && y - radius < b.y + b.h,
    );
  }

  function isOnRoad(x, y) {
    return roadLines.some((line) => Math.abs(x - line) < HALF) || roadLines.some((line) => Math.abs(y - line) < HALF);
  }

  function getDistrict(x, y) {
    if (x > 3900 && y > 3500) return "Glitter Docks";
    if (x > 3300 && y < 1800) return "Diamond Key";
    if (x < 1800 && y > 3200) return "Little Saffron";
    if (x > 2800 && y > 2100) return "Neon Palms";
    if (x < 2000 && y < 2000) return "Saffron Heights";
    return "Vice Central";
  }

  function updateAudio() {
    if (!engineGain || !engineOsc) return;
    const car = player.vehicle;
    const targetGain = soundOn && car ? 0.018 : 0;
    const speed = car ? Math.abs(car.speed) : 0;
    engineGain.gain.setTargetAtTime(targetGain, audio.currentTime, 0.08);
    engineOsc.frequency.setTargetAtTime(38 + speed * 0.32, audio.currentTime, 0.05);
  }

  function updateHud() {
    districtEl.textContent = getDistrict(player.x, player.y);
    cashEl.textContent = `$${String(Math.floor(game.cash)).padStart(6, "0")}`;
    wantedEl.innerHTML = Array.from({ length: 5 }, (_, index) =>
      `<span class="${index < Math.ceil(game.wanted) ? "hot" : ""}">★</span>`,
    ).join("");
    healthBar.style.width = `${clamp(player.health, 0, 100)}%`;
    const car = player.vehicle;
    vehicleBar.style.width = `${car ? clamp(car.health, 0, 100) : 0}%`;
    speedEl.textContent = car ? `${Math.round(Math.abs(car.speed) * 0.34)} MPH` : "ON FOOT";
  }

  function render() {
    ctx.save();
    ctx.clearRect(0, 0, width, height);
    const target = player.vehicle || player;
    const cameraX = clamp(target.x, width / 2, WORLD - width / 2);
    const cameraY = clamp(target.y, height / 2, WORLD - height / 2);
    const sx = shake ? (Math.random() - 0.5) * shake : 0;
    const sy = shake ? (Math.random() - 0.5) * shake : 0;
    shake *= 0.86;

    ctx.translate(width / 2 - cameraX + sx, height / 2 - cameraY + sy);
    drawGround(cameraX, cameraY);
    drawRoads(cameraX, cameraY);
    drawCheckpoint();
    drawBuildings(cameraX, cameraY);
    drawCars(traffic);
    drawCars(police);
    if (!player.vehicle) drawPlayer();
    drawParticles();
    ctx.restore();

    drawWeather();
    drawVignette();
    drawMinimap();
  }

  function visible(x, y, w = 0, h = 0, cameraX = player.x, cameraY = player.y) {
    return x + w > cameraX - width / 2 - 100 &&
      x < cameraX + width / 2 + 100 &&
      y + h > cameraY - height / 2 - 100 &&
      y < cameraY + height / 2 + 100;
  }

  function drawGround(cameraX, cameraY) {
    ctx.fillStyle = "#152328";
    ctx.fillRect(0, 0, WORLD, WORLD);
    ctx.fillStyle = "rgba(43, 74, 65, 0.45)";
    const startX = Math.max(0, Math.floor((cameraX - width / 2) / 80) * 80);
    const startY = Math.max(0, Math.floor((cameraY - height / 2) / 80) * 80);
    for (let x = startX; x < cameraX + width / 2 + 80; x += 80) {
      for (let y = startY; y < cameraY + height / 2 + 80; y += 80) {
        if (seeded(x * 0.2 + y) > 0.54) ctx.fillRect(x + 8, y + 8, 3, 3);
      }
    }
    ctx.strokeStyle = "#533c5c";
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, WORLD - 10, WORLD - 10);
  }

  function drawRoads(cameraX, cameraY) {
    ctx.fillStyle = "#151820";
    for (const line of roadLines) {
      if (line > cameraX - width / 2 - HALF && line < cameraX + width / 2 + HALF) {
        ctx.fillRect(line - HALF, 0, ROAD, WORLD);
      }
      if (line > cameraY - height / 2 - HALF && line < cameraY + height / 2 + HALF) {
        ctx.fillRect(0, line - HALF, WORLD, ROAD);
      }
    }

    ctx.save();
    ctx.setLineDash([22, 24]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255, 220, 92, 0.5)";
    for (const line of roadLines) {
      ctx.beginPath();
      ctx.moveTo(line, Math.max(0, cameraY - height));
      ctx.lineTo(line, Math.min(WORLD, cameraY + height));
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(Math.max(0, cameraX - width), line);
      ctx.lineTo(Math.min(WORLD, cameraX + width), line);
      ctx.stroke();
    }
    ctx.restore();

    ctx.fillStyle = "rgba(75, 202, 189, 0.16)";
    for (const x of roadLines) {
      for (const y of roadLines) {
        if (!visible(x - 120, y - 120, 240, 240, cameraX, cameraY)) continue;
        for (let stripe = -60; stripe <= 60; stripe += 24) {
          ctx.fillRect(x + stripe - 7, y - 77, 14, 32);
          ctx.fillRect(x + stripe - 7, y + 45, 14, 32);
          ctx.fillRect(x - 77, y + stripe - 7, 32, 14);
          ctx.fillRect(x + 45, y + stripe - 7, 32, 14);
        }
      }
    }
  }

  function drawBuildings(cameraX, cameraY) {
    for (const b of buildings) {
      if (!visible(b.x, b.y, b.w, b.h, cameraX, cameraY)) continue;
      ctx.fillStyle = "rgba(2, 4, 8, 0.48)";
      ctx.fillRect(b.x + b.height * 0.42, b.y + b.height * 0.42, b.w, b.h);
      ctx.fillStyle = `hsl(${b.hue} 20% 17%)`;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = `hsla(${b.hue} 55% 63% / 0.22)`;
      ctx.lineWidth = 3;
      ctx.strokeRect(b.x + 1.5, b.y + 1.5, b.w - 3, b.h - 3);

      const windowColor = `hsla(${b.hue + 120} 85% 70% / 0.34)`;
      ctx.fillStyle = windowColor;
      for (let wx = b.x + 22; wx < b.x + b.w - 12; wx += 42) {
        for (let wy = b.y + 22; wy < b.y + b.h - 12; wy += 42) {
          if (seeded(wx * 3 + wy * 7) > 0.44) ctx.fillRect(wx, wy, 10, 7);
        }
      }

      if (b.sign && b.w > 120 && b.h > 80) {
        const color = neonColors[Math.floor(seeded(b.x + b.y) * neonColors.length)];
        ctx.save();
        ctx.shadowBlur = 14;
        ctx.shadowColor = color;
        ctx.fillStyle = color;
        ctx.font = "900 18px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2);
        ctx.restore();
      }
    }
  }

  function drawCheckpoint() {
    if (game.mission !== 1) return;
    const pulse = 1 + Math.sin(worldTime * 4) * 0.08;
    ctx.save();
    ctx.translate(checkpoint.x, checkpoint.y);
    ctx.scale(pulse, pulse);
    ctx.strokeStyle = "#dcff3f";
    ctx.fillStyle = "rgba(220, 255, 63, 0.1)";
    ctx.lineWidth = 8;
    ctx.shadowBlur = 20;
    ctx.shadowColor = "#dcff3f";
    ctx.beginPath();
    ctx.arc(0, 0, checkpoint.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.font = "900 18px Arial";
    ctx.textAlign = "center";
    ctx.fillText("DELIVERY", 0, 6);
    ctx.restore();
  }

  function drawCars(cars) {
    for (const car of cars) {
      if (car.dead || !visible(car.x - 40, car.y - 40, 80, 80)) continue;
      ctx.save();
      ctx.translate(car.x, car.y);
      ctx.rotate(car.angle);
      ctx.fillStyle = "rgba(0,0,0,0.42)";
      ctx.fillRect(-car.length / 2 + 6, -car.width / 2 + 7, car.length, car.width);

      if (car.special && game.mission === 0) {
        ctx.strokeStyle = "#dcff3f";
        ctx.lineWidth = 3;
        ctx.shadowBlur = 18;
        ctx.shadowColor = "#dcff3f";
        ctx.beginPath();
        ctx.arc(0, 0, 44 + Math.sin(worldTime * 4) * 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      ctx.fillStyle = "#08090d";
      ctx.fillRect(-20, -20, 13, 4);
      ctx.fillRect(8, -20, 13, 4);
      ctx.fillRect(-20, 16, 13, 4);
      ctx.fillRect(8, 16, 13, 4);
      ctx.fillStyle = car.color;
      roundRect(ctx, -29, -15.5, 58, 31, 7);
      ctx.fill();
      ctx.fillStyle = car.police ? "#d7e6f2" : "rgba(13, 25, 36, 0.88)";
      roundRect(ctx, -13, -12, 25, 24, 5);
      ctx.fill();
      ctx.fillStyle = "rgba(195, 235, 255, 0.55)";
      ctx.fillRect(-10, -10, 7, 20);
      ctx.fillStyle = "#fff4c8";
      ctx.fillRect(25, -10, 3, 7);
      ctx.fillRect(25, 3, 3, 7);
      ctx.fillStyle = "#ff244f";
      ctx.fillRect(-29, -10, 3, 7);
      ctx.fillRect(-29, 3, 3, 7);

      if (car.police) {
        const flip = Math.floor(worldTime * 9) % 2;
        ctx.fillStyle = flip ? "#ff204f" : "#2669ff";
        ctx.shadowBlur = 14;
        ctx.shadowColor = ctx.fillStyle;
        ctx.fillRect(-2, -13, 5, 12);
      }
      ctx.restore();
    }
  }

  function drawPlayer() {
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.ellipse(5, 7, 13, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = player.invulnerable > 0 ? "#fff" : "#f3b66f";
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ff3d9d";
    ctx.fillRect(-7, -6, 14, 14);
    ctx.fillStyle = "#dcff3f";
    ctx.fillRect(7, -2, 9, 4);
    ctx.restore();
  }

  function drawParticles() {
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  function drawWeather() {
    ctx.save();
    ctx.strokeStyle = "rgba(170, 215, 255, 0.13)";
    ctx.lineWidth = 1;
    for (const drop of rain) {
      const x = (drop.x * width + worldTime * 110 * drop.speed) % (width + 70) - 35;
      const y = (drop.y * height + worldTime * 520 * drop.speed) % (height + 70) - 35;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - drop.length * 0.28, y + drop.length);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawVignette() {
    const gradient = ctx.createRadialGradient(width / 2, height / 2, height * 0.15, width / 2, height / 2, Math.max(width, height) * 0.72);
    gradient.addColorStop(0, "rgba(5, 5, 10, 0)");
    gradient.addColorStop(1, "rgba(4, 2, 8, 0.58)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  function drawMinimap() {
    const size = mapCanvas.width;
    const radius = size / 2;
    const scale = 0.105;
    mapCtx.clearRect(0, 0, size, size);
    mapCtx.save();
    mapCtx.beginPath();
    mapCtx.arc(radius, radius, radius - 4, 0, Math.PI * 2);
    mapCtx.clip();
    mapCtx.fillStyle = "#10151c";
    mapCtx.fillRect(0, 0, size, size);
    mapCtx.translate(radius - player.x * scale, radius - player.y * scale);
    mapCtx.strokeStyle = "#47505b";
    mapCtx.lineWidth = ROAD * scale;
    for (const line of roadLines) {
      mapCtx.beginPath();
      mapCtx.moveTo(line * scale, 0);
      mapCtx.lineTo(line * scale, WORLD * scale);
      mapCtx.stroke();
      mapCtx.beginPath();
      mapCtx.moveTo(0, line * scale);
      mapCtx.lineTo(WORLD * scale, line * scale);
      mapCtx.stroke();
    }

    if (game.mission === 0) mapDot(mapCtx, missionCar.x * scale, missionCar.y * scale, "#dcff3f", 8);
    if (game.mission === 1) mapDot(mapCtx, checkpoint.x * scale, checkpoint.y * scale, "#dcff3f", 10);
    for (const cop of police) mapDot(mapCtx, cop.x * scale, cop.y * scale, "#ff315e", 6);
    mapCtx.restore();
    mapCtx.save();
    mapCtx.translate(radius, radius);
    mapCtx.rotate(player.angle);
    mapCtx.fillStyle = "#fff";
    mapCtx.beginPath();
    mapCtx.moveTo(12, 0);
    mapCtx.lineTo(-8, -7);
    mapCtx.lineTo(-5, 0);
    mapCtx.lineTo(-8, 7);
    mapCtx.closePath();
    mapCtx.fill();
    mapCtx.restore();
  }

  function mapDot(context, x, y, color, size) {
    context.fillStyle = color;
    context.shadowBlur = size;
    context.shadowColor = color;
    context.beginPath();
    context.arc(x, y, size, 0, Math.PI * 2);
    context.fill();
    context.shadowBlur = 0;
  }

  function roundRect(context, x, y, w, h, radius) {
    context.beginPath();
    context.roundRect(x, y, w, h, radius);
  }

  function wrapAngle(angle) {
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function frame(time) {
    const dt = Math.min(0.034, (time - lastTime) / 1000 || 0);
    lastTime = time;
    update(dt);
    render();
    justPressed.clear();
    requestAnimationFrame(frame);
  }

  window.addEventListener("resize", resize);
  window.addEventListener("keydown", (event) => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (!keys[key]) justPressed.add(key);
    keys[key] = true;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(key)) event.preventDefault();
    if (key === "Escape" && gameState === "paused") {
      event.preventDefault();
      togglePause(false);
    }
  });
  window.addEventListener("keyup", (event) => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    keys[key] = false;
  });
  window.addEventListener("blur", () => {
    for (const key of Object.keys(keys)) keys[key] = false;
    if (gameState === "play") togglePause(true);
  });

  document.querySelector("#start-button").addEventListener("click", startGame);
  document.querySelector("#resume-button").addEventListener("click", () => togglePause(false));
  document.querySelector("#restart-button").addEventListener("click", startGame);
  document.querySelector("#again-button").addEventListener("click", startGame);
  document.querySelector("#pause-button").addEventListener("click", () => togglePause());
  soundButton.addEventListener("click", () => {
    soundOn = !soundOn;
    soundButton.textContent = soundOn ? "♪" : "×";
    soundButton.setAttribute("aria-label", soundOn ? "Mute sound" : "Enable sound");
    if (soundOn) ensureAudio();
  });

  document.querySelectorAll("[data-key]").forEach((button) => {
    const key = button.dataset.key;
    const press = (event) => {
      event.preventDefault();
      if (!keys[key]) justPressed.add(key);
      keys[key] = true;
      ensureAudio();
    };
    const release = (event) => {
      event.preventDefault();
      keys[key] = false;
    };
    button.addEventListener("pointerdown", press);
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("pointerleave", release);
  });

  resize();
  generateCity();
  updateMissionText();
  updateHud();
  requestAnimationFrame(frame);
})();
