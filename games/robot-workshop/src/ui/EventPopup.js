// The one pop-up layout every text event uses (Milestone 15): a dimmed screen, a card with the event's icon (or its
// picture), title, words, and either its choices or an OK button. Also reopens any inbox message.
//   show({ title, body, icon, art, accent, choices: [{ label, sub }], okLabel, onChoose(index | null) })
//   choices empty → one OK button (onChoose(null)). Only one card at a time; main.js queues the rest.
// While active it takes every tap (it is part of the router's modal). The game is paused while it shows.
import { THEME, font } from '../../../../core/Theme.js';
import { drawButton, hitRect } from '../../../../core/ui/Button.js';
import { panel, text } from './widgets.js';
const COL = THEME.color;

const MIN_SHOW = 0.45; // seconds before a tap counts (no accidental taps straight through)

export function createEventPopup({ layout, assets, width, height, pause = () => false, resume = () => {} }) {
  let cur = null; // { opts, t, paused }
  let lastLayout = null;

  function measure(ctx, o) {
    const sr = layout.safeRect;
    const w = Math.min(sr.w - 64, 960);
    const x = sr.x + (sr.w - w) / 2;
    const artH = o.art ? 520 : 0;
    ctx.font = font(48, true);
    const titleLines = lines(ctx, o.title, w - (o.art ? 80 : 260), 2);
    ctx.font = font(32);
    const bodyLines = lines(ctx, o.body, w - 80, 8);
    const headH = o.art ? artH + 40 + titleLines.length * 58 : Math.max(170, 40 + titleLines.length * 58);
    const bodyH = bodyLines.length * 42 + 24;
    const buttons = o.choices?.length ? o.choices : [{ label: o.okLabel ?? 'OK' }];
    const btnH = buttons.map((b) => (b.sub ? 140 : 116));
    const h = 36 + headH + bodyH + btnH.reduce((t, v) => t + v + 18, 0) + 20;
    const y = Math.max(sr.y + 20, sr.y + (sr.h - h) / 2);
    let by = y + 36 + headH + bodyH;
    const rects = buttons.map((b, i) => {
      const r = { x: x + 32, y: by, w: w - 64, h: btnH[i] };
      by += btnH[i] + 18;
      return r;
    });
    return { x, y, w, h, headH, titleLines, bodyLines, buttons, rects };
  }

  function lines(ctx, str, maxW, max) {
    const out = [];
    let line = '';
    for (const word of String(str ?? '').split(' ')) {
      const t = line ? `${line} ${word}` : word;
      if (ctx.measureText(t).width > maxW && line && out.length < max - 1) {
        out.push(line);
        line = word;
      } else line = t;
    }
    if (line) out.push(line);
    return out;
  }

  const popup = {
    get active() {
      return !!cur;
    },
    get current() {
      return cur?.opts ?? null;
    },
    show(opts) {
      cur = { opts, t: 0, paused: pause() };
      lastLayout = null;
    },
    update(dt) {
      if (cur) cur.t += dt;
    },
    // Where the buttons are right now (tests and guide).
    buttonRects() {
      return lastLayout?.rects ?? [];
    },
    onTap(p) {
      if (!cur || cur.t < MIN_SHOW || !lastLayout) return;
      const i = lastLayout.rects.findIndex((r) => hitRect(p, r));
      if (i < 0) return;
      const done = cur;
      cur = null;
      if (done.paused) resume();
      done.opts.onChoose?.(done.opts.choices?.length ? i : null);
    },
    // Press a button from code (tests): index of the choice, or 0 for OK.
    choose(i = 0) {
      if (!cur) return;
      const done = cur;
      cur = null;
      if (done.paused) resume();
      done.opts.onChoose?.(done.opts.choices?.length ? i : null);
    },
    render(ctx) {
      if (!cur) return;
      const o = cur.opts;
      const W = width;
      const H = height();
      const L = (lastLayout = measure(ctx, o));
      const k = Math.min(1, cur.t / 0.2);
      ctx.save();
      ctx.globalAlpha = k;
      ctx.fillStyle = COL.overlay;
      ctx.fillRect(0, 0, W, H);
      const accent = o.accent ?? COL.progress;
      const lift = (1 - k) * 40;
      panel(ctx, { x: L.x, y: L.y + lift, w: L.w, h: L.h }, { fill: COL.panel, stroke: accent, lineWidth: 6, radius: 32 });
      let ty;
      if (o.art) {
        ctx.fillStyle = COL.panelInfo;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(L.x + 32, L.y + lift + 32, L.w - 64, 520, 24);
        else ctx.rect(L.x + 32, L.y + lift + 32, L.w - 64, 520);
        ctx.fill();
        assets.drawContained(ctx, o.art, { x: L.x + 40, y: L.y + lift + 40, w: L.w - 80, h: 504 });
        ty = L.y + lift + 36 + 520 + 30;
        L.titleLines.forEach((line, i) => text(ctx, line, L.x + L.w / 2, ty + i * 58, { size: 48, bold: true, color: accent, align: 'center', maxWidth: L.w - 80 }));
      } else {
        if (o.icon) assets.drawContained(ctx, o.icon, { x: L.x + 36, y: L.y + lift + 30, w: 160, h: 160 });
        ty = L.y + lift + 44;
        L.titleLines.forEach((line, i) => text(ctx, line, L.x + 220, ty + i * 58, { size: 48, bold: true, color: accent, maxWidth: L.w - 260 }));
      }
      const by = L.y + lift + 36 + L.headH;
      L.bodyLines.forEach((line, i) => text(ctx, line, L.x + 40, by + i * 42, { size: 32, color: COL.text, maxWidth: L.w - 80 }));
      const ready = cur.t >= MIN_SHOW;
      L.buttons.forEach((b, i) => {
        const r = { ...L.rects[i], y: L.rects[i].y + lift };
        drawButton(ctx, r, '', { accent: i === 0 ? accent : COL.textMuted, disabled: !ready });
        text(ctx, b.label, r.x + r.w / 2, r.y + (b.sub ? 40 : r.h / 2 - 3), { size: 36, bold: true, align: 'center', baseline: 'middle', maxWidth: r.w - 40 });
        if (b.sub) text(ctx, b.sub, r.x + r.w / 2, r.y + 88, { size: 25, align: 'center', baseline: 'middle', color: COL.textMuted, maxWidth: r.w - 48 });
      });
      ctx.restore();
    },
  };
  return popup;
}
