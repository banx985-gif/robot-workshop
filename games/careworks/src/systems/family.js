// Family trust (Milestone 19, bible §21): each resident's family record (a fictional contact from their §7 Visitors
// column, the visit pattern, Family Trust 0–100 and every change with its reason), what a visit notices, the home's
// Family Trust, complaints (improvement tasks with an evidence trail) and compliments. Pure rules on plain state, so the
// Node tests use them as they are; the home world walks the visitors, runs the meetings and raises the complaints.
//
// A family record (care.families[residentId]; Milestone 16 made the first ones, { trust, history }):
//   { trust, history: [{ day, t, change, reason, kind }], contact: { name, relation, gender }, pattern, nextVisit,
//     lastVisit, visits, meeting: null | { day, kind, review, tries, asked }, notes: [{ day, text }], untold: null |
//     { option, day }, seen: [{ day, kind, detail, band }], lastCompliment, lastComplaint, asked: { meeting, request } }
// The home's family state (care.family):
//   { complaints: [complaint], compliments: [compliment], requests: [request], asks: [ask], visits: [visit], nextId,
//     meetings (held), reviews (with family), firsts: { visit, compliment, review }, seenComplaints: [ids] }
// A complaint: { id, resident, kind, text, fix, fixText, owner, raised, due, status: 'open' | 'resolved', drop,
//   drifted, improved (day | null), resolved (day | null), recovered, trail: [{ day, t, text }] }
//
//   contactFor(residentId, visitors) · newFamily(def, day, seed) · ensureFamily(rec, def, day, seed)
//   changeTrust(rec, amount, { day, t, reason, kind, partnership, parts }) → the change applied
//   visitParts(ctx) → [{ key, text, value }] · visitTotal(parts, { communicatorPct }) · visitWords(parts, call)
//   homeTrust(records, ids) → average | null · callOf(contact, def) · theirWord(def)
import { Rng } from '../../../../core/Rng.js';
import { TRUST, PATTERNS, NAMES, RELATION_GENDER, CALLS, NOTICE, SO_VISITS, REQUESTS } from '../../data/family.js';

const clamp = (x) => Math.max(TRUST.min, Math.min(TRUST.max, x));
const r1 = (x) => Math.round(x * 10) / 10;
const firstName = (name) => name.split(' ')[0];

// The family contact: fixed per resident (their id, not the run's seed), so the same resident always has the same family.
export function contactFor(residentId, visitors) {
  const pat = PATTERNS[visitors] ?? PATTERNS.None;
  if (!pat.relations.length) return null;
  const rng = new Rng(`family:${residentId}`);
  const relation = pat.relations[rng.int(0, pat.relations.length - 1)];
  const gender = RELATION_GENDER[relation] ?? (rng.next() < 0.5 ? 'f' : 'm');
  const names = NAMES[gender];
  return { name: names[rng.int(0, names.length - 1)], relation, gender };
}
// "Dad" / "Mum" / "Gran" for a child or grandchild; everyone else says the resident's first name.
export function callOf(contact, def) {
  const c = contact && CALLS[contact.relation];
  return c ? c[def?.pronoun === 'she' ? 1 : 0] : firstName(def?.name ?? '');
}
export const theirWord = (def) => (def?.pronoun === 'she' ? 'her' : 'his');
// "Daughter Jenny" / "Friend Alan"
export const whoOf = (contact) => (contact ? `${contact.relation} ${contact.name}` : 'Their family');

// The next visit day after `from`: the pattern's gap (× SO07's when they have it) give or take the jitter, seeded per
// family and visit number, so a reload never moves it.
export function nextVisitDay(rec, from, seed, so = false) {
  const pat = PATTERNS[rec.pattern] ?? PATTERNS.None;
  if (!pat.every) return null;
  const every = pat.every * (so ? SO_VISITS.soMult : 1);
  const rng = new Rng(`${seed}:visit:${rec.id}:${rec.visits ?? 0}`);
  const j = Math.round(pat.jitter * (so ? SO_VISITS.soMult : 1));
  return from + Math.max(1, Math.round(every) + rng.int(-j, j));
}
export function newFamily(def, day, seed) {
  const rec = { id: def.id, trust: TRUST.start, history: [], contact: contactFor(def.id, def.visitors), pattern: PATTERNS[def.visitors] ? def.visitors : 'None', nextVisit: null, lastVisit: null, visits: 0, meeting: null, notes: [], untold: null, seen: [], lastCompliment: null, lastComplaint: null, asked: { meeting: null, request: null } };
  // the first visit: somewhere inside their first gap (seeded), never the day they arrive
  const pat = PATTERNS[rec.pattern];
  if (pat.every) rec.nextVisit = day + 1 + new Rng(`${seed}:firstVisit:${def.id}:${day}`).int(0, Math.max(0, pat.every - 1));
  return rec;
}
// An older record (Milestone 16 kept { trust from 50, history of discharges }) or a missing one → a full record. The M16
// trust is kept as its change from 50, now from TRUST.start; its discharge entries become plain history lines.
export function ensureFamily(rec, def, day, seed) {
  if (rec?.contact !== undefined && Array.isArray(rec.seen)) return rec;
  const fresh = newFamily(def, day, seed);
  if (!rec) return fresh;
  const moved = typeof rec.trust === 'number' ? rec.trust - 50 : 0;
  fresh.trust = clamp(TRUST.start + moved);
  fresh.history = (rec.history ?? []).map((h) => ({ day: h.day, t: null, change: h.trust ?? h.change ?? 0, reason: h.event === 'discharge' ? 'Home after rehab: every goal met' : h.reason ?? 'Earlier', kind: h.event ?? h.kind ?? 'earlier' }));
  return fresh;
}

// Every Trust change goes through here: a fixed amount for a named reason, clamped 0–100, logged. Positive changes are
// × (1 + F29's %) when the Family Partnership Centre is placed. → the change actually applied (after the clamp)
export function changeTrust(rec, amount, { day, t = null, reason, kind = 'other', partnership = false, parts = null }) {
  const amt = amount > 0 && partnership ? amount * (1 + (TRUST.partnershipPct * +partnership) / 100) : amount; // (Milestone 25c: partnership = its level ×; true = ×1)
  const before = rec.trust;
  rec.trust = r1(clamp(before + amt));
  const change = r1(rec.trust - before);
  rec.history.push({ day, t, change, reason, kind, ...(parts ? { parts: parts.map((x) => ({ key: x.key, text: x.text, value: x.value })) } : {}) });
  if (rec.history.length > TRUST.historyKept) rec.history.splice(0, rec.history.length - TRUST.historyKept);
  return change;
}

// What a visit notices (bible §21, the card's list), each a fixed amount:
//   ctx = { mood, comfort, missed: [task names in the last NOTICE.missed.days days], bell (ringing, not answered),
//     alert (an open alert), tidy (a room check done today), greeter (name | null), favourite (name | null), so (SO07),
//     party (a family birthday party) }
// → [{ key, text, value }] (a part that doesn't apply is left out)
// (Milestone 20: suite — they live in a Premium Suite (RM03): a small steady lift every visit)
export function visitParts({ mood = 60, comfort = 60, missed = [], bell = false, alert = false, tidy = false, greeter = null, favourite = null, so = false, party = false, suite = false, call = 'them' } = {}) {
  const N = NOTICE;
  const out = [];
  if (mood >= N.mood.good) out.push({ key: 'mood', text: `${call} was cheerful`, value: N.mood.goodTrust });
  else if (mood < N.mood.low) out.push({ key: 'mood', text: `${call} seemed low`, value: N.mood.lowTrust });
  else out.push({ key: 'mood', text: `${call} seemed settled`, value: N.mood.okTrust });
  if (comfort >= N.comfort.good) out.push({ key: 'comfort', text: 'comfortable', value: N.comfort.goodTrust });
  else if (comfort < N.comfort.low) out.push({ key: 'comfort', text: 'not comfortable', value: N.comfort.lowTrust });
  if (missed.length) out.push({ key: 'missed', text: `${missed[0].toLowerCase()} was missed${missed.length > 1 ? ` (and ${missed.length - 1} more)` : ''}`, value: Math.max(N.missed.cap, missed.length * N.missed.each) });
  if (bell) out.push({ key: 'room', text: 'the call bell rang and nobody came', value: N.room.bell });
  else if (alert) out.push({ key: 'room', text: `${call} seemed unwell`, value: N.room.alert });
  else if (tidy) out.push({ key: 'room', text: 'the room was fresh and tidy', value: N.room.tidy });
  if (greeter) out.push({ key: 'greeted', text: `${greeter} said hello`, value: N.greeted.trust });
  if (favourite) out.push({ key: 'favourite', text: `${favourite} (the favourite) was on`, value: N.favourite.trust });
  if (so) out.push({ key: 'so', text: 'visit support (Family Connection Plan)', value: SO_VISITS.visitSupport });
  if (party) out.push({ key: 'party', text: 'a family birthday party', value: REQUESTS.birthdayParty.partyTrust });
  if (suite) out.push({ key: 'suite', text: N.suite.text, value: N.suite.trust * (suite === true ? 1 : suite) });
  return out;
}
// The visit's Trust change before F29: the parts added, the positive ones × (1 + communicatorPct / 100) — a Family
// Communicator on shift (+6%, data/staff.js).
export function visitTotal(parts, { communicatorPct = 0 } = {}) {
  const mult = 1 + communicatorPct / 100;
  return r1(parts.reduce((a, p) => a + (p.value > 0 ? p.value * mult : p.value), 0));
}
// The plain line for the resident's log: "happy with Dad's room", "worried Dad's breakfast was missed".
export function visitWords(parts, call) {
  const worst = [...parts].sort((a, b) => a.value - b.value)[0];
  const total = parts.reduce((a, p) => a + p.value, 0);
  if (worst && worst.value < 0) {
    if (worst.key === 'missed') return `worried: ${worst.text}`;
    if (worst.key === 'room') return `concerned: ${worst.text}`;
    return `a little worried: ${worst.text}`;
  }
  if (parts.some((p) => p.key === 'party')) return `a lovely birthday party for ${call}`;
  if (total >= 3) {
    if (parts.some((p) => p.key === 'room' && p.value > 0)) return `happy with ${call}'s room`;
    if (parts.some((p) => p.key === 'mood' && p.value >= NOTICE.mood.goodTrust)) return `happy to see ${call} so cheerful`;
    return 'happy with how things are';
  }
  return 'a quiet afternoon together';
}
// The home's Family Trust: the average over the families of the residents here (null with nobody here).
export function homeTrust(records, ids) {
  const list = ids.map((id) => records?.[id]?.trust).filter((v) => typeof v === 'number');
  return list.length ? r1(list.reduce((a, b) => a + b, 0) / list.length) : null;
}
export function newFamilyHome() {
  return { complaints: [], compliments: [], requests: [], asks: [], visits: [], nextId: 1, meetings: 0, reviews: 0, firsts: { visit: null, compliment: null, review: null }, seenComplaints: [] };
}
export function ensureFamilyHome(saved) {
  const fresh = newFamilyHome();
  if (!saved || typeof saved !== 'object') return fresh;
  return { ...fresh, ...saved, complaints: [...(saved.complaints ?? [])], compliments: [...(saved.compliments ?? [])], requests: [...(saved.requests ?? [])], asks: [...(saved.asks ?? [])], visits: [...(saved.visits ?? [])], firsts: { ...fresh.firsts, ...(saved.firsts ?? {}) }, seenComplaints: [...(saved.seenComplaints ?? [])] };
}
// Note something the family could see went wrong (kept for a week).
export function noteSeen(rec, day, kind, detail = null, band = null) {
  rec.seen = [...(rec.seen ?? []).filter((s) => s.day > day - 7), { day, kind, detail, band }];
}
export const seenOf = (rec, kind, fromDay) => (rec?.seen ?? []).filter((s) => s.kind === kind && s.day >= fromDay);
