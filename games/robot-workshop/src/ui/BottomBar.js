// The workshop's bottom bar (Milestone 17b): five big icon buttons that open the same menus as the stations.
//   Build (the robot) · Staff · Research · Compete · Money
//   createBottomBar({ layout, assets, campaign, open(kind) }) → { rect(), buttonRect(id), handleTap(p), contains(p), render(ctx) }
import { THEME, font } from '../../../../core/Theme.js';
import { drawButton, hitRect } from '../../../../core/ui/Button.js';
import { RESEARCH_ART } from '../../data/research.js';
import { COMPETITION_ART } from '../../data/competitions.js';

const C = THEME.color;
export const BOTTOM_BAR_H = 190;

export function createBottomBar({ layout, assets, campaign, open }) {
  const items = [
    { id: 'build', label: 'Build', icon: 'ui_icon_11', badge: () => (!campaign.activeProject && campaign.canStartProject().ok ? '!' : null) },
    { id: 'staff', label: 'Staff', icon: 'ui_icon_05_staff', badge: () => (campaign.recruitment.special && !campaign.hireBlock(campaign.recruitment.special.id) ? '!' : null) },
    { id: 'research', label: 'Research', icon: RESEARCH_ART.icon, badge: () => (campaign.research.queueOpen(0) && !campaign.research.queues[0].nodeId && campaign.research.nodes.some((n) => campaign.research.canStart(0, n.id).ok) ? '!' : null) },
    { id: 'compete', label: 'Compete', icon: COMPETITION_ART.icon, badge: () => ((campaign.openCompetitions.some((e) => campaign.competitions.records[e.id]?.lastPeriod !== campaign.monthIndex) && campaign.competitionRobots.length) || campaign.achievements.unseen ? '!' : null) }, // + new achievements (M18)
    { id: 'money', label: 'Money', icon: 'ui_icon_01_money', badge: () => {
      const k = campaign.contracts;
      const waiting = campaign.history.records.some((r) => !r.launchedProductId && !r.deliveredContractId) && campaign.products.freeSlots;
      return (k.offers.length && k.canAccept) || waiting ? '!' : null;
    } },
  ];

  function rect() {
    const sr = layout.safeRect;
    return { x: sr.x + 12, y: sr.y + sr.h - BOTTOM_BAR_H - 12, w: sr.w - 24, h: BOTTOM_BAR_H };
  }

  function buttonRect(id) {
    const r = rect();
    const i = items.findIndex((b) => b.id === id);
    if (i < 0) return null;
    const gap = 12;
    const w = (r.w - 24 - gap * (items.length - 1)) / items.length;
    return { x: r.x + 12 + i * (w + gap), y: r.y + 14, w, h: r.h - 28 };
  }

  return {
    rect,
    buttonRect,
    contains: (p) => hitRect(p, rect()),
    handleTap(p) {
      if (!hitRect(p, rect())) return false;
      const b = items.find((x) => hitRect(p, buttonRect(x.id)));
      if (b) open(b.id);
      return true;
    },
    render(ctx) {
      const r = rect();
      ctx.save();
      ctx.fillStyle = C.sheet;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(r.x, r.y, r.w, r.h, 36);
      else ctx.rect(r.x, r.y, r.w, r.h);
      ctx.fill();
      ctx.strokeStyle = C.outline;
      ctx.lineWidth = 4;
      ctx.stroke();
      for (const b of items) {
        const br = buttonRect(b.id);
        drawButton(ctx, br, '', { badge: b.badge() });
        assets.drawContained(ctx, b.icon, { x: br.x + (br.w - 84) / 2, y: br.y + 6, w: 84, h: 84 });
        ctx.font = font(THEME.size.button, true);
        ctx.fillStyle = C.textOnAction;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(b.label, br.x + br.w / 2, br.y + br.h - 36, br.w - 12);
      }
      ctx.restore();
    },
  };
}
