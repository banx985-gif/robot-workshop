// Family trust, visits, meetings, compliments and complaints (Milestone 19, bible §21, §7 "Visitors", §9 SO07, §25 F09 /
// F15 / F29, §12 Family Communicator). Plain data only; the rules are in src/systems/family.js and the home world.
// Placeholder numbers, logged in docs/DECISIONS.md.
//
// The rule for this milestone: a complaint creates an improvement task and an evidence trail, never instant punishment.
// Family Trust changes predictably: every change is a fixed amount for a named reason, logged on the family's record.
// No complaint ever costs Credits or a score on its own.

// --- the family record ---------------------------------------------------------------------------------------------------
// Every resident's family starts at TRUST.start (0–100). A home's Family Trust is the average over the residents here.
// Positive changes are × (1 + F29's +12%) when the Family Partnership Centre is placed (its §25 effect).
export const TRUST = { start: 60, min: 0, max: 100, historyKept: 40, partnership: 'F29', partnershipPct: 12, desk: 'F09' };

// The visit pattern from each resident's §7 Visitors column: how often someone comes (days, give or take `jitter`), and
// who. None: nobody visits (no resident has it today; kept for safety). SO07 Family Connection Plan makes visits come
// sooner (× soMult) and adds a weekly call (the SO07 task, "Family call or visit").
export const PATTERNS = {
  'Frequent family': { every: 7, jitter: 2, word: 'about weekly', relations: ['Daughter', 'Son', 'Granddaughter', 'Grandson', 'Wife', 'Husband'] },
  'Occasional family': { every: 28, jitter: 5, word: 'about monthly', relations: ['Son', 'Daughter', 'Niece', 'Nephew', 'Sister', 'Brother'] },
  'Community visitor': { every: 21, jitter: 5, word: 'now and then', relations: ['Friend', 'Neighbour', 'Volunteer'] },
  None: { every: 0, jitter: 0, word: 'no regular visitors', relations: [] },
};
export const SO_VISITS = { option: 'SO07', soMult: 0.7, callTrust: 0.5, visitSupport: 1 };

// Fictional contact names (data only), by the relation's usual gender; friends, neighbours and volunteers from both.
export const NAMES = {
  f: ['Jenny', 'Claire', 'Sarah', 'Helen', 'Rachel', 'Anne', 'Louise', 'Karen', 'Emma', 'Julie', 'Fiona', 'Paula', 'Amy', 'Lucy', 'Diane', 'Nicola'],
  m: ['David', 'Mark', 'Paul', 'Steven', 'Andrew', 'Peter', 'Simon', 'Gary', 'Neil', 'Tom', 'Chris', 'Ian', 'Rob', 'Martin', 'Alan', 'Joe'],
};
export const RELATION_GENDER = { Daughter: 'f', Granddaughter: 'f', Wife: 'f', Niece: 'f', Sister: 'f', Son: 'm', Grandson: 'm', Husband: 'm', Nephew: 'm', Brother: 'm' };
// What the relative calls the resident in a log line ("happy with Dad's room"); anyone else uses the resident's name.
export const CALLS = { Daughter: ['Dad', 'Mum'], Son: ['Dad', 'Mum'], Granddaughter: ['Grandad', 'Gran'], Grandson: ['Grandad', 'Gran'] };

// --- visits -------------------------------------------------------------------------------------------------------------
// A visitor walks in from the front entrance in the afternoon (arriveFrom–arriveTo, seeded), sits with the resident for
// `hours`, then walks out. With the Family Room (F15) placed and the resident free (their step done, the next one at
// least freeHours away, not asleep), the two of them sit there instead; otherwise the visitor sits beside the resident
// wherever they are (their room, the lounge, the table) and goes with them if they move. A visit day that finds them
// away, leaving or not yet settled waits a day.
export const VISIT = { arriveFrom: 14, arriveTo: 15.25, hours: 1.75, freeHours: 1, familyRoom: 'F15', speed: 1.1, connection: 2, memoryConnection: 3 };

// What a visit's family notice moves Trust by (all fixed, so the same visit always gives the same change). Each part
// that applies is logged with its reason; the parts add up.
export const NOTICE = {
  mood: { good: 75, low: 45, goodTrust: 2, okTrust: 0.5, lowTrust: -2 },
  comfort: { good: 70, low: 45, goodTrust: 1, lowTrust: -1.5 },
  missed: { days: 2, each: -2, cap: -6 }, // essential care missed in the last `days` days
  room: { bell: -2, alert: -1, tidy: 0.5 }, // a call bell ringing and not answered · an open alert · a room check done today
  greeted: { familiarity: 30, trust: 1 }, // someone on shift who knows them well says hello
  favourite: { trust: 1 }, // their favourite staff member (Milestone 13) is on shift
  suite: { trust: 1, room: 'RM03', text: 'the Premium Suite: room to sit together in private' }, // (Milestone 20: RM03's Family Trust +, every visit)
};
// (A Family Communicator on shift makes a visit's positive parts go 6% further, and a meeting they attend: data/staff.js.)

// --- care-plan meetings (bible §21 "care-plan review") --------------------------------------------------------------------
// Booked for an afternoon (the family comes as a visit, arriving at `at`): the Founder or a Registered Nurse on the
// afternoon shift attends for `minutes`. Held: Trust + lift (× F15's +8% with the Family Room placed, × 1.06 when the one
// attending has Family Communicator, × 1.05 with the Family Liaison specialty), the family's wish noted on the plan,
// anything they weren't told cleared, and — for a review with family — the plan marked reviewed. Not held by the end of
// the afternoon: it moves to the next day (up to `tries` times), with no Trust cost.
export const MEETING = { at: 14, minutes: 60, urgency: 3, lift: 8, familyRoomPct: 8, liaisonPct: 5, tries: 3, noteKept: 6 };
// The family asks for one (an Inbox item): Trust under lowTrust (at most once every gapDays), or their plan is due for
// review (a seeded chance a day, frequent / occasional families only). Declining kindly: a small dip.
export const MEETING_ASK = { lowTrust: 45, gapDays: 14, reviewChance: 0.2, declineTrust: -1, expireDays: 5 };
// Meeting kinds. Milestone 27: the palliative support meeting can be booked once a resident is approaching the end of
// life (the resident card's End of life section); held, it counts for the comfort score's "family supported".
export const MEETING_KINDS = {
  review: { name: 'Care-plan review with family' },
  meeting: { name: 'Care-plan meeting' },
  request: { name: 'Care-plan meeting (the family asked)' },
  complaint: { name: 'Meeting about a complaint' },
  partnership: { name: 'Family partnership meeting' }, // (Milestone 20: booked by the Family Partnership Program)
  palliative: { name: 'Palliative support meeting', eol: true }, // (Milestone 27)
};
// The family's wish, noted on the plan after a meeting (the first that fits).
export const NOTES = [
  { when: 'dislikedOption', text: (o) => `Asked about ${o}: would like it looked at again` },
  { when: 'lowMood', text: () => 'Would like more company in the afternoons' },
  { when: 'interest', text: (i) => `Would love more ${i.toLowerCase()} in the week` },
  { when: 'default', text: () => 'Happy with the plan: keep us posted' },
];

// --- compliments --------------------------------------------------------------------------------------------------------
// Data-driven: each kind's Trust lift, the Morale lift for the staff named (their favourite, else the most familiar
// member of the team; the birthday host), and how often one family may send one.
export const COMPLIMENTS = {
  visit: { trust: 2, morale: 4, text: (w) => `${w.from} wrote to thank the team: ${w.call} seemed so happy`, visitTotal: 4, mood: 75 },
  birthday: { trust: 3, morale: 4, text: (w) => `${w.from} sent a card: thank you for ${w.call}'s lovely birthday`, mood: 60 },
  discharge: { trust: null, morale: 5, text: (w) => `${w.from} thanked the team for getting ${w.call} home` }, // (trust: the M16 +10, data/mobility.js)
};
export const COMPLIMENT = { gapDays: 10, kept: 40, firstArt: 'care_reward_05' };

// --- complaints ---------------------------------------------------------------------------------------------------------
// Something the family could see went wrong. Each kind: what counts (the resident's recent events of that kind — `count`
// within `within` days raises one at the day's end; `visitCount` seen on a visit raises one at once), the Trust dip when
// raised (`drop`), the plain description, the suggested fix, who owns it by default, and when it counts as improved
// (`fixDays` days with no new event since it was raised; a lingering alert: the alert closed; not told about a plan
// option: a meeting held or the option changed). Resolving it (improved, then marked done) gives back drop + bonus.
// Ignoring it past its due date (dueDays) drifts Trust down by driftPerDay (at most driftCap) and it stays open.
export const COMPLAINT = { dueDays: 5, bonus: 1, driftPerDay: -0.5, driftCap: -8, gapDays: 3, kept: 40 };
export const COMPLAINTS = {
  missedCare: { title: 'Missed care', within: 2, count: 2, visitCount: 1, drop: -6, fixDays: 2, owner: 'founder', fix: 'addCarer', text: (w) => `${w.from} is upset: ${w.call}'s ${w.detail} was missed` },
  lateTray: { title: 'Late trays', within: 3, count: 2, visitCount: 1, drop: -4, fixDays: 3, owner: 'founder', fix: 'addServer', text: (w) => `${w.from} says ${w.call}'s tray keeps coming late` },
  roundIssue: { title: 'The medicine round', within: 2, count: 1, visitCount: 1, drop: -5, fixDays: 3, owner: 'nurse', fix: 'addNurse', text: (w) => `${w.from} is worried about ${w.call}'s medicine round: ${w.detail}` },
  lingeringAlert: { title: 'Unwell for days', hours: 36, drop: -5, owner: 'nurse', fix: 'actOnAlert', text: (w) => `${w.from} asks why ${w.call} has seemed ${w.detail} for days` },
  untoldPlan: { title: 'Not told about the plan', days: 3, drop: -5, owner: 'founder', fix: 'meetFamily', text: (w) => `${w.from} wasn't told about ${w.detail} in ${w.call}'s plan` },
};
// The suggested fixes: the plain words (filled in with the shift / resident / relative) and what the button opens.
export const FIXES = {
  addCarer: { text: (w) => `Add a carer to ${w.shift}`, opens: 'roster' },
  addServer: { text: (w) => `Add a Hospitality worker or carer to ${w.shift}`, opens: 'roster' },
  addNurse: { text: (w) => `Add a nurse to ${w.shift}, or build a Medication Room`, opens: 'roster' },
  actOnAlert: { text: (w) => `Choose what to do about ${w.name}'s alert`, opens: 'card' },
  meetFamily: { text: (w) => `Review ${w.name}'s plan with ${w.their} ${w.relation}`, opens: 'meeting' },
};

// --- family requests (bible §21 "room request", "birthday/family event") ----------------------------------------------------
// Occasional Inbox items. Agree: done at once (a room move — the resident walks to the new room — or a family birthday
// party on the day: the family comes to the birthday tea). Kindly decline: a small dip, never more. No answer by
// expireDays: let go as a kind decline. At most `perHome` open at once, one per family.
export const REQUESTS = {
  gardenView: { chance: 0.01, agreeTrust: 4, betterBy: 3, patterns: ['Frequent family', 'Occasional family'], title: 'A room with a garden view' },
  nearFriend: { chance: 0.015, agreeTrust: 4, betterBy: 4, patterns: ['Frequent family', 'Occasional family', 'Community visitor'], title: 'A room closer to a friend' },
  birthdayParty: { chance: 0.5, agreeTrust: 3, partyTrust: 3, daysAhead: [3, 7], patterns: ['Frequent family', 'Occasional family'], title: 'A family birthday party' },
};
export const REQUEST = { declineTrust: -1, expireDays: 5, perHome: 3 };
// A room's view: nearest the Courtyard Garden (F14) when it is placed, else nearest the windows on the left wall.
export const VIEW = { garden: 'F14', windowCol: 0 };

// --- how a visitor looks (code-drawn: no visitor art in the art list) ------------------------------------------------------
// A plain figure in an outdoor coat carrying a small bag, with a cream name tag, so a visitor never reads as staff or a
// resident. The coat colour is fixed per visitor.
export const VISITOR_LOOK = {
  coats: ['#6F8FB8', '#B86F7E', '#7FA36B', '#C49A52', '#8C7BB5', '#5E9E9A'],
  skin: ['#F1CBA8', '#D9A57E', '#A9714D', '#7A4E33'],
  hair: ['#4B3A2A', '#7A5A3A', '#2E2A28', '#B8B0A6', '#C98B4E'],
  legs: '#4A4F63',
  bag: '#8B5E3C',
  tag: '#FFF4DC',
};

// --- the first times (beats) ------------------------------------------------------------------------------------------------
export const FIRSTS = { visitArt: 'care_event_03' }; // First Family Visit
// Icons: Family Trust, a complaint, a compliment (bible art list care_ui_10 / 23 / 24).
export const FAMILY_ICONS = { trust: 'care_ui_10', complaint: 'care_ui_23', compliment: 'care_ui_24' };
