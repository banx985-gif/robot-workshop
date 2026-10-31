// Quality: the five headline scores, Rank, accreditations, inspections and the peer homes (Milestone 26, bible §5,
// §31, §32). Pure rules on plain state (care.quality): the home world hands it one snapshot of what really happened
// each midnight (homeWorld.js qualityInputs — counts and readings the earlier milestones already track), and
// everything here is worked out from those snapshots. Nothing in this file can be ticked, filled in or bought: the only
// player action is applying for an accreditation, which books an inspection and never changes what it finds.
//
//   createQuality({ state, seed, bus, today, year, onAward(def), secretOpen(flag), hasFacility(defId) })
//     (Milestone 31: secretOpen says whether a secret's unlock flag is set — C11 / C12 are listed and R08 joins only then;
//     hasFacility reads the home for C11's prestige facility)
//     q.daily(day, inputs)   yesterday's snapshot (Milestone 27: inputs.lifts { scoreId: points } adds the good-care signal): a day's scores into the rolling window, reputation from sustained
//                            scores, any inspection due, the yearly routine review and recognition table, the peers' drift
//     q.prime(inputs)        a new home (or an older save): fill the window from the home as it is now
//     q.scores() → { clinicalSafety, … } (rolling, 0–100) · q.parts(id) → [{ label, weight, value }] (the last day's)
//     q.measure('nutrition') · q.history() → { essentialDone, unsafeShifts, overdueComplaints, incidents }
//     q.rank · q.rankIndex · q.reputation · q.nextRank() → { rank, need, accreditations, have, held } | null
//     q.accreditations() → [{ def, status, day, until, inspectionDay, check }] · q.apply(id) → { ok, reason }
//     q.judge(id) → { pass, lines: [{ text, ok }] } (what an inspection would find today)
//     q.inspections() · q.unseen() · q.markSeen(id?)
//     q.peers() → [{ def, scores }] · q.benchmark() · q.recognition() → { table, years }
//     q.bonus(key) · q.has(flag) · q.speedAllowed(speed) · q.won(id)
//     q.setRankForTests(r) · q.stepRankForDebug()
//   bus: 'quality:rankUp' { rank, index, day } · 'quality:award' { id, name, art, day } · 'quality:inspection'
//        { id, kind, pass, grade } · 'quality:peer' { id, name }
import { ReputationSystem } from '../../../../core/ReputationSystem.js';
import { rankIndexOf } from '../../../../core/CompanyRank.js';
import { Rankings } from '../../../../core/Rankings.js';
import { gradeRun } from '../../../../core/GradeEngine.js';
import { Rng } from '../../../../core/Rng.js';
import { SCORES, SCORE_IDS, WINDOW, READINGS, RANKS, REPUTATION, INSPECTION, ROUTINE_GRADE, SPEED_UNLOCKS } from '../../data/quality.js';
import { ALL_ACCREDITATIONS, accreditationById, COUNTER_NAMES, MEASURE_NAMES } from '../../data/accreditations.js';
import { PEERS, PRESTIGE_PEERS, ALL_PEERS, peerById, PEER_DRIFT, RECOGNITION } from '../../data/peers.js';
import { facilityById } from '../../data/facilities.js';
import { programById } from '../../data/programs.js';

const clamp = (x) => Math.max(0, Math.min(100, x));
const r1 = (x) => Math.round(x * 10) / 10;
const avg = (list) => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : null);
const nameOf = (id) => SCORES.find((s) => s.id === id)?.name ?? id;

export function newQualityState() {
  return {
    samples: [], // the rolling window: [{ day, scores, parts, nutrition, essential: { done, missed }, unsafe, overdue, incidents }]
    rep: { value: 0, highestRankIndex: 0 },
    repFrac: 0,
    acc: {}, // id → { won: day } | { failed: day, until: day }
    applied: null, // { id, appliedDay, day } — the inspection booked
    inspections: [], // [{ uid, kind: 'accreditation' | 'routine', id?, day, pass, grade?, total?, lines, seen }]
    nextUid: 1,
    firstReview: null, // the day of the first accreditation inspection (2× speed, bible §3)
    community: [], // days a community event was held
    rehabDischarges: 0,
    programDays: {},
    peers: {}, // id → { scores: [5], joined: day }
    rankings: null,
    recognition: [], // [{ year, table: [{ id, avg, place }] }]
    rankLog: [], // [{ rank, day }]
    trainedOn: {}, // staffId → the day they last finished a course (Staff Wellbeing's "trained")
    lastRoutine: null,
    opened: null, // the day the records began (prime)
    debugReach: false,
    lastMissed: null, // (Milestone 31) the last day essential care was missed (null: never since the records began) — C12
  };
}
export function ensureQualityState(saved) {
  const fresh = newQualityState();
  if (!saved || typeof saved !== 'object') return fresh;
  // (Milestone 31: an older save never kept the last missed day — the newest miss in its month of samples, or, with none
  // there, the day before that month began: nothing older is known, so it is never counted as clean)
  if (!('lastMissed' in saved)) {
    const S = saved.samples ?? [];
    const miss = [...S].reverse().find((x) => (x.essential?.missed ?? 0) > 0);
    saved = { ...saved, lastMissed: miss ? miss.day : S.length ? S[0].day - 1 : null };
  }
  return { ...fresh, ...saved, rep: { ...fresh.rep, ...(saved.rep ?? {}) }, acc: { ...(saved.acc ?? {}) }, samples: [...(saved.samples ?? [])], inspections: [...(saved.inspections ?? [])], community: [...(saved.community ?? [])], peers: { ...(saved.peers ?? {}) }, recognition: [...(saved.recognition ?? [])], rankLog: [...(saved.rankLog ?? [])], programDays: { ...(saved.programDays ?? {}) } };
}

// One day's readings (0–100 each) from the snapshot — the rules that turn counts into a reading are data (READINGS).
export function readingsOf(x) {
  const R = READINGS;
  const n = Math.max(0, x.residents ?? 0);
  const neutral = (v) => (v == null ? R.neutralTrust : v);
  const ess = (x.essential?.done ?? 0) + (x.essential?.missed ?? 0);
  return {
    clinical: clamp(x.clinical ?? 88),
    essentialDone: ess ? (100 * x.essential.done) / ess : 100,
    fallsFree: clamp(100 - R.fallsPerResident * (n ? (x.falls28 ?? 0) / n : 0)),
    infection: clamp(x.infection ?? 0),
    mood: neutral(x.mood),
    comfort: neutral(x.comfort),
    independence: neutral(x.independence),
    connection: neutral(x.connection),
    choice: x.choice == null ? R.neutralTrust : clamp(100 * x.choice),
    trust: neutral(x.trust),
    complaintsInTime: clamp(100 - R.overdueEach * (x.overdue ?? 0)),
    compliments: Math.min(100, R.complimentBase + R.complimentEach * (x.compliments ?? 0)),
    morale: clamp(x.morale ?? 70),
    energy: clamp(x.energy ?? 70),
    safeShifts: x.shifts?.total ? (100 * x.shifts.safe) / x.shifts.total : 100,
    trained: clamp(100 * (x.trained ?? 0)),
    continuity: clamp(100 * (x.continuity ?? 0)),
    rooms: clamp(x.rooms ?? 70),
    clean: clamp(x.clean ?? 100),
    preparedness: clamp(x.preparedness ?? 0),
    plansCurrent: clamp(100 * (x.plansCurrent ?? 1)),
  };
}
// A day's five scores (and each part) from its readings.
export function dayScores(readings) {
  const scores = {};
  const parts = {};
  for (const s of SCORES) {
    parts[s.id] = s.parts.map((p) => ({ input: p.input, label: p.label, weight: p.weight, value: r1(readings[p.input]) }));
    scores[s.id] = r1(s.parts.reduce((t, p) => t + p.weight * readings[p.input], 0));
  }
  return { scores, parts };
}

export function createQuality({ state, seed = 'careworks', bus = null, today = () => 0, year = () => 1, onAward = null, secretOpen = () => false, hasFacility = () => false }) {
  const st = state;
  const ranks = RANKS.map((r) => ({ id: r.id, min: r.min }));
  const wonIds = () => ALL_ACCREDITATIONS.filter((a) => st.acc[a.id]?.won != null).map((a) => a.id);
  // (Milestone 31) C11 / C12 are listed (and can be applied for) only once their secret's unlock flag is set
  const listed = (a) => !!a && (!a.secret || !!secretOpen(a.unlockFlag) || st.acc[a.id]?.won != null);
  const listedAccreditations = () => ALL_ACCREDITATIONS.filter(listed);
  const rep = new ReputationSystem({ ranks, canReach: (i) => st.debugReach || wonIds().length >= RANKS[i].accreditations });
  rep.load(st.rep);
  const rankings = new Rankings({ points: RECOGNITION.points, focusId: RECOGNITION.homeId });
  rankings.load(st.rankings);

  // --- the rolling window ---------------------------------------------------------------------------------------------
  function push(day, x) {
    const { scores, parts } = dayScores(readingsOf(x));
    // (Milestone 27: the good-care signal of a well-supported end of life — points on top, never below the day's score)
    for (const [id, v] of Object.entries(x.lifts ?? {})) if (scores[id] != null && v > 0) scores[id] = r1(Math.min(100, scores[id] + v));
    st.samples.push({ day, scores, parts, nutrition: x.nutrition ?? null, essential: { done: x.essential?.done ?? 0, missed: x.essential?.missed ?? 0 }, unsafe: x.unsafe ?? 0, overdue: x.overdue ?? 0, incidents: x.incidentsEnded ?? 0 });
    if ((x.essential?.missed ?? 0) > 0) st.lastMissed = Math.max(st.lastMissed ?? -Infinity, day); // (Milestone 31: C12)
    if (st.samples.length > WINDOW) st.samples.splice(0, st.samples.length - WINDOW);
  }
  const scores = () => {
    const out = {};
    for (const id of SCORE_IDS) out[id] = r1(avg(st.samples.map((s) => s.scores[id])) ?? 0);
    return out;
  };
  const measure = (m) => {
    if (m === 'nutrition') {
      const v = avg(st.samples.map((s) => s.nutrition).filter((x) => x != null));
      return v == null ? null : r1(v);
    }
    return null;
  };
  function history() {
    const H = st.samples.slice(-INSPECTION.historyDays);
    const done = H.reduce((t, s) => t + s.essential.done, 0);
    const missed = H.reduce((t, s) => t + s.essential.missed, 0);
    return {
      essentialDone: done + missed ? Math.round((100 * done) / (done + missed)) : 100,
      unsafeShifts: H.reduce((t, s) => t + s.unsafe, 0),
      overdueComplaints: H.length ? H[H.length - 1].overdue : 0,
      incidents: H.reduce((t, s) => t + s.incidents, 0),
    };
  }

  // --- rank -------------------------------------------------------------------------------------------------------------
  const rankNow = () => ranks[rep.highestRankIndex].id;
  function afterRep(day) {
    const before = st.rep.highestRankIndex;
    rep.recheck();
    st.rep = rep.serialize();
    for (let i = before + 1; i <= rep.highestRankIndex; i++) {
      st.rankLog.push({ rank: ranks[i].id, day });
      bus?.emit('quality:rankUp', { rank: ranks[i].id, index: i, day });
    }
  }
  function addRep(amount, day, reason) {
    rep.add(amount, reason, { quiet: true });
    afterRep(day);
  }
  function trickle(day) {
    const s = scores();
    let r = 0;
    for (const id of SCORE_IDS) r += Math.max(0, s[id] - REPUTATION.line) * REPUTATION.perPoint;
    if (has('reputationBoost')) r *= 1.25;
    st.repFrac += r;
    const whole = Math.floor(st.repFrac);
    if (whole > 0) {
      st.repFrac -= whole;
      addRep(whole, day, 'Sustained quality');
    }
  }

  // --- accreditations ---------------------------------------------------------------------------------------------------
  function requirementLine(r) {
    const s = scores();
    switch (r.type) {
      case 'score': {
        const v = s[r.score];
        return { text: `${nameOf(r.score)} ${Math.round(v)} (needs ${r.min}+, held over the month)`, ok: v >= r.min };
      }
      case 'allScores': {
        const low = SCORE_IDS.filter((id) => s[id] < r.min);
        return { text: low.length ? `Every headline score ${r.min}+: ${low.map((id) => `${nameOf(id)} ${Math.round(s[id])}`).join(', ')} short` : `Every headline score ${r.min}+ (lowest ${Math.round(Math.min(...SCORE_IDS.map((id) => s[id])))})`, ok: !low.length };
      }
      case 'measure': {
        const v = measure(r.measure);
        return { text: `${MEASURE_NAMES[r.measure]} ${v == null ? '—' : Math.round(v)} (needs ${r.min}+)`, ok: v != null && v >= r.min };
      }
      case 'counter': {
        const v = counter(r.counter, r.days);
        return { text: `${v} ${COUNTER_NAMES[r.counter]}${r.days ? ' in the last year' : ''} (needs ${r.min})`, ok: v >= r.min };
      }
      case 'program': {
        const v = st.programDays[r.program] ?? 0;
        return { text: `${programById(r.program)?.name ?? r.program} running for ${v} of ${r.days} days`, ok: v >= r.days };
      }
      case 'year':
        return { text: `Year ${r.min} (now Year ${year()})`, ok: year() >= r.min };
      case 'accreditations': {
        const missing = r.ids.filter((id) => !won(id));
        if (r.ids.length === 1) return { text: `${accreditationById(r.ids[0])?.name ?? r.ids[0]} (${r.ids[0]}) ${missing.length ? 'still to win' : 'won'}`, ok: !missing.length };
        return { text: missing.length ? `Every earlier accreditation: ${missing.join(', ')} still to win` : 'Every earlier accreditation won', ok: !missing.length };
      }
      // (Milestone 31) a prestige facility placed (C11)
      case 'facility': {
        const have = r.ids.filter((id) => hasFacility(id));
        const names = r.ids.map((id) => facilityById(id)?.name ?? id).join(' or ');
        return { text: have.length ? `A prestige facility in the home: ${have.map((id) => facilityById(id)?.name ?? id).join(', ')}` : `A prestige facility in the home (${names}): none yet`, ok: have.length > 0 };
      }
      // (Milestone 31) no essential care missed in the last `days` days (C12) — from the records, never filled in
      case 'essentialClean': {
        const since = st.lastMissed ?? (st.opened != null ? st.opened - 1 : today());
        const clean = Math.max(0, today() - since - 1);
        const months = Math.round(r.days / 28);
        return { text: `No essential care missed for ${months} months: ${Math.min(clean, r.days)} of ${r.days} days so far`, ok: clean >= r.days };
      }
      default:
        return { text: 'Unknown requirement', ok: false };
    }
  }
  function counter(id, days = null) {
    if (id === 'rehabDischarges') return st.rehabDischarges;
    if (id === 'communityEvents') return st.community.filter((d) => !days || d > today() - days).length;
    return 0;
  }
  function historyLines() {
    const h = history();
    const lines = INSPECTION.history.map((r) => {
      const v = h[r.id];
      const ok = r.min != null ? v >= r.min : v <= r.max;
      return { text: r.text(v, r.min ?? r.max), ok };
    });
    // (an incident handled never counts against the home — Milestone 25 rule)
    lines.push({ text: h.incidents ? `${h.incidents} incident${h.incidents === 1 ? '' : 's'} this month, handled (never counted against the home)` : 'No incidents this month', ok: true, info: true });
    return lines;
  }
  function judge(id) {
    const a = accreditationById(id);
    if (!listed(a)) return { pass: false, lines: [] };
    const lines = [...a.requirement.map(requirementLine), ...historyLines()];
    return { pass: lines.every((l) => l.ok), lines };
  }
  const won = (id) => st.acc[id]?.won != null;
  function status(a) {
    const rec = st.acc[a.id];
    if (rec?.won != null) return 'won';
    if (st.applied?.id === a.id) return 'applied';
    if (rankIndexOf(ranks, a.rank) > rep.highestRankIndex) return 'locked';
    if (rec?.until != null && today() < rec.until) return 'cooldown';
    if (st.opened != null && today() < st.opened + INSPECTION.recordDays) return 'records';
    return 'ready';
  }
  function apply(id) {
    const a = accreditationById(id);
    if (!listed(a)) return { ok: false, reason: 'No such accreditation' }; // (Milestone 31: a prestige one before its flag)
    const s = status(a);
    if (s === 'won') return { ok: false, reason: 'Already awarded' };
    if (s === 'locked') return { ok: false, reason: `Needs Rank ${a.rank}` };
    if (s === 'cooldown') return { ok: false, reason: `You can apply again on day ${st.acc[id].until + 1}` };
    if (s === 'applied') return { ok: false, reason: 'An inspection is already booked' };
    if (st.opened != null && today() < st.opened + INSPECTION.recordDays) return { ok: false, reason: `The inspectors want a month of records first: you can apply from day ${st.opened + INSPECTION.recordDays + 1}` };
    if (st.applied) return { ok: false, reason: `An inspection for ${accreditationById(st.applied.id)?.name} is already booked` };
    st.applied = { id, appliedDay: today(), day: today() + INSPECTION.daysOut };
    bus?.emit('quality:applied', { id, day: st.applied.day });
    return { ok: true, reason: null, day: st.applied.day };
  }
  function record(rec) {
    st.inspections.push({ uid: st.nextUid++, seen: false, ...rec });
    if (st.inspections.length > 24) st.inspections.splice(0, st.inspections.length - 24);
  }
  function inspect(day) {
    const a = accreditationById(st.applied.id);
    st.applied = null;
    st.firstReview ??= day;
    const j = judge(a.id);
    if (j.pass) {
      st.acc[a.id] = { won: day };
      record({ kind: 'accreditation', id: a.id, day, pass: true, lines: j.lines });
      addRep(a.reward.reputation, day, `Accreditation: ${a.name}`);
      onAward?.(a); // (the home world: the recognition bonus on the Ledger, the Founder's recognitions)
      bus?.emit('quality:award', { id: a.id, name: a.name, art: a.art, day, finale: !!a.finale, prestige: !!a.secret });
    } else {
      st.acc[a.id] = { failed: day, until: day + INSPECTION.cooldownDays };
      record({ kind: 'accreditation', id: a.id, day, pass: false, lines: j.lines });
    }
    bus?.emit('quality:inspection', { id: a.id, kind: 'accreditation', pass: j.pass, day });
  }

  // --- the yearly routine review ----------------------------------------------------------------------------------------
  function routineReview(day) {
    const facts = { ...scores(), essentialDone: history().essentialDone };
    const g = gradeRun({ categories: ROUTINE_GRADE.categories, bands: ROUTINE_GRADE.bands, facts });
    const lines = g.categories.map((c) => ({ text: `${c.name}: ${c.score} / ${c.max}`, ok: c.score >= c.max * 0.6 }));
    const h = history();
    lines.push({ text: h.incidents ? `${h.incidents} incident${h.incidents === 1 ? '' : 's'} this month, handled (never counted against the home)` : 'No incidents this month', ok: true, info: true });
    const gain = REPUTATION.routine[g.band] ?? 0;
    record({ kind: 'routine', day, pass: true, grade: g.band, total: g.total, reputation: gain, lines });
    st.lastRoutine = day;
    if (gain) addRep(gain, day, `Routine review: grade ${g.band}`);
    bus?.emit('quality:inspection', { id: null, kind: 'routine', pass: true, grade: g.band, total: g.total, day });
    return g;
  }

  // --- peers ------------------------------------------------------------------------------------------------------------
  function peersArrive(day) {
    for (const p of PEERS) {
      if (st.peers[p.id] || year() < p.year) continue;
      st.peers[p.id] = { scores: [...p.base], joined: day };
      bus?.emit('quality:peer', { id: p.id, name: p.name, day });
    }
    // (Milestone 31) R08 joins once its secret's flag is set: a little above the home on every score
    for (const p of PRESTIGE_PEERS) {
      if (st.peers[p.id] || !secretOpen(p.unlockFlag) || !st.samples.length) continue;
      const s = scores();
      st.peers[p.id] = { scores: SCORE_IDS.map((id) => r1(Math.min(p.adaptive.ceiling, s[id] + p.adaptive.lead))), joined: day };
      bus?.emit('quality:peer', { id: p.id, name: p.name, day, prestige: true });
    }
  }
  // (Milestone 31) Adaptive (R08): part of the way back to a little above the home's own score, each month.
  function adaptiveDrift(p, rec, day) {
    const A = p.adaptive;
    const s = scores();
    const rng = new Rng(`${seed}:peer:${p.id}:${day}`);
    rec.scores = rec.scores.map((v, i) => {
      const target = Math.min(A.ceiling, s[SCORE_IDS[i]] + A.lead);
      return r1(Math.max(PEER_DRIFT.floor, Math.min(A.ceiling, v + (target - v) * A.pull + rng.range(-A.noise, A.noise))));
    });
  }
  function peersDrift(day) {
    const D = PEER_DRIFT;
    for (const p of PRESTIGE_PEERS) if (st.peers[p.id]) adaptiveDrift(p, st.peers[p.id], day);
    for (const p of PEERS) {
      const rec = st.peers[p.id];
      if (!rec) continue;
      const rng = new Rng(`${seed}:peer:${p.id}:${day}`);
      rec.scores = rec.scores.map((v, i) => {
        const strong = p.strong.includes(SCORE_IDS[i]);
        const move = (strong ? D.strongUp : 0) + rng.range(-D.noise, D.noise);
        return r1(Math.max(D.floor, Math.min(D.ceiling, v + move)));
      });
    }
  }
  const peerAvg = (id) => r1(avg(st.peers[id].scores));
  function recognitionTable(day) {
    const s = scores();
    const rows = [{ id: RECOGNITION.homeId, avg: r1(avg(SCORE_IDS.map((k) => s[k]))) }, ...Object.keys(st.peers).map((id) => ({ id, avg: peerAvg(id) }))];
    rows.sort((a, b) => b.avg - a.avg || a.id.localeCompare(b.id));
    const table = rows.map((r, i) => ({ ...r, place: i + 1 }));
    rankings.record(table.map((r) => ({ id: r.id, place: r.place })));
    st.rankings = rankings.serialize();
    st.recognition.push({ year: Math.round(day / INSPECTION.routineEvery), table });
    if (st.recognition.length > 16) st.recognition.shift();
  }

  // --- the day -----------------------------------------------------------------------------------------------------------
  function daily(day, x) {
    push(day, x);
    if (x.community) st.community.push(day - 1);
    st.community = st.community.filter((d) => d > day - 400);
    st.rehabDischarges = Math.max(st.rehabDischarges, x.rehabDischarges ?? 0);
    st.programDays = { ...(x.programDays ?? {}) };
    trickle(day);
    if (st.applied && day >= st.applied.day) inspect(day);
    if (day > 0 && day % INSPECTION.routineEvery === 0) {
      routineReview(day);
      recognitionTable(day);
    }
    if (day % 28 === 0) peersDrift(day);
    peersArrive(day);
  }
  function prime(x) {
    if (st.samples.length) return;
    const d = today();
    st.opened = d;
    for (let i = 0; i < WINDOW; i++) push(d - WINDOW + 1 + i, { ...x, incidentsEnded: 0, unsafe: 0, community: false });
    st.rehabDischarges = Math.max(st.rehabDischarges, x.rehabDischarges ?? 0);
    peersArrive(d);
  }

  function bonus(key) {
    let t = 0;
    for (const id of wonIds()) t += accreditationById(id).reward.bonus[key] ?? 0;
    return t;
  }
  const has = (flag) => wonIds().some((id) => accreditationById(id).reward.flags.includes(flag));

  const q = {
    state: st,
    daily,
    prime,
    scores,
    addReputation: (amount, day, reason) => amount > 0 && addRep(amount, day, reason), // (Milestone 32: an achievement's small lift)
    parts: (id) => st.samples.at(-1)?.parts[id] ?? [],
    measure,
    history,
    get rank() {
      return rankNow();
    },
    get rankIndex() {
      return rep.highestRankIndex;
    },
    get reputation() {
      return rep.value;
    },
    nextRank() {
      const i = rep.highestRankIndex + 1;
      if (i >= RANKS.length) return null;
      const R = RANKS[i];
      return { rank: R.id, need: R.min, accreditations: R.accreditations, have: wonIds().length, held: rep.value >= R.min };
    },
    rankLog: () => st.rankLog,
    accreditations: () => listedAccreditations().map((def) => ({ def, status: status(def), day: st.acc[def.id]?.won ?? null, until: st.acc[def.id]?.until ?? null, inspectionDay: st.applied?.id === def.id ? st.applied.day : null, check: judge(def.id) })),
    won,
    wonIds,
    applied: () => st.applied,
    apply,
    judge,
    inspections: () => st.inspections,
    unseen: () => st.inspections.filter((x) => !x.seen),
    markSeen(uid = null) {
      for (const x of st.inspections) if (uid == null || x.uid === uid) x.seen = true;
    },
    peers: () => ALL_PEERS.filter((p) => st.peers[p.id]).map((def) => ({ def, scores: Object.fromEntries(SCORE_IDS.map((id, i) => [id, st.peers[def.id].scores[i]])), avg: peerAvg(def.id), joined: st.peers[def.id].joined })),
    benchmark() {
      const s = scores();
      return SCORE_IDS.map((id, i) => {
        const vals = Object.keys(st.peers).map((pid) => ({ id: pid, v: st.peers[pid].scores[i] }));
        const best = vals.sort((a, b) => b.v - a.v)[0] ?? null;
        return { id, name: nameOf(id), home: s[id], peerAvg: vals.length ? r1(avg(vals.map((x) => x.v))) : null, best: best ? { id: best.id, name: peerById(best.id).name, v: best.v } : null, ahead: vals.filter((x) => x.v > s[id]).length, of: vals.length };
      });
    },
    recognition: () => ({ table: rankings.table(), years: st.recognition }),
    bonus,
    has,
    speedAllowed(speed) {
      if (speed === 1) return true;
      if (speed === 2) return st.firstReview != null || rep.highestRankIndex >= rankIndexOf(ranks, SPEED_UNLOCKS[4].rank) || year() >= SPEED_UNLOCKS[4].year;
      if (speed === 4) return rep.highestRankIndex >= rankIndexOf(ranks, SPEED_UNLOCKS[4].rank) || year() >= SPEED_UNLOCKS[4].year;
      return false;
    },
    // Tests and an older save: the rank (and its reputation floor) at once; the rank never drops below it after.
    setRankForTests(r, day = today()) {
      const i = rankIndexOf(ranks, r);
      if (i < 0 || i <= rep.highestRankIndex) return rankNow();
      const debug = st.debugReach;
      st.debugReach = true;
      rep.value = Math.max(rep.value, ranks[i].min);
      afterRep(day);
      st.debugReach = debug;
      return rankNow();
    },
    // ?debug=1: one rank up (its reputation floor, its accreditation count waived for this step).
    stepRankForDebug(day = today()) {
      const i = rep.highestRankIndex + 1;
      return i < ranks.length ? q.setRankForTests(ranks[i].id, day) : rankNow();
    },
    routineReviewForTests: (day = today()) => routineReview(day),
    serialize() {
      st.rep = rep.serialize();
      st.rankings = rankings.serialize();
      return st;
    },
  };
  return q;
}
