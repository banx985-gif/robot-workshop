// Finished robot: its 7 stats, Quality and review, a Launch section (Value / Standard / Premium),
// the team who built it, the combos that fired (Milestone 14) and the project history.
import { THEME, font } from '../../../../core/Theme.js';
import { ScrollPanel } from '../../../../core/ui/ScrollPanel.js';
import { drawButton } from '../../../../core/ui/Button.js';
import { PURPOSES } from '../../data/purposes.js';
import { COMPONENTS, SLOTS } from '../../data/components.js';
import { ROBOT_STATS } from '../../data/stats.js';
import { PRICE_POSITIONS, PRICE_ORDER } from '../../data/market.js';
import { SEGMENTS } from '../../data/segments.js';
import { panel, text, contained, statBars, hit, fmt } from '../ui/widgets.js';
import { robotArtOf } from '../systems/robotVisual.js';
import { SYNERGIES_BY_ID, SYNERGY_ART } from '../../data/synergies.js';
import { VISUALS } from '../../data/visuals.js';
const COL = THEME.color;

const FOOTER_H = 150;
const LAUNCH_Y = 530;
const LAUNCH_H = 430;
const SHIFT = LAUNCH_H + 20; // everything below the launch panel moves down by this
const COMBO_Y = 1260 + SHIFT;
const COMBO_LINE = 44;

export function createProjectResultScreen({ renderer, layout, assets, campaign, router }) {
  const W = renderer.width;
  let number = null;
  let position = 'standard';
  let message = null;
  let resumeOnExit = false; // the game was running when the robot finished: start it again on the way out
  const scroll = new ScrollPanel({ getRect: bodyRect, contentHeight: 1900 + SHIFT });

  function bodyRect() {
    const sr = layout.safeRect;
    return { x: sr.x + 24, y: sr.y + 24, w: sr.w - 48, h: sr.h - 24 - FOOTER_H };
  }
  function doneRect() {
    const sr = layout.safeRect;
    return { x: sr.x + 24, y: sr.y + sr.h - FOOTER_H + 24, w: sr.w - 48, h: 110 };
  }
  const cw = () => bodyRect().w;
  // Content-space rects for the launch panel.
  const positionRect = (i) => {
    const w = (cw() - 48 - 32) / 3;
    return { x: 24 + i * (w + 16), y: LAUNCH_Y + 90, w, h: 110 };
  };
  const launchRect = () => ({ x: 24, y: LAUNCH_Y + LAUNCH_H - 134, w: cw() - 48, h: 110 });
  // Combos panel: one line per combo that fired (at least one line).
  const comboHeight = () => 134 + Math.max(1, record()?.result?.synergies?.length ?? 0) * COMBO_LINE + 20;
  const archiveRect = () => ({ x: cw() - 290, y: COMBO_Y + 14, w: 274, h: 110 });

  const record = () => (number != null ? campaign.history.get(number) : campaign.history.latest());

  function launch() {
    const rec = record();
    if (!rec) return;
    const { product, reason } = campaign.launchProduct(rec.number, position);
    message = product ? null : reason;
    if (product) campaign.save().catch(() => {});
  }

  const screen = {
    doneRect,
    scroll,
    positionRect,
    launchRect,
    archiveRect,
    get record() {
      return record();
    },

    enter(params = {}) {
      number = params.number ?? null;
      resumeOnExit = !!params.resumeOnExit;
      position = 'standard';
      message = null;
      scroll.scrollY = 0;
    },

    exit() {
      if (resumeOnExit && !campaign.closed) campaign.clock.resume();
      resumeOnExit = false;
    },

    onTap(p) {
      if (hit(p, doneRect())) {
        router.go('workshop');
        return;
      }
      if (!scroll.contains(p)) return;
      const rec = record();
      if (!rec) return;
      const c = scroll.toContent(p);
      if (hit(c, archiveRect())) {
        // Keep "start the game again on the way out" for when the player finally leaves the result screen.
        const resume = resumeOnExit;
        resumeOnExit = false;
        router.go('combos', { back: 'result', backParams: { number: rec.number, resumeOnExit: resume } });
        return;
      }
      if (rec.launchedProductId || rec.deliveredContractId) return;
      if (!campaign.products.freeSlots) {
        if (hit(c, launchRect())) router.go('products');
        return;
      }
      PRICE_ORDER.forEach((id, i) => {
        if (hit(c, positionRect(i))) position = id;
      });
      if (hit(c, launchRect())) launch();
    },
    onDragStart: (p) => scroll.beginDrag(p),
    onDrag: (p) => scroll.drag(p),
    onDragEnd: (p) => scroll.endDrag(p),

    render(ctx) {
      ctx.fillStyle = COL.bg;
      ctx.fillRect(0, 0, W, renderer.height);
      const rec = record();
      if (!rec) return;
      const r = rec.result;
      const w = cw();
      const purpose = PURPOSES[r.purpose];

      scroll.begin(ctx);
      text(ctx, 'Robot finished!', w / 2, 10, { size: 56, bold: true, align: 'center', color: COL.good });

      panel(ctx, { x: 0, y: 90, w, h: 420 });
      contained(ctx, assets, robotArtOf(r), { x: 20, y: 110, w: 360, h: 380 });
      text(ctx, rec.name, 410, 120, { size: 52, bold: true, maxWidth: w - 430 });
      text(ctx, purpose.name, 410, 184, { size: 30, color: COL.textMuted, maxWidth: w - 430 });
      text(ctx, 'Review', 410, 244, { size: 30, color: COL.textMuted });
      text(ctx, `${r.review.toFixed(1)} / 10`, 410, 280, { size: 84, bold: true, color: COL.gold });
      text(ctx, `Quality ${r.quality.toFixed(1)} / 100`, 410, 386, { size: 36, bold: true, maxWidth: w - 430 });
      text(ctx, `Took ${rec.days} work days`, 410, 438, { size: 28, color: COL.textMuted, maxWidth: w - 430 });

      drawLaunch(ctx, rec, w);

      const y0 = 530 + SHIFT;
      panel(ctx, { x: 0, y: y0, w, h: 440 });
      text(ctx, 'Final stats', 24, y0 + 20, { size: 34, bold: true });
      statBars(ctx, 24, y0 + 74, w - 48, r.stats, ROBOT_STATS, { color: COL.good });

      const y1 = 990 + SHIFT;
      panel(ctx, { x: 0, y: y1, w, h: 250 });
      text(ctx, `Innovation ${r.innovation} · Fit ${r.fit} · Budget ${r.budgetFocus}`, 24, y1 + 22, { size: 30, bold: true, maxWidth: w - 48 });
      text(ctx, `Faults left ${r.faults} (found ${r.faultsFound}, fixed ${r.faultsFixed}) · Breakthroughs ${r.breakthroughs}`, 24, y1 + 72, { size: 28, color: COL.text, maxWidth: w - 48 });
      text(ctx, `Parts: ${SLOTS.map((s) => COMPONENTS[r.components[s.id]].name).join(', ')}`, 24, y1 + 120, { size: 24, color: COL.textMuted, maxWidth: w - 48 });
      text(ctx, `Team: ${rec.team.map((t) => t.name).join(', ')}`, 24, y1 + 160, { size: 28, color: COL.text, maxWidth: w - 48 });
      text(ctx, `Saved to project history as #${rec.number}`, 24, y1 + 206, { size: 26, color: COL.good, maxWidth: w - 48 });

      drawCombos(ctx, rec, w);

      const y2 = COMBO_Y + comboHeight() + 20;
      scroll.contentHeight = y2 + 50 + Math.min(10, campaign.history.records.length) * 56 + 40;
      text(ctx, `Project history (${campaign.history.records.length})`, 4, y2, { size: 34, bold: true });
      [...campaign.history.records]
        .reverse()
        .slice(0, 10)
        .forEach((h, i) => {
          const y = y2 + 50 + i * 56;
          const sale = h.launchedProductId ? ' · on sale' : '';
          text(ctx, `#${h.number} ${h.name}${sale}`, 4, y, { size: 28, bold: h.number === rec.number, maxWidth: w * 0.55 });
          text(ctx, `Review ${h.result.review.toFixed(1)} · Quality ${h.result.quality.toFixed(1)}`, w, y, { size: 28, align: 'right', color: COL.textMuted });
        });
      scroll.end(ctx);

      drawButton(ctx, doneRect(), 'Back to the workshop', { active: true, accent: COL.good, font: font(40, true) });
    },
  };

  function drawCombos(ctx, rec, w) {
    const r = rec.result;
    const fired = r.synergies ?? [];
    const fresh = new Set((rec.newSynergies ?? []).map((f) => f.id));
    panel(ctx, { x: 0, y: COMBO_Y, w, h: comboHeight() }, { stroke: fired.length ? COL.gold : COL.line });
    contained(ctx, assets, SYNERGY_ART.icon, { x: 16, y: COMBO_Y + 12, w: 64, h: 64 });
    text(ctx, fired.length ? `Combos (${fired.length})` : 'Combos', 92, COMBO_Y + 26, { size: 34, bold: true });
    drawButton(ctx, archiveRect(), 'Combo Archive', { font: font(26, true) });
    if (!fired.length) {
      text(ctx, r.synergies ? 'No combo on this robot.' : 'Built before combos existed.', 24, COMBO_Y + 138, { size: 28, color: COL.textMuted, maxWidth: w - 48 });
      return;
    }
    fired.forEach((id, i) => {
      const rule = SYNERGIES_BY_ID[id];
      const got = r.synergyRewards?.[id] ?? {};
      const bits = [got.fit ? `Fit +${got.fit}` : '', ...Object.entries(got.stats ?? {}).map(([k, v]) => `${k} +${v}`), got.inn ? `Innovation +${got.inn}` : '', got.rp ? `+${got.rp} RP` : ''].filter(Boolean);
      const look = VISUALS[r.visual]?.synergy === id ? `look: ${VISUALS[r.visual].name}` : '';
      const line = `${fresh.has(id) ? 'NEW! ' : ''}${rule?.name ?? id}${bits.length || look ? ' — ' : ''}${[...bits, look].filter(Boolean).join(' · ')}`;
      text(ctx, line, 24, COMBO_Y + 134 + i * COMBO_LINE, { size: 28, bold: true, color: fresh.has(id) ? COL.gold : COL.good, maxWidth: w - 48 });
    });
  }

  function drawLaunch(ctx, rec, w) {
    const y = LAUNCH_Y;
    panel(ctx, { x: 0, y, w, h: LAUNCH_H }, { stroke: COL.gold });
    contained(ctx, assets, 'ui_icon_13', { x: 20, y: y + 16, w: 60, h: 60 });
    const product = rec.launchedProductId ? campaign.products.get(rec.launchedProductId) : null;
    const segName = (id) => SEGMENTS.find((s) => s.id === id)?.name ?? id;
    // Built for a contract and accepted: this robot went to the customer.
    if (rec.deliveredContractId) {
      const c = campaign.contracts.get(rec.deliveredContractId);
      text(ctx, 'Delivered to the customer!', 24, y + 22, { size: 44, bold: true, color: COL.good });
      text(ctx, c ? c.title : 'Contract', 24, y + 100, { size: 32, bold: true, maxWidth: w - 48 });
      text(ctx, c ? `Paid ${fmt(c.result?.paid ?? c.payout)} credits · +${c.reputation} Rep${c.result?.special ? ' · bonus Tech Chip' : ''}` : '', 24, y + 150, { size: 30, color: COL.gold, maxWidth: w - 48 });
      text(ctx, 'Contract robots do not use a product slot.', 24, y + 200, { size: 28, color: COL.textMuted, maxWidth: w - 48 });
      return;
    }
    if (product) {
      text(ctx, 'On sale!', 96, y + 22, { size: 44, bold: true, color: COL.good });
      text(ctx, `${PRICE_POSITIONS[product.data.position].name} price · ${segName(product.data.segment)} market`, 24, y + 100, { size: 30, maxWidth: w - 48 });
      text(ctx, 'Sales arrive at the end of each month for 6 months.', 24, y + 150, { size: 28, color: COL.textMuted, maxWidth: w - 48 });
      text(ctx, 'See them any time: Money → Products in the workshop.', 24, y + 196, { size: 28, color: COL.textMuted, maxWidth: w - 48 });
      return;
    }
    text(ctx, 'Put it on sale', 96, y + 22, { size: 44, bold: true });
    if (!campaign.products.freeSlots) {
      text(ctx, `Both product slots are in use (${campaign.products.slotCount}/${campaign.products.slotCount}).`, 24, y + 110, { size: 30, color: COL.bad, maxWidth: w - 48 });
      text(ctx, 'Retire a product to make room — this robot stays in your history.', 24, y + 160, { size: 28, color: COL.textMuted, maxWidth: w - 48 });
      drawButton(ctx, launchRect(), 'Go to Products', { font: font(36, true) });
      return;
    }
    PRICE_ORDER.forEach((id, i) => drawButton(ctx, positionRect(i), PRICE_POSITIONS[id].name, { active: position === id, font: font(32, true) }));
    const data = campaign.productDataFor(rec.number, position);
    const novelty = campaign.products.noveltyFor(data);
    const f = campaign.sales.forecast(data, novelty);
    if (rec.contract && !rec.contract.ok) text(ctx, `Missed its contract: ${rec.contract.failures.join(', ')}`, 290, y + 34, { size: 22, color: COL.bad, maxWidth: w - 310 });
    text(ctx, `Sells to ${segName(data.segment)} (demand ${campaign.market.demand(data.segment)}). ` + PRICE_POSITIONS[position].note + (novelty < 1 ? ` Same build as before: −${Math.round((1 - novelty) * 100)}% sales.` : ''), 24, y + 214, { size: 25, color: novelty < 1 ? COL.action : COL.textMuted, maxWidth: w - 48 });
    text(ctx, `About ${f.firstMonth.units} sold in month 1 at ${fmt(f.firstMonth.unitPrice)} each · ≈${fmt(f.revenue)} over 6 months`, 24, y + 256, {
      size: 28,
      bold: true,
      color: COL.gold,
      maxWidth: w - 48,
    });
    if (message) text(ctx, message, w - 24, y + 22, { size: 26, color: COL.bad, align: 'right' });
    drawButton(ctx, launchRect(), 'Launch', { active: true, accent: COL.gold, font: font(40, true) });
  }

  return screen;
}
