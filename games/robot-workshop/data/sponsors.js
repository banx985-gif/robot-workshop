// Sponsors (bible §23): the six sponsor types. Plain data for core/SponsorSystem.js.
// Sponsors open at Rank C; one at a time; each deal lasts 6 months. A missed obligation just ends the benefit at
// renewal (no debt). Benefits are effect keys, read through the shared effect query (Campaign.fx) like facilities:
//   salesRevenuePct            commercial (product sales) revenue
//   partCostPct.<slot>         the build cost of the part in that slot (power = the power system)
//   competitionEntryPct        competition entry fees
//   competitionPrizePct        competition prize cash
//   facilityCostPct            facility prices
//   purposeStat.<purpose>.<STAT>   flat stat on robots of that purpose built while the deal runs
//   competitionStat.<STAT>     flat stat for robots entered in competitions ("competition prototypes")
//   projectRpPct               Research Points from finished robots
// Obligation signals (Campaign sends them):
//   launch (a product launch — power: { slot, minCx } = its part in that slot is at least that complexity)
//   competitionEntered (events: [...] = only those events count)   contractDone   contractFailed
//   robotFinished (aiHeavy: true = an AI-heavy build, the same meaning Milestone 11 used: data/unlocks.js AI_HEAVY)
// Requirement words are the unlock words (data/unlocks.js), plus { type: 'contractsDone', purpose, min }.

export const SPONSOR_RULES = {
  unlock: { type: 'rank', rank: 'C' }, // §23
  dealMonths: 6, // §23
  offerDays: 56, // an offer stays open this long
  cooldownDays: 168, // after a deal ends without its obligation, that sponsor waits 6 months to offer again
};

// Two sponsor reps have art; the others use text + an icon (§23).
export const SPONSOR_ART = {
  techRep: 'npc_sponsor_01_tech_brand',
  energyRep: 'npc_sponsor_02_energy_brand',
};

// M15 choices: "Rescue contract chain" = two Rescue-robot contracts completed; "Racing event" = the Regional Racing
// Circuit (C07), the one racing event on the ladder so far.
export const RACING_EVENTS = ['C07'];

export const SPONSORS = [
  {
    id: 'voltcell',
    name: 'VoltCell Energy',
    art: SPONSOR_ART.energyRep,
    color: '#FFD166',
    requirement: { type: 'research', branch: 'power', level: 3 },
    benefits: [{ key: 'salesRevenuePct', value: 8 }, { key: 'partCostPct.power', value: -10 }],
    benefitText: '+8% commercial revenue · power systems cost 10% less',
    obligation: { type: 'count', signal: 'launch', min: 1, power: { slot: 'power', minCx: 4 } },
    obligationText: 'Launch one product using a High-Density Cell (PO04) or better',
  },
  {
    id: 'brightgear',
    name: 'BrightGear Tech',
    art: SPONSOR_ART.techRep,
    color: '#4FC3F7',
    requirement: { type: 'competition', event: 'wins', min: 3 },
    benefits: [{ key: 'competitionEntryPct', value: -25 }, { key: 'competitionPrizePct', value: 5 }],
    benefitText: 'Competition entry fees −25% · +5% prize cash',
    obligation: { type: 'count', signal: 'competitionEntered', min: 2 },
    obligationText: 'Enter at least two competitions',
  },
  {
    id: 'makermart',
    name: 'MakerMart',
    icon: 'ui_icon_16',
    color: '#FFB74D',
    requirement: { type: 'rank', rank: 'C' },
    benefits: [{ key: 'facilityCostPct', value: -8 }],
    benefitText: 'Facilities cost 8% less',
    obligation: { type: 'count', signal: 'contractDone', min: 2 },
    obligationText: 'Complete 2 contracts',
  },
  {
    id: 'safecore',
    name: 'SafeCore',
    icon: 'ui_icon_14',
    color: '#7CFFB2',
    requirement: { type: 'contractsDone', purpose: 'rescue', min: 2 },
    benefits: [{ key: 'purposeStat.rescue.REL', value: 8 }],
    benefitText: '+8 REL on new Rescue robots',
    obligation: { type: 'avoid', signal: 'contractFailed' },
    obligationText: 'No contract failures during the deal',
  },
  {
    id: 'velocitylab',
    name: 'Velocity Lab',
    icon: 'ui_icon_08_competition',
    color: '#FF8AB3',
    requirement: { type: 'competition', event: 'regionalCup' },
    benefits: [{ key: 'competitionStat.SPD', value: 8 }],
    benefitText: '+8 SPD for robots you enter in competitions',
    obligation: { type: 'count', signal: 'competitionEntered', min: 1, events: RACING_EVENTS },
    obligationText: 'Enter a Racing event (Regional Racing Circuit)',
  },
  {
    id: 'omnisoft',
    name: 'OmniSoft',
    art: SPONSOR_ART.techRep,
    color: '#B39DDB',
    requirement: { type: 'research', branch: 'ai', level: 4 },
    benefits: [{ key: 'projectRpPct', value: 10 }],
    benefitText: '+10% Research Points from projects',
    obligation: { type: 'count', signal: 'robotFinished', min: 1, aiHeavy: true },
    obligationText: 'Finish one AI-heavy build (Lidar Array or better)',
  },
];
export const SPONSORS_BY_ID = Object.fromEntries(SPONSORS.map((s) => [s.id, s]));
