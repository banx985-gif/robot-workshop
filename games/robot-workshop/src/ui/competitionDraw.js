// Drawing bits shared by the competition screens: the event backdrop (a cut-out scene, so a sky is painted
// behind it), entrant markers (rival logo / the player's robot) and a stat-weights line.
import { RIVALS } from '../../data/competitions.js';
import { text } from './widgets.js';

const RIVAL_BY_ID = Object.fromEntries(RIVALS.map((r) => [r.id, r]));
export const PLAYER_COLOR = '#7CFFB2';

export function rivalOf(id) {
  return RIVAL_BY_ID[id] ?? { id, name: id, color: '#9AA8B5', logo: null };
}

// Sky gradient + ground glow + the backdrop art, clipped to a rounded box.
export function drawBackdrop(ctx, assets, ev, r, { radius = 20 } = {}) {
  ctx.save();
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(r.x, r.y, r.w, r.h, radius);
  else ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
  const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
  g.addColorStop(0, ev.sky[0]);
  g.addColorStop(1, ev.sky[1]);
  ctx.fillStyle = g;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(r.x, r.y + r.h * 0.82, r.w, r.h * 0.18);
  assets.drawContained(ctx, ev.art, { x: r.x + 8, y: r.y + 8, w: r.w - 16, h: r.h - 12 }, 'bottom');
  ctx.restore();
}

// A round marker: the player's robot picture on green, or a rival's logo on its colour.
export function drawMarker(ctx, assets, x, y, size, { player = false, rivalId = null, robotArt = null, dim = false } = {}) {
  const rv = player ? null : rivalOf(rivalId);
  ctx.save();
  if (dim) ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.arc(x, y, size / 2, 0, Math.PI * 2);
  ctx.fillStyle = player ? '#1E3A2E' : '#1A2028';
  ctx.fill();
  ctx.lineWidth = player ? 6 : 4;
  ctx.strokeStyle = player ? PLAYER_COLOR : rv.color;
  ctx.stroke();
  const inner = size * 0.78;
  const key = player ? robotArt : rv.logo;
  if (key) assets.drawContained(ctx, key, { x: x - inner / 2, y: y - inner / 2, w: inner, h: inner });
  ctx.restore();
}

// "REL 30 · CTL 25 · INT 20 …"
export function weightsLine(ev) {
  return Object.entries(ev.weights)
    .map(([k, v]) => `${k} ${v}`)
    .join(' · ');
}

// A robot's score for this event's weights (plain weighted stats, as the player sees them).
export function eventRating(ev, stats) {
  return Math.round(Object.entries(ev.weights).reduce((t, [k, w]) => t + ((stats[k] ?? 0) * w) / 100, 0));
}

export function placeText(place, dnf = false) {
  if (dnf) return 'DNF';
  return ['1st', '2nd', '3rd'][place - 1] ?? `${place}th`;
}

export function placeColor(place, dnf = false) {
  if (dnf) return '#FF8A80';
  return ['#FFD166', '#CFD8DC', '#FFB74D'][place - 1] ?? '#9AA8B5';
}

// Small helper: a label + value row.
export function row(ctx, label, value, x, y, w, { color = '#E8EEF2', size = 28 } = {}) {
  text(ctx, label, x, y, { size, color: '#9AA8B5', maxWidth: w * 0.55 });
  text(ctx, value, x + w, y, { size, bold: true, color, align: 'right', maxWidth: w * 0.5 });
}
