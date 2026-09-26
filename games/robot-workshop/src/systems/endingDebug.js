// Debug only (?debug=1, Milestone 19): fill a run so the Year 16 ending lands on a chosen grade, then jump the
// calendar to just before the end of Year 16 — the ending itself then fires for real on the next days.
//   'C'      nothing added: a small company (grade C)
//   'A'      a good company (about 650 points)
//   'LEGEND' every category full (1,000 points)
// It works through the game's own systems where it can (reputation, ledger, research, hiring, trophies, combos);
// finished robots, contracts and secrets are written in directly, as the M18 tests did.
import { RESEARCH_NODES } from '../../data/research.js';
import { ACH23_COMBOS } from '../../data/achievements.js';
import { STAFF } from '../../data/staff.js';
import { SECRETS } from '../../data/secrets.js';
import { STARTING_MONEY } from '../../data/economy.js';
import { STARTER_PARTS } from '../../data/components.js';

export const ENDING_SETUPS = {
  C: null,
  A: { rep: 8000, profit: 500000, quality: 80, review: 8.5, research: 28, level: 18, courses: 10, contracts: 20, units: 5000, cups: ['C01', 'C02', 'C03', 'C07', 'C08'], wins: 12, combos: 8, secrets: 3 },
  LEGEND: { rep: 25000, profit: 1200000, quality: 95, review: 9.8, research: 36, level: 27, courses: 24, contracts: 42, units: 11000, cups: ['C01', 'C02', 'C03', 'C07', 'C08', 'C09'], wins: 32, combos: 16, secrets: 8 },
};

export function debugEndingSetup(c, level = 'C', { jump = true } = {}) {
  const p = ENDING_SETUPS[level];
  if (p) {
    const day = c.clock.totalDays;
    c.reputation.add(Math.max(0, p.rep - c.reputation.value), 'Debug: ending setup');
    const profit = c.economy.balance('credits') - STARTING_MONEY.credits;
    if (p.profit > profit) c.economy.add('credits', p.profit - profit, 'Debug: ending setup', 'sales');
    // Five finished robots at the target Quality / review (one of them on sale with the units).
    for (let i = 0; i < 5; i++) c.history.add({ name: `Showcase ${i + 1}`, days: 60, team: [], result: { quality: p.quality, review: p.review, faults: 0, purpose: 'helper', purposeName: 'Helper', stats: { SPD: 100, PWR: 100, CTL: 100, INT: 100, END: 100, REL: 100, APL: 100 }, components: { ...STARTER_PARTS }, innovation: 40, fit: 80, tier: 'starter', totalCx: 6, synergies: [] } });
    const rec = c.history.records.at(-1);
    const prod = c.products.launch({ name: rec.name, launchedAt: c.clock.now(), data: c.sales.productData(rec, 'standard') });
    rec.launchedProductId = prod.id;
    prod.totalUnits = p.units;
    for (const n of RESEARCH_NODES.slice(0, p.research)) if (!c.research.isDone(n.id)) c.research.complete(n.id);
    // Eight workers across all five roles, at the target level, with training courses behind them.
    const pool = STAFF.filter((s) => ['standard', 'rare'].includes(s.tier));
    for (const role of ['engineer', 'designer', 'programmer', 'mechanic', 'pilot']) {
      const d = !c.staff.staff.some((s) => s.role === role) && pool.find((s) => s.role === role && !c.staff.get(s.id));
      if (d) c.debugSpawnStaff(d.id);
    }
    for (const d of pool) if (c.staff.staff.length < 8 && !c.staff.get(d.id)) c.debugSpawnStaff(d.id);
    for (const s of c.staff.staff) s.level = Math.max(s.level, p.level);
    const ids = c.staff.staff.map((s) => s.id);
    for (let i = 0; i < p.courses; i++) c.careers.bump(ids[i % ids.length], 'training');
    for (let i = 0; i < p.contracts; i++) c.contracts.done.push({ id: `dbg-${i}`, title: 'Debug delivery', purpose: 'helper', status: 'success', tier: 'starter', payout: 0, result: { paid: 0 }, day });
    // Event wins → the real trophies.
    const cups = p.cups;
    for (let i = 0; i < p.wins; i++) {
      const r = c.competitions.record(cups[i % cups.length]);
      r.entries++;
      r.wins++;
    }
    c.trophies.check((rule) => c.ruleMet(rule), { day, debug: true });
    for (const id of ACH23_COMBOS.slice(0, p.combos)) c.synergyArchive.discover(id, { day, year: c.clock.year, via: 'debug', campaignId: c.campaignId });
    for (const s of SECRETS.filter((x) => x.group === 'behaviour').slice(0, p.secrets)) c.secrets.run.unlocked[s.id] ||= { day, debug: true };
  }
  if (jump) c.debugJumpToEnd(2);
  return p;
}
