// Events (bible §24): the 8 illustrated milestone events and the 20 repeatable text events of §24.1.
// Plain data for core/EventSystem.js — no code. Campaign.js supplies the words it uses:
//   trigger rules: the unlock words (data/unlocks.js) plus the event-only words in EVENT_CONDITIONS below
//   effects: { type: 'credits' | 'rep' | 'rp', amount }          amount: { base, perYear, spread } — Year 1 = base,
//              + perYear for each later year, ± spread (seeded, rolled when the event happens), rounded
//            { type: 'morale' | 'energy', who: 'one' | 'team' | 'all', amount }   'one' = the worker the event names
//            { type: 'modifier', key, value, days }   a timed bonus through the shared effect query (fx)
//            { type: 'chance', p, then: [...], else: [...] }   decided when the event happens, never rerolled
//            { type: 'sponsorOffer' }                  the sponsor the event names makes an offer (data/sponsors.js)
//   who: 'staff' → the event names one worker ({staff} in the text); 'tired' = the most tired; 'team' = someone on
//        the running project; 'rival' → a rival company ({rival}); 'sponsor' → a sponsor who could offer ({sponsor})
//   choices[].goto: a screen to open after answering (the choice's effects still apply)
// Numbers are Milestone 15 choices (the bible names the events, not their sizes); balance pass in Milestone 28.

// §24.3 cadence: one big choice event per 14 game days, one small flavour note per 5 days; milestones ignore caps.
export const EVENT_CAPS = { choice: 14, flavour: 5 };
export const EVENT_RULES = {
  startDay: 28, // nothing random in the first month (the first-time guide is busy)
  dailyChance: { choice: 0.1, flavour: 0.22 }, // chance on a day the cap allows (so ~every 3–4 and ~1–2 weeks)
  maxOpen: 3, // choice events waiting for an answer at once
};

// §40: at most 20 pop-ups wait; older minor ones fold into the inbox. The inbox keeps the newest 200 messages.
export const NOTIFY_RULES = { maxQueue: 20, inboxMax: 200, toastSec: 3.6, maxToasts: 2 };

// Icons (already in the folder): warning, customers/contracts, reward crate + the ones the game already loads.
export const EVENT_ICONS = {
  warning: 'ui_icon_29',
  customer: 'ui_icon_14',
  crate: 'reward_07',
  staff: 'ui_icon_05_staff',
  money: 'ui_icon_01_money',
  rep: 'ui_icon_03_reputation',
  research: 'ui_icon_04_research',
  competition: 'ui_icon_08_competition',
  secret: 'ui_icon_10_secret',
};

// Event-only trigger words (Campaign.eventCondition):
//   { type: 'robotsBuilt', min }  finished robots this run        { type: 'productsOnSale', min }
//   { type: 'projectRunning' }    a robot is being built           { type: 'staffEnergyBelow', value }
//   { type: 'facilitiesOwned', min }                                { type: 'competitionsOpen', min }
//   { type: 'sponsorOfferable' }  Rank C+, no sponsor, someone qualifies and no offer is waiting
//   { type: 'rpEarned' }          any Research Points earned
export const EVENT_CONDITIONS = ['robotsBuilt', 'productsOnSale', 'projectRunning', 'staffEnergyBelow', 'facilitiesOwned', 'competitionsOpen', 'sponsorOfferable', 'rpEarned'];

const amt = (base, perYear = 0, spread = 0.2) => ({ base, perYear, spread });

// §24.1 milestone illustrated events (event_art_01 … 08, in this order). shownBy: 'guide' = the first-time guide shows
// the picture (the inbox just keeps a copy); goto: the screen the "tap to continue" opens.
export const MILESTONE_EVENTS = [
  { id: 'EV_M01', kind: 'milestone', art: 'event_art_01', shownBy: 'guide', title: 'Workshop Opening', text: 'The doors are open! Mina, Rami and Gus are ready to build robots.' },
  { id: 'EV_M02', kind: 'milestone', art: 'event_art_02', shownBy: 'guide', title: 'First Successful Robot Launch', text: 'Your first robot is on sale. Customers are already asking about it.' },
  { id: 'EV_M03', kind: 'milestone', art: 'event_art_03', title: 'Your first customer!', text: '{customer} has a job for you — see Contracts.', goto: 'contracts' },
  { id: 'EV_M04', kind: 'milestone', art: 'event_art_04', title: "You're invited: {event}!", text: '{note}' },
  { id: 'EV_M05', kind: 'milestone', art: 'event_art_05', title: 'National Breakthrough!', text: 'National champions! The whole country knows your robots now.' },
  { id: 'EV_M06', kind: 'milestone', art: 'event_art_06', title: 'The World Robotics Championship!', text: 'Your workshop is invited to the world stage. See Compete.', goto: 'competitions' },
  // Fired by secret rules (Milestone 17): every Legendary Arrival (one per legendary/secret worker, so it may repeat)
  // and the Singularity Workshop (SEC-ROBOT-03).
  { id: 'EV_M07', kind: 'milestone', art: 'event_art_07', repeats: true, title: 'A Legend Arrives: {staff}', text: 'Hire them on the Roster within {days} days.', goto: 'recruit' },
  { id: 'EV_M08', kind: 'milestone', art: 'event_art_08', title: 'The Singularity Workshop', text: 'Every legend, every prestige part, one machine. Something hidden has opened up.' },
];

// §24.1 repeatable text events — all 20, in the bible's order.
export const REPEATABLE_EVENTS = [
  {
    id: 'EV01', kind: 'flavour', icon: 'crate', weight: 3, cooldownDays: 70,
    title: 'Supplier discount', text: 'A parts supplier is clearing stock.',
    effects: [{ type: 'modifier', key: 'materialCostPct', value: -10, days: 28 }],
  },
  {
    id: 'EV02', kind: 'flavour', icon: 'warning', weight: 2, cooldownDays: 84, trigger: { type: 'robotsBuilt', min: 1 },
    title: 'Component shortage', text: 'A factory fire far away has made parts scarce.',
    effects: [{ type: 'modifier', key: 'materialCostPct', value: 10, days: 21 }],
  },
  {
    id: 'EV03', kind: 'flavour', icon: 'rep', weight: 3, cooldownDays: 56, trigger: { type: 'robotsBuilt', min: 1 },
    title: 'Unexpected media mention', text: 'A popular tech show gave your workshop a shout-out.',
    effects: [{ type: 'rep', amount: amt(15, 4) }],
  },
  {
    id: 'EV04', kind: 'flavour', icon: 'staff', weight: 3, cooldownDays: 42, who: 'staff',
    title: 'Staff inspiration', text: '{staff} had a brilliant idea in the shower.',
    effects: [{ type: 'morale', who: 'one', amount: 10 }, { type: 'energy', who: 'one', amount: 15 }],
  },
  {
    id: 'EV05', kind: 'choice', icon: 'warning', weight: 3, cooldownDays: 56, who: 'tired', trigger: { type: 'staffEnergyBelow', value: 35 },
    title: 'Staff fatigue warning', text: '{staff} is running on empty.',
    choices: [
      { id: 'rest', label: 'Send them home to rest', default: true, effects: [{ type: 'energy', who: 'one', amount: 40 }] },
      { id: 'push', label: 'Ask them to keep going', effects: [{ type: 'morale', who: 'one', amount: -8 }] },
    ],
  },
  {
    id: 'EV06', kind: 'choice', icon: 'customer', weight: 3, cooldownDays: 70, trigger: { type: 'robotsBuilt', min: 1 },
    title: 'Customer rush order', text: 'A shop needs repairs on its robots by Friday — can your team squeeze it in?',
    choices: [
      { id: 'take', label: 'Take the rush job', effects: [{ type: 'credits', amount: amt(1500, 450) }, { type: 'energy', who: 'all', amount: -10 }, { type: 'morale', who: 'all', amount: -2 }] },
      { id: 'decline', label: 'Turn it down politely', default: true, effects: [] },
    ],
  },
  {
    id: 'EV07', kind: 'flavour', icon: 'money', weight: 2, cooldownDays: 112, trigger: { type: 'productsOnSale', min: 1 },
    title: 'Market trend spike', text: 'Robots are the talk of the town this month.',
    effects: [{ type: 'modifier', key: 'salesUnitsPct', value: 15, days: 28 }],
  },
  {
    id: 'EV08', kind: 'flavour', icon: 'warning', weight: 2, cooldownDays: 112, trigger: { type: 'productsOnSale', min: 1 },
    title: 'Market trend slump', text: 'Shoppers are holding on to their money.',
    effects: [{ type: 'modifier', key: 'salesUnitsPct', value: -10, days: 28 }],
  },
  {
    id: 'EV09', kind: 'choice', icon: 'competition', weight: 2, cooldownDays: 112, who: 'rival', trigger: { type: 'competitionsOpen', min: 1 },
    title: 'Rival challenge', text: '{rival} says your robots are all show. They dare you to prove them wrong at the next event.',
    choices: [
      { id: 'accept', label: 'Accept the challenge', effects: [{ type: 'rep', amount: amt(10, 2, 0) }, { type: 'modifier', key: 'competitionPrizePct', value: 15, days: 56 }] },
      { id: 'ignore', label: 'Ignore them', default: true, effects: [] },
    ],
  },
  {
    id: 'EV10', kind: 'choice', icon: 'crate', weight: 8, cooldownDays: 28, who: 'sponsor', trigger: { type: 'sponsorOfferable' },
    title: 'Sponsor offer', text: '{sponsor} would like to sponsor your workshop for six months.',
    effects: [{ type: 'sponsorOffer' }],
    choices: [
      { id: 'look', label: 'See the offer (Finance)', goto: 'finance', effects: [] },
      { id: 'later', label: 'Later — keep it open', default: true, effects: [] },
    ],
  },
  {
    id: 'EV11', kind: 'flavour', icon: 'research', weight: 3, cooldownDays: 56, trigger: { type: 'rpEarned' },
    title: 'Research clue', text: 'An old paper in a second-hand shop had a useful idea in it.',
    effects: [{ type: 'rp', amount: amt(20, 6) }],
  },
  {
    id: 'EV12', kind: 'choice', icon: 'warning', weight: 2, cooldownDays: 112, trigger: { type: 'productsOnSale', min: 1 },
    title: 'Faulty batch scare', text: 'A customer says a robot from your last batch acted strangely.',
    choices: [
      { id: 'recall', label: 'Recall and check them', default: true, effects: [{ type: 'credits', amount: amt(-700, -150) }, { type: 'rep', amount: amt(10, 0, 0) }] },
      { id: 'quiet', label: 'Say nothing and hope', effects: [{ type: 'chance', p: 0.5, then: [{ type: 'rep', amount: amt(-30, -5, 0) }], else: [] }] },
    ],
  },
  {
    id: 'EV13', kind: 'flavour', icon: 'warning', weight: 2, cooldownDays: 84, who: 'team', trigger: { type: 'projectRunning' },
    title: 'Test accident', text: 'A test run went wrong. Nobody was hurt, but {staff} needs a breather and the rig needs repairs.',
    effects: [{ type: 'credits', amount: amt(-400, -100) }, { type: 'energy', who: 'one', amount: -15 }],
  },
  {
    id: 'EV14', kind: 'flavour', icon: 'customer', weight: 2, cooldownDays: 168, trigger: { type: 'facilitiesOwned', min: 5 },
    title: 'Workshop inspection', text: 'The safety inspectors came by and loved your tidy workshop.',
    effects: [{ type: 'rep', amount: amt(20, 3, 0) }],
  },
  {
    id: 'EV15', kind: 'flavour', icon: 'staff', weight: 2, cooldownDays: 112, trigger: { type: 'projectRunning' },
    title: 'University intern day', text: 'Students spent a week helping out. The project moves a little faster.',
    effects: [{ type: 'modifier', key: 'progressPct.all', value: 5, days: 7 }],
  },
  {
    id: 'EV16', kind: 'flavour', icon: 'customer', weight: 2, cooldownDays: 112, trigger: { type: 'flag', flag: 'firstContractDone' },
    title: 'Old customer referral', text: 'A happy customer told their friends about you.',
    effects: [{ type: 'modifier', key: 'contractPayoutPct', value: 10, days: 56 }],
  },
  {
    id: 'EV17', kind: 'choice', icon: 'warning', weight: 2, cooldownDays: 112, trigger: { type: 'projectRunning' },
    title: 'Prototype leak rumour', text: 'Blurry photos of your new robot are all over the internet.',
    choices: [
      { id: 'deny', label: 'Say nothing', default: true, effects: [] },
      { id: 'hype', label: 'Lean into the hype', effects: [{ type: 'chance', p: 0.6, then: [{ type: 'rep', amount: amt(25, 4, 0) }], else: [{ type: 'rep', amount: amt(-15, -2, 0) }] }] },
    ],
  },
  {
    id: 'EV18', kind: 'choice', icon: 'crate', weight: 2, cooldownDays: 112, trigger: { type: 'robotsBuilt', min: 1 },
    title: 'Charity demo', text: 'A children’s hospital asks for a robot show.',
    choices: [
      { id: 'demo', label: 'Put on the show', effects: [{ type: 'credits', amount: amt(-500, -100) }, { type: 'energy', who: 'all', amount: -5 }, { type: 'rep', amount: amt(30, 5, 0) }] },
      { id: 'skip', label: 'Not this time', default: true, effects: [] },
    ],
  },
  {
    id: 'EV19', kind: 'choice', icon: 'crate', weight: 2, cooldownDays: 112, trigger: { type: 'robotsBuilt', min: 1 },
    title: 'Parts salvage opportunity', text: 'A closing factory is selling its spare parts cheaply.',
    choices: [
      { id: 'buy', label: 'Buy the salvage', effects: [{ type: 'credits', amount: amt(-700, -150) }, { type: 'modifier', key: 'materialCostPct', value: -15, days: 42 }] },
      { id: 'pass', label: 'Pass', default: true, effects: [] },
    ],
  },
  // The prestige chain's clue (bible SEC-COMP-03: "after Year 13 or NG+"): stored now; secret rules switch on in Milestones 16–17.
  {
    id: 'EV20', kind: 'flavour', icon: 'secret', weight: 1, once: true, secret: true, trigger: { type: 'secret', id: 'SEC-COMP-03' },
    title: 'Mysterious anonymous message', text: 'An unsigned note: "The Black Circuit is watching."',
    effects: [],
  },
];

export const EVENTS = [...MILESTONE_EVENTS, ...REPEATABLE_EVENTS];
export const EVENTS_BY_ID = Object.fromEntries(EVENTS.map((e) => [e.id, e]));
