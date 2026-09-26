// Robot Workshop's account records (Milestone 18): reads this run and hands the numbers to core/AccountRecords.js.
// syncRecords(c) looks over the whole run (cheap: called on finished robots, sales, competitions, month ends and
// saves); a sale also reports its month's units straight away. Records only ever go up (or down, for "fastest").
import { ROBOT_STAT_KEYS, STAT_KEYS } from '../../data/stats.js';
import { STAFF_BY_ID } from '../../data/staff.js';
import { PURPOSES } from '../../data/purposes.js';

export function syncRecords(c) {
  const R = c.records;
  if (!R || !c.campaignId) return;
  c.syncSecretFacts(); // this run's share of the account facts (staff ever hired)
  R.submit('highestCash', c.economy.balance('credits'));
  R.submit('highestReputation', c.reputation.value);
  for (const rec of c.history.records) {
    const r = rec.result;
    if (!r) continue;
    const who = { robot: rec.name, purpose: r.purpose };
    R.submit('bestQuality', r.quality ?? 0, who);
    R.submit('bestInnovation', r.innovation ?? 0, who);
    if (rec.days > 0) R.submit('fastestProject', rec.days, who);
    if (r.purpose) R.submit('bestPerPurpose', r.quality ?? 0, { robot: rec.name, name: PURPOSES[r.purpose]?.name ?? r.purpose }, r.purpose);
    for (const k of ROBOT_STAT_KEYS) if (r.stats?.[k] != null) R.submit('bestStat', r.stats[k], who, k);
    if (r.review != null) R.submit('bestReview', r.review, who);
    if (rec.launchedProductId) R.submit('mostFaultsReleased', r.faults ?? 0, who);
  }
  for (const p of c.products.products) R.submit('mostUnitsOneModel', p.totalUnits ?? 0, { robot: p.name });
  for (const s of c.staff.staff) {
    R.submit('staffHighestLevel', s.level, { name: s.name });
    const best = STAT_KEYS.reduce((b, k) => ((s.stats[k] ?? 0) > (s.stats[b] ?? 0) ? k : b), STAT_KEYS[0]);
    R.submit('staffHighestStat', s.stats[best] ?? 0, { name: s.name, stat: best.toUpperCase() });
  }
  let longest = null;
  for (const r of Object.values(c.careers.records)) {
    const days = c.careers.daysEmployed(r.id, c.clock.totalDays);
    if (!longest || days > longest.days) longest = { days, name: r.name };
  }
  if (longest) R.submit('longestServing', longest.days, { name: longest.name });
  const special = (c.secrets.accountFact('staffEverHired') ?? []).filter((id) => ['legendary', 'secret'].includes(STAFF_BY_ID[id]?.tier));
  R.submit('specialStaff', special.length);
  R.submit('totalTrophies', c.trophies.count);
  for (const [id, rec] of Object.entries(c.competitions.records)) if (rec.best) R.submit('competitionBest', rec.best.score, { robot: rec.best.entrant, pilot: rec.best.pilot }, id);
  R.submit('synergiesDiscovered', Object.keys(c.synergyArchive.account.found).length);
  R.submit('secretsDiscovered', Object.keys(c.secrets.account.history).length);
  if (c.flags.endingReached) R.submit('ngPlusCompleted', c.ngPlusRuns);
}

// One month's sales of one model (the product:sales event).
export function recordSale(c, product, sale) {
  c.records?.submit('mostMonthlyUnits', sale.units ?? 0, { robot: product.name });
}
