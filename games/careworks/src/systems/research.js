// The research tree (Milestone 21, bible §26) on the shared core/ResearchSystem + core/UnlockActions, driven by
// data/research.js. Research Points are a run currency on the home's ledger (currency 'rp', category 'research'), so
// every RP in or out is a ledger line; the core tree's own rp is synced from the ledger before each start.
//
// The queue: core research needs a worker on a queue. In CAREWORKS the whole home researches together (the built-in
// 'home' researcher), and a node takes a set number of days by its tier (data/research.js DAYS), paid for up front.
// One slot to start; the second opens with the Staff Education Centre (F27) — or, one day, the VIP hook (Milestone 36),
// which can only open the slot: core checks every prerequisite on every start, whichever slot.
//
// What finishing a node does: its unlock actions fire once (core/UnlockActions) — programs and facilities read
// has(nodeId) — and its effects join bonus(key), which the home world reads (round safety, falls risk, meal quality …).
//
//   createResearch({ ledger, care, bus, today, hasPiece }) → api
//   api: rp · has(id) · status(id) → 'done' | 'active' | 'available' | 'locked' · why(id) → plain reason | null ·
//        canStart(id) → { ok, reason, queue } · start(id) · stop(queue) · queues() → [{ i, open, nodeId, fraction,
//        daysLeft, text }] · fraction(id) · bonus(key) · addRp(amount, reason) · dailyTick(day) · doneIds() ·
//        setVipForTests(on) · completeForTests(id) · serialize()
// The run's state (care.research, saved with the care state): { tree (core serialize), runner, converted, vip, earned:
//   { source: rp } }
import { ResearchSystem } from '../../../../core/ResearchSystem.js';
import { UnlockRunner } from '../../../../core/UnlockActions.js';
import { RESEARCH, QUEUES, RP_INCOME, researchById, nodeLabel } from '../../data/research.js';

export const HOME_RESEARCHER = 'home';

// Every node after its prerequisites (the tests and ?debug=1 "research all"). Throws on a loop.
export function topoOrder(nodes = RESEARCH) {
  const byId = Object.fromEntries(nodes.map((x) => [x.id, x]));
  const out = [];
  const seen = new Set();
  const visit = (x, path = new Set()) => {
    if (seen.has(x.id)) return;
    if (path.has(x.id)) throw new Error(`research loop at ${x.id}`);
    path.add(x.id);
    for (const r of x.requires) visit(byId[r], path);
    path.delete(x.id);
    seen.add(x.id);
    out.push(x.id);
  };
  for (const x of nodes) visit(x);
  return out;
}

export function ensureResearchState(saved) {
  return { tree: saved?.tree ?? null, runner: saved?.runner ?? null, converted: !!saved?.converted, vip: false, earned: { ...(saved?.earned ?? {}) } };
}

export function createResearch({ ledger, care, bus = null, today = () => 0, hasPiece = () => false }) {
  const st = (care.research = ensureResearchState(care.research));
  const runner = new UnlockRunner({ bus });
  const home = { id: HOME_RESEARCHER, name: 'The whole home', stats: {} };
  const conditionMet = (rule) => {
    if (!rule) return true;
    if (rule.any) return rule.any.some(conditionMet);
    if (rule.facility) return hasPiece(rule.facility);
    if (rule.vip) return !!st.vip; // (Milestone 36: nothing sets it yet)
    return false;
  };
  const system = new ResearchSystem({
    bus,
    nodes: RESEARCH.map((x) => ({ id: x.id, name: x.name, cost: x.cost, requires: [...x.requires], actions: x.unlocks.map((u) => ({ type: u.type, id: u.id })), branch: x.branch, tier: x.tier, days: x.days })),
    queues: QUEUES,
    runner,
    staff: { get: (id) => (String(id).startsWith(HOME_RESEARCHER) ? home : null) }, // ('home:0', 'home:1': core lets a worker hold one slot)
    rules: { basePerDay: 0, statDivisor: 1 },
    // (a node's work equals its cost: cost / days a day finishes it on its day; the tiny extra guards rounding)
    hooks: { conditionMet, workerStat: () => 0, bonusPerDay: (x) => x.cost / x.days + 1e-6 },
  });
  system.load(st.tree);
  runner.load(st.runner);
  const rpNow = () => ledger.economy.balance('rp');

  function addRp(amount, reason, source = 'other') {
    amount = Math.round(amount);
    if (amount <= 0) return 0;
    ledger.economy.add('rp', amount, reason, 'research');
    st.earned[source] = (st.earned[source] ?? 0) + amount;
    bus?.emit('research:rp', { amount, reason, total: rpNow() });
    return amount;
  }
  // An older save's stored Research counter (Milestone 16: 5 a discharge) becomes RP once.
  if (!st.converted) {
    st.converted = true;
    const n = care.rewards?.research ?? 0;
    if (n > 0) addRp(n * RP_INCOME.counterRp, 'Research from earlier successful discharges', 'discharge');
  }

  const freeQueue = () => system.queues.findIndex((q, i) => system.queueOpen(i) && !q.nodeId);
  function why(id) {
    const s = system.status(id);
    if (s === 'done') return null;
    if (s === 'active') return 'Being researched';
    const m = system.missing(id);
    if (m.nodes.length) return `Needs ${m.nodes.map(nodeLabel).join(' and ')} first`;
    if (rpNow() < system.costOf(id) && !system.paid[id]) return `Needs ${system.costOf(id).toLocaleString('en-GB')} RP (you have ${rpNow().toLocaleString('en-GB')})`;
    return null;
  }
  function canStart(id) {
    if (!researchById(id)) return { ok: false, reason: 'Unknown research' };
    const s = system.status(id);
    if (s === 'done') return { ok: false, reason: 'Already done' };
    if (s === 'active') return { ok: false, reason: 'Already being researched' };
    const w = why(id);
    if (w) return { ok: false, reason: w };
    const q = freeQueue();
    if (q < 0) return { ok: false, reason: system.openQueues > 1 ? 'Both research slots are busy' : 'The research slot is busy (a second opens with a Staff Education Centre)' };
    return { ok: true, reason: null, queue: q };
  }
  const api = {
    system,
    runner,
    state: st,
    get rp() {
      return rpNow();
    },
    has: (id) => system.isDone(id),
    doneIds: () => [...system.done],
    status: (id) => system.status(id),
    why,
    canStart,
    // Pay up front (a ledger line), then it takes its days.
    start(id) {
      const c = canStart(id);
      if (!c.ok) return c;
      const cost = system.paid[id] ? 0 : system.costOf(id);
      system.rp = rpNow();
      const r = system.start(c.queue, id, `${HOME_RESEARCHER}:${c.queue}`);
      if (!r.ok) return r;
      if (cost) ledger.economy.add('rp', -cost, `Research: ${nodeLabel(id)}`, 'research');
      system.rp = rpNow();
      return { ok: true, reason: null, queue: c.queue, cost };
    },
    // Stop a slot: the node keeps what it paid and its progress, and can start again without paying.
    stop: (i) => system.stop(i),
    queues: () =>
      system.queues.map((q, i) => ({
        i,
        open: system.queueOpen(i),
        nodeId: q.nodeId,
        fraction: q.nodeId ? system.fraction(q.nodeId) : 0,
        daysLeft: q.nodeId ? system.daysLeft(i) : null,
        text: QUEUES[i].text ?? null,
      })),
    fraction: (id) => system.fraction(id),
    // The summed effect of every done node (data/research.js effects).
    bonus(key) {
      let t = 0;
      for (const id of system.done) for (const e of researchById(id)?.effects ?? []) if (e.key === key) t += e.value;
      return t;
    },
    addRp,
    // Each day: research progress; each week, the facilities' small trickle.
    dailyTick(day) {
      system.dailyTick();
      if (day % 7 !== 0) return;
      for (const [id, rp] of Object.entries(RP_INCOME.facilityWeek)) if (hasPiece(id)) addRp(rp, `A week of learning: ${FACILITY_WORDS[id]}`, 'facilities');
    },
    setVipForTests(on) {
      st.vip = !!on;
    },
    completeForTests(id) {
      system.complete(id);
    },
    serialize() {
      st.tree = system.serialize();
      st.runner = runner.serialize();
      return st;
    },
  };
  return api;
}
const FACILITY_WORDS = { F11: 'the Training Room', F27: 'the Staff Education Centre', F28: 'the Clinical Governance Office' };
