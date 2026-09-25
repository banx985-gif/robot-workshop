// What each signature trait does (data/traits.js → signature: { hook, params }). Every rule is written once,
// here, and runs at one named moment ("point") through core/StaffSystem.runSignatures(team, point, ctx):
//   faultChance    ctx { job, cx }                       while working out a day's fault chance (cx = total complexity used)
//   faultRoll      ctx { job, phase, allow }            a fault was rolled; set allow = false to stop it
//   phaseComplete  ctx { job, phase, fixFault() }       a stage has just finished
//   finish         ctx { job, stats, innovation, result } the robot is being finished (before Quality)
// Points with no caller yet: 'synergy' (Milestone 14), 'competition' (Milestone 12).
import { PROJECT_TIERS } from '../../data/phases.js';

const ELITE_MAX_CX = PROJECT_TIERS.find((t) => t.id === 'elite').maxCx;

export const SIGNATURE_HOOKS = {
  // Impossible Tolerances: on a Prestige build, complexity above the Elite limit adds no fault risk.
  prestigeFaultRisk: {
    point: 'faultChance',
    apply(ctx) {
      if (ctx.job.data.tier !== 'prestige') return false;
      ctx.cx = Math.min(ctx.cx, ELITE_MAX_CX);
    },
  },

  // Clean Code: no more than `max` faults ever found in this phase of the project.
  phaseFaultCap: {
    point: 'faultRoll',
    apply(ctx, p) {
      if (ctx.phase.id !== p.phase) return false;
      if ((ctx.job.data.faultsByPhase?.[p.phase] ?? 0) >= p.max) ctx.allow = false;
    },
  },

  // Built Once: when this phase ends, fix `count` open faults.
  phaseExtraFix: {
    point: 'phaseComplete',
    apply(ctx, p) {
      if (ctx.phase.id !== p.phase) return false;
      for (let i = 0; i < p.count; i++) ctx.fixFault();
    },
  },

  // Icon Maker, Ghost Logic, Unbreakable: flat stats / Innovation on the finished robot, optionally only
  // for a project tier or when a given part is used.
  finishBonus: {
    point: 'finish',
    apply(ctx, p) {
      const d = ctx.job.data;
      if (p.whenTier && d.tier !== p.whenTier) return false;
      if (p.whenPart && !Object.values(d.components).includes(p.whenPart)) return false;
      for (const [k, v] of Object.entries(p.stats ?? {})) ctx.stats[k] = Math.min(999, Math.max(0, ctx.stats[k] + v));
      ctx.innovation += p.innovation ?? 0;
    },
  },

  // Future Form: the robot keeps more demand at the Premium price (read by src/systems/Sales.js).
  premiumDemand: {
    point: 'finish',
    apply(ctx, p) {
      ctx.result.premiumDemandMult = Math.max(ctx.result.premiumDemandMult ?? 0, p.demandMult);
    },
  },

  // Stored until their systems exist.
  synergyBonusPct: { point: 'synergy', apply: () => false }, // Master Integrator (Milestone 14)
  competitionScorePct: { point: 'competition', apply: () => false }, // Perfect Line (Milestone 12)
  aggressiveStrategy: { point: 'competition', apply: () => false }, // Beyond Redline (Milestone 12)
};
