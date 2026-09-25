// Start a new robot project: purpose (Helper only for now), the six parts (starter parts, tap to inspect),
// budget focus, and the team. The calendar pauses while this screen is open (bible §4.2: decision menus pause).
import { ScrollPanel } from '../../../../core/ui/ScrollPanel.js';
import { drawButton } from '../../../../core/ui/Button.js';
import { PURPOSES } from '../../data/purposes.js';
import { COMPONENTS, SLOTS, STARTER_PARTS } from '../../data/components.js';
import { PHASES, BUDGET_FOCUS, BUDGET_ORDER } from '../../data/phases.js';
import { ROBOT_STATS } from '../../data/stats.js';
import { ROLES } from '../../data/staff.js';
import { PROJECT_RULES } from '../../data/balance.js';
import { panel, text, contained, hit, fmt, staffRow } from '../ui/widgets.js';

const HEADER_H = 130;
const FOOTER_H = 150;
const CONTENT_H = 2010;

export function createRobotBuilderScreen({ renderer, layout, assets, campaign, router, debugEnabled = false }) {
  const W = renderer.width;
  const H = renderer.height;
  const state = { purposeId: 'helper', components: { ...STARTER_PARTS }, focus: 'balanced', teamIds: [], inspect: null };
  let resumeOnExit = false;

  const scroll = new ScrollPanel({ getRect: bodyRect, contentHeight: CONTENT_H });

  function bodyRect() {
    const sr = layout.safeRect;
    return { x: sr.x + 24, y: sr.y + HEADER_H, w: sr.w - 48, h: sr.h - HEADER_H - FOOTER_H };
  }
  function backRect() {
    const sr = layout.safeRect;
    return { x: sr.x + 24, y: sr.y + 24, w: 180, h: 86 };
  }
  function debugRect() {
    const sr = layout.safeRect;
    return { x: sr.x + sr.w - 24 - 200, y: sr.y + 24, w: 200, h: 86 };
  }
  // Content rect of the "Parts list" button beside the Parts heading.
  const catalogueRect = () => ({ x: cw() - 230, y: PARTS_Y - 76, w: 230, h: 66 });
  function startRect() {
    const sr = layout.safeRect;
    return { x: sr.x + 24, y: sr.y + sr.h - FOOTER_H + 24, w: sr.w - 48, h: 110 };
  }

  // --- content layout (content coordinates, width = body width) -----------
  const cw = () => bodyRect().w;
  const PARTS_Y = 290;
  const TILE_H = 230;
  const INSPECT_Y = PARTS_Y + 2 * TILE_H + 16 + 20;
  const BUDGET_Y = INSPECT_Y + 190;
  const TEAM_Y = BUDGET_Y + 230;
  const ROW_H = 120;
  const SUMMARY_Y = TEAM_Y + 60 + 3 * (ROW_H + 14) + 20;

  function tileRect(i) {
    const w = (cw() - 32) / 3;
    return { x: (i % 3) * (w + 16), y: PARTS_Y + Math.floor(i / 3) * (TILE_H + 16), w, h: TILE_H };
  }
  function focusRect(i) {
    const w = (cw() - 32) / 3;
    return { x: i * (w + 16), y: BUDGET_Y + 56, w, h: 100 };
  }
  function rowRect(i) {
    return { x: 0, y: TEAM_Y + 60 + i * (ROW_H + 14), w: cw(), h: ROW_H };
  }

  function estimateDaysPerPhase() {
    if (!state.teamIds.length) return null;
    const fake = { slots: state.teamIds };
    const target = campaign.robots.tierFor(state.components).phaseTarget;
    let total = 0;
    for (const phase of PHASES) {
      let score = 0;
      for (const id of state.teamIds) score += campaign.projects.workerScore(fake, phase, campaign.staff.get(id));
      total += target / ((PROJECT_RULES.progressBase + score / PROJECT_RULES.progressDivisor) * PROJECT_RULES.progressScale);
    }
    return total / PHASES.length;
  }

  // §20.5 running cost for the chosen team and budget.
  function estimateDailyCost() {
    const fake = { slots: state.teamIds, data: { buildCost: campaign.robots.buildCost(state.components), budgetFocus: state.focus } };
    return campaign.operatingCostPerDay(fake);
  }

  function start() {
    if (!state.teamIds.length || campaign.activeProject) return;
    const job = campaign.startRobotProject({
      purposeId: state.purposeId,
      components: state.components,
      budgetFocus: state.focus,
      teamIds: state.teamIds,
    });
    resumeOnExit = true; // starting work: let time run again
    router.go('project', { jobId: job.id });
  }

  const screen = {
    state,
    scroll,
    tileRect,
    focusRect,
    rowRect,
    startRect,
    catalogueRect,
    debugRect,
    estimateDaysPerPhase,

    enter() {
      resumeOnExit = !campaign.clock.paused;
      campaign.clock.pause();
      state.components = { ...STARTER_PARTS };
      state.focus = 'balanced';
      state.teamIds = campaign.staff.staff.map((s) => s.id); // everyone on by default; tap to take off
      state.inspect = null;
      scroll.scrollY = 0;
    },

    exit() {
      if (resumeOnExit) campaign.clock.resume();
    },

    onTap(p) {
      if (hit(p, backRect())) {
        router.go('workshop');
        return;
      }
      if (hit(p, startRect())) {
        start();
        return;
      }
      if (debugEnabled && hit(p, debugRect())) {
        router.go('debugbuilder');
        return;
      }
      if (!scroll.contains(p)) return;
      const c = scroll.toContent(p);
      if (hit(c, catalogueRect())) {
        router.go('components', { back: 'builder' });
        return;
      }
      for (let i = 0; i < SLOTS.length; i++) {
        if (hit(c, tileRect(i))) {
          state.inspect = state.inspect === i ? null : i;
          return;
        }
      }
      for (const [i, id] of BUDGET_ORDER.entries()) {
        if (hit(c, focusRect(i))) {
          state.focus = id;
          return;
        }
      }
      campaign.staff.staff.forEach((s, i) => {
        if (!hit(c, rowRect(i))) return;
        if (state.teamIds.includes(s.id)) state.teamIds = state.teamIds.filter((x) => x !== s.id);
        else if (state.teamIds.length < PROJECT_RULES.teamSlots) state.teamIds.push(s.id);
      });
    },

    onDragStart: (p) => scroll.beginDrag(p),
    onDrag: (p) => scroll.drag(p),
    onDragEnd: (p) => scroll.endDrag(p),

    render(ctx) {
      ctx.fillStyle = '#101418';
      ctx.fillRect(0, 0, W, H);
      const sr = layout.safeRect;

      // Header
      drawButton(ctx, backRect(), '‹ Back', { font: 'bold 32px system-ui, sans-serif' });
      contained(ctx, assets, 'ui_icon_11', { x: sr.x + 230, y: sr.y + 28, w: 76, h: 76 });
      text(ctx, 'New Robot Project', sr.x + 322, sr.y + 66, { size: 48, bold: true, baseline: 'middle', maxWidth: debugEnabled ? sr.w - 322 - 240 : sr.w - 340 });
      if (debugEnabled) drawButton(ctx, debugRect(), 'Debug builder', { accent: '#FFB74D', font: 'bold 28px system-ui, sans-serif' });

      scroll.begin(ctx);
      const w = cw();
      const purpose = PURPOSES[state.purposeId];

      // Purpose
      panel(ctx, { x: 0, y: 0, w, h: 250 });
      contained(ctx, assets, purpose.art, { x: 20, y: 16, w: 200, h: 218 });
      text(ctx, 'Purpose', 250, 24, { size: 26, color: '#9AA8B5' });
      text(ctx, purpose.name, 250, 56, { size: 44, bold: true });
      text(ctx, 'The other 9 purposes open through research later', 250, 114, { size: 24, color: '#9AA8B5', maxWidth: w - 270 });
      const weights = Object.entries(purpose.weights)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => `${k} ${v}`)
        .join(' · ');
      text(ctx, 'What matters most:', 250, 158, { size: 24, color: '#9AA8B5' });
      text(ctx, weights, 250, 192, { size: 26, bold: true, maxWidth: w - 270 });

      // Parts
      text(ctx, 'Parts (Start parts — tap one to see it)', 4, PARTS_Y - 58, { size: 30, bold: true, maxWidth: w - 250 });
      drawButton(ctx, catalogueRect(), 'Parts list', { font: 'bold 28px system-ui, sans-serif' });
      SLOTS.forEach((slot, i) => {
        const part = COMPONENTS[state.components[slot.id]];
        const r = tileRect(i);
        const on = state.inspect === i;
        panel(ctx, r, { stroke: on ? '#FFD166' : '#35414F', lineWidth: on ? 5 : 3 });
        contained(ctx, assets, part.art, { x: r.x + (r.w - 120) / 2, y: r.y + 14, w: 120, h: 120 });
        text(ctx, slot.name, r.x + r.w / 2, r.y + 146, { size: 22, color: '#9AA8B5', align: 'center', maxWidth: r.w - 16 });
        text(ctx, part.name, r.x + r.w / 2, r.y + 178, { size: 28, bold: true, align: 'center', maxWidth: r.w - 16 });
      });

      // Inspect box
      const ib = { x: 0, y: INSPECT_Y, w, h: 170 };
      panel(ctx, ib, { fill: 'rgba(40,48,60,0.96)' });
      if (state.inspect == null) {
        text(ctx, 'Tap a part above to see what it does.', 24, INSPECT_Y + 64, { size: 30, color: '#9AA8B5' });
      } else {
        const part = COMPONENTS[state.components[SLOTS[state.inspect].id]];
        text(ctx, `${part.id} · ${part.name}`, 24, INSPECT_Y + 20, { size: 36, bold: true, maxWidth: w - 48 });
        text(ctx, `Cost ${fmt(part.cost)} · Complexity ${part.cx}`, 24, INSPECT_Y + 70, { size: 28, color: '#9AA8B5' });
        const stats = Object.entries(part.stats).map(([k, v]) => `${k} ${v > 0 ? '+' : ''}${v}`).join('   ');
        text(ctx, stats, 24, INSPECT_Y + 112, { size: 32, bold: true, color: '#7CFFB2', maxWidth: w - 48 });
      }

      // Budget focus
      text(ctx, 'Budget focus', 4, BUDGET_Y, { size: 30, bold: true });
      BUDGET_ORDER.forEach((id, i) => drawButton(ctx, focusRect(i), BUDGET_FOCUS[id].name, { active: state.focus === id, font: 'bold 32px system-ui, sans-serif' }));
      const f = BUDGET_FOCUS[state.focus];
      const effects =
        state.focus === 'balanced'
          ? 'Normal cost, quality and fault chance.'
          : `${pct(f.costPct)} daily cost · ${pct(f.qualityGainPct)} quality gain · ${pct(f.faultChancePct)} fault chance${f.energyDrainPct ? ` · ${pct(f.energyDrainPct)} Energy drain` : ''}`;
      text(ctx, effects, 4, BUDGET_Y + 172, { size: 26, color: '#9AA8B5', maxWidth: w });

      // Team
      text(ctx, `Team (${state.teamIds.length}/${PROJECT_RULES.teamSlots}) — tap to add or remove`, 4, TEAM_Y, { size: 30, bold: true, maxWidth: w });
      campaign.staff.staff.forEach((s, i) => {
        const on = state.teamIds.includes(s.id);
        staffRow(ctx, assets, rowRect(i), s, { roleName: ROLES[s.role].name, on, tag: on ? 'On team ✓' : 'Tap to add' });
      });

      // Summary
      const tier = campaign.robots.tierFor(state.components);
      const base = campaign.robots.baseStats(state.components);
      const est = estimateDaysPerPhase();
      panel(ctx, { x: 0, y: SUMMARY_Y, w, h: 300 }, { fill: 'rgba(40,48,60,0.96)' });
      text(ctx, `${tier.name} tier · complexity ${campaign.robots.totalComplexity(state.components)} · ${fmt(tier.phaseTarget)} work per phase`, 24, SUMMARY_Y + 22, { size: 28, bold: true, maxWidth: w - 48 });
      const build = campaign.robots.buildCost(state.components);
      const daily = estimateDailyCost();
      const days = est ? Math.round(est * PHASES.length) : 0;
      text(ctx, `Build cost ${fmt(build)} now · about ${fmt(daily)} a day to run (≈${fmt(daily * days)} total) · you have ${fmt(campaign.economy.balance('credits'))}`, 24, SUMMARY_Y + 70, {
        size: 24,
        color: campaign.economy.balance('credits') < build ? '#FF8A80' : '#9AA8B5',
        maxWidth: w - 48,
      });
      text(ctx, 'Starting stats from parts:', 24, SUMMARY_Y + 118, { size: 26, color: '#9AA8B5' });
      text(ctx, ROBOT_STATS.map((s) => `${s.key} ${base[s.key]}`).join('  '), 24, SUMMARY_Y + 152, { size: 28, bold: true, maxWidth: w - 48 });
      text(ctx, est ? `About ${Math.round(est)} game days per phase with this team (5 phases)` : 'Add at least one worker to start', 24, SUMMARY_Y + 212, {
        size: 28,
        color: est ? '#FFD166' : '#FF8A80',
        maxWidth: w - 48,
      });
      scroll.end(ctx);

      // Footer
      const can = state.teamIds.length > 0 && !campaign.activeProject;
      drawButton(ctx, startRect(), 'Start project', { active: can, disabled: !can, accent: '#7CFFB2', font: 'bold 44px system-ui, sans-serif' });
    },
  };
  return screen;
}

function pct(v) {
  return `${v > 0 ? '+' : ''}${v}%`;
}
