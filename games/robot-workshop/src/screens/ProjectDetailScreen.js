// Active Project (bible §6.3, rebuilt in the Milestone 21 style): the robot being built — all five stages, the
// current stage's progress, the team, faults, breakthrough checks, the robot's projected stats and the things the
// player can change mid-build (budget focus for the next stage, who is on the team). The calendar keeps running.
// Everything stacks by its measured height, so a big team or large text never overlaps the next panel.
// params.jobId: which bay's project (default: the first).
import { THEME, font, lineH } from '../../../../core/Theme.js';
import { ScrollPanel } from '../../../../core/ui/ScrollPanel.js';
import { drawButton } from '../../../../core/ui/Button.js';
import { PURPOSES } from '../../data/purposes.js';
import { PHASES, PROJECT_TIERS, BUDGET_FOCUS, BUDGET_ORDER } from '../../data/phases.js';
import { ROBOT_STATS } from '../../data/stats.js';
import { ROLES } from '../../data/staff.js';
import { PROJECT_RULES } from '../../data/balance.js';
import { createTopBar } from '../ui/TopBar.js';
import { card, text, para, bar, statBars, hit, fmt, listRow, listRowHeight, emptyState, stateHeight } from '../ui/widgets.js';
import { robotArtOf } from '../systems/robotVisual.js';
const COL = THEME.color;
const Z = THEME.size;

const GAP = 22;
const PAD = 24;
const SHORT = { concept: 'Concept', engineering: 'Engineer', software: 'Software', assembly: 'Assembly', testing: 'Testing' };

export function createProjectDetailScreen({ renderer, layout, assets, campaign, router, hud }) {
  const W = renderer.width;
  let jobId = null;
  const topBar = createTopBar({ layout, campaign, hud, back: { label: '‹ Back', onTap: () => router.back() } });
  const scroll = new ScrollPanel({ getRect: bodyRect, contentHeight: 0 });
  let L = { phase: { x: 0, y: 0, w: 0, h: 0 }, focus: [], rows: [] }; // content rects from the last frame

  function bodyRect() {
    const sr = layout.safeRect;
    const t = topBar.rect();
    const y = t.y + t.h + 16;
    return { x: sr.x + 24, y, w: sr.w - 48, h: sr.y + sr.h - 24 - y };
  }
  const cw = () => bodyRect().w - 12;
  const job = () => campaign.projects.jobs.find((j) => j.id === jobId) ?? campaign.activeProject;

  const screen = {
    scroll,
    topBar,
    phaseRect: () => L.phase, // content rect of the current-stage panel (the guide points at it)
    focusRect: (i) => L.focus[i],
    rowRect: (i) => L.rows[i],
    enter(params = {}) {
      jobId = params.jobId ?? null;
      scroll.scrollY = 0;
      if (!job()) router.go('builder', {}, { replace: true });
    },
    onTap(p) {
      if (topBar.handleTap(p)) return;
      const j = job();
      if (!j || !scroll.contains(p)) return;
      const c = scroll.toContent(p);
      const f = L.focus.findIndex((r) => r && hit(c, r));
      if (f >= 0) return campaign.robots.setFocus(j, BUDGET_ORDER[f]);
      const i = L.rows.findIndex((r) => r && hit(c, r));
      if (i >= 0) campaign.assignments.toggle(j, campaign.staff.staff[i].id);
    },
    onDragStart: (p) => scroll.beginDrag(p),
    onDrag: (p) => scroll.drag(p),
    onDragEnd: (p) => scroll.endDrag(p),
    render(ctx) {
      ctx.fillStyle = COL.bg;
      ctx.fillRect(0, 0, W, renderer.height);
      const j = job();
      if (j) {
        scroll.begin(ctx);
        scroll.contentHeight = draw(ctx, j) + 30;
        scroll.end(ctx);
      }
      topBar.render(ctx);
    },
  };

  function heading(ctx, str, y, w) {
    text(ctx, str, 4, y, { size: Z.heading, bold: true, maxWidth: w });
    return y + lineH(Z.heading, 1.35);
  }

  function draw(ctx, j) {
    const d = j.data;
    const w = cw();
    const purpose = PURPOSES[d.purpose];
    const tier = PROJECT_TIERS.find((t) => t.id === d.tier);
    const next = { phase: null, focus: [], rows: [] };
    let y = 0;

    // Header card: the robot's look, name, purpose and tier, days and running cost.
    const tx = 230;
    const headLines = [`${purpose.name} · ${tier.name} tier`, `Worked ${j.day} days · ${fmt(campaign.operatingCostPerDay(j))} credits a day to run`];
    const hh = Math.max(220, PAD * 2 + lineH(Z.heading, 1.3) + headLines.reduce((t, l) => t + para(null, l, 0, 0, w - tx - PAD, { size: Z.body }), 0));
    card(ctx, { x: 0, y, w, h: hh });
    assets.drawContained(ctx, robotArtOf({ purpose: d.purpose }), { x: PAD, y: y + 20, w: 180, h: hh - 40 });
    text(ctx, j.name, tx, y + PAD, { size: Z.heading, bold: true, maxWidth: w - tx - PAD });
    let ly = y + PAD + lineH(Z.heading, 1.3);
    for (const l of headLines) ly += para(ctx, l, tx, ly, w - tx - PAD, { size: Z.body, color: COL.textMuted });
    y += hh + GAP;

    // All five stages.
    const stepW = w / PHASES.length;
    PHASES.forEach((ph, i) => {
      if (!i) return; // the connecting lines first, so the circles sit on top of them
      ctx.fillStyle = i <= j.phaseIndex ? COL.good : COL.line;
      ctx.fillRect(stepW * i - stepW / 2, y + 36, stepW, 8);
    });
    PHASES.forEach((ph, i) => {
      const cx = stepW * i + stepW / 2;
      const done = i < j.phaseIndex;
      const now = i === j.phaseIndex;
      ctx.beginPath();
      ctx.arc(cx, y + 40, 36, 0, Math.PI * 2);
      ctx.fillStyle = done ? COL.good : now ? COL.gold : COL.panelDim;
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = COL.outline;
      ctx.stroke();
      text(ctx, done ? '✓' : String(i + 1), cx, y + 42, { size: Z.body, bold: true, color: done || now ? COL.textOnDark : COL.textMuted, align: 'center', baseline: 'middle' });
      text(ctx, SHORT[ph.id], cx, y + 90, { size: Z.small, bold: now, color: now ? COL.text : COL.textMuted, align: 'center', maxWidth: stepW - 6 });
    });
    y += 90 + lineH(Z.small) + GAP;

    // The current stage.
    const phase = PHASES[j.phaseIndex];
    const perDay = campaign.projects.progressPerDay(j);
    const left = perDay > 0 ? Math.ceil((j.phaseTarget - j.phaseProgress) / perDay) : null;
    const roll = d.breakthroughs.find((b) => b.phase === phase.id);
    const rollText = roll ? (roll.hit ? 'Breakthrough at 60%! (its bonus effects come in a later update)' : `60% check: no breakthrough this stage (${Math.round(roll.chance * 100)}% chance)`) : 'A breakthrough check happens at 60%';
    const workText = perDay > 0 ? `+${perDay.toFixed(1)} work a day · about ${left} days left` : 'Nobody is on the team — work has stopped';
    const inner = w - 2 * PAD;
    const ph = PAD + lineH(Z.heading, 1.3) + 60 + 16 + para(null, workText, 0, 0, inner, { size: Z.body }) + para(null, rollText, 0, 0, inner, { size: Z.small }) + PAD;
    const phaseR = { x: 0, y, w, h: ph };
    next.phase = phaseR;
    card(ctx, phaseR, 'info');
    text(ctx, `Stage ${j.phaseIndex + 1} of ${PHASES.length}: ${phase.name}`, PAD, y + PAD, { size: Z.heading, bold: true, maxWidth: inner });
    let py = y + PAD + lineH(Z.heading, 1.3);
    bar(ctx, PAD, py, inner, 50, j.phaseProgress / j.phaseTarget, COL.good);
    text(ctx, `${fmt(Math.min(j.phaseProgress, j.phaseTarget))} / ${fmt(j.phaseTarget)}`, w / 2, py + 26, { size: Z.small, bold: true, align: 'center', baseline: 'middle' });
    py += 60 + 16;
    py += para(ctx, workText, PAD, py, inner, { size: Z.body, bold: perDay <= 0, color: perDay > 0 ? COL.text : COL.bad });
    para(ctx, rollText, PAD, py, inner, { size: Z.small, color: roll?.hit ? COL.gold : COL.textMuted });
    y += ph + GAP;

    // Change mid-build: budget focus (from the next stage).
    y = heading(ctx, 'Budget focus', y, w);
    const fw = (w - 2 * 16) / 3;
    BUDGET_ORDER.forEach((id, i) => {
      const r = { x: i * (fw + 16), y, w: fw, h: 116 };
      next.focus[i] = r;
      drawButton(ctx, r, BUDGET_FOCUS[id].name + (d.pendingFocus === id ? ' (next)' : ''), { active: d.budgetFocus === id, accent: d.pendingFocus === id ? COL.gold : COL.progress, font: font(Z.button, true) });
    });
    y += 116 + 12;
    const note = d.pendingFocus ? `Switches to ${BUDGET_FOCUS[d.pendingFocus].name} when the next stage starts` : 'Budget focus changes between stages — a new choice waits for the next stage';
    y += para(ctx, note, 4, y, w, { size: Z.small, color: d.pendingFocus ? COL.gold : COL.textMuted }) + GAP;

    // Change mid-build: the team (tap to add or remove).
    const teamCount = j.slots.filter(Boolean).length;
    y = heading(ctx, `Team (${teamCount}/${j.slots.length}${j.slots.length > PROJECT_RULES.teamSlots ? ', slot 6 VIP 35%' : ''}) — tap to add or remove`, y, w);
    campaign.staff.staff.forEach((s, i) => {
      const on = j.slots.includes(s.id);
      const busy = !on && campaign.busyReason(s.id, 'project');
      const support = on && j.slots.indexOf(s.id) >= PROJECT_RULES.teamSlots; // the VIP Support Staff slot (Milestone 23)
      const spec = { art: s.art, title: s.name, state: on ? 'selected' : busy ? 'locked' : 'normal', right: support ? 'Support 35%' : on ? 'Working' : busy ? '' : 'Free', rightColor: on ? COL.good : COL.textMuted, lines: [`${ROLES[s.role].name} · Level ${s.level} · Energy ${Math.round(s.energy)} · Morale ${Math.round(s.morale)}`, ...(busy ? [{ text: busy, color: COL.textMuted, size: Z.small }] : [])], artSize: 110 };
      const h = listRowHeight(w, spec);
      const r = { x: 0, y, w, h };
      next.rows[i] = r;
      listRow(ctx, assets, r, spec);
      y += h + 12;
    });
    y += GAP;

    // Faults.
    const faultLines = [`Found ${d.faultsFound} · fixed ${d.faultsFixed} · each open fault costs −3 REL and −1.5 Quality`, 'Testing & Tuning tries to fix open faults at the end'];
    const fh = PAD + lineH(Z.heading, 1.3) + faultLines.reduce((t, l) => t + para(null, l, 0, 0, inner, { size: Z.body }), 0) + PAD;
    card(ctx, { x: 0, y, w, h: fh }, d.faults.length ? 'bad' : 'good');
    text(ctx, `Open faults: ${d.faults.length}`, PAD, y + PAD, { size: Z.heading, bold: true, color: d.faults.length ? COL.bad : COL.good });
    let fy = y + PAD + lineH(Z.heading, 1.3);
    for (const l of faultLines) fy += para(ctx, l, PAD, fy, inner, { size: Z.body, color: COL.textMuted });
    y += fh + GAP;

    // Projected stats.
    const stats = campaign.robots.currentStats(j);
    const rowH = Math.max(52, lineH(Z.body, 1.45));
    const sh = PAD + lineH(Z.heading, 1.3) + ROBOT_STATS.length * rowH + PAD;
    card(ctx, { x: 0, y, w, h: sh });
    text(ctx, 'Robot so far (parts + team work − faults)', PAD, y + PAD, { size: Z.heading, bold: true, maxWidth: inner });
    statBars(ctx, PAD, y + PAD + lineH(Z.heading, 1.3), inner, stats, ROBOT_STATS, { rowH });
    y += sh + GAP;

    // Breakthrough checks so far.
    y = heading(ctx, 'Breakthrough checks', y, w);
    if (!d.breakthroughs.length) {
      const s = { art: 'vfx_03', text: 'None yet — each stage checks once at 60%.' };
      const h = stateHeight(w, s);
      emptyState(ctx, assets, { x: 0, y, w, h }, s);
      y += h;
    }
    for (const b of d.breakthroughs) {
      const name = PHASES.find((p) => p.id === b.phase).name;
      y += para(ctx, `${name} (day ${b.day}): ${b.hit ? 'BREAKTHROUGH' : 'no breakthrough'}`, 4, y, w, { size: Z.body, bold: b.hit, color: b.hit ? COL.gold : COL.textMuted });
    }
    L = next;
    return y;
  }

  return screen;
}
