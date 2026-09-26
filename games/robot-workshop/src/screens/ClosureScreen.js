// Workshop Closure ending (bible §20.6): three month-ends in a row below the emergency limit.
import { THEME, font } from '../../../../core/Theme.js';
import { drawButton } from '../../../../core/ui/Button.js';
import { DEBT_RULES } from '../../data/economy.js';
import { text, contained, fmt, hit } from '../ui/widgets.js';
const COL = THEME.color;

export function createClosureScreen({ renderer, layout, assets, campaign, router }) {
  const W = renderer.width;

  function newGameRect() {
    const sr = layout.safeRect;
    return { x: sr.x + 60, y: sr.y + sr.h - 220, w: sr.w - 120, h: 120 };
  }

  return {
    newGameRect,
    enter() {
      campaign.clock.pause();
    },
    // A new game goes through Company Setup like any other (Milestone 21); back goes to the main menu.
    onTap(p) {
      if (!hit(p, newGameRect())) return;
      router.go('company');
    },
    onBack() {
      router.go('menu');
      return true;
    },
    render(ctx) {
      ctx.fillStyle = COL.bg;
      ctx.fillRect(0, 0, W, renderer.height);
      const sr = layout.safeRect;
      const cx = W / 2;
      contained(ctx, assets, 'ui_icon_29', { x: cx - 90, y: sr.y + 160, w: 180, h: 180 });
      text(ctx, 'Workshop Closed', cx, sr.y + 400, { size: 84, bold: true, align: 'center', color: COL.bad });
      text(ctx, `Three month-ends in a row below ${fmt(DEBT_RULES.limit)} credits.`, cx, sr.y + 520, { size: 34, align: 'center', maxWidth: sr.w - 80 });
      text(ctx, 'The bank has shut the doors.', cx, sr.y + 572, { size: 34, align: 'center', color: COL.textMuted });
      const lines = [
        `Closed on ${campaign.clock.label()}`,
        `Final balance ${fmt(campaign.economy.balance('credits'))} credits`,
        `Robots built ${campaign.history.records.length} · launched ${campaign.products.products.length}`,
        `Reputation ${campaign.reputation.value} · Rank ${campaign.reputation.rank.id}`,
      ];
      lines.forEach((l, i) => text(ctx, l, cx, sr.y + 720 + i * 60, { size: 34, align: 'center', color: COL.text, maxWidth: sr.w - 80 }));
      drawButton(ctx, newGameRect(), 'Start a new game', { active: true, accent: COL.good, font: font(44, true) });
    },
  };
}
