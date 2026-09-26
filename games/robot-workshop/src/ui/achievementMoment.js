// "Achievement unlocked!" (Milestone 18): a small moment, not a big pause. One card at a time, taken from the
// Milestone 15 pop-up queue like every other pop-up; it sits just above the bottom bar for a few seconds with the
// reward badge, the rank-up burst and a few reputation stars, then goes. Tap it to open Records. The game keeps
// running; toasts and the next pop-up wait until it has gone.
//   createAchievementMoment({ assets, layout, bottomBar, vfx, onOpen }) → { show(entry), update(dt), render(ctx),
//     active, rect(), handleInput(hook, p) }
import { THEME, font } from '../../../../core/Theme.js';
import { ACHIEVEMENT_ART } from '../../data/achievements.js';
import { panel, text } from './widgets.js';
const C = THEME.color;
const H = 236;
const LIFE = 3.6;

export function createAchievementMoment({ assets, layout, bottomBar, vfx, onOpen }) {
  let cur = null; // { entry, age }

  function rect() {
    const sr = layout.safeRect;
    const b = bottomBar.rect();
    return { x: sr.x + 32, y: b.y - H - 24, w: sr.w - 64, h: H };
  }

  return {
    get active() {
      return !!cur;
    },
    get current() {
      return cur?.entry ?? null;
    },
    rect,
    show(entry) {
      cur = { entry, age: 0 };
      const r = rect();
      if (!vfx.reducedFlashes) vfx.confetti('screen', r.x + 130, r.y + 40, { count: 18, speed: 380 });
    },
    update(dt) {
      if (!cur) return;
      cur.age += dt;
      if (cur.age >= LIFE) cur = null;
    },
    dismiss() {
      cur = null;
    },
    // Only a tap on the card itself is taken (it opens Records); everything else reaches the workshop.
    handleInput(hook, p) {
      if (!cur) return false;
      const r = rect();
      const inside = p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
      if (!inside) return false;
      if (hook === 'onTap') {
        cur = null;
        onOpen();
      }
      return true;
    },
    render(ctx) {
      if (!cur) return;
      const t = cur.age;
      const r0 = rect();
      const inK = Math.min(1, t / 0.3);
      const outK = Math.min(1, Math.max(0, (LIFE - t) / 0.45));
      const slide = (1 - inK) * (1 - inK) * 80;
      const r = { ...r0, y: r0.y + slide };
      ctx.save();
      ctx.globalAlpha = Math.min(inK, outK);
      panel(ctx, r, { fill: C.panelGold, stroke: C.gold, lineWidth: 6, radius: 32 });
      // The badge with the burst turning slowly behind it and the stars popping on top.
      const bx = r.x + 118;
      const by = r.y + r.h / 2;
      const soft = vfx.reducedFlashes;
      ctx.save();
      ctx.translate(bx, by);
      if (!soft) ctx.rotate(t * 0.6);
      ctx.globalAlpha *= soft ? 0.45 : 0.85;
      assets.drawContained(ctx, ACHIEVEMENT_ART.burst, { x: -110, y: -110, w: 220, h: 220 });
      ctx.restore();
      const pop = soft ? 1 : 1 + 0.25 * Math.max(0, 1 - t / 0.35);
      const bs = 150 * pop;
      assets.drawContained(ctx, ACHIEVEMENT_ART.badge, { x: bx - bs / 2, y: by - bs / 2, w: bs, h: bs });
      if (t < 1.4) {
        ctx.save();
        ctx.globalAlpha *= Math.max(0, 1 - t / 1.4);
        assets.drawContained(ctx, ACHIEVEMENT_ART.stars, { x: bx - 90, y: by - 120 - t * 30, w: 180, h: 120 });
        ctx.restore();
      }
      const tx = r.x + 236;
      const tw = r.x + r.w - 28 - tx;
      const e = cur.entry;
      text(ctx, e.title, tx, r.y + 24, { size: THEME.size.body, bold: true, color: C.gold, maxWidth: tw });
      text(ctx, e.data?.name ?? '', tx, r.y + 70, { size: THEME.size.heading, bold: true, maxWidth: tw });
      text(ctx, e.body, tx, r.y + 132, { size: THEME.size.body, color: C.good, bold: true, maxWidth: tw });
      text(ctx, 'Tap to see Records', tx, r.y + 182, { size: THEME.size.small, color: C.textMuted, maxWidth: tw });
      ctx.restore();
    },
  };
}
