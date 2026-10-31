// Training (Milestone 11, bible §13): the ten example courses as data, and specialties. Plain data only; the rules are in
// src/systems/staffing.js on core/TrainingSystem. Placeholder numbers, logged in docs/DECISIONS.md.
//
// A course: id, name, text, cost (Credits), days (game days away from the roster at the Training Room),
//   roles (who may take it), gains { STAT: [min, max] } (each stat rolled on the run's seed; never past the tier cap),
//   or lowest: { count, min, max } (their lowest stats), specialty (granted on completion if they have a free slot)
// Training needs a Training Room (F11: two places each); ?debug=1 lets people train without one.
export const COURSES = [
  { id: 'medicationSafety', name: 'Medication Safety', text: 'Safer, steadier medicine rounds', cost: 600, days: 5, roles: ['RN'], gains: { CLN: [8, 14] }, specialty: 'medication' },
  { id: 'memoryCommunication', name: 'Memory Care Communication', text: 'Calm, clear support for residents with memory needs', cost: 700, days: 6, roles: ['RN', 'CW', 'LC'], gains: { SOC: [6, 10], PER: [3, 6] }, specialty: 'memoryCare' },
  { id: 'manualHandling', name: 'Manual Handling', text: 'Safe moving, lifting and transfers', cost: 450, days: 4, roles: ['CW', 'AH', 'RN'], gains: { PER: [5, 9], MOB: [4, 7] }, specialty: 'handling' },
  { id: 'fallsPrevention', name: 'Falls Prevention', text: 'Spotting and reducing fall risks', cost: 550, days: 5, roles: ['AH', 'CW', 'RN'], gains: { MOB: [7, 12] }, specialty: 'falls' },
  { id: 'palliativeSupport', name: 'Palliative Support', text: 'Comfort and presence at the end of life', cost: 800, days: 7, roles: ['RN', 'CW'], gains: { PER: [4, 8], CLN: [4, 8] }, specialty: 'comfortCare' },
  { id: 'nutritionHydration', name: 'Nutrition / Hydration', text: 'Good meals and enough to drink', cost: 450, days: 4, roles: ['HN', 'CW'], gains: { NUT: [8, 13] }, specialty: 'nutrition' },
  { id: 'infectionControl', name: 'Infection Control', text: 'Clean hands, clean rooms, fewer outbreaks', cost: 350, days: 3, roles: ['RN', 'CW', 'LC', 'AH', 'HN'], gains: { CLN: [4, 8] }, specialty: 'infection' },
  { id: 'familyCommunication', name: 'Family Communication', text: 'Keeping families close and informed', cost: 350, days: 3, roles: ['RN', 'CW', 'LC', 'AH', 'HN'], gains: { SOC: [5, 9] }, specialty: 'family' },
  { id: 'leadership', name: 'Leadership', text: 'Running a shift and supporting the team', cost: 1200, days: 8, roles: ['RN', 'CW', 'LC', 'AH', 'HN'], gains: { CLN: [3, 5], PER: [3, 5], SOC: [3, 5] }, specialty: 'shiftLead' },
  { id: 'crossRole', name: 'Cross-Role Familiarity', text: 'A feel for the other roles’ work', cost: 650, days: 6, roles: ['RN', 'CW', 'LC', 'AH', 'HN'], lowest: { count: 2, min: 4, max: 7 }, specialty: 'crossRole' },
];
export const courseById = (id) => COURSES.find((c) => c.id === id) ?? null;

// Specialties (bible §11 "specialties"): shown on the staff card. tasks = the task types (data/tasks.js) they get a small
// scoring bonus on (SPECIALTY_SCORE); standsInFor = the role whose place they can take in the care-plan eligibility
// rules (Milestone 8: "needs an Allied Health on the roster" is also met by someone with the Falls specialty).
export const SPECIALTIES = {
  medication: { name: 'Medication', tasks: ['meds'], standsInFor: null },
  memoryCare: { name: 'Memory Care', tasks: ['activity', 'visit'], standsInFor: 'LC' },
  handling: { name: 'Moving & Handling', tasks: ['personal', 'mobility', 'wake'], standsInFor: null },
  falls: { name: 'Falls', tasks: ['mobility', 'roomCheck'], standsInFor: 'AH' },
  comfortCare: { name: 'Comfort Care', tasks: ['personal', 'settle', 'visit'], standsInFor: null },
  nutrition: { name: 'Nutrition', tasks: ['meal', 'hydration'], standsInFor: 'HN' },
  infection: { name: 'Infection Control', tasks: ['personal', 'observation'], standsInFor: null },
  family: { name: 'Family Liaison', tasks: ['visit'], standsInFor: null },
  shiftLead: { name: 'Shift Lead', tasks: [], standsInFor: null },
  crossRole: { name: 'Cross-Role', tasks: ['hydration', 'visit', 'roomCheck'], standsInFor: null },
};
// How many specialties someone can hold, by tier.
export const SPECIALTY_LIMIT = { standard: 1, rare: 2, elite: 3, legendary: 4, secret: 5, divine: 5 };
// The task AI's bonus when a helper's specialty matches the task type (bible §15 order: far below urgency 1000 and
// resident assignment 100 — like Familiar Care, it only tips a close choice).
export const SPECIALTY_SCORE = 8;
// Training Room places (F11); with ?debug=1 people may train without one (this many places).
export const TRAINING = { placesPerRoom: 2, debugPlaces: 2 };

// Check the lists. v = a core/DataValidator.
export function validateTraining(v, statKeys, roleIds, taskTypes) {
  v.uniqueIds('courses', COURSES);
  v.check(COURSES.length === 10, 'the ten §13 example courses');
  for (const c of COURSES) {
    const who = `course ${c.id}`;
    v.check(Number.isInteger(c.cost) && c.cost > 0 && Number.isInteger(c.days) && c.days > 0, `${who}: cost / days`);
    v.check(c.roles.length > 0 && c.roles.every((r) => roleIds.includes(r)), `${who}: roles`);
    v.check(!!c.gains !== !!c.lowest, `${who}: gains or lowest`);
    for (const [k, [a, b]] of Object.entries(c.gains ?? {})) v.check(statKeys.includes(k) && a > 0 && b >= a, `${who}: gain ${k}`);
    v.check(!c.specialty || !!SPECIALTIES[c.specialty], `${who}: specialty ${c.specialty}`);
  }
  for (const [id, sp] of Object.entries(SPECIALTIES)) {
    for (const t of sp.tasks) v.check(taskTypes.includes(t), `specialty ${id}: task type ${t}`);
    v.check(sp.standsInFor === null || roleIds.includes(sp.standsInFor), `specialty ${id}: role`);
  }
  return v;
}
