// Safe Coverage Points and the four-step fallback (Milestone 7, bible §14). Pure maths first (the roster sheet and the
// Node tests use them as they are), then the engine the home world ticks.
//
//   staffPoints(model, energy?) → points     (five stats + the primary stat again) / statsPerPoint × Energy factor
//   requiredPoints(shiftId, levels) → points  Σ Support Level weight × the shift's demand
//   assess({ shiftId, staff: [{ id, role, stats, energy }], levels, onCall, teamHasRN, clinicalHigh })
//     → { shift, required, provided, pct, rnOn, rnOk, onCallUsed, onCallOk, onCallPoints, safe, colour, reasons }
//     Milestone 10 fix: onCallOk = the shift's nurse-on-call switch is on, it allows one, there is an RN on the team,
//     the home is small enough (ON_CALL.maxResidents = levels.length) and nobody needs much clinical care
//     (clinicalHigh). Then the RN rule is met without an RN on shift and the call adds ON_CALL.coverPoints.
//
//   createCoverage({ state, roster, team, levels, ledger, abs, hire, log, bus })
//     state   the run's staff state (its coverage part: newCoverageState)
//     team()  the people on the team now (crew people: { id, name, role, model, agency? })
//     levels() the residents' Support Levels · ledger (src/systems/ledger.js) · abs() the game time now
//     hire(role, inst) → the agency person (the home world makes them walk in) · log(text) one coverage-log line
//   coverage.tick()                    each frame: warnings, shift starts (with the fallback), scale-back ends
//   coverage.assessInstance(inst, { projected }) · coverage.status() → one row per shift for the roster sheet
//   coverage.warnings() → the shifts short now or about to start short (the banner, Staff's red badge)
//   coverage.admissionsPaused() → reason | null · coverage.skipsActivity(day) → bool (the Cards activity)
//   coverage.recordMissed(n) · coverage.dayEnd(day)   care recovery: missed essential tasks, posted each day
import { SHIFTS, STAFF_BALANCE, SHORT_STAFFING, ON_CALL } from '../../data/balance.js';
import { SHIFT_IDS, COVERAGE as C, FALLBACK, AGENCY } from '../../data/shifts.js';
import { ROLES, STAT_IDS } from '../../data/roles.js';
import { BANDS, ROUTINE } from '../../data/routine.js';
import { clockText } from './residentNeeds.js';

const clamp = (x) => Math.max(0, Math.min(100, x));
const round1 = (x) => Math.round(x * 10) / 10;
const first = (name) => name.split(' ')[0];

export function staffPoints(model, energy = model.energy) {
  const primary = ROLES[model.role]?.primaryStat;
  const total = STAT_IDS.reduce((t, k) => t + (model.stats?.[k] ?? 0), 0) + (model.stats?.[primary] ?? 0);
  return (total / C.statsPerPoint) * (C.energyFloor + ((1 - C.energyFloor) * clamp(energy ?? 100)) / 100);
}
export const requiredPoints = (shiftId, levels) => levels.reduce((t, l) => t + (C.supportWeight[l] ?? l), 0) * SHIFTS[shiftId].demand;
export const colourOf = (pct) => (pct >= C.good ? 'good' : pct >= C.amber ? 'amber' : 'red');

export function assess({ shiftId, staff, levels, onCall = false, teamHasRN = false, clinicalHigh = false, wings = null }) {
  const t = SHIFTS[shiftId];
  const required = requiredPoints(shiftId, levels);
  const onCallOk = !!t.clinical?.onCall && !!onCall && teamHasRN && !clinicalHigh && levels.length <= (ON_CALL.maxResidents[shiftId] ?? Infinity);
  const onCallPoints = onCallOk ? ON_CALL.coverPoints : 0;
  const provided = staff.reduce((s, m) => s + staffPoints(m, m.energy), 0) + onCallPoints;
  const pct = required > 0 ? (provided / required) * 100 : 100;
  const rnOn = staff.some((m) => m.role === 'RN');
  const onCallUsed = !rnOn && onCallOk;
  const rnOk = !t.clinical?.rn || rnOn || onCallUsed;
  const reasons = [];
  if (pct < C.minimumPct) reasons.push(`${Math.round(pct)}% of the Safe Coverage Points it needs`);
  if (!rnOk) reasons.push(t.clinical?.onCall ? (clinicalHigh ? 'no Registered Nurse on shift (a resident needs clinical care)' : 'no Registered Nurse on shift or on call') : 'no Registered Nurse');
  // Milestone 24: per wing (wings = [{ id, name, levels }]; staff carry their wing — null for floats, agency and anyone
  // tied to no wing). Each wing's own staff count for its residents; the floats / agency / nurse-on-call pool then tops
  // up the wings short of the minimum, the shortest first. With one wing this is exactly the shift's own number.
  const byWing = wingBreakdown({ shiftId, staff, wings, pool0: onCallPoints });
  if (byWing.length > 1) for (const w of byWing) if (w.pct < C.minimumPct) reasons.push(`${w.name}: ${w.pct}% of its points`);
  return { shift: shiftId, required: round1(required), provided: round1(provided), pct: Math.round(pct), rnOn, rnOk, onCallUsed, onCallOk, onCallPoints, safe: !reasons.length, colour: colourOf(pct), reasons, wings: byWing };
}
// → [{ id, name, required, own, pooled, provided, pct, colour }] — only the wings with residents or staff on this shift.
export function wingBreakdown({ shiftId, staff, wings, pool0 = 0 }) {
  if (!wings?.length) return [];
  const rows = wings.map((w) => {
    const required = requiredPoints(shiftId, w.levels);
    const own = staff.filter((m) => m.wing === w.id).reduce((s, m) => s + staffPoints(m, m.energy), 0);
    return { id: w.id, name: w.name, required, own, pooled: 0 };
  });
  const known = new Set(rows.map((r) => r.id));
  let pool = pool0 + staff.filter((m) => !m.wing || !known.has(m.wing)).reduce((s, m) => s + staffPoints(m, m.energy), 0);
  // the pool covers the wings short of the minimum first (the biggest gap first), then whatever is left is spread by need
  const gap = (r) => Math.max(0, (r.required * C.minimumPct) / 100 - r.own - r.pooled);
  for (const r of [...rows].sort((a, b) => gap(b) - gap(a))) {
    const give = Math.min(pool, gap(r));
    r.pooled += give;
    pool -= give;
  }
  const need = rows.reduce((s, r) => s + r.required, 0);
  for (const r of rows) r.pooled += need > 0 ? (pool * r.required) / need : pool / rows.length;
  return rows
    .filter((r) => r.required > 0 || r.own > 0)
    .map((r) => {
      const provided = r.own + r.pooled;
      const pct = r.required > 0 ? Math.round((provided / r.required) * 100) : 100;
      return { id: r.id, name: r.name, required: round1(r.required), own: round1(r.own), pooled: round1(r.pooled), provided: round1(provided), pct, colour: colourOf(pct) };
    });
}

export function newCoverageState() {
  return { done: {}, warned: {}, history: [], log: [], unsafe: 0, skipCards: [], pausedUntil: null, missedToday: 0, agencyHired: 0, nextAgency: 1 };
}
export function ensureCoverageState(saved) {
  const s = { ...newCoverageState(), ...(saved ?? {}) };
  return { ...s, done: { ...s.done }, warned: { ...s.warned }, history: s.history.map((h) => ({ ...h, steps: [...(h.steps ?? [])] })), log: s.log.map((l) => ({ ...l })), skipCards: [...s.skipCards] };
}

// How far back from a shift's start its warning comes: the start of the band before the band it starts in (Night
// 22:00 → from 17:00; Morning 05:00 → from 17:00 the day before; Afternoon 12:00 → from 06:00).
export function warnLead(shiftId) {
  const from = SHIFTS[shiftId].from;
  const i = BANDS.findIndex((b) => (b.from < b.to ? from >= b.from && from < b.to : from >= b.from || from < b.to));
  const prev = BANDS[(i + BANDS.length - 1) % BANDS.length];
  return (from - prev.from + 24) % 24 || 24;
}
const ACTIVITY_AT = ROUTINE.find((s) => s.activity)?.at ?? 13.5;

// Milestone 24: wings() → [{ id, name, levels }] the residents' levels by wing (none: one Home wing — the shift's number)
export function createCoverage({ state, roster, team, levels, restBonus = null, wings = null, clinicalHigh = () => false, ledger, abs, hire, log: logLine = null, bus = null }) {
  const cs = state.coverage;
  const B = STAFF_BALANCE.energy;
  const dayOf = (t) => Math.floor(t / 24);
  function log(text, t = abs()) {
    cs.log.push({ day: dayOf(t), t: clockText(t - dayOf(t) * 24), text });
    if (cs.log.length > FALLBACK.logKept) cs.log.splice(0, cs.log.length - FALLBACK.logKept);
    logLine?.(text);
    bus?.emit('coverage:log', { text });
  }
  const person = (id) => team().find((p) => p.id === id) ?? null;
  const teamHasRN = () => team().some((p) => p.role === 'RN' && !p.agency);
  // Energy when the shift starts: now if they are working, else what the Staff Room rest brings by then.
  function energyAt(p, inst, projected) {
    const e = p.model.energy;
    if (!projected || roster.onShift(p.id)) return e;
    return clamp(e + B.restPerHour * (restBonus ? restBonus() : B.restSpotBonus) * Math.max(0, inst.start - abs())); // (Milestone 25c: the Staff Room's level)
  }
  function assessInstance(inst, { projected = false, without = null } = {}) {
    const staff = roster
      .peopleOn(inst)
      .filter((id) => id !== without)
      .map(person)
      .filter(Boolean)
      .map((p) => ({ id: p.id, role: p.role, stats: p.model.stats, energy: energyAt(p, inst, projected), wing: roster.isFloat(p.id) || roster.isAgency(p.id) ? null : roster.assignedWing?.(p.id) ?? null })); // (Milestone 24: floats and agency are the shared pool)
    const onCall = roster.onCallFor ? roster.onCallFor(inst.shift) : roster.onCall;
    return { ...assess({ shiftId: inst.shift, staff, levels: levels(), onCall, teamHasRN: teamHasRN(), clinicalHigh: clinicalHigh(), wings: wings?.() ?? null }), staff: staff.map((s) => s.id), inst };
  }
  const shiftName = (sid) => SHIFTS[sid].name;
  const warnFrom = (inst) => inst.start - warnLead(inst.shift);

  // Steps 2–4 when a shift starts under minimum.
  function startShift(inst) {
    cs.done[inst.key] = true;
    let a = assessInstance(inst);
    const rec = { key: inst.key, day: inst.day, shift: inst.shift, before: a.pct, rnOk: a.rnOk, steps: [], agency: 0 };
    const late = inst.end - abs() < FALLBACK.minHoursLeft; // (opened near its end: nothing to cover)
    if (!a.safe && !late) {
      // 2. floats on other shifts, still rested, move to cover (the best first)
      const floats = roster
        .floatsFor(inst)
        .map(person)
        .filter((p) => p && p.model.energy >= FALLBACK.floatRestedAt)
        .sort((x, y) => staffPoints(y.model) - staffPoints(x.model));
      for (const p of floats) {
        if (a.safe) break;
        roster.addCover(inst, p.id);
        rec.steps.push('float');
        log(`Float cover: ${first(p.name)} moves to the ${shiftName(inst.shift)} shift`);
        bus?.emit('coverage:float', { id: p.id, shift: inst.shift });
        a = assessInstance(inst);
      }
      // 3. agency cover while the ledger can pay (a nurse first when the RN rule fails)
      const fee = SHORT_STAFFING.agencyFeePerShift;
      while (!a.safe && rec.agency < FALLBACK.maxAgency) {
        if (ledger.balance < fee) {
          log(`No agency cover: the ${fee}-Credit fee is more than the home has`);
          break;
        }
        const role = a.rnOk ? 'CW' : 'RN';
        const p = hire(role, inst);
        ledger.economy.add('credits', -fee, `Agency cover: ${AGENCY[role].name} (${shiftName(inst.shift)} shift, day ${inst.day + 1})`, 'agency');
        rec.agency++;
        cs.agencyHired++;
        rec.steps.push('agency');
        log(`Agency cover: ${p.name} hired for the ${shiftName(inst.shift)} shift (−${fee} Credits)`);
        bus?.emit('coverage:agency', { id: p.id, role, shift: inst.shift, fee });
        a = assessInstance(inst);
      }
      // 4. still short: admissions pause until it ends and the next Cards activity is skipped
      if (!a.safe) {
        cs.pausedUntil = Math.max(cs.pausedUntil ?? 0, inst.end);
        const d = inst.day * 24 + ACTIVITY_AT >= inst.start ? inst.day : inst.day + 1;
        if (!cs.skipCards.includes(d)) cs.skipCards.push(d);
        rec.steps.push('scaleBack');
        log('Activities scaled back — short-staffed');
        if (!rec.agency) {
          cs.unsafe++;
          rec.steps.push('unsafe');
          log(`Unsafe shift: ${shiftName(inst.shift)} runs under minimum (${a.reasons.join(', ')})`);
        }
        bus?.emit('coverage:scaleBack', { shift: inst.shift, day: inst.day });
      }
    }
    Object.assign(rec, { after: a.pct, rnOkAfter: a.rnOk, safe: a.safe, required: a.required, provided: a.provided });
    cs.history.push(rec);
    if (cs.history.length > FALLBACK.historyKept) cs.history.splice(0, cs.history.length - FALLBACK.historyKept);
    bus?.emit('coverage:shift', rec);
    return rec;
  }

  const coverage = {
    state: cs,
    assessInstance,
    // Each frame, before the staff move: the warnings (step 1) and the shift starts (steps 2–4).
    tick() {
      const t = abs();
      for (const sid of SHIFT_IDS) {
        const cur = roster.instanceAt(sid, t);
        if (cur && !cs.done[cur.key]) startShift(cur);
        const nx = roster.nextInstance(sid, t);
        if (nx && t >= warnFrom(nx) && !cs.warned[nx.key]) {
          cs.warned[nx.key] = true;
          const a = assessInstance(nx, { projected: true });
          if (!a.safe) {
            log(`Warning: the ${shiftName(sid)} shift at ${clockText(SHIFTS[sid].from)} is short (${a.reasons.join(', ')})`);
            bus?.emit('coverage:warning', { shift: sid, key: nx.key });
          }
        }
      }
      // keep the bookkeeping small
      for (const k of Object.keys(cs.done)) if (Number(k.split(':')[0]) < dayOf(t) - 2) delete cs.done[k];
      for (const k of Object.keys(cs.warned)) if (Number(k.split(':')[0]) < dayOf(t) - 2) delete cs.warned[k];
      cs.skipCards = cs.skipCards.filter((d) => d >= dayOf(t) - 1);
      if (cs.pausedUntil != null && t >= cs.pausedUntil) cs.pausedUntil = null;
      roster.prune(t);
    },
    // One row per shift for the roster sheet: the instance running now, else the next one (projected Energy).
    status() {
      const t = abs();
      return SHIFT_IDS.map((sid) => {
        const cur = roster.instanceAt(sid, t);
        const inst = cur ?? roster.nextInstance(sid, t);
        return { ...assessInstance(inst, { projected: !cur }), running: !!cur };
      });
    },
    // Short now (after the fallback) or about to start short (from the band before): the banner and Staff's badge.
    warnings() {
      const t = abs();
      const out = [];
      for (const sid of SHIFT_IDS) {
        const cur = roster.instanceAt(sid, t);
        const rec = cur && cs.history.find((h) => h.key === cur.key);
        if (rec && !rec.safe) out.push({ ...assessInstance(cur), running: true }); // it started short and stayed short
        const nx = roster.nextInstance(sid, t);
        if (nx && t >= warnFrom(nx)) {
          const a = assessInstance(nx, { projected: true });
          if (!a.safe) out.push({ ...a, running: false });
        }
      }
      return out;
    },
    admissionsPaused: () => (cs.pausedUntil != null && abs() < cs.pausedUntil ? 'Admissions are paused: a shift is running short-staffed. They open again when it ends.' : null),
    skipsActivity: (day) => cs.skipCards.includes(day),
    // Care recovery: each missed essential task costs a little, posted at the end of the day (one ledger line).
    recordMissed(n = 1) {
      cs.missedToday += n;
    },
    dayEnd(day) {
      const n = cs.missedToday;
      cs.missedToday = 0;
      if (!n) return null;
      const cost = n * SHORT_STAFFING.careRecoveryPerMissed;
      return ledger.economy.add('credits', -cost, `Care recovery: ${n} missed essential task${n === 1 ? '' : 's'} (day ${day + 1})`, 'careRecovery');
    },
  };
  return coverage;
}
