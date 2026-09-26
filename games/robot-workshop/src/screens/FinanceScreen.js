// Finance: money, Tech Chips, reputation, debt status, sponsors (Milestone 15: the active deal, offers to sign and
// every sponsor's requirement), this month's income and costs, and the full ledger.
// Milestone 18: every line at the §33.2 sizes (body 34, small 28); long lines wrap and the panels grow to fit.
import { THEME, font } from '../../../../core/Theme.js';
import { ScrollPanel } from '../../../../core/ui/ScrollPanel.js';
import { drawButton } from '../../../../core/ui/Button.js';
import { SPONSORS } from '../../data/sponsors.js';
import { describeUnlock } from '../systems/unlockRules.js';
import { sponsorIcon } from '../app/Messages.js';
import { DEBT_RULES, BLOCK_NAMES } from '../../data/economy.js';
import { createTopBar } from '../ui/TopBar.js';
import { panel, text, contained, fmt, hit, wrapText, iconButton } from '../ui/widgets.js';
import { MONETISATION_ART } from '../../data/monetisation.js';
const COL = THEME.color;
const BODY = THEME.size.body;
const SMALL = THEME.size.small;

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
  ad: 'Ad rewards', // Milestone 23: Recovery Grant, contract ad bonus
  purchase: 'Store purchases',
  vip: 'VIP',
  research: 'Research',
  event: 'Events',
  other: 'Other',
};
const LINE = 46; // one wrapped line of body text
const LINE_H = 100; // a ledger line: reason + amount, then date + balance
const MONEY_ROW = 50;
const TOTALS_H = 300;
const DEBT_Y = TOTALS_H + 20;
const ACTIVE_H = 440;
const OFFER_H = 330;
const SPONSOR_ROW = 104; // a sponsor's name + status, then what it wants
const MONEY_CATS = ['sales', 'contract', 'competition', 'event', 'reward', 'salary', 'hiring', 'training', 'projectBuild', 'projectDaily', 'interest'];

export function createFinanceScreen({ renderer, layout, assets, campaign, router, goProject, hud, ads = null }) {
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

  // The debt panel is taller while in debt (more rules to explain).
  // Milestone 23: while in debt, an optional "Watch ad" Recovery Grant (once per real 24 hours) sits at its foot.
  const grant = () => ads?.placement('recoveryGrant') ?? { show: false };
  const GRANT_H = 150;
  const debtH = () => (campaign.economy.inDebt ? 450 + (grant().show ? GRANT_H + 20 : 0) : 310);
  const grantRect = () => ({ x: 24, y: DEBT_Y + debtH() - 24 - GRANT_H, w: bodyRect().w - 48, h: GRANT_H });
  const sponsorY = () => DEBT_Y + debtH() + 20;

  // --- sponsor panel layout (content coordinates) ---
  const S = () => campaign.sponsors;
  const day = () => campaign.clock.totalDays;

  function sponsorLayout() {
    const w = bodyRect().w;
    const top = sponsorY();
    let y = top + 120;
    const parts = {};
    if (!campaign.sponsorsOpen) {
      parts.locked = y;
      y += 70;
    } else {
      if (S().active) {
        parts.active = y;
        y += ACTIVE_H + 14;
      }
      parts.offers = S().offers.map((o, i) => ({ offer: o, y: y + i * (OFFER_H + 14) }));
      y += S().offers.length * (OFFER_H + 14);
      if (!S().active && !S().offers.length) {
        parts.none = y;
        y += 110;
      }
    }
    parts.list = y + 10;
    y += 10 + 60 + SPONSORS.length * SPONSOR_ROW + 20;
    return { w, top, parts, h: y - top };
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
    const { w, parts, top } = L;
    panel(ctx, { x: 0, y: top, w, h: L.h });
    text(ctx, 'Sponsors', 24, top + 20, { size: THEME.size.heading, bold: true });
    text(ctx, 'One at a time · 6-month deals', 24, top + 76, { size: SMALL, color: COL.textMuted, maxWidth: w - 48 });
    if (parts.locked != null) text(ctx, 'Sponsors open at Company Rank C.', 24, parts.locked, { size: BODY, color: COL.textMuted, maxWidth: w - 48 });
    if (parts.active != null) {
      const deal = S().active;
      const d = S().activeDef;
      const y = parts.active;
      panel(ctx, { x: 16, y, w: w - 32, h: ACTIVE_H }, { fill: COL.panelGood, stroke: d.color ?? COL.good, lineWidth: 4 });
      contained(ctx, assets, sponsorIcon(d), { x: 28, y: y + 14, w: 170, h: 258 });
      const x = 214;
      const mw = w - 32 - x - 8;
      text(ctx, `${d.name}${deal.renewals ? ` · renewed ×${deal.renewals}` : ''}`, x, y + 18, { size: THEME.size.button, bold: true, color: d.color ?? COL.text, maxWidth: mw });
      const left = S().daysLeft(day());
      text(ctx, `Active · ${left} days left (ends ${campaign.clock.shortLabel(deal.endDay)})`, x, y + 68, { size: SMALL, color: COL.textMuted, maxWidth: mw });
      wrapText(ctx, `Benefit: ${d.benefitText}`, x, y + 110, mw, { size: BODY, lineH: LINE, maxLines: 2 });
      wrapText(ctx, `Goal: ${d.obligationText}`, x, y + 208, mw, { size: BODY, lineH: LINE, maxLines: 2 });
      const ol = obligationLine(d, deal);
      wrapText(ctx, ol.t, 28, y + 316, w - 32 - 40, { size: BODY, lineH: LINE, bold: true, maxLines: 2, color: ol.c });
    }
    (parts.offers ?? []).forEach(({ offer, y }, i) => {
      const d = S().def(offer.id);
      panel(ctx, { x: 16, y, w: w - 32, h: OFFER_H }, { fill: COL.panelGold, stroke: COL.gold, lineWidth: 4 });
      contained(ctx, assets, sponsorIcon(d), { x: 28, y: y + 14, w: 150, h: OFFER_H - 28 });
      const x = 194;
      const mw = w - 32 - x - 16;
      text(ctx, `${offer.renewal ? 'Renewal offer' : 'Offer'}: ${d.name}`, x, y + 16, { size: BODY + 2, bold: true, color: COL.gold, maxWidth: mw });
      wrapText(ctx, `Benefit: ${d.benefitText}`, x, y + 64, mw, { size: BODY, lineH: LINE, maxLines: 2 });
      wrapText(ctx, `Goal: ${d.obligationText}`, x, y + 162, mw - 250, { size: BODY, lineH: LINE, maxLines: 2, color: COL.textMuted }); // clear of the Sign button
      text(ctx, `Open for ${Math.max(0, offer.untilDay - day())} more days`, x, y + OFFER_H - 58, { size: SMALL, color: COL.textMuted, maxWidth: mw - 240 });
      const block = S().signBlock(offer.id);
      drawButton(ctx, signRect(i), 'Sign', { accent: COL.good, disabled: !!block, font: font(THEME.size.button, true) });
    });
    if (parts.none != null) wrapText(ctx, 'No offer right now — sponsors get in touch when you meet what they look for.', 24, parts.none, w - 48, { size: BODY, lineH: LINE, color: COL.textMuted });
    // Every sponsor: what it wants before it will offer.
    const ly = parts.list;
    text(ctx, 'Who might sponsor you', 24, ly, { size: BODY, bold: true, color: COL.textMuted });
    SPONSORS.forEach((d, i) => {
      const y = ly + 60 + i * SPONSOR_ROW;
      const met = campaign.sponsorsOpen && campaign.ruleMet(d.requirement);
      const act = S().active?.id === d.id;
      const off = S().offers.some((o) => o.id === d.id);
      const wait = S().cooldown[d.id] > day();
      text(ctx, d.name, 24, y, { size: BODY, bold: true, color: d.color ?? COL.text, maxWidth: w - 48 - 300 });
      const st = act ? 'Active' : off ? 'Offer open' : wait ? `Back ${campaign.clock.shortLabel(S().cooldown[d.id])}` : '';
      text(ctx, st, w - 24, y + 4, { size: SMALL, bold: true, color: act ? COL.good : COL.gold, align: 'right', maxWidth: 280 });
      text(ctx, `${met ? '✓' : '•'} ${describeUnlock(d.requirement)}`, 48, y + 48, { size: BODY, color: met ? COL.good : COL.textMuted, maxWidth: w - 72 });
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
      if (grant().show && hit(c, grantRect())) {
        const pl = grant();
        if (!pl.ok) message = { text: pl.sub, color: COL.gold, until: performance.now() + 2500 };
        else ads.watch('recoveryGrant');
        return;
      }
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
      const moneyY = sponsorY() + spH + 20;
      const moneyH = 100 + MONEY_CATS.length * MONEY_ROW + 20;
      const checkY = moneyY + moneyH + 30;
      const ledgerY = checkY + 90;
      scroll.contentHeight = ledgerY + 80 + lines.length * LINE_H + 20;

      scroll.begin(ctx);

      // Totals
      panel(ctx, { x: 0, y: 0, w, h: TOTALS_H });
      contained(ctx, assets, 'reward_01', { x: 16, y: 16, w: 250, h: 248 });
      const cash = eco.balance('credits');
      text(ctx, 'Credits', 290, 22, { size: SMALL, color: COL.textMuted });
      text(ctx, fmt(cash), 290, 56, { size: 64, bold: true, color: cash < 0 ? COL.bad : COL.text });
      text(ctx, `Tech Chips ${eco.balance('techChips')}${eco.balance('prestigeTokens') ? ` · Prestige Tokens ${eco.balance('prestigeTokens')}` : ''}`, 290, 142, { size: BODY, bold: true, color: COL.purple, maxWidth: w - 310 });
      const next = rep.nextRank;
      wrapText(ctx, `Reputation ${fmt(rep.value)} · Rank ${rep.rank.id}${next ? ` (Rank ${next.id} at ${fmt(next.min)})` : ''}`, 290, 194, w - 310, { size: BODY, lineH: LINE, maxLines: 2 });

      // Debt
      const debt = eco.inDebt;
      const dy = DEBT_Y;
      panel(ctx, { x: 0, y: dy, w, h: debtH() }, { stroke: debt ? COL.bad : COL.line, fill: debt ? COL.panelBad : COL.panel });
      contained(ctx, assets, 'ui_icon_29', { x: 20, y: dy + 20, w: 64, h: 64 });
      if (debt) {
        text(ctx, 'In debt — Emergency Credit', 100, dy + 30, { size: THEME.size.button, bold: true, color: COL.bad, maxWidth: w - 120 });
        let y = dy + 100;
        const para = (str, opts = {}) => (y += wrapText(ctx, str, 24, y, w - 48, { size: BODY, lineH: LINE, ...opts }) * (opts.lineH ?? LINE) + 8);
        para(`Each month-end you pay ${DEBT_RULES.monthlyInterestPct}% interest on the debt.`);
        para(`Emergency limit: ${fmt(DEBT_RULES.limit)}. Month-ends below it in a row: ${eco.badMonths} of ${DEBT_RULES.closureMonths}.`, { color: eco.badMonths ? COL.bad : COL.text });
        para(`${DEBT_RULES.closureMonths} in a row and the workshop closes for good.`);
        para(`While in debt you can't: ${DEBT_RULES.blockedWhileNegative.map((k) => BLOCK_NAMES[k]).join(', ')}.`, { size: SMALL, lineH: 38, maxLines: 3, color: COL.textMuted });
        const pl = grant();
        if (pl.show) iconButton(ctx, assets, grantRect(), { label: pl.label, sub: pl.sub, icon: MONETISATION_ART.ad, accent: COL.purple, disabled: !pl.ok });
      } else {
        text(ctx, 'No debt', 100, dy + 30, { size: THEME.size.button, bold: true, color: COL.good });
        wrapText(ctx, `If Credits drop below 0 you go into Emergency Credit: ${DEBT_RULES.monthlyInterestPct}% interest a month, and ${DEBT_RULES.closureMonths} month-ends in a row below ${fmt(DEBT_RULES.limit)} close the workshop.`, 24, dy + 100, w - 48, { size: BODY, lineH: LINE, maxLines: 4 });
      }

      // Sponsors (§23)
      drawSponsors(ctx);

      // This month / last month
      const monthStart = clock.totalDays - (clock.day - 1);
      const thisM = eco.totals('credits', monthStart, clock.totalDays);
      const lastM = eco.totals('credits', monthStart - clock.daysPerMonth, monthStart - 1);
      panel(ctx, { x: 0, y: moneyY, w, h: moneyH });
      text(ctx, 'Money in and out', 24, moneyY + 20, { size: THEME.size.button, bold: true });
      text(ctx, 'This month', w - 300, moneyY + 72, { size: SMALL, color: COL.textMuted, align: 'right' });
      text(ctx, 'Last month', w - 24, moneyY + 72, { size: SMALL, color: COL.textMuted, align: 'right' });
      MONEY_CATS.forEach((c, i) => {
        const y = moneyY + 116 + i * MONEY_ROW;
        text(ctx, CATEGORY_NAMES[c], 24, y, { size: BODY, maxWidth: w - 24 - 560 });
        for (const [val, x] of [[thisM[c] ?? 0, w - 300], [lastM[c] ?? 0, w - 24]]) {
          text(ctx, val ? `${val > 0 ? '+' : ''}${fmt(val)}` : '—', x, y, { size: BODY, bold: true, align: 'right', color: val > 0 ? COL.good : val < 0 ? COL.bad : COL.textMuted, maxWidth: 250 });
        }
      });

      // Check + ledger
      const rec = eco.reconcile();
      text(ctx, rec.ok ? 'Ledger adds up to your balance ✓' : 'Ledger does NOT add up!', 4, checkY, { size: BODY, bold: true, color: rec.ok ? COL.good : COL.bad, maxWidth: w - 8 });
      text(ctx, `Ledger (${lines.length} lines, newest first)`, 4, ledgerY, { size: THEME.size.button, bold: true, maxWidth: w - 8 });
      // Only draw the lines that are on screen.
      const first = Math.max(0, Math.floor((scroll.scrollY - ledgerY - 80) / LINE_H));
      const count = Math.ceil(bodyRect().h / LINE_H) + 2;
      for (let k = first; k < Math.min(lines.length, first + count); k++) {
        const l = lines[lines.length - 1 - k];
        const y = ledgerY + 80 + k * LINE_H;
        ctx.fillStyle = COL.stripe;
        ctx.fillRect(0, y - 6, w, LINE_H - 6);
        const cur = l.currency === 'credits' ? '' : ' TC';
        text(ctx, l.reason, 12, y + 4, { size: BODY, maxWidth: w - 12 - 250 });
        text(ctx, `${l.amount > 0 ? '+' : ''}${fmt(l.amount)}${cur}`, w - 12, y + 4, { size: BODY, bold: true, align: 'right', color: l.amount > 0 ? COL.good : COL.bad, maxWidth: 230 });
        text(ctx, clock.shortLabel(l.day), 12, y + 50, { size: SMALL, color: COL.textMuted });
        text(ctx, `Balance ${fmt(l.balance)}${cur}`, w - 12, y + 50, { size: SMALL, align: 'right', color: COL.textMuted });
      }
      scroll.end(ctx);
      if (message && performance.now() < message.until) {
        const b = bodyRect();
        panel(ctx, { x: b.x + 40, y: b.y + b.h - 110, w: b.w - 80, h: 86 }, { fill: COL.panel, stroke: message.color });
        text(ctx, message.text, b.x + b.w / 2, b.y + b.h - 67, { size: BODY, bold: true, color: message.color, align: 'center', baseline: 'middle', maxWidth: b.w - 120 });
      }
    },
  };
  return screen;
}
