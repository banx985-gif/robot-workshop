// Specialist programs (Milestone 20, bible §23, §2.5 safety and life balance, §6 autonomy / preference). Plain data only;
// the rules are in src/systems/programs.js and the home world (src/systems/homeWorld.js). Placeholder numbers, logged in
// docs/DECISIONS.md.
//
// The rule for this milestone: a program only *offers*. Each resident joins or declines its sessions by the Milestone 14
// choice rules; a refused plan option (or a refused group activity) is never overridden, and a program never needs
// anyone to take part to count as running. Each program's effect is small and lands on an outcome an earlier
// milestone already built — no new subsystem.
//
// A program row:
//   id, name, focus (the §23 column), icon (programs/program_prgNN.png), text (one line)
//   unlock: the §23 rule as a list, every one must pass —
//     { type: 'facility', facility }   that facility is placed (data/facilities.js)
//     { type: 'role', role }           someone with that role is on the team
//     { type: 'night' }                someone is rostered on the Night shift (the Night template)
//     { type: 'research', node }       a research node is done (data/research.js, Milestone 21); ?debug=1 allows it too
//     { type: 'partner', text }        a community partner — Milestone 23: locked, ?debug=1 allows it
//     { type: 'wing', wing, id }       a specialist wing working (its hub placed inside it — Milestone 27; ?debug=1 allows it)
//     { type: 'secret', secret, flag } PRG11 / PRG12: hidden until that secret's unlock flag `unlock:<flag>` is set
//                                      (Milestone 31; ?debug=1's unlock never opens it)
//   scope: 'facility' (the whole home) or 'wing' (one wing: 'home' is the only one until Milestone 24)
//   resources:
//     staff: { roles, shift, hours }  staff hours a week, from that shift's roster (the M7 roster; trainees don't count)
//     facility                        the facility it runs at / needs (null: none needed); shownAt: where its card says so
//     weeklyCost                      Credits a week, paid at the end of each week it runs (a ledger cost line)
//     funding                         Milestone 22: program funding it brings, Credits a week (paid with the cost; none: 0)
//     prop                            the activity prop its sessions put in the room (null: none)
//   adds: what it schedules —
//     { kind: 'session', activity, slot, days, name, liftMult }   a group session in a timetable slot on those days of the
//         week (Mon = 0 … Sun = 6); it takes the slot before the timetable (a birthday or a booked visitor still comes first)
//     { kind: 'task', name, type, at, band, days, roles, minutes, drops, outcomes, who, optionId?, goalKind? }   a
//         one-to-one offer to each resident it suits (who: 'memory' | 'rehab' | 'all') on those days
//     { kind: 'none' }   nothing scheduled (its effect is on what already happens)
//   suits: who it is for, in words and as tags / supports (the sheet's "Suits" line)
//   veto: what makes the answer no before anyone asks — options: plan options they refuse (optionPrefs 'refuse');
//     group: a group session, so a refused group activity (prefs.groupActivity 'refuse') is a no too
//   choice: an activity id whose feeling (M14 feelingOf / joinChance) decides a one-to-one offer (null: offered, and the
//     usual at-the-door refusal rules apply)
//   effects: the numbers it adds, on outcomes earlier milestones built (each program's own keys; see EFFECT_TEXT)
//   secret: true — a prestige program: never listed or startable until its flag is set (Milestone 31)
import { nodeLabel } from './research.js';

const p = (id, name, focus, fields) => ({ id, name, focus, icon: `program_${id.toLowerCase()}`, scope: 'facility', veto: { options: [], group: false }, choice: null, secret: false, ...fields });
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const PROGRAMS = [
  p('PRG01', 'Gardening & Horticulture', 'Mood/Social', {
    text: 'Regular gardening sessions in the Courtyard Garden',
    unlock: [{ type: 'facility', facility: 'F14' }, { type: 'role', role: 'LC' }],
    resources: { staff: { roles: ['LC'], shift: 'morning', hours: 3 }, facility: 'F14', shownAt: ['F14'], weeklyCost: 60, prop: 'activity_prop_01' },
    adds: { kind: 'session', activity: 'gardening', slot: 'morning', days: [1, 4], name: 'Gardening club', liftMult: 1 },
    suits: { text: 'Residents who love gardening (the Gardening tag)', tags: ['Gardening'] },
    veto: { options: ['SO05', 'EN06'], group: true },
    // a joiner with a Gardening tag gets these on top of the session's own lift
    effects: { suited: { mood: 2, connection: 2 } },
  }),
  p('PRG02', 'Music & Memory', 'Memory/Social', {
    scope: 'wing',
    text: 'Personalised music sessions for residents with memory support',
    unlock: [{ type: 'role', role: 'LC' }, { type: 'research', node: 'MEM2' }],
    resources: { staff: { roles: ['LC'], shift: 'afternoon', hours: 3 }, facility: null, shownAt: ['F20', 'F05'], weeklyCost: 40, prop: null },
    // (SO04's music-and-memory session: it counts as a personalised session — Milestone 17)
    adds: { kind: 'task', name: 'Music & Memory session', type: 'activity', at: 15, band: 'afternoon', days: [0, 2, 4], roles: ['LC'], minutes: 30, drops: { memory: 10, social: 10 }, outcomes: { comfort: 3, mood: 2 }, who: 'memory', optionId: 'SO04' },
    suits: { text: 'Residents with memory support', supports: ['Memory Support'] },
    veto: { options: ['SO04'], group: false },
    choice: 'music',
    effects: { session: { comfort: 3, mood: 2 } },
  }),
  p('PRG03', 'Pet Therapy Visits', 'Mood/Social', {
    text: 'A weekly visit from the pet-therapy team',
    unlock: [{ type: 'partner', text: 'a community partner (pet-therapy team)' }],
    resources: { staff: { roles: ['LC'], shift: 'afternoon', hours: 1 }, facility: 'F05', shownAt: ['F05'], weeklyCost: 80, prop: 'activity_prop_09' },
    adds: { kind: 'session', activity: 'petTherapy', slot: 'afternoon', days: [5], name: 'Pet therapy visit', liftMult: 1.5 },
    suits: { text: 'Anyone who enjoys animals (the Pets tag most of all)', tags: ['Pets'] },
    veto: { options: [], group: true },
    effects: { liftMult: 1.5 },
  }),
  p('PRG04', 'Falls Prevention Program', 'Safety/Mobility', {
    text: 'Balance classes, and a lower falls risk for everyone',
    unlock: [{ type: 'role', role: 'AH' }, { type: 'research', node: 'MOB2' }],
    resources: { staff: { roles: ['AH'], shift: 'morning', hours: 3 }, facility: null, shownAt: ['F07', 'F19', 'F05'], weeklyCost: 50, funding: 25, prop: null }, // (Milestone 22: falls-prevention funding, a week)
    adds: { kind: 'session', activity: 'exercise', slot: 'morning', days: [0, 3], name: 'Balance class', liftMult: 1 },
    suits: { text: 'Everyone (the falls risk drops for all); the class suits anyone keen to stay steady on their feet', tags: [] },
    veto: { options: ['MO06'], group: true },
    // the M16 falls-risk number: a modifier for every resident; a joiner of the class gains a little Independence
    effects: { falls: -8, joined: { independence: 1 } },
  }),
  p('PRG05', 'Reablement Pathway', 'Independence', {
    scope: 'wing',
    text: 'Faster rehab progress and more successful discharges',
    unlock: [{ type: 'facility', facility: 'F18' }, { type: 'research', node: 'MOB4' }],
    resources: { staff: { roles: ['AH'], shift: 'morning', hours: 3 }, facility: 'F18', shownAt: ['F18'], weeklyCost: 90, funding: 40, prop: null }, // (Milestone 22: reablement funding, a week)
    adds: { kind: 'task', name: 'Reablement practice', type: 'mobility', at: 11.5, band: 'morning', days: [1, 3, 5], roles: ['AH', 'CW'], minutes: 20, drops: { mobility: 6 }, outcomes: { independence: 1 }, who: 'rehab', goalKind: 'therapy' },
    suits: { text: 'Residents working on rehab goals (Milestone 16)', supports: ['Rehabilitation', 'Mobility Support'] },
    veto: { options: ['MO07'], group: false },
    // × on every rehab goal gain (Milestone 16)
    effects: { rehabMult: 1.25 },
  }),
  p('PRG06', 'Family Partnership Program', 'Family Trust', {
    text: 'Regular partnership meetings with families, and smaller complaint dips',
    unlock: [{ type: 'facility', facility: 'F15' }, { type: 'research', node: 'OPS2' }],
    resources: { staff: { roles: ['RN'], shift: 'afternoon', hours: 2 }, facility: 'F15', shownAt: ['F15', 'F09'], weeklyCost: 40, prop: null },
    adds: { kind: 'none' },
    suits: { text: 'Every family (not a resident who refuses the Family Connection Plan)', tags: [] },
    veto: { options: ['SO07'], group: false },
    // a partnership meeting is booked for each family not met in meetingEveryDays (at most perDay a day); a complaint's
    // Family Trust dip × complaintMult (the family is already part of the team)
    effects: { meetingEveryDays: 21, perDay: 1, complaintMult: 0.6 },
  }),
  p('PRG07', 'Nutrition Plus', 'Nutrition', {
    text: 'Better meals and more to drink',
    unlock: [{ type: 'facility', facility: 'F16' }, { type: 'research', node: 'NUT4' }],
    resources: { staff: { roles: ['HN'], shift: 'morning', hours: 4 }, facility: 'F16', shownAt: ['F16', 'F04', 'F03'], weeklyCost: 120, prop: null },
    adds: { kind: 'none' },
    suits: { text: 'Everyone who eats here', tags: [] },
    // meal quality + quality (Milestone 15 mealQuality, a part of its own); every drinks-round stop's Nutrition drop × hydrationMult
    effects: { quality: 6, hydrationMult: 1.25 },
  }),
  p('PRG08', 'Night Comfort Program', 'Comfort/Safety', {
    scope: 'wing',
    text: 'Calmer nights: quiet comfort checks and fewer call bells',
    unlock: [{ type: 'night' }, { type: 'research', node: 'PER4' }],
    resources: { staff: { roles: ['CW', 'RN'], shift: 'night', hours: 4 }, facility: null, shownAt: ['F01'], weeklyCost: 40, prop: null },
    // two quiet checks a night (asleep: nobody is woken — only asleepDrops; awake: a warm drink and a check — drops)
    adds: { kind: 'task', name: 'Night comfort check', type: 'roomCheck', at: [23.5, 3], band: 'night', days: [0, 1, 2, 3, 4, 5, 6], roles: ['CW', 'RN'], minutes: 8, drops: { personal: 12, nutrition: 12 }, asleepDrops: { personal: 12 }, outcomes: { comfort: 1.5 }, who: 'all', place: 'room' },
    suits: { text: 'Everyone, most of all residents awake at night', tags: [] },
    veto: { options: ['EN07'], group: false },
    // Comfort an hour for anyone awake during the Night band
    effects: { awakeComfortPerHour: 0.5 },
  }),
  p('PRG09', 'Intergenerational Visits', 'Social', {
    text: 'A weekly visit from the local school',
    unlock: [{ type: 'facility', facility: 'F25' }],
    resources: { staff: { roles: ['LC'], shift: 'afternoon', hours: 1 }, facility: 'F25', shownAt: ['F25'], weeklyCost: 30, prop: 'community_prop_08' },
    adds: { kind: 'session', activity: 'communityVisit', slot: 'afternoon', days: [2], name: 'School visit', liftMult: 1.4 },
    suits: { text: 'Anyone who enjoys company and the community', tags: ['Community'] },
    veto: { options: [], group: true },
    effects: { liftMult: 1.4, joined: { connection: 2 } },
  }),
  p('PRG10', 'Palliative Comfort Program', 'Comfort/Family', {
    scope: 'wing',
    text: 'Comfort and family presence at the end of life',
    unlock: [{ type: 'wing', wing: 'Palliative Wing', id: 'palliative' }], // (Milestone 27: the wing works once its F32 hub stands in it)
    resources: { staff: { roles: ['CW', 'RN'], shift: 'afternoon', hours: 2 }, facility: null, shownAt: ['F24', 'F01'], weeklyCost: 50, prop: null },
    adds: { kind: 'none' },
    suits: { text: 'Residents approaching the end of life', supports: ['Palliative'] },
    // Milestone 27: the end-of-life comfort score + comfortScore for residents in its wing
    effects: { comfortScore: 5 },
  }),
  // Secret (Milestone 31): never listed, never startable.
  // Prestige (Milestone 31): hidden until their secret's unlock flag is set (flag: SEC-FAC-01 → unlock:PRG11, SEC-COMP-02 →
  // unlock:PRG12), then listed and run by the same rules as the others (staff hours, Credits, choice). The Centenarian
  // Garden (F34) makes both stronger: effects × 1.2 (× its level). Placeholder numbers, logged in docs/DECISIONS.md.
  p('PRG11', 'Centenarian Living', 'Prestige', {
    secret: true,
    text: 'Long lives lived their own way: an afternoon of their choosing for the home’s eldest residents',
    unlock: [{ type: 'secret', secret: 'SEC-FAC-01', flag: 'PRG11' }],
    resources: { staff: { roles: ['LC'], shift: 'afternoon', hours: 2 }, facility: null, shownAt: ['F34', 'F14', 'F05'], weeklyCost: 60, prop: null },
    // a one-to-one offer to each resident aged minAge or more; they say yes or no as always
    adds: { kind: 'task', name: 'An afternoon their way', type: 'activity', at: 14.5, band: 'afternoon', days: [1, 3, 5], roles: ['LC', 'CW'], minutes: 30, drops: { social: 10 }, outcomes: { mood: 3, comfort: 2, connection: 1 }, who: 'elder', minAge: 90 },
    suits: { text: 'Residents aged 90 and over', tags: [] },
    veto: { options: [], group: false },
    effects: { session: { mood: 3, comfort: 2, connection: 1 }, minAge: 90 },
  }),
  p('PRG12', 'Home, Not Hospital', 'Prestige', {
    secret: true,
    text: 'Every clinical task still done, fitted around each resident’s own day: quality of life first',
    unlock: [{ type: 'secret', secret: 'SEC-COMP-02', flag: 'PRG12' }],
    resources: { staff: { roles: ['RN', 'CW'], shift: 'morning', hours: 2 }, facility: null, shownAt: ['F34', 'F01'], weeklyCost: 80, prop: null },
    adds: { kind: 'none' },
    suits: { text: 'Everyone who lives here', tags: [] },
    // Comfort and Mood an hour for every resident awake in the day bands (morning, afternoon, evening); care itself is unchanged
    effects: { dayComfortPerHour: 0.15, dayMoodPerHour: 0.15 },
  }),
];
// The ten a player always sees (PRG11 / PRG12 are secret: listed only once their flag is set — Milestone 31).
export const VISIBLE_PROGRAMS = PROGRAMS.filter((x) => !x.secret);
export const PRESTIGE_PROGRAMS = PROGRAMS.filter((x) => x.secret);
export const programById = (id) => PROGRAMS.find((x) => x.id === id) ?? null;
// (by id, the visible ones only — what the sheet and the world's list use)
export const visibleProgram = (id) => VISIBLE_PROGRAMS.find((x) => x.id === id) ?? null;
// (Milestone 31) the unlock flag that opens a prestige program (null: an ordinary one)
export const programFlag = (def) => def?.unlock.find((r) => r.type === 'secret')?.flag ?? null;
// (Milestone 31) the Centenarian Garden's boost on the prestige programs: × 1.2 at Level I (data/facilities.js F34)
export const PRESTIGE_GARDEN = { facility: 'F34', mult: 1.2 };

// What each lock says while it is locked (plain words), and the milestone that opens it.
export const LOCKS = {
  research: { milestone: 'M21', text: (r) => `Needs research: ${nodeLabel(r.node)}` },
  partner: { milestone: 'M23', text: (r) => `Needs ${r.text} (community partners arrive in a later update)` },
  wing: { milestone: 'M27', text: (r) => `Needs the ${r.wing} working (its hub placed inside the wing)` },
  night: { text: () => 'Needs staff rostered on the Night shift' },
  secret: { milestone: 'M31', text: () => 'Needs its secret found (a prestige program)' }, // (Milestone 31: shown only once it is)
};
// The rules (src/systems/programs.js): the week, the staff-hours check and stopping.
export const PROGRAM_RULES = {
  daysPerWeek: 7,
  // stopping mid-week pays only for the days it ran (no penalty beyond losing the benefit)
  stopPaysDays: true,
  historyKept: 20, // starts / stops / weekly payments kept on the state
  logShown: 5,
};
export const LEDGER_CATEGORY = 'programs';
export const dayList = (days) => (days.length === 7 ? 'every day' : days.map((d) => DAY_NAMES[d]).join(', '));
export { DAY_NAMES };

// The sheet's plain lines for each program's effect (from its numbers).
export const EFFECT_TEXT = {
  PRG01: (e) => `Gardening tag: Mood +${e.suited.mood}, Social Connection +${e.suited.connection} on top of each session`,
  PRG02: (e) => `Comfort +${e.session.comfort}, Mood +${e.session.mood} a session for memory support (a personalised session)`,
  PRG03: (e) => `The visit lifts Mood and Social Connection ${e.liftMult}× a normal session`,
  PRG04: (e) => `Falls risk ${e.falls} for every resident · Independence +${e.joined.independence} for each class joined`,
  PRG05: (e) => `Rehab goals move ${Math.round((e.rehabMult - 1) * 100)}% faster: home sooner`,
  PRG06: (e) => `A partnership meeting for each family every ${e.meetingEveryDays} days · complaint dips ${Math.round((1 - e.complaintMult) * 100)}% smaller`,
  PRG07: (e) => `Meal quality +${e.quality} · drinks rounds go ${Math.round((e.hydrationMult - 1) * 100)}% further`,
  PRG08: (e) => `Comfort +${e.awakeComfortPerHour} an hour for anyone awake at night · quiet checks ease needs, so fewer call bells`,
  PRG09: (e) => `The visit lifts Mood and Social Connection ${e.liftMult}× · Social Connection +${e.joined.connection} for each visit joined`,
  PRG10: (e) => `End-of-life comfort score +${e.comfortScore} for residents in its wing`, // (Milestone 27)
  // (Milestone 31: the prestige two; the Centenarian Garden makes both 20% stronger)
  PRG11: (e) => `Mood +${e.session.mood}, Comfort +${e.session.comfort}, Social Connection +${e.session.connection} each afternoon a resident aged ${e.minAge}+ says yes · +20% with the Centenarian Garden`,
  PRG12: (e) => `Comfort +${e.dayComfortPerHour} and Mood +${e.dayMoodPerHour} an hour for everyone awake in the day · clinical care unchanged · +20% with the Centenarian Garden`,
};

// Check the list (debug builds at start-up, and the Node tests). v = a core/DataValidator.
export function validatePrograms(v, { facilities = null, activities = null, options = null } = {}) {
  v.check(PROGRAMS.length === 12, 'programs: twelve (§23)');
  v.check(VISIBLE_PROGRAMS.length === 10, 'programs: ten visible');
  const ids = new Set();
  const slots = new Set();
  for (const x of PROGRAMS) {
    const who = `program ${x.id}`;
    v.check(/^PRG\d{2}$/.test(x.id) && !ids.has(x.id), `${who}: id`);
    ids.add(x.id);
    v.check(!!x.name && !!x.focus && x.icon === `program_${x.id.toLowerCase()}`, `${who}: name, focus, icon`);
    v.check(['facility', 'wing'].includes(x.scope), `${who}: scope`);
    v.check(Array.isArray(x.unlock) && x.unlock.length > 0, `${who}: unlock rules`);
    for (const r of x.unlock) v.check(['facility', 'role', 'night', 'research', 'partner', 'wing', 'secret'].includes(r.type), `${who}: unlock type ${r.type}`);
    v.check(x.secret === x.unlock.some((r) => r.type === 'secret'), `${who}: secret ⇔ a secret unlock`);
    const R = x.resources;
    v.check(!!R?.staff?.roles?.length && ['morning', 'afternoon', 'night'].includes(R.staff.shift) && R.staff.hours > 0, `${who}: staff hours`);
    v.check(Number.isFinite(R.weeklyCost) && R.weeklyCost >= 0, `${who}: weekly cost`);
    if (facilities && R.facility) v.check(facilities.includes(R.facility), `${who}: facility ${R.facility}`);
    if (x.adds.kind === 'session') {
      if (activities) v.check(activities.includes(x.adds.activity), `${who}: activity ${x.adds.activity}`);
      for (const d of x.adds.days) {
        const k = `${x.adds.slot}:${d}`;
        v.check(!slots.has(k), `${who}: clashes on ${k}`);
        slots.add(k);
      }
    }
    if (options) for (const o of x.veto.options) v.check(options.includes(o), `${who}: veto option ${o}`);
    v.check(!!EFFECT_TEXT[x.id], `${who}: effect text`);
    if (x.secret) v.check(!!programFlag(x), `${who}: a prestige program opens by its unlock flag`);
  }
  return v;
}
