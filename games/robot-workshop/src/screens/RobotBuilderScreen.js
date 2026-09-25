// Start a new robot project: purpose, the six parts, budget focus and the team.
// Purpose and parts: tap to step through the ones that are open (normal play before research: the Helper
// and the six Start parts; debug-unlock opens everything).
// For a contract (params.contractId): purpose is fixed, the suggested parts are loaded, and the
// requirements are shown with a live ✓/✗ against what this team is expected to build.
// The calendar pauses while this screen is open (bible §4.2: decision menus pause).
// Combos (Milestone 14): a panel under the parts shows the combos this build should fire and, for combos one
// condition away, a hint — the exact missing thing once it has been discovered, else its vague clue.
import { ScrollPanel } from '../../../../core/ui/ScrollPanel.js';
import { drawButton } from '../../../../core/ui/Button.js';
import { PURPOSES } from '../../data/purposes.js';
import { COMPONENTS, SLOTS, STARTER_PARTS, partsInSlot } from '../../data/components.js';
import { PHASES, BUDGET_FOCUS, BUDGET_ORDER } from '../../data/phases.js';
import { ROBOT_STATS } from '../../data/stats.js';
import { ROLES } from '../../data/staff.js';
import { PROJECT_RULES } from '../../data/balance.js';
import { predictBuild, predictSynergies } from '../systems/Capability.js';
import { hintFor, rewardText } from '../systems/Synergies.js';
import { SYNERGIES_BY_ID, SYNERGY_ART } from '../../data/synergies.js';
import { checkRecord, requirementLines } from '../systems/ContractRules.js';
import { panel, text, contained, hit, fmt, staffRow, wrapText } from '../ui/widgets.js';

const HEADER_H = 130;
const FOOTER_H = 150;
const CONTRACT_H = 250;
const COMBO_ROW = 38;
const MAX_HINTS = 3;

export function createRobotBuilderScreen({ renderer, layout, assets, campaign, router, debugEnabled = false }) {
  const W = renderer.width;
  const onResearch = (id) => campaign.research.busyIds.includes(id); // §19: can't be on a project too
  const state = { purposeId: 'helper', components: { ...STARTER_PARTS }, focus: 'balanced', teamIds: [], inspect: null, contractId: null };
  let resumeOnExit = false;

  const scroll = new ScrollPanel({ getRect: bodyRect, contentHeight: 0 });

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
  function startRect() {
    const sr = layout.safeRect;
    return { x: sr.x + 24, y: sr.y + sr.h - FOOTER_H + 24, w: sr.w - 48, h: 110 };
  }

  // --- content layout (content coordinates, width = body width) -----------
  const cw = () => bodyRect().w;
  const contract = () => (state.contractId ? campaign.contracts.active.find((c) => c.id === state.contractId) ?? null : null);
  const TOP = () => (state.contractId ? CONTRACT_H + 20 : 0);
  const TILE_H = 230;
  const ROW_H = 120;
  const Y = () => {
    const purpose = TOP();
    const parts = purpose + 340;
    const inspect = parts + 2 * TILE_H + 16 + 20;
    const combo = inspect + 190;
    const budget = combo + comboHeight() + 24;
    const team = budget + 230;
    const summary = team + 60 + Math.max(3, campaign.staff.staff.length) * (ROW_H + 14) + 20;
    return { purpose, parts, inspect, combo, budget, team, summary, end: summary + 320 };
  };
  const comboRect = () => ({ x: 0, y: Y().combo, w: cw(), h: comboHeight() });
  const archiveRect = () => ({ x: cw() - 250, y: Y().combo + 14, w: 234, h: 62 });

  // --- combos: worked out again only when the build or team changes ---
  let comboKey = null;
  let comboLines = [];
  function combos() {
    const key = JSON.stringify([state.purposeId, state.components, state.teamIds]);
    if (key === comboKey) return comboLines;
    comboKey = key;
    const archive = campaign.synergyArchive;
    const res = predictSynergies(campaign, state.purposeId, state.components, state.teamIds);
    const lines = [];
    for (const id of res.active) {
      const rule = SYNERGIES_BY_ID[id];
      if (archive.known(id)) lines.push({ kind: 'fire', rows: 1, text: `✓ ${rule.name} — ${rewardText(rule, res.bonusPct)}` });
      else lines.push({ kind: 'new', rows: 1, text: '✓ A combo you have not discovered yet should fire!' });
    }
    const hints = res.near.map((n) => ({ n, h: hintFor(n, archive.known(n.rule.id)) })).filter((x) => x.h);
    for (const { n, h } of hints.slice(0, MAX_HINTS)) {
      lines.push(h.exact ? { kind: 'exact', rows: 1, text: `→ ${h.text}` } : { kind: 'vague', rows: 2, text: `Hint: ${h.text}` });
      if (!h.exact) campaign.noteSynergyClue(n.rule.id); // the Combo Archive keeps it as a clue
    }
    if (hints.length > MAX_HINTS) lines.push({ kind: 'more', rows: 1, text: `+${hints.length - MAX_HINTS} more hint${hints.length - MAX_HINTS > 1 ? 's' : ''}` });
    if (!lines.length) lines.push({ kind: 'none', rows: 2, text: 'No combo with these parts. Some part mixes work better together — change a part and look for a hint here.' });
    if (hints.length) campaign.bus.emit('synergy:hint', { count: hints.length }); // the guide's first-combo-hint step
    comboLines = lines;
    return lines;
  }
  function comboHeight() {
    return 96 + combos().reduce((t, l) => t + l.rows * COMBO_ROW, 0) + 12;
  }
  const purposeRect = () => ({ x: 0, y: Y().purpose, w: cw(), h: 250 });
  const catalogueRect = () => ({ x: cw() - 230, y: Y().parts - 76, w: 230, h: 66 });
  function tileRect(i) {
    const w = (cw() - 32) / 3;
    return { x: (i % 3) * (w + 16), y: Y().parts + Math.floor(i / 3) * (TILE_H + 16), w, h: TILE_H };
  }
  function focusRect(i) {
    const w = (cw() - 32) / 3;
    return { x: i * (w + 16), y: Y().budget + 56, w, h: 100 };
  }
  function rowRect(i) {
    return { x: 0, y: Y().team + 60 + i * (ROW_H + 14), w: cw(), h: ROW_H };
  }

  // Open choices for a slot (a contract's required part pins its slot).
  function openInSlot(slotId) {
    const c = contract();
    if (c?.requiredPart && COMPONENTS[c.requiredPart].slot === slotId) return [COMPONENTS[c.requiredPart]];
    const open = campaign.openParts;
    return partsInSlot(slotId).filter((p) => open.has(p.id));
  }

  function estimateDaysPerPhase() {
    if (!state.teamIds.length) return null;
    const fake = { slots: state.teamIds };
    const target = campaign.robots.tierFor(state.components).phaseTarget;
    let total = 0;
    for (const phase of PHASES) {
      let score = 0;
      for (const id of state.teamIds) score += campaign.projects.workerScore(fake, phase, campaign.staff.get(id));
      total += target / ((PROJECT_RULES.progressBase + score / PROJECT_RULES.progressDivisor) * PROJECT_RULES.progressScale * campaign.robots.progressMultiplier(phase));
    }
    return total / PHASES.length;
  }

  // §20.5 running cost for the chosen team and budget.
  function estimateDailyCost() {
    const fake = { slots: state.teamIds, data: { buildCost: campaign.robots.buildCost(state.components), budgetFocus: state.focus } };
    return campaign.operatingCostPerDay(fake);
  }

  function canStart() {
    return state.teamIds.length > 0 && campaign.canStartProject().ok && (!state.contractId || !!contract());
  }

  function start() {
    if (!canStart()) return;
    const job = campaign.startRobotProject({
      purposeId: state.purposeId,
      components: state.components,
      budgetFocus: state.focus,
      teamIds: state.teamIds,
      contractId: state.contractId,
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
    purposeRect,
    catalogueRect,
    comboRect,
    archiveRect,
    debugRect,
    estimateDaysPerPhase,

    // params.contractId: build for that active contract. params.keep: coming back from the parts list.
    enter(params = {}) {
      resumeOnExit = !campaign.clock.paused;
      campaign.clock.pause();
      if (params.keep) return;
      state.contractId = params.contractId ?? null;
      const c = contract();
      state.purposeId = c ? c.purpose : campaign.openPurposes.includes(state.purposeId) ? state.purposeId : 'helper';
      state.components = c ? { ...c.suggested } : { ...STARTER_PARTS };
      state.focus = 'balanced';
      // Everyone not on research is on the team by default.
      state.teamIds = campaign.staff.staff.filter((s) => !onResearch(s.id)).map((s) => s.id).slice(0, PROJECT_RULES.teamSlots);
      state.inspect = null;
      scroll.scrollY = 0;
      comboKey = null; // staff, research and the archive may have changed
    },

    exit() {
      if (resumeOnExit) campaign.clock.resume();
    },

    onTap(p) {
      if (hit(p, backRect())) {
        router.go(state.contractId ? 'contracts' : 'workshop');
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
        router.go('components', { back: 'builder', backParams: { keep: true } });
        return;
      }
      if (hit(c, archiveRect())) {
        router.go('combos', { back: 'builder', backParams: { keep: true } });
        return;
      }
      // Purpose: step through the open ones (fixed for a contract).
      if (hit(c, purposeRect()) && !state.contractId) {
        const open = campaign.openPurposes;
        state.purposeId = open[(open.indexOf(state.purposeId) + 1) % open.length];
        return;
      }
      for (let i = 0; i < SLOTS.length; i++) {
        if (!hit(c, tileRect(i))) continue;
        const list = openInSlot(SLOTS[i].id);
        if (state.inspect === i && list.length > 1) {
          const at = list.findIndex((x) => x.id === state.components[SLOTS[i].id]);
          state.components[SLOTS[i].id] = list[(at + 1) % list.length].id; // second tap: next open part
        }
        state.inspect = i;
        return;
      }
      for (const [i, id] of BUDGET_ORDER.entries()) {
        if (hit(c, focusRect(i))) {
          state.focus = id;
          return;
        }
      }
      campaign.staff.staff.forEach((s, i) => {
        if (!hit(c, rowRect(i)) || onResearch(s.id)) return;
        if (state.teamIds.includes(s.id)) state.teamIds = state.teamIds.filter((x) => x !== s.id);
        else if (state.teamIds.length < PROJECT_RULES.teamSlots) state.teamIds.push(s.id);
      });
    },

    onDragStart: (p) => scroll.beginDrag(p),
    onDrag: (p) => scroll.drag(p),
    onDragEnd: (p) => scroll.endDrag(p),

    render(ctx) {
      ctx.fillStyle = '#101418';
      ctx.fillRect(0, 0, W, renderer.height);
      const sr = layout.safeRect;
      const y = Y();
      scroll.contentHeight = y.end;

      // Header
      drawButton(ctx, backRect(), '‹ Back', { font: 'bold 32px system-ui, sans-serif' });
      contained(ctx, assets, 'ui_icon_11', { x: sr.x + 230, y: sr.y + 28, w: 76, h: 76 });
      text(ctx, state.contractId ? 'Build for a contract' : 'New Robot Project', sr.x + 322, sr.y + 66, { size: 48, bold: true, baseline: 'middle', maxWidth: debugEnabled ? sr.w - 322 - 240 : sr.w - 340 });
      if (debugEnabled) drawButton(ctx, debugRect(), 'Debug builder', { accent: '#FFB74D', font: 'bold 28px system-ui, sans-serif' });

      scroll.begin(ctx);
      const w = cw();
      const purpose = PURPOSES[state.purposeId];
      if (state.contractId) drawContract(ctx, w);

      // Purpose
      const openPurposes = campaign.openPurposes;
      panel(ctx, purposeRect());
      contained(ctx, assets, purpose.art, { x: 20, y: y.purpose + 16, w: 200, h: 218 });
      text(ctx, 'Purpose', 250, y.purpose + 24, { size: 26, color: '#9AA8B5' });
      text(ctx, purpose.name, 250, y.purpose + 56, { size: 44, bold: true, maxWidth: w - 270 });
      const note = state.contractId
        ? 'Set by the contract'
        : openPurposes.length > 1
          ? `Tap to change (${openPurposes.length} open)`
          : 'The other 9 purposes open through research later';
      text(ctx, note, 250, y.purpose + 114, { size: 24, color: openPurposes.length > 1 && !state.contractId ? '#FFD166' : '#9AA8B5', maxWidth: w - 270 });
      const weights = Object.entries(purpose.weights)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => `${k} ${v}`)
        .join(' · ');
      text(ctx, 'What matters most:', 250, y.purpose + 158, { size: 24, color: '#9AA8B5' });
      text(ctx, weights, 250, y.purpose + 192, { size: 26, bold: true, maxWidth: w - 270 });

      // Parts
      const anyChoice = SLOTS.some((s) => openInSlot(s.id).length > 1);
      text(ctx, anyChoice ? 'Parts — tap to see, tap again to change' : 'Parts (Start parts — tap one to see it)', 4, y.parts - 58, { size: 30, bold: true, maxWidth: w - 250 });
      drawButton(ctx, catalogueRect(), 'Parts list', { font: 'bold 28px system-ui, sans-serif' });
      SLOTS.forEach((slot, i) => {
        const part = COMPONENTS[state.components[slot.id]];
        const r = tileRect(i);
        const on = state.inspect === i;
        const n = openInSlot(slot.id).length;
        panel(ctx, r, { stroke: on ? '#FFD166' : '#35414F', lineWidth: on ? 5 : 3 });
        contained(ctx, assets, part.art, { x: r.x + (r.w - 120) / 2, y: r.y + 14, w: 120, h: 120 });
        text(ctx, n > 1 ? `${slot.name} (${n})` : slot.name, r.x + r.w / 2, r.y + 146, { size: 22, color: '#9AA8B5', align: 'center', maxWidth: r.w - 16 });
        text(ctx, part.name, r.x + r.w / 2, r.y + 178, { size: 28, bold: true, align: 'center', maxWidth: r.w - 16 });
      });

      // Inspect box
      panel(ctx, { x: 0, y: y.inspect, w, h: 170 }, { fill: 'rgba(40,48,60,0.96)' });
      if (state.inspect == null) {
        text(ctx, 'Tap a part above to see what it does.', 24, y.inspect + 64, { size: 30, color: '#9AA8B5' });
      } else {
        const part = COMPONENTS[state.components[SLOTS[state.inspect].id]];
        text(ctx, `${part.id} · ${part.name}`, 24, y.inspect + 20, { size: 36, bold: true, maxWidth: w - 48 });
        text(ctx, `Cost ${fmt(part.cost)} · Complexity ${part.cx}${part.inn ? ` · INN +${part.inn}` : ''}`, 24, y.inspect + 70, { size: 28, color: '#9AA8B5' });
        const stats = Object.entries(part.stats).map(([k, v]) => `${k} ${v > 0 ? '+' : ''}${v}`).join('   ');
        text(ctx, stats, 24, y.inspect + 112, { size: 32, bold: true, color: '#7CFFB2', maxWidth: w - 48 });
      }

      drawCombos(ctx, w, y.combo);

      // Budget focus
      text(ctx, 'Budget focus', 4, y.budget, { size: 30, bold: true });
      BUDGET_ORDER.forEach((id, i) => drawButton(ctx, focusRect(i), BUDGET_FOCUS[id].name, { active: state.focus === id, font: 'bold 32px system-ui, sans-serif' }));
      const f = BUDGET_FOCUS[state.focus];
      const effects =
        state.focus === 'balanced'
          ? 'Normal cost, quality and fault chance.'
          : `${pct(f.costPct)} daily cost · ${pct(f.qualityGainPct)} quality gain · ${pct(f.faultChancePct)} fault chance${f.energyDrainPct ? ` · ${pct(f.energyDrainPct)} Energy drain` : ''}`;
      text(ctx, effects, 4, y.budget + 172, { size: 26, color: '#9AA8B5', maxWidth: w });

      // Team
      text(ctx, `Team (${state.teamIds.length}/${PROJECT_RULES.teamSlots}) — tap to add or remove`, 4, y.team, { size: 30, bold: true, maxWidth: w });
      campaign.staff.staff.forEach((s, i) => {
        const on = state.teamIds.includes(s.id);
        staffRow(ctx, assets, rowRect(i), s, { roleName: ROLES[s.role].name, on, tag: onResearch(s.id) ? 'On research' : on ? 'On team ✓' : 'Tap to add' });
      });

      // Summary
      const tier = campaign.robots.tierFor(state.components);
      const base = campaign.robots.baseStats(state.components);
      const est = estimateDaysPerPhase();
      panel(ctx, { x: 0, y: y.summary, w, h: 300 }, { fill: 'rgba(40,48,60,0.96)' });
      text(ctx, `${tier.name} tier · complexity ${campaign.robots.totalComplexity(state.components)} · ${fmt(tier.phaseTarget)} work per phase`, 24, y.summary + 22, { size: 28, bold: true, maxWidth: w - 48 });
      const build = campaign.buildCostFor(state.components);
      const off = build - campaign.robots.buildCost(state.components); // facilities, events, a sponsor
      const daily = estimateDailyCost();
      const days = est ? Math.round(est * PHASES.length) : 0;
      text(ctx, `Build cost ${fmt(build)}${off ? ` (${off > 0 ? '+' : ''}${fmt(off)} vs list)` : ''} now · about ${fmt(daily)} a day to run (≈${fmt(daily * days)} total) · you have ${fmt(campaign.economy.balance('credits'))}`, 24, y.summary + 70, {
        size: 24,
        color: campaign.economy.balance('credits') < build ? '#FF8A80' : '#9AA8B5',
        maxWidth: w - 48,
      });
      text(ctx, 'Starting stats from parts:', 24, y.summary + 118, { size: 26, color: '#9AA8B5' });
      text(ctx, ROBOT_STATS.map((s) => `${s.key} ${base[s.key]}`).join('  '), 24, y.summary + 152, { size: 28, bold: true, maxWidth: w - 48 });
      text(ctx, est ? `About ${Math.round(est)} game days per phase with this team (5 phases)` : 'Add at least one worker to start', 24, y.summary + 212, {
        size: 28,
        color: est ? '#FFD166' : '#FF8A80',
        maxWidth: w - 48,
      });
      scroll.end(ctx);

      // Footer
      const can = canStart();
      const bay = campaign.canStartProject();
      if (!bay.ok) text(ctx, bay.reason, sr.x + sr.w / 2, startRect().y - 30, { size: 28, bold: true, color: '#FFD166', align: 'center', baseline: 'middle', maxWidth: sr.w - 48 });
      drawButton(ctx, startRect(), state.contractId ? 'Start contract build' : 'Start project', { active: can, disabled: !can, accent: '#7CFFB2', font: 'bold 44px system-ui, sans-serif' });
    },
  };

  // Combo panel: what this build should fire, then hints.
  function drawCombos(ctx, w, y0) {
    const lines = combos();
    const active = lines.some((l) => l.kind === 'fire' || l.kind === 'new');
    panel(ctx, comboRect(), { stroke: active ? '#FFD166' : lines.some((l) => l.kind === 'vague' || l.kind === 'exact') ? '#4FC3F7' : '#35414F' });
    contained(ctx, assets, SYNERGY_ART.icon, { x: 16, y: y0 + 12, w: 64, h: 64 });
    text(ctx, 'Combos', 92, y0 + 26, { size: 34, bold: true });
    drawButton(ctx, archiveRect(), 'Combo Archive', { font: 'bold 26px system-ui, sans-serif' });
    const color = { fire: '#FFD166', new: '#FFD166', exact: '#7CFFB2', vague: '#9FD8F5', more: '#9AA8B5', none: '#9AA8B5' };
    let ly = y0 + 96;
    for (const l of lines) {
      wrapText(ctx, l.text, 24, ly, w - 48, { size: 26, lineH: COMBO_ROW, maxLines: l.rows, bold: l.kind === 'fire' || l.kind === 'new' || l.kind === 'exact', color: color[l.kind] });
      ly += l.rows * COMBO_ROW;
    }
  }

  // Contract panel: requirements and a live estimate for the parts picked now.
  function drawContract(ctx, w) {
    const c = contract();
    panel(ctx, { x: 0, y: 0, w, h: CONTRACT_H }, { stroke: '#FFB74D' });
    if (!c) {
      text(ctx, 'This contract is no longer active.', 24, 30, { size: 32, bold: true, color: '#FF8A80' });
      return;
    }
    contained(ctx, assets, 'ui_icon_14', { x: 16, y: 16, w: 60, h: 60 });
    text(ctx, c.title, 90, 26, { size: 34, bold: true, maxWidth: w - 110 });
    requirementLines(c).forEach((line, i) => text(ctx, line, 24, 88 + i * 38, { size: 26, color: i ? '#E8EEF2' : '#9AA8B5', maxWidth: w - 48 }));
    const pred = predictBuild(campaign, state.purposeId, state.components);
    const chk = checkRecord(c, { result: { ...pred, purpose: state.purposeId, components: state.components } });
    const days = campaign.contracts.daysLeft(c, campaign.clock.totalDays);
    text(ctx, chk.ok ? `✓ Your team should meet this with these parts (≈${pred.days} days · ${days} days left)` : `✗ Expected short: ${chk.failures.join(', ')}`, 24, 208, {
      size: 26,
      bold: true,
      color: chk.ok ? '#7CFFB2' : '#FF8A80',
      maxWidth: w - 48,
    });
  }

  return screen;
}

function pct(v) {
  return `${v > 0 ? '+' : ''}${v}%`;
}
