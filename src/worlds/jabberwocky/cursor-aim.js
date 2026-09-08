// Jabberwocky — cursor aiming (2026-09-07). The mouse stays a real cursor; the rifle points at it. The maths
// from a cursor position to a yaw offset from the facing, and the edge push that turns you when the cursor
// leans on the side of the play area. Shared by the game (world.js, "mouse: cursor") and the weapon lab.
const RAD = Math.PI / 180;
// yaw (radians, + = right) of a screen point x in a view w wide, given the vertical fov and the aspect
export function yawFromCursor(x, w, h, fovDeg) {
  const nx = Math.max(-1, Math.min(1, (x - w / 2) / (w / 2)));
  const halfH = Math.atan(Math.tan(fovDeg * 0.5 * RAD) * (w / h));
  return Math.atan(nx * Math.tan(halfH));
}
// the cosmetic pitch of the rifle toward a screen point y (radians, + = up)
export function pitchFromCursor(y, h, fovDeg) {
  const ny = Math.max(-1, Math.min(1, (y - h / 2) / (h / 2)));
  return -Math.atan(ny * Math.tan(fovDeg * 0.5 * RAD)) * 0.6;
}
// -1..1 turn when the cursor is inside the outer `frac` of the width (0 in the middle), eased in
export function edgePush(x, w, frac) {
  const band = w * frac;
  if (x < band) { const k = 1 - x / band; return -k * k; }
  if (x > w - band) { const k = 1 - (w - x) / band; return k * k; }
  return 0;
}
