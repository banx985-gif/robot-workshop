// Settings (Milestone 21, bible §6.3): sound and music volume, haptics, text size (Normal / Large = +15%), Reduced
// Flashes, screen shake, performance (a placeholder until Milestone 27), privacy & legal, and Reset save behind a
// double confirm. They are this device's settings (core/Settings.js) and change at once.
//   createSettingsScreen({ renderer, layout, assets, router, dialog, settings, onReset })
import { THEME, font, lineH } from '../../../../core/Theme.js';
import { ScrollPanel } from '../../../../core/ui/ScrollPanel.js';
import { drawButton, hitRect } from '../../../../core/ui/Button.js';
import { text, card, iconButton, wrapLines } from '../ui/widgets.js';
import { SETTINGS, SETTINGS_TEXT, MENU_ART } from '../../data/menu.js';
const C = THEME.color;
const Z = THEME.size;

const HEAD_H = 140;
const PAD = 24;

export function createSettingsScreen({ renderer, layout, assets, router, dialog, settings, onReset }) {
  const W = renderer.width;
  const scroll = new ScrollPanel({ getRect: bodyRect, contentHeight: 0 });
  let back = 'menu';
  let hits = [];

  const sr = () => layout.safeRect;
  const backRect = () => ({ x: sr().x + 24, y: sr().y + 24 + 15, w: 200, h: 110 });
  function bodyRect() {
    const s = sr();
    const y = s.y + 24 + HEAD_H;
    return { x: s.x + 24, y, w: s.w - 48, h: s.y + s.h - 24 - y };
  }

  const valueLabel = (d, v) => (d.kind === 'steps' ? `${v}${d.unit ?? ''}` : d.kind === 'toggle' ? (v ? 'On' : 'Off') : d.options.find((o) => o.id === v)?.label ?? v);

  // The controls of one setting: a row of buttons (steps / choices) or one On/Off button.
  function controls(d, w) {
    const v = settings.get(d.id);
    if (d.kind === 'toggle') return [{ label: v ? 'On' : 'Off', value: !v, on: !!v, w: 220 }];
    const opts = d.kind === 'steps' ? d.steps.map((s) => ({ label: `${s}`, value: s })) : d.options.map((o) => ({ label: o.label, value: o.id }));
    const bw = (w - 12 * (opts.length - 1)) / opts.length;
    return opts.map((o) => ({ ...o, on: o.value === v, w: bw }));
  }

  function resetSave() {
    dialog.confirm({
      title: SETTINGS_TEXT.reset1Title,
      body: SETTINGS_TEXT.reset1Body,
      art: MENU_ART.warning,
      yes: 'Continue',
      no: 'Cancel',
      danger: true,
      onYes: () =>
        dialog.confirm({ title: SETTINGS_TEXT.reset2Title, body: SETTINGS_TEXT.reset2Body, art: MENU_ART.warning, yes: SETTINGS_TEXT.reset2Yes, no: 'Cancel', danger: true, onYes: onReset }),
    });
  }

  const screen = {
    scroll,
    hitRect(key) {
      const h = hits.find((x) => x.key === key);
      if (!h) return null;
      const b = bodyRect();
      return { x: b.x + h.r.x, y: b.y + h.r.y - scroll.scrollY, w: h.r.w, h: h.r.h };
    },
    scrollTo(key) {
      const h = hits.find((x) => x.key === key);
      if (h) scroll.scrollY = Math.max(0, h.r.y - 300);
      scroll.clamp();
    },
    enter(params = {}) {
      back = params.back ?? router.backTarget?.name ?? 'menu';
      scroll.scrollY = 0;
    },
    onTap(p) {
      if (hitRect(p, backRect())) return router.go(back);
      if (!scroll.contains(p)) return;
      const q = scroll.toContent(p);
      hits.find((h) => hitRect(q, h.r))?.onTap();
    },
    onDragStart: (p) => scroll.beginDrag(p),
    onDrag: (p) => scroll.drag(p),
    onDragEnd: (p) => scroll.endDrag(p),
    render(ctx) {
      const s = sr();
      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, W, renderer.height);
      drawButton(ctx, backRect(), '‹ Back', { font: font(Z.button, true) });
      assets.drawContained(ctx, MENU_ART.settings, { x: s.x + 240, y: s.y + 44, w: 100, h: 100 });
      text(ctx, SETTINGS_TEXT.title, s.x + 356, s.y + 24 + 15 + 55, { size: Z.title, bold: true, baseline: 'middle', maxWidth: s.w - 380 });
      hits = [];
      scroll.begin(ctx);
      scroll.contentHeight = drawBody(ctx) + 30;
      scroll.end(ctx);
    },
  };

  function drawBody(ctx) {
    const w = bodyRect().w - 12;
    let y = 8;
    for (const d of SETTINGS) {
      const inner = w - 2 * PAD;
      const titleW = inner - 130;
      const noteLines = d.note ? wrapLines(d.note, inner, Z.small) : [];
      const toggle = d.kind === 'toggle';
      const head = 110;
      const h = PAD + head + (noteLines.length ? noteLines.length * lineH(Z.small) + 8 : 0) + (toggle ? 0 : 130) + PAD;
      const r = { x: 0, y, w, h };
      card(ctx, r, 'normal');
      assets.drawContained(ctx, d.icon, { x: PAD, y: y + PAD + 5, w: 100, h: 100 });
      text(ctx, d.label, PAD + 124, y + PAD + 55, { size: Z.button, bold: true, baseline: 'middle', maxWidth: toggle ? titleW - 260 : titleW });
      if (!toggle) text(ctx, valueLabel(d, settings.get(d.id)), w - PAD, y + PAD + 55, { size: Z.body, bold: true, align: 'right', baseline: 'middle', color: C.progress });
      let ly = y + PAD + head;
      for (const l of noteLines) {
        text(ctx, l, PAD, ly, { size: Z.small, color: C.textMuted, maxWidth: inner });
        ly += lineH(Z.small);
      }
      if (noteLines.length) ly += 8;
      const cs = controls(d, inner);
      if (toggle) {
        const c = cs[0];
        const b = { x: w - PAD - c.w, y: y + PAD, w: c.w, h: 110 };
        drawButton(ctx, b, c.label, { accent: c.on ? C.good : C.progress, font: font(Z.button, true) });
        hits.push({ key: `set:${d.id}`, r: b, onTap: () => settings.set(d.id, c.value) });
      } else {
        let x = PAD;
        for (const c of cs) {
          const b = { x, y: ly + 10, w: c.w, h: 110 };
          drawButton(ctx, b, c.label, { active: c.on, accent: C.progress, font: font(Z.button, true) });
          hits.push({ key: `set:${d.id}:${c.value}`, r: b, onTap: () => settings.set(d.id, c.value) });
          x += c.w + 12;
        }
      }
      y += h + 18;
    }
    // Privacy & legal, and Reset save.
    const legal = { x: 0, y, w, h: 150 };
    iconButton(ctx, assets, legal, { label: SETTINGS_TEXT.legal, sub: 'How your save is kept', icon: MENU_ART.lock, accent: C.progress });
    hits.push({ key: 'legal', r: legal, onTap: () => dialog.show({ title: SETTINGS_TEXT.legal, body: SETTINGS_TEXT.legalBody, art: MENU_ART.lock, buttons: [{ id: 'ok', label: 'OK', accent: C.progress }] }) });
    y += 150 + 18;
    const reset = { x: 0, y, w, h: 150 };
    iconButton(ctx, assets, reset, { label: SETTINGS_TEXT.reset, sub: SETTINGS_TEXT.resetSub, icon: MENU_ART.warning, accent: C.bad });
    hits.push({ key: 'reset', r: reset, onTap: resetSave });
    return y + 150;
  }

  return screen;
}
