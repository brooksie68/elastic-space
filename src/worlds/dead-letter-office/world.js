/*
 * The Dead Letter Office — added by claude-fable, 2026-07-04.
 * Self-contained: touches nothing outside this folder.
 * A dreary 1980s basement mail room, drawn as 16-bit pixel art on a
 * low-resolution canvas and upscaled. Twelve authored letters; the four
 * with ink-blue return addresses are exits.
 */

const LETTERS = [
  {
    to: "The Occupant\n14 Milk Street\nAshfield",
    from: "M. Doyle\nRoom 6, The Excelsior",
    stamp: "No Such Street",
    postmark: ["Dead Letter", "Office", "Apr 1991"],
    body: [
      "I am returning your umbrella. I borrowed it on the 3rd of April, 1951, outside the cinema, meaning to give it back the following week. The week did not behave as expected.",
      "It has kept me dry through four cities and two marriages, and I am ashamed of how well it has worked.",
      "Please find it enclosed. (I could not fold it into the envelope. I have enclosed the idea of it instead.)",
    ],
    sign: "Apologetically, M.",
  },
  {
    to: "The Bureau of Forgotten Weather\nSub-basement 4\nThe Records Annex",
    from: "D. Okafor\nApt. 3, rear",
    stamp: "Addressee Unknown",
    postmark: ["Dead Letter", "Office", "Jun 1987"],
    body: [
      "I would like to request one (1) afternoon of light rain from June 1987 — the one that hit the tin roof of my grandmother's porch between roughly two and five o'clock.",
      "I have completed the enclosed forms as best I could. Where the form asked for coordinates I have written “the porch.”",
      "I understand there may be a waiting period.",
    ],
    sign: "Respectfully, D. Okafor",
  },
  {
    to: "The Keeper\nThe Old Light\nPoint Perpetua",
    from: "(no return address)",
    stamp: "Delivery Refused",
    postmark: ["Dead Letter", "Office", "Nov 1968"],
    body: [
      "Your light comes through my window every nine seconds and drags its white sleeve across my dreams. Last night it swept away a staircase I had almost finished climbing.",
      "I am not asking you to stop. I am asking what is at the top.",
    ],
    sign: "— A neighbor",
  },
  {
    to: "Cpl. T. Havel\nGeneral Delivery\nWherever the army keeps you now",
    from: "R.\nThe kitchen table",
    stamp: "Moved — Left No Address",
    postmark: ["Dead Letter", "Office", "Feb 1994"],
    body: [
      "Knight to f3.",
      "It has been your move for thirty-one years. I have kept the board set up on the kitchen table, and I dust the pieces on Sundays. The cat knocked over your queen in the autumn of '09 but I put her back exactly.",
      "Take your time. I only wanted you to know the game is still on.",
    ],
    sign: "Your friend, R.",
  },
  {
    to: "The Sea\n(all of it)",
    from: "Adm. B. Whitlock (ret.)\nThe Esplanade",
    stamp: "Unclaimed",
    postmark: ["Dead Letter", "Office", "Aug 1975"],
    body: [
      "On the 14th inst., at approximately noon, your representative — a wave of medium size — removed my hat from my head without provocation. It was a good hat.",
      "I demand its return, or a hat of equal value, or an explanation of what the sea is doing with all of them.",
    ],
    sign: "Cordially furious, Adm. B. Whitlock (ret.)",
  },
  {
    to: "The person I was at nineteen\nThe blue house on Delancey\n(they will know)",
    from: "You, later",
    stamp: "Postage Due: One Memory",
    postmark: ["Dead Letter", "Office", "Undated"],
    body: [
      "You were right about almost nothing, and I miss you terribly.",
      "Do not take the job. Take the trip. Learn the names of trees earlier than I did. The girl at the bakery is going to break your heart and it is worth it.",
      "P.S. We still cannot whistle.",
    ],
    sign: "— You, later",
  },
  {
    to: "The Department of Echoes\nCanyon District",
    from: "(name withheld, twice)",
    stamp: "Return to Sender",
    postmark: ["Dead Letter", "Office", "May 1982"],
    body: [
      "I write to complain that everything I say to your canyon has been coming back to me. I have said things to that canyon I only ever intended to send one way.",
      "Kindly filter what is returned. Some of it I have heard twice now and cannot stop hearing.",
    ],
    sign: "— (name withheld, twice)",
  },
  {
    to: "Miss E. Farrow\nSeat 14C, the 5:52 evening train\n(northbound)",
    from: "The passenger in 14D",
    stamp: "Undeliverable as Addressed",
    postmark: ["Dead Letter", "Office", "Oct 1959"],
    body: [
      "Things seen from the window between Halloway and the tunnel, as promised: one heron, standing in a flooded field like a nail. Three dogs, unrelated. A man painting a fence at dusk, badly. Forty-one telegraph poles. Your reflection, for the length of the tunnel.",
      "That last one is the reason I am writing.",
    ],
    sign: "— The passenger in 14D",
  },
  {
    to: "The Storm\nlast seen over the dusk field",
    from: "A return address\nwritten in blue ink",
    portal: {
      label: "Follow the return address somewhere else",
    },
    stamp: "Return to Sender",
    postmark: ["Dead Letter", "Office", "At Dusk"],
    body: [
      "We regret to report that your rain has been sent back the way it came. It fell upward all evening, and the flowers were not sure what to make of it.",
      "If you want to see it happen, you will have to stand in the field yourself.",
    ],
    sign: "— The undersigned wildflowers",
  },
  {
    to: "Whoever maintains the streetlight\nat the end of Vane Street",
    from: "A return address\nwith no known station",
    portal: {
      label: "Follow the return address somewhere else",
    },
    stamp: "Do Not Bend",
    postmark: ["Dead Letter", "Office", "3:11 AM"],
    body: [
      "Your streetlight has been flickering in a pattern. I wrote the pattern down. It is not random. It spells the same word over and over, and I have begun to see the word in other lights. The elevator. The exit sign. My telephone.",
      "If you want to know where the flicker comes from, the return address is real.",
    ],
    sign: "— Wide awake on Vane St.",
  },
  {
    to: "The Tender of Lanterns\nPelagic Habitat\nbelow the shelf",
    from: "A water-damaged\nreturn address",
    portal: {
      label: "Follow the return address somewhere else",
    },
    stamp: "Received Wet",
    postmark: ["Dead Letter", "Office", "High Tide"],
    body: [
      "Your shipment of light arrived damaged. Several lumens had leaked out of the crate and were found swimming in the harbor, where they have since been adopted by the fish. The fish glow now.",
      "We consider the matter resolved, but you may want to look in on your lanterns yourself.",
    ],
    sign: "— Harbormaster, night shift",
  },
  {
    to: "THE CURRENT OCCUPANT\nOF THIS PAGE",
    from: "No fixed address",
    portal: {
      label: "Follow the return address somewhere else",
    },
    stamp: "Final Notice",
    postmark: ["Dead Letter", "Office", "Now"],
    body: [
      "You have been in the sorting room a while now. That is allowed. The mail is patient, and so is the dark.",
      "But when you are ready: something bioluminescent has been asking after you. It does not use the postal system. It says you know the way, and if you don't, the return address does.",
    ],
    sign: "— The Office",
  },
];

/* ================= the room painter ================= */

const BASE_W = 384; /* layout units; the canvas renders at DETAIL x this */
const DETAIL = 3; /* fidelity level: 1 = 16-bit, 2 = 32-bit, 3 = arcade-board pass */
const roomCanvas = document.getElementById("room-canvas");
const room = roomCanvas.getContext("2d");
const basketCanvas = document.getElementById("basket-canvas");
const deskCanvas = document.getElementById("desk-canvas");
const postmasterCanvas = document.getElementById("postmaster");
const punchClock = document.getElementById("punchclock");
const bubbleEl = document.getElementById("bubble");
let pixelScale = 1; // displayed CSS px per canvas px, for snapping sprites

/* geometry shared between the painter, the mail physics, and the postmaster */
const SCENE = {
  scaleX: 1,
  scaleY: 1,
  basketCxCss: 0,
  basketSpreadCss: 60,
  basketRimCss: Infinity,
  bubbleRightCss: 40,
  bubbleBottomCss: 200,
};

let seed = 7;
function rnd() {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}

/* snap to the half-unit grid so fills stay crisp at DETAIL scale */
function half(value) {
  return Math.round(value * DETAIL) / DETAIL;
}

function px(x, y, w, h, color) {
  room.fillStyle = color;
  room.fillRect(half(x), half(y), half(w), half(h));
}

function dither(x, y, w, h, color) {
  room.fillStyle = color;
  const step = 1 / DETAIL;
  for (let row = 0; row < h; row += step) {
    const offset = Math.round((x + y + row) * DETAIL) % 2 === 0 ? 0 : step;
    for (let col = offset; col < w; col += step * 2) {
      room.fillRect(half(x + col), half(y + row), step, step);
    }
  }
}

function spacedText(text, centerX, y, color, fontPx, gap) {
  room.fillStyle = color;
  room.font = `bold ${fontPx}px "Courier New", monospace`;
  const widths = [...text].map((ch) => room.measureText(ch).width + gap);
  const total = widths.reduce((sum, w) => sum + w, 0) - gap;
  let x = centerX - total / 2;
  [...text].forEach((ch, i) => {
    room.fillText(ch, Math.round(x), Math.round(y));
    x += widths[i];
  });
}

function paintRoom() {
  const W = BASE_W;
  const H = Math.max(170, Math.min(340, Math.round((W * window.innerHeight) / window.innerWidth)));
  roomCanvas.width = W * DETAIL;
  roomCanvas.height = H * DETAIL;
  room.setTransform(DETAIL, 0, 0, DETAIL, 0, 0);
  pixelScale = window.innerWidth / (W * DETAIL);
  room.imageSmoothingEnabled = false;
  seed = 7;

  const ceilY = Math.round(H * 0.1);
  const floorY = Math.round(H * 0.76);

  /* ceiling */
  px(0, 0, W, ceilY, "#101214");
  px(0, ceilY - 1, W, 1, "#080909");

  /* cinderblock wall */
  px(0, ceilY, W, floorY - ceilY, "#43493c");
  const blockW = 24;
  const blockH = 10;
  for (let row = 0; (row * blockH) < floorY - ceilY; row += 1) {
    const y = ceilY + row * blockH;
    const offset = row % 2 === 0 ? 0 : blockW / 2;
    px(0, y, W, 1, "#333a2e");
    for (let x = offset; x < W + blockW; x += blockW) {
      px(x, y, 1, blockH, "#333a2e");
      px(x + 0.5, y, 0.5, blockH, "rgba(0,0,0,0.14)");
      if (rnd() < 0.16) {
        const lit = rnd() < 0.5;
        px(x - blockW + 2, y + 2, blockW - 3, blockH - 3, lit ? "#474e40" : "#3e4438");
        px(x - blockW + 2, y + 2, blockW - 3, 0.5, lit ? "#565e4e" : "#4a5145");
        px(x - blockW + 2, y + blockH - 1.5, blockW - 3, 0.5, "rgba(0,0,0,0.18)");
      }
    }
    px(0, y + 0.5, W, 0.5, "rgba(0,0,0,0.1)");
  }

  /* damp stains and drips */
  for (let i = 0; i < 5; i += 1) {
    const sx = rnd() * W;
    const sy = ceilY + rnd() * (floorY - ceilY) * 0.5;
    dither(sx, sy, 14 + rnd() * 22, 8 + rnd() * 14, "rgba(24,28,22,0.5)");
  }
  dither(W - 30, ceilY, 4, floorY - ceilY - 20, "rgba(24,28,22,0.6)");

  /* light cone from the tube onto wall and floor */
  const cx = W / 2;
  for (let y = ceilY + 14; y < floorY; y += 1) {
    const t = (y - ceilY) / (floorY - ceilY);
    const half = 38 + t * 44;
    if ((y + 1) % 2 === 0) {
      dither(cx - half, y, half * 2, 1, `rgba(216,230,200,${0.12 - t * 0.07})`);
    }
  }

  /* floor */
  px(0, floorY, W, H - floorY, "#2a2823");
  px(0, floorY, W, 1, "#171613");
  for (let y = floorY + 3; y < H; y += 4) {
    px(0, y, W, 1, "rgba(0,0,0,0.16)");
  }
  dither(cx - 52, floorY + 2, 104, Math.min(26, H - floorY - 4), "rgba(216,230,200,0.07)");
  /* worn-concrete speckle */
  for (let i = 0; i < 260; i += 1) {
    const fx = rnd() * W;
    const fy = floorY + 1 + rnd() * (H - floorY - 2);
    px(fx, fy, 1 / DETAIL, 1 / DETAIL, rnd() < 0.45 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.28)");
  }

  /* pipes along the ceiling */
  px(0, 2, W, 4, "#4d525a");
  px(0, 5, W, 1, "#2c2f34");
  px(0, 9, W, 3, "#5a4f42");
  px(0, 11, W, 1, "#332c24");
  for (let x = 14; x < W; x += 48) {
    px(x, 2, 2, 10, "#31353b");
  }
  /* pipe elbow and vertical run, right side */
  px(W - 26, 9, 8, 3, "#5a4f42");
  px(W - 22, 9, 4, ceilY + 30, "#5a4f42");
  px(W - 22, 9, 1, ceilY + 30, "#6d6152");
  dither(W - 24, ceilY + 34, 8, 5, "rgba(24,28,22,0.7)");

  /* fluorescent fixture */
  px(cx - 20, 0, 2, 12, "#3a3d40");
  px(cx + 18, 0, 2, 12, "#3a3d40");
  px(cx - 38, 12, 76, 7, "#3a3d40");
  px(cx - 38, 12, 76, 1, "#54585c");
  px(cx - 38, 18.5, 76, 0.5, "#212427");
  px(cx - 38, 12, 1.5, 7, "#4a4e52");
  px(cx + 36.5, 12, 1.5, 7, "#4a4e52");
  px(cx - 34, 16, 68, 3, "#d8e6c8");
  px(cx - 34, 16, 68, 1, "#f2fbe4");
  px(cx - 34, 18.5, 68, 0.5, "#aebfa0");

  /* painted stencil on the wall */
  spacedText("DEAD LETTER OFFICE", cx, ceilY + 26, "rgba(200,206,180,0.16)", 9, 3);
  spacedText("B2", cx, ceilY + 38, "rgba(200,206,180,0.11)", 8, 2);

  /* poster, left */
  px(30, ceilY + 8, 28, 38, "#233240");
  px(31, ceilY + 9, 26, 36, "#3e5468");
  px(33, ceilY + 12, 22, 7, "#5d7e97");
  for (let i = 0; i < 4; i += 1) {
    px(34, ceilY + 23 + i * 5, 16 - (i % 2) * 5, 2, "#8ba3b5");
  }
  px(52, ceilY + 40, 4, 4, "#233240"); /* torn corner */

  /* clock at 3:11 */
  const clockX = 268;
  const clockY = ceilY + 16;
  room.fillStyle = "#20221f";
  room.beginPath();
  room.arc(clockX, clockY, 9, 0, Math.PI * 2);
  room.fill();
  room.fillStyle = "#cfd2c4";
  room.beginPath();
  room.arc(clockX, clockY, 7, 0, Math.PI * 2);
  room.fill();
  /* hour ticks */
  room.strokeStyle = "#8f9284";
  room.lineWidth = 0.5;
  for (let tick = 0; tick < 12; tick += 1) {
    const a = (tick / 12) * Math.PI * 2;
    room.beginPath();
    room.moveTo(clockX + Math.cos(a) * 6, clockY + Math.sin(a) * 6);
    room.lineTo(clockX + Math.cos(a) * 7, clockY + Math.sin(a) * 7);
    room.stroke();
  }
  room.strokeStyle = "#2a2419";
  room.lineWidth = 0.5;
  const hourAngle = ((3 + 11 / 60) / 12) * Math.PI * 2 - Math.PI / 2;
  const minAngle = (11 / 60) * Math.PI * 2 - Math.PI / 2;
  room.beginPath();
  room.moveTo(clockX, clockY);
  room.lineTo(clockX + Math.cos(hourAngle) * 3.5, clockY + Math.sin(hourAngle) * 3.5);
  room.moveTo(clockX, clockY);
  room.lineTo(clockX + Math.cos(minAngle) * 5.5, clockY + Math.sin(minAngle) * 5.5);
  room.stroke();
  /* the second hand froze at :37 */
  room.strokeStyle = "#a03c2e";
  room.beginPath();
  room.moveTo(clockX, clockY);
  const secAngle = (37 / 60) * Math.PI * 2 - Math.PI / 2;
  room.lineTo(clockX + Math.cos(secAngle) * 6, clockY + Math.sin(secAngle) * 6);
  room.stroke();

  /* bulletin board, right */
  px(300, ceilY + 10, 46, 30, "#4a3c28");
  px(302, ceilY + 12, 42, 26, "#6e5a3e");
  const notes = [
    [306, ceilY + 15, 10, 8, "#d9d3b8"],
    [320, ceilY + 17, 9, 11, "#cfc79f"],
    [333, ceilY + 14, 8, 7, "#d9d3b8"],
    [310, ceilY + 27, 12, 8, "#c9b98a"],
  ];
  notes.forEach(([x, y, w, h, color]) => {
    px(x, y, w, h, color);
    px(x + w / 2, y, 1, 1, "#a03c2e");
  });

  /* metal door, center-left */
  const doorW = 44; /* sized up 30% so the postmaster plausibly fits through */
  const doorH = 81;
  const doorX = 146;
  const doorY = floorY - doorH;
  px(doorX - 4, doorY - 4, doorW + 8, doorH + 4, "#31353b");
  px(doorX - 3, doorY - 3, doorW + 6, 0.5, "#454b52");
  px(doorX, doorY, doorW, doorH, "#566058");
  px(doorX, doorY, doorW, 1, "#6b756c");
  px(doorX, doorY, 0.5, doorH, "#636e64");
  px(doorX + doorW - 0.5, doorY, 0.5, doorH, "#3f4842");
  /* recessed panel outlines */
  px(doorX + 6, doorY + 34, doorW - 12, 0.5, "#49524b");
  px(doorX + 6, doorY + 34.5, doorW - 12, 0.5, "#616c62");
  px(doorX + 6, doorY + 57, doorW - 12, 0.5, "#49524b");
  px(doorX + 6, doorY + 57.5, doorW - 12, 0.5, "#616c62");
  /* wire-glass window with frame */
  px(doorX + 9, doorY + 9, 18, 21, "#3f4842");
  px(doorX + 10, doorY + 10, 16, 19, "#20261f");
  dither(doorX + 11, doorY + 11, 14, 17, "#7d8a70");
  px(doorX + 11, doorY + 11, 14, 0.5, "#9aa88c");
  /* hinges and handle */
  px(doorX + 0.5, doorY + 13, 2.5, 5, "#6b756c");
  px(doorX + 0.5, doorY + 57, 2.5, 5, "#6b756c");
  px(doorX + doorW - 9, doorY + 39, 5, 2.5, "#c8c3ae");
  px(doorX + doorW - 9, doorY + 41, 5, 0.5, "#8f8b7a");
  px(doorX, doorY + doorH - 12, doorW, 9, "#494f54");
  px(doorX, doorY + doorH - 12, doorW, 0.5, "#5c636b");
  dither(doorX + 5, doorY + doorH - 9, doorW - 10, 5, "rgba(0,0,0,0.25)");

  /* pigeonhole unit, left */
  const unitX = 8;
  const unitW = 118;
  const unitH = 56;
  const unitY = floorY - unitH;
  px(unitX - 2, unitY - 3, unitW + 4, unitH + 3, "#4a3a28");
  px(unitX, unitY, unitW, unitH, "#5a4632");
  const cols = 6;
  const rows = 4;
  const slotW = Math.floor((unitW - (cols + 1) * 3) / cols);
  const slotH = Math.floor((unitH - (rows + 1) * 3) / rows);
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const sx = unitX + 3 + c * (slotW + 3);
      const sy = unitY + 3 + r * (slotH + 3);
      px(sx, sy, slotW, slotH, "#241f18");
      if (rnd() < 0.45) {
        px(sx + 2, sy + slotH - 5, slotW - 4, 3, "#cfc4a2");
        px(sx + 2, sy + slotH - 5, slotW - 4, 1, "#e4dabb");
      }
    }
  }

  /* mail cart, in front of the door */
  const cartX = 150;
  const cartY = floorY - 26;
  px(cartX, cartY, 44, 20, "#43484e");
  px(cartX + 2, cartY + 2, 40, 16, "#7d7662");
  dither(cartX + 4, cartY + 4, 36, 6, "#8f8873");
  px(cartX, cartY + 9, 44, 2, "#31353b");
  room.fillStyle = "#1c1e21";
  room.beginPath();
  room.arc(cartX + 8, floorY + 1, 4, 0, Math.PI * 2);
  room.arc(cartX + 36, floorY + 1, 4, 0, Math.PI * 2);
  room.fill();

  /* bundled letters on the floor */
  px(206, floorY - 7, 16, 7, "#cfc4a2");
  px(208, floorY - 12, 14, 5, "#bfb28e");
  px(206, floorY - 4, 16, 1, "#8a6f4a");
  px(208, floorY - 10, 14, 1, "#8a6f4a");

  /* the sorting desk lives on its own overlay canvas (in front of the
     postmaster, so he can have legs); the room keeps only its shadow */
  const deskX = 236;
  const deskW = 104;
  const deskTop = floorY - 34;
  dither(deskX - 2, floorY - 1, deskW + 8, 5, "rgba(0,0,0,0.3)");
  dither(deskX - 4, deskTop - 10, 34, 12, "rgba(255,222,150,0.08)");

  /* mail sacks, bottom right */
  room.fillStyle = "#6e6250";
  room.beginPath();
  room.ellipse(356, floorY - 8, 14, 15, 0, 0, Math.PI * 2);
  room.fill();
  room.fillStyle = "#7d7160";
  room.beginPath();
  room.ellipse(352, floorY - 13, 8, 8, -0.4, 0, Math.PI * 2);
  room.fill();
  dither(346, floorY - 6, 18, 8, "rgba(0,0,0,0.22)");
  room.fillStyle = "#5f5443";
  room.beginPath();
  room.ellipse(340, floorY - 5, 10, 10, 0, 0, Math.PI * 2);
  room.fill();
  dither(334, floorY - 2, 12, 5, "rgba(0,0,0,0.2)");
  px(352, floorY - 24, 7, 5, "#4a4136");
  px(352, floorY - 24, 7, 1, "#5c5142");
  px(354, floorY - 26, 3, 2.5, "#3b342b");
  px(0, floorY - 1, W, 1, "rgba(0,0,0,0.25)");

  /* wire basket (back half; the front wall lives on its own overlay canvas) */
  const bkX = 24;
  const bkW = 88;
  const bkRim = floorY - 46;
  const bkBase = floorY + 8;
  px(bkX + 2, bkRim + 2, bkW - 4, bkBase - bkRim - 2, "#1d1b17");
  room.fillStyle = "#6a6458";
  for (let x = bkX + 4; x < bkX + bkW - 2; x += 8) {
    room.fillRect(x, bkRim + 2, 0.5, bkBase - bkRim - 4);
  }
  px(bkX + 2, bkRim, bkW - 4, 2, "#7d766a");
  px(bkX + 2, bkRim, bkW - 4, 0.5, "#948c7d");
  /* settled mail heaped above the rim */
  for (let i = 0; i < 12; i += 1) {
    const hx = bkX + 6 + rnd() * (bkW - 26);
    const hy = bkRim - 3 - rnd() * 6;
    const hw = 12 + rnd() * 9;
    px(hx, hy, hw, 4, rnd() < 0.3 ? "#c2b490" : "#cfc4a2");
    px(hx, hy + 3, hw, 1, "#8a6f4a");
  }

  /* edge vignette */
  for (let i = 0; i < 26; i += 1) {
    const alpha = 0.32 * (1 - i / 26);
    px(i, 0, 1, H, `rgba(0,0,0,${alpha})`);
    px(W - 1 - i, 0, 1, H, `rgba(0,0,0,${alpha})`);
  }

  /* export geometry and lay out the DOM overlays */
  const scaleX = window.innerWidth / W;
  const scaleY = window.innerHeight / H;
  SCENE.scaleX = scaleX;
  SCENE.scaleY = scaleY;
  SCENE.basketCxCss = (bkX + bkW / 2) * scaleX;
  SCENE.basketSpreadCss = bkW * 0.3 * scaleX;
  SCENE.basketRimCss = (bkRim + 2) * scaleY;

  paintBasketFront(bkX, bkW, bkRim, bkBase, scaleX, scaleY);

  const pmX = deskX + deskW - PM_W - 2; /* stands behind the right half of the desk */
  postmasterCanvas.style.left = `${pmX * scaleX}px`;
  postmasterCanvas.style.top = `${(floorY - PM_H) * scaleY}px`;
  postmasterCanvas.style.width = `${PM_W * scaleX}px`;
  postmasterCanvas.style.height = `${PM_H * scaleY}px`;
  SCENE.bubbleRightCss = window.innerWidth - (pmX + PM_W - 6) * scaleX;
  SCENE.bubbleBottomCss = window.innerHeight - (floorY - PM_H + 2) * scaleY;

  paintDeskFront(deskX, deskW, deskTop, floorY, scaleX, scaleY);

  punchClock.style.left = `${198 * scaleX}px`;
  punchClock.style.top = `${(floorY - 58) * scaleY}px`;
  punchClock.style.width = `${36 * scaleX}px`;
  punchClock.style.fontSize = `${Math.max(10, 5.5 * scaleY)}px`;
  punchClock.style.lineHeight = `${Math.max(16, 9 * scaleY)}px`;

  drawPostmaster();
}

function paintBasketFront(bkX, bkW, bkRim, bkBase, scaleX, scaleY) {
  const w = bkW + 8;
  const h = bkBase - bkRim + 4;
  basketCanvas.width = w * DETAIL;
  basketCanvas.height = h * DETAIL;
  basketCanvas.style.left = `${(bkX - 4) * scaleX}px`;
  basketCanvas.style.top = `${bkRim * scaleY}px`;
  basketCanvas.style.width = `${w * scaleX}px`;
  basketCanvas.style.height = `${h * scaleY}px`;
  const ctx = basketCanvas.getContext("2d");
  ctx.setTransform(DETAIL, 0, 0, DETAIL, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, w, h);

  const fill = (x, y, fw, fh, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(half(x), half(y), half(fw), half(fh));
  };

  /* corner posts with a lit edge */
  fill(2, 2, 4, h - 4, "#575146");
  fill(w - 6, 2, 4, h - 4, "#575146");
  fill(2, 2, 1, h - 4, "#6e675a");
  fill(w - 6, 2, 1, h - 4, "#6e675a");
  fill(5.5, 2, 0.5, h - 4, "#3b372f");
  fill(w - 2.5, 2, 0.5, h - 4, "#3b372f");
  /* diagonal wire lattice, fine gauge with underside shadow */
  for (let d = -h; d < w; d += 9) {
    for (let y = 3; y < h - 3; y += 0.5) {
      const x = d + y;
      if (x > 5 && x < w - 6) {
        ctx.fillStyle = "#8a8272";
        ctx.fillRect(half(x), half(y), 0.5, 0.5);
        ctx.fillStyle = "rgba(0,0,0,0.18)";
        ctx.fillRect(half(x + 0.5), half(y + 0.5), 0.5, 0.5);
      }
      const x2 = d + (h - y);
      if (x2 > 5 && x2 < w - 6) {
        ctx.fillStyle = "#8a8272";
        ctx.fillRect(half(x2), half(y), 0.5, 0.5);
        ctx.fillStyle = "rgba(0,0,0,0.18)";
        ctx.fillRect(half(x2 + 0.5), half(y + 0.5), 0.5, 0.5);
      }
    }
  }
  /* rim bar and base runner */
  fill(0, 0, w, 4, "#7d766a");
  fill(0, 0, w, 1, "#948c7d");
  fill(0, 0, w, 0.5, "#a49b8a");
  fill(0, 4, w, 1, "#3b372f");
  fill(2, h - 5, w - 4, 3, "#575146");
  fill(2, h - 5, w - 4, 0.5, "#6e675a");
  /* stenciled label plate, riveted */
  fill(w / 2 - 17, 8, 34, 10, "#3b372f");
  fill(w / 2 - 17, 8, 34, 0.5, "#57534a");
  fill(w / 2 - 16, 9, 1, 1, "#6e675a");
  fill(w / 2 + 15, 9, 1, 1, "#6e675a");
  fill(w / 2 - 16, 16, 1, 1, "#6e675a");
  fill(w / 2 + 15, 16, 1, 1, "#6e675a");
  ctx.fillStyle = "#c8c3ae";
  ctx.font = "bold 6px 'Courier New', monospace";
  ctx.fillText("UNSORTED", w / 2 - 14, 15);
}

function paintDeskFront(deskX, deskW, deskTop, floorY, scaleX, scaleY) {
  const w = deskW + 14;
  const h = floorY - (deskTop - 26) + 3;
  deskCanvas.width = w * DETAIL;
  deskCanvas.height = h * DETAIL;
  deskCanvas.style.left = `${(deskX - 6) * scaleX}px`;
  deskCanvas.style.top = `${(deskTop - 26) * scaleY}px`;
  deskCanvas.style.width = `${w * scaleX}px`;
  deskCanvas.style.height = `${h * scaleY}px`;
  const ctx = deskCanvas.getContext("2d");
  ctx.setTransform(DETAIL, 0, 0, DETAIL, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, w, h);
  const f = (x, y, fw, fh, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(half(x), half(y), half(fw), half(fh));
  };
  const dl = 6; /* desk left edge, local */
  const dt = 26; /* desk top surface, local */
  const dw = deskW;
  const fl = h - 3; /* floor line, local */

  /* top slab: bevels, sheen, grain */
  f(dl - 2, dt, dw + 4, 5, "#6b5638");
  f(dl - 2, dt, dw + 4, 1, "#7f6845");
  f(dl - 2, dt, dw + 4, 1 / DETAIL, "#93794f");
  f(dl - 2, dt + 4, dw + 4, 1, "#3d2f1d");
  f(dl - 2, dt + 4.66, dw + 4, 0.34, "#2a2013");
  f(dl + 6, dt + 2, 34, 0.34, "rgba(0,0,0,0.16)");
  f(dl + 48, dt + 3, 40, 0.34, "rgba(0,0,0,0.16)");
  f(dl + 18, dt + 3.5, 22, 0.34, "rgba(255,255,255,0.07)");
  /* apron */
  f(dl, dt + 5, dw, 3, "#54432c");
  f(dl, dt + 5, dw, 0.34, "#66522f");

  /* drawer pedestal, left, with brass pulls and keyholes */
  f(dl + 2, dt + 8, 38, fl - dt - 8, "#5d4a30");
  f(dl + 2, dt + 8, 0.66, fl - dt - 8, "#6e5838");
  f(dl + 39.34, dt + 8, 0.66, fl - dt - 8, "#3b2f1e");
  for (let i = 0; i < 3; i += 1) {
    const dy = dt + 10 + i * 8.5;
    f(dl + 4, dy, 34, 7, "#66522f");
    f(dl + 4, dy, 34, 0.66, "#7a6238");
    f(dl + 4, dy + 6.34, 34, 0.66, "#463722");
    f(dl + 16, dy + 3, 10, 1.34, "#d8a54a");
    f(dl + 16, dy + 3, 10, 0.5, "#f2d693");
    f(dl + 36, dy + 3, 1, 1.34, "#2a2218");
  }

  /* open knee bay: just a lower cross rail; the postmaster's legs show through */
  f(dl + 44, fl - 8, dw - 52, 2, "#4a3c28");
  f(dl + 44, fl - 8, dw - 52, 0.5, "#5c4a30");

  /* right leg and foot */
  f(dl + dw - 8, dt + 8, 5, fl - dt - 8, "#4a3c28");
  f(dl + dw - 8, dt + 8, 1, fl - dt - 8, "#5c4a30");
  f(dl + dw - 9, fl - 2, 7, 2, "#33291b");

  /* floor contact shadow */
  f(dl, fl, dw + 2, 2.5, "rgba(0,0,0,0.28)");

  /* --- on the desk top --- */
  /* banker's lamp */
  f(dl - 1, dt - 7.5, 26, 7.5, "rgba(255,226,150,0.09)");
  f(dl + 1, dt - 5, 21, 5, "rgba(255,226,150,0.1)");
  f(dl + 4, dt - 2.5, 14, 2.5, "#8a6a2e");
  f(dl + 4, dt - 2.5, 14, 0.66, "#d8a54a");
  f(dl + 9.5, dt - 8, 2, 6, "#8a6a2e");
  f(dl + 9.5, dt - 8, 0.66, 6, "#d8a54a");
  f(dl + 2, dt - 13, 18, 5.5, "#2f6e50");
  f(dl + 2, dt - 13, 18, 1, "#3f8a66");
  f(dl + 2, dt - 8, 18, 0.66, "#ffe9b0");
  /* blotter */
  f(dl + 26, dt + 0.5, 30, 4, "#2c4a38");
  f(dl + 26, dt + 0.5, 30, 0.66, "#3a5c46");
  f(dl + 27, dt + 1.2, 28, 2.8, "#37543f");
  /* nameplate */
  f(dl + 60, dt - 3.5, 16, 3.5, "#4a3626");
  f(dl + 61, dt - 2.8, 14, 2, "#d8a54a");
  f(dl + 62.5, dt - 2, 11, 0.5, "#8a6a2e");
  /* outgoing paper stacks */
  f(dl + 80, dt - 4, 16, 4, "#cfc4a2");
  f(dl + 80, dt - 4, 16, 0.5, "#e4dabb");
  f(dl + 80, dt - 1.5, 16, 0.5, "#a89a76");
  f(dl + 82, dt - 6.5, 12, 2.5, "#c2b490");
  /* ink pad and the stamp at rest */
  f(dl + 44, dt - 2, 8, 2, "#5a2622");
  f(dl + 44, dt - 2, 8, 0.5, "#7a3a30");
  f(dl + 46.5, dt - 5, 3, 3, "#7a2f26");
  f(dl + 47.3, dt - 6.8, 1.4, 2, "#4a3b2c");
}

/* ================= the postmaster ================= */

const pm = postmasterCanvas.getContext("2d");
const PM_W = 44;
const PM_H = 80; /* full figure: his legs show through the desk's open knee bay */

/* action: { name, length in ticks } — one tick is ~140ms */
const PM_ACTIONS = [
  { name: "blink", length: 2, weight: 4 },
  { name: "twitch", length: 4, weight: 2.5 },
  { name: "glance", length: 9, weight: 2 },
  { name: "stamp", length: 8, weight: 2 },
  { name: "coffee", length: 10, weight: 1.5 },
  { name: "cap", length: 5, weight: 1 },
  { name: "yawn", length: 7, weight: 1 },
];

let pmAction = null;
let pmTick = 0;
let pmNextActionAt = performance.now() + 3000;

function ppx(x, y, w, h, color) {
  pm.fillStyle = color;
  pm.fillRect(Math.round(x * DETAIL) / DETAIL, Math.round(y * DETAIL) / DETAIL, Math.round(w * DETAIL) / DETAIL, Math.round(h * DETAIL) / DETAIL);
}

function drawPostmaster() {
  postmasterCanvas.width = PM_W * DETAIL;
  postmasterCanvas.height = PM_H * DETAIL;
  pm.setTransform(DETAIL, 0, 0, DETAIL, 0, 0);
  pm.imageSmoothingEnabled = false;
  pm.clearRect(0, 0, PM_W, PM_H);

  const action = pmAction ? pmAction.name : "idle";
  const frame = pmTick;
  const b = reducedMotion ? 0 : Math.sin(performance.now() / 1900) > 0 ? 1 : 0;

  const capLift = action === "cap" && frame >= 1 && frame <= 3 ? 1 : 0;
  const eyesClosed = action === "blink" || action === "yawn" || (action === "coffee" && frame >= 4 && frame <= 7);
  const eyeDx = action === "glance" && frame >= 2 && frame <= 7 ? -2 : 0;
  const mustDx = action === "twitch" ? (frame % 2 === 0 ? 1 : -1) : 0;

  /* cap: crown with highlight, band, brim with underside shadow, brass badge */
  ppx(13.5, 5.5 + b - capLift, 17, 3, "#1c2f42");
  ppx(12, 6 + b - capLift, 20, 2, "#233a52");
  ppx(12, 6 + b - capLift, 20, 0.5, "#33547a");
  ppx(13, 7.6 + b - capLift, 18, 0.4, "#d8a54a");
  ppx(14, 1 + b - capLift, 16, 6, "#2e4a66");
  ppx(14.5, 1 + b - capLift, 15, 0.5, "#436c94");
  ppx(14, 5 + b - capLift, 16, 1, "#26405a");
  ppx(20.5, 2.5 + b - capLift, 3, 3, "#d8a54a");
  ppx(21, 3 + b - capLift, 1, 1, "#f2d693");
  /* head with side shading and brim shadow */
  ppx(14, 8 + b, 16, 12, "#c8a284");
  ppx(14, 8 + b, 1, 12, "#d7b394");
  ppx(28.5, 8 + b, 1.5, 12, "#b08e6c");
  ppx(14, 8 + b, 16, 1, "#a9855f");
  ppx(30, 12 + b, 2, 4, "#a9855f");
  ppx(30, 12 + b, 2, 0.5, "#c8a284");
  /* brows */
  ppx(17, 10 + b, 4, 1, "#4a3b2c");
  ppx(25, 10 + b, 4, 1, "#4a3b2c");
  /* eyes, with a glint when open */
  if (eyesClosed) {
    ppx(17 + eyeDx, 13 + b, 3, 1, "#4a3b2c");
    ppx(25 + eyeDx, 13 + b, 3, 1, "#4a3b2c");
  } else {
    ppx(18 + eyeDx, 12 + b, 2, 2, "#241f18");
    ppx(26 + eyeDx, 12 + b, 2, 2, "#241f18");
    ppx(18 + eyeDx, 12 + b, 0.5, 0.5, "#e8e4d8");
    ppx(26 + eyeDx, 12 + b, 0.5, 0.5, "#e8e4d8");
  }
  /* nose with shadow */
  ppx(22, 14 + b, 2, 3, "#a9855f");
  ppx(23.5, 14 + b, 0.5, 3, "#8f6f4e");
  /* yawn mouth, under the mustache */
  if (action === "yawn" && frame >= 2 && frame <= 5) {
    ppx(20, 20 + b, 4, 3, "#241f18");
  }
  /* mustache with combed highlight */
  ppx(16 + mustDx, 17 + b, 12, 3, "#4a3b2c");
  ppx(16 + mustDx, 17 + b, 12, 0.5, "#5d4b38");
  ppx(15 + mustDx, 19 + b, 3, 2, "#4a3b2c");
  ppx(26 + mustDx, 19 + b, 3, 2, "#4a3b2c");
  ppx(15 + mustDx, 19 + b, 0.5, 2, "#5d4b38");
  /* torso: shirt with volume shading, vest, suspenders, collar, buttons */
  const torsoH = 24 - b; /* down to the belt at y44 */
  ppx(10, 20 + b, 24, torsoH, "#5a6a74");
  ppx(17, 20 + b, 1, torsoH, "#687984");
  ppx(24, 22 + b, 0.5, torsoH - 2, "#4c5a63");
  ppx(10, 20 + b, 5, torsoH, "#3e4a52");
  ppx(29, 20 + b, 5, torsoH, "#3e4a52");
  ppx(14.5, 20 + b, 0.5, torsoH, "#2c353b");
  ppx(29, 20 + b, 0.5, torsoH, "#4d5a63");
  ppx(15, 20 + b, 2, torsoH, "#333d44");
  ppx(27, 20 + b, 2, torsoH, "#333d44");
  ppx(15, 20 + b, 0.5, torsoH, "#414c54");
  ppx(27, 20 + b, 0.5, torsoH, "#414c54");
  ppx(18, 20 + b, 8, 2, "#d8d5c8");
  ppx(18, 21.5 + b, 8, 0.5, "#b3b0a2");
  ppx(21, 27 + b, 1, 1, "#c8c3ae");
  ppx(21, 33 + b, 1, 1, "#c8c3ae");
  ppx(21, 39 + b, 1, 1, "#c8c3ae");
  /* brass name pin and a pocket pen */
  ppx(29.5, 24 + b, 3.5, 2.5, "#c8c3ae");
  ppx(30.2, 24.7 + b, 2.1, 0.5, "#233a52");
  ppx(12, 23.5 + b, 1, 4.5, "#241f18");
  ppx(12, 23.5 + b, 1, 0.7, "#c8c3ae");
  /* belt with brass buckle */
  ppx(10, 44 + b, 24, 3, "#2c2620");
  ppx(10, 44 + b, 24, 0.5, "#3d352c");
  ppx(20.5, 44.4 + b, 3.2, 2.2, "#d8a54a");
  ppx(21.3, 45.1 + b, 1.5, 0.7, "#8a6a2e");
  /* trousers: creases, knee shading, cuffs */
  ppx(11, 47 + b, 10, 25 - b, "#3a4148");
  ppx(23, 47 + b, 10, 25 - b, "#3a4148");
  ppx(11, 47 + b, 1, 25 - b, "#4a525a");
  ppx(23, 47 + b, 1, 25 - b, "#4a525a");
  ppx(19.7, 47 + b, 0.6, 25 - b, "#2e343a");
  ppx(31.7, 47 + b, 0.6, 25 - b, "#2e343a");
  ppx(12, 58, 8, 0.5, "rgba(0,0,0,0.2)");
  ppx(24, 58, 8, 0.5, "rgba(0,0,0,0.2)");
  ppx(11, 71.5, 10, 1.5, "#31373d");
  ppx(23, 71.5, 10, 1.5, "#31373d");
  /* shoes, polished once, long ago */
  ppx(9, 74, 13, 6, "#23262a");
  ppx(22.5, 74, 13, 6, "#23262a");
  ppx(9, 74, 13, 1, "#3a3f45");
  ppx(22.5, 74, 13, 1, "#3a3f45");
  ppx(10, 75.2, 3.5, 1, "#4d545c");
  ppx(24, 75.2, 3.5, 1, "#4d545c");
  ppx(9, 78.5, 13, 1.5, "#141619");
  ppx(22.5, 78.5, 13, 1.5, "#141619");

  /* left arm: coffee, otherwise at his side */
  if (action === "coffee") {
    const up = frame >= 3 && frame <= 7;
    if (up) {
      ppx(8, 22 + b, 4, 8, "#5a6a74");
      ppx(10, 18 + b, 4, 5, "#c8a284");
      ppx(12, 16 + b, 7, 6, "#a03c2e");
      ppx(19, 17 + b, 2, 3, "#7a2f26");
      if (frame % 2 === 0) {
        ppx(14, 12 + b, 1, 1, "#c8c3ae");
        ppx(16, 10 + b, 1, 1, "#c8c3ae");
      }
    } else {
      ppx(6, 24 + b, 4, 12, "#5a6a74");
      ppx(6, 34 + b, 5, 5, "#c8a284");
      ppx(4, 36 + b, 7, 6, "#a03c2e");
    }
  } else {
    ppx(6, 22 + b, 4, 16, "#5a6a74");
    ppx(6, 22 + b, 0.5, 16, "#687984");
    ppx(6, 36.5 + b, 4, 1, "#3e4a52");
    ppx(6, 38 + b, 4, 4, "#c8a284");
    ppx(6, 41.5 + b, 4, 0.5, "#a9855f");
  }

  /* right arm: stamping, cap adjust, otherwise at his side */
  if (action === "stamp") {
    const down = frame === 2 || frame === 3 || frame === 6;
    if (down) {
      ppx(34, 32 + b, 4, 10, "#5a6a74");
      ppx(34, 40 + b, 5, 3, "#c8a284");
      ppx(33, 43, 7, 3, "#7a2f26");
      if (frame === 3) {
        ppx(31, 41, 1, 1, "#f2fbe4");
        ppx(41, 42, 1, 1, "#f2fbe4");
      }
    } else {
      ppx(34, 20 + b, 4, 10, "#5a6a74");
      ppx(34, 16 + b, 5, 4, "#c8a284");
      ppx(33, 11 + b, 7, 5, "#7a2f26");
    }
  } else if (action === "cap") {
    ppx(34, 12 + b, 4, 12, "#5a6a74");
    ppx(31, 8 + b - capLift, 5, 4, "#c8a284");
  } else {
    ppx(34, 22 + b, 4, 16, "#5a6a74");
    ppx(37.5, 22 + b, 0.5, 16, "#4c5a63");
    ppx(34, 36.5 + b, 4, 1, "#3e4a52");
    ppx(34, 38 + b, 4, 4, "#c8a284");
    ppx(34, 41.5 + b, 4, 0.5, "#a9855f");
  }
}

function pickPmAction() {
  const total = PM_ACTIONS.reduce((sum, a) => sum + a.weight, 0);
  let roll = Math.random() * total;
  for (const a of PM_ACTIONS) {
    roll -= a.weight;
    if (roll <= 0) return a;
  }
  return PM_ACTIONS[0];
}

function pmStep() {
  const now = performance.now();
  if (pmAction) {
    pmTick += 1;
    if (pmTick >= pmAction.length) {
      pmAction = null;
      pmTick = 0;
      pmNextActionAt = now + 2200 + Math.random() * 6200;
    }
  } else if (now >= pmNextActionAt) {
    pmAction = pickPmAction();
    pmTick = 0;
  }
  drawPostmaster();
}

/* ================= commentary ================= */

const PM_AMBIENT = [
  "Third shift is the only shift.",
  "That clock is right twice a day. This is one of them.",
  "We don't lose mail. We keep it differently.",
  "Everything down here is addressed to someone.",
  "The blue ones? Couldn't say where they go. Nobody's come back to complain.",
  "The basket is never full. We checked.",
  "Some of these are for buildings that burned down before I was born.",
  "You can read them. They stopped minding years ago.",
  "ZIP stands for something. I've forgotten what.",
  "The pigeonholes are alphabetical by regret.",
  "I stamped one twice, once. Nothing happened.",
  "The pipes only drip when you listen.",
  "Mail for the sea gets heavy. We double-bag it.",
  "Somebody upstairs keeps writing to the weather.",
];

const PM_CLICKED = [
  "Yes?",
  "Can I help you? No. But ask anyway.",
  "Don't lean on the desk.",
  "I'm on break. I've been on break since '91.",
  "Mind the basket.",
  "If it's about a package: no.",
  "You want the blue ink. Everyone wants the blue ink.",
  "I sort. I don't deliver. Delivery is a rumor.",
];

const PM_SHIFT_LINES = [
  { at: 60, line: "One minute in. That's normal. That's fine." },
  { at: 180, line: "Three minutes. The mail appreciates the company." },
  { at: 300, line: "Five minutes. Most people have followed the blue ink out by now." },
  { at: 600, line: "Ten minutes. I could find you a chair. We had chairs once." },
  { at: 1200, line: "Twenty minutes. You work here now. That's how it happened to me." },
];

const shiftStart = Date.now();
let ambientPool = [];
let clickPool = [];
let bubbleTimer = 0;
let nextAmbientAt = performance.now() + 9000 + Math.random() * 6000;

function drawLine(pool, source) {
  if (pool.length === 0) {
    pool.push(...source);
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
  }
  return pool.pop();
}

function speak(line) {
  window.clearTimeout(bubbleTimer);
  bubbleEl.textContent = line;
  bubbleEl.style.right = `${SCENE.bubbleRightCss}px`;
  bubbleEl.style.bottom = `${SCENE.bubbleBottomCss}px`;
  bubbleEl.hidden = false;
  bubbleTimer = window.setTimeout(() => {
    bubbleEl.hidden = true;
  }, Math.max(3800, line.length * 70));
}

function ambientTick(now) {
  if (now < nextAmbientAt) return;
  if (letterOpen) {
    nextAmbientAt = now + 8000;
    return;
  }
  speak(drawLine(ambientPool, PM_AMBIENT));
  nextAmbientAt = now + 24000 + Math.random() * 22000;
}

function shiftTick() {
  const elapsed = Math.floor((Date.now() - shiftStart) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = String(elapsed % 60).padStart(2, "0");
  punchClock.textContent = `${minutes}:${seconds}`;

  const due = PM_SHIFT_LINES.find((entry) => !entry.said && elapsed >= entry.at);
  if (due && !letterOpen) {
    due.said = true;
    speak(due.line);
    nextAmbientAt = performance.now() + 26000;
  }
}

function postmasterClicked() {
  speak(drawLine(clickPool, PM_CLICKED));
  nextAmbientAt = performance.now() + 26000;
  if (!pmAction && !reducedMotion) {
    pmAction = PM_ACTIONS.find((a) => a.name === "glance");
    pmTick = 0;
    drawPostmaster();
  }
}

postmasterCanvas.addEventListener("click", postmasterClicked);
postmasterCanvas.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    postmasterClicked();
  }
});

/* ================= the mail ================= */

const MAX_ENVELOPES = 6;
const mailLayer = document.getElementById("mail");
const overlay = document.getElementById("overlay");
const letterEl = document.getElementById("letter");
const returnSlot = document.getElementById("return-slot");
const postmarkEl = document.getElementById("postmark");
const cancelEl = document.getElementById("cancel-stamp");
const toEl = document.getElementById("letter-to");
const bodyEl = document.getElementById("letter-body");
const signEl = document.getElementById("letter-sign");
const refoldBtn = document.getElementById("refold");

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let deck = [];
const envelopes = [];
let nextSpawnAt = 0;

function drawFromDeck() {
  if (deck.length === 0) {
    const onScreen = new Set(envelopes.map((envelope) => envelope.letterIndex));
    deck = LETTERS.map((_, index) => index).filter((index) => !onScreen.has(index));
    if (deck.length === 0) {
      deck = LETTERS.map((_, index) => index);
    }
    for (let i = deck.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
  }
  return deck.pop();
}

function createEnvelope(startInView, forcedIndex) {
  let letterIndex;
  if (forcedIndex === undefined) {
    letterIndex = drawFromDeck();
  } else {
    letterIndex = forcedIndex;
    deck = deck.filter((index) => index !== forcedIndex);
  }
  const letter = LETTERS[letterIndex];
  const width = 118 + Math.random() * 74;
  const depth = (width - 118) / 74; // 0 far, 1 near

  const el = document.createElement("button");
  el.className = "envelope";
  el.type = "button";
  el.style.setProperty("--w", `${Math.round(width)}px`);
  /* keep sprites below the basket's front wall (z-index 5) */
  el.style.zIndex = String(1 + Math.round(depth * 3));
  if (depth < 0.3) {
    el.classList.add("far");
  } else if (depth < 0.6) {
    el.classList.add("mid");
  }
  if (letter.portal) {
    el.classList.add("airmail");
  }
  el.setAttribute("aria-label", `An unopened letter addressed to ${letter.to.split("\n")[0]}`);
  el.innerHTML = `
    <span class="env-to" aria-hidden="true">${letter.to.split("\n").slice(0, 2).join("<br>")}</span>
    <span class="env-stamp" aria-hidden="true"></span>
    <span class="env-cancel" aria-hidden="true"></span>
  `;

  const envelope = {
    el,
    letterIndex,
    width,
    baseX: 0.04 + Math.random() * 0.46, /* mail falls only through the left half of the room */
    y: startInView ? Math.random() * window.innerHeight * 0.5 : -width - 60,
    speed: (11 + Math.random() * 13) * (0.55 + depth * 0.45),
    swayAmp: 12 + Math.random() * 22,
    swayFreq: 0.25 + Math.random() * 0.4,
    phase: Math.random() * Math.PI * 2,
    targetOffset: (Math.random() - 0.5) * 2,
    sinkP: 0,
  };

  el.addEventListener("click", () => openLetter(envelope));
  mailLayer.appendChild(el);
  envelopes.push(envelope);

  if (reducedMotion) {
    envelope.y = 40 + Math.random() * (window.innerHeight - 200);
    placeEnvelope(envelope, 0);
  }
  return envelope;
}

function placeEnvelope(envelope, timeSeconds) {
  const sway = Math.sin(timeSeconds * envelope.swayFreq * Math.PI * 2 + envelope.phase);
  const rim = SCENE.basketRimCss;

  /* every letter is bound for the basket: ease sideways toward it while falling */
  const homeStart = rim * 0.3;
  const raw = (envelope.y - homeStart) / (rim * 0.9 - homeStart);
  const p = Math.min(1, Math.max(0, raw));
  const ease = p * p * (3 - 2 * p);
  const freeX = envelope.baseX * window.innerWidth + sway * envelope.swayAmp * (1 - ease);
  const homeX = SCENE.basketCxCss + envelope.targetOffset * SCENE.basketSpreadCss - envelope.width / 2;
  const rawX = freeX + (homeX - freeX) * ease;

  /* below the rim it sinks behind the basket's front wall, shrinking away */
  const scale = 1 - envelope.sinkP * 0.5;

  /* snap to the room's upscaled pixel grid so sprites move on it */
  const snap = Math.max(1, pixelScale);
  const x = Math.round(rawX / snap) * snap;
  const y = Math.round(envelope.y / snap) * snap;
  envelope.el.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  envelope.el.style.opacity = String(1 - envelope.sinkP * 0.4);
}

function removeEnvelope(envelope) {
  const index = envelopes.indexOf(envelope);
  if (index !== -1) {
    envelopes.splice(index, 1);
  }
  envelope.el.remove();
}

let lastFrame = performance.now();

function animate(now) {
  const dt = Math.min((now - lastFrame) / 1000, 0.1);
  lastFrame = now;
  const seconds = now / 1000;

  if (!document.hidden) {
    for (let i = envelopes.length - 1; i >= 0; i -= 1) {
      const envelope = envelopes[i];
      const envH = envelope.width / 1.6;
      const sinkStart = SCENE.basketRimCss - envH * 0.55;
      const sinkEnd = SCENE.basketRimCss + envH * 0.45;

      if (envelope.y >= sinkStart) {
        envelope.speed = Math.max(envelope.speed, 55);
        envelope.sinkP = Math.min(1, (envelope.y - sinkStart) / (sinkEnd - sinkStart));
      }
      envelope.y += envelope.speed * dt;

      if (envelope.sinkP >= 1 || envelope.y > window.innerHeight + 80) {
        removeEnvelope(envelope);
      } else {
        placeEnvelope(envelope, seconds);
      }
    }

    if (envelopes.length < MAX_ENVELOPES && now >= nextSpawnAt) {
      createEnvelope(false);
      nextSpawnAt = now + 3500 + Math.random() * 5500;
    }
  }

  requestAnimationFrame(animate);
}

/* ---------- opening and refolding ---------- */

let letterOpen = false;

function openLetter(envelope) {
  const letter = LETTERS[envelope.letterIndex];

  if (letter.portal) {
    const link = document.createElement("a");
    link.className = "return-portal";
    link.href = "../../../index.html";
    link.dataset.drift = "";
    link.setAttribute("aria-label", letter.portal.label);
    link.textContent = letter.from;
    returnSlot.replaceChildren(link);
  } else {
    returnSlot.textContent = letter.from;
  }

  postmarkEl.replaceChildren(
    ...letter.postmark.map((line) => {
      const span = document.createElement("span");
      span.textContent = line;
      return span;
    }),
  );
  cancelEl.textContent = letter.stamp;
  toEl.textContent = letter.to;
  bodyEl.replaceChildren(
    ...letter.body.map((paragraph) => {
      const p = document.createElement("p");
      p.textContent = paragraph;
      return p;
    }),
  );
  signEl.textContent = letter.sign;
  letterEl.classList.toggle("airmail", Boolean(letter.portal));

  removeEnvelope(envelope);
  if (reducedMotion && envelopes.length < MAX_ENVELOPES) {
    createEnvelope(true);
  }

  overlay.hidden = false;
  letterOpen = true;
  letterEl.focus();
}

function refold() {
  if (!letterOpen) {
    return;
  }
  overlay.hidden = true;
  letterOpen = false;
  const firstEnvelope = mailLayer.querySelector(".envelope");
  if (firstEnvelope) {
    firstEnvelope.focus({ preventScroll: true });
  }
}

refoldBtn.addEventListener("click", refold);
overlay.addEventListener("click", (event) => {
  if (event.target === overlay) {
    refold();
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    refold();
  }
});

/* ---------- start ---------- */

paintRoom();
let resizeTimer = 0;
window.addEventListener("resize", () => {
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(paintRoom, 150);
});

/* the opening batch always contains one airmail (portal) envelope */
const portalIndices = LETTERS.flatMap((letter, index) => (letter.portal ? [index] : []));
createEnvelope(true, portalIndices[Math.floor(Math.random() * portalIndices.length)]);
for (let i = 0; i < 2; i += 1) {
  createEnvelope(true);
}
nextSpawnAt = performance.now() + 2500;

if (!reducedMotion) {
  requestAnimationFrame(animate);
  window.setInterval(pmStep, 140);
} else {
  envelopes.forEach((envelope) => placeEnvelope(envelope, 0));
  drawPostmaster();
}

/* the punch clock and the postmaster's sense of time */
window.setInterval(() => {
  shiftTick();
  if (!document.hidden) {
    ambientTick(performance.now());
  }
}, 1000);
shiftTick();
