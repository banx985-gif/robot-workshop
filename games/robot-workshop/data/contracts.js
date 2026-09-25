// Customer contracts (bible §14.6) and the 8 signature contracts (§14.7). Plain values only.
//
// Every requirement is worked out from what the player's current team could build with the parts
// that are open right now (a "reference build"), times a difficulty below 1 — so no contract ever asks
// for the impossible, and contracts grow harder as the team and parts grow.

export const CONTRACT_RULES = {
  offersPerMonth: 3, // §14.6
  maxActive: 2, // §14.6
  randomFrom: { year: 1, month: 3 }, // random offers start with the first customer beat (§4.3 Years 1–2)
  statCount: [1, 2], // one or two minimum robot stats
  statsFrom: 3, // the minimum stats are picked from the purpose's top-3 weighted stats
  difficulty: { min: 0.6, max: 0.8 }, // share of the reference build's stat
  qualityDifficulty: 0.8, // share of the reference build's Quality
  requiredPartChance: 0.3, // optional required part
  deadline: { perEstimatedDay: 2.0, extraDays: 21, minDays: 60 }, // generous: two contracts can be built back to back
  payout: { base: 2500, perQuality: 80, perComplexity: 250, roundTo: 50 }, // §14.6
  reputation: { base: 15, perQuality: 0.5 },
  failReputation: { starter: -25, standard: -40, advanced: -60, elite: -80, prestige: -100 }, // §14.6
  special: { chance: 0.1, techChips: 1 }, // special reward chance
  // Contract size by year: which project tiers random contracts ask for (weights), §4.3 pacing over 16 years.
  tierByYear: [
    { fromYear: 1, weights: { starter: 1 } },
    { fromYear: 3, weights: { starter: 2, standard: 2, advanced: 1 } },
    { fromYear: 6, weights: { standard: 2, advanced: 2, elite: 1 } },
    { fromYear: 10, weights: { advanced: 2, elite: 2, prestige: 1 } },
  ],
  tierMinCx: { starter: 6, standard: 12, advanced: 20, elite: 30, prestige: 40 }, // complexity requirement (§11.7)
};

// §14.7 signature contracts: each appears once, when its date has come AND its purpose is open
// (before research arrives in Milestone 9 only the Café shows in normal play; debug-unlock shows all).
// requiredPart is only asked for if that part is open at the time.
export const SIGNATURE_CONTRACTS = [
  {
    id: 'SIG1',
    name: 'Corner Café Helper',
    customer: 'Corner Café',
    segment: 'smallBusiness',
    purpose: 'helper',
    stats: ['REL', 'APL'],
    tier: 'starter',
    difficulty: 0.65,
    appear: { year: 1, month: 3 },
    payoutBonus: 1.4,
    repBonus: 30,
    blurb: 'A friendly café wants a helper to carry trays and wipe tables. Your first customer!',
  },
  {
    id: 'SIG2',
    name: 'SwiftShip Courier Fleet',
    customer: 'SwiftShip',
    segment: 'logistics',
    purpose: 'delivery',
    stats: ['SPD', 'CTL'],
    requiredPart: 'MO02',
    tier: 'starter',
    difficulty: 0.7,
    appear: { year: 2, month: 2 },
    payoutBonus: 1.5,
    repBonus: 40,
    blurb: 'A courier start-up wants a quick, steady delivery robot to test its city routes.',
  },
  {
    id: 'SIG3',
    name: 'Titan Storage Lift Test',
    customer: 'Titan Storage',
    segment: 'industrial',
    purpose: 'warehouse',
    stats: ['PWR', 'END'],
    requiredPart: 'TO02',
    tier: 'standard',
    difficulty: 0.7,
    appear: { year: 3, month: 4 },
    payoutBonus: 1.5,
    repBonus: 50,
    blurb: 'A huge storage firm will test a lifter on its tallest racks.',
  },
  {
    id: 'SIG4',
    name: 'Ranger Survey Scout',
    customer: 'Ranger Survey',
    segment: 'research',
    purpose: 'scout',
    stats: ['INT', 'CTL'],
    requiredPart: 'TO06',
    tier: 'standard',
    difficulty: 0.72,
    appear: { year: 4, month: 6 },
    payoutBonus: 1.5,
    repBonus: 60,
    blurb: 'Park rangers need a scout to map trails and count wildlife.',
  },
  {
    id: 'SIG5',
    name: 'Metro Rescue Unit',
    customer: 'Metro Rescue',
    segment: 'emergency',
    purpose: 'rescue',
    stats: ['REL', 'PWR'],
    requiredPart: 'TO04',
    tier: 'advanced',
    difficulty: 0.75,
    appear: { year: 7, month: 9 },
    payoutBonus: 1.6,
    repBonus: 90,
    blurb: "The city's rescue service wants a robot it can trust in a real emergency.",
  },
  {
    id: 'SIG6',
    name: 'HighRise Build Assist',
    customer: 'HighRise Construction',
    segment: 'construction',
    purpose: 'builder',
    stats: ['PWR', 'REL'],
    requiredPart: 'TO05',
    tier: 'advanced',
    difficulty: 0.72,
    appear: { year: 5, month: 3 },
    payoutBonus: 1.5,
    repBonus: 70,
    blurb: 'A tower-block builder wants a strong helper on its busiest site.',
  },
  {
    id: 'SIG7',
    name: 'Halo Hotel Service Bot',
    customer: 'Halo Hotel',
    segment: 'smallBusiness',
    purpose: 'service',
    stats: ['APL', 'INT'],
    requiredPart: 'AI06',
    tier: 'advanced',
    difficulty: 0.75,
    appear: { year: 6, month: 2 },
    payoutBonus: 1.6,
    repBonus: 80,
    blurb: 'A glamorous hotel wants a charming robot to greet its guests.',
  },
  {
    id: 'SIG8',
    name: 'Orbital Research Prototype',
    customer: 'Orbital Research',
    segment: 'research',
    purpose: 'experimental',
    stats: ['INT', 'END'],
    requiredPart: 'CH09',
    tier: 'elite',
    difficulty: 0.75,
    appear: { year: 16, month: 1 },
    payoutBonus: 2.0,
    repBonus: 150,
    setsFlag: 'lunarInvite', // §14.7: late / postgame, and a prerequisite for the Lunar path
    blurb: 'A space lab wants an experimental robot for tests beyond the sky.',
  },
];

// The first-contract moment (shown once, when the first contract appears on the board).
export const FIRST_CONTRACT_ART = 'event_art_03';
