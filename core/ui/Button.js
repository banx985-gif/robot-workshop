// Canvas buttons (logical units) with the six states from bible §33.3:
//   normal · pressed (finger down on it) · selected · disabled · locked · attention badge.
// Pressed needs no per-button code: the game calls setPressPoint() on pointer down and clearPress()
// on pointer up / drag start, and any button drawn under that point shows pressed — also inside
// scrolled panels, because the point is mapped through the current canvas transform.
let press = null; // { dx, dy } in real canvas pixels, or null

export function hitRect(p, r) {
  return !!r && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
}

// p: logical point; pixelScale: real canvas pixels per logical unit.
export function setPressPoint(p, pixelScale = 1) {
  press = { dx: p.x * pixelScale, dy: p.y * pixelScale };
}

export function clearPress() {
  press = null;
}

// Is the finger currently down on rect r (in the ctx's current drawing space)?
export function isPressed(ctx, r) {
  if (!press) return false;
  const m = ctx.getTransform(); // buttons are only ever moved/scaled, never rotated
  const x = (press.dx - m.e) / m.a;
  const y = (press.dy - m.f) / m.d;
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

const LIP = 6; // chunky bottom edge; a pressed button sinks onto it

// opts: { active|selected, disabled, locked, badge (number or text), pressed (force), font, accent }
export function drawButton(ctx, r, label, opts = {}) {
  const { disabled = false, locked = false, badge = null, font = 'bold 34px system-ui, sans-serif', accent = '#4FC3F7' } = opts;
  const selected = !!(opts.selected ?? opts.active);
  const inert = disabled || locked;
  const pressed = !inert && (opts.pressed ?? isPressed(ctx, r));
  const radius = Math.min(18, r.h / 3);
  const sink = pressed ? LIP - 2 : 0;
  const face = { x: r.x, y: r.y + sink, w: r.w, h: r.h - LIP };

  ctx.save();
  // Lip (the button's "side"), hidden when pressed down onto it.
  if (!pressed) {
    ctx.fillStyle = inert ? '#1A2028' : selected ? shade(accent) : '#161C24';
    roundRect(ctx, r.x, r.y + LIP, r.w, r.h - LIP, radius);
    ctx.fill();
  }
  // Face
  let fill = '#2A3440';
  if (selected) fill = accent;
  if (pressed) fill = selected ? shade(accent) : '#1E2630';
  if (inert) fill = '#232A33';
  ctx.fillStyle = fill;
  roundRect(ctx, face.x, face.y, face.w, face.h, radius);
  ctx.fill();
  ctx.strokeStyle = inert ? '#3A4452' : accent;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Label (+ padlock when locked)
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = inert ? '#6E7B88' : selected ? '#101418' : '#E8EEF2';
  const cy = face.y + face.h / 2 + 1;
  if (locked) {
    const lockW = 26;
    const tw = Math.min(ctx.measureText(label).width, face.w - 24 - lockW - 10);
    const lx = face.x + face.w / 2 - (lockW + 8 + tw) / 2;
    drawPadlock(ctx, lx, cy, lockW, '#8C98A5');
    ctx.textAlign = 'left';
    ctx.fillText(label, lx + lockW + 8, cy, face.w - 24 - lockW - 10);
  } else {
    ctx.fillText(label, face.x + face.w / 2, cy, face.w - 16);
  }

  if (badge !== null && badge !== undefined && badge !== false && badge !== 0) drawBadge(ctx, r.x + r.w - 8, r.y + 6, String(badge));
  ctx.restore();
}

// Orange attention dot with a number or "!" (orange = interaction accent, bible §33.1).
export function drawBadge(ctx, cx, cy, text) {
  ctx.save();
  ctx.font = 'bold 26px system-ui, sans-serif';
  const w = Math.max(40, ctx.measureText(text).width + 22);
  roundRect(ctx, cx - w / 2, cy - 20, w, 40, 20);
  ctx.fillStyle = '#FF7A1A';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#101418';
  ctx.stroke();
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, cy + 1);
  ctx.restore();
}

// Simple padlock glyph, s px wide, centred vertically on cy.
export function drawPadlock(ctx, x, cy, s, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(2, s * 0.14);
  const bodyH = s * 0.72;
  const top = cy - bodyH / 2 + s * 0.18;
  ctx.beginPath();
  ctx.arc(x + s / 2, top, s * 0.3, Math.PI, 0);
  ctx.stroke();
  roundRect(ctx, x, top, s, bodyH, s * 0.14);
  ctx.fill();
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

// A darker version of a #RRGGBB colour (pressed / lip), worked out once per colour.
const shades = new Map();
function shade(hex) {
  let out = shades.get(hex);
  if (!out) {
    const n = parseInt(hex.slice(1), 16);
    const k = 0.72;
    out = `rgb(${Math.round(((n >> 16) & 255) * k)},${Math.round(((n >> 8) & 255) * k)},${Math.round((n & 255) * k)})`;
    shades.set(hex, out);
  }
  return out;
}
