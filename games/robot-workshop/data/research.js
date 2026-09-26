// Research (bible §19): the 36 visible nodes in six branches, the business milestones (§19.6),
// the queue rules (§18.2 F11 / F33) and RP sources (§19.7). The NG+ research bonuses (§30.5) are in data/ngplus.js.
// Plain data for core/ResearchSystem.js. Secret/prestige research (CH10, MO08, AI08, PO08, SP08) is not here.
//
// node: { id, branch, level, name, cost (RP), requires: [node ids], condition: unlock rule | null, actions }
//   actions (fired once, by core/UnlockActions.js):
//     { type: 'part', id }       the part's research requirement is met (it opens once the rest of its rule holds)
//     { type: 'facility', id }   the facility can be built (once it exists in data/facilities.js)
//     { type: 'feature', id }    a game feature switches on (see FEATURES)
// A node's cost is paid in RP when it starts; the same number is the work its researcher must do.

export const RESEARCH_BRANCH_ORDER = ['mechanical', 'mobility', 'ai', 'power', 'tool', 'special'];

// stat: the researcher's work stat that speeds this branch (§19 "relevant stat" — M9 choice).
export const RESEARCH_BRANCH_INFO = {
  mechanical: { name: 'Mechanical', short: 'Mech', stat: 'eng', color: '#FFB74D' },
  mobility: { name: 'Mobility', short: 'Mobility', stat: 'tst', color: '#4FC3F7' },
  ai: { name: 'AI', short: 'AI', stat: 'prg', color: '#B39DDB' },
  power: { name: 'Power', short: 'Power', stat: 'eng', color: '#FFD166' },
  tool: { name: 'Tools', short: 'Tools', stat: 'fab', color: '#7CFFB2' },
  special: { name: 'Special / Business', short: 'Special', stat: 'des', color: '#FF8AB3' },
};

// Short ids per branch (§19.1 uses ME1…ME6; the other tables use XX-R1…).
const PREFIX = { mechanical: 'ME', mobility: 'MO-R', ai: 'AI-R', power: 'PO-R', tool: 'TO-R', special: 'SP-R' };
export const researchNodeId = (branch, level) => `${PREFIX[branch]}${level}`;

const part = (id) => ({ type: 'part', id });
const facility = (id) => ({ type: 'facility', id });
const feature = (id) => ({ type: 'feature', id });

// [branch, level, name, RP, actions, condition]
const ROWS = [
  // §19.1 Mechanical
  ['mechanical', 1, 'Standard Frames', 80, [part('CH02')]],
  ['mechanical', 2, 'Heavy Frames', 140, [part('CH03')]],
  ['mechanical', 3, 'Aero Frames', 220, [part('CH04')]],
  ['mechanical', 4, 'Rugged Frames', 320, [part('CH05'), facility('F21')]],
  ['mechanical', 5, 'Precision Frames', 480, [part('CH06'), facility('F19')], { type: 'facility', id: 'F21' }], // F19: §18.2 "Mechanical Research 5" (M19)
  ['mechanical', 6, 'Modular Frames', 700, [part('CH07'), feature('titaniumOption')], { type: 'rank', rank: 'B' }],
  // §19.2 Mobility
  ['mobility', 1, 'Performance Wheels', 80, [part('MO02')]],
  ['mobility', 2, 'Tracked Drive', 140, [part('MO03')]],
  ['mobility', 3, 'Omni Drive', 220, [part('MO04')]],
  ['mobility', 4, 'Walking Legs', 320, [part('MO05'), facility('F24')]],
  ['mobility', 5, 'Four-Leg Gait', 480, [part('MO06'), facility('F26')]],
  ['mobility', 6, 'Hover Drive', 750, [part('MO07')]],
  // §19.3 AI
  ['ai', 1, 'Depth Sensing', 80, [part('AI02')]],
  ['ai', 2, 'Lidar Mapping', 140, [part('AI03')]],
  ['ai', 3, 'Thermal Vision', 220, [part('AI04'), facility('F23')]],
  ['ai', 4, 'Navigation AI', 340, [part('AI05'), facility('F18')]],
  ['ai', 5, 'Learning AI', 520, [part('AI06')]],
  ['ai', 6, 'Competition AI', 780, [part('AI07')]],
  // §19.4 Power (PO-R1 also opens the Battery Bench, F07, per §18.2)
  ['power', 1, 'Extended Batteries', 80, [part('PO02'), facility('F07')]],
  ['power', 2, 'Fast Discharge', 140, [part('PO03')]],
  ['power', 3, 'High-Density Cells', 220, [part('PO04')]],
  ['power', 4, 'Regenerative Power', 340, [part('PO05'), facility('F22')]],
  ['power', 5, 'Fuel Cells', 520, [part('PO06')]],
  ['power', 6, 'Micro-Reactor', 820, [part('PO07')]],
  // §19.5 Tools
  ['tool', 1, 'Cargo Lifting', 70, [part('TO02')]],
  ['tool', 2, 'Precision Arms', 130, [part('TO03')]],
  ['tool', 3, 'Rescue Cutting', 210, [part('TO04')]],
  ['tool', 4, 'Construction Tools', 310, [part('TO05')]],
  ['tool', 5, 'Survey Kit', 450, [part('TO06')]],
  ['tool', 6, 'Arena Attachments', 680, [part('TO07')]],
  // §19.6 Special / Business
  ['special', 1, 'Cooling', 70, [part('SP02')]],
  ['special', 2, 'Armour Plating', 130, [part('SP03')]],
  ['special', 3, 'Boost Modules', 210, [part('SP04')]],
  ['special', 4, 'Emergency Beacons', 300, [part('SP05')]],
  ['special', 5, 'Auto-Repair', 460, [part('SP06')]],
  ['special', 6, 'Adaptive Control', 700, [part('SP07')]],
];

export const RESEARCH_NODES = ROWS.map(([branch, level, name, cost, actions, condition = null]) => ({
  id: researchNodeId(branch, level),
  branch,
  level,
  name,
  cost,
  requires: level > 1 ? [researchNodeId(branch, level - 1)] : [],
  condition,
  actions,
}));

// §19.6 business sub-unlocks by total visible nodes completed.
export const RESEARCH_MILESTONES = [
  { count: 2, actions: [feature('workshopNetwork')] },
  { count: 8, actions: [feature('trendForecast')] },
  { count: 18, actions: [feature('successorPenalty')] },
  { count: 36, actions: [feature('researchMastery'), feature('secretLabClue')] },
];

// What each feature does, in plain words (research screen, messages).
export const FEATURES = {
  workshopNetwork: { name: 'Workshop Network recruitment', note: 'A new hiring channel (hiring arrives in the next update).' },
  trendForecast: { name: 'Market trend forecast', note: "Products shows next month's market trend a month early." },
  successorPenalty: { name: 'Better successor models', note: 'Repeating an earlier build now costs −8% sales instead of −15%.' },
  researchMastery: { name: 'Research Mastery record', note: 'Every visible research topic complete.' },
  secretLabClue: { name: 'A strange clue…', note: 'Behind the Research Desk a sealed panel hums at night. Something is down there.' },
  titaniumOption: { name: 'Titanium research option', note: 'After the National Cup, a 900 RP Titanium Chassis project can open (later update).' },
};

// §18.2: queue 1 opens with a Research Desk (F11); queue 2 needs a Server Rack (F33) AND Rank A.
// (VIP's early second queue, §18.2, is a store feature for later — never a third queue.)
export const RESEARCH_QUEUES = [
  { id: 'Q1', name: 'Research queue 1', rule: { type: 'facility', id: 'F11' } },
  { id: 'Q2', name: 'Research queue 2', rule: { type: 'all', of: [{ type: 'facility', id: 'F33' }, { type: 'rank', rank: 'A' }] } },
];

// §19: researchPerDay = 5 + relevant stat / 35 + facility bonuses.
export const RESEARCH_RULES = {
  basePerDay: 5,
  statDivisor: 35,
  xpPerRp: 0.25, // M9 choice: the researcher gains XP = node cost × 0.25 when it finishes
};

// §19.7 Research Points sources. Wired now: projects, first part use, contracts.
// Synergies (Milestone 14), competitions, research prototypes and achievements add theirs when they arrive.
export const RP_SOURCES = {
  project: { base: 10, perComplexity: 2 }, // 10 + total part complexity × 2
  firstPartUse: 10, // first finished robot using each part
  firstSynergy: { normal: 10, advanced: 25, prestige: 100 },
  contract: { starter: 10, standard: 25, advanced: 45, elite: 65, prestige: 80 }, // M9 choice: 10–80 by contract size
  competition: { min: 15, max: 150 },
  researchPrototype: { min: 30, max: 120 },
};

// Art (already in the folder).
export const RESEARCH_ART = {
  icon: 'ui_icon_04_research',
  rp: 'reward_04',
  glow: 'vfx_03',
  blueprint: 'vfx_04',
};

// §29.3 prestige part research (Milestone 17): special topics in the Secret Lab. Each appears when its secret fires
// (a 'secretResearch' reward action, data/secrets.js) and needs the Secret Lab (F34); it costs RP + Prestige Tokens
// (research costs are prestige payments: never eased on a repeat, §30.4a). hidden: never counted as a visible topic.
// TO08 is not here: "One of Everything" (SEC-BEH-06) opens it directly.
export const SECRET_RESEARCH_BRANCH = 'secretLab';
export const SECRET_RESEARCH = [
  ['SL-CH10', 'Prestige Chassis', 1500, 2, 'CH10'],
  ['SL-MO08', 'Rocket/Skate Drive', 1200, 1, 'MO08'],
  ['SL-AI08', 'Experimental Neural Core', 1400, 2, 'AI08'],
  ['SL-PO08', 'Prestige Quantum Core', 1600, 3, 'PO08'],
  ['SL-SP08', 'Secret Prestige Module', 1500, 2, 'SP08'],
].map(([id, name, cost, prestigeTokens, partId], i) => ({
  id,
  branch: SECRET_RESEARCH_BRANCH,
  level: i + 1,
  name,
  cost,
  prestigeTokens,
  requires: [],
  condition: { type: 'all', of: [{ type: 'action', kind: 'secretResearch', id }, { type: 'facility', id: 'F34' }] },
  actions: [part(partId)],
  hidden: true,
}));
RESEARCH_BRANCH_INFO[SECRET_RESEARCH_BRANCH] = { name: 'Secret Lab', short: 'Secret', stat: 'eng', color: '#B388FF' };
