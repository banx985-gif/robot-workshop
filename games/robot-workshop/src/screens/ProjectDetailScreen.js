// The running robot project: phase, progress, team, faults and a live look at the robot's stats.
// The calendar keeps running here. Budget focus changes apply from the next phase.
import { THEME, font } from '../../../../core/Theme.js';
import { ScrollPanel } from '../../../../core/ui/ScrollPanel.js';
import { drawButton } from '../../../../core/ui/Button.js';
import { PURPOSES } from '../../data/purposes.js';
import { PHASES, PROJECT_TIERS, BUDGET_FOCUS, BUDGET_ORDER } from '../../data/phases.js';
import { ROBOT_STATS } from '../../data/stats.js';
import { ROLES } from '../../data/staff.js';
import { PROJECT_RULES } from '../../data/balance.js';
import { createTopBar } from '../ui/TopBar.js';
import { panel, text, bar, contained, statBars, hit, fmt, staffRow } from '../ui/widgets.js';
const COL = THEME.color;

const CONTENT_H = 2290;
const Y = { head: 0, steps: 220, phase: 370, budget: 640, team: 870, faults: 1350, stats: 1540, log: 2010 };
const ROW_H = 120;
const SHORT = { concept: 'Concept', engineering: 'Engineer', software: 'Software', assembly: 'Assembly', testing: 'Testing' };

export function createProjectDetailScreen({ renderer, layout, assets, campaign, router, hud }) {
  const W = renderer.width;
  const topBar = createTopBar({
    layout,
    campaign,
    hud,
    nav: [
      { id: 'workshop', label: 'Workshop', onTap: () => router.go('workshop') },
      { id: 'roster', label: 'Roster', onTap: () => router.go('roster') },
    ],
  });
  const scroll = new ScrollPanel({ getRect: bodyRect, contentHeight: CONTENT_H });

  function bodyRect() {
    const sr = layout.safeRect;
    const t = topBar.rect();
    const y = t.y + t.h + 16;
    return { x: sr.x + 24, y, w: sr.w - 48, h: sr.y + sr.h - 24 - y };
  }
  const cw = () => bodyRect().w;
  const focusRect = (i) => {
    const w = (cw() - 32) / 3;
    return { x: i * (w + 16), y: Y.budget + 56, w, h: 110 };
  };
  const rowRect = (i) => ({ x: 0, y: Y.team + 60 + i * (ROW_H + 14), w: cw(), h: ROW_H });

  const job = () => campaign.activeProject;

  const screen = {
    scroll,
    phaseRect: () => ({ x: 0, y: Y.phase, w: cw(), h: 250 }), // content rect of the current-phase panel
    focusRect,
    rowRect,
    topBar,

    enter() {
      if (!job()) router.go('builder');
    },

    onTap(p) {
      if (topBar.handleTap(p)) return;
      const j = job();
      if (!j || !scroll.contains(p)) return;
      const c = scroll.toContent(p);
      for (const [i, id] of BUDGET_ORDER.entries()) {
        if (hit(c, focusRect(i))) {
          campaign.robots.setFocus(j, id);
          return;
        }
      }
      campaign.staff.staff.forEach((s, i) => {
        if (hit(c, rowRect(i))) campaign.assignments.toggle(j, s.id);
      });
    },

    onDragStart: (p) => scroll.beginDrag(p),
    onDrag: (p) => scroll.drag(p),
    onDragEnd: (p) => scroll.endDrag(p),

    render(ctx) {
      ctx.fillStyle = COL.bg;
      ctx.fillRect(0, 0, W, renderer.height);
      topBar.render(ctx);
      const j = job();
      if (!j) return;
      const d = j.data;
      const w = cw();
      const purpose = PURPOSES[d.purpose];
      const tier = PROJECT_TIERS.find((t) => t.id === d.tier);

      scroll.begin(ctx);

      // Header
      panel(ctx, { x: 0, y: Y.head, w, h: 200 });
      contained(ctx, assets, purpose.art, { x: 16, y: 10, w: 170, h: 180 });
      text(ctx, j.name, 210, 26, { size: 48, bold: true, maxWidth: w - 230 });
      text(ctx, `${purpose.name} · ${tier.name} tier`, 210, 88, { size: 28, color: COL.textMuted, maxWidth: w - 230 });
      text(ctx, `Worked ${j.day} days · running cost ${fmt(campaign.operatingCostPerDay(j))} credits a day`, 210, 134, { size: 26, color: COL.textMuted, maxWidth: w - 230 });

      // Phase steps
      const stepW = w / PHASES.length;
      PHASES.forEach((ph, i) => {
        const cx = stepW * i + stepW / 2;
        const done = i < j.phaseIndex;
        const now = i === j.phaseIndex;
        if (i > 0) {
          ctx.fillStyle = i <= j.phaseIndex ? COL.good : COL.line;
          ctx.fillRect(cx - stepW, Y.steps + 36, stepW, 8);
        }
        ctx.beginPath();
        ctx.arc(cx, Y.steps + 40, 32, 0, Math.PI * 2);
        ctx.fillStyle = done ? COL.good : now ? COL.gold : COL.line;
        ctx.fill();
        text(ctx, done ? '✓' : String(i + 1), cx, Y.steps + 41, { size: 32, bold: true, color: done || now ? COL.bg : COL.textMuted, align: 'center', baseline: 'middle' });
        text(ctx, SHORT[ph.id], cx, Y.steps + 84, { size: 24, bold: now, color: now ? COL.text : COL.textMuted, align: 'center' });
      });

      // Current phase
      const phase = PHASES[j.phaseIndex];
      const perDay = campaign.projects.progressPerDay(j);
      const left = perDay > 0 ? Math.ceil((j.phaseTarget - j.phaseProgress) / perDay) : null;
      panel(ctx, { x: 0, y: Y.phase, w, h: 250 });
      text(ctx, `Phase ${j.phaseIndex + 1}/5 · ${phase.name}`, 24, Y.phase + 20, { size: 40, bold: true, maxWidth: w - 48 });
      bar(ctx, 24, Y.phase + 80, w - 48, 44, j.phaseProgress / j.phaseTarget, COL.good);
      text(ctx, `${fmt(Math.min(j.phaseProgress, j.phaseTarget))} / ${fmt(j.phaseTarget)}`, w / 2, Y.phase + 102, { size: 28, bold: true, align: 'center', baseline: 'middle', color: COL.text });
      if (perDay > 0) {
        text(ctx, `+${perDay.toFixed(1)} work per day · about ${left} days left`, 24, Y.phase + 144, { size: 28, color: COL.text, maxWidth: w - 48 });
      } else {
        text(ctx, 'Nobody is assigned — work has stopped', 24, Y.phase + 144, { size: 30, bold: true, color: COL.bad });
      }
      const roll = d.breakthroughs.find((b) => b.phase === phase.id);
      const rollText = roll
        ? roll.hit
          ? 'Breakthrough at 60%! (effects arrive in a later milestone)'
          : `60% check: no breakthrough this phase (${Math.round(roll.chance * 100)}% chance)`
        : 'Breakthrough check happens at 60%';
      text(ctx, rollText, 24, Y.phase + 192, { size: 26, color: roll?.hit ? COL.gold : COL.textMuted, maxWidth: w - 48 });

      // Budget focus
      text(ctx, 'Budget focus', 4, Y.budget, { size: 30, bold: true });
      BUDGET_ORDER.forEach((id, i) => {
        const label = BUDGET_FOCUS[id].name + (d.pendingFocus === id ? ' (next)' : '');
        drawButton(ctx, focusRect(i), label, { active: d.budgetFocus === id, accent: d.pendingFocus === id ? COL.gold : COL.progress, font: font(30, true) });
      });
      const note = d.pendingFocus
        ? `Switches to ${BUDGET_FOCUS[d.pendingFocus].name} when the next phase starts`
        : 'Budget focus can only change between phases — a new choice waits for the next phase';
      text(ctx, note, 4, Y.budget + 170, { size: 24, color: d.pendingFocus ? COL.gold : COL.textMuted, maxWidth: w });

      // Team
      const teamCount = j.slots.filter(Boolean).length;
      text(ctx, `Team (${teamCount}/${PROJECT_RULES.teamSlots}) — tap to add or remove`, 4, Y.team, { size: 30, bold: true, maxWidth: w });
      campaign.staff.staff.forEach((s, i) => {
        const on = j.slots.includes(s.id);
        staffRow(ctx, assets, rowRect(i), s, { roleName: ROLES[s.role].name, on, tag: on ? 'Working' : 'Resting' });
      });

      // Faults
      panel(ctx, { x: 0, y: Y.faults, w, h: 170 });
      text(ctx, `Open faults: ${d.faults.length}`, 24, Y.faults + 20, { size: 40, bold: true, color: d.faults.length ? COL.bad : COL.good });
      text(ctx, `Found ${d.faultsFound} · fixed ${d.faultsFixed} · each open fault: −3 REL, −1.5 Quality`, 24, Y.faults + 76, { size: 26, color: COL.textMuted, maxWidth: w - 48 });
      text(ctx, 'Testing & Tuning tries to fix open faults at the end', 24, Y.faults + 116, { size: 26, color: COL.textMuted, maxWidth: w - 48 });

      // Live stats
      const stats = campaign.robots.currentStats(j);
      panel(ctx, { x: 0, y: Y.stats, w, h: 450 });
      text(ctx, 'Robot so far (parts + team work − faults)', 24, Y.stats + 20, { size: 30, bold: true, maxWidth: w - 48 });
      statBars(ctx, 24, Y.stats + 74, w - 48, stats, ROBOT_STATS);

      // Breakthrough rolls
      text(ctx, 'Breakthrough checks (logged only for now)', 4, Y.log, { size: 30, bold: true });
      if (!d.breakthroughs.length) text(ctx, 'None yet', 4, Y.log + 50, { size: 26, color: COL.textMuted });
      d.breakthroughs.forEach((b, i) => {
        const name = PHASES.find((p) => p.id === b.phase).name;
        text(ctx, `${name} (day ${b.day}): ${b.hit ? 'BREAKTHROUGH' : 'no breakthrough'}`, 4, Y.log + 50 + i * 40, { size: 26, color: b.hit ? COL.gold : COL.textMuted });
      });

      scroll.end(ctx);
    },
  };
  return screen;
}
