// Project List (Milestone 21, bible §6.3): the project bays (what each is building, or free), the robots on sale,
// the latest finished robots and a big "New robot" button. Reached from the Assembly Bay sheet and the Build button.
//   createProjectListScreen({ renderer, layout, assets, campaign, router })
import { THEME, font, lineH } from '../../../../core/Theme.js';
import { ScrollPanel } from '../../../../core/ui/ScrollPanel.js';
import { drawButton, hitRect } from '../../../../core/ui/Button.js';
import { text, listRow, listRowHeight, emptyState, stateHeight } from '../ui/widgets.js';
import { PHASES } from '../../data/phases.js';
import { PURPOSES } from '../../data/purposes.js';
import { robotArtOf } from '../systems/robotVisual.js';
const C = THEME.color;
const Z = THEME.size;

const HEAD_H = 140;
const FOOT_H = 200;
const GAP = 16;
const RECENT = 6;
const fmt = (n) => Math.round(n).toLocaleString('en-US');
const first = (n) => String(n).split(' ')[0];

export function createProjectListScreen({ renderer, layout, assets, campaign, router }) {
  const W = renderer.width;
  const scroll = new ScrollPanel({ getRect: bodyRect, contentHeight: 0 });
  let hits = [];

  const sr = () => layout.safeRect;
  const backRect = () => ({ x: sr().x + 24, y: sr().y + 24 + 15, w: 200, h: 110 });
  function bodyRect() {
    const s = sr();
    const y = s.y + 24 + HEAD_H;
    return { x: s.x + 24, y, w: s.w - 48, h: s.y + s.h - FOOT_H - y };
  }
  const newRect = () => ({ x: sr().x + 40, y: sr().y + sr().h - FOOT_H + 30, w: sr().w - 80, h: 140 });

  const screen = {
    scroll,
    newRect,
    hitRect(key) {
      const h = hits.find((x) => x.key === key);
      if (!h) return null;
      const b = bodyRect();
      return { x: b.x + h.r.x, y: b.y + h.r.y - scroll.scrollY, w: h.r.w, h: h.r.h };
    },
    enter() {
      scroll.scrollY = 0;
    },
    onTap(p) {
      if (hitRect(p, backRect())) return router.go(router.backTarget?.name ?? 'workshop');
      if (hitRect(p, newRect())) return campaign.canStartProject().ok && router.go('builder');
      if (!scroll.contains(p)) return;
      const q = scroll.toContent(p);
      hits.find((h) => hitRect(q, h.r))?.onTap();
    },
    onDragStart: (p) => scroll.beginDrag(p),
    onDrag: (p) => scroll.drag(p),
    onDragEnd: (p) => scroll.endDrag(p),
    render(ctx) {
      const s = sr();
      const H = renderer.height;
      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, W, H);
      drawButton(ctx, backRect(), '‹ Back', { font: font(Z.button, true) });
      assets.drawContained(ctx, 'ui_icon_11', { x: s.x + 240, y: s.y + 44, w: 100, h: 100 });
      text(ctx, 'Projects', s.x + 356, s.y + 24 + 15 + 55, { size: Z.title, bold: true, baseline: 'middle', maxWidth: s.w - 380 });
      hits = [];
      scroll.begin(ctx);
      scroll.contentHeight = drawBody(ctx) + 30;
      scroll.end(ctx);
      const top = s.y + s.h - FOOT_H;
      ctx.fillStyle = C.sheet;
      ctx.fillRect(0, top, W, H - top);
      ctx.fillStyle = C.line;
      ctx.fillRect(0, top, W, 4);
      const can = campaign.canStartProject();
      drawButton(ctx, newRect(), can.ok ? 'New robot' : can.reason, { disabled: !can.ok, font: font(can.ok ? Z.heading : Z.body, true) });
    },
  };

  function heading(ctx, str, y) {
    text(ctx, str, 4, y, { size: Z.heading, bold: true });
    return y + lineH(Z.heading, 1.4);
  }

  function row(ctx, y, w, key, spec, onTap) {
    const h = listRowHeight(w, spec);
    const r = { x: 0, y, w, h };
    listRow(ctx, assets, r, spec);
    if (onTap) hits.push({ key, r, onTap });
    return y + h + GAP;
  }

  function empty(ctx, y, w, key, spec, onTap) {
    const h = stateHeight(w, spec);
    const r = { x: 0, y, w, h };
    const b = emptyState(ctx, assets, r, spec);
    if (b && onTap) hits.push({ key, r: b, onTap });
    return y + h + GAP;
  }

  function drawBody(ctx) {
    const w = bodyRect().w - 12;
    const c = campaign;
    let y = 8;
    // --- project bays ---
    y = heading(ctx, `Project bays (${c.projects.jobs.length}/${Math.max(1, c.projectBays)})`, y);
    if (!c.projectBays) {
      y = empty(ctx, y, w, 'build', { art: 'ui_icon_16', text: 'No Assembly Bay yet — build one to make robots.', button: { label: 'Build & expand' } }, () => router.go('build'));
    } else {
      for (let i = 0; i < c.projectBays; i++) {
        const j = c.projects.jobs[i];
        if (!j) {
          const can = c.canStartProject();
          y = empty(ctx, y, w, `bay:${i}`, { art: 'ui_icon_11', text: can.ok ? 'This bay is free — start a new robot with the button below.' : `This bay is free. ${can.reason}` }, () => router.go('builder'));
          continue;
        }
        const ph = PHASES[j.phaseIndex];
        const pct = Math.floor(Math.min(1, j.phaseProgress / j.phaseTarget) * 100);
        const team = c.projects.teamOf(j).map((s) => first(s.name));
        y = row(ctx, y, w, `job:${j.id}`, {
          art: robotArtOf({ purpose: j.data.purpose }),
          title: j.name,
          right: `${pct}%`,
          lines: [`Stage ${j.phaseIndex + 1} of ${PHASES.length}: ${ph.name}`, { text: `Team: ${team.length ? team.join(', ') : 'nobody — work has stopped'}`, color: team.length ? C.textMuted : C.bad }, { text: `Faults: ${j.data.faults.length} open`, color: j.data.faults.length ? C.bad : C.good, size: Z.small }],
        }, () => router.go('project', { jobId: j.id }));
      }
    }
    // --- on sale ---
    y = heading(ctx, `On sale (${c.products.active.length}/${c.products.slotCount})`, y + 10);
    if (!c.products.active.length) {
      const waiting = c.history.records.filter((r) => r.result && !r.launchedProductId && !r.deliveredContractId).length;
      y = empty(ctx, y, w, 'products', { art: 'ui_icon_13', text: waiting ? `Nothing on sale — ${waiting} finished robot${waiting === 1 ? ' is' : 's are'} waiting to launch.` : 'Nothing on sale yet — finish a robot, then launch it.', button: { label: 'Products' } }, () => router.go('products'));
    } else {
      for (const p of c.products.active) {
        const rec = c.history.get(p.data.historyNumber);
        y = row(ctx, y, w, `product:${p.id}`, {
          art: robotArtOf(rec?.result ?? { purpose: p.data.purpose }),
          title: p.name,
          right: `${fmt(p.totalUnits)} sold`,
          lines: [`${PURPOSES[p.data.purpose]?.name ?? ''} · month ${p.monthsOnSale} of ${c.products.cycleMonths}`, { text: `${fmt(p.totalRevenue)} credits so far`, color: C.good }],
        }, () => router.go('products'));
      }
    }
    // --- recent robots ---
    y = heading(ctx, 'Recent robots', y + 10);
    const recs = c.history.records.filter((r) => r.result).slice(-RECENT).reverse();
    if (!recs.length) {
      y = empty(ctx, y, w, 'first', { art: 'ui_icon_06_robot', text: 'No robots finished yet — your first one is waiting to be built!' }, () => router.go('builder'));
    } else {
      for (const rec of recs) {
        const r = rec.result;
        const status = rec.launchedProductId ? { text: 'On sale / sold', color: C.good } : rec.deliveredContractId ? { text: 'Delivered to a customer', color: C.progress } : { text: 'Ready to launch', color: C.actionDark };
        y = row(ctx, y, w, `robot:${rec.number}`, {
          art: robotArtOf(r),
          title: rec.name,
          right: `Q ${(Math.round((r.quality ?? 0) * 10) / 10).toFixed(1)}`,
          lines: [`${r.purposeName ?? PURPOSES[r.purpose]?.name ?? ''} · review ${r.review ?? '—'}`, { ...status, bold: true, size: Z.small }],
        }, () => router.go('result', { number: rec.number }));
      }
    }
    return y;
  }

  return screen;
}
