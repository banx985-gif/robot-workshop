// Traits (bible §9.8) and the ten signature traits of the legendary/secret staff (§15). Plain data only.
//   name         shown on chips
//   description  plain English for the staff detail screen
//   effects      the numbers systems read (core/StaffSystem traitEffect / groupEffect):
//     worker:  xpGainPct, energyLossPct, moraleFloor (StaffSystem) · roleMatchPct / offRolePct (Specialist) ·
//              offPrimaryPct (All-Rounder) · teamStatPct (Team Player, given to the others on the team)
//     team:    each trait counts once per project team — qualityGainPct, phaseTimePct, runningCostPct,
//              breakthroughPct, gainPct { robot stat: % }, fitPct, phaseFaultPct { phase: % },
//              mentorXpPct (lower-level teammates), noPushStreakPenalty
//     company: reputationPct (anyone on staff)
//     pilot:   stressPenaltyPct, tuningPct, aggressiveCeilingPct, breakdownRiskPct — read for the pilot of a competition
//              entry (Milestone 12, src/systems/CompetitionRules.js)
//   later        the system that reads the rest of this trait isn't built yet (words for the detail screen);
//                its numbers are stored now: sponsorRewardPct (sponsors), loyaltyWeight (secrets)
//   signature    { hook, params }: a named rule written once in src/systems/signatureHooks.js
export const TRAITS = {
  quickLearner: {
    name: 'Quick Learner',
    description: 'Picks things up fast: earns 20% more XP from everything.',
    effects: { xpGainPct: 20 },
  },
  workhorse: {
    name: 'Workhorse',
    description: 'Loses 20% less Energy while working.',
    effects: { energyLossPct: -20 },
  },
  perfectionist: {
    name: 'Perfectionist',
    description: 'The team gains 8% more Quality from each stage, but every stage takes 6% longer.',
    effects: { qualityGainPct: 8, phaseTimePct: 6 },
  },
  frugal: {
    name: 'Frugal',
    description: 'Keeps an eye on money: the project’s daily running cost is 8% lower.',
    effects: { runningCostPct: -8 },
  },
  inventive: {
    name: 'Inventive',
    description: 'Full of ideas: the team’s breakthrough chance is 25% higher.',
    effects: { breakthroughPct: 25 },
  },
  teamPlayer: {
    name: 'Team Player',
    description: 'Lifts everyone else on the project: their work counts 3% more.',
    effects: { teamStatPct: 3 },
  },
  specialist: {
    name: 'Specialist',
    description: 'Works 12% better in their own role’s stage, 5% worse in the others.',
    effects: { roleMatchPct: 12, offRolePct: -5 },
  },
  calmUnderPressure: {
    name: 'Calm Under Pressure',
    description: 'As a pilot: keeps a cool head, so competition stress hurts only half as much.',
    effects: { stressPenaltyPct: -50 },
  },
  reliabilityNut: {
    name: 'Reliability Nut',
    description: 'Checks everything twice: the robot gains 10% more Reliability.',
    effects: { gainPct: { REL: 10 } },
  },
  speedFreak: {
    name: 'Speed Freak',
    description: 'Loves going fast: +10% Speed gains, but 4% less Reliability.',
    effects: { gainPct: { SPD: 10, REL: -4 } },
  },
  marketSense: {
    name: 'Market Sense',
    description: 'Knows what buyers want: +8% Appeal gains and +8% Fit.',
    effects: { gainPct: { APL: 8 }, fitPct: 8 },
  },
  debugger: {
    name: 'Debugger',
    description: 'Catches bugs early: 20% fewer faults during Software & Control.',
    effects: { phaseFaultPct: { software: -20 } },
  },
  fabricator: {
    name: 'Fabricator',
    description: 'Neat hands: 15% fewer faults during Assembly & Finish.',
    effects: { phaseFaultPct: { assembly: -15 } },
  },
  tuner: {
    name: 'Tuner',
    description: 'As a pilot: gets 10% more out of competition tuning.',
    effects: { tuningPct: 10 },
  },
  mentor: {
    name: 'Mentor',
    description: 'Teaches as they go: lower-level teammates on the same project earn 15% more XP.',
    effects: { mentorXpPct: 15 },
  },
  loyal: {
    name: 'Loyal',
    description: 'Morale never drops below 5. Loyalty counts double for some secrets.',
    effects: { moraleFloor: 5, loyaltyWeight: 2 },
  },
  riskTaker: {
    name: 'Risk Taker',
    description: 'As a pilot: Aggressive runs can reach 10% higher, but breakdowns are 5% more likely.',
    effects: { aggressiveCeilingPct: 10, breakdownRiskPct: 5 },
  },
  allRounder: {
    name: 'All-Rounder',
    description: 'Good at a bit of everything: their skills outside their main one count 6% more.',
    effects: { offPrimaryPct: 6 },
  },
  nightOwl: {
    name: 'Night Owl',
    description: 'Never loses Morale from long Push Quality streaks.',
    effects: { noPushStreakPenalty: true },
  },
  celebrity: {
    name: 'Celebrity',
    description: 'A famous face: launches and contracts earn 4% more reputation (and sponsors, later).',
    effects: { reputationPct: 4, sponsorRewardPct: 4 },
  },

  // --- signature traits (one each, legendary §15 rows 09 and secret rows 10) ---
  masterIntegrator: {
    name: 'Master Integrator',
    description: 'Signature: every component synergy bonus is 10% stronger.',
    signature: { hook: 'synergyBonusPct', params: { pct: 10 } },
    later: 'synergies',
  },
  impossibleTolerances: {
    name: 'Impossible Tolerances',
    description: 'Signature: Prestige-tier complexity adds no extra fault risk.',
    signature: { hook: 'prestigeFaultRisk', params: {} },
  },
  iconMaker: {
    name: 'Icon Maker',
    description: 'Signature: every robot they help finish gets +12 Appeal.',
    signature: { hook: 'finishBonus', params: { stats: { APL: 12 } } },
  },
  futureForm: {
    name: 'Future Form',
    description: 'Signature: robots they help make lose less demand at Premium price (×0.80 instead of ×0.68).',
    signature: { hook: 'premiumDemand', params: { demandMult: 0.8 } },
  },
  cleanCode: {
    name: 'Clean Code',
    description: 'Signature: a project never gets more than 1 software fault.',
    signature: { hook: 'phaseFaultCap', params: { phase: 'software', max: 1 } },
  },
  ghostLogic: {
    name: 'Ghost Logic',
    description: 'Signature: +20 Intelligence and +10 Innovation when the robot uses the Experimental Neural Core (AI08).',
    signature: { hook: 'finishBonus', params: { stats: { INT: 20 }, innovation: 10, whenPart: 'AI08' } },
  },
  builtOnce: {
    name: 'Built Once',
    description: 'Signature: the Assembly stage always fixes one extra fault.',
    signature: { hook: 'phaseExtraFix', params: { phase: 'assembly', count: 1 } },
  },
  unbreakable: {
    name: 'Unbreakable',
    description: 'Signature: +25 Reliability on Prestige-tier builds.',
    signature: { hook: 'finishBonus', params: { stats: { REL: 25 }, whenTier: 'prestige' } },
  },
  perfectLine: {
    name: 'Perfect Line',
    description: 'Signature: +8% competition base score.',
    signature: { hook: 'competitionScorePct', params: { pct: 8 } },
  },
  beyondRedline: {
    name: 'Beyond Redline',
    description: 'Signature: Aggressive strategy gives +14% instead of +8%, with no extra Morale cost.',
    signature: { hook: 'aggressiveStrategy', params: { bonusPct: 14, noMoralePenalty: true } },
  },
};

// The 20 shared traits of §9.8 (candidates roll from these; signature traits are never rolled).
export const NORMAL_TRAITS = Object.keys(TRAITS).filter((t) => !TRAITS[t].signature);

// Words for "later" systems on the detail screen.
export const LATER_WORDS = {
  synergies: 'Works once synergies are discovered',
};
