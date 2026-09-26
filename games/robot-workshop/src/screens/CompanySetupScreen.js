// Company Setup (Milestone 21, bible §6.3): a new game's company name, manager name and one of 6 accent colours (shown
// on small UI touches only — never a stat). Tap a name to type it (the phone keyboard opens over the field) or roll a
// random one. Leaving with changes asks first (§6.2).
//   createCompanySetupScreen({ renderer, layout, assets, router, dialog, textPrompt, onStart(company) })
import { THEME, font, lineH } from '../../../../core/Theme.js';
import { ScrollPanel } from '../../../../core/ui/ScrollPanel.js';
import { drawButton, hitRect } from '../../../../core/ui/Button.js';
import { text, para, card, wrapLines } from '../ui/widgets.js';
import { COMPANY, MENU_ART, DISCARD } from '../../data/menu.js';
const C = THEME.color;
const Z = THEME.size;

const HEAD_H = 140;
const FOOT_H = 200;

export function createCompanySetupScreen({ renderer, layout, assets, router, dialog, textPrompt, onStart }) {
  const W = renderer.width;
  const scroll = new ScrollPanel({ getRect: bodyRect, contentHeight: 0 });
  let values = { ...COMPANY.defaults };
  let start = { ...values };
  let hits = [];

  const sr = () => layout.safeRect;
  const backRect = () => ({ x: sr().x + 24, y: sr().y + 24 + 15, w: 200, h: 110 });
  function bodyRect() {
    const s = sr();
    const y = s.y + 24 + HEAD_H;
    return { x: s.x + 24, y, w: s.w - 48, h: s.y + s.h - FOOT_H - y };
  }
  const startRect = () => ({ x: sr().x + 40, y: sr().y + sr().h - FOOT_H + 30, w: sr().w - 80, h: 140 });
  const dirty = () => values.name !== start.name || values.manager !== start.manager || values.accent !== start.accent;
  const accentColor = () => COMPANY.accents.find((a) => a.id === values.accent)?.color ?? C.action;
  const pick = (list, not) => {
    const opts = list.filter((x) => x !== not);
    return opts[Math.floor(Math.random() * opts.length)];
  };

  function leave() {
    textPrompt.close();
    const go = () => router.go(router.backTarget?.name ?? 'menu');
    if (!dirty()) return go();
    dialog.confirm({ title: COMPANY.discardTitle, body: COMPANY.discardBody, art: MENU_ART.warning, yes: DISCARD.yes, no: DISCARD.no, danger: true, onYes: go });
  }

  function edit(key, r) {
    const b = bodyRect();
    textPrompt.open({
      rect: { x: b.x + r.x, y: b.y + r.y - scroll.scrollY, w: r.w, h: r.h },
      value: values[key],
      maxLength: COMPANY.maxLength,
      placeholder: key === 'name' ? COMPANY.nameLabel : COMPANY.managerLabel,
      onDone: (v) => v && (values[key] = v),
    });
  }

  const screen = {
    scroll,
    get values() {
      return values;
    },
    set(key, v) {
      values[key] = v; // tests
    },
    get dirty() {
      return dirty();
    },
    startRect,
    hitRect(key) {
      const h = hits.find((x) => x.key === key);
      if (!h) return null;
      const b = bodyRect();
      return { x: b.x + h.r.x, y: b.y + h.r.y - scroll.scrollY, w: h.r.w, h: h.r.h };
    },
    enter() {
      values = { ...COMPANY.defaults, name: pick(COMPANY.names, null), manager: pick(COMPANY.managers, null) };
      start = { ...values };
      scroll.scrollY = 0;
    },
    exit() {
      textPrompt.close();
    },
    onBack() {
      leave();
      return true;
    },
    onTap(p) {
      if (hitRect(p, backRect())) return leave();
      if (hitRect(p, startRect())) {
        textPrompt.close();
        return onStart({ ...values });
      }
      if (!scroll.contains(p)) return;
      const q = scroll.toContent(p);
      hits.find((h) => hitRect(q, h.r))?.onTap();
    },
    onDragStart: (p) => scroll.beginDrag(p),
    onDrag: (p) => scroll.drag(p),
    onDragEnd: (p) => scroll.endDrag(p),
    render(ctx) {
      const H = renderer.height;
      const s = sr();
      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, W, H);
      drawButton(ctx, backRect(), '‹ Back', { font: font(Z.button, true) });
      assets.drawContained(ctx, MENU_ART.newGame, { x: s.x + 240, y: s.y + 44, w: 100, h: 100 });
      text(ctx, COMPANY.title, s.x + 356, s.y + 24 + 15 + 55, { size: Z.title, bold: true, baseline: 'middle', maxWidth: s.w - 380 });
      hits = [];
      scroll.begin(ctx);
      scroll.contentHeight = drawBody(ctx) + 30;
      scroll.end(ctx);
      // Footer: the big start button, always in view.
      const top = s.y + s.h - FOOT_H;
      ctx.fillStyle = C.sheet;
      ctx.fillRect(0, top, W, H - top);
      ctx.fillStyle = C.line;
      ctx.fillRect(0, top, W, 4);
      drawButton(ctx, startRect(), COMPANY.start, { font: font(Z.heading, true) });
    },
  };

  function field(ctx, y, w, key, label) {
    text(ctx, label, 4, y, { size: Z.heading, bold: true });
    y += lineH(Z.heading, 1.35);
    const box = { x: 0, y, w: w - 250, h: 120 };
    card(ctx, box, 'normal', { radius: 24 });
    ctx.strokeStyle = C.action;
    ctx.lineWidth = 5;
    ctx.stroke();
    text(ctx, values[key], 30, y + 60, { size: Z.button, bold: true, baseline: 'middle', maxWidth: box.w - 60 });
    text(ctx, '✎', box.w - 30, y + 60, { size: Z.button, bold: true, align: 'right', baseline: 'middle', color: C.actionDark });
    hits.push({ key: `edit:${key}`, r: box, onTap: () => edit(key, box) });
    const rnd = { x: w - 230, y, w: 230, h: 120 };
    drawButton(ctx, rnd, COMPANY.random, { accent: C.progress, font: font(Z.button, true) });
    hits.push({ key: `random:${key}`, r: rnd, onTap: () => (values[key] = pick(key === 'name' ? COMPANY.names : COMPANY.managers, values[key])) });
    return y + 120 + 40;
  }

  function drawBody(ctx) {
    const w = bodyRect().w - 12;
    let y = 8;
    y += para(ctx, COMPANY.intro, 4, y, w - 8, { color: C.textMuted }) + 30;
    y = field(ctx, y, w, 'name', COMPANY.nameLabel);
    y = field(ctx, y, w, 'manager', COMPANY.managerLabel);
    text(ctx, COMPANY.accentLabel, 4, y, { size: Z.heading, bold: true });
    y += lineH(Z.heading, 1.35);
    y += para(ctx, COMPANY.accentNote, 4, y, w - 8, { size: Z.small, color: C.textMuted }) + 16;
    const cols = 2;
    const cw = (w - 20) / cols;
    const ch = 130;
    COMPANY.accents.forEach((a, i) => {
      const r = { x: (i % cols) * (cw + 20), y: y + Math.floor(i / cols) * (ch + 20), w: cw, h: ch };
      const on = values.accent === a.id;
      card(ctx, r, on ? 'selected' : 'normal');
      ctx.fillStyle = a.color;
      ctx.beginPath();
      ctx.arc(r.x + 70, r.y + ch / 2, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.strokeStyle = C.outline;
      ctx.stroke();
      const lines = wrapLines(a.name, r.w - 150, Z.body, true).slice(0, 2);
      lines.forEach((l, k) => text(ctx, l, r.x + 130, r.y + ch / 2 + (k - (lines.length - 1) / 2) * lineH(Z.body, 1.2), { size: Z.body, bold: true, baseline: 'middle', maxWidth: r.w - 150 }));
      if (on) text(ctx, '✓', r.x + r.w - 20, r.y + 14, { size: Z.button, bold: true, align: 'right', color: C.good });
      hits.push({ key: `accent:${a.id}`, r, onTap: () => (values.accent = a.id) });
    });
    y += Math.ceil(COMPANY.accents.length / cols) * (ch + 20) + 20;
    // A preview of the little touches: the name with its colour mark.
    const pv = { x: 0, y, w, h: 170 };
    card(ctx, pv, 'normal');
    ctx.fillStyle = accentColor();
    ctx.fillRect(pv.x + 8, pv.y + 16, 16, pv.h - 32);
    text(ctx, values.name, 50, y + 30, { size: Z.heading, bold: true, maxWidth: w - 80 });
    text(ctx, `Managed by ${values.manager}`, 50, y + 30 + lineH(Z.heading, 1.3), { size: Z.body, color: C.textMuted, maxWidth: w - 80 });
    return y + pv.h;
  }

  return screen;
}
