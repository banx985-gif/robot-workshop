// "What could the team build right now?" — used to set contract requirements that are always possible,
// and for the "can my robots meet this?" hint.
// Picks a reference build from the open parts (the best parts for the purpose that fit the project size —
// so it stays affordable — pushed up to a complexity floor if asked, with a required part if asked),
// then predicts its stats, Quality and project length with
// the same formulas the real project uses, for the current staff at their current strength (Balanced budget,
// no faults, no breakthroughs). No random numbers are used.
import { COMPONENTS, SLOTS } from '../../data/components.js';
import { PURPOSES } from '../../data/purposes.js';
import { PHASES } from '../../data/phases.js';
import { ROBOT_STAT_KEYS } from '../../data/stats.js';
import { PROJECT_RULES } from '../../data/balance.js';

const R = PROJECT_RULES;

// How useful a part is for a purpose: its stats weighted by the purpose weights.
function partValue(part, weights) {
  let v = 0;
  for (const [k, n] of Object.entries(part.stats)) v += (weights[k] ?? 0) * n;
  return v;
}

// openParts: Set of part ids the player may use. maxCx: the size band's top (e.g. Starter 11): parts are
// kept to about maxCx ÷ 6 complexity each, so the build costs what a project of that size should.
// Returns null if the floor/required part can't be met.
export function referenceBuild({ purposeId, openParts, minCx = 0, maxCx = Infinity, requiredPart = null }) {
  const weights = PURPOSES[purposeId].weights;
  const forcedSlot = requiredPart ? COMPONENTS[requiredPart]?.slot : null;
  if (requiredPart && (!forcedSlot || !openParts.has(requiredPart))) return null;
  const perSlot = Number.isFinite(maxCx) ? Math.max(1, Math.ceil(maxCx / 6)) : 10;
  const options = {};
  const pick = {};
  for (const s of SLOTS) {
    options[s.id] = Object.values(COMPONENTS).filter((c) => c.slot === s.id && openParts.has(c.id));
    if (!options[s.id].length) return null;
    const fits = options[s.id].filter((c) => c.cx <= perSlot);
    const pool = fits.length ? fits : [options[s.id].reduce((a, b) => (b.cx < a.cx ? b : a))];
    pick[s.id] = s.id === forcedSlot ? COMPONENTS[requiredPart] : pool.reduce((a, b) => (partValue(b, weights) > partValue(a, weights) ? b : a));
  }
  const cx = () => SLOTS.reduce((t, s) => t + pick[s.id].cx, 0);
  // Not complex enough for the contract size: swap in the next step up in complexity, best value first,
  // staying as close to the floor as possible (so the cost stays sensible).
  let guard = 0;
  while (cx() < minCx && guard++ < 60) {
    let best = null;
    for (const s of SLOTS) {
      if (s.id === forcedSlot) continue;
      for (const c of options[s.id]) {
        const step = c.cx - pick[s.id].cx;
        if (step <= 0) continue;
        const score = -Math.abs(step - (minCx - cx())) * 1000 + partValue(c, weights) - c.cost / 100;
        if (!best || score > best.score) best = { slot: s.id, part: c, score };
      }
    }
    if (!best) return null;
    pick[best.slot] = best.part;
  }
  if (cx() < minCx) return null;
  return Object.fromEntries(SLOTS.map((s) => [s.id, pick[s.id].id]));
}

// Predict a finished robot for this build with the whole current team working on it, with today's facilities.
// commercial: a commercial model gets commercial-only facility bonuses (contract builds do not).
export function predictBuild(campaign, purposeId, components, { commercial = false } = {}) {
  const rb = campaign.robots;
  const team = campaign.staff.staff;
  const fake = { slots: team.map((s) => s.id), data: { components } };
  const base = rb.baseStats(components);
  const gains = Object.fromEntries(ROBOT_STAT_KEYS.map((k) => [k, 0]));
  const tier = rb.tierFor(components);
  let innovation = 0;
  let bonus = 0;
  let fit = 0;
  let days = 0;
  for (const phase of PHASES) {
    let score = 0;
    for (const s of team) score += campaign.projects.workerScore(fake, phase, s);
    for (const [k, share] of Object.entries(phase.gains)) gains[k] += Math.round(score * share * R.gainScale * rb.gainMultiplier(k));
    if (phase.innovationShare) innovation += score * phase.innovationShare;
    if (phase.setsFit) fit = Math.min(100, Math.round(score * R.fitScale));
    bonus += Math.min(R.phaseQualityBonus.maxPerPhase, score * R.phaseQualityBonus.perScore);
    const perDay = (R.progressBase + score / R.progressDivisor) * R.progressScale * rb.progressMultiplier(phase);
    days += Math.ceil(tier.phaseTarget / perDay);
  }
  const stats = {};
  for (const k of ROBOT_STAT_KEYS) stats[k] = Math.min(999, Math.max(0, base[k] + gains[k] + rb.facilityStat(k, commercial)));
  innovation += rb.partInnovation(components);
  const weighted = rb.weightedScore(purposeId, stats);
  const quality = Math.min(100, Math.max(0, weighted / 6.5 + innovation * 0.2 + bonus));
  return {
    components,
    stats,
    quality: Math.round(quality * 10) / 10,
    fit: Math.round(fit * rb.purposeMatch(purposeId, stats)),
    totalCx: rb.totalComplexity(components),
    tier: tier.id,
    days,
  };
}

// Both steps together; null if no build can meet the floor / required part.
export function estimateBest(campaign, { purposeId, openParts, minCx = 0, maxCx = Infinity, requiredPart = null }) {
  const components = referenceBuild({ purposeId, openParts, minCx, maxCx, requiredPart });
  return components ? predictBuild(campaign, purposeId, components) : null;
}
