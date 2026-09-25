// A roster card for one worker. Content-free: the game passes a view object.
//
// view = {
//   title, subtitle,                         name, "Engineer · Lv 3 · Standard"
//   portraitKey, badgeKey,                   AssetManager keys (missing → placeholder)
//   xp: { value, max },                      optional XP bar
//   stats: [{ label, value }],               e.g. ENG 58
//   bars:  [{ label, value, max, color }],   e.g. Energy / Morale
//   chips: [{ label, detail }],              e.g. traits
//   icons: [assetKey],                       status icons
//   footer,                                  "Now: working at the workbench"
//   buttons: [{ id, label }],                optional small buttons (top-right)
// }
export const STAFF_CARD_HEIGHT = 470;

export function drawStaffCard(ctx, r, view, assets, { highlight = false, accent = '#4FC3F7' } = {}) {
  ctx.save();
  ctx.fillStyle = highlight ? 'rgba(40,56,72,0.98)' : 'rgba(26,32,40,0.96)';
  roundRect(ctx, r.x, r.y, r.w, r.h, 26);
  ctx.fill();
  ctx.strokeStyle = highlight ? accent : '#35414F';
  ctx.lineWidth = highlight ? 6 : 3;
  ctx.stroke();

  // Portrait with role badge.
  const pad = 24;
  const pw = 210;
  const ph = r.h - pad * 2;
  const pr = { x: r.x + pad, y: r.y + pad, w: pw, h: ph };
  ctx.fillStyle = '#131820';
  roundRect(ctx, pr.x, pr.y, pr.w, pr.h, 18);
  ctx.fill();
  assets.drawContained(ctx, view.portraitKey, { x: pr.x + 8, y: pr.y + 8, w: pr.w - 16, h: pr.h - 16 }, 'bottom');
  if (view.badgeKey) drawContained(ctx, assets, view.badgeKey, pr.x - 6, pr.y - 6, 84, 84);

  // Text column.
  const tx = pr.x + pr.w + 28;
  const tw = r.x + r.w - pad - tx;
  let y = r.y + pad;
  // The XP bar and stats row stay clear of the buttons column (top-right).
  const sw = (view.buttons || []).length ? tw - 200 : tw;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 46px system-ui, sans-serif';
  ctx.fillText(view.title, tx, y, tw - 200);
  y += 56;
  ctx.fillStyle = '#9AA8B5';
  ctx.font = '30px system-ui, sans-serif';
  ctx.fillText(view.subtitle || '', tx, y, tw - 200);
  y += 44;

  if (view.xp) {
    drawBar(ctx, tx, y, sw, 14, view.xp.value / view.xp.max, '#B39DDB');
    ctx.fillStyle = '#B8C2CC';
    ctx.font = '22px system-ui, sans-serif';
    ctx.fillText(`XP ${view.xp.value} / ${view.xp.max}`, tx, y + 20);
    y += 54;
  }

  // Stats row.
  const stats = view.stats || [];
  const colW = sw / Math.max(1, stats.length);
  stats.forEach((s, i) => {
    const cx = tx + i * colW;
    ctx.fillStyle = '#7F8C99';
    ctx.font = 'bold 22px ui-monospace, Consolas, monospace';
    ctx.fillText(s.label, cx, y);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 40px system-ui, sans-serif';
    ctx.fillText(String(s.value), cx, y + 26);
  });
  y += 84;

  // Bars.
  for (const b of view.bars || []) {
    ctx.fillStyle = '#B8C2CC';
    ctx.font = '26px system-ui, sans-serif';
    ctx.fillText(b.label, tx, y - 2);
    const bx = tx + 130;
    const bw = tw - 130 - 70;
    drawBar(ctx, bx, y + 2, bw, 22, b.value / b.max, b.color);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(String(Math.round(b.value)), tx + tw, y - 2);
    ctx.textAlign = 'left';
    y += 40;
  }
  y += 6;

  // Trait chips, then status icons.
  let cx = tx;
  ctx.font = 'bold 26px system-ui, sans-serif';
  for (const c of view.chips || []) {
    const w = ctx.measureText(c.label).width + 32;
    ctx.fillStyle = '#3B2F4F';
    roundRect(ctx, cx, y, w, 42, 21);
    ctx.fill();
    ctx.fillStyle = '#E1D5FF';
    ctx.fillText(c.label, cx + 16, y + 8);
    cx += w + 12;
  }
  for (const key of view.icons || []) {
    drawContained(ctx, assets, key, cx, y - 6, 54, 54);
    cx += 60;
  }
  y += 54;

  if (view.footer) {
    ctx.fillStyle = '#FFD166';
    ctx.font = '28px system-ui, sans-serif';
    ctx.fillText(view.footer, tx, y, tw);
  }

  // Buttons (top-right).
  for (const [i, b] of (view.buttons || []).entries()) {
    const br = staffCardButtonRect(r, i);
    ctx.fillStyle = '#2A3440';
    roundRect(ctx, br.x, br.y, br.w, br.h, 14);
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#E8EEF2';
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(b.label, br.x + br.w / 2, br.y + br.h / 2, br.w - 10);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
  }
  ctx.restore();
}

export function staffCardButtonRect(r, i) {
  return { x: r.x + r.w - 24 - 180, y: r.y + 24 + i * 76, w: 180, h: 64 };
}

// Which button (id) of the view is under p, or null.
export function staffCardButtonAt(r, view, p) {
  for (const [i, b] of (view.buttons || []).entries()) {
    const br = staffCardButtonRect(r, i);
    if (p.x >= br.x && p.x <= br.x + br.w && p.y >= br.y && p.y <= br.y + br.h) return b.id;
  }
  return null;
}

function drawBar(ctx, x, y, w, h, frac, color) {
  ctx.fillStyle = '#0E1217';
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  const f = Math.min(1, Math.max(0, frac));
  if (f > 0) {
    ctx.fillStyle = color;
    roundRect(ctx, x, y, Math.max(h, w * f), h, h / 2);
    ctx.fill();
  }
}

// Cached, display-size copy (AssetManager/SpriteCache), never the big source image.
function drawContained(ctx, assets, key, x, y, w, h) {
  assets.drawContained(ctx, key, { x, y, w, h });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}
