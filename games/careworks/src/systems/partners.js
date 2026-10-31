// Community partners and grants (Milestone 23, bible §28 / §29). Data in data/partners.js; the home world feeds it what
// happens (the counters), asks it for perks and draws nothing here — so the Node tests run it as it is.
//
// Partners: one core/SponsorSystem per partner (so up to three deals can run side by side, one per slot), each with a
// 6-month deal, its perk and a countable obligation. Grants: core/ContractSystem (at most 2 active, a fresh board each
// month). Every obligation and goal is read from the counters log (care.partners.counters), which only ever holds what
// residents chose to join — never a reason to push anyone; a deal or a grant may simply go unmet.
//
//   ensurePartnerState(saved) · ruleProgress(rule, counters, { from, to, grant }) → { count, min, met }
//   environmentScore({ rooms, facilities, checks }) → { score, room, clean } · pilotFeeling(def, st)
//   createPartners({ care, ledger, bus, today, seed, hooks }) → api
//     hooks: rank() · score(name) → number | null · buildable(facilityId) · emergency() (Emergency Credit / an investor
//            taken) · allocate({ stay, count, tag }) · residents() → [{ id, name, def, state }] · log(residentId, text)
//     api.record(counter, info) · count(counter, from, to) · slots() · rank() · list() · offers() · active() ·
//     canSign(id) / sign(id) / decline(id) / cancel(id) → { ok, reason } · perk(key) · perksActive() · tierOf(id) ·
//     progressOf(id) · daily(day) · monthClosed(day) · noteRoomChecks(day, done, missed) · environment(rooms, facilities)
//     api.grants: board() · active() · done() · canAccept(id) · accept(id) / decline(id) → { ok, reason } · progressOf(c)
//     api.pilot: state · due(residentId, day) · door(residentId, day) · session(residentId, day) · answers()
//     api.setDebug(on) · debug · setRank(rank | null) · outingForDebug() · serialize()
import { SponsorSystem } from '../../../../core/SponsorSystem.js';
import { ContractSystem } from '../../../../core/ContractSystem.js';
import { Rng } from '../../../../core/Rng.js';
import { PARTNERS, partnerById, SLOTS, DEALS, TIERS, PILOT, GRANTS, grantById, GRANT_RULES, ENVIRONMENT, COUNTERS, LEDGER_CATS } from '../../data/partners.js';

const KEEP_DAYS = 400; // counters older than this are dropped (the longest deal or grant is 168 days)

export function ensurePartnerState(saved) {
  const s = saved ?? {};
  return {
    counters: Object.fromEntries(Object.keys(COUNTERS).map((k) => [k, [...(s.counters?.[k] ?? [])]])),
    deals: { ...(s.deals ?? {}) }, // partner id → its SponsorSystem state
    tiers: { ...(s.tiers ?? {}) }, // partner id → 0 Partner … 3 Strategic
    misses: { ...(s.misses ?? {}) }, // partner id → deals missed in a row
    history: [...(s.history ?? [])], // [{ id, startDay, endDay, result, tier, tierAfter }]
    nextOfferDay: s.nextOfferDay ?? null,
    grants: s.grants ?? null, // core/ContractSystem state (null: a board is made now)
    checks: [...(s.checks ?? [])], // [{ day, id, score, value, ok }] the month-close checks (the last few)
    env: [...(s.env ?? [])], // [{ day, done, missed }] room checks a day (the last ENVIRONMENT.days)
    pilot: s.pilot ?? null,
    perkSaved: { ...(s.perkSaved ?? {}) }, // partner id → Credits saved since the last month close (food)
    debug: !!s.debug,
    debugRank: s.debugRank ?? null,
  };
}

// How far a rule has got: a partner's obligation ({ type: 'count', signal, min }) or a grant's goal ({ counter, min,
// facilities?, stay? }) over the counters logged in [from, to). grant: a grant's id (an allocated admission counts only
// for the grant that sent them). An 'avoid' obligation is a monthly check, not a count: see progressOf.
export function ruleProgress(rule, counters, { from = -Infinity, to = Infinity, grant = null } = {}) {
  const key = rule.counter ?? rule.signal;
  const list = (counters[key] ?? []).filter((e) => e.day >= from && e.day < to && (!rule.facilities || rule.facilities.includes(e.facility)) && (!rule.stay || e.stay === rule.stay) && (key !== 'allocatedAdmission' || !grant || e.grant === grant));
  const min = rule.min ?? 1;
  return { count: list.length, min, met: list.length >= min };
}

// The Environment score (SPN07): half room quality (the rooms' template quality + a little for each comfort facility),
// half cleanliness (room checks done of those due over the last few days; none due: 100).
export function environmentScore({ rooms = [], facilities = [], checks = { done: 0, missed: 0 } }) {
  const E = ENVIRONMENT;
  const q = rooms.length ? rooms.reduce((t, id) => t + (E.roomQuality[id] ?? 70), 0) / rooms.length : 0;
  const bonus = Math.min(E.bonusCap, facilities.filter((id) => E.comfortFacilities.includes(id)).length * E.bonusPerFacility);
  const room = Math.min(100, q + bonus);
  const due = checks.done + checks.missed;
  const clean = due ? (100 * checks.done) / due : 100;
  return { score: Math.round((room + clean) / 2), room: Math.round(room), clean: Math.round(clean) };
}

// How a resident feels about trying the assistive tech: 'refuse' (their own preference), 'like', 'neutral', 'dislike'.
export function pilotFeeling(def, st) {
  if (st?.prefs?.pilot === 'refuse') return 'refuse';
  if (PILOT.likes.includes(def?.personality)) return 'like';
  if (PILOT.dislikes.includes(def?.personality)) return 'dislike';
  return 'neutral';
}

export function createPartners({ care, ledger, bus = null, today = () => 0, seed = 'careworks', hooks = {} }) {
  const st = (care.partners = ensurePartnerState(care.partners));
  const add = (amount, reason, cat) => (amount ? ledger.economy.add('credits', Math.round(amount), reason, cat) : null);

  // --- partners on core/SponsorSystem: one each ------------------------------------------------------------------------
  const locked = (d) => !!d.locked && !st.debug;
  const matches = (ob, payload) => (ob.type === 'avoid' ? payload.score === ob.score && payload.value < ob.min : true);
  const sponsors = {};
  for (const d of PARTNERS) {
    const sp = new SponsorSystem({ defs: [{ ...d, requirement: null, benefits: d.perks }], dealDays: DEALS.days, offerDays: DEALS.offerDays, cooldownDays: DEALS.cooldownDays, hooks: { eligible: (x) => !locked(x), matches } });
    sp.load(st.deals[d.id] ?? null);
    sponsors[d.id] = sp;
  }
  const tierOf = (id) => Math.max(0, Math.min(TIERS.length - 1, st.tiers[id] ?? 0));
  const rank = () => st.debugRank ?? hooks.rank?.() ?? 'E';
  const slots = () => SLOTS[rank()] ?? 1;
  const activeIds = () => PARTNERS.filter((d) => sponsors[d.id].active).map((d) => d.id);
  const openOffers = () => PARTNERS.flatMap((d) => sponsors[d.id].offers.map((o) => ({ def: d, offer: o })));
  if (st.nextOfferDay == null) st.nextOfferDay = today() + DEALS.firstOfferDays;

  // A deal's progress: a count ("Family reviews 2 / 3") or the month checks ("kept at 3 of 3 checks").
  function progressOf(id) {
    const d = partnerById(id);
    const a = sponsors[id]?.active;
    if (!d || !a) return null;
    const ob = d.obligation;
    if (ob.type === 'count') return { kind: 'count', count: a.count, min: ob.min, met: a.met, text: `${ob.label} ${Math.min(a.count, ob.min)} / ${ob.min}` };
    const c = a.checks ?? { n: 0, kept: 0, last: null };
    const now = hooks.score?.(ob.score) ?? null;
    return { kind: 'check', count: c.kept, min: Math.max(1, Math.round(DEALS.days / 28)), checks: c.n, last: c.last, now, met: a.met, broken: !!a.broken, text: `${ob.label} ${now == null ? '—' : Math.round(now)} (needs ${ob.min}+) · kept at ${c.kept} of ${c.n} month check${c.n === 1 ? '' : 's'}` };
  }
  function canSign(id) {
    const d = partnerById(id);
    const sp = sponsors[id];
    if (!d || !sp) return { ok: false, reason: 'No such partner' };
    if (sp.active) return { ok: false, reason: 'Already a partner' };
    if (!sp.offers.length) return { ok: false, reason: locked(d) ? d.locked.text : 'No offer from them right now' };
    if (activeIds().length >= slots()) return { ok: false, reason: `All partner slots are in use (Rank ${rank()}: ${slots()} slot${slots() === 1 ? '' : 's'})` };
    return { ok: true, reason: null };
  }
  function sign(id) {
    const c = canSign(id);
    if (!c.ok) return c;
    const day = today();
    const r = sponsors[id].sign(id, day);
    if (!r.ok) return r;
    r.deal.tier = tierOf(id);
    r.deal.checks = { n: 0, kept: 0, last: null };
    r.deal.paidTo = day; // (the partner's support, paid for the days the deal runs)
    const d = partnerById(id);
    const T = TIERS[tierOf(id)];
    if (d.pilot) startPilot(id);
    bus?.emit('partners:signed', { id, name: d.name, tier: T.name });
    return { ok: true, reason: null };
  }
  function decline(id) {
    const sp = sponsors[id];
    if (!sp?.offers.length) return { ok: false, reason: 'No offer from them' };
    sp.offers = [];
    return { ok: true, reason: null };
  }
  // Cancel anytime: the perk ends now; the tier stays as it is (it is not a miss).
  function cancel(id) {
    const sp = sponsors[id];
    if (!sp?.active) return { ok: false, reason: 'Not a partner now' };
    const a = sp.active;
    paySupport(id, a, today());
    const rec = sp.cancel(today());
    st.history.push({ ...rec, tier: a.tier ?? tierOf(id), tierAfter: tierOf(id) });
    flushPerk(id);
    stopPilot(id);
    bus?.emit('partners:ended', { id, result: 'cancelled' });
    return { ok: true, reason: null };
  }
  // A deal has run its 6 months: met → the tier goes up one; not met → no penalty, but the tier drops one after two
  // misses in a row.
  function endDeal(id, rec, a) {
    paySupport(id, a, rec.endDay);
    const before = tierOf(id);
    if (rec.result === 'met') {
      st.tiers[id] = Math.min(TIERS.length - 1, before + 1);
      hooks.reward?.('partner', { id, name: partnerById(id)?.name ?? id, tier: TIERS[st.tiers[id]].name }); // (Milestone 25c: the deal met — a new tier brings care equipment)
      st.misses[id] = 0;
    } else {
      st.misses[id] = (st.misses[id] ?? 0) + 1;
      if (st.misses[id] >= DEALS.missesToDrop) {
        st.tiers[id] = Math.max(0, before - 1);
        st.misses[id] = 0;
      }
    }
    st.history.push({ ...rec, tier: a.tier ?? before, tierAfter: tierOf(id) });
    if (st.history.length > 60) st.history.shift();
    flushPerk(id);
    stopPilot(id);
    bus?.emit('partners:ended', { id, result: rec.result, tier: TIERS[tierOf(id)].name });
  }
  // The partner's support for the days since it was last paid (at each month's close, and when the deal ends or is
  // cancelled): its tier's supportPerMonth a 28 days. Paid for days run, so signing and cancelling earns nothing.
  function paySupport(id, a, day) {
    const T = TIERS[a.tier ?? tierOf(id)];
    const days = Math.max(0, day - (a.paidTo ?? a.startDay));
    a.paidTo = day;
    add((T.supportPerMonth * days * (hooks.payMult?.() ?? 1)) / 28, `${LEDGER_CATS.partnerSupport}: ${partnerById(id).name} (${T.name}, ${days} day${days === 1 ? '' : 's'})`, 'partnerSupport');
  }
  // The perk's value now (every active deal's, × its tier).
  function perk(key) {
    let t = 0;
    for (const id of activeIds()) {
      const T = TIERS[sponsors[id].active.tier ?? tierOf(id)];
      for (const k of partnerById(id).perks) if (k.key === key) t += k.value * T.perkMult;
    }
    return Math.round(t * 10) / 10;
  }
  const perksActive = () => activeIds().flatMap((id) => partnerById(id).perks.map((k) => ({ def: partnerById(id), key: k.key, value: Math.round(k.value * TIERS[sponsors[id].active.tier ?? tierOf(id)].perkMult * 10) / 10, text: k.text })));
  // A saving the perks made on a cost: mode 'now' posts it as its own line at once (a build), else it is kept up for
  // the month and posted at the close (food, equipment, upkeep) — the cost line itself stays as it was.
  function noteSaving(key, cost, mode = 'month') {
    for (const id of activeIds()) {
      const k = partnerById(id).perks.find((x) => x.key === key);
      if (!k || !cost) continue;
      const pct = (-k.value * TIERS[sponsors[id].active.tier ?? tierOf(id)].perkMult) / 100;
      const amount = Math.abs(cost) * pct;
      if (mode === 'now') add(amount, `${LEDGER_CATS.partnerPerk}: ${partnerById(id).name} (${k.text})`, 'partnerPerk');
      else st.perkSaved[id] = (st.perkSaved[id] ?? 0) + amount;
    }
  }
  function flushPerk(id) {
    const v = st.perkSaved[id];
    delete st.perkSaved[id];
    if (v >= 1) add(v, `${LEDGER_CATS.partnerPerk}: ${partnerById(id).name} (${partnerById(id).perks.map((k) => k.text).join(', ')})`, 'partnerPerk');
  }

  // --- the counters ------------------------------------------------------------------------------------------------------------
  function record(counter, info = {}) {
    if (!st.counters[counter]) return;
    const day = today();
    st.counters[counter].push({ day, ...info });
    for (const id of activeIds()) sponsors[id].signal(counter, info, day);
    bus?.emit('partners:counted', { counter, info });
  }
  const count = (counter, from = -Infinity, to = Infinity) => (st.counters[counter] ?? []).filter((e) => e.day >= from && e.day < to).length;

  // --- grants on core/ContractSystem ----------------------------------------------------------------------------------------------
  const struggling = () => ledger.balance < GRANT_RULES.struggling.below || !!hooks.emergency?.();
  const grantOffered = (cs, id) => [...cs.offers, ...cs.active].some((c) => c.grantId === id);
  const grantProgress = (c) => ruleProgress(c.goal, st.counters, { from: c.acceptedDay ?? today(), grant: c.id });
  const grants = new ContractSystem({
    rng: new Rng(`${seed}:grants`),
    maxActive: GRANT_RULES.maxActive,
    offersPerMonth: GRANT_RULES.offersPerMonth,
    hooks: {
      generate(ctx, rng) {
        const can = GRANTS.filter((g) => !grantOffered(grants, g.id) && (!g.needs?.facility || st.debug || hooks.buildable?.(g.needs.facility)));
        if (!can.length) return null;
        const w = can.map((g) => (g.recovery && ctx.struggling ? GRANT_RULES.struggling.recoveryWeight : 1));
        let r = rng.next() * w.reduce((a, b) => a + b, 0);
        const g = can.find((_, i) => (r -= w[i]) < 0) ?? can.at(-1);
        return { grantId: g.id, name: g.name, deadlineDays: g.days, payOnAccept: g.payOnAccept, payOnComplete: g.payOnComplete, goal: { ...g.goal } };
      },
      check: (c) => {
        const p = grantProgress(c);
        return { ok: p.met, failures: p.met ? [] : [`${p.count} / ${p.min}`] };
      },
      onSuccess(c) {
        add(c.payOnComplete * (hooks.payMult?.() ?? 1), `${LEDGER_CATS.grants}: ${c.name} (goal met)`, 'grants'); // (Milestone 30b: Kaching's blessing — the advance on acceptance stays as it is, so handing it back matches)
        stopPilot(`grant:${c.id}`);
        bus?.emit('partners:grant', { id: c.id, name: c.name, status: 'done' });
        hooks.reward?.('grant', { id: c.id, name: c.name }); // (Milestone 25c: a grant goal met brings a piece of care equipment)
      },
      onFail(c, reason) {
        add(-c.payOnAccept, `${LEDGER_CATS.grants}: ${c.name} (the advance handed back unused — the goal wasn't met)`, 'grants');
        stopPilot(`grant:${c.id}`);
        bus?.emit('partners:grant', { id: c.id, name: c.name, status: reason });
      },
    },
  });
  function newBoard(day) {
    const R = GRANT_RULES;
    const s = struggling();
    grants.offersPerMonth = s ? R.struggling.offers : R.offersPerMonth;
    grants.monthStart({ struggling: s }, day);
  }
  if (st.grants) grants.load(st.grants);
  else newBoard(today()); // (a new home, or an M22 save: a first board, nothing active)
  function canAccept(id) {
    const c = grants.offers.find((x) => x.id === id);
    if (!c) return { ok: false, reason: 'No longer on offer' };
    if (!grants.canAccept) return { ok: false, reason: `At most ${GRANT_RULES.maxActive} grants at once` };
    return { ok: true, reason: null };
  }
  function acceptGrant(id) {
    const c0 = canAccept(id);
    if (!c0.ok) return c0;
    const r = grants.accept(id, today());
    if (!r.ok) return r;
    const c = r.contract;
    const g = grantById(c.grantId);
    add(c.payOnAccept, `${LEDGER_CATS.grants}: ${c.name} (on acceptance)`, 'grants');
    if (g.allocate) hooks.allocate?.({ stay: g.allocate.stay, count: g.allocate.count, tag: c.id });
    if (g.goal.counter === 'pilotDone') startPilot(`grant:${c.id}`);
    bus?.emit('partners:grant', { id: c.id, name: c.name, status: 'accepted' });
    return { ok: true, reason: null, contract: c };
  }
  function declineGrant(id) {
    const i = grants.offers.findIndex((x) => x.id === id);
    if (i < 0) return { ok: false, reason: 'No longer on offer' };
    const [c] = grants.offers.splice(i, 1);
    c.status = 'declined';
    return { ok: true, reason: null };
  }

  // --- the assistive-tech pilot (SPN08 and the technology-pilot grant) --------------------------------------------------------
  // Offered once to everyone here when it starts; each answers for themselves. Only those who say yes have sessions,
  // and on a session day they may still say no. Nobody is ever put in it.
  function startPilot(owner) {
    const day = today();
    const pl = st.pilot;
    if (pl && pl.doneDay == null && !pl.ended) {
      if (!pl.owners.includes(owner)) pl.owners.push(owner);
      return pl;
    }
    const answers = {};
    for (const p of hooks.residents?.() ?? []) {
      const feeling = pilotFeeling(p.def, p.state);
      const yes = feeling !== 'refuse' && new Rng(`${seed}:pilot:${p.id}:${day}:ask`).next() < PILOT.chance[feeling];
      answers[p.id] = { feeling, answer: yes ? 'yes' : 'no', sessions: 0, nextDay: day + 1 };
      hooks.log?.(p.id, yes ? 'Said yes to trying the assistive-tech pilot' : 'Chose not to try the assistive-tech pilot (their choice)');
    }
    st.pilot = { startDay: day, owners: [owner], answers, doneDay: null, completedBy: null, ended: false };
    bus?.emit('partners:pilot', { status: 'started', yes: Object.values(answers).filter((a) => a.answer === 'yes').length });
    return st.pilot;
  }
  function stopPilot(owner) {
    const pl = st.pilot;
    if (!pl || pl.ended) return;
    pl.owners = pl.owners.filter((o) => o !== owner);
    if (!pl.owners.length) pl.ended = true;
  }
  const pilotLive = () => !!st.pilot && !st.pilot.ended && st.pilot.doneDay == null;
  const pilot = {
    get state() {
      return st.pilot;
    },
    live: pilotLive,
    // A session is due for them today (they said yes, sessions left, the gap since the last one).
    due(residentId, day) {
      const a = pilotLive() ? st.pilot.answers[residentId] : null;
      return !!a && a.answer === 'yes' && a.sessions < PILOT.sessions && day >= a.nextDay;
    },
    // On the day: still a yes? (a seeded answer: a reload never changes it)
    door(residentId, day) {
      const a = st.pilot?.answers[residentId];
      if (!a || a.answer !== 'yes') return false;
      return new Rng(`${seed}:pilot:${residentId}:${day}:door`).next() < Math.max(PILOT.chance[a.feeling] ?? 0, PILOT.chance.neutral);
    },
    skipped(residentId, day) {
      const a = st.pilot?.answers[residentId];
      if (a) a.nextDay = day + 1;
    },
    // A session done; the pilot is complete when one of them has had every session.
    session(residentId, day) {
      const a = st.pilot?.answers[residentId];
      if (!a || !pilotLive()) return false;
      a.sessions += 1;
      a.nextDay = day + PILOT.everyDays;
      if (a.sessions < PILOT.sessions) return false;
      st.pilot.doneDay = day;
      st.pilot.completedBy = residentId;
      record('pilotDone', { resident: residentId });
      bus?.emit('partners:pilot', { status: 'done', resident: residentId });
      return true;
    },
    answers: () => Object.entries(st.pilot?.answers ?? {}).map(([id, a]) => ({ id, ...a })),
  };

  // --- each day, each month ------------------------------------------------------------------------------------------------------
  function newOffer(day) {
    if (day < st.nextOfferDay || activeIds().length >= slots() || openOffers().length >= DEALS.maxOffers) return null;
    st.nextOfferDay = day + DEALS.offerEveryDays;
    const can = PARTNERS.filter((d) => sponsors[d.id].offerable(day).length);
    if (!can.length) return null;
    const d = new Rng(`${seed}:partners:${day}`).pick(can);
    const o = sponsors[d.id].offer(d.id, day);
    if (o) bus?.emit('partners:offered', { id: d.id, name: d.name });
    return o;
  }
  function daily(day) {
    for (const d of PARTNERS) {
      const sp = sponsors[d.id];
      const a = sp.active;
      const rec = sp.dailyTick(day);
      if (rec) endDeal(d.id, rec, a);
    }
    newOffer(day);
    for (const c of [...grants.active]) if (grantProgress(c).met) grants.deliver(c.id, null, day);
    grants.dailyTick(day); // (past its deadline and not met: it simply ends — nothing is lost)
    for (const k of Object.keys(st.counters)) if (st.counters[k].length && st.counters[k][0].day < day - KEEP_DAYS) st.counters[k] = st.counters[k].filter((e) => e.day >= day - KEEP_DAYS);
  }
  // The month's close: each deal's month check (Nutrition, Environment), the perks' savings, a new grant board.
  function monthClosed(day) {
    for (const id of activeIds()) {
      const a = sponsors[id].active;
      const ob = partnerById(id).obligation;
      if (ob.type === 'avoid') {
        const value = hooks.score?.(ob.score) ?? null;
        const ok = value == null || value >= ob.min;
        a.checks = { n: (a.checks?.n ?? 0) + 1, kept: (a.checks?.kept ?? 0) + (ok ? 1 : 0), last: value == null ? null : Math.round(value) };
        st.checks.push({ day, id, score: ob.score, value: value == null ? null : Math.round(value), ok });
        if (st.checks.length > 24) st.checks.shift();
        if (!ok) sponsors[id].signal('monthCheck', { score: ob.score, value }, day);
      }
      flushPerk(id);
      paySupport(id, a, day);
    }
    newBoard(day);
  }
  function noteRoomChecks(day, done, missed) {
    st.env.push({ day, done, missed });
    while (st.env.length > ENVIRONMENT.days) st.env.shift();
  }
  const roomChecks = () => st.env.reduce((t, e) => ({ done: t.done + e.done, missed: t.missed + e.missed }), { done: 0, missed: 0 });

  return {
    state: st,
    sponsors,
    record,
    count,
    rank,
    slots,
    tierOf,
    tierName: (id) => TIERS[tierOf(id)].name,
    // Every partner as the sheet shows it: { def, tier, active (the deal or null), offer, progress, locked, misses }
    list: () => PARTNERS.map((d) => ({ def: d, tier: TIERS[tierOf(d.id)], active: sponsors[d.id].active, offer: sponsors[d.id].offers[0] ?? null, progress: progressOf(d.id), locked: locked(d) ? d.locked.text : null, misses: st.misses[d.id] ?? 0, daysLeft: sponsors[d.id].daysLeft(today()) })),
    offers: openOffers,
    active: () => activeIds().map((id) => ({ def: partnerById(id), deal: sponsors[id].active, tier: TIERS[sponsors[id].active.tier ?? tierOf(id)], progress: progressOf(id), daysLeft: sponsors[id].daysLeft(today()) })),
    progressOf,
    canSign,
    sign,
    decline,
    cancel,
    perk,
    perksActive,
    noteSaving,
    daily,
    monthClosed,
    noteRoomChecks,
    roomChecks,
    history: (n = 8) => st.history.slice(-n),
    grants: {
      system: grants,
      board: () => grants.offers,
      active: () => grants.active,
      done: (n = 6) => grants.done.filter((c) => c.status !== 'expired' && c.status !== 'declined').slice(-n),
      canAccept,
      accept: acceptGrant,
      decline: declineGrant,
      progressOf: (c) => grantProgress(c),
      struggling,
      newBoardForTests: () => newBoard(today()),
      // Tests and ?debug=1: this grant type on the board now. → the offer
      offerForTests(grantId) {
        const g = grantById(grantId);
        if (!g) return null;
        const c = grants._make({ grantId: g.id, name: g.name, deadlineDays: g.days, payOnAccept: g.payOnAccept, payOnComplete: g.payOnComplete, goal: { ...g.goal } }, null, today());
        grants.offers.push(c);
        return c;
      },
    },
    pilot,
    get debug() {
      return st.debug;
    },
    // ?debug=1: locked partners (SPN06) and grants that need a facility are allowed; a stub outing can be counted.
    setDebug(on) {
      st.debug = !!on;
    },
    setRank(r) {
      st.debugRank = r && SLOTS[r] ? r : null;
    },
    outingForDebug() {
      if (!st.debug) return { ok: false, reason: 'Debug only' };
      record('outing', { stub: true });
      return { ok: true, reason: null };
    },
    serialize() {
      for (const d of PARTNERS) st.deals[d.id] = sponsors[d.id].serialize();
      st.grants = grants.serialize();
      return st;
    },
  };
}
