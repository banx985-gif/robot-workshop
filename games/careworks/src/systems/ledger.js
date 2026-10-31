// The home's money (Milestone 6, bible §27 income lines): Credits on core/EconomySystem — every change is one ledger
// line, and the balance always equals the sum of the lines. At each month's close every resident's accommodation fee
// and Care Support Funding (by Support Level, for the days they lived here that month) come in and every team
// member's salary goes out (data/balance.js FEES, data/staff.js salaries). No debt system yet (Milestone 22): the
// balance may go below zero and is simply shown red; no interest, no closure.
//   createLedger({ saved, bus, now, startCredits }) → ledger
//   ledger.balance · ledger.closeMonth({ month, fromDay, toDay, residents, staff }) → the lines added
//   ledger.monthLines(month) → that close's lines · ledger.lastClose → the newest close's month label (or null)
//   ledger.forecast({ fromDay, toDay, day, residents, staff }) → this month so far: income earned, wages due
//   ledger.serialize()
//     residents: [{ id, name, support level, admittedDay, leftDay (Milestone 9: went home) }]   staff: [{ id, name, salary }]
import { EconomySystem } from '../../../../core/EconomySystem.js';
import { FEES, LEDGER } from '../../data/balance.js';
import { REHAB_FUNDING } from '../../data/mobility.js';
import { ROOM_FEES, RESPITE_FUNDING, LEVELS, FEE_MOOD, NURSING_SUPPLEMENT } from '../../data/economy.js';

const CAT = LEDGER.categories;

// Days a resident lived here in [fromDay, toDay) (they pay for those days only).
// Milestone 9: someone who went home (leftDay) pays up to that day.
export const daysHere = (r, fromDay, toDay) => Math.max(0, Math.min(toDay, r.leftDay ?? toDay) - Math.max(fromDay, r.admittedDay ?? fromDay));

// The lines one month's close brings: fees and funding per resident, wages per team member.
// len = the whole month in days (a forecast passes the days so far as toDay but the full month as len).
// Milestone 22: each resident's fee by their room (r.room, a template id; none: a Standard Room's), respite funding for a
// respite stay (r.respite), their level's supplies (a day here) and equipment wear (a month); home: { upkeep: [{ name,
// amount }], utilities } — the rooms and facilities upkeep and the utilities, once a month (none: left out).
// (Milestone 30b) feeMult: Kaching on the team brings 10% more from accommodation fees (nothing else changes).
export function monthLinesFor({ fromDay, toDay, residents, staff, home = null, len = toDay - fromDay, feeMult = 1 }) {
  const out = [];
  for (const r of residents) {
    const d = daysHere(r, fromDay, toDay);
    if (!d) continue;
    const fee = r.room ? ROOM_FEES[r.room] ?? ROOM_FEES.default : FEES.accommodationPerMonth;
    // (Milestone 22: the family negotiates the fee down when their average Mood this month was low — r.moodAvg)
    const cut = r.moodAvg != null && r.moodAvg < FEE_MOOD.line ? Math.min(FEE_MOOD.capPct, Math.round((FEE_MOOD.line - r.moodAvg) * FEE_MOOD.perPoint)) : 0;
    out.push({ category: 'fees', amount: Math.round((fee * d * (1 - cut / 100) * feeMult) / len), reason: `${CAT.fees}: ${r.name}${d < len ? ` (${d} days)` : ''}${cut ? ` (−${cut}%: the family is unhappy — Mood ${Math.round(r.moodAvg)} this month)` : ''}` });
    // Milestone 16: a rehab resident ready to go home brings the "ready" rate of funding for those days, and rehab
    // funding (§27) only for the days they were working on their goals
    const ready = r.readyDay != null ? daysHere({ admittedDay: Math.max(r.admittedDay ?? fromDay, r.readyDay), leftDay: r.leftDay }, fromDay, toDay) : 0;
    const working = d - ready;
    // (Milestone 22: + the nursing supplement when they need a nurse on every shift — r.nursing)
    const fund = FEES.careSupportFundingByLevel[r.level] + (r.nursing ? NURSING_SUPPLEMENT.perMonth : 0);
    out.push({ category: 'funding', amount: Math.round((fund * (working + ready * REHAB_FUNDING.readyFundingPct)) / len), reason: `${CAT.funding}: ${r.name} (level ${r.level}${r.nursing ? ', nursing supplement' : ''})${ready ? ` (${ready} days ready to go home)` : ''}` });
    if (r.rehab && working > 0) out.push({ category: 'rehabFunding', amount: Math.round((REHAB_FUNDING.perMonth * working) / len), reason: `${CAT.rehabFunding}: ${r.name}` });
    if (r.respite) out.push({ category: 'respiteFunding', amount: Math.round((RESPITE_FUNDING.perMonth * d) / len), reason: `${CAT.respiteFunding}: ${r.name}` });
    // (Milestone 22: what their level's care uses — only when the caller gives the full picture, i.e. the home world)
    const L = r.level && home ? LEVELS[r.level] : null;
    if (L) {
      out.push({ category: 'supplies', amount: -L.suppliesPerDay * d, reason: `${CAT.supplies}: ${r.name} (level ${r.level})` });
      out.push({ category: 'equipment', amount: -Math.round((L.equipmentPerMonth * d) / len), reason: `${CAT.equipment}: ${r.name} (level ${r.level})` });
    }
  }
  for (const s of staff) out.push({ category: 'wages', amount: -s.salary, reason: `${CAT.wages}: ${s.name}` });
  if (home) {
    const up = home.upkeep.reduce((t, x) => t + x.amount, 0);
    if (up) out.push({ category: 'upkeep', amount: -up, reason: `${CAT.upkeep} (${home.upkeep.length} rooms and facilities)` });
    if (home.utilities) out.push({ category: 'utilities', amount: -home.utilities, reason: `${CAT.utilities} (${home.tiles} tiles of floor)` });
  }
  return out;
}

export function createLedger({ saved = null, bus = null, now = () => 0, startCredits = 0 } = {}) {
  const eco = new EconomySystem({
    bus,
    currencies: { credits: { name: 'Credits' }, rp: { name: 'Research Points' }, tokens: { name: 'Care Tokens' } }, // (Milestone 22: Care Tokens) // (Milestone 21: RP, a run currency — an older save has 0)
    debt: { warnBelow: 0, limit: -Infinity, monthlyInterestPct: 0, closureMonths: Infinity }, // no debt system yet
    now,
    maxLines: LEDGER.maxLines,
  });
  const closes = []; // [{ month (label), day, lines: [line numbers] }] newest last (the last 12 kept)
  if (saved?.economy) {
    eco.load(saved.economy);
    closes.push(...(saved.closes ?? []));
  } else if (startCredits) eco.add('credits', startCredits, CAT.opening, 'opening');

  const ledger = {
    economy: eco,
    get balance() {
      return eco.balance('credits');
    },
    get lastClose() {
      return closes[closes.length - 1] ?? null;
    },
    closes,
    closeMonth({ month, fromDay, toDay, residents, staff, home = null, feeMult = 1 }) {
      const lines = monthLinesFor({ fromDay, toDay, residents, staff, home, feeMult }).map((l) => eco.add('credits', l.amount, l.reason, l.category)).filter(Boolean);
      closes.push({ month, day: toDay, lines: lines.map((l) => ({ reason: l.reason, amount: l.amount, category: l.category })) });
      if (closes.length > 12) closes.shift();
      bus?.emit('ledger:close', { month, lines: lines.length, balance: eco.balance('credits') });
      return lines;
    },
    // This month so far: what the close would bring if the month ended today (residents' days so far, full wages).
    // income: earned for the days so far; wages: the full month (they are due at the close either way).
    forecast({ fromDay, toDay, day, residents, staff, home = null, feeMult = 1 }) {
      return monthLinesFor({ fromDay, toDay: Math.max(fromDay, day), residents, staff, home, len: toDay - fromDay, feeMult });
    },
    totals: (lines) => ({
      income: lines.filter((l) => l.amount > 0).reduce((t, l) => t + l.amount, 0),
      costs: lines.filter((l) => l.amount < 0).reduce((t, l) => t + l.amount, 0),
    }),
    reconcile: () => eco.reconcile(),
    serialize: () => ({ economy: eco.serialize(), closes: closes.map((c) => ({ ...c, lines: c.lines.map((l) => ({ ...l })) })) }),
  };
  return ledger;
}
