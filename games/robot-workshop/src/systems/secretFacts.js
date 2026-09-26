// Robot Workshop's facts for the secret engine (Milestones 16–17). Rules read these by name only (data/secrets.js).
//   run.*      this run, read live from the campaign
//   account.*  every run on this device (core/SecretEngine account facts: each run reports its own value)
//   event.*    the trigger event's own payload, e.g. event.record.result.innovation, event.result.place
import { FactRegistry, readPath } from '../../../../core/SecretEngine.js';
import { COMPONENTS, SLOTS } from '../../data/components.js';
import { COMPETITIONS_BY_ID } from '../../data/competitions.js';
import { RANKS } from '../../data/economy.js';
import { STAFF, STAFF_BY_ID, STARTER_IDS } from '../../data/staff.js';
import { RESEARCH_NODES } from '../../data/research.js';
import { CALENDAR } from '../../data/balance.js';
import { EXPANSIONS } from '../../data/facilities.js';
import { GUIDE_STEPS } from '../../data/guide.js';
import { ACH23_COMBOS } from '../../data/achievements.js';

const VISIBLE_RESEARCH = new Set(RESEARCH_NODES.map((n) => n.id));
const NORMAL_EXPANSIONS = EXPANSIONS.filter((z) => !z.secret).map((z) => z.id);

const NAMED = new Set(STAFF.map((s) => s.id));
const partNo = (id) => Number(String(id ?? '').replace(/\D/g, '')) || 0; // CH08 → 8

// A finished robot, flattened for rules (count-of over run.robots).
export function robotFact(rec, c) {
  const r = rec.result ?? {};
  const comps = r.components ?? {};
  const parts = Object.values(comps);
  const cx = parts.map((id) => COMPONENTS[id]?.cx ?? 0);
  const team = [...new Set([...(rec.team ?? []).map((t) => t.id), ...(rec.contributors ?? [])])];
  return {
    number: rec.number,
    name: rec.name,
    purpose: r.purpose,
    prototype: r.purpose === 'experimental', // M17: a Research Prototype = an Experimental robot
    tier: r.tier,
    quality: r.quality ?? 0,
    review: r.review ?? 0,
    innovation: r.innovation ?? 0,
    faults: r.faults ?? 0,
    faultsFound: r.faultsFound ?? 0,
    softwareFaults: r.faultsByPhase ? r.faultsByPhase.software ?? 0 : null, // unknown on robots built before M17
    stats: { ...(r.stats ?? {}) },
    parts,
    slots: { ...comps },
    slotNo: Object.fromEntries(SLOTS.map((s) => [s.id, partNo(comps[s.id])])),
    maxCx: cx.length ? Math.max(...cx) : 0,
    minCx: cx.length ? Math.min(...cx) : 0,
    family: r.visual ?? null,
    combos: [...(r.synergies ?? [])],
    launched: !!rec.launchedProductId,
    contract: rec.deliveredContractId ?? null,
    team,
    secretStaff: team.filter((id) => STAFF_BY_ID[id]?.tier === 'secret').length,
    legendaryStaff: team.filter((id) => STAFF_BY_ID[id]?.tier === 'legendary').length,
    competitionEntries: rec.competitions?.entries ?? 0,
  };
}

export function competitionFact(r, c) {
  const rec = c.history.get(r.robotNumber);
  const robot = rec ? robotFact(rec, c) : null;
  const target = COMPETITIONS_BY_ID[r.eventId]?.target ?? 0;
  const weighted = r.numbers?.weighted ?? null;
  return {
    eventId: r.eventId,
    won: !!r.won,
    place: r.place,
    strategy: r.setup?.strategyId ?? null,
    tuning: r.setup?.tuningId ?? null,
    pilot: r.setup?.pilotId ?? null,
    robot: r.robotNumber ?? null,
    robotParts: robot?.parts ?? [],
    robotPurpose: robot?.purpose ?? null,
    robotMaxCx: robot?.maxCx ?? 0,
    breakdowns: r.player?.breakdowns ?? 0,
    dnf: !!r.player?.dnf,
    score: r.player?.final ?? 0,
    // How far under the event's rival target the robot's weighted score was (12 = 12% under).
    underTargetPct: weighted != null && target ? Math.round((1 - weighted / target) * 1000) / 10 : -999,
    day: r.day ?? null,
  };
}

const robots = (c) => c.history.records.filter((r) => r.result).map((r) => robotFact(r, c));
const comps = (c) => c.competitions.results.map((r) => competitionFact(r, c));

// The most wins by one pilot.
function maxWinsOnePilot(list) {
  const by = {};
  for (const x of list) if (x.won && x.pilot) by[x.pilot] = (by[x.pilot] ?? 0) + 1;
  return Math.max(0, ...Object.values(by));
}

// The longest run of entries in a row with no breakdown (and no DNF).
function maxCleanStreak(list) {
  let best = 0;
  let cur = 0;
  for (const x of list) {
    cur = x.breakdowns === 0 && !x.dnf ? cur + 1 : 0;
    best = Math.max(best, cur);
  }
  return best;
}

// SEC-STAFF-S5: entered the Black Circuit, then beat your own best score there with Rex Vantage or Nova Black.
function c12BeatenByLegend(list) {
  const c12 = list.filter((x) => x.eventId === 'C12');
  for (let i = 1; i < c12.length; i++) {
    const before = Math.max(...c12.slice(0, i).map((x) => x.score));
    if (['PIL09', 'PIL10'].includes(c12[i].pilot) && c12[i].score > before) return true;
  }
  return false;
}

// Parts open in this run (debug "unlock all" does not count).
const partsDiscovered = (c) => Object.keys(COMPONENTS).filter((id) => c.partOpen(id, { ignoreDebug: true }));

// The account facts this run reports (Campaign.syncSecretFacts sets them before each check and on save).
export function runAccountFacts(c) {
  const cs = comps(c);
  return {
    staffEverHired: Object.keys(c.careers.records),
    competitionWins: c.competitions.totalWins,
    competitionEntries: c.competitions.totalEntries,
    zeroFaultProjects: c.counter('zeroFaultProjects'),
    projectsFinished: c.history.count,
    robotFamilies: [...new Set(c.history.records.map((r) => r.result?.visual).filter(Boolean))],
    eventsWon: Object.entries(c.competitions.records).filter(([, v]) => v.wins > 0).map(([id]) => id),
    c09WinPurposes: [...new Set(cs.filter((x) => x.eventId === 'C09' && x.won).map((x) => x.robotPurpose).filter(Boolean))],
    partsDiscovered: partsDiscovered(c),
    endings: c.flags.endingReached ? 1 : 0,
  };
}

export function createSecretFacts(c) {
  const f = new FactRegistry();
  const S = () => c.secrets;
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
    .define('run.prestigeTokens', () => c.economy.balance('prestigeTokens'))
    .define('run.inDebt', () => !!c.economy.inDebt)
    // --- robots ---
    .define('run.projectsFinished', () => c.history.count)
    .define('run.zeroFaultProjects', () => c.counter('zeroFaultProjects'))
    .define('run.commercialLaunches', () => c.counter('commercialLaunches'))
    .define('run.advancedRobots', () => c.counter('advancedRobots'))
    .define('run.aiHeavyProjects', () => c.counter('aiHeavyProjects'))
    .define('run.robots', () => robots(c))
    .define('run.bestQuality', () => Math.max(0, ...robots(c).map((r) => r.quality)))
    .define('run.bestInnovation', () => Math.max(0, ...robots(c).map((r) => r.innovation)))
    .define('run.purposesBuilt', () => [...new Set(robots(c).map((r) => r.purpose))])
    .define('run.partsUsed', () => [...(c.research.firsts.part ?? [])])
    .define('run.partsOpen', () => [...c.openParts])
    .define('run.partsDiscovered', () => partsDiscovered(c))
    .define('run.combosDiscovered', () => Object.keys(c.synergyArchive.run.found))
    .define('run.combosDiscoveredCount', () => Object.keys(c.synergyArchive.run.found).length)
    // --- sales ---
    .define('run.unitsSold', () => c.products.products.reduce((t, p) => t + (p.totalUnits ?? 0), 0))
    .define('run.products', () => c.products.products.map((p) => ({ position: p.data.position, units: p.totalUnits ?? 0, quality: p.data.quality, review: p.data.review, tier: p.data.tier, purpose: p.data.purpose })))
    .define('run.contractsDone', () => c.contracts.stats.succeeded)
    .define('run.contractsFailed', () => c.contracts.stats.failed)
    // --- research ---
    .define('run.researchDone', () => c.research.nodes.filter((n) => c.research.isDone(n.id)).map((n) => n.id))
    .define('run.researchCount', () => c.research.doneCount)
    .define('run.researchMastery', () => c.feature('researchMastery'))
    .defineGroup('run.branchComplete', (branch) => RESEARCH_NODES.filter((n) => n.branch === branch).every((n) => c.research.isDone(n.id)))
    .define('run.researchByYear3', () => Object.values(c.flags.researchDays ?? {}).filter((d) => d < 3 * CALENDAR.monthsPerYear * CALENDAR.daysPerMonth).length)
    // --- competitions ---
    .define('run.competitions', () => comps(c))
    .define('run.competitionWins', () => c.competitions.totalWins)
    .define('run.competitionEntries', () => c.competitions.totalEntries)
    .define('run.eventsWon', () => Object.entries(c.competitions.records).filter(([, v]) => v.wins > 0).map(([id]) => id))
    .define('run.eventsWonCount', () => Object.values(c.competitions.records).filter((v) => v.wins > 0).length)
    .define('run.competitionsOpen', () => c.openCompetitions.map((e) => e.id))
    .define('run.maxWinsOnePilot', () => maxWinsOnePilot(comps(c)))
    .define('run.maxCleanStreak', () => maxCleanStreak(comps(c)))
    .define('run.c12BeatenByLegend', () => c12BeatenByLegend(comps(c)))
    .define('run.trophies', () => Object.keys(c.trophies.awarded))
    // --- people ---
    .define('run.staff', () => c.staff.staff.map((s) => ({ id: s.id, role: s.role, tier: s.tier, level: s.level, stats: { ...s.stats }, projects: c.careers.count(s.id, 'projects'), robots: c.careers.count(s.id, 'robots') })))
    .define('run.staffIds', () => c.staff.staff.map((s) => s.id))
    .define('run.staffHired', () => Object.keys(c.careers.records))
    .define('run.legendaryHired', () => Object.keys(c.careers.records).filter((id) => STAFF_BY_ID[id]?.tier === 'legendary').length)
    .define('run.startersLoyal', () => STARTER_IDS.every((id) => (c.careers.get(id)?.stints ?? []).length === 1 && c.careers.isCurrent(id)))
    .define('run.starterProjects', () => STARTER_IDS.reduce((t, id) => t + c.careers.count(id, 'robots'), 0))
    // --- workshop ---
    .define('run.facilities', () => [...new Set(c.facilities.placed.map((p) => p.def))])
    .define('run.expansionsOwned', () => [...c.facilities.owned])
    .define('run.eventsSeen', () => Object.keys(c.events.state.count))
    .define('run.secrets', () => Object.keys(S().run.unlocked))
    // --- achievements (Milestone 18) ---
    .define('run.tutorialDone', () => (c.guideState?.done ?? []).length >= GUIDE_STEPS.length || c.competitions.totalEntries > 0)
    .define('run.bestReview', () => Math.max(0, ...robots(c).map((r) => r.review)))
    .define('run.projectsRunning', () => c.projects.jobs.length)
    .define('run.rolesEmployedCount', () => new Set(c.staff.staff.map((s) => s.role)).size)
    .define('run.staffCount', () => c.staff.staff.length)
    .define('run.mostTrainingOneWorker', () => Math.max(0, ...Object.values(c.careers.records).map((r) => r.counters.training ?? 0)))
    .define('run.visibleResearchCount', () => c.research.nodes.filter((n) => VISIBLE_RESEARCH.has(n.id) && c.research.isDone(n.id)).length)
    .define('run.normalCombosCount', () => ACH23_COMBOS.filter((id) => c.synergyArchive.inRun(id)).length)
    .define('run.creditsEarned', () => c.flags.creditsEarned ?? 0)
    .define('run.everInDebt', () => !!c.flags.everInDebt)
    .define('run.normalExpansions', () => NORMAL_EXPANSIONS.filter((id) => c.facilities.isOwned(id)).length)
    .define('run.maxStaffLevel', () => Math.max(0, ...c.staff.staff.map((s) => s.level)))
    .defineGroup('run.flag', (name) => c.flags[name] ?? false)
    // --- account (every run) ---
    .define('account.runs', () => Object.keys(S().account.facts.projectsFinished ?? {}).length || 1)
    .define('account.secrets', () => Object.keys(S().account.history))
    .define('account.combosDiscovered', () => Object.keys(c.synergyArchive.account.found))
    .define('account.namedStaffHired', () => (S().accountFact('staffEverHired') ?? []).filter((id) => NAMED.has(id)).length)
    .define('account.robotFamiliesCount', () => new Set([...(S().accountFact('robotFamilies') ?? []), ...Object.keys(S().account.flags.families ?? {})]).size)
    .defineGroup('account', (name) => S().accountFact(name))
    // --- the trigger event's own details ---
    .defineGroup('event', (path, ctx) => readPath(ctx.payload, path));
  return f;
}
