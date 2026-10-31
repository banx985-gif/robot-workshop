// Relationships (Milestone 13, bible §6, §14, §20): Familiar Care effects, resident–resident friendships, activity
// groups and favourite staff. Pure rules on plain state (data/relationships.js numbers), so the Node tests use them as
// they are; the home world calls them when people are together.
//
// Friendships live in the run's care state: care.friendships = { 'RES01|RES02': { a, b, friendship 0–100, meals,
// activities, firstDay, lastDay } } (the two ids in sorted order).
//   compatibility(defA, tagsA, defB, tagsB) → × on friendship gains (shared life-story tags, personality match)
//   addFriendship(care, a, b, amount, { day, kind }) → the new value      friendshipOf(care, a, b)
//   topFriends(care, id, among, n) → [{ other, friendship, … }]          areFriends(care, a, b)
//   groupMembers(group, residents) → [ids]   residents = [{ id, state }]: prefer the activity, or joined it regularAfter+
//   favouriteOf(care, residentId, staffIds) → staffId | null             (familiarity ≥ FAVOURITE.at)
//   familiarEffects(familiarity) → { mood, dislikeMult, speedUp }        what a helper this familiar brings
import { FRIENDSHIP, PERSONALITY_MATCH, FAVOURITE, FAMILIAR_EFFECTS } from '../../data/relationships.js';
import { topFamiliar } from './careTasks.js';

export const friendKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
export const ensureFriendships = (saved) => Object.fromEntries(Object.entries(saved ?? {}).map(([k, r]) => [k, { ...r }]));

export function personalityMatch(pa, pb) {
  const row = PERSONALITY_MATCH.find((m) => (m.a === pa && m.b === pb) || (m.a === pb && m.b === pa));
  return row ? row.x : 1;
}
export const sharedTags = (tagsA, tagsB) => (tagsA ?? []).filter((t) => (tagsB ?? []).includes(t)).length;
export function compatibility(defA, tagsA, defB, tagsB) {
  return (1 + FRIENDSHIP.perSharedTag * sharedTags(tagsA, tagsB)) * personalityMatch(defA?.personality, defB?.personality);
}

export const friendshipOf = (care, a, b) => care.friendships?.[friendKey(a, b)]?.friendship ?? 0;
export const areFriends = (care, a, b) => friendshipOf(care, a, b) >= FRIENDSHIP.friendAt;
export function addFriendship(care, a, b, amount, { day = null, kind = null } = {}) {
  care.friendships ??= {};
  const k = friendKey(a, b);
  const [x, y] = a < b ? [a, b] : [b, a];
  const r = (care.friendships[k] ??= { a: x, b: y, friendship: 0, meals: 0, activities: 0, firstDay: day, lastDay: day });
  r.friendship = Math.min(FRIENDSHIP.cap, Math.round((r.friendship + amount) * 100) / 100);
  if (kind === 'meal') r.meals++;
  if (kind === 'activity') r.activities++;
  if (day != null) {
    r.firstDay ??= day;
    r.lastDay = day;
  }
  return r.friendship;
}
// Their friendships, best first, among these ids (none: all), with the other person's id as `other`.
export function topFriends(care, id, among = null, n = 3) {
  const keep = among && new Set(among);
  return Object.values(care.friendships ?? {})
    .filter((r) => (r.a === id || r.b === id) && r.friendship > 0)
    .map((r) => ({ ...r, other: r.a === id ? r.b : r.a }))
    .filter((r) => !keep || keep.has(r.other))
    .sort((p, q) => q.friendship - p.friendship || p.other.localeCompare(q.other))
    .slice(0, n);
}

// An activity group's members among these residents.
export function groupMembers(group, residents) {
  return residents.filter((p) => p.state.prefs?.[group.stepId] === 'prefer' || (p.state.activityCounts?.[group.stepId] ?? 0) >= group.regularAfter).map((p) => p.id);
}

// The resident's favourite: their most familiar staff member, once at least FAVOURITE.at.
export function favouriteOf(care, residentId, staffIds) {
  const top = topFamiliar(care, { residentId }, staffIds, 1)[0];
  return top && top.familiarity >= FAVOURITE.at ? top.staff : null;
}

// What a helper with this much familiarity brings to one task (bible §6).
export function familiarEffects(familiarity) {
  const F = FAMILIAR_EFFECTS;
  return {
    mood: familiarity >= F.moodAt ? F.moodLift : 0,
    dislikeMult: 1 - F.cooperationCut * Math.max(0, Math.min(1, (familiarity - F.cooperationFrom) / (F.cooperationFull - F.cooperationFrom))),
    speedUp: familiarity >= F.efficiencyAt ? F.workSpeedUp : 0,
  };
}
