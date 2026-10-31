// Incidents, outbreaks and emergencies (Milestone 25, bible §30 / §25 F33 / §26 OPS3–OPS4 / §13). Plain data only; the
// rules are in src/systems/incidents.js and the home world. Placeholder numbers, logged in docs/DECISIONS.md.
//
// The rules (§30, the M25 card):
//   - events are bounded templates: a set duration, a set impact, and 2–4 ways through, each payable with Credits or free;
//   - preparation reduces severity (the home's Preparedness → a mild / moderate / severe band);
//   - no event ever needs a paywall or an impossible reaction: every template has a response a Stage-1 home can always
//     take (free, or Credits — never anything bought), and the home takes it on its own (`auto`) when the player doesn't;
//     for six templates that is free; for the urgent transfer it is the M18 hospital service (a very unwell resident);
//   - events never erase a good run: they end on their own, never end the save, delete progress, let staff go or
//     remove a resident for good; at most one at a time, cooldowns between them, none in a new home's first 28 days;
//   - nothing graphic, and the M18 rule holds: no medicines, amounts or diagnoses — residents are "unwell", nothing more.

// --- falls (switching on the Milestone 16 falls-risk number) ------------------------------------------------------------
// A resident's chance of a fall a day = their falls risk (0–100) / 100 × perDayAtRisk100, rolled in each waking band
// (a third each), at a seeded time inside the band. Every falls-prevention modifier on the M16 number (MO05, EN05, the
// Falls specialist on shift, F19, PRG04, research) cuts it, because it cuts the risk.
//   help: the nearest staff member on shift comes (an urgent task, anyone may help; tiredness never stops them);
//   then the M18 path: an alert ("had a fall"), noticed at once, for the nurse's high-level actions;
//   rest: a few days' rest (no group activities, no walks of their own), a small Mobility / Mood / Safety dip;
//   family: told at once (Trust −2); handled well (help within helpWithinHours and the alert settled by the end of the
//   rest) gives it back (+2); the care plan is flagged for review ("after a fall").
//   Never a death, never a hospital stay of its own (only if the nurse or the player chooses the hospital service).
export const FALLS_INCIDENT = {
  perDayAtRisk100: 0.015,
  bands: ['morning', 'afternoon', 'evening'], // (never at night: they are asleep)
  word: 'had a fall',
  help: { name: 'Help after a fall', minutes: 10, roles: ['RN', 'CW', 'LC', 'AH', 'HN'], dueHours: 1.5 },
  moderateFrom: 45, // a High falls risk: a quarter of falls are moderate (else minor)
  moderateChance: 0.25,
  rest: { minor: 2, moderate: 3 }, // days
  dips: { minor: { mobility: -3, mood: -2, safety: -3 }, moderate: { mobility: -6, mood: -4, safety: -5 } },
  rehabConfidence: { minor: -4, moderate: -8 }, // (a rehab resident's confidence goal)
  trust: { told: -2, handledWell: 2 },
  helpWithinHours: 0.75,
  keep: 40, // the last falls kept on the save
};

// --- the home's Preparedness (0–100) ----------------------------------------------------------------------------------
// Parts (each capped): training, the Emergency Preparedness Hub, supplies, the staffing reserve, the Environment score
// and research. raise: what the Nurse Station's Emergency tab says raises each part.
export const PREPAREDNESS = {
  training: { max: 20, name: 'Training', perInfection: 6, infectionMax: 12, perLead: 4, leadMax: 8, raise: 'Infection Control courses (6 each, up to 2 people) and Leadership (4 each, up to 2) at the Training Room' },
  hub: { max: 15, name: 'Emergency Preparedness Hub', facility: 'F33', raise: 'Build the Emergency Preparedness Hub (F33, opened by OPS4 Emergency Readiness)' },
  supplies: { max: 20, name: 'Emergency supplies', raise: 'Keep emergency supplies stocked (Business → Emergency supplies)' },
  reserve: { max: 15, name: 'Staffing reserve', perFloat: 4, floatsMax: 8, shiftsMax: 7, overPct: 110, raise: 'Floats (4 each, up to 2) and shifts staffed above 110% of their Safe Coverage minimum' },
  environment: { max: 10, name: 'Environment', from: 60, to: 100, raise: 'Room quality and the room checks done (the Environment score, 60 → 100)' },
  research: { max: 20, name: 'Research', nodes: { OPS3: 10, OPS4: 10 }, raise: 'Research OPS3 Infection Control and OPS4 Emergency Readiness (10 each)' },
};
// Preparedness → severity band (a template may set its own lines). F33's §25 effect: every event's impact × hubMult.
export const SEVERITY = { severeBelow: 35, moderateBelow: 65, hubMult: 0.85, names: { mild: 'Mild', moderate: 'Moderate', severe: 'Severe' } };

// --- emergency supplies (Business → Emergency supplies) ------------------------------------------------------------------
// A stock level 0–100. A standing order tops it up each day towards its level and is paid weekly (a ledger line,
// category 'emergency'); without one the stock slowly runs down (fadePerDay). Each event uses some (its template's
// `uses`, × the band). A one-off top-up adds `topUp.points` for `topUp.cost`. A new home starts at `start`, no order.
export const SUPPLIES = {
  start: 40,
  fadePerDay: 0.5,
  refillPerDay: 6,
  plans: [
    { id: 'none', name: 'No standing order', level: 0, perWeek: 0 },
    { id: 'basic', name: 'Basic standing order', level: 50, perWeek: 15 },
    { id: 'full', name: 'Full standing order', level: 100, perWeek: 35 },
  ],
  topUp: { points: 25, cost: 120 },
  bandUse: { mild: 0.6, moderate: 1, severe: 1.4 },
};

// --- limits (bounded: §30 and the card's fairness rules) ------------------------------------------------------------------
//   quietDays: none in a new home's first 28 days · gapDays: the quiet after one ends · one major event at a time ·
//   autoHours: with no choice made in this many game hours, the home takes the template's `auto` response (free).
export const LIMITS = { quietDays: 28, gapDays: 21, maxActive: 1, autoHours: 4, historyKeep: 30 };
// The calendar's seasons (months 1–12; the series' home reads as British, so summer is June–August).
export const SEASONS = { winter: [12, 1, 2], spring: [3, 4, 5], summer: [6, 7, 8], autumn: [9, 10, 11] };
export const seasonOf = (month) => Object.keys(SEASONS).find((k) => SEASONS[k].includes(month)) ?? 'spring';

// --- the seven bounded templates (§30) --------------------------------------------------------------------------------
// A template: id, name, icon, text (what happens), window { chance (a day, once eligible), seasons? { season: mult },
// cooldown (days after its last one ends) }, uses (supplies it uses), bands { mild, moderate, severe } (duration in days
// and its impact numbers), responses (2–4: id, name, text, cost (Credits; 0 = free), what it changes, needs? (what the
// home must have: 'nurseOnShift' | 'teamOf2')), auto (the response the home takes on its own: needs nothing), helps (the parts of
// Preparedness the after-report names).
// Response effects: daysMult (shorter), impactMult (smaller), tasks (extra care tasks run while it lasts), restore
// (facilities back at once), m18 (the M18 action it takes), overtime (one fewer staff off; the team's Morale −3).
const T = (id, name, text, window, uses, bands, responses, auto, helps, extra = {}) => ({ id, name, icon: 'care_ui_27', text, window, uses, bands, responses, auto, helps, ...extra });
export const INCIDENTS = [
  T('outbreak', 'Infection outbreak', 'A passing bug: some residents are unwell for a few days. Isolation care and extra cleaning help; family visits pause for a while.',
    { chance: 0.003, seasons: { winter: 2, autumn: 1.4 }, cooldown: 112 }, 25,
    { mild: { days: 3, unwell: 1, visitPauseDays: 0, comfortPerHour: -0.1 }, moderate: { days: 5, unwell: 2, visitPauseDays: 2, comfortPerHour: -0.15 }, severe: { days: 7, unwell: 3, visitPauseDays: 4, comfortPerHour: -0.2 } },
    [
      { id: 'isolate', name: 'Isolate and deep-clean', text: 'Isolation care for those unwell and extra cleaning: it passes sooner and gentler', cost: 0, daysMult: 0.7, impactMult: 0.7, tasks: true },
      { id: 'clinician', name: 'Ask the visiting clinician to advise', text: 'Advice for the team: those unwell settle sooner', cost: 180, daysMult: 0.8, impactMult: 0.6, tasks: true },
      { id: 'carryOn', name: 'Carry on as normal', text: 'It runs its course', cost: 0 },
    ], 'isolate', ['training', 'supplies', 'environment', 'research']),
  T('heatwave', 'Heatwave', 'A spell of hot weather: residents need more to drink, and Comfort dips if drinks are missed.',
    { chance: 0.01, seasons: { summer: 1, spring: 0, autumn: 0, winter: 0 }, cooldown: 56 }, 15,
    { mild: { days: 2, comfortPerHour: -0.08, missed: -2 }, moderate: { days: 3, comfortPerHour: -0.12, missed: -3 }, severe: { days: 4, comfortPerHour: -0.16, missed: -4 } },
    [
      { id: 'drinks', name: 'Extra drinks rounds and cool rooms', text: 'A cool drink for everyone each morning and afternoon: Comfort holds', cost: 0, impactMult: 0.45, tasks: true },
      { id: 'fans', name: 'Hire fans and cooling', text: 'Cooler rooms straight away (and the extra drinks)', cost: 250, impactMult: 0.25, tasks: true },
      { id: 'carryOn', name: 'Carry on as normal', text: 'The usual drinks rounds only', cost: 0 },
    ], 'drinks', ['supplies', 'reserve', 'environment']),
  T('storm', 'Storm and power cut', 'A storm knocks the power out: some facilities are out of action and meals are kept simple.',
    { chance: 0.0025, seasons: { winter: 1.8, autumn: 1.4, summer: 0.5 }, cooldown: 84 }, 20,
    { mild: { days: 1, offline: 1, meal: -6 }, moderate: { days: 1, offline: 2, meal: -10 }, severe: { days: 2, offline: 3, meal: -14 } },
    [
      { id: 'generator', name: 'Hire a generator', text: 'Power back for the essentials: facilities back on and proper meals', cost: 350, restore: true, impactMult: 0.3 },
      { id: 'coldMeals', name: 'Torches, blankets and simple meals', text: 'The team keeps everyone comfortable until the power is back', cost: 0, impactMult: 0.8 },
    ], 'coldMeals', ['supplies', 'environment', 'research'], { offlineFrom: ['F18', 'F07', 'F21', 'F20', 'F11', 'F12', 'F13'] }),
  T('equipment', 'Lift or equipment fault', 'The lifting hoist breaks down, and a facility’s equipment with it: moving and handling is slower until it is repaired.',
    { chance: 0.0025, cooldown: 70 }, 5,
    { mild: { days: 2, slow: 1.25, repair: 150 }, moderate: { days: 4, slow: 1.4, repair: 300 }, severe: { days: 6, slow: 1.6, repair: 450 } },
    [
      { id: 'repairNow', name: 'Call the engineer out now', text: 'Repaired by tomorrow (the call-out cost)', cost: 'repair', days: 1 },
      { id: 'borrow', name: 'Borrow a hoist from a neighbouring home', text: 'Moving and handling back to normal; the facility waits for the regular engineer', cost: 0, impactMult: 0.3, needs: 'teamOf2' },
      { id: 'wait', name: 'Wait for the regular engineer', text: 'Repaired in the usual time, at no extra cost', cost: 0 },
    ], 'wait', ['hub', 'reserve', 'research'], { offlineFrom: ['F18', 'F07', 'F02', 'F04', 'F16', 'F10'] }),
  T('water', 'Water supply issue', 'Low water pressure: the kitchen and laundry are slowed, and meals are a little plainer.',
    { chance: 0.0025, cooldown: 70 }, 10,
    { mild: { days: 1, slow: 1.5, meal: -4 }, moderate: { days: 1, slow: 2, meal: -8 }, severe: { days: 2, slow: 2.5, meal: -10 } },
    [
      { id: 'plumber', name: 'Bottled water and an emergency plumber', text: 'Back to normal sooner', cost: 200, daysMult: 0.5, impactMult: 0.4 },
      { id: 'manage', name: 'Boil water and manage', text: 'The team works round it: a little less slow', cost: 0, impactMult: 0.75 },
    ], 'manage', ['supplies', 'environment', 'hub']),
  T('staffing', 'Staffing surge', 'A bug goes round the team: several staff are off sick for a few days. Safe Coverage comes under pressure.',
    { chance: 0.003, seasons: { winter: 1.6 }, cooldown: 84 }, 0,
    { mild: { days: 2, off: 1 }, moderate: { days: 3, off: 2 }, severe: { days: 4, off: 3 } },
    [
      { id: 'agency', name: 'Book agency cover for the gaps', text: 'Floats first, then agency for any shift left short (agency rates, as each shift is covered)', cost: 0 },
      { id: 'overtime', name: 'Ask the team for extra hours', text: 'A colleague covers: one fewer off, but the team’s Morale dips a little', cost: 0, overtime: true, needs: 'teamOf2' },
    ], 'agency', ['reserve', 'training', 'hub'], { maxOffShare: 0.4 }),
  T('transfer', 'Urgent clinical transfer', 'A resident suddenly seems very unwell and may need the hospital service. Their room is held while they are away.',
    { chance: 0.0025, cooldown: 56 }, 5,
    { mild: { days: 3, alert: 'moderate' }, moderate: { days: 4, alert: 'serious' }, severe: { days: 5, alert: 'serious' } },
    [
      { id: 'hospital', name: 'Transfer to hospital service', text: 'Away about 3 days, the room held (the M18 service fee)', cost: 'hospital', m18: 'hospital' },
      { id: 'escalate', name: 'Escalate to the senior nurse', text: 'The most senior nurse on shift reviews them now', cost: 0, m18: 'escalate', needs: 'nurseOnShift' },
      { id: 'clinician', name: 'Contact visiting clinician', text: 'Seen tomorrow at 10:00', cost: 'clinician', m18: 'clinician' },
    ], 'hospital', ['training', 'hub', 'research']),
];
export const incidentById = (id) => INCIDENTS.find((x) => x.id === id) ?? null;
export const RESPONSE_NEEDS = { nurseOnShift: 'Needs a nurse on shift', teamOf2: 'Needs at least two people on the team' };

// The extra care tasks a response with `tasks` runs while the event lasts (never essential: a missed one is not care
// recovery and raises no complaint). at: the time in each band.
//   isolation: each unwell resident, three times a day (Comfort +comfort when done); cleaning: their room, once a day;
//   coolDrink: every resident, morning and afternoon (a missed one costs the heatwave's `missed` Comfort × its impact).
export const INCIDENT_TASKS = {
  isolation: { name: 'Isolation care', type: 'personal', roles: ['CW', 'RN'], minutes: 15, at: { morning: 9.5, afternoon: 14, evening: 19 }, comfort: 0.5, drops: { personal: 8 } },
  cleaning: { name: 'Extra cleaning', type: 'roomCheck', roles: ['CW', 'HN'], minutes: 15, at: { morning: 10.5 } },
  coolDrink: { name: 'Cool drink (heatwave)', type: 'hydration', roles: ['CW', 'HN', 'LC', 'RN', 'AH'], minutes: 5, at: { morning: 10.5, afternoon: 15.5 }, drops: { nutrition: 4 } },
  slowTypes: { equipment: ['mobility', 'wake', 'settle'], water: ['roomCheck', 'personal'] }, // (water also slows kitchen prep)
  heatHours: [9, 20], // the heatwave's Comfort dip is in the daytime
};

// Ledger: response costs and the supplies' standing order post as 'emergency'.
export const LEDGER_CATEGORY = 'emergency';

// Check the lists. v = a core/DataValidator.
export function validateIncidents(v, facilityIds) {
  v.uniqueIds('incidents', INCIDENTS);
  v.check(INCIDENTS.length === 7, 'the seven §30 templates');
  for (const t of INCIDENTS) {
    const who = `incident ${t.id}`;
    v.check(t.responses.length >= 2 && t.responses.length <= 4, `${who}: 2–4 responses`);
    v.check(t.responses.some((r) => r.id === t.auto && !r.needs), `${who}: the auto response needs nothing (any home can take it)`);
    v.check(t.responses.some((r) => r.cost === 0 || typeof r.cost === 'string'), `${who}: a free or Credits-only way through`);
    for (const r of t.responses) {
      v.check(typeof r.cost === 'number' ? r.cost >= 0 : ['repair', 'hospital', 'clinician'].includes(r.cost), `${who}/${r.id}: cost in Credits`);
      v.check(!r.needs || !!RESPONSE_NEEDS[r.needs], `${who}/${r.id}: needs`);
    }
    for (const b of ['mild', 'moderate', 'severe']) v.check(t.bands[b]?.days > 0, `${who}: band ${b}`);
    v.check(t.bands.mild.days <= t.bands.moderate.days && t.bands.moderate.days <= t.bands.severe.days, `${who}: milder bands are no longer`);
    for (const f of t.offlineFrom ?? []) v.check(facilityIds.includes(f), `${who}: facility ${f}`);
    v.check(t.window.chance > 0 && t.window.cooldown > 0, `${who}: window`);
  }
  return v;
}
