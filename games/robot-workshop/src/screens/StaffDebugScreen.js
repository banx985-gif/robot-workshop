// Staff debug (?debug=1 only, opened from the roster): all 50 §15 staff with where each one stands — on the
// team, on the hiring board, in the hiring pool now, or locked (and why). Spawn puts one straight onto the team
// (free, ignores the staff cap and every lock, legendary and secret included). "Spawn first 40" adds every
// Standard/Rare/Elite worker who isn't here yet, to test them all playing together.
import { THEME, font } from '../../../../core/Theme.js';
import { ScrollPanel } from '../../../../core/ui/ScrollPanel.js';
import { drawButton, hitRect } from '../../../../core/ui/Button.js';
import { STAFF, TIERS, RECRUITABLE_TIERS, NOT_IN_POOL } from '../../data/staff.js';
import { RECRUIT_ART } from '../../data/recruitment.js';
import { describeUnlock, missingParts } from '../systems/unlockRules.js';
import { panel, text, contained } from '../ui/widgets.js';
const COL = THEME.color;

const HEADER_H = 230;
const ROW_H = 118;
const GAP = 12;
const GREEN = COL.good;
const GOLD = COL.gold;
const RED = COL.bad;

export function createStaffDebugScreen({ renderer, layout, assets, campaign, router }) {
  const W = renderer.width;
  let message = null;
  const scroll = new ScrollPanel({ getRect: bodyRect, contentHeight: STAFF.length * (ROW_H + GAP) });

  const sr = () => layout.safeRect;
  const backRect = () => ({ x: sr().x + 24, y: sr().y + 24, w: 180, h: 86 });
  const spawnAllRect = () => ({ x: sr().x + sr().w - 24 - 330, y: sr().y + 24, w: 330, h: 86 });
  function bodyRect() {
    const s = sr();
    const y = s.y + HEADER_H;
    return { x: s.x + 24, y, w: s.w - 48, h: s.y + s.h - 24 - y };
  }
  const rowRect = (i) => ({ x: 0, y: i * (ROW_H + GAP), w: bodyRect().w - 12, h: ROW_H });
  const spawnRect = (i) => {
    const r = rowRect(i);
    return { x: r.x + r.w - 16 - 170, y: r.y + (ROW_H - 80) / 2, w: 170, h: 80 };
  };

  // Where this person stands right now: { text, color }.
  function standing(d) {
    if (campaign.staff.get(d.id)) return { text: 'On the team', color: GREEN };
    if (campaign.recruitment.cards.some((c) => c.staffId === d.id)) return { text: 'On the hiring board', color: GOLD };
    if (!RECRUITABLE_TIERS.includes(d.tier)) return { text: `Locked (never in normal pools): ${describeUnlock(d.unlock)}`, color: RED };
    if (NOT_IN_POOL.includes(d.unlock.type)) return { text: describeUnlock(d.unlock), color: COL.textMuted };
    if (campaign.recruitment.former.some((f) => f.staffId === d.id)) return { text: 'Left — may apply again', color: COL.textMuted };
    const missing = missingParts(d.unlock, (r) => campaign.unlockMet(r));
    const via = d.channels ? ` · via ${d.channels.map((c) => campaign.recruitment.channel(c)?.name ?? c).join(', ')}` : '';
    if (missing.length) return { text: `Needs ${missing.join(' + ')}${via}`, color: COL.action };
    return { text: `In the hiring pool${via}`, color: COL.progress };
  }

  function say(str, color = GREEN) {
    message = { text: str, color, until: performance.now() + 3000 };
  }

  function spawn(id) {
    const r = campaign.debugSpawnStaff(id);
    say(r.ok ? `${r.staff.name} joined (debug)` : r.reason, r.ok ? GREEN : RED);
    return r.ok;
  }

  const screen = {
    scroll,
    enter() {
      message = null;
    },
    onTap(p) {
      if (hitRect(p, backRect())) return router.go('roster');
      if (hitRect(p, spawnAllRect())) {
        const todo = STAFF.filter((d) => RECRUITABLE_TIERS.includes(d.tier) && !campaign.staff.get(d.id));
        let n = 0;
        for (const d of todo) if (campaign.debugSpawnStaff(d.id).ok) n++;
        say(n ? `${n} staff joined (debug)` : 'All 40 are already here');
        if (n) campaign.save().catch(() => {});
        return;
      }
      if (!scroll.contains(p)) return;
      const c = scroll.toContent(p);
      STAFF.forEach((d, i) => {
        if (hitRect(c, spawnRect(i)) && spawn(d.id)) campaign.save().catch(() => {});
      });
    },
    onDragStart: (p) => scroll.beginDrag(p),
    onDrag: (p) => scroll.drag(p),
    onDragEnd: (p) => scroll.endDrag(p),

    render(ctx) {
      ctx.fillStyle = COL.bg;
      ctx.fillRect(0, 0, W, renderer.height);
      const s = sr();
      drawButton(ctx, backRect(), '‹ Back', { font: font(32, true) });
      text(ctx, 'Staff (debug)', s.x + 228, s.y + 67, { size: 44, bold: true, baseline: 'middle' });
      drawButton(ctx, spawnAllRect(), 'Spawn first 40', { font: font(32, true), accent: COL.bad });
      const pool = STAFF.filter((d) => standing(d).text.startsWith('In the hiring pool')).length;
      text(ctx, `Team ${campaign.staff.staff.length} (cap ${campaign.employeeCap}, ignored here) · ${pool} named staff in the hiring pool now`, s.x + 24, s.y + 136, { size: 26, color: COL.textMuted, maxWidth: s.w - 48 });
      text(ctx, 'Legendary (09) and secret (10) staff never appear in hiring — only Spawn brings them.', s.x + 24, s.y + 176, { size: 24, color: COL.textMuted, maxWidth: s.w - 48 });

      scroll.begin(ctx);
      STAFF.forEach((d, i) => {
        const r = rowRect(i);
        const here = !!campaign.staff.get(d.id);
        const locked = !RECRUITABLE_TIERS.includes(d.tier);
        panel(ctx, r, { fill: here ? COL.panelGood : COL.panel, stroke: locked ? COL.gold : COL.line });
        contained(ctx, assets, d.art, { x: r.x + 10, y: r.y + 6, w: 90, h: ROW_H - 12 }, 'bottom');
        contained(ctx, assets, RECRUIT_ART.tierBadges[d.tier], { x: r.x + 108, y: r.y + 14, w: 44, h: 44 });
        text(ctx, `${d.id} · ${d.name}`, r.x + 160, r.y + 16, { size: 32, bold: true, maxWidth: r.w - 380 });
        text(ctx, `${TIERS[d.tier].name} · Lv ${d.startLevel}`, r.x + 160, r.y + 56, { size: 22, color: COL.textMuted, maxWidth: r.w - 380 });
        const st = standing(d);
        text(ctx, st.text, r.x + 160, r.y + 84, { size: 22, bold: true, color: st.color, maxWidth: r.w - 380 });
        drawButton(ctx, spawnRect(i), here ? 'Here' : 'Spawn', { disabled: here, font: font(30, true), accent: locked ? GOLD : COL.progress });
      });
      scroll.end(ctx);

      if (message && performance.now() < message.until) {
        const b = bodyRect();
        const r = { x: b.x + 40, y: b.y + b.h - 110, w: b.w - 80, h: 84 };
        panel(ctx, r, { fill: COL.panel, stroke: message.color, radius: 20 });
        text(ctx, message.text, r.x + r.w / 2, r.y + r.h / 2, { size: 30, bold: true, align: 'center', baseline: 'middle', color: message.color, maxWidth: r.w - 30 });
      }
    },
  };
  return screen;
}
