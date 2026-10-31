// Residents (bible §6–7). Milestone 2: RES01 Arthur Lane; Milestone 6 adds RES02–RES12 (they arrive as applicants, see
// src/systems/admissions.js); the other 48 rows drop into RESIDENTS unchanged in Milestone 9. Profiles are story seeds, not diagnoses: no clinical detail anywhere. Plain data only — the rules are in
// src/systems/residentNeeds.js; validateResidents() runs the list through core/DataValidator.
//
// A resident row:
//   id, name, age, support (primary support), personality, interest, visitors, stay (stay type), art (portrait key)
//   needs:    the six care-need domains, 0–100 (higher = more support needed right now)
//   outcomes: the five displayed outcomes, 0–100 (higher = better)
//   prefs:    each routine step and activity → 'accept' | 'prefer' | 'dislike' | 'refuse' (bible §6: a refusal is a
//             normal choice, never a failure). Anything not listed is 'accept'. Keys: routine step ids, and the
//             preference keys of care-plan tasks (Milestone 4, e.g. groupActivity).
//   plan:     the starting care plan, one option id per domain (Milestone 4, data/carePlans.js)
//   Milestone 6 (admissions, bible §8): room = the room template they want (data/rooms: RM01 Standard, RM04 High-Care,
//   RM05 Memory Support); needs = hard prerequisites the home must meet before they can be admitted — { room } a room
//   template the home must have free, { role } a role someone on the team must have; urgency 'Low' | 'Medium' | 'High'.
//   Their needs vary a little at admission (ADMISSION.needVariation), inside 0–100.

import { DOMAINS, optionById, PLAN_PREF_KEYS, OPTION_PREFS_BY_PERSONALITY } from './carePlans.js';
import { LIFE_STORIES, LIFE_TAGS, TAGS_PER_RESIDENT } from './lifeStories.js';
import { FACILITIES } from './facilities.js';
import { ROOMS } from './rooms.js';
import { ROLE_IDS } from './roles.js';
import { ADMISSION } from './admissions.js';

export const NEEDS = [
  { id: 'personal', name: 'Personal Support' },
  { id: 'clinical', name: 'Clinical/Nursing' },
  { id: 'mobility', name: 'Mobility' },
  { id: 'nutrition', name: 'Nutrition' },
  { id: 'memory', name: 'Memory/Cognition' },
  { id: 'social', name: 'Social Support' },
];
export const OUTCOMES = [
  { id: 'comfort', name: 'Comfort' },
  { id: 'independence', name: 'Independence' },
  { id: 'mood', name: 'Mood' },
  { id: 'connection', name: 'Social Connection' },
  { id: 'safety', name: 'Safety' },
];
export const PREFS = ['accept', 'prefer', 'dislike', 'refuse'];
// Primary support (bible §7) → Support Level 1–5 (Milestone 6: Care Support Funding by level, data/balance.js).
export const SUPPORT_LEVELS = {
  'Light Support': 1,
  'Social Support': 2,
  'Nutrition Support': 2,
  'Mobility Support': 3,
  Rehabilitation: 3,
  'Memory Support': 4,
  'Clinical Support': 4,
  'High Care': 5,
};
export const STAY_TYPES = ['Respite', 'Long Term', 'Rehab/Short Stay', 'Palliative'];
// Milestone 9: how long each stay type lasts (bible §7). days: null = stays (Long Term); [min, max] = a length rolled at
// application on the run's seed (Respite); a number = a fixed length (Rehab/Short Stay, until Milestone 16's discharge
// rules). A row's own stayDays wins over its type. At the end of the stay they head home at leaveHour on their last day
// (a medium beat "Arthur heads home", the room frees up) — a good outcome, never a failure — and may apply again after
// ADMISSION.returnAfterDays as a "Returning" applicant.
export const STAYS = {
  'Long Term': { days: null, text: 'Long Term' },
  Respite: { days: [14, 28], text: 'Respite' },
  'Rehab/Short Stay': { days: 42, text: 'Rehab / Short Stay' },
  Palliative: { days: null, text: 'Palliative' }, // (no §7 row uses it; end-of-life care is Milestone 20)
};
export const STAY_LEAVE_HOUR = 10; // they go home mid-morning, after breakfast
export const URGENCY = ['Low', 'Medium', 'High'];
// Room templates (bible §10), all seven in v1. Only the Standard Room can be placed until Milestone 10; unlock = how the
// home gets one (shown in plain words). None is secret, so a prerequisite may point at any of them.
// Milestone 10: the rows live in data/rooms.js (cost, effect, unlock rule); this is the short view admissions read —
// placeable = buildable from the start, unlock = what brings it, in plain words.
const UNLOCK_WORDS = { rank: (v) => `Rank ${v}`, wing: (v) => (v === 'memory' ? 'the Memory Wing' : 'the Rehab Wing'), program: () => 'the Palliative Program', start: () => 'Start' };
export const ROOM_TEMPLATES = Object.fromEntries(ROOMS.map((r) => [r.id, { name: r.name, placeable: r.unlock.type === 'start', unlock: UNLOCK_WORDS[r.unlock.type](r.unlock.value), general: r.general }]));
export const supportLevel = (def) => SUPPORT_LEVELS[def.support] ?? 1;

// Starting needs and plan by primary support (story seeds, no clinical detail). Outcomes start in the 60s–70s.
const BY_SUPPORT = {
  'Light Support': { needs: [20, 12, 18, 30, 10, 28], plan: {} },
  'Mobility Support': { needs: [38, 18, 55, 30, 12, 30], plan: { MO: 'MO02', PC: 'PC02' } },
  'Memory Support': { needs: [35, 20, 25, 30, 60, 42], plan: { SO: 'SO02' } },
  'Clinical Support': { needs: [30, 55, 28, 32, 15, 30], plan: { CL: 'CL02', EN: 'EN02' } },
  Rehabilitation: { needs: [30, 36, 50, 30, 10, 25], plan: { MO: 'MO02' } }, // (Milestone 9: clinical 30 → 36, so no roll can look like Mobility Support)
  'Nutrition Support': { needs: [25, 18, 22, 55, 12, 30], plan: { NU: 'NU02' } },
  'Social Support': { needs: [22, 12, 20, 30, 18, 55], plan: { SO: 'SO02' } },
  'High Care': { needs: [55, 55, 50, 40, 25, 35], plan: { PC: 'PC02', CL: 'CL02', MO: 'MO02', EN: 'EN02' } },
};
// Preferences by personality: what they enjoy and what they would rather skip (never a failure — bible §6).
const BY_PERSONALITY = {
  Chatty: { breakfast: 'prefer', cards: 'prefer', groupActivity: 'prefer', rest: 'dislike' },
  Curious: { cards: 'prefer', groupActivity: 'prefer' },
  'Stubbornly Independent': { rest: 'dislike', groupActivity: 'dislike', breakfast: 'accept' },
  Quiet: { cards: 'dislike', groupActivity: 'dislike', rest: 'prefer' },
  'Routine-Loving': { breakfast: 'prefer', dinner: 'prefer', rest: 'prefer' },
  Cheerful: { cards: 'prefer', dinner: 'prefer' },
  Independent: { rest: 'dislike', cards: 'accept' },
  Witty: { cards: 'prefer', groupActivity: 'prefer' },
  Reserved: { groupActivity: 'dislike', rest: 'prefer' },
  Warm: { breakfast: 'prefer', cards: 'prefer' },
};
const NEED_IDS = ['personal', 'clinical', 'mobility', 'nutrition', 'memory', 'social'];
// Milestone 9: the six needs that mark each primary support (the starting needs above). A need roll is classed as the
// nearest of these (the largest single-need gap); the profiles sit more than 2 × ADMISSION.needVariation apart, so a
// bounded roll can never look like a different support type (validateResidents checks the gap).
export const SUPPORT_PROFILES = Object.fromEntries(Object.entries(BY_SUPPORT).map(([k, v]) => [k, Object.fromEntries(NEED_IDS.map((id, i) => [id, v.needs[i]]))]));
const gap = (a, b) => Math.max(...NEED_IDS.map((id) => Math.abs(a[id] - b[id])));
export function supportOfNeeds(needs) {
  let best = null;
  let d = Infinity;
  for (const [k, prof] of Object.entries(SUPPORT_PROFILES)) {
    const g = gap(needs, prof);
    if (g < d) [best, d] = [k, g];
  }
  return best;
}
// Rehab / Short Stay lengths by resident (a fixed length from data until Milestone 16); Arthur's respite is a full month.
const STAY_DAYS = { RES01: 28, RES05: 42, RES13: 35, RES21: 42, RES29: 35, RES37: 49, RES45: 42, RES53: 35 };
const DEFAULT_PLAN = { PC: 'PC01', CL: 'CL01', MO: 'MO01', NU: 'NU01', SO: 'SO01', EN: 'EN01' };
// Hard prerequisites and the room they want, by primary support (the card's rule for now).
const ADMIT_RULES = {
  'Memory Support': { room: 'RM05', needs: { room: 'RM05' } },
  'High Care': { room: 'RM04', needs: { room: 'RM04' } },
  'Clinical Support': { room: 'RM01', needs: { role: 'RN' } },
};
const applicant = (n, name, age, support, personality, interest, visitors, stay, urgency, outcomes) => ({
  id: `RES${String(n).padStart(2, '0')}`,
  name, age, support, personality, interest, visitors, stay,
  art: `resident_res${String(n).padStart(2, '0')}`,
  needs: Object.fromEntries(NEED_IDS.map((id, i) => [id, BY_SUPPORT[support].needs[i]])),
  outcomes: { comfort: outcomes[0], independence: outcomes[1], mood: outcomes[2], connection: outcomes[3], safety: outcomes[4] },
  prefs: { wake: 'accept', breakfast: 'accept', rest: 'accept', cards: 'accept', dinner: 'accept', settle: 'accept', groupActivity: 'accept', ...BY_PERSONALITY[personality] },
  optionPrefs: { ...(OPTION_PREFS_BY_PERSONALITY[personality] ?? {}) }, // Milestone 8: care-plan options (data/carePlans.js)
  plan: { ...DEFAULT_PLAN, ...BY_SUPPORT[support].plan },
  room: ADMIT_RULES[support]?.room ?? 'RM01',
  ...(ADMIT_RULES[support]?.needs ? { requires: { ...ADMIT_RULES[support].needs } } : {}),
  urgency,
});
const ADMISSION_ROWS = [
  applicant(2, 'Betty Finch', 75, 'Mobility Support', 'Chatty', 'Football', 'Occasional family', 'Long Term', 'Medium', [66, 58, 72, 64, 70]),
  applicant(3, 'Colin Webb', 82, 'Memory Support', 'Curious', 'Fishing', 'Community visitor', 'Long Term', 'High', [64, 60, 66, 58, 62]),
  applicant(4, 'Dorothy Vale', 89, 'Clinical Support', 'Stubbornly Independent', 'Cards', 'Frequent family', 'Long Term', 'High', [62, 70, 64, 66, 60]),
  applicant(5, 'Edward Moss', 96, 'Rehabilitation', 'Quiet', 'Football', 'Occasional family', 'Rehab/Short Stay', 'Medium', [64, 56, 62, 58, 66]),
  applicant(6, 'Florence King', 68, 'Nutrition Support', 'Routine-Loving', 'Fishing', 'Community visitor', 'Long Term', 'Low', [66, 72, 68, 62, 74]),
  applicant(7, 'George Hale', 75, 'Social Support', 'Cheerful', 'Cards', 'Frequent family', 'Long Term', 'Low', [70, 74, 62, 52, 76]),
  applicant(8, 'Hazel Quinn', 82, 'High Care', 'Independent', 'Football', 'Occasional family', 'Long Term', 'High', [58, 50, 62, 60, 56]),
  applicant(9, 'Ivan Bell', 89, 'Light Support', 'Witty', 'Fishing', 'Community visitor', 'Long Term', 'Low', [72, 76, 74, 64, 78]),
  applicant(10, 'June Mercer', 96, 'Mobility Support', 'Reserved', 'Cards', 'Frequent family', 'Long Term', 'Medium', [64, 56, 66, 60, 66]),
  applicant(11, 'Ken Foster', 68, 'Memory Support', 'Warm', 'Football', 'Occasional family', 'Long Term', 'Medium', [66, 62, 70, 60, 64]),
  applicant(12, 'Lillian Reed', 75, 'Clinical Support', 'Chatty', 'Fishing', 'Community visitor', 'Long Term', 'Medium', [64, 68, 70, 66, 62]),
  // Milestone 9: RES13–RES60 (bible §7 rows), the same shape.
  applicant(13, 'Malcolm Price', 82, 'Rehabilitation', 'Curious', 'Cards', 'Frequent family', 'Rehab/Short Stay', 'Medium', [64, 54, 68, 66, 62]),
  applicant(14, 'Nancy Cole', 89, 'Nutrition Support', 'Stubbornly Independent', 'Football', 'Occasional family', 'Respite', 'Medium', [62, 70, 60, 60, 68]),
  applicant(15, 'Oscar Wells', 96, 'Social Support', 'Quiet', 'Fishing', 'Community visitor', 'Long Term', 'Low', [68, 70, 58, 50, 72]),
  applicant(16, 'Patricia Hart', 68, 'High Care', 'Routine-Loving', 'Cards', 'Frequent family', 'Long Term', 'High', [60, 48, 64, 62, 56]),
  applicant(17, 'Quentin Rowe', 75, 'Light Support', 'Cheerful', 'Football', 'Occasional family', 'Long Term', 'Low', [74, 78, 76, 66, 78]),
  applicant(18, 'Rose Grant', 82, 'Mobility Support', 'Independent', 'Fishing', 'Community visitor', 'Long Term', 'Medium', [62, 56, 66, 58, 64]),
  applicant(19, 'Stanley Pike', 89, 'Memory Support', 'Witty', 'Cards', 'Frequent family', 'Long Term', 'High', [64, 58, 70, 64, 60]),
  applicant(20, 'Thelma Cross', 96, 'Clinical Support', 'Reserved', 'Football', 'Occasional family', 'Long Term', 'High', [60, 64, 62, 56, 62]),
  applicant(21, 'Uma Shah', 68, 'Rehabilitation', 'Warm', 'Fishing', 'Community visitor', 'Rehab/Short Stay', 'Medium', [66, 56, 70, 64, 64]),
  applicant(22, 'Victor Green', 75, 'Nutrition Support', 'Chatty', 'Cards', 'Frequent family', 'Long Term', 'Low', [66, 72, 70, 68, 72]),
  applicant(23, 'Wendy Nash', 82, 'Social Support', 'Curious', 'Football', 'Occasional family', 'Long Term', 'Low', [70, 72, 64, 54, 74]),
  applicant(24, 'Xavier Long', 89, 'High Care', 'Stubbornly Independent', 'Fishing', 'Community visitor', 'Long Term', 'High', [56, 52, 60, 58, 54]),
  applicant(25, 'Yvonne March', 96, 'Light Support', 'Quiet', 'Cards', 'Frequent family', 'Long Term', 'Low', [72, 74, 70, 62, 76]),
  applicant(26, 'Albert Stone', 68, 'Mobility Support', 'Routine-Loving', 'Football', 'Occasional family', 'Long Term', 'Medium', [66, 58, 68, 62, 66]),
  applicant(27, 'Beatrice Park', 75, 'Memory Support', 'Cheerful', 'Fishing', 'Community visitor', 'Respite', 'Medium', [66, 62, 72, 62, 62]),
  applicant(28, 'Clive Ward', 82, 'Clinical Support', 'Independent', 'Cards', 'Frequent family', 'Long Term', 'Medium', [62, 70, 66, 64, 60]),
  applicant(29, 'Daphne Bloom', 89, 'Rehabilitation', 'Witty', 'Football', 'Occasional family', 'Rehab/Short Stay', 'Medium', [64, 54, 70, 62, 64]),
  applicant(30, 'Ernest Hill', 96, 'Nutrition Support', 'Reserved', 'Fishing', 'Community visitor', 'Long Term', 'Medium', [64, 68, 62, 58, 70]),
  applicant(31, 'Faye Brooks', 68, 'Social Support', 'Warm', 'Cards', 'Frequent family', 'Long Term', 'Low', [72, 76, 66, 56, 76]),
  applicant(32, 'Gordon Lee', 75, 'High Care', 'Chatty', 'Football', 'Occasional family', 'Long Term', 'High', [58, 50, 66, 64, 56]),
  applicant(33, 'Helen Stone', 82, 'Light Support', 'Curious', 'Fishing', 'Community visitor', 'Long Term', 'Low', [72, 76, 74, 66, 76]),
  applicant(34, 'Iris Wood', 89, 'Mobility Support', 'Stubbornly Independent', 'Cards', 'Frequent family', 'Long Term', 'Medium', [62, 60, 64, 62, 62]),
  applicant(35, 'Jack Foster', 96, 'Memory Support', 'Quiet', 'Football', 'Occasional family', 'Long Term', 'High', [62, 58, 64, 54, 60]),
  applicant(36, 'Kathleen Lane', 68, 'Clinical Support', 'Routine-Loving', 'Fishing', 'Community visitor', 'Long Term', 'Medium', [64, 70, 68, 64, 62]),
  applicant(37, 'Leon Grant', 75, 'Rehabilitation', 'Cheerful', 'Cards', 'Frequent family', 'Rehab/Short Stay', 'Medium', [66, 58, 72, 66, 64]),
  applicant(38, 'Margaret Bell', 82, 'Nutrition Support', 'Independent', 'Football', 'Occasional family', 'Long Term', 'Low', [64, 72, 66, 60, 70]),
  applicant(39, 'Norman Cross', 89, 'Social Support', 'Witty', 'Fishing', 'Community visitor', 'Long Term', 'Low', [70, 72, 68, 52, 74]),
  applicant(40, 'Olive Reed', 96, 'High Care', 'Reserved', 'Cards', 'Frequent family', 'Respite', 'High', [56, 48, 60, 58, 54]),
  applicant(41, 'Peter Vale', 68, 'Light Support', 'Warm', 'Football', 'Occasional family', 'Long Term', 'Low', [74, 78, 74, 64, 78]),
  applicant(42, 'Queenie Hart', 75, 'Mobility Support', 'Chatty', 'Fishing', 'Community visitor', 'Long Term', 'Medium', [64, 58, 72, 66, 64]),
  applicant(43, 'Ronald Moss', 82, 'Memory Support', 'Curious', 'Cards', 'Frequent family', 'Long Term', 'Medium', [64, 60, 66, 60, 62]),
  applicant(44, 'Sylvia Price', 89, 'Clinical Support', 'Stubbornly Independent', 'Football', 'Occasional family', 'Long Term', 'High', [60, 70, 62, 60, 60]),
  applicant(45, 'Trevor Cole', 96, 'Rehabilitation', 'Quiet', 'Fishing', 'Community visitor', 'Rehab/Short Stay', 'Medium', [62, 52, 60, 56, 64]),
  applicant(46, 'Ursula Pike', 68, 'Nutrition Support', 'Routine-Loving', 'Cards', 'Frequent family', 'Long Term', 'Low', [68, 72, 70, 64, 72]),
  applicant(47, 'Vera Wynn', 75, 'Social Support', 'Cheerful', 'Football', 'Occasional family', 'Long Term', 'Low', [70, 74, 68, 54, 76]),
  applicant(48, 'Walter Nash', 82, 'High Care', 'Independent', 'Fishing', 'Community visitor', 'Long Term', 'High', [58, 50, 62, 58, 56]),
  applicant(49, 'Aileen March', 89, 'Light Support', 'Witty', 'Cards', 'Frequent family', 'Long Term', 'Low', [72, 74, 76, 66, 76]),
  applicant(50, 'Bernard West', 96, 'Mobility Support', 'Reserved', 'Football', 'Occasional family', 'Long Term', 'Medium', [62, 56, 62, 58, 64]),
  applicant(51, 'Clara Hale', 68, 'Memory Support', 'Warm', 'Fishing', 'Community visitor', 'Long Term', 'Medium', [66, 62, 70, 62, 64]),
  applicant(52, 'Desmond Park', 75, 'Clinical Support', 'Chatty', 'Cards', 'Frequent family', 'Long Term', 'Medium', [64, 68, 70, 68, 62]),
  applicant(53, 'Evelyn Stone', 82, 'Rehabilitation', 'Curious', 'Football', 'Occasional family', 'Rehab/Short Stay', 'Medium', [64, 56, 68, 62, 64]),
  applicant(54, 'Frank Quinn', 89, 'Nutrition Support', 'Stubbornly Independent', 'Fishing', 'Community visitor', 'Long Term', 'Medium', [62, 70, 62, 58, 68]),
  applicant(55, 'Gloria Reed', 96, 'Social Support', 'Quiet', 'Cards', 'Frequent family', 'Long Term', 'Low', [68, 70, 60, 52, 72]),
  applicant(56, 'Harold Lane', 68, 'High Care', 'Routine-Loving', 'Football', 'Occasional family', 'Long Term', 'High', [60, 50, 64, 60, 56]),
  applicant(57, 'Jean Bloom', 75, 'Light Support', 'Cheerful', 'Fishing', 'Community visitor', 'Long Term', 'Low', [74, 76, 78, 66, 78]),
  applicant(58, 'Keith Mercer', 82, 'Mobility Support', 'Independent', 'Cards', 'Frequent family', 'Long Term', 'Medium', [64, 60, 66, 62, 64]),
  applicant(59, 'Lorraine Cross', 89, 'Memory Support', 'Witty', 'Football', 'Occasional family', 'Long Term', 'High', [64, 58, 68, 60, 60]),
  applicant(60, 'Maurice Bell', 96, 'Clinical Support', 'Reserved', 'Fishing', 'Community visitor', 'Long Term', 'High', [60, 66, 62, 56, 60]),
];

export const RESIDENTS = [
  {
    id: 'RES01',
    name: 'Arthur Lane',
    age: 68,
    support: 'Light Support',
    personality: 'Warm',
    interest: 'Cards',
    visitors: 'Frequent family',
    stay: 'Respite',
    art: 'resident_res01',
    needs: { personal: 20, clinical: 12, mobility: 18, nutrition: 30, memory: 10, social: 28 },
    outcomes: { comfort: 70, independence: 78, mood: 72, connection: 60, safety: 80 },
    // Warm and sociable: loves his Cards and a good breakfast, would rather not sit in his room mid-morning.
    prefs: { wake: 'accept', breakfast: 'prefer', rest: 'dislike', cards: 'prefer', dinner: 'accept', settle: 'accept', groupActivity: 'accept' },
    // Milestone 8: care-plan options he prefers / dislikes / refuses (the rest: accept) — Warm, like his personality row
    optionPrefs: { ...OPTION_PREFS_BY_PERSONALITY.Warm },
    // Milestone 4: his starting care plan (data/carePlans.js) — light support, so the first option in every domain.
    plan: { PC: 'PC01', CL: 'CL01', MO: 'MO01', NU: 'NU01', SO: 'SO01', EN: 'EN01' },
    room: 'RM01',
    urgency: 'Low',
  },
  // Milestone 6: RES02–RES12 (bible §7 rows). Starting needs follow their primary support; the plan's options suit it.
  ...ADMISSION_ROWS,
].map((r) => ({
  ...r,
  // Milestone 9: life story (data/lifeStories.js) and a fixed stay length where the row has one
  pronoun: LIFE_STORIES[r.id]?.pronoun ?? 'he',
  tags: [...(LIFE_STORIES[r.id]?.tags ?? [r.interest])],
  story: LIFE_STORIES[r.id]?.line ?? '',
  ...(STAY_DAYS[r.id] ? { stayDays: STAY_DAYS[r.id] } : {}),
}));
export const residentById = (id) => RESIDENTS.find((r) => r.id === id) ?? null;

// Check the list (debug builds at start-up, and the Node tests). v = a core/DataValidator.
export function validateResidents(v, list = RESIDENTS, stepIds = []) {
  const steps = new Set([...stepIds, ...PLAN_PREF_KEYS]);
  v.uniqueIds('residents', list);
  for (const r of list) {
    const who = `resident ${r.id}`;
    v.check(/^RES\d{2}$/.test(r.id), `${who}: id must be RESnn`);
    for (const k of ['name', 'personality', 'interest', 'visitors', 'art']) v.check(typeof r[k] === 'string' && r[k].length > 0, `${who}: ${k} missing`);
    v.check(Number.isInteger(r.age) && r.age >= 50 && r.age <= 110, `${who}: age out of range`);
    v.check(r.support in SUPPORT_LEVELS, `${who}: unknown support "${r.support}"`);
    v.check(STAY_TYPES.includes(r.stay), `${who}: unknown stay type "${r.stay}"`);
    // Milestone 6: the room they want, their hard prerequisites and urgency
    v.check(r.room in ROOM_TEMPLATES, `${who}: unknown room template "${r.room}"`);
    v.check(URGENCY.includes(r.urgency), `${who}: urgency must be ${URGENCY.join(' / ')}`);
    if (r.requires) {
      const keys = Object.keys(r.requires);
      v.check(keys.length > 0 && keys.every((k) => PREREQ_KINDS.includes(k)), `${who}: requires takes ${PREREQ_KINDS.join(' / ')}`);
    }
    // Milestone 9: no unavailable prerequisite — each one points at v1 content that a home can get (never secret)
    for (const p of prereqProblems(r)) v.error(`${who}: ${p}`);
    // Milestone 9: stay length, pronoun, life-story tags and line, art file
    const stay = stayRule(r);
    if (stay != null) v.check(Array.isArray(stay) ? stay[0] >= 1 && stay[1] >= stay[0] : Number.isInteger(stay) && stay >= 1, `${who}: stay length must be whole days`);
    v.check(r.stay !== 'Long Term' || stay == null, `${who}: a Long Term stay has no length`);
    v.check(r.pronoun === 'she' || r.pronoun === 'he', `${who}: pronoun must be she / he`);
    v.check(Array.isArray(r.tags) && r.tags.length >= TAGS_PER_RESIDENT.min && r.tags.length <= TAGS_PER_RESIDENT.max, `${who}: ${TAGS_PER_RESIDENT.min}–${TAGS_PER_RESIDENT.max} life-story tags`);
    for (const t of r.tags ?? []) v.ref(who, 'life-story tag', t, TAG_SET);
    v.check(new Set(r.tags ?? []).size === (r.tags ?? []).length, `${who}: a tag is listed twice`);
    v.check((r.tags ?? []).includes(r.interest), `${who}: their interest (${r.interest}) must be one of their tags`);
    v.check(typeof r.story === 'string' && r.story.length >= 20 && r.story.length <= 110 && /[.!]$/.test(r.story), `${who}: one short life-story line`);
    v.check(r.art === `resident_${r.id.toLowerCase()}`, `${who}: art must be resident_${r.id.toLowerCase()}`);
    // the needs are their support type's profile (a roll within the variation keeps the type)
    v.check(supportOfNeeds(r.needs ?? {}) === r.support, `${who}: needs read as ${supportOfNeeds(r.needs ?? {})}, not ${r.support}`);
    for (const n of NEEDS) v.check(inRange(r.needs?.[n.id]), `${who}: need ${n.id} must be 0–100`);
    v.check(Object.keys(r.needs ?? {}).length === NEEDS.length, `${who}: exactly the six needs`);
    for (const o of OUTCOMES) v.check(inRange(r.outcomes?.[o.id]), `${who}: outcome ${o.id} must be 0–100`);
    v.check(Object.keys(r.outcomes ?? {}).length === OUTCOMES.length, `${who}: exactly the five outcomes`);
    for (const [step, p] of Object.entries(r.prefs ?? {})) {
      v.check(PREFS.includes(p), `${who}: preference "${p}" for ${step}`);
      if (steps.size) v.ref(who, 'routine step', step, steps);
    }
    // Milestone 8: care-plan option preferences
    for (const [id, p] of Object.entries(r.optionPrefs ?? {})) {
      v.check(PREFS.includes(p), `${who}: option preference "${p}" for ${id}`);
      v.check(!!optionById(id), `${who}: option preference for an unknown option ${id}`);
    }
    // the care plan: exactly one known option per domain
    v.check(!!r.plan && Object.keys(r.plan).length === DOMAINS.length, `${who}: plan needs one option per domain`);
    for (const d of DOMAINS) v.check(optionById(r.plan?.[d.id])?.domain === d.id, `${who}: plan ${d.id} is not a ${d.name} option`);
  }
  // Milestone 9: the support profiles stay far enough apart that a bounded roll never changes support type
  const ids = Object.keys(SUPPORT_PROFILES);
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const g = gap(SUPPORT_PROFILES[ids[i]], SUPPORT_PROFILES[ids[j]]);
      v.check(g > 2 * ADMISSION.needVariation, `support profiles ${ids[i]} / ${ids[j]} are only ${g} apart (need more than ${2 * ADMISSION.needVariation})`);
    }
  }
  return v;
}
const TAG_SET = new Set(LIFE_TAGS);
// A hard prerequisite may name: a room template (bible §10), a facility (bible §25) or a role on the team.
export const PREREQ_KINDS = ['room', 'facility', 'role'];
// What is wrong with a row's prerequisites (empty = every one points at v1 content a home can get, none secret).
export function prereqProblems(r) {
  const out = [];
  for (const [kind, id] of Object.entries(r.requires ?? {})) {
    if (kind === 'room') {
      const room = ROOM_TEMPLATES[id];
      if (!room) out.push(`requires an unknown room "${id}"`);
      else if (room.secret || !room.unlock) out.push(`requires ${room.name}, which no v1 home can get`);
    } else if (kind === 'facility') {
      const f = FACILITIES.find((x) => x.id === id);
      if (!f) out.push(`requires an unknown facility "${id}"`);
      else if (f.secret) out.push(`requires ${f.name}, a secret facility`);
    } else if (kind === 'role') {
      if (!ROLE_IDS.includes(id)) out.push(`requires an unknown role "${id}"`);
    } else out.push(`requires an unknown kind of thing "${kind}"`);
  }
  return out;
}
// The stay length rule for a row: null (stays), [min, max] days or a fixed number of days.
export const stayRule = (r) => r.stayDays ?? STAYS[r.stay]?.days ?? null;
const inRange = (x) => typeof x === 'number' && x >= 0 && x <= 100;
