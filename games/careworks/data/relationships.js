// Familiar Care effects, continuity groups, friendships, seating, activity groups and favourite staff (Milestone 13,
// bible §2.4, §6 "Familiar Care", §14 "preferred continuity groups", §20). Plain data only; the rules are in
// src/systems/relationships.js and src/systems/homeWorld.js. Placeholder numbers, logged in docs/DECISIONS.md.

// Familiar Care now does something (bible §6: Mood, cooperation, communication / routine efficiency). All from the
// helper's familiarity with that resident (0–100, src/systems/careTasks.js records), read before this task adds to it.
//   moodAt / moodLift        a task done by someone this familiar lifts the resident's Mood a little
//   cooperationFrom → cooperationFull / cooperationCut   a *disliked* step or task is refused less often when they offer
//       it: from cooperationFrom familiarity the chance falls, down to (1 − cooperationCut) × at cooperationFull (a *refused*
//       one is never touched: bible §6, familiarity never overrides consent)
//   efficiencyAt / workSpeedUp          the task's work goes this much faster (they know each other's ways)
// Never: it never changes who may do a task (role / skill), urgency, safety answers (call bells) or Safe Coverage.
export const FAMILIAR_EFFECTS = {
  moodAt: 60,
  moodLift: 1,
  cooperationFrom: 20,
  cooperationFull: 70,
  cooperationCut: 0.7,
  efficiencyAt: 60,
  workSpeedUp: 0.15,
};

// Continuity groups (bible §14): a staff member pinned to a small group of residents ("Ruby's residents"). The task AI
// prefers them for those residents when they are on shift and eligible: data/tasks.js SCORING.continuity (below urgency
// 1,000 and the key-worker / wing assignment 100, above Familiar Care 6). Not for call bells (the nearest answers). No
// penalty when they are off.
export const CONTINUITY = { maxResidents: 4 };

// Resident–resident friendships (bible §20: tags and counters, not a social simulation). One counter per pair, 0–100.
// It grows each time they are together: the same meal at the same Dining Room, the same activity (Cards), and a little
// more when they sit side by side. Compatibility multiplies the gain:
//   × (1 + perSharedTag for each life-story tag they share — the §7 interest is one of the tags, data/lifeStories.js)
//   × PERSONALITY_MATCH (their two personalities; default 1)
// Friends (≥ friendAt) lift each other's Social Connection a little whenever they are together; a friend going home
// dips Mood a little (it recovers as Mood drifts back — a one-off nudge, not a lasting penalty).
export const FRIENDSHIP = {
  cap: 100,
  gain: { meal: 1, activity: 1.5 },
  neighbour: 0.5, // extra when they sit side by side
  groupBonus: 0.5, // extra at an activity when both are regulars of its group
  perSharedTag: 0.5,
  friendAt: 60,
  together: { connection: 1 },
  friendLeftMood: -4,
};
// Personality pairs (order doesn't matter): how well they get on. Anything not listed is 1.
export const PERSONALITY_MATCH = [
  { a: 'Chatty', b: 'Chatty', x: 1.3 },
  { a: 'Chatty', b: 'Cheerful', x: 1.3 },
  { a: 'Chatty', b: 'Witty', x: 1.2 },
  { a: 'Cheerful', b: 'Warm', x: 1.3 },
  { a: 'Warm', b: 'Warm', x: 1.2 },
  { a: 'Curious', b: 'Witty', x: 1.2 },
  { a: 'Quiet', b: 'Reserved', x: 1.3 },
  { a: 'Quiet', b: 'Routine-Loving', x: 1.2 },
  { a: 'Routine-Loving', b: 'Routine-Loving', x: 1.2 },
  { a: 'Independent', b: 'Stubbornly Independent', x: 1.2 },
  { a: 'Chatty', b: 'Quiet', x: 0.6 },
  { a: 'Chatty', b: 'Reserved', x: 0.6 },
  { a: 'Witty', b: 'Reserved', x: 0.7 },
  { a: 'Stubbornly Independent', b: 'Stubbornly Independent', x: 0.7 },
];

// Activity groups (bible §20): an activity's regulars. A resident is in the group when they prefer the activity, or
// once they have joined it regularAfter times. The group is shown on the Activity Lounge card; two regulars at the same
// session get FRIENDSHIP.groupBonus on top.
export const ACTIVITY_GROUPS = [{ id: 'cards', name: 'Cards club', stepId: 'cards', regularAfter: 5 }];

// Favourite staff (bible §20 "favourite-staff bonds"): the resident's most familiar staff member, once familiarity is
// at least favouriteAt. Shown on the card with a small heart; stored for later secrets and family events (Milestones
// 19, 29–30).
export const FAVOURITE = { at: 80 };

// Seating (bible §20 "preferred seating groups"): each resident keeps their own seat at the Dining Room and the Activity
// Lounge (a seat number: four to a room, in order). A new resident takes the seat that follows their room number if it
// is free (as in Milestones 6–12), else the first free one. Each night a resident whose friend (≥ friendAt) sits away
// from them moves to a free seat beside that friend, if there is one.
export const SEATING = { perRoom: 4 };
