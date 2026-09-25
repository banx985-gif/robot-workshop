// Staff roster: one card per worker with portrait, role, level, the 5 work stats,
// Energy/Morale, traits and what they're doing right now.
// Tap a card → that worker's detail screen (traits and career record, Milestone 11). Card buttons: Train (opens
// Training with them picked) and Fire (tap twice). The header opens Hiring (a "!" when a special candidate is
// waiting) and Training. Debug builds add "Staff (debug)": spawn any of the 50 (src/screens/StaffDebugScreen.js).
import { THEME, font } from '../../../../core/Theme.js';
import { ScrollList } from '../../../../core/ui/ScrollList.js';
import { drawStaffCard, staffCardButtonAt, STAFF_CARD_HEIGHT } from '../../../../core/ui/StaffCard.js';
import { drawButton, hitRect } from '../../../../core/ui/Button.js';
import { ROLES, TIERS } from '../../data/staff.js';
import { TRAITS } from '../../data/traits.js';
import { WORK_STATS } from '../../data/stats.js';
import { createTopBar } from '../ui/TopBar.js';
const COL = THEME.color;

const STATUS_ICONS = {
  tired: 'status_staff_02_tired',
  stressed: 'status_staff_04_stressed',
  inspired: 'status_staff_03_inspired',
};

export function createStaffRosterScreen({ renderer, layout, assets, bus, debug, campaign, router, workshop, goProject, hud }) {
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
  let focusId = null;
  let confirmFire = null; // worker id waiting for the second tap
  let message = null;

  const list = new ScrollList({
    getRect: listRect,
    itemHeight: STAFF_CARD_HEIGHT,
    gap: 24,
    renderItem: (ctx, s, r) => drawStaffCard(ctx, r, viewFor(s), assets, { highlight: s.id === focusId }),
  });

  function listRect() {
    const sr = layout.safeRect;
    const top = topBar.rect();
    const y = top.y + top.h + 140;
    const bottomSpace = debug.enabled ? 150 : 24;
    return { x: sr.x + 24, y, w: sr.w - 48, h: sr.y + sr.h - bottomSpace - y };
  }

  // Header buttons, right of the "Staff n / cap" title.
  function headerButton(k) {
    const lr = listRect();
    const w = 230;
    return { x: lr.x + lr.w - (2 - k) * w - (1 - k) * 16, y: lr.y - 126, w, h: 110 };
  }

  function resetButtonRect() {
    const sr = layout.safeRect;
    return { x: sr.x + 24, y: sr.y + sr.h - 134, w: 460, h: 110 };
  }

  function staffDebugRect() {
    const sr = layout.safeRect;
    return { x: sr.x + sr.w - 24 - 460, y: sr.y + sr.h - 134, w: 460, h: 110 };
  }

  function viewFor(s) {
    const need = campaign.staff.xpNeeded(s.level);
    return {
      title: s.name,
      subtitle: `${ROLES[s.role].name} · Lv ${s.level} · ${TIERS[s.tier].name}`,
      portraitKey: s.art,
      badgeKey: ROLES[s.role].badge,
      xp: { value: s.xp, max: need },
      stats: WORK_STATS.map((st) => ({ label: st.short, value: s.stats[st.key] })),
      bars: [
        { label: 'Energy', value: s.energy, max: 100, color: COL.good },
        { label: 'Morale', value: s.morale, max: 100, color: COL.action },
      ],
      chips: s.traits.map((t) => ({ label: (TRAITS[t]?.signature ? '★ ' : '') + (TRAITS[t]?.name ?? t), detail: TRAITS[t]?.description })),
      icons: Object.keys(STATUS_ICONS)
        .filter((k) => s.status[k])
        .map((k) => STATUS_ICONS[k]),
      footer: nowText(s),
      buttons: [
        { id: 'train', label: campaign.training.trainingOf(s.id) ? 'Training…' : 'Train' },
        { id: 'fire', label: confirmFire === s.id ? 'Confirm fire' : 'Fire' },
        ...(debug.enabled ? [{ id: 'xp', label: '+60 XP (debug)' }] : []),
      ],
    };
  }

  function nowText(s) {
    const t = campaign.training.trainingOf(s.id);
    if (t) return `Training: ${campaign.training.course(t.courseId).name} · day ${t.daysDone}/${t.days}`;
    if (campaign.research.busyIds.includes(s.id)) return 'Now: researching at the Research Desk';
    return `Now: ${workshop.taskLabel(s.id) || (s.assigned ? 'On the project' : 'Resting')}`;
  }

  function say(str, color = COL.gold) {
    message = { text: str, color, until: performance.now() + 3000 };
  }

  const screen = {
    list,
    headerButton,
    topBar,
    viewFor,
    enter(params = {}) {
      list.setItems(campaign.staff.staff);
      confirmFire = null;
      message = null;
      focusId = params.focusId ?? null;
      if (focusId) {
        const i = campaign.staff.staff.findIndex((s) => s.id === focusId);
        if (i >= 0) list.scrollToIndex(i);
      }
    },

    onTap(p) {
      if (topBar.handleTap(p)) return;
      if (debug.enabled && hitRect(p, staffDebugRect())) return router.go('staffdebug');
      if (debug.enabled && hitRect(p, resetButtonRect())) {
        campaign.newGame();
        campaign.save();
        list.setItems(campaign.staff.staff);
        return;
      }
      if (hitRect(p, headerButton(0))) return router.go('recruit', { focusSpecial: true });
      if (hitRect(p, headerButton(1))) return router.go('training');
      const hit = list.itemAt(p);
      if (!hit) return;
      const b = staffCardButtonAt(hit.rect, viewFor(hit.item), p);
      if (b !== 'fire') confirmFire = null;
      if (b === 'xp') {
        campaign.staff.addXp(hit.item, 60);
        return;
      }
      if (b === 'train') {
        router.go('training', { staffId: hit.item.id });
        return;
      }
      if (b === 'fire') {
        const block = campaign.fireBlock(hit.item.id);
        if (block) return say(block, COL.bad);
        if (confirmFire !== hit.item.id) {
          confirmFire = hit.item.id;
          return say(`Tap Confirm fire to let ${hit.item.name} go (no refund; they may apply again later)`);
        }
        const r = campaign.fire(hit.item.id);
        confirmFire = null;
        if (r.ok) {
          say(`${r.staff.name} has left the workshop`);
          campaign.save().catch(() => {});
        }
        return;
      }
      router.go('staffDetail', { staffId: hit.item.id });
    },

    onDragStart(p) {
      list.beginDrag(p);
    },
    onDrag(p) {
      list.drag(p);
    },
    onDragEnd(p) {
      list.endDrag(p);
    },

    render(ctx) {
      ctx.fillStyle = COL.bg;
      ctx.fillRect(0, 0, W, renderer.height);
      topBar.render(ctx);

      const lr = listRect();
      ctx.fillStyle = COL.text;
      ctx.font = font(48, true);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      // §39.1: the cap grows with Company Rank (hiring arrives in Milestone 10).
      ctx.fillText(`Staff ${campaign.staff.staff.length} / ${campaign.employeeCap}`, lr.x + 8, lr.y - 24);
      const waiting = campaign.recruitment.special && !campaign.hireBlock(campaign.recruitment.special.id);
      drawButton(ctx, headerButton(0), 'Hire', { accent: COL.good, badge: waiting ? '!' : null, font: font(34, true) });
      drawButton(ctx, headerButton(1), 'Training', { font: font(34, true), badge: campaign.training.active.length || null });

      list.render(ctx);
      if (message && performance.now() < message.until) {
        const r = { x: lr.x + 30, y: lr.y + lr.h - 110, w: lr.w - 60, h: 84 };
        ctx.fillStyle = COL.panel;
        ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.strokeStyle = message.color;
        ctx.lineWidth = 3;
        ctx.strokeRect(r.x, r.y, r.w, r.h);
        ctx.fillStyle = message.color;
        ctx.font = font(28, true);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(message.text, r.x + r.w / 2, r.y + r.h / 2, r.w - 30);
      }
      if (debug.enabled) {
        drawButton(ctx, resetButtonRect(), 'New game (debug)', { accent: COL.bad });
        drawButton(ctx, staffDebugRect(), 'Staff (debug)', { accent: COL.bad });
      }
    },
  };
  for (const e of ['campaign:ready', 'staff:hired', 'staff:fired']) bus.on(e, () => list.setItems(campaign.staff.staff));
  return screen;
}
