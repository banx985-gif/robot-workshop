// The home's world (Milestones 1–6): the hidden grid with its inside walls, the placed rooms and facilities, the game
// clock (core/Clock on data/routine.js DAY), the residents living their daily routine, and (Milestone 3) the opening
// team on the Morning shift: they stand their posts and rest at the Staff Room off shift. Milestone 4: each band every
// resident's care plan, routine and needs make care tasks (src/systems/careTasks.js); free staff on shift pick their
// next task themselves by the bible §15 score, walk to the resident (or their room), spend the task's minutes there and
// finish it; a need over the bell line rings that resident's call bell. A routine step with a helper happens when the
// help is done. Milestone 5: the Dining Room (meals) and the Staff Room (off-shift rest), the props block their tiles,
// and each midnight 'care:dayEnd' says how the day went ({ day, done, missed }).
// Milestone 6: up to four residents, one to a Standard Room, each with their own seat at the Dining Room and the
// lounge (their room's number) and their own helpers' spots; the applicant board (src/systems/admissions.js) ticks each
// day; admit() gives a free room, walks them in from the entrance and they join the routine and the task planning from
// the next band; the ledger (src/systems/ledger.js) closes each month (fees and funding in, wages out).
// Milestone 7: three shifts (src/systems/roster.js) with floats, a wing and the Night on-call flag; Safe Coverage Points
// and the four-step fallback (src/systems/coverage.js) tick before the staff move: a warning the band before a short
// shift, float cover, agency workers (hired here: they walk in from the entrance for one shift and leave after), then
// admissions pause and the Cards activity is skipped. Missed essential tasks cost care recovery at the end of each day.
// Milestone 8: all 48 plan options with eligibility (world.eligibility / planCtx), option preferences (a disliked
// option costs a little Mood when chosen; a refused one's tasks are refused and logged as they come up), the plan
// review / stale flag (world.stalePlans, world.reviewPlan) and a new resident's first plan from their primary support.
// Milestone 10: the home's layout is live (src/systems/homeLayout.js on core/FacilitySystem): rooms and facilities
// can be placed, moved and sold in Build Mode (world.build), each piece's seats, posts and walls move with it, and the
// home can grow to Stage 2. After any change the grid is rebuilt, people standing where a piece now stands step to
// the nearest open tile, residents in a moved room move with it, and everyone walking finds a new way. Admissions give
// a free room of the right kind (Memory Support / High-Care residents need theirs) up to the stage's capacity.
// Milestone 15: nutrition and dining (src/systems/dining.js): each meal is a service — the kitchen prepares it (a prep
// task at the Kitchen for a Hospitality worker), servers bring the dining trolley and serve the residents at their seats
// in turn, and anyone who can't come has a tray brought to their room; drinks rounds morning and afternoon; each meal's
// quality, each resident's diet match, favourite dish and dining satisfaction (Mood and the Nutrition need).
// Milestone 16: mobility and rehab (src/systems/mobility.js): each resident's own mobility level and aid (walking speed
// follows it), MO04 two-person transfers, a daily therapy step and four rehab goals for anyone in rehab, the stored
// falls-risk number, and a successful discharge (ready to go home → confirmed, or after three days) with its rewards.
// Milestone 17: memory support (src/systems/memory.js): a steadier routine (continuity counts double, no reseating, a
// routine-change counter → steady / unsettled), life-story sessions (one-to-one, offered on an unsettled day; and
// "Life-story time" on the timetable), stimulation by place (a calm spot for the morning rest), walks — on a safe walking
// path marked in Build Mode, or along the corridor with a gentle walk back — and the stored Choice signal and family
// connection. No cure mechanic: nothing lowers the Memory need.
// Milestone 19: family trust (src/systems/family.js): each resident's family record (a fictional contact, the visit
// pattern, Family Trust and every change with its reason), visitors who walk in and sit with the resident (in the
// Family Room when there is one) and notice how things are, care-plan meetings (the Founder or a nurse attends for an
// hour), compliments, complaints as improvement tasks with an evidence trail (never Credits or a score), and family
// requests (a room move, a birthday party). world.family is the API; visitors are world.visitors (not world.people).
// Milestone 20: specialist programs (src/systems/programs.js, data/programs.js): ten programs the player starts from
// Develop → Programs when their unlock rules pass and their staff hours are free on the roster; each runs its sessions
// (a timetable slot on set days) or one-to-one offers, costs Credits each week (a ledger line) and adds a small effect
// on an outcome an earlier milestone built. A program only offers: residents join or decline by the M14 choice rules,
// and a refused option (or group activities) is never overridden. world.programs is the API.
// Milestone 21: research (src/systems/research.js on core/ResearchSystem, data/research.js): 36 nodes in six branches,
// paid for up front in Research Points (a second currency on the ledger) and finished after a few days in the one slot
// (a second with the Staff Education Centre). Done nodes open programs and facilities and add small boosts here (rb):
// task types, round safety, alert actions, falls risk, rehab, memory sessions, Familiar Care, activities, meals, Energy,
// family meetings and Trust. RP comes only from good care: discharges, compliments, a good month, running programs,
// the learning facilities. world.research is the API.
// Milestone 22: the economy (src/systems/economy.js, data/economy.js): each resident's Support Level from their assessed
// needs (funding and the required care cost by level, Safe Coverage by level), fees by room, respite funding, supplies,
// equipment wear, upkeep of every placed piece and utilities by floor area at the month's close; program funding;
// Care Tokens for firsts; debt recovery (Emergency Credit, a Rescue Investor; admissions pause in deep debt); a family
// may move a resident elsewhere after a week of very low Mood (lost fees). world.economy is the API.
// Milestone 23: community partners and grants (src/systems/partners.js, data/partners.js): partner deals in slots by
// Rank, each with a perk (pp: cost savings posted as their own ledger lines, meal quality, family Trust, garden and
// community activities, training time) and a countable obligation; grants with a countable goal and a deadline. The home
// feeds the counters only with what residents chose to join (a session with a joiner, a pilot session someone said yes
// to). The assistive-tech pilot is offered to everyone here; only those who say yes take part. world.partners is the API.
// Milestone 25: incidents, outbreaks and emergencies (src/systems/incidents.js, data/incidents.js): seven bounded event
// templates whose band (mild / moderate / severe) follows the home's Preparedness; 2–4 responses each (Credits or free; the
// home takes a free one when no choice comes); unwell residents, facilities out of action, staff off sick, extra care
// tasks, an urgent transfer through the M18 alert path; every event ends on its own with an after-report. Falls switch
// on the M16 falls risk (help → the nurse's check → a few days' rest → family told → the plan flagged). Emergency
// supplies (a stock level and a standing order). world.incidents is the API.
// Milestone 26: quality, Rank, accreditations and the peer homes (src/systems/quality.js, data/quality.js,
// data/accreditations.js, data/peers.js): each midnight qualityInputs() hands the quality system one snapshot of what
// really happened (care done, outcomes, Trust, Morale, Preparedness …); the five headline scores are its rolling
// one-month averages; Rank comes from reputation (sustained scores, inspections, accreditations) and opens the gates the
// earlier milestones kept shut until now. world.quality is the API.
// People walk on core/Agent (A* on core/Grid), so they only pass through doorways. No drawing here — the home screen
// draws it — so the Node tests run it as it is.
//   createHomeWorld({ founderId, clock, resident, residents, staff, care, seed, bus, admissions, ledger, startCredits, shortStaffing })
//     clock      a core/Clock (made here when missing)
//     resident   Arthur's saved state (Milestones 2–5), or residents = every resident's saved state (Milestone 6)
//     staff      the run's staff state (src/systems/staffTeam.js; none: a team is built from the Founder)
//     care       the run's care state (tasks, bells, familiarity; none: a fresh one)
//     seed       the run's seed (their daily yes / no answers, the applicants)
//     admissions / ledger   their saved states (none: a fresh board / an opening balance of startCredits)
//     shortStaffing  false: no warnings, float / agency cover, scale-back or care recovery (the older milestones' tests)
//     bus        optional: 'care:band', 'care:step', 'care:task', 'care:bell', 'care:dayEnd', 'care:admit', 'care:joined',
//                'staff:*', 'admissions:change', 'ledger:close'
//   world.update(realDt)   the clock and everyone move at the clock's speed; nothing moves while paused
//   world.hour · world.band · world.people · world.staff · world.placed · world.props · world.residents (people)
//   world.resident (Arthur, the first resident) · world.residentById(id) · world.stateOf(person) · world.whereIs(person)
//   world.assign(stepId, staffId | null, residentId?) → { ok, reason }   the "who helps" picker (pins that step's task)
//   world.chosenFor(stepId, residentId?) · world.helperFor(stepId, residentId?)
//   world.changePlan(domain, optionId, residentId?) → { ok, reason?, text? }   the Care Plan picker
//   world.care · world.tasksToday(residentId?) · world.missedToday() · world.taskOf(person)
//   world.bell (Arthur's ringing bell or null) · world.bellFor(residentId) · world.bells (every ringing bell)
//   world.bellSummary(residentId?) · world.mostFamiliar(residentId?) · world.setKeyWorker(staffId | null, residentId?)
//   world.rooms · world.freeRooms() · world.admissions · world.admitCtx() · world.admit(residentId) → { ok, reason }
//   world.ledger · world.monthRange() → { fromDay, toDay } · world.payers() / world.payroll() (the ledger's lists)
//   world.daySummary(day) → { day, done, missed }
//   world.planCtx(residentId) · world.eligibility(optionId, residentId) → { ok, reason } · world.optionPref(optionId, residentId)
//   world.staleOf(residentId) → [{ key, text }] · world.stalePlans() → [{ resident, reasons }] · world.reviewPlan(residentId)
//   world.coverage (src/systems/coverage.js) · world.team (the staff without agency workers)
//   world.moveStaff(id, shiftId | 'off') · world.setFloat(id, on) · world.setOnCall(on)
//   world.layout (src/systems/homeLayout.js) · world.floor · world.stage · world.roomNumber(id) · world.spotTile(ref)
//   world.build.place(defId, col, row) / move(uid, col, row) / sell(uid) / upgrade() / check(…) → { ok, reason, … }
//   world.endOfLife (Milestone 27): stageOf(id) · forecast(id) · wishes(id) · comfortNow(id) · acceptPlan(id) / keepPlan(id)
//                    · offers() · notes() / unseen() / markSeen() · results() · pages() · passings() · heldUntil(roomId)
//                    bus: 'care:stage' { resident, name, stage } · 'care:passed' { resident, name, room, card, beside,
//                    friends, staff, page, score, good, poor, note, lift }
//   world.serialize() → { clock, residents, staff, care, admissions, ledger, layout }   (the run save; the page keeps the rest)
import { Grid } from '../../../../core/Grid.js';
import { Agent } from '../../../../core/Agent.js';
import { Clock } from '../../../../core/Clock.js';
import { findPath } from '../../../../core/Pathing.js';
import { AssignmentSystem } from '../../../../core/AssignmentSystem.js';
import { StaffModel } from '../../../../core/StaffModel.js';
import { HOME, RESIDENT, ENTRANCE, MAX_FLOOR, STAGES, LOGICAL_CAP } from '../../data/home.js';
import { SET_DRESSING } from '../../data/dressing.js';
import { createLayout } from './homeLayout.js';
import { roomById } from '../../data/rooms.js';
import { facilityById, scaleBonus, LEVELS, levelMultOf, LEGACY_HOUSE } from '../../data/facilities.js';
import { accreditationById } from '../../data/accreditations.js'; // (Milestone 31)
import { ageNow } from './secretFacts.js'; // (Milestone 31: Centenarian Living's eldest residents)
import { residentById, NEEDS, supportLevel, RESIDENTS, STAY_LEAVE_HOUR } from '../../data/residents.js';
import { Rng } from '../../../../core/Rng.js';
import { DAY, ROUTINE, WAKE, ALL_STEPS, TIMER_SCALE } from '../../data/routine.js';
import { createActivities, feelingOf, outcomeMult, birthdayOf } from './activities.js';
import { activityById, TIMETABLE, OUTCOME, BIRTHDAY, SCHEDULABLE, COMMUNITY_EVENTS } from '../../data/activities.js';
import { BELL, FAMILIARITY, BACKUP_HELP } from '../../data/tasks.js';
import { ECONOMY_START, STAFF_BALANCE, ON_CALL, WALK } from '../../data/balance.js';
import { AGENCY } from '../../data/shifts.js';
import { ensureResidentState, newResidentState, newStay, stayDaysLeft, riseNeeds, driftOutcomes, routineAt, bandAt, clockText, decide, completeStep, refuseStep, addLog, routineFor } from './residentNeeds.js';
import { bandOfHour, ensureCareState, absHour, bandInstance, bandEnd, generateBand, pruneTasks, addTask, scorePair, choosePairs, closeTask, decideTask, isOpen, changePlan, maybeRing, openBell, recordResponse, bellState, bellSummary, addFamiliarity, mostFamiliar, topFamiliar, noteLeft, noteBack, familiarityOf, fadeFamiliarity } from './careTasks.js';
import { ensureStaffState, makeStaffSystem, makeFounderPerks, contribMult, perkPct, openingTeam } from './staffTeam.js';
import { createRoster } from './roster.js';
import { createCoverage } from './coverage.js';
import { eligibilityOf, optionPrefOf, staleReasons, markReviewed, noteDay, admissionPlan } from './carePlanRules.js';
import { optionById, domainById, OPTION_PREF_MOOD, DOMAINS } from '../../data/carePlans.js';
import { SHIFT_IDS } from '../../data/shifts.js';
import { createCrew } from './staffCrew.js';
import { createAdmissions, stayLengthFor, varied, prereqOf } from './admissions.js';
import { createLedger } from './ledger.js';
import { createStaffing } from './staffing.js';
import { SPECIALTIES, TRAINING, COURSES } from '../../data/training.js';
import { createItems, newItemsState } from './items.js';
import { ITEM_SOURCES, ITEM_RULES } from '../../data/items.js';
const ITEM_RULES_SEASON = ITEM_RULES.seasonMonths;
import { staffById, BLESSINGS, MISHAPS } from '../../data/staff.js';
import { rankAtLeast } from '../../data/recruitment.js';
import { taskPct, matchesTask, familiarPct } from './traitEffects.js';
import { compatibility, addFriendship, areFriends, topFriends, groupMembers, favouriteOf, familiarEffects, friendshipOf } from './relationships.js';
import { FRIENDSHIP, CONTINUITY, ACTIVITY_GROUPS, SEATING } from '../../data/relationships.js';
import { FOUNDER_FLAG } from '../../data/setup.js';
import { MEAL_SHIFTS, MEALS, mealById, mealOfStep, KITCHENS, KITCHEN_IDS, PREP, TRAY, HYDRATION, TROLLEYS, DIET_OFFICE, FAVOURITES, FOOD_COST, SATISFACTION, DIETS, dishById } from '../../data/dining.js';
import { createDining, dietOf, favouritesOf, skillsOf, canMake, dietWords, mealQuality, satisfaction, nutritionMult, moodFrom, noteMeal, avgOf } from './dining.js';
import { dietPct as traitDietPct, diningPct, rehabPct } from './traitEffects.js';
import { AIDS, TWO_PERSON, GOAL_TASKS, THERAPY_PLACES, THERAPY_NO_SPACE, GOALS, DISCHARGE, REHAB_FUNDING } from '../../data/mobility.js';
import { MEMORY_SUPPORT, ROUTINE_CHANGE, CONTINUITY_MULT, FAMILIAR_MEMORY, LIFE_STORY, STIMULATION, CALM_PLACES, WALKING } from '../../data/memory.js';
import { isMemorySupport, themeOf, newMemoryState, noteChange, endMemoryDay, noteChoice, honour, stimulationLift, validatePath, walkChance } from './memory.js';
import { memoryPct } from './traitEffects.js';
import { newMobility, driftMobility, noteMobilityNeed, aidSpeed, inRehab, newRehab, gainMult, addGain, missTherapy, endRehabDay, isReady, rehabStatus, rehabRise, rehabProgress, fallsRisk } from './mobility.js';
import { ROUND, ISSUES, OBSERVATION, NOTICE, ACTIONS, ACTION_IDS, AUTO, CLINICIAN, HOSPITAL, MED_ROOM, TREATMENT_ROOM, GOVERNANCE } from '../../data/clinical.js';
import { ensureClinical, dayRecord, roundSafety, issueChance, alertChance, rollSeverity, wordFor, bigger, resolveChance, resultOf, suggestOption, clinicalScore } from './clinical.js';
import { clinicalPct, familyPct } from './traitEffects.js';
import { TRUST, VISIT, NOTICE as FAMILY_NOTICE, MEETING, MEETING_ASK, MEETING_KINDS, NOTES, COMPLIMENTS, COMPLIMENT, COMPLAINT, COMPLAINTS, FIXES, REQUESTS, REQUEST, VIEW, FIRSTS, SO_VISITS, PATTERNS } from '../../data/family.js';
import { ensureFamily, ensureFamilyHome, changeTrust, nextVisitDay, visitParts, visitTotal, visitWords, homeTrust, callOf, whoOf, theirWord, noteSeen, seenOf } from './family.js';
import { SHIFT_TEMPLATES, WINGS as ALL_WINGS, DEFAULT_WING } from '../../data/shifts.js';
import { WINGS_SPECIAL, wingById, wingForSupport } from '../../data/wings.js';
import { PROGRAMS, VISIBLE_PROGRAMS, PRESTIGE_PROGRAMS, programById, visibleProgram, programFlag, PRESTIGE_GARDEN, EFFECT_TEXT, LEDGER_CATEGORY, PROGRAM_RULES } from '../../data/programs.js';
import { ensureProgramState, newRun, unlockOf, hoursFor, vetoOf, weeksDue, daysUnpaid, countFor } from './programs.js';
import { activityPct } from './traitEffects.js';
import { createBlessings } from './blessings.js'; // (Milestone 30b: the Works Gods)
import { createResearch } from './research.js';
import { createEconomy, levelOfNeeds } from './economy.js';
import { UPKEEP, UTILITIES, MOVE_OUT } from '../../data/economy.js';
import { RP_INCOME } from '../../data/research.js';
import { joinChance, choiceBand } from './activities.js';
import { dayOfWeek } from '../../data/activities.js';
import { createPartners, environmentScore } from './partners.js';
import { PILOT } from '../../data/partners.js';
import { incidentById, FALLS_INCIDENT, INCIDENT_TASKS, PREPAREDNESS } from '../../data/incidents.js';
import { createIncidents, ensureIncidents, fallChance } from './incidents.js';
import { createQuality, ensureQualityState } from './quality.js';
import { READINGS } from '../../data/quality.js';
import { createEvents, ensureEventsState } from './events.js';
import { createSecrets, ensureSecretsState } from './secrets.js'; // (Milestone 29)
import { createCareAchievements, ensureAchievementsState } from './achievements.js'; // (Milestone 32)
import { stageById, EOL_STAGES, PACE, GOOD_CARE, COMFORT, SIGNAL, MEMORIAL, BOOK, PLAN as EOL_PLAN, WISHES } from '../../data/endOfLife.js';
import { ensureEolState, ensureResidentEol, eligible as eolEligible, weeklyChance, stageLength, nextStage, newAcc, comfortOf, signalLift, familyResult, betterNote, wishesOf, timeAt } from './endOfLife.js';

// The default layout (Milestones 1–9, and a new home): its wall tiles, its grid and its spots. The home world uses its
// own live layout; these are for older saves' upgrades and the tests.
let defaultLayout = null;
const DEFAULT = () => (defaultLayout ??= createLayout());
// Every wall tile (doorways left out).
export const wallTiles = () => DEFAULT().wallTiles().map((t) => ({ col: t.col, row: t.row, wall: t.wall }));
// The home's grid (MAX_FLOOR in size; the floor beyond the stage is blocked): walls, pieces (a room only where its
// furniture and walls stand) and the props.
export const makeGrid = () => new Grid({ cols: MAX_FLOOR.cols, rows: MAX_FLOOR.rows, tileSize: HOME.cellSize });
export const buildGrid = () => DEFAULT().buildGrid(makeGrid());
// 'F05.resident' or 'hall.cwPost' → the tile.
export const spotTile = (ref) => DEFAULT().spotTile(ref);

// Milestone 24: how many more residents the home may take — rooms built, capped by the stage and never above the
// 70-resident logical cap.
export const placesFree = ({ here, rooms, stageCap }) => Math.max(0, Math.min(rooms, stageCap, LOGICAL_CAP) - here);

export function makeClock(bus = null) {
  const clock = new Clock({ bus, secondsPerDay: DAY.secondsPerDay, daysPerMonth: DAY.daysPerMonth, monthsPerYear: DAY.monthsPerYear, speeds: DAY.speeds });
  clock.speedAllowed = (s) => DAY.unlockedSpeeds.includes(s);
  clock.dayProgress = DAY.startHour / 24;
  return clock;
}

const routineStep = (id) => ALL_STEPS.find((s) => s.id === id) ?? null; // (Milestone 14: with the Morning activity slot)
const first = (name) => name.split(' ')[0];
const clamp = (x) => Math.max(0, Math.min(100, x));
const stepWord = (step) => (step.activity ? step.name : step.name.toLowerCase());
const needName = (id) => NEEDS.find((n) => n.id === id)?.name ?? id;
const ARTHUR = RESIDENT.id;
// A resident's pronoun for the card lines (Milestone 9: story data on each row, data/lifeStories.js).
export const theirOf = (id) => (residentById(id)?.pronoun === 'she' ? 'her' : 'his');

export function createHomeWorld({ founderId = 'RN01', clock = null, resident = null, residents: savedResidents = null, staff = null, care: careSaved = null, seed = 'careworks', bus = null, admissions: admissionsSaved = null, ledger: ledgerSaved = null, layout: layoutSaved = null, startCredits = ECONOMY_START.credits, shortStaffing = true, ngPlus = 0, runId = null, homeName = null, secretsStrict = false, secretsAccount = null, secretRules = null, achievementsAccount = null } = {}) {
  clock ??= makeClock();
  // Milestone 28: every moment the home raises also goes to the event director (src/systems/events.js), which decides how
  // and when it is shown. Moments raised while the world is being made (a load) are never raised again.
  const appBus = bus;
  let director = null;
  let directorLive = false;
  let secrets = null; // (Milestone 29: the secrets read every moment too, once the world is made)
  let achievements = null; // (Milestone 32: achievements, records and the Hall of Fame read every moment too)
  // Milestone 31: the prestige chain. Is what a secret's unlock flag opens open here (C11 / C12, F34 / F35, PRG11 / PRG12,
  // R08)? Only the secrets say so (src/systems/secrets.js unlocked) — nothing is bought, ?debug=1's unlocks never open it.
  const prestigeOpen = (flag) => !!flag && !!secrets?.unlocked(flag);
  // A prestige award's own rewards, each once (keyed): C11's Prestige Tokens on this device, C12's accolade in this home.
  function prestigeAwardRewards(a) {
    if (!a?.secret || !secrets) return;
    if (a.reward.prestige) secrets.grantPrestige(a.id, a.reward.prestige);
    if (a.reward.accolade) secrets.grantRecognition(a.reward.accolade, a.id);
  }
  bus = {
    emit(name, payload) {
      if (directorLive) director?.raise(name, payload);
      if (directorLive) secrets?.onEmit(name, payload);
      if (directorLive) achievements?.onEmit(name, payload); // (Milestone 32)
      appBus?.emit(name, payload);
    },
    on: (name, fn) => appBus?.on(name, fn),
    off: (name, fn) => appBus?.off?.(name, fn),
  };
  // --- the layout (Milestone 10) --------------------------------------------------------------------------------
  const layout = createLayout({ saved: layoutSaved, bus });
  // An older save's layout that fails the access check gets a one-time fix-up (each piece in the way moves to the
  // nearest spot where everything passes). A Milestone 1–9 save has the default layout, which passes.
  const fixedUp = layoutSaved && layout.problems().length ? layout.fixUp() : [];
  const grid = layout.buildGrid(makeGrid());
  grid.pathCache = new Map(); // (Milestone 28: core/Pathing reuses paths on an unchanged floor — same paths, far less searching)
  // (Milestone 18: 'tile:col,row' — a free tile beside a piece, e.g. where the Medication Cart is collected)
  const spot = (ref) => {
    if (!ref.startsWith('tile:')) return layout.spotTile(ref);
    const [col, row] = ref.slice(5).split(',').map(Number);
    return { col, row };
  };
  // The placed things as the home screen and the sheets see them: { kind 'room' | 'station', id, uid, def (name, art,
  // text, …), fp (its picture), box (its whole footprint), residentId (a room's resident) }. Kept object for object
  // across layout changes (the selection holds them).
  const placed = [];
  const props = [];
  function syncPlaced() {
    const keep = new Map(placed.map((x) => [x.id, x]));
    const next = layout.pieces.map((pc) => {
      const d = roomById(pc.defId) ?? facilityById(pc.defId);
      const it = keep.get(pc.id) ?? { kind: pc.kind, id: pc.id, residentId: null };
      Object.assign(it, { uid: pc.uid, defId: pc.defId, def: { ...pc, ...d, name: d.name, art: d.art, text: pc.kind === 'room' ? d.bestFor : d.text, template: pc.kind === 'room' ? pc.defId : undefined }, fp: pc.fp, box: pc.box });
      return it;
    });
    placed.splice(0, placed.length, ...next);
    props.splice(0, props.length, ...layout.props().map((def) => ({ kind: 'prop', id: def.id, def, fp: { col: def.col, row: def.row, w: 1, h: 1 } })));
  }
  syncPlaced();
  const roomList = () => placed.filter((x) => x.kind === 'room');
  const hourNow = () => clock.dayProgress * 24;
  let band = bandAt(hourNow());

  // --- the staff (Milestone 3) -------------------------------------------------------------------------------
  const staffState = ensureStaffState(staff, founderId);
  const sys = makeStaffSystem(staffState);
  const perks = makeFounderPerks(staffState);
  const absTime = () => clock.totalDays * 24 + hourNow();
  // (Milestone 24: a room's wing comes from the painted wings; staff may be assigned to a painted wing)
  const roster = createRoster(staffState, { abs: absTime, wingOfRoom: (roomId) => layout.wings.wingOfPiece(layout.byId(roomId)) ?? DEFAULT_WING, wingExists: (id) => layout.wings.count(id) > 0 });
  // Milestone 7: agency workers hired for a shift still under way come back with the save (their model is kept there)
  for (const a of staffState.roster.agency) if (a.model && !sys.get(a.id)) sys.add(StaffModel.fromJSON(a.model));
  staffState.roster.agency = staffState.roster.agency.filter((a) => sys.get(a.id));
  // Milestone 11: trainees sit at a Training Room (the two places of the first one; their rest spot without one)
  const trainingSpot = (p) => {
    const rooms = layout.ofDef('F11');
    if (!rooms.length) return p.restSpot;
    const i = Object.keys(staffState.roster.training ?? {}).indexOf(p.id);
    const room = rooms[Math.floor(Math.max(0, i) / 2) % rooms.length];
    return `${room.id}.trainee${(Math.max(0, i) % 2) + 1}`;
  };
  // Milestone 25c: the Staff Room's rest bonus × its level (the bonus part: ×1.2 → ×1.3 at Level II)
  const restBonusNow = () => scaleBonus(STAFF_BALANCE.energy.restSpotBonus, lvOf('F08') || 1);
  const crew = createCrew({ restBonus: () => restBonusNow(), grid, state: staffState, sys, perks, roster, spotTile: spot, hourNow, bandNow: () => bandAt(hourNow()), bus, trainingSpot, trainingLabel: (id) => staffing?.trainingOf(id) ? staffing.training.course(staffing.trainingOf(id).courseId)?.name ?? 'a course' : 'a course', energyMult: () => 1 + rb('energyPct') / 100 }); // (Milestone 21: Shift Planning)
  let staffing = null; // (Milestone 11: made with the ledger, below)
  let research = null; // (Milestone 21: made with the ledger, below)
  let economy = null; // (Milestone 22: made with the ledger, below)
  let partners = null; // (Milestone 23: made with the ledger, below)
  let incidents = null; // (Milestone 25: made with the partners, below)
  let quality = null; // (Milestone 26: made with the economy, below)
  let ic = null; // (Milestone 25: care.incidents)
  const pp = (key) => partners?.perk(key) ?? 0; // (Milestone 23: an active partner's perk)
  // Milestone 22: a resident's Support Level, from their assessed needs (at admission; an older or test resident: their
  // profile's — the level their support type always had)
  const levelOf = (p) => p.state.level ?? levelOfNeeds(p.state.assessed ?? p.def.needs);
  // Milestone 22: their average Mood this month (sampled each day; the fee link, data/economy.js FEE_MOOD)
  // (the nursing supplement: their assessed Clinical/Nursing need asks for a nurse on every shift)
  const nursingOf = (p) => (p.state.assessed ?? p.def.needs).clinical > ON_CALL.clinicalNeedAbove;
  const moodAvgOf = (p) => (p.state.moodMonth?.n ? p.state.moodMonth.sum / p.state.moodMonth.n : null);
  const rb = (key) => (research?.bonus(key) ?? 0) + (quality?.bonus(key) ?? 0); // (Milestone 26: + accreditation rewards)

  // --- the residents ---------------------------------------------------------------------------------------------
  // A resident's person: { kind: 'resident', id, name, art, line, def, state (their saved state), agent }.
  const residents = [];
  const byResident = (id) => residents.find((p) => p.id === id) ?? null;
  // Milestone 10: a resident's seat follows their room number (room 1 → seat 1 …): four seats a Dining Room / Activity
  // Lounge, the next four at the next one built, and round again when there are more residents than seats.
  // Milestone 13: residents remember their own seat (st.seats: { dining, lounge }); a new one takes the seat after their
  // room number if it is free, else the first free one, and friends move next to each other overnight (reseatFriends).
  const PLACE_DEF = { dining: 'F03', lounge: 'F05' };
  const SEAT_PLACES = ['dining', 'lounge'];
  const seatOf = (p, place = 'dining') => p.state.seats?.[place] ?? Math.max(0, layout.roomNumber(p.state.room) - 1);
  const seatCount = (place) => Math.max(1, layout.ofDef(PLACE_DEF[place]).length) * SEATING.perRoom;
  const seatPiece = (p, place) => {
    const list = layout.ofDef(PLACE_DEF[place]);
    if (!list.length) return null;
    return list[Math.floor(seatOf(p, place) / SEATING.perRoom) % list.length];
  };
  // Where a resident goes for a place: their room's inside spot, or their seat at the Dining Room / lounge.
  // Milestone 16: where therapy happens — the Rehabilitation Gym, else the Basic Physio Space (beside it), else their room.
  const therapySpace = (p) => {
    for (const tp of THERAPY_PLACES) {
      if (tp.kind === 'facility') {
        const pc = offline(tp.id) ? null : layout.ofDef(tp.id)[0]; // (Milestone 25: not one out of action)
        if (pc) return { ...tp, piece: pc, mult: scaleBonus(tp.mult, layout.levelMultOf(pc.uid)) }; // (Milestone 25c: its level)
      } else {
        const own = roomList().find((r) => r.id === p.state.room);
        if (own?.defId === tp.id) return { ...tp, piece: null, mult: scaleBonus(tp.mult, layout.levelMultOf(own.uid)) };
      }
    }
    return { ...THERAPY_NO_SPACE, piece: null };
  };
  const calmPiece = () => CALM_PLACES.map((id) => (offline(id) ? null : layout.ofDef(id)[0])).find(Boolean) ?? null; // (Milestone 25: not one out of action)
  const placeRef = (p, place) => {
    if (place === 'calm') {
      const pc = calmPiece();
      return pc ? `${pc.id}.calm` : `${p.state.room}.inside`;
    }
    if (place === 'therapy') {
      const sp = therapySpace(p);
      return sp.piece ? `${sp.piece.id}.therapy` : `${p.state.room}.inside`;
    }
    if (place === 'room') return `${p.state.room}.inside`;
    if (place === 'family') return `${layout.ofDef(VISIT.familyRoom)[0]?.id ?? VISIT.familyRoom}.family`; // (Milestone 19: whereIs only)
    const pc = seatPiece(p, place);
    const seats = facilityById(PLACE_DEF[place]).seats;
    return `${pc?.id ?? PLACE_DEF[place]}.${seats[seatOf(p, place) % seats.length]}`;
  };
  const seated = () => residents.filter((q) => !q.state.leaving && !q.state.guest);
  const seatsTaken = (place, except = null) => new Set(seated().filter((q) => q !== except && q.state.seats).map((q) => q.state.seats[place] % seatCount(place)));
  // Give someone their seats (a new resident, or anyone in an older save): the one after their room number if free.
  function assignSeats(p) {
    if (p.state.seats) return;
    const seats = {};
    for (const place of SEAT_PLACES) {
      const taken = seatsTaken(place, p);
      const n = seatCount(place);
      const want = Math.max(0, layout.roomNumber(p.state.room) - 1);
      let pick = want < n && !taken.has(want) ? want : -1;
      for (let i = 0; pick < 0 && i < n; i++) if (!taken.has(i)) pick = i;
      seats[place] = pick < 0 ? want : pick; // (more residents than seats: they share, as before)
    }
    p.state.seats = seats;
  }
  const sideBySide = (i, j) => Math.floor(i / SEATING.perRoom) === Math.floor(j / SEATING.perRoom) && Math.abs(i - j) === 1;
  // Overnight: someone whose best friend sits away from them moves to a free seat beside that friend.
  function reseatFriends() {
    for (const p of seated()) {
      if (p.state.memory && isMemorySupport(p.def)) continue; // (Milestone 17: fewer changes — their seat stays theirs)
      const best = topFriends(care, p.id, seated().map((q) => q.id), 1)[0];
      if (!best || best.friendship < FRIENDSHIP.friendAt) continue;
      const f = byResident(best.other);
      for (const place of SEAT_PLACES) {
        const n = seatCount(place);
        const mine = seatOf(p, place) % n;
        const theirs = seatOf(f, place) % n;
        if (sideBySide(mine, theirs)) continue;
        const taken = seatsTaken(place, p);
        const free = [theirs - 1, theirs + 1].find((i) => i >= 0 && i < n && sideBySide(i, theirs) && !taken.has(i));
        if (free == null) continue;
        p.state.seats[place] = free;
        log(p, `Sits beside ${first(f.name)} at the ${place === 'dining' ? 'Dining Room' : 'lounge'} now`);
      }
    }
  }
  const placeTile = (p, place) => spot(placeRef(p, place));
  function addResident(st, { atEntrance = false } = {}) {
    const def = residentById(st.id);
    const p = { kind: 'resident', id: def.id, name: def.name, art: def.art, line: `${def.support} · age ${def.age}`, def, state: st };
    // Milestone 16: their own mobility level and aid (an older save: from their profile and current Mobility need), and
    // rehab goals for anyone in rehab (an M15-era rehab resident: from their current needs)
    if (!st.guest) {
      st.mobility ??= newMobility(def, st);
      if (!st.rehab && !st.leaving && inRehab(def, st)) st.rehab = newRehab(def, st, clock.totalDays);
      if (!st.memory && isMemorySupport(def)) st.memory = newMemoryState(def); // (Milestone 17; an M16 save: neutral)
    }
    // (Milestone 14: everyone walks WALK.speedMultiplier faster; Milestone 16: × their own aid's speed — the M14 numbers)
    p.agent = new Agent({ id: def.id, name: def.name, speed: RESIDENT.speed * WALK.speedMultiplier * aidSpeed(st.mobility?.aid ?? 'none'), noPathTeleportSec: 3 * TIMER_SCALE });
    const room = roomList().find((r) => r.id === st.room);
    if (room && !st.leaving && !st.guest) room.residentId = def.id; // the room knows its resident (not one going home)
    if (st.pos) {
      p.agent.x = st.pos.x;
      p.agent.y = st.pos.y;
    } else if (atEntrance) p.agent.placeAtTile(grid, ENTRANCE.col, ENTRANCE.row);
    else if (room) {
      const t = placeTile(p, 'room');
      p.agent.placeAtTile(grid, t.col, t.row);
    }
    residents.push(p);
    if (!st.guest) assignSeats(p); // (Milestone 13: their own seats, remembered)
    return p;
  }
  // Milestone 6+: the saved list as it is (Milestone 9: it may be empty — everyone went home). Milestones 1–5 saved
  // Arthur alone; a new home starts with Arthur on his respite stay (Milestone 9).
  const listSaved = Array.isArray(savedResidents);
  const savedList = listSaved ? savedResidents : resident ? [resident] : [];
  for (const s of savedList) {
    const id = s?.id ?? ARTHUR;
    const def = residentById(id);
    if (!def || byResident(id)) continue;
    addResident(ensureResidentState(s, def, { room: id === ARTHUR ? RESIDENT.room : null }));
  }
  if (!listSaved && !resident) {
    const st = newResidentState(residentById(ARTHUR), { room: RESIDENT.room });
    st.stay = { ...newStay(residentById(ARTHUR), stayLengthFor(residentById(ARTHUR), seed, 0), clock.totalDays), opening: true, paused: 0 };
    addResident(st);
  } else if (!listSaved && !byResident(ARTHUR)) addResident(newResidentState(residentById(ARTHUR), { room: RESIDENT.room }));
  // (a saved resident without a room — never expected — gets the first free one)
  for (const p of residents) {
    if (p.state.leaving || roomList().find((r) => r.id === p.state.room)) continue;
    const free = roomList().find((r) => !r.residentId);
    if (free) {
      p.state.room = free.id;
      free.residentId = p.id;
      const t = placeTile(p, 'room');
      if (!p.state.pos) p.agent.placeAtTile(grid, t.col, t.row);
    }
  }
  // Arthur (the first resident) where one is still needed as a fallback; null once he has gone home.
  let arthur = byResident(ARTHUR);

  // --- care tasks (Milestone 4) --------------------------------------------------------------------------------
  const care = ensureCareState(careSaved);
  // Milestone 27: end of life (the section further down); an M26 save: everyone Settled, nothing held, no pages
  const eol = (care.eol = ensureEolState(care.eol));
  const eolOf = (p) => (p ? ensureResidentEol(p.state) : null);
  const stageOf = (p) => (p ? eolOf(p).stage : 'settled');
  const inEol = (p) => EOL_STAGES.includes(stageOf(p));
  const progState = (care.programs = ensureProgramState(care.programs)); // (Milestone 20; an M19 save: none running)
  const assignSys = new AssignmentSystem({ staff: sys, getJobs: () => care.tasks.filter((t) => t.status === 'claimed' || t.status === 'working') });
  const absNow = () => absHour(clock.totalDays, hourNow());
  const now = () => clockText(hourNow());
  // (Milestone 13: each resident's routine day starts at their own wake-up)
  const logDay = (st = null) => routineAt(hourNow(), clock.totalDays, st ? stepsForState(st, clock.totalDays) : routineFor(st)).day;
  const log = (p, text) => addLog(p.state, logDay(p.state), now(), text);
  const rolesOnShift = (bandId) => new Set(crew.people.filter((q) => roster.coversBand(q.id, bandId)).map((q) => q.role));
  const stepIndex = (id) => ALL_STEPS.findIndex((s) => s.id === id);
  const joined = (p) => p.state.joinAt == null || absNow() >= p.state.joinAt;
  // Milestone 9: living the routine and planned for — not someone heading home, not a spawn-check guest.
  // (Milestone 18: not while away at the hospital service)
  const inCare = (p) => joined(p) && !p.state.leaving && !p.state.guest && !p.state.away;
  // The step has already run today (or is under way and past needing help).
  const stepOverFor = (p) => (stepId, day) => {
    const st = p.state;
    if (!st.step) return false;
    if (st.step.day !== day) return st.step.day > day;
    const cur = stepIndex(st.step.id);
    const idx = stepIndex(stepId);
    return cur > idx || (cur === idx && (st.step.status === 'doing' || st.step.status === 'refused' || st.step.status === 'missed'));
  };
  // --- activities (Milestone 14) ----------------------------------------------------------------------------------
  // The day's activity sessions (the timetable, a booked community event or a birthday) shape each resident's steps:
  // the Afternoon slot is the M2 'cards' step (its name, place, leaders and drops from the day's activity; no activity =
  // free time: no step), the Morning slot adds the morningActivity step between breakfast and the rest.
  const acts = createActivities({ care, seed, bus, today: () => clock.totalDays, partnerActive: (id) => !!partners?.active().some((a) => a.def.id === id), hostFor: (roles) => crew.people.find((q) => !q.agency && !q.leftTeam && roles.includes(q.role) && roster.shiftOf(q.id)?.id === 'afternoon')?.id ?? null });
  const dayOfYear = (day) => (((day % BIRTHDAY.daysPerYear) + BIRTHDAY.daysPerYear) % BIRTHDAY.daysPerYear) + 1;
  const birthdaysOn = (day) => residents.filter((p) => !p.state.leaving && !p.state.guest && birthdayOf(p.id) === dayOfYear(day)).map((p) => p.id);
  acts.setBirthdayCheck((day) => birthdaysOn(day).length > 0);
  acts.setProgramHooks({ sessionFor: (day, slot) => programSession(day, slot), veto: (s, p) => (s.program ? vetoOf(programById(s.program), p.state) : null) ?? groupRefusal(s, p) }); // (Milestone 20; Milestone 23: someone who refuses group activities is never put in any session)
  // Milestone 23: a resident who refuses group activities is not put in a session — unless the activity has its own
  // preference (Cards: their M2 Cards preference decides, as it always has).
  const groupRefusal = (s, p) => (p.state.prefs?.groupActivity === 'refuse' && !(activityById(s.activity)?.prefKey && p.state.prefs?.[activityById(s.activity).prefKey]) ? 'prefers not to join group activities' : null);
  // --- nutrition and dining (Milestone 15) -------------------------------------------------------------------------------
  const dining = createDining({ care });
  const kitchenNow = () => KITCHEN_IDS.map((id) => (offline(id) ? null : layout.ofDef(id)[0])).find(Boolean) ?? null; // (the best one placed; Milestone 25: not one out of action)
  const hasOffice = () => layout.ofDef(DIET_OFFICE).length > 0;
  const specialtiesOf = (id) => staffing?.specialtiesOf(id) ?? [];
  const onShiftNow = () => crew.people.filter((q) => !q.leftTeam && roster.onShift(q.id));
  // Milestone 30b: the Works Gods' blessings (src/systems/blessings.js) — who is on the team, who is on shift now
  const blessings = createBlessings({ team: () => crew.people.filter((q) => !q.agency && !q.leftTeam), onShift: (id) => roster.onShift(id), seed });
  const boltCost = (cost) => (cost && blessings.has('bolt') ? Math.round((cost * blessings.buildCostMult()) / 50) * 50 : cost); // (Bolt: 15% less, in 50-Credit steps)
  const boltDays = (days) => (days && blessings.has('bolt') ? Math.max(1, Math.ceil(days * blessings.buildDaysMult())) : days); // (Bolt: half the days, at least one)
  // Who on shift could cook a special menu (a Hospitality worker, or anyone with the Nutrition specialty or a diet trait)
  const cooksOnShift = () => onShiftNow().map((q) => ({ id: q.id, role: q.role, skills: skillsOf({ traits: q.model.traits, specialties: specialtiesOf(q.id) }) }));
  const hospitalityOn = () => cooksOnShift().some((c) => c.role === 'HN' || c.skills.size > 0);
  const kitchenPool = () => {
    const pc = kitchenNow();
    return PREP.spots.map((s) => `${pc?.id ?? 'F04'}.${s}`);
  };
  const SLOT_OF = { cards: 'afternoon', morningActivity: 'morning' };
  const sessionInfo = (day, slot) => acts.activityOn(day, slot, slot === 'afternoon' ? birthdaysOn(day) : []);
  const stepsCache = new Map();
  const clearSteps = () => stepsCache.clear();
  function stepsForState(st, day) {
    const therapy = !!st.rehab?.active && st.rehab.readyDay == null; // (Milestone 16: the therapy step while working on goals)
    const calm = st.memory && isMemorySupport(residentById(st.id)) ? calmPiece() : null; // (Milestone 17: the morning rest somewhere calm)
    const key = `${st.wakeAt}:${day}:${therapy ? 1 : 0}:${calm?.id ?? ''}`;
    if (stepsCache.has(key)) return stepsCache.get(key);
    const base = routineFor(st);
    const out = [];
    for (const def of ALL_STEPS) {
      if (def.id === 'therapy') {
        if (therapy) out.push(def);
        continue;
      }
      if (def.id === 'rest' && calm) {
        const r = base.find((x) => x.id === 'rest');
        out.push({ ...r, place: 'calm', doing: `Resting at ${facilityById(calm.defId).name.replace(/^/, 'the ')}`, going: `Walking to ${facilityById(calm.defId).name.replace(/^/, 'the ')} for a rest` });
        continue;
      }
      const slot = SLOT_OF[def.id];
      if (!slot) {
        out.push(base.find((x) => x.id === def.id));
        continue;
      }
      const info = sessionInfo(day, slot);
      if (!info) continue; // free time
      const a = info.activity;
      const who = info.birthday ? first(byResident(info.birthday)?.name ?? '') : null;
      const named = info.name ?? a.name; // (Milestone 20: a program's session has its own name)
      out.push({ ...def, name: who ? `${who}'s birthday tea` : named, log: info.name ?? a.log, place: a.where.place, roles: [...a.leaders], drops: { ...a.drops }, minutes: a.minutes, activityId: a.id, slot, ...(info.program ? { program: info.program } : {}), doing: `At ${named.toLowerCase()}`, going: `Walking to ${named.toLowerCase()}` });
    }
    stepsCache.set(key, out);
    return out;
  }
  const stepsFor = (p, day) => stepsForState(p.state, day);
  // A step as it runs that day (an activity step carries its activity).
  const dayStep = (p, id, day) => (p ? stepsFor(p, day).find((x) => x.id === id) : null) ?? routineStep(id);
  // Everyone's choice for the day's sessions (made at the start of the day, or when the timetable changes).
  const inSession = () => residents.filter((p) => !p.state.leaving && !p.state.guest && !p.state.away);
  const friendIds = (id) => topFriends(care, id, inSession().map((q) => q.id), 20).filter((r) => r.friendship >= FRIENDSHIP.friendAt).map((r) => r.other);
  function planSessions(day, force = false) {
    clearSteps();
    for (const slot of Object.keys(TIMETABLE.slots)) {
      const cur = acts.session(day, slot);
      const started = cur && (cur.joined.length || cur.declined.length || (day === clock.totalDays && hourNow() >= TIMETABLE.slots[slot].at - 0.5));
      if (cur && (!force || started)) continue;
      acts.planSession(day, slot, sessionInfo(day, slot), inSession().filter((p) => stageOf(p) !== 'final'), friendIds); // (Milestone 27: the final days are quiet ones)
    }
  }
  const routineTask = (p, stepId, day) => care.tasks.find((t) => t.source === 'routine' && t.stepId === stepId && t.day === day && t.resident === p.id) ?? null;
  // Where a resident is (or is going): their current step's place, or their room.
  const residentPlace = (p) => {
    const st = p.state;
    const step = st.step && dayStep(p, st.step.id, st.step.day);
    if (st.memory?.walk) return 'walking'; // (Milestone 17)
    if (st.familyRoom) return 'family'; // (Milestone 19: with their visitor in the Family Room)
    return !step || !joined(p) || st.step.status === 'refused' || st.step.status === 'missed' || st.step.tray ? 'room' : step.place;
  };
  const taskPlace = (t) => {
    const p = byResident(t.resident);
    return t.place === 'room' ? 'room' : t.place === 'step' ? dayStep(p, t.stepId, t.day).place : p ? residentPlace(p) : 'room';
  };
  // The spots a helper may use beside this resident at a place: in their room its two; at a shared place the pool,
  // nearest their seat first.
  function helpPool(p, place) {
    if (place === 'walking') return [p.state.memory?.walk?.helpRef ?? 'hall.cwPost']; // (Milestone 17: out for a walk)
    if (place === 'family') {
      // (Milestone 19: in the Family Room with their visitor — the free tiles beside it after theirs and the visitor's)
      const pc = layout.ofDef(VISIT.familyRoom)[0];
      const tiles = pc ? [2, 3].map((n) => besidePiece(pc, n)).filter(Boolean) : [];
      if (tiles.length) return tiles.map((t) => `tile:${t.col},${t.row}`);
      place = 'room';
    }
    if (place === 'calm') {
      const pc = calmPiece();
      if (pc) return [`${pc.id}.calm2`, `${pc.id}.calm3`];
      place = 'room';
    }
    if (place === 'therapy') {
      const sp = therapySpace(p);
      if (sp.piece) return [`${sp.piece.id}.therapy2`, `${sp.piece.id}.therapy3`];
      place = 'room';
    }
    if (place === 'room') return [`${p.state.room}.help`, `${p.state.room}.help2`];
    const pc = seatPiece(p, place);
    const pool = [1, 2, 3, 4, 5, 6].map((n) => `${pc?.id ?? PLACE_DEF[place]}.help${n}`);
    const seat = placeTile(p, place);
    const d = (ref) => {
      const t = spot(ref);
      return Math.abs(t.col - seat.col) + Math.abs(t.row - seat.row);
    };
    return [...pool].sort((a, b) => d(a) - d(b));
  }
  // The helper's spot for a task: the nearest one in the pool nobody else is going to.
  function spotFor(t, staffId) {
    if (t.source === 'kitchen') {
      const pool = kitchenPool();
      return pool.find((ref) => !crew.people.some((q) => q.id !== staffId && q.task && q.task.spot === ref)) ?? pool[0];
    }
    const p = byResident(t.resident) ?? arthur;
    const pool = helpPool(p, taskPlace(t));
    return pool.find((ref) => !crew.people.some((q) => q.id !== staffId && q.task && q.task.spot === ref)) ?? pool[0];
  }
  const label = (t) => (t.source === 'routine' ? `${stepWord(dayStep(byResident(t.resident), t.stepId, t.day))}${t.tray ? ' tray' : ''}` : t.name.charAt(0).toLowerCase() + t.name.slice(1));
  const taskInfo = (t) => {
    if (t.source === 'kitchen') {
      // (Milestone 15: kitchen prep is for the whole home, at the Kitchen)
      const where = facilityById(kitchenNow()?.defId ?? 'F04').name;
      return { id: t.id, type: t.type, label: label(t), room: false, resident: null, who: null, going: `Going to the ${where} (${label(t)})`, doing: `In the ${where}: getting ${mealById(t.meal)?.name.toLowerCase() ?? 'the meal'} ready` };
    }
    return { id: t.id, type: t.type, label: label(t), room: t.place === 'room', resident: t.resident, who: first(byResident(t.resident)?.name ?? 'Arthur') };
  };
  // The "who helps" picker's pins: Arthur's keep their Milestone 3 keys (the step id), others are 'RESnn:step'.
  const pinKey = (residentId, stepId) => (residentId === ARTHUR ? stepId : `${residentId}:${stepId}`);
  const pinOf = (t) => {
    const id = t.source === 'routine' ? staffState.assignments[pinKey(t.resident, t.stepId)] : t.pinned;
    const q = id && crew.byId(id);
    return q && roster.onShift(q.id) ? q.id : null;
  };
  const tilesBetween = (q, ref) => {
    const from = grid.worldToTile(q.agent.x, q.agent.y);
    const to = spot(ref);
    const path = from && findPath(grid, from, to);
    return path ? path.length : from ? Math.abs(from.col - to.col) + Math.abs(from.row - to.row) : 0;
  };
  const assignedTo = (staffId, p) => {
    const wing = roster.wingOf(staffId);
    return care.keyWorkers[p.id] === staffId || (!!wing && wing === roster.wingOfRoom(p.state.room));
  };
  // Milestone 13: continuity groups — staff id → the residents they are pinned to (bible §14).
  const groupOf = (staffId) => staffState.continuity?.[staffId] ?? [];
  const inGroup = (staffId, residentId) => groupOf(staffId).includes(residentId);
  // Milestone 13: a back-up helper (a nurse on a wake-up) only while no task that only their role can do is waiting or
  // about to open (the medicine round comes first).
  const ownWorkWaiting = (role) => {
    const soon = absNow() + BACKUP_HELP.ownWorkHours;
    // (Milestone 18: a medicine round counts from its own time, not from when the nurse may set off for the cart)
    return care.tasks.some((x) => x.status === 'open' && x.roles.length === 1 && x.roles[0] === role && (isMeds(x) ? absHour(x.day, x.at) : x.opens) <= soon && x.due > absNow() && byResident(x.resident));
  };
  function scoreFor(t, q) {
    if (!t.roles.includes(q.role)) return null; // (scorePair says so too; this skips the path search)
    if (t.roleFrom?.[q.role] != null && ownWorkWaiting(q.role)) return null;
    const pin = pinOf(t);
    if (pin && pin !== q.id) return null;
    if (!pin && t.type !== 'bell' && !t.urgent && crew.tooTired(q)) return null; // (Milestone 25: help after a fall comes, tired or not)
    if (t.source === 'lifeStory' && q.role === 'CW' && familiarityOf(care, t.resident, q.id) < LIFE_STORY.careWorkerFrom) return null; // (Milestone 17: a Care Worker who knows them)
    if (t.source === 'kitchen') return scorePair({ task: { ...t, pinned: pin }, person: { id: q.id, role: q.role, energy: q.model.energy }, tiles: tilesBetween(q, kitchenPool()[0]), doneThisBand: q.bandDone ?? 0, now: absNow() });
    const p = byResident(t.resident) ?? arthur;
    // "Is this resident assigned to me" (bible §15): their key worker, or (Milestone 7) staff on the resident's wing
    const assigned = assignedTo(q.id, p);
    const s = scorePair({
      task: { ...t, pinned: pin },
      person: { id: q.id, role: q.role, energy: q.model.energy },
      tiles: tilesBetween(q, helpPool(p, taskPlace(t))[0]),
      keyWorker: assigned ? q.id : care.keyWorkers[t.resident] ?? null,
      mostFamiliar: mostFamiliar(care, t.resident, crew.people.map((x) => x.id)),
      doneThisBand: q.bandDone ?? 0,
      now: absNow(),
      // Milestone 11: a specialty fits the task; Milestone 12: or a trait that seeks this kind of task ('match')
      // (Milestone 17: the Memory Care specialty fits any task for a memory-support resident)
      specialty: (staffing?.specialtiesOf(q.id) ?? []).some((sp) => SPECIALTIES[sp]?.tasks.includes(t.type)) || matchesTask(q.model.traits, t.type) || (!!memoryOf(p) && specialtiesOf(q.id).includes('memoryCare')),
      continuity: inGroup(q.id, t.resident) ? (memoryOf(p) ? CONTINUITY_MULT : 1) : 0, // Milestone 13: their continuity group (bible §14); Milestone 17: × 2 for memory support
    });
    // (Milestone 30b: Zip's blessing — while he is on shift, a call bell comes before any other task)
    return s != null && t.type === 'bell' ? s + blessings.bellFirst() : s;
  }
  function claim(t, q) {
    t.status = 'claimed'; // first, so core/AssignmentSystem counts it as a job when it marks them assigned
    assignSys.assign(t, q.id);
    t.reached = false;
    const p = byResident(t.resident);
    if (p && t.source === 'routine' && isCurrent(p, routineStep(t.stepId), t.day)) p.state.step.helper = q.id;
    // (Milestone 18: a medicine-round stop starts with collecting a Medication Cart, unless they already have one on
    // this round — each nurse on the round takes their own)
    if (isMeds(t) && p && !hasCart(roundFor(t), q)) t.cartLeg = true;
    if (t.cartLeg) crew.startTask(q.id, { ...taskInfo(t), going: `Collecting the medicine cart (${label(t)} for ${first(p.name)})` }, cartSpot());
    else crew.startTask(q.id, taskInfo(t), spotFor(t, q.id));
    bus?.emit('care:task', { id: t.id, type: t.type, status: 'claimed', staff: q.id, resident: t.resident });
  }
  function unclaim(t) {
    const id = t.slots[0];
    if (id) assignSys.unassign(t, id);
    t.slots = [null];
    t.reached = false;
    t.cartLeg = false;
    if (id && crew.byId(id)?.task?.id === t.id) crew.releaseTask(id);
    const p = byResident(t.resident);
    if (p && t.source === 'routine' && p.state.step?.helper === id) p.state.step.helper = null;
  }
  // A task is over without being done (missed, refused, they managed on their own): let its helper go.
  function finish(t, status) {
    unclaim(t);
    closeTask(care, t, status);
    if (status === 'missed' && t.essential) coverage?.recordMissed(); // care recovery (Milestone 7)
    clinicalOver(t, status); // (Milestone 18: a missed round stop / health check; an assessment that didn't happen)
    if (t.source === 'meeting') meetingOver(t, status); // (Milestone 19: a family meeting that didn't happen moves on)
    if (t.source === 'fall') fallOver(t, status); // (Milestone 25: nobody came in time)
    if (t.source === 'incident' && status === 'missed') incidentTaskMissed(t); // (Milestone 25)
    if (t.source === 'program' && status === 'refused') countFor(progState.running[t.program], t.resident, 'declined'); // (Milestone 20: their choice)
    bus?.emit('care:task', { id: t.id, type: t.type, status, resident: t.resident });
  }
  const helperName = (id) => first(crew.byId(id)?.name ?? id);
  // How much of a need their help eases: the Founder's "+6% contribution" (Milestone 3) × their traits' bonus on this
  // task type (Milestone 12, src/systems/traitEffects.js).
  const traitsOf = (id) => crew.byId(id)?.model.traits ?? [];
  const helpMult = (helper, need, type) => contribMult(perks, helper, need) * (1 + taskPct(traitsOf(helper), type) / 100) * (1 + rb(`taskPct.${type}`) / 100); // (Milestone 21: research)
  function applyEffects(p, t, helper) {
    const st = p.state;
    for (const [need, v] of Object.entries(t.drops ?? {})) st.needs[need] = clamp(st.needs[need] - v * helpMult(helper, need, t.type));
    for (const [o, v] of Object.entries(t.outcomes ?? {})) st.outcomes[o] = clamp(st.outcomes[o] + v);
  }
  function completeTask(t, q) {
    const helper = q.id;
    if (t.source === 'kitchen') {
      prepDone(t, q);
      assignSys.unassign(t, helper);
      closeTask(care, t, 'done');
      t.slots = [helper];
      const kitchenSpot = q.task?.spot ?? null; // (Milestone 32: the Most-used facility record)
      crew.finishTask(helper);
      bus?.emit('care:task', { id: t.id, type: t.type, status: 'done', staff: helper, resident: null, spot: kitchenSpot });
      return;
    }
    const p = byResident(t.resident);
    // Milestone 13: someone they know well lifts their Mood a little (never an agency worker: they build no Familiar Care)
    const famBefore = q.agency ? 0 : familiarityOf(care, t.resident, helper);
    const fx = familiarEffects(famBefore);
    // (Milestone 17: a familiar face calms a memory-support resident more)
    if (p && fx.mood) p.state.outcomes.mood = clamp(p.state.outcomes.mood + fx.mood * (memoryOf(p) ? FAMILIAR_MEMORY.moodMult : 1));
    if (p && memoryOf(p)) memoryTaskDone(p, t, q, famBefore);
    if (p) {
      if (t.source === 'routine') completeRoutine(p, { ...dayStep(p, t.stepId, t.day), drops: t.drops, taskType: t.type }, t.day, helper);
      else {
        const personal = personalSession(p, t, q, famBefore); // (Milestone 17: a life-story / music-and-memory session)
        if (t.source === 'program' && t.asleepDrops && world.isAsleep(p)) t.drops = { ...t.asleepDrops }; // (Milestone 20: a quiet night check — nobody is woken)
        applyEffects(p, t, helper);
        if (t.type === 'bell') bellState(care, t.resident).cooldownUntil = absNow() + BELL.cooldownHours;
        else if (t.source === 'redirect') endWalk(p, 'redirected', helper); // (Milestone 17: walked back together)
        else if (t.source === 'meeting') meetingDone(p, t, q); // (Milestone 19: the family meeting was held)
        else if (t.source === 'program') programTaskDone(p, t, helper, personal); // (Milestone 20)
        else if (t.source === 'pilot') pilotTaskDone(p, t, helper); // (Milestone 23: an assistive-tech pilot session they said yes to)
        else if (t.source === 'fall') fallHelped(p, t, q); // (Milestone 25: helped up after a fall)
        else if (t.source === 'incident') incidentTaskDone(p, t, helper); // (Milestone 25: isolation care, cleaning, a cool drink)
        else log(p, personal ? `${t.name} with ${helperName(helper)}: ${personal}` : `${t.name} (with ${helperName(helper)})`);
        if (t.type === 'hydration') p.state.hydration = { last: absNow() }; // (Milestone 15: their last drink)
        if (t.optionId === SO_VISITS.option && t.type === 'visit') familyCall(p, helper); // (Milestone 19: SO07's family call)
        clinicalDone(p, t, q); // (Milestone 18: a round stop, a health check, an assessment — and noticing an alert)
        const kind = goalKind(t);
        if (kind) rehabSession(p, kind, helper); // (Milestone 16: therapy, walks and transfers move rehab goals)
        if (t.optionId === 'MO06' && t.type === 'mobility') partners?.record('fallsSession', { kind: 'strengthBalance', resident: p.id }); // (Milestone 23: a Strength & Balance session done — the option was not refused)
      }
    }
    assignSys.unassign(t, helper);
    closeTask(care, t, 'done');
    t.slots = [helper];
    // agency workers build no Familiar Care (bible §14); Milestone 12: a 'familiar' trait builds it faster
    // (Milestone 15: one stop on a drinks round is light work — a share of the Familiar Care, Energy and Morale)
    const share = t.source === 'round' ? HYDRATION.stopShare : 1;
    const famShare = t.source === 'routine' && mealOfStep(t.stepId) ? HYDRATION.serveShare : share; // (Milestone 16: an 8-minute serve is a short contact)
    if (!q.agency) addFamiliarity(care, t.resident, helper, FAMILIARITY.perTask * famShare * (1 + familiarPct(q.model.traits) / 100) * (1 + rb('familiarPct') / 100) * legacyMult(t.resident, LEGACY_HOUSE.familiarMult), clock.totalDays, 1 - famShare); // (Milestone 31: Legacy House)
    const spotRef = q.task?.spot ?? null; // (Milestone 32: where it was done — the Most-used facility record)
    crew.finishTask(helper, share);
    bus?.emit('care:task', { id: t.id, type: t.type, status: 'done', staff: helper, resident: t.resident, spot: spotRef });
  }

  // --- the routine ---------------------------------------------------------------------------------------------
  // st.step = { id, day, status: 'walking' | 'waiting' | 'doing' | 'refused' | 'missed', helper, arthurThere (the
  // resident is there — the Milestone 2 name kept for saves) }
  const isCurrent = (p, step, day) => !!step && p.state.step?.id === step.id && p.state.step.day === day;
  function completeRoutine(p, step, day, helper, note = null) {
    const st = p.state;
    const meal = mealOfStep(step.id);
    const served = meal ? serveMeal(p, meal, step, day, helper) : null; // (Milestone 15: the meal service)
    if (served) step = { ...step, drops: served.drops };
    const dropped = completeStep(st, step, day, now(), {
      needMult: helper ? (need) => helpMult(helper, need, step.taskType) : null,
      activityMult: 1 + perkPct(perks, helper, 'activityWellbeingPct') / 100,
      mealMult: 1 + perkPct(perks, helper, 'mealSatisfactionPct') / 100,
      note: helper ? `with ${helperName(helper)}` : note,
    });
    if (isCurrent(p, step, day)) {
      st.step.status = 'doing';
      st.step.dropped = dropped;
      st.step.helper = helper;
      if (!st.step.tray) together(p, step, day); // (a tray in their room: no company)
      if (step.activity && step.slot) activityOutcome(p, step, day);
    }
    if (served) afterMeal(p, served, day);
    if (step.id === 'therapy') rehabSession(p, helper ? 'therapy' : 'self', helper); // (Milestone 16)
    bus?.emit('care:step', { resident: st.id, step: step.id, status: 'done', helper, ...(served ? { sat: served.sat, tray: served.tray } : {}) });
  }
  // --- Milestone 15: the meal service -----------------------------------------------------------------------------------
  const theyOf = (p) => (p.def.pronoun === 'she' ? 'she' : 'he');
  // One resident served one meal (at their seat or on a tray): the meal's quality, their diet, favourite, how long they
  // waited, their company and the room → their dining satisfaction, which scales the meal's Nutrition drop and nudges
  // Mood. → { drops, sat, tray, … } (completeRoutine applies the drops)
  function serveMeal(p, meal, step, day, helper) {
    const st = p.state;
    const rec = dining.record(day, meal.id);
    const kitchen = kitchenNow();
    const t = routineTask(p, step.id, day);
    const tray = !!(isCurrent(p, step, day) && st.step.tray) || !!t?.tray;
    const prepStatus = kitchen ? rec.prep.status : 'noKitchen';
    const prepDoneNow = prepStatus === 'done' || prepStatus === 'late';
    const cookQ = prepDoneNow && rec.prep.by ? crew.byId(rec.prep.by) : null;
    const hosp = hospitalityOn();
    const q = mealQuality({ kitchenMult: kitchen ? layout.levelMultOf(kitchen.uid) : 1, kitchen: kitchen?.defId ?? null, prep: prepStatus === 'done' ? 'onTime' : prepStatus === 'late' ? 'late' : 'none', cook: cookQ ? { nut: cookQ.model.stats?.NUT ?? 0, traits: cookQ.model.traits } : null, hospitalityOn: hosp, program: programOn('PRG07', p) ? programById('PRG07').effects.quality : 0, research: rb('mealQuality') + pp('mealQuality'), incident: incidentMeal() }); // (Milestone 25: a storm or water issue keeps meals simple) // (Milestone 21; Milestone 23: Hearth Nutrition) // (Milestone 20: Nutrition Plus)
    // their menu: made if someone on shift can (or the Nutrition Office plans it)
    const diet = dietOf(st);
    st.diet = diet;
    const cooks = cooksOnShift();
    const matched = canMake(diet, { office: hasOffice(), onShift: cooks });
    const dietBonus = matched && diet !== 'standard' ? Math.max(0, ...cooks.map((c) => traitDietPct(crew.byId(c.id)?.model.traits ?? [], diet))) : 0;
    // today's dish, and whether it's a favourite (NU07 doubles it)
    const dish = dining.dishAt(day, meal.id);
    const fav = !!dish && favouritesOf(p.def, st).includes(dish);
    const boost = st.plan?.NU === 'NU07' && st.optionPrefs?.NU07 !== 'refuse';
    // on time: served within onTimeHours of being ready (at their seat, or the tray asked for), and the kitchen ready
    const ready = (tray ? t?.readyAt : st.step?.readyAt) ?? absNow();
    const waited = absNow() - Math.max(ready, absHour(day, step.at));
    const late = !kitchen || !prepDoneNow || waited > SATISFACTION.onTimeHours;
    // company and the room: friends eating at the same Dining Room, more diners than its seats
    const others = tray ? [] : residents.filter((o) => o !== p && !o.state.guest && !o.state.leaving && isCurrent(o, step, day) && !o.state.step.tray && ['waiting', 'doing'].includes(o.state.step.status) && seatPiece(o, 'dining') === seatPiece(p, 'dining'));
    const friends = others.filter((o) => areFriends(care, p.id, o.id)).length;
    const crowded = others.length + 1 > SEATING.perRoom;
    const server = helper ? crew.byId(helper) : null;
    const hostPct = server ? diningPct(server.model.traits) : 0;
    const club = acts.session(day, 'afternoon');
    const baking = meal.id === 'dinner' && !!club && club.activity === 'cooking' && club.joined.includes(p.id);
    const s = satisfaction({ quality: q.quality, mismatch: !matched, dietPct: dietBonus, favourite: fav, boost, late, tray, friends, crowded, host: hostPct > 0, baking, atmosphere: lvOf(PLACE_DEF.dining) || true }); // (Milestone 25c: the Dining Room's level)
    const drops = { ...(step.drops ?? {}) };
    if (drops.nutrition) drops.nutrition *= nutritionMult(s.sat, hasOffice() ? layout.levelMultOfDef(DIET_OFFICE) : 0);
    if (hostPct && drops.social) drops.social *= 1 + hostPct / 100;
    rec.kitchen = kitchen?.defId ?? null;
    rec.served++;
    if (tray) rec.trays++;
    if (late) rec.late++;
    if (!matched) rec.mismatched++;
    if (fav) rec.favourites++;
    if (!hosp) rec.byCare++;
    rec.qualitySum += q.quality;
    rec.satSum += s.sat;
    dining.countServed(day);
    return { drops, sat: s.sat, parts: s.parts, reason: s.reason, quality: q.quality, tray, late, matched, diet, fav, boost, dish, meal };
  }
  function afterMeal(p, m, day) {
    const st = p.state;
    st.outcomes.mood = clamp(st.outcomes.mood + moodFrom(m.sat));
    const d = noteMeal(st, { day, meal: m.meal.id, sat: m.sat, quality: m.quality, reason: m.reason, late: m.late, tray: m.tray, mismatch: !m.matched });
    st.hydration = { last: absNow() }; // (drinks at every meal)
    if (m.fav && d.favDay !== day) {
      d.favDay = day;
      const lift = FAVOURITES.mood * (m.boost ? FAVOURITES.boost : 1);
      st.outcomes.mood = clamp(st.outcomes.mood + lift);
      log(p, `Enjoyed the ${dishById(m.dish)?.name.toLowerCase()}: a favourite${m.boost ? ' (Favourite-Food Boost)' : ''}`);
    }
    if (!m.matched) log(p, `Not ${theirOf(p.id)} menu today: nobody on shift could make ${dietWords(m.diet)}, so ${theyOf(p)} had the standard one`);
    else if (m.late && kitchenNow()) log(p, m.tray ? 'The tray came late' : 'The meal came late'); // (no Kitchen: the Dining Room card says so, not every meal)
    if (m.late && m.tray && familyOf(p)) noteSeen(familyOf(p), day, 'lateTray', m.meal.name, bandAt(hourNow()).id); // (Milestone 19: families notice)
  }
  // Someone who can't come to the Dining Room today: resting in bed, unwell, or still not up. → the reason, or null
  function cantCome(p, meal, day) {
    const n = p.state.needs;
    if (p.state.unwell) return 'unwell: isolation care in their room'; // (Milestone 25: an outbreak)
    if (stageOf(p) === 'final') return 'resting in their room, with company close'; // (Milestone 27)
    if (n.mobility >= TRAY.bedMobility) return 'resting in bed today';
    if (n.clinical >= TRAY.unwellClinical) return 'feeling unwell';
    if (meal.id === 'breakfast' && routineTask(p, 'wake', day)?.status === 'missed') return 'still in bed';
    return null;
  }
  // Their meal comes to their room on a tray: the task moves there (whoever is bringing it goes to the room instead).
  function toTray(p, t, why) {
    if (t.tray) return;
    t.tray = true;
    t.place = 'room';
    t.readyAt = absNow();
    if (t.status !== 'working') {
      t.minutes = TRAY.minutes;
      t.workLeft = TRAY.minutes / 60;
    }
    const q = t.slots[0] && crew.byId(t.slots[0]);
    if (q?.task?.id === t.id) {
      Object.assign(q.task, { room: true, label: label(t) });
      t.reached = false;
      crew.retarget(q.id, spotFor(t, q.id));
    }
    const meal = mealOfStep(t.stepId);
    log(p, `${meal?.name ?? 'The meal'} on a tray in ${theirOf(p.id)} room (${why})`);
    bus?.emit('care:tray', { resident: p.id, meal: meal?.id, why });
  }
  // Still waiting to be got up a little after their breakfast time: breakfast comes to them on a tray.
  function trayInBed(p) {
    const s = p.state.step;
    if (!s) return;
    const t = routineTask(p, 'breakfast', s.day);
    const at = dayStep(p, 'breakfast', s.day)?.at ?? 8.5;
    const wake = routineTask(p, 'wake', s.day);
    const coming = wake && (wake.status === 'claimed' || wake.status === 'working'); // (someone is on the way to get them up: breakfast at the table)
    if (t && isOpen(t) && !t.tray && !coming && absNow() >= absHour(s.day, at) + TRAY.afterWaking) toTray(p, t, 'still in bed');
  }
  // --- Milestone 16: mobility and rehab ------------------------------------------------------------------------------------
  const goalKind = (t) => (t.source === 'program' ? t.goalKind ?? null : t.source !== 'plan' ? null : Object.keys(GOAL_TASKS).find((k) => GOAL_TASKS[k].includes(t.name)) ?? null); // (Milestone 20: a program's practice)
  // A session done (or a therapy step managed alone): their goals move by the session, the place, the plan, their Mood
  // and eating, and the helper's rehab traits.
  function rehabSession(p, kind, helper) {
    const rh = p.state.rehab;
    if (!rh?.active || rh.readyDay != null) return;
    const mult = gainMult({ placeMult: kind === 'therapy' || kind === 'self' ? therapySpace(p).mult : 1, plan: p.state.plan, mood: p.state.outcomes.mood, nutritionNeed: p.state.needs.nutrition }) * (programOn('PRG05', p) ? programById('PRG05').effects.rehabMult : 1) * (1 + rb('rehabPct') / 100); // (Milestone 20: the Reablement Pathway; Milestone 21: research)
    const traits = helper ? crew.byId(helper)?.model.traits ?? [] : [];
    addGain(rh, kind, mult, (g) => rehabPct(traits, g));
  }
  // MO04 Transfer Assist with a high Mobility need: a second helper for each transfer (the M8 PC04 two-person pattern).
  function secondHelpers(p, added) {
    if ((p.state.needs.mobility ?? 0) < TWO_PERSON.needAt) return added;
    const extra = [];
    for (const t of added ?? []) {
      if (t.optionId !== 'MO04' || t.optionRefused || !GOAL_TASKS.transfer.includes(t.name)) continue;
      extra.push(addTask(care, { resident: p.id, day: t.day, band: t.band, type: 'mobility', name: TWO_PERSON.name, source: 'plan', optionId: 'MO04', domain: 'MO', second: t.id, at: t.at, place: 'resident', roles: [...TWO_PERSON.roles], minutes: t.minutes, drops: { mobility: 4 }, outcomes: { safety: 1 }, opens: t.opens, due: t.due }));
    }
    return [...(added ?? []), ...extra];
  }
  // The falls-risk number and its modifiers (stored for the save and shown on the card; no falls yet — M25).
  const fallsStaffOn = () => onShiftNow().some((q) => specialtiesOf(q.id).includes('falls'));
  function updateFalls(p) {
    const st = p.state;
    if (!st.mobility) return null;
    st.falls = fallsRisk({ level: st.mobility.level, aid: st.mobility.aid, plan: st.plan ?? {}, fallsStaff: fallsStaffOn(), lab: lvOf('F19'), program: programOn('PRG04', p) ? { value: programById('PRG04').effects.falls, text: programById('PRG04').name } : null, research: rb('falls') ? { value: rb('falls'), text: 'Falls research' } : null }); // (Milestones 20 / 21)
    return st.falls;
  }
  function setSpeed(p) {
    p.agent.speed = RESIDENT.speed * WALK.speedMultiplier * aidSpeed(p.state.mobility?.aid ?? 'none');
  }
  // The end of a day: rehab progress, the mobility level drifts (the aid may change), ready to go home, the auto
  // discharge after DISCHARGE.autoDays.
  function mobilityDay(day) {
    for (const p of inSession()) {
      const st = p.state;
      if (st.rehab?.active) endRehabDay(st.rehab);
      if (st.mobility) {
        const before = st.mobility.aid;
        if (driftMobility(st, rehabRise(st.rehab))) {
          setSpeed(p);
          log(p, st.mobility.aid === 'none' ? `Walking unaided now (was using a ${AIDS[before].short.toLowerCase()})` : `Now using a ${AIDS[st.mobility.aid].short.toLowerCase()}`);
          bus?.emit('care:aid', { resident: p.id, aid: st.mobility.aid, from: before });
        }
      }
      if (st.rehab?.active && st.rehab.readyDay == null && isReady(st.rehab)) {
        st.rehab.readyDay = day;
        clearSteps();
        log(p, 'Ready to go home: every rehab goal met');
        bus?.emit('care:ready', { resident: p.id, name: p.name, day });
      }
      if (st.rehab?.readyDay != null && !st.rehab.kept && day - st.rehab.readyDay >= DISCHARGE.autoDays && !st.leaving) world.discharge(p.id, { auto: true });
      if (st.rehab?.kept && st.rehab.readyDay != null) log(p, 'Ready to go home: staying on brings nothing extra'); // (the daily reminder)
      updateFalls(p);
    }
  }
  // --- Milestone 17: memory support ---------------------------------------------------------------------------------------
  const memoryOf = (p) => (p?.state.memory && isMemorySupport(p.def) ? p.state.memory : null);
  const memoryCoop = (p, mult) => (memoryOf(p) ? Math.max(0, 1 - (1 - mult) * FAMILIAR_MEMORY.cooperationMult) : mult);
  // A task done for them: a face they hardly know is a routine change (not a Memory Friendly one); a familiar one calms.
  function memoryTaskDone(p, t, q, famBefore) {
    const ms = memoryOf(p);
    // (each new face counts once a day)
    if (famBefore < ROUTINE_CHANGE.newFaceBelow && !memoryPct(q.model.traits) && !(ms.faces ?? []).includes(q.id)) {
      ms.faces = [...(ms.faces ?? []), q.id];
      noteChange(ms, 'newFace');
    }
    if (famBefore >= FAMILIAR_MEMORY.comfortAt) p.state.outcomes.comfort = clamp(p.state.outcomes.comfort + FAMILIAR_MEMORY.comfort);
  }
  // A personal session for a memory-support resident (a life-story session, SO04's music and memory): a bigger lift with
  // someone who knows them well, in the Memory Activity Room, or with a Memory Friendly / Memory Maker helper; counted
  // (SEC-RES-08 reads the count later). → the theme (for the log), or null
  function personalSession(p, t, q, famBefore) {
    const ms = memoryOf(p);
    const music = t.optionId === 'SO04';
    if (!ms || (t.source !== 'lifeStory' && !music)) return null;
    const theme = music ? 'favourite music from the past' : themeOf(p.def, p.state);
    if (!music) legacyVisit(p); // (Milestone 31: life-story time at Legacy House)
    const mult = (famBefore >= LIFE_STORY.familiarAt ? LIFE_STORY.familiarBonus : 1) * (lvOf('F20') ? scaleBonus(LIFE_STORY.roomMult, lvOf('F20')) : 1) * (1 + memoryPct(q.model.traits) / 100) * (1 + rb('memoryPct') / 100) * (music ? 1 : legacyMult(p.id, LEGACY_HOUSE.storyMult)); // (Milestone 21: research; Milestone 31: Legacy House)
    t.outcomes = Object.fromEntries(Object.entries(t.outcomes ?? {}).map(([k, v]) => [k, v * mult]));
    if (!q.agency) addFamiliarity(care, p.id, q.id, LIFE_STORY.familiarityBonus, clock.totalDays);
    ms.sessions = (ms.sessions ?? 0) + 1;
    ms.lastSession = { day: clock.totalDays, theme, with: q.id, kind: music ? 'music' : 'lifeStory' };
    bus?.emit('care:lifeStory', { resident: p.id, staff: q.id, theme });
    return theme;
  }
  // An unsettled day (or a day after several changes): a one-to-one life-story session is offered in the afternoon.
  function planLifeStory(p, inst, at) {
    const ms = memoryOf(p);
    if (!ms || inst.band.id !== 'afternoon') return;
    if (ms.status !== 'unsettled' && (ms.hist?.at(-1) ?? 0) < ROUTINE_CHANGE.unsettledAt) return;
    const roles = rolesOnShift(inst.band.id);
    if (!LIFE_STORY.roles.some((r) => roles.has(r))) return;
    const due = bandEnd(inst.band, inst.day);
    if (due <= at) return;
    addTask(care, { resident: p.id, day: inst.day, band: inst.band.id, type: 'visit', name: LIFE_STORY.name, source: 'lifeStory', at: LIFE_STORY.offerAt, place: 'resident', roles: [...LIFE_STORY.roles], minutes: LIFE_STORY.minutes, drops: { ...LIFE_STORY.drops }, outcomes: { ...LIFE_STORY.lifts }, opens: Math.max(at, absHour(inst.day, LIFE_STORY.offerAt)), due });
  }
  // How busy it is where they are now.
  function placeLevel(p) {
    const ms = p.state.memory;
    if (ms.walk) return ms.walk.kind === 'path' ? 'calm' : STIMULATION.places.walking;
    const place = residentPlace(p);
    if (place === 'dining') {
      const s = p.state.step;
      const diners = residents.filter((o) => o.state.step?.id === s?.id && o.state.step.day === s?.day && ['waiting', 'doing'].includes(o.state.step.status) && residentPlace(o) === 'dining' && seatPiece(o, 'dining') === seatPiece(p, 'dining')).length;
      return diners > SEATING.perRoom ? STIMULATION.places.diningCrowded : STIMULATION.places.dining;
    }
    if (place === 'calm') return STIMULATION.facilities[calmPiece()?.defId] ?? 'low';
    return STIMULATION.places[place] ?? 'medium';
  }
  // An hour's stimulation: a busy place for long lowers Comfort a little, a quiet one lifts it (more in their own
  // Memory Support Room, or with EN03 / EN04 on their plan).
  function memoryHour(p, hours) {
    const ms = memoryOf(p);
    if (!ms) return;
    if (world.isAsleep(p) || !joined(p) || p.state.leaving) {
      ms.stim = { level: 'low', highHours: 0 };
      return;
    }
    const level = placeLevel(p);
    const highHours = level === 'high' ? (ms.stim?.highHours ?? 0) + hours : 0;
    let mult = 1;
    if (residentPlace(p) === 'room' && !ms.walk) {
      const own = roomList().find((r) => r.id === p.state.room);
      mult *= scaleBonus(STIMULATION.roomBonus[own?.defId] ?? 1, own ? layout.levelMultOf(own.uid) : 1); // (Milestone 25c: the room's level)
      mult *= STIMULATION.plan[p.state.plan?.EN] ?? 1;
    }
    if (residentPlace(p) === 'calm' && calmPiece()) mult *= layout.levelMultOf(calmPiece().uid); // (Milestone 25c: the calm place's level)
    ms.stim = { level, highHours: Math.round(highHours * 1000) / 1000 };
    const lift = stimulationLift(level, highHours, mult) * hours;
    if (lift) p.state.outcomes.comfort = clamp(p.state.outcomes.comfort + lift);
  }
  // --- walks: never locked in, never restrained, never punished ---
  function walkTick(p) {
    const ms = memoryOf(p);
    if (!ms) return;
    const st = p.state;
    if (ms.walk) {
      if (ms.walk.kind === 'path' && p.agent.state !== 'walking') nextPathLeg(p);
      else if (ms.walk.kind === 'corridor' && absNow() >= ms.walk.until) endWalk(p, 'alone');
      else if (ms.walk.kind === 'corridor' && p.agent.state !== 'walking' && !ms.walk.there) {
        const t = spot(ms.walk.ref);
        const here = grid.worldToTile(p.agent.x, p.agent.y);
        if (here && (here.col !== t.col || here.row !== t.row)) p.agent.walkTo(grid, t.col, t.row);
        else ms.walk.there = true;
      }
      return;
    }
    if (st.leaving || !joined(p) || world.isAsleep(p) || st.step?.status !== 'doing' || p.agent.state === 'walking') return;
    if (st.unwell || st.fallen || st.fallRest) return; // (Milestone 25: resting after a fall, or unwell)
    const h = hourNow();
    if (h < WALKING.fromHour || h > WALKING.toHour) return;
    const block = `${clock.totalDays}:${Math.floor(h * 4)}`;
    if (ms.walkCheck === block) return;
    ms.walkCheck = block;
    if (new Rng(`${seed}:walk:${p.id}:${block}`).next() >= walkChance(ms) / 4) return;
    startWalk(p);
  }
  function startWalk(p) {
    const ms = memoryOf(p);
    const tiles = care.walkPath?.tiles;
    if (tiles?.length) {
      const here = grid.worldToTile(p.agent.x, p.agent.y) ?? tiles[0];
      let i0 = 0;
      tiles.forEach((t, i) => {
        if (Math.abs(t.col - here.col) + Math.abs(t.row - here.row) < Math.abs(tiles[i0].col - here.col) + Math.abs(tiles[i0].row - here.row)) i0 = i;
      });
      ms.walk = { kind: 'path', i0, step: 0, from: absNow(), helpRef: 'hall.cwPost' };
      log(p, 'Went for a walk on the walking path');
    } else {
      const rng = new Rng(`${seed}:walkto:${p.id}:${clock.totalDays}:${Math.floor(hourNow() * 4)}`);
      const [ref, helpRef] = rng.next() < 0.5 ? ['hall.cwRound', 'hall.ahRound'] : ['hall.ahRound', 'hall.cwRound'];
      ms.walk = { kind: 'corridor', ref, helpRef, from: absNow(), until: absNow() + WALKING.returnAfter };
      const inst = bandInstance(hourNow(), clock.totalDays);
      const R = WALKING.redirect;
      addTask(care, { resident: p.id, day: inst.day, band: inst.band.id, type: 'visit', urgency: 2, name: R.name, source: 'redirect', place: 'resident', roles: [...R.roles], minutes: R.minutes, drops: {}, outcomes: {}, opens: absNow(), due: absNow() + WALKING.returnAfter });
      log(p, 'Went for a walk along the corridor');
    }
    ms.walk.falls = updateFalls(p)?.risk ?? null; // (Milestone 16's falls risk applies while walking; no falls until M25)
    bus?.emit('care:walk', { resident: p.id, kind: ms.walk.kind });
  }
  // The path, a few tiles at a time; once round the loop, back to where they were, a little calmer.
  function nextPathLeg(p) {
    const ms = memoryOf(p);
    const tiles = care.walkPath?.tiles;
    if (!ms?.walk || !tiles?.length) return ms?.walk && endWalk(p, 'alone');
    if (ms.walk.step >= tiles.length) return endWalk(p, 'path');
    ms.walk.step = Math.min(tiles.length, ms.walk.step + 3);
    const t = tiles[(ms.walk.i0 + ms.walk.step) % tiles.length];
    p.agent.walkTo(grid, t.col, t.row);
  }
  // A walk is over: on the path (a calm walk: a small lift), walked back with someone, or back on their own. Nothing is
  // ever held against them. back: walk them back to where their step is (not when their next step is taking over).
  function endWalk(p, how, helper = null, quiet = false) {
    const ms = p.state.memory;
    if (!ms?.walk) return;
    const kind = ms.walk.kind;
    ms.walk = null;
    for (const t of care.tasks) if (t.resident === p.id && t.source === 'redirect' && isOpen(t)) finish(t, 'self');
    if (how === 'path') {
      p.state.outcomes.comfort = clamp(p.state.outcomes.comfort + WALKING.pathComfort);
      p.state.outcomes.mood = clamp(p.state.outcomes.mood + WALKING.pathMood);
      log(p, 'Back from a calm walk on the walking path');
    } else if (how === 'redirected') log(p, `Walked back together with ${helperName(helper)}`);
    else if (how === 'alone') log(p, kind === 'corridor' ? 'Came back from the walk' : 'Back from the walk');
    bus?.emit('care:walkEnd', { resident: p.id, how });
    if (quiet) return;
    const s = p.state.step;
    const step = s && dayStep(p, s.id, s.day);
    if (step) walkResident(p, step, s.day);
  }
  function memoryDay(day) {
    for (const p of inSession()) {
      const ms = memoryOf(p);
      if (!ms) continue;
      const was = ms.status;
      endMemoryDay(ms, p.state);
      noteChoice(ms, p.state);
      if (ms.status !== was) log(p, ms.status === 'unsettled' ? 'Seems unsettled: a steady day and a familiar face would help' : 'Settled again: a steadier routine');
    }
  }
  // The safe walking path (one loop for the home). tiles: [{ col, row }] → { ok, reason }; null clears it.
  function setWalkPath(tiles) {
    if (tiles == null) {
      delete care.walkPath;
      return { ok: true, reason: null };
    }
    const r = validatePath(tiles, (c, rr) => layout.isOpen(c, rr) && !grid.isBlocked(c, rr));
    if (!r.ok) return r;
    care.walkPath = { tiles: tiles.map((t) => ({ col: t.col, row: t.row })) };
    bus?.emit('home:walkPath', { tiles: tiles.length });
    return r;
  }
  // --- Milestone 18: clinical care ---------------------------------------------------------------------------------------------
  // The medicine round (the cart, round safety, late stops, round issues), health checks, alerts (unseen → noticed → a
  // high-level action → resolved well / overdone, or lingering), the visiting clinician, hospital transfers and the
  // Clinical Safety score. Never real medicines, amounts or diagnoses; never a death or a fail state.
  care.clinical = ensureClinical(care.clinical);
  const cl = care.clinical;
  const isMeds = (t) => t.type === 'meds';
  const isObs = (t) => t.type === 'observation' && (t.source === 'plan' || t.source === 'need' || t.source === 'clinicalObs');
  const roundKey = (t) => `${t.day}:${t.at}`;
  const nursesOn = () => onShiftNow().filter((q) => q.role === 'RN');
  const hasPiece = (id) => layout.ofDef(id).length > 0;
  // Milestone 25c: a facility's level × (×1 / ×1.5 / ×2, its best copy) — 0 when none stands, so it doubles as "has one"
  const lvOf = (id) => (hasPiece(id) ? layout.levelMultOfDef(id) : 0);
  // Milestone 31: Legacy House (F35, data/facilities.js LEGACY_HOUSE) — a resident who joins life-story time while it
  // stands uses it for the next weeks: their life-story sessions lift more and the Familiar Care they build grows faster
  // (× its level). care.prestige.legacy: residentId → the last day they count as using it.
  const legacyOn = () => hasPiece(LEGACY_HOUSE.facility) && !offline(LEGACY_HOUSE.facility);
  const legacyUsers = () => (care.prestige ??= { legacy: {} }).legacy;
  const legacyUser = (residentId) => legacyOn() && (legacyUsers()[residentId] ?? -1) >= clock.totalDays;
  function legacyVisit(p) {
    if (legacyOn()) legacyUsers()[p.id] = clock.totalDays + LEGACY_HOUSE.days;
  }
  const legacyMult = (residentId, base) => (legacyUser(residentId) ? scaleBonus(base, lvOf(LEGACY_HOUSE.facility)) : 1);
  const themOf = (p) => (p.def.pronoun === 'she' ? 'her' : 'him');
  // A free floor tile in front of (else beside, else behind) a piece; n = which one (0 the nurse's, 1 the cart's).
  function besidePiece(pc, n = 0) {
    const b = pc.box;
    const cands = [];
    for (let c = b.col; c < b.col + b.w; c++) cands.push([c, b.row + b.h]);
    for (let r = b.row + b.h - 1; r >= b.row; r--) cands.push([b.col + b.w, r], [b.col - 1, r]);
    for (let c = b.col; c < b.col + b.w; c++) cands.push([c, b.row - 1]);
    const ok = cands.filter(([c, r]) => c >= 0 && r >= 0 && c < MAX_FLOOR.cols && r < MAX_FLOOR.rows && layout.isOpen(c, r) && !grid.isBlocked(c, r));
    const t = ok[Math.min(n, ok.length - 1)];
    return t ? { col: t[0], row: t[1] } : null;
  }
  const medRoom = () => (offline(MED_ROOM.id) ? null : layout.ofDef(MED_ROOM.id)[0]) ?? null; // (Milestone 25: out of action in a fault)
  // Where the cart is collected: the Medication Room, else the Nurse Station.
  function cartSpot() {
    const pc = medRoom();
    const t = pc && besidePiece(pc, 0);
    return t ? `tile:${t.col},${t.row}` : `${layout.ofDef(MED_ROOM.fallback)[0]?.id ?? 'F01'}.staff`;
  }
  function roundFor(t) {
    return (cl.rounds[roundKey(t)] ??= { day: t.day, at: t.at, name: ROUND.names[t.at] ?? 'Medicine round', by: null, carts: [], collected: null, safety: null, parts: null, stops: 0, done: 0, late: 0, missed: 0, issues: [] });
  }
  // by: the nurse who started the round; carts: every nurse with a cart out on it
  const hasCart = (r, q) => !!r && (r.carts ?? []).includes(q.id);
  // Round safety as the nurse collects the cart (bible §16's list).
  function safetyNow(t, q) {
    const stops = care.tasks.filter((x) => isMeds(x) && x.day === t.day && x.at === t.at && !x.optionRefused && x.status !== 'refused' && byResident(x.resident)).map((x) => byResident(x.resident));
    const inst = bandInstance(hourNow(), clock.totalDays);
    const queued = care.tasks.filter((x) => isOpen(x) && x.day === inst.day && x.band === inst.band.id && x.roles.length === 1 && x.roles[0] === 'RN' && byResident(x.resident)).length;
    const s = roundSafety({ cln: q.model.stats?.CLN ?? 100, queued, nurses: Math.max(1, nursesOn().length), stops: stops.length, medRoom: medRoom() ? layout.levelMultOf(medRoom().uid) : 0, governance: lvOf(GOVERNANCE.id), levels: stops.map((p) => supportLevel(p.def)), plans: stops.map((p) => p.state.plan?.CL), complexPct: clinicalPct(q.model.traits), trained: specialtiesOf(q.id).includes('medication'), alerts: openAlerts().length });
    const extra = rb('roundSafety'); // (Milestone 21: research)
    if (extra) {
      s.parts = { ...s.parts, research: extra };
      s.safety = Math.min(100, s.safety + extra);
    }
    return { ...s, stops: stops.length };
  }
  function collectCart(t, q) {
    t.cartLeg = false;
    const r = roundFor(t);
    r.carts = [...new Set([...(r.carts ?? []), q.id])];
    r.by ??= q.id;
    if (r.collected == null) {
      const s = safetyNow(t, q);
      Object.assign(r, { collected: absNow(), safety: s.safety, parts: s.parts, mult: s.mult, stops: s.stops });
      dayRecord(cl, r.day).rounds.push(s.safety);
      bus?.emit('care:round', { day: r.day, at: r.at, staff: q.id, safety: s.safety });
      t.workLeft += ROUND.collectMinutes / 60; // (getting the cart ready)
    }
    bus?.emit('care:cart', { staff: q.id, round: roundKey(t), spot: q.task.spot });
    delete q.task.going;
    crew.retarget(q.id, spotFor(t, q.id));
  }
  // One stop on the round done: late (logged), and perhaps a round issue (plain words: logged, a little Safety, counted).
  function roundStop(p, t) {
    const r = roundFor(t);
    r.done++;
    const late = absNow() > absHour(t.day, t.at) + ROUND.lateAfter;
    if (late) {
      r.late++;
      log(p, `The medicine round reached ${themOf(p)} late (${now()})`);
    }
    if (r.safety == null || new Rng(`${seed}:roundIssue:${t.id}`).next() >= issueChance(r.safety)) return;
    const kind = late ? 'late' : 'rushed';
    r.issues.push({ resident: p.id, kind });
    cl.issues++;
    dayRecord(cl, t.day).issues++;
    p.state.outcomes.safety = clamp(p.state.outcomes.safety + ISSUES.safety);
    log(p, `Round issue: ${ISSUES.words[kind]}`);
    if (familyOf(p)) noteSeen(familyOf(p), t.day, 'roundIssue', ISSUES.words[kind], t.band); // (Milestone 19: families are always told)
    bus?.emit('care:roundIssue', { resident: p.id, kind });
  }
  // A round's stops open ROUND.lead hours early (never before their band), so a nurse can fetch the cart in time.
  function roundLead(inst, added) {
    const from = absHour(inst.day, inst.band.from);
    for (const t of added ?? []) if (isMeds(t) && t.status === 'open') t.opens = Math.max(from, t.opens - ROUND.lead);
    return added;
  }
  function noteMiss(p, day) {
    if (!p) return;
    p.state.clinicalMisses = [...(p.state.clinicalMisses ?? []).filter((d) => d > day - OBSERVATION.recentDays), day];
  }
  const recentMisses = (p) => (p.state.clinicalMisses ?? []).filter((d) => d > clock.totalDays - OBSERVATION.recentDays).length;
  function clinicalDone(p, t, q) {
    if (isMeds(t)) roundStop(p, t);
    if (isObs(t)) {
      dayRecord(cl, t.day).obs.done++;
      const a = t.source === 'clinicalObs' ? cl.alerts.find((x) => x.id === t.alert) : null;
      if (a?.pending?.action === 'observe') a.pending.done++;
    }
    if (isMeds(t) || t.type === 'observation') noticeFor(p, isMeds(t) ? 'at the medicine round' : 'at a health check');
    if (t.source === 'clinical') {
      const a = cl.alerts.find((x) => x.id === t.alert);
      if (a?.pending?.task === t.id) settle(a, t.action, { cln: q.model.stats?.CLN ?? 100, complexPct: clinicalPct(q.model.traits) });
    }
  }
  function clinicalOver(t, status) {
    if (status === 'missed' && (isMeds(t) || isObs(t))) {
      if (isMeds(t)) roundFor(t).missed++;
      else dayRecord(cl, t.day).obs.missed++;
      noteMiss(byResident(t.resident), t.day);
    }
    if (t.source !== 'clinical' || status === 'done') return;
    const a = cl.alerts.find((x) => x.id === t.alert);
    if (a?.pending?.task !== t.id) return;
    a.pending = null;
    const rec = a.actions[a.actions.length - 1];
    if (rec) rec.result = 'notDone';
    a.autoAt = autoTime();
    const p = byResident(a.resident);
    if (p && status !== 'gone' && status !== 'away') log(p, `${ACTIONS[t.action].task.name} didn't happen: still ${a.word}`);
  }
  // --- alerts ---
  const openAlerts = () => cl.alerts.filter((a) => a.status === 'open' && a.noticed != null);
  const alertOf = (residentId) => cl.alerts.find((a) => a.resident === residentId && a.status === 'open') ?? null;
  const autoTime = () => {
    const inst = bandInstance(hourNow(), clock.totalDays);
    return Math.max(bandEnd(inst.band, inst.day), absNow() + AUTO.minHours);
  };
  // Once a band: a chance they become unwell (their support, Clinical need, recent missed checks / round stops).
  function maybeAlert(p, inst, at) {
    if (alertOf(p.id) || p.state.away) return;
    const misses = recentMisses(p);
    const rng = new Rng(`${seed}:alert:${p.id}:${inst.key}`);
    if (rng.next() >= alertChance({ support: p.def.support, clinicalNeed: p.state.needs.clinical ?? 0, misses }) / 4) return;
    const severity = rollSeverity(rng, { misses, support: p.def.support });
    raiseAlert(p, severity, wordFor(rng, severity), at);
  }
  function raiseAlert(p, severity, word, at = absNow()) {
    const a = { id: `a${cl.nextAlert++}`, resident: p.id, severity, word, onset: at, noticed: null, late: false, status: 'open', actions: [], pending: null, autoAt: null, autoStep: 0, closed: null, how: null };
    cl.alerts.push(a);
    // (keep the open ones and the last 30 closed)
    const closed = cl.alerts.filter((x) => x.status !== 'open');
    if (closed.length > 30) cl.alerts = cl.alerts.filter((x) => x.status === 'open' || closed.indexOf(x) >= closed.length - 30);
    bus?.emit('care:alertStart', { id: a.id, resident: p.id });
    return a;
  }
  // Noticed at a round stop or a health check — or, unseen for NOTICE.hiddenHours, it shows itself: later and bigger.
  function noticeAlert(a, how, late = false) {
    if (a.noticed != null) return;
    const p = byResident(a.resident);
    if (late) {
      a.severity = bigger(a.severity);
      a.word = wordFor(new Rng(`${seed}:bigger:${a.id}`), a.severity);
      a.late = true;
    }
    a.noticed = absNow();
    a.autoAt = autoTime();
    if (p) log(p, late ? `Seems ${a.word}: nobody noticed sooner (no health check came)` : `Seems ${a.word}: noticed ${how}`);
    bus?.emit('care:alert', { id: a.id, resident: a.resident, name: p?.name, word: a.word, late });
  }
  function noticeFor(p, how) {
    const a = alertOf(p.id);
    if (a && a.noticed == null) noticeAlert(a, how);
  }
  // The senior nurse on shift: the highest level, then the highest CLN.
  const seniorNurse = () => [...nursesOn()].sort((a, b) => b.model.level - a.model.level || (b.model.stats?.CLN ?? 0) - (a.model.stats?.CLN ?? 0))[0] ?? null;
  const clinicianDay = (day) => ((day % 7) + 7) % 7 === CLINICIAN.visitDay;
  const clinicianFee = (day = clock.totalDays + 1) => (clinicianDay(day) ? CLINICIAN.visitFee : CLINICIAN.callOutFee);
  // Can this action be taken now? → { ok, reason, cost }
  function canAct(a, action) {
    const A = ACTIONS[action];
    if (!A) return { ok: false, reason: 'No such action.' };
    if (!a || a.status !== 'open' || a.noticed == null) return { ok: false, reason: 'Nothing to act on.' };
    if (a.pending) return { ok: false, reason: `Under way: ${ACTIONS[a.pending.action].name.toLowerCase()}` };
    if (action === 'assess' && !nursesOn().length) return { ok: false, reason: 'Needs a nurse on shift' };
    if (action === 'escalate' && !seniorNurse()) return { ok: false, reason: 'No nurse on shift to review now' };
    if (action === 'observe' && !team().some((q) => q.role === 'RN')) return { ok: false, reason: 'Needs a nurse on the team' };
    if (action === 'clinician') return { ok: true, reason: null, cost: clinicianFee() };
    if (action === 'hospital') return { ok: true, reason: null, cost: HOSPITAL.fee };
    return { ok: true, reason: null, cost: 0 };
  }
  // Take one of the six actions. by: 'player' | 'auto' (the nurse on shift, when the player hasn't chosen in time).
  function act(a, action, by = 'player') {
    const c = canAct(a, action);
    if (!c.ok) return c;
    const p = byResident(a.resident);
    const A = ACTIONS[action];
    const inst = bandInstance(hourNow(), clock.totalDays);
    const i = AUTO.order.indexOf(action);
    if (i >= 0) a.autoStep = Math.max(a.autoStep ?? 0, i + 1);
    a.actions.push({ action, by, at: absNow(), result: null });
    const nurse = by === 'auto' ? seniorNurse() : null;
    log(p, `${nurse ? `${helperName(nurse.id)} chose` : 'Chosen'}: ${A.name.toLowerCase()} (${a.word})`);
    if (action === 'assess' || action === 'escalate') {
      const T = A.task;
      const senior = action === 'escalate' ? seniorNurse() : null;
      const t = addTask(care, { resident: p.id, day: inst.day, band: inst.band.id, type: 'observation', name: T.name, source: 'clinical', alert: a.id, action, place: 'resident', roles: [...T.roles], urgency: T.urgency, pinned: senior?.id ?? null, minutes: T.minutes, drops: { clinical: 10 }, outcomes: {}, opens: absNow(), due: Math.max(bandEnd(inst.band, inst.day), absNow() + 2) });
      a.pending = { action, task: t.id, by: senior?.id ?? null };
    } else if (action === 'observe') a.pending = { action, until: clock.totalDays + A.days, due: A.days * A.checks.length, done: 0 };
    else if (action === 'carePlan') a.pending = { action, until: clock.totalDays + A.days, suggest: suggestOption(a.word, p.state.plan?.CL) };
    else if (action === 'clinician') {
      const day = clock.totalDays + 1;
      ledger.economy.add('credits', -c.cost, `Visiting clinician: ${p.name}`, 'clinical');
      a.pending = { action, day, fee: c.cost };
      cl.visits = [...cl.visits.filter((v) => v.day >= clock.totalDays - 14), { day, resident: p.id, alert: a.id, fee: c.cost }];
    } else if (action === 'hospital') {
      ledger.economy.add('credits', -c.cost, `Hospital service: ${p.name}`, 'clinical');
      transfer(p, a);
    }
    bus?.emit('care:alertAction', { id: a.id, resident: p.id, action, by });
    return { ok: true, reason: null, suggest: a.pending?.suggest ?? null, cost: c.cost };
  }
  // An action's result: resolved (well, or overdone when bigger than needed) or still lingering (act again).
  function settle(a, action, { cln = null, complexPct = 0, otherOption = false, frac = 1, resolved = null } = {}) {
    const p = byResident(a.resident);
    const mods = { cln, complexPct, otherOption, treatmentRoom: lvOf(TREATMENT_ROOM.id) };
    const ok = resolved ?? new Rng(`${seed}:resolve:${a.id}:${a.actions.length}`).next() < resolveChance(action, a.severity, mods) * frac * (1 + rb('resolvePct') / 100); // (Milestone 21: research)
    const result = resultOf(action, a.severity, ok, mods);
    const rec = a.actions[a.actions.length - 1];
    if (rec) rec.result = result;
    a.pending = null;
    if (ok) return closeAlert(a, result);
    a.autoAt = autoTime();
    if (p) log(p, `Still ${a.word} after: ${ACTIONS[action].name.toLowerCase()}`);
    bus?.emit('care:alertLinger', { id: a.id, resident: a.resident, action });
  }
  function closeAlert(a, how) {
    const p = byResident(a.resident);
    a.status = 'resolved';
    a.closed = absNow();
    a.how = how;
    const d = dayRecord(cl, clock.totalDays);
    d.closed++;
    if (how === 'well') d.well++;
    if (p && !p.state.away) log(p, how === 'well' ? `Feeling better: the ${a.word} alert is settled` : `Feeling better (a smaller step would have done)`);
    bus?.emit('care:alertEnd', { id: a.id, resident: a.resident, how });
  }
  // The nurse on shift acts when the player hasn't: the next action in AUTO.order that can be taken now.
  function autoAct(a) {
    if (!nursesOn().length) {
      a.autoAt = absNow() + AUTO.minHours;
      return;
    }
    while ((a.autoStep ?? 0) < AUTO.order.length) {
      const action = AUTO.order[a.autoStep];
      if (canAct(a, action).ok) return void act(a, action, 'auto');
      a.autoStep++;
    }
    a.autoAt = null;
  }
  // Increase observation: extra health checks at set times while it runs.
  function planExtraChecks(inst, at) {
    const roles = rolesOnShift(inst.band.id);
    if (!roles.has('RN')) return;
    for (const a of openAlerts()) {
      const pd = a.pending;
      const p = byResident(a.resident);
      if (pd?.action !== 'observe' || !p || !inCare(p) || inst.day >= pd.until) continue;
      const T = ACTIONS.observe.task;
      for (const c of ACTIONS.observe.checks) {
        if (c.band !== inst.band.id) continue;
        const due = bandEnd(inst.band, inst.day);
        if (due <= at) continue;
        addTask(care, { resident: p.id, day: inst.day, band: inst.band.id, type: 'observation', name: T.name, source: 'clinicalObs', alert: a.id, place: 'resident', roles: [...T.roles], urgency: T.urgency, minutes: T.minutes, drops: { clinical: 6 }, outcomes: {}, opens: Math.max(at, absHour(inst.day, c.at)), due, at: c.at });
      }
    }
  }
  // Each frame: unseen alerts showing themselves, the clinician's visit, a plan not updated, observation ending, the
  // nurse's own choice when the player hasn't chosen.
  function tickClinical(at) {
    for (const a of cl.alerts) {
      if (a.status !== 'open') continue;
      const p = byResident(a.resident);
      if (!p || p.state.leaving) {
        a.status = 'resolved';
        a.how = 'left';
        a.closed = at;
        continue;
      }
      if (p.state.away) continue;
      if (a.noticed == null) {
        if (at >= a.onset + NOTICE.hiddenHours) noticeAlert(a, null, true);
        continue;
      }
      const pd = a.pending;
      if (pd?.action === 'clinician' && at >= absHour(pd.day, CLINICIAN.visitAt)) {
        if (p) log(p, 'Seen by the visiting clinician');
        settle(a, 'clinician');
      } else if (pd?.action === 'carePlan' && clock.totalDays > pd.until) settle(a, 'carePlan', { resolved: false });
      else if (pd?.action === 'observe' && clock.totalDays >= pd.until) settle(a, 'observe', { frac: pd.due ? Math.min(1, pd.done / pd.due) : 0 });
      else if (!pd && a.autoAt != null && at >= a.autoAt) autoAct(a);
    }
  }
  // While an alert is open (seen or not), it costs a little Comfort an hour.
  function alertHour(p, hours) {
    const a = alertOf(p.id);
    if (a && !p.state.away) p.state.outcomes.comfort = clamp(p.state.outcomes.comfort + NOTICE.comfortPerHour[a.severity] * hours);
  }
  // --- the hospital service: away for a few days (their room held), back with a plan-review flag ---
  function transfer(p, a) {
    const st = p.state;
    if (st.memory?.walk) endWalk(p, 'step', null, true);
    st.away = { kind: 'hospital', from: clock.totalDays, until: absHour(clock.totalDays + HOSPITAL.days, HOSPITAL.returnAt), alert: a.id, out: false };
    for (const t of care.tasks) if (t.resident === p.id && isOpen(t)) finish(t, 'away');
    st.step = null;
    cl.transfers = (cl.transfers ?? 0) + 1;
    const mods = { treatmentRoom: lvOf(TREATMENT_ROOM.id) };
    const rec = a.actions[a.actions.length - 1];
    if (rec) rec.result = resultOf('hospital', a.severity, true, mods);
    closeAlert(a, resultOf('hospital', a.severity, true, mods));
    log(p, `Gone to the hospital service for a few days (${theirOf(p.id)} room is held)`);
    bus?.emit('care:transfer', { resident: p.id, name: p.name, days: HOSPITAL.days });
    p.agent.walkTo(grid, ENTRANCE.col, ENTRANCE.row);
  }
  function awayTick(p) {
    const aw = p.state.away;
    if (absNow() >= aw.until) return comeBack(p);
    if (aw.out || p.agent.state === 'walking') return;
    const here = grid.worldToTile(p.agent.x, p.agent.y);
    if (here && here.col === ENTRANCE.col && here.row === ENTRANCE.row) aw.out = true;
    else p.agent.walkTo(grid, ENTRANCE.col, ENTRANCE.row);
  }
  function comeBack(p) {
    const st = p.state;
    st.away = null;
    st.review = { ...(st.review ?? { day: null, needs: null, reasons: [] }), hospital: clock.totalDays };
    p.agent.placeAtTile(grid, ENTRANCE.col, ENTRANCE.row);
    const t = placeTile(p, 'room');
    p.agent.walkTo(grid, t.col, t.row);
    log(p, 'Back from the hospital service: a care plan review is due');
    bus?.emit('care:back', { resident: p.id, name: p.name });
  }
  // --- kitchen prep, drinks rounds (planned with the band's tasks) ---
  function planKitchen(inst, at) {
    const roles = rolesOnShift(inst.band.id);
    for (const meal of MEALS) {
      if (bandOfHour(meal.prepAt) !== inst.band) continue;
      const rec = dining.record(inst.day, meal.id);
      const kitchen = kitchenNow();
      if (!kitchen) {
        rec.prep.status = 'noKitchen';
        continue;
      }
      if (!PREP.roles.some((r) => roles.has(r))) {
        rec.prep.status = 'noStaff';
        continue;
      }
      const due = absHour(inst.day, meal.at + PREP.dueAfter);
      if (due <= at) continue;
      const t = addTask(care, { resident: null, day: inst.day, band: inst.band.id, type: 'prep', name: `${meal.name} prep`, source: 'kitchen', meal: meal.id, place: 'kitchen', roles: [...PREP.roles], rolePenalty: { CW: PREP.careWorkerPenalty }, minutes: Math.round(PREP.minutes / scaleBonus(KITCHENS[kitchen.defId].prepRate, layout.levelMultOf(kitchen.uid))), opens: Math.max(absHour(inst.day, meal.prepAt), at), due, at: meal.prepAt });
      rec.prep = { status: 'waiting', by: null, doneAt: null, task: t.id };
    }
  }
  function prepDone(t, q) {
    const meal = mealById(t.meal);
    const rec = dining.record(t.day, t.meal);
    rec.prep = { ...rec.prep, status: absNow() <= absHour(t.day, meal.at) + 1e-9 ? 'done' : 'late', by: q.id, doneAt: absNow() };
    bus?.emit('care:prep', { meal: t.meal, day: t.day, staff: q.id, status: rec.prep.status });
  }
  function prepOver(t, status) {
    const rec = dining.record(t.day, t.meal);
    if (rec.prep.task === t.id) rec.prep.status = status;
  }
  function planRounds(p, inst, at) {
    const roles = rolesOnShift(inst.band.id);
    if (!HYDRATION.roles.some((r) => roles.has(r))) return;
    for (const r of HYDRATION.rounds) {
      if (r.band !== inst.band.id) continue;
      const due = absHour(inst.day, r.at + HYDRATION.dueAfter);
      if (due <= at) continue;
      const plus = programOn('PRG07', p) ? programById('PRG07').effects.hydrationMult : 1; // (Milestone 20: Nutrition Plus — more to drink)
      addTask(care, { resident: p.id, day: inst.day, band: inst.band.id, type: 'hydration', name: r.name, source: 'round', round: r.id, place: 'resident', roles: [...HYDRATION.roles], minutes: HYDRATION.minutes, drops: Object.fromEntries(Object.entries(HYDRATION.drops).map(([k, v]) => [k, v * plus])), outcomes: {}, opens: absHour(inst.day, r.at), due, at: r.at });
    }
  }
  // Milestone 14: joining lifts Mood / Social Connection / Independence by how much they like it (less when crowded; more
  // at a community event or a birthday); a liked one resets their "nothing they like for a while" clock.
  function activityOutcome(p, step, day) {
    const s = acts.session(day, step.slot);
    const act = activityById(step.activityId);
    if (!s || !act) return;
    const feeling = feelingOf(p.def, p.state, act);
    const crowded = (s.going?.length ?? 0) > act.group.max;
    const community = act.id === 'gardening' || act.id === 'communityVisit' || !!s.event; // (Milestone 23: a garden or community session)
    const m = outcomeMult(feeling, crowded, s.liftMult ?? 1) * (1 + rb('activityPct') / 100) * (community ? 1 + pp('communityActivityPct') / 100 : 1); // (Milestone 21: research; Milestone 23: GreenLeaf)
    // (Milestone 20: Garden Lover / Music Maker / Community Link on shift lift their kind of session a little more)
    const on = onShiftNow().filter((q) => !q.agency);
    const traitMult = (o) => 1 + Math.max(0, ...on.map((q) => activityPct(q.model.traits, act.id, { event: !!s.event || !!s.program, outcome: o }))) / 100;
    for (const [o, v] of Object.entries(act.lifts)) p.state.outcomes[o] = clamp(p.state.outcomes[o] + v * m * traitMult(o));
    godSession(p, s, day, step.slot, act); // (Milestone 30b: Jinx's lucky day, Havoc's chaos roll)
    if (s.program) programSessionDone(p, s); // (Milestone 20: the program's own lift)
    // (Milestone 23: the session counts for partners and grants once someone who chose to come is there)
    if (!s.counted) {
      s.counted = true;
      if (s.program === 'PRG04') partners?.record('fallsSession', { kind: 'balanceClass' });
      if (act.id === 'communityVisit' || s.event) partners?.record('communityActivity', { activity: act.id, event: s.event ?? null }); // (a visitor or community session — gardening is its own counter)
      if (act.id === 'gardening') partners?.record('gardenSession', {});
      // (Milestone 25c: a partner-hosted event held — the partner leaves a piece of care equipment)
      const pev = s.event ? COMMUNITY_EVENTS.find((e) => e.id === s.event && e.partner) : null;
      if (pev) items.rollSource('partnerEvent', { why: pev.name });
      if (s.event) bus?.emit('care:celebration', { event: s.event }); // (Milestone 30b: a big community event — Havoc's arrival moment)
    }
    if (s.event && !s.joined.includes(p.id)) addMoment(p, 'event', { name: COMMUNITY_EVENTS.find((e) => e.id === s.event)?.name ?? act.name }); // (Milestone 27: the Memory Book)
    if (!s.joined.includes(p.id)) s.joined.push(p.id);
    if (feeling === 'love' || feeling === 'like' || s.birthday) p.state.lastLikedDay = day;
    delete p.state.wouldEnjoy;
    // Milestone 17: Life-story time — personal for a memory-support resident (their own theme), better in the Memory
    // Activity Room
    // (Milestone 31: anyone at life-story time uses Legacy House while it stands; its stories lift them more)
    if (act.id === 'lifeStory') {
      legacyVisit(p);
      const extra = legacyMult(p.id, LEGACY_HOUSE.storyMult) - 1;
      if (extra > 0) for (const [o, v] of Object.entries(act.lifts)) p.state.outcomes[o] = clamp(p.state.outcomes[o] + v * m * extra);
    }
    if (act.id === 'lifeStory' && memoryOf(p)) {
      const ms = memoryOf(p);
      const f20 = (lvOf('F20') ? scaleBonus(LIFE_STORY.roomMult, lvOf('F20')) : 1) * legacyMult(p.id, LEGACY_HOUSE.storyMult);
      for (const [o, v] of Object.entries(LIFE_STORY.lifts)) p.state.outcomes[o] = clamp(p.state.outcomes[o] + v * 0.5 * f20); // (half a one-to-one session's lift, in a small group)
      ms.sessions = (ms.sessions ?? 0) + 1;
      ms.lastSession = { day, theme: themeOf(p.def, p.state), with: null, kind: 'group' };
      log(p, `Life-story time: ${themeOf(p.def, p.state)}`);
    }
  }
  // Milestone 30b: the Works Gods on a session (src/systems/blessings.js), rolled once per session. Jinx (a program
  // session on her shift): a lucky day lifts Mood for everyone there. Havoc (a program, community event or birthday tea on
  // his shift): a big joy boost (Mood and Social Connection) for everyone there, or a harmless mishap — a small clean-up
  // cost once, or only a funny line. Neither ever touches care, safety, health or any task.
  function godSession(p, s, day, slot, act) {
    const roll = blessings.session(s, `${day}:${slot}`, { program: !!s.program, event: !!s.event, birthday: !!s.birthday });
    if (!roll.lucky && !roll.chaos) return;
    const B = BLESSINGS;
    const o = p.state.outcomes;
    if (roll.lucky) o.mood = clamp(o.mood + B.jinx.luckyMood);
    if (roll.chaos === 'joy') {
      o.mood = clamp(o.mood + B.havoc.joyMood);
      o.connection = clamp(o.connection + B.havoc.joyConnection);
    }
    if (s.blessingSaid) return; // (the line, and a mishap's clean-up, once per session)
    s.blessingSaid = true;
    const name = s.program ? programById(s.program)?.name ?? act.name : s.event ? COMMUNITY_EVENTS.find((e) => e.id === s.event)?.name ?? act.name : act.name;
    if (roll.lucky) bus?.emit('care:blessing', { god: 'jinx', kind: 'lucky', text: `A lucky day at ${name}: everyone there is smiling` });
    if (roll.chaos === 'joy') bus?.emit('care:blessing', { god: 'havoc', kind: 'joy', text: `Havoc livened up ${name}: everyone there loved it` });
    if (roll.chaos === 'mishap') {
      const mh = MISHAPS.find((x) => x.id === roll.mishap) ?? MISHAPS[0];
      if (mh.cost) pay(-mh.cost, `Clean-up after ${name} (${mh.text.toLowerCase()})`, 'upkeep');
      bus?.emit('care:blessing', { god: 'havoc', kind: 'mishap', mishap: mh.id, cost: mh.cost, text: `${mh.text} at ${name}${mh.cost ? `: a small clean-up (${mh.cost} Credits)` : ''}` });
    }
  }
  // Milestone 14: on a birthday the resident's most familiar staff on shift drop by (a short visit each, pinned to them).
  function birthdayVisits(p, day) {
    const on = crew.people.filter((q) => !q.agency && !q.leftTeam && roster.onShift(q.id));
    const top = topFamiliar(care, { residentId: p.id }, on.map((q) => q.id), BIRTHDAY.familiarVisits);
    const inst = bandInstance(hourNow(), clock.totalDays);
    for (const r of top) {
      const q = crew.byId(r.staff);
      addTask(care, { resident: p.id, day, band: inst.band.id, type: 'visit', name: 'Birthday visit', source: 'birthday', place: 'resident', roles: [q.role], pinned: q.id, minutes: 15, drops: { social: 10 }, outcomes: { mood: 2 }, opens: absNow(), due: bandEnd(inst.band, inst.day) });
    }
  }
  // Milestone 13 (bible §20): residents at the same meal (the same Dining Room) or the same activity grow their
  // friendship — more when they share tags / get on, sit side by side, or are both regulars of the activity's group.
  // Friends lift each other's Social Connection a little whenever they are together.
  function together(p, step, day) {
    if (step.place !== 'dining' && step.place !== 'lounge') return;
    const st = p.state;
    const kind = step.activity ? 'activity' : 'meal';
    // (Milestone 14: activity groups count the Afternoon session under its M13 id, 'cards', whatever runs in it)
    if (step.activity) st.activityCounts = { ...(st.activityCounts ?? {}), [step.id]: (st.activityCounts?.[step.id] ?? 0) + 1 };
    const group = ACTIVITY_GROUPS.find((g) => g.stepId === step.id);
    const regulars = group ? new Set(groupMembers(group, seated())) : null;
    const piece = seatPiece(p, step.place);
    for (const q of residents) {
      if (q === p || q.state.guest || q.state.leaving || !isCurrent(q, step, day) || q.state.step.status !== 'doing') continue;
      if (seatPiece(q, step.place) !== piece) continue; // (a different Dining Room / lounge)
      let gain = FRIENDSHIP.gain[kind];
      if (sideBySide(seatOf(p, step.place) % seatCount(step.place), seatOf(q, step.place) % seatCount(step.place))) gain += FRIENDSHIP.neighbour;
      if (regulars?.has(p.id) && regulars.has(q.id)) gain += FRIENDSHIP.groupBonus;
      addFriendship(care, p.id, q.id, gain * compatibility(p.def, st.tags, q.def, q.state.tags), { day, kind });
      if (areFriends(care, p.id, q.id)) {
        for (const x of [p, q]) for (const [o, v] of Object.entries(FRIENDSHIP.together)) x.state.outcomes[o] = clamp(x.state.outcomes[o] + v);
      }
    }
  }
  // Help can come if the step has a task that someone on shift now could take (or someone is already on it).
  const helpCanCome = (t) => !!t && isOpen(t) && (t.status !== 'open' || crew.people.some((q) => t.roles.includes(q.role) && roster.onShift(q.id)));
  function arrived(p, step, day) {
    if (!isCurrent(p, step, day)) return;
    const st = p.state;
    if (!st.step.arthurThere) st.step.readyAt = absNow(); // (Milestone 15: when they sat down, for "served on time")
    st.step.arthurThere = true;
    if (st.step.status === 'doing') return;
    const t = routineTask(p, step.id, day);
    if (helpCanCome(t)) {
      st.step.status = 'waiting';
      return;
    }
    // No one on shift who could help (or no task for this step): they manage on their own, as before Milestone 4.
    if (t && isOpen(t)) finish(t, 'self');
    completeRoutine(p, step, day, null);
  }
  function walkResident(p, step, day) {
    const t = placeTile(p, isCurrent(p, step, day) && p.state.step.tray ? 'room' : step.place); // (Milestone 15: a tray)
    const here = grid.worldToTile(p.agent.x, p.agent.y);
    if (here && here.col === t.col && here.row === t.row && p.agent.state !== 'walking') return arrived(p, step, day);
    p.agent.walkTo(grid, t.col, t.row, () => arrived(p, step, day));
  }
  // The step before is over. Help under way finishes now; help that never came is a missed task (no drops: their need
  // keeps rising) when someone could have come, else they managed on their own.
  function closePrevious(p) {
    const s = p.state.step;
    if (!s || s.status === 'doing' || s.status === 'refused' || s.status === 'missed') return;
    const step = routineStep(s.id);
    const t = routineTask(p, s.id, s.day);
    if (t?.status === 'working') {
      const q = crew.byId(t.slots[0]);
      if (q) return completeTask(t, q);
    }
    if (t && isOpen(t) && t.staffable) {
      finish(t, 'missed');
      s.status = 'missed';
      s.helper = null;
      log(p, `Missed: ${step.name} (no help came)`);
      if (s.id === 'therapy') missTherapy(p.state.rehab); // (Milestone 16: a missed session knocks their confidence)
      noteChange(memoryOf(p), 'missed'); // (Milestone 17: a routine step that didn't happen)
      return;
    }
    if (t && isOpen(t)) finish(t, 'self');
    if (s.arthurThere && step) completeRoutine(p, dayStep(p, s.id, s.day), s.day, null, p.id === ARTHUR ? 'on his own' : 'on their own');
  }
  // Milestone 13 (fix first): someone waiting to be got up stays in bed until a helper comes — while anyone on shift
  // could help — and the next step (breakfast) waits for them, until WAKE.waitForHelpUntil.
  function waitsInBed(p) {
    const s = p.state.step;
    if (!s || s.id !== 'wake' || s.status === 'doing' || s.status === 'missed' || hourNow() >= WAKE.waitForHelpUntil) return false;
    const t = routineTask(p, 'wake', s.day);
    return !!t && isOpen(t) && (t.status !== 'open' || crew.people.some((q) => t.roles.includes(q.role) && roster.onShift(q.id)));
  }
  // Milestone 13: how often they are offered something they dislike, and how often they say no (the continuity check).
  const countDislike = (st, refused) => {
    st.dislikes = { offered: (st.dislikes?.offered ?? 0) + 1, refused: (st.dislikes?.refused ?? 0) + (refused ? 1 : 0) };
  };
  function startStep(p, step, day) {
    const st = p.state;
    if (st.memory?.walk) endWalk(p, 'step', null, true); // (Milestone 17: the next step takes over)
    delete st.familyRoom; // (Milestone 19: the next step takes them out of the Family Room; the visitor goes with them)
    closePrevious(p);
    const t = routineTask(p, step.id, day);
    // Milestone 25: resting after a fall, or unwell in an outbreak (isolation) — no group activity today; never a refusal
    if (step.activity && (fallResting(p) || st.unwell)) {
      st.step = { id: step.id, day, status: 'refused', resting: true, helper: null };
      if (t && isOpen(t)) finish(t, 'scaled');
      addLog(st, day, now(), st.unwell ? `Staying in ${theirOf(p.id)} room while unwell (no ${step.name.toLowerCase()} today)` : `Resting after ${theirOf(p.id)} fall (no ${step.name.toLowerCase()} today)`);
      const r = placeTile(p, 'room');
      p.agent.walkTo(grid, r.col, r.row);
      bus?.emit('care:step', { resident: st.id, step: step.id, status: 'resting' });
      return;
    }
    // Milestone 7, fallback step 4: short-staffed, so the day's activity is scaled back (never held against them)
    if (step.activity && coverage.skipsActivity(day)) {
      st.step = { id: step.id, day, status: 'refused', scaled: true, helper: null };
      if (t && isOpen(t)) finish(t, 'scaled');
      noteChange(memoryOf(p), 'missed'); // (Milestone 17)
      addLog(st, day, now(), 'Activities scaled back — short-staffed');
      const r = placeTile(p, 'room');
      p.agent.walkTo(grid, r.col, r.row);
      bus?.emit('care:step', { resident: st.id, step: step.id, status: 'scaled' });
      return;
    }
    // Milestone 13: a disliked step offered by someone they know well is refused less often (never a refused one)
    // (who offers it: the helper already on it or pinned to it; else their usual carer who can help with it and works
    // today — the one who knows them best; else the person who knows them best among those on shift who could help)
    const canHelp = (q) => !q.agency && !q.leftTeam && (t?.roles ?? step.roles).includes(q.role);
    const usual = crew.people.filter((q) => canHelp(q) && inGroup(q.id, p.id) && roster.shiftOf(q.id)).map((q) => q.id);
    const eligible = crew.people.filter((q) => canHelp(q) && roster.onShift(q.id)).map((q) => q.id);
    const offeredBy = t?.slots[0] ?? staffState.assignments[pinKey(p.id, step.id)] ?? mostFamiliar(care, p.id, usual) ?? mostFamiliar(care, p.id, eligible);
    const offerer = offeredBy && crew.byId(offeredBy);
    const mult = memoryCoop(p, offerer && !offerer.agency ? familiarEffects(familiarityOf(care, p.id, offeredBy)).dislikeMult : 1);
    // Milestone 14: an activity session — they join or decline by their own choice (made at the start of the day; a
    // maybe is settled now). Declining is a normal choice: logged, never a failure, never overridden, no penalty.
    if (step.activity && step.slot) {
      const act = activityById(step.activityId);
      const feeling = feelingOf(p.def, st, act);
      if (!acts.session(day, step.slot)) acts.planSession(day, step.slot, sessionInfo(day, step.slot), inSession(), friendIds);
      const s = acts.addChoice(day, step.slot, p, friendIds); // (someone admitted today chooses now)
      const go = acts.decide(day, step.slot, p.id, feeling === 'dislike' ? mult : 1) === 'go';
      if (feeling === 'dislike') countDislike(st, !go);
      if (s.program) programSessionChoice(p, s, go); // (Milestone 20: participation counts — their own choice)
      if (!go) {
        st.step = { id: step.id, day, status: 'refused', declined: true, helper: null };
        if (t && isOpen(t)) finish(t, 'refused');
        if (!s.declined.includes(p.id)) s.declined.push(p.id);
        honour(memoryOf(p)); // (Milestone 17: the Choice signal — their decline respected)
        addLog(st, day, now(), `Chose not to join ${step.name}: free time in ${theirOf(p.id)} room`);
        const r = placeTile(p, 'room');
        p.agent.walkTo(grid, r.col, r.row);
        bus?.emit('care:step', { resident: st.id, step: step.id, status: 'declined', activity: act.id });
        return;
      }
      s.going = [...new Set([...(s.going ?? []), p.id])];
      if (s.birthday === p.id) birthdayVisits(p, day);
      st.step = { id: step.id, day, status: 'walking', helper: t?.slots[0] ?? null, arthurThere: false };
      bus?.emit('care:step', { resident: st.id, step: step.id, status: 'started', activity: act.id });
      walkResident(p, step, day);
      return;
    }
    // Milestone 15: breakfast already brought on a tray while they were still in bed — they have had it
    const meal = mealOfStep(step.id);
    if (meal && t?.status === 'done' && t.tray) {
      st.step = { id: step.id, day, status: 'doing', tray: true, helper: t.slots[0] ?? null, arthurThere: true };
      bus?.emit('care:step', { resident: st.id, step: step.id, status: 'started', tray: true });
      return;
    }
    const answer = decide(st, step, day, seed, mult);
    if (st.prefs?.[step.id] === 'dislike') countDislike(st, answer === 'refuse');
    if (answer === 'refuse') {
      st.step = { id: step.id, day, status: 'refused', helper: null };
      if (t && isOpen(t)) finish(t, 'refused'); // a refused task ends here: logged, never retried this band
      refuseStep(st, step, day, now());
      honour(memoryOf(p));
      const r = placeTile(p, 'room'); // they stay in (or go back to) their room
      p.agent.walkTo(grid, r.col, r.row);
      bus?.emit('care:step', { resident: st.id, step: step.id, status: 'refused' });
      return;
    }
    // Milestone 15: someone who can't come to the Dining Room has the meal on a tray in their room
    const why = meal && t && isOpen(t) ? cantCome(p, meal, day) : null;
    if (why) toTray(p, t, why);
    st.step = { id: step.id, day, status: 'walking', helper: t?.slots[0] ?? null, arthurThere: false, ...(meal && t?.tray ? { tray: true } : {}) };
    bus?.emit('care:step', { resident: st.id, step: step.id, status: 'started' });
    walkResident(p, step, day);
  }
  // After a load: carry on with the step they were in the middle of (or the walk in), and send everyone back to their
  // tasks.
  for (const p of residents) {
    const st = p.state;
    if (!joined(p)) {
      const r = placeTile(p, 'room');
      p.agent.walkTo(grid, r.col, r.row);
    } else if (st.step && (st.step.status === 'walking' || st.step.status === 'waiting')) {
      const step = dayStep(p, st.step.id, st.step.day);
      if (step && !st.step.arthurThere) walkResident(p, step, st.step.day);
    }
  }
  for (const t of care.tasks) {
    if (t.status !== 'claimed' && t.status !== 'working') continue;
    const q = crew.byId(t.slots[0]);
    if (!q || (!byResident(t.resident) && t.source !== 'kitchen')) {
      t.status = 'open';
      t.slots = [null];
      continue;
    }
    crew.resumeTask(q.id, taskInfo(t), t.spot ?? spotFor(t, q.id), !!t.arrived);
  }
  assignSys.refresh();
  // Milestone 13: someone saved mid-walk carries on along the path they were on (re-planning from the tile they stand
  // on could send them back to its centre first, so a reload would drift from the run it came from).
  const resumePath = (agent, saved) => {
    const path = saved?.path;
    if (agent.state !== 'walking' || !path?.length || !agent.path.length) return;
    const a = path[path.length - 1];
    const b = agent.path[agent.path.length - 1];
    if (Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5) agent.path = path.map((pt) => ({ x: pt.x, y: pt.y }));
  };
  for (const p of residents) resumePath(p.agent, p.state.pos);
  planSessions(clock.totalDays); // (Milestone 14: today's sessions and everyone's choice, if not made yet)
  for (const q of crew.people) resumePath(q.agent, staffState.pos?.[q.id]);

  // Milestone 8: a task from an option they refuse is refused the moment it comes up — logged on their card.
  function logRefused(p, tasks) {
    for (const t of tasks ?? []) {
      if (!t.optionRefused) continue;
      log(p, `Refused: ${label(t)} (${optionById(t.optionId)?.name ?? 'plan option'})`);
      honour(memoryOf(p));
      bus?.emit('care:task', { id: t.id, type: t.type, status: 'refused', resident: t.resident });
    }
  }
  // Each frame: plan the band's tasks, ring bells, close what is overdue, move the work on, and let free staff pick.
  const REACH = 1.6 * HOME.cellSize; // "at their side" while they are walking
  function tickTasks(hours) {
    const at = absNow();
    const inst = bandInstance(hourNow(), clock.totalDays);
    if (!care.gen[inst.key]) {
      care.gen[inst.key] = true;
      pruneTasks(care, clock.totalDays);
      dining.prune(clock.totalDays);
      planKitchen(inst, at); // (Milestone 15: kitchen prep for the band's meals, and each resident's drinks rounds)
      for (const p of residents) if (inCare(p)) planRounds(p, inst, at);
      for (const p of residents) if (inCare(p)) planLifeStory(p, inst, at); // (Milestone 17)
      for (const p of residents) if (inCare(p)) planProgramTasks(p, inst, at); // (Milestone 20: one-to-one program offers)
      for (const p of residents) if (inCare(p)) planPilot(p, inst, at); // (Milestone 23: assistive-tech pilot sessions, for those who said yes)
      for (const p of residents) if (inCare(p)) planFalls(p, inst, at); // (Milestone 25: a fall, perhaps, at a seeded time in the band)
      planIncidentTasks(inst, at); // (Milestone 25: isolation care, cleaning, cool drinks)
      for (const p of residents) if (inCare(p)) maybeAlert(p, inst, at); // (Milestone 18: someone may become unwell)
      planExtraChecks(inst, at); // (Milestone 18: Increase observation)
      for (const p of residents) if (inCare(p)) logRefused(p, roundLead(inst, secondHelpers(p, generateBand({ care, st: p.state, band: inst.band, day: inst.day, now: at, rolesOnShift, stepOver: stepOverFor(p), steps: stepsFor(p, inst.day) }))));
    }
    for (const p of residents) {
      if (!inCare(p)) continue;
      const bell = maybeRing(care, p.state, at, clock.totalDays);
      if (bell) {
        log(p, `Rang the call bell (${needName(bell.need)})`);
        bus?.emit('care:bell', { resident: p.id, need: bell.need, status: 'ring' });
      }
    }
    tickClinical(at); // (Milestone 18)
    tickFamily(at); // (Milestone 19: visitors arriving, sitting with the resident, leaving; a meeting opening)
    tickFalls(at); // (Milestone 25)
    incidents.tick(at); // (Milestone 25: an event starting, the home's own choice, its end)
    const current = new Set(residents.map((p) => (p.state.step ? routineTask(p, p.state.step.id, p.state.step.day) : null)).filter(Boolean));
    for (const t of care.tasks) {
      if (current.has(t) || t.type === 'bell' || !(t.status === 'open' || t.status === 'claimed') || t.due > at) continue;
      if (t.source === 'kitchen') {
        finish(t, 'unprepped'); // (Milestone 15: never a missed care task — the kitchen sends what it can)
        prepOver(t, 'unprepped');
        continue;
      }
      const missed = t.staffable;
      finish(t, missed ? 'missed' : 'unstaffed');
      const p = byResident(t.resident);
      if (missed && p) log(p, `Missed: ${t.name}`);
      if (missed && p && goalKind(t) === 'therapy') missTherapy(p.state.rehab); // (Milestone 16)
    }
    // work under way
    for (const t of care.tasks) {
      if (t.status !== 'claimed' && t.status !== 'working') continue;
      const q = crew.byId(t.slots[0]);
      const p = byResident(t.resident);
      const kitchenTask = t.source === 'kitchen';
      if (kitchenTask && !kitchenNow()) {
        finish(t, 'unprepped'); // (the Kitchen was sold)
        prepOver(t, 'unprepped');
        continue;
      }
      if (!q || q.task?.id !== t.id || (!p && !kitchenTask)) {
        // their shift ended (or they were sent elsewhere): back on the board
        if (q) assignSys.unassign(t, q.id);
        t.status = 'open';
        t.slots = [null];
        t.reached = false;
        t.cartLeg = false;
        continue;
      }
      // (Milestone 18: first to the Medication Cart; once it's collected, on to the resident)
      if (t.cartLeg) {
        if (!q.task.arrived) continue;
        collectCart(t, q);
      }
      if (t.place === 'resident') {
        const pool = helpPool(p, residentPlace(p));
        if (!pool.includes(q.task.spot)) crew.retarget(q.id, spotFor(t, q.id));
      }
      if (!t.reached) {
        let reached;
        if (t.place === 'room' || kitchenTask) reached = q.task.arrived;
        else if (t.place === 'step') reached = q.task.arrived && isCurrent(p, routineStep(t.stepId), t.day) && !!p.state.step.arthurThere;
        else reached = (q.task.arrived && p.agent.state !== 'walking') || Math.hypot(q.agent.x - p.agent.x, q.agent.y - p.agent.y) <= REACH;
        if (!reached) continue;
        t.reached = true;
        if (t.type === 'bell') {
          const minutes = Math.round((at - t.ringAt) * 60);
          recordResponse(care, t.resident, { day: clock.totalDays, t: now(), minutes, staffId: q.id, need: t.need });
          log(p, `Call bell answered by ${helperName(q.id)} (${minutes} min)`);
          bus?.emit('care:bell', { resident: p.id, status: 'answered', staff: q.id, minutes });
        }
        if (kitchenTask) {
          t.status = 'working';
          dining.record(t.day, t.meal).prep.status = 'cooking';
          continue;
        }
        const refused = decideTask(p.state, t, seed, memoryCoop(p, familiarEffects(q.agency ? 0 : familiarityOf(care, t.resident, q.id)).dislikeMult)) === 'refuse';
        if ((t.pref && p.state.prefs?.[t.pref] === 'dislike') || (t.optionId && p.state.optionPrefs?.[t.optionId] === 'dislike')) countDislike(p.state, refused);
        if (refused) {
          finish(t, 'refused'); // they said no: it ends cleanly and is not tried again this band
          log(p, `Said no to ${label(t)}`);
          honour(memoryOf(p));
          continue;
        }
        t.status = 'working';
      }
      // Milestone 13: a familiar helper works a little faster (communication / routine efficiency, bible §6)
      // (Milestone 15: a Care Worker preps more slowly than a Hospitality worker)
      const rate = kitchenTask ? (q.role === 'HN' || specialtiesOf(q.id).includes('nutrition') ? 1 : PREP.careWorkerRate) : 1 + familiarEffects(q.agency ? 0 : familiarityOf(care, t.resident, q.id)).speedUp;
      t.workLeft -= (hours * rate * blessings.taskRate(q.id)) / incidentSlow(t); // (Milestone 25: the hoist out, or the water low; Milestone 30b: Zip's own work 20% quicker, the same care)
      if (t.workLeft <= 1e-9) completeTask(t, q);
    }
    // free staff pick their next task (bible §15 order: src/systems/careTasks.js scorePair)
    const bandId = bandAt(hourNow()).id;
    const shiftRoles = new Set(crew.people.filter((q) => roster.onShift(q.id)).map((q) => q.role));
    const avail = care.tasks.filter((t) => t.status === 'open' && t.opens <= at && (byResident(t.resident) || (t.source === 'kitchen' && kitchenNow())));
    for (const t of avail) if (t.roles.some((r) => shiftRoles.has(r))) t.staffable = true;
    const free = crew.people.filter((q) => crew.isFree(q));
    if (!avail.length || !free.length) return;
    for (const { task, person } of choosePairs(avail, free, scoreFor)) claim(task, person);
  }

  // --- Milestone 19: family trust, visits, meetings, compliments, complaints, requests ------------------------------------
  // (src/systems/family.js, data/family.js) Every Trust change is a fixed amount for a named reason, logged on the family's
  // record. A complaint makes an improvement task with an evidence trail; it never costs Credits or a score on its own.
  const fh = (care.family = ensureFamilyHome(care.family));
  care.families ??= {};
  const visitors = []; // { kind: 'visitor', id, name, resident, relation, gender, agent, v (its saved state in fh.visits) }
  const familyOf = (p) => (p && !p.state.guest ? (care.families[p.id] = ensureFamily(care.families[p.id], p.def, clock.totalDays, seed)) : null);
  const hasFamily = (p) => !!familyOf(p)?.contact;
  const callFor = (p) => callOf(familyOf(p)?.contact, p.def);
  const fromWord = (p) => whoOf(familyOf(p)?.contact);
  const soOf = (p) => p.state.plan?.SO === SO_VISITS.option;
  const shiftOfBand = (band) => SHIFT_IDS.find((sid) => SHIFT_TEMPLATES[sid].bands.includes(band)) ?? 'morning';
  const dayWord = (d) => (d === clock.totalDays ? 'today' : d === clock.totalDays + 1 ? 'tomorrow' : `day ${d}`);
  const signedN = (v) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(Math.round(v * 10) / 10)}`;
  // Every Trust change: a fixed amount for a named reason (× F29's +12% when it is a gain and the Centre is placed).
  function trust(p, amount, reason, kind, parts = null) {
    const rec = familyOf(p);
    if (!rec || (!amount && kind !== 'visit')) return 0; // (a visit is always logged, even when its parts add to nothing)
    if (amount > 0 && rb('trustPct')) amount *= 1 + rb('trustPct') / 100; // (Milestone 21: research)
    if (amount > 0 && (kind === 'meeting' || kind === 'call') && pp('familyPct')) amount *= 1 + pp('familyPct') / 100; // (Milestone 23: Kindred Connect)
    const change = changeTrust(rec, amount, { day: clock.totalDays, t: now(), reason, kind, partnership: lvOf(TRUST.partnership), parts });
    bus?.emit('care:trust', { resident: p.id, change, reason, kind, trust: rec.trust });
    return change;
  }
  const missedCare = (p, days = FAMILY_NOTICE.missed.days) => care.tasks.filter((t) => t.resident === p.id && t.essential && t.status === 'missed' && t.day > clock.totalDays - days);

  // --- visits ---
  // Today's visits: anyone whose visit day has come (or passed while they were away), a booked meeting, a birthday party.
  function planVisits(day) {
    if (fh.planned === day) return;
    fh.planned = day;
    for (const p of seated()) {
      const rec = familyOf(p);
      if (!rec?.contact) continue;
      rec.nextVisit ??= nextVisitDay(rec, day - 1, seed, soOf(p));
      const meeting = rec.meeting?.day === day;
      const party = rec.party === day;
      if (!(rec.nextVisit != null && rec.nextVisit <= day) && !meeting && !party) continue;
      if (fh.visits.some((v) => v.resident === p.id && v.day === day)) continue;
      // Milestone 25: an outbreak pauses visits for a few days (they come once it is over; a meeting moves on)
      if (visitsPaused(day)) {
        if (meeting) moveMeeting(p, 'visits are paused for a few days');
        evNow().stats.visitsPaused = (evNow().stats.visitsPaused ?? 0) + 1;
        continue;
      }
      addVisit(p, day, { meeting, party });
    }
  }
  function addVisit(p, day, { meeting = false, party = false } = {}) {
    const rng = new Rng(`${seed}:visitAt:${p.id}:${day}`);
    let at = VISIT.arriveFrom + rng.next() * (VISIT.arriveTo - VISIT.arriveFrom);
    if (party) at = Math.min(at, (dayStep(p, 'cards', day)?.at ?? 13.5) - 0.25); // (in time for the birthday tea)
    if (meeting) at = Math.min(at, MEETING.at);
    const v = { id: `v${fh.nextId++}`, resident: p.id, day, at: absHour(day, at), phase: 'due', meeting, party, start: null, end: null, room: false, roomTile: null, greeter: null, favourite: null, communicatorPct: 0, task: null, follow: null };
    fh.visits.push(v);
    return v;
  }
  const visitorOf = (v) => visitors.find((x) => x.id === v.id) ?? null;
  const visitOf = (residentId) => fh.visits.find((v) => v.resident === residentId && (v.phase === 'arriving' || v.phase === 'with')) ?? null;
  function spawnVisitor(v, pos = null) {
    const p = byResident(v.resident);
    const c = familyOf(p).contact;
    const x = { kind: 'visitor', id: v.id, name: c.name, resident: v.resident, relation: c.relation, gender: c.gender, agent: new Agent({ id: v.id, name: c.name, speed: RESIDENT.speed * WALK.speedMultiplier * VISIT.speed, noPathTeleportSec: 3 * TIMER_SCALE }), v, target: null };
    if (pos) {
      x.agent.x = pos.x;
      x.agent.y = pos.y;
    } else x.agent.placeAtTile(grid, ENTRANCE.col, ENTRANCE.row);
    visitors.push(x);
    return x;
  }
  function removeVisitor(v) {
    const i = visitors.findIndex((x) => x.id === v.id);
    if (i >= 0) visitors.splice(i, 1);
    fh.visits = fh.visits.filter((o) => o !== v);
  }
  // Where the resident is (or is walking to), and a free tile beside it for their visitor.
  const destTile = (a) => {
    const pt = a.state === 'walking' && a.path.length ? a.path[a.path.length - 1] : a;
    return grid.worldToTile(pt.x, pt.y);
  };
  function besideTile(t, avoid) {
    for (const [dc, dr] of [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const c = t.col + dc;
      const r = t.row + dr;
      if (c < 0 || r < 0 || c >= MAX_FLOOR.cols || r >= MAX_FLOOR.rows || !layout.isOpen(c, r) || grid.isBlocked(c, r) || avoid.has(`${c},${r}`)) continue;
      return { col: c, row: r };
    }
    return t;
  }
  // The visitor goes where the resident goes (or to their seat in the Family Room).
  function follow(x) {
    const p = byResident(x.resident);
    const t = x.v.room && p.state.familyRoom ? x.v.roomTile : destTile(p.agent);
    if (!t) return;
    const key = `${t.col},${t.row}`;
    if (x.v.follow === key && (x.agent.state === 'walking' || x.target)) return;
    x.v.follow = key;
    // (not on another visitor's tile, nor where anyone is sitting or heading: beside the resident, never on a neighbour)
    const avoid = new Set(visitors.filter((o) => o !== x && o.target).map((o) => `${o.target.col},${o.target.row}`));
    for (const q of world.people) {
      if (q === p) continue;
      const d = destTile(q.agent);
      if (d) avoid.add(`${d.col},${d.row}`);
    }
    const b = x.v.room && p.state.familyRoom ? t : besideTile(t, avoid);
    x.target = b;
    x.agent.walkTo(grid, b.col, b.row);
  }
  // Free for the Family Room: sitting (not walking, not being helped), awake, the step under way for a while (or in their
  // room), and the next step at least VISIT.freeHours away.
  function freeForVisit(p) {
    const s = p.state.step;
    if (!s || p.agent.state === 'walking' || world.isAsleep(p) || !['doing', 'refused', 'missed'].includes(s.status) || p.state.memory?.walk) return false;
    if (care.tasks.some((t) => t.resident === p.id && t.status === 'working' && t.source !== 'meeting')) return false;
    const steps = stepsFor(p, s.day);
    const i = steps.findIndex((x) => x.id === s.id);
    const next = steps[i + 1];
    const h = hourNow();
    if (next && next.at - h < VISIT.freeHours) return false;
    const step = steps[i];
    return !!step && (step.place === 'room' || h - step.at >= 1.5);
  }
  // With the Family Room placed, the two of them go there as soon as the resident is free (in the first half of the visit).
  function tryFamilyRoom(v, p) {
    if (v.room || absNow() > v.start + VISIT.hours / 2) return;
    const pc = layout.ofDef(VISIT.familyRoom)[0];
    if (!pc || !freeForVisit(p)) return;
    const rt = besidePiece(pc, 0);
    const vt = besidePiece(pc, 1);
    if (!rt || !vt || (rt.col === vt.col && rt.row === vt.row)) return;
    v.room = true;
    v.roomTile = vt;
    p.state.familyRoom = { col: rt.col, row: rt.row, visit: v.id };
    p.agent.walkTo(grid, rt.col, rt.row);
    v.follow = null;
    log(p, `To the Family Room with ${fromWord(p)}`);
  }
  function startVisit(v, x, p) {
    v.phase = 'with';
    v.start = absNow();
    v.end = absNow() + VISIT.hours;
    // who says hello (someone on shift who knows them well), their favourite on shift, a Family Communicator on shift
    const on = onShiftNow().filter((q) => !q.agency);
    const best = topFamiliar(care, { residentId: p.id }, on.map((q) => q.id), 1)[0];
    v.greeter = best && best.familiarity >= FAMILY_NOTICE.greeted.familiarity ? best.staff : null;
    const fav = p.state.favourite?.staff;
    v.favourite = fav && on.some((q) => q.id === fav) ? fav : null;
    v.communicatorPct = Math.max(0, ...on.map((q) => familyPct(q.model.traits)));
    const first = fh.firsts.visit == null;
    if (first) fh.firsts.visit = clock.totalDays;
    log(p, `${fromWord(p)} came to visit${v.meeting ? ' for a care-plan meeting' : v.party ? ' for a birthday party' : ''}`);
    tryFamilyRoom(v, p);
    if (v.meeting) openMeeting(v, p);
    bus?.emit('care:visit', { resident: p.id, name: p.name, visitor: x.name, from: fromWord(p), first, art: first ? FIRSTS.visitArt : null });
    // (Milestone 25c; Milestone 30b: Jinx's blessing makes a thank-you gift more likely, and it counts as a good surprise)
    if ((familyOf(p)?.trust ?? 0) >= ITEM_SOURCES.family.minTrust && items.rollSource('family', { why: `${x.name}, visiting ${p.name}`, chanceMult: blessings.surpriseMult() })) bus?.emit('care:surprise', { kind: 'gift', resident: p.id });
  }
  // The visit ends: what they noticed moves Trust (each part a fixed amount), a line in the log, perhaps a compliment or
  // a complaint, then the visitor walks out.
  function endVisit(v, x, p) {
    const rec = familyOf(p);
    const call = callFor(p);
    const st = p.state;
    const parts = visitParts({
      mood: st.outcomes.mood, comfort: st.outcomes.comfort, missed: missedCare(p).map((t) => t.name),
      bell: !!openBell(care, p.id), alert: !!world.clinical.wordOf(p.id),
      tidy: care.tasks.some((t) => t.resident === p.id && t.type === 'roomCheck' && t.day === clock.totalDays && t.status === 'done'),
      greeter: v.greeter ? helperName(v.greeter) : null, favourite: v.favourite && v.favourite !== v.greeter ? helperName(v.favourite) : null,
      so: soOf(p), party: v.party, call, suite: roomOf(p)?.defId === FAMILY_NOTICE.suite.room ? layout.levelMultOf(roomOf(p).uid) : false, // (Milestone 25c: × the suite's level) // (Milestone 20: RM03's Family Trust +)
    });
    const total = visitTotal(parts, { communicatorPct: v.communicatorPct });
    const change = trust(p, total, `Visit: ${parts.map((x2) => x2.text).join(', ')}`, 'visit', parts);
    log(p, `${fromWord(p)} visited — ${visitWords(parts, call)} (Family Trust ${signedN(change)})`);
    st.outcomes.connection = clamp(st.outcomes.connection + VISIT.connection);
    if (v.party) st.outcomes.mood = clamp(st.outcomes.mood + REQUESTS.birthdayParty.partyTrust);
    if (v.party) {
      bus?.emit('care:surprise', { kind: 'party', resident: p.id }); // (Milestone 30b: a family birthday party held — a good surprise,
      bus?.emit('care:celebration', { party: p.id }); // and a celebration: Havoc's arrival moment)
    }
    const ms = memoryOf(p);
    if (ms?.family) ms.family.connection = clamp(ms.family.connection + VISIT.memoryConnection); // (Milestone 17's stored connection)
    rec.lastVisit = clock.totalDays;
    rec.visits = (rec.visits ?? 0) + 1;
    if (rec.nextVisit != null && rec.nextVisit <= clock.totalDays) rec.nextVisit = nextVisitDay(rec, clock.totalDays, seed, soOf(p));
    if (v.party) rec.party = null;
    // what they saw: a compliment when it went very well, a complaint when something visibly went wrong
    const C = COMPLIMENTS.visit;
    if (total >= C.visitTotal && st.outcomes.mood >= C.mood && parts.every((x2) => x2.value >= 0)) compliment(p, 'visit'); // (nothing they were unhappy about)
    const missed = missedCare(p);
    if (missed.length >= COMPLAINTS.missedCare.visitCount) raiseComplaint(p, 'missedCare', { detail: missed[missed.length - 1].name.toLowerCase(), band: missed[missed.length - 1].band, lastEvent: missed[missed.length - 1].day });
    for (const kind of ['lateTray', 'roundIssue']) {
      const seen = seenOf(rec, kind, clock.totalDays - COMPLAINTS[kind].within + 1);
      if (seen.length >= COMPLAINTS[kind].visitCount) raiseComplaint(p, kind, { detail: seen[seen.length - 1].detail, band: seen[seen.length - 1].band, lastEvent: seen[seen.length - 1].day });
    }
    leaveVisit(v, x);
    bus?.emit('care:visitEnd', { resident: p.id, change, parts });
  }
  function leaveVisit(v, x) {
    const p = byResident(v.resident);
    v.phase = 'leaving';
    if (p?.state.familyRoom?.visit === v.id) {
      delete p.state.familyRoom;
      if (!p.state.leaving && !p.state.away) {
        const t = placeTile(p, residentPlace(p) === 'walking' ? 'room' : residentPlace(p));
        p.agent.walkTo(grid, t.col, t.row);
      }
    }
    const t = v.task && care.tasks.find((o) => o.id === v.task);
    if (t && isOpen(t)) finish(t, 'gone');
    if (x) {
      x.target = null;
      x.agent.walkTo(grid, ENTRANCE.col, ENTRANCE.row);
    }
  }
  // The day's visit could not happen (away, going home, not yet settled): tomorrow instead.
  function postponeVisit(v, p) {
    fh.visits = fh.visits.filter((o) => o !== v);
    if (!p) return;
    const rec = familyOf(p);
    if (v.meeting && rec.meeting) moveMeeting(p, `${first(p.name)} wasn't free`);
    if (v.party) rec.party = null;
  }
  function tickFamily(at) {
    for (const v of [...fh.visits]) {
      const p = byResident(v.resident);
      let x = visitorOf(v);
      if (v.phase === 'due') {
        if (at < v.at) continue;
        if (!p || !inCare(p) || world.isAsleep(p) || !hasFamily(p)) {
          postponeVisit(v, p);
          continue;
        }
        x = spawnVisitor(v);
        v.phase = 'arriving';
        v.follow = null;
      }
      if (v.phase === 'arriving' || v.phase === 'with') {
        if (!x) x = spawnVisitor(v);
        if (!p || !inCare(p)) {
          leaveVisit(v, x);
          continue;
        }
        follow(x);
        if (v.phase === 'arriving') {
          const near = x.agent.state !== 'walking' && Math.hypot(x.agent.x - p.agent.x, x.agent.y - p.agent.y) <= REACH * 1.8;
          if (near || at >= v.at + 1.5) startVisit(v, x, p);
        } else if (at >= v.end && !meetingOpen(v)) endVisit(v, x, p);
        else tryFamilyRoom(v, p);
        continue;
      }
      if (v.phase === 'leaving') {
        if (!x) removeVisitor(v);
        else if (x.agent.state !== 'walking') {
          const t = grid.worldToTile(x.agent.x, x.agent.y);
          if (t && Math.abs(t.col - ENTRANCE.col) + Math.abs(t.row - ENTRANCE.row) <= 1) removeVisitor(v);
          else x.agent.walkTo(grid, ENTRANCE.col, ENTRANCE.row);
        }
      }
    }
  }

  // --- care-plan meetings ---
  // The one who attends: the Founder when on shift, else the Registered Nurse on shift with the best people skills.
  function attendeeNow() {
    const f = crew.byId(staffState.founder.id);
    if (f && !f.leftTeam && roster.onShift(f.id)) return f;
    return [...nursesOn()].filter((q) => !q.agency).sort((a, b) => (b.model.stats?.SOC ?? 0) - (a.model.stats?.SOC ?? 0) || b.model.level - a.model.level)[0] ?? null;
  }
  // Someone who could attend on that day's afternoon (rostered): the Founder, or any nurse.
  const attendeeRostered = () => team().some((q) => (q.id === staffState.founder.id || q.role === 'RN') && !!roster.shiftOf(q.id)?.bands.includes('afternoon'));
  function openMeeting(v, p) {
    const q = attendeeNow();
    if (!q) {
      v.meeting = false;
      return moveMeeting(p, 'no nurse or the Founder on shift');
    }
    const inst = bandInstance(hourNow(), clock.totalDays);
    const t = addTask(care, { resident: p.id, day: inst.day, band: inst.band.id, type: 'visit', name: 'Family meeting', source: 'meeting', visit: v.id, place: 'resident', roles: [q.role], pinned: q.id, urgency: MEETING.urgency, minutes: MEETING.minutes, drops: {}, outcomes: {}, opens: absNow(), due: Math.max(bandEnd(inst.band, inst.day), absNow() + 2) });
    v.task = t.id;
  }
  const meetingOpen = (v) => {
    const t = v.task && care.tasks.find((o) => o.id === v.task);
    return !!t && isOpen(t);
  };
  function moveMeeting(p, why) {
    const rec = familyOf(p);
    const m = rec?.meeting;
    if (!m) return;
    m.tries = (m.tries ?? 0) + 1;
    if (m.tries >= MEETING.tries) {
      rec.meeting = null;
      log(p, `The family meeting couldn't be held (${why}): book another from ${theirOf(p.id)} card`);
      return;
    }
    m.day = clock.totalDays + 1;
    log(p, `The family meeting moves to tomorrow (${why})`);
  }
  function meetingOver(t, status) {
    if (status === 'done') return;
    const p = byResident(t.resident);
    if (p && status !== 'gone') moveMeeting(p, "it didn't happen today");
  }
  // The family's wish, noted on the plan (the first rule that fits).
  function familyNote(p) {
    const st = p.state;
    const disliked = DOMAINS.map((d) => st.plan?.[d.id]).find((o) => o && ['dislike', 'refuse'].includes(optionPrefOf(st, o)));
    for (const n of NOTES) {
      if (n.when === 'dislikedOption' && disliked) return n.text(optionById(disliked).name);
      if (n.when === 'lowMood' && st.outcomes.mood < FAMILY_NOTICE.mood.low + 5) return n.text();
      if (n.when === 'interest' && st.wouldEnjoy) return n.text(activityById(st.wouldEnjoy)?.name ?? p.def.interest);
      if (n.when === 'default') return n.text();
    }
    return null;
  }
  function meetingDone(p, t, q) {
    const rec = familyOf(p);
    const m = rec.meeting ?? { kind: 'meeting', review: false };
    const pct = MEETING.familyRoomPct * lvOf(VISIT.familyRoom); // (Milestone 25c: × its level)
    const lift = (1 + rb('meetingPct') / 100) * MEETING.lift * (1 + pct / 100) * (1 + familyPct(q.model.traits) / 100) * (specialtiesOf(q.id).includes('family') ? 1 + MEETING.liaisonPct / 100 : 1);
    const note = familyNote(p);
    rec.notes = [...(rec.notes ?? []), { day: clock.totalDays, text: note, with: q.id }].slice(-MEETING.noteKept);
    rec.untold = null;
    rec.lastMeeting = clock.totalDays;
    rec.meeting = null;
    fh.meetings = (fh.meetings ?? 0) + 1;
    partners?.record('familyReview', { resident: p.id, kind: m.kind, review: !!m.review }); // (Milestone 23)
    if (m.kind === 'partnership') countFor(progState.running.PRG06, p.id, 'joined'); // (Milestone 20: a partnership meeting held)
    if (m.kind === 'palliative' && inEol(p)) (eolOf(p).acc ??= newAcc(clock.totalDays)).meeting = true; // (Milestone 27: the family supported)
    const change = trust(p, lift, `${MEETING_KINDS[m.kind]?.name ?? 'Care-plan meeting'} with ${helperName(q.id)}${pct ? ' (Family Room)' : ''}`, 'meeting');
    log(p, `Family meeting with ${helperName(q.id)}: ${fromWord(p)}'s wish noted — "${note}" (Family Trust ${signedN(change)})`);
    let first = false;
    if (m.review) {
      markReviewed(p.state, clock.totalDays);
      fh.reviews = (fh.reviews ?? 0) + 1;
      first = fh.firsts.review == null;
      if (first) fh.firsts.review = clock.totalDays;
      const f = staffState.founder;
      if (q.id === f.id) f.history.carePlanReviews = (f.history.carePlanReviews ?? 0) + 1;
      log(p, `Care plan reviewed with ${fromWord(p)} and ${helperName(q.id)}`);
    }
    bus?.emit('care:meeting', { resident: p.id, name: p.name, staff: q.id, change, note, review: !!m.review, first });
  }
  // SO07's family call: they hear how things are (and anything new on the plan).
  function familyCall(p, helper) {
    const rec = familyOf(p);
    if (!rec?.contact) return;
    rec.lastCall = clock.totalDays;
    rec.untold = null;
    const ms = memoryOf(p);
    if (ms?.family) ms.family.connection = clamp(ms.family.connection + 1);
    trust(p, SO_VISITS.callTrust, `A family call with ${helperName(helper)} (Family Connection Plan)`, 'call');
  }
  // Book a meeting: this afternoon when there is still time, else tomorrow. → { ok, reason, day }
  function bookMeeting(p, { review = false, kind = review ? 'review' : 'meeting' } = {}) {
    const rec = familyOf(p);
    if (!rec?.contact) return { ok: false, reason: 'No family to meet' };
    if (p.state.leaving || p.state.away) return { ok: false, reason: 'Not here right now' };
    if (MEETING_KINDS[kind]?.eol && !inEol(p)) return { ok: false, reason: 'Offered once they are approaching the end of life' }; // (Milestone 27)
    if (rec.meeting) return { ok: false, reason: `Booked for ${dayWord(rec.meeting.day)} afternoon` };
    if (!attendeeRostered()) return { ok: false, reason: 'Needs the Founder or a nurse on the Afternoon shift' };
    const today = clock.totalDays;
    const day = hourNow() < MEETING.at - 0.5 && fh.planned === today ? today : today + 1;
    rec.meeting = { day, kind, review, tries: 0, booked: today };
    fh.asks = fh.asks.filter((a) => a.resident !== p.id);
    if (day === today) {
      const v = fh.visits.find((o) => o.resident === p.id && o.day === today && o.phase === 'due');
      if (v) {
        v.meeting = true;
        v.at = Math.min(v.at, absHour(today, MEETING.at));
      } else addVisit(p, today, { meeting: true });
    }
    log(p, `Family meeting booked: ${dayWord(day)} afternoon${review ? ' (a care-plan review with the family)' : ''}`);
    return { ok: true, reason: null, day };
  }

  // --- compliments and complaints ---
  // The staff a compliment names: their favourite (Milestone 13) on the team, else the one who knows them best.
  function namedStaff(p) {
    const ids = team().map((q) => q.id);
    const fav = p.state.favourite?.staff;
    if (fav && ids.includes(fav)) return [fav];
    const best = topFamiliar(care, { residentId: p.id }, ids, 1)[0];
    return best && best.familiarity > 0 ? [best.staff] : [];
  }
  function compliment(p, kind, { amount = null, staff = null } = {}) {
    const rec = familyOf(p);
    if (!rec?.contact) return null;
    const K = COMPLIMENTS[kind];
    if (kind !== 'discharge' && rec.lastCompliment != null && clock.totalDays - rec.lastCompliment < COMPLIMENT.gapDays) return null;
    const named = staff ?? namedStaff(p);
    const text = K.text({ from: fromWord(p), call: callFor(p) });
    const change = trust(p, amount ?? K.trust, `Compliment: ${text}`, 'compliment');
    for (const id of named) {
      const q = crew.byId(id);
      if (q && !q.agency) q.model.morale = clamp(q.model.morale + K.morale);
    }
    const first = fh.firsts.compliment == null;
    if (first) fh.firsts.compliment = clock.totalDays;
    const c = { id: `k${fh.nextId++}`, day: clock.totalDays, resident: p.id, name: p.name, from: fromWord(p), kind, text, staff: named, trust: change, morale: K.morale };
    fh.compliments.push(c);
    research?.addRp(RP_INCOME.compliment, `Compliment from ${fromWord(p)}`, 'compliment'); // (Milestone 21)
    economy?.award('firstCompliment'); // (Milestone 22: Care Tokens)
    if (fh.compliments.length > COMPLIMENT.kept) fh.compliments.shift();
    rec.lastCompliment = clock.totalDays;
    log(p, `A compliment from ${fromWord(p)}${named.length ? ` for ${named.map(helperName).join(' and ')} (Morale +${K.morale})` : ''} · Family Trust ${signedN(change)}`);
    bus?.emit('care:compliment', { id: c.id, resident: p.id, name: p.name, text, first, art: first ? COMPLIMENT.firstArt : null });
    items.rollSource('compliment', { why: `${p.name}'s family` }); // (Milestone 25c)
    return c;
  }
  const trail = (c, text) => c.trail.push({ day: clock.totalDays, t: now(), text });
  // The default owner: the Founder (still on the team), or the senior nurse on the team for clinical ones.
  function ownerFor(kind) {
    const t = team();
    const f = t.find((q) => q.id === staffState.founder.id);
    if (kind === 'nurse') {
      const rn = t.filter((q) => q.role === 'RN').sort((a, b) => b.model.level - a.model.level || (b.model.stats?.CLN ?? 0) - (a.model.stats?.CLN ?? 0))[0];
      if (rn) return rn;
    }
    return f ?? t[0] ?? null;
  }
  // A complaint: the family's Trust dips (a fixed amount), and an improvement task is made with a plain description, a
  // suggested fix, an owner and a due date. No Credits and no score: only the task.
  function raiseComplaint(p, kind, { detail = null, band = null, lastEvent = clock.totalDays, alert = null, option = null, domain = null } = {}) {
    const rec = familyOf(p);
    if (!rec?.contact) return null;
    if (fh.complaints.some((c) => c.resident === p.id && c.kind === kind && c.status === 'open')) return null;
    if (rec.lastComplaint != null && clock.totalDays - rec.lastComplaint < COMPLAINT.gapDays) return null;
    const K = COMPLAINTS[kind];
    const shift = shiftOfBand(band ?? 'morning');
    const owner = ownerFor(K.owner);
    const text = K.text({ from: fromWord(p), call: callFor(p), detail });
    const fixText = FIXES[K.fix].text({ shift: SHIFT_TEMPLATES[shift].name, name: first(p.name), their: theirWord(p.def), relation: rec.contact.relation.toLowerCase() });
    const c = { id: `c${fh.nextId++}`, resident: p.id, name: p.name, from: fromWord(p), kind, text, fix: K.fix, fixText, shift, owner: owner?.id ?? null, raised: clock.totalDays, due: clock.totalDays + COMPLAINT.dueDays, status: 'open', drop: 0, drifted: 0, improved: null, resolved: null, recovered: 0, lastEvent, alert, option, domain, trail: [] };
    c.drop = trust(p, K.drop * (programOn('PRG06', p) ? programById('PRG06').effects.complaintMult : 1), `Complaint: ${text}`, 'complaint'); // (Milestone 20: a smaller dip with the Family Partnership Program)
    trail(c, `Raised: ${text} (Family Trust ${signedN(c.drop)})`);
    trail(c, `Improvement task: ${fixText} · owner ${owner ? helperName(owner.id) : 'nobody yet'} · due in ${COMPLAINT.dueDays} days`);
    rec.lastComplaint = clock.totalDays;
    fh.complaints.push(c);
    const closed = fh.complaints.filter((o) => o.status !== 'open');
    if (closed.length > COMPLAINT.kept) fh.complaints = fh.complaints.filter((o) => o.status === 'open' || closed.indexOf(o) >= closed.length - COMPLAINT.kept);
    log(p, `A complaint from ${fromWord(p)}: an improvement task is open (Quality)`);
    bus?.emit('care:complaint', { id: c.id, resident: p.id, name: p.name, text });
    return c;
  }
  // Has the underlying thing improved? → { ok, text } (the text says how far along it is, in plain words)
  function improvement(c) {
    const p = byResident(c.resident);
    if (!p || p.state.leaving) return { ok: true, text: `${first(c.name)} has gone home` };
    const rec = familyOf(p);
    const K = COMPLAINTS[c.kind];
    const day = clock.totalDays;
    if (c.kind === 'lingeringAlert') {
      const open = cl.alerts.some((a) => a.id === c.alert && a.status === 'open');
      return open ? { ok: false, text: `Not yet: ${first(p.name)} still seems unwell` } : { ok: true, text: 'Improved: the alert is settled' };
    }
    if (c.kind === 'untoldPlan') {
      if ((rec.lastMeeting ?? -1) >= c.raised || (rec.lastCall ?? -1) >= c.raised) return { ok: true, text: 'Improved: the family has been told' };
      if (c.domain && p.state.plan?.[c.domain] !== c.option) return { ok: true, text: 'Improved: the option has been changed' };
      return { ok: false, text: 'Not yet: the family still has not heard (a meeting or a family call)' };
    }
    const events = c.kind === 'missedCare' ? care.tasks.filter((t) => t.resident === p.id && t.essential && t.status === 'missed').map((t) => t.day) : seenOf(rec, c.kind, c.raised - K.within).map((s) => s.day);
    const last = Math.max(c.lastEvent, ...events);
    const clean = day - last - 1; // full days since the last one
    if (last > c.lastEvent) c.lastEvent = last;
    if (clean >= K.fixDays) return { ok: true, text: `Improved: ${K.fixDays} full days with no repeat` };
    return { ok: false, text: `Improving: ${Math.max(0, clean)} of ${K.fixDays} full days with no repeat${last >= day - 1 && last > c.raised ? ' (it happened again)' : ''}` };
  }
  function resolveComplaint(c, by = 'player') {
    if (c.status !== 'open') return { ok: false, reason: 'Already resolved' };
    const imp = improvement(c);
    if (!imp.ok) return { ok: false, reason: imp.text };
    const p = byResident(c.resident);
    c.status = 'resolved';
    c.resolved = clock.totalDays;
    c.recovered = p && !p.state.leaving ? trust(p, -c.drop + COMPLAINT.bonus, `Complaint resolved: ${c.text}`, 'resolved') : 0;
    const owner = c.owner ? helperName(c.owner) : null;
    trail(c, `Resolved${owner ? ` (${owner})` : ''}: ${imp.text.replace(/^Improved: /, '')}${c.recovered ? ` · Family Trust ${signedN(c.recovered)}` : ''}`);
    if (p) log(p, `${fromWord(p)}'s complaint is resolved (Family Trust ${signedN(c.recovered)})`);
    bus?.emit('care:complaintResolved', { id: c.id, resident: c.resident, recovered: c.recovered, by });
    return { ok: true, reason: null, recovered: c.recovered };
  }
  // Each day for an open complaint: improvement noticed (trail), and past its due date Trust drifts down slowly.
  function complaintDay(c) {
    if (c.status !== 'open') return;
    const imp = improvement(c);
    if (imp.ok && c.improved == null) {
      c.improved = clock.totalDays;
      trail(c, `${imp.text}: ready to mark done`);
    } else if (!imp.ok && c.improved != null) {
      c.improved = null;
      trail(c, imp.text);
    }
    const p = byResident(c.resident);
    if (!p || p.state.leaving || clock.totalDays <= c.due) return;
    const step = Math.max(COMPLAINT.driftCap - c.drifted, COMPLAINT.driftPerDay);
    if (step >= 0) return;
    if (!c.drifted) trail(c, 'Past its due date: Family Trust drifts down slowly while it stays open');
    c.drifted += trust(p, step, `Complaint still open past its due date: ${c.text}`, 'drift');
  }

  // --- requests (room moves, a family birthday party) and meeting asks ---
  const roomCentre = (r) => ({ col: r.box.col + r.box.w / 2, row: r.box.row + r.box.h / 2 });
  const dist = (a, b) => Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
  function viewScore(room) {
    const g = layout.ofDef(VIEW.garden)[0];
    return g ? dist(roomCentre(room), { col: g.box.col + g.box.w / 2, row: g.box.row + g.box.h / 2 }) : roomCentre(room).col - VIEW.windowCol;
  }
  const roomOf = (p) => roomList().find((r) => r.id === p.state.room) ?? null;
  // The room a request would move them to (null when none is better by enough).
  function requestRoom(p, kind, friendId = null) {
    const cur = roomOf(p);
    if (!cur) return null;
    const free = roomsFor(p.def);
    if (kind === 'gardenView') {
      const best = [...free].sort((a, b) => viewScore(a) - viewScore(b))[0];
      return best && viewScore(cur) - viewScore(best) >= REQUESTS.gardenView.betterBy ? best : null;
    }
    const fr = byResident(friendId);
    const fRoom = fr && roomOf(fr);
    if (!fRoom) return null;
    const near = (r) => dist(roomCentre(r), roomCentre(fRoom));
    const best = [...free].sort((a, b) => near(a) - near(b))[0];
    return best && near(cur) - near(best) >= REQUESTS.nearFriend.betterBy ? best : null;
  }
  function moveRoom(p, roomId) {
    const old = roomOf(p);
    const nr = roomList().find((r) => r.id === roomId);
    if (!nr || nr.residentId) return false;
    if (old) old.residentId = null;
    nr.residentId = p.id;
    p.state.room = roomId;
    noteChange(memoryOf(p), 'room'); // (Milestone 17: a room move is a change for them)
    if (residentPlace(p) === 'room') {
      const t = placeTile(p, 'room');
      p.agent.walkTo(grid, t.col, t.row);
    }
    log(p, `Moved to room ${layout.roomNumber(roomId)}`);
    return true;
  }
  function requestText(q) {
    const p = byResident(q.resident);
    if (!p) return '';
    const who = fromWord(p);
    if (q.kind === 'gardenView') return `${who} asks if ${first(p.name)} could have a room with a garden view: room ${layout.roomNumber(q.room)} is free`;
    if (q.kind === 'nearFriend') return `${who} asks if ${first(p.name)} could move closer to ${first(byResident(q.friend)?.name ?? '')}: room ${layout.roomNumber(q.room)} is free`;
    return `${who} would like to hold a family birthday party for ${first(p.name)} at the birthday tea (${dayWord(q.party)})`;
  }
  function newRequests(day) {
    const open = fh.requests.filter((q) => q.status === 'open');
    if (open.length >= REQUEST.perHome) return;
    for (const p of seated()) {
      if (fh.requests.filter((q) => q.status === 'open').length >= REQUEST.perHome) return;
      const rec = familyOf(p);
      if (!rec?.contact || !joined(p) || fh.requests.some((q) => q.resident === p.id && q.status === 'open')) continue;
      for (const kind of Object.keys(REQUESTS)) {
        const R = REQUESTS[kind];
        if (!R.patterns.includes(rec.pattern)) continue;
        const q = { id: `q${fh.nextId}`, resident: p.id, kind, day, until: day + REQUEST.expireDays, status: 'open' };
        if (kind === 'birthdayParty') {
          const k = [];
          for (let d = R.daysAhead[0]; d <= R.daysAhead[1]; d++) if (dayOfYear(day + d) === birthdayOf(p.id)) k.push(day + d);
          const year = k.length ? clock.dateOf(k[0]).year : null;
          if (!k.length || rec.asked?.party === year) continue;
          rec.asked = { ...(rec.asked ?? {}), party: year };
          q.party = k[0];
          q.until = Math.min(q.until, k[0] - 1);
        } else if (kind === 'nearFriend') {
          const best = topFriends(care, p.id, seated().map((o) => o.id), 1)[0];
          if (!best || best.friendship < FRIENDSHIP.friendAt) continue;
          q.friend = best.other;
          q.room = requestRoom(p, kind, best.other)?.id ?? null;
          if (!q.room) continue;
        } else {
          q.room = requestRoom(p, kind)?.id ?? null;
          if (!q.room) continue;
        }
        if (new Rng(`${seed}:request:${kind}:${p.id}:${day}`).next() >= (kind === 'birthdayParty' ? Math.min(1, R.chance * blessings.surpriseMult()) : R.chance)) continue; // (Milestone 30b: Jinx makes a family birthday party more likely)
        fh.nextId++;
        fh.requests.push(q);
        bus?.emit('care:familyRequest', { id: q.id, resident: p.id, kind });
        break;
      }
    }
  }
  function answerRequest(q, agree, auto = false) {
    if (!q || q.status !== 'open') return { ok: false, reason: 'Already answered' };
    const p = byResident(q.resident);
    if (!p) {
      q.status = 'gone';
      return { ok: false, reason: 'They are not here' };
    }
    const R = REQUESTS[q.kind];
    if (agree) {
      if (q.kind === 'birthdayParty') {
        familyOf(p).party = q.party;
        log(p, `Family birthday party agreed for ${dayWord(q.party)}: the family will come to the birthday tea`);
      } else {
        const room = roomList().find((r) => r.id === q.room);
        const still = room && !room.residentId ? room : requestRoom(p, q.kind, q.friend);
        if (!still) return { ok: false, reason: 'That room has been taken: no better room is free now' };
        moveRoom(p, still.id);
      }
      q.status = 'agreed';
      trust(p, R.agreeTrust, `Request agreed: ${R.title.toLowerCase()}`, 'request');
    } else {
      q.status = auto ? 'lapsed' : 'declined';
      trust(p, REQUEST.declineTrust, `${auto ? 'No answer to' : 'Kindly declined'}: ${R.title.toLowerCase()}`, 'request');
    }
    q.answered = clock.totalDays;
    fh.requests = fh.requests.filter((o) => o.status === 'open' || o.answered >= clock.totalDays - 28);
    return { ok: true, reason: null };
  }
  // The family asks for a care-plan meeting (the Inbox): Trust has fallen low, or the plan is due for review.
  function newAsks(day) {
    for (const p of seated()) {
      const rec = familyOf(p);
      if (!rec?.contact || !joined(p) || rec.meeting || fh.asks.some((a) => a.resident === p.id)) continue;
      if (rec.asked?.meeting != null && day - rec.asked.meeting < MEETING_ASK.gapDays) continue;
      if (rec.lastMeeting != null && day - rec.lastMeeting < MEETING_ASK.gapDays) continue;
      let why = null;
      if (rec.trust < MEETING_ASK.lowTrust) why = 'low';
      else if (rec.pattern !== 'Community visitor' && staleReasons(p.state, day).length && new Rng(`${seed}:ask:${p.id}:${day}`).next() < MEETING_ASK.reviewChance) why = 'review';
      if (!why) continue;
      rec.asked = { ...(rec.asked ?? {}), meeting: day };
      fh.asks.push({ id: `m${fh.nextId++}`, resident: p.id, day, why, until: day + MEETING_ASK.expireDays });
      bus?.emit('care:familyAsk', { id: fh.asks.at(-1).id, resident: p.id, why }); // (Milestone 28)
    }
  }
  function answerAsk(a, book, auto = false) {
    const p = byResident(a?.resident);
    fh.asks = fh.asks.filter((o) => o !== a);
    if (!a || !p) return { ok: false, reason: 'They are not here' };
    if (book) {
      const r = bookMeeting(p, { review: a.why === 'review', kind: a.why === 'review' ? 'review' : 'request' });
      if (!r.ok) fh.asks.push(a);
      return r;
    }
    trust(p, MEETING_ASK.declineTrust, `${auto ? 'No answer to' : 'Kindly put off'}: a care-plan meeting`, 'request');
    return { ok: true, reason: null };
  }

  // --- the day ---
  // At midnight: what families saw yesterday (missed essential care), day-end complaints (a count reached, a lingering
  // alert, a plan option they weren't told about), a birthday done well, the open complaints' progress and drift,
  // requests and asks lapsing or arriving, and today's visits.
  function familyDay(day) {
    const y = day - 1;
    for (const p of seated()) {
      const rec = familyOf(p);
      if (!rec?.contact || !joined(p)) continue;
      const missed = care.tasks.filter((t) => t.resident === p.id && t.day === y && t.essential && t.status === 'missed');
      const K = COMPLAINTS.missedCare;
      const recent = care.tasks.filter((t) => t.resident === p.id && t.day > y - K.within && t.essential && t.status === 'missed');
      if (missed.length && recent.length >= K.count) raiseComplaint(p, 'missedCare', { detail: missed[missed.length - 1].name.toLowerCase(), band: missed[missed.length - 1].band, lastEvent: y });
      for (const kind of ['lateTray', 'roundIssue']) {
        const seen = seenOf(rec, kind, y - COMPLAINTS[kind].within + 1);
        if (seen.some((s) => s.day === y) && seen.length >= COMPLAINTS[kind].count) raiseComplaint(p, kind, { detail: seen[seen.length - 1].detail, band: seen[seen.length - 1].band, lastEvent: y });
      }
      const a = cl.alerts.find((x) => x.resident === p.id && x.status === 'open' && x.noticed != null);
      if (a && absNow() - a.noticed >= COMPLAINTS.lingeringAlert.hours) raiseComplaint(p, 'lingeringAlert', { detail: a.word, alert: a.id, band: bandAt(a.noticed % 24).id });
      if (rec.untold && day - rec.untold.day >= COMPLAINTS.untoldPlan.days) {
        raiseComplaint(p, 'untoldPlan', { detail: optionById(rec.untold.option)?.name ?? 'a change', option: rec.untold.option, domain: rec.untold.domain });
        rec.untold = null;
      }
      // a birthday done well: they joined the birthday tea and were in good spirits
      const bs = acts.session(y, 'afternoon');
      if (birthdayOf(p.id) === dayOfYear(y) && bs?.joined?.includes(p.id) && p.state.outcomes.mood >= COMPLIMENTS.birthday.mood) compliment(p, 'birthday');
    }
    for (const c of fh.complaints) complaintDay(c);
    for (const q of fh.requests.filter((o) => o.status === 'open' && (o.until < day || !byResident(o.resident)))) answerRequest(q, false, true);
    for (const a of fh.asks.filter((o) => o.until < day || !byResident(o.resident))) answerAsk(a, false, true);
    newRequests(day);
    newAsks(day);
    partnershipMeetings(day); // (Milestone 20: the Family Partnership Program books its meetings)
    planVisits(day);
  }
  // A plan option they dislike (or refuse): the family expects to hear about it — a meeting or a family call does it.
  function familyPlanChange(p, domain, optionId) {
    const rec = familyOf(p);
    if (!rec?.contact) return;
    const pref = optionPrefOf(p.state, optionId);
    if (pref === 'dislike' || pref === 'refuse') rec.untold = { option: optionId, domain, day: clock.totalDays };
    else if (rec.untold?.domain === domain) rec.untold = null;
  }
  // Homes from before Milestone 19: every family's record now (their M16 trust carried over), and today's visits.
  for (const p of seated()) familyOf(p);
  if (!fh.planned) planVisits(clock.totalDays);
  // Visitors under way in a save come back where they were.
  for (const v of fh.visits) if (v.phase === 'arriving' || v.phase === 'with' || v.phase === 'leaving') {
    if (!byResident(v.resident) || !hasFamily(byResident(v.resident))) {
      v.phase = 'gone';
      continue;
    }
    const x = spawnVisitor(v, v.pos ?? null);
    v.follow = null;
    if (v.phase === 'leaving') x.agent.walkTo(grid, ENTRANCE.col, ENTRANCE.row);
  }
  fh.visits = fh.visits.filter((v) => v.phase !== 'gone');

  // --- Milestone 20: specialist programs ------------------------------------------------------------------------------
  // (src/systems/programs.js, data/programs.js) A program only offers: each resident joins or declines by the M14 choice
  // rules; a refused option (or group activities) is never overridden; nobody has to take part for it to count as running.
  // (function declarations: the activities controller asks for today's sessions while the world is still being made)
  function runOf(id) {
    return progState.running[id] ?? null;
  }
  function wingOfResident(p) {
    return roster.wingOfRoom?.(p.state.room) ?? 'home';
  }
  // Is it running for this resident (a wing program: their wing; one wing, "Home", until Milestone 24)?
  function programOn(id, p = null) {
    const run = runOf(id);
    if (!run) return false;
    return !p || programById(id).scope === 'facility' || wingOfResident(p) === run.wing;
  }
  function runningDefs() {
    return PROGRAMS.filter((d) => progState.running[d.id]);
  }
  // A running program's group session for this day and slot (the activities controller asks: a birthday or a booked
  // visitor still comes first).
  function programSession(day, slot) {
    for (const d of runningDefs()) {
      const A = d.adds;
      if (A.kind !== 'session' || A.slot !== slot || !A.days.includes(dayOfWeek(day)) || runOf(d.id).since > day) continue;
      return { activity: A.activity, program: d.id, name: A.name, liftMult: A.liftMult ?? 1 };
    }
    return null;
  }
  // The answer to a one-to-one offer, by their own choice (never overridden): → { go, why }
  function programChoice(d, p, day) {
    const veto = vetoOf(d, p.state);
    if (veto) return { go: false, why: veto };
    if (!d.choice) return { go: true, why: null };
    const act = activityById(d.choice);
    if (feelingOf(p.def, p.state, act) === 'refuse') return { go: false, why: 'their choice' };
    const pj = joinChance({ def: p.def, st: p.state, activity: act });
    const band = choiceBand(pj);
    if (band === 'join') return { go: true, why: null };
    if (band === 'decline') return { go: false, why: 'their choice' };
    return new Rng(`${seed}:${p.id}:${day}:${d.id}:program`).next() < pj ? { go: true, why: null } : { go: false, why: 'their choice' };
  }
  const suitsOffer = (d, p) => (d.adds.who === 'memory' ? !!memoryOf(p) : d.adds.who === 'rehab' ? !!p.state.rehab?.active && p.state.rehab.readyDay == null : d.adds.who === 'elder' ? ageNow(p, clock.totalDays, birthdayOf) >= d.adds.minAge : true); // (Milestone 31: Centenarian Living — the eldest residents)
  // Milestone 31: the Centenarian Garden (F34) makes the prestige programs stronger — × 1.2 at Level I, more with its level
  // (and nothing while it is out of action).
  const gardenMult = (d) => (d?.secret && hasPiece(PRESTIGE_GARDEN.facility) && !offline(PRESTIGE_GARDEN.facility) ? scaleBonus(PRESTIGE_GARDEN.mult, lvOf(PRESTIGE_GARDEN.facility)) : 1);
  // Each band: the running programs' one-to-one offers for this resident (Music & Memory, Reablement practice, the night
  // comfort checks).
  function planProgramTasks(p, inst, at) {
    for (const d of runningDefs()) {
      const A = d.adds;
      if (A.kind !== 'task' || A.band !== inst.band.id || !A.days.includes(dayOfWeek(inst.day)) || !programOn(d.id, p) || !suitsOffer(d, p)) continue;
      const run = runOf(d.id);
      const due = bandEnd(inst.band, inst.day);
      for (const h of Array.isArray(A.at) ? A.at : [A.at]) {
        const when = absHour(h < inst.band.from && inst.band.from > inst.band.to ? inst.day + 1 : inst.day, h);
        const until = Math.min(due, when + 2.5);
        if (until <= at) continue;
        countFor(run, p.id, 'offered');
        const c = programChoice(d, p, inst.day);
        if (!c.go) {
          countFor(run, p.id, 'declined');
          if (A.band !== 'night') log(p, `Chose not to join ${A.name}${c.why && c.why !== 'their choice' ? ` (${c.why})` : ''}: ${d.name}`);
          honour(memoryOf(p)); // (Milestone 17: the Choice signal — their decline respected)
          continue;
        }
        addTask(care, { resident: p.id, day: inst.day, band: inst.band.id, type: A.type, essential: false, name: A.name, source: 'program', program: d.id, ...(A.optionId ? { optionId: A.optionId } : {}), ...(A.goalKind ? { goalKind: A.goalKind } : {}), ...(A.asleepDrops ? { asleepDrops: { ...A.asleepDrops } } : {}), at: h, place: A.place ?? 'resident', roles: [...A.roles], minutes: A.minutes, drops: { ...A.drops }, outcomes: Object.fromEntries(Object.entries(A.outcomes).map(([o, v]) => [o, v * gardenMult(d)])), opens: Math.max(at, when), due: until }); // (Milestone 31: the garden's boost on a prestige program)
      }
    }
  }
  // A one-to-one offer done: counted, logged (a quiet night check on someone asleep is not).
  function programTaskDone(p, t, helper, personal) {
    const run = runOf(t.program);
    countFor(run, p.id, 'joined');
    if (run) run.sessions = (run.sessions ?? 0) + 1;
    if (t.band === 'night' && world.isAsleep(p)) return;
    log(p, personal ? `${t.name} with ${helperName(helper)}: ${personal}` : `${t.name} (with ${helperName(helper)})`);
  }
  // A program's group session: who joined and who chose free time (counted), and the session held.
  function programSessionChoice(p, s, go) {
    const run = runOf(s.program);
    if (!run) return;
    if (!s.held) {
      s.held = true;
      run.sessions = (run.sessions ?? 0) + 1;
    }
    countFor(run, p.id, 'offered');
    countFor(run, p.id, go ? 'joined' : 'declined');
  }
  // The program's own lift for someone who joined: every joiner (joined), those it suits most (suited: their tags).
  function programSessionDone(p, s) {
    const d = programById(s.program);
    if (!d) return;
    const E = d.effects;
    const tags = new Set([...(p.state.tags ?? p.def.tags ?? []), p.def.interest].filter(Boolean));
    const add = (lifts) => {
      for (const [o, v] of Object.entries(lifts ?? {})) p.state.outcomes[o] = clamp(p.state.outcomes[o] + v);
    };
    add(E.joined);
    if (E.suited && (d.suits.tags ?? []).some((t) => tags.has(t))) add(E.suited);
  }
  // Night Comfort: anyone awake in the Night band is a little more comfortable (a warm drink, a quiet word, low lights).
  function programHour(p, hours) {
    prestigeHour(p, hours); // (Milestone 31)
    if (!programOn('PRG08', p) || bandAt(hourNow()).id !== 'night' || world.isAsleep(p) || !inCare(p)) return;
    p.state.outcomes.comfort = clamp(p.state.outcomes.comfort + programById('PRG08').effects.awakeComfortPerHour * hours);
  }
  // Milestone 31: Home, Not Hospital — every clinical task is still done; the day bends around the person, so everyone
  // awake in the day bands is a little more comfortable and content (× the garden's boost).
  function prestigeHour(p, hours) {
    if (!programOn('PRG12', p) || bandAt(hourNow()).id === 'night' || world.isAsleep(p) || !inCare(p)) return;
    const d = programById('PRG12');
    const m = gardenMult(d);
    p.state.outcomes.comfort = clamp(p.state.outcomes.comfort + d.effects.dayComfortPerHour * m * hours);
    p.state.outcomes.mood = clamp(p.state.outcomes.mood + d.effects.dayMoodPerHour * m * hours);
  }
  // Family Partnership: a partnership meeting for each family not met in a while (a few a day at most); never for a
  // resident who refuses the Family Connection Plan.
  function partnershipMeetings(day) {
    if (!programOn('PRG06')) return;
    const E = programById('PRG06').effects;
    let booked = 0;
    for (const p of seated()) {
      if (booked >= E.perDay) break;
      const rec = familyOf(p);
      if (!rec?.contact || !joined(p) || rec.meeting || !programOn('PRG06', p) || vetoOf(programById('PRG06'), p.state)) continue;
      const last = Math.max(rec.lastMeeting ?? -Infinity, progState.meetings[p.id] ?? -Infinity);
      if (day - last < E.meetingEveryDays) continue;
      if (!bookMeeting(p, { kind: 'partnership' }).ok) continue;
      progState.meetings[p.id] = day;
      countFor(runOf('PRG06'), p.id, 'offered');
      booked++;
    }
  }
  const progHistory = (entry) => {
    progState.history.push({ day: clock.totalDays, ...entry });
    if (progState.history.length > PROGRAM_RULES.historyKept) progState.history.shift();
  };
  // Pay a program's Credits: whole weeks at each week's end (or, stopping, the days it ran).
  function payProgram(id, amount, what) {
    const run = runOf(id);
    if (!run || amount <= 0) return 0;
    ledger.economy.add('credits', -amount, `Specialist programs: ${programById(id).name} (${what})`, LEDGER_CATEGORY);
    run.paid += amount;
    progHistory({ id, what: 'paid', amount, text: what });
    return amount;
  }
  function programDay(day) {
    for (const d of runningDefs()) {
      const run = runOf(d.id);
      const weeks = weeksDue(run, day);
      if (!weeks) continue;
      payProgram(d.id, weeks * d.resources.weeklyCost, weeks === 1 ? 'a week' : `${weeks} weeks`);
      research?.addRp(weeks * RP_INCOME.programWeek, `Program: ${d.name}`, 'programs'); // (Milestone 21)
      if (d.resources.funding) ledger.economy.add('credits', weeks * d.resources.funding, `Program funding: ${d.name}`, 'programFunding'); // (Milestone 22)
      run.paidTo += weeks * PROGRAM_RULES.daysPerWeek;
    }
  }
  // What the rules read: placed facilities, the team's roles, the Night shift, the debug switch.
  const programCtx = () => ({ researched: (id) => !!research?.has(id), facilities: facilityIds(), roles: teamRoles(), night: team().some((q) => roster.shiftOf(q.id)?.id === 'night' && !roster.isTraining(q.id)), wings: new Set(WINGS_SPECIAL.filter((w) => layout.wings.active(w.id)).map((w) => w.id)), debug: !!progState.debug, secretOpen: (f) => prestigeOpen(f) }); // (Milestone 27: working wings; Milestone 31: a prestige program's flag)
  // The programs the player can see: the ten, and a prestige one once its flag is set (Milestone 31).
  const listedPrograms = () => [...VISIBLE_PROGRAMS, ...PRESTIGE_PROGRAMS.filter((d) => prestigeOpen(programFlag(d)))];
  const listedProgram = (id) => listedPrograms().find((d) => d.id === id) ?? null;
  const hoursPeople = () => team().map((q) => ({ id: q.id, role: q.role, shift: roster.shiftOf(q.id)?.id ?? null, training: roster.isTraining(q.id) }));
  const programHours = (d) => hoursFor(d, { people: hoursPeople(), state: progState });
  // Can it start now? → { ok, reason }
  function canStartProgram(id) {
    const d = listedProgram(id);
    if (!d) return { ok: false, reason: 'No such program' };
    if (runOf(id)) return { ok: false, reason: 'Already running' };
    const u = unlockOf(d, programCtx());
    if (!u.ok) return { ok: false, reason: u.reason, lock: u.lock };
    const fac = d.resources.facility;
    if (fac && !hasPiece(fac)) return { ok: false, reason: `Needs a ${facilityById(fac)?.name ?? fac} (${fac})` };
    const h = programHours(d);
    if (!h.ok) return { ok: false, reason: `Not enough staff hours: ${h.text}`, hours: h };
    if (ledger.balance < d.resources.weeklyCost) return { ok: false, reason: `Not enough Credits for a week (${d.resources.weeklyCost})` };
    return { ok: true, reason: null };
  }
  function startProgram(id, { wing = programById(id)?.unlock.find((r) => r.type === 'wing')?.id ?? 'home' } = {}) { // (Milestone 27: a wing's own program runs in that wing)
    const c = canStartProgram(id);
    if (!c.ok) return c;
    progState.running[id] = newRun(id, clock.totalDays, wing);
    progHistory({ id, what: 'started' });
    const f = staffState.founder;
    if (!f.ended) f.history.programs = (f.history.programs ?? 0) + 1; // (the Founder's history: programs run)
    planSessions(clock.totalDays, true); // (today's sessions that haven't started take it up)
    economy?.award('firstProgram'); // (Milestone 22)
    bus?.emit('care:program', { id, status: 'started' });
    return { ok: true, reason: null };
  }
  // Stop anytime: it pays only for the days it ran this week, its offers not yet under way are withdrawn.
  function stopProgram(id) {
    const run = runOf(id);
    if (!run) return { ok: false, reason: 'Not running' };
    const d = programById(id);
    const days = daysUnpaid(run, clock.totalDays);
    const owed = PROGRAM_RULES.stopPaysDays ? Math.round((d.resources.weeklyCost * days) / PROGRAM_RULES.daysPerWeek) : 0;
    if (owed) payProgram(id, owed, `${days} day${days === 1 ? '' : 's'}`);
    for (const t of care.tasks) if (t.source === 'program' && t.program === id && t.status === 'open') finish(t, 'stopped');
    delete progState.running[id];
    progHistory({ id, what: 'stopped', amount: owed });
    planSessions(clock.totalDays, true);
    bus?.emit('care:program', { id, status: 'stopped', paid: owed });
    return { ok: true, reason: null, paid: owed };
  }

  // --- going home (Milestone 9) -------------------------------------------------------------------------------------
  // A set stay (Respite, Rehab / Short Stay) ends on its leaveDay at STAY_LEAVE_HOUR (or at once when that has passed,
  // e.g. after a load): their open tasks end, the room frees up, they say goodbye and walk out of the front entrance.
  // It is a good outcome, never a failure; they may apply again later as Returning (their Familiar Care is kept).
  // The opening resident (a new home's Arthur) never goes home while he is the only resident: each day he is alone
  // moves his go-home day back one (the countdown pauses), and it carries on once someone else has been admitted.
  const othersHere = (p) => residents.some((q) => q !== p && !q.state.leaving && !q.state.guest);
  const aloneOpening = (p) => !!p.state.stay?.opening && !othersHere(p);
  // (Milestone 16: someone in rehab goes home when their goals are met — a discharge — not after a set length)
  const due = (p) => !p.state.rehab?.active && !aloneOpening(p) && (clock.totalDays > p.state.stay.leaveDay || (clock.totalDays === p.state.stay.leaveDay && hourNow() >= STAY_LEAVE_HOUR));
  function startLeaving(p, { discharge = false, movedOut = false } = {}) {
    const st = p.state;
    for (const t of care.tasks) if (t.resident === p.id && isOpen(t)) finish(t, 'gone');
    st.leaving = true;
    st.step = null;
    delete st.joinAt;
    const room = placed.find((r) => r.id === st.room);
    if (room?.residentId === p.id) room.residentId = null;
    st.leftDay = clock.totalDays;
    admissions.wentHome({ id: p.id, name: p.name, level: levelOf(p), nursing: nursingOf(p), moodAvg: moodAvgOf(p), room: roomList().find((r) => r.id === st.room)?.defId ?? null, respite: (st.stay?.type ?? p.def.stay) === 'Respite', admittedDay: st.admittedDay ?? 0, leftDay: clock.totalDays, stay: st.stay?.type ?? p.def.stay, rehab: !!st.rehab?.active, readyDay: st.rehab?.readyDay ?? null, discharged: discharge, movedOut }); // (Milestone 22: level, room, respite)
    noteLeft(care, { residentId: p.id }, clock.totalDays); // (Milestone 12: their Familiar Care records stay, marked)
    // Milestone 13: their friends here miss them (a small, one-off Mood dip that drifts back)
    for (const q of seated()) {
      if (q === p || !areFriends(care, p.id, q.id)) continue;
      q.state.outcomes.mood = clamp(q.state.outcomes.mood + FRIENDSHIP.friendLeftMood);
      log(q, `Misses ${first(p.name)}, who has gone home`);
    }
    addLog(st, logDay(st), now(), discharge ? 'Heading home with family: rehab complete' : movedOut ? 'Their family has moved them to another home' : 'Heading home: the stay is over');
    bus?.emit('care:leaving', { resident: p.id, name: p.name, stay: st.stay?.type ?? p.def.stay, discharge });
    walkOut(p);
  }
  function walkOut(p) {
    if (p.agent.state === 'walking') return;
    const here = grid.worldToTile(p.agent.x, p.agent.y);
    if (here && here.col === ENTRANCE.col && here.row === ENTRANCE.row) return removeResident(p);
    p.agent.walkTo(grid, ENTRANCE.col, ENTRANCE.row);
  }
  // Out of the home: off every list (their Familiar Care, bells record and key worker stay in the care state).
  function removeResident(p) {
    const i = residents.indexOf(p);
    if (i >= 0) residents.splice(i, 1);
    const j = world.people.indexOf(p);
    if (j >= 0) world.people.splice(j, 1);
    const room = placed.find((r) => r.residentId === p.id);
    if (room) room.residentId = null;
    if (p.id === ARTHUR) arthur = null;
    if (!p.state.guest) bus?.emit('care:left', { resident: p.id, name: p.name });
  }

  // --- admissions and money (Milestone 6) -----------------------------------------------------------------------
  const admissions = createAdmissions({ saved: admissionsSaved, seed });
  const ledger = createLedger({ saved: ledgerSaved, bus, now: () => clock.totalDays, startCredits });
  // --- research (Milestone 21) ------------------------------------------------------------------------------------------
  care.rewards ??= { reputation: 0, research: 0, positiveOutcomes: 0, discharges: [] };
  research = createResearch({ ledger, care, bus, today: () => clock.totalDays, hasPiece: (id) => layout.ofDef(id).length > 0 });
  layout.setResearchCheck((id) => research.has(id)); // (Build Mode: a facility research opens)
  // --- the economy (Milestone 22) ---------------------------------------------------------------------------------------
  economy = createEconomy({ ledger, care, bus, today: () => clock.totalDays });
  // --- quality, Rank, accreditations, inspections and peer homes (Milestone 26) ---------------------------------------
  care.quality = ensureQualityState(care.quality);
  const qualityFresh = !care.quality.samples.length; // (a new home, or an M25c save: worked out from the home as it is, below)
  quality = createQuality({ state: care.quality, seed, bus, today: () => clock.totalDays, year: () => clock.year, secretOpen: (f) => prestigeOpen(f), hasFacility: (id) => hasPiece(id) && !offline(id), onAward: (a) => {
    if (a.reward.credits) ledger.economy.add('credits', a.reward.credits, `Recognition bonus: ${a.name}`, 'recognition'); // (bible §27)
    staffState.founder.history.recognitions = (staffState.founder.history.recognitions ?? 0) + 1; // (bible §3.5.5)
    prestigeAwardRewards(a); // (Milestone 31: C11's Prestige Tokens, C12's accolade)
  } });
  layout.setRankCheck((r) => rankAtLeast(rankNow(), r)); // (Build Mode: a rank-locked room or facility opens)
  layout.setSecretCheck((f) => prestigeOpen(f)); // (Milestone 31: F34 / F35 only through their secret's flag)
  // --- community partners and grants (Milestone 23) ----------------------------------------------------------------------
  // The home's Nutrition outcome (the residents' average dining satisfaction; null before anyone has eaten here) and its
  // Environment score (room quality and cleanliness — src/systems/partners.js environmentScore).
  function nutritionOutcome() {
    const v = seated().map((p) => p.state.dining?.avg).filter((x) => x != null);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  }
  const roomChecksOn = (day) => {
    const ts = care.tasks.filter((t) => t.type === 'roomCheck' && t.day === day);
    return [ts.filter((t) => t.status === 'done').length, ts.filter((t) => t.status === 'missed').length];
  };
  // (Milestone 30b: Bolt on the team adds his blessing to Environment & Compliance, never past 100)
  const environmentNow = () => {
    const e = environmentScore({ rooms: roomList().map((r) => r.defId), facilities: [...facilityIds()], checks: partners.roomChecks() });
    const b = blessings.environmentBonus();
    return b ? { ...e, score: Math.min(100, e.score + b), blessing: b } : e;
  };
  partners = createPartners({
    care,
    ledger,
    bus,
    seed,
    today: () => clock.totalDays,
    hooks: {
      reward: (kind, info) => items.rollSource(kind, { why: info.name }), // (Milestone 25c)
      payMult: () => blessings.partnerMult(), // (Milestone 30b: Kaching on the team — partner support and grant goals pay more)
      rank: () => rankNow(),
      score: (name) => (name === 'nutrition' ? nutritionOutcome() : name === 'environment' ? environmentNow().score : null),
      buildable: (id) => hasPiece(id) || layout.unlock(id).ok,
      emergency: () => !!(economy.state.debt.loan || economy.state.debt.investor) || !!ic?.active || (ic?.lastEnd != null && clock.totalDays - ic.lastEnd < 28), // (Milestone 25: recovery grants after an event too)
      allocate: ({ stay, count, tag }) => {
        // (someone the home can take now, or once a room it can build is placed)
        const fits = (def) => prereqOf(def, { roles: teamRoles(), placeable: roomTemplatesHere() }).ok || (!!def.requires?.room && layout.unlock(def.requires.room).ok && (!def.requires.role || teamRoles().has(def.requires.role)));
        const out = admissions.allocate({ stay, count, tag, day: clock.totalDays, inHome: inHome(), fits });
        if (out.length) bus?.emit('admissions:change', { day: clock.totalDays, left: [], arrived: out.map((a) => a.id) });
        return out;
      },
      residents: () => seated().filter((p) => joined(p)),
      log: (id, text) => byResident(id) && log(byResident(id), text),
    },
  });
  // The assistive-tech pilot: a short session for each resident who said yes, on their session days (they may still say
  // no on the day — then it simply waits). Nobody who said no is ever offered one.
  function planPilot(p, inst, at) {
    if (inst.band.id !== PILOT.band || !partners.pilot.due(p.id, inst.day)) return;
    if (care.tasks.some((t) => t.source === 'pilot' && t.resident === p.id && t.day === inst.day)) return;
    const when = absHour(inst.day, PILOT.at);
    const until = bandEnd(inst.band, inst.day);
    if (until <= at) return;
    if (!partners.pilot.door(p.id, inst.day)) {
      partners.pilot.skipped(p.id, inst.day);
      log(p, 'Chose not to have an assistive-tech pilot session today (their choice)');
      honour(memoryOf(p)); // (Milestone 17: the Choice signal — their no respected)
      return;
    }
    addTask(care, { resident: p.id, day: inst.day, band: inst.band.id, type: 'visit', name: PILOT.name, source: 'pilot', at: PILOT.at, place: 'resident', roles: [...PILOT.roles], minutes: PILOT.minutes, drops: {}, outcomes: { ...PILOT.outcomes }, opens: Math.max(at, when), due: until });
  }
  function pilotTaskDone(p, t, helper) {
    const done = partners.pilot.session(p.id, t.day);
    const n = partners.pilot.state?.answers[p.id]?.sessions ?? 0;
    log(p, `${t.name} ${n} of ${PILOT.sessions} with ${helperName(helper)}${done ? ': the pilot is complete' : ''}`);
  }
  // --- incidents, outbreaks and emergencies (Milestone 25) -----------------------------------------------------------------
  // (src/systems/incidents.js, data/incidents.js) Bounded templates: the home's Preparedness sets the band, the player
  // chooses one of 2–4 responses (the home takes a free one on its own when no choice comes), and every event ends by
  // itself. Here: what each one does in the home. Falls switch on the Milestone 16 falls risk. Nothing here ever ends the
  // save, lets staff go or removes a resident for good; all timing is game time (pausing changes nothing).
  ic = care.incidents = ensureIncidents(care.incidents, { startDay: careSaved ? 0 : clock.totalDays });
  let fallsMult = 1; // (tests only: world.incidents.setFallsMultForTests)
  const evNow = () => ic?.active ?? null;
  // A facility out of action (a storm, or an equipment fault) — not once a generator has power back on.
  function offline(defId) {
    const ev = ic?.active;
    return !!ev && !ev.restored && ev.targets.facilities.includes(defId);
  }
  function incidentMeal() {
    const ev = evNow();
    if (!ev || (ev.kind !== 'storm' && ev.kind !== 'water')) return 0;
    ev.stats.meals = (ev.stats.meals ?? 0) + 1;
    return Math.round(ev.params.meal * ev.mult * 10) / 10;
  }
  // × the time some work takes: the hoist out (moving and handling), the water low (kitchen prep, laundry and washing).
  function incidentSlow(t) {
    const ev = evNow();
    if (!ev || (ev.kind !== 'equipment' && ev.kind !== 'water')) return 1;
    const kinds = INCIDENT_TASKS.slowTypes[ev.kind];
    if (!(kinds.includes(t.type) || (ev.kind === 'water' && t.source === 'kitchen'))) return 1;
    return 1 + (ev.params.slow - 1) * Math.min(1, ev.mult);
  }
  const visitsPaused = (day) => evNow()?.kind === 'outbreak' && day < (evNow().params.pauseUntil ?? 0);
  const responseOf = (ev) => (ev?.response ? incidentById(ev.kind).responses.find((r) => r.id === ev.response.id) : null);
  // The home's Preparedness inputs: training, the hub, supplies, the staffing reserve, the Environment score, research.
  function prepInputs() {
    const t = team();
    const has = (q, sp) => specialtiesOf(q.id).includes(sp);
    const rows = coverage.status();
    return { infection: t.filter((q) => has(q, 'infection')).length, leads: t.filter((q) => has(q, 'shiftLead')).length, hub: lvOf(PREPAREDNESS.hub.facility), supplies: ic.supplies.stock, floats: t.filter((q) => roster.isFloat(q.id) && roster.shiftOf(q.id)).length, shiftsOver: rows.filter((r) => r.required > 0 && r.pct >= PREPAREDNESS.reserve.overPct).length, shifts: rows.length, environment: environmentNow().score, research: new Set(research.doneIds()) };
  }
  // An event begins: who is unwell, which facilities are out, who is off sick, who needs the hospital service.
  function incidentBegin(ev) {
    const tpl = incidentById(ev.kind);
    const rng = new Rng(`${seed}:incTargets:${ev.id}:${ev.day}`);
    const shuffle = (list) => list.map((x) => ({ x, r: rng.next() })).sort((a, b) => a.r - b.r).map((o) => o.x);
    const here = seated().filter((p) => inCare(p) && !p.state.away);
    if (ev.kind === 'outbreak') {
      const ill = shuffle(here).slice(0, ev.params.unwell);
      if (!ill.length) return false;
      ev.targets.residents = ill.map((p) => p.id);
      for (const p of ill) {
        p.state.unwell = { ev: ev.id, from: ev.start };
        log(p, `Unwell with the bug going round: staying in ${theirOf(p.id)} room for now`);
      }
      ev.params.pauseUntil = ev.day + 1 + Math.round(ev.params.visitPauseDays); // (the next N days' visits wait; today's were already planned)
      ev.stats.unwell = ill.map((p) => p.name);
    } else if (ev.kind === 'heatwave') {
      if (!here.length) return false;
    } else if (ev.kind === 'storm' || ev.kind === 'equipment') {
      const n = ev.kind === 'storm' ? ev.params.offline : 1;
      ev.targets.facilities = shuffle((tpl.offlineFrom ?? []).filter((id) => hasPiece(id))).slice(0, n);
      ev.stats.offline = ev.targets.facilities.map((id) => facilityById(id)?.name ?? id);
    } else if (ev.kind === 'staffing') {
      const pool = team().filter((q) => !roster.isTraining(q.id) && roster.shiftOf(q.id));
      const n = Math.min(ev.params.off, Math.floor(pool.length * tpl.maxOffShare));
      if (n < 1) return false;
      const off = shuffle(pool).slice(0, n);
      for (const q of off) {
        roster.setSick(q.id, true);
        for (const t of care.tasks) if ((t.status === 'claimed' || t.status === 'working') && t.slots[0] === q.id) unclaim(t);
      }
      ev.targets.staff = off.map((q) => q.id);
      ev.stats.off = off.map((q) => q.name);
      ev.stats.agency = 0;
    } else if (ev.kind === 'transfer') {
      const p = [...here].filter((x) => !alertOf(x.id) && !x.state.fallen).sort((a, b) => (b.state.needs.clinical ?? 0) - (a.state.needs.clinical ?? 0) || a.id.localeCompare(b.id))[0];
      if (!p) return false;
      const a = raiseAlert(p, ev.params.alert, wordFor(rng, ev.params.alert), ev.start);
      noticeAlert(a, 'at once (an urgent call)');
      ev.targets.resident = p.id;
      ev.targets.alert = a.id;
      ev.stats.resident = p.name;
    }
    ev.stats.comfortLost = 0;
    ev.stats.done = 0;
    ev.stats.missed = 0;
    bus?.emit('care:incidentStart', { id: ev.id, kind: ev.kind });
    return true;
  }
  function incidentEnd(ev) {
    for (const id of ev.targets.residents) {
      const p = byResident(id);
      if (p?.state.unwell?.ev === ev.id) {
        delete p.state.unwell;
        log(p, 'Feeling better: the bug has passed');
      }
    }
    for (const id of ev.targets.staff) roster.setSick(id, false);
    if (ev.kind === 'transfer') {
      const a = cl.alerts.find((x) => x.id === ev.targets.alert);
      ev.stats.alert = a ? (a.status === 'open' ? 'still being looked after' : a.how) : null;
      ev.stats.hospital = (byResident(ev.targets.resident)?.state.away?.alert ?? null) === ev.targets.alert || !!a?.actions.some((x) => x.action === 'hospital');
    }
    ev.stats.comfortLost = Math.round((ev.stats.comfortLost ?? 0) * 10) / 10;
  }
  function incidentRespond(ev, r, by) {
    if (r.m18) {
      const a = cl.alerts.find((x) => x.id === ev.targets.alert);
      if (!a || a.status !== 'open') return { ok: true }; // (already settled: the choice is just noted)
      const res = act(a, r.m18, by === 'auto' ? 'auto' : 'player');
      return res.ok ? { ok: true } : { ok: false, reason: res.reason };
    }
    if (r.overtime) {
      const back = ev.targets.staff[ev.targets.staff.length - 1];
      if (back) {
        roster.setSick(back, false);
        ev.targets.staff = ev.targets.staff.filter((id) => id !== back);
        ev.stats.covered = crew.byId(back)?.name ?? back;
      }
      for (const q of team()) q.model.morale = clamp(q.model.morale - 3);
    }
    return { ok: true };
  }
  // Each frame while one runs: an urgent transfer follows the M18 alert (the nurse may act first).
  function incidentDuring(ev, at) {
    if (ev.kind !== 'transfer' || ev.response) return;
    const a = cl.alerts.find((x) => x.id === ev.targets.alert);
    const first = a?.actions[0];
    if (!first) return;
    const r = incidentById('transfer').responses.find((x) => x.m18 === first.action);
    ev.response = { id: r?.id ?? first.action, name: r?.name ?? ACTIONS[first.action]?.name ?? first.action, cost: 0 };
    ev.by = first.by === 'auto' ? 'nurse' : 'player';
    ev.respondedAt = at;
  }
  function reportLines(ev) {
    const S = ev.stats;
    const out = [];
    const list = (xs) => (xs.length <= 2 ? xs.join(' and ') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
    const firsts = (xs) => list((xs ?? []).map((n) => first(n)));
    if (ev.kind === 'outbreak') {
      out.push(`${firsts(S.unwell)} ${S.unwell?.length === 1 ? 'was' : 'were'} unwell; visits paused ${Math.max(0, Math.round(ev.params.visitPauseDays))} day${Math.round(ev.params.visitPauseDays) === 1 ? '' : 's'}${S.visitsPaused ? ` (${S.visitsPaused} visit${S.visitsPaused === 1 ? '' : 's'} waited)` : ''}`);
      if (S.done || S.missed) out.push(`Isolation care and cleaning: ${S.done} done${S.missed ? `, ${S.missed} missed` : ''}`);
    }
    if (ev.kind === 'heatwave' && (S.done || S.missed)) out.push(`Cool drinks: ${S.done} given${S.missed ? `, ${S.missed} missed` : ''}`);
    if (ev.kind === 'storm' || ev.kind === 'equipment') out.push(S.offline?.length ? `Out of action: ${list(S.offline)}${ev.restored ? ' (back on with the generator)' : ''}` : ev.kind === 'storm' ? 'No facility was out of action' : 'Only the lifting hoist was out');
    if (ev.kind === 'equipment') out.push('Moving and handling were slower while the hoist was out');
    if ((ev.kind === 'storm' || ev.kind === 'water') && S.meals) out.push(`${S.meals} meal${S.meals === 1 ? ' was' : 's were'} kept simple`);
    if (ev.kind === 'water') out.push('The kitchen and laundry were slowed');
    if (ev.kind === 'staffing') {
      out.push(`Off sick: ${firsts(S.off)}${S.covered ? ` (${first(S.covered)} came back to cover)` : ''}`);
      out.push(`Agency workers booked while they were off: ${S.agency ?? 0}`);
    }
    if (ev.kind === 'transfer') out.push(`${first(S.resident ?? '')}: ${S.hospital ? 'went to the hospital service (room held)' : 'looked after at home'}${S.alert ? ` · ${S.alert === 'well' ? 'settled' : S.alert === 'overdone' ? 'settled (a smaller step would have done)' : S.alert}` : ''}`);
    if (S.comfortLost) out.push(`Comfort lost across the home: about ${Math.round(S.comfortLost)} points`);
    if (ev.spent) out.push(`Spent: ${ev.spent} Credits`);
    return out;
  }
  incidents = createIncidents({
    state: ic,
    ledger,
    bus,
    seed,
    abs: absNow,
    today: () => clock.totalDays,
    month: (day) => clock.dateOf(day).month,
    hooks: {
      prepInputs,
      begin: incidentBegin,
      end: incidentEnd,
      respond: incidentRespond,
      during: incidentDuring,
      reportLines,
      need: (key) => (key === 'nurseOnShift' ? nursesOn().length > 0 : key === 'teamOf2' ? team().length >= 2 : false),
      cost: (kind) => (kind === 'hospital' ? HOSPITAL.fee : kind === 'clinician' ? clinicianFee() : 0),
      log: (text) => bus?.emit('care:incidentLog', { text }),
    },
  });
  // A response chosen mid-band: its extra tasks start now (not at the next band).
  const respondNow = incidents.respond;
  incidents.respond = (id, by = 'player') => {
    const r = respondNow(id, by);
    if (r.ok) planIncidentTasks(bandInstance(hourNow(), clock.totalDays), absNow());
    return r;
  };
  // The extra care a response runs: isolation care and cleaning for those unwell; a cool drink for everyone.
  function planIncidentTasks(inst, at) {
    const ev = evNow();
    const r = responseOf(ev);
    if (!r?.tasks) return;
    const add = (p, def, key, place = 'resident') => {
      const h = def.at[inst.band.id];
      if (h == null) return;
      const due = bandEnd(inst.band, inst.day);
      if (due <= at || care.tasks.some((t) => t.source === 'incident' && t.key === key)) return;
      addTask(care, { resident: p.id, day: inst.day, band: inst.band.id, type: def.type, essential: false, name: def.name, source: 'incident', key, incident: ev.id, task: def === INCIDENT_TASKS.coolDrink ? 'coolDrink' : def === INCIDENT_TASKS.cleaning ? 'cleaning' : 'isolation', place, roles: [...def.roles], minutes: def.minutes, drops: { ...(def.drops ?? {}) }, outcomes: {}, opens: Math.max(at, absHour(inst.day, h)), due, at: h });
    };
    if (ev.kind === 'outbreak') {
      for (const id of ev.targets.residents) {
        const p = byResident(id);
        if (!p || !inCare(p) || !p.state.unwell) continue;
        add(p, INCIDENT_TASKS.isolation, `${ev.id}:iso:${p.id}:${inst.key}`);
        add(p, INCIDENT_TASKS.cleaning, `${ev.id}:clean:${p.id}:${inst.key}`, 'room');
      }
    }
    if (ev.kind === 'heatwave') for (const p of seated()) if (inCare(p) && !p.state.away) add(p, INCIDENT_TASKS.coolDrink, `${ev.id}:drink:${p.id}:${inst.key}`);
  }
  function incidentTaskDone(p, t, helper) {
    const ev = evNow();
    if (ev?.id === t.incident) ev.stats.done = (ev.stats.done ?? 0) + 1;
    if (t.task === 'isolation') p.state.outcomes.comfort = clamp(p.state.outcomes.comfort + INCIDENT_TASKS.isolation.comfort);
    log(p, `${t.name} (with ${helperName(helper)})`);
  }
  function incidentTaskMissed(t) {
    const ev = evNow();
    const p = byResident(t.resident);
    if (!ev || ev.id !== t.incident || !p) return;
    ev.stats.missed = (ev.stats.missed ?? 0) + 1;
    if (t.task === 'coolDrink') {
      const loss = -ev.params.missed * ev.mult;
      p.state.outcomes.comfort = clamp(p.state.outcomes.comfort + loss);
      ev.stats.comfortLost = (ev.stats.comfortLost ?? 0) - loss;
    }
  }
  // While one runs, an hour's Comfort: those unwell in an outbreak; everyone awake in the daytime in a heatwave.
  function incidentHour(p, hours) {
    const ev = evNow();
    if (!ev || p.state.leaving || p.state.guest) return;
    let rate = 0;
    if (ev.kind === 'outbreak' && p.state.unwell?.ev === ev.id) rate = ev.params.comfortPerHour;
    else if (ev.kind === 'heatwave' && !world.isAsleep(p)) {
      const h = hourNow();
      if (h >= INCIDENT_TASKS.heatHours[0] && h < INCIDENT_TASKS.heatHours[1]) rate = ev.params.comfortPerHour;
    }
    if (!rate) return;
    const loss = rate * ev.mult * hours;
    const before = p.state.outcomes.comfort;
    p.state.outcomes.comfort = clamp(before + loss);
    ev.stats.comfortLost = (ev.stats.comfortLost ?? 0) + (before - p.state.outcomes.comfort);
  }
  // --- falls (Milestone 25: the Milestone 16 falls risk now produces occasional falls) ---
  const fallResting = (p) => !!p.state.fallRest && clock.totalDays < p.state.fallRest.until;
  // At a waking band's start: a seeded chance of a fall at a seeded time inside it.
  function planFalls(p, inst, at) {
    const st = p.state;
    if (!FALLS_INCIDENT.bands.includes(inst.band.id) || st.fallAt != null || st.fallen || fallResting(p) || st.away || !st.falls) return;
    const rng = new Rng(`${seed}:fall:${p.id}:${inst.key}`);
    if (rng.next() >= (fallChance(st.falls.risk) / FALLS_INCIDENT.bands.length) * fallsMult) return;
    const from = Math.max(at, absHour(inst.day, inst.band.from));
    const to = bandEnd(inst.band, inst.day) - 0.5;
    st.fallAt = from + rng.next() * Math.max(0, to - from);
  }
  function tickFalls(at) {
    for (const p of seated()) {
      const st = p.state;
      if (st.fallAt == null || at < st.fallAt) continue;
      delete st.fallAt;
      if (inCare(p) && !st.away && !st.fallen && !world.isAsleep(p)) fall(p);
    }
  }
  function fall(p, severity = null) {
    const st = p.state;
    const F = FALLS_INCIDENT;
    const risk = st.falls?.risk ?? 0;
    const sev = severity ?? (risk >= F.moderateFrom && new Rng(`${seed}:fallSev:${p.id}:${clock.totalDays}`).next() < F.moderateChance ? 'moderate' : 'minor');
    if (st.memory?.walk) endWalk(p, 'step', null, true);
    // (they stay where they are until someone comes)
    p.agent.path = [];
    p.agent.goal = null;
    p.agent._onArrive = null;
    p.agent.setState('idle');
    const inst = bandInstance(hourNow(), clock.totalDays);
    const t = addTask(care, { resident: p.id, day: inst.day, band: inst.band.id, type: 'personal', essential: false, urgency: 5, urgent: true, name: F.help.name, source: 'fall', place: 'resident', roles: [...F.help.roles], minutes: F.help.minutes, drops: {}, outcomes: {}, opens: absNow(), due: absNow() + F.help.dueHours });
    const rec = { id: `f${(ic.fallCount ?? 0) + 1}`, day: clock.totalDays, at: absNow(), resident: p.id, name: p.name, risk, band: st.falls?.band ?? null, severity: sev, task: t.id, helpedAt: null, helper: null, alert: null, restUntil: clock.totalDays + F.rest[sev], well: null };
    incidents.noteFall(rec);
    st.fallen = { at: absNow(), severity: sev, rec: rec.id };
    st.fallRest = { until: rec.restUntil, rec: rec.id };
    const d = F.dips[sev];
    if (st.mobility) st.mobility.level = clamp(st.mobility.level + d.mobility);
    st.outcomes.mood = clamp(st.outcomes.mood + d.mood);
    st.outcomes.safety = clamp(st.outcomes.safety + d.safety);
    if (st.rehab?.goals && st.rehab.goals.confidence != null) st.rehab.goals.confidence = clamp(st.rehab.goals.confidence + F.rehabConfidence[sev]);
    st.review = { ...(st.review ?? { day: null, needs: null, reasons: [] }), fall: clock.totalDays }; // (the plan is flagged for review)
    log(p, `Had a fall (${sev === 'moderate' ? 'a harder one' : 'a small one'}): help is on the way`);
    trust(p, F.trust.told, `Told about ${theirOf(p.id)} fall straight away`, 'fall');
    updateFalls(p);
    bus?.emit('care:fall', { resident: p.id, name: p.name, severity: sev });
    return rec;
  }
  const fallRec = (p) => ic.falls.find((f) => f.id === p.state.fallen?.rec || f.id === p.state.fallRest?.rec) ?? null;
  function upAgain(p) {
    p.state.fallen = null;
    const s = p.state.step;
    if (s && (s.status === 'walking' || s.status === 'waiting') && !s.arthurThere) {
      const step = dayStep(p, s.id, s.day);
      if (step) walkResident(p, step, s.day);
    }
  }
  // Helped up: the nurse checks them (an M18 alert, "had a fall", noticed at once — the six high-level choices).
  function fallHelped(p, t, q) {
    const rec = fallRec(p);
    const mins = rec ? Math.round((absNow() - rec.at) * 60) : 0;
    upAgain(p);
    const a = raiseAlert(p, rec?.severity ?? 'minor', FALLS_INCIDENT.word, absNow());
    noticeAlert(a, `when ${helperName(q.id)} helped ${themOf(p)} up`);
    if (rec) Object.assign(rec, { helpedAt: absNow(), helper: q.id, alert: a.id, minutes: mins });
    log(p, `Helped up after the fall by ${helperName(q.id)} (${mins} min): resting for a few days`);
  }
  // Nobody came in time (or nobody was on shift): they got up on their own, slowly; the nurse still checks them.
  function fallOver(t, status) {
    const p = byResident(t.resident);
    if (!p?.state.fallen || status === 'away' || status === 'gone') return;
    const rec = fallRec(p);
    upAgain(p);
    const a = raiseAlert(p, rec?.severity ?? 'minor', FALLS_INCIDENT.word, absNow());
    noticeAlert(a, 'after the fall');
    if (rec) rec.alert = a.id;
    log(p, 'Got up after the fall on their own: nobody came in time');
  }
  // A new day: anyone whose rest is over — handled well (help came quickly and the alert has settled) gives the family's
  // Trust back.
  function fallsDay(day) {
    for (const p of seated()) {
      const fr = p.state.fallRest;
      if (!fr || day < fr.until) continue;
      delete p.state.fallRest;
      const rec = ic.falls.find((f) => f.id === fr.rec);
      if (!rec || rec.well != null) continue;
      const a = cl.alerts.find((x) => x.id === rec.alert);
      rec.well = rec.helpedAt != null && rec.helpedAt - rec.at <= FALLS_INCIDENT.helpWithinHours && !!a && a.status !== 'open';
      log(p, rec.well ? 'Back on ' + theirOf(p.id) + ' feet after the fall' : 'Rest after the fall is over');
      if (rec.well) trust(p, FALLS_INCIDENT.trust.handledWell, `Looked after well after ${theirOf(p.id)} fall`, 'fall');
    }
  }
  // world.incidents extras: what is out of action now, a fall now (tests and ?debug=1), the tests' falls multiplier.
  incidents.offlineNow = () => (evNow()?.restored ? [] : (evNow()?.targets.facilities ?? []));
  incidents.visitsPaused = () => visitsPaused(clock.totalDays);
  incidents.fallNow = (residentId, severity = null) => {
    const p = byResident(residentId);
    if (!p || !inCare(p) || p.state.away || p.state.fallen) return { ok: false, reason: 'They can’t fall right now' };
    return { ok: true, rec: fall(p, severity) };
  };
  incidents.setFallsMultForTests = (m) => (fallsMult = m);
  // (tests only: an older milestone's own measurement — no random events and no falls; never saved, never in the game)
  incidents.offForTests = () => {
    incidents.setQuietForTests(true);
    fallsMult = 0;
  };
  incidents.fallsThisMonth = () => ic.falls.filter((f) => f.day >= monthRange().fromDay).length;
  function moveOuts(day) {
    const M = MOVE_OUT;
    for (const p of seated()) {
      if (!joined(p)) continue;
      const st = p.state;
      st.lowMood = st.outcomes.mood < M.moodBelow ? (st.lowMood ?? 0) + 1 : 0;
      if (day % 7 !== 0 || st.lowMood < M.days) continue;
      const rec = familyOf(p);
      if (!rec?.contact || rec.trust >= M.trustBelow) continue;
      if (new Rng(`${seed}:moveOut:${p.id}:${day}`).next() >= M.weeklyChance) continue;
      startLeaving(p, { movedOut: true });
      bus?.emit('care:movedOut', { resident: p.id, name: p.name });
    }
  }
  // A good month (both lines met over the month's last days): Clinical Safety and the residents' average Mood.
  function monthRp(label) {
    const M = RP_INCOME.month;
    const here = residents.filter((p) => !p.state.leaving && !p.state.guest);
    if (!here.length) return 0;
    const clin = clinicalScore(cl, clock.totalDays).score;
    const mood = here.reduce((a, p) => a + p.state.outcomes.mood, 0) / here.length;
    if (clin < M.clinical || mood < M.mood) return 0;
    return research.addRp(M.rp, `A good month of care (${label})`, 'month');
  }
  // --- Milestone 27: end of life and the Memory Book ------------------------------------------------------------------
  // (src/systems/endOfLife.js, data/endOfLife.js) Slow, forecast care stages for residents living here for good; the
  // comfort-first plan offered (never forced); the comfort score of the end-of-life period; the memorial moment and the
  // Memory Book page. Nothing here takes a score, Credits or Rank away: a passing is never a failure, and only good care
  // changes the pace (it slows it).
  let eolPaceMult = 1; // (tests and ?debug=1 only: × the weekly chance; never saved)
  const yearDays = () => clock.daysPerMonth * clock.monthsPerYear;
  const yearsHere = (p) => Math.floor((clock.totalDays - (p.state.admittedDay ?? 0)) / yearDays());
  const roomDefOf = (p) => roomList().find((r) => r.id === p.state.room)?.defId ?? null;
  // A good day of care (it slows a stage): Comfort and Mood high enough, and none of their essential care missed.
  function goodCareDay(p, day) {
    const o = p.state.outcomes;
    if (o.comfort < GOOD_CARE.comfort || o.mood < GOOD_CARE.mood) return false;
    return !care.tasks.some((t) => t.resident === p.id && t.day === day && t.essential && t.status === 'missed');
  }
  // A story moment for the Memory Book (their birthday tea, cheering a friend home, a community event joined).
  function addMoment(p, kind, x = {}) {
    if (!p || p.state.guest) return;
    const m = (p.state.moments ??= []);
    m.push({ day: clock.totalDays, kind, ...x });
    if (m.length > BOOK.momentsKept) m.splice(0, m.length - BOOK.momentsKept);
  }
  // A stage starts: its seeded length, the Inbox line, the family told, the card's forecast line.
  function enterStage(p, stage) {
    const e = eolOf(p);
    e.n = (e.n ?? 0) + 1;
    e.stage = stage;
    e.since = clock.totalDays;
    e.slow = 0;
    const len = stageLength(stage, seed, p.id, e.n);
    e.due = len == null ? null : clock.totalDays + len;
    if (EOL_STAGES.includes(stage)) e.acc ??= newAcc(clock.totalDays);
    if (stage === 'approaching') e.offer = DOMAINS.every((d) => !EOL_PLAN_IDS.includes(p.state.plan?.[d.id])) ? 'open' : null;
    if (stage === 'final') {
      // never two passings in the same week: the final days wait for the gap after the last passing
      const last = Math.max(-Infinity, ...eol.passings.map((x) => x.day));
      e.due = Math.max(e.due, last + PACE.passingGapDays);
      const r = new Rng(`${seed}:eolHour:${p.id}:${e.n}`);
      e.passAt = absHour(e.due, PACE.hours[0] + r.next() * (PACE.hours[1] - PACE.hours[0]));
    }
    const s = stageById(stage);
    const rec = familyOf(p);
    if (rec?.contact && s.family) {
      rec.told = [...(rec.told ?? []), { day: clock.totalDays, text: s.family(first(p.name)) }].slice(-6);
      e.told.push({ day: clock.totalDays, stage });
      if (e.acc) e.acc.told = true;
    }
    if (s.inbox) {
      eol.notes.push({ uid: eol.nextNote++, day: clock.totalDays, resident: p.id, name: p.name, stage, text: s.inbox(first(p.name)), seen: false });
      if (eol.notes.length > 30) eol.notes.shift();
    }
    log(p, s.line);
    bus?.emit('care:stage', { resident: p.id, name: p.name, stage, stageName: s.name, offer: e.offer === 'open', line: s.inbox?.(first(p.name)) ?? null });
  }
  // One end-of-life day into the comfort record (yesterday's tasks, plan, family, familiar faces, wishes, staffing).
  function eolAccumulate(p, day) {
    const e = eolOf(p);
    const a = (e.acc ??= newAcc(day));
    a.days += 1;
    const tasks = care.tasks.filter((t) => t.resident === p.id && t.day === day);
    a.tasksDone += tasks.filter((t) => t.status === 'done').length;
    a.tasksMissed += tasks.filter((t) => t.status === 'missed').length;
    const plan = p.state.plan ?? {};
    a.plan += (plan.CL === 'CL08' ? COMFORT.plan.CL08 : 0) + (plan.EN === 'EN08' ? COMFORT.plan.EN08 : 0);
    const rec = familyOf(p);
    if (!rec?.contact) a.noFamily = true;
    else if ((rec.lastVisit != null && rec.lastVisit >= a.from) || hasPiece('F24')) a.close = true;
    const ids = team().filter((q) => roster.shiftOf(q.id)).map((q) => q.id);
    const familiar = ids.some((id) => familiarityOf(care, p.id, id) >= COMFORT.familiarAt);
    if (familiar) a.familiar += 1;
    // their wishes: something they enjoy (company, a visit, a session joined), who they want near, the place
    const joy = tasks.some((t) => t.status === 'done' && (t.optionId === 'CL08' || t.domain === 'SO' || t.type === 'visit')) || Object.keys(TIMETABLE.slots).some((slot) => acts.session(day, slot)?.joined?.includes(p.id)) || rec?.lastVisit === day;
    const friendHere = topFriends(care, p.id, seated().map((q) => q.id), 3).some((r) => r.friendship >= FRIENDSHIP.friendAt);
    const near = rec?.contact ? (rec.lastVisit != null && rec.lastVisit >= a.from) || !!eolOf(p).acc?.meeting : friendHere || familiar;
    const place = wishesOf(p.def).find((w) => w.id === 'place');
    const placeOk = !place.garden || hasPiece(EOL_GARDEN) || roomDefOf(p) === 'RM07';
    a.wishes += ((joy ? 1 : 0) + (near ? 1 : 0) + (placeOk ? 1 : 0)) / 3;
    const recs = staffState.coverage.history.filter((h) => h.day === day);
    a.coverage += recs.length ? recs.filter((h) => h.safe).length / recs.length : SHIFT_IDS.filter((sid) => team().some((q) => roster.shiftOf(q.id)?.id === sid)).length / SHIFT_IDS.length; // (no coverage records: shifts with anyone on them)
  }
  // The boosts on the comfort score: CLN5, the F24 lounge (× its level), their own Palliative Suite, PRG10 in their wing,
  // the F32 hub.
  function comfortBoosts(p) {
    const B = COMFORT.boosts;
    let b = rb('comfortScore'); // (CLN5 Palliative Practice: research)
    if (hasPiece('F24')) b += B.F24 * lvOf('F24');
    if (roomDefOf(p) === 'RM07') b += B.RM07;
    if (programOn('PRG10', p)) b += programById('PRG10').effects.comfortScore ?? B.PRG10;
    if (hasPiece('F32')) b += B.F32;
    return Math.round(b * 10) / 10;
  }
  const comfortNow = (p) => comfortOf(eolOf(p).acc ?? newAcc(clock.totalDays), comfortBoosts(p));
  // Each midnight: the weekly check for Settled residents, stages under way (good care slows them; one at a time into
  // the final days), yesterday into the comfort record, grief easing, held rooms opening.
  function eolDay(day) {
    for (const [room, until] of Object.entries(eol.held)) if (until <= day) delete eol.held[room];
    for (const [id, left] of Object.entries(eol.grief.staff)) {
      const back = Math.min(left, MEMORIAL.staffRecover * (hasPiece(MEMORIAL.staffRoom) ? MEMORIAL.staffRoomMult : 1));
      const q = crew.byId(id);
      if (q && !q.leftTeam) q.model.morale = clamp(q.model.morale + back);
      if (left - back <= 0.001) delete eol.grief.staff[id];
      else eol.grief.staff[id] = left - back;
    }
    for (const p of seated()) {
      const st = p.state;
      if (st.grief > 0) st.grief = Math.max(0, st.grief - MEMORIAL.friendRecover); // (their Mood drifts back on its own)
      const e = eolOf(p);
      if (e.stage === 'settled') {
        if (day % PACE.checkEvery !== 0 || !joined(p) || !eolEligible(p.def, st) || st.away) continue;
        const chance = weeklyChance({ age: p.def.age, years: yearsHere(p), level: levelOf(p), good: goodCareDay(p, day - 1) }) * eolPaceMult;
        if (new Rng(`${seed}:eolWeek:${p.id}:${day}`).next() < chance) enterStage(p, 'more');
        continue;
      }
      if (EOL_STAGES.includes(e.stage)) eolAccumulate(p, day - 1);
      const s = stageById(e.stage);
      if (e.stage !== 'final' && goodCareDay(p, day - 1) && e.slow < s.slowMax) e.slow = Math.min(s.slowMax, e.slow + PACE.slowPerDay);
      if (e.stage === 'final' || e.due == null || day < e.due + Math.floor(e.slow)) continue;
      const next = nextStage(e.stage);
      // one resident in the final days at a time: anyone else waits a day
      if (next === 'final' && seated().some((q) => q !== p && stageOf(q) === 'final')) continue;
      enterStage(p, next);
    }
  }
  // Each frame: a resident in the final days passes peacefully at the quiet hour planned (later if they are away).
  function eolTick() {
    for (const p of [...residents]) {
      const e = p.state.eol;
      if (!e || e.stage !== 'final' || e.passAt == null || p.state.leaving || p.state.guest) continue;
      if (absNow() < e.passAt) continue;
      if (p.state.away || p.state.fallen) {
        e.passAt = absNow() + 2;
        continue;
      }
      passPeacefully(p);
    }
  }
  // Who was beside them: their family when they stayed close (a visit in the final days, or the palliative meeting),
  // else the familiar face on shift.
  function besideOf(p) {
    const rec = familyOf(p);
    const e = eolOf(p);
    const finalFrom = e.since ?? clock.totalDays;
    if (rec?.contact && ((rec.lastVisit != null && rec.lastVisit >= finalFrom) || e.acc?.meeting || hasPiece('F24'))) return `${theirOf(p.id)} ${rec.contact.relation.toLowerCase()} ${rec.contact.name}`;
    const on = team().filter((q) => roster.onShift(q.id));
    const f = topFamiliar(care, { residentId: p.id }, on.map((q) => q.id), 1)[0];
    return f ? helperName(f.staff) : null;
  }
  // The Memory Book page: name, portrait, time at the home, favourite interest, friendships, story moments, the staff
  // they knew best (plain text only, so the account copy never needs this campaign).
  function memoryPage(p, result, beside) {
    const st = p.state;
    const day = clock.totalDays;
    const from = st.admittedDay ?? 0;
    const date = (d) => {
      const x = clock.dateOf(d);
      return `Month ${x.month}, Year ${x.year}`;
    };
    const friends = topFriends(care, p.id, null, BOOK.friendsShown).filter((r) => r.friendship >= FRIENDSHIP.friendAt).map((r) => residentById(r.other)?.name ?? r.other);
    const staffIds = topFamiliar(care, { residentId: p.id }, null, BOOK.staffShown).map((r) => r.staff);
    const staff = staffIds.map((id) => crew.byId(id)?.name ?? staffById(id)?.name ?? id);
    const moments = [{ day: from, text: BOOK.moments.moved() }, ...(st.moments ?? []).map((m) => ({ day: m.day, text: BOOK.moments[m.kind]?.(m) ?? m.kind }))].map((m) => ({ when: date(m.day), text: m.text }));
    const t = timeAt(day - from, clock.daysPerMonth, clock.monthsPerYear);
    return {
      id: `${seed}:${p.id}:${day}`,
      resident: p.id,
      name: p.name,
      art: p.def.art,
      pronoun: p.def.pronoun ?? null,
      age: p.def.age ?? null,
      arrived: date(from),
      passed: date(day),
      years: t.years,
      months: t.months,
      time: t.text,
      interest: p.def.interest ?? null,
      friends,
      moments,
      staff,
      beside,
      comfort: result.score,
    };
  }
  // The passing: the comfort score of the end-of-life period (the good-care signal, the family's last Trust result, or a
  // gentle note), the memorial (friends' and staff's small dips that recover), the Memory Book page, the room held a few
  // days. No Credits, score or Rank is taken: the passing itself is never scored.
  function passPeacefully(p) {
    const st = p.state;
    const e = eolOf(p);
    const day = clock.totalDays;
    if (e.acc && e.acc.days === 0) eolAccumulate(p, day); // (a test passing on the first day: today so far)
    for (const t of care.tasks) if (t.resident === p.id && isOpen(t)) finish(t, 'gone');
    const res = comfortOf(e.acc ?? newAcc(day), comfortBoosts(p));
    const lift = signalLift(res.score);
    if (lift > 0) eol.lifts.push({ from: day, until: day + SIGNAL.days, lift });
    if (eol.lifts.length > 20) eol.lifts.shift();
    const rec = familyOf(p);
    const famLift = rec?.contact ? familyResult(res.score) : 0;
    if (famLift > 0) trust(p, famLift, `Thank you for caring for ${callOf(rec.contact, p.def)} so well at the end`, 'endOfLife');
    const good = res.score >= COMFORT.good;
    const poor = res.score < COMFORT.poor;
    const note = poor ? betterNote(res.parts) : null;
    const beside = besideOf(p);
    // the memorial: friends and staff who knew them
    const friends = [];
    for (const q of seated()) {
      if (q === p || !areFriends(care, p.id, q.id)) continue;
      const before = q.state.outcomes.mood;
      q.state.outcomes.mood = clamp(before - MEMORIAL.friendMood);
      q.state.grief = (q.state.grief ?? 0) + (before - q.state.outcomes.mood);
      log(q, `Remembering ${first(p.name)}`);
      friends.push(q.name);
    }
    const staff = [];
    for (const q of team()) {
      if (familiarityOf(care, p.id, q.id) < MEMORIAL.knewAt) continue;
      const before = q.model.morale;
      q.model.morale = clamp(before - MEMORIAL.staffMorale);
      eol.grief.staff[q.id] = (eol.grief.staff[q.id] ?? 0) + (before - q.model.morale);
      staff.push(q.name);
    }
    const page = memoryPage(p, res, beside);
    eol.pages.push(page);
    eol.results.push({ day, resident: p.id, name: p.name, score: res.score, base: res.base, boosts: res.boosts, parts: res.parts, good, poor, note, lift, family: famLift, beside });
    if (eol.results.length > 40) eol.results.shift();
    eol.passings.push({ day, resident: p.id, name: p.name });
    const room = st.room;
    if (room) eol.held[room] = day + MEMORIAL.heldDays;
    admissions.passed({ id: p.id, name: p.name, level: levelOf(p), nursing: nursingOf(p), moodAvg: moodAvgOf(p), room: roomDefOf(p), admittedDay: st.admittedDay ?? 0, leftDay: day, stay: st.stay?.type ?? p.def.stay });
    noteLeft(care, { residentId: p.id }, day);
    const card = MEMORIAL.card({ name: p.name, beside, them: theirOf(p.id) === 'her' ? 'her' : 'him' });
    addLog(st, logDay(st), now(), card);
    // the Inbox line: the card, and how the time went (a gentle note where it could have been better — never a penalty)
    const how = good ? ` A well-supported time (comfort ${res.score}).` : note ? ` Comfort ${res.score}. What could have been better: ${note}.` : ` Comfort ${res.score}.`;
    eol.notes.push({ uid: eol.nextNote++, day, resident: p.id, name: p.name, stage: 'passed', text: `${card}${how}`, seen: false });
    if (eol.notes.length > 30) eol.notes.shift();
    st.passed = day;
    st.leaving = true;
    st.step = null;
    delete st.joinAt;
    removeResident(p);
    bus?.emit('care:passed', { resident: p.id, name: p.name, art: p.def.art, room, card, line: `${card}${how}`, beside, friends, staff, page, score: res.score, good, poor, note, lift });
  }
  const EOL_PLAN_IDS = Object.values(EOL_PLAN.options);
  const EOL_GARDEN = WISHES.gardenFacility;

  // --- Milestone 28: the event director ------------------------------------------------------------------------------
  // (src/systems/events.js, data/events.js) One calm place for every moment: its Inbox line, a beat when the caps allow, and
  // one choice at a time. A choice's own system still settles it (answered, or its own default when its time runs out);
  // the director only reads whether it has.
  care.events = ensureEventsState(care.events, clock.totalDays); // (an M27 save: an empty queue; its systems' Inbox items kept)
  function choiceSettled(c) {
    if (!c) return true;
    switch (c.kind) {
      case 'incident': {
        const a = incidents.active;
        return !a || a.id !== c.id || !!a.response;
      }
      case 'notice':
        return !acts.notices().some((n) => n.uid === c.id);
      case 'request':
        return !fh.requests.some((q) => q.id === c.id && q.status === 'open');
      case 'ask':
        return !fh.asks.some((a) => a.id === c.id);
      case 'partner':
        return !partners.offers().some((o) => o.def.id === c.id);
      case 'economy':
        return !economy.offers().some((o) => o.kind === c.id);
      case 'comfort': {
        const p = byResident(c.id);
        return !p || eolOf(p).offer !== 'open';
      }
      default:
        return true;
    }
  }
  director = createEvents({ state: care.events, seed, now: () => absNow(), today: () => clock.totalDays, resolved: choiceSettled, onMoment: (id, kind, text) => addMoment(byResident(id), kind, { text }) });
  // Each midnight: what the new categories read (life stories and who knows them, friendships, the team, yesterday's
  // essential care, the plans due for review).
  function eventsDay(day) {
    const here = seated().filter((p) => joined(p));
    const ids = team().map((q) => q.id);
    const friends = [];
    for (const r of Object.values(care.friendships ?? {})) {
      if (r.friendship < FRIENDSHIP.friendAt) continue;
      const a = byResident(r.a);
      const b = byResident(r.b);
      if (!a || !b || a.state.guest || b.state.guest) continue;
      friends.push({ a: a.id, b: b.id, aName: a.name, bName: b.name, aFirst: first(a.name), bFirst: first(b.name) });
    }
    const firstLook = !care.events.seen.primed;
    care.events.seen.primed = true;
    director.daily(day, {
      residents: here.map((p) => ({ id: p.id, first: first(p.name), story: p.def.story ?? null, tags: p.state.tags?.length ? p.state.tags : p.def.tags ?? [], familiar: ids.filter((id) => familiarityOf(care, p.id, id) >= 40).map((id) => ({ id, first: first(crew.byId(id)?.name ?? id) })) })),
      friends,
      firstLook,
      team: team().map((q) => ({ id: q.id, first: first(q.name) })),
      yearDays: clock.daysPerMonth * clock.monthsPerYear,
      missed: care.tasks.some((t) => t.day === day - 1 && t.essential && t.status === 'missed'),
      residentsHere: here.length,
      stale: here.filter((p) => staleReasons(p.state, day).length).map((p) => first(p.name)),
    });
  }

  // --- quality inputs (Milestone 26) ------------------------------------------------------------------------------------
  // One day's snapshot of what really happened, for the five headline scores, inspections and accreditations
  // (src/systems/quality.js turns the counts into readings). Every number is read from game state the earlier milestones
  // already keep; none can be set by the player except by running the home.
  // Milestone 27: natural decline is never a failure — residents in the end-of-life stages are judged by their comfort
  // score (the good-care signal below), not by the Wellbeing averages; friends' and staff's grief after a passing is read
  // past; a family stays in Family Trust for a month after a passing, and so do the days lived here in the falls rate.
  function qualityInputs(day) {
    const all = seated();
    const here = all.filter((p) => !inEol(p));
    const n = here.length;
    const mean = (f) => (n ? here.reduce((t, p) => t + f(p), 0) / n : null);
    const recent = eol.passings.filter((x) => x.day > day - SIGNAL.days && x.day <= day + 1).map((x) => x.resident);
    const lift = Math.min(SIGNAL.max, eol.lifts.filter((l) => l.from <= day + 1 && day < l.until).reduce((t, l) => t + l.lift, 0));
    const tasks = care.tasks.filter((t) => t.day === day && t.essential);
    const crewNow = team();
    const crewMean = (f) => (crewNow.length ? crewNow.reduce((t, q) => t + f(q), 0) / crewNow.length : null);
    const recs = staffState.coverage.history.filter((h) => h.day === day);
    const prep = incidents.prep();
    const training = prep.parts.find((x) => x.key === 'training');
    const env = environmentNow();
    const trainedOn = care.quality.trainedOn;
    const recently = (q) => (trainedOn[q.id] != null && day - trainedOn[q.id] <= READINGS.trainedDays) || (staffing.specialtiesOf(q.id) ?? []).length > 0;
    const programDays = {};
    for (const [id, run] of Object.entries(progState.running ?? {})) programDays[id] = Math.max(0, day + 1 - (run.since ?? day + 1));
    return {
      residents: all.length + recent.length,
      clinical: clinicalScore(cl, day).score,
      essential: { done: tasks.filter((t) => t.status === 'done').length, missed: tasks.filter((t) => t.status === 'missed').length },
      falls28: (ic?.falls ?? []).filter((f) => f.day > day - 28 && f.day <= day).length,
      infection: training ? (100 * training.value) / training.max : 0,
      mood: mean((p) => Math.min(100, p.state.outcomes.mood + (p.state.grief ?? 0))),
      comfort: mean((p) => p.state.outcomes.comfort),
      independence: mean((p) => p.state.outcomes.independence),
      connection: mean((p) => p.state.outcomes.connection),
      choice: n ? here.filter((p) => day - (p.state.lastLikedDay ?? day) < OUTCOME.noLikedDays).length / n : null,
      trust: homeTrust(care.families, [...all.map((p) => p.id), ...recent]),
      overdue: fh.complaints.filter((c) => c.status === 'open' && day > c.due).length,
      compliments: fh.compliments.filter((k) => k.day > day - READINGS.complimentDays && k.day <= day).length,
      morale: crewMean((q) => Math.min(100, q.model.morale + (eol.grief.staff[q.id] ?? 0))),
      energy: crewMean((q) => q.model.energy),
      shifts: { safe: recs.filter((h) => h.safe).length, total: recs.length },
      trained: crewNow.length ? crewNow.filter(recently).length / crewNow.length : 0,
      continuity: n ? here.filter((p) => crewNow.some((q) => inGroup(q.id, p.id))).length / n : 0,
      rooms: env.room,
      clean: env.clean,
      preparedness: prep.score,
      plansCurrent: n ? here.filter((p) => !staleReasons(p.state, day).length).length / n : 1,
      nutrition: nutritionOutcome(),
      unsafe: recs.filter((h) => h.steps.includes('unsafe')).length,
      community: !!acts.state.bookings[day] && !!acts.session(day, 'afternoon'),
      rehabDischarges: care.rewards?.discharges?.length ?? 0,
      programDays,
      incidentsEnded: (ic?.history ?? []).filter((h) => Math.floor(h.end / 24) === day).length,
      lifts: lift > 0 ? Object.fromEntries(SIGNAL.scores.map((id) => [id, lift])) : null, // (Milestone 27: the good-care signal)
    };
  }
  // A new home, or an older (M25c) save: the window filled from the home as it is now, and a rank floor that keeps what
  // the save already has — the rank its stage needs, Level II / III pieces (Rank D / C), the M23 debug partner rank.
  function startQuality() {
    const floors = [care.partners?.debugRank ?? null];
    if (layout.stage > 1) floors.push(STAGES[layout.stage - 1].unlock.value);
    const top = Math.max(1, ...layout.pieces.map((pc) => layout.levelOf(pc.uid) ?? 1));
    if (top >= 2) floors.push(LEVELS.rank[top - 1]);
    for (const r of floors.filter(Boolean)) quality.setRankForTests(r);
    quality.prime(qualityInputs(clock.totalDays - 1));
  }
  // --- recruitment and training (Milestone 11) -------------------------------------------------------------------------
  // The home's Rank (Milestone 26: the real one, from world.quality; the Node tests set it with world.setRankForTests).
  function rankNow() {
    return quality.rank;
  }
  staffing = createStaffing({ state: staffState, sys, ledger, seed, bus, today: () => clock.totalDays, year: () => clock.year, teamSize: () => crew.people.filter((q) => !q.agency && !q.leftTeam).length, trainingPlaces: () => layout.ofDef('F11').length * TRAINING.placesPerRoom, rank: () => rankNow(), hasFacility: (defId) => layout.ofDef(defId).length > 0, trainingPct: () => pp('trainingDaysPct'), score: (id) => quality.scores()[id] ?? null, clue: () => quality.has('eliteClue') }); // (Milestone 23; Milestone 26: the real Rank and §5 scores)
  staffing.onTrained((s, c, gains, specialty) => {
    roster.setTraining(s.id, false);
    care.quality.trainedOn[s.id] = clock.totalDays; // (Milestone 26: Staff Wellbeing reads who trained lately)
    partners?.record('staffTrained', { staff: s.id, course: c.id }); // (Milestone 23)
    // (Milestone 25c: a great training effort — gains at least 80% of the most the course could give — may bring an item)
    const most = Object.values(COURSES.find((x) => x.id === c.id)?.gains ?? {}).reduce((t, [, mx]) => t + mx, 0);
    const got = Object.values(gains ?? {}).reduce((t, v) => t + v, 0);
    if (most && got / most >= ITEM_SOURCES.training.minShare) items.rollSource('training', { why: `${s.name} on ${c.name}` });
    bus?.emit('staff:trained', { id: s.id, name: s.name, course: c.name, gains, specialty });
  });
  const inHome = () => new Set(residents.map((p) => p.id));
  // Milestone 25c: care equipment (src/systems/items.js) — kept with the staff state
  staffState.items ??= newItemsState();
  const seasonKey = () => `Y${clock.year}S${Math.floor((clock.month - 1) / ITEM_RULES_SEASON)}`;
  const items = createItems({ state: staffState.items, seed, bus, person: (id) => { const q = crew.byId(id); return q && !q.agency && !q.leftTeam ? q : null; }, pay: (amount, reason, category) => ledger.economy.add('credits', amount, reason, category), today: () => clock.totalDays, season: seasonKey });
  const freeRooms = () => roomList().filter((r) => !r.residentId && !(eol.held[r.id] > clock.totalDays)); // (Milestone 27: a room held for a few days after a passing)
  // Milestone 10: the free rooms a resident may have, best first — one of the template they need (Memory Support,
  // High-Care), else a general room, the kind they would like first.
  // Milestone 24: memory / rehab / high-care residents prefer a free room in their wing; everyone else one in the Home wing
  // (the kind they would like still first within each).
  function roomsFor(def) {
    const need = def.requires?.room;
    const free = freeRooms();
    const mine = wingForSupport(def.support) ?? DEFAULT_WING;
    const wingFirst = (list) => [...list.filter((r) => roster.wingOfRoom(r.id) === mine), ...list.filter((r) => roster.wingOfRoom(r.id) !== mine)];
    if (need) return wingFirst(free.filter((r) => r.defId === need));
    const general = free.filter((r) => roomById(r.defId)?.general);
    return wingFirst([...general.filter((r) => r.defId === def.room), ...general.filter((r) => r.defId !== def.room)]);
  }
  // Milestone 24: the residents' levels by wing (Safe Coverage per wing): the Home wing and every painted wing.
  function wingLevels() {
    const by = new Map();
    for (const w of ALL_WINGS) if (w.id === DEFAULT_WING || layout.wings.count(w.id)) by.set(w.id, { id: w.id, name: w.id === DEFAULT_WING ? 'Home wing' : w.name, levels: [] });
    for (const p of residents) if (!p.state.leaving && !p.state.guest) by.get(roster.wingOfRoom(p.state.room) ?? DEFAULT_WING)?.levels.push(levelOf(p));
    return [...by.values()];
  }
  // The home's places: rooms built, capped by the stage and never above the 70-resident logical cap.
  const placesLeft = () => placesFree({ here: seated().length, rooms: roomList().length, stageCap: layout.stageDef.capacity });
  const roomTemplatesHere = () => new Set(roomList().map((r) => r.defId));
  const team = () => crew.people.filter((q) => !q.agency && !q.leftTeam);
  const teamRoles = () => new Set(team().map((q) => q.role));
  const admitCtx = () => ({ roles: teamRoles(), freeRooms: freeRooms().map((r) => r.id), freeRoomsFor: (def) => roomsFor(def).map((r) => r.id), day: clock.totalDays, placeable: roomTemplatesHere(), buildable: (id) => layout.unlock(id).ok, paused: coverage.admissionsPaused() ?? economy?.admissionsPaused() ?? null }); // (Milestone 22: deep debt)
  const monthRange = (endDay = null) => {
    const len = clock.daysPerMonth;
    const toDay = endDay ?? (Math.floor(clock.totalDays / len) + 1) * len;
    return { fromDay: toDay - len, toDay };
  };
  // Milestone 9: plus who went home (they pay for their days here: admittedDay → leftDay)
  const payers = () => [
    // (Milestone 16: rehab residents bring rehab funding; once ready to go home, their funding drops — data/mobility.js)
    ...residents.filter((p) => !p.state.leaving && !p.state.guest).map((p) => ({ id: p.id, name: p.name, level: levelOf(p), nursing: nursingOf(p), moodAvg: moodAvgOf(p), room: roomList().find((r) => r.id === p.state.room)?.defId ?? null, respite: (p.state.stay?.type ?? p.def.stay) === 'Respite', admittedDay: p.state.admittedDay ?? 0, rehab: !!p.state.rehab?.active, readyDay: p.state.rehab?.readyDay ?? null })),
    ...admissions.homeGoings.map((h) => ({ id: h.id, name: h.name, level: h.level, nursing: !!h.nursing, moodAvg: h.moodAvg ?? null, room: h.room ?? null, respite: !!h.respite, admittedDay: h.admittedDay ?? 0, leftDay: h.leftDay, rehab: !!h.rehab, readyDay: h.readyDay ?? null })),
  ];
  // Milestone 22: the home's own monthly costs — every placed room and facility's upkeep, utilities by open floor
  let tilesCache = { v: null, n: 0 };
  function homeCosts() {
    if (tilesCache.v !== layout.version) {
      let n = 0;
      for (let r = 0; r < MAX_FLOOR.rows; r++) for (let c = 0; c < MAX_FLOOR.cols; c++) if (layout.isOpen(c, r)) n++;
      tilesCache = { v: layout.version, n };
    }
    const upkeep = layout.pieces.map((pc) => ({ name: pc.name, amount: Math.round((layout.costOf(pc.defId) * UPKEEP.pctOfCost) / 100) })).filter((x) => x.amount > 0);
    return { upkeep, utilities: Math.round(tilesCache.n * UTILITIES.perTile), tiles: tilesCache.n };
  }
  const payroll = () => team().map((q) => ({ id: q.id, name: q.name, salary: q.model.salary })); // agency is paid per shift
  // --- care-plan rules (Milestone 8) -------------------------------------------------------------------------------
  const facilityIds = () => new Set(placed.filter((x) => x.kind !== 'room').map((x) => x.defId)); // (Milestone 10: by facility, F01 …)
  // What an option's eligibility rule reads: the resident, the team and roster, the rooms / facilities / programs.
  function planCtx(p) {
    const shiftRoles = Object.fromEntries(SHIFT_IDS.map((sid) => [sid, new Set()]));
    const shiftCounts = Object.fromEntries(SHIFT_IDS.map((sid) => [sid, 0]));
    // Milestone 11: a specialty stands in for a role in these rules (the Falls specialty for "an Allied Health …")
    const standIns = (q) => (staffing?.specialtiesOf(q.id) ?? []).map((sp) => SPECIALTIES[sp]?.standsInFor).filter(Boolean);
    const roles = teamRoles();
    for (const q of team()) {
      for (const r of standIns(q)) roles.add(r);
      const sid = roster.shiftOf(q.id)?.id;
      if (!shiftRoles[sid]) continue;
      shiftRoles[sid].add(q.role);
      for (const r of standIns(q)) shiftRoles[sid].add(r);
      shiftCounts[sid]++;
    }
    // Milestone 15: the special menus someone on the team can make (a diet trait, or the Nutrition specialty)
    const dietSkills = new Set(team().flatMap((q) => [...skillsOf({ traits: q.model.traits, specialties: specialtiesOf(q.id) })]));
    return { name: p.name, needs: p.state.needs, level: supportLevel(p.def), support: p.def.support, stay: p.def.stay, visitors: p.def.visitors, eolStage: stageOf(p), teamRoles: roles, shiftRoles, shiftCounts, rooms: roomTemplatesHere(), facilities: facilityIds(), programs: new Set(Object.keys(progState.running)), dietSkills }; // (Milestone 20: running programs)
  }
  // End of a day: who had essential care missed (a run of such days makes their plan stale).
  function noteMissed(day) {
    for (const p of residents) {
      if (!inCare(p)) continue;
      noteDay(p.state, day, care.tasks.some((t) => t.resident === p.id && t.day === day && t.status === 'missed' && t.essential));
    }
  }
  // A plan never reviewed on this save (a new game, or an M7-era save): reviewed as of now, not stale.
  for (const p of residents) if (p.state.review == null) markReviewed(p.state, clock.totalDays);
  // Milestone 28b: the opening day's big beat (a new home, on its first update; an older save has had its day)
  if (care.opened == null) care.opened = clock.totalDays > 0;
  const tickAdmissions = (day) => {
    const r = admissions.tick(day, { inHome: inHome(), roles: teamRoles(), placeable: roomTemplatesHere() });
    if (r.left.length || r.arrived.length) bus?.emit('admissions:change', { day, left: r.left.map((a) => a.id), arrived: r.arrived.map((a) => a.id) });
    return r;
  };
  tickAdmissions(clock.totalDays); // a new home (or an older save) gets its first board
  // A new day: the day's beat, the Founder's days, the board; a new month: the ledger's close for the month just ended.
  // Milestone 14: what the day's sessions put in the room — the activity's prop while its session runs (half an hour
  // either side), the Birthday Table all day — on free floor beside the Activity Lounge (or the Dining Room).
  let decorCache = { key: null, list: [] };
  function decorNow() {
    const day = clock.totalDays;
    const h = hourNow();
    const want = [];
    const bday = birthdaysOn(day).length > 0;
    if (bday) want.push({ art: activityById('birthday').prop, place: 'lounge' });
    // Milestone 15: the dining trolley stands by the Dining Room through each meal service
    for (const m of MEALS) if (h >= m.at - TROLLEYS.before && h <= m.at + TROLLEYS.serviceHours[m.id]) want.push({ art: TROLLEYS.meal, place: 'dining' });
    for (const [slot, def] of Object.entries(TIMETABLE.slots)) {
      const info = sessionInfo(day, slot);
      if (!info || info.birthday || !info.activity.prop) continue;
      if (h >= def.at - 0.5 && h <= def.at + info.activity.minutes / 60 + 1) want.push({ art: info.activity.prop, place: info.activity.where.place });
    }
    // Milestone 18: the Medication Cart stands beside the Medication Room when no nurse has it out on a round
    const cartOut = crew.people.some((q) => world.trolleyOf(q) === ROUND.cart);
    const cartAt = !cartOut && medRoom() ? besidePiece(medRoom(), 1) : null;
    // Milestone 28b: the set dressing's conditions (an emergency under way; a meal service with texture-modified meals)
    const incidentOn = !!incidents?.active;
    const serving = MEALS.some((m) => h >= m.at - TROLLEYS.before && h <= m.at + TROLLEYS.serviceHours[m.id]);
    const textureOn = serving && seated().some((p) => dietOf(p.state) === 'texture');
    const key = `${day}:${want.map((w) => w.art).join()}:${layout.version}:${cartAt ? `${cartAt.col},${cartAt.row}` : ''}:${incidentOn}:${textureOn}`;
    if (decorCache.key === key) return decorCache.list;
    const used = new Set();
    const list = [];
    for (const w of want) {
      const pc = layout.ofDef(PLACE_DEF[w.place])[0];
      if (!pc) continue;
      const box = pc.box;
      // in front of the room, past its seats and helper spots, so its art never hides it
      const spots = new Set(Object.values(facilityById(pc.defId)?.spots ?? {}).map((t) => `${box.col + t.col},${box.row + t.row}`));
      const offs = [[box.w + 1, box.h], [box.w + 1, box.h + 1], [-1, box.h], [-1, box.h + 1], [box.w + 1, box.h - 1], [-1, 1]].filter(([dc, dr]) => !spots.has(`${box.col + dc},${box.row + dr}`));
      for (const [dc, dr] of offs) {
        const col = box.col + dc;
        const row = box.row + dr;
        const k = `${col},${row}`;
        if (used.has(k) || !grid.isWalkable?.(col, row)) continue;
        used.add(k);
        list.push({ kind: 'prop', id: `decor:${w.art}`, def: { art: w.art }, fp: { col, row, w: 1, h: 1 }, decor: true });
        break;
      }
    }
    if (cartAt) {
      list.push({ kind: 'prop', id: 'decor:medCart', def: { art: ROUND.cart }, fp: { col: cartAt.col, row: cartAt.row, w: 1, h: 1 }, decor: true });
      used.add(`${cartAt.col},${cartAt.row}`);
    }
    // Milestone 28b: set dressing (data/dressing.js) — a picture beside the first piece of each listed kind: on the
    // piece's sides first, then its front row (then the ring one tile further out); never on its seats / helper spots,
    // never two on one tile. Pictures only:
    // the grid and every path stay as they were.
    for (const d of SET_DRESSING) {
      if ((d.when === 'incident' && !incidentOn) || (d.when === 'textureMeal' && !textureOn)) continue;
      for (const id of d.beside) {
        const pc = layout.ofDef(id)[0];
        if (!pc) continue;
        const b = pc.box;
        const spots = new Set(Object.values((facilityById(pc.defId) ?? roomById(pc.defId))?.spots ?? {}).map((t) => `${b.col + t.col},${b.row + t.row}`));
        const cands = [];
        for (const d of [1, 2]) { // (the next tile out, then one further when the first ring is taken)
          for (let r = b.row + b.h - 1; r >= b.row; r--) cands.push([b.col + b.w - 1 + d, r], [b.col - d, r]);
          for (let c = b.col + b.w - 1 + d; c >= b.col - d; c--) cands.push([c, b.row + b.h - 1 + d]);
        }
        for (const [col, row] of cands) {
          const k = `${col},${row}`;
          if (used.has(k) || spots.has(k) || !layout.isOpen(col, row) || !grid.isWalkable?.(col, row)) continue;
          used.add(k);
          list.push({ kind: 'prop', id: `dress:${d.art}:${id}`, def: { art: d.art, scale: d.scale ?? 1 }, fp: { col, row, w: 1, h: 1 }, decor: true });
          break;
        }
      }
    }
    decorCache = { key, list };
    return list;
  }
  // Milestone 13: each resident's favourite staff member (store only: later secrets and family events read it).
  function updateFavourites(day) {
    const ids = team().map((q) => q.id);
    for (const p of seated()) {
      const fav = favouriteOf(care, p.id, ids);
      if ((p.state.favourite?.staff ?? null) !== fav) p.state.favourite = fav ? { staff: fav, since: day } : null;
    }
  }
  function newDay(day) {
    // Milestone 25c: upgrades finished today
    for (const d of layout.tickUpgrades(day)) {
      const p = layout.byUid(d.uid);
      if (p) bus?.emit('home:levelUp', { id: p.id, uid: d.uid, name: p.name, level: d.level });
    }
    // Milestone 9: the opening resident's countdown pauses for each day he spent as the only resident
    for (const p of residents) {
      if (!aloneOpening(p) || p.state.leaving) continue;
      p.state.stay.leaveDay += 1;
      p.state.stay.paused = (p.state.stay.paused ?? 0) + 1;
    }
    staffState.founder.history.daysEmployed += 1;
    fadeFamiliarity(care, day - 1, seated().map((p) => p.id), team().map((q) => q.id)); // Milestone 13: regular contact matters
    reseatFriends(); // Milestone 13: friends sit together when seats allow
    updateFavourites(day);
    // Milestone 14: today's sessions (everyone's choice), a community notice perhaps, birthdays, and a resident with
    // nothing they like for a while
    const fired = acts.dailyTick(day);
    for (const inst of fired) bus?.emit('care:notice', { uid: inst.uid, id: inst.id, day: inst.params.day });
    planSessions(day);
    const bdays = birthdaysOn(day);
    if (bdays.length) {
      const b = acts.state.birthdays;
      const first = b.first == null;
      if (first) b.first = day;
      for (const id of bdays) b.held[id] = clock.dateOf(day).year;
      for (const id of bdays) addMoment(byResident(id), 'birthday'); // (Milestone 27: the Memory Book)
      bus?.emit('care:birthday', { residents: bdays, names: bdays.map((id) => byResident(id)?.name), first, art: first ? BIRTHDAY.firstArt : null });
      items.rollSource('birthday', { why: bdays.map((id) => byResident(id)?.name ?? id).join(' and ') }); // (Milestone 25c)
    }
    for (const p of inSession()) {
      const st = p.state;
      st.lastLikedDay ??= day;
      if (day - st.lastLikedDay >= OUTCOME.noLikedDays) {
        st.outcomes.mood = clamp(st.outcomes.mood + OUTCOME.noLikedMoodPerDay);
        st.wouldEnjoy = SCHEDULABLE.map((a) => ({ a, f: feelingOf(p.def, st, a) })).sort((x, y) => (y.f === 'love') - (x.f === 'love') || (y.f === 'like') - (x.f === 'like'))[0]?.a.id ?? null;
      }
    }
    mobilityDay(day); // (Milestone 16: rehab progress, mobility levels and aids, ready to go home, falls risk)
    memoryDay(day); // (Milestone 17: steady / unsettled, the Choice signal)
    familyDay(day); // (Milestone 19: what families saw yesterday, compliments and complaints, requests, today's visits)
    programDay(day); // (Milestone 20: each running program's weekly cost)
    research.dailyTick(day); // (Milestone 21: research progress; the learning facilities' weekly RP)
    if (research.doneIds().length) economy.award('firstResearch'); // (Milestone 22: Care Tokens, once)
    economy.daily(day); // (Milestone 22: Emergency Credit below the floor)
    moveOuts(day); // (Milestone 22: a week of very low Mood — a family may move them elsewhere)
    for (const p of seated()) if (joined(p)) { const m = (p.state.moodMonth ??= { sum: 0, n: 0 }); m.sum += p.state.outcomes.mood; m.n += 1; } // (Milestone 22: the month's Mood)
    // Milestone 15: yesterday's food (a simple cost per meal served), today's diet tags
    const meals = dining.served(day - 1);
    if (meals) ledger.economy.add('credits', -meals * FOOD_COST.perMeal, `Food: ${meals} meal${meals === 1 ? '' : 's'} served`, 'food');
    if (meals) partners.noteSaving('foodPct', meals * FOOD_COST.perMeal); // (Milestone 23: Hearth Nutrition's saving, posted at the month's close)
    partners.noteRoomChecks(day - 1, ...roomChecksOn(day - 1)); // (Milestone 23: the Environment score's cleanliness)
    partners.daily(day); // (Milestone 23: deals end, new offers, grants met or past their deadline)
    incidents.daily(day); // (Milestone 25: emergency supplies; perhaps an event later today)
    fallsDay(day); // (Milestone 25: rest after a fall over — handled well gives the family's Trust back)
    eolDay(day); // (Milestone 27: care stages, the comfort record, grief easing, held rooms opening)
    eventsDay(day); // (Milestone 28: life stories, friendships, staff milestones, care-plan reviews)
    quality.daily(day, qualityInputs(day - 1)); // (Milestone 26: yesterday into the rolling scores; inspections; peers)
    for (const p of inSession()) p.state.diet = dietOf(p.state);
    bus?.emit('care:dayEnd', world.daySummary(day - 1));
    if (shortStaffing) coverage.dayEnd(day - 1); // care recovery for yesterday's missed essential tasks (Milestone 7)
    noteMissed(day - 1); // Milestone 8: the missed-essential streak (plan review)
    tickAdmissions(day);
    staffing.tick(day); // Milestone 11: the free board refresh every 56 days, training days
    finishBuilding(); // (Milestone 24: a stage being built opens when its days are up)
    items.tick(); // (Milestone 25c: a new season starts everyone's item points again)
    if (day % clock.daysPerMonth === 0) {
      // (Milestone 25c: a calm month — no essential care missed, with residents in the home — and a well-wisher now and then)
      const it = staffState.items;
      const missedThisMonth = (care.counts?.essentialMissed ?? 0) - (it.essentialAtClose ?? 0);
      it.essentialAtClose = care.counts?.essentialMissed ?? 0;
      if (missedThisMonth === 0 && seated().length > 0) items.rollSource('calmMonth');
      if (items.chance(Math.min(1, ITEM_SOURCES.wellWisher.monthlyChance * blessings.surpriseMult())) && items.grant('wellWisher')) bus?.emit('care:surprise', { kind: 'wellWisher' }); // (Milestone 30b: Jinx's blessing; a good surprise)
      const d = clock.dateOf(day - 1);
      const closed = ledger.closeMonth({ month: `Month ${d.month}, Year ${d.year}`, ...monthRange(day), residents: payers(), staff: payroll(), home: homeCosts(), feeMult: blessings.feeMult() }); // (Milestone 30b: Kaching)
      // (Milestone 23: the partners' savings on this close — GoldenStep on equipment, BOTWORKS on upkeep and utilities —
      // their month checks, and a new grant board)
      const closeSum = (cats) => (closed ?? []).filter((l) => cats.includes(l.category)).reduce((t, l) => t + l.amount, 0);
      partners.noteSaving('equipmentPct', closeSum(['equipment']));
      partners.noteSaving('adminPct', closeSum(['upkeep', 'utilities']));
      // (Milestone 26: an accreditation's Care Support Funding bonus, as its own line)
      const fundPct = quality.bonus('fundingPct');
      const funded = closeSum(['funding']);
      if (fundPct && funded > 0) ledger.economy.add('credits', Math.round((funded * fundPct) / 100), `Safe Care Accreditation: Care Support Funding +${fundPct}%`, 'funding');
      partners.monthClosed(day);
      if (monthRp(`Month ${d.month}, Year ${d.year}`) > 0) economy.award('goodMonth'); // (Milestone 21; Milestone 22: a Care Token)
      economy.monthClosed({ month: `Month ${d.month}, Year ${d.year}` }); // (Milestone 22: loan, investor, history, offers)
      const secretMonth = secrets?.monthClosed(); // (Milestone 29: the month's record for the secrets, then the month's secret rules)
      achievements?.monthClosed(secretMonth); // (Milestone 32: the month's records, Safe Month / Safe Year)
      for (const p of residents) delete p.state.moodMonth; // (a new month's Mood)
    }
    secrets?.daily(day); // (Milestone 29: each midnight, after the quality scores and any month close: the day's secret rules)
    achievements?.daily(); // (Milestone 32: the day's records, achievements, Memory Book milestones and the Hall of Fame)
  }

  // --- rostering and Safe Coverage (Milestone 7) -----------------------------------------------------------------
  // An agency worker for one shift instance: generic art, tagged AGENCY, walks in from the front entrance.
  function hire(role, inst) {
    const cs = staffState.coverage;
    const def = AGENCY[role];
    const id = `AGY${cs.nextAgency++}`;
    const model = new StaffModel({ id, name: def.name, role, tier: 'standard', level: 1, stats: { ...def.stats }, salary: 0, art: def.art, energy: STAFF_BALANCE.startEnergy, morale: STAFF_BALANCE.startMorale, traits: [], counters: { tasks: 0, agency: true } });
    sys.add(model);
    staffState.roster.agency.push({ id, name: def.name, role, art: def.art, shift: inst.shift, key: inst.key, start: inst.start, end: inst.end, model: null });
    const q = crew.addPerson(model, { agency: true });
    world.people.push(q);
    if (ic?.active?.kind === 'staffing') ic.active.stats.agency = (ic.active.stats.agency ?? 0) + 1; // (Milestone 25: the after-report)
    return q;
  }
  // They walked out: gone from the team, the roster and the home.
  function dropGone() {
    for (const q of crew.people.filter((x) => x.gone)) {
      if (q.leftTeam) delete staffState.assignments[q.id];
      for (const t of care.tasks) if ((t.status === 'claimed' || t.status === 'working') && t.slots[0] === q.id) unclaim(t);
      crew.remove(q.id);
      sys.remove(q.id);
      const i = world.people.indexOf(q);
      if (i >= 0) world.people.splice(i, 1);
      staffState.roster.agency = staffState.roster.agency.filter((a) => a.id !== q.id);
      delete staffState.pos[q.id];
      delete staffState.modes[q.id];
      bus?.emit(q.leftTeam ? 'staff:left' : 'staff:agencyLeft', { id: q.id });
    }
  }
  const coverage = createCoverage({
    restBonus: () => restBonusNow(),
    state: staffState,
    roster,
    team: () => crew.people,
    levels: () => residents.filter((p) => !p.state.leaving && !p.state.guest).map((p) => levelOf(p)), // (Milestone 22: from needs)
    wings: () => wingLevels(), // (Milestone 24: Safe Coverage per wing)
    // Milestone 10 fix: anyone here whose assessed clinical need is above the line needs a real RN on shift
    clinicalHigh: () => residents.some((p) => !p.state.leaving && !p.state.guest && (p.def.needs?.clinical ?? 0) > ON_CALL.clinicalNeedAbove),
    ledger,
    abs: absTime,
    hire,
    bus,
  });

  // A hire joins Off shift and walks in from the front entrance (Milestone 11).
  function joinTeam(def) {
    const model = StaffModel.fromDefinition({ ...def, startLevel: def.level }, { startEnergy: STAFF_BALANCE.startEnergy, startMorale: STAFF_BALANCE.startMorale });
    model.counters = { tasks: 0 };
    sys.add(model);
    roster.join(model.id);
    if (staffing.state.departed.some((d) => d.id === model.id)) noteBack(care, { staffId: model.id }, clock.totalDays); // (re-hired: Milestone 12)
    const q = crew.addPerson(model);
    world.people.push(q);
    bus?.emit('staff:hired', { id: model.id, name: model.name, role: model.role });
    return q;
  }

  clock.speedAllowed = (sp) => quality.speedAllowed(sp); // (Milestone 26: bible §3)
  let lastDay = clock.totalDays;
  const world = {
    get events() {
      return director; // (Milestone 28: the event director)
    },
    items, // (Milestone 25c: care equipment)
    blessings, // (Milestone 30b: the Works Gods' blessings — src/systems/blessings.js)
    get secrets() {
      return secrets; // (Milestone 29: the secret engine, its clue stages, rewards and why-false inspector)
    },
    get achievements() {
      return achievements; // (Milestone 32: achievements, Home Records, Memory Book milestones, the Hall of Fame)
    },
    get quality() {
      return quality; // (Milestone 26: headline scores, Rank, accreditations, inspections, peers)
    },
    qualityInputsForTests: (day = clock.totalDays - 1) => qualityInputs(day),
    // Milestone 27: end of life (care stages, the comfort-first plan, the comfort score, the memorial, Memory Book pages)
    endOfLife: {
      get state() {
        return eol;
      },
      stageOf: (id) => stageById(stageOf(byResident(id))),
      // A resident's stage as the card shows it: the stage, since when, the forecast line, the next stage (never a date)
      forecast(id) {
        const p = byResident(id);
        if (!p) return null;
        const e = eolOf(p);
        return { stage: stageById(e.stage), since: e.since, days: e.since == null ? null : clock.totalDays - e.since, eligible: eolEligible(p.def, p.state), next: nextStage(e.stage) ? stageById(nextStage(e.stage)) : null, slowed: Math.floor(e.slow ?? 0), offer: e.offer ?? null, told: [...(e.told ?? [])] };
      },
      inEol: (id) => inEol(byResident(id)),
      eligible: (id) => (byResident(id) ? eolEligible(byResident(id).def, byResident(id).state) : false),
      wishes: (id) => (byResident(id) ? wishesOf(byResident(id).def) : []),
      comfortNow: (id) => (byResident(id) && inEol(byResident(id)) ? comfortNow(byResident(id)) : null),
      // The comfort-first plan: CL08 and EN08 (both offered from "Approaching end of life"; never forced)
      acceptPlan(id) {
        const p = byResident(id);
        if (!p || !inEol(p)) return { ok: false, reason: 'Offered once they are approaching the end of life' };
        const out = Object.entries(EOL_PLAN.options).map(([d, o]) => (p.state.plan?.[d] === o ? { ok: true } : world.changePlan(d, o, id)));
        const ok = out.every((r) => r.ok);
        if (ok) eolOf(p).offer = 'accepted';
        return ok ? { ok: true, reason: null } : { ok: false, reason: out.find((r) => !r.ok).reason };
      },
      keepPlan(id) {
        const p = byResident(id);
        if (!p) return { ok: false, reason: 'Not here' };
        eolOf(p).offer = 'kept';
        log(p, EOL_PLAN.kept);
        return { ok: true, reason: null };
      },
      offers: () => seated().filter((p) => eolOf(p).offer === 'open').map((p) => p.id),
      notes: () => eol.notes,
      unseen: () => eol.notes.filter((n) => !n.seen),
      markSeen() {
        for (const n of eol.notes) n.seen = true;
      },
      results: () => eol.results,
      pages: () => eol.pages,
      passings: () => eol.passings,
      heldUntil: (roomId) => (eol.held[roomId] > clock.totalDays ? eol.held[roomId] : null),
      lift: (day = clock.totalDays) => Math.min(SIGNAL.max, eol.lifts.filter((l) => l.from <= day && day < l.until).reduce((t, l) => t + l.lift, 0)),
      // tests and ?debug=1: a stage now (its forecast and length as in play), the passing now, the weekly pace
      setStageForTests(id, stage, { due = null } = {}) {
        const p = byResident(id);
        if (!p) return false;
        enterStage(p, stage);
        if (due != null) {
          eolOf(p).due = clock.totalDays + due;
          if (stage === 'final') eolOf(p).passAt = absHour(clock.totalDays + due, PACE.hours[0]);
        }
        return true;
      },
      passNowForTests(id) {
        const p = byResident(id);
        if (!p) return false;
        passPeacefully(p);
        return true;
      },
      setPaceForTests: (m) => (eolPaceMult = m),
    },
    grid,
    placed,
    props,
    get rooms() {
      return roomList();
    },
    residents,
    // --- Milestone 11 -----------------------------------------------------------------------------------------
    get staffing() {
      return staffing;
    },
    // Hire a card from the board: they join Off shift and walk in from the front entrance.
    hire(cardId) {
      const r = staffing.take(cardId);
      if (!r.ok) return r;
      return { ok: true, reason: null, person: joinTeam(r.def) };
    },
    // ?debug=1 "Fill roster" (Milestone 12): hire eligible staff from the open channels up to the cap (best tier first,
    // spread over the roles: Care Workers count double, since wake-ups, meals and personal care are mostly theirs), so a
    // full roster can be tried at once. Each goes where their role is thinnest: Night if they prefer it and nobody works
    // Night yet, else whichever of Morning / Afternoon has fewer of their role (Morning, the busiest, on a tie).
    // → [hired ids]
    fillRoster() {
      const hired = [];
      for (let guard = 0; guard < 60 && team().length < staffing.cap; guard++) {
        const pool = staffing.eligibleNow();
        if (!pool.length) break;
        const count = (role) => team().filter((q) => q.role === role).length / (role === 'CW' ? 2 : 1);
        const def = [...pool].sort((a, b) => count(a.role) - count(b.role))[0];
        const r = staffing.takeDirect(def.id);
        if (!r.ok) break;
        const q = joinTeam(r.def);
        const on = (sid) => team().filter((x) => x !== q && x.role === q.role && roster.shiftOf(x.id)?.id === sid).length;
        const nightEmpty = !team().some((x) => x !== q && roster.shiftOf(x.id)?.id === 'night');
        // (Milestone 16 fix first: a second Hospitality worker goes to Afternoon, so lunch and the evening meal have a server)
        const day = on('afternoon') < on('morning') || (q.role === 'HN' && on('morning') > 0 && on('afternoon') === 0) ? 'afternoon' : 'morning';
        roster.move(q.id, r.def.shiftPref === 'night' && nightEmpty ? 'night' : day);
        hired.push(q.id);
      }
      if (hired.length) bus?.emit('staff:filled', { ids: hired });
      return hired;
    },
    // Tests and the balance runs (Milestone 22): hire one eligible person straight away onto a shift (the same rules
    // as a board card — the team cap, eligibility — without waiting for the board). → { ok, reason, person }
    hireDirectForTests(defId, shiftId = 'morning') {
      const r = staffing.takeDirect(defId);
      if (!r.ok) return r;
      const q = joinTeam(r.def);
      roster.move(q.id, shiftId);
      return { ok: true, reason: null, person: q };
    },
    setRankForTests(r) {
      return quality.setRankForTests(r);
    },
    // (Milestone 25c, tests: the Staff Room's rest bonus as it is now — × its level)
    restBonusForTests: () => restBonusNow(),
    // Let someone go (the page asks first; the Founder twice). Their Familiar Care stays on record in the care state.
    letGo(staffId) {
      const q = crew.byId(staffId);
      if (!q || q.agency || q.leftTeam) return { ok: false, reason: 'They are not on the team.' };
      if (team().length <= 1) return { ok: false, reason: 'The home needs someone on the team.' };
      const founder = staffState.founder.id === staffId && !staffState.founder.ended;
      for (const t of care.tasks) if ((t.status === 'claimed' || t.status === 'working') && t.slots[0] === staffId) unclaim(t);
      for (const [k, v] of Object.entries(care.keyWorkers)) if (v === staffId) delete care.keyWorkers[k];
      for (const [k, v] of Object.entries(staffState.assignments)) if (v === staffId) delete staffState.assignments[k];
      delete staffState.continuity?.[staffId]; // (Milestone 13: their continuity group ends)
      staffing.departed(q.model, clock.totalDays, founder);
      noteLeft(care, { staffId }, clock.totalDays); // (Milestone 12: their Familiar Care records stay, marked)
      roster.forget(staffId);
      q.leftTeam = true;
      crew.leave(q);
      if (founder) {
        // bible §3.5.3: the Founding Staff flag ends with them (and they never come back as a candidate)
        staffState.founder.ended = true;
        staffState.founder.history.continuous = false;
        delete q.model.counters[FOUNDER_FLAG];
        perks.set(null);
      }
      bus?.emit('staff:letGo', { id: staffId, name: q.name, founder });
      return { ok: true, reason: null, founder };
    },
    // Start a course: paid, off the roster, off to the Training Room.
    train(courseId, staffId) {
      const r = staffing.startCourse(courseId, staffId);
      if (!r.ok) return r;
      const q = crew.byId(staffId);
      for (const t of care.tasks) if ((t.status === 'claimed' || t.status === 'working') && t.slots[0] === staffId) unclaim(t);
      roster.setTraining(staffId, true);
      bus?.emit('staff:training', { id: staffId, name: q?.name, course: courseId });
      return r;
    },
    specialtiesOf: (staffId) => staffing.specialtiesOf(staffId),
    // --- Milestone 10 -----------------------------------------------------------------------------------------
    layout,
    fixedUp,
    get floor() {
      return layout.floor;
    },
    get stage() {
      return layout.stageDef;
    },
    roomNumber: (id) => layout.roomNumber(id),
    spotTile: spot,
    roomsFor: (residentId) => roomsFor(residentById(residentId)),
    build: null, // (below)
    people: [...residents, ...crew.people],
    staff: crew.people,
    get team() {
      return team();
    },
    coverage,
    get resident() {
      return byResident(ARTHUR); // (null once he has gone home — Milestone 9)
    },
    worker: crew.people[0], // the Founder (Milestones 1–2 had one worker)
    founder: { id: staffState.founder.id, name: crew.byId(staffState.founder.id)?.name },
    staffState,
    staffSystem: sys,
    perks,
    roster,
    crew,
    clock,
    admissions,
    ledger,
    get hour() {
      return hourNow();
    },
    get band() {
      return band;
    },
    // Asleep: settled for the night (Arthur, or anyone given).
    get asleep() {
      return !!byResident(ARTHUR) && world.isAsleep(byResident(ARTHUR));
    },
    isAsleep: (p) => p.state.step?.id === 'settle' && p.state.step.status === 'doing',
    joined,
    residentById: byResident,
    update(dt) {
      if (clock.paused) return;
      const g = dt * clock.speed; // game-seconds at 1×
      clock.update(dt);
      const hours = (g / clock.secondsPerDay) * 24;
      while (lastDay < clock.totalDays) newDay(++lastDay);
      if (!care.opened) {
        care.opened = true;
        bus?.emit('home:opened', { day: clock.totalDays });
      }
      for (const p of residents) {
        if (p.state.away) continue; // (Milestone 18: the hospital service looks after them while they are away)
        alertHour(p, hours); // (Milestone 18: an open alert costs a little Comfort)
        riseNeeds(p.state, hours, world.isAsleep(p));
        driftOutcomes(p.state, hours);
        noteMobilityNeed(p.state, hours); // (Milestone 16)
        if (p.state.memory) memoryHour(p, hours); // (Milestone 17: stimulation)
        programHour(p, hours); // (Milestone 20: Night Comfort — calmer for anyone awake at night)
        incidentHour(p, hours); // (Milestone 25: unwell in an outbreak, or a heatwave)
      }
      const b = bandAt(hourNow());
      if (b !== band) {
        band = b;
        crew.newBand();
        for (const p of seated()) updateFalls(p); // (Milestone 16: who is on shift changes the falls modifiers)
        bus?.emit('care:band', { band: b.id });
      }
      if (shortStaffing) coverage.tick(); // Milestone 7: warnings, float / agency cover, scale-back — before anyone moves
      crew.update(g, hours);
      dropGone();
      for (const p of [...residents]) {
        if (p.state.leaving || p.state.guest) {
          if (p.state.leaving) walkOut(p); // Milestone 9: heading home
          continue;
        }
        if (p.state.away) {
          awayTick(p); // (Milestone 18: at the hospital service, or on the way there / back)
          continue;
        }
        if (p.state.fallen) continue; // (Milestone 25: where they fell, until help comes)
        if (p.state.stay && due(p)) {
          startLeaving(p);
          continue;
        }
        if (p.state.joinAt != null) {
          if (!joined(p)) continue;
          delete p.state.joinAt; // settled in: from this band they live the routine
          bus?.emit('care:joined', { resident: p.id });
        }
        const r = routineAt(hourNow(), clock.totalDays, stepsFor(p, clock.totalDays));
        if (!p.state.step || p.state.step.id !== r.step.id || p.state.step.day !== r.day) {
          if (waitsInBed(p)) {
            trayInBed(p); // (Milestone 15: breakfast comes to them on a tray)
            continue; // (Milestone 13: help is on the way — they stay in bed for it)
          }
          startStep(p, r.step, r.day);
        }
        if (p.state.memory) walkTick(p); // (Milestone 17: a walk of their own)
      }
      eolTick(); // (Milestone 27: a passing at the quiet hour of the last of the final days)
      director.tick(); // (Milestone 28: a waiting choice settled on its own; stale beats)
      tickTasks(hours);
      for (const p of residents) p.agent.update(g, grid);
      for (const x of visitors) x.agent.update(g, grid); // (Milestone 19)
    },
    // Resident card's picker: choose who helps with a step (null = automatic). A role that doesn't fit is refused.
    assign(stepId, staffId, residentId = ARTHUR) {
      const step = routineStep(stepId);
      if (!step) return { ok: false, reason: 'No such step.' };
      const key = pinKey(residentId, stepId);
      if (staffId == null) {
        delete staffState.assignments[key];
        return { ok: true, reason: null };
      }
      const r = crew.canHelp(staffId, step);
      if (r.ok) staffState.assignments[key] = staffId;
      return r;
    },
    chosenFor: (stepId, residentId = ARTHUR) => staffState.assignments[pinKey(residentId, stepId)] ?? null,
    // Who helps with a step today: whoever has its task, else who would pick it by score if it were open now.
    helperFor(stepId, residentId = ARTHUR) {
      const step = routineStep(stepId);
      const p = byResident(residentId);
      if (!step || !p) return null;
      const day = routineAt(hourNow(), clock.totalDays, stepsFor(p, clock.totalDays)).day;
      const t = routineTask(p, stepId, day);
      if (t && (t.status === 'claimed' || t.status === 'working' || t.status === 'done')) return t.slots[0];
      const probe = t ?? { id: 'probe', source: 'routine', stepId, type: 'meal', urgency: 3, roles: step.roles, place: 'step', opens: 0, resident: p.id };
      const onShift = crew.people.filter((q) => roster.onShift(q.id, hourNow(), bandAt(hourNow()).id));
      return choosePairs([probe], onShift, scoreFor)[0]?.person.id ?? null;
    },
    // --- Milestone 4 -------------------------------------------------------------------------------------------
    care,
    changePlan(domain, optionId, residentId = ARTHUR) {
      const p = byResident(residentId);
      if (!p) return { ok: false, reason: 'No such resident.' };
      // Milestone 8: only an eligible option (the current one may stay even if its rule no longer passes)
      if (p.state.plan?.[domain] !== optionId) {
        const el = eligibilityOf(optionId, planCtx(p));
        if (!el.ok) return { ok: false, reason: el.reason };
      }
      const inst = bandInstance(hourNow(), clock.totalDays);
      const r = changePlan(care, p.state, domain, optionId, { day: inst.day, band: inst.band, now: absNow(), rolesOnShift, stepOver: stepOverFor(p), roleOf: (id) => crew.byId(id)?.role });
      // anyone whose task was taken away or no longer fits goes back to their post
      for (const q of crew.people) {
        const t = q.task && care.tasks.find((x) => x.id === q.task.id);
        if (q.task && (!t || t.slots[0] !== q.id)) crew.releaseTask(q.id);
      }
      assignSys.refresh();
      if (r.ok && r.changed) {
        log(p, r.text);
        // (Milestone 18: Update care plan — a new Clinical/Nursing option settles the alert that asked for it, or not)
        const a = domain === 'CL' ? alertOf(p.id) : null;
        if (a?.pending?.action === 'carePlan') settle(a, 'carePlan', { otherOption: optionId !== a.pending.suggest });
        logRefused(p, care.tasks.filter((t) => t.resident === p.id && t.optionId === optionId && t.optionRefused && t.day === inst.day));
        // Milestone 8: choosing an option they dislike costs a little Mood (a preferred one lifts it)
        const pref = optionPrefOf(p.state, optionId);
        const mood = OPTION_PREF_MOOD[pref] ?? 0;
        if (mood) {
          p.state.outcomes.mood = clamp(p.state.outcomes.mood + mood);
          log(p, pref === 'dislike' ? `Unhappy with ${optionById(optionId).name} (Mood ${mood})` : `Pleased with ${optionById(optionId).name} (Mood +${mood})`);
        }
        r.mood = mood;
        familyPlanChange(p, domain, optionId); // (Milestone 19: a disliked option — the family expects to hear)
        if (EOL_PLAN_IDS.includes(optionId) && eolOf(p).offer === 'open') eolOf(p).offer = 'accepted'; // (Milestone 27)
        bus?.emit('care:plan', { resident: p.id, domain, option: optionId });
      }
      return r;
    },
    // --- Milestone 8 ------------------------------------------------------------------------------------------
    planCtx: (residentId = ARTHUR) => (byResident(residentId) ? planCtx(byResident(residentId)) : null),
    eligibility(optionId, residentId = ARTHUR) {
      const p = byResident(residentId);
      return p ? eligibilityOf(optionId, planCtx(p)) : { ok: false, reason: 'No such resident.' };
    },
    optionPref: (optionId, residentId = ARTHUR) => optionPrefOf(byResident(residentId)?.state, optionId),
    staleOf: (residentId = ARTHUR) => (byResident(residentId) ? staleReasons(byResident(residentId).state, clock.totalDays) : []),
    stalePlans: () => residents.filter((p) => !p.state.leaving && !p.state.guest).map((p) => ({ resident: p.id, reasons: staleReasons(p.state, clock.totalDays) })).filter((x) => x.reasons.length),
    // Review: confirm (or change) the options, then tap Reviewed. The Founder's history counts it when they are on
    // shift to take part (the RN on shift leads the review).
    reviewPlan(residentId = ARTHUR) {
      const p = byResident(residentId);
      if (!p) return { ok: false, reason: 'No such resident.' };
      markReviewed(p.state, clock.totalDays);
      const f = staffState.founder;
      const founderOn = roster.onShift(f.id);
      if (founderOn) f.history.carePlanReviews = (f.history.carePlanReviews ?? 0) + 1;
      log(p, founderOn ? `Care plan reviewed (with ${helperName(f.id)})` : 'Care plan reviewed');
      bus?.emit('care:review', { resident: p.id, founder: founderOn });
      return { ok: true, reason: null, founder: founderOn };
    },
    // Today's tasks for a resident (Arthur by default), in the order they open (the card's list).
    tasksToday(residentId = ARTHUR) {
      const day = clock.totalDays;
      return care.tasks.filter((t) => t.resident === residentId && t.day === day).sort((a, b) => a.opens - b.opens);
    },
    // Every resident's missed tasks today (the Care badge).
    missedToday() {
      const day = clock.totalDays;
      return care.tasks.filter((t) => t.day === day && t.status === 'missed' && byResident(t.resident));
    },
    taskOf: (q) => (q.task ? care.tasks.find((t) => t.id === q.task.id) ?? null : null),
    get bell() {
      return openBell(care, ARTHUR);
    },
    bellFor: (residentId) => openBell(care, residentId),
    get bells() {
      return residents.map((p) => openBell(care, p.id)).filter(Boolean);
    },
    bellSummary: (residentId = ARTHUR) => bellSummary(care, residentId),
    mostFamiliar: (residentId = ARTHUR) => mostFamiliar(care, residentId, crew.people.map((q) => q.id)),
    // --- Milestone 14 ------------------------------------------------------------------------------------------
    activities: acts,
    stepsFor: (residentId, day = clock.totalDays) => (byResident(residentId) ? stepsFor(byResident(residentId), day) : []),
    // The timetable: set a slot (Mon–Sun, 'morning' | 'afternoon', an activity id or null for free time). Today's
    // sessions that haven't started are planned again.
    setSlot(dow, slot, activityId) {
      const r = acts.setSlot(dow, slot, activityId);
      if (r.ok) planSessions(clock.totalDays, true);
      return r;
    },
    sessionToday: (slot, day = clock.totalDays) => acts.session(day, slot),
    sessionInfo,
    birthdayOf,
    birthdaysOn,
    answerNotice(uid, accept) {
      const r = acts.answer(uid, accept);
      if (r.ok) planSessions(clock.totalDays, true);
      return r;
    },
    feelingOf: (residentId, activityId) => (byResident(residentId) ? feelingOf(byResident(residentId).def, byResident(residentId).state, activityById(activityId)) : null),
    // Things drawn in the home that are not pieces: the running session's activity prop, a Birthday Table all day.
    get decor() {
      return decorNow();
    },
    // --- Milestone 15 ------------------------------------------------------------------------------------------
    // Nutrition and dining: the weekly menu, the meal records, each resident's diet and favourites, the kitchen.
    dining,
    kitchen: () => kitchenNow(),
    hasNutritionOffice: () => hasOffice(),
    hospitalityOn: () => hospitalityOn(),
    menuOn: (day = clock.totalDays) => dining.menuOn(day),
    // Change a dish on the weekly menu (Mon = 0 … Sun = 6, 'main' | 'pudding').
    setDish: (dow, kind, dishId) => dining.setDish(dow, kind, dishId),
    dietOf: (residentId) => (byResident(residentId) ? dietOf(byResident(residentId).state) : null),
    // Could their menu be made now (someone on shift who can, or the Nutrition Office)? And by anyone on the team?
    dietMadeNow: (residentId) => (byResident(residentId) ? canMake(dietOf(byResident(residentId).state), { office: hasOffice(), onShift: cooksOnShift() }) : false),
    dietMadeByTeam: (residentId) => {
      const p = byResident(residentId);
      if (!p) return false;
      const all = team().map((q) => ({ id: q.id, role: q.role, skills: skillsOf({ traits: q.model.traits, specialties: specialtiesOf(q.id) }) }));
      return canMake(dietOf(p.state), { office: hasOffice(), onShift: all });
    },
    favouritesOf: (residentId) => (byResident(residentId) ? favouritesOf(byResident(residentId).def, byResident(residentId).state) : []),
    mealRecord: (mealId, day = clock.totalDays) => dining.peek(day, mealId),
    // The next meal service: { meal, day, at, dish, prep }
    nextMeal() {
      const h = hourNow();
      const today = MEALS.find((m) => h < m.at + 1);
      const meal = today ?? MEALS[0];
      const day = today ? clock.totalDays : clock.totalDays + 1;
      return { meal, day, at: meal.at, dish: dining.dishAt(day, meal.id), prep: dining.peek(day, meal.id)?.prep ?? null };
    },
    // The Dining Room card: the home's average satisfaction, the lowest few (with their reason), the last meals, and
    // plain warnings (no Kitchen, no Hospitality on shift, a special menu nobody on the team can make).
    diningSummary() {
      const here = seated().filter((p) => p.state.dining?.avg != null);
      const avg = here.length ? Math.round((here.reduce((a, p) => a + p.state.dining.avg, 0) / here.length) * 10) / 10 : null;
      const lowest = [...here].sort((a, b) => a.state.dining.avg - b.state.dining.avg).slice(0, SATISFACTION.lowestShown).map((p) => ({ id: p.id, name: p.name, avg: p.state.dining.avg, reason: p.state.dining.last?.reason ?? 'none' }));
      const recent = dining.recent().map((r) => ({ day: r.day, meal: r.meal, name: mealById(r.meal)?.name, quality: avgOf(r, 'qualitySum'), sat: avgOf(r, 'satSum'), served: r.served, trays: r.trays, late: r.late, mismatched: r.mismatched, favourites: r.favourites, prep: r.prep.status, kitchen: r.kitchen }));
      const warnings = [];
      if (!kitchenNow()) warnings.push('No Kitchen: meals arrive late from the hatch and quality drops. Build a Kitchen (F04) in Build Mode.');
      if (!hospitalityOn() && seated().length) warnings.push('No Hospitality worker on shift: care staff serve (quality a little lower).');
      const unmet = seated().filter((p) => dietOf(p.state) !== 'standard' && !world.dietMadeByTeam(p.id));
      if (unmet.length) warnings.push(`${unmet.map((p) => first(p.name)).join(', ')}: nobody on the team can make ${unmet.length === 1 ? dietWords(dietOf(unmet[0].state)) : 'their menus'} (the Nutrition specialty or a Nutrition Office would).`);
      return { avg, lowest, recent, warnings, served: here.length };
    },
    // --- Milestone 17: memory support -------------------------------------------------------------------------------------
    isMemorySupport: (residentId) => !!byResident(residentId) && isMemorySupport(byResident(residentId).def),
    memoryOf: (residentId) => memoryOf(byResident(residentId)),
    themeOf: (residentId) => (byResident(residentId) ? themeOf(byResident(residentId).def, byResident(residentId).state) : null),
    stimulationOf: (residentId) => (memoryOf(byResident(residentId)) ? placeLevel(byResident(residentId)) : null),
    calmPlace: () => calmPiece(),
    get walkPath() {
      return care.walkPath ?? null;
    },
    setWalkPath,
    checkWalkPath: (tiles) => validatePath(tiles, (c, rr) => layout.isOpen(c, rr) && !grid.isBlocked(c, rr)),
    // Offer a life-story session now (the resident card): a one-to-one task this band. → { ok, reason }
    offerLifeStory(residentId) {
      const p = byResident(residentId);
      if (!memoryOf(p)) return { ok: false, reason: 'Life-story sessions are for residents with memory support.' };
      if (care.tasks.some((t) => t.resident === p.id && t.source === 'lifeStory' && isOpen(t))) return { ok: false, reason: 'A session is already on its way.' };
      const inst = bandInstance(hourNow(), clock.totalDays);
      const roles = rolesOnShift(inst.band.id);
      if (!LIFE_STORY.roles.some((r) => roles.has(r))) return { ok: false, reason: 'Needs a Lifestyle Coordinator or a Care Worker on shift.' };
      addTask(care, { resident: p.id, day: inst.day, band: inst.band.id, type: 'visit', name: LIFE_STORY.name, source: 'lifeStory', at: hourNow(), place: 'resident', roles: [...LIFE_STORY.roles], minutes: LIFE_STORY.minutes, drops: { ...LIFE_STORY.drops }, outcomes: { ...LIFE_STORY.lifts }, opens: absNow(), due: bandEnd(inst.band, inst.day) });
      return { ok: true, reason: null };
    },
    // --- Milestone 18: clinical care ---------------------------------------------------------------------------------------
    // world.clinical: the rounds, alerts and actions, the score. Alerts are high level: a plain word, six actions.
    clinical: {
      get state() {
        return cl;
      },
      // The home's Clinical Safety score and its parts: { score, round, obs, well, open, issues, closed }
      score: () => clinicalScore(cl, clock.totalDays),
      // A day's medicine rounds, in time order: [{ key, name, at, by, safety, parts, stops, done, late, missed, issues }]
      rounds: (day = clock.totalDays) => Object.entries(cl.rounds).filter(([, r]) => r.day === day).map(([key, r]) => ({ key, ...r })).sort((a, b) => a.at - b.at),
      today: (day = clock.totalDays) => cl.days.find((d) => d.day === day) ?? { day, rounds: [], obs: { done: 0, missed: 0 }, issues: 0, closed: 0, well: 0 },
      // Open alerts the home knows about (noticed): the Inbox and the Nurse Station card.
      alerts: () => openAlerts().filter((a) => byResident(a.resident) && !byResident(a.resident).state.away),
      // Their open alert (noticed or not: the card only shows a noticed one) — null when well.
      alertOf: (residentId) => {
        const a = alertOf(residentId);
        return a && a.noticed != null ? a : null;
      },
      wordOf: (residentId) => {
        const a = alertOf(residentId);
        return a && a.noticed != null && !byResident(residentId)?.state.away ? a.word : null;
      },
      canAct: (alertId, action) => canAct(cl.alerts.find((a) => a.id === alertId), action),
      // Take an action on an alert (the player). → { ok, reason, suggest (Update care plan's option), cost }
      act: (alertId, action) => {
        const a = cl.alerts.find((x) => x.id === alertId);
        return a ? act(a, action, 'player') : { ok: false, reason: 'No such alert.' };
      },
      actions: ACTION_IDS,
      clinicianFee: (day) => clinicianFee(day),
      clinicianDay: CLINICIAN.visitDay,
      senior: () => seniorNurse(),
      // Tests and ?debug=1: someone becomes unwell now (noticed: shown at once).
      raiseForTests(residentId, { severity = 'minor', word = null, noticed = true } = {}) {
        const p = byResident(residentId);
        if (!p) return null;
        const old = alertOf(residentId);
        if (old) old.status = 'resolved';
        const a = raiseAlert(p, severity, word ?? wordFor(new Rng(`${seed}:test:${cl.nextAlert}`), severity));
        if (noticed) noticeAlert(a, 'by the nurse');
        return a;
      },
    },
    isAway: (residentId) => !!byResident(residentId)?.state.away,
    // Out of sight (at the hospital service): not drawn, not tappable
    hiddenPerson: (p) => p?.kind === 'resident' && !!p.state.away?.out,
    // --- Milestone 16: mobility, rehab, discharge -----------------------------------------------------------------------
    // Their aid and level · the prop drawn beside them where they sit (a frame or wheelchair; null walking or for a stick)
    mobilityOf: (residentId) => byResident(residentId)?.state.mobility ?? null,
    aidPropOf(p) {
      if (p?.kind !== 'resident' || p.state.guest || p.agent.state === 'walking') return null;
      return AIDS[p.state.mobility?.aid]?.prop ?? null;
    },
    fallsOf: (residentId) => (byResident(residentId) ? updateFalls(byResident(residentId)) : null),
    rehabOf: (residentId) => byResident(residentId)?.state.rehab ?? null,
    rehabStatus: (residentId) => rehabStatus(byResident(residentId)?.state.rehab),
    rehabProgress: (residentId) => rehabProgress(byResident(residentId)?.state.rehab),
    therapySpaceOf: (residentId) => (byResident(residentId) ? therapySpace(byResident(residentId)).name : null),
    // Residents ready to go home (the Inbox): [{ id, name, readyDay, autoDay }]
    readyToGoHome: () => seated().filter((p) => p.state.rehab?.active && p.state.rehab.readyDay != null).map((p) => ({ id: p.id, name: p.name, readyDay: p.state.rehab.readyDay, autoDay: p.state.rehab.readyDay + DISCHARGE.autoDays, kept: !!p.state.rehab.kept })),
    // Keep a ready resident on for now (no automatic discharge). It brings nothing extra: their funding stays at the
    // ready-to-go-home rate, and a reminder shows every day until they are sent home.
    keepForNow(residentId) {
      const rh = byResident(residentId)?.state.rehab;
      if (!rh?.active || rh.readyDay == null) return { ok: false, reason: 'Not ready to go home yet.' };
      rh.kept = true;
      return { ok: true, reason: null };
    },
    // The rewards counters (Reputation and Research Points are spent in M26 / M21) and each family's record (M19).
    get rewards() {
      care.rewards ??= { reputation: 0, research: 0, positiveOutcomes: 0, discharges: [] };
      return care.rewards;
    },
    familyOf: (residentId) => (byResident(residentId) ? familyOf(byResident(residentId)) : care.families?.[residentId] ?? null),
    // --- Milestone 22: the economy ---------------------------------------------------------------------------------------------
    get economy() {
      return economy;
    },
    levelOf: (residentId) => (byResident(residentId) ? levelOf(byResident(residentId)) : null),
    homeCosts: () => homeCosts(),
    // --- Milestone 24: stages 3–5 and specialist wings -----------------------------------------------------------------
    // world.wings: each specialist wing as the sheets show it → [{ def, unlocked, tiles, hub, active, rooms, residents,
    // staff }]; ofResident(id) / ofStaff(id) → wing id; setStaff(staffId, wingId) → { ok, reason }
    wings: {
      list: () => WINGS_SPECIAL.map((w) => ({ def: w, unlocked: layout.wings.unlocked(w.id), tiles: layout.wings.count(w.id), hub: layout.wings.hubOf(w.id), active: layout.wings.active(w.id), rooms: roomList().filter((r) => roster.wingOfRoom(r.id) === w.id).length, residents: seated().filter((p) => roster.wingOfRoom(p.state.room) === w.id).length, staff: team().filter((q) => roster.assignedWing(q.id) === w.id && !roster.isFloat(q.id)).length })),
      ofResident: (id) => (byResident(id) ? roster.wingOfRoom(byResident(id).state.room) ?? DEFAULT_WING : null),
      ofStaff: (id) => (roster.isFloat(id) ? null : roster.assignedWing(id)),
      levels: () => wingLevels(),
      setStaff(staffId, wingId) {
        if (wingId !== DEFAULT_WING && !layout.wings.count(wingId)) return { ok: false, reason: `${wingById(wingId)?.name ?? 'That wing'} has no floor yet: paint it in Build Mode → Wings` };
        if (roster.isFloat(staffId)) roster.setFloat(staffId, false);
        return roster.setWing(staffId, wingId) ? { ok: true, reason: null } : { ok: false, reason: 'They are not on the team' };
      },
    },
    placesLeft: () => placesLeft(),
    fillToCapForDebug: (opts) => fillToCap(opts),
    // --- Milestone 23: community partners and grants ----------------------------------------------------------------------
    get partners() {
      return partners;
    },
    nutritionOutcome: () => nutritionOutcome(),
    environment: () => environmentNow(),
    // The resident card: their answer to the assistive-tech pilot (null: not asked)
    pilotOf: (residentId) => partners.pilot.state?.answers[residentId] ?? null,
    // --- Milestone 25: incidents, outbreaks and emergencies (src/systems/incidents.js) ---------------------------------------
    get incidents() {
      return incidents;
    },
    // --- Milestone 21: research -----------------------------------------------------------------------------------------------
    get research() {
      return research;
    },
    // --- Milestone 20: specialist programs --------------------------------------------------------------------------------
    // Milestone 31: the prestige chain — open(flag) (an unlock flag the secrets set: C11, C12, F34, F35, PRG11, PRG12,
    // benchmarkNetwork), legacyUser(residentId) (using Legacy House now), gardenMult (the Centenarian Garden's boost)
    prestige: {
      open: (flag) => prestigeOpen(flag),
      legacyUser: (residentId) => legacyUser(residentId),
      get legacyUsers() {
        return Object.keys(legacyUsers()).filter((id) => legacyUser(id));
      },
      get gardenMult() {
        return gardenMult({ secret: true });
      },
      // (tests) as if they had just joined life-story time
      visitForTests: (residentId) => (byResident(residentId) ? legacyVisit(byResident(residentId)) : null),
    },
    // world.programs: the ten visible programs, and PRG11 / PRG12 once their secret's flag is set (Milestone 31: until
    // then never listed, never startable).
    programs: {
      get state() {
        return progState;
      },
      // [{ def, running (its run or null), unlock { ok, reason, lock }, hours, can { ok, reason }, effect (plain words), prestige }]
      list: () => listedPrograms().map((d) => ({ def: d, running: runOf(d.id), unlock: unlockOf(d, programCtx()), hours: programHours(d), can: runOf(d.id) ? { ok: false, reason: 'Running' } : canStartProgram(d.id), effect: EFFECT_TEXT[d.id](d.effects), prestige: !!d.secret, boost: gardenMult(d) })),
      byId: (id) => listedProgram(id),
      running: () => runningDefs().map((d) => ({ def: d, run: runOf(d.id) })),
      isRunning: (id) => !!runOf(id),
      runOf: (id) => runOf(id),
      canStart: (id) => canStartProgram(id),
      start: (id, opts) => startProgram(id, opts),
      stop: (id) => stopProgram(id),
      hours: (id) => (listedProgram(id) ? programHours(listedProgram(id)) : null),
      // Staff hours the running programs take from each shift (the roster sheet): [{ shift, roles, hours, ids }]
      useByShift() {
        const out = [];
        for (const d of runningDefs()) {
          const S = d.resources.staff;
          let row = out.find((r) => r.shift === S.shift && r.roles.join() === S.roles.join());
          if (!row) out.push((row = { shift: S.shift, roles: [...S.roles], hours: 0, ids: [] }));
          row.hours += S.hours;
          row.ids.push(d.id);
        }
        return out;
      },
      // The running programs a placed facility shows (each at the first of its shownAt that is placed).
      at(defId) {
        return runningDefs().filter((d) => d.resources.shownAt.find((id) => hasPiece(id)) === defId).map((d) => ({ def: d, run: runOf(d.id) }));
      },
      // Their part in each running program: [{ def, joined, declined }]
      residentOf: (residentId) => runningDefs().map((d) => ({ def: d, ...(runOf(d.id).residents[residentId] ?? { joined: 0, declined: 0 }) })).filter((x) => x.joined || x.declined),
      // This month's program costs so far (the Ledger): the lines paid since the month began
      costsSince: (fromDay) => ledger.economy.ledger.filter((l) => l.category === LEDGER_CATEGORY && l.day >= fromDay),
      get debug() {
        return !!progState.debug;
      },
      // ?debug=1: research, partners and wings count as unlocked (the facility, staff and Credits rules still apply)
      setDebugUnlock(on) {
        progState.debug = !!on;
      },
      payDayForTests: (day = clock.totalDays) => programDay(day),
    },
    // --- Milestone 19: family trust -------------------------------------------------------------------------------------
    visitors,
    family: {
      get state() {
        return fh;
      },
      // The home's Family Trust (the average over the families of everyone here; null with nobody here)
      trust: () => homeTrust(care.families, seated().map((p) => p.id)),
      recordOf: (residentId) => (byResident(residentId) ? familyOf(byResident(residentId)) : null),
      callOf: (residentId) => (byResident(residentId) ? callFor(byResident(residentId)) : ''),
      whoOf: (residentId) => (byResident(residentId) ? fromWord(byResident(residentId)) : ''),
      patternOf: (residentId) => PATTERNS[familyOf(byResident(residentId))?.pattern] ?? PATTERNS.None,
      visitOf: (residentId) => visitOf(residentId),
      visitsToday: () => fh.visits.filter((v) => v.day === clock.totalDays),
      book: (residentId, opts = {}) => (byResident(residentId) ? bookMeeting(byResident(residentId), opts) : { ok: false, reason: 'No such resident.' }),
      canBook: () => attendeeRostered(),
      complaints: () => fh.complaints,
      open: () => fh.complaints.filter((c) => c.status === 'open'),
      compliments: () => fh.compliments,
      improvement: (id) => {
        const c = fh.complaints.find((x) => x.id === id);
        return c ? improvement(c) : { ok: false, text: '' };
      },
      markDone: (id) => resolveComplaint(fh.complaints.find((x) => x.id === id) ?? { status: 'none' }),
      setOwner(id, staffId) {
        const c = fh.complaints.find((x) => x.id === id);
        const q = crew.byId(staffId);
        if (!c || c.status !== 'open' || !q) return { ok: false, reason: 'Nothing to change' };
        c.owner = q.id;
        trail(c, `Owner: ${helperName(q.id)}`);
        return { ok: true, reason: null };
      },
      // The player took the suggested fix (the trail records it)
      noteAction(id, text) {
        const c = fh.complaints.find((x) => x.id === id);
        if (c?.status === 'open') trail(c, `Action: ${text}`);
      },
      requests: () => fh.requests.filter((q) => q.status === 'open' && byResident(q.resident)).map((q) => ({ ...q, text: requestText(q), title: REQUESTS[q.kind].title })),
      answerRequest: (id, agree) => answerRequest(fh.requests.find((q) => q.id === id), agree),
      asks: () => fh.asks.filter((a) => byResident(a.resident)),
      answerAsk: (id, book) => answerAsk(fh.asks.find((a) => a.id === id), book),
      seenComplaint(id) {
        if (!fh.seenComplaints.includes(id)) fh.seenComplaints = [...fh.seenComplaints, id].slice(-60);
      },
      unseen: () => fh.complaints.filter((c) => c.status === 'open' && !fh.seenComplaints.includes(c.id)),
      meetingKinds: MEETING_KINDS,
      // Tests and ?debug=1
      visitNowForTests(residentId, opts = {}) {
        const p = byResident(residentId);
        if (!p || !hasFamily(p)) return null;
        const v = addVisit(p, clock.totalDays, opts);
        v.at = absNow();
        return v;
      },
      complainForTests: (residentId, kind, opts = {}) => (byResident(residentId) ? raiseComplaint(byResident(residentId), kind, opts) : null),
      complimentForTests: (residentId, kind = 'visit') => (byResident(residentId) ? compliment(byResident(residentId), kind) : null),
      requestForTests(residentId, kind) {
        const p = byResident(residentId);
        if (!p || !hasFamily(p)) return null;
        const q = { id: `q${fh.nextId++}`, resident: p.id, kind, day: clock.totalDays, until: clock.totalDays + REQUEST.expireDays, status: 'open' };
        if (kind === 'birthdayParty') q.party = clock.totalDays + 3;
        else if (kind === 'nearFriend') {
          q.friend = topFriends(care, p.id, seated().map((o) => o.id), 1)[0]?.other ?? null;
          q.room = requestRoom(p, kind, q.friend)?.id ?? roomsFor(p.def)[0]?.id ?? null;
        } else q.room = requestRoom(p, kind)?.id ?? roomsFor(p.def)[0]?.id ?? null;
        fh.requests.push(q);
        bus?.emit('care:familyRequest', { id: q.id, resident: p.id, kind }); // (Milestone 28: as in play)
        return q;
      },
      askForTests(residentId, why = 'review') {
        const a = { id: `m${fh.nextId++}`, resident: residentId, day: clock.totalDays, why, until: clock.totalDays + MEETING_ASK.expireDays };
        fh.asks.push(a);
        bus?.emit('care:familyAsk', { id: a.id, resident: residentId, why }); // (Milestone 28: as in play)
        return a;
      },
    },
    // A successful discharge: every goal met. They walk out with family, the room frees, the rewards and a positive
    // care outcome are counted, their family's trust rises. → { ok, reason, first }
    discharge(residentId, { auto = false } = {}) {
      const p = byResident(residentId);
      if (!p || p.state.leaving) return { ok: false, reason: 'They are not here.' };
      if (!p.state.rehab?.active || p.state.rehab.readyDay == null) return { ok: false, reason: 'Not ready yet: their rehab goals are not all met.' };
      const r = world.rewards;
      const first = r.discharges.length === 0;
      const R = DISCHARGE.rewards;
      r.reputation += R.reputation;
      r.research += R.research;
      r.positiveOutcomes += 1;
      r.discharges.push({ id: p.id, name: p.name, day: clock.totalDays, auto, days: clock.totalDays - (p.state.admittedDay ?? p.state.rehab.startDay), independence: Math.round(p.state.outcomes?.independence ?? 0) }); // (Milestone 29: Independence at discharge, for the secrets)
      if (r.discharges.length > 40) r.discharges.shift();
      // (Milestone 19: the family's thank-you is a compliment carrying M16's Family Trust reward)
      compliment(p, 'discharge', { amount: R.familyTrust });
      research?.addRp(RP_INCOME.discharge, `Successful discharge: ${p.name}`, 'discharge'); // (Milestone 21)
      economy?.award('firstDischarge'); // (Milestone 22)
      p.state.rehab.dischargedDay = clock.totalDays;
      for (const q of seated()) if (q !== p && joined(q)) addMoment(q, 'cheered', { name: p.name.split(' ')[0] }); // (Milestone 27: the Memory Book)
      startLeaving(p, { discharge: true });
      bus?.emit('care:discharge', { resident: p.id, name: p.name, first, auto, art: first ? DISCHARGE.firstArt : null });
      items.rollSource('discharge', { why: p.name }); // (Milestone 25c)
      return { ok: true, reason: null, first };
    },
    // Milestone 16 (fix first): meal cover on the roster — for each shift with a meal, who is rostered to serve it.
    // → [{ shift, meals: [meal ids], level: 'none' (nobody who can serve) | 'noHospitality' (only care staff) }]
    // (a home with no residents needs none). No automatic fix and no agency for meals: it is a warning only.
    mealCover() {
      if (!seated().length) return [];
      const out = [];
      for (const [sid, meals] of Object.entries(MEAL_SHIFTS)) {
        const on = team().filter((q) => roster.shiftOf(q.id)?.id === sid && !roster.isTraining(q.id));
        const hosp = on.some((q) => q.role === 'HN' || specialtiesOf(q.id).includes('nutrition'));
        const any = hosp || on.some((q) => ['CW', 'HN'].includes(q.role));
        if (!any) out.push({ shift: sid, meals, level: 'none' });
        else if (!hosp) out.push({ shift: sid, meals, level: 'noHospitality' });
      }
      return out;
    },
    // The trolley a staff member is pushing (the home screen draws it beside them while they walk): the Hydration Cart
    // on a drinks round, the dining trolley taking a tray to a room. (Serving at the table, the trolley stands by the
    // Dining Room: world.decor.)
    trolleyOf(q) {
      const t = q?.task ? care.tasks.find((x) => x.id === q.task.id) : null;
      if (!t) return null;
      if (t.source === 'round') return TROLLEYS.round;
      if (isMeds(t) && !t.cartLeg && hasCart(cl.rounds[roundKey(t)], q)) return ROUND.cart; // (Milestone 18: the Medication Cart)
      if (t.source === 'routine' && t.tray && mealOfStep(t.stepId)) return TROLLEYS.meal;
      return null;
    },
    // --- Milestone 13 ------------------------------------------------------------------------------------------
    // Continuity groups (bible §14): pin a team member to up to CONTINUITY.maxResidents residents.
    continuityOf: (staffId) => groupOf(staffId).filter((id) => byResident(id)),
    setContinuity(staffId, residentIds) {
      const q = crew.byId(staffId);
      if (!q || q.agency || q.leftTeam) return { ok: false, reason: 'Only a team member can have a continuity group.' };
      const ids = [...new Set(residentIds)].filter((id) => byResident(id));
      if (ids.length > CONTINUITY.maxResidents) return { ok: false, reason: `A group holds up to ${CONTINUITY.maxResidents} residents.` };
      staffState.continuity ??= {};
      if (ids.length) staffState.continuity[staffId] = ids;
      else delete staffState.continuity[staffId];
      return { ok: true, reason: null };
    },
    toggleContinuity(staffId, residentId) {
      const cur = groupOf(staffId).filter((id) => byResident(id));
      return world.setContinuity(staffId, cur.includes(residentId) ? cur.filter((x) => x !== residentId) : [...cur, residentId]);
    },
    // "Usual carers": the team members whose group includes them.
    usualCarers: (residentId) => team().filter((q) => inGroup(q.id, residentId)).map((q) => q.id),
    // Friendships (bible §20): their top friends here, a pair's value; the activity groups; favourite staff.
    friendsOf: (residentId, n = 3) => topFriends(care, residentId, seated().map((q) => q.id), n),
    friendship: (a, b) => friendshipOf(care, a, b),
    activityGroup: (groupId = 'cards') => {
      const g = ACTIVITY_GROUPS.find((x) => x.id === groupId);
      return g ? groupMembers(g, seated()) : [];
    },
    favouriteOf: (residentId) => {
      const fav = byResident(residentId) ? favouriteOf(care, residentId, team().map((q) => q.id)) : null;
      return fav;
    },
    seatOf: (residentId, place = 'dining') => (byResident(residentId) ? seatOf(byResident(residentId), place) : null),
    // Milestone 12: the resident card's three most familiar staff on the team, the staff card's three residents here
    topStaffFor: (residentId, n = 3) => topFamiliar(care, { residentId }, team().map((q) => q.id), n),
    topResidentsFor: (staffId, n = 3) => topFamiliar(care, { staffId }, residents.filter((p) => !p.state.guest).map((p) => p.id), n),
    setKeyWorker(staffId, residentId = ARTHUR) {
      if (staffId == null) delete care.keyWorkers[residentId];
      else care.keyWorkers[residentId] = staffId;
    },
    // What they are doing, for their card.
    stateOf(p) {
      if (p.kind === 'staff') return crew.stateOf(p);
      const st = p.state;
      const who = theirOf(p.id);
      if (st.guest) return 'Visiting for the spawn check';
      if (st.away) {
        // (Milestone 18)
        const left = Math.max(1, Math.ceil((st.away.until - absNow()) / 24));
        return st.away.out ? `At the hospital service: back in about ${left} day${left === 1 ? '' : 's'} (${who} room is held)` : 'Going to the hospital service for a few days';
      }
      if (st.leaving) return `Going home today: walking out to the front door`;
      if (st.familyRoom) return `In the Family Room with ${fromWord(p)}`; // (Milestone 19)
      if (st.fallen) return 'Had a fall: waiting for help to get up'; // (Milestone 25)
      if (!joined(p)) return p.agent.state === 'walking' ? `Arriving: walking to ${who} room` : `Settling in to ${who} room`;
      const step = st.step && dayStep(p, st.step.id, st.step.day);
      if (!step) return `In ${who} room`;
      if (st.step.declined) return `Free time in ${who} room (chose not to join ${step.name.toLowerCase()})`;
      if (st.step.scaled) return `In ${who} room: activities scaled back today (short-staffed)`;
      if (st.step.resting) return st.unwell ? `In ${who} room: unwell, with isolation care` : `In ${who} room: resting after a fall`; // (Milestone 25)
      if (st.step.status === 'refused') return `Chose to stay in ${who} room (said no to ${step.activity ? step.name : step.name.toLowerCase()})`;
      if (st.step.status === 'missed') return `No help came for ${stepWord(step)}`;
      const helper = st.step.helper ? first(crew.byId(st.step.helper)?.name ?? '') : null;
      const t = routineTask(p, step.id, st.step.day);
      const going = step.going.replace(/\bhis\b/g, who);
      const doing = step.doing.replace(/\bhis\b/g, who);
      if (st.step.tray) {
        // (Milestone 15: a meal on a tray in their room)
        const word = stepWord(step);
        if (st.step.status === 'doing') return `Had ${word} on a tray in ${who} room`;
        return helper ? `Waiting in ${who} room: ${helper} is bringing a ${word} tray` : `Waiting in ${who} room for a ${word} tray`;
      }
      if (st.step.status === 'waiting' && helper && t?.status === 'working') return `${doing} · ${helper} is helping`;
      if (st.step.status === 'waiting') return helper ? `Waiting for ${helper} (${stepWord(step)})` : `Waiting for help (${stepWord(step)})`;
      if (st.step.status === 'walking') return helper ? `${going} · ${helper} is coming` : going;
      return helper ? `${doing} · with ${helper}` : doing;
    },
    // Which place a person is at right now (its id), or null while walking.
    whereIs(p) {
      if (p.agent.state === 'walking') return null;
      const t = grid.worldToTile(p.agent.x, p.agent.y);
      if (p.kind === 'staff') {
        const hit = placed.find((s) => Object.values(s.def.spots ?? {}).some((x) => x.col === t?.col && x.row === t?.row));
        if (hit && hit.kind !== 'room') return hit.id;
        if (p.mode === 'resting') return layout.ofDef('F08')[0]?.id ?? 'F08'; // the Staff Room's rest spots
        const ref = p.task?.spot;
        const pc = ref && ref.includes('.help') ? layout.byId(ref.split('.')[0]) : null;
        if (pc && (pc.defId === 'F03' || pc.defId === 'F05')) return pc.id;
        if (ref === 'help.dining' || ref?.startsWith('help.dining')) return layout.ofDef('F03')[0]?.id ?? 'F03';
        if (ref === 'help.lounge' || ref?.startsWith('help.lounge')) return layout.ofDef('F05')[0]?.id ?? 'F05';
        if (hit) return hit.id;
        return t && t.row >= 11 && t.col <= 11 ? 'F05' : null; // anywhere in the lounge
      }
      const place = residentPlace(p);
      if (place === 'room') return p.state.room;
      return placeRef(p, place).split('.')[0];
    },
    byId: (id) => world.people.find((p) => p.id === id) ?? placed.find((s) => s.id === id) ?? null,
    // How a day went (Milestone 5's end-of-day beat): care tasks done and missed that day, every resident (bells not
    // counted; a task no one on shift could do is not a miss).
    daySummary(day) {
      const tasks = care.tasks.filter((t) => t.day === day && t.type !== 'bell' && t.source !== 'kitchen'); // (Milestone 15: prep is the kitchen's, not care)
      return { day, done: tasks.filter((t) => t.status === 'done').length, missed: tasks.filter((t) => t.status === 'missed').length };
    },
    // --- Milestone 7 ------------------------------------------------------------------------------------------
    // Move someone to a shift (or 'off'); a float toggle; the Night on-call flag. → { ok, reason }
    moveStaff(id, shiftId) {
      if (roster.isAgency(id)) return { ok: false, reason: 'Agency cover is booked for this shift only.' };
      return roster.move(id, shiftId) ? { ok: true, reason: null } : { ok: false, reason: 'No such shift.' };
    },
    setFloat: (id, on) => ({ ok: roster.setFloat(id, on), reason: null }),
    setOnCall: (on, shiftId = 'night') => roster.setOnCall(on, shiftId),
    // The task AI's second rule: their key worker, or staff on the resident's wing (not floats, not agency).
    assignedTo: (staffId, residentId) => !!byResident(residentId) && assignedTo(staffId, byResident(residentId)),
    // --- Milestone 9 ------------------------------------------------------------------------------------------
    inCare,
    stayDaysLeft: (residentId) => (byResident(residentId) && !byResident(residentId).state.rehab?.active ? stayDaysLeft(byResident(residentId).state, clock.totalDays) : null), // (Milestone 16: rehab goes by goals)
    homeGoings: () => admissions.homeGoings,
    // ?debug=1 "Spawn all 60" (a test home only): everyone not here comes in as a guest, ignoring rooms and capacity —
    // placed on an open tile, then walking to another (seeded). Guests live no routine, get no tasks and are never
    // saved. → the guests (people)
    spawnGuests(ids = RESIDENTS.map((r) => r.id)) {
      const rng = new Rng(`${seed}:spawn`);
      const open = [];
      for (let r = 0; r < MAX_FLOOR.rows; r++) for (let c = 0; c < MAX_FLOOR.cols; c++) if (layout.isOpen(c, r)) open.push({ col: c, row: r });
      const out = [];
      ids.forEach((id, i) => {
        const def = residentById(id);
        if (!def || byResident(id)) return;
        const st = newResidentState(def, { room: null });
        Object.assign(st, varied(def, seed, 1000 + i));
        st.guest = true;
        st.stay = newStay(def, stayLengthFor(def, seed, 1000 + i), clock.totalDays);
        const p = addResident(st);
        const a = open[rng.int(0, open.length - 1)];
        const b = open[rng.int(0, open.length - 1)];
        p.agent.placeAtTile(grid, a.col, a.row);
        p.agent.walkTo(grid, b.col, b.row);
        world.people.splice(residents.length - 1, 0, p);
        out.push(p);
      });
      return out;
    },
    clearGuests() {
      for (const p of residents.filter((x) => x.state.guest)) removeResident(p);
    },
    // --- Milestone 6 ------------------------------------------------------------------------------------------
    freeRooms,
    admitCtx,
    monthRange: () => monthRange(),
    payers,
    payroll,
    // Admit an applicant: the first free room, a state from their (varied) assessment, the walk in from the entrance.
    // They join the routine and the task planning from the next band.
    admit(residentId) {
      // (Milestone 24: never above the stage's cap or the 70-resident logical cap; a full set of rooms keeps its own reason)
      const capNow = Math.min(layout.stageDef.capacity, LOGICAL_CAP);
      if (seated().length >= capNow) return { ok: false, reason: `The home is full: Stage ${layout.stage} holds ${capNow} residents` };
      const r = admissions.admit(residentId, admitCtx());
      if (!r.ok) return r;
      const app = r.applicant;
      const def = residentById(app.id);
      const room = roomList().find((r) => r.id === roomsFor(def)[0]?.id);
      const st = newResidentState(def, { room: room.id });
      st.needs = { ...app.needs };
      st.assessed = { ...app.needs }; // (Milestone 22: their Support Level comes from these)
      st.level = levelOfNeeds(app.needs);
      st.outcomes = { ...app.outcomes };
      st.admittedDay = clock.totalDays;
      // Milestone 9: the stay's length from their application, their tags; a returning resident is marked
      st.stay = newStay(def, app.stayDays ?? stayLengthFor(def, seed, app.rolls?.[0] ?? 0), clock.totalDays);
      st.tags = [...(def.tags ?? [])];
      if (app.returning) {
        st.returning = true;
        noteBack(care, { residentId: app.id }, clock.totalDays); // (Milestone 12: they pick up their Familiar Care)
      }
      // Milestone 8: a first plan from their primary support, and a first review due (the plan starts stale)
      st.plan = admissionPlan(def, st, planCtx({ name: def.name, def, state: st }));
      st.review = { day: null, needs: null, reasons: [] };
      const inst = bandInstance(hourNow(), clock.totalDays);
      st.joinAt = bandEnd(inst.band, inst.day); // from the next band
      const p = addResident(st, { atEntrance: true });
      world.people.splice(residents.length - 1, 0, p); // residents first, then the staff
      const t = placeTile(p, 'room');
      p.agent.walkTo(grid, t.col, t.row);
      addLog(st, logDay(st), now(), `Moved in to room ${layout.roomNumber(room.id)}`);
      for (const slot of Object.keys(TIMETABLE.slots)) acts.addChoice(clock.totalDays, slot, p, friendIds); // (Milestone 14: today's sessions)
      const firstIn = economy.award('firstAdmission') > 0; // (Milestone 22: Care Tokens; Milestone 28b: the first welcome's big beat)
      if (app.allocated) partners.record('allocatedAdmission', { resident: p.id, stay: def.stay, grant: app.allocated }); // (Milestone 23: a respite allocation / rehab pathway referral)
      bus?.emit('care:admit', { resident: p.id, name: p.name, room: room.id, first: firstIn });
      return { ok: true, reason: null, resident: p };
    },
    serialize() {
      for (const p of residents) {
        p.state.pos = { x: p.agent.x, y: p.agent.y, ...(p.agent.state === 'walking' && p.agent.path.length ? { path: p.agent.path.map((pt) => ({ x: pt.x, y: pt.y })) } : {}) }; // (Milestone 13: the path too)
        if (p.state.review) p.state.review.reasons = staleReasons(p.state, clock.totalDays).map((r) => r.text); // (Milestone 8)
      }
      for (const x of visitors) x.v.pos = { x: x.agent.x, y: x.agent.y }; // (Milestone 19: where each visitor is)
      for (const a of staffState.roster.agency) a.model = sys.get(a.id)?.toJSON() ?? null;
      const agencyIds = new Set(staffState.roster.agency.map((a) => a.id));
      const gone = new Set(crew.people.filter((q) => q.leftTeam).map((q) => q.id)); // (Milestone 11: let go, on their way out)
      staffState.staff = sys.serialize().filter((m) => !agencyIds.has(m.id) && !gone.has(m.id));
      staffing.serialize();
      items.serialize(); // (Milestone 25c: the equipment store, likes, season points, arrivals — into staffState.items)
      acts.serialize(); // (Milestone 14: the timetable, sessions, bookings, community notices, birthdays)
      research.serialize(); // (Milestone 21: the tree, its slots and progress, into care.research)
      partners.serialize(); // (Milestone 23: deals, tiers, history, the grant board and active grants, into care.partners)
      quality.serialize(); // (Milestone 26: the rolling scores, rank, accreditations, inspections, peers, into care.quality)
      secrets?.serialize(); // (Milestone 29: the secrets' run records, clue stages, found and fired rewards, into care.secrets)
      staffState.pos = crew.positions();
      staffState.modes = crew.modes();
      staffState.bandDone = Object.fromEntries(crew.people.map((q) => [q.id, q.bandDone ?? 0]));
      for (const t of care.tasks) {
        const q = (t.status === 'claimed' || t.status === 'working') && crew.byId(t.slots[0]);
        if (q?.task?.id === t.id) {
          t.spot = q.task.spot;
          t.arrived = q.task.arrived;
        }
      }
      const copy = (x) => JSON.parse(JSON.stringify(x));
      return { clock: clock.serialize(), residents: residents.filter((p) => !p.state.guest).map((p) => copy(p.state)), staff: copy(staffState), care: copy(care), admissions: admissions.serialize(), ledger: ledger.serialize(), layout: layout.serialize() };
    },
  };
  // --- Build Mode (Milestone 10) ------------------------------------------------------------------------------------
  // After any layout change: the grid again, the placed list, who lives where; anyone standing where a piece now
  // stands steps to the nearest open tile; residents in a moved room move with it; everyone walking finds a new way.
  function relayout({ moved = null } = {}) {
    layout.buildGrid(grid);
    syncPlaced();
    for (const r of roomList()) r.residentId = residents.find((p) => p.state.room === r.id && !p.state.leaving && !p.state.guest)?.id ?? null;
    const tileOf = (a) => grid.worldToTile(a.x, a.y);
    for (const q of [...world.people, ...visitors]) {
      const a = q.agent;
      let t = tileOf(a);
      if (q.kind === 'visitor') q.v.follow = null; // (Milestone 19: a visitor finds their resident again)
      if (moved && t && t.col >= moved.from.col && t.col < moved.from.col + moved.box.w && t.row >= moved.from.row && t.row < moved.from.row + moved.box.h) {
        const dc = moved.to.col - moved.from.col;
        const dr = moved.to.row - moved.from.row;
        a.x += dc * HOME.cellSize;
        a.y += dr * HOME.cellSize;
        t = tileOf(a);
      }
      if (!t || grid.isBlocked(t.col, t.row)) {
        let best = null;
        let bestD = Infinity;
        for (let r = 0; r < MAX_FLOOR.rows; r++) for (let c = 0; c < MAX_FLOOR.cols; c++) {
          if (grid.isBlocked(c, r)) continue;
          const d = Math.abs(c - (t?.col ?? 0)) + Math.abs(r - (t?.row ?? 0));
          if (d < bestD) [best, bestD] = [{ col: c, row: r }, d];
        }
        if (best) a.placeAtTile(grid, best.col, best.row);
      }
      // a walk under way: the same destination by a new path (a spot that moved: its new tile)
      if (a.state === 'walking' && a.goal) a.walkTo(grid, a.goal.col, a.goal.row, a._onArrive);
    }
    for (const q of crew.people) if (q.task?.spot) crew.retarget(q.id, q.task.spot);
    // (Milestone 19: a Family Room visit carries on where they are: the room's tiles may have moved)
    for (const x of visitors) x.v.room = false;
    for (const p of residents) delete p.state.familyRoom;
    for (const p of residents) {
      const st = p.state;
      if (st.leaving || st.guest || !st.step || !(st.step.status === 'walking' || st.step.status === 'waiting')) continue;
      const step = dayStep(p, st.step.id, st.step.day);
      if (step) walkResident(p, step, st.step.day);
    }
    bus?.emit('home:layout', { version: layout.version });
  }
  // --- stages 3–5 and wings (Milestone 24) -----------------------------------------------------------------------------
  // What the next stage needs (Milestone 26: the real Rank, and C03 for Stage 3), plus a specialist program running
  // (Stage 4) or Year 13 (Stage 5).
  function upgradeStatus() {
    const next = STAGES[layout.stage] ?? null;
    if (!next) return { next: null, parts: [], ok: false, cost: 0, days: 0 };
    const parts = [{ text: `Rank ${next.unlock.value} (now Rank ${rankNow()})`, ok: rankAtLeast(rankNow(), next.unlock.value) }];
    if (next.unlock.accreditation) parts.push({ text: `The ${next.unlock.accreditationName} (${next.unlock.accreditation})`, ok: quality.won(next.unlock.accreditation) });
    if (next.unlock.check === 'program') parts.push({ text: 'A specialist program running', ok: Object.keys(progState.running).length > 0 });
    if (next.unlock.check === 'year') parts.push({ text: `Year ${next.unlock.year} or later (now Year ${clock.year})`, ok: clock.year >= next.unlock.year });
    // (Milestone 30b: Bolt's blessing — cheaper and quicker)
    return { next, parts, ok: parts.every((x) => x.ok), cost: boltCost(next.cost ?? 0), days: boltDays(next.buildDays ?? 0) };
  }
  // After a stage opens: the access check again; anything that fails (it shouldn't — the floor only grows) gets the M10
  // nudge fix-up, and the move is logged. → the moved pieces
  function afterUpgrade(stage) {
    if (!layout.problems().length) return [];
    const moved = layout.fixUp();
    relayout();
    care.layoutLog = [...(care.layoutLog ?? []), { day: clock.totalDays, stage: stage.n, moved }].slice(-10);
    return moved;
  }
  // The building site is done: the new floor opens, with its big moment.
  function finishBuilding() {
    const b = layout.building;
    if (!b || clock.totalDays < b.doneDay) return null;
    return world.build.upgrade();
  }
  // A wing's first hub inside it: its big moment (once per wing, ever, in this home).
  function wingOpened() {
    care.wingsOpened ??= [];
    for (const w of WINGS_SPECIAL) {
      if (care.wingsOpened.includes(w.id) || !layout.wings.active(w.id)) continue;
      care.wingsOpened.push(w.id);
      bus?.emit('home:wing', { wing: w.id, name: w.name, art: w.beat, hub: layout.wings.hubOf(w.id)?.name ?? null, later: w.later ?? null });
    }
  }
  // ?debug=1 "Fill to cap" (and the performance check): Stage 5 at once, a Memory and a High-Care wing with their hubs and
  // rooms, Standard Rooms up to the 70-room cap, every resident profile admitted (60: the roster has no more people), and
  // the team grown to about `staff` people across the three shifts. → a short report
  // (Milestone 28: `stage` stops at that stage — the M28 long run uses a full Stage 3 home)
  function fillToCap({ staff: staffTarget = 40, stage = STAGES.length } = {}) {
    const t0 = Date.now();
    ledger.economy.add('credits', 2e7, 'Debug: fill to cap', 'debug');
    layout.setDebugUnlock(true);
    while (layout.stage < Math.min(stage, STAGES.length)) {
      layout.setBuilding(null);
      if (!world.build.upgrade().ok) break;
    }
    const F = layout.floor;
    // the wings along the front: Memory on the left, High-Care on the right
    const front = { row: F.rows - 16, h: 16 };
    world.build.paintWing('memory', { col: 0, row: front.row, w: 30, h: front.h });
    world.build.paintWing('highCare', { col: 30, row: front.row, w: F.cols - 30, h: front.h });
    const tryAt = (defId, area, n) => {
      let placed = 0;
      for (let r = area.row; r + 6 <= area.row + area.h && placed < n; r += 8) {
        for (let c = area.col; c + 6 <= area.col + area.w && placed < n; c += 6) if (world.build.place(defId, c, r).ok) placed++;
      }
      return placed;
    };
    const place3 = (defId, area) => {
      for (let r = area.row; r < area.row + area.h - 3; r++) for (let c = area.col; c < area.col + area.w - 3; c++) if (world.build.place(defId, c, r).ok) return true;
      return false;
    };
    place3('F22', { col: 24, row: front.row + 8, w: 6, h: 8 });
    place3('F30', { col: F.cols - 6, row: front.row + 8, w: 6, h: 8 });
    tryAt('RM05', { col: 0, row: front.row, w: 30, h: front.h }, 8);
    tryAt('RM04', { col: 30, row: front.row, w: F.cols - 30, h: front.h }, 7);
    // Standard Rooms everywhere else that fits, up to the cap
    const cap = layout.cap;
    for (let r = 0; r < F.rows && roomList().length < cap; r += 2) {
      for (let c = 0; c + 6 <= F.cols && roomList().length < cap; c += 6) {
        if (!layout.fs.check('RM01', c, r, 0, null).ok) continue;
        if (layout.wings.wingAt(c, r)) continue;
        world.build.place('RM01', c, r);
      }
    }
    // the team, then everyone the home can take
    quality.setRankForTests('S');
    staffing.setCapForDebug(Math.max(staffTarget, team().length));
    staffing.setEliteUnlock(true);
    staffing.setDebug(true); // (every channel open)
    const shifts = ['morning', 'afternoon', 'night'];
    let i = 0;
    for (const d of staffing.eligibleNow()) {
      if (team().length >= staffTarget) break;
      if (world.hireDirectForTests(d.id, shifts[i % 3]).ok) i++;
    }
    // staff the wings as a player would: about one in eight to each specialist wing, one in eight a float
    team().forEach((q, k) => {
      if (k % 8 === 1) world.wings.setStaff(q.id, 'memory');
      else if (k % 8 === 2) world.wings.setStaff(q.id, 'highCare');
      else if (k % 8 === 3) roster.setFloat(q.id, true);
    });
    let admitted = 0;
    for (const def of RESIDENTS) {
      if (byResident(def.id) || !placesLeft()) continue;
      const s = admissions.state;
      s.applicants = s.applicants.filter((a) => a.id !== def.id);
      s.applicants.push({ id: def.id, status: 'board', arrived: clock.totalDays, leaveDay: clock.totalDays + 8, ...varied(def, seed, 900), assessed: false, assessReady: null, rolls: [900], stayDays: null, returning: false });
      if (world.admit(def.id).ok) admitted++;
    }
    layout.setDebugUnlock(false);
    return { stage: layout.stage, rooms: roomList().length, cap, residents: seated().length, admitted, staff: team().length, ms: Date.now() - t0, problems: layout.problems().length };
  }
  const pay = (amount, reason, category) => ledger.economy.add('credits', amount, reason, category);
  const occupant = (pieceId) => {
    const p = residents.find((x) => x.state.room === pieceId && !x.state.guest && !x.state.leaving);
    return p ? p.name : null;
  };
  layout.setUpgradeMods({ cost: boltCost, days: boltDays }); // (Milestone 30b: Bolt's blessing on level-ups)
  world.build = {
    // (Milestone 30b) what building this costs now (Bolt on the team: 15% less)
    costOf: (defId) => boltCost(layout.costOf(defId)),
    // Can this go here? (plus the money and the lock) → { ok, reason }
    check(defId, col, row, uid = null) {
      if (uid == null) {
        const u = layout.unlock(defId);
        if (!u.ok) return u;
        const cost = boltCost(layout.costOf(defId));
        if (ledger.balance < cost) return { ok: false, reason: `Not enough Credits: it costs ${cost.toLocaleString('en-GB')}` };
      }
      return layout.check(defId, col, row, uid);
    },
    place(defId, col, row) {
      const c = world.build.check(defId, col, row);
      if (!c.ok) return c;
      const r = layout.place(defId, col, row);
      if (!r.ok) return r;
      const cost = boltCost(layout.costOf(defId));
      pay(-cost, `Build: ${r.piece.name}`, 'build');
      // (Milestone 23: BrightHome's saving on a new room; a facility built counts for the equipment grant)
      if (roomById(defId)) partners?.noteSaving('roomBuildPct', cost, 'now');
      else partners?.record('facilityBuilt', { facility: defId });
      relayout();
      wingOpened(); // (Milestone 24: a wing's first hub — its big moment)
      bus?.emit('home:built', { id: r.piece.id, def: defId, cost });
      return { ...r, cost };
    },
    move(uid, col, row) {
      const r = layout.move(uid, col, row);
      if (!r.ok) return r;
      relayout({ moved: { from: r.from, to: { col, row }, box: r.piece.box } });
      for (const p of residents) if (p.state.room === r.piece.id) noteChange(memoryOf(p), 'room'); // (Milestone 17: their room moved)
      bus?.emit('home:moved', { id: r.piece.id });
      return r;
    },
    canSell: (uid) => layout.canSell(uid, { occupied: occupant }),
    sell(uid) {
      const r = layout.sell(uid, { occupied: occupant, day: clock.totalDays });
      if (!r.ok) return r;
      pay(r.refund, `Sold: ${r.piece.name} (50% back)`, 'sell');
      relayout();
      bus?.emit('home:sold', { id: r.piece.id, refund: r.refund });
      return r;
    },
    // The next stage at once (the tests, and Stage 1 → 2 as since Milestone 10). The floor grows; nothing moves; the
    // access check runs again (and the M10 nudge fix-up, logged, if anything ever failed).
    upgrade() {
      const r = layout.upgrade();
      if (!r.ok) return r;
      relayout();
      const fixed = afterUpgrade(r.stage);
      bus?.emit('home:stage', { stage: r.stage.n, name: r.stage.name, art: r.stage.art, fixed });
      return { ...r, fixed };
    },
    // Milestone 24: what the next stage needs → { next, parts: [{ text, ok }], ok (every part met), cost, days }
    upgradeStatus: () => upgradeStatus(),
    // Start building the next stage: its Credits now, its floor opens after its building days (none: at once). Its
    // unlock (Rank, accreditation, …) must be met; debug = ?debug=1 lets it through. → { ok, reason }
    startUpgrade({ debug = false } = {}) {
      const u = upgradeStatus();
      if (!u.next) return { ok: false, reason: 'The home is at its largest stage' };
      if (layout.building) return { ok: false, reason: `Stage ${layout.building.to} is being built: ready on day ${layout.building.doneDay + 1}` };
      if (!u.ok && !debug) return { ok: false, reason: u.parts.filter((x) => !x.ok).map((x) => x.text).join(' · ') };
      if (ledger.balance < u.cost) return { ok: false, reason: `Not enough Credits: it costs ${u.cost.toLocaleString('en-GB')}` };
      if (u.cost) pay(-u.cost, `Build: Stage ${u.next.n}, ${u.next.name}`, 'build');
      if (!u.days) return world.build.upgrade();
      layout.setBuilding({ to: u.next.n, startDay: clock.totalDays, doneDay: clock.totalDays + u.days });
      bus?.emit('home:building', { stage: u.next.n, name: u.next.name, doneDay: clock.totalDays + u.days });
      bus?.emit('home:layout', { version: layout.version }); // (the site appears)
      return { ok: true, reason: null, building: layout.building };
    },
    get building() {
      return layout.building;
    },
    // Wings (Milestone 24): paint (on) or clear (off) a rectangle of floor → { ok, reason, changed }
    paintWing(id, rect, on = true) {
      const r = layout.wings.paint(id, rect, on);
      if (r.ok) {
        relayout();
        wingOpened();
      }
      return r;
    },
    findSpot: (defId, near, uid) => layout.findSpot(defId, near, uid),
    setDebugUnlock: (on) => layout.setDebugUnlock(on),
    // --- Milestone 25c: levels 1–3 (data/facilities.js LEVELS) -------------------------------------------------------
    // What a piece's level is and what its next one needs → { level, max, mult, pending, next, nextMult, block, invested,
    // scaled } · block: why Upgrade can't be pressed now (null: it can)
    levelInfo(uid) {
      const p = layout.byUid(uid);
      if (!p) return null;
      const level = layout.levelOf(uid);
      const pending = layout.upgradePending(uid);
      const next = layout.nextUpgrade(uid);
      let block = null;
      if (pending) block = `Upgrading to Level ${LEVELS.names[pending.to - 1]}: ready on day ${pending.doneDay + 1}`;
      else if (!next) block = 'Already at the top level (III)';
      else if (next.rank && !rankAtLeast(rankNow(), next.rank) && !layout.debugUnlock) block = `Level ${LEVELS.names[next.level - 1]} needs Rank ${next.rank} (now Rank ${rankNow()})`;
      else if (ledger.balance < next.cost) block = `Not enough Credits: it costs ${next.cost.toLocaleString('en-GB')}`;
      return { level, max: LEVELS.max, mult: levelMultOf(p.defId, level), pending, next, nextMult: next ? levelMultOf(p.defId, next.level) : null, block, invested: layout.invested(uid), scaled: !LEVELS.unscaled.includes(p.defId) };
    },
    // Start the next level: its Credits now, done after its days (it works at its old level meanwhile). → { ok, reason }
    startLevel(uid) {
      const info = world.build.levelInfo(uid);
      if (!info) return { ok: false, reason: 'Nothing there' };
      if (info.block) return { ok: false, reason: info.block };
      const p = layout.byUid(uid);
      const r = layout.startUpgrade(uid, { today: clock.totalDays });
      if (!r.ok) return r;
      pay(-r.cost, `Upgrade: ${p.name} to Level ${LEVELS.names[r.level - 1]}`, 'build');
      bus?.emit('home:upgrading', { id: p.id, uid, name: p.name, level: r.level, doneDay: r.doneDay, cost: r.cost });
      return { ok: true, reason: null, ...r };
    },
    levelOf: (uid) => layout.levelOf(uid),
    upgradePending: (uid) => layout.upgradePending(uid),
  };
  if (fixedUp.length) relayout();
  if (qualityFresh) startQuality(); // (Milestone 26)
  // Milestone 29: the secrets (src/systems/secrets.js on core/SecretEngine): they only read the home (secretEnv) and give a
  // found secret's reward through a system that already exists. An older save: nothing found, its records from its history.
  care.secrets = ensureSecretsState(care.secrets);
  const secretEnv = {
    care,
    staffState,
    quality,
    economy,
    items,
    staffing,
    today: () => clock.totalDays,
    year: () => clock.year,
    daysPerMonth: clock.daysPerMonth,
    residentsHere: () => seated().filter((p) => joined(p)),
    team: () => team(),
    startingIds: () => openingTeam(staffState.founder.id),
    familiarityOf: (residentId, staffId) => familiarityOf(care, residentId, staffId),
    isMemorySupport: (residentId) => !!byResident(residentId) && isMemorySupport(byResident(residentId).def),
    familyTrust: () => homeTrust(care.families, seated().map((p) => p.id)),
    environment: () => environmentNow().score,
    capacity: () => seated().length + placesLeft(),
    stage: () => layout.stage,
    birthdaysHeld: () => acts.state.birthdays?.held ?? {},
    birthdayFirst: () => acts.state.birthdays?.first ?? null,
    ngPlus: () => ngPlus ?? 0,
    facilitiesAtLevel: (n) => layout.pieces.filter((pc) => facilityById(pc.defId) && !roomById(pc.defId) && (layout.levelOf(pc.uid) ?? 1) >= n).length, // (Milestone 30b: Bolt's secret)
    homeName: () => homeName ?? null,
    addRecognition: () => (staffState.founder.history.recognitions = (staffState.founder.history.recognitions ?? 0) + 1),
    // (Milestone 30: a special menu the team can make; a staff secret's named person arrives on the Recruit board)
    dietMadeByTeam: (residentId) => world.dietMadeByTeam(residentId),
    specialArrival: (staffId) => staffing.arrive(staffId),
    // (Milestone 30 Batch B: a resident's birthday — their age now — and the quiet group activities)
    birthdayOf: (residentId) => birthdayOf(residentId),
    isQuietActivity: (activityId) => !!activityById(activityId)?.quiet,
  };
  secrets = createSecrets({ env: secretEnv, state: care.secrets, rules: secretRules ?? undefined, bus, strict: secretsStrict, runId: runId ?? seed, account: secretsAccount });
  // (Milestone 31: a reload after a prestige award — its rewards again, keyed, so whichever half wasn't saved is put right)
  for (const id of quality.wonIds()) prestigeAwardRewards(accreditationById(id));
  // Milestone 32: achievements, Home Records, Memory Book milestones and the Staff Hall of Fame (src/systems/achievements.js):
  // they only read the home and the secrets' facts; a reward is a small Reputation lift or a cosmetic keepsake.
  care.achievements = ensureAchievementsState(care.achievements);
  const staffInfoOf = (q) => (q ? { id: q.id, name: q.model?.name ?? q.name, role: q.role, tier: q.model?.tier ?? staffById(q.id)?.tier ?? null, level: q.model?.level ?? 1, art: q.model?.art ?? staffById(q.id)?.art ?? null } : null);
  const achEnv = {
    care,
    secrets,
    runId: runId ?? seed,
    today: () => clock.totalDays,
    year: () => clock.year,
    monthOf: (day) => clock.dateOf(Math.max(0, day - 1)).month,
    homeName: () => homeName ?? null,
    ngPlus: () => ngPlus ?? 0,
    firsts: () => economy?.state?.firsts ?? [],
    residentsHere: secretEnv.residentsHere,
    residentArt: (id) => residentById(id)?.art ?? null,
    ageOf: (p) => ageNow(p, clock.totalDays, birthdayOf),
    team: () => team().map(staffInfoOf),
    staffInfo: (id) => staffInfoOf(crew.byId(id)),
    daysEmployed: (id) => (secrets.log.joined?.[id] == null ? 0 : Math.max(0, clock.totalDays - secrets.log.joined[id])),
    facilities: () => layout.pieces.filter((pc) => facilityById(pc.defId) && !roomById(pc.defId)).map((pc) => ({ uid: pc.uid, defId: pc.defId, name: facilityById(pc.defId).name, level: layout.levelOf(pc.uid) ?? 1 })),
    pieceOfSpot: (ref) => {
      const pc = layout.pieceOfSpot(ref);
      return pc && facilityById(pc.defId) && !roomById(pc.defId) ? { uid: pc.uid, defId: pc.defId, name: facilityById(pc.defId).name } : null;
    },
    addReputation: (amount, reason) => quality.addReputation(amount, clock.totalDays, reason),
    legacyEnding: () => false, // (Milestone 33: the Year-16 ending)
  };
  achievements = createCareAchievements({ env: achEnv, state: care.achievements, account: achievementsAccount, bus });
  directorLive = true; // (Milestone 28: from here on, every moment goes through the director)
  achievements.catchUp(); // (Milestone 32: an older home earns at once what it already has — quiet Inbox lines)
  return world;
}
