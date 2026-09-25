// Robot Workshop combos (bible §12): turns a robot build into the shared evaluator's context, works out which
// combos fire (core/SynergyEvaluator.js), applies their rewards before Quality (§12.2), and writes the words the
// builder, result and Combo Archive screens show. Rules live in data/synergies.js.
//
// Order (M14 choice, so one combo can never switch on another):
//   1. every combo is checked on the robot's stats before any combo bonus (Quality not known yet)
//   2. their rewards are added (Master Integrator: each number +10%), then Quality is worked out
//   3. combos that need the final Quality (SYN17) are checked last; they only give a look / Rep, never stats
import { evaluateRules } from '../../../../core/SynergyEvaluator.js';
import { SYNERGIES, FINAL_STATS } from '../../data/synergies.js';
import { COMPONENTS, SLOTS } from '../../data/components.js';
import { PURPOSES } from '../../data/purposes.js';
import { ROBOT_STATS } from '../../data/stats.js';
import { VISUAL_FAMILIES } from '../../data/visuals.js';

const STAT_NAMES = { ...Object.fromEntries(ROBOT_STATS.map((s) => [s.key, s.key])), INN: 'Innovation', QUALITY: 'Quality' };

// The evaluator's view of a build. quality: null until it is known.
export function synergyContext({ purposeId, components, stats, innovation = 0, quality = null, team = [], ngPlus = 0 }) {
  const parts = SLOTS.map((s) => COMPONENTS[components?.[s.id]])
    .filter(Boolean)
    .map((p) => ({ id: p.id, slot: p.slot, cx: p.cx, tags: p.tags ?? [] }));
  const all = { ...stats, INN: innovation };
  if (quality != null) all.QUALITY = quality;
  return { purpose: purposeId, parts, stats: all, team: team.map((s) => ({ role: s.role, traits: s.traits ?? [] })), ngPlus };
}

const scaled = (n, pct) => Math.round(n * (1 + pct / 100));

// One combo's reward after Master Integrator (bonusPct), as plain numbers.
export function scaledReward(rule, bonusPct = 0) {
  const r = rule.reward ?? {};
  const out = {};
  if (r.stats) out.stats = Object.fromEntries(Object.entries(r.stats).map(([k, v]) => [k, scaled(v, bonusPct)]));
  for (const k of ['fit', 'inn', 'rp', 'repFirst']) if (r[k]) out[k] = scaled(r[k], bonusPct);
  return out;
}

// The whole combo step for one robot.
//   base: { purposeId, components, stats, innovation, team, ngPlus }
//   hooks: { discovered(key), ruleMet(rule) }  bonusPct: Master Integrator etc.
//   qualityOf(stats, innovation) → Quality for these numbers
// Returns { stats, innovation, fitBonus, quality, active: [id], near: [{ rule, missing }], rewards: { id: reward } }
export function applySynergies(base, hooks, bonusPct, qualityOf) {
  const first = evaluateRules(SYNERGIES, synergyContext(base), hooks);
  const stats = { ...base.stats };
  let innovation = base.innovation;
  let fitBonus = 0;
  const rewards = {};
  for (const rule of first.active) {
    const r = scaledReward(rule, bonusPct);
    rewards[rule.id] = r;
    for (const [k, v] of Object.entries(r.stats ?? {})) stats[k] = Math.min(999, Math.max(0, stats[k] + v));
    fitBonus += r.fit ?? 0;
    innovation = Math.round((innovation + (r.inn ?? 0)) * 10) / 10;
  }
  const quality = qualityOf(stats, innovation);
  const second = evaluateRules(SYNERGIES, synergyContext({ ...base, stats: base.stats, quality }), hooks);
  for (const rule of second.active) rewards[rule.id] ??= scaledReward(rule, bonusPct); // final-Quality combos
  return { stats, innovation, fitBonus, quality, active: second.active.map((r) => r.id), near: second.near, rewards };
}

// Does this rule need a number that only exists at the very end?
export function usesFinalStat(rule) {
  return rule.conditions.some((c) => c.kind === 'stat' && FINAL_STATS.includes(c.stat));
}

// --- words -----------------------------------------------------------------------------------------
export function describeCondition(c) {
  if (c.label) return c.label;
  switch (c.kind) {
    case 'purpose':
      return c.any.map((id) => PURPOSES[id]?.name ?? id).join(' or ');
    case 'part':
      return c.any.length > 1 ? `${COMPONENTS[c.any[0]]?.name ?? c.any[0]} or better` : (COMPONENTS[c.any[0]]?.name ?? c.any[0]);
    case 'tag':
      return `${c.min ?? 1}+ "${c.tag}" part${(c.min ?? 1) > 1 ? 's' : ''}`;
    case 'partCount':
      return `${c.min} other parts of complexity ${c.minCx}+`;
    case 'stat':
      return `${STAT_NAMES[c.stat] ?? c.stat} ${c.min}+`;
    case 'staff':
      return `A ${[c.trait, c.role].filter(Boolean).join(' ')} on the team`;
    case 'discovered':
      return `Found before: ${c.key}`;
    case 'ngPlus':
      return `New Game+ ${c.min}`;
    default:
      return '???';
  }
}

export function recipeText(rule) {
  return rule.conditions.map(describeCondition).join(' + ');
}

export function lookOf(ruleId) {
  return VISUAL_FAMILIES.find((v) => v.synergy === ruleId) ?? null;
}

// "Fit +12 · REL +8 · New look: Precision"
export function rewardText(rule, bonusPct = 0) {
  const r = scaledReward(rule, bonusPct);
  const bits = [];
  if (r.fit) bits.push(`Fit +${r.fit}`);
  for (const [k, v] of Object.entries(r.stats ?? {})) bits.push(`${k} +${v}`);
  if (r.inn) bits.push(`Innovation +${r.inn}`);
  if (r.rp) bits.push(`+${r.rp} RP`);
  if (r.repFirst) bits.push(`+${r.repFirst} Rep (first time)`);
  const look = lookOf(rule.id);
  if (look) bits.push(`New look: ${look.name}`);
  return bits.join(' · ');
}

// The builder's line for a combo that is one condition away, or null (hidden prestige combos give none).
//   known (found in any run): the exact missing thing;  otherwise: the vague clue
export function hintFor(near, known) {
  if (known) return { exact: true, text: `${near.rule.name}: needs ${describeCondition(near.missing)}` };
  if (near.rule.hidden || !near.rule.hint) return null;
  return { exact: false, text: near.rule.hint };
}
