// Robot Workshop's facts for the secret engine (Milestone 16). Rules read these by name only (data/secrets.js).
//   run.*      this run, read live from the campaign
//   account.*  every run on this device (core/SecretEngine account facts: each run reports its own value)
//   event.*    the trigger event's own payload, e.g. event.record.result.innovation, event.result.place
import { FactRegistry, readPath } from '../../../../core/SecretEngine.js';
import { COMPONENTS } from '../../data/components.js';
import { RANKS } from '../../data/economy.js';

// A finished robot, flattened for rules (count-of over run.robots).
function robotFact(rec) {
  const r = rec.result ?? {};
  const parts = Object.values(r.components ?? {});
  return {
    number: rec.number,
    name: rec.name,
    purpose: r.purpose,
    tier: r.tier,
    quality: r.quality ?? 0,
    review: r.review ?? 0,
    innovation: r.innovation ?? 0,
    faults: r.faults ?? 0,
    stats: { ...(r.stats ?? {}) },
    parts,
    maxCx: Math.max(0, ...parts.map((id) => COMPONENTS[id]?.cx ?? 0)),
    family: r.visual ?? null,
    combos: [...(r.synergies ?? [])],
    launched: !!rec.launchedProductId,
    contract: rec.deliveredContractId ?? null,
    team: (rec.team ?? []).map((t) => t.id),
  };
}

function competitionFact(r) {
  return {
    eventId: r.eventId,
    won: !!r.won,
    place: r.place,
    strategy: r.setup?.strategyId ?? null,
    tuning: r.setup?.tuningId ?? null,
    pilot: r.setup?.pilotId ?? null,
    robot: r.robotNumber ?? r.setup?.entrantId ?? null,
    breakdowns: r.player?.breakdowns ?? 0,
    dnf: !!r.player?.dnf,
    score: r.player?.final ?? 0,
  };
}

// The account facts this run reports (Campaign.syncSecretFacts sets them before each check and on save).
export function runAccountFacts(c) {
  const hired = Object.keys(c.careers.records);
  return {
    staffEverHired: hired,
    competitionWins: c.competitions.totalWins,
    competitionEntries: c.competitions.totalEntries,
    zeroFaultProjects: c.counter('zeroFaultProjects'),
    projectsFinished: c.history.count,
    robotFamilies: [...new Set(c.history.records.map((r) => r.result?.visual).filter(Boolean))],
    eventsWon: Object.entries(c.competitions.records).filter(([, v]) => v.wins > 0).map(([id]) => id),
  };
}

export function createSecretFacts(c) {
  const f = new FactRegistry();
  const recs = () => c.history.records.filter((r) => r.result);
  // --- run: time, company, money ---
  f.define('run.year', () => c.clock.year)
    .define('run.month', () => c.clock.month)
    .define('run.day', () => c.clock.totalDays)
    .define('run.ngPlus', () => c.ngPlusRuns)
    .define('run.rankIndex', () => c.reputation.highestRankIndex)
    .define('run.rank', () => RANKS[c.reputation.highestRankIndex].id)
    .define('run.reputation', () => c.reputation.value)
    .define('run.credits', () => c.economy.balance('credits'))
    .define('run.techChips', () => c.economy.balance('techChips'))
    .define('run.inDebt', () => !!c.economy.inDebt)
    // --- robots ---
    .define('run.projectsFinished', () => c.history.count)
    .define('run.zeroFaultProjects', () => c.counter('zeroFaultProjects'))
    .define('run.commercialLaunches', () => c.counter('commercialLaunches'))
    .define('run.advancedRobots', () => c.counter('advancedRobots'))
    .define('run.aiHeavyProjects', () => c.counter('aiHeavyProjects'))
    .define('run.robots', () => recs().map(robotFact))
    .define('run.bestQuality', () => Math.max(0, ...recs().map((r) => r.result.quality ?? 0)))
    .define('run.bestInnovation', () => Math.max(0, ...recs().map((r) => r.result.innovation ?? 0)))
    .define('run.purposesBuilt', () => [...new Set(recs().map((r) => r.result.purpose))])
    .define('run.partsUsed', () => [...(c.research.firsts.part ?? [])])
    .define('run.partsOpen', () => [...c.openParts])
    .define('run.combosDiscovered', () => Object.keys(c.synergyArchive.run.found))
    // --- sales ---
    .define('run.unitsSold', () => c.products.products.reduce((t, p) => t + (p.totalUnits ?? 0), 0))
    .define('run.products', () => c.products.products.map((p) => ({ position: p.data.position, units: p.totalUnits, quality: p.data.quality, review: p.data.review, tier: p.data.tier, purpose: p.data.purpose })))
    .define('run.contractsDone', () => c.contracts.stats.succeeded)
    .define('run.contractsFailed', () => c.contracts.stats.failed)
    // --- research ---
    .define('run.researchDone', () => c.research.nodes.filter((n) => c.research.isDone(n.id)).map((n) => n.id))
    .define('run.researchCount', () => c.research.doneCount)
    // --- competitions ---
    .define('run.competitions', () => c.competitions.results.map(competitionFact))
    .define('run.competitionWins', () => c.competitions.totalWins)
    .define('run.competitionEntries', () => c.competitions.totalEntries)
    .define('run.eventsWon', () => Object.entries(c.competitions.records).filter(([, v]) => v.wins > 0).map(([id]) => id))
    .define('run.trophies', () => Object.keys(c.trophies.awarded))
    // --- people ---
    .define('run.staff', () => c.staff.staff.map((s) => ({ id: s.id, role: s.role, tier: s.tier, level: s.level, stats: { ...s.stats }, projects: c.careers.count(s.id, 'projects') })))
    .define('run.staffIds', () => c.staff.staff.map((s) => s.id))
    .define('run.staffHired', () => Object.keys(c.careers.records))
    // --- workshop ---
    .define('run.facilities', () => [...new Set(c.facilities.placed.map((p) => p.def))])
    .define('run.eventsSeen', () => Object.keys(c.events.state.count))
    .define('run.secrets', () => Object.keys(c.secrets.run.unlocked))
    .defineGroup('run.flag', (name) => c.flags[name] ?? false)
    // --- account (every run) ---
    .define('account.runs', () => Object.keys(c.secrets.account.facts.projectsFinished ?? {}).length || 1)
    .define('account.secrets', () => Object.keys(c.secrets.account.history))
    .define('account.combosDiscovered', () => Object.keys(c.synergyArchive.account.found))
    .defineGroup('account', (name) => c.secrets.accountFact(name))
    // --- the trigger event's own details ---
    .defineGroup('event', (path, ctx) => readPath(ctx.payload, path));
  return f;
}
