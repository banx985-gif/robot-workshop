// Debug builder (?debug=1 only): pick any purpose and any six parts — locks ignored — and run the whole
// project instantly in a throwaway copy of the game (the real save is never touched).
// Shows tier, complexity, cost, the seven stats, Innovation, Fit, Quality, review and the visual family.
// makeSandbox() → a fresh Campaign on its own event bus, with the three starters (made in main.js).
import { ScrollPanel } from '../../../../core/ui/ScrollPanel.js';
import { drawButton, drawPadlock } from '../../../../core/ui/Button.js';
import { PURPOSES, PURPOSE_ORDER } from '../../data/purposes.js';
import { COMPONENTS, SLOTS, STARTER_PARTS, partsInSlot } from '../../data/components.js';
import { PROJECT_TIERS, BUDGET_FOCUS, BUDGET_ORDER } from '../../data/phases.js';
import { ROBOT_STATS, ROBOT_STAT_KEYS } from '../../data/stats.js';
import { VISUALS } from '../../data/visuals.js';
import { isOpenNow } from '../systems/unlockRules.js';
import { panel, text, contained, statBars, hit, fmt } from '../ui/widgets.js';

const HEADER_H = 130;
const Y = { purpose: 0, parts: 250, focus: 250 + 6 * 170 + 10, actions: 250 + 6 * 170 + 150, result: 250 + 6 * 170 + 310 };
const SLOT_H = 170;
const RESULT_H = 1010;

export function createDebugBuilderScreen({ renderer, layout, assets, campaign, router, makeSandbox }) {
  const W = renderer.width;
  const state = { purposeId: 'helper', components: { ...STARTER_PARTS }, focus: 'balanced' };
  let last = null; // { record, days, ms, problems }
  let runs = 0;
  let resumeOnExit = false;
  const scroll = new ScrollPanel({ getRect: bodyRect, contentHeight: Y.result + RESULT_H + 20 });

  function backRect() {
    const sr = layout.safeRect;
    return { x: sr.x + 24, y: sr.y + 24, w: 180, h: 86 };
  }
  function bodyRect() {
    const sr = layout.safeRect;
    return { x: sr.x + 24, y: sr.y + HEADER_H, w: sr.w - 48, h: sr.h - HEADER_H - 24 };
  }
  const cw = () => bodyRect().w - 12;
  const purposeRect = (i) => {
    const w = (cw() - 4 * 12) / 5;
    return { x: (i % 5) * (w + 12), y: Y.purpose + 50 + Math.floor(i / 5) * 92, w, h: 80 };
  };
  const partRect = (slotIndex, i) => {
    const w = (cw() - 9 * 8) / 10;
    return { x: i * (w + 8), y: Y.parts + slotIndex * SLOT_H + 52, w, h: 104 };
  };
  const focusRect = (i) => {
    const w = (cw() - 2 * 16) / 3;
    return { x: i * (w + 16), y: Y.focus + 44, w, h: 84 };
  };
  const actionRect = (i) => {
    const w = (cw() - 3 * 12) / 4;
    return { x: i * (w + 12), y: Y.actions, w, h: 104 };
  };
  const ACTIONS = ['build', 'random', 'catalogue', 'unlock'];

  // Build the chosen robot from start to finish in a sandbox campaign. Returns what happened.
  function build() {
    const t0 = performance.now();
    const sb = makeSandbox();
    sb.startRobotProject({ purposeId: state.purposeId, components: state.components, budgetFocus: state.focus, teamIds: sb.staff.staff.map((s) => s.id) });
    let days = 0;
    while (sb.activeProject && days < 3000) {
      sb.simulateDays(1);
      days++;
    }
    const record = sb.history.latest();
    runs++;
    last = { record, days, ms: performance.now() - t0, problems: problemsIn(record) };
    return last;
  }

  // NaN / missing numbers anywhere in the result.
  function problemsIn(record) {
    if (!record) return ['no robot was finished'];
    const out = [];
    const r = record.result;
    for (const k of ROBOT_STAT_KEYS) if (!Number.isFinite(r.stats[k])) out.push(`${k} is ${r.stats[k]}`);
    for (const k of ['quality', 'review', 'innovation', 'fit', 'weightedScore', 'buildCost', 'totalCx']) if (!Number.isFinite(r[k])) out.push(`${k} is ${r[k]}`);
    if (!VISUALS[r.visual]) out.push(`visual "${r.visual}" is not a family`);
    return out;
  }

  function randomize() {
    for (const s of SLOTS) {
      const list = partsInSlot(s.id);
      state.components[s.id] = list[Math.floor(Math.random() * list.length)].id;
    }
  }

  const screen = {
    state,
    scroll,
    purposeRect,
    partRect,
    focusRect,
    actionRect,
    build,
    get last() {
      return last;
    },
    enter() {
      resumeOnExit = !campaign.clock.paused;
      campaign.clock.pause();
    },
    exit() {
      if (resumeOnExit) campaign.clock.resume();
    },
    onTap(p) {
      if (hit(p, backRect())) {
        router.go('builder');
        return;
      }
      if (!scroll.contains(p)) return;
      const c = scroll.toContent(p);
      PURPOSE_ORDER.forEach((id, i) => hit(c, purposeRect(i)) && (state.purposeId = id));
      SLOTS.forEach((s, si) => partsInSlot(s.id).forEach((part, i) => hit(c, partRect(si, i)) && (state.components[s.id] = part.id)));
      BUDGET_ORDER.forEach((id, i) => hit(c, focusRect(i)) && (state.focus = id));
      ACTIONS.forEach((a, i) => {
        if (!hit(c, actionRect(i))) return;
        if (a === 'build') {
          build();
          scroll.scrollY = Y.result - 40;
        } else if (a === 'random') randomize();
        else if (a === 'unlock') campaign.setDebugUnlockAll(!campaign.flags.debugUnlockAll);
        else router.go('components', { back: 'debugbuilder' });
      });
    },
    onDragStart: (p) => scroll.beginDrag(p),
    onDrag: (p) => scroll.drag(p),
    onDragEnd: (p) => scroll.endDrag(p),

    render(ctx) {
      ctx.fillStyle = '#101418';
      ctx.fillRect(0, 0, W, renderer.height);
      const sr = layout.safeRect;
      drawButton(ctx, backRect(), '‹ Back', { font: 'bold 32px system-ui, sans-serif' });
      text(ctx, 'Debug builder', sr.x + 230, sr.y + 50, { size: 48, bold: true, baseline: 'middle' });
      text(ctx, 'any purpose, any parts — locks ignored · the real save is not touched', sr.x + 230, sr.y + 98, { size: 24, color: '#FFB74D', baseline: 'middle', maxWidth: sr.w - 260 });

      const w = cw();
      scroll.begin(ctx);
      text(ctx, 'Purpose', 4, Y.purpose, { size: 30, bold: true });
      PURPOSE_ORDER.forEach((id, i) => drawButton(ctx, purposeRect(i), PURPOSES[id].shortName, { selected: state.purposeId === id, font: 'bold 26px system-ui, sans-serif' }));

      SLOTS.forEach((s, si) => {
        const part = COMPONENTS[state.components[s.id]];
        const y = Y.parts + si * SLOT_H;
        text(ctx, `${s.name}: ${part.id} ${part.name} · cx ${part.cx} · ${fmt(part.cost)}`, 4, y + 8, { size: 28, bold: true, maxWidth: w });
        partsInSlot(s.id).forEach((c, i) => {
          const r = partRect(si, i);
          const on = c.id === part.id;
          panel(ctx, r, { fill: on ? 'rgba(79,195,247,0.25)' : 'rgba(26,32,40,0.96)', stroke: on ? '#4FC3F7' : '#35414F', lineWidth: on ? 5 : 2, radius: 14 });
          contained(ctx, assets, c.art, { x: r.x + 6, y: r.y + 6, w: r.w - 12, h: r.h - 12 });
          if (!isOpenNow(c.unlock)) drawPadlock(ctx, r.x + r.w - 24, r.y + r.h - 18, 18, '#FFD166');
        });
      });

      text(ctx, 'Budget focus', 4, Y.focus, { size: 30, bold: true });
      BUDGET_ORDER.forEach((id, i) => drawButton(ctx, focusRect(i), BUDGET_FOCUS[id].name, { selected: state.focus === id, font: 'bold 30px system-ui, sans-serif' }));
      const unlocked = !!campaign.flags.debugUnlockAll;
      const labels = { build: 'Build now', random: 'Random parts', catalogue: 'Parts list', unlock: unlocked ? 'Game: all open' : 'Game: open all' };
      ACTIONS.forEach((a, i) =>
        drawButton(ctx, actionRect(i), labels[a], {
          selected: a === 'build' || (a === 'unlock' && unlocked),
          accent: a === 'build' ? '#7CFFB2' : a === 'unlock' ? '#FFB74D' : '#4FC3F7',
          font: 'bold 28px system-ui, sans-serif',
        }),
      );
      text(ctx, unlocked ? 'Debug: every purpose and part is open in your real game (for testing contracts). Tap again to lock them.' : '"Game: open all" opens every purpose and part in your real game, for testing.', 4, Y.actions + 116, {
        size: 22,
        color: '#FFB74D',
        maxWidth: w,
      });

      drawResult(ctx, w);
      scroll.end(ctx);
    },
  };

  function drawResult(ctx, w) {
    const y = Y.result;
    panel(ctx, { x: 0, y, w, h: RESULT_H }, { stroke: last?.problems.length ? '#FF5A5A' : '#35414F' });
    const rb = campaign.robots;
    const cx = rb.totalComplexity(state.components);
    const tier = rb.tierFor(state.components);
    text(ctx, `Before building: ${tier.name} tier · complexity ${cx} · cost ${fmt(rb.buildCost(state.components))}${tier.requiresRank ? ` · normal play needs Rank ${tier.requiresRank}` : ''}`, 24, y + 20, {
      size: 26,
      color: '#9AA8B5',
      maxWidth: w - 48,
    });
    if (!last) {
      text(ctx, 'Press "Build now" to run the whole project instantly.', 24, y + 80, { size: 30, color: '#9AA8B5', maxWidth: w - 48 });
      return;
    }
    const rec = last.record;
    const r = rec.result;
    const fam = VISUALS[r.visual];
    const t = PROJECT_TIERS.find((x) => x.id === r.tier);
    contained(ctx, assets, fam?.art, { x: 20, y: y + 70, w: 250, h: 270 });
    text(ctx, `${rec.name} (run ${runs})`, 290, y + 76, { size: 40, bold: true, maxWidth: w - 310 });
    text(ctx, `${PURPOSES[r.purpose].name} · visual ${r.visual} ${fam?.name ?? '?'}`, 290, y + 130, { size: 26, color: '#9AA8B5', maxWidth: w - 310 });
    text(ctx, `${t.name} tier · complexity ${r.totalCx} · cost ${fmt(r.buildCost)}`, 290, y + 170, { size: 26, color: '#9AA8B5', maxWidth: w - 310 });
    text(ctx, `${last.days} work days (≈${(last.days / 28).toFixed(1)} months) · ran in ${last.ms.toFixed(0)} ms`, 290, y + 210, { size: 26, color: '#9AA8B5', maxWidth: w - 310 });
    text(ctx, `Quality ${r.quality.toFixed(1)}`, 290, y + 256, { size: 44, bold: true, color: '#7CFFB2' });
    text(ctx, `Review ${r.review.toFixed(1)} / 10`, 290, y + 310, { size: 36, bold: true, color: '#FFD166' });
    statBars(ctx, 24, y + 370, w - 48, r.stats, ROBOT_STATS, { color: '#4FC3F7', scaleMax: 600 });
    const y2 = y + 370 + 7 * 52 + 16;
    text(ctx, `Innovation ${r.innovation} · Fit ${r.fit} (purpose match ${Math.round(r.purposeMatch * 100)}%) · weighted ${r.weightedScore}`, 24, y2, { size: 28, bold: true, maxWidth: w - 48 });
    text(ctx, `Faults left ${r.faults} (found ${r.faultsFound}, fixed ${r.faultsFixed}) · budget ${r.budgetFocus}`, 24, y2 + 46, { size: 26, color: '#E8EEF2', maxWidth: w - 48 });
    text(ctx, SLOTS.map((s) => r.components[s.id]).join(' · '), 24, y2 + 88, { size: 26, color: '#9AA8B5', maxWidth: w - 48 });
    const ok = !last.problems.length;
    text(ctx, ok ? 'Number check: all values are real numbers ✓' : `Problems: ${last.problems.join(', ')}`, 24, y2 + 134, { size: 28, bold: true, color: ok ? '#7CFFB2' : '#FF8A80', maxWidth: w - 48 });
  }

  return screen;
}
