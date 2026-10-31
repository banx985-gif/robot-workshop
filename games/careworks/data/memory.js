// Memory support (Milestone 17, bible §18, §2.2, §9 SO04 / EN03 / EN04, §10 RM05, §25 F20 / F21 / F22). Plain data only;
// the rules are in src/systems/memory.js and the home world. Placeholder numbers, logged in docs/DECISIONS.md.
//
// The rule for this milestone: respectful, never a caricature, and no cure mechanic. The Memory need is support load,
// not a score to fix: nothing here lowers it beyond the ordinary care the plan already gives, and nothing suggests
// curing, reversing or testing anyone's memory. Everything below is about comfort, familiarity, choice and calm.

// Who: Memory Support as their primary support, or a profile Memory need at or over needLine.
export const MEMORY_SUPPORT = { support: 'Memory Support', needLine: 50 };

// --- a steady routine ----------------------------------------------------------------------------------------------------
// A routine change: a new face helping (familiarity under newFaceBelow), a room move, a seat change, a routine step
// missed (their own refusals and declines are their choice: never counted). At the end of a day: no changes → a steady
// day (Comfort and Mood a little up); unsettledAt or more → Comfort and Mood a little down (per change over the line,
// capped). Their status over the last `days` days: 'unsettled' when the average is at least unsettledAvg.
export const ROUTINE_CHANGE = {
  newFaceBelow: 10,
  steady: { comfort: 1, mood: 0.5 },
  unsettledAt: 2,
  perChange: { comfort: -1, mood: -0.5 },
  maxChanges: 4,
  days: 5,
  unsettledAvg: 1.5,
};
// Continuity (M13) counts this many times more for them in the task AI, and M13 reseating (moving next to a friend) is
// skipped for them (fewer changes).
export const CONTINUITY_MULT = 2;

// --- familiarity ----------------------------------------------------------------------------------------------------------
// A familiar face (M13 Familiar Care) calms them more than others: × on the Mood lift and a stronger cooperation.
export const FAMILIAR_MEMORY = { moodMult: 2, cooperationMult: 1.3, comfortAt: 60, comfort: 0.5 };

// --- life-story sessions ----------------------------------------------------------------------------------------------------
// A one-to-one session (the Lifestyle Coordinator, or a Care Worker who knows them: familiarity careWorkerFrom+) on a theme
// from their own life-story tags. Offered automatically on an unsettled day (at offerAt), and as a small-group
// "Life-story time" on the activity timetable (data/activities.js). lifts: outcomes; drops: needs (Social only — never
// Memory: no cure mechanic); familiarBonus: × when the helper's familiarity is familiarAt+.
export const LIFE_STORY = {
  name: 'Life-story session',
  offerAt: 14.75,
  minutes: 25,
  roles: ['LC', 'CW'],
  careWorkerFrom: 40,
  lifts: { mood: 3, comfort: 2 },
  drops: { social: 12 },
  familiarityBonus: 1, // extra Familiar Care on top of the task's own
  familiarAt: 60,
  familiarBonus: 1.5,
  roomMult: 1.15, // the Memory Activity Room (F20: memory-care activities +15%)
};
// A theme from their tags (the first tag with one), else from their life-story line (their old job, their home).
export const THEMES = {
  Music: 'favourite songs from when they were young',
  Dancing: 'the dance halls and the music they loved',
  Gardening: 'photos of their garden and what they grew',
  Cooking: 'family recipes and the kitchen at home',
  Football: 'old match programmes and the team they followed',
  Fishing: 'stories of the river and the ones that got away',
  Travel: 'postcards and the places they saw',
  History: 'old photographs of the town',
  Reading: 'a favourite book and the stories in it',
  Community: 'the people and places of their old street',
  Faith: 'hymns and the church they went to',
  Crafts: 'things they made, and a little sewing to hand',
  Cards: 'a game of cards like the old days',
  Pets: 'the pets they had and photos of them',
};
export const THEME_FROM_STORY = 'their life story and the work they did';

// --- the Choice signal (stored for SEC-RES-08, which is Milestone 29 / 30: not built) -------------------------------------
// 0–100: starts at 100, less for each option on their care plan they dislike or refuse (their refusals are always
// honoured anyway). honoured counts refusals and declines respected; min is the lowest it has been since they came.
export const CHOICE = { start: 100, disliked: -10, refused: -20 };

// --- stimulation -----------------------------------------------------------------------------------------------------------
// How busy each place is: 'high' | 'medium' | 'low' | 'veryLow' | 'calm'. A memory-support resident in a high place for
// more than highAfter hours in a row loses highComfort Comfort an hour; a low / very low / calm place gives lowComfort an
// hour (× the room's own bonus). The busy Dining Room is high when more diners than its seats, else medium.
export const STIMULATION = {
  places: { dining: 'medium', diningCrowded: 'high', lounge: 'medium', room: 'low', therapy: 'medium', calm: 'low', walking: 'medium' },
  facilities: { F03: 'medium', F05: 'medium', F06: 'low', F21: 'veryLow', F22: 'calm', F20: 'low' },
  highAfter: 1,
  highComfort: -0.6,
  lowComfort: { low: 0.15, veryLow: 0.4, calm: 0.3 },
  roomBonus: { RM05: 1.5 }, // their own Memory Support Room (RM05): × the low-stimulation lift in their room
  plan: { EN03: 1.5, EN04: 1.25 }, // Low-Stimulation Room / Memory-Safe Environment: × the low-stimulation lift in their room
};
// The morning rest for a memory-support resident is held somewhere calm when there is one: the Sensory Room, the Memory
// Garden, the Quiet Lounge (they sit beside it), else their room.
export const CALM_PLACES = ['F21', 'F22', 'F06'];

// --- walking ---------------------------------------------------------------------------------------------------------------
// Memory-support residents sometimes go for a walk on their own (never locked in, never restrained, never punished):
// chance an hour while at rest in the daytime (fromHour–toHour), × unsettledMult when unsettled. With a safe walking path
// (a loop marked in Build Mode) they walk it calmly and come back with pathComfort. Without one they walk the corridor
// and a member of staff gently walks back with them (a short redirect task); if nobody comes they come back on their own
// after returnAfter hours. Path: minTiles–maxTiles open floor tiles, each next to the one before, the last next to the first.
export const WALKING = {
  chancePerHour: 0.08,
  unsettledMult: 2,
  fromHour: 9,
  toHour: 19.5,
  pathComfort: 2,
  pathMood: 1,
  returnAfter: 1.5,
  redirect: { name: 'Walk back together', roles: ['CW', 'LC', 'RN', 'HN', 'AH'], minutes: 5 },
  path: { minTiles: 8, maxTiles: 120 },
};

// --- family (stored only; Milestone 19 builds family) ---------------------------------------------------------------------
export const FAMILY_CONNECTION = { 'Frequent family': 70, 'Occasional family': 45, 'Community visitor': 25, None: 10 };

// Words the game never uses about a resident's memory (the test scans every string for them).
export const NEVER_SAY = /\b(cure[sd]?|curing|reverse[sd]?|reversing|recover(y|ed|s)? (their|his|her) memory|improve[sd]? (their|his|her) memory|memory (test|score|game|puzzle)|brain training|cognitive (test|score))\b/i;
