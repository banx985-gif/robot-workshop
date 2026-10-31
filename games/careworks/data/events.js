// The event director (Milestone 28, bible §33, §2 calm / readable / never punishing). Plain data only; the rules are in
// src/systems/events.js. Every moment the home raises goes through one place: it gets a CATEGORY (the 14 of §33) and a
// WEIGHT, a line in the Inbox when it should have one, and — when the cadence caps allow and nothing else is showing — a
// beat on the screen. The director never changes what happens in the home: it only decides how and when it is shown.
//
// Weights:
//   blocking   needs a choice (an event response, a family request, a partner offer…): one at a time, the rest wait in
//              order; each waiting choice is in the Inbox at once and can be answered there; one that times out takes
//              its own kind default (never the worst option)
//   big        a big beat with a picture (a first birthday, a stage, a rank)        — at most one a game day
//   medium     a medium beat (a line in the beat strip)                              — spaced by a few game hours
//   quiet      a quiet line, only when nothing else is showing                       — may show over an open sheet
//   inbox      an Inbox line only
//   none       nothing to show (still counted for the long-run report)
import { SEVERITY } from './incidents.js';
import { LEVELS } from './facilities.js';
import { SPECIALTIES } from './training.js';
import { RANK_BEAT, QUALITY_ART } from './quality.js';
import { accreditationById } from './accreditations.js';
import { STAGES, LOGICAL_CAP } from './home.js';
import { wingById } from './wings.js';
import { residentById } from './residents.js';
import { stageById } from './endOfLife.js';
import { FIRST_ART, FIRSTS_TEXT, REWARD_ART, PRESTIGE_RANKS } from './artMoments.js';

// --- the 14 categories (§33) --------------------------------------------------------------------------------------------------
export const CATEGORIES = [
  { id: 'birthday', name: 'Birthdays', icon: 'care_ui_18' },
  { id: 'lifeStory', name: 'Life stories', icon: 'care_ui_25' },
  { id: 'friendship', name: 'Friendships', icon: 'care_ui_24' },
  { id: 'visit', name: 'Family', icon: 'care_ui_10' },
  { id: 'community', name: 'Community', icon: 'care_ui_14' },
  { id: 'staff', name: 'Staff milestones', icon: 'care_ui_02' },
  { id: 'feedback', name: 'Compliments and complaints', icon: 'care_ui_04' },
  { id: 'review', name: 'Care-plan reviews', icon: 'care_ui_01' },
  { id: 'rehab', name: 'Rehabilitation', icon: 'care_ui_13' }, // (Milestone 28b: the Rehabilitation icon — was Admissions)
  { id: 'facility', name: 'The home', icon: 'care_ui_03' },
  { id: 'emergency', name: 'Health and safety', icon: 'care_ui_27' },
  { id: 'recognition', name: 'Recognition', icon: 'care_ui_28' },
  { id: 'partner', name: 'Partners and grants', icon: 'care_ui_14' },
  { id: 'memorial', name: 'In memory', icon: 'care_ui_26' }, // (Milestone 28b: Palliative Comfort — was the Memory Book icon)
];
export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);
export const categoryById = (id) => CATEGORIES.find((c) => c.id === id) ?? null;
export const WEIGHTS = ['blocking', 'big', 'medium', 'quiet', 'inbox', 'none'];

// --- cadence caps (game time: the same at 1×, 2× and 4×) -------------------------------------------------------------------
export const CAPS = {
  bigPerDay: 1, // at most one big beat a game day
  mediumGapHours: 3, // medium beats at least this many game hours apart
  quietGapHours: 1, // quiet lines at least this far apart (and only when nothing else is showing)
  // how long a beat may wait for its turn (game hours) before it is quietly dropped (its Inbox line stays); big beats wait
  // for a later day instead of being dropped
  wait: { medium: 12, quiet: 4 },
  releaseHours: 24, // a choice the player has seen (Open / Later) and left in the Inbox lets the next one come after this long
  queueMax: 16, // beats waiting at most; past it the oldest quiet one goes first (never a blocking choice)
  // per-category limits on Inbox lines and beats (days between two); a moment past its limit still happens in the home
  perCategory: { friendship: 7, lifeStory: 3, review: 1, staff: 1 },
  // how long each beat stays on screen (real seconds; the screen also closes it with a tap)
  showSec: { big: 4.5, medium: 3.2, quiet: 2.6 },
  // a waiting choice: the more urgent goes first (higher first), then the order they came in
  priority: { emergency: 3, memorial: 2, default: 1 },
};
// The Inbox log: newest first, grouped by category; at most `keep` lines are kept (the oldest read line quietly goes —
// never an unanswered choice, which lives in its own system until answered); `shown` per category on the sheet.
export const INBOX = { keep: 120, shown: 6 };

// --- every existing moment (bus event → category, weight, words) --------------------------------------------------------------
// Words are what the home already said before Milestone 28 (moved here, not changed). x = the event's payload; the
// result: { weight, title?, text, art?, good, line? (the Inbox line, else text), opens? { type, id } } or null (no moment).
const first = (n) => String(n ?? '').split(' ')[0].replace(/,$/, ''); // (Milestone 30b: "Bolt, God of Tinkering" → Bolt)
const their = (id) => (residentById(id)?.pronoun === 'she' ? 'her' : 'his');
const res = (id) => (id ? { type: 'resident', id } : null);
// Milestone 28b: big beats may carry badge (a second picture in the corner: the Rehab Success Badge, the National
// Excellence Trophy) and aura (the Prestige Aura behind the picture: Rank S / S+, the C10 award); two firsts with their
// own pictures — the opening day (home:opened) and the first resident welcomed from the Admissions board (care:admit first).
export const KINDS = {
  'home:opened': { cat: 'facility', inbox: true, make: () => ({ weight: 'big', title: FIRSTS_TEXT.opening.title, text: FIRSTS_TEXT.opening.text('The home'), line: 'Opening day: the home opens its doors', art: FIRST_ART.opening, good: true, opens: { type: 'develop' } }) },
  'care:admit': { cat: 'facility', inbox: true, make: (x) => (x.first ? { weight: 'big', title: FIRSTS_TEXT.welcome.title, text: FIRSTS_TEXT.welcome.text(x.name), line: `Welcome, ${x.name}`, art: FIRST_ART.welcome, good: true, opens: res(x.resident) } : { weight: 'medium', text: `Welcome, ${x.name}`, good: true, opens: res(x.resident) }) },
  'care:leaving': { cat: 'facility', inbox: true, make: (x) => (x.discharge ? null : { weight: 'medium', text: `${first(x.name)} heads home`, good: true }) },
  'care:movedOut': { cat: 'facility', inbox: true, make: (x) => ({ weight: 'inbox', text: `${first(x.name)}'s family has moved them to another home`, good: false }) },
  'staff:hired': { cat: 'staff', inbox: true, make: (x) => ({ weight: 'medium', text: `Welcome to the team, ${first(x.name)}`, good: true, opens: x.id ? { type: 'staff', id: x.id } : null }) },
  'staff:trained': { cat: 'staff', inbox: true, make: (x) => ({ weight: 'medium', text: `${first(x.name)} finished ${x.course}${x.specialty ? ` · ${SPECIALTIES[x.specialty]?.name ?? ''}` : ''}`, good: true, opens: x.id ? { type: 'staff', id: x.id } : null }) },
  'care:birthday': { cat: 'birthday', inbox: true, make: (x) => {
    const who = (x.names ?? []).map(first).join(' and ');
    return x.first && x.art ? { weight: 'big', title: 'A first birthday', text: `${who}'s birthday tea in the lounge`, line: `Happy birthday, ${who}!`, art: x.art, good: true, opens: res(x.residents?.[0]) } : { weight: 'medium', text: `Happy birthday, ${who}!`, good: true, opens: res(x.residents?.[0]) };
  } },
  'care:alert': { cat: 'emergency', inbox: false, make: (x) => (x.name ? { weight: 'medium', text: `${first(x.name)} seems ${x.word}: choose what to do (Inbox)`, good: false, opens: res(x.resident) } : null) },
  'care:transfer': { cat: 'emergency', inbox: true, make: (x) => ({ weight: 'medium', text: `${first(x.name)} goes to the hospital service for a few days`, good: false, opens: res(x.resident) }) },
  'care:back': { cat: 'emergency', inbox: true, make: (x) => ({ weight: 'medium', text: `${first(x.name)} is back from the hospital service`, good: true, opens: res(x.resident) }) },
  'care:ready': { cat: 'rehab', inbox: false, make: (x) => ({ weight: 'medium', text: `${first(x.name)} is ready to go home`, good: true, opens: res(x.resident) }) },
  'care:discharge': { cat: 'rehab', inbox: true, make: (x) => (x.first && x.art ? { weight: 'big', title: 'A first rehab discharge', text: `${first(x.name)} is back on ${their(x.resident)} feet and home with family`, line: `${first(x.name)} goes home with family: rehab complete`, art: x.art, badge: REWARD_ART.rehab, good: true } : { weight: 'medium', text: `${first(x.name)} goes home with family: rehab complete`, good: true }) },
  'care:visit': { cat: 'visit', inbox: false, make: (x) => (x.first && x.art ? { weight: 'big', title: 'A first family visit', text: `${x.visitor} comes to see ${first(x.name)}`, art: x.art, good: true, opens: res(x.resident), inboxAnyway: true } : { weight: 'quiet', text: `${x.visitor} is visiting ${first(x.name)}`, good: false, opens: res(x.resident) }) },
  'care:compliment': { cat: 'feedback', inbox: true, make: (x) => (x.first && x.art ? { weight: 'big', title: 'A first compliment', text: `${first(x.name)}'s family says thank you`, line: `A compliment from ${first(x.name)}'s family`, art: x.art, good: true, opens: { type: 'complaints' } } : { weight: 'medium', text: `A compliment from ${first(x.name)}'s family`, good: true, opens: { type: 'complaints' } }) },
  'care:complaint': { cat: 'feedback', inbox: true, make: (x) => ({ weight: 'medium', text: `A complaint from ${first(x.name)}'s family: an improvement task (Quality)`, good: false, opens: { type: 'complaints' } }) },
  'care:meeting': { cat: 'visit', inbox: true, make: (x) => ({ weight: 'medium', text: x.first ? `A first family review: ${first(x.name)}'s plan` : `Family meeting for ${first(x.name)}: Family Trust ${x.change > 0 ? '+' : x.change < 0 ? '−' : ''}${Math.abs(Math.round((x.change ?? 0) * 10) / 10)}`, good: true, opens: res(x.resident) }) },
  'home:stage': { cat: 'facility', inbox: true, make: (x) => {
    const st = STAGES[x.stage - 1];
    const wings = (st?.wings ?? []).map((id) => wingById(id).short);
    return { weight: 'big', title: x.name, text: `Stage ${x.stage}: more floor and room for ${Math.min(st?.capacity ?? 0, LOGICAL_CAP)} residents${wings.length ? ` · the ${wings.join(' and ')} wings can be painted` : ''}`, art: x.art ?? 'care_event_06', good: true, opens: { type: 'develop' } };
  } },
  'home:building': { cat: 'facility', inbox: false, make: (x) => ({ weight: 'medium', text: `Building Stage ${x.stage}: ${x.name} — the home carries on as usual`, good: true }) },
  'home:wing': { cat: 'facility', inbox: true, make: (x) => ({ weight: 'big', title: `The ${x.name} opens`, text: x.later ? `${x.hub} placed · ${x.later}` : `${x.hub} placed: the wing is ready for its residents and staff`, art: x.art, good: true, opens: { type: 'wings' } }) },
  'care:incident': { cat: 'emergency', inbox: true, make: (x) => ({ weight: 'blocking', title: x.name, text: `${x.name} (${SEVERITY.names[x.band]?.toLowerCase() ?? ''}): choose a response`, line: `${x.name} (${SEVERITY.names[x.band]?.toLowerCase() ?? ''}) began`, good: false, opens: { type: 'inbox' }, choice: { kind: 'incident', id: x.id } }) },
  'care:incidentEnd': { cat: 'emergency', inbox: true, make: (x) => ({ weight: 'quiet', text: `${x.name}: over — the after-report is in the Inbox`, good: true, opens: { type: 'inbox' } }) },
  'care:fall': { cat: 'emergency', inbox: false, make: (x) => ({ weight: 'medium', text: `${first(x.name)} had a fall: help is on the way`, good: false, opens: res(x.resident) }) },
  'home:upgrading': { cat: 'facility', inbox: false, make: (x) => ({ weight: 'medium', text: `${x.name}: upgrading to Level ${LEVELS.names[x.level - 1]} — it carries on as usual`, good: true }) },
  'home:levelUp': { cat: 'facility', inbox: true, make: (x) => ({ weight: 'medium', text: `${x.name} is now Level ${LEVELS.names[x.level - 1]}`, good: true, haptic: true }) },
  'items:arrived': { cat: 'facility', inbox: true, make: (x) => ({ weight: 'quiet', text: x.item ? 'New care equipment in the store (Inbox)' : 'The equipment store is full (Inbox)', line: x.text ?? (x.item ? 'New care equipment in the store' : 'The equipment store is full'), good: !!x.item, opens: { type: 'itemStore' } }) },
  'care:notice': { cat: 'community', inbox: true, make: (x) => ({ weight: 'blocking', title: 'A community notice', text: 'A notice in the Inbox: accept or decline', line: 'A community notice: accept or decline', good: true, opens: { type: 'inbox' }, choice: { kind: 'notice', id: x.uid } }) },
  'care:familyRequest': { cat: 'visit', inbox: true, make: (x) => ({ weight: 'blocking', title: 'A family request', text: `${first(residentById(x.resident)?.name)}'s family has a request (Inbox)`, line: `${first(residentById(x.resident)?.name)}'s family has a request`, good: true, opens: { type: 'inbox' }, choice: { kind: 'request', id: x.id } }) },
  'care:familyAsk': { cat: 'visit', inbox: true, make: (x) => ({ weight: 'blocking', title: 'A family asks to meet', text: `${first(residentById(x.resident)?.name)}'s family would like a care-plan meeting (Inbox)`, line: `${first(residentById(x.resident)?.name)}'s family would like a care-plan meeting`, good: true, opens: { type: 'inbox' }, choice: { kind: 'ask', id: x.id } }) },
  'partners:offered': { cat: 'partner', inbox: true, make: (x) => ({ weight: 'blocking', title: 'A partnership offer', text: `${x.name} has made an offer (Inbox)`, line: `${x.name} has made a partnership offer`, good: true, opens: { type: 'partners' }, choice: { kind: 'partner', id: x.id } }) },
  'partners:signed': { cat: 'partner', inbox: true, make: (x) => ({ weight: 'quiet', text: `Partnership signed: ${x.name ?? x.id}`, good: true, opens: { type: 'partners' } }) },
  'partners:ended': { cat: 'partner', inbox: true, make: (x) => ({ weight: 'inbox', text: `A partnership has ended: ${x.name ?? x.id}`, good: true, opens: { type: 'partners' } }) },
  'partners:grant': { cat: 'partner', inbox: true, make: (x) => ({ weight: x.status === 'done' ? 'medium' : 'inbox', text: x.status === 'done' ? `Grant met: ${x.name}` : x.status === 'accepted' ? `Grant taken on: ${x.name}` : `Grant closed: ${x.name}`, good: x.status !== 'expired', opens: { type: 'grants' } }) },
  'economy:offer': { cat: 'facility', inbox: true, make: (x) => ({ weight: 'blocking', title: 'A funding offer', text: 'Money is tight: an offer is waiting (Inbox)', line: 'Money is tight: a funding offer is waiting', good: false, opens: { type: 'inbox' }, choice: { kind: 'economy', id: x.kind } }) },
  'quality:rankUp': { cat: 'recognition', inbox: true, make: (x) => ({ weight: 'big', title: `Rank ${x.rank}`, text: `Opens ${RANK_BEAT[x.rank]}`, art: QUALITY_ART.rankUp, aura: PRESTIGE_RANKS.includes(x.rank), good: true, opens: { type: 'quality' } }) },
  'quality:award': { cat: 'recognition', inbox: true, make: (x) => {
    const rw = accreditationById(x.id)?.reward ?? { reputation: 0, credits: 0 };
    // (Milestone 31: a prestige award — C11 / C12 — says its own reward, with the prestige glow)
    return { weight: 'big', title: x.name, ...(rw.beat ? { line: `${x.name} · ${rw.beat}` } : {}), text: rw.beat ?? `Awarded · Reputation +${rw.reputation} · ${rw.credits.toLocaleString('en-GB')} Credits`, art: x.finale ? QUALITY_ART.finale : x.art, ...(x.finale ? { badge: REWARD_ART.trophy, aura: true } : x.prestige ? { badge: REWARD_ART.prestige, aura: true } : {}), good: true, opens: { type: 'quality' } };
  } },
  'quality:inspection': { cat: 'recognition', inbox: true, make: (x) => (x.kind === 'routine' ? { weight: 'medium', text: `The routine review: grade ${x.grade} (Inbox)`, good: x.grade !== 'D', opens: { type: 'quality' } } : x.pass ? { weight: 'inbox', text: `${accreditationById(x.id)?.name}: awarded`, good: true, opens: { type: 'quality' } } : { weight: 'medium', text: `${accreditationById(x.id)?.name}: the inspection fell short — see what to work on (Inbox)`, good: false, opens: { type: 'quality' } }) },
  'quality:peer': { cat: 'recognition', inbox: true, make: (x) => ({ weight: 'quiet', text: x.prestige ? `${x.name} invites your home into its circle: a prestige benchmark, always a step ahead (Quality → Benchmark)` : `${x.name} joins the benchmark network (Quality → Benchmark)`, good: true, opens: { type: 'quality' } }) }, // (Milestone 31: R08)
  'care:stage': { cat: 'memorial', inbox: true, make: (x) => (x.stage === 'approaching' && x.offer ? { weight: 'blocking', title: `${first(x.name)}: comfort care offered`, text: `${first(x.name)} is approaching the end of life: comfort care is offered, never forced`, line: x.line, good: true, opens: { type: 'inbox' }, choice: { kind: 'comfort', id: x.resident } } : { weight: 'quiet', text: `${first(x.name)}: ${stageById(x.stage).name.toLowerCase()}`, line: x.line, good: true, opens: res(x.resident) }) },
  // Milestone 29: secrets — a quiet Inbox line when a clue stage is reached (only the clue, never the condition), a big beat
  // when one is found (its name and reward)
  'care:blessing': { cat: 'staff', inbox: true, make: (x) => ({ weight: 'quiet', text: x.text, good: true }) }, // (Milestone 30b: a Works God's lucky day, joy boost or harmless mishap)
  'secret:clue': { cat: 'recognition', inbox: true, make: (x) => ({ weight: 'inbox', text: `A rumour: ${x.text}`, good: true, opens: { type: 'secrets' } }) },
  'secret:found': { cat: 'recognition', inbox: true, make: (x) => ({ weight: 'big', title: `Secret found: ${x.name}`, text: x.reward, line: `Secret found: ${x.name} · ${x.reward}`, art: REWARD_ART.prestige, aura: true, good: true, opens: { type: 'secrets' } }) },
  'secret:pantheon': { cat: 'recognition', inbox: true, make: (x) => ({ weight: 'big', title: x.name, text: x.text, line: `${x.name}: all five Works Gods have worked here`, art: REWARD_ART.prestige, aura: true, good: true, opens: { type: 'secrets' } }) }, // (Milestone 30b)
  // Milestone 32: an achievement is a quiet Inbox line; the big beat only for Rank S, C10 and Year-16 Legacy (the first time on
  // the account). A Hall of Fame entry or candidate, a Memory Book keepsake: quiet lines.
  'care:achievement': { cat: 'recognition', inbox: true, make: (x) => (x.beat === 'big' ? { weight: 'big', title: `Achievement: ${x.name}`, text: x.reward || 'Kept in every home', line: `Achievement: ${x.name}${x.reward ? ` · ${x.reward}` : ''}`, art: REWARD_ART.trophy, aura: true, good: true, opens: { type: 'achievements' } } : { weight: 'inbox', text: `Achievement${x.first ? '' : ' (this home)'}: ${x.name}${x.reward ? ` · ${x.reward}` : ''}`, good: true, opens: { type: 'achievements' } }) },
  'care:hallOfFame': { cat: 'staff', inbox: true, make: (x) => ({ weight: x.candidate ? 'inbox' : 'quiet', text: x.candidate ? `${first(x.name)} can join the Staff Hall of Fame (Records)` : `${first(x.name)} joins the Staff Hall of Fame · ${x.why}`, good: true, opens: { type: 'hallOfFame' } }) },
  'care:keepsake': { cat: 'memorial', inbox: true, make: (x) => ({ weight: 'quiet', text: x.line, line: `${x.line} · a keepsake: the ${x.name}`, good: true, opens: { type: 'memoryBook' } }) },
  'care:passed': { cat: 'memorial', inbox: true, make: (x) => ({ weight: 'blocking', title: x.name, text: x.card, line: x.line ?? x.card, good: true, opens: { type: 'memoryBook' }, choice: { kind: 'memorial', id: x.page?.id ?? x.resident } }) },
};

// --- the categories not built before Milestone 28: small seeded data events (no new systems) ----------------------------------
// Each midnight the director rolls its own saved stream once per kind; nothing here changes the home (a Memory Book story
// moment at most).
export const NEW_EVENTS = {
  // a staff member who knows a resident well learns something from their life story (§7)
  lifeStory: { dailyChance: 0.25, familiarAt: 40, weight: 'inbox',
    text: (x) => (x.tag ? `${x.staff} and ${x.name} talked about ${x.tag.toLowerCase()}, a big part of ${x.name}'s life` : `${x.staff} learned something new about ${x.name}: “${x.story}”`),
    moment: (x) => (x.tag ? `Talked with ${x.staff} about ${x.tag.toLowerCase()}` : `Shared a story with ${x.staff}`) },
  // two residents become friends (the M13 friendships) — a quiet line and a story moment for both
  friendship: { weight: 'quiet', text: (x) => `${x.a} and ${x.b} have become friends`, moment: (x) => `Became friends with ${x.other}` },
  // staff milestones: a work anniversary, a first year with no essential care missed (finishing a course is staff:trained)
  anniversary: { weight: 'medium', text: (x) => `${x.name}: ${x.years} year${x.years === 1 ? '' : 's'} with the team today` },
  cleanYear: { weight: 'medium', days: 336, text: () => 'A first year with no essential care missed: thank you, team' },
  // care-plan reviews due: one Inbox line a day for all of them
  review: { weight: 'inbox', text: (x) => `${x.n} care plan${x.n === 1 ? ' is' : 's are'} due for review: ${x.names.join(', ')}${x.more ? ` and ${x.more} more` : ''}`, namesShown: 3 },
};

// The new-category words, for the banned-word check.
export function eventStrings() {
  const out = CATEGORIES.map((c) => c.name);
  const N = NEW_EVENTS;
  out.push(N.lifeStory.text({ staff: 'Maya', name: 'Gloria', story: 'Read to the children at the library.' }), N.lifeStory.text({ staff: 'Maya', name: 'Gloria', tag: 'Gardening' }), N.lifeStory.moment({ staff: 'Maya', tag: 'Gardening' }), N.lifeStory.moment({ staff: 'Maya' }));
  out.push(N.friendship.text({ a: 'Betty', b: 'Colin' }), N.friendship.moment({ other: 'Colin' }), N.anniversary.text({ name: 'Maya', years: 2 }), N.cleanYear.text(), N.review.text({ n: 4, names: ['Betty', 'Colin', 'June'], more: 1 }));
  return out;
}

export function validateEvents(v) {
  v.check(CATEGORIES.length === 14 && new Set(CATEGORY_IDS).size === 14, 'events: the 14 categories of §33');
  for (const [k, d] of Object.entries(KINDS)) v.check(CATEGORY_IDS.includes(d.cat) && typeof d.make === 'function', `events: ${k} needs a category and words`);
  for (const c of Object.keys(CAPS.perCategory)) v.check(CATEGORY_IDS.includes(c), `events: cap for unknown category ${c}`);
  return v;
}
