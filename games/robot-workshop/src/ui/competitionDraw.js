// Drawing bits shared by the competition screens: the event backdrop (a cut-out scene, so a sky is painted
// behind it), entrant markers (rival logo / the player's robot), rival speech bubbles and stat-weight lines.
import { THEME, font } from '../../../../core/Theme.js';
import { RIVALS_BY_ID, HIDDEN_RIVAL } from '../../data/rivals.js';
import { panel, text } from './widgets.js';
const COL = THEME.color;

export const PLAYER_COLOR = COL.good;

// A rival as the player may see it: a hidden one (R08 before its secret chain) is an unnamed team with no logo.
// shown(id) → true once the game has revealed a hidden rival.
export function rivalOf(id, shown = () => false) {
  const r = RIVALS_BY_ID[id];
  if (!r) return { id, name: id, color: COL.textMuted, logo: null, manager: null, lines: null };
  if (r.hidden && !shown(id)) return { ...r, name: HIDDEN_RIVAL.name, color: HIDDEN_RIVAL.color, logo: null, manager: null, masked: true };
  return r;
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

// A round marker: the player's robot picture on green, or a rival's logo on its colour ("?" for a hidden rival).
export function drawMarker(ctx, assets, x, y, size, { player = false, rivalId = null, robotArt = null, dim = false, shown } = {}) {
  const rv = player ? null : rivalOf(rivalId, shown);
  ctx.save();
  if (dim) ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.arc(x, y, size / 2, 0, Math.PI * 2);
  ctx.fillStyle = player ? COL.panelGood : COL.panelDim;
  ctx.fill();
  ctx.lineWidth = player ? 6 : 4;
  ctx.strokeStyle = player ? PLAYER_COLOR : rv.color;
  ctx.stroke();
  const inner = size * 0.78;
  const key = player ? robotArt : rv.logo;
  if (key) assets.drawContained(ctx, key, { x: x - inner / 2, y: y - inner / 2, w: inner, h: inner });
  else if (!player) text(ctx, '?', x, y + 2, { size: size * 0.5, bold: true, align: 'center', baseline: 'middle', color: rv.color });
  ctx.restore();
}

// "REL 30 · CTL 25 · INT 20 …" (biggest first). hidden: C12 before its first attempt.
export function weightsLine(weights, { hidden = false } = {}) {
  if (hidden) return 'Weights: ??? — revealed after your first attempt';
  return Object.entries(weights)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k} ${v}`)
    .join(' · ');
}

// A robot's plain weighted stats for these weights (what the player sees as "event rating").
export function eventRating(weights, stats) {
  return Math.round(Object.entries(weights).reduce((t, [k, w]) => t + ((stats[k] ?? 0) * w) / 100, 0));
}

export function placeText(place, dnf = false) {
  if (dnf) return 'DNF';
  return ['1st', '2nd', '3rd'][place - 1] ?? `${place}th`;
}

export function placeColor(place, dnf = false) {
  if (dnf) return COL.bad;
  return [COL.gold, COL.textMuted, COL.action][place - 1] ?? COL.textMuted;
}

// Small helper: a label + value row.
export function row(ctx, label, value, x, y, w, { color = COL.text, size = 28 } = {}) {
  text(ctx, label, x, y, { size, color: COL.textMuted, maxWidth: w * 0.55 });
  text(ctx, value, x + w, y, { size, bold: true, color, align: 'right', maxWidth: w * 0.5 });
}

// A rival speaking: manager portrait (R01–R05) or logo, name, and a line in a bubble. Height 150.
export function drawSpeech(ctx, assets, rival, line, r) {
  panel(ctx, r, { fill: COL.panel, stroke: rival.color, lineWidth: 3, radius: 22 });
  const face = rival.manager ?? rival.logo;
  if (face) assets.drawContained(ctx, face, { x: r.x + 10, y: r.y + 8, w: 120, h: r.h - 16 }, rival.manager ? 'bottom' : 'center');
  else text(ctx, '?', r.x + 70, r.y + r.h / 2, { size: 60, bold: true, align: 'center', baseline: 'middle', color: rival.color });
  text(ctx, rival.name, r.x + 146, r.y + 16, { size: 24, bold: true, color: rival.color, maxWidth: r.w - 166 });
  wrap(ctx, `“${line}”`, r.x + 146, r.y + 52, r.w - 166, 34, { size: 27 }, 3);
}

// Word-wrapped text; returns the height used.
export function wrap(ctx, str, x, y, w, lineH, opts = {}, maxLines = 4) {
  ctx.font = font(opts.size ?? 28, !!(opts.bold ? 'bold ' : ''));
  const words = str.split(' ');
  const lines = [];
  let cur = '';
  for (const wd of words) {
    const t = cur ? `${cur} ${wd}` : wd;
    if (ctx.measureText(t).width > w && cur) {
      lines.push(cur);
      cur = wd;
    } else cur = t;
  }
  if (cur) lines.push(cur);
  lines.slice(0, maxLines).forEach((l, i) => text(ctx, l, x, y + i * lineH, { ...opts, maxWidth: w }));
  return Math.min(lines.length, maxLines) * lineH;
}
