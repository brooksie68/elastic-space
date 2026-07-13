// The Toot Suite — 36 artisanal farts on a big puffy soundboard.
(function () {
  "use strict";

  const FARTS = [
    ["01-squeaker", "Lil' Squeaker", "🐭"],
    ["02-whisperer", "The Whisperer", "🤫"],
    ["03-bass-drop", "Bass Drop", "🔊"],
    ["04-trombone", "Sad Trombone", "🎺"],
    ["05-machine-gun", "Machine Gun", "🍿"],
    ["06-long-haul", "The Long Haul", "🚛"],
    ["07-wet-one", "Wet One", "💦"],
    ["08-swamp-monster", "Swamp Monster", "🐊"],
    ["09-balloon", "Balloon Pinch", "🎈"],
    ["10-ducky", "The Duck", "🦆"],
    ["11-question", "The Question", "❓"],
    ["12-grandpa", "Grandpa", "👴"],
    ["13-bubble-bath", "Bubble Bath", "🛁"],
    ["14-jet-engine", "Jet Engine", "✈️"],
    ["15-tiny-toot", "Tiny Toot", "🐜"],
    ["16-regret", "The Regret", "😬"],
    ["17-velcro", "Velcro", "🩹"],
    ["18-motorboat", "Motorboat", "🚤"],
    ["19-squelch", "The Squelch", "🥾"],
    ["20-foghorn", "Foghorn", "🚢"],
    ["21-popcorn", "Popcorn", "🌽"],
    ["22-slide-whistle", "Slide Whistle", "🎢"],
    ["23-thunder", "Distant Thunder", "⛈️"],
    ["24-sneak", "The Sneak", "🥷"],
    ["25-rubber-chicken", "Rubber Chicken", "🐔"],
    ["26-double-tap", "Double Tap", "✌️"],
    ["27-creaky-door", "Creaky Door", "🚪"],
    ["28-raspberry", "Raspberry", "👅"],
    ["29-espresso", "The Espresso", "☕"],
    ["30-beast", "THE BEAST", "👹"],
    ["31-whoopee", "Whoopee Classic", "🪑"],
    ["32-deflate", "The Deflate", "🛟"],
    ["33-gravel", "Gravel Road", "🪨"],
    ["34-soprano", "The Soprano", "🎭"],
    ["35-morse-code", "Morse Code", "📡"],
    ["36-grand-finale", "GRAND FINALE", "🎆"],
  ];

  // Candy palette, cycled across the grid.
  const COLORS = [
    "#ff8fc0", "#ffb347", "#7ed957", "#5ac8fa",
    "#b58cf5", "#ff7a70", "#ffd93d", "#4dd6b8",
  ];

  let soundOn = false;
  let volume = 1;
  const playing = new Set();
  const MAX_CONCURRENT = 12;

  const control = ElasticSoundControl.attach({
    start: () => { soundOn = true; },
    stop: () => {
      soundOn = false;
      playing.forEach((a) => { a.pause(); });
      playing.clear();
    },
    setVolume: (v) => {
      volume = v;
      playing.forEach((a) => { a.volume = v; });
    },
  });

  function playFart(file) {
    if (!soundOn) return;
    if (playing.size >= MAX_CONCURRENT) {
      const oldest = playing.values().next().value;
      oldest.pause();
      playing.delete(oldest);
    }
    const audio = new Audio("./assets/audio/" + file + ".mp3");
    audio.volume = volume;
    playing.add(audio);
    const done = () => playing.delete(audio);
    audio.addEventListener("ended", done);
    audio.addEventListener("pause", done);
    audio.play().catch(done);
  }

  function spawnPuffs(x, y) {
    for (let i = 0; i < 6; i++) {
      const p = document.createElement("span");
      p.className = "pop-puff";
      const angle = Math.random() * Math.PI * 2;
      const dist = 40 + Math.random() * 60;
      p.style.setProperty("--x0", x + "px");
      p.style.setProperty("--y0", y + "px");
      p.style.setProperty("--x1", x + Math.cos(angle) * dist + "px");
      p.style.setProperty("--y1", y + Math.sin(angle) * dist - 30 + "px");
      document.body.appendChild(p);
      // Timer removal, not animation.finished — survives frozen timelines.
      setTimeout(() => p.remove(), 900);
    }
  }

  function press(btn, file) {
    playFart(file);
    const rect = btn.getBoundingClientRect();
    spawnPuffs(rect.left + rect.width / 2, rect.top + rect.height / 2);
    btn.classList.remove("jiggle");
    void btn.offsetWidth; // restart the animation
    btn.classList.add("jiggle");
  }

  const board = document.getElementById("board");
  FARTS.forEach(([file, name, emoji], i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "fart-btn";
    btn.style.setProperty("--btn-color", COLORS[i % COLORS.length]);
    btn.style.setProperty("--tilt", (i % 2 ? 1.5 : -1.5) + "deg");
    btn.innerHTML =
      '<span class="fart-emoji" aria-hidden="true">' + emoji + "</span>" +
      '<span class="fart-name">' + name + "</span>";
    btn.addEventListener("click", () => press(btn, file));
    board.appendChild(btn);
  });

  document.getElementById("mystery").addEventListener("click", (e) => {
    const [file] = FARTS[Math.floor(Math.random() * FARTS.length)];
    playFart(file);
    spawnPuffs(e.clientX || innerWidth / 2, e.clientY || innerHeight / 2);
  });

  void control;
})();
