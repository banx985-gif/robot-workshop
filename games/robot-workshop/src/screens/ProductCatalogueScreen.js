// Products: everything launched (on sale first), with price position, sales per month, months left and Retire.
// Below that, finished robots that were never launched, with a button to launch them.
import { ScrollPanel } from '../../../../core/ui/ScrollPanel.js';
import { drawButton } from '../../../../core/ui/Button.js';
import { robotArtOf } from '../systems/robotVisual.js';
import { PRICE_POSITIONS } from '../../data/market.js';
import { createTopBar } from '../ui/TopBar.js';
import { panel, text, contained, bar, hit, fmt } from '../ui/widgets.js';

const CARD_H = 330;
const GAP = 20;
const ROW_H = 110;

export function createProductCatalogueScreen({ renderer, layout, assets, campaign, router, goProject, hud }) {
  const W = renderer.width;
  const H = renderer.height;
  const topBar = createTopBar({
    layout,
    campaign,
    hud,
    nav: [
      { id: 'project', label: 'Project', onTap: goProject },
      { id: 'workshop', label: 'Workshop', onTap: () => router.go('workshop') },
    ],
  });
  const scroll = new ScrollPanel({ getRect: bodyRect, contentHeight: 0 });
  let confirmRetire = null; // product id waiting for a second tap

  function bodyRect() {
    const sr = layout.safeRect;
    const t = topBar.rect();
    const y = t.y + t.h + 16;
    return { x: sr.x + 24, y, w: sr.w - 48, h: sr.y + sr.h - 24 - y };
  }
  const cw = () => bodyRect().w;

  // Products in display order: on sale first, then newest first.
  function products() {
    const all = [...campaign.products.products].reverse();
    return [...all.filter((p) => p.status === 'active'), ...all.filter((p) => p.status !== 'active')];
  }
  const unlaunched = () => campaign.history.records.filter((r) => !r.launchedProductId).reverse();

  const HEAD_H = 70;
  const cardRect = (i) => ({ x: 0, y: HEAD_H + i * (CARD_H + GAP), w: cw(), h: CARD_H });
  const retireRect = (i) => {
    const c = cardRect(i);
    return { x: c.x + c.w - 24 - 230, y: c.y + 24, w: 230, h: 80 };
  };
  const unlaunchedTop = () => HEAD_H + products().length * (CARD_H + GAP) + 30;
  const rowRect = (i) => ({ x: 0, y: unlaunchedTop() + 60 + i * (ROW_H + 12), w: cw(), h: ROW_H });
  const rowButtonRect = (i) => {
    const r = rowRect(i);
    return { x: r.x + r.w - 20 - 220, y: r.y + 15, w: 220, h: 80 };
  };

  const screen = {
    topBar,
    scroll,
    products,
    retireRect,
    rowButtonRect,

    enter() {
      confirmRetire = null;
      scroll.scrollY = 0;
    },

    onTap(p) {
      if (topBar.handleTap(p)) return;
      if (!scroll.contains(p)) return;
      const c = scroll.toContent(p);
      const list = products();
      for (let i = 0; i < list.length; i++) {
        if (list[i].status !== 'active' || !hit(c, retireRect(i))) continue;
        if (confirmRetire === list[i].id) {
          campaign.products.retire(list[i].id);
          confirmRetire = null;
        } else {
          confirmRetire = list[i].id;
        }
        return;
      }
      confirmRetire = null;
      unlaunched().forEach((rec, i) => {
        if (hit(c, rowButtonRect(i))) router.go('result', { number: rec.number });
      });
    },
    onDragStart: (p) => scroll.beginDrag(p),
    onDrag: (p) => scroll.drag(p),
    onDragEnd: (p) => scroll.endDrag(p),

    render(ctx) {
      ctx.fillStyle = '#101418';
      ctx.fillRect(0, 0, W, H);
      topBar.render(ctx);
      const w = cw();
      const list = products();
      const waiting = unlaunched();
      scroll.contentHeight = unlaunchedTop() + 60 + Math.max(1, waiting.length) * (ROW_H + 12) + 20;

      scroll.begin(ctx);
      contained(ctx, assets, 'ui_icon_13', { x: 0, y: 0, w: 56, h: 56 });
      text(ctx, `Products on sale (${campaign.products.active.length}/${campaign.products.slotCount} slots)`, 70, 28, { size: 38, bold: true, baseline: 'middle', maxWidth: w - 80 });
      if (!list.length) text(ctx, 'Nothing launched yet. Finish a robot, then press Launch on its result screen.', 4, HEAD_H + 10, { size: 28, color: '#9AA8B5', maxWidth: w });

      list.forEach((p, i) => {
        const r = cardRect(i);
        const on = p.status === 'active';
        panel(ctx, r, { stroke: on ? '#7CFFB2' : '#35414F' });
        contained(ctx, assets, robotArtOf(campaign.history.get(p.data.historyNumber)?.result ?? { purpose: p.data.purpose }), { x: r.x + 16, y: r.y + 16, w: 170, h: 180 });
        text(ctx, p.name, r.x + 210, r.y + 24, { size: 40, bold: true, maxWidth: r.w - 480 });
        const status = on ? `On sale · ${campaign.products.monthsLeft(p)} of 6 months left` : p.status === 'retired' ? 'Retired' : 'Sales cycle over';
        text(ctx, `${PRICE_POSITIONS[p.data.position].name} price · ${status}`, r.x + 210, r.y + 80, { size: 26, color: on ? '#7CFFB2' : '#9AA8B5', maxWidth: r.w - 230 });
        const last = p.sales[p.sales.length - 1];
        text(ctx, last ? `Last month: ${last.units} sold · ${fmt(last.revenue)} credits` : 'First sales at the end of this month', r.x + 210, r.y + 122, {
          size: 28,
          maxWidth: r.w - 230,
        });
        text(ctx, `Total: ${p.totalUnits} sold · ${fmt(p.totalRevenue)} credits · Quality ${p.data.quality}`, r.x + 210, r.y + 164, { size: 26, color: '#9AA8B5', maxWidth: r.w - 230 });

        // Six little bars, one per month on sale.
        const bx = r.x + 24;
        const by = r.y + 230;
        const bw = (r.w - 48) / 6;
        const maxRev = Math.max(1, ...p.sales.map((s) => s.revenue));
        for (let m = 0; m < 6; m++) {
          const s = p.sales[m];
          ctx.fillStyle = '#0E1217';
          ctx.fillRect(bx + m * bw + 4, by, bw - 8, 60);
          if (s) {
            const h = (60 * s.revenue) / maxRev;
            ctx.fillStyle = '#7CFFB2';
            ctx.fillRect(bx + m * bw + 4, by + 60 - h, bw - 8, h);
          }
          text(ctx, `M${m + 1}`, bx + m * bw + bw / 2, by + 68, { size: 20, color: '#7F8C99', align: 'center' });
        }
        if (on) {
          const confirm = confirmRetire === p.id;
          drawButton(ctx, retireRect(i), confirm ? 'Tap again' : 'Retire', { active: confirm, accent: '#FF8A80', font: 'bold 30px system-ui, sans-serif' });
        }
      });

      const uy = unlaunchedTop();
      text(ctx, 'Finished robots not on sale', 4, uy, { size: 32, bold: true });
      if (!waiting.length) text(ctx, 'None', 4, uy + 60, { size: 26, color: '#9AA8B5' });
      waiting.forEach((rec, i) => {
        const r = rowRect(i);
        panel(ctx, r);
        text(ctx, `#${rec.number} ${rec.name}`, r.x + 24, r.y + 22, { size: 32, bold: true, maxWidth: r.w - 290 });
        text(ctx, `Review ${rec.result.review.toFixed(1)} · Quality ${rec.result.quality.toFixed(1)}`, r.x + 24, r.y + 66, { size: 24, color: '#9AA8B5' });
        drawButton(ctx, rowButtonRect(i), 'Launch…', { font: 'bold 30px system-ui, sans-serif', disabled: !campaign.products.freeSlots });
      });
      scroll.end(ctx);
    },
  };
  return screen;
}
