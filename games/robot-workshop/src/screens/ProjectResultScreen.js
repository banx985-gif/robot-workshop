// Finished robot: its 7 stats, Quality and review, a Launch section (Value / Standard / Premium),
// the team who built it, and the project history.
import { ScrollPanel } from '../../../../core/ui/ScrollPanel.js';
import { drawButton } from '../../../../core/ui/Button.js';
import { PURPOSES } from '../../data/purposes.js';
import { COMPONENTS, SLOTS } from '../../data/components.js';
import { ROBOT_STATS } from '../../data/stats.js';
import { PRICE_POSITIONS, PRICE_ORDER, SEGMENTS } from '../../data/market.js';
import { panel, text, contained, statBars, hit, fmt } from '../ui/widgets.js';
import { robotArtOf } from '../systems/robotVisual.js';

const FOOTER_H = 150;
const LAUNCH_Y = 530;
const LAUNCH_H = 400;
const SHIFT = LAUNCH_H + 20; // everything below the launch panel moves down by this

export function createProjectResultScreen({ renderer, layout, assets, campaign, router }) {
  const W = renderer.width;
  const H = renderer.height;
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
    return { x: 24 + i * (w + 16), y: LAUNCH_Y + 90, w, h: 96 };
  };
  const launchRect = () => ({ x: 24, y: LAUNCH_Y + LAUNCH_H - 120, w: cw() - 48, h: 96 });

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
      if (!rec || rec.launchedProductId) return;
      const c = scroll.toContent(p);
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
      ctx.fillStyle = '#101418';
      ctx.fillRect(0, 0, W, H);
      const rec = record();
      if (!rec) return;
      const r = rec.result;
      const w = cw();
      const purpose = PURPOSES[r.purpose];

      scroll.begin(ctx);
      text(ctx, 'Robot finished!', w / 2, 10, { size: 56, bold: true, align: 'center', color: '#7CFFB2' });

      panel(ctx, { x: 0, y: 90, w, h: 420 });
      contained(ctx, assets, robotArtOf(r), { x: 20, y: 110, w: 360, h: 380 });
      text(ctx, rec.name, 410, 120, { size: 52, bold: true, maxWidth: w - 430 });
      text(ctx, purpose.name, 410, 184, { size: 30, color: '#9AA8B5', maxWidth: w - 430 });
      text(ctx, 'Review', 410, 244, { size: 30, color: '#9AA8B5' });
      text(ctx, `${r.review.toFixed(1)} / 10`, 410, 280, { size: 84, bold: true, color: '#FFD166' });
      text(ctx, `Quality ${r.quality.toFixed(1)} / 100`, 410, 386, { size: 36, bold: true, maxWidth: w - 430 });
      text(ctx, `Took ${rec.days} work days`, 410, 438, { size: 28, color: '#9AA8B5', maxWidth: w - 430 });

      drawLaunch(ctx, rec, w);

      const y0 = 530 + SHIFT;
      panel(ctx, { x: 0, y: y0, w, h: 440 });
      text(ctx, 'Final stats', 24, y0 + 20, { size: 34, bold: true });
      statBars(ctx, 24, y0 + 74, w - 48, r.stats, ROBOT_STATS, { color: '#7CFFB2' });

      const y1 = 990 + SHIFT;
      panel(ctx, { x: 0, y: y1, w, h: 250 });
      text(ctx, `Innovation ${r.innovation} · Fit ${r.fit} · Budget ${r.budgetFocus}`, 24, y1 + 22, { size: 30, bold: true, maxWidth: w - 48 });
      text(ctx, `Faults left ${r.faults} (found ${r.faultsFound}, fixed ${r.faultsFixed}) · Breakthroughs ${r.breakthroughs}`, 24, y1 + 72, { size: 28, color: '#E8EEF2', maxWidth: w - 48 });
      text(ctx, `Parts: ${SLOTS.map((s) => COMPONENTS[r.components[s.id]].name).join(', ')}`, 24, y1 + 120, { size: 24, color: '#9AA8B5', maxWidth: w - 48 });
      text(ctx, `Team: ${rec.team.map((t) => t.name).join(', ')}`, 24, y1 + 160, { size: 28, color: '#E8EEF2', maxWidth: w - 48 });
      text(ctx, `Saved to project history as #${rec.number}`, 24, y1 + 206, { size: 26, color: '#7CFFB2', maxWidth: w - 48 });

      const y2 = 1270 + SHIFT;
      text(ctx, `Project history (${campaign.history.records.length})`, 4, y2, { size: 34, bold: true });
      [...campaign.history.records]
        .reverse()
        .slice(0, 10)
        .forEach((h, i) => {
          const y = y2 + 50 + i * 56;
          const sale = h.launchedProductId ? ' · on sale' : '';
          text(ctx, `#${h.number} ${h.name}${sale}`, 4, y, { size: 28, bold: h.number === rec.number, maxWidth: w * 0.55 });
          text(ctx, `Review ${h.result.review.toFixed(1)} · Quality ${h.result.quality.toFixed(1)}`, w, y, { size: 28, align: 'right', color: '#9AA8B5' });
        });
      scroll.end(ctx);

      drawButton(ctx, doneRect(), 'Back to the workshop', { active: true, accent: '#7CFFB2', font: 'bold 40px system-ui, sans-serif' });
    },
  };

  function drawLaunch(ctx, rec, w) {
    const y = LAUNCH_Y;
    panel(ctx, { x: 0, y, w, h: LAUNCH_H }, { stroke: '#FFD166' });
    contained(ctx, assets, 'ui_icon_13', { x: 20, y: y + 16, w: 60, h: 60 });
    const product = rec.launchedProductId ? campaign.products.get(rec.launchedProductId) : null;
    if (product) {
      text(ctx, 'On sale!', 96, y + 22, { size: 44, bold: true, color: '#7CFFB2' });
      text(ctx, `${PRICE_POSITIONS[product.data.position].name} price · ${SEGMENTS[0].name} market`, 24, y + 100, { size: 30, maxWidth: w - 48 });
      text(ctx, 'Sales arrive at the end of each month for 6 months.', 24, y + 150, { size: 28, color: '#9AA8B5', maxWidth: w - 48 });
      text(ctx, 'See them any time with the Products button at the top.', 24, y + 196, { size: 28, color: '#9AA8B5', maxWidth: w - 48 });
      return;
    }
    text(ctx, 'Put it on sale', 96, y + 22, { size: 44, bold: true });
    if (!campaign.products.freeSlots) {
      text(ctx, `Both product slots are in use (${campaign.products.slotCount}/${campaign.products.slotCount}).`, 24, y + 110, { size: 30, color: '#FF8A80', maxWidth: w - 48 });
      text(ctx, 'Retire a product to make room — this robot stays in your history.', 24, y + 160, { size: 28, color: '#9AA8B5', maxWidth: w - 48 });
      drawButton(ctx, launchRect(), 'Go to Products', { font: 'bold 36px system-ui, sans-serif' });
      return;
    }
    PRICE_ORDER.forEach((id, i) => drawButton(ctx, positionRect(i), PRICE_POSITIONS[id].name, { active: position === id, font: 'bold 32px system-ui, sans-serif' }));
    const data = campaign.market.productData(rec, position, campaign.products.products);
    const f = campaign.market.forecast(data);
    text(ctx, PRICE_POSITIONS[position].note + (data.novelty < 1 ? ' Same build as before: −15% sales.' : ''), 24, y + 202, { size: 26, color: '#9AA8B5', maxWidth: w - 48 });
    text(ctx, `About ${f.firstMonth.units} sold in month 1 at ${fmt(f.firstMonth.unitPrice)} each · ≈${fmt(f.revenue)} over 6 months`, 24, y + 240, {
      size: 28,
      bold: true,
      color: '#FFD166',
      maxWidth: w - 48,
    });
    if (message) text(ctx, message, w - 24, y + 22, { size: 26, color: '#FF8A80', align: 'right' });
    drawButton(ctx, launchRect(), 'Launch', { active: true, accent: '#FFD166', font: 'bold 40px system-ui, sans-serif' });
  }

  return screen;
}
