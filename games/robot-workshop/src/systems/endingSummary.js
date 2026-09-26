// Robot Workshop's Year 16 ending numbers (Milestone 19): the facts core/GradeEngine.js grades (data/ending.js says
// how), the company recap the Global Robotics Awards show, and the run summary kept in the account archive.
import { gradeRun } from '../../../../core/GradeEngine.js';
import { GRADE_CATEGORIES, GRADE_BANDS } from '../../data/ending.js';
import { STARTING_MONEY } from '../../data/economy.js';
import { RESEARCH_NODES } from '../../data/research.js';
import { ACH23_COMBOS } from '../../data/achievements.js';
import { TROPHIES } from '../../data/competitions.js';
import { ROLES } from '../../data/staff.js';
import { robotArtOf } from './robotVisual.js';

const avgTop = (list, n) => list.sort((a, b) => b - a).slice(0, n).reduce((t, v) => t + v, 0) / n; // missing ones count as 0
const LADDER_TROPHIES = TROPHIES.filter((t) => !t.secret && t.id !== 'eliteMasters').map((t) => t.id); // Local, Regional, National, World

// The plain numbers each grade part reads (data/ending.js GRADE_CATEGORIES).
export function gradeFacts(c) {
  const robots = c.history.records.filter((r) => r.result);
  const eco = c.economy;
  return {
    rankIndex: c.reputation.highestRankIndex,
    reputation: c.reputation.value,
    profit: eco.balance('credits') - STARTING_MONEY.credits,
    solvency: eco.inDebt ? 0 : c.flags.everInDebt ? 0.5 : 1,
    topQuality: avgTop(robots.map((r) => r.result.quality ?? 0), 5),
    bestReview: Math.max(0, ...robots.map((r) => r.result.review ?? 0)),
    researchDone: RESEARCH_NODES.filter((n) => c.research.isDone(n.id)).length,
    topLevel: avgTop(c.staff.staff.map((s) => s.level), 8),
    rolesCovered: new Set(c.staff.staff.map((s) => s.role)).size,
    coursesDone: Object.values(c.careers.records).reduce((t, r) => t + (r.counters?.training ?? 0), 0),
    contractsDone: c.contracts.done.filter((k) => k.status === 'success').length,
    unitsSold: c.products.products.reduce((t, p) => t + (p.totalUnits ?? 0), 0),
    trophies: LADDER_TROPHIES.filter((id) => c.trophies.has(id)).length,
    competitionWins: c.competitions.totalWins,
    combos: ACH23_COMBOS.filter((id) => c.synergyArchive.inRun(id)).length,
    secretsFound: Object.keys(c.secrets.run.unlocked).length,
  };
}

export function gradeCampaign(c) {
  return gradeRun({ categories: GRADE_CATEGORIES, bands: GRADE_BANDS, facts: gradeFacts(c) });
}

// Best robot, top worker, trophies won, money made — the four recap cards.
export function companyRecap(c) {
  const robots = c.history.records.filter((r) => r.result);
  const best = robots.reduce((b, r) => (!b || r.result.quality > b.result.quality ? r : b), null);
  const top = c.staff.staff.reduce((b, s) => (!b || s.level > b.level || (s.level === b.level && s.xp > b.xp) ? s : b), null);
  return {
    bestRobot: best ? { name: best.name, quality: best.result.quality, review: best.result.review, purpose: best.result.purposeName ?? best.result.purpose, art: robotArtOf(best.result) } : null,
    topWorker: top ? { name: top.name, level: top.level, role: ROLES[top.role]?.name ?? top.role, art: top.art } : null,
    trophies: TROPHIES.filter((t) => c.trophies.has(t.id)).map((t) => ({ id: t.id, name: t.name, art: t.art })),
    moneyMade: c.flags.creditsEarned ?? 0,
    robotsBuilt: c.history.count,
    worldChampion: c.trophies.has('worldCup'),
  };
}

// What the account archive keeps about a finished run.
export function runSummary(c) {
  const grade = gradeCampaign(c);
  return {
    runId: c.campaignId,
    ngPlus: c.ngPlusRuns,
    endedDay: c.clock.totalDays,
    endedYear: c.ending?.endYear ?? c.clock.year - 1,
    savedAt: Date.now(),
    grade: { total: grade.total, max: grade.max, band: grade.band, categories: grade.categories.map((k) => ({ id: k.id, name: k.name, max: k.max, score: k.score, parts: k.parts })) },
    recap: companyRecap(c),
    rank: c.reputation.ranks[c.reputation.highestRankIndex].id,
    credits: c.economy.balance('credits'),
  };
}
