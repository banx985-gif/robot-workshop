// A new facility's campaign save and its slot summary (Milestones 0–2, bible §3.5 / §42). Pure data in, data out, so
// the Node tests can use it.
//   newCampaign(setup, now)   the run save START FACILITY writes: the facility, the clock (Milestone 2) and the
//                             residents' state (Arthur only for now)
//   slotSummary(data)         the small record the Campaign Slots screen reads without loading the campaign
//   SAVE_MIGRATIONS           older saves → this version: v1 (Milestones 0–1) had no clock and no resident state;
//                             v2 (Milestone 2) had no staff — a team is built from its stored Founder (Maya if none);
//                             v3 (Milestone 3) had no care plan or tasks — the plan from data, an empty task board
//                             v4 (Milestone 4) had no Dining Room / Staff Room / props: anyone saved on a tile they
//                             now stand on moves to the nearest free tile, a meal under way moves to the Dining Room,
//                             staff resting in the lounge walk to the Staff Room; Credits / Care Tokens start
//                             v5 (Milestone 5) had the 12 × 16 home: everyone is put back where they belong in the
//                             24 × 16 one (Arthur in his room or seat, staff at their post, task spot or rest spot);
//                             three empty rooms; the board and the ledger start fresh (the ledger opens with the
//                             saved Credits)
//                             v6 (Milestone 6) had one Morning shift: everyone stays on Morning (now 05:00–12:00), on
//                             the Home wing, no floats, an RN on call at night, no coverage history yet
//                             v7 (Milestone 7) had no plan reviews: every plan keeps its options and counts as reviewed
//                             on the load day (not stale); option preferences come from data
//                             v8 (Milestone 8) had no stays, tags or returning residents: nothing to move — its
//                             residents keep staying (no timer), their tags come from data when the home opens
import { founderById, paletteById, ROLES, FOUNDER_FLAG } from '../../data/setup.js';
import { residentById } from '../../data/residents.js';
import { RESIDENT, HOME, HELP_SPOTS, HELP_SPOTS_2, SEATS, POSTS } from '../../data/home.js';
import { ROUTINE } from '../../data/routine.js';
import { ECONOMY_START } from '../../data/balance.js';
import { makeClock, buildGrid, spotTile } from './homeWorld.js';
import { newResidentState, newStay } from './residentNeeds.js';
import { stayLengthFor } from './admissions.js';
import { newStaffState } from './staffTeam.js';
import { ensureRosterState } from './roster.js';
import { ensureCoverageState } from './coverage.js';
import { markReviewed } from './carePlanRules.js';
import { newCareState, upgradeFamiliarity } from './careTasks.js';
import { ensurePlan } from '../../data/carePlans.js';
import { RENAMED_IDS } from '../../data/clinical.js';

const freshResidents = () => [newResidentState(residentById(RESIDENT.id), { room: RESIDENT.room })];
// Milestone 9: a new home's Arthur is on his respite stay from day 0 (an older save's Arthur keeps staying).
function newGameResidents(seed) {
  const [arthur] = freshResidents();
  const def = residentById(RESIDENT.id);
  arthur.stay = { ...newStay(def, stayLengthFor(def, seed, 0), 0), opening: true, paused: 0 }; // (never home while he is the only resident)
  return [arthur];
}
const dateOf = (clock) => ({ year: clock.year, month: clock.month, day: clock.day });

// The campaign save written by START FACILITY. setup = { facility, director, palette, founder }.
export function newCampaign(setup, now = Date.now()) {
  const founder = founderById(setup.founder);
  if (!founder) throw new Error(`Unknown founder ${setup.founder}`);
  const clock = makeClock().serialize();
  const seed = `careworks-${now}`;
  return {
    facility: {
      name: setup.facility,
      director: setup.director,
      palette: paletteById(setup.palette).id,
      founder: { id: founder.id, [FOUNDER_FLAG]: true }, // history counters (bible §3.5.5) join in later milestones
      createdAt: now,
    },
    seed, // the run's seed: the residents' daily yes / no answers (a reload never rerolls them)
    clock,
    date: dateOf(clock),
    residents: newGameResidents(seed),
    staff: newStaffState(founder.id), // Milestone 3: the opening team, the Founder's flag / perk / history, the shift
    care: newCareState(), // Milestone 4: the day's care tasks, call-bell records, Familiar Care (the plan is on each resident)
    economy: { ...ECONOMY_START }, // Milestone 5: shown in the top bar (the economy is Milestone 22)
    playSec: 0,
    ngPlus: 0,
  };
}

// The small record the Campaign Slots screen reads (bible §3.5.9: readable without loading the full simulation).
// Rank, grade and resident count stay out until those systems exist (card: zero or hidden).
export function slotSummary(data) {
  const f = data.facility;
  const founder = founderById(f.founder.id);
  const when = data.clock ?? data.date;
  return {
    facility: f.name,
    director: f.director,
    palette: f.palette,
    founderId: founder?.id ?? f.founder.id,
    founderName: founder?.name ?? f.founder.id,
    founderRole: founder ? ROLES[founder.role].name : '',
    year: when.year,
    month: when.month,
    ngPlus: data.ngPlus ?? 0,
    residents: Array.isArray(data.residents) ? data.residents.length : 1, // Milestone 6
    rank: ['E', 'D', 'C', 'B', 'A', 'S'][data.care?.quality?.rep?.highestRankIndex ?? 0] ?? 'E', // (Milestone 26)
    playSec: data.playSec ?? 0,
  };
}

// Version 1 → 2 (Milestone 2): a clock from the saved date, starting just before Arthur wakes; Arthur on his defaults.
export function upgradeV1(data) {
  const clock = makeClock();
  const d = data.date ?? { year: 1, month: 1, day: 1 };
  clock.year = d.year;
  clock.month = d.month;
  clock.day = d.day;
  clock.totalDays = ((d.year - 1) * clock.monthsPerYear + (d.month - 1)) * clock.daysPerMonth + (d.day - 1);
  return {
    ...data,
    seed: data.seed ?? `careworks-${data.facility?.createdAt ?? 0}`,
    clock: data.clock ?? clock.serialize(),
    residents: Array.isArray(data.residents) ? data.residents : freshResidents(),
  };
}
// Version 2 → 3 (Milestone 3): the opening team from the stored Founder.
export function upgradeV2(data) {
  return { ...data, staff: data.staff?.staff ? data.staff : newStaffState(data.facility?.founder?.id ?? 'RN01') };
}
// Version 3 → 4 (Milestone 4): each resident gets the starting care plan from data; an empty care state (the day's
// tasks are planned when the band comes round again).
export function upgradeV3(data) {
  const residents = (data.residents ?? []).map((r) => ({ ...r, plan: ensurePlan(r.plan, residentById(r.id)?.plan) }));
  return { ...data, residents, care: data.care ?? newCareState() };
}
// Version 4 → 5 (Milestone 5): the Dining Room, the Staff Room and the props now stand on tiles that were open floor.
// The layout is data (the same for every save), so the upgrade only has to make the people fit round it.
const CELL = HOME.cellSize;
const centre = (t) => ({ x: (t.col + 0.5) * CELL, y: (t.row + 0.5) * CELL });
// The nearest open tile to a saved position (itself when it is open): breadth-first over the grid.
export function nearestOpen(grid, pos) {
  const start = { col: Math.min(grid.cols - 1, Math.max(0, Math.floor(pos.x / CELL))), row: Math.min(grid.rows - 1, Math.max(0, Math.floor(pos.y / CELL))) };
  if (!grid.isBlocked(start.col, start.row)) return pos;
  const key = (t) => `${t.col},${t.row}`;
  const seen = new Set([key(start)]);
  const queue = [start];
  while (queue.length) {
    const t = queue.shift();
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = { col: t.col + dc, row: t.row + dr };
      const k = key(n);
      if (!grid.inBounds(n.col, n.row) || seen.has(k)) continue;
      if (!grid.isBlocked(n.col, n.row)) return centre(n);
      seen.add(k);
      queue.push(n);
    }
  }
  return pos;
}
const DINING_SPOTS = new Set([HELP_SPOTS.dining, HELP_SPOTS_2.dining]);
export function upgradeV4(data) {
  const grid = buildGrid();
  const residents = (data.residents ?? []).map((r) => {
    const out = { ...r };
    const step = r.step && ROUTINE.find((s) => s.id === r.step.id);
    const atMeal = step?.place === 'dining' && (r.step.status === 'waiting' || r.step.status === 'doing') && r.step.arthurThere;
    if (atMeal) out.pos = centre(spotTile('F03.dining')); // the meal carries on at the Dining Room table
    if (out.pos) out.pos = nearestOpen(grid, out.pos);
    return out;
  });
  const staff = data.staff ? { ...data.staff, pos: { ...(data.staff.pos ?? {}) }, modes: { ...(data.staff.modes ?? {}) } } : data.staff;
  const care = data.care ? { ...data.care, tasks: (data.care.tasks ?? []).map((t) => ({ ...t })) } : data.care;
  if (staff) {
    // a helper already at the old dining spot is now at the new one
    for (const t of care?.tasks ?? []) {
      const id = t.slots?.[0];
      if ((t.status === 'claimed' || t.status === 'working') && t.arrived && DINING_SPOTS.has(t.spot) && id && staff.pos[id]) staff.pos[id] = centre(spotTile(t.spot));
    }
    // resting in the lounge → walk to the Staff Room
    for (const [id, m] of Object.entries(staff.modes)) if (m?.mode === 'resting') staff.modes[id] = { ...m, mode: 'toRest' };
    for (const [id, pos] of Object.entries(staff.pos)) staff.pos[id] = nearestOpen(grid, pos);
  }
  return { ...data, residents, staff, care, economy: data.economy ?? { ...ECONOMY_START } };
}
// Version 5 → 6 (Milestone 6): the home grew to 24 × 16 and its rooms moved, so saved positions mean nothing now —
// everyone is put back where they belong. Resident rooms, applicants and the ledger need nothing here (the home world
// fills three empty rooms, a fresh board and a ledger opening with data.economy.credits).
export function upgradeV5(data) {
  const at = (ref) => centre(spotTile(ref));
  const residents = (data.residents ?? []).map((r, i) => {
    const step = r.step && ROUTINE.find((x) => x.id === r.step.id);
    const there = step && step.place !== 'room' && r.step.arthurThere && (r.step.status === 'waiting' || r.step.status === 'doing');
    return { ...r, pos: there ? at(SEATS[step.place][i] ?? SEATS[step.place][0]) : at(`${r.room ?? RESIDENT.room}.inside`) };
  });
  if (!data.staff?.staff) return { ...data, residents };
  const staff = { ...data.staff, pos: { ...(data.staff.pos ?? {}) }, modes: { ...(data.staff.modes ?? {}) } };
  const onTask = new Map((data.care?.tasks ?? []).filter((t) => (t.status === 'claimed' || t.status === 'working') && t.slots?.[0]).map((t) => [t.slots[0], t]));
  staff.staff.forEach((m, i) => {
    const mode = staff.modes[m.id]?.mode;
    const t = onTask.get(m.id);
    if (mode === 'resting' || mode === 'toRest') {
      staff.pos[m.id] = at(`rest.${i + 1}`);
      staff.modes[m.id] = { ...staff.modes[m.id], mode: 'resting' };
    } else if (t?.arrived && t.spot) staff.pos[m.id] = at(t.spot);
    else staff.pos[m.id] = at(POSTS[m.role].spots[staff.modes[m.id]?.postIndex ?? 0] ?? POSTS[m.role].spots[0]);
  });
  // a helper still on the way picks a spot again (the spots moved)
  const care = data.care ? { ...data.care, tasks: data.care.tasks.map((t) => ((t.status === 'claimed' || t.status === 'working') && !t.arrived ? { ...t, spot: null } : { ...t })) } : data.care;
  return { ...data, residents, staff, care };
}
// Version 6 → 7 (Milestone 7): three shifts. The one Morning shift's people stay on Morning (the card's rule); wings,
// floats, on-call and an empty coverage record are added.
export function upgradeV6(data) {
  if (!data.staff?.staff) return data;
  const ids = data.staff.staff.map((m) => m.id);
  return { ...data, staff: { ...data.staff, roster: ensureRosterState(data.staff.roster, ids), coverage: ensureCoverageState(data.staff.coverage) } };
}
// Version 7 → 8 (Milestone 8): plan reviews. Plans keep their options; each counts as reviewed on the load day.
export function upgradeV7(data) {
  const day = data.clock?.totalDays ?? 0;
  const residents = (data.residents ?? []).map((r) => {
    const out = { ...r, needs: { ...(r.needs ?? {}) }, optionPrefs: { ...(residentById(r.id)?.optionPrefs ?? {}), ...(r.optionPrefs ?? {}) } };
    if (out.review == null) markReviewed(out, day);
    return out;
  });
  return { ...data, residents };
}
// Version 11 → 12 (Milestone 12): the Familiar Care pair counters become records (familiarity and tasks together =
// the old count; first met / last together unknown). Staff and staffing need nothing: new fields default.
export function upgradeV11(data) {
  if (!data.care) return data;
  return { ...data, care: upgradeFamiliarity({ ...data.care, relations: { ...(data.care.relations ?? {}) } }) };
}
// Version 17 → 18 (Milestone 18): the few ids that were diagnosis words were renamed (a course, two traits, a diet):
// every place a save holds one gets the new id. Clinical state starts empty: no open alerts, no rounds yet.
export function upgradeV17(data) {
  let json = JSON.stringify(data);
  for (const [from, to] of Object.entries(RENAMED_IDS)) json = json.split(`"${from}"`).join(`"${to}"`);
  return JSON.parse(json);
}
export const SAVE_MIGRATIONS = {
  1: (record) => ({ ...record, data: upgradeV1(record.data) }),
  2: (record) => ({ ...record, data: upgradeV2(record.data) }),
  3: (record) => ({ ...record, data: upgradeV3(record.data) }),
  4: (record) => ({ ...record, data: upgradeV4(record.data) }),
  5: (record) => ({ ...record, data: upgradeV5(record.data) }),
  6: (record) => ({ ...record, data: upgradeV6(record.data) }),
  7: (record) => ({ ...record, data: upgradeV7(record.data) }),
  8: (record) => record, // (Milestone 9: nothing to move; new data only reaches new admissions)
  9: (record) => record, // (Milestone 10: no layout saved = the default layout, Stage 1 — exactly what it had)
  10: (record) => record, // (Milestone 11: no staffing saved = a fresh board; the bigger floor needs nothing)
  11: (record) => ({ ...record, data: upgradeV11(record.data) }),
  12: (record) => record, // (Milestone 13: no friendships / pins saved = none; wake times and seats come from each resident)
  13: (record) => record, // (Milestone 14: no activity state = Cards every afternoon, free mornings — the M2 session carries over)
  14: (record) => record, // (Milestone 15: no dining state = the default weekly menu; diets, favourites and satisfaction start from each resident)
  15: (record) => record, // (Milestone 16: mobility from each resident's profile and needs; rehab residents get goals from their current needs)
  16: (record) => record, // (Milestone 17: memory-support residents start steady, with no sessions yet and a full Choice score; no walking path)
  17: (record) => ({ ...record, data: upgradeV17(record.data) }), // (Milestone 18: renamed ids; no open alerts)
  18: (record) => record, // (Milestone 19: no family state = a record per resident from their Visitors column, Trust 60 (an M16 record keeps its change); no visits yet)
  19: (record) => record, // (Milestone 20: no program state = no programs running)
  20: (record) => record, // (Milestone 21: no research state = nothing researched, 0 RP — the M16 Research counter becomes RP once)
  21: (record) => record, // (Milestone 22: the balance as it is; no economy state = no debt, 0 Care Tokens; levels from each resident's profile)
  22: (record) => record, // (Milestone 23: no partner state = no deals, every partner at Partner tier, a first grant board, nothing active)
  23: (record) => record, // (Milestone 24: no wings painted = the one Home wing; nothing being built; the stage as it was)
  24: (record) => record, // (Milestone 25: no incident state = nothing under way, supplies at their starting stock, no past events or falls)
  25: (record) => record, // (Milestone 25c: no levels = every piece at Level I; no item state = an empty store, likes from each person's role)
  26: (record) => record, // (Milestone 26: no quality state = the scores worked out from the home as it is; Rank E, or the rank its stage / Level II–III pieces / debug partner rank already need)
  27: (record) => record, // (Milestone 27: no end-of-life state = everyone Settled, nothing held, no pages; the account's Memory Book starts empty)
  28: (record) => record, // (Milestone 28: no director state = an empty queue and log; every system's own Inbox items are kept as they are)
  29: (record) => record, // (Milestone 29: no secrets state = nothing found, no clues; the facts' records rebuilt from the history the save has)
  30: (record) => record, // (Milestone 30b: no Works Gods yet — no god arrived or hired, no god secret found; the new records (good surprises, this month's call bells) start at 0)
  31: (record) => record, // (Milestone 32: no achievements state = nothing earned in this home yet; it catches up at once on load from what the home already has (quiet Inbox lines); records start from the next day)
};

// "Facility Director Aaron — Banks Care" (bible §3.5.2).
export const directorLine = (director, facility) => `Facility Director ${director || '…'} — ${facility || '…'}`;
