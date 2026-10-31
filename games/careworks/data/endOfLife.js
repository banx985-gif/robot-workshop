// End of life and the Memory Book (Milestone 27, bible §2 rule 2, §22, §9 CL08 / EN08, §10 RM07, §23 PRG10, §25 F24 /
// F32, §21 the palliative support meeting, research CLN5). Plain data only; the rules are in src/systems/endOfLife.js
// and the home world (src/systems/homeWorld.js) runs them.
//
// The rules this data serves:
//   - Natural decline is never a failure. Nothing here takes a score, Credits or Rank away; a well-supported end of
//     life can only lift Clinical Safety, Resident Wellbeing and Family Trust (SIGNAL).
//   - End of life is forecast through slow, clear care-stage changes (STAGES), never sudden: each stage lasts at least
//     its `days[0]`, the stages never skip, and nothing the player does wrong can hurry one (PACE: care can only slow).
//   - Gentle words only: no illness names, no medicines, no clinical detail (data/clinical.js NEVER_SAY is checked by
//     the M27 test on every string here), no sad stings, no "game over".

// --- care stages ------------------------------------------------------------------------------------------------------
// id, name, line (the card's forecast line, shown from the day the stage starts), inbox (the Inbox line), family (what
// the family is told), days: [min, max] in this stage before the next one (seeded per resident; null = until a move
// starts it), slowMax: the most days good care can add to this stage. The last stage ends with the resident passing
// peacefully (PASSING).
export const STAGES = [
  { id: 'settled', name: 'Settled', line: 'Settled: living well here', days: null, slowMax: 0 },
  {
    id: 'more', name: 'Needs more support', line: 'Needs more support: the team is watching closely', days: [56, 112], slowMax: 28,
    inbox: (n) => `${n} needs more support now. The team is watching closely; nothing changes quickly.`,
    family: (n) => `told that ${n} needs more support now`,
  },
  {
    id: 'approaching', name: 'Approaching end of life', line: 'Approaching end of life: comfort comes first now', days: [24, 42], slowMax: 14,
    inbox: (n) => `${n} is approaching the end of life. A comfort-focused plan is now offered (never forced).`,
    family: (n) => `told that ${n} is approaching the end of life`,
  },
  {
    id: 'final', name: 'Final days', line: 'Final days: quiet, close company and comfort', days: [3, 6], slowMax: 2,
    inbox: (n) => `${n} is in the final days. Family are being kept close.`,
    family: (n) => `told that ${n} is in the final days, and invited to stay close`,
  },
];
export const STAGE_IDS = STAGES.map((s) => s.id);
export const stageById = (id) => STAGES.find((s) => s.id === id) ?? STAGES[0];
export const stageIndex = (id) => Math.max(0, STAGE_IDS.indexOf(id));
// The end-of-life period (the comfort score's days, the palliative plan and meeting): these two stages.
export const EOL_STAGES = ['approaching', 'final'];

// Who can enter the stages: residents living here for good. Rehab, respite and short-stay residents never do (nor a
// test home's guests, nor anyone mid-rehab).
export const ELIGIBLE_STAYS = ['Long Term', 'Palliative'];

// --- pace -------------------------------------------------------------------------------------------------------------
// Once a week (day % 7 === 0) each Settled, eligible resident has a small seeded chance of moving to "Needs more
// support": base × age × time at the home × Support Level × care. Tuned so a 16-resident home sees about one passing a
// game year (tests/careworks/m27.test.mjs reports the rate). Good care only ever slows: care ≤ 1.
export const PACE = {
  checkEvery: 7,
  base: 0.0016,
  age: [ // by age (the first row whose `to` is at least theirs)
    { to: 72, mult: 0.45 },
    { to: 79, mult: 0.65 },
    { to: 86, mult: 0.95 },
    { to: 93, mult: 1.3 },
    { to: 200, mult: 1.75 },
  ],
  tenure: [ // by whole years at the home
    { years: 0, mult: 0.55 },
    { years: 1, mult: 0.9 },
    { years: 2, mult: 1.15 },
    { years: 3, mult: 1.3 },
  ],
  level: { 1: 0.7, 2: 0.85, 3: 1, 4: 1.15, 5: 1.35 }, // Support Level (the care stage of their needs)
  goodCare: 0.8, // × the chance while their care is good (GOOD_CARE)
  // Good care also slows a stage already under way: each good day adds slowPerDay days (up to the stage's slowMax).
  slowPerDay: 0.25,
  // Never two passings in the same week: a resident's final days wait for at least this many days after the last
  // passing (and only one resident is in the final days at a time).
  passingGapDays: 7,
  // The passing comes at a quiet hour of the last day: [from, to] hours (seeded).
  hours: [19, 23],
};
// A good day of care (the slow-down and the weekly chance): Comfort and Mood at least these, and none of their
// essential care missed that day.
export const GOOD_CARE = { comfort: 62, mood: 55 };

// --- the palliative plan ------------------------------------------------------------------------------------------------
// At "Approaching end of life" CL08 and EN08 stop being greyed (data/carePlans.js eligibility 'endOfLife'). The switch
// is offered, never forced: the Inbox and the card offer it; the player chooses.
export const PLAN = {
  options: { CL: 'CL08', EN: 'EN08' },
  offer: (n) => `Switch ${n}'s care to comfort first: gentle care, company, mouth care, position changes and quiet time`,
  kept: 'The plan stays as it is: you can switch to comfort care at any time from the card',
};
// Their own wishes (from the profile): the favourite interest, who they want near, and their own room or the garden.
export const WISHES = {
  // who they want near, by their Visitors pattern
  near: { 'Frequent family': 'their family close by', 'Occasional family': 'their family told and welcome', 'Community visitor': 'a familiar friendly face', default: 'familiar faces' },
  // where they would like to be, by personality (everyone else: a view of the garden)
  room: ['Quiet', 'Reserved', 'Routine-Loving', 'Stubbornly Independent', 'Independent'],
  roomText: 'their own room, quiet and familiar',
  gardenText: 'a view of the garden',
  gardenFacility: 'F14', // the Courtyard Garden (or a room with a garden view)
};

// --- the comfort score ------------------------------------------------------------------------------------------------
// The end-of-life period (Approaching + Final days), judged day by day, 0–100: the weighted parts below (weights add to
// 1), plus the boosts (CLN5 research, the F24 lounge × its level, their own Palliative Suite, PRG10 running, the F32 hub),
// at most 100. Nothing about the passing itself is in it.
export const COMFORT = {
  parts: [
    { id: 'tasks', weight: 0.25, label: 'Comfort care done on time' },
    { id: 'plan', weight: 0.2, label: 'The right plan in place (comfort first)' },
    { id: 'family', weight: 0.2, label: 'Family told and supported' },
    { id: 'familiar', weight: 0.1, label: 'A familiar face on shift' },
    { id: 'wishes', weight: 0.1, label: 'Their own wishes honoured' },
    { id: 'coverage', weight: 0.15, label: 'Staffing on their shifts' },
  ],
  plan: { CL08: 75, EN08: 25 }, // the plan reading: CL08 on their plan 75, EN08 25
  family: { told: 20, meeting: 50, close: 30 }, // told (a stage notice), a palliative support meeting held, kept close (a visit, or the F24 lounge)
  noFamily: 'familiar', // no family contact: the family part reads as the familiar-face part
  familiarAt: 30, // familiarity (Milestone 12) that makes someone a familiar face
  boosts: { CLN5: 6, F24: 4, RM07: 5, PRG10: 5, F32: 3 },
  good: 72, // at or above: a good-care signal (SIGNAL) and the family's thanks
  poor: 55, // below: a gentle "what could have been better" note (never a penalty)
};
// The good-care signal: a well-supported end of life lifts these headline scores by up to `max` points a day for
// `days` days (positive only; (score − from) / (100 − from) × max).
export const SIGNAL = { scores: ['clinicalSafety', 'residentWellbeing', 'familyTrust'], from: COMFORT.good - 2, max: 3, days: 28 };
// The family's last Trust result: up to `max` for a well-supported time (never a drop).
export const FAMILY_RESULT = { from: 60, per: 0.25, max: 10 };

// --- the memorial moment ------------------------------------------------------------------------------------------------
// Restrained: the room light dims softly (care_vfx_10), a short quiet card, then the game carries on. Friends have a
// small Mood dip that recovers; staff who knew them a small Morale dip that recovers (faster with a Staff Room, F06).
// The dips are grief, not a score: the headline scores read past them (src/systems/homeWorld.js qualityInputs).
export const MEMORIAL = {
  friendMood: 6, friendRecover: 1, // points a day back
  staffMorale: 5, staffRecover: 1, staffRoomMult: 2, staffRoom: 'F06', knewAt: 20,
  heldDays: 3, // the room is held for these days, then opens to admissions
  card: (w) => `${w.name} passed peacefully${w.beside ? `, with ${w.beside} beside ${w.them}` : ''}.`,
  art: { book: 'memory_book_emblem', glow: 'care_vfx_10', star: 'care_reward_10' }, // (Milestone 28b: the Memory Book's own emblem — was care_ui_25)
};
// The "what could have been better" note (no penalty): the weakest parts, in plain words.
export const BETTER = {
  tasks: 'more of the comfort care done on time',
  plan: 'the comfort-first plan in place sooner',
  family: 'the family told sooner and a palliative support meeting held',
  familiar: 'a familiar face on more of the shifts',
  wishes: 'more of their own wishes honoured',
  coverage: 'safe staffing on their shifts',
};

// --- the Memory Book (account-wide) ------------------------------------------------------------------------------------
// A page per resident who passed at the home: name, portrait, time at the home, favourite interest, friendships, major
// story moments and the staff they knew best. Kept in the account save (never a campaign slot), so it survives a new
// campaign and New Game+. Pages are read only: there is no delete.
export const BOOK = {
  title: 'Memory Book',
  subtitle: 'Everyone who lived out their days with you, across every home',
  empty: 'No pages yet. When a resident passes peacefully at the home, a page is kept here for good.',
  momentsKept: 12, // story moments kept per resident
  friendsShown: 3,
  staffShown: 3,
  // Story moments (the resident's own record): kinds and their words
  moments: {
    moved: () => 'Moved in',
    birthday: (x) => `A birthday tea${x.age ? ` (${x.age})` : ''}`,
    cheered: (x) => `Cheered ${x.name} home`,
    event: (x) => `Joined the ${x.name}`,
    story: (x) => x.text, // (Milestone 28: a life-story discovery)
    friend: (x) => x.text, // (Milestone 28: a new friendship)
  },
};

// The account save key for the Memory Book (inside the account store, beside nothing a campaign slot touches).
export const ACCOUNT_KEY = 'memoryBook';

// Every player-facing string here (the M27 test scans them with data/clinical.js NEVER_SAY).
export function eolStrings() {
  const all = [];
  const add = (s) => typeof s === 'string' && all.push(s);
  for (const s of STAGES) {
    add(s.name);
    add(s.line);
    if (s.inbox) add(s.inbox('Arthur'));
    if (s.family) add(s.family('Arthur'));
  }
  for (const p of COMFORT.parts) add(p.label);
  for (const s of Object.values(BETTER)) add(s);
  add(PLAN.offer('Arthur'));
  add(PLAN.kept);
  add(MEMORIAL.card({ name: 'Arthur', beside: 'his daughter', them: 'him' }));
  for (const s of [BOOK.title, BOOK.subtitle, BOOK.empty, WISHES.roomText, WISHES.gardenText, ...Object.values(WISHES.near)]) add(s);
  for (const f of Object.values(BOOK.moments)) add(f({ name: 'Betty', age: 90 }));
  return all;
}
export function validateEndOfLife(v) {
  for (const s of STAGES) {
    v.check(typeof s.name === 'string' && s.name.length > 0, `end of life: ${s.id} needs a name`);
    if (s.days) v.check(s.days[0] >= 1 && s.days[1] >= s.days[0], `end of life: ${s.id} days are [min, max]`);
  }
  v.check(STAGES[0].days === null && STAGES.slice(1).every((s) => s.days), 'end of life: Settled has no length; every later stage has one');
  const w = COMFORT.parts.reduce((t, p) => t + p.weight, 0);
  v.check(Math.abs(w - 1) < 1e-9, `end of life: comfort weights add up to ${w}, not 1`);
  for (const p of COMFORT.parts) v.check(typeof BETTER[p.id] === 'string', `end of life: ${p.id} needs a "could have been better" line`);
  return v;
}
