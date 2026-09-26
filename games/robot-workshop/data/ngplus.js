// New Game+ (bible §30, Milestone 20) — plain data for core/NgPlusSystem.js and the NG+ setup screen.
//
// What survives a New Game+ start is only what these three lists name. Every part of a run save and of the account
// save is in exactly one list (src/systems/ngPlusRun.js builds the snapshot and refuses anything undeclared).
// hidden: technical fields the setup screen doesn't show.

export const NG_PLUS = {
  maxLevel: 3, // §30.2: NG+1, NG+2, NG+3; later runs stay on NG+3 rules
  fields: {
    // §30.3 always carries over (account level)
    always: [
      { id: 'techChips', label: 'Tech Chips' },
      { id: 'prestigeTokens', label: 'Prestige Tokens' },
      { id: 'purchases', label: 'Purchases (Remove Ads, VIP)' },
      { id: 'achievements', label: 'Achievements' },
      { id: 'records', label: 'Records' },
      { id: 'combos', label: 'Discovered combo recipes' },
      { id: 'secretRecipes', label: 'Discovered secret conditions' },
      { id: 'discoveryArchive', label: 'Staff, robot and part archive' },
      { id: 'accountFlags', label: 'Black Circuit access and invitations' },
      { id: 'pastCampaigns', label: 'Past campaign summaries' },
      { id: 'highestLevel', label: 'Highest NG+ level' },
      { id: 'company', label: 'Company name, manager and colour' }, // Milestone 21 Company Setup
    ],
    // §30.4 player-selected carryover (+ §30.8 the optional challenge)
    chosen: [
      { id: 'legacyStaff', label: 'Legacy Staff' },
      { id: 'blueprints', label: 'Blueprint Memory' },
      { id: 'modifier', label: 'Challenge modifier' },
    ],
    // §30.6 does not carry over — plus the rest of the run save, named so nothing slips through.
    reset: [
      { id: 'credits', label: 'Cash (you start with the starting money + bonus)' },
      { id: 'reputation', label: 'Reputation and Company Rank' },
      { id: 'workshop', label: 'Workshop facilities and expansions' },
      { id: 'researchPoints', label: 'Research Points' },
      { id: 'research', label: 'Research topics done' },
      { id: 'unlocks', label: 'Parts and features unlocked this run' },
      { id: 'staff', label: 'Staff not picked as Legacy Staff' },
      { id: 'recruitment', label: 'The job board' },
      { id: 'training', label: 'Training in progress' },
      { id: 'careers', label: 'This run’s career records' },
      { id: 'projects', label: 'Robots being built' },
      { id: 'history', label: 'Finished robots (except blueprints)' },
      { id: 'products', label: 'Products on sale' },
      { id: 'market', label: 'Market demand and trends' },
      { id: 'contracts', label: 'Contracts' },
      { id: 'sponsors', label: 'Sponsors' },
      { id: 'competitions', label: 'Competition progress' },
      { id: 'rankings', label: 'Rankings table' },
      { id: 'trophies', label: 'Trophies on the shelf' },
      { id: 'runCombos', label: 'Combos found this run' },
      { id: 'runSecrets', label: 'Secrets found this run (their recipes stay known)' },
      { id: 'events', label: 'Events and temporary event effects' },
      { id: 'flags', label: 'Temporary run flags' },
      { id: 'notifications', label: 'The inbox' },
      { id: 'calendar', label: 'The calendar (back to Year 1)' },
      { id: 'ending', label: 'The ending ceremony' },
      { id: 'guide', label: 'First-time guide progress', hidden: true },
      { id: 'ledger', label: 'Money ledger', hidden: true },
      { id: 'campaignId', label: 'Run id', hidden: true },
      { id: 'seed', label: 'Random seed', hidden: true },
      { id: 'rngState', label: 'Random state', hidden: true },
      { id: 'ngplus', label: 'Last run’s NG+ picks', hidden: true },
      { id: 'pendingEntry', label: 'A race set up but not run', hidden: true }, // Milestone 22
    ],
  },
  // §30.4 Legacy Staff: 1 / 2 / 3 picks; Level 5; 60% of their work stats, never below their normal starting stats.
  legacy: { picksByLevel: [0, 1, 2, 3], startLevel: 5, statPct: 60, historyTiers: ['legendary', 'secret'] },
  // §30.4 Blueprint Memory: one per completed run level, 3 at most.
  blueprints: { perLevel: 1, max: 3 },
  // §30.5 automatic advantages per completed campaign, capped at NG+3.
  advantages: {
    perRun: { researchCostPct: -5, researchSpeedPct: 5, startingCredits: 2000, freeRefreshes: 1 },
    maxRuns: 3,
  },
  // §30.8 optional challenge (pick one or none): +1 Prestige Token at the Year 16 ending if the run gets there.
  modifiers: [
    { id: 'leanStart', name: 'Lean Start', text: 'Starting credits −40%', icon: 'ui_icon_01_money', startingCreditsPct: -40 },
    { id: 'smallWorkshop', name: 'Small Workshop', text: 'Expansion 3 and 4 cost +50%', icon: 'ui_icon_29', expansionCostPct: { X3: 50, X4: 50 } },
    { id: 'oldSchool', name: 'Old School', text: 'No Tech Chip boosts during projects or research', icon: 'ui_icon_02_premium', noTechChipBoosts: true },
    { id: 'homegrownTeam', name: 'Homegrown Team', text: 'No Head Hunt or Global Search until Rank A', icon: 'ui_icon_05_staff', lockedChannels: ['headHunt', 'globalSearch'], untilRank: 'A' },
  ],
  modifierReward: { currency: 'prestigeTokens', amount: 1 },
};

// §30.7 NG+ exclusive content, as the setup screen lists it (the rules themselves are in data/secrets.js ngPlusMin,
// data/staff.js, data/rivals.js and the scaling below).
export const NG_PLUS_CONTENT = {
  1: ['Secret staff Orin Zero, Pixel Eve and Kestrel Nine can appear', 'The CH10 Prestige Chassis path', 'The Black Circuit path', 'A guaranteed Secret Lab clue', 'New rival talk and stronger events'],
  2: ['Secret staff Null Mercer and Nova Black can appear', 'Nocturne Systems races harder', 'An extra Rumour Archive clue for the Unknown robot', 'Hard contracts with Prestige Token rewards'],
  3: ['The Unknown robot (Singularity Workshop) can be built', 'A hidden ending', 'The final secret badge'],
};

// Rival and contract scaling by NG+ level (§30.7 "stronger rivals/contracts per level"). Rivals: data/rivals.js
// ngPlusPct (+6% per level) and Nocturne's ngPlusBonus at NG+2.
export const NG_PLUS_SCALING = {
  contracts: {
    difficultyPctPerLevel: 5, // requirements a little higher each level
    payoutPctPerLevel: 10, // and better paid
    hard: { fromLevel: 2, chance: 0.25, difficultyPct: 15, payoutPct: 50, prestigeTokens: 1 }, // §30.7 NG+2 Hard Contracts
  },
  events: { amountPctPerLevel: 10 }, // §30.7 NG+1 stronger event variants: effects 10% bigger per level
  // §30.7 NG+1 guaranteed Secret Lab clue route: the clue is there from day 1.
  startClues: [{ fromLevel: 1, id: 'SEC-FAC-01', stage: 1 }],
};

// The final secret completion badge (§30.7 NG+3): set by the Unknown robot's secret (data/secrets.js SEC-ROBOT-03).
export const FINAL_BADGE = { flag: 'finalSecretBadge', name: 'Singularity Badge', text: 'The final secret: the Unknown robot was built.', art: 'badge_rarity_05_secret' };

// Art (already in the folder — never moved or edited).
export const NG_PLUS_ART = { keyArt: 'brand_06_ngplus_key_art', burst: 'vfx_15', icon: 'ui_icon_20', token: 'reward_10', chip: 'ui_icon_02_premium', blueprint: 'vfx_04' };

// Words.
export const NG_PLUS_TEXT = {
  title: 'New Game+',
  intro: 'A fresh workshop, Year 1 — with what you have learned.',
  carries: 'Always comes with you',
  resets: 'Starts fresh',
  advantages: 'Your NG+ advantages',
  legacy: 'Legacy Staff',
  legacyHelp: (n) => `Pick up to ${n}. They start at Level 5 with 60% of their stats (never below their starting stats).`,
  blueprints: 'Blueprint Memory',
  blueprintHelp: (n) => `Pick up to ${n} robot builds. Rebuild one with a tap once its parts are open again.`,
  challenge: 'Challenge (optional)',
  challengeHelp: '+1 Prestige Token at the Year 16 ending if you finish with it on.',
  guide: 'Show the first-time guide',
  start: 'Start New Game+',
  confirm: 'Start NG+ now? This run is archived and a new one begins in Year 1.',
};
