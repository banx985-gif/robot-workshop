// The run's staff (Milestone 3, bible §3.5.3–3.5.5, §11): the opening team, the Founder (flag, perk, history), the
// candidate pool rule, and the shared core/StaffSystem + core/FounderPerks set up with CAREWORKS data. Pure data in,
// data out, so the Node tests use it as it is.
//   openingTeam(founderId)       the §3.5.4 rule: Founder + Maya + Ruby; if the Founder is Maya or Ruby, + Zoe
//   newStaffState(founderId)     the run save's staff part: { staff, founder, roster, coverage, assignments, noCandidates }
//   ensureStaffState(saved, founderId)   an older save (M1/M2 had none) gets a team built the same way
//   candidatePool(state)         who could be offered as a candidate later (never the Founder, never someone employed)
//   makeStaffSystem(state, rng) · makeFounderPerks(state)
//   contribMult(perks, staffId, need)    the Founder's "+6% contribution": the multiplier on a need they ease
//   perkPct(perks, staffId, key)         a secondary perk number (0 unless it is the Founder helping)
import { StaffSystem } from '../../../../core/StaffSystem.js';
import { StaffModel } from '../../../../core/StaffModel.js';
import { FounderPerks } from '../../../../core/FounderPerks.js';
import { Rng } from '../../../../core/Rng.js';
import { STAFF, TRAITS, staffById } from '../../data/staff.js';
import { ROLES, STATS, STAT_IDS, TIERS } from '../../data/roles.js';
import { FOUNDERS, founderById, FOUNDER_FLAG } from '../../data/setup.js';
import { STAFF_BALANCE, SHIFTS } from '../../data/balance.js';
import { newRosterState, ensureRosterState } from './roster.js';
import { newCoverageState, ensureCoverageState } from './coverage.js';

const MAYA = 'RN01';
const RUBY = 'CW01';
const ZOE = 'LC01';

export function openingTeam(founderId) {
  const f = founderById(founderId) ? founderId : MAYA;
  if (f === MAYA) return [MAYA, RUBY, ZOE];
  if (f === RUBY) return [RUBY, MAYA, ZOE];
  return [f, MAYA, RUBY];
}

const newHistory = () => ({
  continuous: true, // continuous employment since day 1
  daysEmployed: 0, // → years employed (a year is 336 days)
  careTasks: 0, // resident-care tasks completed
  carePlanReviews: 0, // Milestone 4+
  programs: 0,
  recognitions: 0,
  mentoring: 0,
  endingParticipation: false,
  legacyCarryover: false,
});

export function newStaffState(founderId) {
  const team = openingTeam(founderId);
  const founder = team[0];
  const staff = team.map((id) => {
    const def = staffById(id);
    const m = StaffModel.fromDefinition({ ...def, startLevel: def.level }, { startEnergy: STAFF_BALANCE.startEnergy, startMorale: STAFF_BALANCE.startMorale });
    m.counters = { tasks: 0 };
    if (id === founder) m.counters[FOUNDER_FLAG] = true;
    return m.toJSON();
  });
  return {
    staff,
    founder: { id: founder, [FOUNDER_FLAG]: true, perk: founderById(founder).perk.effects.map((e) => ({ ...e })), history: newHistory() },
    roster: newRosterState(staff), // Milestone 7: three shifts (data/shifts.js DEFAULT_ROSTER), wings, floats, on call
    coverage: newCoverageState(), // Milestone 7: shift records, the coverage log, the unsafe-shift counter
    assignments: {}, // routine step id → staff id (none = automatic)
    continuity: {}, // Milestone 13: staff id → [resident ids] (their continuity group, bible §14)
    noCandidates: [founder], // bible §3.5.4: the Founder never appears again as a candidate
    pos: {}, // staff id → { x, y } where they were (a reload puts them back)
    bandDone: {}, // Milestone 4: staff id → tasks finished this band (the task AI's workload)
    modes: {}, // Milestone 4: staff id → { mode, postIndex, stay } (a reload carries on the same walk)
  };
}

export function ensureStaffState(saved, founderId) {
  if (!saved || !Array.isArray(saved.staff) || !saved.staff.length) return newStaffState(founderId);
  const fresh = newStaffState(saved.founder?.id ?? founderId);
  return {
    ...fresh,
    ...saved,
    founder: { ...fresh.founder, ...(saved.founder ?? {}), history: { ...newHistory(), ...(saved.founder?.history ?? {}) } },
    roster: ensureRosterState(saved.roster, saved.staff.map((m) => m.id)), // Milestones 3–6: everyone stays on Morning
    coverage: ensureCoverageState(saved.coverage),
    assignments: { ...(saved.assignments ?? {}) },
    continuity: Object.fromEntries(Object.entries(saved.continuity ?? {}).map(([k, v]) => [k, [...v]])), // (an M12 save: none)
    noCandidates: [...new Set([...(saved.noCandidates ?? []), fresh.founder.id])],
    pos: { ...(saved.pos ?? {}) },
    bandDone: { ...(saved.bandDone ?? {}) },
    modes: { ...(saved.modes ?? {}) },
  };
}

// Start staff and Start candidates who are not on the team and not ruled out (the Founder). Recruitment is Milestone 11.
export function candidatePool(state) {
  const employed = new Set(state.staff.map((s) => s.id));
  const never = new Set(state.noCandidates ?? []);
  return STAFF.filter((d) => (d.eligibility === 'start' || d.eligibility === 'candidate') && !employed.has(d.id) && !never.has(d.id)).map((d) => d.id);
}

export function makeStaffSystem(state, rng = new Rng('careworks-staff')) {
  const sys = new StaffSystem({
    rng,
    statKeys: STAT_IDS,
    roles: ROLES,
    tiers: TIERS,
    traits: TRAITS,
    rules: { startEnergy: STAFF_BALANCE.startEnergy, startMorale: STAFF_BALANCE.startMorale, tiredBelow: 25, stressedBelow: 25 },
  });
  sys.load(state.staff);
  return sys;
}

export function makeFounderPerks(state) {
  const perks = new FounderPerks({ founders: FOUNDERS.map((f) => ({ id: f.id, perkName: f.perk.name, perkText: f.perk.text, effects: f.perk.effects, team: openingTeam(f.id) })) });
  perks.set(state.founder?.ended ? null : state.founder?.id ?? null); // (Milestone 11: a Founder let go keeps no perk)
  return perks;
}

export function contribMult(perks, staffId, need) {
  if (!staffId || perks.def?.id !== staffId) return 1;
  const stat = STATS.find((s) => s.need === need);
  return stat ? 1 + perks.total(`contrib_${stat.id}`) / 100 : 1;
}

export function perkPct(perks, staffId, key) {
  return staffId && perks.def?.id === staffId ? perks.total(key) : 0;
}

export const yearsEmployed = (history, daysPerYear = 336) => Math.floor((history?.daysEmployed ?? 0) / daysPerYear);
export const shiftOf = (state, staffId) => SHIFTS[state.roster.shifts[staffId]] ?? null;
