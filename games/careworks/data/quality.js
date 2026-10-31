// Quality, Rank and inspections (Milestone 26, bible §5, §31, §3, §24). Plain data only; the rules are in
// src/systems/quality.js. Every number here is read from what the home really did (src/systems/homeWorld.js
// qualityInputs): nothing a player fills in or ticks.
//
// SCORES: the five headline scores (bible §5), each 0–100: a weighted sum of parts (the weights add up to 1). Each part
// is a 0–100 reading of something the game already tracks (`input` names it in the day's inputs). A day's score is
// worked out at midnight; the score shown is the average of the last WINDOW days, so one good or bad day can't swing it.
// `moves`: the small "what moves this" line on the Quality tab.
export const WINDOW = 28; // one game month

export const SCORES = [
  {
    id: 'clinicalSafety',
    name: 'Clinical Safety',
    short: 'Clinical',
    moves: 'Medicine rounds done safely, health checks, alerts handled well, essential care done, few falls',
    parts: [
      { input: 'clinical', weight: 0.45, label: 'Medicines, checks and alerts (the Nurse Station score)' },
      { input: 'essentialDone', weight: 0.25, label: 'Essential care done on time' },
      { input: 'fallsFree', weight: 0.15, label: 'Few falls this month' },
      { input: 'infection', weight: 0.15, label: 'Infection control (training and leads)' },
    ],
  },
  {
    id: 'residentWellbeing',
    name: 'Resident Wellbeing',
    short: 'Wellbeing',
    moves: 'Residents’ Mood, Comfort, Independence and Social Connection, and doing things they like',
    parts: [
      { input: 'mood', weight: 0.3, label: 'Mood' },
      { input: 'comfort', weight: 0.2, label: 'Comfort' },
      { input: 'independence', weight: 0.15, label: 'Independence' },
      { input: 'connection', weight: 0.2, label: 'Social Connection' },
      { input: 'choice', weight: 0.15, label: 'Doing something they like (their own choice)' },
    ],
  },
  {
    id: 'familyTrust',
    name: 'Family Trust',
    short: 'Family',
    moves: 'Families’ trust, complaints put right in time, compliments',
    parts: [
      { input: 'trust', weight: 0.65, label: 'Family Trust (every family’s average)' },
      { input: 'complaintsInTime', weight: 0.2, label: 'No complaint left past its due date' },
      { input: 'compliments', weight: 0.15, label: 'Compliments in the last two months' },
    ],
  },
  {
    id: 'staffWellbeing',
    name: 'Staff Wellbeing',
    short: 'Staff',
    moves: 'Staff Morale and Energy, safe shifts, training, and residents with their usual carers',
    parts: [
      { input: 'morale', weight: 0.35, label: 'Morale' },
      { input: 'energy', weight: 0.2, label: 'Energy (fatigue)' },
      { input: 'safeShifts', weight: 0.2, label: 'Shifts at Safe Coverage (workload)' },
      { input: 'trained', weight: 0.15, label: 'Staff trained in the last two years' },
      { input: 'continuity', weight: 0.1, label: 'Residents with usual carers (continuity)' },
    ],
  },
  {
    id: 'environment',
    name: 'Environment & Compliance',
    short: 'Environment',
    moves: 'Room quality, room checks done, emergency Preparedness, care plans kept up to date',
    parts: [
      { input: 'rooms', weight: 0.3, label: 'Room quality and comfort facilities' },
      { input: 'clean', weight: 0.25, label: 'Room checks done (cleanliness)' },
      { input: 'preparedness', weight: 0.25, label: 'Emergency Preparedness' },
      { input: 'plansCurrent', weight: 0.2, label: 'Care plans up to date (documentation)' },
    ],
  },
];
export const SCORE_IDS = SCORES.map((s) => s.id);
export const scoreById = (id) => SCORES.find((s) => s.id === id) ?? null;

// How the parts are read from the day's inputs (each 0–100). Numbers the inputs carry as counts are turned into a
// reading here, so the rule is in data.
export const READINGS = {
  fallsPerResident: 40, // fallsFree = 100 − 40 × falls this month per resident
  overdueEach: 25, // complaintsInTime = 100 − 25 × each complaint open past its due date
  complimentBase: 60, // compliments = 60 + 20 × each compliment in the last 56 days (most 100)
  complimentEach: 20,
  complimentDays: 56,
  trainedDays: 672, // trained = share of the team who finished a course in the last two years
  neutralTrust: 50, // a home with no families yet reads Family Trust as neutral
};

// Rank (bible §31 unlocks, §24 stages, §13 caps) on core/CompanyRank + core/ReputationSystem: the reputation number
// never drops below the highest rank's floor. `accreditations`: accreditations won before that rank can be reached
// (so a strong reputation alone can't jump the recognition ladder).
export const RANKS = [
  { id: 'E', min: 0, accreditations: 0 },
  { id: 'D', min: 1000, accreditations: 0 },
  { id: 'C', min: 4400, accreditations: 1 },
  { id: 'B', min: 8000, accreditations: 2 },
  { id: 'A', min: 12400, accreditations: 3 },
  { id: 'S', min: 19000, accreditations: 5 },
];
export const RANK_IDS = RANKS.map((r) => r.id);

// What feeds reputation (bible §31: real outcomes only).
export const REPUTATION = {
  // sustained headline scores: each day, for each score, (rolling score − line) × perPoint when above the line
  line: 55,
  perPoint: 0.022,
  // a routine inspection's grade
  routine: { S: 260, A: 170, B: 100, C: 40, D: 0 },
};

// Inspections (accreditations and the yearly routine review) judge the rolling scores and the recent history.
export const INSPECTION = {
  daysOut: 5, // an accreditation inspection comes this many game days after applying
  cooldownDays: 28, // after a fail, before the same accreditation can be applied for again
  recordDays: 28, // a month of the home's own records before the first accreditation inspection (a new home, an older save)
  historyDays: 28, // the recent history an inspection looks at
  // Recent history every accreditation inspection also checks (what fell short is listed in plain words)
  history: [
    { id: 'essentialDone', min: 90, text: (v, n) => `Essential care done on time: ${v}% (needs ${n}%+)` },
    { id: 'unsafeShifts', max: 3, text: (v, n) => `Unsafe shifts in the last month: ${v} (at most ${n})` },
    { id: 'overdueComplaints', max: 0, text: (v) => `Complaints left past their due date: ${v} (needs none)` },
  ],
  routineEvery: 336, // a routine review once a game year (at the year's end)
};

// The routine review's grade (core/GradeEngine): 100 points from the rolling scores and the month's essential care.
// An incident handled well never counts against the home: incidents are not in the grade at all, only listed as handled.
export const ROUTINE_GRADE = {
  categories: [
    { id: 'clinical', name: 'Clinical Safety', max: 25, parts: [{ fact: 'clinicalSafety', label: 'Clinical Safety', full: 92, floor: 40, points: 25 }] },
    { id: 'wellbeing', name: 'Resident Wellbeing', max: 25, parts: [{ fact: 'residentWellbeing', label: 'Resident Wellbeing', full: 92, floor: 40, points: 25 }] },
    { id: 'family', name: 'Family Trust', max: 15, parts: [{ fact: 'familyTrust', label: 'Family Trust', full: 92, floor: 40, points: 15 }] },
    { id: 'staff', name: 'Staff Wellbeing', max: 15, parts: [{ fact: 'staffWellbeing', label: 'Staff Wellbeing', full: 92, floor: 40, points: 15 }] },
    { id: 'environment', name: 'Environment & Compliance', max: 10, parts: [{ fact: 'environment', label: 'Environment & Compliance', full: 92, floor: 40, points: 10 }] },
    { id: 'care', name: 'Essential care', max: 10, parts: [{ fact: 'essentialDone', label: 'Essential care done on time', full: 99, floor: 80, points: 10 }] },
  ],
  bands: [{ id: 'D', min: 0 }, { id: 'C', min: 45 }, { id: 'B', min: 60 }, { id: 'A', min: 72 }, { id: 'S', min: 85 }],
  total: 100,
};

// Speeds (bible §3): 2× after the first accreditation inspection (pass or fail), 4× at Rank C or Year 4.
export const SPEED_UNLOCKS = {
  2: { text: '2× unlocks after your first accreditation inspection (Quality → Accreditation)' },
  4: { rank: 'C', year: 4, text: '4× unlocks at Rank C or in Year 4' },
};

// A Rare row's "role milestone" (bible §12; Milestone 11 kept it at Rank D until now): Rank D and that role's own
// headline score held at the line (the rolling score, so a month of good work in that area).
export const ROLE_MILESTONES = {
  RN: { score: 'clinicalSafety', min: 65 },
  CW: { score: 'residentWellbeing', min: 65 },
  LC: { score: 'familyTrust', min: 65 },
  AH: { score: 'clinicalSafety', min: 65 },
  HN: { score: 'residentWellbeing', min: 65 },
};

// Art and words for the moments.
export const QUALITY_ART = { icon: 'care_ui_28', rankUp: 'care_ui_28', confetti: 'care_vfx_08', finale: 'care_event_09' };

export function validateQuality(v) {
  for (const s of SCORES) {
    const sum = s.parts.reduce((t, p) => t + p.weight, 0);
    v.check(Math.abs(sum - 1) < 1e-9, `quality: ${s.id} weights add up to ${sum}, not 1`);
    v.check(!!s.moves, `quality: ${s.id} needs a "what moves this" line`);
  }
  v.check(SCORES.length === 5, 'quality: exactly five headline scores (bible §5)');
  for (let i = 1; i < RANKS.length; i++) v.check(RANKS[i].min > RANKS[i - 1].min, `quality: rank ${RANKS[i].id} above ${RANKS[i - 1].id}`);
  v.check(RANK_IDS.join('') === 'EDCBAS', 'quality: ranks E → S');
  return v;
}

// What each rank opens (the rank-up beat and the Quality tab's Rank section; the gates themselves read the rank).
export const RANK_OPENS = {
  D: 'Stage 2 · the Care Agency · Rare staff · Level II upgrades · Garden Rooms and new facilities · a team of 18',
  C: 'Stage 3 (with the Family Trust Award) · the Specialist Recruiter · Level III · 4× speed · 2 partner slots · a team of 26',
  B: 'High-Care Rooms and new specialist facilities · Elite staff with their facility · a team of 36',
  A: 'Stage 4 (with a specialist program) · National Search · the wing hubs · 3 partner slots · a team of 46',
  S: 'Stage 5 from Year 13 · the national finale (C10) · a team of 56',
};
// The rank-up big beat's one short line (the beat does not wrap: keep each under ~45 characters).
export const RANK_BEAT = {
  D: 'Stage 2, the Care Agency and Level II',
  C: 'Stage 3, the Specialist Recruiter and 4×',
  B: 'High-Care Rooms and Elite staff',
  A: 'Stage 4, National Search and wing hubs',
  S: 'Stage 5 and the national finale',
};
