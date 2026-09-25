// Synergies — part combos (bible §12.1), as data for core/SynergyEvaluator.js. No code per combo.
//   tier: normal / advanced / prestige → discovery RP (data/research.js RP_SOURCES.firstSynergy)
//   hidden: a prestige combo stays "???" (no hint) until it is discovered (§12)
//   locked: never checked — SYN20's conditions arrive with the secret engine (Milestone 17)
//   conditions: every one must hold (kinds are listed in core/SynergyEvaluator.js)
//     stat keys: the seven robot stats, INN (Innovation) and QUALITY (final Quality — checked last, see
//     src/systems/Synergies.js; a combo that needs QUALITY must not give stats, Fit or Innovation)
//   reward: stats (robot stats), fit, inn (Innovation), rp (every time it fires), repFirst (first time in a run);
//     the advanced look comes from data/visuals.js (the family whose `synergy` is this id)
//   hint: the vague clue shown when the player is one condition away (until it is discovered)
// M14 choices: stat conditions are read on the robot before any combo bonus (so one combo can't switch on
// another); "AI06 discovered" (SYN18) = the Learning AI was used in an earlier finished robot this run;
// "after Lunar invite" (SYN19) = the Orbital Research contract's lunarInvite flag (data/contracts.js SIG8).

const purpose = (...any) => ({ kind: 'purpose', any });
const part = (...any) => ({ kind: 'part', any });
const stat = (s, min) => ({ kind: 'stat', stat: s, min });

export const SYNERGIES = [
  {
    id: 'SYN01',
    name: 'Handy Helper',
    tier: 'normal',
    conditions: [purpose('helper'), part('CH01'), part('MO01'), part('TO01')],
    reward: { fit: 12, stats: { REL: 8 } },
    hint: 'A Helper built from the simplest starter body, wheels and hands might surprise you.',
  },
  {
    id: 'SYN02',
    name: 'Courier Classic',
    tier: 'normal',
    conditions: [purpose('delivery'), part('CH01'), part('MO02'), part('AI05'), part('SP01')],
    reward: { fit: 16, stats: { SPD: 10 } },
    hint: 'Couriers love a small body, quick wheels, a smart navigator and somewhere to put the parcel.',
  },
  {
    id: 'SYN03',
    name: 'Forkmaster',
    tier: 'normal',
    conditions: [purpose('warehouse'), part('CH03'), part('MO03'), part('TO02')],
    reward: { fit: 18, stats: { PWR: 15 } },
    hint: 'A Warehouse robot feels at home on a heavy frame and tracks — with the right lifting gear.',
  },
  {
    id: 'SYN04',
    name: 'Trail Scout',
    tier: 'normal',
    conditions: [purpose('scout'), part('CH05'), part('MO06'), part('TO06')],
    reward: { fit: 18, stats: { END: 15 } },
    hint: 'A Scout with a tough body, four legs and survey gear could go a long way.',
  },
  {
    id: 'SYN05',
    name: 'Track Special',
    tier: 'normal',
    conditions: [purpose('racing'), part('CH04'), part('MO02'), part('AI07'), part('SP04')],
    reward: { fit: 18, stats: { SPD: 20 } },
    hint: 'A Racer with a sleek body, fast wheels, a race brain and a boost is close to something.',
  },
  {
    id: 'SYN06',
    name: 'First Responder',
    tier: 'normal',
    conditions: [purpose('rescue'), part('CH05'), part('AI04'), part('TO04'), part('SP05')],
    reward: { fit: 20, stats: { REL: 15 } },
    hint: 'Rescue robots that are rugged, see heat, cut people free and call for help work best.',
  },
  {
    id: 'SYN07',
    name: 'Site Foreman',
    tier: 'normal',
    conditions: [purpose('builder'), part('CH03'), part('MO03'), part('TO05')],
    reward: { fit: 18, stats: { PWR: 15 } },
    hint: 'A Builder on a heavy frame and tracks wants proper building tools.',
  },
  {
    id: 'SYN08',
    name: 'Front Desk Star',
    tier: 'normal',
    conditions: [purpose('service'), part('CH06'), part('AI06'), stat('APL', 160)],
    reward: { fit: 16, stats: { APL: 20 } },
    hint: 'A very good-looking Service robot with a precise body and a brain that learns…',
  },
  {
    id: 'SYN09',
    name: 'Arena Agile',
    tier: 'normal',
    conditions: [purpose('sport'), part('MO04'), part('AI07'), part('TO07')],
    reward: { fit: 18, stats: { CTL: 20 } },
    hint: 'Sport robots that turn on the spot and think like competitors are nearly there.',
  },
  {
    id: 'SYN10',
    name: 'Wild Prototype',
    tier: 'normal',
    conditions: [purpose('experimental'), part('CH09'), { kind: 'partCount', min: 3, minCx: 8, exceptSlots: ['chassis'] }],
    reward: { inn: 20, rp: 40 },
    hint: 'The Experimental Chassis likes company: pack it with other big, complex parts.',
  },
  {
    id: 'SYN11',
    name: 'Precision Grade',
    tier: 'advanced',
    conditions: [purpose('service', 'builder'), part('CH06'), part('TO03'), stat('REL', 220)],
    reward: {},
    hint: 'Precision body, precision arm and very high Reliability — a Service or Builder robot could look special.',
  },
  {
    id: 'SYN12',
    name: 'Heavy Industrial',
    tier: 'advanced',
    conditions: [purpose('warehouse', 'builder'), part('CH03'), part('MO03'), part('PO06')],
    reward: { stats: { PWR: 20 } },
    hint: 'Heavy frame, tracks and a serious power plant: a Warehouse or Builder robot could go industrial.',
  },
  {
    id: 'SYN13',
    name: 'All Terrain',
    tier: 'advanced',
    conditions: [purpose('scout', 'rescue'), part('CH05'), part('MO06'), part('SP03')],
    reward: { stats: { END: 20 } },
    hint: 'Rugged body, four legs and armour: a Scout or Rescue robot ready for anything.',
  },
  {
    id: 'SYN14',
    name: 'Pro Racer',
    tier: 'advanced',
    conditions: [purpose('racing'), part('CH04'), part('MO07'), part('AI07'), part('SP04')],
    reward: { stats: { SPD: 25 } },
    hint: 'A Racer that floats above the track, with a race brain and a boost, could turn pro.',
  },
  {
    id: 'SYN15',
    name: 'Elite Rescue',
    tier: 'advanced',
    conditions: [purpose('rescue'), part('CH08'), part('AI05', 'AI06', 'AI07', 'AI08'), part('TO04'), part('SP06')], // AI05+ (§12.1)
    reward: { stats: { REL: 25 } },
    hint: 'The toughest metal body, a clever navigator, a cutter and self-repair make an elite Rescue robot.',
  },
  {
    id: 'SYN16',
    name: 'Champion Sport',
    tier: 'advanced',
    conditions: [purpose('sport'), part('MO08'), part('AI07'), part('TO07')],
    reward: { stats: { CTL: 25 } },
    hint: 'A Sport robot with rocket feet, a competition brain and arena gear could be a champion.',
  },
  {
    id: 'SYN17',
    name: 'Titanium Flagship',
    tier: 'prestige',
    hidden: true,
    conditions: [part('CH08'), stat('QUALITY', 88)],
    reward: { repFirst: 150 },
  },
  {
    id: 'SYN18',
    name: 'Neural Machine',
    tier: 'prestige',
    hidden: true,
    conditions: [purpose('experimental'), part('AI08'), { kind: 'discovered', key: 'part:AI06', label: 'Learning AI used in an earlier robot' }, stat('INN', 70)],
    reward: {},
  },
  {
    id: 'SYN19',
    name: 'Lunar Spec',
    tier: 'prestige',
    hidden: true,
    conditions: [
      purpose('scout', 'experimental'),
      part('MO07'),
      part('PO07', 'PO08'), // PO07+ (§12.1)
      { kind: 'rule', rule: { type: 'rank', rank: 'S' }, label: 'Company Rank S' },
      { kind: 'rule', rule: { type: 'flag', flag: 'lunarInvite' }, label: 'The Lunar invite' },
    ],
    reward: {},
  },
  {
    id: 'SYN20',
    name: '???',
    tier: 'prestige',
    hidden: true,
    locked: true, // Milestone 17: secret conditions in SEC-ROBOT-03
    conditions: [{ kind: 'rule', rule: { type: 'secret', id: 'SEC-ROBOT-03' }, label: '???' }],
    reward: {},
  },
];

export const SYNERGIES_BY_ID = Object.fromEntries(SYNERGIES.map((s) => [s.id, s]));

// Stats known only once the robot's Quality is worked out.
export const FINAL_STATS = ['QUALITY'];

// Art (already in the folder).
export const SYNERGY_ART = {
  discover: 'vfx_12', // rare unlock glow — "New combo discovered!"
  blueprint: 'vfx_04', // blueprint pop
  secret: 'ui_icon_10_secret', // ??? marker
  icon: 'ui_icon_12', // components / combos icon
};
