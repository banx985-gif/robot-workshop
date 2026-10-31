// Care plans (Milestone 4, bible §9): the six fixed domains and their options. Milestone 4 had the first two of each
// §9 table; Milestone 8 adds the other 36 (all 48), each option's eligibility rule, the plan-review numbers, option
// preferences by personality and the admission default plan by primary support. Plain data only; the rules that read
// it are in src/systems/careTasks.js (tasks) and src/systems/carePlanRules.js (eligibility, review, preferences), and
// validateCarePlans() runs it through core/DataValidator.
//
// An option row:
//   id, domain, name, text (one plain line), roles (who is eligible to carry it out — bible §11 role ids),
//   minutesPerDay (rough staff time it costs a day; checked against its tasks)
//   tasks:   the tasks it adds each day — { type (data/tasks.js), name, at (hour it opens), band (its deadline band),
//            roles, minutes (time with him), place: 'resident' (wherever he is) | 'room' (his room),
//            drops (need points it takes off), outcomes (small outcome nudges), pref (optional: a preference key he may
//            say no to — bible §6) }
//   changes: how it changes a routine step's task — { step, minutes?, roles?, dropsAdd? }
//   removes: routine steps it takes the staff help away from (they do it on their own) — [step id]
//   eligibility (Milestone 8): rules that must all pass before it can be chosen — [{ type, …, reason }], reason being
//            the plain words the picker shows when it fails. Types (checked by carePlanRules.js eligibilityOf):
//            roleOnTeam { role } · roleOnShifts { role, shifts } · staffOnShift { shift, count } · need { need, min }
//            supportLevel { min } · support { supports, stays } (either matches) · visitors { visitors }
//            room { room } (a room template the home can place) · facility { facility } · program { program }
//            endOfLife { stages } (Milestone 27: their care stage — CL08 / EN08 are offered from "Approaching end of life")
//   nudges (worked out): the needs its tasks ease and the outcomes they nudge

export const DOMAINS = [
  { id: 'PC', name: 'Personal Care', need: 'personal' },
  { id: 'CL', name: 'Clinical/Nursing', need: 'clinical' },
  { id: 'MO', name: 'Mobility', need: 'mobility' },
  { id: 'NU', name: 'Nutrition', need: 'nutrition' },
  { id: 'SO', name: 'Social/Lifestyle', need: 'social' },
  { id: 'EN', name: 'Environment/Safety', need: null },
];
export const DOMAIN_IDS = DOMAINS.map((d) => d.id);
export const domainById = (id) => DOMAINS.find((d) => d.id === id) ?? null;

const ANY = ['RN', 'CW', 'LC', 'AH', 'HN'];

const FIRST_OPTIONS = [
  {
    id: 'PC01', domain: 'PC', name: 'Independent Prompt', roles: ['CW', 'RN'], minutesPerDay: 15,
    text: 'He washes and dresses himself; a carer prompts and checks in.',
    tasks: [{ type: 'personal', name: 'Personal care prompt', at: 7.5, band: 'morning', roles: ['CW', 'RN'], minutes: 15, place: 'resident', drops: { personal: 12 } }],
    changes: [],
  },
  {
    id: 'PC02', domain: 'PC', name: 'Standby Assist', roles: ['CW'], minutesPerDay: 40,
    text: 'A carer stands by while he washes and dresses, ready to help.',
    tasks: [{ type: 'personal', name: 'Standby personal care', at: 7.5, band: 'morning', roles: ['CW'], minutes: 30, place: 'resident', drops: { personal: 22 }, outcomes: { comfort: 1 } }],
    changes: [{ step: 'wake', minutes: 30, roles: ['CW'] }],
  },
  {
    id: 'CL01', domain: 'CL', name: 'Routine Observation', roles: ['RN'], minutesPerDay: 25,
    text: 'The nurse gives his morning medicines and checks on him each afternoon.',
    tasks: [
      { type: 'meds', name: 'Morning medication round', at: 9.5, band: 'morning', roles: ['RN'], minutes: 15, place: 'resident', drops: { clinical: 12 } },
      { type: 'observation', name: 'Afternoon check', at: 15, band: 'afternoon', roles: ['RN'], minutes: 10, place: 'resident', drops: { clinical: 8 } },
    ],
    changes: [],
  },
  {
    id: 'CL02', domain: 'CL', name: 'Medication Support', roles: ['RN'], minutesPerDay: 40,
    text: 'The nurse supports each medicine round, morning and midday.',
    tasks: [
      { type: 'meds', name: 'Morning medication round', at: 9.5, band: 'morning', roles: ['RN'], minutes: 25, place: 'resident', drops: { clinical: 15 } },
      { type: 'meds', name: 'Midday medication round', at: 12.5, band: 'afternoon', roles: ['RN'], minutes: 15, place: 'resident', drops: { clinical: 10 } },
    ],
    changes: [],
  },
  {
    id: 'MO01', domain: 'MO', name: 'Independent Mobility', roles: ['RN', 'AH'], minutesPerDay: 0,
    text: 'He walks on his own; the morning rest includes a quick mobility check.',
    tasks: [],
    changes: [],
  },
  {
    id: 'MO02', domain: 'MO', name: 'Walking Aid Support', roles: ['AH', 'CW', 'RN'], minutesPerDay: 60,
    text: 'He walks with his aid, staff walk alongside him twice a day, and his aid is checked each morning.',
    tasks: [
      { type: 'mobility', name: 'Walk with his frame', at: 10, band: 'morning', roles: ['AH', 'CW', 'RN'], minutes: 25, place: 'resident', drops: { mobility: 15 }, outcomes: { independence: 1 } },
      { type: 'mobility', name: 'Afternoon walk with his frame', at: 15.5, band: 'afternoon', roles: ['AH', 'CW', 'RN'], minutes: 25, place: 'resident', drops: { mobility: 12 }, outcomes: { independence: 1 } },
      { type: 'mobility', name: 'Walking-aid check', at: 9, band: 'morning', roles: ['AH', 'CW'], minutes: 10, place: 'resident', drops: { mobility: 4 }, outcomes: { safety: 1 } }, // (Milestone 16)
    ],
    changes: [],
  },
  {
    id: 'NU01', domain: 'NU', name: 'Standard Menu', roles: ['HN', 'CW'], minutesPerDay: 0,
    text: 'Meals from the standard menu, and the home’s morning and afternoon drinks rounds.',
    tasks: [], // (Milestone 15: its afternoon drinks round is now the home's round for everyone — data/dining.js HYDRATION)
    changes: [],
  },
  {
    id: 'NU02', domain: 'NU', name: 'High-Protein Plan', roles: ['HN', 'CW'], minutesPerDay: 20,
    text: 'Protein-rich meals and an afternoon protein snack.',
    tasks: [{ type: 'hydration', name: 'Protein snack', at: 15, band: 'afternoon', roles: ['HN', 'CW'], minutes: 20, place: 'resident', drops: { nutrition: 15 } }],
    changes: [
      { step: 'breakfast', dropsAdd: { nutrition: 5 } },
      { step: 'dinner', dropsAdd: { nutrition: 5 } },
    ],
  },
  {
    id: 'SO01', domain: 'SO', name: 'Independent Choice', roles: ['LC'], minutesPerDay: 0,
    text: 'He picks his own pastimes; Cards in the lounge is his choice.',
    tasks: [],
    changes: [],
  },
  {
    id: 'SO02', domain: 'SO', name: 'Small Group Activities', roles: ['LC'], minutesPerDay: 30,
    text: 'A small group activity in the lounge each afternoon, as well as Cards.',
    tasks: [{ type: 'activity', name: 'Small group activity', at: 15.5, band: 'afternoon', roles: ['LC'], minutes: 30, place: 'resident', drops: { social: 15, memory: 5 }, outcomes: { connection: 2 }, pref: 'groupActivity' }],
    changes: [],
  },
  {
    id: 'EN01', domain: 'EN', name: 'Standard Room', roles: ANY, minutesPerDay: 10,
    text: 'A tidy, safe room with a daily room check.',
    tasks: [{ type: 'roomCheck', name: 'Room check', at: 9.5, band: 'morning', roles: ANY, minutes: 10, place: 'room', outcomes: { comfort: 1, safety: 1 } }], // Milestone 6: 10:30 → 09:30 (longer walks in the bigger home)
    changes: [],
  },
  {
    id: 'EN02', domain: 'EN', name: 'Near Nurse Station', roles: ['RN', 'CW'], minutesPerDay: 20,
    text: 'Checked on whenever the nurse passes: room checks morning and afternoon.',
    tasks: [
      { type: 'roomCheck', name: 'Morning room check', at: 10, band: 'morning', roles: ['RN', 'CW'], minutes: 10, place: 'room', outcomes: { safety: 1.5 } },
      { type: 'roomCheck', name: 'Afternoon room check', at: 14.5, band: 'afternoon', roles: ['RN', 'CW'], minutes: 10, place: 'room', outcomes: { safety: 1.5 } },
    ],
    changes: [],
  },
];
// Milestone 8: the other 36 options of bible §9 (PC03–08, CL03–08, MO03–08, NU03–08, SO03–08, EN03–08). High-level
// care only: no drug names, doses or diagnoses (bible §16 / Milestone 18). The texts say "they" (any resident).
// A task: t(type, name, at, band, roles, minutes, place, drops, outcomes). minutesPerDay is worked out from the tasks.
const t = (type, name, at, band, roles, minutes, drops = {}, outcomes = {}, place = 'resident') => ({ type, name, at, band, roles, minutes, place, drops, outcomes });
const CW_RN = ['CW', 'RN'];
// Milestone 27: the palliative options are offered once a resident is approaching the end of life (never forced; any room)
const EOL_RULE = { type: 'endOfLife', stages: ['approaching', 'final'], reason: 'Offered once a resident is approaching the end of life' };
const CARERS = ['CW', 'AH', 'RN'];
const FOOD = ['HN', 'CW'];
const TALK = ['LC', 'CW'];
// Milestone 15: a special menu needs someone who can make it — a Hospitality worker with the Nutrition specialty (or a
// diet trait: Texture Expert, Diet Match, Nutrition Lead) on the team, or a Nutrition Office (F17).
const DIET_SKILL = (diet) => ({ type: 'dietSkill', diet, reason: 'Needs a Hospitality worker with the Nutrition specialty (or a diet trait), or a Nutrition Office (F17)' });
const opt = (o) => ({ changes: [], removes: [], eligibility: [], ...o, minutesPerDay: o.minutesPerDay ?? planMinutes(o) });
function planMinutes(o) {
  return (o.tasks ?? []).reduce((s, x) => s + x.minutes, 0) + (o.changes ?? []).reduce((s, c) => s + (c.minutes ? c.minutes - 20 : 0), 0);
}
const NEW_OPTIONS = [
  // --- Personal Care -----------------------------------------------------------------------------------------------
  opt({
    id: 'PC03', domain: 'PC', name: 'One-Person Assist', roles: ['CW'],
    text: 'A carer helps them wash and dress, and with getting up.',
    tasks: [t('personal', 'Personal care with a carer', 7.5, 'morning', ['CW'], 35, { personal: 28 }, { comfort: 1 })],
    changes: [{ step: 'wake', minutes: 30, roles: ['CW'] }],
  }),
  opt({
    id: 'PC04', domain: 'PC', name: 'Two-Person Assist', roles: ['CW', 'AH', 'RN'],
    text: 'Two staff help together with washing, dressing and moving.',
    tasks: [
      t('personal', 'Two-person personal care', 7.5, 'morning', ['CW'], 30, { personal: 20 }, { comfort: 1, safety: 1 }),
      t('personal', 'Second carer for personal care', 7.5, 'morning', CARERS, 30, { personal: 12 }, { safety: 1 }),
    ],
    changes: [{ step: 'wake', minutes: 30, roles: ['CW'] }],
    eligibility: [
      { type: 'need', need: 'personal', min: 70, reason: 'Needs Personal Support of 70 or more' },
      { type: 'staffOnShift', shift: 'morning', count: 2, reason: 'Needs two staff on the Morning shift' },
    ],
  }),
  opt({
    id: 'PC05', domain: 'PC', name: 'Morning Routine Support', roles: ['CW'],
    text: 'An unhurried start: help to get up, wash, dress and get ready the way they like.',
    tasks: [t('personal', 'Morning grooming', 8, 'morning', ['CW'], 25, { personal: 18 }, { mood: 1 })],
    changes: [{ step: 'wake', minutes: 30, roles: ['CW'] }],
  }),
  opt({
    id: 'PC06', domain: 'PC', name: 'Evening Routine Support', roles: ['CW'],
    text: 'Help with an evening wash and change, and a calm settle for the night.',
    tasks: [t('personal', 'Evening wash and change', 19, 'evening', ['CW'], 25, { personal: 18 }, { comfort: 1 })],
    changes: [{ step: 'settle', minutes: 30, roles: ['CW'] }],
    eligibility: [{ type: 'roleOnShifts', role: 'CW', shifts: ['afternoon'], reason: 'Needs a Care Worker on the Afternoon shift' }],
  }),
  opt({
    id: 'PC07', domain: 'PC', name: 'Continence Support', roles: CW_RN,
    text: 'Discreet, regular checks and help through the day.',
    tasks: [
      t('personal', 'Continence check', 10, 'morning', CW_RN, 10, { personal: 10 }, { comfort: 1 }),
      t('personal', 'Afternoon continence check', 15, 'afternoon', CW_RN, 10, { personal: 10 }, { comfort: 1 }),
      t('personal', 'Evening continence check', 20, 'evening', CW_RN, 10, { personal: 8 }, { comfort: 1 }),
    ],
    eligibility: [{ type: 'need', need: 'personal', min: 35, reason: 'Needs Personal Support of 35 or more' }],
  }),
  opt({
    id: 'PC08', domain: 'PC', name: 'Personal Preference Plan', roles: ['CW'],
    text: 'Personal care at the time and in the way they choose.',
    tasks: [t('personal', 'Personal care at their chosen time', 9, 'morning', ['CW'], 20, { personal: 15 }, { mood: 2 })],
  }),
  // --- Clinical/Nursing -------------------------------------------------------------------------------------------
  opt({
    id: 'CL03', domain: 'CL', name: 'Complex Medication Round', roles: ['RN'],
    text: 'The nurse supports three medicine rounds a day: morning, midday and evening.',
    tasks: [
      t('meds', 'Morning medication round', 9.5, 'morning', ['RN'], 25, { clinical: 15 }),
      t('meds', 'Midday medication round', 12.5, 'afternoon', ['RN'], 15, { clinical: 10 }),
      t('meds', 'Evening medication round', 18, 'evening', ['RN'], 15, { clinical: 10 }),
    ],
    eligibility: [{ type: 'roleOnShifts', role: 'RN', shifts: ['morning', 'afternoon'], reason: 'Needs a Registered Nurse on the Morning and Afternoon shifts' }],
  }),
  opt({
    id: 'CL04', domain: 'CL', name: 'Skin Care Support', roles: ['RN'],
    text: 'The nurse checks and cares for their skin each morning and afternoon.',
    tasks: [
      t('observation', 'Skin care check', 10.5, 'morning', ['RN'], 20, { clinical: 12 }, { comfort: 1 }),
      t('observation', 'Afternoon skin check', 15.5, 'afternoon', ['RN'], 10, { clinical: 6 }),
    ],
    eligibility: [{ type: 'roleOnTeam', role: 'RN', reason: 'Needs a Registered Nurse on the roster' }],
  }),
  opt({
    id: 'CL05', domain: 'CL', name: 'Blood Sugar Support', roles: ['RN'],
    text: 'Health checks before breakfast and the evening meal, and the morning medicines.',
    tasks: [
      t('observation', 'Morning health check', 8, 'morning', ['RN'], 10, { clinical: 8 }),
      t('meds', 'Morning medication round', 9.5, 'morning', ['RN'], 15, { clinical: 10 }),
      t('observation', 'Evening health check', 17, 'evening', ['RN'], 10, { clinical: 8 }),
    ],
    eligibility: [{ type: 'roleOnShifts', role: 'RN', shifts: ['morning', 'afternoon'], reason: 'Needs a Registered Nurse on the Morning and Afternoon shifts' }],
  }),
  opt({
    id: 'CL06', domain: 'CL', name: 'Pain & Comfort Plan', roles: CW_RN,
    text: 'Regular comfort checks: how they feel, a change of position, a warm drink.',
    tasks: [
      t('observation', 'Comfort check', 11, 'morning', CW_RN, 15, { clinical: 8 }, { comfort: 2 }),
      t('observation', 'Evening comfort check', 20, 'evening', CW_RN, 15, { clinical: 6 }, { comfort: 2 }),
    ],
    eligibility: [{ type: 'roleOnTeam', role: 'RN', reason: 'Needs a Registered Nurse on the roster' }],
  }),
  opt({
    id: 'CL07', domain: 'CL', name: 'High-Care Observation', roles: ['RN'],
    text: 'The nurse looks in on them through the day and into the night.',
    tasks: [
      t('observation', 'Morning nurse check', 8, 'morning', ['RN'], 10, { clinical: 8 }, { safety: 1 }),
      t('observation', 'Midday nurse check', 12.5, 'afternoon', ['RN'], 10, { clinical: 8 }, { safety: 1 }),
      t('observation', 'Afternoon nurse check', 16, 'afternoon', ['RN'], 10, { clinical: 8 }, { safety: 1 }),
      t('observation', 'Evening nurse check', 20, 'evening', ['RN'], 10, { clinical: 8 }, { safety: 1 }),
      t('observation', 'Night nurse check', 23, 'night', ['RN', 'CW'], 10, { clinical: 6 }, { safety: 1 }),
    ],
    eligibility: [
      { type: 'supportLevel', min: 4, reason: 'Only for residents with Support Level 4 or 5' },
      { type: 'roleOnShifts', role: 'RN', shifts: ['morning', 'afternoon'], reason: 'Needs a Registered Nurse on the Morning and Afternoon shifts' },
    ],
  }),
  opt({
    id: 'CL08', domain: 'CL', name: 'Palliative Comfort Plan', roles: CW_RN,
    text: 'Comfort first: gentle care, company and calm, day and night.',
    // (Milestone 27: the tasks shift to comfort — mouth care, company, position changes and quiet time, in plain words)
    tasks: [
      t('observation', 'Mouth care and a gentle wash', 10, 'morning', CW_RN, 15, { clinical: 8 }, { comfort: 3 }),
      t('observation', 'Company and a position change', 14, 'afternoon', CW_RN, 15, { clinical: 8 }, { comfort: 3, mood: 1 }),
      t('observation', 'Quiet time and a position change', 19, 'evening', CW_RN, 15, { clinical: 8 }, { comfort: 3 }),
      t('observation', 'Night comfort and a position change', 23, 'night', CW_RN, 15, { clinical: 6 }, { comfort: 3 }),
    ],
    eligibility: [EOL_RULE],
  }),
  // --- Mobility ---------------------------------------------------------------------------------------------------
  opt({
    id: 'MO03', domain: 'MO', name: 'Supervised Walking', roles: CARERS,
    text: 'Staff walk beside them twice a day, keeping them steady and safe.',
    tasks: [
      t('mobility', 'Supervised walk', 10, 'morning', CARERS, 25, { mobility: 15 }, { safety: 1 }),
      t('mobility', 'Afternoon supervised walk', 15.5, 'afternoon', CARERS, 25, { mobility: 12 }, { safety: 1 }),
    ],
    eligibility: [{ type: 'need', need: 'mobility', min: 30, reason: 'Needs Mobility support of 30 or more' }],
  }),
  opt({
    id: 'MO04', domain: 'MO', name: 'Transfer Assist', roles: ['CW', 'AH'],
    text: 'Help moving from bed to chair and back, three times a day (with two staff when moving is hard).',
    tasks: [
      t('mobility', 'Morning transfer', 7.5, 'morning', ['CW', 'AH'], 15, { mobility: 10 }, { safety: 1 }),
      t('mobility', 'Midday transfer', 13, 'afternoon', ['CW', 'AH'], 15, { mobility: 8 }, { safety: 1 }),
      t('mobility', 'Evening transfer', 19.5, 'evening', CW_RN, 15, { mobility: 8 }, { safety: 1 }),
    ],
    eligibility: [{ type: 'need', need: 'mobility', min: 45, reason: 'Needs Mobility support of 45 or more' }],
  }),
  opt({
    id: 'MO05', domain: 'MO', name: 'Falls Prevention Plan', roles: CARERS,
    text: 'A safety check of their room and a steady walk each day.',
    tasks: [
      t('roomCheck', 'Falls safety check', 10, 'morning', CARERS, 15, {}, { safety: 2 }, 'room'),
      t('mobility', 'Steady walk', 15, 'afternoon', ['AH', 'CW'], 20, { mobility: 10 }, { safety: 1 }),
    ],
  }),
  opt({
    id: 'MO06', domain: 'MO', name: 'Strength & Balance', roles: ['AH'],
    text: 'Exercises with Allied Health to build strength and balance.',
    tasks: [
      t('mobility', 'Strength and balance session', 10.5, 'morning', ['AH'], 30, { mobility: 15 }, { independence: 2 }),
      t('mobility', 'Afternoon balance exercises', 15.5, 'afternoon', ['AH'], 20, { mobility: 10 }, { independence: 1 }),
    ],
    eligibility: [{ type: 'roleOnTeam', role: 'AH', reason: 'Needs an Allied Health worker on the roster' }],
  }),
  opt({
    id: 'MO07', domain: 'MO', name: 'Rehabilitation Plan', roles: ['AH'],
    text: 'Daily therapy with Allied Health, working towards going home.', // (Milestone 16: the afternoon session is the therapy step every rehab resident has)
    tasks: [
      t('mobility', 'Therapy session', 10, 'morning', ['AH'], 40, { mobility: 20 }, { independence: 3 }),
    ],
    eligibility: [
      { type: 'roleOnTeam', role: 'AH', reason: 'Needs an Allied Health worker on the roster' },
      { type: 'support', supports: ['Rehabilitation', 'Mobility Support'], stays: ['Rehab/Short Stay'], reason: 'Only for residents here for rehabilitation or mobility support' },
    ],
  }),
  opt({
    id: 'MO08', domain: 'MO', name: 'Wheelchair Mobility Plan', roles: ['CW', 'AH'],
    text: 'Moving about the home by wheelchair, with help to get where they want to be.',
    tasks: [
      t('mobility', 'Wheelchair transfer', 9, 'morning', ['CW', 'AH'], 15, { mobility: 8 }),
      t('mobility', 'Midday wheelchair help', 13, 'afternoon', ['CW', 'AH'], 15, { mobility: 8 }),
      t('mobility', 'Afternoon trip round the home', 16, 'afternoon', ['CW', 'AH', 'LC'], 20, { mobility: 8, social: 5 }, { independence: 1 }),
    ],
    eligibility: [{ type: 'need', need: 'mobility', min: 50, reason: 'Needs Mobility support of 50 or more' }],
  }),
  // --- Nutrition --------------------------------------------------------------------------------------------------
  opt({
    id: 'NU03', domain: 'NU', name: 'Hydration Plan', roles: FOOD,
    text: 'An extra drinks round in the evening, as well as the home’s morning and afternoon rounds.',
    // (Milestone 15: the morning and afternoon rounds are the home's, for everyone; this plan adds the extra round)
    tasks: [t('hydration', 'Evening drinks round', 19, 'evening', FOOD, 5, { nutrition: 8 })],
  }),
  opt({
    id: 'NU04', domain: 'NU', name: 'Low-Sugar Menu', roles: ['HN'],
    text: 'Balanced meals planned by the kitchen, with a steady afternoon snack.',
    tasks: [t('hydration', 'Balanced afternoon snack', 15, 'afternoon', FOOD, 10, { nutrition: 8, clinical: 4 })],
    changes: [
      { step: 'breakfast', dropsAdd: { clinical: 3 } },
      { step: 'dinner', dropsAdd: { clinical: 3 } },
    ],
    eligibility: [{ type: 'roleOnTeam', role: 'HN', reason: 'Needs a Hospitality & Nutrition worker on the roster' }, DIET_SKILL('lowSugar')],
  }),
  opt({
    id: 'NU05', domain: 'NU', name: 'Texture-Modified Meals', roles: ['HN'],
    text: 'Meals prepared soft and easy to eat, with help at each one.',
    tasks: [], // (Milestone 15: its midday meal is now the lunch service, with help)
    changes: [
      { step: 'breakfast', minutes: 30, roles: FOOD },
      { step: 'lunch', minutes: 30, roles: FOOD },
      { step: 'dinner', minutes: 30, roles: FOOD },
    ],
    eligibility: [{ type: 'roleOnTeam', role: 'HN', reason: 'Needs a Hospitality & Nutrition worker on the roster' }, DIET_SKILL('texture')],
  }),
  opt({
    id: 'NU06', domain: 'NU', name: 'Small Frequent Meals', roles: FOOD,
    text: 'Small snacks through the day as well as meals.',
    tasks: [
      t('hydration', 'Mid-morning snack', 10.5, 'morning', FOOD, 15, { nutrition: 10 }),
      t('hydration', 'Afternoon snack', 15, 'afternoon', FOOD, 15, { nutrition: 10 }),
      t('hydration', 'Evening snack', 20, 'evening', FOOD, 15, { nutrition: 10 }),
    ],
    eligibility: [{ type: 'need', need: 'nutrition', min: 40, reason: 'Needs Nutrition support of 40 or more' }],
  }),
  opt({
    id: 'NU07', domain: 'NU', name: 'Favourite-Food Boost', roles: FOOD,
    text: 'Their favourite foods on the menu, and a treat each afternoon.',
    tasks: [t('hydration', 'Favourite treat', 15, 'afternoon', FOOD, 15, { nutrition: 12 }, { mood: 2 })],
    changes: [{ step: 'dinner', dropsAdd: { nutrition: 3 } }],
  }),
  opt({
    id: 'NU08', domain: 'NU', name: 'Dietitian Review Plan', roles: ['HN'],
    text: 'A nutrition review each day from the Nutrition Office.',
    tasks: [t('hydration', 'Nutrition review', 11, 'morning', ['HN'], 30, { nutrition: 15 }, { comfort: 1 })],
    eligibility: [{ type: 'facility', facility: 'F17', reason: 'Needs a Nutrition Office (arrives with Nutrition research)' }],
  }),
  // --- Social/Lifestyle ---------------------------------------------------------------------------------------------
  opt({
    id: 'SO03', domain: 'SO', name: 'One-to-One Visits', roles: TALK,
    text: 'Time with a member of staff, just the two of them, twice a day.',
    tasks: [
      t('visit', 'One-to-one visit', 11, 'morning', TALK, 25, { social: 15, memory: 5 }, { connection: 2 }),
      t('visit', 'Afternoon one-to-one', 16, 'afternoon', TALK, 20, { social: 10 }, { connection: 1 }),
    ],
  }),
  opt({
    id: 'SO04', domain: 'SO', name: 'Music & Memory', roles: ['LC'],
    text: 'Favourite music and songs from their past, with the Lifestyle Coordinator.',
    tasks: [t('activity', 'Music and memory session', 14.5, 'afternoon', ['LC'], 30, { memory: 12, social: 10 }, { mood: 2 })],
    eligibility: [{ type: 'roleOnTeam', role: 'LC', reason: 'Needs a Lifestyle Coordinator on the roster' }],
  }),
  opt({
    id: 'SO05', domain: 'SO', name: 'Gardening Program', roles: ['LC'],
    text: 'Planting and tending the garden with others.',
    tasks: [t('activity', 'Gardening group', 10.5, 'morning', ['LC'], 30, { social: 12 }, { mood: 3 })],
    eligibility: [{ type: 'program', program: 'PRG01', reason: 'Needs the Gardening & Horticulture program (a garden and Lifestyle staff)' }],
  }),
  opt({
    id: 'SO06', domain: 'SO', name: 'Community Outings', roles: TALK,
    text: 'Trips out into the community: the shops, a café, the park.',
    tasks: [t('activity', 'Community outing', 13, 'afternoon', TALK, 60, { social: 20 }, { mood: 3 })],
    eligibility: [{ type: 'facility', facility: 'F26', reason: 'Needs a Transport Bay (arrives at Rank B)' }],
  }),
  opt({
    id: 'SO07', domain: 'SO', name: 'Family Connection Plan', roles: TALK,
    text: 'Help staying close to family: calls, visits and news.',
    tasks: [t('visit', 'Family call or visit', 16.5, 'afternoon', TALK, 20, { social: 12 }, { connection: 3 })],
    eligibility: [{ type: 'visitors', visitors: ['Frequent family', 'Occasional family'], reason: 'Only for residents whose family visit' }],
  }),
  opt({
    id: 'SO08', domain: 'SO', name: 'Quiet Interest Plan', roles: TALK,
    text: 'Quiet pastimes of their own choosing instead of the busy Cards table.',
    tasks: [t('visit', 'Quiet interest time', 11, 'morning', TALK, 15, { social: 8, memory: 5 }, { mood: 1 })],
    removes: ['cards'],
  }),
  // --- Environment/Safety ----------------------------------------------------------------------------------------
  opt({
    id: 'EN03', domain: 'EN', name: 'Low-Stimulation Room', roles: CW_RN,
    text: 'A calm, quiet room with soft light and few distractions.',
    tasks: [
      t('roomCheck', 'Calm room check', 10, 'morning', CW_RN, 10, {}, { comfort: 2 }, 'room'),
      t('roomCheck', 'Afternoon calm room check', 16, 'afternoon', CW_RN, 10, {}, { comfort: 1 }, 'room'),
    ],
    eligibility: [{ type: 'room', room: 'RM05', reason: 'Needs a Memory Support Room (arrives with the Memory Wing)' }],
  }),
  opt({
    id: 'EN04', domain: 'EN', name: 'Memory-Safe Environment', roles: ['CW', 'RN', 'LC'],
    text: 'Clear signs, familiar things and safe spaces to walk.',
    tasks: [
      t('roomCheck', 'Memory-safe room check', 9.5, 'morning', ['CW', 'RN', 'LC'], 10, { memory: 3 }, { safety: 2 }, 'room'),
      t('roomCheck', 'Afternoon memory-safe check', 14, 'afternoon', ['CW', 'RN', 'LC'], 10, { memory: 3 }, { safety: 1 }, 'room'),
      t('roomCheck', 'Evening memory-safe check', 19.5, 'evening', CW_RN, 10, {}, { safety: 1 }, 'room'),
    ],
    eligibility: [{ type: 'room', room: 'RM05', reason: 'Needs a Memory Support Room (arrives with the Memory Wing)' }],
  }),
  opt({
    id: 'EN05', domain: 'EN', name: 'Falls-Safe Layout', roles: ['AH', 'CW'],
    text: 'Their room set out for safe moving: clear floors, rails and good light.',
    tasks: [t('roomCheck', 'Falls-safe room check', 10, 'morning', ['AH', 'CW'], 15, {}, { safety: 2 }, 'room')],
    eligibility: [{ type: 'roleOnTeam', role: 'AH', reason: 'Needs an Allied Health worker on the roster' }],
  }),
  opt({
    id: 'EN06', domain: 'EN', name: 'Garden Access', roles: TALK,
    text: 'Time outside in the garden whenever they like.',
    tasks: [t('activity', 'Time in the garden', 14, 'afternoon', TALK, 20, { social: 5 }, { mood: 3 })],
    eligibility: [{ type: 'facility', facility: 'F14', reason: 'Needs a Courtyard Garden (arrives at Rank D)' }],
  }),
  opt({
    id: 'EN07', domain: 'EN', name: 'Night Comfort Setup', roles: CW_RN,
    text: 'A settled room for the night and a quiet check once they are asleep.',
    tasks: [
      t('roomCheck', 'Evening room setup', 21, 'evening', CW_RN, 10, {}, { comfort: 2 }, 'room'),
      t('roomCheck', 'Night comfort check', 23, 'night', CW_RN, 10, {}, { comfort: 1, safety: 1 }, 'room'),
    ],
    eligibility: [{ type: 'staffOnShift', shift: 'night', count: 1, reason: 'Needs staff rostered on the Night shift' }],
  }),
  opt({
    id: 'EN08', domain: 'EN', name: 'Palliative Family Setup', roles: CW_RN,
    text: 'Space and comfort for family to stay close.',
    tasks: [t('roomCheck', 'Family comfort check', 15, 'afternoon', CW_RN, 15, {}, { comfort: 2 }, 'room')],
    eligibility: [EOL_RULE],
  }),
];

// All 48, in §9 order (PC01–08, CL01–08, MO01–08, NU01–08, SO01–08, EN01–08).
const DOMAIN_ORDER = ['PC', 'CL', 'MO', 'NU', 'SO', 'EN'];
export const CARE_OPTIONS = [...FIRST_OPTIONS.map((o) => ({ changes: [], removes: [], eligibility: [], ...o })), ...NEW_OPTIONS]
  .sort((a, b) => DOMAIN_ORDER.indexOf(a.domain) - DOMAIN_ORDER.indexOf(b.domain) || a.id.localeCompare(b.id))
  .map((o) => ({
    ...o,
    nudges: {
      needs: [...new Set([...o.tasks.flatMap((x) => Object.keys(x.drops ?? {})), ...o.changes.flatMap((c) => Object.keys(c.dropsAdd ?? {}))])],
      outcomes: [...new Set(o.tasks.flatMap((x) => Object.keys(x.outcomes ?? {})))],
    },
  }));
export const ELIGIBILITY_TYPES = ['roleOnTeam', 'roleOnShifts', 'staffOnShift', 'need', 'supportLevel', 'support', 'visitors', 'room', 'facility', 'program', 'dietSkill', 'endOfLife']; // (Milestone 15: dietSkill; Milestone 27: endOfLife)

// Plan review (bible §9 end): a plan is stale — an amber dot, the Care badge, Care's "Plans to review" — when the
// resident was just admitted and hasn't had a first review, a need has moved by needChange or more since the last
// review, essential tasks were missed on missedStreakDays days running, or periodDays have passed since the last review.
export const REVIEW = { needChange: 20, missedStreakDays: 3, periodDays: 28 };

// Option preferences (bible §6, Milestone 8): per personality, the options a resident prefers, dislikes or refuses
// (everything else: accept). Choosing a disliked option costs a little Mood (shown before confirming); a preferred one
// lifts it a little. A refused option can still be chosen, but its tasks are refused (and logged) whenever they come up —
// no score, pin or shortage ever overrides that. A disliked option's tasks are said no to at the dislike chance
// (data/routine.js PREF_RULES), like a disliked routine step.
export const OPTION_PREF_MOOD = { prefer: 1, dislike: -3 };
export const OPTION_PREFS_BY_PERSONALITY = {
  Warm: { SO03: 'prefer', SO07: 'prefer' },
  Chatty: { SO02: 'prefer', SO03: 'prefer', SO08: 'dislike' },
  Curious: { SO04: 'prefer', SO06: 'prefer' },
  'Stubbornly Independent': { PC01: 'prefer', PC03: 'dislike', PC04: 'dislike', MO03: 'dislike', SO02: 'dislike' },
  Quiet: { SO08: 'prefer', EN03: 'prefer', SO02: 'dislike', SO06: 'dislike' },
  'Routine-Loving': { PC05: 'prefer', PC08: 'prefer', SO06: 'dislike' },
  Cheerful: { SO02: 'prefer', SO06: 'prefer' },
  Independent: { PC01: 'prefer', MO01: 'prefer', PC03: 'dislike', MO04: 'dislike', MO08: 'refuse' },
  Witty: { SO03: 'prefer', SO04: 'prefer' },
  Reserved: { SO08: 'prefer', SO02: 'dislike', SO06: 'refuse' },
};

// The first plan a newly admitted resident gets, by primary support (bible §7): for each domain, the options to try in
// order — the first one that is eligible (and that they don't dislike or refuse) is taken, else that domain's 01.
export const ADMISSION_PLANS = {
  'Light Support': {},
  'Mobility Support': { PC: ['PC02'], MO: ['MO03', 'MO02'], EN: ['EN05', 'EN01'] },
  'Memory Support': { PC: ['PC02'], SO: ['SO04', 'SO02'], EN: ['EN04', 'EN01'] },
  'Clinical Support': { CL: ['CL03', 'CL02'], EN: ['EN02'] },
  Rehabilitation: { PC: ['PC02'], MO: ['MO07', 'MO03', 'MO02'] },
  'Nutrition Support': { NU: ['NU05', 'NU06', 'NU02'] },
  'Social Support': { SO: ['SO03', 'SO02'] },
  'High Care': { PC: ['PC04', 'PC03', 'PC02'], CL: ['CL07', 'CL02'], MO: ['MO04', 'MO02'], EN: ['EN02'] },
};

// Preference keys a plan task can carry (a resident may say no to it — bible §6); data/residents.js prefs may use them.
export const PLAN_PREF_KEYS = [...new Set(CARE_OPTIONS.flatMap((o) => o.tasks.map((x) => x.pref).filter(Boolean)))];
export const optionById = (id) => CARE_OPTIONS.find((o) => o.id === id) ?? null;
export const optionsFor = (domain) => CARE_OPTIONS.filter((o) => o.domain === domain);
// A plan: { PC: 'PC01', CL: 'CL01', … } — exactly one option per domain.
export const DEFAULT_PLAN = Object.fromEntries(DOMAINS.map((d) => [d.id, optionsFor(d.id)[0].id]));
// A plan with one known option per domain: anything missing or unknown takes the fallback's (else the default).
export function ensurePlan(plan, fallback = DEFAULT_PLAN) {
  const out = {};
  for (const d of DOMAINS) {
    const id = plan?.[d.id];
    out[d.id] = optionById(id)?.domain === d.id ? id : optionById(fallback?.[d.id])?.domain === d.id ? fallback[d.id] : DEFAULT_PLAN[d.id];
  }
  return out;
}

// Check the options (debug builds at start-up, and the Node tests). v = a core/DataValidator.
//   known = { taskTypes: [ids], steps: [routine step ids], bands: [band ids], needs: [ids], outcomes: [ids], roles: [ids] }
export function validateCarePlans(v, known, list = CARE_OPTIONS) {
  v.uniqueIds('care options', list);
  const set = (k) => new Set(known[k] ?? []);
  const [types, steps, bands, needs, outcomes, roles] = ['taskTypes', 'steps', 'bands', 'needs', 'outcomes', 'roles'].map(set);
  for (const d of DOMAINS) v.check(list.some((o) => o.domain === d.id), `domain ${d.id} has no options`);
  const full = list === CARE_OPTIONS;
  if (full) for (const d of DOMAINS) v.check(list.filter((o) => o.domain === d.id).length === 8, `domain ${d.id} must have 8 options (bible §9)`);
  for (const o of list) {
    const who = `care option ${o.id}`;
    v.check(/^(PC|CL|MO|NU|SO|EN)\d{2}$/.test(o.id) && o.id.startsWith(o.domain), `${who}: id must be <domain>nn`);
    v.check(!!domainById(o.domain), `${who}: unknown domain ${o.domain}`);
    for (const k of ['name', 'text']) v.check(typeof o[k] === 'string' && o[k].length > 0, `${who}: ${k} missing`);
    v.check(Array.isArray(o.roles) && o.roles.length > 0, `${who}: roles missing`);
    for (const r of o.roles ?? []) v.ref(who, 'role', r, roles);
    v.check(Number.isFinite(o.minutesPerDay) && o.minutesPerDay >= 0, `${who}: minutesPerDay`);
    let minutes = 0;
    for (const t of o.tasks ?? []) {
      const tw = `${who} task ${t.name}`;
      v.ref(tw, 'task type', t.type, types);
      v.ref(tw, 'band', t.band, bands);
      v.check(typeof t.at === 'number' && t.at >= 0 && t.at < 24, `${tw}: at`);
      v.check(['resident', 'room'].includes(t.place), `${tw}: place`);
      v.check(Number.isFinite(t.minutes) && t.minutes > 0, `${tw}: minutes`);
      for (const r of t.roles ?? []) v.ref(tw, 'role', r, roles);
      v.check((t.roles ?? []).length > 0, `${tw}: roles`);
      for (const n of Object.keys(t.drops ?? {})) v.ref(tw, 'need', n, needs);
      for (const n of Object.keys(t.outcomes ?? {})) v.ref(tw, 'outcome', n, outcomes);
      minutes += t.minutes;
    }
    for (const st of o.removes ?? []) v.ref(who, 'routine step', st, steps);
    v.check(Array.isArray(o.eligibility), `${who}: eligibility must be a list`);
    for (const r of o.eligibility ?? []) {
      v.check(ELIGIBILITY_TYPES.includes(r.type), `${who}: unknown eligibility type "${r.type}"`);
      v.check(typeof r.reason === 'string' && r.reason.length > 8, `${who}: eligibility needs a plain-words reason`);
      if (r.role) v.ref(who, 'role', r.role, roles);
      if (r.need) v.ref(who, 'need', r.need, needs);
      if (r.type === 'need' || r.type === 'supportLevel') v.check(Number.isFinite(r.min), `${who}: ${r.type} rule needs min`);
      if (r.type === 'roleOnShifts') v.check(Array.isArray(r.shifts) && r.shifts.length > 0, `${who}: roleOnShifts needs shifts`);
      if (r.type === 'staffOnShift') v.check(typeof r.shift === 'string' && r.count >= 1, `${who}: staffOnShift needs shift and count`);
      if (r.type === 'room') v.check(/^RM0\d$/.test(r.room ?? ''), `${who}: room rule needs a room template`);
      if (r.type === 'facility') v.check(/^F\d{2}$/.test(r.facility ?? ''), `${who}: facility rule needs a facility id`);
      if (r.type === 'program') v.check(/^PRG\d{2}$/.test(r.program ?? ''), `${who}: program rule needs a program id`);
    }
    for (const c of o.changes ?? []) {
      v.ref(who, 'routine step', c.step, steps);
      for (const n of Object.keys(c.dropsAdd ?? {})) v.ref(who, 'need', n, needs);
      for (const r of c.roles ?? []) v.ref(who, 'role', r, roles);
      if (c.minutes) minutes += c.minutes - 20; // a routine step's own help is 20 minutes (data/tasks.js)
    }
    v.check(Math.abs(minutes - o.minutesPerDay) <= 15, `${who}: minutesPerDay ${o.minutesPerDay} vs its tasks ${minutes}`);
  }
  return v;
}
