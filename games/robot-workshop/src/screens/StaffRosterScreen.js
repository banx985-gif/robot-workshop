// Staff roster: one card per worker with portrait, role, level, the 5 work stats,
// Energy/Morale, traits and what they're doing right now.
// Tap a card → back to the workshop with that worker selected.
import { ScrollList } from '../../../../core/ui/ScrollList.js';
import { drawStaffCard, staffCardButtonAt, STAFF_CARD_HEIGHT } from '../../../../core/ui/StaffCard.js';
import { drawButton, hitRect } from '../../../../core/ui/Button.js';
import { ROLES, TIERS } from '../../data/staff.js';
import { TRAITS } from '../../data/traits.js';
import { WORK_STATS } from '../../data/stats.js';
import { createTopBar } from '../ui/TopBar.js';

const STATUS_ICONS = {
  tired: 'status_staff_02_tired',
  stressed: 'status_staff_04_stressed',
  inspired: 'status_staff_03_inspired',
};

export function createStaffRosterScreen({ renderer, layout, assets, bus, debug, campaign, router, workshop, goProject, hud }) {
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
  let focusId = null;

  const list = new ScrollList({
    getRect: listRect,
    itemHeight: STAFF_CARD_HEIGHT,
    gap: 24,
    renderItem: (ctx, s, r) => drawStaffCard(ctx, r, viewFor(s), assets, { highlight: s.id === focusId }),
  });

  function listRect() {
    const sr = layout.safeRect;
    const top = topBar.rect();
    const y = top.y + top.h + 96;
    const bottomSpace = debug.enabled ? 140 : 24;
    return { x: sr.x + 24, y, w: sr.w - 48, h: sr.y + sr.h - bottomSpace - y };
  }

  function resetButtonRect() {
    const sr = layout.safeRect;
    return { x: sr.x + 24, y: sr.y + sr.h - 120, w: 460, h: 96 };
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
        { label: 'Energy', value: s.energy, max: 100, color: '#7CFFB2' },
        { label: 'Morale', value: s.morale, max: 100, color: '#FFB74D' },
      ],
      chips: s.traits.map((t) => ({ label: TRAITS[t]?.name ?? t, detail: TRAITS[t]?.description })),
      icons: Object.keys(STATUS_ICONS)
        .filter((k) => s.status[k])
        .map((k) => STATUS_ICONS[k]),
      footer: `Now: ${workshop.taskLabel(s.id) || (s.assigned ? 'On the project' : 'Resting')}`,
      buttons: debug.enabled ? [{ id: 'xp', label: '+60 XP (debug)' }] : [],
    };
  }

  const screen = {
    list,
    topBar,
    viewFor,
    enter(params = {}) {
      list.setItems(campaign.staff.staff);
      focusId = params.focusId ?? null;
      if (focusId) {
        const i = campaign.staff.staff.findIndex((s) => s.id === focusId);
        if (i >= 0) list.scrollToIndex(i);
      }
    },

    onTap(p) {
      if (topBar.handleTap(p)) return;
      if (debug.enabled && hitRect(p, resetButtonRect())) {
        campaign.newGame();
        campaign.save();
        list.setItems(campaign.staff.staff);
        return;
      }
      const hit = list.itemAt(p);
      if (!hit) return;
      if (staffCardButtonAt(hit.rect, viewFor(hit.item), p) === 'xp') {
        campaign.staff.addXp(hit.item, 60);
        return;
      }
      router.go('workshop', { selectId: hit.item.id });
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
      ctx.fillStyle = '#101418';
      ctx.fillRect(0, 0, W, H);
      topBar.render(ctx);

      const lr = listRect();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 48px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`Staff (${campaign.staff.staff.length})`, lr.x + 8, lr.y - 24);
      ctx.fillStyle = '#9AA8B5';
      ctx.font = '28px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('Tap a worker to find them in the workshop', lr.x + lr.w - 8, lr.y - 28);

      list.render(ctx);
      if (debug.enabled) drawButton(ctx, resetButtonRect(), 'New game (debug)', { accent: '#FF5A5A' });
    },
  };
  bus.on('campaign:ready', () => list.setItems(campaign.staff.staff));
  return screen;
}
