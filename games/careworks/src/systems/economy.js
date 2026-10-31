// Funding and the economy (Milestone 22, bible §27): Support Levels from needs, what a level's care costs and brings,
// Care Tokens and Prestige, debt recovery (a warning, Emergency Credit, a Rescue Investor) and the month-by-month history.
// Data in data/economy.js; the month's close lines are in src/systems/ledger.js; the home world calls this.
//
//   careLoad(needs) · levelOfNeeds(needs) → 1–5 · requiredCost(level) → { staff, supplies, equipment, total } ·
//   fundingOf(level) · roomFee(template)
//   createEconomy({ ledger, care, today, bus }) → api
//     api.state (care.economy) · award(kind) · tokens · prestige · monthClosed({ month, fromDay, toDay }) ·
//     daily(day) · admissionsPaused() → reason | null · warnings() → [text] · offers() → [offer] ·
//     accept(kind) / decline(kind) → { ok, reason } · history(n) → [{ month, day, balance, net, income, costs, byCat }]
import { LEVEL_RULES, LEVELS, CARE_MINUTES, MINUTE_COST, FUNDING, ROOM_FEES, DEBT, CARE_TOKENS, NURSING_SUPPLEMENT } from '../../data/economy.js';

export const careLoad = (needs) => Object.entries(LEVEL_RULES.weights).reduce((t, [k, w]) => t + (needs?.[k] ?? 0) * w, 0);
export function levelOfNeeds(needs) {
  const load = careLoad(needs);
  let level = 1;
  LEVEL_RULES.thresholds.forEach((t, i) => {
    if (load >= t) level = i + 1;
  });
  return level;
}
export function requiredCost(level) {
  const L = LEVELS[level];
  const staff = Math.round(CARE_MINUTES[level] * 28 * MINUTE_COST);
  const supplies = L.suppliesPerDay * 28;
  return { staff, supplies, equipment: L.equipmentPerMonth, total: staff + supplies + L.equipmentPerMonth };
}
export const fundingOf = (level, nursing = false) => (FUNDING[level] ?? FUNDING[1]) + (nursing ? NURSING_SUPPLEMENT.perMonth : 0);
export const roomFee = (template) => ROOM_FEES[template] ?? ROOM_FEES.default;

// Lines that are not the home's own trading (the opening balance, loans, the investor, test / debug top-ups).
const NOT_TRADING = new Set(['opening', 'loan', 'investor', 't', 'test', 'debug']);

export function ensureEconomyState(saved) {
  return {
    history: [...(saved?.history ?? [])],
    debt: { offer: null, loan: null, investor: null, sinking: 0, declined: null, ...(saved?.debt ?? {}) },
    firsts: [...(saved?.firsts ?? [])],
    prestige: saved?.prestige ?? 0,
    lastLine: saved?.lastLine ?? 0,
  };
}

export function createEconomy({ ledger, care, today = () => 0, bus = null }) {
  const st = (care.economy = ensureEconomyState(care.economy));
  const eco = ledger.economy;
  const D = DEBT;
  const bal = () => ledger.balance;
  const add = (amount, reason, cat) => eco.add('credits', amount, reason, cat);
  // the month's trading net: every Credits line since the last close, but loans, the investor and top-ups
  function tradingSince(n) {
    const ls = eco.ledger.filter((l) => l.currency === 'credits' && l.n > n && !NOT_TRADING.has(l.category));
    const income = ls.filter((l) => l.amount > 0).reduce((t, l) => t + l.amount, 0);
    const costs = ls.filter((l) => l.amount < 0).reduce((t, l) => t + l.amount, 0);
    const byCat = {};
    for (const l of ls) byCat[l.category] = (byCat[l.category] ?? 0) + l.amount;
    return { income, costs, net: income + costs, byCat };
  }
  const netSince = (n) => tradingSince(n).net;
  function offer(kind) {
    if (st.debt.offer?.kind === kind) return;
    st.debt.offer = { kind, day: today() };
    bus?.emit('economy:offer', { kind });
  }
  const api = {
    state: st,
    get tokens() {
      return eco.balance('tokens');
    },
    get prestige() {
      return st.prestige;
    },
    // Care Tokens for a first (once) or a good month (each time).
    award(kind) {
      const A = CARE_TOKENS[kind];
      if (!A) return 0;
      if (kind.startsWith('first')) {
        if (st.firsts.includes(kind)) return 0;
        st.firsts.push(kind);
      }
      eco.add('tokens', A.tokens, A.text, 'tokens');
      return A.tokens;
    },
    // After the ledger's month close: the loan payment, the investor's share, the history, sinking and offers.
    monthClosed({ month }) {
      const d = st.debt;
      const tr = tradingSince(st.lastLine); // (the month's own lines, before the loan payment and the investor's share)
      const net = tr.net;
      if (d.loan) {
        const pay = Math.min(d.loan.payment, d.loan.owed);
        add(-pay, `Emergency Credit repayment (${d.loan.left - 1} left after this)`, 'loanRepay');
        d.loan.owed -= pay;
        d.loan.left -= 1;
        if (d.loan.left <= 0 || d.loan.owed <= 0) d.loan = null;
      }
      if (d.investor) {
        if (net > 0) add(-Math.round((net * d.investor.sharePct) / 100), `Rescue Investor share (${d.investor.sharePct}% of the month's profit)`, 'investorShare');
        d.investor.left -= 1;
        if (d.investor.left <= 0) d.investor = null;
      }
      const prev = st.history.at(-1)?.balance ?? null;
      if (bal() < D.floor && (prev == null || bal() < prev)) d.sinking += 1;
      else d.sinking = 0;
      st.history.push({ month, day: today(), balance: bal(), net, income: tr.income, costs: tr.costs, byCat: tr.byCat });
      if (st.history.length > 24) st.history.shift();
      st.lastLine = eco.nextLine - 1;
      if (d.sinking >= D.sinkingMonths && !d.investor) offer('investor');
      bus?.emit('economy:month', { month, net, balance: bal() });
      return net;
    },
    // Each day: Emergency Credit is offered below the floor (one loan at a time; again after a "no" in a while).
    daily(day) {
      const d = st.debt;
      if (d.offer?.kind === 'loan' && bal() >= D.floor) d.offer = null;
      if (bal() >= D.floor || d.loan || d.investor || d.offer) return;
      if (d.declined != null && day - d.declined < D.reofferDays) return;
      offer('loan');
    },
    admissionsPaused: () => (bal() < D.floor ? `Admissions are paused: the home is in deep debt (below −${Math.abs(D.floor).toLocaleString('en-GB')} Credits). They open again when the balance recovers.` : null),
    warnings() {
      const out = [];
      if (bal() < D.warnBelow) out.push(bal() < D.floor ? 'The home is in deep debt: admissions are paused. Emergency Credit or a Rescue Investor can help.' : 'The balance is below zero: costs are higher than income right now.');
      return out;
    },
    offers: () => (st.debt.offer ? [st.debt.offer] : []),
    // Emergency Credit: the loan now, repaid monthly. Rescue Investor: the debt cleared, a share of profit for a while.
    accept(kind) {
      const d = st.debt;
      if (d.offer?.kind !== kind) return { ok: false, reason: 'No such offer' };
      d.offer = null;
      if (kind === 'loan') {
        const L = D.loan;
        const owed = Math.round(L.amount * (1 + L.interestPct / 100));
        add(L.amount, 'Emergency Credit (a loan)', 'loan');
        d.loan = { amount: L.amount, owed, payment: Math.ceil(owed / L.months), left: L.months, day: today() };
      } else {
        const I = D.investor;
        const clear = Math.max(0, I.buffer - bal());
        add(clear, 'Rescue Investor: the debt cleared', 'investor');
        d.loan = null; // (anything still owed on Emergency Credit is cleared too)
        d.investor = { sharePct: I.sharePct, left: I.months, day: today(), paid: clear };
        d.sinking = 0;
      }
      bus?.emit('economy:accepted', { kind });
      return { ok: true, reason: null };
    },
    decline(kind) {
      const d = st.debt;
      if (d.offer?.kind !== kind) return { ok: false, reason: 'No such offer' };
      d.offer = null;
      if (kind === 'loan') d.declined = today();
      return { ok: true, reason: null };
    },
    history: (n = 6) => st.history.slice(-n),
  };
  return api;
}
