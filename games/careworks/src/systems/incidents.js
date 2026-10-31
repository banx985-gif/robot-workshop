// Incidents, outbreaks and emergencies (Milestone 25, bible §30): the home's Preparedness, the seven bounded templates
// (data/incidents.js) — when one may start, its severity band, the player's response (or the home's own when no choice
// comes in time), its end and the after-report — the emergency supplies, and the falls record. What each event does in
// the home (who is unwell, which facility is out, who is off sick, the extra tasks) is the home world's: it gets the
// event through hooks and reads its numbers back. Pure enough for the Node tests.
//
//   preparedness(inputs) → { score, parts: [{ key, name, value, max, raise, detail }] }
//     inputs: { infection, leads (staff with those specialties), hub (F33 placed), supplies (0–100), floats,
//               shiftsOver (shifts above the reserve line), shifts, environment (0–100 | null), research: Set }
//   bandFor(score, template) → 'mild' | 'moderate' | 'severe' · fallChance(risk) → a day
//   ensureIncidents(saved, { startDay }) → care.incidents
//   createIncidents({ state, ledger, bus, seed, abs, today, month, hooks })
//     hooks: prepInputs() · begin(ev) → bool (false: it can't happen in this home now) · end(ev) · respond(ev, r, by)
//            → { ok, reason } · need(key) → bool · cost(kind, ev) → Credits · log(text)
//   inc.daily(day) · inc.tick(at) · inc.start(id, { band?, at? }) (tests and ?debug=1) · inc.respond(id, by)
//   inc.canRespond(id) → { ok, reason, cost } · inc.active · inc.prep() · inc.reports() · inc.markSeen(id)
//   inc.supplies: { stock, plan, setPlan(id), topUp() } · inc.history() · inc.noteFall(rec) · inc.falls()
import { INCIDENTS, incidentById, LIMITS, PREPAREDNESS as P, SEVERITY, SUPPLIES, FALLS_INCIDENT, seasonOf, RESPONSE_NEEDS, LEDGER_CATEGORY } from '../../data/incidents.js';
import { Rng } from '../../../../core/Rng.js';
import { scaleBonus } from '../../data/facilities.js';

const clamp = (x, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, x));
const r1 = (x) => Math.round(x * 10) / 10;

// --- Preparedness ----------------------------------------------------------------------------------------------------
export function preparedness({ infection = 0, leads = 0, hub = false, supplies = 0, floats = 0, shiftsOver = 0, shifts = 3, environment = null, research = new Set() } = {}) {
  const parts = [];
  const training = Math.min(P.training.infectionMax, infection * P.training.perInfection) + Math.min(P.training.leadMax, leads * P.training.perLead);
  parts.push({ key: 'training', name: P.training.name, value: Math.min(P.training.max, training), max: P.training.max, raise: P.training.raise, detail: `${infection} with Infection Control, ${leads} with Leadership` });
  parts.push({ key: 'hub', name: P.hub.name, value: hub ? P.hub.max : 0, max: P.hub.max, raise: P.hub.raise, level: hub ? +hub : 0, detail: hub ? `placed: every event’s impact −${Math.round((1 - scaleBonus(SEVERITY.hubMult, +hub)) * 100)}%` : 'not built' }); // (Milestone 25c: hub = its level ×)
  parts.push({ key: 'supplies', name: P.supplies.name, value: r1((clamp(supplies) / 100) * P.supplies.max), max: P.supplies.max, raise: P.supplies.raise, detail: `stock ${Math.round(supplies)} / 100` });
  const reserve = Math.min(P.reserve.floatsMax, floats * P.reserve.perFloat) + (shifts ? (P.reserve.shiftsMax * Math.min(shiftsOver, shifts)) / shifts : 0);
  parts.push({ key: 'reserve', name: P.reserve.name, value: r1(Math.min(P.reserve.max, reserve)), max: P.reserve.max, raise: P.reserve.raise, detail: `${floats} float${floats === 1 ? '' : 's'}, ${shiftsOver} of ${shifts} shifts above ${P.reserve.overPct}%` });
  const env = environment == null ? 0 : (clamp(environment, P.environment.from, P.environment.to) - P.environment.from) / (P.environment.to - P.environment.from);
  parts.push({ key: 'environment', name: P.environment.name, value: r1(env * P.environment.max), max: P.environment.max, raise: P.environment.raise, detail: environment == null ? 'no score yet' : `Environment ${Math.round(environment)}` });
  const done = Object.keys(P.research.nodes).filter((id) => research.has(id));
  parts.push({ key: 'research', name: P.research.name, value: done.reduce((t, id) => t + P.research.nodes[id], 0), max: P.research.max, raise: P.research.raise, detail: done.length ? `done: ${done.join(', ')}` : 'none yet' });
  return { score: Math.round(parts.reduce((t, x) => t + x.value, 0)), parts };
}
export function bandFor(score, tpl = null) {
  const L = { ...SEVERITY, ...(tpl?.severity ?? {}) };
  return score < L.severeBelow ? 'severe' : score < L.moderateBelow ? 'moderate' : 'mild';
}
// A resident's chance of a fall in a day, from their Milestone 16 falls risk.
export const fallChance = (risk) => (clamp(risk) / 100) * FALLS_INCIDENT.perDayAtRisk100;

// A response's cost in Credits now (a number in data, or the M18 fee / the repair the band sets).
function costOf(r, ev, hooks) {
  if (typeof r.cost === 'number') return r.cost;
  if (r.cost === 'repair') return ev.params.repair ?? 0;
  return hooks.cost?.(r.cost, ev) ?? 0;
}

export function newIncidentState(startDay = 0) {
  return { startDay, active: null, history: [], cooldowns: {}, lastEnd: null, nextId: 1, supplies: { stock: SUPPLIES.start, plan: 'none', owedDays: 0, paidTo: startDay }, falls: [], fallCount: 0, debug: false };
}
export function ensureIncidents(saved, { startDay = 0 } = {}) {
  const s = saved ?? newIncidentState(startDay);
  const d = newIncidentState(s.startDay ?? startDay);
  return { ...d, ...s, supplies: { ...d.supplies, ...(s.supplies ?? {}) }, cooldowns: { ...(s.cooldowns ?? {}) }, history: [...(s.history ?? [])], falls: [...(s.falls ?? [])] };
}

export function createIncidents({ state, ledger, bus = null, seed = 'careworks', abs = () => 0, today = () => 0, month = () => 1, hooks = {} }) {
  const S = state;
  const say = (ev, text) => {
    ev.log.push({ at: abs(), text });
    hooks.log?.(text);
  };
  const prep = () => preparedness(hooks.prepInputs?.() ?? {});
  // Scale a band's numbers: F33 makes every continuous impact × SEVERITY.hubMult (counts and days stay the band's).
  const impact = (ev, key) => (ev.params[key] ?? 0) * ev.mult;

  function begin(tpl, { band = null, at = abs(), forced = false } = {}) {
    if (S.active) return { ok: false, reason: `${S.active.name} is still under way` };
    const pr = prep();
    const b = band ?? bandFor(pr.score, tpl);
    const params = { ...tpl.bands[b] };
    const hubPart = pr.parts.find((x) => x.key === 'hub');
    const hub = hubPart.value > 0;
    const day = Math.floor(at / 24);
    const ev = { id: `inc${S.nextId++}`, kind: tpl.id, name: tpl.name, band: b, prep: { score: pr.score, parts: pr.parts.map((x) => ({ key: x.key, name: x.name, value: x.value, max: x.max })) }, start: at, day, end: at + params.days * 24, params, mult: hub ? scaleBonus(SEVERITY.hubMult, hubPart.level || 1) : 1, hub, response: null, by: null, respondedAt: null, autoAt: at + LIMITS.autoHours, restored: false, targets: { residents: [], staff: [], facilities: [], resident: null, alert: null }, spent: 0, stats: {}, log: [], forced };
    const ok = hooks.begin?.(ev) ?? true;
    if (!ok) {
      S.nextId--;
      return { ok: false, reason: 'It can’t happen in this home right now' };
    }
    // the supplies it uses (a smaller dip in a milder band)
    const used = Math.min(S.supplies.stock, tpl.uses * SUPPLIES.bandUse[b]);
    S.supplies.stock = r1(S.supplies.stock - used);
    ev.stats.suppliesUsed = r1(used);
    S.active = ev;
    say(ev, `${tpl.name} (${SEVERITY.names[b].toLowerCase()}, Preparedness ${pr.score})`);
    bus?.emit('care:incident', { id: ev.id, kind: ev.kind, name: ev.name, band: b });
    return { ok: true, ev };
  }

  function canRespond(id) {
    const ev = S.active;
    if (!ev) return { ok: false, reason: 'Nothing under way' };
    const r = incidentById(ev.kind).responses.find((x) => x.id === id);
    if (!r) return { ok: false, reason: 'No such response' };
    if (ev.response) return { ok: false, reason: `Already chosen: ${ev.response.name.toLowerCase()}` };
    if (r.needs && !hooks.need?.(r.needs)) return { ok: false, reason: RESPONSE_NEEDS[r.needs] };
    return { ok: true, reason: null, cost: costOf(r, ev, hooks) };
  }
  // Choose a response (by 'player', or 'auto': the home's own choice when none came in time). Credits only, never
  // anything else; the balance may go below 0 (Milestone 22's debt recovery is there for that).
  function respond(id, by = 'player') {
    const c = canRespond(id);
    if (!c.ok) return c;
    const ev = S.active;
    const tpl = incidentById(ev.kind);
    const r = tpl.responses.find((x) => x.id === id);
    const out = hooks.respond?.(ev, r, by) ?? { ok: true };
    if (!out.ok) return out;
    if (c.cost && !r.m18) {
      ledger?.economy.add('credits', -c.cost, `${tpl.name}: ${r.name.toLowerCase()}`, LEDGER_CATEGORY);
      ev.spent += c.cost;
    } else if (c.cost) ev.spent += c.cost; // (the M18 service posts its own fee, under Clinician and hospital)
    ev.response = { id: r.id, name: r.name, cost: c.cost };
    ev.by = by;
    ev.respondedAt = abs();
    if (r.impactMult) ev.mult *= r.impactMult;
    const left = ev.end - ev.respondedAt;
    if (r.daysMult) ev.end = ev.respondedAt + Math.max(2, left * r.daysMult);
    if (r.days) ev.end = Math.min(ev.end, ev.respondedAt + r.days * 24);
    if (r.restore) ev.restored = true;
    say(ev, `${by === 'auto' ? 'The home chose' : 'Chosen'}: ${r.name.toLowerCase()}${c.cost ? ` (${c.cost} Credits)` : ''}`);
    bus?.emit('care:incidentResponse', { id: ev.id, response: r.id, by });
    return { ok: true, reason: null, cost: c.cost };
  }

  // The after-report: what happened (the world's stats), what helped (the parts of Preparedness the template names),
  // and what would help next time.
  function report(ev) {
    const tpl = incidentById(ev.kind);
    const parts = ev.prep.parts.filter((x) => tpl.helps.includes(x.key));
    const helped = parts.filter((x) => Math.round(x.value) > 0).map((x) => `${x.name} (+${Math.round(x.value)})`);
    if (ev.hub) helped.push('the Emergency Preparedness Hub (impact −15%)');
    if (ev.response) helped.push(`${ev.by === 'auto' ? 'the home’s own choice' : 'your choice'}: ${ev.response.name.toLowerCase()}`);
    const next = parts.filter((x) => x.value < x.max).sort((a, b) => b.max - b.value - (a.max - a.value)).slice(0, 2).map((x) => P[x.key].raise);
    return { lines: hooks.reportLines?.(ev) ?? [], helped, next };
  }
  function end(at = abs()) {
    const ev = S.active;
    if (!ev) return null;
    hooks.end?.(ev);
    const day = Math.floor(at / 24);
    const rec = { id: ev.id, kind: ev.kind, name: ev.name, band: ev.band, prep: ev.prep.score, start: ev.start, end: at, days: r1((at - ev.start) / 24), response: ev.response, by: ev.by, spent: ev.spent, stats: ev.stats, report: report(ev), seen: false, forced: ev.forced };
    S.history = [...S.history, rec].slice(-LIMITS.historyKeep);
    S.cooldowns[ev.kind] = day;
    S.lastEnd = day;
    S.active = null;
    say(ev, `${ev.name}: over`);
    bus?.emit('care:incidentEnd', { id: ev.id, kind: ev.kind, name: ev.name });
    return rec;
  }

  // Which template (if any) starts today: past the quiet days, nothing under way, the gap since the last one, each
  // template's cooldown and season; one seeded roll a day against the templates' chances added up.
  function eligible(day) {
    if (S.active || day - S.startDay < LIMITS.quietDays) return [];
    if (S.lastEnd != null && day - S.lastEnd < LIMITS.gapDays) return [];
    const season = seasonOf(month(day));
    return INCIDENTS.map((t) => ({ t, p: t.window.chance * (t.window.seasons?.[season] ?? 1) })).filter(({ t, p }) => p > 0 && !(S.cooldowns[t.id] != null && day - S.cooldowns[t.id] < t.window.cooldown));
  }
  function pick(day) {
    const list = eligible(day);
    if (!list.length) return null;
    let x = new Rng(`${seed}:incident:${day}`).next();
    for (const { t, p } of list) {
      if (x < p) return t;
      x -= p;
    }
    return null;
  }
  // The emergency supplies: the standing order tops the stock up (paid weekly); without one it runs down slowly.
  function suppliesDay(day) {
    const sp = S.supplies;
    const plan = SUPPLIES.plans.find((p) => p.id === sp.plan) ?? SUPPLIES.plans[0];
    if (plan.level > 0) {
      sp.stock = r1(Math.min(Math.max(sp.stock, Math.min(plan.level, sp.stock + SUPPLIES.refillPerDay)), 100));
      sp.owedDays = (sp.owedDays ?? 0) + 1;
    } else sp.stock = r1(Math.max(0, sp.stock - SUPPLIES.fadePerDay));
    if (sp.owedDays >= 7 || (plan.level === 0 && sp.owedDays > 0)) payOwed(day);
  }
  function payOwed(day) {
    const sp = S.supplies;
    const days = sp.owedDays ?? 0;
    sp.owedDays = 0;
    sp.paidTo = day;
    const plan = SUPPLIES.plans.find((p) => p.id === sp.plan) ?? SUPPLIES.plans[0];
    const cost = Math.round((plan.perWeek * days) / 7);
    if (cost > 0) ledger?.economy.add('credits', -cost, `Emergency supplies: ${plan.name.toLowerCase()} (${days} day${days === 1 ? '' : 's'})`, LEDGER_CATEGORY);
  }

  let quiet = false; // (tests only: an older milestone's measurement without random events — setQuietForTests)
  const inc = {
    state: S,
    setQuietForTests: (on) => (quiet = !!on),
    get active() {
      return S.active;
    },
    prep,
    impact,
    canRespond,
    respond,
    responses() {
      const ev = S.active;
      if (!ev) return [];
      return incidentById(ev.kind).responses.map((r) => ({ ...r, can: canRespond(r.id), cost: costOf(r, ev, hooks) }));
    },
    // Start one now (tests, and the ?debug=1 trigger): it still follows "one at a time".
    start(id, opts = {}) {
      const tpl = incidentById(id);
      if (!tpl) return { ok: false, reason: 'No such event' };
      return begin(tpl, { ...opts, forced: true });
    },
    daily(day) {
      suppliesDay(day);
      const tpl = quiet ? null : pick(day);
      if (tpl) {
        // a seeded time in the day's waking hours (07:00–19:00)
        const at = day * 24 + 7 + new Rng(`${seed}:incidentAt:${day}`).next() * 12;
        S.pending = { kind: tpl.id, at };
      }
    },
    tick(at = abs()) {
      if (S.pending && at >= S.pending.at) {
        const p = S.pending;
        S.pending = null;
        begin(incidentById(p.kind), { at });
      }
      const ev = S.active;
      if (!ev) return;
      hooks.during?.(ev, at);
      if (!ev.response && at >= ev.autoAt) {
        const tpl = incidentById(ev.kind);
        if (!respond(tpl.auto, 'auto').ok) ev.autoAt = at + 1; // (never expected: the auto response needs nothing)
      }
      if (S.active === ev && at >= ev.end) end(at);
    },
    end,
    eligible,
    reports: () => S.history.filter((h) => !h.seen),
    markSeen(id) {
      const h = S.history.find((x) => x.id === id);
      if (h) h.seen = true;
    },
    history: () => S.history,
    supplies: {
      get stock() {
        return S.supplies.stock;
      },
      get plan() {
        return SUPPLIES.plans.find((p) => p.id === S.supplies.plan) ?? SUPPLIES.plans[0];
      },
      setPlan(id) {
        if (!SUPPLIES.plans.some((p) => p.id === id)) return { ok: false, reason: 'No such plan' };
        if (S.supplies.owedDays) payOwed(today()); // (the days on the old order are paid at its rate)
        S.supplies.plan = id;
        return { ok: true };
      },
      topUp() {
        const T = SUPPLIES.topUp;
        if (S.supplies.stock >= 100) return { ok: false, reason: 'Fully stocked' };
        S.supplies.stock = Math.min(100, S.supplies.stock + T.points);
        ledger?.economy.add('credits', -T.cost, 'Emergency supplies: a one-off top-up', LEDGER_CATEGORY);
        return { ok: true, cost: T.cost };
      },
    },
    // falls (kept for the Emergency tab and later milestones)
    noteFall(rec) {
      S.fallCount = (S.fallCount ?? 0) + 1;
      S.falls = [...S.falls, rec].slice(-FALLS_INCIDENT.keep);
    },
    falls: () => S.falls,
  };
  return inc;
}
