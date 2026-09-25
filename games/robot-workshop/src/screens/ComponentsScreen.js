// Parts catalogue (minimal): browse all 50 parts by slot. Open parts show normally; locked parts are
// greyed out with a padlock and the rule that opens them (what is still missing is shown in gold).
// params.back: screen to return to (default 'builder').
import { THEME, font } from '../../../../core/Theme.js';
import { ScrollPanel } from '../../../../core/ui/ScrollPanel.js';
import { drawButton, drawPadlock } from '../../../../core/ui/Button.js';
import { SLOTS, partsInSlot } from '../../data/components.js';
import { ROBOT_STAT_KEYS } from '../../data/stats.js';
import { describeUnlock, missingParts } from '../systems/unlockRules.js';
import { panel, text, contained, hit, fmt } from '../ui/widgets.js';
const COL = THEME.color;

const HEADER_H = 150;
const TABS_H = 2 * 110 + 16 + 24;
const ROW_H = 196;

export function createComponentsScreen({ renderer, layout, assets, campaign, router }) {
  const W = renderer.width;
  let slotId = SLOTS[0].id;
  let back = 'builder';
  let backParams = {};
  let resumeOnExit = false;
  const scroll = new ScrollPanel({ getRect: bodyRect, contentHeight: 0 });

  function backRect() {
    const sr = layout.safeRect;
    return { x: sr.x + 24, y: sr.y + 24, w: 200, h: 110 };
  }
  function tabRect(i) {
    const sr = layout.safeRect;
    const w = (sr.w - 48 - 2 * 16) / 3;
    return { x: sr.x + 24 + (i % 3) * (w + 16), y: sr.y + HEADER_H + Math.floor(i / 3) * (110 + 16), w, h: 110 };
  }
  function bodyRect() {
    const sr = layout.safeRect;
    const y = sr.y + HEADER_H + TABS_H;
    return { x: sr.x + 24, y, w: sr.w - 48, h: sr.y + sr.h - 24 - y };
  }
  const rowRect = (i) => ({ x: 0, y: i * (ROW_H + 14), w: bodyRect().w - 12, h: ROW_H });

  const screen = {
    scroll,
    tabRect,
    rowRect,
    get slotId() {
      return slotId;
    },
    enter(params = {}) {
      back = params.back ?? 'builder';
      backParams = params.backParams ?? {};
      if (params.slot) slotId = params.slot;
      scroll.scrollY = 0;
      resumeOnExit = !campaign.clock.paused;
      campaign.clock.pause();
    },
    exit() {
      if (resumeOnExit) campaign.clock.resume();
    },
    onTap(p) {
      if (hit(p, backRect())) {
        router.go(back, backParams);
        return;
      }
      SLOTS.forEach((s, i) => {
        if (hit(p, tabRect(i)) && s.id !== slotId) {
          slotId = s.id;
          scroll.scrollY = 0;
        }
      });
    },
    onDragStart: (p) => scroll.beginDrag(p),
    onDrag: (p) => scroll.drag(p),
    onDragEnd: (p) => scroll.endDrag(p),

    render(ctx) {
      ctx.fillStyle = COL.bg;
      ctx.fillRect(0, 0, W, renderer.height);
      const sr = layout.safeRect;
      drawButton(ctx, backRect(), '‹ Back', { font: font(32, true) });
      contained(ctx, assets, 'ui_icon_06_robot', { x: sr.x + 228, y: sr.y + 28, w: 76, h: 76 });
      text(ctx, 'Parts catalogue', sr.x + 320, sr.y + 66, { size: 48, bold: true, baseline: 'middle' });

      SLOTS.forEach((s, i) => {
        const list = partsInSlot(s.id);
        const openSet = campaign.openParts;
        const open = list.filter((c) => openSet.has(c.id)).length;
        drawButton(ctx, tabRect(i), `${s.name} ${open}/${list.length}`, { selected: s.id === slotId, font: font(28, true) });
      });

      const parts = partsInSlot(slotId);
      scroll.contentHeight = parts.length * (ROW_H + 14);
      scroll.begin(ctx);
      parts.forEach((c, i) => drawPart(ctx, c, rowRect(i)));
      scroll.end(ctx);
    },
  };

  function drawPart(ctx, c, r) {
    const open = campaign.partOpen(c.id);
    panel(ctx, r, { fill: open ? COL.panel : COL.panelDim, stroke: open ? COL.good : COL.line });
    ctx.save();
    if (!open) ctx.globalAlpha = 0.38; // greyed out
    contained(ctx, assets, c.art, { x: r.x + 14, y: r.y + 18, w: 150, h: 150 });
    ctx.restore();
    if (!open) drawPadlock(ctx, r.x + 128, r.y + 150, 34, COL.gold);

    const x = r.x + 186;
    const mw = r.w - 200;
    const dim = open ? COL.text : COL.textFaint;
    text(ctx, `${c.id} · ${c.name}`, x, r.y + 18, { size: 34, bold: true, color: open ? COL.text : COL.textMuted, maxWidth: mw });
    text(ctx, `Cost ${fmt(c.cost)} · Complexity ${c.cx}${c.faultPct ? ` · fault chance +${c.faultPct}%` : ''}`, x, r.y + 64, { size: 26, color: dim, maxWidth: mw });
    const stats = ROBOT_STAT_KEYS.filter((k) => c.stats[k]).map((k) => `${k} ${c.stats[k] > 0 ? '+' : ''}${c.stats[k]}`);
    if (c.inn) stats.push(`INN +${c.inn}`);
    text(ctx, stats.join('  '), x, r.y + 102, { size: 28, bold: true, color: open ? COL.good : COL.textFaint, maxWidth: mw });
    text(ctx, open ? 'Open — ready to use' : `Locked — needs ${missingParts(c.unlock, (r) => campaign.unlockMet(r, { type: 'part', id: c.id })).join(' + ') || describeUnlock(c.unlock)}`, x, r.y + 146, { size: 26, bold: true, color: open ? COL.good : COL.gold, maxWidth: mw });
  }

  return screen;
}
