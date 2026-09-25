// Competition tuning packages (bible §21.1) and strategies (§21.2). Plain data for core/CompetitionSystem.js.
//
// Tuning: bought for one event and gone afterwards.
//   stats       flat bonus to the robot's effective stats for this event (Tuner makes it 10% bigger)
//   scorePct    +% to the event-weighted robot score
//   breakdownPct  +/-% breakdown chance (a negative one is also helped by Tuner; the +4% of Performance Tune is not)
//   requires    unlock rule (data/unlocks.js); cost in credits
// "No tuning" is an M12 choice so the Local Trial can be entered for free (its entry fee is 0).
export const TUNINGS = [
  { id: 'none', name: 'No tuning', cost: 0, stats: {}, scorePct: 0, breakdownPct: 0, blurb: 'Race the robot as it is.' },
  { id: 'reliability', name: 'Reliability Check', cost: 600, stats: { REL: 20 }, scorePct: 0, breakdownPct: -20, blurb: 'REL +20, breakdowns 20% less likely.' },
  { id: 'performance', name: 'Performance Tune', cost: 900, stats: {}, scorePct: 4, breakdownPct: 4, blurb: 'Score +4%, breakdowns 4% more likely.' },
  { id: 'control', name: 'Control Tune', cost: 900, stats: { CTL: 25 }, scorePct: 0, breakdownPct: 0, blurb: 'CTL +25 for this event.' },
  { id: 'power', name: 'Power Tune', cost: 900, stats: { PWR: 25 }, scorePct: 0, breakdownPct: 0, blurb: 'PWR +25 for this event.' },
  { id: 'fullPrep', name: 'Full Race Prep', cost: 2000, stats: { REL: 10 }, scorePct: 5, breakdownPct: 0, requires: { type: 'rank', rank: 'B' }, blurb: 'Score +5%, REL +10.' },
];

// §21.2 strategies. scorePct: raw score change. relBonus: effective REL for breakdowns. breakdownMult: × breakdown chance.
// aggressive: true → Risk Taker and Beyond Redline apply. moralePenalty: the pilot's Morale after an Aggressive run
// (M12 choice: Beyond Redline says it has "no added morale penalty", so Aggressive must normally have one).
export const STRATEGIES = [
  { id: 'conservative', name: 'Conservative', scorePct: -4, relBonus: 25, breakdownMult: 0.55, blurb: 'Safe: −4% score, far fewer breakdowns.' },
  { id: 'balanced', name: 'Balanced', scorePct: 0, relBonus: 0, breakdownMult: 1, recommended: true, blurb: 'Steady: no bonus, no extra risk.' },
  { id: 'aggressive', name: 'Aggressive', scorePct: 8, relBonus: -20, breakdownMult: 1.55, aggressive: true, moralePenalty: -3, blurb: 'Fast: +8% score, many more breakdowns.' },
];

export const DEFAULT_TUNING = 'none';
export const DEFAULT_STRATEGY = 'balanced'; // §26: "Balanced is recommended but not forced"
