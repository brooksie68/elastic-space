// Shared dashboard chrome for Elastic Space pages.
// Renders a fixed dashboard icon in the top right corner linking back to the
// admin panel at the repo root. Site-wide visibility is controlled from the
// admin panel's "show dashboard icons" toggle (localStorage). While the icon is
// visible, the shared sound control (if the page has one) slides down to sit
// directly below it.
//
// Usage: load this script on every page. No call needed — it attaches itself.

(function () {
  const KEY = "elastic-dashboard-icons";

  // Worlds sit at src/worlds/<slug>/, three levels below the admin panel.
  // Pages elsewhere override via <script src="..." data-home="./index.html">.
  const HOME_HREF =
    (document.currentScript && document.currentScript.dataset.home) || "../../../index.html";

  function iconsEnabled() {
    try {
      return localStorage.getItem(KEY) !== "off";
    } catch {
      return true;
    }
  }

  const STYLE = `
    .es-dash {
      align-items: center;
      background: rgba(20, 20, 20, 0.45);
      border: 1px solid rgba(255, 255, 255, 0.28);
      border-radius: 50%;
      color: rgba(255, 255, 255, 0.85);
      display: flex;
      height: 2.5rem;
      justify-content: center;
      position: fixed;
      right: 1rem;
      top: 1rem;
      transition: background 200ms ease, color 200ms ease;
      width: 2.5rem;
      z-index: 2147483001;
    }

    .es-dash:hover,
    .es-dash:focus-visible {
      background: rgba(20, 20, 20, 0.7);
      color: #fff;
    }

    .es-dash svg {
      height: 1.15rem;
      width: 1.15rem;
    }

    html:not([data-es-dash]) .es-dash {
      display: none;
    }
  `;

  const ICON = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="9" rx="1.5"></rect>
      <rect x="14" y="3" width="7" height="5" rx="1.5"></rect>
      <rect x="14" y="12" width="7" height="9" rx="1.5"></rect>
      <rect x="3" y="16" width="7" height="5" rx="1.5"></rect>
    </svg>
  `;

  // The attribute (not the link) carries visibility so other shared chrome —
  // sound-control's speaker offset — can react in pure CSS.
  function apply() {
    if (iconsEnabled()) {
      document.documentElement.dataset.esDash = "on";
    } else {
      delete document.documentElement.dataset.esDash;
    }
  }

  function init() {
    const style = document.createElement("style");
    style.textContent = STYLE;
    document.head.appendChild(style);

    const link = document.createElement("a");
    link.className = "es-dash";
    link.href = HOME_HREF;
    link.title = "Dashboard";
    link.setAttribute("aria-label", "Dashboard");
    link.innerHTML = ICON;
    document.body.appendChild(link);

    apply();

    // Live-update when the admin panel toggle changes in another tab.
    window.addEventListener("storage", (event) => {
      if (!event.key || event.key === KEY) {
        apply();
      }
    });
  }

  if (document.body) {
    init();
  } else {
    document.addEventListener("DOMContentLoaded", init);
  }
})();
