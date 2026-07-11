// Shared sound control for Elastic Space worlds.
// A small speaker button, fixed top right: click toggles the world's sound,
// hover (while on) reveals a volume slider. Pulses twice on load to announce itself.
//
// Usage (after loading this script):
//   With a media element:
//     ElasticSoundControl.attach({ media: droneAudioElement });
//   With custom audio (e.g. Web Audio synthesis):
//     ElasticSoundControl.attach({
//       start: () => { ... },          // begin sound; may return a Promise
//       stop: () => { ... },           // silence it
//       setVolume: (v) => { ... },     // v in [0, 1]
//     });
//
// attach() also tries autoplay once. If the browser allows it (site sound
// permission granted, or enough media engagement), sound starts immediately
// and the icon shows "on". Otherwise the icon stays "off" and waits for a click.

(function () {
  const STYLE = `
    .es-sound {
      align-items: center;
      display: flex;
      flex-direction: row-reverse;
      gap: 0.5rem;
      position: fixed;
      right: 1rem;
      top: 1rem;
      z-index: 2147483000;
    }

    .es-sound__btn {
      align-items: center;
      appearance: none;
      background: rgba(20, 20, 20, 0.45);
      border: 1px solid rgba(255, 255, 255, 0.28);
      border-radius: 50%;
      color: rgba(255, 255, 255, 0.85);
      cursor: pointer;
      display: flex;
      height: 2.5rem;
      justify-content: center;
      padding: 0;
      transition: background 200ms ease, color 200ms ease;
      width: 2.5rem;
    }

    .es-sound__btn:hover,
    .es-sound__btn:focus-visible {
      background: rgba(20, 20, 20, 0.7);
      color: #fff;
    }

    .es-sound__btn svg {
      height: 1.15rem;
      width: 1.15rem;
    }

    .es-sound__wave,
    .es-sound__slash {
      transition: opacity 200ms ease;
    }

    .es-sound--on .es-sound__slash { opacity: 0; }
    .es-sound--off .es-sound__wave { opacity: 0; }

    .es-sound--pulse .es-sound__btn {
      animation: es-sound-pulse 0.9s ease-in-out 2;
    }

    @keyframes es-sound-pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.22); background: rgba(255, 255, 255, 0.28); }
    }

    .es-sound__slider {
      accent-color: rgba(255, 255, 255, 0.85);
      cursor: pointer;
      opacity: 0;
      pointer-events: none;
      transition: opacity 200ms ease, width 200ms ease;
      width: 0;
    }

    .es-sound--on:hover .es-sound__slider,
    .es-sound--on:focus-within .es-sound__slider {
      opacity: 1;
      pointer-events: auto;
      width: 6rem;
    }
  `;

  const ICON = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M11 5 6 9H2v6h4l5 4V5z" fill="currentColor" stroke="none"></path>
      <path class="es-sound__wave" d="M15.5 8.5a5 5 0 0 1 0 7"></path>
      <path class="es-sound__wave" d="M18.5 5.5a9.5 9.5 0 0 1 0 13"></path>
      <line class="es-sound__slash" x1="15" y1="9" x2="21" y2="15"></line>
      <line class="es-sound__slash" x1="21" y1="9" x2="15" y2="15"></line>
    </svg>
  `;

  function attach(options) {
    const media = options.media;
    const control = {
      start: media ? () => media.play() : options.start,
      stop: media ? () => media.pause() : options.stop,
      setVolume: media ? (v) => { media.volume = v; } : options.setVolume,
    };

    const style = document.createElement("style");
    style.textContent = STYLE;
    document.head.appendChild(style);

    const root = document.createElement("div");
    root.className = "es-sound es-sound--off es-sound--pulse";
    root.innerHTML = `
      <button type="button" class="es-sound__btn" aria-pressed="false"
              title="Turn on this world's sound" aria-label="Turn on this world's sound">${ICON}</button>
      <input type="range" class="es-sound__slider" min="0" max="1" step="0.01"
             value="${media ? media.volume : 1}" aria-label="Volume" />
    `;
    document.body.appendChild(root);

    const button = root.querySelector(".es-sound__btn");
    const slider = root.querySelector(".es-sound__slider");
    let on = false;

    function render() {
      root.classList.toggle("es-sound--on", on);
      root.classList.toggle("es-sound--off", !on);
      const label = on ? "Turn off this world's sound" : "Turn on this world's sound";
      button.setAttribute("aria-pressed", String(on));
      button.setAttribute("aria-label", label);
      button.title = label;
    }

    function setOn(next) {
      on = next;
      render();
    }

    button.addEventListener("click", () => {
      if (on) {
        control.stop();
        setOn(false);
      } else {
        Promise.resolve(control.start()).then(() => setOn(true)).catch(() => setOn(false));
      }
    });

    slider.addEventListener("input", () => {
      control.setVolume(Number(slider.value));
    });

    if (media) {
      media.addEventListener("play", () => setOn(true));
      media.addEventListener("pause", () => setOn(false));
    }

    root.addEventListener("animationend", () => root.classList.remove("es-sound--pulse"), { once: true });

    // One autoplay attempt: succeeds when the visitor has granted the site
    // sound permission (or earned it); otherwise the button is the way in.
    Promise.resolve(control.start()).then(() => setOn(true)).catch(() => {});

    return { setOn };
  }

  window.ElasticSoundControl = { attach };
})();
