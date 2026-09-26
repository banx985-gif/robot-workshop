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
const ROW_MIN = 196;
const LINE = 44; // one line of body text (34 px) with its spacing
const SIZE = THEME.size;

// Word-wrap for layout: row heights are measured before drawing.
const measure = document.createElement('canvas').getContext('2d');
function wrapLines(str, w, size = SIZE.body, bold = false) {
  measure.font = font(size, bold);
  const lines = [];
  let cur = '';
  for (const word of String(str).split(' ')) {
    const t = cur ? `${cur} ${word}` : word;
    if (measure.measureText(t).width > w && cur) {
      lines.push(cur);
      cur = word;
    } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

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
  // A part's lines: cost, stats and open/locked, each wrapped to the space right of its picture.
  function partLines(c) {
    const mw = bodyRect().w - 12 - 200;
    const open = campaign.partOpen(c.id);
    const stats = ROBOT_STAT_KEYS.filter((k) => c.stats[k]).map((k) => `${k} ${c.stats[k] > 0 ? '+' : ''}${c.stats[k]}`);
    if (c.inn) stats.push(`INN +${c.inn}`);
    const lock = open ? 'Open — ready to use' : `Locked — needs ${missingParts(c.unlock, (r) => campaign.unlockMet(r, { type: 'part', id: c.id })).join(' + ') || describeUnlock(c.unlock)}`;
    return {
      open,
      mw,
      cost: wrapLines(`Cost ${fmt(c.cost)} · Complexity ${c.cx}${c.faultPct ? ` · fault chance +${c.faultPct}%` : ''}`, mw),
      stats: wrapLines(stats.join('  '), mw, SIZE.body, true),
      lock: wrapLines(lock, mw, SIZE.body, true),
    };
  }
  const rowHeight = (c) => {
    const l = partLines(c);
    return Math.max(ROW_MIN, 18 + 50 + (l.cost.length + l.stats.length + l.lock.length) * LINE + 14);
  };
  const rowRect = (i) => {
    const parts = partsInSlot(slotId);
    let y = 0;
    for (let k = 0; k < i; k++) y += rowHeight(parts[k]) + 14;
    return { x: 0, y, w: bodyRect().w - 12, h: rowHeight(parts[i]) };
  };

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
      drawButton(ctx, backRect(), '‹ Back', { font: font(SIZE.button, true) });
      contained(ctx, assets, 'ui_icon_06_robot', { x: sr.x + 228, y: sr.y + 28, w: 76, h: 76 });
      text(ctx, 'Parts catalogue', sr.x + 320, sr.y + 66, { size: 48, bold: true, baseline: 'middle' });

      SLOTS.forEach((s, i) => {
        const list = partsInSlot(s.id);
        const openSet = campaign.openParts;
        const open = list.filter((c) => openSet.has(c.id)).length;
        drawButton(ctx, tabRect(i), `${s.name} ${open}/${list.length}`, { selected: s.id === slotId, font: font(SIZE.body, true) });
      });

      const parts = partsInSlot(slotId);
      const last = rowRect(parts.length - 1);
      scroll.contentHeight = last.y + last.h + 14;
      scroll.begin(ctx);
      parts.forEach((c, i) => drawPart(ctx, c, rowRect(i)));
      scroll.end(ctx);
    },
  };

  function drawPart(ctx, c, r) {
    const l = partLines(c);
    const open = l.open;
    panel(ctx, r, { fill: open ? COL.panel : COL.panelDim, stroke: open ? COL.good : COL.line });
    ctx.save();
    if (!open) ctx.globalAlpha = 0.38; // greyed out
    contained(ctx, assets, c.art, { x: r.x + 14, y: r.y + 18, w: 150, h: 150 });
    ctx.restore();
    if (!open) drawPadlock(ctx, r.x + 128, r.y + 150, 34, COL.gold);

    const x = r.x + 186;
    const mw = l.mw;
    text(ctx, `${c.id} · ${c.name}`, x, r.y + 18, { size: SIZE.button, bold: true, color: open ? COL.text : COL.textMuted, maxWidth: mw });
    let y = r.y + 68;
    const lines = (list, opts) => {
      for (const line of list) {
        text(ctx, line, x, y, { size: SIZE.body, maxWidth: mw, ...opts });
        y += LINE;
      }
    };
    lines(l.cost, { color: open ? COL.text : COL.textMuted });
    lines(l.stats, { bold: true, color: open ? COL.good : COL.textMuted });
    lines(l.lock, { bold: true, color: open ? COL.good : COL.gold });
  }

  return screen;
}
