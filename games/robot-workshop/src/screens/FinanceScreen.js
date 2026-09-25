// Finance: money, Tech Chips, reputation, debt status, this month's income and costs, and the full ledger.
import { ScrollPanel } from '../../../../core/ui/ScrollPanel.js';
import { DEBT_RULES, BLOCK_NAMES } from '../../data/economy.js';
import { createTopBar } from '../ui/TopBar.js';
import { panel, text, contained, fmt } from '../ui/widgets.js';

const CATEGORY_NAMES = {
  start: 'Starting money',
  sales: 'Sales',
  salary: 'Salaries',
  projectBuild: 'Build costs',
  projectDaily: 'Running costs',
  interest: 'Debt interest',
  reward: 'Rewards',
  other: 'Other',
};
const LINE_H = 58;
const LEDGER_Y = 1180;

export function createFinanceScreen({ renderer, layout, assets, campaign, router, goProject, hud }) {
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

  function bodyRect() {
    const sr = layout.safeRect;
    const t = topBar.rect();
    const y = t.y + t.h + 16;
    return { x: sr.x + 24, y, w: sr.w - 48, h: sr.y + sr.h - 24 - y };
  }

  const screen = {
    topBar,
    scroll,
    enter() {
      scroll.scrollY = 0;
    },
    onTap(p) {
      topBar.handleTap(p);
    },
    onDragStart: (p) => scroll.beginDrag(p),
    onDrag: (p) => scroll.drag(p),
    onDragEnd: (p) => scroll.endDrag(p),

    render(ctx) {
      ctx.fillStyle = '#101418';
      ctx.fillRect(0, 0, W, H);
      topBar.render(ctx);
      const eco = campaign.economy;
      const clock = campaign.clock;
      const rep = campaign.reputation;
      const w = bodyRect().w;
      const lines = eco.ledger;
      scroll.contentHeight = LEDGER_Y + 70 + lines.length * LINE_H + 20;

      scroll.begin(ctx);

      // Totals
      panel(ctx, { x: 0, y: 0, w, h: 280 });
      contained(ctx, assets, 'reward_01', { x: 16, y: 16, w: 250, h: 248 });
      const cash = eco.balance('credits');
      text(ctx, 'Credits', 290, 24, { size: 28, color: '#9AA8B5' });
      text(ctx, fmt(cash), 290, 58, { size: 64, bold: true, color: cash < 0 ? '#FF8A80' : '#FFFFFF' });
      text(ctx, `Tech Chips ${eco.balance('techChips')}`, 290, 150, { size: 32, bold: true, color: '#B39DDB' });
      const next = rep.nextRank;
      text(ctx, `Reputation ${rep.value} · Rank ${rep.rank.id}${next ? ` (Rank ${next.id} at ${fmt(next.min)})` : ''}`, 290, 200, { size: 28, maxWidth: w - 310 });

      // Debt
      const debt = eco.inDebt;
      panel(ctx, { x: 0, y: 300, w, h: 320 }, { stroke: debt ? '#FF5A5A' : '#35414F', fill: debt ? 'rgba(70,22,22,0.96)' : 'rgba(26,32,40,0.96)' });
      contained(ctx, assets, 'ui_icon_29', { x: 20, y: 320, w: 64, h: 64 });
      if (debt) {
        text(ctx, 'In debt — Emergency Credit', 100, 330, { size: 38, bold: true, color: '#FF8A80', maxWidth: w - 120 });
        text(ctx, `Each month-end you pay ${DEBT_RULES.monthlyInterestPct}% interest on the debt.`, 24, 400, { size: 28, maxWidth: w - 48 });
        text(ctx, `Emergency limit: ${fmt(DEBT_RULES.limit)}. Month-ends below it in a row: ${eco.badMonths} of ${DEBT_RULES.closureMonths}.`, 24, 446, { size: 28, color: eco.badMonths ? '#FF8A80' : '#E8EEF2', maxWidth: w - 48 });
        text(ctx, `${DEBT_RULES.closureMonths} in a row and the workshop closes for good.`, 24, 492, { size: 28, maxWidth: w - 48 });
        text(ctx, `While in debt you can't: ${DEBT_RULES.blockedWhileNegative.map((k) => BLOCK_NAMES[k]).join(', ')}.`, 24, 540, { size: 24, color: '#9AA8B5', maxWidth: w - 48 });
      } else {
        text(ctx, 'No debt', 100, 330, { size: 38, bold: true, color: '#7CFFB2' });
        text(ctx, 'If Credits drop below 0 you go into Emergency Credit:', 24, 400, { size: 28, maxWidth: w - 48 });
        text(ctx, `${DEBT_RULES.monthlyInterestPct}% interest a month, and ${DEBT_RULES.closureMonths} month-ends in a row below ${fmt(DEBT_RULES.limit)}`, 24, 446, { size: 28, maxWidth: w - 48 });
        text(ctx, 'close the workshop.', 24, 492, { size: 28, maxWidth: w - 48 });
      }

      // This month / last month
      const monthStart = clock.totalDays - (clock.day - 1);
      const thisM = eco.totals('credits', monthStart, clock.totalDays);
      const lastM = eco.totals('credits', monthStart - clock.daysPerMonth, monthStart - 1);
      panel(ctx, { x: 0, y: 640, w, h: 420 });
      text(ctx, 'Money in and out', 24, 660, { size: 34, bold: true });
      text(ctx, 'This month', w - 300, 668, { size: 24, color: '#9AA8B5', align: 'right' });
      text(ctx, 'Last month', w - 24, 668, { size: 24, color: '#9AA8B5', align: 'right' });
      const cats = ['sales', 'reward', 'salary', 'projectBuild', 'projectDaily', 'interest'];
      cats.forEach((c, i) => {
        const y = 716 + i * 50;
        text(ctx, CATEGORY_NAMES[c], 24, y, { size: 28 });
        for (const [val, x] of [[thisM[c] ?? 0, w - 300], [lastM[c] ?? 0, w - 24]]) {
          text(ctx, val ? `${val > 0 ? '+' : ''}${fmt(val)}` : '—', x, y, { size: 28, bold: true, align: 'right', color: val > 0 ? '#7CFFB2' : val < 0 ? '#FF8A80' : '#7F8C99' });
        }
      });

      // Check + ledger
      const rec = eco.reconcile();
      text(ctx, rec.ok ? 'Ledger adds up to your balance ✓' : 'Ledger does NOT add up!', 4, 1090, { size: 28, bold: true, color: rec.ok ? '#7CFFB2' : '#FF5A5A' });
      text(ctx, `Ledger (${lines.length} lines, newest first)`, 4, LEDGER_Y, { size: 34, bold: true });
      // Only draw the lines that are on screen.
      const first = Math.max(0, Math.floor((scroll.scrollY - LEDGER_Y - 70) / LINE_H));
      const count = Math.ceil(bodyRect().h / LINE_H) + 2;
      for (let k = first; k < Math.min(lines.length, first + count); k++) {
        const l = lines[lines.length - 1 - k];
        const y = LEDGER_Y + 70 + k * LINE_H;
        ctx.fillStyle = k % 2 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)';
        ctx.fillRect(0, y - 6, w, LINE_H);
        const cur = l.currency === 'credits' ? '' : ' TC';
        text(ctx, clock.shortLabel(l.day), 12, y + 8, { size: 22, color: '#7F8C99' });
        text(ctx, l.reason, 170, y + 6, { size: 24, maxWidth: w - 170 - 360 });
        text(ctx, `${l.amount > 0 ? '+' : ''}${fmt(l.amount)}${cur}`, w - 190, y + 6, { size: 26, bold: true, align: 'right', color: l.amount > 0 ? '#7CFFB2' : '#FF8A80' });
        text(ctx, `${fmt(l.balance)}${cur}`, w - 12, y + 6, { size: 24, align: 'right', color: '#9AA8B5' });
      }
      scroll.end(ctx);
    },
  };
  return screen;
}

