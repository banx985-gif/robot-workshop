// Products: the market this month (demand per segment + trend news), then everything launched (on sale
// first) with segment, price position, monthly sales, customer feedback, the copy penalty and Retire.
// Below that, finished robots that were never launched or delivered, with a button to launch them.
import { ScrollPanel } from '../../../../core/ui/ScrollPanel.js';
import { drawButton } from '../../../../core/ui/Button.js';
import { pickBySeed } from '../../../../core/ReviewText.js';
import { robotArtOf } from '../systems/robotVisual.js';
import { PRICE_POSITIONS } from '../../data/market.js';
import { SEGMENTS, TREND_NEWS } from '../../data/segments.js';
import { createTopBar } from '../ui/TopBar.js';
import { panel, text, contained, bar, hit, fmt } from '../ui/widgets.js';

const MARKET_H = 420;
const CARD_H = 400;
const GAP = 20;
const ROW_H = 110;
const SEG_NAME = Object.fromEntries(SEGMENTS.map((s) => [s.id, s.name]));

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
  const cw = () => bodyRect().w - 12;

  // Products in display order: on sale first, then newest first.
  function products() {
    const all = [...campaign.products.products].reverse();
    return [...all.filter((p) => p.status === 'active'), ...all.filter((p) => p.status !== 'active')];
  }
  const unlaunched = () => campaign.history.records.filter((r) => !r.launchedProductId && !r.deliveredContractId).reverse();

  const HEAD_Y = MARKET_H + 24;
  const HEAD_H = 70;
  const cardRect = (i) => ({ x: 0, y: HEAD_Y + HEAD_H + i * (CARD_H + GAP), w: cw(), h: CARD_H });
  const retireRect = (i) => {
    const c = cardRect(i);
    return { x: c.x + c.w - 24 - 230, y: c.y + 24, w: 230, h: 80 };
  };
  const unlaunchedTop = () => HEAD_Y + HEAD_H + products().length * (CARD_H + GAP) + 30;
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
      drawMarket(ctx, w);
      contained(ctx, assets, 'ui_icon_13', { x: 0, y: HEAD_Y, w: 56, h: 56 });
      text(ctx, `Products on sale (${campaign.products.active.length}/${campaign.products.slotCount} slots)`, 70, HEAD_Y + 28, { size: 38, bold: true, baseline: 'middle', maxWidth: w - 80 });
      if (!list.length) text(ctx, 'Nothing launched yet. Finish a robot, then press Launch on its result screen.', 4, HEAD_Y + HEAD_H + 10, { size: 28, color: '#9AA8B5', maxWidth: w });

      list.forEach((p, i) => drawProduct(ctx, p, i));

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

  // Market this month: 8 segments (two columns) with demand, change since last month, and trend news.
  function drawMarket(ctx, w) {
    const m = campaign.market;
    panel(ctx, { x: 0, y: 0, w, h: MARKET_H }, { stroke: '#4FC3F7' });
    text(ctx, 'Market this month', 24, 18, { size: 34, bold: true });
    text(ctx, 'demand (100 = normal)', w - 24, 30, { size: 22, color: '#9AA8B5', align: 'right' });
    const colW = (w - 72) / 2;
    SEGMENTS.forEach((s, i) => {
      const x = 24 + (i % 2) * (colW + 24);
      const y = 72 + Math.floor(i / 2) * 58;
      const d = m.demand(s.id);
      const prev = m.previous(s.id);
      const trend = m.trendFor(s.id);
      text(ctx, s.name, x, y + 4, { size: 24, color: trend ? '#FFD166' : '#E8EEF2', maxWidth: colW * 0.5 });
      bar(ctx, x + colW * 0.52, y + 8, colW * 0.3, 18, d / 160, d >= 100 ? '#7CFFB2' : '#FFB74D');
      const arrow = prev === null || prev === d ? '' : d > prev ? ' ▲' : ' ▼';
      text(ctx, `${d}${arrow}`, x + colW, y + 2, { size: 26, bold: true, align: 'right', color: d >= 100 ? '#7CFFB2' : '#FFB74D' });
    });
    const news = m.trends.map((t) => {
      const shift = Object.values(t.shifts)[0];
      const names = Object.keys(t.shifts).map((id) => SEG_NAME[id]).join(' & ');
      const line = pickBySeed(TREND_NEWS[shift > 0 ? 'up' : 'down'], `${campaign.seed}|trend${t.id}`).replace('{segment}', names);
      return `${shift > 0 ? '▲' : '▼'} ${line} (${t.monthsLeft} more month${t.monthsLeft === 1 ? '' : 's'})`;
    });
    const ny = 72 + 4 * 58 + 8;
    text(ctx, news.length ? news.slice(0, 2).join('   ') : 'No big trends this month.', 24, ny, { size: 24, color: news.length ? '#FFD166' : '#9AA8B5', maxWidth: w - 48 });
    if (news.length > 2) text(ctx, news.slice(2).join('   '), 24, ny + 34, { size: 24, color: '#FFD166', maxWidth: w - 48 });
  }

  function drawProduct(ctx, p, i) {
    const r = cardRect(i);
    const on = p.status === 'active';
    panel(ctx, r, { stroke: on ? '#7CFFB2' : '#35414F' });
    contained(ctx, assets, robotArtOf(campaign.history.get(p.data.historyNumber)?.result ?? { purpose: p.data.purpose }), { x: r.x + 16, y: r.y + 16, w: 170, h: 180 });
    text(ctx, p.name, r.x + 210, r.y + 24, { size: 40, bold: true, maxWidth: r.w - 480 });
    const status = on ? `On sale · ${campaign.products.monthsLeft(p)} of 6 months left` : p.status === 'retired' ? 'Retired' : 'Sales cycle over';
    // Line 2 stops short of the Retire button on products still on sale.
    text(ctx, `${PRICE_POSITIONS[p.data.position].name} price · ${SEG_NAME[p.data.segment] ?? p.data.segment}`, r.x + 210, r.y + 80, { size: 26, color: on ? '#7CFFB2' : '#9AA8B5', maxWidth: r.w - 230 - (on ? 260 : 0) });
    text(ctx, status, r.x + r.w - 24, r.y + 122, { size: 24, color: on ? '#7CFFB2' : '#9AA8B5', align: 'right' });
    const last = p.sales[p.sales.length - 1];
    text(ctx, last ? `Last month: ${last.units} sold · ${fmt(last.revenue)} credits (demand ${last.demand ?? '–'})` : 'First sales at the end of this month', r.x + 210, r.y + 126, { size: 26, maxWidth: r.w - 230 - 330 });
    const novelty = p.novelty ?? p.data.novelty ?? 1;
    text(ctx, `Total: ${p.totalUnits} sold · ${fmt(p.totalRevenue)} credits · Quality ${p.data.quality}${novelty < 1 ? ' · same build as before: −15%' : ''}`, r.x + 210, r.y + 164, {
      size: 26,
      color: novelty < 1 ? '#FFB74D' : '#9AA8B5',
      maxWidth: r.w - 230,
    });

    // Six little bars, one per month on sale.
    const bx = r.x + 24;
    const by = r.y + 220;
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
    const review = (p.data.reviews ?? []).at(-1);
    text(ctx, review ? `${review.month ? 'Month 3' : 'Launch'} feedback: ${review.text}` : 'Customer feedback arrives at launch and month 3.', r.x + 24, r.y + 330, { size: 23, color: '#C9D3DD', maxWidth: r.w - 48 });
    if (on) {
      const confirm = confirmRetire === p.id;
      drawButton(ctx, retireRect(i), confirm ? 'Tap again' : 'Retire', { active: confirm, accent: '#FF8A80', font: 'bold 30px system-ui, sans-serif' });
    }
  }

  return screen;
}
