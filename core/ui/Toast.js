// Small toasts (any game): short messages that slide in, sit for a moment and fade on their own.
// They never take a tap. toasts: NotificationSystem.toasts ([{ entry, age }]); life: seconds each one lasts.
//   drawToasts(ctx, toasts, { x, y, w, life, drawIcon(ctx, entry, rect), accent(entry) → colour })
// Stacks downwards from (x, y). Returns the height used.
const H = 104;
const GAP = 14;

export function drawToasts(ctx, toasts, { x, y, w, life = 3.6, drawIcon = null, accent = () => '#4FC3F7', font = 'system-ui, sans-serif' }) {
  let cy = y;
  for (const t of toasts) {
    const inK = Math.min(1, t.age / 0.25);
    const outK = Math.min(1, Math.max(0, (life - t.age) / 0.5));
    const a = Math.min(inK, outK);
    if (a <= 0) continue;
    const slide = (1 - inK) * -30;
    const r = { x, y: cy + slide, w, h: H };
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(18,24,32,0.98)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(r.x, r.y, r.w, r.h, 22);
    else ctx.rect(r.x, r.y, r.w, r.h);
    ctx.fill();
    ctx.strokeStyle = accent(t.entry);
    ctx.lineWidth = 4;
    ctx.stroke();
    let tx = r.x + 24;
    if (drawIcon) {
      drawIcon(ctx, t.entry, { x: r.x + 14, y: r.y + 12, w: 80, h: 80 });
      tx = r.x + 108;
    }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = accent(t.entry);
    ctx.font = `bold 32px ${font}`;
    ctx.fillText(t.entry.title, tx, r.y + 34, r.x + r.w - 20 - tx);
    if (t.entry.body) {
      ctx.fillStyle = '#E8EEF2';
      ctx.font = `26px ${font}`;
      ctx.fillText(t.entry.body, tx, r.y + 74, r.x + r.w - 20 - tx);
    }
    ctx.restore();
    cy += H + GAP;
  }
  return cy - y;
}
