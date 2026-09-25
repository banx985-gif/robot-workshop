// Robot Workshop's rules for the shared ContractSystem (bible §14.6, §14.7):
// making random offers, making the signature contracts, and checking a delivered robot.
// ctx (from Campaign.contractContext()): { campaign, year, month, openPurposes, openParts, rankIndex }
import { CONTRACT_RULES as CR, SIGNATURE_CONTRACTS } from '../../data/contracts.js';
import { SEGMENTS, PURPOSE_SEGMENTS } from '../../data/segments.js';
import { PURPOSES } from '../../data/purposes.js';
import { COMPONENTS } from '../../data/components.js';
import { PROJECT_TIERS } from '../../data/phases.js';
import { RANKS } from '../../data/economy.js';
import { estimateBest } from './Capability.js';

const SEG = Object.fromEntries(SEGMENTS.map((s) => [s.id, s]));
const TIER_ORDER = PROJECT_TIERS.map((t) => t.id);

const tierMax = (tier) => PROJECT_TIERS.find((t) => t.id === tier).maxCx;
const reached = (ctx, when) => ctx.year > when.year || (ctx.year === when.year && ctx.month >= when.month);

// The purpose's most important stats (by weight), best first.
function topStats(purposeId, n) {
  return Object.entries(PURPOSES[purposeId].weights)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k);
}

// Terms from a reference build: requirements = a share of what the team could build now.
function termsFrom(est, { purposeId, segment, stats, difficulty, tier, requiredPart }) {
  const minStats = {};
  for (const k of stats) minStats[k] = Math.max(5, Math.floor((est.stats[k] * difficulty) / 5) * 5);
  const minQuality = Math.max(1, Math.floor(est.quality * CR.qualityDifficulty));
  const minCx = CR.tierMinCx[tier];
  const deadlineDays = Math.max(CR.deadline.minDays, Math.ceil(est.days * CR.deadline.perEstimatedDay + CR.deadline.extraDays));
  const p = CR.payout;
  const payout = Math.round((p.base + minQuality * p.perQuality + minCx * p.perComplexity) / p.roundTo) * p.roundTo;
  return {
    purpose: purposeId,
    segment,
    tier,
    minStats,
    minQuality,
    minCx,
    requiredPart: requiredPart ?? null,
    deadlineDays,
    payout,
    reputation: Math.round(CR.reputation.base + minQuality * CR.reputation.perQuality),
    failReputation: CR.failReputation[tier],
    specialChance: CR.special.chance,
    suggested: est.components, // the reference build (shown as a hint)
    estimate: { stats: est.stats, quality: est.quality, days: est.days },
  };
}

// Biggest tier the open parts (and rank) allow.
function reachableTiers(ctx) {
  const maxCx = ['chassis', 'mobility', 'ai', 'tool', 'power', 'special'].reduce((t, slot) => {
    let best = 0;
    for (const id of ctx.openParts) if (COMPONENTS[id].slot === slot) best = Math.max(best, COMPONENTS[id].cx);
    return t + best;
  }, 0);
  const sIndex = RANKS.findIndex((r) => r.id === 'S');
  return TIER_ORDER.filter((t) => CR.tierMinCx[t] <= maxCx && (t !== 'prestige' || ctx.rankIndex >= sIndex));
}

export function contractHooks() {
  return {
    story: () => SIGNATURE_CONTRACTS,

    storyReady: (def, ctx) => reached(ctx, def.appear) && ctx.openPurposes.includes(def.purpose),

    makeStory: (def, ctx) => {
      const tiers = reachableTiers(ctx);
      const tier = tiers.includes(def.tier) ? def.tier : tiers[tiers.length - 1];
      const requiredPart = def.requiredPart && ctx.openParts.has(def.requiredPart) ? def.requiredPart : null;
      const est = estimateBest(ctx.campaign, { purposeId: def.purpose, openParts: ctx.openParts, minCx: CR.tierMinCx[tier], maxCx: tierMax(tier), requiredPart });
      if (!est) return null; // try again next month
      const t = termsFrom(est, { purposeId: def.purpose, segment: def.segment, stats: def.stats, difficulty: def.difficulty, tier, requiredPart });
      t.payout = Math.round((t.payout * def.payoutBonus) / CR.payout.roundTo) * CR.payout.roundTo;
      t.reputation += def.repBonus;
      return { ...t, title: def.name, customer: def.customer, blurb: def.blurb, setsFlag: def.setsFlag ?? null };
    },

    generate: (ctx, rng) => {
      if (!reached(ctx, CR.randomFrom) || !ctx.openPurposes.length) return null;
      const tiers = reachableTiers(ctx);
      const band = [...CR.tierByYear].reverse().find((b) => ctx.year >= b.fromYear);
      const weighted = [];
      for (const [t, w] of Object.entries(band.weights)) if (tiers.includes(t)) for (let i = 0; i < w; i++) weighted.push(t);
      const tier = rng.pick(weighted.length ? weighted : [tiers[tiers.length - 1] ?? 'starter']);
      const purposeId = rng.pick(ctx.openPurposes);
      const segment = rng.pick(PURPOSE_SEGMENTS[purposeId]);
      let requiredPart = null;
      if (rng.chance(CR.requiredPartChance)) {
        // a part that suits the contract size (no 20,000-credit prestige parts on a small job)
        const list = [...ctx.openParts].filter((id) => COMPONENTS[id].cx <= Math.ceil(tierMax(tier) / 6) + 1).sort();
        requiredPart = rng.pick(list) ?? null;
      }
      let est = estimateBest(ctx.campaign, { purposeId, openParts: ctx.openParts, minCx: CR.tierMinCx[tier], maxCx: tierMax(tier), requiredPart });
      if (!est && requiredPart) {
        requiredPart = null;
        est = estimateBest(ctx.campaign, { purposeId, openParts: ctx.openParts, minCx: CR.tierMinCx[tier], maxCx: tierMax(tier) });
      }
      if (!est) return null;
      const n = rng.int(CR.statCount[0], CR.statCount[1]);
      const stats = rng.shuffle(topStats(purposeId, CR.statsFrom)).slice(0, n);
      const difficulty = rng.range(CR.difficulty.min, CR.difficulty.max);
      const customer = rng.pick(SEG[segment].customers);
      const t = termsFrom(est, { purposeId, segment, stats, difficulty, tier, requiredPart });
      return { ...t, title: `${PURPOSES[purposeId].shortName} for ${customer}`, customer, blurb: null, setsFlag: null };
    },

    // deliverable: a finished robot's history record.
    check: (c, rec) => checkRecord(c, rec),
  };
}

// Requirements vs a finished robot. Returns { ok, failures: ['REL 140 (needs 150)', …] }.
export function checkRecord(c, rec) {
  const r = rec?.result;
  const failures = [];
  if (!r) return { ok: false, failures: ['no robot'] };
  if (rec.launchedProductId) failures.push('already on sale');
  if (rec.deliveredContractId && rec.deliveredContractId !== c.id) failures.push('already delivered to another contract');
  if (r.purpose !== c.purpose) failures.push(`needs a ${PURPOSES[c.purpose].name} robot`);
  for (const [k, min] of Object.entries(c.minStats)) if (r.stats[k] < min) failures.push(`${k} ${r.stats[k]} (needs ${min})`);
  if (r.quality < c.minQuality) failures.push(`Quality ${r.quality} (needs ${c.minQuality})`);
  if ((r.totalCx ?? 0) < c.minCx) failures.push(`complexity ${r.totalCx ?? '?'} (needs ${c.minCx})`);
  if (c.requiredPart && !Object.values(r.components).includes(c.requiredPart)) failures.push(`must use ${COMPONENTS[c.requiredPart].name}`);
  return { ok: failures.length === 0, failures };
}

// Short lines describing the requirements, for cards.
export function requirementLines(c) {
  const lines = [`${PURPOSES[c.purpose].name} robot · ${SEG[c.segment].name}`];
  lines.push(Object.entries(c.minStats).map(([k, v]) => `${k} ≥ ${v}`).concat(`Quality ≥ ${c.minQuality}`).join(' · '));
  const extra = [`complexity ≥ ${c.minCx}`];
  if (c.requiredPart) extra.push(`must use ${COMPONENTS[c.requiredPart].name}`);
  lines.push(extra.join(' · '));
  return lines;
}

export const segmentOf = (id) => SEG[id];
