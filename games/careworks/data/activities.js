// Activities (Milestone 14, bible §20 "Lifestyle / Community / Relationships", §2.2 the resident is a person). Plain data
// only; the rules are in src/systems/activities.js (choice, outcomes) and src/systems/homeWorld.js (the sessions).
// Placeholder numbers, logged in docs/DECISIONS.md.
//
// An activity row:
//   id, name, text (one line), log (today's log word)
//   where: { facility, fallback } — the facility it belongs in (data/facilities.js) and where it runs until that is
//     built. Sessions run at a place with seats: 'lounge' (the Activity Lounge, F05) or 'dining' (the Dining Room, F03)
//     — place is where the residents sit.
//   minutes (the session), group: { min, max } (more than max joining: the lift is smaller — too crowded)
//   leaders: the staff roles who can lead it (a Lifestyle Coordinator by default)
//   likes: { tags (life-story tags / §7 interests, data/lifeStories.js), personalities } — what makes someone like it;
//     dislikedBy: personalities who would rather not; prefKey: a routine preference that still counts (Cards: the M2
//     'cards' preference)
//   lifts: the outcomes it lifts when a resident who likes it joins (Mood, Social Connection, Independence); drops: the
//     needs it eases (as the M2 Cards step did)
//   quiet: a calm, small-group activity (the SO08 Quiet Interest Plan prefers these)
//   prop: the activity prop drawn in the room while it runs (assets/images/props; null: it uses the room as it is)
//   schedulable: false for the ones that are not put on the timetable (the outing hook, birthdays)
const a = (id, name, fields) => ({ id, name, schedulable: true, quiet: false, prefKey: null, dislikedBy: [], ...fields });
const LOUNGE = { facility: 'F05', fallback: 'F05', place: 'lounge' };

export const ACTIVITIES = [
  a('gardening', 'Gardening', { text: 'Potting, planting and tending the garden', log: 'Gardening', where: { facility: 'F14', fallback: 'F05', place: 'lounge' }, minutes: 45, group: { min: 2, max: 6 }, leaders: ['LC', 'CW'], likes: { tags: ['Gardening'], personalities: ['Routine-Loving', 'Quiet'] }, lifts: { mood: 3, connection: 2, independence: 1 }, drops: { social: 20, mobility: 5 }, quiet: true, prop: 'activity_prop_01' }),
  a('music', 'Music', { text: 'Songs, a sing-along and old favourites', log: 'Music', where: LOUNGE, minutes: 40, group: { min: 3, max: 10 }, leaders: ['LC'], likes: { tags: ['Music', 'Dancing', 'Faith'], personalities: ['Cheerful', 'Chatty', 'Warm'] }, dislikedBy: ['Reserved'], lifts: { mood: 3, connection: 3 }, drops: { social: 25, memory: 15 }, prop: 'activity_prop_04' }),
  a('cards', 'Cards', { text: 'A game of Cards at the lounge table', log: 'Played Cards', where: LOUNGE, minutes: 45, group: { min: 2, max: 6 }, leaders: ['LC'], likes: { tags: ['Cards'], personalities: ['Chatty', 'Witty', 'Curious'] }, prefKey: 'cards', lifts: { mood: 2, connection: 3 }, drops: { social: 30, memory: 20 }, prop: 'activity_prop_02' }),
  a('painting', 'Painting', { text: 'Watercolours and crafts at the easel', log: 'Painting', where: LOUNGE, minutes: 45, group: { min: 2, max: 6 }, leaders: ['LC'], likes: { tags: ['Crafts'], personalities: ['Curious', 'Quiet', 'Reserved'] }, lifts: { mood: 3, connection: 1, independence: 1 }, drops: { social: 15, memory: 15 }, quiet: true, prop: 'activity_prop_03' }),
  a('movies', 'Movie afternoon', { text: 'An old film on the big screen', log: 'Watched a film', where: LOUNGE, minutes: 90, group: { min: 2, max: 12 }, leaders: ['LC', 'CW'], likes: { tags: ['History', 'Travel', 'Football'], personalities: ['Reserved'] }, lifts: { mood: 2, connection: 1 }, drops: { social: 15, memory: 10 }, quiet: true, prop: 'activity_prop_05' }),
  a('exercise', 'Exercise class', { text: 'Seated exercise and gentle stretches, to music', log: 'Exercise class', where: { facility: 'F07', fallback: 'F05', place: 'lounge' }, minutes: 30, group: { min: 2, max: 8 }, leaders: ['AH', 'LC'], likes: { tags: ['Football', 'Dancing'], personalities: ['Independent', 'Stubbornly Independent'] }, dislikedBy: ['Quiet'], lifts: { mood: 1, connection: 1, independence: 3 }, drops: { mobility: 15, social: 10 }, prop: 'activity_prop_04' }),
  // Milestone 17: life-story time — a small, quiet session where everyone brings their own story (photos, songs, their old
  // job). Memory-support residents love it; it is personal for each of them (src/systems/memory.js themeOf).
  a('lifeStory', 'Life-story time', { text: 'Photos, songs and memories: everyone their own story', log: 'Life-story time', where: { facility: 'F20', fallback: 'F05', place: 'lounge' }, minutes: 30, group: { min: 1, max: 4 }, leaders: ['LC', 'CW'], likes: { tags: [], personalities: ['Warm', 'Quiet'], supports: ['Memory Support'] }, dislikedBy: [], lifts: { mood: 3, connection: 2 }, drops: { social: 15 }, quiet: true, prop: 'activity_prop_06' }),
  a('reading', 'Reading group', { text: 'A book, the papers and a chat about them', log: 'Reading group', where: { facility: 'F13', fallback: 'F05', place: 'lounge' }, minutes: 45, group: { min: 2, max: 8 }, leaders: ['LC'], likes: { tags: ['Reading', 'History', 'Faith'], personalities: ['Quiet', 'Reserved', 'Curious'] }, dislikedBy: ['Chatty'], lifts: { mood: 2, connection: 2 }, drops: { social: 15, memory: 20 }, quiet: true, prop: 'activity_prop_06' }),
  a('cooking', 'Cooking club', { text: 'Baking scones together at the dining table', log: 'Cooking club', where: { facility: 'F04', fallback: 'F03', place: 'dining' }, minutes: 60, group: { min: 2, max: 6 }, leaders: ['HN', 'LC'], likes: { tags: ['Cooking'], personalities: ['Warm', 'Routine-Loving'] }, lifts: { mood: 3, connection: 2, independence: 2 }, drops: { social: 20, nutrition: 10 }, prop: null }),
  a('petTherapy', 'Pet visit', { text: 'A calm visit from a friendly dog', log: 'Pet visit', where: LOUNGE, minutes: 40, group: { min: 2, max: 8 }, leaders: ['LC', 'CW'], likes: { tags: ['Pets'], personalities: ['Warm', 'Cheerful'] }, lifts: { mood: 4, connection: 1 }, drops: { social: 20 }, prop: 'activity_prop_09' }),
  a('communityVisit', 'Community visit', { text: 'Local volunteers drop in for tea and a chat', log: 'Community visit', where: { facility: 'F09', fallback: 'F05', place: 'lounge' }, minutes: 45, group: { min: 3, max: 12 }, leaders: ['LC'], likes: { tags: ['Community', 'Faith', 'History'], personalities: ['Chatty'] }, lifts: { mood: 3, connection: 4 }, drops: { social: 30 }, prop: 'community_prop_08' }),
  // hooks, not on the timetable
  a('outing', 'Outing', { text: 'A trip out: the shops, a café or the park', log: 'Outing', where: { facility: 'F26', fallback: null, place: 'lounge' }, minutes: 120, group: { min: 2, max: 8 }, leaders: ['LC', 'CW'], likes: { tags: ['Travel', 'Fishing', 'Community'], personalities: ['Curious'] }, lifts: { mood: 5, connection: 3, independence: 2 }, drops: { social: 30 }, prop: 'activity_prop_10', schedulable: false, needs: { facility: 'F26', text: 'Needs the Transport Bay (F26)' } }),
  a('birthday', 'Birthday tea', { text: 'Cake, cards and friends for a birthday', log: 'Birthday tea', where: LOUNGE, minutes: 45, group: { min: 1, max: 16 }, leaders: ['LC', 'CW', 'HN'], likes: { tags: [], personalities: [] }, lifts: { mood: 5, connection: 4 }, drops: { social: 30 }, prop: 'activity_prop_08', schedulable: false }),
];
export const activityById = (id) => ACTIVITIES.find((x) => x.id === id) ?? null;
export const SCHEDULABLE = ACTIVITIES.filter((x) => x.schedulable);

// The weekly timetable: seven days, each with a Morning slot and an Afternoon slot (an activity id, or null = free
// time). The Afternoon slot is the M2 Cards time (its routine step keeps the id 'cards' so older saves and pins still
// work); the Morning slot runs between breakfast and the morning rest. A new home (and an M13-era save) starts with
// Cards every afternoon — the M2 session carries over — and free mornings.
export const TIMETABLE = {
  days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  slots: { morning: { at: 10, step: 'morningActivity', name: 'Morning' }, afternoon: { at: 13.5, step: 'cards', name: 'Afternoon' } },
  defaults: { morning: null, afternoon: 'cards' },
};
export const dayOfWeek = (totalDays) => ((totalDays % 7) + 7) % 7;

// Resident choice (bible §2.2): before each session a resident joins, maybe or declines, from how much they like it,
// their friends, their Mood, how tired they are and their Social care-plan option. Declining is a normal choice —
// logged, never a failure, never overridden, no penalty beyond not getting the lift.
//   base: the chance they join, by how they feel about it (the M2 Cards preference still counts: prefer / accept /
//     dislike / refuse); modifiers add to it; bands: at or above join → "joins", at or above maybe → "maybe", else
//     "declines". A "maybe" is settled when the session starts (the day's seeded roll: a reload never changes it).
export const CHOICE = {
  base: { love: 1, like: 0.85, neutral: 0.55, dislike: 0.25, refuse: 0 },
  prefBase: { prefer: 1, accept: 0.96, dislike: 0.65, refuse: 0 }, // (the M2 routine preferences, for Cards)
  perFriend: 0.1, // each friend (M13, ≥ 60) already joining
  maxFriends: 0.2,
  lowMoodBelow: 40,
  lowMood: -0.15,
  tiredNeedAbove: 70, // a high Personal / Mobility need: tired, less keen
  tired: -0.1,
  so: {
    SO08: { quiet: 0.1, busy: -0.25, busyAbove: 4 }, // Quiet Interest Plan: small, calm sessions
    SO02: { all: 0.1 }, // Small Group Activities: nudged to join
    SO01: { noNudges: true }, // Independent Choice: only their own likes count (no friend / staff nudges)
  },
  bands: { join: 0.8, maybe: 0.35 },
};

// Outcomes (bible §20): what joining gives, by how they feel about it. The activity's lifts × this; a crowded session
// (more joining than its group max) × crowded. A community event × its liftMult.
export const OUTCOME = {
  byFeeling: { love: 1.2, like: 1, neutral: 0.6, dislike: 0.3, refuse: 0 },
  crowded: 0.6,
  // Nothing they like for noLikedDays days: Mood drifts down a little each day and the card suggests something.
  noLikedDays: 7,
  noLikedMoodPerDay: -0.5,
};

// Community / visitor events (bible §20 "community visits"): a notice in the Inbox noticeDays ahead; Accept books that
// day's Afternoon slot (it needs a staff host on shift then: one of hosts) and runs like an activity with a bigger lift;
// Decline lets it go. On core/EventSystem: at most one notice open at a time (never stacked), at least gapDays apart,
// dailyChance on an allowed day — a few a month.
export const COMMUNITY_EVENTS = [
  { id: 'choir', name: 'A volunteer choir visits', text: 'The village choir would like to sing for the residents one afternoon.', activity: 'music', liftMult: 1.6, hosts: ['LC', 'CW', 'RN'] },
  { id: 'schoolLetters', name: 'Letters from the school', text: 'A class at the local school has written letters and drawings for the residents; a teacher would bring them in.', activity: 'communityVisit', liftMult: 1.5, hosts: ['LC', 'CW'] },
  { id: 'petTeam', name: 'The pet-therapy team drops in', text: 'A local pet-therapy team can bring two calm dogs for an afternoon.', activity: 'petTherapy', liftMult: 1.6, hosts: ['LC', 'CW'] },
  // Milestone 25c: partner-hosted events (series §5 sponsor events) — offered only while that community partner has a
  // deal with the home (data/partners.js), the same notice, Accept / Decline and consent rules as every community event
  // (no one is ever put in a session they refused). Held, each brings a piece of care equipment (ITEM_SOURCES.partnerEvent).
  { id: 'greenleafGarden', partner: 'SPN04', name: 'GreenLeaf garden afternoon', text: 'GreenLeaf Community would like to bring seedlings and helpers for an afternoon of planting with the residents.', activity: 'gardening', liftMult: 1.6, hosts: ['LC', 'CW', 'AH'] },
  { id: 'hearthTasting', partner: 'SPN02', name: 'Hearth Nutrition tasting', text: 'Hearth Nutrition’s chef offers an afternoon tasting of new soft and hearty dishes, with the residents choosing favourites.', activity: 'cooking', liftMult: 1.5, hosts: ['HN', 'LC'] },
  { id: 'goldenstepBalance', partner: 'SPN01', name: 'GoldenStep balance class', text: 'GoldenStep Mobility offers a gentle seated balance and movement class, with a physio to help.', activity: 'exercise', liftMult: 1.5, hosts: ['AH', 'CW'] },
];
export const COMMUNITY = { noticeDays: 3, gapDays: 8, dailyChance: 0.35 };

// Birthdays: each resident's birthday is a day of the year (1–336), from their id (the same in every run). On the day
// the Afternoon session is their Birthday tea in the lounge (a Birthday Table appears), their friends join, their most
// familiar staff on shift drop by (up to familiarVisits), and a medium beat plays; the first in a run also shows the
// First Birthday picture.
export const BIRTHDAY = { familiarVisits: 2, firstArt: 'care_event_04', daysPerYear: 336 };
