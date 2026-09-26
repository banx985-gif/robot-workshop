// Credits (Milestone 19): the names roll up the screen (core/ui/CreditsRoll.js), from data/credits.js plus this
// run's team and its rivals. Hold a finger down to speed it up; Skip (or the end of the roll) goes back.
import { THEME, font } from '../../../../core/Theme.js';
import { CreditsRoll } from '../../../../core/ui/CreditsRoll.js';
import { drawButton, hitRect } from '../../../../core/ui/Button.js';
import { CREDITS } from '../../data/credits.js';
import { ROLES } from '../../data/staff.js';
const C = THEME.color;

export function createCreditsScreen({ renderer, layout, assets, campaign, router }) {
  const W = renderer.width;
  let roll = null;
  let back = 'ceremony';
  let holding = false;

  const skipRect = () => {
    const s = layout.safeRect;
    return { x: s.x + s.w - 24 - 220, y: s.y + 24, w: 220, h: 110 };
  };
  const rollRect = () => {
    const s = layout.safeRect;
    return { x: s.x, y: s.y + 150, w: s.w, h: s.h - 150 };
  };

  function blocks() {
    const out = [];
    for (const b of CREDITS) {
      if (b.fromRun === 'staff') {
        const team = [...campaign.staff.staff].sort((a, z) => z.level - a.level);
        for (const s of team) out.push({ line: `${s.name} — ${ROLES[s.role]?.name ?? s.role}` });
        if (!team.length) out.push({ line: 'Just you!' });
      } else if (b.fromRun === 'rivals') {
        for (const r of campaign.rivals.visible((id) => campaign.rivalShown(id))) out.push({ line: r.name });
      } else out.push(b);
    }
    return out;
  }

  function leave() {
    router.go(back);
  }

  return {
    get roll() {
      return roll;
    },
    skipRect,
    enter(params = {}) {
      back = params.back ?? 'ceremony';
      campaign.clock.pause();
      roll = new CreditsRoll({ blocks: blocks() });
      holding = false;
    },
    update(dt) {
      roll?.update(dt, { fast: holding, viewHeight: rollRect().h });
      if (roll?.done) leave();
    },
    onDown: () => (holding = true),
    onUp: () => (holding = false),
    onTap(p) {
      holding = false;
      if (hitRect(p, skipRect())) leave();
    },
    render(ctx) {
      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, W, renderer.height);
      const g = ctx.createLinearGradient(0, 0, 0, renderer.height);
      g.addColorStop(0, 'rgba(255,245,226,0.9)');
      g.addColorStop(1, 'rgba(255,245,226,0.2)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, renderer.height);
      roll?.render(ctx, assets, rollRect());
      drawButton(ctx, skipRect(), 'Skip', { accent: C.progress, font: font(38, true) });
      const s = layout.safeRect;
      ctx.font = font(28);
      ctx.fillStyle = C.textMuted;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('Hold to speed up', s.x + 32, s.y + 79);
    },
  };
}
