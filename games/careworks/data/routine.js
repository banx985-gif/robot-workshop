// The day and Arthur's routine (Milestone 2, bible §3 and §6). Plain data only; the rules that use it are in
// src/systems/residentNeeds.js and src/systems/homeWorld.js.

// The calendar (bible §3): 12 months × 28 days. secondsPerDay is NOT the bible's 2.5 s: at 2.5 s Arthur could never
// walk his routine (one room → lounge walk is ~8 s). Aaron chose a longer day for now (DECISIONS.md, 28 Sept) — settle
// before Milestone 5 adds 2×/4×. At 90 s a game hour is 3.75 real seconds.
// Milestone 25b: 100 s (a game hour is ~4.2 real seconds; a 28-day month ~47 min, a year ~9 h 20 min at 1×), with
// walking 10% slower (data/balance.js WALK) so everything looks calmer and care per game day stays the same.
export const DAY = {
  secondsPerDay: 100,
  daysPerMonth: 28,
  monthsPerYear: 12,
  speeds: [1, 2, 4], // only 1× (and Pause) usable until Milestone 5
  unlockedSpeeds: [1],
  startHour: 5.9, // a new facility opens just before the Morning shift starts
};
// Milestone 25b: the few timers counted in real seconds (a staff member's wait at a post, a stuck walk's limit) were set
// on the 90-second day; × this keeps them the same length in game time on the longer day.
export const TIMER_SCALE = DAY.secondsPerDay / 90;

// The four simulation bands (bible §3), by hour of the day. Night wraps past midnight.
export const BANDS = [
  { id: 'night', name: 'Night / early morning', from: 22, to: 6 },
  { id: 'morning', name: 'Morning peak', from: 6, to: 12 },
  { id: 'afternoon', name: 'Afternoon / activities', from: 12, to: 17 },
  { id: 'evening', name: 'Evening / settling', from: 17, to: 22 },
];

// Where things happen: spots on the home grid (data/home.js). 'room' = the resident's own room (its inside spot).
export const PLACES = {
  room: { spot: null, name: 'his room' }, // filled from the resident's room
  dining: { spot: 'F03.dining', name: 'the Dining Room' }, // Milestone 5 (the lounge's dining table before)
  lounge: { spot: 'F05.resident', name: 'the Activity Lounge' },
};

// One fixed daily routine, in order, by the hour each step starts. Milestone 3: roles = who may help with it (bible
// §11 roles; an on-shift helper walks to him and the step happens when both are there), task = what the helper does.
// Wake-up moved to 07:00 so the Morning shift (from 06:00) is in place first. A step "happens" when he gets there (drops then
// apply). optional: he may say no to it (bible §6: eligible routines, activities and meals — waking and settling for the
// night always happen). drops: need points taken off; activity: the day's one activity (its refusal nudges Social Connection down).
//   log: the word in today's log · doing: the card's line while there · going: while walking
export const ROUTINE = [
  { id: 'wake', name: 'Wake up', at: 7, place: 'room', roles: ['CW'], task: 'help him get up and dressed', log: 'Woke', doing: 'Up and dressed in his room', going: 'Heading back to his room', drops: { personal: 30 } },
  { id: 'breakfast', name: 'Breakfast', at: 8.5, place: 'dining', optional: true, roles: ['CW', 'HN'], task: 'support him at breakfast', log: 'Breakfast', doing: 'Having breakfast', going: 'Walking to breakfast', drops: { nutrition: 40, social: 5 } },
  { id: 'rest', name: 'Morning rest', at: 11, place: 'room', optional: true, roles: ['RN', 'AH'], task: 'a quiet health and mobility check', log: 'Rested', doing: 'Resting in his room', going: 'Walking to his room for a rest', drops: { mobility: 20, clinical: 10 } },
  // Milestone 15: lunch, the midday meal service (a lighter meal than breakfast or the evening meal).
  { id: 'lunch', name: 'Lunch', at: 12.25, place: 'dining', optional: true, roles: ['CW', 'HN'], task: 'support him at lunch', log: 'Lunch', doing: 'Having lunch', going: 'Walking to lunch', drops: { nutrition: 20, social: 5 } },
  { id: 'cards', name: 'Cards', at: 13.5, place: 'lounge', optional: true, activity: true, roles: ['LC'], task: 'run the Cards game', log: 'Played Cards', doing: 'Playing Cards in the lounge', going: 'Walking to the lounge for Cards', drops: { social: 30, memory: 20 } },
  { id: 'dinner', name: 'Evening meal', at: 17.5, place: 'dining', optional: true, roles: ['CW', 'HN'], task: 'support him at the evening meal', log: 'Evening meal', doing: 'Having his evening meal', going: 'Walking to the evening meal', drops: { nutrition: 40, social: 5 } },
  { id: 'settle', name: 'Settle and sleep', at: 19.5, place: 'room', roles: ['CW', 'RN'], task: 'help him settle for the night', log: 'Settled for the night', doing: 'Asleep in his room', going: 'Walking to his room to settle', drops: { personal: 25, clinical: 20, mobility: 25 } },
];

// Needs rise every game hour (points per hour), slower while asleep; each routine step's drops take them back down,
// so over a normal day they rise and fall; a day with every step done brings them down a little, a refused day up.
export const NEED_RISE = { personal: 2.4, clinical: 1.3, mobility: 1.8, nutrition: 3.6, memory: 0.9, social: 1.8 };
export const ASLEEP_RISE = 0.4; // × while asleep

// Outcomes drift towards a target set by the needs (higher needs → lower target), a little each hour.
//   target = 100 − Σ need × weight        pull = share of the gap closed per game hour
export const OUTCOME_TARGETS = {
  comfort: { personal: 0.4, nutrition: 0.3, mobility: 0.3 },
  independence: { mobility: 0.5, memory: 0.3, personal: 0.2 },
  mood: { social: 0.5, nutrition: 0.2, personal: 0.3 },
  connection: { social: 0.8 },
  safety: { clinical: 0.5, mobility: 0.5 },
};
export const OUTCOME_PULL = 0.03;

// Preferences (bible §6): the chance he says no to a step on a given day, and the small Mood nudge when it happens.
// 'refuse' always says no. A refusal skips the step (logged, never a failure) and he stays in (or goes back to) his room.
export const PREF_RULES = {
  prefer: { refuseChance: 0, mood: 1.5 },
  accept: { refuseChance: 0.04, mood: 0 },
  dislike: { refuseChance: 0.35, mood: -1 },
  refuse: { refuseChance: 1, mood: 0 },
};
export const ACTIVITY_DONE = { connection: 3 }; // outcome points when he joins the activity
export const ACTIVITY_REFUSED = { connection: -2 }; // …and when he refuses it
export const LOG_SHOWN = 6; // log lines on his card

// Milestone 13 (fix first): staggered wake-ups. Each resident wakes at their own time inside a window set by their
// personality, so the Care Workers' wake-ups spread over the morning instead of all landing at 07:00. The time inside
// the window is fixed per resident (quarter-hour slots, from their id: the same every day and after a reload).
// A late riser's breakfast moves with them: breakfastAfter hours after waking, never before the usual 08:30, and served
// until lateBreakfastUntil (a resident not yet got up stays in bed until a helper comes, and breakfast waits for them).
// fixed: a resident whose time is set outright (the opening resident, Arthur, keeps the
// 07:00 of Milestones 2–12).
export const WAKE = {
  windows: {
    early: { name: 'Early riser', from: 6, to: 6.75 },
    usual: { name: 'Usual riser', from: 6.75, to: 7.75 },
    late: { name: 'Late riser', from: 7.75, to: 8.5 },
  },
  byPersonality: { 'Routine-Loving': 'early', Independent: 'early', 'Stubbornly Independent': 'early', Quiet: 'late', Reserved: 'late', Witty: 'late' }, // (everyone else: usual)
  slot: 0.25,
  fixed: { RES01: 7 },
  breakfastAfter: 1,
  lateBreakfastUntil: 9.5,
  waitForHelpUntil: 10.5, // someone not yet got up waits in bed for a helper (breakfast waits) until then
};

// Milestone 14: the Morning activity slot — a step between breakfast and the morning rest, only on days the timetable
// (data/activities.js) has a Morning activity (its name, place, leaders and drops then come from the activity, as the
// Afternoon slot's do: that one is the M2 'cards' step). ALL_STEPS is every step in day order (the routine's order
// checks use it).
export const MORNING_ACTIVITY_STEP = { id: 'morningActivity', name: 'Morning activity', at: 10, place: 'lounge', optional: true, activity: true, roles: ['LC'], task: 'run the morning activity', log: 'Morning activity', doing: 'At the morning activity', going: 'Walking to the morning activity', drops: { social: 15 } };
// Milestone 16: the daily therapy step — only for a resident working on rehab goals (data/mobility.js). place 'therapy':
// the Rehabilitation Gym (F18), else the Basic Physio Space (F07), else their own room (a Rehabilitation Room counts).
export const THERAPY_STEP = { id: 'therapy', name: 'Therapy', at: 15.25, place: 'therapy', roles: ['AH'], task: 'run the therapy session', log: 'Therapy', doing: 'At therapy', going: 'Walking to therapy', drops: { mobility: 15 } };
export const ALL_STEPS = [ROUTINE[0], ROUTINE[1], MORNING_ACTIVITY_STEP, ROUTINE[2], ROUTINE[3], ROUTINE[4], THERAPY_STEP, ROUTINE[5], ROUTINE[6]];
