// Products: the market this month (demand per segment + trend news), then everything launched (on sale
// first) with segment, price position, monthly sales, customer feedback, the copy penalty and Retire.
// Below that, finished robots that were never launched or delivered, with a button to launch them.
import { THEME, font } from '../../../../core/Theme.js';
import { ScrollPanel } from '../../../../core/ui/ScrollPanel.js';
import { drawButton } from '../../../../core/ui/Button.js';
import { pickBySeed } from '../../../../core/ReviewText.js';
import { robotArtOf } from '../systems/robotVisual.js';
import { PRICE_POSITIONS } from '../../data/market.js';
import { SEGMENTS, TREND_NEWS } from '../../data/segments.js';
import { createTopBar } from '../ui/TopBar.js';
import { panel, text, contained, bar, hit, fmt, wrapText } from '../ui/widgets.js';
const COL = THEME.color;

// Milestone 18: every line at the §33.2 sizes (body 34, small 28), so the cards and the market panel are taller.
const SEG_ROW = 54; // one market segment per row
const NEWS_LINE = 44;
const CARD_H = 640;
const GAP = 20;
const ROW_H = 140;
const SEG_NAME = Object.fromEntries(SEGMENTS.map((s) => [s.id, s.name]));

export function createProductCatalogueScreen({ renderer, layout, assets, campaign, router, goProject, hud }) {
  const W = renderer.width;
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

  let marketH = 72 + 8 * SEG_ROW + 80; // measured each frame (the trend news wraps)
  const headY = () => marketH + 24;
  const HEAD_H = 70;
  const cardRect = (i) => ({ x: 0, y: headY() + HEAD_H + i * (CARD_H + GAP), w: cw(), h: CARD_H });
  const retireRect = (i) => {
    const c = cardRect(i);
    return { x: c.x + c.w - 24 - 230, y: c.y + 24, w: 230, h: 110 };
  };
  const EMPTY_H = 110; // room for the "Nothing launched yet" line, so the next heading never sits on it
  const unlaunchedTop = () => headY() + HEAD_H + (products().length ? products().length * (CARD_H + GAP) : EMPTY_H) + 30;
  const rowRect = (i) => ({ x: 0, y: unlaunchedTop() + 60 + i * (ROW_H + 12), w: cw(), h: ROW_H });
  const rowButtonRect = (i) => {
    const r = rowRect(i);
    return { x: r.x + r.w - 20 - 220, y: r.y + 13, w: 220, h: 110 };
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
      ctx.fillStyle = COL.bg;
      ctx.fillRect(0, 0, W, renderer.height);
      topBar.render(ctx);
      const w = cw();
      const list = products();
      const waiting = unlaunched();
      const news = newsLines(ctx, w);
      marketH = 72 + SEGMENTS.length * SEG_ROW + 16 + news.length * NEWS_LINE + 20;
      scroll.contentHeight = unlaunchedTop() + 60 + Math.max(1, waiting.length) * (ROW_H + 12) + 20;

      scroll.begin(ctx);
      drawMarket(ctx, w, news);
      contained(ctx, assets, 'ui_icon_13', { x: 0, y: headY(), w: 56, h: 56 });
      text(ctx, `Products on sale (${campaign.products.active.length}/${campaign.products.slotCount} slots)`, 70, headY() + 28, { size: THEME.size.heading, bold: true, baseline: 'middle', maxWidth: w - 80 });
      if (!list.length) wrapText(ctx, 'Nothing launched yet. Finish a robot, then press Launch on its result screen.', 4, headY() + HEAD_H + 6, w, { size: THEME.size.body, lineH: 44, color: COL.textMuted });

      list.forEach((p, i) => drawProduct(ctx, p, i));

      const uy = unlaunchedTop();
      text(ctx, 'Finished robots not on sale', 4, uy, { size: THEME.size.heading - 4, bold: true });
      if (!waiting.length) text(ctx, 'None', 4, uy + 60, { size: THEME.size.body, color: COL.textMuted });
      waiting.forEach((rec, i) => {
        const r = rowRect(i);
        panel(ctx, r);
        text(ctx, `#${rec.number} ${rec.name}`, r.x + 24, r.y + 22, { size: THEME.size.body + 2, bold: true, maxWidth: r.w - 290 });
        text(ctx, `Review ${rec.result.review.toFixed(1)} · Quality ${rec.result.quality.toFixed(1)}`, r.x + 24, r.y + 74, { size: THEME.size.body, color: COL.textMuted, maxWidth: r.w - 290 });
        drawButton(ctx, rowButtonRect(i), 'Launch…', { font: font(THEME.size.button, true), disabled: !campaign.products.freeSlots });
      });
      scroll.end(ctx);
    },
  };

  // The market panel's news lines, wrapped at body size: [{ text, color, bold }]. Trends first, then the forecast.
  function newsLines(ctx, w) {
    const m = campaign.market;
    const items = m.trends.map((t) => {
      const shift = Object.values(t.shifts)[0];
      const names = Object.keys(t.shifts).map((id) => SEG_NAME[id]).join(' & ');
      const line = pickBySeed(TREND_NEWS[shift > 0 ? 'up' : 'down'], `${campaign.seed}|trend${t.id}`).replace('{segment}', names);
      return { text: `${shift > 0 ? '▲' : '▼'} ${line} (${t.monthsLeft} more month${t.monthsLeft === 1 ? '' : 's'})`, color: COL.gold };
    });
    if (!items.length) items.push({ text: 'No big trends this month.', color: COL.textMuted });
    // Research reward (§19.6, 8 topics): next month's trend, a month early.
    if (campaign.feature('trendForecast')) {
      const t = m.nextTrend;
      const shift = t ? Object.values(t.shifts)[0] : 0;
      const line = t ? `${shift > 0 ? '▲' : '▼'} ${Object.keys(t.shifts).map((id) => SEG_NAME[id]).join(' & ')} ${shift > 0 ? 'rising' : 'falling'} for ${t.months} month${t.months === 1 ? '' : 's'}` : 'no new trend expected';
      items.push({ text: `Forecast for next month: ${line}`, color: COL.progress, bold: true });
    }
    const out = [];
    for (const it of items) {
      ctx.font = font(THEME.size.body, !!it.bold);
      let cur = '';
      for (const word of it.text.split(' ')) {
        const t = cur ? `${cur} ${word}` : word;
        if (ctx.measureText(t).width > w - 48 && cur) {
          out.push({ ...it, text: cur });
          cur = word;
        } else cur = t;
      }
      if (cur) out.push({ ...it, text: cur });
    }
    return out;
  }

  // Market this month: the 8 segments (one per row) with demand, change since last month, then the trend news.
  function drawMarket(ctx, w, news) {
    const m = campaign.market;
    panel(ctx, { x: 0, y: 0, w, h: marketH }, { stroke: COL.progress });
    text(ctx, 'Market this month', 24, 18, { size: THEME.size.body + 4, bold: true });
    text(ctx, 'demand (100 = normal)', w - 24, 26, { size: THEME.size.small, color: COL.textMuted, align: 'right' });
    const barX = w * 0.52;
    const barW = w * 0.28;
    SEGMENTS.forEach((s, i) => {
      const y = 72 + i * SEG_ROW;
      const d = m.demand(s.id);
      const prev = m.previous(s.id);
      const trend = m.trendFor(s.id);
      text(ctx, s.name, 24, y + 4, { size: THEME.size.body, color: trend ? COL.gold : COL.text, maxWidth: barX - 40 });
      bar(ctx, barX, y + 12, barW, 22, d / 160, d >= 100 ? COL.good : COL.action);
      const arrow = prev === null || prev === d ? '' : d > prev ? ' ▲' : ' ▼';
      text(ctx, `${d}${arrow}`, w - 24, y + 4, { size: THEME.size.body, bold: true, align: 'right', color: d >= 100 ? COL.good : COL.action });
    });
    const ny = 72 + SEGMENTS.length * SEG_ROW + 16;
    news.forEach((l, i) => text(ctx, l.text, 24, ny + i * NEWS_LINE, { size: THEME.size.body, bold: !!l.bold, color: l.color, maxWidth: w - 48 }));
  }

  function drawProduct(ctx, p, i) {
    const r = cardRect(i);
    const on = p.status === 'active';
    panel(ctx, r, { stroke: on ? COL.good : COL.line });
    contained(ctx, assets, robotArtOf(campaign.history.get(p.data.historyNumber)?.result ?? { purpose: p.data.purpose }), { x: r.x + 16, y: r.y + 16, w: 170, h: 180 });
    const tx = r.x + 210;
    const beside = r.w - 230 - (on ? 260 : 0); // clear of the Retire button
    text(ctx, p.name, tx, r.y + 22, { size: 40, bold: true, maxWidth: beside });
    text(ctx, `${PRICE_POSITIONS[p.data.position].name} price · ${SEG_NAME[p.data.segment] ?? p.data.segment}`, tx, r.y + 78, { size: THEME.size.body, color: on ? COL.good : COL.textMuted, maxWidth: beside });
    const status = on ? `On sale · ${campaign.products.monthsLeft(p)} of 6 months left` : p.status === 'retired' ? 'Retired' : 'Sales cycle over';
    text(ctx, status, tx, r.y + 128, { size: THEME.size.small, bold: true, color: on ? COL.good : COL.textMuted, maxWidth: beside });
    const last = p.sales[p.sales.length - 1];
    wrapText(ctx, last ? `Last month: ${last.units} sold · ${fmt(last.revenue)} credits (demand ${last.demand ?? '–'})` : 'First sales at the end of this month', tx, r.y + 170, r.w - 230, { size: THEME.size.body, lineH: 44 });
    const novelty = p.novelty ?? p.data.novelty ?? 1;
    wrapText(ctx, `Total: ${p.totalUnits} sold · ${fmt(p.totalRevenue)} credits · Quality ${p.data.quality}${novelty < 1 ? ' · same build as before: −15%' : ''}`, r.x + 24, r.y + 266, r.w - 48, {
      size: THEME.size.body,
      lineH: 44,
      color: novelty < 1 ? COL.action : COL.textMuted,
    });

    // Six little bars, one per month on sale.
    const bx = r.x + 24;
    const by = r.y + 370;
    const bw = (r.w - 48) / 6;
    const maxRev = Math.max(1, ...p.sales.map((s) => s.revenue));
    for (let m = 0; m < 6; m++) {
      const s = p.sales[m];
      ctx.fillStyle = COL.track;
      ctx.fillRect(bx + m * bw + 4, by, bw - 8, 60);
      if (s) {
        const h = (60 * s.revenue) / maxRev;
        ctx.fillStyle = COL.good;
        ctx.fillRect(bx + m * bw + 4, by + 60 - h, bw - 8, h);
      }
      text(ctx, `M${m + 1}`, bx + m * bw + bw / 2, by + 66, { size: THEME.size.small, color: COL.textMuted, align: 'center' });
    }
    const review = (p.data.reviews ?? []).at(-1);
    wrapText(ctx, review ? `${review.month ? 'Month 3' : 'Launch'} feedback: ${review.text}` : 'Customer feedback arrives at launch and month 3.', r.x + 24, r.y + 484, r.w - 48, { size: THEME.size.body, lineH: 44, maxLines: 3, color: COL.textMuted });
    if (on) {
      const confirm = confirmRetire === p.id;
      drawButton(ctx, retireRect(i), confirm ? 'Tap again' : 'Retire', { active: confirm, accent: COL.bad, font: font(34, true) });
    }
  }

  return screen;
}
