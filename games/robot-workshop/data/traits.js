// Shared trait pool (bible §9.8). Plain data only.
// `effects` holds the numbers a system reads. Wired so far:
//   xpGainPct (Quick Learner), energyLossPct (Workhorse), moraleFloor (Loyal)      — staff rules
//   phaseFaultPct (Debugger, Fabricator), noPushStreakPenalty (Night Owl)          — robot projects
// The rest are listed for display and get wired when their systems arrive.
export const TRAITS = {
  quickLearner: { name: 'Quick Learner', description: '+20% XP gained', effects: { xpGainPct: 20 } },
  workhorse: { name: 'Workhorse', description: '-20% Energy loss while assigned', effects: { energyLossPct: -20 } },
  perfectionist: { name: 'Perfectionist', description: '+8% quality gain, +6% phase time' },
  frugal: { name: 'Frugal', description: '-8% phase cash cost' },
  inventive: { name: 'Inventive', description: '+25% breakthrough chance contribution' },
  teamPlayer: { name: 'Team Player', description: '+3% effective stats to other team members' },
  specialist: { name: 'Specialist', description: '+12% output in role-matching phase, -5% elsewhere' },
  calmUnderPressure: { name: 'Calm Under Pressure', description: 'Halves competition stress penalty' },
  reliabilityNut: { name: 'Reliability Nut', description: '+10% reliability contribution' },
  speedFreak: { name: 'Speed Freak', description: '+10% speed contribution, -4% reliability contribution' },
  marketSense: { name: 'Market Sense', description: '+8% appeal/sales-fit contribution' },
  debugger: { name: 'Debugger', description: '-20% software fault chance', effects: { phaseFaultPct: { software: -20 } } },
  fabricator: { name: 'Fabricator', description: '-15% assembly fault chance', effects: { phaseFaultPct: { assembly: -15 } } },
  tuner: { name: 'Tuner', description: '+10% competition tuning effectiveness' },
  mentor: { name: 'Mentor', description: 'Lower-level teammates gain +15% XP' },
  loyal: { name: 'Loyal', description: '+5 morale floor; counts double for loyalty secrets', effects: { moraleFloor: 5 } },
  riskTaker: { name: 'Risk Taker', description: '+10% aggressive-strategy ceiling, +5% breakdown risk' },
  allRounder: { name: 'All-Rounder', description: '+6% to non-primary role contributions' },
  nightOwl: { name: 'Night Owl', description: 'No morale penalty from extended project streaks', effects: { noPushStreakPenalty: true } },
  celebrity: { name: 'Celebrity', description: '+4% sponsor/reputation rewards' },
};
