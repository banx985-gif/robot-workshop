// Recruitment and training (Milestone 11, bible §11 / §13) on core/RecruitmentSystem and core/TrainingSystem. Pure
// rules on plain state (no walking, no drawing): the home world walks new hires in, takes trainees off the roster and
// pays through the ledger via the hooks here.
//
//   createStaffing({ state, sys, ledger, seed, bus, today, year, teamSize, trainingPlaces, rank, hasFacility, score, trainingPct }) → staffing
//     state            the run's staff state (its .staffing part is made here when missing: an M10 save → a fresh board)
//     sys              the run's core/StaffSystem · ledger (src/systems/ledger.js)
//     today() / year() the game day and year · teamSize() the team without agency workers
//     trainingPlaces() places at the Training Room(s) now (F11 × 2; ?debug=1 without one)
//   staffing.board → the candidate cards · staffing.card(id) · staffing.nextFreeDay
//   staffing.channels() → [{ channel, ok, reason }] · staffing.refresh(channelId) → { ok, reason }
//   staffing.cap · staffing.canHire(cardId) → { ok, reason } · staffing.take(cardId) → the card (the world hires them)
//   staffing.tick(day)                          a new day: the free refresh every 56 days, training days
//   staffing.courses(staffId) → [{ course, ok, reason, preview, capped, specialty }] · staffing.startCourse(courseId, staffId)
//   staffing.trainingOf(staffId) · staffing.cancelTraining(staffId) · staffing.specialtiesOf(staffId)
//   staffing.setDebug(on) · staffing.serialize() (writes the core systems' state into state.staffing)
// Milestone 12: every §12 row carries its eligibility rule (data/staff.js RULES) and a channel only offers people whose
// rule passes now (staffing.eligible(def) → { ok, reason }):
//     rank() the home's Rank (Rank is Milestone 26: always E until then) · hasFacility(defId) a facility is built ·
//     score(id) a §5 headline score (null until Milestone 26)
//   Standard: always. Rare: Rank D (a role milestone stands in as Rank D until M26). Elite: their Rank + a specialist
//   facility or an excellence score. Legendary / Secret: never — not on any board, in any channel, even with a debug
//   unlock (the secret engine brings them, Milestones 29 / 30: staffing.arrive(defId) puts their special card on the
//   board until hired). ?debug=1: "Open every channel" also counts as the Rank;
//   "Unlock Elite staff" (staffing.setEliteUnlock) counts as the Elite condition. staffing.eligibleNow(tiers?) → defs.
// A card: { id, channel, personId, name, role, tier, level, stats, salary, trait, shiftPref, art }.
import { RecruitmentSystem } from '../../../../core/RecruitmentSystem.js';
import { TrainingSystem } from '../../../../core/TrainingSystem.js';
import { Rng } from '../../../../core/Rng.js';
import { STAFF, staffById, namedTrait } from '../../data/staff.js';
import { ROLES, ROLE_IDS, STAT_IDS, TIERS } from '../../data/roles.js';
import { CHANNELS, NEVER_TIERS, TIER_FALLBACK, RECRUIT, EMPLOYEE_CAP, RANK_NOW, rankAtLeast } from '../../data/recruitment.js';
import { facilityById } from '../../data/facilities.js';
import { COURSES, courseById, SPECIALTIES, SPECIALTY_LIMIT } from '../../data/training.js';

export function newStaffingState() {
  return { recruit: null, nextFree: null, training: null, specialties: {}, departed: [], hires: [], debug: false, eliteUnlock: false, arrived: [], arrivalQueue: [] };
}
export function ensureStaffingState(saved) {
  const s = { ...newStaffingState(), ...(saved ?? {}) };
  s.specialties = Object.fromEntries(Object.entries(s.specialties ?? {}).map(([k, v]) => [k, [...v]]));
  s.departed = [...(s.departed ?? [])];
  s.hires = [...(s.hires ?? [])];
  s.arrived = [...(s.arrived ?? [])];
  s.arrivalQueue = [...(s.arrivalQueue ?? [])];
  return s;
}
// Milestone 30: a special arrival's card stays on the board until they are hired (core keeps it `days` days).
const ARRIVAL_DAYS = 100000;
const toCoreCourse = (c) => ({ id: c.id, name: c.name, cost: c.cost, days: c.days, requires: null, effect: c.gains ? { kind: 'stats', stats: c.gains } : { kind: 'lowest', count: c.lowest.count, min: c.lowest.min, max: c.lowest.max } });
const cardOf = (d) => ({ personId: d.id, name: d.name, role: d.role, tier: d.tier, level: d.level, stats: { ...d.stats }, salary: d.salary, trait: namedTrait(d), traits: [...d.traits], shiftPref: d.shiftPref, art: d.art });

export function createStaffing({ state, sys, ledger, seed = 'careworks', bus = null, today = () => 0, year = () => 1, teamSize = () => sys.staff.length, trainingPlaces = () => 0, rank = () => RANK_NOW, hasFacility = () => false, score = () => null, trainingPct = () => 0, clue = () => false }) {
  state.staffing = ensureStaffingState(state.staffing);
  const st = state.staffing;

  // --- recruitment ---------------------------------------------------------------------------------------------------
  const employed = () => new Set(sys.staff.map((m) => m.id));
  const never = () => new Set(state.noCandidates ?? []); // the Founder (bible §3.5.4) — never offered, ever
  let building = [];
  // --- eligibility (Milestone 12) --------------------------------------------------------------------------------------
  const rankOk = (r) => rankAtLeast(rank(), r) || !!st.debug;
  // Does this §12 row's rule pass now? { ok, reason } (the reason in plain words when it doesn't).
  function eligible(d) {
    const r = d.rule ?? { type: d.eligibility };
    if (NEVER_TIERS.includes(d.tier) || r.type === 'secret') return { ok: false, reason: 'Arrives by itself when the home earns it' };
    switch (r.type) {
      case 'start':
      case 'candidate':
        return { ok: true, reason: null };
      case 'rank':
        return rankOk(r.rank) ? { ok: true, reason: null } : { ok: false, reason: `Needs Rank ${r.rank}` };
      case 'milestone': {
        // (Milestone 26: Rank D and the role's own headline score held at its line)
        if (!rankOk(r.rank)) return { ok: false, reason: `Needs Rank ${r.rank}` };
        if (st.debug || r.score == null) return { ok: true, reason: null };
        const v = score(r.score);
        return v != null && v >= r.min ? { ok: true, reason: null } : { ok: false, reason: `Needs ${r.text.replace(/^Rank \w \+ /, '').replace(/ \(.*\)$/, '')} (now ${v == null ? '—' : Math.round(v)})` };
      }
      case 'facility':
        if (st.eliteUnlock) return { ok: true, reason: null };
        if (!rankOk(r.rank)) return { ok: false, reason: `Needs Rank ${r.rank}` };
        return hasFacility(r.facility) ? { ok: true, reason: null } : { ok: false, reason: `Needs a ${facilityById(r.facility)?.name ?? r.facility}` };
      case 'excellence': {
        if (st.eliteUnlock) return { ok: true, reason: null };
        if (!rankOk(r.rank)) return { ok: false, reason: `Needs Rank ${r.rank}` };
        const v = score(r.score);
        // (Milestone 26: the Workforce Excellence clue shows how close the score is)
        return v != null && v >= r.min ? { ok: true, reason: null } : { ok: false, reason: `Needs ${r.text.replace(/^Rank \w \+ /, '')}${clue() ? ` (now ${v == null ? '—' : Math.round(v)})` : ''}` };
      }
      default:
        return { ok: false, reason: 'Unknown rule' };
    }
  }
  // Who may be on a card of this tier: a §12 row of that tier whose rule passes, not employed, never the Founder, not
  // already on the board. Legendary / Secret: nobody, ever.
  function poolFor(tier) {
    if (NEVER_TIERS.includes(tier)) return [];
    const emp = employed();
    const no = never();
    const onBoard = new Set([...rs.cards, ...building].map((c) => c.personId));
    return STAFF.filter((d) => d.tier === tier && !NEVER_TIERS.includes(d.tier) && !emp.has(d.id) && !no.has(d.id) && !onBoard.has(d.id) && eligible(d).ok);
  }
  const rs = new RecruitmentSystem({
    rng: new Rng(`${seed}:recruit`),
    bus,
    channels: CHANNELS.filter((c) => c.id !== 'special').map((c) => ({ id: c.id, name: c.name, cost: c.cost, roles: ROLE_IDS, weights: c.weights })),
    boardSize: RECRUIT.boardSize,
    reappearChance: 0, // (people who left are simply back in the pool)
    autoRefresh: () => false, // (the free refresh is every 56 days: tick below)
    hooks: {
      makeCandidate(ch, tier, rng) {
        for (let t = tier; t; t = TIER_FALLBACK[t]) {
          const pool = poolFor(t);
          if (!pool.length) continue;
          const card = cardOf(rng.pick(pool));
          building.push(card);
          return card;
        }
        return { personId: null };
      },
    },
  });
  function refreshBoard(channelId, reason) {
    building = [];
    rs.refresh(channelId, reason);
    rs.board = rs.board.filter((c) => c.personId); // (nobody left of any tier the channel offers: fewer cards)
    building = [];
  }
  if (!rs.load(st.recruit)) refreshBoard(RECRUIT.freeChannel, 'start');
  if (st.nextFree == null) st.nextFree = today() + RECRUIT.freeRefreshDays;
  // Milestone 30: special arrivals (a staff secret found): the core board's one special card, the next one waiting in
  // st.arrivalQueue while it is taken. Each person arrives once per run (st.arrived).
  function nextArrival() {
    if (rs.special) return;
    while (st.arrivalQueue.length) {
      const d = staffById(st.arrivalQueue.shift());
      if (!d || employed().has(d.id)) continue;
      rs.addSpecial(cardOf(d), { day: today(), days: ARRIVAL_DAYS, note: d.tier === 'divine' ? (d.god === 'havoc' ? 'Someone’s brought far too many streamers…' : 'A divine arrival') : 'A special arrival' }); // (Milestone 30b: a Works God)
      return;
    }
  }

  const channelState = (c) => {
    if (c.unlock.type === 'start') return { ok: true, reason: null };
    if (st.debug && c.unlock.type !== 'condition') return { ok: true, reason: null };
    if (c.unlock.type === 'rank' && rankAtLeast(rank(), c.unlock.value)) return { ok: true, reason: null }; // (Milestone 26)
    return { ok: false, reason: c.unlock.text };
  };
  let capDebug = null; // (Milestone 24: ?debug=1 "Fill to cap" grows the team past the Rank's cap; never saved)
  const cap = () => capDebug ?? EMPLOYEE_CAP[rank()] ?? EMPLOYEE_CAP[RANK_NOW]; // (Milestone 26: the real Rank's cap)

  // --- training ------------------------------------------------------------------------------------------------------
  let onDone = null;
  const ts = new TrainingSystem({
    rng: new Rng(`${seed}:train`),
    bus,
    staff: sys,
    statKeys: STAT_IDS,
    courses: COURSES.map(toCoreCourse),
    slots: [{ id: 'trainingRoom', name: 'Training Room', roles: null }],
    hooks: {
      statCap: (s) => TIERS[s.tier]?.statCap ?? 220,
      primaryStat: (s) => ROLES[s.role]?.primaryStat,
      slotCount: () => (st.debug ? Math.max(trainingPlaces(), 2) : trainingPlaces()),
      durationPct: () => trainingPct(), // (Milestone 23: WellSpring Training's shorter courses)
      canPay: (c) => (ledger.balance >= c.cost ? null : `Not enough Credits: it costs ${c.cost.toLocaleString('en-GB')}`),
      pay: (c, s) => ledger.economy.add('credits', -c.cost, `Training: ${c.name} (${s.name})`, 'training'),
      now: () => ({ day: today(), year: year() }),
      onComplete(s, c, gains) {
        const sp = courseById(c.id)?.specialty;
        const granted = sp && grantSpecialty(s, sp);
        onDone?.(s, c, gains, granted ? sp : null);
      },
    },
  });
  ts.load(st.training);
  const specialtiesOf = (id) => st.specialties[id] ?? [];
  const limitOf = (s) => SPECIALTY_LIMIT[s.tier] ?? 1;
  function grantSpecialty(s, sp) {
    const list = specialtiesOf(s.id);
    if (list.includes(sp) || list.length >= limitOf(s)) return false;
    st.specialties[s.id] = [...list, sp];
    return true;
  }
  // Why this person can't take this course now (null: they can).
  function courseBlock(courseId, staffId) {
    const c = courseById(courseId);
    const s = sys.get(staffId);
    if (!c || !s) return 'Unknown';
    if (!c.roles.includes(s.role)) return `Only for ${c.roles.map((r) => ROLES[r].short).join(' / ')}`;
    if (!ts.slotCount({ id: 'trainingRoom' })) return 'Needs a Training Room';
    return ts.courseBlock(courseId) ?? ts.workerBlock(courseId, staffId);
  }

  const staffing = {
    recruitment: rs,
    training: ts,
    state: st,
    // (Milestone 30: with the special arrival's card, if there is one)
    get board() {
      return rs.cards;
    },
    // Milestone 30: a staff secret found brings this named Legendary / Prestige person (never on an ordinary board): their
    // card waits on the board until hired. Once per run: a second call (a repaired reward, a reload) does nothing.
    arrive(defId) {
      const d = staffById(defId);
      if (!d || st.arrived.includes(d.id) || employed().has(d.id)) return false;
      st.arrived.push(d.id);
      st.arrivalQueue.push(d.id);
      nextArrival();
      return true;
    },
    get arrivals() {
      return [...st.arrived];
    },
    card: (id) => rs.get(id),
    get nextFreeDay() {
      return st.nextFree;
    },
    get cap() {
      return cap();
    },
    get debug() {
      return !!st.debug;
    },
    setDebug(on) {
      st.debug = !!on;
    },
    // Milestone 12: eligibility. ?debug=1 "Unlock Elite staff" counts as every Elite condition passing.
    eligible,
    get eliteUnlock() {
      return !!st.eliteUnlock;
    },
    setCapForDebug(n) {
      capDebug = n ?? null;
    },
    setEliteUnlock(on) {
      st.eliteUnlock = !!on;
    },
    // Everyone a board could offer now from the channels that are open, best tier first (never Legendary / Secret):
    // the ?debug=1 "Fill roster" button hires from this.
    eligibleNow() {
      const tiers = new Set(CHANNELS.filter((c) => channelState(c).ok).flatMap((c) => Object.keys(c.weights)));
      const emp = employed();
      const no = never();
      const order = ['elite', 'rare', 'standard'];
      return STAFF.filter((d) => tiers.has(d.tier) && !NEVER_TIERS.includes(d.tier) && !emp.has(d.id) && !no.has(d.id) && eligible(d).ok).sort((a, b) => order.indexOf(a.tier) - order.indexOf(b.tier));
    },
    // Hire straight from the pool (debug "Fill roster" only: the same rules as a card, without a board).
    takeDirect(defId) {
      const d = staffById(defId);
      if (!d || !eligible(d).ok) return { ok: false, reason: 'Not eligible', card: null };
      if (teamSize() >= cap()) return { ok: false, reason: `The team is at its cap (${cap()} at Rank ${rank()})`, card: null };
      if (employed().has(d.id) || never().has(d.id)) return { ok: false, reason: 'Not available', card: null };
      rs.board = rs.board.filter((c) => c.personId !== d.id);
      st.hires.push({ id: d.id, day: today(), channel: 'debug' });
      if (st.hires.length > 40) st.hires.shift();
      return { ok: true, reason: null, card: { ...cardOf(d), channel: 'debug' }, def: d };
    },
    channels: () => CHANNELS.map((c) => ({ channel: c, ...channelState(c) })),
    // A paid refresh from a channel (Credits through the ledger). The free one comes by itself every 56 days.
    refresh(channelId) {
      const c = CHANNELS.find((x) => x.id === channelId);
      if (!c) return { ok: false, reason: 'Unknown channel' };
      const open = channelState(c);
      if (!open.ok || c.id === 'special') return { ok: false, reason: open.reason ?? c.unlock.text };
      if (ledger.balance < c.cost) return { ok: false, reason: `Not enough Credits: a new board costs ${c.cost.toLocaleString('en-GB')}` };
      ledger.economy.add('credits', -c.cost, `Recruitment: ${c.name}`, 'recruit');
      refreshBoard(c.id, 'paid');
      return { ok: true, reason: null };
    },
    canHire(cardId) {
      const c = rs.get(cardId);
      if (!c) return { ok: false, reason: 'They are no longer on the board' };
      if (teamSize() >= cap()) return { ok: false, reason: `The team is at its cap (${cap()} at Rank ${rank()})` };
      if (employed().has(c.personId)) return { ok: false, reason: 'Already on the team' };
      return { ok: true, reason: null };
    },
    take(cardId) {
      const ok = staffing.canHire(cardId);
      if (!ok.ok) return { ...ok, card: null };
      const card = rs.take(cardId);
      st.hires.push({ id: card.personId, day: today(), channel: card.channel });
      if (st.hires.length > 40) st.hires.shift();
      if (card.channel === 'special') nextArrival();
      return { ok: true, reason: null, card, def: staffById(card.personId) };
    },
    // Someone left the team: on record (their Familiar Care stays in the care state), and back in the pool — never
    // the Founder (state.noCandidates).
    departed(model, day, founder = false) {
      ts.cancel(model.id);
      st.departed.push({ id: model.id, name: model.name, day, founder });
      if (st.departed.length > 40) st.departed.shift();
    },
    tick(day) {
      let refreshed = false;
      while (day >= st.nextFree) {
        st.nextFree += RECRUIT.freeRefreshDays;
        refreshed = true;
      }
      if (refreshed) refreshBoard(RECRUIT.freeChannel, 'free');
      ts.dailyTick();
      return { refreshed };
    },
    onTrained(fn) {
      onDone = fn;
    },
    // Every course for this person: can they take it now, what it would add (trimmed at the tier cap), the specialty.
    courses(staffId) {
      const s = sys.get(staffId);
      return COURSES.map((c) => {
        const reason = courseBlock(c.id, staffId);
        const preview = s ? ts.preview(c.id, staffId) : [];
        const capped = preview.some((p) => p.max < p.want);
        const sp = c.specialty;
        const has = specialtiesOf(staffId).includes(sp);
        const full = s && !has && specialtiesOf(staffId).length >= limitOf(s);
        return { course: c, ok: !reason, reason, preview, capped, specialty: sp, specialtyNote: has ? 'already has it' : full ? `specialty slots full (${limitOf(s)} for ${TIERS[s.tier].name})` : null };
      });
    },
    startCourse(courseId, staffId) {
      const reason = courseBlock(courseId, staffId);
      if (reason) return { ok: false, reason };
      return ts.start(courseId, staffId);
    },
    trainingOf: (staffId) => ts.trainingOf(staffId),
    cancelTraining: (staffId) => ts.cancel(staffId),
    specialtiesOf,
    specialtyLimit: (staffId) => (sys.get(staffId) ? limitOf(sys.get(staffId)) : 0),
    specialtyName: (id) => SPECIALTIES[id]?.name ?? id,
    serialize() {
      st.recruit = rs.serialize();
      st.training = ts.serialize();
      return st;
    },
  };
  return staffing;
}
