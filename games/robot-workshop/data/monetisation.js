// BOTWORKS monetisation (bible §32, Milestone 23) — plain data for core/AdService.js, core/CommerceService.js and
// core/EntitlementService.js. Every feature works with a pretend store for now (no real ads, no real money); the real
// Google Play / App Store / ad network arrive later as a new provider. Nothing here may make the game worse for a
// player who never pays: rewards are small, optional and never unlock parts, secrets or special workers.
// Product keys never change (they are what the stores will know the items by).

// Art (already in the folder — never moved or edited).
export const MONETISATION_ART = {
  store: 'ui_icon_21',
  vip: 'ui_icon_22',
  ad: 'ui_icon_23',
  removeAds: 'ui_icon_24',
  chips: 'ui_icon_02_premium',
  chipsSmall: 'reward_02',
  chipsPile: 'reward_03',
  cash: 'reward_01',
  research: 'ui_icon_04_research',
  staff: 'ui_icon_05_staff',
  restore: 'ui_icon_28',
  warning: 'ui_icon_29',
};

// §32.2–32.4 products. kind: consumable (Tech Chips — always exactly the stated amount, no loot boxes),
// nonConsumable (bought once, kept for good), subscription (VIP). Prices come from the store, never from here.
export const PRODUCTS = {
  robot_workshop_remove_ads: { key: 'robot_workshop_remove_ads', kind: 'nonConsumable', entitlement: 'removeAds', name: 'Remove Ads', icon: MONETISATION_ART.removeAds, blurb: 'No more automatic ads between screens — for good. "Watch ad" rewards stay, if you want them.' },
  robot_workshop_chips_small: { key: 'robot_workshop_chips_small', kind: 'consumable', grant: { currency: 'techChips', amount: 20 }, name: 'Tech Chips — handful', icon: MONETISATION_ART.chipsSmall, blurb: 'Exactly 20 Tech Chips.' },
  robot_workshop_chips_medium: { key: 'robot_workshop_chips_medium', kind: 'consumable', grant: { currency: 'techChips', amount: 60 }, name: 'Tech Chips — crate', icon: MONETISATION_ART.chipsPile, blurb: 'Exactly 60 Tech Chips.' },
  robot_workshop_chips_large: { key: 'robot_workshop_chips_large', kind: 'consumable', grant: { currency: 'techChips', amount: 150 }, name: 'Tech Chips — pallet', icon: MONETISATION_ART.chips, blurb: 'Exactly 150 Tech Chips.' },
  robot_workshop_vip: { key: 'robot_workshop_vip', kind: 'subscription', entitlement: 'vip', name: 'VIP', icon: MONETISATION_ART.vip, blurb: 'Handy extras while subscribed.' },
};
export const CHIP_PACKS = ['robot_workshop_chips_small', 'robot_workshop_chips_medium', 'robot_workshop_chips_large'];

// §32.1 the five rewarded placements. limit.per: 'phase' (once per project stage), 'gameMonth', 'node' (once per
// research topic), 'contract' (once per finished contract), 'realHours' (once per `hours` real hours).
export const REWARDED = [
  { id: 'workshopBoost', name: 'Workshop Boost', where: 'Assembly Bay', effect: { phaseProgressPct: 12, teamMorale: 5 }, limit: { per: 'phase', count: 1 }, blurb: '+12% on this stage and +5 team morale' },
  { id: 'recruitmentRefresh', name: 'Recruitment Refresh', where: 'Hiring', effect: { freeRefresh: 'ordinary' }, limit: { per: 'gameMonth', count: 1 }, blurb: 'A free refresh of ordinary applicants' },
  { id: 'researchAssist', name: 'Research Assist', where: 'Research', effect: { nodeProgressPct: 15 }, limit: { per: 'node', count: 1 }, blurb: '+15% on this topic' },
  { id: 'bonusContract', name: 'Bonus Contract Reward', where: 'Contracts', effect: { contractCashPct: 20 }, limit: { per: 'contract', count: 1 }, windowDays: 30, blurb: '+20% of the contract’s cash' },
  { id: 'recoveryGrant', name: 'Recovery Grant', where: 'Finance (in debt)', effect: { credits: 2000 }, limit: { per: 'realHours', hours: 24, count: 1 }, blurb: 'A 2,000-credit grant while in debt' },
];
export const REWARDED_BY_ID = Object.fromEntries(REWARDED.map((r) => [r.id, r]));
// A reward may bring a stage or a topic close to done, never finish it: finishing still happens by normal work, so an
// ad can never open a part, a facility or a secret by itself.
export const REWARD_CEILING = 0.99;

// §32.1 interstitial caps (all enforced in core/AdService.interstitialBlock). breakPoints: the natural moments one may
// show — leaving a competition result or a finished-robot result.
export const INTERSTITIAL_CAPS = {
  firstInstallQuietMin: 10,
  minGapMin: 12,
  maxPerHour: 3,
  afterResumeQuietSec: 60,
  afterPurchaseQuietMin: 10,
  breakPoints: ['competitionResult', 'robotResult'],
};
// The tutorial competition (§26): no interstitial after the first ever Local Trial entry.
export const TUTORIAL_COMPETITION = 'C01';

// §32.4–32.5 VIP.
export const VIP = {
  graceHours: 72, // offline grace after the last good check
  dailyChips: 5,
  supportSlot: { sharePct: 35 }, // +1 project Support Staff slot at 35% of that worker's work
  researchQueue2Rank: 'C', // the 2nd research queue from Rank C (never a 3rd)
  extraFreeRefreshPerYear: 1,
  recheckEveryMin: 60, // a quiet store check while playing
  gives: [
    'No automatic ads between screens',
    'Claim 5 Tech Chips once a day',
    '+1 Support Staff slot on robot projects (works at 35%)',
    'A 2nd research queue from Rank C (instead of Rank A + Server Rack)',
    '+1 free applicant refresh every game year',
    'A VIP plaque in your workshop',
  ],
  doesNotGive: [
    'Legendary or secret staff',
    'Prestige parts',
    'Skipping competition requirements',
    'Progress on secrets',
    'A 3rd research queue or a 3rd project slot',
  ],
};

export const STORE_TEXT = {
  title: 'Store',
  intro: 'Everything here is optional — the whole game can be played without paying.',
  pretend: 'Test store: nothing is charged and no real ads play.',
  noPrice: 'Price from the store',
  buy: 'Buy',
  owned: 'Owned ✓',
  restore: 'Restore Purchases',
  restoreSub: 'Remove Ads and VIP on this account',
  vipLink: 'VIP',
  vipLinkSub: 'What it gives and your status',
  loading: 'Asking the store for prices…',
  noLootBoxes: 'No loot boxes: every pack always gives exactly the amount shown.',
  chipsKept: 'Bought Tech Chips go into your current run and come with you into New Game+.',
  noRun: 'Start or continue a game to use Tech Chips.',
};

export const VIP_TEXT = {
  title: 'VIP',
  gives: 'What VIP gives',
  doesNotGive: 'What VIP never gives',
  active: 'VIP is active',
  inactive: 'VIP is not active',
  graceOut: 'VIP extras are paused until the store can be checked again. The game plays exactly as normal.',
  lastChecked: 'Last checked with the store',
  graceLeft: 'Offline time left before the extras pause',
  claim: 'Claim 5 Tech Chips',
  claimed: 'Claimed today ✓',
  claimNeedsRun: 'Start or continue a game to claim',
  subscribe: 'Subscribe',
  check: 'Check now',
};

// Plain messages (core/CommerceService uses these instead of its own defaults).
export const STORE_MESSAGES = {
  unavailable: 'The store is not available yet on this version. Nothing was charged.',
  offline: 'Could not reach the store. Check your connection and try again. Nothing was charged.',
  cancelled: 'Purchase cancelled. Nothing was charged.',
  failed: 'The purchase did not go through. Nothing was charged.',
  busy: 'Please wait — the last purchase is still finishing.',
  purchased: 'Thank you! Your purchase is ready.',
  duplicate: 'That purchase was already added — nothing more to add.',
  restored: 'Purchases restored.',
  nothingToRestore: 'No purchases to restore on this account.',
};

export const AD_TEXT = {
  tag: 'Watch ad',
  unavailable: 'No ad available right now',
  cancelled: 'Ad closed early — no reward this time.',
  failed: 'The ad did not load — nothing changed. Try again later.',
  offline: 'No ad available right now — nothing changed.',
  used: 'Already used',
  playing: 'Pretend ad playing…',
};

// The pretend store's own catalogue (debug builds only) — stands in for what Google Play / the App Store will send.
export const DEBUG_STORE_CATALOGUE = {
  robot_workshop_remove_ads: { price: '$2.99 (test)', title: 'Remove Ads' },
  robot_workshop_chips_small: { price: '$0.99 (test)', title: '20 Tech Chips' },
  robot_workshop_chips_medium: { price: '$2.49 (test)', title: '60 Tech Chips' },
  robot_workshop_chips_large: { price: '$4.99 (test)', title: '150 Tech Chips' },
  robot_workshop_vip: { price: '$1.99 / month (test)', title: 'VIP' },
};
export const DEBUG_STORE_KEY = 'robot-workshop:debugStore'; // the pretend store's records (this device, debug only)
