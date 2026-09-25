// Robot Workshop rules for a robot project, plugged into the shared ProjectSystem as hooks.
// Robot stats (§10.4, §10.10), phase gains, faults (§10.8), breakthrough stub (§10.9),
// budget focus (§10.7), Innovation / Fit / Quality / review (§10.11) and the visual family (§13).
//
// Formulas finished in Milestone 6 (the bible leaves these open; marked "M6 choice"):
//   Innovation = Concept-phase seed + the parts' INN values (+ breakthroughs, later)
//   Fit        = Concept team fit × purpose match, where purpose match = weightedPurposeScore ÷ plain
//                average of the seven stats, capped at 1. A robot whose strong stats are the ones its
//                purpose cares about keeps full Fit; one strong in the wrong places loses Fit.
//   Quality    = §10.11 exactly;  review = Quality ÷ 10 ± seeded 0.35 (§10.11)
import { PURPOSES } from '../../data/purposes.js';
import { COMPONENTS, SLOTS } from '../../data/components.js';
import { PHASES, PROJECT_TIERS, BUDGET_FOCUS } from '../../data/phases.js';
import { ROBOT_STAT_KEYS } from '../../data/stats.js';
import { PROJECT_RULES } from '../../data/balance.js';
import { robotVisual } from './robotVisual.js';

const R = PROJECT_RULES;

export class RobotBuildSystem {
  constructor({ rng, staff, traits, bus = null, now = () => null }) {
    this.rng = rng;
    this.staff = staff; // StaffSystem
    this.traits = traits;
    this.bus = bus;
    this.now = now;
  }

  // --- set-up ---------------------------------------------------------------
  partsOf(components) {
    return SLOTS.map((s) => COMPONENTS[components[s.id]]);
  }

  totalComplexity(components) {
    return this.partsOf(components).reduce((t, p) => t + p.cx, 0);
  }

  tierFor(components) {
    const cx = this.totalComplexity(components);
    return PROJECT_TIERS.find((t) => cx <= t.maxCx);
  }

  buildCost(components) {
    return this.partsOf(components).reduce((t, p) => t + p.cost, 0);
  }

  // Innovation that comes with the parts themselves (e.g. Learning AI INN +5).
  partInnovation(components) {
    return this.partsOf(components).reduce((t, p) => t + (p.inn ?? 0), 0);
  }

  // Extra daily fault chance from parts, as a fraction (Experimental Chassis: base fault +3%).
  partFaultChance(components) {
    return this.partsOf(components).reduce((t, p) => t + (p.faultPct ?? 0), 0) / 100;
  }

  // Legal build: one existing part in each of the six slots, each in its own slot.
  isLegal(purposeId, components) {
    return !!PURPOSES[purposeId] && SLOTS.every((s) => COMPONENTS[components?.[s.id]]?.slot === s.id);
  }

  // §10.11 weighted average of the seven stats with the purpose weights (weights sum to 100).
  weightedScore(purposeId, stats) {
    let w = 0;
    for (const [k, weight] of Object.entries(PURPOSES[purposeId].weights)) w += (stats[k] * weight) / 100;
    return w;
  }

  // M6 choice: how well the robot's strengths line up with its purpose, 0..1 (1 = no Fit lost).
  purposeMatch(purposeId, stats) {
    let sum = 0;
    for (const k of ROBOT_STAT_KEYS) sum += stats[k];
    const mean = sum / ROBOT_STAT_KEYS.length;
    if (mean <= 0) return 0;
    return clamp(this.weightedScore(purposeId, stats) / mean, 0, 1);
  }

  baseStats(components) {
    const out = Object.fromEntries(ROBOT_STAT_KEYS.map((k) => [k, 0]));
    for (const p of this.partsOf(components)) for (const [k, v] of Object.entries(p.stats)) out[k] += v;
    return out;
  }

  // Makes (but does not start) a robot job on the ProjectSystem.
  createProject(projects, history, { purposeId, components, budgetFocus = 'balanced' }) {
    const purpose = PURPOSES[purposeId];
    const tier = this.tierFor(components);
    const made = history.filter((r) => r.result?.purpose === purposeId).length;
    const running = projects.jobs.filter((j) => j.data.purpose === purposeId).length;
    return projects.createJob({
      type: 'robot',
      name: `${purpose.shortName} Mk ${made + running + 1}`,
      phaseTarget: tier.phaseTarget,
      slots: R.teamSlots,
      data: {
        purpose: purposeId,
        components: { ...components },
        budgetFocus,
        pendingFocus: null,
        tier: tier.id,
        totalCx: this.totalComplexity(components),
        buildCost: this.buildCost(components),
        gains: Object.fromEntries(ROBOT_STAT_KEYS.map((k) => [k, 0])),
        innovation: 0,
        fit: 0,
        qualityBonus: 0,
        faults: [], // open faults: { id, phase, day }
        faultsFound: 0,
        faultsFixed: 0,
        nextFaultId: 1,
        breakthroughs: [], // stub log: { phase, day, chance, hit }
      },
    });
  }

  // Budget focus can only change between phases: at a phase start it applies now, otherwise next phase.
  setFocus(job, focusId) {
    if (!BUDGET_FOCUS[focusId]) return;
    if (job.phaseDay === 0) {
      job.data.budgetFocus = focusId;
      job.data.pendingFocus = null;
    } else {
      job.data.pendingFocus = focusId === job.data.budgetFocus ? null : focusId;
    }
  }

  focusOf(job) {
    return BUDGET_FOCUS[job.data.budgetFocus];
  }

  // --- live numbers ---------------------------------------------------------
  currentStats(job) {
    const base = this.baseStats(job.data.components);
    const out = {};
    for (const k of ROBOT_STAT_KEYS) out[k] = base[k] + job.data.gains[k];
    out.REL -= job.data.faults.length * R.faultReliabilityPenalty;
    for (const k of ROBOT_STAT_KEYS) out[k] = clamp(Math.round(out[k]), 0, 999);
    return out;
  }

  faultChance(job, phase, teamScore) {
    const d = job.data;
    const avgCx = d.totalCx / SLOTS.length;
    let chance = R.faultBaseChance + this.partFaultChance(d.components);
    chance *= 1 + (R.faultComplexityPct / 100) * (avgCx - 1);
    const deficit = Math.max(0, R.faultDeficit.expectedScore - teamScore) / R.faultDeficit.expectedScore;
    chance *= 1 + (deficit * R.faultDeficit.maxExtraPct) / 100;
    chance *= 1 + this.focusOf(job).faultChancePct / 100;
    // Relevant traits on the team (each trait counts once).
    const seen = new Set();
    for (const id of job.slots) {
      const s = id && this.staff.get(id);
      if (!s) continue;
      for (const t of s.traits) {
        if (seen.has(t)) continue;
        seen.add(t);
        const pct = this.traits[t]?.effects?.phaseFaultPct?.[phase.id];
        if (pct) chance *= 1 + pct / 100;
      }
    }
    return chance;
  }

  // --- ProjectSystem hooks --------------------------------------------------
  hooks() {
    return {
      now: () => this.now(),

      // §9.7: a worker whose role matches the phase → +8% for the whole team.
      workerModifier: (job, phase) => {
        const match = job.slots.some((id) => id && this.staff.get(id)?.role === phase.roleMatch);
        return match ? 1 + R.roleMatchBonusPct / 100 : 1;
      },

      onDay: (job, phase, { score }) => {
        if (!phase.faults) return;
        if (this.rng.chance(this.faultChance(job, phase, score))) {
          const d = job.data;
          d.faults.push({ id: d.nextFaultId++, phase: phase.id, day: job.day });
          d.faultsFound++;
          this.bus?.emit('robot:fault', { job, phase });
        }
      },

      // Breakthrough stub: roll once at 60% of each phase and log it. Effects come later.
      onCheckpoint: (job, phase, frac) => {
        if (frac !== R.breakthroughCheckAt) return;
        const chance = Math.min(R.breakthroughCap, R.breakthroughBaseChance);
        const hit = this.rng.chance(chance);
        job.data.breakthroughs.push({ phase: phase.id, day: job.day, chance, hit });
        this.bus?.emit('robot:breakthroughRoll', { job, phase, hit });
      },

      onPhaseComplete: (job, phase, summary) => {
        const d = job.data;
        const q = 1 + this.focusOf(job).qualityGainPct / 100;
        const avg = summary.avgScore;
        for (const [k, share] of Object.entries(phase.gains)) d.gains[k] += Math.round(avg * share * R.gainScale * q);
        if (phase.innovationShare) d.innovation = round1(d.innovation + avg * phase.innovationShare * q);
        if (phase.setsFit) d.fit = Math.min(100, Math.round(avg * R.fitScale));
        d.qualityBonus = round1(d.qualityBonus + Math.min(R.phaseQualityBonus.maxPerPhase, avg * R.phaseQualityBonus.perScore) * q);

        if (phase.removesFaults && d.faults.length) {
          const p = clamp(avg * R.testingFix.perScore, R.testingFix.min, R.testingFix.max);
          const before = d.faults.length;
          d.faults = d.faults.filter(() => !this.rng.chance(p));
          d.faultsFixed += before - d.faults.length;
        }

        // XP for everyone who worked this phase (§9.3 "project phase contribution").
        for (const [id, w] of Object.entries(summary.workers)) {
          this.staff.addXp(id, Math.round(R.phaseXp.base + w.avgScore * R.phaseXp.perScore));
        }
      },

      onPhaseStart: (job) => {
        const d = job.data;
        if (d.pendingFocus) {
          d.budgetFocus = d.pendingFocus;
          d.pendingFocus = null;
        }
      },

      onComplete: (job) => {
        const result = this.finalize(job);
        for (const id of job.slots) {
          const s = id && this.staff.get(id);
          if (s) this.staff.changeMorale(s, this.rng.int(R.successMorale.min, R.successMorale.max));
        }
        return result;
      },
    };
  }

  // §10.11 Quality and review.
  finalize(job) {
    const d = job.data;
    const purpose = PURPOSES[d.purpose];
    const stats = this.currentStats(job);
    const weighted = this.weightedScore(d.purpose, stats);
    const innovation = round1(d.innovation + this.partInnovation(d.components));
    const match = this.purposeMatch(d.purpose, stats);
    const fit = Math.min(100, Math.round(d.fit * match));
    const quality = round1(clamp(weighted / 6.5 + innovation * 0.2 + d.qualityBonus - d.faults.length * R.faultQualityPenalty, 0, 100));
    const variance = this.rng.range(-R.reviewVariance, R.reviewVariance);
    const review = round1(clamp(quality / 10 + variance, 1, 10));
    const visual = robotVisual(d.purpose, []); // synergies arrive in Milestone 14
    return {
      purpose: d.purpose,
      purposeName: purpose.name,
      components: { ...d.components },
      budgetFocus: d.budgetFocus,
      tier: d.tier,
      totalCx: d.totalCx,
      buildCost: d.buildCost,
      stats,
      weightedScore: round1(weighted),
      innovation,
      purposeMatch: Math.round(match * 1000) / 1000,
      fit,
      visual: visual.id,
      quality,
      review,
      faults: d.faults.length,
      faultsFound: d.faultsFound,
      faultsFixed: d.faultsFixed,
      breakthroughs: d.breakthroughs.filter((b) => b.hit).length,
    };
  }
}

export { PHASES };

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

function round1(v) {
  return Math.round(v * 10) / 10;
}
