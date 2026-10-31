// Daily care tasks (Milestone 4, bible §15). Plain data only — the rules are in src/systems/careTasks.js. Placeholder
// numbers, logged in docs/DECISIONS.md — tune here.
//
// TASK_TYPES[id]: name, urgency (1–5; bell = 5 is safety), essential (the day's must-do care: a 20-day no-tap run
// must miss none of these), icon (the code-drawn marker over a helper's head: a shape, no text)
export const TASK_TYPES = {
  bell: { name: 'Call bell', urgency: 5, essential: false, icon: 'bell' },
  meds: { name: 'Medication round', urgency: 4, essential: true, icon: 'meds' }, // (Milestone 18: the icon's key renamed — a small cart-and-cross mark)
  wake: { name: 'Wake up', urgency: 3, essential: true, icon: 'sun' },
  settle: { name: 'Settle for the night', urgency: 3, essential: true, icon: 'moon' },
  meal: { name: 'Meal support', urgency: 3, essential: true, icon: 'bowl' },
  personal: { name: 'Personal care', urgency: 3, essential: true, icon: 'drop' },
  observation: { name: 'Health check', urgency: 2, essential: false, icon: 'cross' },
  mobility: { name: 'Mobility support', urgency: 2, essential: false, icon: 'steps' },
  hydration: { name: 'Drinks and snacks', urgency: 2, essential: false, icon: 'cup' },
  activity: { name: 'Activity', urgency: 1, essential: false, icon: 'star' },
  visit: { name: 'One-to-one time', urgency: 1, essential: false, icon: 'heart' },
  roomCheck: { name: 'Room check', urgency: 1, essential: false, icon: 'house' },
  prep: { name: 'Kitchen prep', urgency: 2, essential: false, icon: 'pot' }, // Milestone 15: the kitchen gets a meal ready (no resident)
};

// Arthur's routine steps (data/routine.js) as tasks: which type each is and the band it must be done in. A routine task
// also closes when his next step starts (help that comes after that is too late). minutes: time with him. lead: hours
// before the step that it opens, so a helper on the far side of the home is there in time (a walk across the home takes
// about 1.5 game hours); it never opens before its band starts. The help itself starts when he is there.
// Milestone 15: meals are a service — the server brings the trolley and serves the residents at their seats in turn, so a
// meal is 8 minutes a resident (it was 20: one-to-one help from start to finish). A plan that needs help at the table
// (NU05 Texture-Modified Meals) still makes it longer.
export const ROUTINE_TASKS = {
  wake: { type: 'wake', band: 'morning', minutes: 20, lead: 1 },
  breakfast: { type: 'meal', band: 'morning', minutes: 8, lead: 0.5 },
  rest: { type: 'observation', band: 'afternoon', minutes: 20, lead: 0.5 },
  lunch: { type: 'meal', band: 'afternoon', minutes: 8, lead: 0.5 }, // (Milestone 15)
  cards: { type: 'activity', band: 'afternoon', minutes: 20, lead: 0.5 },
  dinner: { type: 'meal', band: 'evening', minutes: 8, lead: 0.5 },
  morningActivity: { type: 'activity', band: 'morning', minutes: 45, lead: 0.5 }, // (Milestone 14: the Morning activity slot)
  therapy: { type: 'mobility', band: 'afternoon', minutes: 30, lead: 0.5 }, // (Milestone 16: the rehab therapy step)
  settle: { type: 'settle', band: 'evening', minutes: 20, lead: 0.5 },
};

// A care-plan change adds today's tasks for the new option only if there is still time to do them: at least this many
// hours before the task's deadline (else it starts tomorrow).
export const PLAN_CHANGE = { minHoursLeft: 1.5 };

// Tasks his needs make: at the start of a band, a need at or over `line` adds one of these (unless the band already
// has a task that eases that need). They open half an hour into the band and are due by its end.
export const NEED_TASKS = {
  line: 60,
  opensAfter: 0.5, // hours into the band
  byNeed: {
    personal: { type: 'personal', name: 'Extra personal care', roles: ['CW', 'RN'], minutes: 20, drops: { personal: 20 } },
    clinical: { type: 'observation', name: 'Nurse check', roles: ['RN'], minutes: 15, drops: { clinical: 15 } },
    mobility: { type: 'mobility', name: 'Mobility support', roles: ['AH', 'CW', 'RN'], minutes: 20, drops: { mobility: 15 } },
    nutrition: { type: 'hydration', name: 'Snack and a drink', roles: ['HN', 'CW'], minutes: 15, drops: { nutrition: 15 } },
    memory: { type: 'visit', name: 'Reminiscence chat', roles: ['LC', 'CW'], minutes: 20, drops: { memory: 12 } },
    social: { type: 'visit', name: 'One-to-one chat', roles: ['LC', 'CW', 'RN'], minutes: 20, drops: { social: 15 } },
  },
};

// Call bells: he rings when a need reaches `line`. Anyone on shift can answer (going to see him is every role's job);
// answering takes `minutes` and eases the need that rang by `drop`. After a bell he won't ring again for cooldownHours.
// Response time (ring → someone at his side) is kept for the last `keep` bells; the card shows the last `shown`.
export const BELL = { line: 85, drop: 30, minutes: 10, roles: ['RN', 'CW', 'LC', 'AH', 'HN'], cooldownHours: 1.5, keep: 20, shown: 5 };

// Familiar Care (bible §6): a counter per resident–staff pair, up by perTask for each task they complete together,
// capped. Milestone 13 (bible §2.4: trust grows with the staff they *regularly* see): each day a pair who are both here
// but did not work together loses fadePerDay (never below 0; not while either of them is away). Its effects are in
// data/relationships.js FAMILIAR_EFFECTS.
export const FAMILIARITY = { perTask: 1, cap: 100, fadePerDay: 2 };

// Staff AI scoring (bible §15, in order): urgency / safety → is the resident assigned to me → role (a hard rule: a role
// that doesn't fit never scores) → Familiar Care → distance → workload. Each weight dwarfs the ones after it, except
// Familiar Care, which is a small bonus worth `familiar` tiles of walking to the single most familiar person (never on
// a safety task: a bell goes to the nearest). workload: per task already done this band, and per point of Energy used.
// Milestone 13 (fix first): a Registered Nurse free on the Morning shift may also help with wake-ups and morning
// personal care, at a score penalty (worth that many tiles of walking), so a free Care Worker is still preferred.
// They are the back-up: a nurse may take it only afterHours after the step's own time (a wake-up: after the resident
// wakes; any other task: after it opens), so a carer who is nearly free gets it first, and a nurse never sets off early
// and waits at a room while the medicine round is due.
// And only while no task that needs their own role is waiting or due to open within ownWorkHours (the medicine round
// comes first). Hospitality & Nutrition staff are never added: they are serving breakfast.
export const BACKUP_HELP = { ownWorkHours: 1 };
export const ALSO_HELP = [
  { types: ['wake'], bands: ['morning'], roles: ['RN'], penalty: 40, afterHours: 0.5 },
  { types: ['personal'], bands: ['morning'], roles: ['RN'], penalty: 40, afterHours: 0.5 },
];
// Milestone 13: continuity — the resident is in their continuity group (bible §14; data/relationships.js CONTINUITY):
// worth 12 tiles of walking, so it tips a close choice without sending someone across the home.
export const SCORING = { urgency: 1000, assigned: 100, continuity: 12, familiar: 6, perTile: 1, perTaskDone: 0.5, perEnergyUsed: 0.01 };
// Milestone 13 (fix first): among tasks of the same urgency, getting someone up comes first — a resident waiting in bed
// is helped before a meal or personal-care task of the same urgency (worth this many tiles of walking; never above a
// higher urgency, since urgency is worth 1,000).
export const TYPE_FIRST = { wake: 60 };
