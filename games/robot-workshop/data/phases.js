// The five development phases (bible §10.6), project tiers (§11.7) and budget focus (§10.7).
//
// weights: how much each work stat counts in this phase (the bible's percentages as fractions).
// gains:   which robot stats this phase improves, and how strongly (share of the phase's team score).
//          The bible lists each phase's outputs; the share numbers are Milestone 3 choices.
// faults:  whether faults can appear during this phase (§10.8).
// roleMatch: the role that gives the +8% phase bonus (§9.7).
export const PHASES = [
  {
    id: 'concept',
    roleMatch: 'designer',
    name: 'Concept',
    weights: { des: 0.6, eng: 0.2, prg: 0.1, tst: 0.1 },
    gains: { APL: 1.0 },
    innovationShare: 0.1, // Innovation seed
    setsFit: true,
    faults: false,
  },
  {
    id: 'engineering',
    roleMatch: 'engineer',
    name: 'Engineering',
    weights: { eng: 0.6, fab: 0.2, des: 0.1, prg: 0.1 },
    gains: { PWR: 0.8, END: 0.8, REL: 0.6 },
    faults: true,
  },
  {
    id: 'software',
    roleMatch: 'programmer',
    name: 'Software & Control',
    weights: { prg: 0.6, eng: 0.15, tst: 0.15, des: 0.1 },
    gains: { INT: 1.0, CTL: 0.8 },
    faults: true,
  },
  {
    id: 'assembly',
    roleMatch: 'mechanic',
    name: 'Assembly & Finish',
    weights: { fab: 0.6, eng: 0.15, des: 0.15, prg: 0.1 },
    gains: { REL: 0.8, APL: 0.6 },
    faults: true,
  },
  {
    id: 'testing',
    roleMatch: 'pilot',
    name: 'Testing & Tuning',
    weights: { tst: 0.6, prg: 0.15, eng: 0.15, fab: 0.1 },
    gains: { SPD: 0.6, CTL: 0.5, REL: 0.6 },
    faults: false,
    removesFaults: true,
  },
];

// Project tier from total part complexity (§11.7) and the work target for every phase (§10.6).
export const PROJECT_TIERS = [
  { id: 'starter', name: 'Starter', maxCx: 11, phaseTarget: 700 },
  { id: 'standard', name: 'Standard', maxCx: 19, phaseTarget: 1100 },
  { id: 'advanced', name: 'Advanced', maxCx: 29, phaseTarget: 1700 },
  { id: 'elite', name: 'Elite', maxCx: 39, phaseTarget: 2500 },
  { id: 'prestige', name: 'Prestige', maxCx: Infinity, phaseTarget: 3400 },
];

// Budget focus (§10.7). Percent changes against Balanced.
export const BUDGET_FOCUS = {
  lean: { id: 'lean', name: 'Lean', costPct: -20, qualityGainPct: -8, faultChancePct: 5, energyDrainPct: 0 },
  balanced: { id: 'balanced', name: 'Balanced', costPct: 0, qualityGainPct: 0, faultChancePct: 0, energyDrainPct: 0 },
  push: { id: 'push', name: 'Push Quality', costPct: 25, qualityGainPct: 10, faultChancePct: -5, energyDrainPct: 10 },
};
export const BUDGET_ORDER = ['lean', 'balanced', 'push'];
