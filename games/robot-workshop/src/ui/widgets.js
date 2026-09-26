// Small drawing helpers shared by the BOTWORKS screens (logical units).
import { THEME, font } from '../../../../core/Theme.js';
const COL = THEME.color;
// panel and text come from the shared UI kit (core/ui/Kit.js, Milestone 21) so every screen draws the same pieces.
export { panel, text, card, para, listRow, listRowHeight, emptyState, errorState, stateHeight, wrapLines, iconButton } from '../../../../core/ui/Kit.js';
import { panel, text } from '../../../../core/ui/Kit.js';

export function bar(ctx, x, y, w, h, frac, color, back = COL.track) {
  ctx.fillStyle = back;
  ctx.fillRect(x, y, w, h);
  const f = Math.min(1, Math.max(0, frac));
  if (f > 0) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w * f, h);
  }
}

// Draw an image scaled to fit inside the box (keeps its shape); placeholder if missing.
// Uses the cached display-size copy, never the big source image (bible §40.1).
export function contained(ctx, assets, key, r, align = 'center') {
  assets.drawContained(ctx, key, r, align);
}

// Seven robot stat bars. stats: { SPD: n, ... }; list: [{ key, name }]; scaleMax: value that fills a bar.
export function statBars(ctx, x, y, w, stats, list, { scaleMax = 400, rowH = 52, color = COL.progress } = {}) {
  for (const [i, s] of list.entries()) {
    const ry = y + i * rowH;
    text(ctx, s.key, x, ry + 6, { size: 28, bold: true, color: COL.textMuted });
    bar(ctx, x + 100, ry + 10, w - 100 - 110, 24, stats[s.key] / scaleMax, color);
    text(ctx, String(stats[s.key]), x + w, ry + 4, { size: 32, bold: true, align: 'right' });
  }
  return list.length * rowH;
}

export function hit(p, r) {
  return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
}

export function fmt(n) {
  return Math.round(n).toLocaleString('en-US');
}

// One worker row with a portrait, name, role, Energy/Morale and an on/off tag (team pickers).
export function staffRow(ctx, assets, r, s, { roleName, on = false, tag = '', tagColor = COL.good } = {}) {
  panel(ctx, r, { fill: on ? COL.panelGood : COL.panel, stroke: on ? COL.good : COL.line, lineWidth: on ? 5 : 3 });
  contained(ctx, assets, s.art, { x: r.x + 12, y: r.y + 8, w: 90, h: r.h - 16 });
  text(ctx, s.name, r.x + 120, r.y + 16, { size: 34, bold: true, maxWidth: r.w - 520 });
  text(ctx, `${roleName} · Lv ${s.level}`, r.x + 120, r.y + 60, { size: 26, color: COL.textMuted, maxWidth: r.w - 520 });
  const bx = r.x + r.w - 370;
  text(ctx, 'Energy', bx, r.y + 18, { size: 22, color: COL.textMuted });
  bar(ctx, bx + 90, r.y + 22, 100, 16, s.energy / 100, COL.good);
  text(ctx, 'Morale', bx, r.y + 50, { size: 22, color: COL.textMuted });
  bar(ctx, bx + 90, r.y + 54, 100, 16, s.morale / 100, COL.action);
  text(ctx, tag, r.x + r.w - 20, r.y + r.h / 2, { size: 26, bold: true, color: on ? tagColor : COL.textMuted, align: 'right', baseline: 'middle' });
}

// Word-wrapped text, at most maxLines lines (the last one is squeezed to fit). Returns the lines drawn.
export function wrapText(ctx, str, x, y, w, { size = 26, lineH = size * 1.3, maxLines = 2, ...opts } = {}) {
  ctx.font = font(size, !!(opts.bold ? 'bold ' : ''));
  const lines = [];
  let cur = '';
  for (const word of String(str).split(' ')) {
    const t = cur ? `${cur} ${word}` : word;
    if (ctx.measureText(t).width > w && cur && lines.length < maxLines - 1) {
      lines.push(cur);
      cur = word;
    } else cur = t;
  }
  if (cur) lines.push(cur);
  lines.forEach((l, i) => text(ctx, l, x, y + i * lineH, { size, maxWidth: w, ...opts }));
  return lines.length;
}
