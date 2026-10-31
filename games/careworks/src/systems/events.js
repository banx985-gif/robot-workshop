// The event director (Milestone 28, bible §33): one calm place for every moment the home raises. Pure rules on plain state
// (care.events), so the Node tests drive it exactly as the page does. It never changes what happens in the home — only
// how and when a moment is shown, and the Inbox lines it leaves.
//
//   createEvents({ state, seed, now, today, resolved, onMoment })
//     now() → game hours since day 0 · today() → game day · resolved(choice) → true once the choice's own system has
//     settled it (answered, or its own timer took its kind default) · onMoment(residentId, kind, text) (Memory Book)
//   ev.raise(name, payload)        a bus event from the home (data/events.js KINDS) → its Inbox line, a beat or a choice
//   ev.daily(day, input)           the new categories (life stories, friendships, staff milestones, care-plan reviews)
//   ev.tick()                      each frame: a waiting choice settled on its own leaves the queue; stale beats drop
//   ev.uiTick(realDt, ui) → the moment on screen now ({ uid, weight, title, text, art, good, choice, payload }) or null
//                                  ui = { home, sheet (a sheet or Build Mode is open), popup (a dialog or the memorial) }
//   ev.later(uid) · ev.ack(uid)    the player has seen the choice (Open / Later) · the memorial moment acknowledged
//   ev.dismiss(uid)                a beat closed early (a tap)
//   ev.lines() · ev.unread() · ev.markRead(uid) · ev.markAllRead() · ev.grouped() → [{ cat, lines }] newest first
//   ev.active · ev.waiting · ev.showing · ev.audit (tests: every show and choice, never saved) · ev.dayCounts(day)
// Caps are data (data/events.js CAPS) and read game time, so 2× and 4× are never a flood.
import { Rng } from '../../../../core/Rng.js';
import { KINDS, CAPS, INBOX, NEW_EVENTS, categoryById } from '../../data/events.js';

export function newEventsState(day = 0) {
  return {
    rng: null, // the director's own stream (core/Rng state), saved: a reload replays the same rolls
    nextUid: 1,
    lines: [], // the Inbox log: [{ uid, day, at, cat, kind, text, good, opens, read }] newest last
    queue: [], // beats waiting: [{ uid, weight, cat, kind, title, text, art, good, opens, at, day, haptic }]
    waiting: [], // choices waiting their turn: [{ uid, cat, kind, title, text, choice, prio, at, payload }]
    active: null, // the one choice in play: { …, since, seen }
    showing: null, // what is on screen: { uid, weight, left (real seconds), … }
    last: { bigDay: null, medium: null, quiet: null, cat: {} }, // game hours (bigDay: a game day)
    seen: { friends: {}, stories: {}, joins: {}, lastMissed: null, cleanYear: null, start: day, review: null }, // the new categories
    days: {}, // per game day counts (the long-run report): { big, medium, quiet, lines, choices, maxWaiting }
    settled: [], // choices that settled while waiting (their own default), last 20
  };
}
export function ensureEventsState(saved, day = 0) {
  const fresh = newEventsState(day);
  if (!saved || typeof saved !== 'object') return fresh;
  return { ...fresh, ...saved, lines: [...(saved.lines ?? [])], queue: [...(saved.queue ?? [])], waiting: [...(saved.waiting ?? [])], last: { ...fresh.last, ...(saved.last ?? {}), cat: { ...(saved.last?.cat ?? {}) } }, seen: { ...fresh.seen, ...(saved.seen ?? {}), friends: { ...(saved.seen?.friends ?? {}) }, stories: { ...(saved.seen?.stories ?? {}) }, joins: { ...(saved.seen?.joins ?? {}) } }, days: { ...(saved.days ?? {}) }, settled: [...(saved.settled ?? [])] };
}

export function createEvents({ state, seed = 'careworks', now = () => 0, today = () => 0, resolved = () => false, onMoment = null }) {
  const s = state;
  const rng = new Rng(`${seed}:events`);
  if (s.rng != null) rng.state = s.rng;
  const roll = () => {
    const v = rng.next();
    s.rng = rng.state;
    return v;
  };
  const audit = []; // (tests: every show / choice with what else was up; never saved)
  const dayOf = () => (s.days[today()] ??= { big: 0, medium: 0, quiet: 0, lines: 0, choices: 0, maxWaiting: 0 });
  const prioOf = (cat) => CAPS.priority[cat] ?? CAPS.priority.default;

  // --- the Inbox log ---
  function line(cat, kind, text, { good = true, opens = null } = {}) {
    const l = { uid: s.nextUid++, day: today(), at: now(), cat, kind, text, good, opens, read: false };
    s.lines.push(l);
    if (s.lines.length > INBOX.keep) {
      const i = s.lines.findIndex((x) => x.read);
      s.lines.splice(i >= 0 ? i : 0, 1); // (the oldest read line goes first)
    }
    dayOf().lines++;
    audit.push({ type: 'line', cat, kind, day: l.day, at: l.at });
    return l;
  }
  const capOk = (cat) => {
    const days = CAPS.perCategory[cat];
    const last = s.last.cat[cat];
    return days == null || last == null || today() - last >= days;
  };
  const capUse = (cat) => (s.last.cat[cat] = today());

  // --- moments from the home ---
  function raise(name, x = {}) {
    const def = KINDS[name];
    if (!def) return null;
    const m = def.make(x);
    if (!m) return null;
    return commit(def.cat, name, m, x, def.inbox);
  }
  function commit(cat, kind, m, payload = null, inbox = false) {
    const l = inbox || m.inbox || m.inboxAnyway || m.weight === 'inbox' ? line(cat, kind, m.line ?? m.text, { good: m.good, opens: m.opens ?? null }) : null;
    const base = { cat, kind, title: m.title ?? null, text: m.text, art: m.art ?? null, good: m.good !== false, opens: m.opens ?? null, haptic: !!m.haptic, line: l?.uid ?? null, ...(m.badge ? { badge: m.badge } : {}), ...(m.aura ? { aura: true } : {}) }; // (Milestone 28b: badge, aura)
    if (m.weight === 'blocking') {
      s.waiting.push({ uid: s.nextUid++, ...base, choice: m.choice ?? null, prio: prioOf(cat), at: now(), payload: m.choice?.kind === 'memorial' ? payload : null });
      sortWaiting();
      dayOf().maxWaiting = Math.max(dayOf().maxWaiting, s.waiting.length);
    } else if (['big', 'medium', 'quiet'].includes(m.weight)) {
      s.queue.push({ uid: s.nextUid++, weight: m.weight, ...base, at: now(), day: today() });
      if (s.queue.length > CAPS.queueMax) {
        const i = s.queue.findIndex((q) => q.weight === 'quiet');
        s.queue.splice(i >= 0 ? i : 0, 1);
      }
    }
    return l;
  }
  function sortWaiting() {
    s.waiting.sort((a, b) => b.prio - a.prio || a.uid - b.uid);
  }

  // --- the new categories (each midnight; one roll of the saved stream per kind) ---
  function daily(day, input = {}) {
    const N = NEW_EVENTS;
    // life-story discovery: a staff member who knows a resident well learns one thing from their story
    const r = roll();
    if (r < N.lifeStory.dailyChance && capOk('lifeStory')) {
      const pool = [];
      for (const p of input.residents ?? []) {
        const known = (s.seen.stories[p.id] ??= []);
        const facts = [p.story ? { story: p.story } : null, ...(p.tags ?? []).map((tag) => ({ tag }))].filter(Boolean);
        facts.forEach((f, i) => {
          if (known.includes(i)) return;
          for (const q of p.familiar ?? []) pool.push({ p, i, f, q });
        });
      }
      if (pool.length) {
        const pick = pool[Math.floor(roll() * pool.length)];
        s.seen.stories[pick.p.id].push(pick.i);
        const x = { staff: pick.q.first, name: pick.p.first, ...pick.f };
        line('lifeStory', 'lifeStory', N.lifeStory.text(x), { opens: { type: 'resident', id: pick.p.id } });
        onMoment?.(pick.p.id, 'story', N.lifeStory.moment(x));
        capUse('lifeStory');
      }
    }
    // friendships: a pair that has just become friends — story moments for both; a quiet line at most once a week
    for (const f of input.friends ?? []) {
      const key = [f.a, f.b].sort().join('|');
      if (s.seen.friends[key]) continue;
      s.seen.friends[key] = day;
      onMoment?.(f.a, 'friend', N.friendship.moment({ other: f.bName }));
      onMoment?.(f.b, 'friend', N.friendship.moment({ other: f.aName }));
      if (!input.firstLook && capOk('friendship')) {
        commit('friendship', 'friendship', { weight: 'quiet', text: N.friendship.text({ a: f.aFirst, b: f.bFirst }), good: true, opens: { type: 'resident', id: f.a }, inbox: true });
        capUse('friendship');
      }
    }
    // staff milestones: work anniversaries; a first year with no essential care missed
    for (const q of input.team ?? []) {
      const join = (s.seen.joins[q.id] ??= day);
      const years = Math.floor((day - join) / (input.yearDays ?? 336));
      if (years >= 1 && (day - join) % (input.yearDays ?? 336) === 0) commit('staff', 'anniversary', { weight: 'medium', text: N.anniversary.text({ name: q.first, years }), good: true, opens: { type: 'staff', id: q.id }, inbox: true });
    }
    for (const id of Object.keys(s.seen.joins)) if (input.team && !input.team.some((q) => q.id === id)) delete s.seen.joins[id];
    if (input.missed) s.seen.lastMissed = day;
    if (s.seen.cleanYear == null && input.residentsHere > 0 && day - (s.seen.lastMissed ?? s.seen.start) >= N.cleanYear.days) {
      s.seen.cleanYear = day;
      commit('staff', 'cleanYear', { weight: 'medium', text: N.cleanYear.text(), good: true, inbox: true });
    }
    // care-plan reviews due: one line a day for all of them (yesterday's unread one is replaced, never piled up)
    const stale = input.stale ?? [];
    if (stale.length && capOk('review')) {
      const old = s.lines.findIndex((l) => l.kind === 'review' && !l.read);
      if (old >= 0) s.lines.splice(old, 1);
      const shown = stale.slice(0, N.review.namesShown);
      line('review', 'review', N.review.text({ n: stale.length, names: shown, more: stale.length - shown.length }), { good: true, opens: { type: 'carePlans' } });
      capUse('review');
    }
  }

  // --- each frame (game time): settled choices leave the queue; the active one ends when settled; stale beats drop ---
  function tick() {
    const t = now();
    for (const w of [...s.waiting]) {
      if (w.choice?.kind !== 'memorial' && resolved(w.choice)) {
        s.waiting = s.waiting.filter((x) => x !== w);
        s.settled.push({ uid: w.uid, kind: w.choice?.kind, day: today(), waited: Math.round((t - w.at) * 10) / 10 });
        if (s.settled.length > 20) s.settled.shift();
      }
    }
    const a = s.active;
    if (a && a.choice?.kind !== 'memorial' && resolved(a.choice)) end(a, 'settled');
    // a choice the player has seen and left in the Inbox lets the next one come after a while (it stays answerable)
    else if (a && a.seen && a.choice?.kind !== 'memorial' && t - a.seenAt >= CAPS.releaseHours) end(a, 'inInbox');
    s.queue = s.queue.filter((q) => q.weight === 'big' || t - q.at <= (CAPS.wait[q.weight] ?? 12));
  }
  function end(a, how) {
    audit.push({ type: 'choiceEnd', uid: a.uid, at: now(), how });
    if (s.showing?.uid === a.uid) s.showing = null;
    s.active = null;
  }

  // --- the screen (real time; caps in game time) ---
  function uiTick(dt, ui = {}) {
    const t = now();
    const sh = s.showing;
    if (sh && sh.weight !== 'blocking') {
      sh.left -= dt;
      // a beat never stays under a sheet or a pop-up the player opened (quiet lines may stay over a sheet)
      if (sh.left <= 0 || ui.popup || (ui.sheet && sh.weight !== 'quiet') || !ui.home) s.showing = null;
    }
    if (s.showing || !ui.home || ui.popup) return s.showing;
    // 1. the next choice, when none is in play and nothing covers the home
    if (!s.active && s.waiting.length && !ui.sheet) {
      const w = s.waiting.shift();
      s.active = { ...w, since: t, seen: false, seenAt: null };
      dayOf().choices++;
      audit.push({ type: 'choice', uid: w.uid, at: t, kind: w.choice?.kind, sheet: !!ui.sheet, popup: !!ui.popup });
    }
    if (s.active && !s.active.seen && !ui.sheet) {
      s.showing = { ...s.active, weight: 'blocking' };
      audit.push({ type: 'show', weight: 'blocking', uid: s.active.uid, at: t, sheet: !!ui.sheet, popup: !!ui.popup });
      return s.showing;
    }
    // 2. a beat: the first in line the caps allow now
    for (let i = 0; i < s.queue.length; i++) {
      const q = s.queue[i];
      let ok = false;
      if (q.weight === 'big') ok = !ui.sheet && s.last.bigDay !== today() && dayOf().big < CAPS.bigPerDay;
      else if (q.weight === 'medium') ok = !ui.sheet && (s.last.medium == null || t - s.last.medium >= CAPS.mediumGapHours);
      else if (q.weight === 'quiet') ok = s.last.quiet == null || t - s.last.quiet >= CAPS.quietGapHours;
      if (!ok) continue;
      s.queue.splice(i, 1);
      if (q.weight === 'big') s.last.bigDay = today();
      else s.last[q.weight] = t;
      dayOf()[q.weight]++;
      s.showing = { ...q, left: CAPS.showSec[q.weight] };
      audit.push({ type: 'show', weight: q.weight, uid: q.uid, at: t, day: today(), sheet: !!ui.sheet, popup: !!ui.popup });
      return s.showing;
    }
    return null;
  }
  function later(uid) {
    const a = s.active;
    if (!a || a.uid !== uid) return false;
    a.seen = true;
    a.seenAt = now();
    if (s.showing?.uid === uid) s.showing = null;
    if (a.choice?.kind === 'memorial') end(a, 'ack');
    return true;
  }
  const ack = (uid) => later(uid);
  function dismiss(uid) {
    if (s.showing?.uid === uid && s.showing.weight !== 'blocking') s.showing = null;
  }

  const unread = () => s.lines.filter((l) => !l.read);
  return {
    raise,
    commit,
    daily,
    tick,
    uiTick,
    later,
    ack,
    dismiss,
    get state() {
      return s;
    },
    get active() {
      return s.active;
    },
    get waiting() {
      return s.waiting;
    },
    get showing() {
      return s.showing;
    },
    audit,
    lines: () => s.lines,
    unread,
    markRead(uid) {
      const l = s.lines.find((x) => x.uid === uid);
      if (l) l.read = true;
    },
    markAllRead() {
      for (const l of s.lines) l.read = true;
    },
    // The Inbox: categories with lines, the one with the newest line first; lines newest first.
    grouped() {
      const by = new Map();
      for (const l of [...s.lines].reverse()) {
        if (!by.has(l.cat)) by.set(l.cat, []);
        by.get(l.cat).push(l);
      }
      return [...by.entries()].map(([cat, lines]) => ({ cat: categoryById(cat), lines, unread: lines.filter((l) => !l.read).length }));
    },
    dayCounts: (d = today()) => s.days[d] ?? null,
  };
}
