// BOTWORKS saves (bible §37, Milestone 22) — plain data for core/SaveStore.js and core/Autosave.js.
// The storage names never change: database 'robot-workshop', slot keys 'campaign' / 'account' (plus the rolling
// copies campaign#0…#2), localStorage prefix 'robot-workshop:'.

export const SAVE_STORAGE = { dbName: 'robot-workshop', localPrefix: 'robot-workshop:', settingsKey: 'robot-workshop:settings' };

// §37.2 slots: one active campaign, the archived ending summaries (3 kept inside it), one account, one settings save.
// rolling: how many copies each keeps (a damaged newest copy falls back to the one before).
export const SAVE_SLOTS = {
  campaign: { key: 'campaign', rolling: 3 },
  account: { key: 'account', rolling: 3 },
  archive: { key: 'archive', rolling: 2 },
  settings: { key: 'settings' },
};

// §37.3 autosave triggers → the game's bus events. (Month rollover, project completion and a few big moments also
// save from their own code; a save asked for twice in the same moment is written once.)
export const SAVE_TRIGGERS = {
  projectPhase: ['project:phase'],
  projectComplete: ['project:complete'],
  facility: ['facility:placed', 'facility:moved', 'facility:sold', 'facility:expansion'],
  staff: ['staff:hired', 'staff:fired', 'training:start', 'training:complete'],
  research: ['research:start', 'research:complete'],
  competition: ['competition:enter'],
  contract: ['contract:accepted', 'contract:success', 'contract:failed'],
  month: ['clock:month'],
  major: ['secret:unlocked', 'reputation:rankUp', 'trophy:awarded', 'campaign:ending', 'campaign:transition', 'product:launch', 'sponsor:signed'],
};
export const AUTOSAVE_RULES = { intervalMs: 30000 }; // rolling autosave while the clock runs, skipped if nothing changed

// §37.5 the campaign save as BOTWORKS writes it (everything added since the bible's list included). Every field
// Campaign.serialize() writes must be here (a test checks), with where the bible's name for it lives.
export const SAVE_SCHEMA = {
  campaignId: 'campaignId',
  seed: 'seed',
  rngState: 'rngState',
  calendar: 'calendar { year, month, day, speed, dayProgress }',
  staff: 'staff (with energy, morale, assignments)',
  projects: 'projects.active (stage, progress, faults, breakthrough checks)',
  history: 'projects.history (finished robots)',
  economy: 'company cash, debt months, Tech Chips / Prestige Token balances and the ledger',
  reputation: 'company reputation and rank',
  market: 'market demand and trends',
  products: 'products active / retired',
  contracts: 'contracts available / active / history',
  workshop: 'workshop expansions, facilities, placement',
  research: 'research completed, queues, progress, Research Points',
  unlocks: 'parts / features unlocked this run',
  recruitment: 'recruitment candidates, special arrivals, next refresh',
  training: 'training in progress',
  careers: 'staff career records',
  competitions: 'competitions records and results',
  rankings: 'rankings table',
  trophies: 'trophies',
  synergies: 'combos found this run',
  events: 'events and their queue',
  sponsors: 'sponsors active / history',
  notifications: 'the inbox and pop-up queue (eventQueue)',
  secrets: 'secrets run flags, clue stages, triggered',
  ending: 'the Year 16 ending state',
  guide: 'tutorial (first-time guide)',
  flags: 'stats / run flags',
  ngplus: 'ngPlusLevel and this run’s NG+ picks (Milestone 20)',
  company: 'company name, managerName, accent (Milestone 21)',
  pendingEntry: 'a competition set up but not run (§37.4, Milestone 22)',
  monetisation: 'rewarded-ad uses this run: per stage, topic, game month, contract (§32.1, Milestone 23)',
};
// The account save (§37.5 account/meta): achievements, records, discoveries (combos, secrets, staff / parts / robot
// looks via the secret engine's account facts), NG+ record and purchases. Tech Chips and Prestige Tokens are kept in
// the run's economy and carried by New Game+ (Milestone 20). Milestone 23 (§37.5): entitlements (Remove Ads, VIP and its
// last check / grace), processedTransactions (purchase ids already granted), ads (interstitial timing, real-time reward
// limits) and heldTechChips (bought with no run open).
export const ACCOUNT_SCHEMA = ['synergies', 'secrets', 'achievements', 'records', 'ngPlus', 'entitlements', 'processedTransactions', 'ads', 'heldTechChips'];

export const SAVE_TEXT = {
  fallback: 'Your last save was damaged, so we loaded the one from a moment earlier.',
  accountFallback: 'Your account record was damaged, so we loaded the one from a moment earlier.',
  accountLost: 'Your account record could not be read, so achievements and records start fresh. Your run is safe.',
  accountBlocked: 'Your account record is from a newer version of BOTWORKS — it is kept safe and not changed.',
  moved: 'Your save has moved to safer storage.',
};
