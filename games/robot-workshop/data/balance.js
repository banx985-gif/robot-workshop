// Robot Workshop tuning numbers. Plain values only; the formulas that use them live in code (§42.5).

// Calendar (§4.1, §4.2): Pause / 1× / 2× / 4× (Milestone 5 fix; Milestone 2 used 1×/2×/3×).
export const CALENDAR = {
  daysPerMonth: 28,
  monthsPerYear: 12,
  secondsPerDay: 2.5, // real seconds per game day at 1×
  speeds: [1, 2, 4],
  campaignYears: 16, // first-run ending: end of Year 16, Month 12
};

// §4.2 speed unlocks: 2× after the first commercial launch; 4× at Company Rank C or after Year 3, whichever is first.
export const SPEED_UNLOCKS = {
  2: { flag: 'firstLaunch', hint: 'Unlocks after your first launch' },
  4: { rank: 'C', afterYear: 3, hint: 'Unlocks at Rank C or after Year 3' },
};

// Staff rules (§9.2, §9.3, §9.5).
export const STAFF_RULES = {
  startEnergy: 100, // not set in the bible — Milestone 2 choice
  startMorale: 75, // not set in the bible — Milestone 2 choice
  workEnergyLoss: { min: 0.7, max: 1.5 },
  restEnergyGain: 4,
  tiredBelow: 25,
  stressedBelow: 25,
  inspired: { moraleAbove: 85, energyAbove: 65, dailyChance: 0.05 },
  unassignedMorale: { afterMonths: 2, perMonth: -5 },
  levelCap: 30,
  xpCurve: { base: 80, perLevel: 25, perLevelSq: 5 },
  levelUp: { primaryMin: 4, primaryMax: 8, otherCount: 2, otherMin: 1, otherMax: 4 },
  workMultiplier: { base: 0.7, energyDiv: 250, moraleDiv: 500, min: 0.65, max: 1.3 },
};

// Robot projects (bible §10.6–§10.11, §9.3, §9.5, §9.7). Numbers marked "M3 choice" are not given
// in the bible and are first guesses until the balance pass (Milestone 28).
export const PROJECT_RULES = {
  // §10.6: progressPerGameDay = 8 + phaseTeamScore / 75, then × progressScale.
  // progressScale is the Milestone 4 pacing fix: a Starter project with the 3 starters takes ~2 game months.
  progressBase: 8,
  progressDivisor: 75,
  progressScale: 6.5,
  teamSlots: 5, // §9.7
  roleMatchBonusPct: 8, // §9.7: a worker whose role matches the phase → +8% phase efficiency

  // §10.8 faults: base 2.5% a day in Engineering / Software / Assembly
  faultBaseChance: 0.025,
  faultComplexityPct: 10, // M3 choice: +10% fault chance per average part complexity above 1
  faultDeficit: { expectedScore: 60, maxExtraPct: 100 }, // M3 choice: weak team (score below 60) → up to double chance
  faultReliabilityPenalty: 3,
  faultQualityPenalty: 1.5,
  testingFix: { perScore: 1 / 150, min: 0.2, max: 0.8 }, // M3 choice: chance to fix each fault at the end of Testing

  // Stat gains from team work: gain = phase average team score × phase gain share × gainScale (M3 choice)
  gainScale: 0.8, // M4 retune for the shorter projects (fresher staff score higher)
  fitScale: 0.8, // M3 choice: FIT = Concept average score × 0.8, max 100
  phaseQualityBonus: { perScore: 1 / 25, maxPerPhase: 5 }, // up to +25 Quality over 5 phases (M4 retune)

  // §10.9 breakthroughs (stub: rolled and logged only)
  breakthroughCheckAt: 0.6,
  breakthroughBaseChance: 0.04,
  breakthroughCap: 0.35,

  // §10.11 review variance
  reviewVariance: 0.35,

  // §9.3 XP from phase contribution (M3 choice): 20 + the worker's average phase score
  phaseXp: { base: 20, perScore: 1 },
  // §9.5 morale
  successMorale: { min: 3, max: 8 },
  // Bible says -1/day after 7 Push days; halved in M4 so one ~2-month Push project costs ~25 Morale, not ~50.
  pushStreak: { afterDays: 7, moralePerDay: -0.5 },
};

export const CAMPAIGN_SEED = 'robot-workshop-run-1';
export const SAVE_VERSION = 8; // v2 projects + history, v3 money, products, reputation, v4 8-segment market + contracts, v5 first-time guide, v6 workshop layout, v7 research, v8 hiring + training
