// Finance: money, Tech Chips, reputation, debt status, sponsors (Milestone 15: the active deal, offers to sign and
// every sponsor's requirement), this month's income and costs, and the full ledger.
import { THEME, font } from '../../../../core/Theme.js';
import { ScrollPanel } from '../../../../core/ui/ScrollPanel.js';
import { drawButton } from '../../../../core/ui/Button.js';
import { SPONSORS } from '../../data/sponsors.js';
import { describeUnlock } from '../systems/unlockRules.js';
import { sponsorIcon } from '../app/Messages.js';
import { DEBT_RULES, BLOCK_NAMES } from '../../data/economy.js';
import { createTopBar } from '../ui/TopBar.js';
import { panel, text, contained, fmt, hit, wrapText } from '../ui/widgets.js';
const COL = THEME.color;

const CATEGORY_NAMES = {
  start: 'Starting money',
  sales: 'Sales',
  contract: 'Contracts',
  competition: 'Competitions',
  salary: 'Salaries',
  projectBuild: 'Build costs',
  projectDaily: 'Running costs',
  interest: 'Debt interest',
  reward: 'Rewards',
  hiring: 'Hiring',
  training: 'Training',
  store: 'Store',
  research: 'Research',
  event: 'Events',
  other: 'Other',
};
const LINE_H = 58;
const SPONSOR_Y = 640;
const OFFER_H = 270;
const MONEY_CATS = ['sales', 'contract', 'competition', 'event', 'reward', 'salary', 'hiring', 'training', 'projectBuild', 'projectDaily', 'interest'];

export function createFinanceScreen({ renderer, layout, assets, campaign, router, goProject, hud }) {
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
  let message = null; // { text, color, until }
  let viewed = false;

  function bodyRect() {
    const sr = layout.safeRect;
    const t = topBar.rect();
    const y = t.y + t.h + 16;
    return { x: sr.x + 24, y, w: sr.w - 48, h: sr.y + sr.h - 24 - y };
  }

  // --- sponsor panel layout (content coordinates) ---
  const S = () => campaign.sponsors;
  const day = () => campaign.clock.totalDays;

  function sponsorLayout() {
    const w = bodyRect().w;
    let y = SPONSOR_Y + 80;
    const parts = {};
    if (!campaign.sponsorsOpen) {
      parts.locked = y;
      y += 70;
    } else {
      if (S().active) {
        parts.active = y;
        y += 300;
      }
      parts.offers = S().offers.map((o, i) => ({ offer: o, y: y + i * (OFFER_H + 14) }));
      y += S().offers.length * (OFFER_H + 14);
      if (!S().active && !S().offers.length) {
        parts.none = y;
        y += 70;
      }
    }
    parts.list = y + 10;
    y += 10 + 56 + SPONSORS.length * 48 + 20;
    return { w, parts, h: y - SPONSOR_Y };
  }

  function signRect(i) {
    const L = sponsorLayout();
    const o = L.parts.offers?.[i];
    return o ? { x: L.w - 24 - 220, y: o.y + OFFER_H - 24 - 110, w: 220, h: 110 } : null;
  }

  function offerRect(i) {
    const L = sponsorLayout();
    const o = L.parts.offers?.[i];
    return o ? { x: 16, y: o.y, w: L.w - 32, h: OFFER_H } : null;
  }

  function obligationLine(def, deal) {
    const ob = def.obligation;
    if (ob.type === 'avoid') return deal.broken ? { t: '✗ Missed — the benefit ends when the deal does (no penalty)', c: COL.bad } : { t: '✓ On track — keep it that way until the deal ends', c: COL.good };
    if (deal.met) return { t: `✓ Done (${Math.min(deal.count, ob.min)}/${ob.min}) — they will offer to renew`, c: COL.good };
    return { t: `${deal.count}/${ob.min} so far — miss it and the benefit just ends at renewal`, c: COL.gold };
  }

  function drawSponsors(ctx) {
    const L = sponsorLayout();
    const { w, parts } = L;
    panel(ctx, { x: 0, y: SPONSOR_Y, w, h: L.h });
    text(ctx, 'Sponsors', 24, SPONSOR_Y + 20, { size: 38, bold: true });
    text(ctx, 'One at a time · 6-month deals', w - 24, SPONSOR_Y + 30, { size: 26, color: COL.textMuted, align: 'right' });
    if (parts.locked != null) text(ctx, 'Sponsors open at Company Rank C.', 24, parts.locked, { size: 30, color: COL.textMuted, maxWidth: w - 48 });
    if (parts.active != null) {
      const deal = S().active;
      const d = S().activeDef;
      const y = parts.active;
      panel(ctx, { x: 16, y, w: w - 32, h: 286 }, { fill: COL.panelGood, stroke: d.color ?? COL.good, lineWidth: 4 });
      contained(ctx, assets, sponsorIcon(d), { x: 28, y: y + 14, w: 170, h: 258 });
      const x = 214;
      const mw = w - 32 - x - 8;
      text(ctx, `${d.name}${deal.renewals ? ` · renewed ×${deal.renewals}` : ''}`, x, y + 18, { size: 36, bold: true, color: d.color ?? COL.text, maxWidth: mw });
      const left = S().daysLeft(day());
      text(ctx, `Active · ${left} days left (ends ${campaign.clock.shortLabel(deal.endDay)})`, x, y + 66, { size: 26, color: COL.textMuted, maxWidth: mw });
      text(ctx, `Benefit: ${d.benefitText}`, x, y + 106, { size: 26, color: COL.text, maxWidth: mw });
      wrapText(ctx, `Goal: ${d.obligationText}`, x, y + 146, mw, { size: 26, maxLines: 2 });
      const ol = obligationLine(d, deal);
      wrapText(ctx, ol.t, x, y + 214, mw, { size: 25, bold: true, maxLines: 2, color: ol.c });
    }
    (parts.offers ?? []).forEach(({ offer, y }, i) => {
      const d = S().def(offer.id);
      panel(ctx, { x: 16, y, w: w - 32, h: OFFER_H }, { fill: COL.panelGold, stroke: COL.gold, lineWidth: 4 });
      contained(ctx, assets, sponsorIcon(d), { x: 28, y: y + 14, w: 150, h: OFFER_H - 28 });
      const x = 194;
      const mw = w - 32 - x - 16;
      text(ctx, `${offer.renewal ? 'Renewal offer' : 'Offer'}: ${d.name}`, x, y + 16, { size: 34, bold: true, color: COL.gold, maxWidth: mw });
      text(ctx, `Benefit: ${d.benefitText}`, x, y + 62, { size: 25, maxWidth: mw });
      wrapText(ctx, `Goal: ${d.obligationText}`, x, y + 100, mw - 250, { size: 25, maxLines: 2, color: COL.textMuted }); // clear of the Sign button
      text(ctx, `Open for ${Math.max(0, offer.untilDay - day())} more days`, x, y + OFFER_H - 58, { size: 24, color: COL.textMuted, maxWidth: mw - 240 });
      const block = S().signBlock(offer.id);
      drawButton(ctx, signRect(i), 'Sign', { accent: COL.good, disabled: !!block, font: font(36, true) });
    });
    if (parts.none != null) text(ctx, 'No offer right now — sponsors get in touch when you meet what they look for.', 24, parts.none, { size: 26, color: COL.textMuted, maxWidth: w - 48 });
    // Every sponsor: what it wants before it will offer.
    const ly = parts.list;
    text(ctx, 'Who might sponsor you', 24, ly, { size: 28, bold: true, color: COL.textMuted });
    SPONSORS.forEach((d, i) => {
      const y = ly + 50 + i * 48;
      const met = campaign.sponsorsOpen && campaign.ruleMet(d.requirement);
      const act = S().active?.id === d.id;
      const off = S().offers.some((o) => o.id === d.id);
      const wait = S().cooldown[d.id] > day();
      text(ctx, d.name, 24, y, { size: 26, bold: true, color: d.color ?? COL.text, maxWidth: 260 });
      text(ctx, `${met ? '✓' : '•'} ${describeUnlock(d.requirement)}`, 300, y, { size: 24, color: met ? COL.good : COL.textMuted, maxWidth: w - 300 - 250 });
      const st = act ? 'Active' : off ? 'Offer open' : wait ? `Back ${campaign.clock.shortLabel(S().cooldown[d.id])}` : '';
      text(ctx, st, w - 24, y, { size: 24, bold: true, color: act ? COL.good : COL.gold, align: 'right', maxWidth: 230 });
    });
    return L.h;
  }

  const screen = {
    topBar,
    scroll,
    // Guide target: the first sponsor offer (content coordinates).
    sponsorOfferRect: () => offerRect(0),
    enter() {
      scroll.scrollY = 0;
      message = null;
      viewed = false;
    },
    onTap(p) {
      if (topBar.handleTap(p)) return;
      if (!scroll.contains(p)) return;
      const c = scroll.toContent(p);
      S().offers.forEach((o, i) => {
        const r = signRect(i);
        if (r && hit(c, r)) {
          const res = campaign.signSponsor(o.id);
          const d = S().def(o.id);
          message = res.ok ? { text: `Signed with ${d.name}!`, color: COL.good } : { text: res.reason, color: COL.bad };
          message.until = performance.now() + 2500;
        }
      });
    },
    onDragStart: (p) => scroll.beginDrag(p),
    onDrag: (p) => scroll.drag(p),
    onDragEnd: (p) => scroll.endDrag(p),

    render(ctx) {
      ctx.fillStyle = COL.bg;
      ctx.fillRect(0, 0, W, renderer.height);
      topBar.render(ctx);
      if (!viewed && S().offers.length) {
        viewed = true;
        campaign.bus.emit('sponsor:viewed', {}); // the guide's "look at the offer" step
      }
      const eco = campaign.economy;
      const clock = campaign.clock;
      const rep = campaign.reputation;
      const w = bodyRect().w;
      const lines = eco.ledger;
      const spH = sponsorLayout().h;
      const moneyY = SPONSOR_Y + spH + 20;
      const moneyH = 90 + MONEY_CATS.length * 42 + 20;
      const checkY = moneyY + moneyH + 30;
      const ledgerY = checkY + 90;
      scroll.contentHeight = ledgerY + 70 + lines.length * LINE_H + 20;

      scroll.begin(ctx);

      // Totals
      panel(ctx, { x: 0, y: 0, w, h: 280 });
      contained(ctx, assets, 'reward_01', { x: 16, y: 16, w: 250, h: 248 });
      const cash = eco.balance('credits');
      text(ctx, 'Credits', 290, 24, { size: 28, color: COL.textMuted });
      text(ctx, fmt(cash), 290, 58, { size: 64, bold: true, color: cash < 0 ? COL.bad : COL.text });
      text(ctx, `Tech Chips ${eco.balance('techChips')}${eco.balance('prestigeTokens') ? ` · Prestige Tokens ${eco.balance('prestigeTokens')}` : ''}`, 290, 150, { size: 32, bold: true, color: COL.purple, maxWidth: w - 310 });
      const next = rep.nextRank;
      text(ctx, `Reputation ${rep.value} · Rank ${rep.rank.id}${next ? ` (Rank ${next.id} at ${fmt(next.min)})` : ''}`, 290, 200, { size: 28, maxWidth: w - 310 });

      // Debt
      const debt = eco.inDebt;
      panel(ctx, { x: 0, y: 300, w, h: 320 }, { stroke: debt ? COL.bad : COL.line, fill: debt ? COL.panelBad : COL.panel });
      contained(ctx, assets, 'ui_icon_29', { x: 20, y: 320, w: 64, h: 64 });
      if (debt) {
        text(ctx, 'In debt — Emergency Credit', 100, 330, { size: 38, bold: true, color: COL.bad, maxWidth: w - 120 });
        text(ctx, `Each month-end you pay ${DEBT_RULES.monthlyInterestPct}% interest on the debt.`, 24, 400, { size: 28, maxWidth: w - 48 });
        text(ctx, `Emergency limit: ${fmt(DEBT_RULES.limit)}. Month-ends below it in a row: ${eco.badMonths} of ${DEBT_RULES.closureMonths}.`, 24, 446, { size: 28, color: eco.badMonths ? COL.bad : COL.text, maxWidth: w - 48 });
        text(ctx, `${DEBT_RULES.closureMonths} in a row and the workshop closes for good.`, 24, 492, { size: 28, maxWidth: w - 48 });
        text(ctx, `While in debt you can't: ${DEBT_RULES.blockedWhileNegative.map((k) => BLOCK_NAMES[k]).join(', ')}.`, 24, 540, { size: 24, color: COL.textMuted, maxWidth: w - 48 });
      } else {
        text(ctx, 'No debt', 100, 330, { size: 38, bold: true, color: COL.good });
        text(ctx, 'If Credits drop below 0 you go into Emergency Credit:', 24, 400, { size: 28, maxWidth: w - 48 });
        text(ctx, `${DEBT_RULES.monthlyInterestPct}% interest a month, and ${DEBT_RULES.closureMonths} month-ends in a row below ${fmt(DEBT_RULES.limit)}`, 24, 446, { size: 28, maxWidth: w - 48 });
        text(ctx, 'close the workshop.', 24, 492, { size: 28, maxWidth: w - 48 });
      }

      // Sponsors (§23)
      drawSponsors(ctx);

      // This month / last month
      const monthStart = clock.totalDays - (clock.day - 1);
      const thisM = eco.totals('credits', monthStart, clock.totalDays);
      const lastM = eco.totals('credits', monthStart - clock.daysPerMonth, monthStart - 1);
      panel(ctx, { x: 0, y: moneyY, w, h: moneyH });
      text(ctx, 'Money in and out', 24, moneyY + 20, { size: 34, bold: true });
      text(ctx, 'This month', w - 300, moneyY + 28, { size: 24, color: COL.textMuted, align: 'right' });
      text(ctx, 'Last month', w - 24, moneyY + 28, { size: 24, color: COL.textMuted, align: 'right' });
      MONEY_CATS.forEach((c, i) => {
        const y = moneyY + 72 + i * 42;
        text(ctx, CATEGORY_NAMES[c], 24, y, { size: 28 });
        for (const [val, x] of [[thisM[c] ?? 0, w - 300], [lastM[c] ?? 0, w - 24]]) {
          text(ctx, val ? `${val > 0 ? '+' : ''}${fmt(val)}` : '—', x, y, { size: 28, bold: true, align: 'right', color: val > 0 ? COL.good : val < 0 ? COL.bad : COL.textMuted });
        }
      });

      // Check + ledger
      const rec = eco.reconcile();
      text(ctx, rec.ok ? 'Ledger adds up to your balance ✓' : 'Ledger does NOT add up!', 4, checkY, { size: 28, bold: true, color: rec.ok ? COL.good : COL.bad });
      text(ctx, `Ledger (${lines.length} lines, newest first)`, 4, ledgerY, { size: 34, bold: true });
      // Only draw the lines that are on screen.
      const first = Math.max(0, Math.floor((scroll.scrollY - ledgerY - 70) / LINE_H));
      const count = Math.ceil(bodyRect().h / LINE_H) + 2;
      for (let k = first; k < Math.min(lines.length, first + count); k++) {
        const l = lines[lines.length - 1 - k];
        const y = ledgerY + 70 + k * LINE_H;
        ctx.fillStyle = k % 2 ? COL.stripe : COL.stripe;
        ctx.fillRect(0, y - 6, w, LINE_H);
        const cur = l.currency === 'credits' ? '' : ' TC';
        text(ctx, clock.shortLabel(l.day), 12, y + 8, { size: 22, color: COL.textMuted });
        text(ctx, l.reason, 170, y + 6, { size: 24, maxWidth: w - 170 - 360 });
        text(ctx, `${l.amount > 0 ? '+' : ''}${fmt(l.amount)}${cur}`, w - 190, y + 6, { size: 26, bold: true, align: 'right', color: l.amount > 0 ? COL.good : COL.bad });
        text(ctx, `${fmt(l.balance)}${cur}`, w - 12, y + 6, { size: 24, align: 'right', color: COL.textMuted });
      }
      scroll.end(ctx);
      if (message && performance.now() < message.until) {
        const b = bodyRect();
        panel(ctx, { x: b.x + 40, y: b.y + b.h - 110, w: b.w - 80, h: 86 }, { fill: COL.panel, stroke: message.color });
        text(ctx, message.text, b.x + b.w / 2, b.y + b.h - 67, { size: 32, bold: true, color: message.color, align: 'center', baseline: 'middle', maxWidth: b.w - 120 });
      }
    },
  };
  return screen;
}
