// CAREWORKS — boot (Milestone 0: project shell + campaign slots + Facility Setup; Milestone 2: the open campaign's
// world — the game clock and Arthur's day — saved by the series Autosave, plus a save at every band change).
// Starts the shared series engine from core/ (renderer, safe areas, fixed-step loop, input, router, assets, debug
// overlay, saves) and opens the Main Menu: Continue (the last-used slot) · Campaign Slots · New Game · Settings.
// New Game / an empty slot → Facility Setup → START FACILITY writes the slot's summary record and an empty campaign
// save (core/CampaignSlots, keys campaign_1 … campaign_4) and opens the placeholder home. Starting into an occupied
// slot asks first, naming that slot's facility and year.
// Milestone 5: the home gets the shared series bars (core/ui TopBar and BottomBar): date, Credits, Care Tokens, Rank,
// Pause / 1× (2× and 4× locked), Inbox and Help on top; Care · Staff · Develop · Quality · Business below (Care opens the
// resident list, Staff the team roster, the rest a sheet saying what will live there), a red dot on Care while a call
// bell rings or a missed task hasn't been looked at. Care pops (core/VfxSystem) and the end-of-day beat.
// Milestone 7: Staff opens the roster sheet — Morning / Afternoon / Night / Off columns (tap someone, then a column, to
// move them), a Safe Coverage bar per shift, Float toggles, the Night on-call flag and the coverage log; a red badge on
// Staff (and a banner in the home) while a shift is short or about to start short. The Ledger shows agency fees, care
// recovery and the unsafe-shift counter.
// Milestone 8: the Care Plan picker shows all eight options of a domain — greyed with the reason when not eligible,
// the resident's like / dislike / refusal marked; tapping one shows what it does and a Choose button (a disliked
// option says its Mood cost first). A plan due for review gets an amber dot on the card's Care Plan header, counts on
// Care's badge and is listed under Care → "Plans to review"; Reviewed clears it.
// Milestone 9: all 60 residents. Applicant and resident cards show the stay type and its length (Respite / Rehab end
// with "Arthur heads home", the room freed), a Returning tag, the life-story line and tags. ?debug=1 adds "Spawn all 60"
// under Care: a test home (never saved) where every resident comes in, walks to a spot and has their card opened once.
// Milestone 10: Develop opens Build Mode (rooms and facilities: place, move, sell for 50% back) and the home's stage
// (S2 "Locked — needs Rank D"; ?debug=1 upgrades now, and unlocks every room and facility). The Build list is a sheet
// of every room and facility with its picture, cost and effect (locked ones greyed with the reason; the two secret
// ones never listed). Selling asks first. Growing to Stage 2 plays the big "Expanded Care Home" moment.
// Milestone 11: Staff → Recruit (or the Reception / Family Desk): a board of three candidates from the channels (Local
// Applicants open; the ranked ones locked with the reason, ?debug=1 opens them), a free new board every 56 days and
// paid ones; each candidate's card (portrait, role, tier, level, stats, salary, trait, shift preference) with Hire —
// greyed at the Rank E cap of 12. The staff card gains Specialties, Training (a course list with what each would add,
// "Would reach cap" when the tier cap trims it) and Let go (asks first; the Founder twice).
// Milestone 20: Develop → Programs — the ten specialist programs (icon, focus, the unlock reason or Start, the staff hours
// against the roster, the weekly cost); a program's sheet says what it adds, who it suits and its effect, with Start /
// Stop. Running programs show on the facility they use, in the Ledger (a cost line) and on the roster (the hours they
// take); a resident's card shows their part in each. ?debug=1 unlocks the research / partner / wing ones.
// Milestone 21: Develop → Research — the queue at the top (progress, days left), the chosen node's card (cost, what it
// needs, what it opens or improves, Start), and six columns of node cards (one per branch: done glows green, locked
// says why when tapped). Research Points are on the Ledger (what earned them this month). ?debug=1 adds RP.
// Milestone 22: the economy. Business → Ledger: this month / last month for every income and cost line (with icons), a
// small 6-month balance line, Emergency Credit / Rescue Investor status. Offers arrive in the Inbox (Accept / Not now).
// Care Tokens on the top bar (shown only). Resident and applicant cards show the Support Level (from needs), its
// funding and its required care cost.
// Milestone 25c (series common features): a Menu button at the end of the bottom row opens the Menu sheet (every screen,
// each row opening the same sheet the art opens; core/ui/MenuSheet); a next-step hint line under the time line
// (core/ui/HintLine); the full series Settings list on core/Settings (this device, every home) with Low / Auto / High
// graphics (core/FrameGovernor), text size and vibration; facility and room levels (an Upgrade section on each sheet,
// a level badge and a scaffold in the home); the care-equipment store (items given from a staff card).
// Add ?debug=1 for the FPS/state overlay, ?screen=test for the scaling / tap / asset-loader test screen.
import { THEME, font, setTextScale } from '../../../core/Theme.js';
import { Settings } from '../../../core/Settings.js';
import { FrameGovernor } from '../../../core/FrameGovernor.js';
import { Haptics } from '../../../core/Haptics.js';
import { menuSheet } from '../../../core/ui/MenuSheet.js';
import { HintLine } from '../../../core/ui/HintLine.js';
import { registerItemArt, itemIcon } from '../../../core/ui/ItemArt.js';
import { MENU_GROUPS, MENU_TEXT, NEXT_HINTS } from '../data/menu.js';
import { SETTINGS, SETTINGS_DEFAULTS, SETTINGS_KEY, TEXT_SCALE, SETTINGS_TEXT } from '../data/settings.js';
import { ITEM_TYPES, ITEM_GROUPS, ITEM_RARITIES, ITEM_RULES, itemGroupById } from '../data/items.js';
import { LEVELS } from '../data/facilities.js';
import { EventBus } from '../../../core/EventBus.js';
import { Rng } from '../../../core/Rng.js';
import { Renderer } from '../../../core/Renderer.js';
import { UiLayout } from '../../../core/UiLayout.js';
import { Input } from '../../../core/Input.js';
import { ScreenRouter } from '../../../core/ScreenRouter.js';
import { AssetManager } from '../../../core/AssetManager.js';
import { FixedStepLoop } from '../../../core/FixedStepLoop.js';
import { DebugOverlay } from '../../../core/DebugOverlay.js';
import { SystemBack } from '../../../core/SystemBack.js';
import { createStorageAdapter } from '../../../core/StorageAdapter.js';
import { Autosave } from '../../../core/Autosave.js';
import { TextPrompt } from '../../../core/ui/TextPrompt.js';
import { BottomSheet } from '../../../core/ui/BottomSheet.js';
import { Dialog } from '../../../core/ui/Modal.js';
import { drawButton, hitRect, setPressPoint, clearPress } from '../../../core/ui/Button.js';
import { createTopBar } from '../../../core/ui/TopBar.js';
import { createBottomBar } from '../../../core/ui/BottomBar.js';
import { VfxSystem } from '../../../core/VfxSystem.js';
import { BOTTOM_SLOTS, bottomRoute, TOP_ICONS, RANK_NONE, CARE_ICONS, TOP_SHEETS, SPEED_LOCKED, PORTRAIT_CROP } from '../data/bars.js';
import { SCORES, RANK_OPENS, RANK_BEAT, SPEED_UNLOCKS, QUALITY_ART, INSPECTION } from '../data/quality.js';
import { accreditationById } from '../data/accreditations.js';
import { PEERS, peerById } from '../data/peers.js';
import { ECONOMY_START } from '../data/balance.js';
import { createCarePops, createDayBeat } from './ui/carePops.js';
import { ASSETS } from '../data/assets.js';
import { SAVE } from '../data/save.js';
import { createCampaigns } from './app/campaigns.js';
import { paletteById } from '../data/setup.js';
import { NEEDS, OUTCOMES, RESIDENTS, validateResidents, supportLevel, ROOM_TEMPLATES, STAYS } from '../data/residents.js';
import { DataValidator } from '../../../core/DataValidator.js';
import { ROUTINE, LOG_SHOWN, BANDS } from '../data/routine.js';
import { ROLES, STATS, TIERS } from '../data/roles.js';
import { TRAITS, STAFF, ALL_STAFF, GODS, staffById, validateStaff, checkStaffArt } from '../data/staff.js';
import { SHIFTS, FEES, SHORT_STAFFING, ON_CALL } from '../data/balance.js';
import { SHIFT_IDS, OFF, WINGS, AGENCY } from '../data/shifts.js';
import { ADMISSION } from '../data/admissions.js';
import { STAGES, LOGICAL_CAP, HOME } from '../data/home.js';
import { WINGS_SPECIAL, wingById } from '../data/wings.js';
import { CHANNELS, RANK_NOW } from '../data/recruitment.js';
import { SPECIALTIES } from '../data/training.js';
import { ROOMS, roomById } from '../data/rooms.js';
import { BUILDABLE_FACILITIES, PRESTIGE_FACILITIES } from '../data/facilities.js';
import { FOUNDERS } from '../data/setup.js';
import { DOMAINS, CARE_OPTIONS, optionById, optionsFor, validateCarePlans, OPTION_PREF_MOOD } from '../data/carePlans.js';
import { TASK_TYPES, BELL } from '../data/tasks.js';
import { clockText, wakeWindowOf } from './systems/residentNeeds.js';
import { WAKE } from '../data/routine.js';
import { CONTINUITY, FRIENDSHIP, ACTIVITY_GROUPS } from '../data/relationships.js';
import { ACTIVITIES, SCHEDULABLE, activityById, TIMETABLE, COMMUNITY_EVENTS } from '../data/activities.js';
import { facilityById } from '../data/facilities.js';
import { DIETS, dishById, dishesOf, mealById, SAT_REASONS, HYDRATION, KITCHENS, TROLLEYS } from '../data/dining.js';
import { AIDS, GOALS, DISCHARGE, REHAB_FUNDING } from '../data/mobility.js';
import { WALKING } from '../data/memory.js';
import { ACTIONS, ACTION_IDS, CLINICIAN, HOSPITAL } from '../data/clinical.js';
import { TRUST, MEETING, MEETING_ASK, COMPLAINT, COMPLAINTS, FIXES, REQUESTS, REQUEST, FAMILY_ICONS } from '../data/family.js';
import { yearsEmployed } from './systems/staffTeam.js';
import { LEDGER_ROWS, CLOSE_CATS, DEBT, ROOM_FEES } from '../data/economy.js';
import { TIERS as PARTNER_TIERS, GRANT_RULES, PILOT, partnerById, grantById, COUNTER_LABELS } from '../data/partners.js';
import { INCIDENTS, incidentById, SEVERITY, SUPPLIES, LEDGER_CATEGORY as LEDGER_CATEGORY_EMERGENCY } from '../data/incidents.js';
import { bandFor } from './systems/incidents.js';
import { levelOfNeeds, requiredCost, fundingOf } from './systems/economy.js';
import { VISIBLE_PROGRAMS, validatePrograms, dayList, LEDGER_CATEGORY } from '../data/programs.js';
import { unlockWords } from './systems/programs.js';
import { RESEARCH, BRANCHES, researchById, nodeLabel, validateResearch, QUEUES } from '../data/research.js';
import { FACILITIES } from '../data/facilities.js';
import { createHomeWorld, makeClock, theirOf } from './systems/homeWorld.js';
import { AccountBook } from '../../../core/AccountBook.js';
import { MajorFeedback } from '../../../core/MajorFeedback.js';
import { BOOK, MEMORIAL, PLAN as EOL_PLAN, ACCOUNT_KEY as EOL_ACCOUNT_KEY, COMFORT } from '../data/endOfLife.js';
import { ACCOUNT_KEY as ACH_ACCOUNT_KEY, ACH_TEXT, VISIBLE_COUNT, HALL } from '../data/achievements.js'; // (Milestone 32)
import { categoryById, INBOX as INBOX_RULES } from '../data/events.js';
import { BRAND, FIRST_ART, FIRSTS_TEXT, REWARD_ART, PLAQUES, CARE_FX, SCORE_ICONS, SECTION_ICONS, ART_CROP } from '../data/artMoments.js';
import { drawArtCrop } from './ui/careArt.js';
import { residentById } from '../data/residents.js';
import { createMenuScreen } from './screens/MenuScreen.js';
import { createSlotsScreen } from './screens/SlotsScreen.js';
import { createSetupScreen } from './screens/SetupScreen.js';
import { createHomeScreen } from './screens/HomeScreen.js';
import { createTestScreen } from './screens/TestScreen.js';
const COL = THEME.color;

const W = 1080;
const BASE_H = 1920; // 9:16; taller phones grow the height (see Renderer)
const MAX_H = 2640; // up to 9:22 fills edge to edge; taller still gets thin bars top and bottom
const PARAMS = new URLSearchParams(window.location.search);
const START_SCREEN = PARAMS.get('screen') === 'test' ? 'test' : 'menu';

const bus = new EventBus();
const rng = new Rng('careworks-m0');
const renderer = new Renderer(document.getElementById('game'), { width: W, height: BASE_H, maxHeight: MAX_H, maxDpr: 2, bus });
const layout = new UiLayout(renderer);
bus.on('renderer:resize', () => layout.refresh());
const input = new Input(renderer, bus);
const assets = new AssetManager({ bus });
const router = new ScreenRouter(bus, { roots: ['menu', 'test', 'home'] });
const dialog = new Dialog({ layout, assets }); // confirm boxes (delete / replace a slot)
const sheet = new BottomSheet({ layout, assets, onClose: () => homeScreen.selection.clear() }); // the home's ring goes with its sheet
const textPrompt = new TextPrompt({ renderer });
bus.on('screen:change', () => textPrompt.close());
bus.on('screen:change', () => sheet.close());
bus.on('renderer:resize', () => textPrompt.close());

// Sprites are cached at the screen's real pixel size: remake them when that changes.
assets.setPixelScale(renderer.pixelScale);
bus.on('renderer:resize', () => {
  assets.setPixelScale(renderer.pixelScale);
  debug.top = debugTop();
  if (router.currentName === 'home') homeScreen.resize();
});

// Pressed button look: any button under a finger that is down.
bus.on('input:down', (p) => setPressPoint(p, renderer.pixelScale));
bus.on('input:up', () => clearPress());
bus.on('input:dragstart', () => clearPress());

const onTestScreen = () => router.currentName === 'test';
const loop = new FixedStepLoop({
  stepHz: 60,
  bus,
  update: (dt) => {
    router.update(dt); // on the home: the clock and everyone in it move
    tickSpawnCheck(dt); // (?debug=1 "Spawn all 60", Milestone 9)
    if (open && router.currentName === 'home') open.data.playSec = (open.data.playSec ?? 0) + dt;
    vfx.update(dt); // real seconds: pops keep their pace at any game speed
    carePops.update(dt);
    dayBeat.update(dt);
    if (bigBeat && (bigBeat.age += dt) >= BIG_BEAT_LIFE) bigBeat = null;
    memorial.update(dt); // (Milestone 27: real time — the moment waits while the game is paused)
    tickMoments(dt); // (Milestone 28: the event director's moment on screen)
    autosave.tick(dt);
    hintLine.update(dt); // (Milestone 25c)
    dialog.update(dt);
    sheet.update(dt);
  },
  render: (alpha) => {
    const ctx = renderer.begin(COL.bg);
    router.render(ctx, alpha);
    sheet.render(ctx);
    if (router.currentName === 'home') drawBigBeat(ctx);
    dialog.render(ctx);
    if (memorial.active) {
      memorial.height = renderer.height;
      memorial.render(ctx); // (Milestone 27)
    }
    if (onTestScreen()) drawButton(ctx, pauseButton(), loop.paused ? 'RESUME' : 'PAUSE', { selected: loop.paused });
    if (loop.paused) drawPaused(ctx);
    debug.compact = sheet.active || !onTestScreen(); // one FPS line on the menus, the full box on the test screen
    debug.render(ctx);
  },
});
const debugTop = () => layout.safeRect.h - 600;
const debug = new DebugOverlay({ loop, renderer, layout, input, bus, top: debugTop(), maxLines: 3 });
bus.on('loop:pause', () => input.reset());
// Milestone 25c: the player's settings (core/Settings: this device, every home — never part of a slot). Graphics:
// core/FrameGovernor (Low = a steady 30 FPS; Auto drops to 30 when the phone struggles) — at 30, fewer effects (no care
// pops) and simpler figures (no sway or breathing). Text size → every font (core/Theme setTextScale). Vibration →
// core/Haptics. CAREWORKS has no sound yet (Milestone 38): the sound settings are kept and read all the same.
const settings = new Settings({ key: SETTINGS_KEY, defaults: SETTINGS_DEFAULTS });
const govMode = () => settings.get('fpsMode') ?? 'auto';
const governor = new FrameGovernor({ mode: govMode(), bus, capFps: true });
loop.governor = governor;
const lowFx = () => governor.state === 'half' && settings.get('fpsMode') !== 'high';
// Milestone 28b: the new care effects show only with Reduced flashes off and full graphics.
const fxOn = () => !lowFx() && !settings.get('reducedFlashes');
const haptics = new Haptics({ enabled: () => settings.get('haptics') !== false });
function applySettings() {
  setTextScale(TEXT_SCALE[settings.get('textSize')] ?? 1);
  if (governor.mode !== govMode()) governor.setMode(govMode());
}
applySettings();
settings.onChange((k) => {
  applySettings();
  if (k === 'showMenu') syncMenuSlot();
});
debug.log(`seeded rng check: ${rng.int(0, 9999)} (same every reload)`);

// ---------------------------------------------------------------------------
// Pause: the test screen's button pauses the whole loop (P / Space too); while paused any tap resumes. Hiding the app
// pauses the loop (core).
const pauseButton = () => layout.anchor('top-right', 240, THEME.button.minH, 80);
router.modal = {
  get active() {
    return loop.paused || dialog.active || memorial.active; // (Milestone 27: the memorial moment takes every tap)
  },
  onTap: (p) => (loop.paused ? loop.resume('tap') : dialog.active ? dialog.onTap(p) : memorial.onTap()),
  onDown: (p) => dialog.active && dialog.onDown?.(p),
  onUp: (p) => dialog.active && dialog.onUp?.(p),
  onBack: () => (loop.paused ? loop.resume('back') : dialog.active ? dialog.onBack() : memorial.onTap()),
};
window.addEventListener('keydown', (e) => {
  if (e.key !== 'p' && e.key !== 'P' && e.key !== ' ') return;
  if (textPrompt.active || dialog.active || !onTestScreen()) return;
  loop.togglePause();
});
function drawPaused(ctx) {
  const H = renderer.height;
  ctx.fillStyle = COL.overlay;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = COL.chip;
  ctx.beginPath();
  ctx.roundRect(W / 2 - 300, H / 2 - 90, 600, 220, THEME.panel.radius);
  ctx.fill();
  ctx.fillStyle = COL.textOnDark;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = font(96, true);
  ctx.fillText('PAUSED', W / 2, H / 2);
  ctx.font = font(THEME.size.body);
  ctx.fillText('tap to resume', W / 2, H / 2 + 80);
}

// The sheet is asked before the screen; the test screen's pause button before both.
router.layers.push(
  // Milestone 11: a double-tap on a station jumps the camera to it, even when its sheet has just slid up under the finger
  {
    get active() {
      return router.currentName === 'home';
    },
    handleInput: (hook, p) => hook === 'onTap' && homeScreen.doubleTap(p),
  },
  {
    get active() {
      return onTestScreen();
    },
    handleInput: (hook, p) => {
      if (hook !== 'onTap' || !hitRect(p, pauseButton())) return false;
      loop.pause('button');
      return true;
    },
  },
  {
    get active() {
      return sheet.active;
    },
    // On the home a tap on the top bar still reaches it (Pause, Inbox and Help work with a sheet up).
    handleInput: (hook, p) => (hook === 'onTap' && router.currentName === 'home' && !homeScreen.buildMode && topBar.contains(p) ? false : sheet.handleInput(hook, p)),
    onBack: () => sheet.onBack(),
  },
);

// Back (phone/browser Back, Esc, "‹ Back"): resume a paused loop, close the dialog / sheet, or go back a screen.
// Returns false at the Main Menu with nothing open, so the next Back leaves the app.
function back() {
  if (loop.paused) {
    loop.resume('back');
    return true;
  }
  return router.back();
}
const systemBack = new SystemBack({ onBack: back });
bus.on('input:up', () => systemBack.rearm()); // re-arm after any tap, in case a Back at the menu let it go

// ---------------------------------------------------------------------------
// Campaign slots (bible §3.5.9): four slots, each its own save + summary record; the account store is separate.
let campaigns = null;
let open = null; // { n, data, world } — the campaign on screen and its home world
let spawn = null; // Milestone 9: ?debug=1 "Spawn all 60" while it runs: { real (the campaign's world), world, ids, i, t, phase, errors, starts, report }

// A campaign's world (Milestone 2): its clock and the residents' saved states, the team from its Founder; Milestone 6:
// the applicant board and the ledger (an older save's ledger opens with its saved Credits).
function openRun(n, data) {
  const clock = makeClock(bus);
  if (data.clock) clock.load(data.clock);
  const world = createHomeWorld({ founderId: data.facility.founder?.id, clock, residents: data.residents, staff: data.staff, care: data.care, seed: data.seed, bus, admissions: data.admissions, ledger: data.ledger, layout: data.layout, startCredits: data.economy?.credits ?? ECONOMY_START.credits, ngPlus: data.ngPlus ?? 0, runId: data.seed, homeName: data.facility.name, secretsStrict: debug.enabled, secretsAccount, achievementsAccount }); // (Milestone 29: New Game+, the run's id, the secrets' account half; a bad secret rule stops ?debug=1; Milestone 32: the achievements' account half)
  world.secrets.setAccountStore({ save: (d) => saveSecretsAccount(d) });
  world.secrets.setAccountFacts({ memoryBook: () => memoryBook.count });
  world.achievements.setAccountStore({ save: (d) => saveAchievementsAccount(d) }); // (Milestone 32)
  world.achievements.bookChanged(); // (the Memory Book's milestones and #29, now its page count can be read)
  saveAchievementsAccount(world.achievements.accountData()); // (anything the home caught up on as it opened)
  if (world.fixedUp.length) debug.log(`layout fix-up: ${world.fixedUp.map((m) => m.id).join(', ')} moved`);
  if (debug.enabled && PARAMS.get('paused') === '1') clock.speed = 0; // ?debug=1&paused=1: open exactly as saved (tests)
  data.economy ??= { ...ECONOMY_START };
  open = { n, data, world, seenMissed: new Set() };
  keepPages(world.endOfLife.pages(), data.facility.name); // (Milestone 27: any page this campaign has that the account book hasn't)
  vfx.clear();
  carePops.clear();
  dayBeat.current = null;
}
// The run save: the page's campaign data with the world's clock and residents written in (and the slot's summary).
function saveRun() {
  const o = open;
  if (!o || spawn) return Promise.resolve(); // (the spawn check's test home is never saved)
  const c = o.world.clock;
  o.data = { ...o.data, ...o.world.serialize(), date: { year: c.year, month: c.month, day: c.day } };
  o.data.economy = { ...(o.data.economy ?? ECONOMY_START), credits: o.world.ledger.balance }; // (the ledger is the truth; this is the summary)
  o.world.achievements?.flush(); // (Milestone 32: records that only grew go to the account store with the run save)
  return campaigns.save(o.n, o.data);
}
// Autosave (core/Autosave): the series cadence (every game day, a rolling save, and when the app goes to the
// background) plus every band change, each routine step and a pause.
const autosave = new Autosave({
  bus,
  triggers: ['secret:found', 'secret:clue', 'clock:day', 'care:band', 'care:step', 'care:task', 'care:bell', 'care:plan', 'clock:speed', 'staff:onShift', 'staff:offShift', 'care:admit', 'care:joined', 'admissions:change', 'ledger:close', 'admissions:action', 'care:review', 'coverage:shift', 'coverage:warning', 'staff:agencyLeft', 'care:leaving', 'care:left', 'home:layout', 'home:stage', 'staff:hired', 'staff:letGo', 'staff:training', 'staff:trained', 'staff:left', 'care:birthday', 'care:ready', 'care:discharge', 'care:aid', 'care:walk', 'care:walkEnd', 'care:lifeStory', 'home:walkPath', 'care:alert', 'care:alertAction', 'care:alertEnd', 'care:transfer', 'care:back', 'care:roundIssue', 'care:stage', 'care:passed'],
  save: () => saveRun(),
  stamp: () => (open && !spawn ? JSON.stringify(open.world.serialize()) : null),
  running: () => !!open && !spawn && router.currentName === 'home' && !open.world.clock.paused,
  enabled: () => !!open && !spawn,
});
autosave.installBackground();
bus.on('autosave:failed', ({ error }) => debug.log(`save failed: ${error?.message ?? error}`));
bus.on('care:band', ({ band }) => debug.log(`band: ${band}`));

async function prepareSaves() {
  const adapter = await createStorageAdapter({ dbName: SAVE.dbName, prefix: SAVE.localPrefix });
  settings.attachStore(adapter, 'settings'); // (Milestone 25c: the settings slot in the account store too)
  campaigns = createCampaigns({ adapter, save: SAVE, bus });
  if (debug.enabled && PARAMS.get('reset') === '1') for (const n of campaigns.slots.numbers()) await campaigns.slots.remove(n);
  await campaigns.refresh();
  await loadMemoryBook(); // (Milestone 27: the account's Memory Book)
  await loadSecretsAccount(); // (Milestone 29: secrets found in any run, Prestige Tokens, records)
  await loadAchievementsAccount(); // (Milestone 32: achievements, account bests, the Hall of Fame, keepsakes)
  if (debug.enabled) {
    const r = validateResidents(new DataValidator(), RESIDENTS, ROUTINE.map((x) => x.id)).report();
    debug.log(r.ok ? `residents: ${RESIDENTS.length} checked` : `resident data: ${r.errors.join('; ')}`);
    if (!r.ok) console.error('[CAREWORKS] resident data', r.errors);
    const s = validateStaff(new DataValidator(), ALL_STAFF, { taskTypes: Object.keys(TASK_TYPES) }).report();
    debug.log(s.ok ? `staff: ${STAFF.length} checked` : `staff data: ${s.errors.join('; ')}`);
    if (!s.ok) console.error('[CAREWORKS] staff data', s.errors);
    const known = { taskTypes: Object.keys(TASK_TYPES), steps: ROUTINE.map((x) => x.id), bands: BANDS.map((b) => b.id), needs: NEEDS.map((n) => n.id), outcomes: OUTCOMES.map((o) => o.id), roles: Object.keys(ROLES) };
    const c = validateCarePlans(new DataValidator(), known).report();
    debug.log(c.ok ? `care options: ${CARE_OPTIONS.length} checked` : `care plan data: ${c.errors.join('; ')}`);
    if (!c.ok) console.error('[CAREWORKS] care plan data', c.errors);
    const pv = validatePrograms(new DataValidator(), { facilities: FACILITIES.map((f) => f.id), activities: ACTIVITIES.map((a) => a.id), options: CARE_OPTIONS.map((o) => o.id) }).report();
    debug.log(pv.ok ? `programs: ${VISIBLE_PROGRAMS.length} visible checked` : `program data: ${pv.errors.join('; ')}`);
    if (!pv.ok) console.error('[CAREWORKS] program data', pv.errors);
    const rv = validateResearch(new DataValidator(), { facilities: FACILITIES.map((f) => f.id), programs: VISIBLE_PROGRAMS.map((p) => p.id) }).report();
    debug.log(rv.ok ? `research: ${RESEARCH.length} nodes checked, no loops` : `research data: ${rv.errors.join('; ')}`);
    if (!rv.ok) console.error('[CAREWORKS] research data', rv.errors);
  }
}
const cards = () => campaigns?.cards ?? [];

// Reload mid-game (Milestone 1): this browser tab remembers which slot's home is open, so a reload comes straight back
// to it (the people start their loops again). A fresh launch of the app still opens the Main Menu.
const HOME_KEY = 'careworks:home';
function rememberHome(n) {
  try {
    if (n) sessionStorage.setItem(HOME_KEY, String(n));
    else sessionStorage.removeItem(HOME_KEY);
  } catch {}
}
function homeToResume() {
  try {
    const n = Number(sessionStorage.getItem(HOME_KEY));
    return n && campaigns?.card(n)?.summary ? n : null;
  } catch {
    return null;
  }
}

async function playSlot(n) {
  let data = null;
  try {
    data = await campaigns.open(n);
  } catch (err) {
    console.error('[CAREWORKS] could not load slot', n, err);
  }
  if (!data) {
    debug.log(`slot ${n}: nothing to load`);
    await campaigns.refresh();
    router.go('slots', { mode: 'browse' });
    return;
  }
  openRun(n, data);
  debug.log(`slot ${n} opened: ${data.facility.name}`);
  rememberHome(n);
  router.go('home');
}

// START FACILITY. An occupied slot (read fresh, in case it changed) asks first, naming its facility and year.
async function startFacility(n, setup) {
  await campaigns.refresh();
  const old = campaigns.card(n);
  const write = async () => {
    const data = await campaigns.start(n, setup);
    openRun(n, data);
    debug.log(`new facility in slot ${n}: ${setup.facility}, founder ${setup.founder}`);
    rememberHome(n);
    router.go('home');
  };
  if (old && !old.empty) {
    const was = old.summary ? `"${old.summary.facility}" (Year ${old.summary.year}, Month ${old.summary.month})` : 'the save in it';
    dialog.confirm({
      title: `Replace Slot ${n}?`,
      body: `Slot ${n} holds ${was}. Starting "${setup.facility}" here replaces it for good. Your account progress is kept.`,
      yes: 'Replace',
      danger: true,
      onYes: write,
    });
    return;
  }
  await write();
}

function deleteSlot(n) {
  const name = campaigns.card(n)?.summary?.facility;
  dialog.confirm({
    title: `Delete Slot ${n}?`,
    body: name ? `"${name}" will be gone for good. This can't be undone.` : 'This save will be gone for good.',
    yes: 'Delete',
    danger: true,
    onYes: async () => {
      await campaigns.remove(n);
      if (open?.n === n) open = null;
      debug.log(`slot ${n} deleted`);
    },
  });
}

// New Game: the first empty slot; when all four are full, pick one to replace.
function newGame() {
  const n = campaigns.firstEmpty();
  if (n != null) router.go('setup', { slot: n });
  else router.go('slots', { mode: 'new', note: 'All 4 slots are full. Pick one to replace.' });
}
function setupFor(n) {
  const c = campaigns.card(n);
  router.go('setup', { slot: n, replacing: c?.summary ?? null });
}

const menuScreen = createMenuScreen({
  layout,
  assets, // (Milestone 28b: the title logo)
  continueInfo: () => {
    const n = campaigns?.last;
    return n ? { n, summary: campaigns.card(n).summary } : null;
  },
  onContinue: (n) => playSlot(n),
  onSlots: () => router.go('slots', { mode: 'browse' }),
  onNewGame: () => newGame(),
  onSettings: () => openSettings(), // (Milestone 25c: the full series list)
});
const slotsScreen = createSlotsScreen({
  layout,
  assets, // (Milestone 28b: the art behind the slots, real Founder portraits, NG+ key art)
  cards,
  last: () => campaigns?.last ?? null,
  onBack: () => router.go('menu'),
  onPlay: (n) => playSlot(n),
  onDelete: (n) => deleteSlot(n),
  onNewInSlot: (n) => setupFor(n),
});
// Setup's Back: wherever it was opened from (the menu or the slot list). Not router.back(): that asks setup again.
function leaveSetup() {
  const to = router.backTarget;
  router.go(to?.name ?? 'menu', to?.params ?? {});
}
const setupScreen = createSetupScreen({ layout, assets, textPrompt, onBack: () => leaveSetup(), onStart: (n, setup) => startFacility(n, setup) });
// The home (Milestones 1–4). Tapping Arthur, a staff member or a place opens its sheet (rebuilt every frame, so it stays
// live). Arthur's card (Milestone 2): what he is doing now, his six needs and five outcomes as bars, today's log and
// his likes and dislikes; Milestone 3 adds who helps with each step (a picker, which since Milestone 4 pins that step's
// task). Milestone 4: the Care Plan section (six rows, each opening its domain's options), today's care tasks, the call
// bells (the last five and the average response) and Familiar Care. The room card names its resident.
// Milestone 5: the shared bars. The top bar reads the open run's clock through this stand-in (there is no run on the
// menus, and each campaign has its own clock).
const runClock = () => open?.world.clock ?? null;
const barClock = {
  get paused() {
    return runClock()?.paused ?? true;
  },
  get speed() {
    return runClock()?.speed ?? 0;
  },
  get speeds() {
    return runClock()?.speeds ?? [1, 2, 4];
  },
  get totalDays() {
    return runClock()?.totalDays ?? 0;
  },
  canUseSpeed: (s) => runClock()?.canUseSpeed(s) ?? false,
  togglePause: () => runClock()?.togglePause(),
  setSpeed: (s) => runClock()?.setSpeed(s),
  dateOf: (d) => runClock()?.dateOf(d) ?? { year: 1, month: 1, day: 1 },
};
const credits = (n) => `${n < 0 ? '−' : ''}${Math.abs(Math.round(n)).toLocaleString('en-GB')}`;
// Milestone 6: Credits from the ledger (red below zero — no debt system yet).
const balanceNow = () => open?.world.ledger.balance ?? ECONOMY_START.credits;
const topBar = createTopBar({
  layout,
  assets,
  clock: barClock,
  home: true,
  stats: () => {
    const e = open?.data.economy ?? ECONOMY_START;
    const b = balanceNow();
    return [
      { icon: TOP_ICONS.credits, text: credits(b), color: b < 0 ? COL.bad : COL.text, gap: 18 },
      { icon: TOP_ICONS.careTokens, text: String(open?.world?.economy?.tokens ?? e.careTokens ?? 0), gap: 18 }, // (Milestone 22: Care Tokens, shown only)
      { text: `Rank ${open?.world?.quality?.rank ?? RANK_NONE}` }, // (Milestone 26: the real Rank)
    ];
  },
  onStats: () => openLedger(),
  onInbox: () => openInbox(),
  inboxCount: () => inboxCountNow(), // (Milestone 25c: + new care equipment; inboxBase() below)
  onHelp: () => openTopSheet('help'),
  onLockedSpeed: (speed) => sheet.open(() => ({ title: `${speed}× speed`, subtitle: SPEED_UNLOCKS[speed]?.text ?? SPEED_LOCKED, accent: COL.progress, sections: [] })), // (Milestone 26: bible §3)
});
// Care's badge (Milestone 6: a count): the call bells ringing now plus the missed tasks today the player hasn't looked
// at yet (opening the resident list or a resident's card counts as looking).
const missedToday = () => open?.world.missedToday() ?? [];
// Milestone 18: alerts the home has noticed and nobody has chosen an action for yet
const alertsWaiting = () => open?.world?.clinical?.alerts().filter((a) => !a.pending).length ?? 0;
function careBadge() {
  if (!open) return null;
  const n = open.world.bells.length + missedToday().filter((t) => !open.seenMissed.has(t.id)).length + open.world.stalePlans().length + alertsWaiting(); // Milestone 8: + plans to review; Milestone 18: + alerts waiting
  return n || null;
}
// Staff's badge (Milestone 7): the shifts short now, or about to start short (from the band before).
const staffBadge = () => (open ? open.world.coverage.warnings().length || null : null);
const markMissedSeen = (residentId = null) => {
  for (const t of missedToday()) if (!residentId || t.resident === residentId) open?.seenMissed.add(t.id);
};
const bottomItems = BOTTOM_SLOTS.map((s) => ({ id: s.id, label: s.label, icon: s.icon, badge: s.id === 'care' ? careBadge : s.id === 'staff' ? staffBadge : s.id === 'quality' ? () => qualityBadge() : null })); // (Milestone 19: Quality — new complaints, and ones ready to mark done)
// Milestone 25c: the Menu button at the end of the bottom row (as in RACEWORKS and DEVWORKS): six thumb-sized buttons;
// Settings → "Show Menu button" Off takes it away (Settings stays on the main menu and in Help).
const MENU_SLOT = { id: 'menu', label: MENU_TEXT.button, icon: MENU_TEXT.icon, badge: null };
function syncMenuSlot() {
  const on = settings.get('showMenu') !== false;
  const i = bottomItems.indexOf(MENU_SLOT);
  if (on && i < 0) bottomItems.push(MENU_SLOT);
  if (!on && i >= 0) bottomItems.splice(i, 1);
}
syncMenuSlot();
const bottomBar = createBottomBar({
  layout,
  assets,
  items: bottomItems,
  open: (id) => openBottom(id),
});
const vfx = new VfxSystem({ assets, width: W, height: renderer.height, font: THEME.family, maxTexts: 4, maxEffects: 16 });
const dayBeat = createDayBeat();
// Milestone 25c: the next-step hint line (core/ui/HintLine; the rules are hintRules() below, first match wins)
const hintLine = new HintLine({ rect: () => homeScreen.rectOf('hint'), rules: hintRules(), quiet: () => !open || !!spawn || router.currentName !== 'home' || sheet.active || homeScreen.buildMode || settings.get('showHints') === false || !!bigBeat });
const homeScreen = createHomeScreen({ renderer, layout, assets, bus, sheet, campaign: () => open, world: () => open?.world ?? null, openSheet: (kind, id) => openHomeSheet(id), onMenu: () => leaveHome(), topBar, bottomBar, vfx, dayBeat, debug, onStaffWarning: () => openRoster(), onShop: () => openBuildList(), onSell: (it) => confirmSell(it), onWings: () => openWings(), hint: hintLine, prefs: { nameTags: () => settings.get('nameTags') !== false, taskMarkers: () => settings.get('taskMarkers') !== false, lowFx } });
const carePops = createCarePops({ bus, fxOn: () => fxOn(), world: () => open?.world ?? null, vfx, screen: homeScreen, isVisible: () => router.currentName === 'home' && !!open && !homeScreen.buildMode && !loop.paused && !lowFx() }); // (Milestone 25c: Low graphics — no pops)
// The end of each day: the medium beat ("Day 3 — all routine care done" / "2 tasks missed").
bus.on('care:dayEnd', (summary) => {
  if (!open || router.currentName !== 'home') return;
  const d = open.world.clock.dateOf(summary.day);
  if (!dayBeat.current && !bigBeat && !open.world.events?.showing) dayBeat.show(summary, `Day ${d.day}`); // (Milestone 28: never over a moment)
  debug.log(`day ${summary.day}: ${summary.done} done, ${summary.missed} missed`);
});
// Milestone 28: every moment (a welcome, a birthday, a first visit, an event, a stage, an upgrade…) now goes through the
// event director (src/systems/events.js, data/events.js): its words, category and weight are data there, and the screen
// shows only what the director hands it (presentMoment below). Here only the saves and the logs stay.
bus.on('care:admit', ({ name }) => debug.log(`admitted: ${name}`));
bus.on('care:leaving', ({ name, discharge }) => !discharge && debug.log(`went home: ${name}`));
bus.on('staff:hired', ({ name }) => debug.log(`hired: ${name}`));
bus.on('home:stage', ({ stage, fixed }) => {
  if (!open) return;
  if (fixed?.length) debug.log(`Stage ${stage}: ${fixed.length} piece(s) nudged to keep every path open`);
  autosave.request('stage');
});
bus.on('home:wing', () => open && autosave.request('wing'));
bus.on('care:incident', () => autosave.request('incident'));
bus.on('care:incidentEnd', () => autosave.request('incident'));
bus.on('home:upgrading', () => autosave.request('upgrade'));
bus.on('home:levelUp', () => autosave.request('levelUp'));
bus.on('items:arrived', () => autosave.request('item'));
// Milestone 12: ?debug=1 Fill roster (one beat for all of them — a debug action, not a moment)
bus.on('staff:filled', ({ ids }) => {
  if (open && router.currentName === 'home') dayBeat.showText(`Roster filled: ${ids.length} hired (debug)`, true);
  debug.log(`fill roster: ${ids.join(', ')}`);
});
bus.on('staff:trained', ({ name, course }) => debug.log(`trained: ${name} · ${course}`));
// The director's moment on screen: a big beat (the picture), a medium beat or a quiet line (the beat strip), or the one
// choice in play (a small card: Open shows the same sheet its art opens; Later leaves it in the Inbox) — or the memorial
// moment. Asked every frame; a beat never sits over a sheet or another pop-up (the director checks).
let shownMoment = null;
// Milestone 28b: care effects in the home (data/artMoments.js CARE_FX, the world layer like the M5 pops): a course
// finished (over the staff member), research done (over the Nurse Station), a compliment (over the resident). Never with
// Reduced flashes or Low graphics, one of a kind at a time, only while the home is on screen.
const fxSince = {};
const fxLog = []; // (tests: what showed)
function careFx(kind, plan, lift = 230) {
  const cfg = CARE_FX[kind];
  if (!cfg || !plan || !fxOn() || !open || spawn || router.currentName !== 'home') return false;
  const t = performance.now() / 1000;
  if (t - (fxSince[kind] ?? -1e9) < cfg.gap) return false;
  fxSince[kind] = t;
  const at = homeScreen.worldPointOf(plan.x, plan.y, lift);
  vfx.sprite('world', cfg.art, at.x, at.y, { size: cfg.size, life: cfg.life, from: 0.45, to: 1, rise: 40, hold: 0.5 });
  fxLog.push({ kind, t: +t.toFixed(2) });
  if (fxLog.length > 40) fxLog.shift();
  return true;
}
const agentAt = (a) => (a ? { x: a.agent.x, y: a.agent.y } : null);
const pieceCentre = (pc) => (pc ? { x: (pc.fp.col + pc.fp.w / 2) * HOME.cellSize, y: (pc.fp.row + pc.fp.h / 2) * HOME.cellSize } : null);
bus.on('staff:trained', ({ id }) => careFx('training', agentAt(open?.world?.byId(id))));
bus.on('research:complete', () => careFx('research', pieceCentre(open?.world?.placed.find((x) => x.defId === 'F01')), 200));
bus.on('care:compliment', ({ resident }) => careFx('compliment', agentAt(open?.world?.residentById(resident))));
function momentUi() {
  return { home: !!open && !spawn && router.currentName === 'home', sheet: sheet.active || homeScreen.buildMode, popup: dialog.active || memorial.active || loop.paused || textPrompt.active };
}
function tickMoments(dt) {
  const ev = open?.world?.events;
  if (!ev) return;
  const cur = ev.uiTick(dt, momentUi());
  if ((cur?.uid ?? null) === (shownMoment?.uid ?? null)) return;
  if (shownMoment && bigBeat?.uid === shownMoment.uid) bigBeat = null; // (closed early: a sheet opened)
  shownMoment = cur;
  if (cur) presentMoment(cur, ev);
}
function presentMoment(m, ev) {
  if (m.weight === 'big') bigBeat = { uid: m.uid, title: m.title ?? '', text: m.text, art: m.art, badge: m.badge ?? null, aura: !!m.aura, confetti: m.kind === 'quality:award', age: 0 };
  else if (m.weight === 'medium' || m.weight === 'quiet') dayBeat.showText(m.text, m.good);
  else if (m.weight === 'blocking') {
    if (m.choice?.kind === 'memorial') return showMemorial(m.payload, m.uid);
    dialog.confirm({ title: m.title ?? categoryById(m.cat)?.name ?? 'Inbox', body: m.text.replace(/ \(Inbox\)$/, ''), yes: 'Open', no: 'Later', onYes: () => {
      ev.later(m.uid);
      openTarget(m.opens);
    }, onNo: () => ev.later(m.uid) });
  }
  if (m.haptic) haptics.medium();
}
// Where a moment or an Inbox line leads: the same sheet its art (or its Menu row) opens.
function openTarget(o) {
  if (!o) return openInbox();
  if (o.type === 'resident' || o.type === 'staff') return open?.world?.byId(o.id) ? openHomeSheet(o.id) : openInbox();
  if (o.type === 'complaints') return openComplaints();
  if (o.type === 'wings') return openWings();
  if (o.type === 'inbox') return openInbox();
  return (MENU_OPEN[o.type] ?? openInbox)();
}

// Where each bottom-bar slot goes (data/bars.js).
function openBottom(id) {
  if (id === 'menu') return void (open && openNavMenu()); // (Milestone 25c)
  const r = bottomRoute(id);
  if (!r || !open) return;
  if (r.sheet === 'residents') openResidents();
  else if (r.sheet === 'roster') openRoster();
  else if (r.slot.id === 'business') openBusiness();
  else if (r.slot.id === 'develop') openDevelop();
  else if (r.slot.id === 'quality') openQuality(); // (Milestone 26: scores, Rank, accreditation, benchmark, inspections)
  else openPlaceholder(r.slot);
  lastRoute = r.sheet;
}
let lastRoute = null;
const accentNow = () => (open ? paletteById(open.data.facility.palette).hex : COL.progress);
const first = (name) => name.split(' ')[0].replace(/,$/, ''); // (Milestone 30b: a Works God's name → Bolt)
const needName = (id) => NEEDS.find((n) => n.id === id)?.name ?? id;
const stepName = (id) => ROUTINE.find((s) => s.id === id)?.name ?? id;
// Care: every resident (portrait; the call-bell icon while theirs rings) and the Admissions row (Milestone 6).
function openResidents() {
  markMissedSeen();
  sheet.open(() => {
    const w = open?.world;
    if (!w) return { title: '', sections: [] };
    const missedBy = (id) => missedToday().filter((t) => t.resident === id).length;
    const rows = w.residents.map((a) => {
      const bell = w.bellFor(a.id);
      const missed = missedBy(a.id);
      const sub = bell ? `Call bell ringing · ${w.stateOf(a)}` : missed ? `${missed} missed today · ${w.stateOf(a)}` : w.stateOf(a);
      return { id: `resident:${a.id}`, label: a.name, sub, icon: a.art, iconCrop: PORTRAIT_CROP, iconBadge: bell ? CARE_ICONS.bell : null, accent: bell || missed ? COL.action : COL.progress, onTap: () => openFrom(a.id, 'residents') };
    });
    const adm = w.admissions;
    const free = w.freeRooms().length;
    const n = w.residents.length;
    return {
      title: 'Residents',
      subtitle: `${n} resident${n === 1 ? '' : 's'} · ${free} of ${w.rooms.length} rooms free · tap someone for their card and care plan`,
      art: 'care_ui_01',
      accent: accentNow(),
      sections: [
        { columns: 1, buttons: rows },
        ...(() => {
          const stale = w.stalePlans();
          return stale.length
            ? [{ title: 'Plans to review', titleDot: COL.warn, columns: 1, buttons: stale.map((x) => {
              const r = w.residentById(x.resident);
              return { id: `review:${r.id}`, label: r.name, sub: x.reasons[0].text + (x.reasons.length > 1 ? ` (+${x.reasons.length - 1} more)` : ''), icon: r.art, iconCrop: PORTRAIT_CROP, accent: COL.warn, onTap: () => openFrom(r.id, 'residents') };
            }) }]
            : [];
        })(),
        { title: 'Activities', columns: 1, buttons: [{ id: 'care:activities', label: 'Activities', sub: activitiesSub(w), icon: 'care_ui_01', accent: COL.action, onTap: () => openActivities() }] },
        // Milestone 15: meals — the Dining Room card (satisfaction, the kitchen, the weekly menu)
        { title: 'Meals', columns: 1, buttons: [{ id: 'care:meals', label: 'Meals and the menu', sub: mealsSub(w), icon: TROLLEYS.meal, accent: COL.action, onTap: () => {
          const room = w.placed.find((x) => x.defId === 'F03');
          if (room) openHomeSheet(room.id);
        } }] },
        { title: 'Admissions', columns: 1, buttons: [{ id: 'admissions', label: 'Admissions', sub: `${adm.board.length} applying · ${adm.waiting.length} on the waiting list`, icon: CARE_ICONS.admissions, badge: adm.board.length || null, accent: COL.action, onTap: () => openAdmissions() }] },
        ...(debug.enabled && !spawn ? [{ title: 'Debug', columns: 1, buttons: [{ id: 'debug:spawn60', label: 'Spawn all 60', sub: 'A test home (never saved): everyone comes in, walks to a spot, has their card opened once, then it clears', accent: COL.progress, onTap: () => startSpawnCheck() }] }] : []),
      ],
    };
  });
}
// Staff (Milestone 7): the roster sheet. Three shift columns and Off, each with who is on it (portrait + role badge);
// tap someone, then a column, to move them. A Safe Coverage bar per shift (green ≥ 100%, amber 80–99%, red below), the
// warnings, a Float toggle and card per team member, the Night on-call flag and the coverage log.
const shiftTime = (sid) => `${clockText(SHIFTS[sid].from)}–${clockText(SHIFTS[sid].to)}`;
const COVER_COLOUR = { good: COL.good, amber: COL.gold, red: COL.bad };
const PREF_WORD = { morning: 'Morning', afternoon: 'Afternoon', night: 'Night' };
// "Afternoon: nobody to serve lunch or the evening meal (no Hospitality worker; carers serve when they are free)"
function mealCoverText(m) {
  const names = m.meals.map((id) => mealById(id).name.toLowerCase());
  const meals = names.length > 1 ? `${names.slice(0, -1).join(', ')} or the ${names[names.length - 1]}` : names[0];
  return m.level === 'none' ? `${SHIFTS[m.shift].name}: nobody to serve ${meals}` : `${SHIFTS[m.shift].name}: nobody to serve ${meals} (no Hospitality worker; carers serve when they are free)`;
}
const PEAK_WORDS = { wake: 'wake-ups', meal: 'meals', meds: 'medicine rounds', personal: 'personal care', activity: 'activities', observation: 'health checks', settle: 'settling', bell: 'call bells', roomCheck: 'room checks' };
let rosterPick = null; // the team member picked to move
let wingPick = null; // (Milestone 24: the team member picked to assign to a wing)
function openRoster() {
  rosterPick = null;
  wingPick = null;
  let message = null;
  sheet.open(() => {
    const w = open?.world;
    if (!w) return { title: '', sections: [] };
    const r = w.roster;
    const cov = w.coverage;
    const status = cov.status();
    const warns = cov.warnings();
    const t = w.clock.totalDays * 24 + w.hour;
    const picked = rosterPick && w.byId(rosterPick);
    const lines = [];
    if (message) lines.push({ text: message, color: COL.bad });
    for (const a of warns) lines.push({ text: `${SHIFTS[a.shift].name} ${a.running ? 'is running short' : `starts short at ${clockText(SHIFTS[a.shift].from)}`}: ${a.reasons.join(', ')}.`, color: COL.bad });
    // Milestone 16 (fix first): a shift with nobody to serve its meal (amber, like the coverage warnings; no automatic fix)
    for (const m of w.mealCover()) lines.push({ text: mealCoverText(m), color: COL.warn });
    // Milestone 20: the staff hours the running programs take from each shift
    for (const u of w.programs.useByShift()) lines.push({ text: `Programs use ${u.hours} h a week of ${u.roles.map((x) => ROLES[x].short).join(' / ')} time on ${SHIFTS[u.shift].name} (${u.ids.map((id) => w.programs.byId(id).name).join(', ')})`, color: COL.actionDark });
    lines.push({ text: picked ? `Moving ${first(picked.name)}: tap Morning, Afternoon, Night or Off.` : 'Tap someone, then a shift (or Off), to move them. Off shift they rest in the Staff Room.', color: COL.textMuted });
    // One card per person working (or rostered on) each shift; agency workers and float cover for the shift now / next.
    const card = (p, sid) => {
      const ag = r.agencyOf(p.id);
      const cover = !ag && sid !== OFF && r.shiftOf(p.id)?.id !== sid;
      const tag = r.isTraining(p.id) ? 'TRAINING' : ag ? 'AGENCY' : cover ? 'COVER' : r.isFloat(p.id) ? 'FLOAT' : null;
      return {
        id: `roster:${sid}:${p.id}`,
        label: first(p.name),
        sub: `${ROLES[p.role].short} · E ${Math.round(p.model.energy)}`,
        icon: p.art,
        iconCrop: PORTRAIT_CROP,
        iconBadge: ROLES[p.role].badge,
        tag,
        selected: rosterPick === p.id,
        accent: p.model.status.tired || p.model.status.stressed ? COL.action : COL.progress,
        onTap: () => {
          message = null;
          if (ag || cover) message = ag ? 'Agency cover is booked for this shift only: they leave when it ends.' : `${first(p.name)} is covering this shift as a float; their own shift is ${r.shiftOf(p.id)?.name ?? 'Off'}.`;
          else rosterPick = rosterPick === p.id ? null : p.id;
        },
      };
    };
    const lanes = [...SHIFT_IDS, OFF].map((sid) => {
      const a = status.find((x) => x.shift === sid);
      const ids = sid === OFF ? w.team.filter((p) => !r.shiftOf(p.id) || r.isTraining(p.id)).map((p) => p.id) : a.staff; // (Milestone 11: trainees under Off)
      const people = ids.map((id) => w.byId(id)).filter(Boolean);
      return {
        id: `lane:${sid}`,
        title: sid === OFF ? 'Off' : SHIFTS[sid].name,
        sub: sid === OFF ? `${people.length} resting` : `${shiftTime(sid)} · ${a.pct}%`,
        accent: sid === OFF ? COL.progress : COVER_COLOUR[a.safe ? 'good' : a.colour === 'good' ? 'red' : a.colour],
        selected: !!picked && (sid === OFF ? !r.shiftOf(picked.id) : r.shiftOf(picked.id)?.id === sid),
        empty: sid === OFF ? 'Nobody off' : 'Nobody on',
        items: people.map((p) => card(p, sid)),
        onTap: () => {
          message = null;
          if (!rosterPick) {
            message = 'Tap someone first, then the shift to move them to.';
            return;
          }
          const res = w.moveStaff(rosterPick, sid);
          if (!res.ok) message = res.reason;
          else autosave.request('roster');
          rosterPick = null;
        },
      };
    });
    const bars = status.map((a) => ({ label: `${SHIFTS[a.shift].name} ${shiftTime(a.shift)}`, value: a.provided, max: Math.max(a.required, 0.1), color: COVER_COLOUR[a.colour], text: `${a.pct}%` }));
    const detail = status.map((a) => {
      const T = SHIFTS[a.shift];
      const rn = a.rnOn ? 'RN on shift' : a.onCallUsed ? 'RN on call' : T.clinical?.rn ? 'no RN' : 'no RN needed';
      const call = a.onCallPoints ? ` (${a.onCallPoints.toFixed(1)} from the nurse on call)` : '';
      return { text: `${T.name}: needs ${a.required.toFixed(1)} points, has ${a.provided.toFixed(1)}${call} · ${rn} · busiest with ${T.peaks.map((k) => PEAK_WORDS[k] ?? k).join(', ')}`, color: a.safe ? COL.textMuted : COL.bad };
    });
    // Milestone 24: the wings — a lane for the Home wing, each painted wing and the floats; tap someone, then a lane, to
    // assign them. Safe Coverage per wing on each shift (floats and agency are shared where a wing is short).
    const painted = WINGS.filter((x) => x.id === 'home' || w.layout.wings.count(x.id));
    const wingLanes = [...painted.map((x) => x.id), 'float'].map((wid) => {
      const people = w.team.filter((p) => (wid === 'float' ? r.isFloat(p.id) : !r.isFloat(p.id) && r.assignedWing(p.id) === wid));
      const name = wid === 'float' ? 'Floats' : WINGS.find((x) => x.id === wid).short;
      return {
        id: `wlane:${wid}`,
        title: name,
        sub: wid === 'float' ? 'Any wing, any short shift' : ((n) => `${n} resident${n === 1 ? '' : 's'}`)(w.wings.list().find((x) => x.def.id === wid)?.residents ?? w.residents.filter((p) => !p.state.leaving && !p.state.guest && w.wings.ofResident(p.id) === 'home').length),
        accent: COL.progress,
        selected: !!wingPick && (wid === 'float' ? r.isFloat(wingPick) : !r.isFloat(wingPick) && r.assignedWing(wingPick) === wid),
        empty: 'Nobody',
        items: people.map((p) => ({ id: `wing:${wid}:${p.id}`, label: first(p.name), sub: `${ROLES[p.role].short} · ${r.shiftOf(p.id)?.name ?? 'Off'}`, icon: p.art, iconCrop: PORTRAIT_CROP, iconBadge: ROLES[p.role].badge, selected: wingPick === p.id, accent: COL.progress, onTap: () => {
          message = null;
          wingPick = wingPick === p.id ? null : p.id;
        } })),
        onTap: () => {
          message = null;
          if (!wingPick) {
            message = 'Tap someone first, then the wing to assign them to.';
            return;
          }
          const res = wid === 'float' ? w.setFloat(wingPick, true) : w.wings.setStaff(wingPick, wid);
          if (res && res.ok === false) message = res.reason;
          else autosave.request('roster');
          wingPick = null;
        },
      };
    });
    const wingCover = status.flatMap((a) => (a.wings?.length > 1 ? a.wings.map((x) => ({ text: `${SHIFTS[a.shift].name} · ${x.name}: ${x.pct}% (its staff ${x.own.toFixed(1)}${x.pooled ? ` + ${x.pooled.toFixed(1)} shared` : ''} of ${x.required.toFixed(1)})`, color: x.pct >= 100 ? COL.textMuted : x.pct >= 80 ? COL.warn : COL.bad })) : []));
    const teamRows = [];
    for (const p of w.team) {
      const m = p.model;
      const pref = staffById(p.id)?.shiftPref;
      const shift = r.shiftOf(p.id);
      teamRows.push({ id: `staff:${p.id}`, label: p.name, sub: `${shift ? shift.name : 'Off'} · likes ${PREF_WORD[pref] ?? '—'} · E ${Math.round(m.energy)} · M ${Math.round(m.morale)}`, icon: p.art, iconCrop: PORTRAIT_CROP, iconBadge: ROLES[m.role].badge, accent: m.status.tired || m.status.stressed ? COL.action : COL.progress, onTap: () => openFrom(p.id, 'roster') });
      const float = r.isFloat(p.id);
      teamRows.push({ id: `float:${p.id}`, label: `Float: ${float ? 'On' : 'Off'}`, sub: float ? 'Not tied to a wing · covers short shifts' : `${WINGS.find((x) => x.id === r.assignedWing(p.id))?.short ?? 'No'} wing`, accent: float ? COL.good : COL.progress, onTap: () => {
        w.setFloat(p.id, !float);
        autosave.request('roster');
      } });
    }
    const hist = [...cov.state.history].reverse().slice(0, 3).map((h) => ({ text: `Day ${w.clock.dateOf(h.day).day} ${SHIFTS[h.shift].name}: ${h.before}%${h.steps.length ? ` → ${h.steps.map((x) => ({ float: 'float', agency: 'agency', scaleBack: 'scaled back', unsafe: 'unsafe' })[x]).join(', ')} → ${h.after}%` : ''}`, color: h.safe ? COL.textMuted : COL.bad }));
    const log = [...cov.state.log].reverse().slice(0, 6).map((l) => ({ text: `Day ${w.clock.dateOf(l.day).day} ${l.t} · ${l.text}`, color: /Warning|Unsafe|scaled|No agency/.test(l.text) ? COL.bad : COL.text }));
    return {
      title: 'Roster',
      subtitle: `Staff ${w.team.length} / ${w.staffing.cap} · three shifts · Safe Coverage for each`,
      art: 'care_ui_02',
      accent: accentNow(),
      sections: [
        { lines, lanes },
        { columns: 1, buttons: [{ id: 'recruit', label: 'Recruit', sub: `${w.staffing.board.length} candidates · Staff ${w.team.length} / ${w.staffing.cap} (Rank ${RANK_NOW})`, icon: 'care_ui_02', accent: COL.action, onTap: () => openRecruit() }] },
        { title: 'Safe Coverage', bars, lines: withGlyph(detail, SECTION_ICONS.coverage) },
        ...(painted.length > 1 ? [{ title: 'Wings', lines: [{ text: 'Staff in a wing care for its residents first; floats (and agency) go where a wing is short.', color: COL.textMuted }, ...wingCover], lanes: wingLanes }] : []), // (Milestone 24)
        { title: 'Team', columns: 2, buttons: teamRows },
        {
          title: 'Continuity groups',
          lines: [{ text: `Pin a team member to up to ${CONTINUITY.maxResidents} residents: they are preferred for them when on shift, so familiarity builds. Safety, skills and urgency still come first.`, color: COL.textMuted }],
          columns: 1,
          buttons: w.team.map((p) => {
            const grp = w.continuityOf(p.id);
            return { id: `group:${p.id}`, label: `${first(p.name)}'s residents`, sub: grp.length ? grp.map((id) => first(w.residentById(id)?.name ?? id)).join(', ') : 'None pinned', icon: p.art, iconCrop: PORTRAIT_CROP, iconBadge: ROLES[p.role].badge, accent: grp.length ? COL.good : COL.progress, onTap: () => openContinuity(p.id) };
          }),
        },
        {
          title: 'Nurse on call',
          lines: [{ text: `While the home is small and nobody needs much clinical care, a Registered Nurse on call covers the RN rule and adds cover. Afternoon: up to ${ON_CALL.maxResidents.afternoon} residents.`, color: COL.textMuted }],
          columns: 1,
          buttons: [
            { id: 'onCall', label: `RN on call at night: ${r.onCall ? 'On' : 'Off'}`, sub: r.onCall ? 'A Registered Nurse on the team answers the phone at night' : 'Night then needs an RN on shift', accent: r.onCall ? COL.good : COL.progress, onTap: () => {
              w.setOnCall(!r.onCall);
              autosave.request('roster');
            } },
            { id: 'onCallAfternoon', label: `RN on call in the afternoon: ${r.onCallFor('afternoon') ? 'On' : 'Off'}`, sub: r.onCallFor('afternoon') ? 'Covers the Afternoon while the home is small' : 'The Afternoon then needs an RN on shift', accent: r.onCallFor('afternoon') ? COL.good : COL.progress, onTap: () => {
              w.setOnCall(!r.onCallFor('afternoon'), 'afternoon');
              autosave.request('roster');
            } },
          ],
        },
        { title: 'Coverage log', lines: log.length ? [...hist, ...log] : [{ text: 'Nothing yet: every shift so far started safe.', color: COL.textMuted }] },
        ...(debug.enabled ? [{ title: 'Debug', columns: 1, buttons: [{ id: 'roster:fill', label: `Fill roster (debug): hire up to ${w.staffing.cap}`, sub: 'Hires eligible staff from the open channels, each on their preferred shift (open every channel under Recruit for Rare)', accent: COL.progress, disabled: w.team.length >= w.staffing.cap, onTap: () => {
          const ids = w.fillRoster();
          message = ids.length ? null : 'Nobody eligible to hire (or the team is full).';
          if (ids.length) autosave.request('roster');
        } }] }] : []),
      ],
    };
  });
}
// --- Activities (Milestone 14, bible §20) -----------------------------------------------------------------------------
const SLOT_WORD = { morning: 'Morning', afternoon: 'Afternoon' };
const dayName = (w, day) => TIMETABLE.days[((day % 7) + 7) % 7];
function activitiesSub(w) {
  const s = w.sessionToday('afternoon');
  const a = s && activityById(s.activity);
  return a ? `Today: ${a.name} this afternoon · ${Object.values(s.choices).filter((c) => c !== 'decline').length} signed up` : 'Nothing on this afternoon: free time';
}
// Who's signed up for a session: joins, maybes, and who chose free time.
function signupLines(w, s) {
  if (!s) return [{ text: 'Free time: nothing on the timetable', color: COL.textMuted }];
  const a = activityById(s.activity);
  const by = (c) => Object.entries(s.choices).filter(([, v]) => v === c).map(([id]) => first(w.residentById(id)?.name ?? id));
  const where = a.where.facility !== 'F05' && !w.layout.ofDef(a.where.facility).length ? ` (in the ${a.where.place === 'dining' ? 'Dining Room' : 'lounge'} until a ${facilityById(a.where.facility)?.name} is built)` : '';
  const title = s.birthday ? `${first(w.residentById(s.birthday)?.name ?? '')}'s birthday tea` : s.event ? `${COMMUNITY_EVENTS.find((e) => e.id === s.event)?.name}` : a.name;
  return [
    { text: `${SLOT_WORD[s.slot]} ${clockText(TIMETABLE.slots[s.slot].at)}: ${title} · led by ${a.leaders.map((r) => ROLES[r].short).join(' / ')}${where}`, color: COL.actionDark },
    `Joining: ${by('join').join(', ') || 'nobody yet'}${by('maybe').length ? ` · maybe: ${by('maybe').join(', ')}` : ''}`,
    ...(by('decline').length ? [{ text: `Free time instead: ${by('decline').join(', ')} (their choice)`, color: COL.textMuted }] : []),
  ];
}
function openActivities() {
  sheet.open(() => {
    const w = open?.world;
    if (!w) return { title: '', sections: [] };
    const day = w.clock.totalDays;
    const tt = w.activities.timetable();
    const today = ((day % 7) + 7) % 7;
    const rows = [];
    for (let i = 0; i < 7; i++) {
      const dow = (today + i) % 7;
      for (const slot of Object.keys(TIMETABLE.slots)) {
        const a = tt[dow][slot] ? activityById(tt[dow][slot]) : null;
        rows.push({ id: `slot:${dow}:${slot}`, label: `${TIMETABLE.days[dow]}${i === 0 ? ' (today)' : ''} · ${SLOT_WORD[slot]}`, sub: a ? `${a.name} · ${a.leaders.map((r) => ROLES[r].short).join(' / ')}` : 'Free time', icon: a?.prop ?? null, accent: a ? COL.good : COL.progress, onTap: () => openSlotPicker(dow, slot) });
      }
    }
    const notices = w.activities.notices();
    return {
      title: 'Activities',
      subtitle: 'A weekly timetable: a Morning and an Afternoon slot each day · residents choose whether to join',
      art: 'care_ui_01',
      accent: accentNow(),
      sections: [
        { title: 'Today', lines: [...signupLines(w, w.sessionToday('morning')).filter(() => !!w.sessionToday('morning')), ...signupLines(w, w.sessionToday('afternoon'))] },
        { title: 'This week', lines: [{ text: 'Tap a slot to choose an activity (or free time). Declining is always fine: nobody is made to join.', color: COL.textMuted }], columns: 2, buttons: rows },
        { title: 'Outings and visitors', lines: notices.length ? notices.map((n) => ({ text: `Notice: ${n.def.name} (${dayName(w, n.day)}): answer it in the Inbox`, color: COL.actionDark })) : [{ text: 'Visitor offers arrive in the Inbox a few days ahead.', color: COL.textMuted }], columns: 1, buttons: [
          { id: 'act:outing', label: 'Plan an outing', sub: activityById('outing').needs.text, icon: SECTION_ICONS.outing, disabled: true, accent: COL.progress }, // (Milestone 28b: the Outing icon)
          { id: 'act:inbox', label: 'Inbox', sub: notices.length ? `${notices.length} waiting` : 'Nothing waiting', accent: COL.progress, onTap: () => openInbox() },
        ] },
      ],
    };
  });
}
function openSlotPicker(dow, slot) {
  let message = null;
  sheet.open(() => {
    const w = open?.world;
    if (!w) return { title: '', sections: [] };
    const cur = w.activities.timetable()[dow][slot];
    const here = w.residents.filter((r) => !r.state.leaving && !r.state.guest);
    const rows = SCHEDULABLE.map((a) => {
      const keen = here.filter((r) => ['love', 'like'].includes(w.feelingOf(r.id, a.id))).length;
      return { id: `pick:${a.id}`, label: `${cur === a.id ? '✓ ' : ''}${a.name}`, sub: `${a.text} · ${keen} here would enjoy it · ${a.minutes} min · led by ${a.leaders.map((r) => ROLES[r].short).join(' / ')}`, icon: a.prop ?? null, selected: cur === a.id, accent: cur === a.id ? COL.good : COL.progress, onTap: () => {
        const r = w.setSlot(dow, slot, a.id);
        message = r.ok ? null : r.reason;
        if (r.ok) {
          autosave.request('activities');
          openActivities();
        }
      } };
    });
    rows.push({ id: 'pick:free', label: `${cur == null ? '✓ ' : ''}Free time`, sub: 'Nothing planned: residents rest or do their own thing', accent: COL.progress, onTap: () => {
      w.setSlot(dow, slot, null);
      autosave.request('activities');
      openActivities();
    } });
    return {
      title: `${TIMETABLE.days[dow]} · ${SLOT_WORD[slot]}`,
      subtitle: `Choose the ${SLOT_WORD[slot].toLowerCase()} activity (${clockText(TIMETABLE.slots[slot].at)})`,
      accent: accentNow(),
      sections: [
        ...(message ? [{ lines: [{ text: message, color: COL.bad }] }] : []),
        { columns: 1, buttons: rows },
        { columns: 1, buttons: [{ id: 'pick:back', label: '‹ Back to Activities', accent: COL.progress, onTap: () => openActivities() }] },
      ],
    };
  });
}
// The Inbox (Milestone 14): community / visitor notices — Accept books that afternoon (it needs a host on shift), Decline
// lets it go. One notice at a time: they never stack.
function openInbox() {
  let message = null;
  // (Milestone 25c: care equipment that arrived since the Inbox was last opened — shown while it stays open)
  const fresh = open?.world?.items ? [...open.world.items.unseen()] : [];
  open?.world?.items?.markSeen();
  const freshQuality = open?.world?.quality ? [...open.world.quality.unseen()] : []; // (Milestone 26: inspection results)
  open?.world?.quality?.markSeen();
  const freshStages = open?.world?.endOfLife ? [...open.world.endOfLife.unseen()] : []; // (Milestone 27: care-stage lines)
  open?.world?.endOfLife?.markSeen();
  sheet.open(() => {
    const w = open?.world;
    if (!w) return { title: 'Inbox', subtitle: TOP_SHEETS.inbox.text, accent: COL.progress, sections: [] };
    const notices = w.activities.notices();
    const sections = [];
    if (message) sections.push({ lines: [{ text: message, color: COL.bad }] });
    if (fresh.length) sections.push({ title: 'Care equipment', lines: fresh.slice(0, 6).map((a) => a.text), columns: 1, buttons: [{ id: 'inbox:items', label: `Open the ${ITEM_RULES.storeName.toLowerCase()}`, sub: `${w.items.count} of ${w.items.max}: give one from here or from a staff card`, icon: ITEM_RULES.storeIcon, accent: COL.progress, onTap: () => openItemStore() }] });
    // Milestone 22: Emergency Credit / a Rescue Investor
    for (const o of w.economy.offers()) sections.push(offerSection(w, o, (m) => (message = m)));
    sections.push(...incidentInbox(w)); // (Milestone 25: an event waiting for a choice; after-reports)
    sections.push(...eolInbox(w, freshStages)); // (Milestone 27: the comfort-first offer, care-stage lines)
    sections.push(...qualityInbox(w, freshQuality)); // (Milestone 26: inspection results)
    sections.push(...partnerInbox(w)); // (Milestone 23: partnership offers)
    // Milestone 18: alerts — the six high-level choices
    for (const a of w.clinical.alerts()) sections.push(alertSection(w, a, 'inbox'));
    // Milestone 16: residents ready to go home — send them home now, or it happens on its own
    for (const r of w.readyToGoHome()) sections.push(readyNotice(w, r, 'inbox'));
    sections.push(...familyInbox(w)); // (Milestone 19: a meeting the family asked for, requests, new complaints)
    for (const n of notices) {
      const can = w.activities.canAccept(n.uid);
      sections.push({ title: n.def.name, lines: [n.def.text, { text: `${dayName(w, n.day)} afternoon (in ${n.day - w.clock.totalDays} day${n.day - w.clock.totalDays === 1 ? '' : 's'}) · runs as ${activityById(n.def.activity).name.toLowerCase()} with a bigger lift`, color: COL.actionDark }], columns: 2, buttons: [
        { id: `notice:accept:${n.uid}`, label: 'Accept', sub: can.ok ? `Host: ${first(w.byId(can.host)?.name ?? '')}` : can.reason, disabled: !can.ok, accent: COL.good, onTap: () => {
          const r = w.answerNotice(n.uid, true);
          message = r.ok ? null : r.reason;
          if (r.ok) autosave.request('inbox');
        } },
        { id: `notice:decline:${n.uid}`, label: 'Decline', sub: 'Politely, with thanks', accent: COL.progress, onTap: () => {
          w.answerNotice(n.uid, false);
          autosave.request('inbox');
        } },
      ] });
    }
    const past = w.activities.history().slice(-4).reverse();
    sections.push({ title: 'Earlier', lines: past.length ? past.map((h) => ({ text: `${h.def.name}: ${h.accepted ? 'accepted' : h.auto ? 'no answer (let go)' : 'declined'}`, color: COL.textMuted })) : [{ text: notices.length ? '' : 'Nothing yet. Letters from families, partners and inspectors will arrive here too.', color: COL.textMuted }] });
    const waiting = notices.length + alertsWaiting() + familyWaiting() + w.economy.offers().length + w.partners.offers().length + emergencyWaiting() + w.endOfLife.offers().length; // (Milestone 23; Milestone 25; Milestone 27)
    // Milestone 28: everything that happened, by category (newest first), from the event director; Mark all read
    const unread = w.events.unread().length;
    sections.splice(message ? 1 : 0, 0, { columns: 1, buttons: [{ id: 'inbox:readAll', label: 'Mark all read', sub: unread ? `${unread} unread` : 'Everything is read', disabled: !unread, accent: COL.progress, onTap: () => {
      w.events.markAllRead();
      autosave.request('inbox');
    } }] });
    sections.push(...inboxLog(w));
    return { title: 'Inbox', subtitle: `${waiting ? `${waiting} waiting` : 'Nothing waiting'}${unread ? ` · ${unread} unread` : ''}`, art: 'care_ui_01', accent: accentNow(), sections };
  });
}
// Milestone 28: the Inbox log by category (each with its icon), newest first, at most INBOX_RULES.shown lines each; a
// tap marks the line read and opens the same sheet its art opens (a resident, a staff member, Quality, Partners…).
function inboxLog(w) {
  const out = [];
  for (const g of w.events.grouped()) {
    const lines = g.lines.slice(0, INBOX_RULES.shown);
    out.push({ title: `${g.cat.name}${g.unread ? ` · ${g.unread} new` : ''}`, titleDot: g.unread ? COL.action : null, columns: 1, buttons: lines.map((l) => {
      const [head, rest] = splitLine(l.text);
      const face = personArt(w, l.opens);
      return { id: `inboxLine:${l.uid}`, label: head, sub: `${rest ? `${rest} · ` : ''}${agoWord(w, l.day)}`, icon: face ?? g.cat.icon, iconCrop: face ? PORTRAIT_CROP : null, iconBadge: face ? g.cat.icon : null, badge: l.read ? null : '•', accent: l.read ? COL.progress : COL.action, onTap: () => {
        w.events.markRead(l.uid);
        autosave.request('inbox');
        openTarget(l.opens);
      } };
    }) });
  }
  return out;
}
// Milestone 28b: the portrait of the resident or staff member a line is about (they may have left the home since).
function personArt(w, o) {
  if (o?.type === 'resident') return w.residentById(o.id)?.def.art ?? residentById(o.id)?.art ?? null;
  if (o?.type === 'staff') return w.byId(o.id)?.art ?? staffById(o.id)?.art ?? null;
  return null;
}
// A long line on a button: the first ~34 characters (at a word) on the label, the rest on the line under it.
function splitLine(t) {
  if (t.length <= 36) return [t, ''];
  const i = t.lastIndexOf(' ', 34);
  return i > 12 ? [t.slice(0, i), t.slice(i + 1)] : [t.slice(0, 34), t.slice(34)];
}
// The resident card's Activities section: what they enjoy, a hint when nothing they like has been on for a while, their
// birthday.
function activitySection(w, it) {
  const like = SCHEDULABLE.filter((a) => ['love', 'like'].includes(w.feelingOf(it.id, a.id))).map((a) => a.name);
  const dislike = SCHEDULABLE.filter((a) => ['dislike', 'refuse'].includes(w.feelingOf(it.id, a.id))).map((a) => a.name);
  const bd = w.birthdayOf(it.id);
  const lines = [
    { text: like.length ? `Enjoys: ${like.join(', ')}` : 'No favourites yet', color: COL.actionDark },
    ...(dislike.length ? [{ text: `Would rather not: ${dislike.join(', ')}`, color: COL.textMuted }] : []),
    ...(it.state.wouldEnjoy ? [{ text: `Would enjoy: ${activityById(it.state.wouldEnjoy)?.name} (nothing they like for a while)`, color: COL.warn }] : []),
    { text: `Birthday: Month ${Math.floor((bd - 1) / 28) + 1}, day ${((bd - 1) % 28) + 1}`, color: COL.textMuted },
  ];
  return { title: 'Activities', lines };
}
// --- Milestone 15: nutrition and dining -------------------------------------------------------------------------------
const todayDow = (w) => ((w.clock.totalDays % 7) + 7) % 7;
const satColor = (v) => (v >= 70 ? COL.good : v >= 45 ? COL.actionDark : COL.warn);
// The resident card's Meals section: their menu (from the care plan), favourites and when they are on, their dining
// satisfaction and last drink.
function mealsSection(w, it) {
  const st = it.state;
  const they = theirOf(it.id) === 'her' ? 'she' : 'he';
  const diet = w.dietOf(it.id);
  const d = DIETS[diet];
  const rota = w.dining.rota();
  const today = todayDow(w);
  const favs = w.favouritesOf(it.id).map((id) => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const dow = (today + i) % 7;
      if (rota[dow].main === id || rota[dow].pudding === id) days.push(i === 0 ? 'today' : TIMETABLE.days[dow]);
    }
    return `${dishById(id).name} (${days.length ? `on the menu ${days.join(', ')}` : 'not on the menu this week'})`;
  });
  const lines = [{ text: diet === 'standard' ? 'Menu: the standard menu' : `Menu: ${d.menu} (${d.name}, from the care plan)`, color: COL.actionDark }];
  if (diet !== 'standard' && !w.dietMadeByTeam(it.id)) lines.push({ text: `Nobody on the team can make ${d.menu}, so ${they} has the standard one (the Nutrition specialty or a Nutrition Office would)`, color: COL.warn });
  lines.push(`Favourite${favs.length === 1 ? '' : 's'}: ${favs.join(' · ')}`);
  const dn = st.dining;
  if (dn?.avg != null) {
    const why = dn.last.reason !== 'none' ? ` (${SAT_REASONS[dn.last.reason]})` : '';
    lines.push({ text: `Dining satisfaction ${Math.round(dn.avg)} · last meal: ${mealById(dn.last.meal)?.name.toLowerCase()} ${Math.round(dn.last.sat)}${why}`, color: satColor(dn.avg) });
  } else lines.push({ text: 'No meals here yet', color: COL.textMuted });
  if (st.hydration?.last != null) {
    const since = w.clock.totalDays * 24 + w.hour - st.hydration.last;
    lines.push({ text: `Last drink ${clockText(st.hydration.last % 24)}${since > HYDRATION.gapHours && !w.isAsleep(it) ? ' · due a drink' : ''}`, color: since > HYDRATION.gapHours && !w.isAsleep(it) ? COL.warn : COL.textMuted });
  }
  return { title: 'Meals', lines };
}
// "Kitchen: Sam is getting lunch ready" — the next meal's prep.
const PREP_WORDS = { waiting: 'prep not started yet', done: 'ready on time', late: 'ready late', unprepped: 'nobody got it ready: plain meals', noStaff: 'nobody on shift to cook', noKitchen: 'from the hatch (no Kitchen)' };
function prepLine(w, next) {
  if (!w.kitchen()) return { text: 'Meals come from the Dining Room hatch (no Kitchen)', color: COL.textMuted };
  const p = next.prep;
  const meal = next.meal.name.toLowerCase();
  const cook = w.staff.find((q) => w.taskOf(q)?.type === 'prep');
  if (cook) return { text: `Kitchen: ${first(cook.name)} is ${cook.mode === 'helping' ? 'getting' : 'on the way to get'} ${w.taskOf(cook).meal === next.meal.id ? meal : mealById(w.taskOf(cook).meal)?.name.toLowerCase()} ready`, color: COL.actionDark };
  if (!p) return { text: `Kitchen: ${meal} prep starts at ${clockText(next.meal.prepAt)}`, color: COL.textMuted };
  const by = p.by ? ` (${first(w.byId(p.by)?.name ?? '')})` : '';
  return { text: `Kitchen: ${meal} ${PREP_WORDS[p.status] ?? p.status}${by}`, color: p.status === 'done' ? COL.good : p.status === 'waiting' ? COL.textMuted : COL.warn };
}
// The Dining Room card: warnings, the next meal, the home's satisfaction and the lowest three, the last few meals.
function diningSections(w) {
  const s = w.diningSummary();
  const next = w.nextMeal();
  const lines = s.warnings.map((x) => ({ text: x, color: COL.warn }));
  lines.push({ text: `Next: ${next.meal.name} at ${clockText(next.at)}${next.dish ? ` · ${dishById(next.dish).name}` : ''}${next.day !== w.clock.totalDays ? ' (tomorrow)' : ''}`, color: COL.actionDark });
  lines.push(prepLine(w, next));
  const sat = [];
  if (s.avg == null) sat.push({ text: 'No meals served yet', color: COL.textMuted });
  else {
    sat.push({ text: `Home average: ${Math.round(s.avg)}`, color: satColor(s.avg) });
    for (const x of s.lowest) sat.push({ text: `${first(x.name)} ${Math.round(x.avg)}${x.reason !== 'none' ? ` · ${SAT_REASONS[x.reason]}` : ''}`, color: satColor(x.avg) });
  }
  const dayWord = (d) => (d === w.clock.totalDays ? 'today' : d === w.clock.totalDays - 1 ? 'yesterday' : `${w.clock.totalDays - d} days ago`);
  const meals = s.recent.map((r) => ({ text: `${r.name} ${dayWord(r.day)} · quality ${Math.round(r.quality)} · ${r.served} served${r.trays ? ` (${r.trays} on trays)` : ''}${r.late ? ` · ${r.late} late` : ''}${r.mismatched ? ` · ${r.mismatched} not their menu` : ''}`, color: r.quality >= 70 ? COL.good : r.quality >= 45 ? COL.actionDark : COL.warn }));
  return [
    { title: 'Meals', lines, columns: 1, buttons: [{ id: 'dining:menu', label: 'Weekly menu', sub: menuSub(w), icon: TROLLEYS.meal, accent: COL.action, onTap: () => openMenu() }] },
    { title: 'Dining satisfaction', lines: sat },
    { title: 'Last meals', lines: meals.length ? meals : [{ text: 'None yet', color: COL.textMuted }] },
  ];
}
// The Care sheet's Meals line: the home's dining satisfaction and the next meal (a warning first, if there is one).
function mealsSub(w) {
  const s = w.diningSummary();
  const next = w.nextMeal();
  const head = !w.kitchen() ? 'No Kitchen yet' : s.avg != null ? `Dining satisfaction ${Math.round(s.avg)}` : 'No meals yet';
  return `${head} · next: ${next.meal.name} ${clockText(next.at)}`;
}
function menuSub(w) {
  const r = w.menuOn();
  return `Today: ${dishById(r.main).name} · ${dishById(r.pudding).name}`;
}
// The Kitchen (F04 / F16): the next meal's prep, who can cook on shift, the weekly menu.
function kitchenSections(w, it) {
  const next = w.nextMeal();
  const cooks = w.staff.filter((q) => q.role === 'HN' && w.roster.onShift(q.id)).map((q) => first(q.name));
  const best = w.kitchen();
  const lines = [prepLine(w, next), { text: cooks.length ? `Hospitality on shift: ${cooks.join(', ')}` : 'No Hospitality worker on shift: a Care Worker may cook (more slowly)', color: cooks.length ? COL.actionDark : COL.warn }];
  if (best && best.id !== it.id) lines.push({ text: `The ${KITCHENS[best.defId].name} does the cooking`, color: COL.textMuted });
  return [{ title: 'Cooking', lines, columns: 1, buttons: [{ id: 'kitchen:menu', label: 'Weekly menu', sub: menuSub(w), icon: TROLLEYS.meal, accent: COL.action, onTap: () => openMenu() }] }];
}
// The weekly menu (a 7-day rota): tap a day to choose its main (lunch) and pudding (the evening meal).
function openMenu() {
  sheet.open(() => {
    const w = open?.world;
    if (!w) return { title: '', sections: [] };
    const rota = w.dining.rota();
    const today = todayDow(w);
    const here = w.residents.filter((r) => !r.state.leaving && !r.state.guest);
    const fans = (id) => here.filter((r) => w.favouritesOf(r.id).includes(id)).map((r) => first(r.name));
    const rows = [];
    for (let i = 0; i < 7; i++) {
      const dow = (today + i) % 7;
      const r = rota[dow];
      const n = new Set([...fans(r.main), ...fans(r.pudding)]).size;
      rows.push({ id: `menu:${dow}`, label: `${TIMETABLE.days[dow]}${i === 0 ? ' (today)' : ''}`, sub: `${dishById(r.main).name} · ${dishById(r.pudding).name}${n ? ` · ${n} favourite${n === 1 ? '' : 's'}` : ''}`, accent: n ? COL.good : COL.progress, onTap: () => openDishPicker(dow) });
    }
    return {
      title: 'Weekly menu',
      subtitle: 'The main is served at lunch, the pudding at the evening meal',
      art: TROLLEYS.meal,
      accent: accentNow(),
      sections: [
        { lines: [{ text: 'A resident whose favourite is on the menu enjoys that day a little more (twice as much with Favourite-Food Boost). Special menus follow each care plan.', color: COL.textMuted }], columns: 1, buttons: rows },
      ],
    };
  });
}
function openDishPicker(dow) {
  sheet.open(() => {
    const w = open?.world;
    if (!w) return { title: '', sections: [] };
    const cur = w.dining.rota()[dow];
    const here = w.residents.filter((r) => !r.state.leaving && !r.state.guest);
    const section = (kind, title) => ({ title, columns: 1, buttons: dishesOf(kind).map((d) => {
      const fans = here.filter((r) => w.favouritesOf(r.id).includes(d.id)).map((r) => first(r.name));
      const on = cur[kind] === d.id;
      return { id: `dish:${kind}:${d.id}`, label: `${on ? '✓ ' : ''}${d.name}`, sub: fans.length ? `A favourite of ${fans.join(', ')}` : 'Nobody here\u2019s favourite', selected: on, accent: on ? COL.good : COL.progress, onTap: () => {
        w.setDish(dow, kind, d.id);
        autosave.request('menu');
      } };
    }) });
    return {
      title: `${TIMETABLE.days[dow]}'s menu`,
      subtitle: `${dishById(cur.main).name} · ${dishById(cur.pudding).name}`,
      accent: accentNow(),
      sections: [
        { columns: 1, buttons: [{ id: 'dish:back', label: '‹ Back to the weekly menu', accent: COL.progress, onTap: () => openMenu() }] },
        section('main', 'Main (lunch)'),
        section('pudding', 'Pudding (evening meal)'),
      ],
    };
  });
}
// --- Milestone 17: memory support ----------------------------------------------------------------------------------------
// Respectful, plain words: a steady routine, familiar faces, their own story, calm places and walks of their own.
const CHANGE_WORDS = { newFace: 'a new face', room: 'a room move', seat: 'a seat change', missed: 'a missed routine step' };
const STIM_WORDS = { high: 'somewhere busy', medium: 'somewhere a little busy', low: 'somewhere quiet', veryLow: 'somewhere very calm', calm: 'somewhere calm' };
function memorySections(w, it) {
  const ms = w.memoryOf(it.id);
  if (!ms) return [];
  const they = theirOf(it.id) === 'her' ? 'she' : 'he';
  const today = Object.entries(ms.kinds ?? {}).map(([k, n]) => `${n > 1 ? `${n} × ` : ''}${CHANGE_WORDS[k] ?? k}`);
  const lines = [
    { text: `Routine: ${ms.status}${ms.status === 'unsettled' ? ' (a few changes lately: familiar faces and a steady day help)' : ''}`, color: ms.status === 'steady' ? COL.good : COL.warn },
    { text: today.length ? `Changes today: ${today.join(', ')}` : 'No changes today', color: COL.textMuted },
    `Life story: ${w.themeOf(it.id)}`,
    { text: `Personal sessions: ${ms.sessions}${ms.lastSession ? ` · last ${ms.lastSession.day === w.clock.totalDays ? 'today' : `${w.clock.totalDays - ms.lastSession.day} day${w.clock.totalDays - ms.lastSession.day === 1 ? '' : 's'} ago`}${ms.lastSession.with ? ` with ${first(w.byId(ms.lastSession.with)?.name ?? '')}` : ''}` : ''}`, color: COL.actionDark },
    { text: `Now ${STIM_WORDS[w.stimulationOf(it.id)] ?? 'somewhere quiet'}`, color: COL.textMuted },
  ];
  if (ms.walk) lines.push({ text: ms.walk.kind === 'path' ? `Out for a walk on the walking path${ms.walk.falls != null ? ` (falls risk ${ms.walk.falls})` : ''}` : `Out for a walk along the corridor: someone will walk back with ${theirOf(it.id) === 'her' ? 'her' : 'him'}`, color: COL.actionDark });
  else if (!w.walkPath) lines.push({ text: `Likes a walk now and then: a safe walking path helps (Build Mode → Walking path)`, color: COL.textMuted });
  lines.push({ text: `Choices honoured: ${ms.choice.honoured} · ${they === 'she' ? 'her' : 'his'} say is always final`, color: COL.textMuted });
  return [{ title: 'Memory support', lines, columns: 1, buttons: [{ id: `memory:lifeStory:${it.id}`, label: 'Offer a life-story session', sub: 'One to one, about their own story', accent: COL.action, onTap: () => {
    const r = w.offerLifeStory(it.id);
    if (r.ok) autosave.request('lifeStory');
  } }] }];
}
// --- Milestone 18: clinical care ------------------------------------------------------------------------------------------
// High-level only: a plain alert word and six choices. No medicines, amounts or diagnoses anywhere.
const scoreColour = (v) => (v >= 70 ? COL.good : v >= 50 ? COL.actionDark : COL.warn);
const signed = (v) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v)}`;
function actionSub(w, a, id) {
  const c = w.clinical.canAct(a.id, id);
  if (!c.ok) return c.reason;
  if (id === 'clinician') return `Tomorrow at ${clockText(CLINICIAN.visitAt)} · ${credits(c.cost)} Credits`;
  if (id === 'hospital') return `About ${HOSPITAL.days} days away, room held · ${credits(c.cost)} Credits`;
  if (id === 'escalate') return `${first(w.clinical.senior()?.name ?? 'The senior nurse')} reviews now`;
  return ACTIONS[id].text;
}
function pendingText(w, a) {
  const pd = a.pending;
  const task = pd.task ? w.care.tasks.find((t) => t.id === pd.task) : null;
  const who = task?.slots[0] ? first(w.byId(task.slots[0])?.name ?? '') : null;
  if (pd.action === 'assess') return who ? `${who} is assessing them` : 'A nurse assessment is on its way';
  if (pd.action === 'escalate') return `${first(w.byId(pd.by)?.name ?? 'The senior nurse')} is reviewing them`;
  if (pd.action === 'observe') return `Extra health checks until ${dayName(w, pd.until)}: ${pd.done} of ${pd.due} done`;
  if (pd.action === 'carePlan') return `Update their Clinical/Nursing plan by the end of tomorrow: ${optionById(pd.suggest)?.name ?? 'a new option'} is suggested`;
  if (pd.action === 'clinician') return `The visiting clinician sees them ${pd.day === w.clock.totalDays ? 'today' : 'tomorrow'} at ${clockText(CLINICIAN.visitAt)}`;
  return ACTIONS[pd.action].name;
}
const RESULT_WORDS = { lingering: 'still unsettled', notDone: "didn't happen", well: 'settled', overdone: 'settled' };
function alertSection(w, a, from) {
  const p = w.residentById(a.resident);
  const who = first(p?.name ?? '');
  const lines = [{ text: `${who} seems ${a.word}${a.late ? ' (noticed late: no health check came sooner)' : ''}`, color: COL.bad }];
  const tried = a.actions.filter((x) => x.result);
  if (tried.length) lines.push({ text: `Tried: ${tried.map((x) => `${ACTIONS[x.action].name.toLowerCase()} (${RESULT_WORDS[x.result] ?? x.result})`).join(', ')}`, color: COL.textMuted });
  if (a.pending) lines.push({ text: pendingText(w, a), color: COL.actionDark });
  else if (a.autoAt != null) lines.push({ text: `Choose what to do. With no choice by ${clockText(a.autoAt % 24)}, the nurse on shift acts.`, color: COL.textMuted });
  lines.push({ text: 'High-level choices only: the care team handles the details. The right-sized step works best.', color: COL.textMuted });
  const buttons = ACTION_IDS.map((id) => {
    const c = w.clinical.canAct(a.id, id);
    return { id: `alert:${from}:${id}:${a.id}`, label: ACTIONS[id].name, sub: actionSub(w, a, id), disabled: !c.ok, accent: id === 'hospital' ? COL.warn : COL.action, onTap: () => {
      const r = w.clinical.act(a.id, id);
      if (!r.ok) return;
      autosave.request('alert');
      if (id === 'carePlan') openPlanPicker('CL', a.resident, r.suggest);
    } };
  });
  if (a.pending?.action === 'carePlan') buttons.push({ id: `alert:${from}:plan:${a.id}`, label: 'Open the plan', sub: optionById(a.pending.suggest)?.name ?? '', accent: COL.good, onTap: () => openPlanPicker('CL', a.resident, a.pending?.suggest ?? null) });
  if (from === 'inbox') buttons.push({ id: `alert:inbox:card:${a.id}`, label: `${who}'s card`, sub: 'Their plan, tasks and log', accent: COL.progress, onTap: () => openHomeSheet(a.resident) });
  return { title: `${who}: ${a.word}`, titleDot: a.pending ? null : COL.bad, lines, columns: 2, buttons };
}
// The resident card's Health section: their Clinical/Nursing option, today's rounds and checks, and an alert's choices.
function healthSections(w, it) {
  if (w.isAway(it.id)) return [{ title: 'Health', lines: [{ text: w.stateOf(it), color: COL.actionDark }] }];
  const o = optionById(it.state.plan?.CL);
  const lines = [{ text: `Clinical/Nursing plan: ${o?.name ?? 'not set'}`, color: COL.actionDark }];
  const tasks = w.tasksToday(it.id).filter((t) => t.type === 'meds' || (t.type === 'observation' && t.source !== 'routine'));
  for (const t of tasks.sort((x, y) => (x.at ?? x.opens % 24) - (y.at ?? y.opens % 24))) lines.push({ text: `${clockText(t.at ?? t.opens % 24)}  ${t.type === 'meds' ? 'Medicine round' : t.name} · ${TASK_WORDS[t.status] ?? t.status}`, color: t.status === 'missed' ? COL.bad : t.status === 'done' ? COL.good : COL.textMuted });
  const a = w.clinical.alertOf(it.id);
  if (!a) lines.push({ text: 'No alerts: seems well', color: COL.good });
  return a ? [{ title: 'Health', lines }, alertSection(w, a, 'card')] : [{ title: 'Health', lines }];
}
// The Nurse Station card: the Clinical Safety score, today's rounds, the issues counter, health checks, open alerts.
function clinicalSections(w) {
  const s = w.clinical.score();
  const today = w.clinical.today();
  const rounds = w.clinical.rounds();
  const lines = [
    { text: `Clinical Safety: ${s.score} / 100`, color: scoreColour(s.score) },
    { text: `Last 7 days: round safety ${s.round} · health checks done ${s.obs}% · alerts resolved well ${s.well}%${s.open ? ` · ${s.open} open now` : ''}`, color: COL.textMuted },
    { text: `Round issues: ${w.clinical.state.issues} so far (${s.issues} in the last 7 days)`, color: s.issues ? COL.warn : COL.textMuted },
    { text: `Health checks today: ${today.obs.done} done${today.obs.missed ? `, ${today.obs.missed} missed` : ''}`, color: today.obs.missed ? COL.warn : COL.textMuted },
  ];
  if (!w.layout.ofDef('F02').length) lines.push({ text: 'No Medication Room: the cart is kept here and rounds are less safe. Build one in Build Mode (F02).', color: COL.warn });
  const rl = rounds.length
    ? rounds.map((r) => ({ text: `${r.name}: ${r.collected == null ? 'not started' : `${first(w.byId(r.by)?.name ?? r.by ?? '')} · safety ${r.safety}`} · ${r.done} of ${r.stops || '?'} done${r.late ? `, ${r.late} late` : ''}${r.missed ? `, ${r.missed} missed` : ''}${r.issues.length ? ` · ${r.issues.length} issue${r.issues.length === 1 ? '' : 's'}` : ''}`, color: r.missed || r.issues.length ? COL.warn : COL.actionDark }))
    : [{ text: 'No medicine round yet today.', color: COL.textMuted }];
  const last = [...rounds].reverse().find((r) => r.parts);
  if (last) {
    const P = last.parts;
    rl.push({ text: `${last.name} safety: nurse ${signed(P.nurse)}, workload ${signed(P.workload)}, Medication Room ${signed(P.medRoom)}, complex needs ${signed(P.complexity)}, training ${signed(P.training)}, open alerts ${signed(P.alerts)}${last.mult > 1 ? ` · × ${last.mult} (rooms)` : ''}`, color: COL.textMuted });
  }
  const alerts = w.clinical.alerts();
  const services = [
    { text: `Visiting clinician: every ${TIMETABLE.days[CLINICIAN.visitDay]} (${CLINICIAN.visitFee} Credits for a visit booked for that day; any other day ${CLINICIAN.callOutFee} for next-day)`, color: COL.textMuted },
    { text: `Hospital service: any time, ${HOSPITAL.fee} Credits; about ${HOSPITAL.days} days away with the room held · transfers so far: ${w.clinical.state.transfers ?? 0}`, color: COL.textMuted },
  ];
  return [
    { title: 'Clinical Safety', lines },
    { title: 'Medicine rounds today', lines: rl },
    { title: alerts.length ? `Alerts (${alerts.length})` : 'Alerts', titleDot: alerts.some((a) => !a.pending) ? COL.bad : null, lines: alerts.length ? [] : [{ text: 'Nobody seems unwell right now.', color: COL.good }], columns: 1, buttons: alerts.map((a) => ({ id: `station:alert:${a.id}`, label: `${first(w.residentById(a.resident)?.name ?? '')}: ${a.word}`, sub: a.pending ? pendingText(w, a) : 'Choose what to do', accent: a.pending ? COL.progress : COL.action, onTap: () => openHomeSheet(a.resident) })) },
    { title: 'Services', lines: services },
  ];
}
// The Ledger's Clinical Safety lines and this month's clinical fees (paid as they happen).
function clinicalLedger(w, range) {
  const s = w.clinical.score();
  const fees = w.ledger.economy.ledger.filter((l) => l.day >= range.fromDay && l.category === 'clinical');
  const sum = fees.reduce((t, l) => t + l.amount, 0);
  return { title: 'Clinical Safety', lines: [
    { text: `Clinical Safety: ${s.score} / 100 (round safety ${s.round}, health checks ${s.obs}%, alerts resolved well ${s.well}%)`, color: scoreColour(s.score) },
    { text: `Visiting clinician and hospital service this month: ${fees.length} · ${sum ? '−' : ''}${credits(-sum)} Credits`, color: fees.length ? COL.bad : COL.textMuted },
    { text: `The headline Clinical Safety score (the month's average, Quality tab): ${Math.round(w.quality.scores().clinicalSafety)}`, color: COL.textMuted }, // (Milestone 26)
  ] };
}
// --- Milestone 19: family trust, visits, meetings, compliments and complaints ----------------------------------------------
// Every Family Trust change shows with its reason; a complaint is an improvement task with an evidence trail, never a cost.
const trustColour = (v) => (v == null ? COL.textMuted : v >= 70 ? COL.good : v >= 50 ? COL.actionDark : COL.warn);
const signed1 = (v) => `${v > 0 ? '+' : v < 0 ? '−' : '±'}${Math.abs(Math.round(v * 10) / 10)}`;
const agoWord = (w, d) => {
  const n = w.clock.totalDays - d;
  return n <= 0 ? 'today' : n === 1 ? 'yesterday' : `${n} days ago`;
};
const aheadWord = (w, d) => {
  const n = d - w.clock.totalDays;
  return n <= 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days`;
};
const familyShown = new Set(); // resident cards showing every Trust change (not just the last few)
let familyMessage = null; // why a request couldn't be agreed (the Inbox shows it)
function bookMeeting(w, residentId, opts, onDone = null) {
  const r = w.family.book(residentId, opts);
  if (r.ok) autosave.request('family');
  onDone?.(r);
  return r;
}
// The resident card's Family section: who, how often they come, Family Trust and why it moved, the family's wishes,
// an open complaint, and booking a care-plan meeting.
function familySection(w, it) {
  const rec = w.family.recordOf(it.id);
  if (!rec?.contact) return { title: 'Family', lines: [{ text: 'No regular visitors', color: COL.textMuted }] };
  const v = w.family.visitOf(it.id);
  const lines = [
    { text: `${w.family.whoOf(it.id)} · visits ${w.family.patternOf(it.id).word}`, color: COL.actionDark },
    { text: v ? `${rec.contact.name} is visiting now` : `Last visit: ${rec.lastVisit == null ? 'not yet' : agoWord(w, rec.lastVisit)}${rec.nextVisit != null ? ` · next: ${aheadWord(w, rec.nextVisit)}` : ''}`, color: v ? COL.good : COL.textMuted },
  ];
  if (rec.meeting) lines.push({ text: `Care-plan meeting booked: ${aheadWord(w, rec.meeting.day)} afternoon${rec.meeting.review ? ' (a review with the family)' : ''}`, color: COL.actionDark });
  if (rec.untold) lines.push({ text: `Not told yet: ${optionById(rec.untold.option)?.name ?? 'a plan change'} (they dislike it). A meeting or a family call tells the family.`, color: COL.warn });
  for (const n of (rec.notes ?? []).slice(-2)) lines.push({ text: `Family wish (${agoWord(w, n.day)}): ${n.text}`, color: COL.actionDark });
  for (const n of (rec.told ?? []).slice(-1)) lines.push({ text: `Family ${n.text} (${agoWord(w, n.day)})`, color: COL.progress }); // (Milestone 27: a care-stage notice)
  for (const c of w.family.open().filter((x) => x.resident === it.id)) lines.push({ text: `Complaint open: ${c.text}. ${w.family.improvement(c.id).text}`, color: COL.warn });
  const all = familyShown.has(it.id);
  const hist = [...rec.history].reverse().slice(0, all ? 40 : 5);
  lines.push({ text: hist.length ? 'Why Family Trust moved (newest first):' : `No change yet: every family starts at ${TRUST.start}`, color: COL.textMuted });
  for (const h of hist) lines.push({ text: `${signed1(h.change)}  ${agoWord(w, h.day)}: ${h.reason}${h.parts ? ` (${h.parts.map((p) => signed1(p.value)).join(' ')})` : ''}`, color: h.change > 0 ? COL.good : h.change < 0 ? COL.bad : COL.textMuted });
  const can = w.family.canBook();
  const buttons = [
    { id: `family:meet:${it.id}`, label: rec.meeting ? 'Meeting booked' : 'Book a care-plan meeting', sub: rec.meeting ? `${aheadWord(w, rec.meeting.day)} afternoon` : can ? `The Founder or a nurse meets ${rec.contact.name} for an hour (Family Trust +${MEETING.lift})` : 'Needs the Founder or a nurse on the Afternoon shift', disabled: !!rec.meeting || !can, accent: COL.action, onTap: () => bookMeeting(w, it.id, {}) },
  ];
  if (rec.history.length > 5) buttons.push({ id: `family:all:${it.id}`, label: all ? 'Show fewer' : `Show all ${rec.history.length} changes`, accent: COL.progress, onTap: () => (all ? familyShown.delete(it.id) : familyShown.add(it.id)) });
  return { title: 'Family', lines, bars: [{ label: 'Family Trust', value: rec.trust, color: trustColour(rec.trust), text: `${Math.round(rec.trust)}` }], columns: 1, buttons };
}
// A complaint as a card section: the improvement task (description, suggested fix, owner, due date) and its trail.
function complaintSection(w, c, from) {
  const imp = w.family.improvement(c.id);
  const overdue = c.status === 'open' && w.clock.totalDays > c.due;
  const lines = [
    { text: c.text, color: COL.actionDark },
    { text: `Suggested fix: ${c.fixText}`, color: COL.actionDark },
    { text: `Owner: ${c.owner ? w.byId(c.owner)?.name ?? c.owner : 'nobody yet'} · due ${aheadWord(w, c.due)}${overdue ? ': past due, Family Trust drifting down' : ''}`, color: overdue ? COL.bad : COL.textMuted },
    { text: imp.text, color: imp.ok ? COL.good : COL.warn },
    { text: 'Evidence trail:', color: COL.textMuted },
    ...c.trail.map((t) => ({ text: `${agoWord(w, t.day)} ${t.t ?? ''}  ${t.text}`, color: COL.textMuted })),
  ];
  const team = w.team.filter((q) => !q.agency && !q.leftTeam);
  const nextOwner = team[(team.findIndex((q) => q.id === c.owner) + 1) % Math.max(1, team.length)];
  const fix = FIXES[c.fix];
  const buttons = [
    { id: `complaint:${from}:fix:${c.id}`, label: fix.opens === 'roster' ? 'Open the roster' : fix.opens === 'card' ? `${first(c.name)}'s card` : 'Book a care-plan meeting', sub: c.fixText, accent: COL.action, onTap: () => {
      if (fix.opens === 'roster') {
        w.family.noteAction(c.id, 'the roster was opened to add cover');
        openRoster();
      } else if (fix.opens === 'card') {
        w.family.noteAction(c.id, `${first(c.name)}'s card was opened`);
        openHomeSheet(c.resident);
      } else bookMeeting(w, c.resident, { kind: 'complaint' }, (r) => w.family.noteAction(c.id, r.ok ? `a care-plan meeting was booked (${aheadWord(w, r.day)})` : `a meeting could not be booked: ${r.reason}`));
    } },
    { id: `complaint:${from}:done:${c.id}`, label: 'Mark done', sub: imp.ok ? `Family Trust back up (+${Math.abs(c.drop) + COMPLAINT.bonus})` : imp.text, disabled: !imp.ok, accent: COL.good, onTap: () => {
      const r = w.family.markDone(c.id);
      if (r.ok) autosave.request('complaint');
    } },
  ];
  if (nextOwner && team.length > 1) buttons.push({ id: `complaint:${from}:owner:${c.id}`, label: 'Change owner', sub: `Hand it to ${first(nextOwner.name)}`, accent: COL.progress, onTap: () => w.family.setOwner(c.id, nextOwner.id) });
  return { title: `${first(c.name)}: ${COMPLAINTS[c.kind]?.title ?? 'Complaint'}`, titleDot: imp.ok ? COL.good : COL.warn, lines, columns: 2, buttons };
}
// --- Milestone 26: Quality — the five headline scores, Rank, accreditations, inspections and the peer homes ---------------
// Everything shown here is worked out from what the home really did (src/systems/quality.js): the player's only action is
// "Apply", which books an inspection; the inspection judges the home as it is on the day.
const STATUS_WORDS = { won: 'Awarded', applied: 'Inspection booked', ready: 'Ready to apply', records: 'A month of records first', cooldown: 'Re-apply after the cooldown', locked: 'Locked' };
const dateWord = (w, d) => {
  const x = w.clock.dateOf(d);
  return `Year ${x.year}, Month ${x.month}, day ${x.day}`;
};
function accreditationSub(w, a) {
  const Q = w.quality;
  if (a.status === 'won') return `Awarded ${dateWord(w, a.day)}`;
  if (a.status === 'applied') return `Inspection ${aheadWord(w, a.inspectionDay)}`;
  if (a.status === 'locked') return `Needs Rank ${a.def.rank}`;
  if (a.status === 'cooldown') return `Fell short · apply again ${aheadWord(w, a.until)}`;
  if (a.status === 'records') return 'The inspectors want a month of records first';
  return a.check.pass ? 'Ready: today the home would pass' : `Not yet: ${a.check.lines.filter((l) => !l.ok).length} thing${a.check.lines.filter((l) => !l.ok).length === 1 ? '' : 's'} short${Q.applied() ? '' : ''}`;
}
function qualityTabs(w) {
  const Q = w.quality;
  const s = Q.scores();
  const nx = Q.nextRank();
  const pct = nx ? Math.max(0, Math.min(100, (100 * Q.reputation) / nx.need)) : 100;
  const scoreSections = [
    { title: `Rank ${Q.rank}`, lines: [
      { text: `Reputation ${Q.reputation.toLocaleString('en-GB')}${nx ? ` · Rank ${nx.rank} at ${nx.need.toLocaleString('en-GB')}${nx.accreditations ? ` and ${nx.accreditations} accreditation${nx.accreditations === 1 ? '' : 's'} (${nx.have} won)` : ''}` : ' · the highest rank'}`, color: COL.actionDark },
      ...(nx ? [{ text: `Rank ${nx.rank} opens: ${RANK_OPENS[nx.rank]}`, color: COL.textMuted }] : []),
      { text: 'Reputation grows from good scores held month after month, routine reviews and accreditations. It never drops below your rank.', color: COL.textMuted },
    ], bars: nx ? [{ label: `To Rank ${nx.rank}`, value: pct, color: COL.progress, text: `${Math.round(pct)}%` }] : [] },
    ...SCORES.map((sc) => ({ lines: [{ text: `What moves this: ${sc.moves}`, color: COL.textMuted, glyph: artGlyph(SCORE_ICONS[sc.id]) }], bars: [{ label: sc.name, value: s[sc.id], color: scoreColour(s[sc.id]), text: `${Math.round(s[sc.id])}` }] })),
    { lines: [{ text: 'Each score is the average of the last month, so one good or bad day never swings it.', color: COL.textMuted }], columns: 1, buttons: [{ id: 'quality:parts', label: 'What makes up each score', sub: 'Every part and its weight, from the home’s own records', icon: QUALITY_ART.icon, accent: COL.progress, onTap: () => openScoreParts() }, { id: 'quality:complaints', label: 'Compliments & complaints', sub: `${w.family.open().length} open · ${w.family.compliments().length} compliments`, icon: FAMILY_ICONS.complaint, accent: COL.action, onTap: () => openComplaints() }] },
    ...(debug.enabled ? [{ title: 'Debug', columns: 1, buttons: [{ id: 'quality:debugRank', label: `Rank up (debug): now ${Q.rank}`, sub: 'Its reputation floor at once; ranks never go down', disabled: !nx, accent: COL.progress, onTap: () => {
      Q.stepRankForDebug();
      autosave.request('debug');
    } }] }] : []),
  ];
  const accSections = [
    { lines: [{ text: 'Apply once you reach an accreditation’s Rank. An inspection comes a few days later and looks at what really happened: the last month’s scores, essential care, unsafe shifts and complaints. Nothing to fill in.', color: COL.textMuted }], columns: 1, buttons: Q.accreditations().map((a) => ({ id: `acc:${a.def.id}`, label: `${a.def.id} ${a.def.name}`, sub: `${STATUS_WORDS[a.status]} · ${accreditationSub(w, a)}`, icon: a.def.art, iconBadge: a.status === 'won' ? PLAQUES[a.def.id] ?? null : null, accent: a.status === 'won' ? COL.good : a.status === 'ready' && a.check.pass ? COL.action : COL.progress, badge: a.status === 'ready' && a.check.pass ? '!' : null, onTap: () => openAccreditation(a.def.id) })) },
  ];
  const bench = Q.benchmark();
  const peers = Q.peers();
  const rec = Q.recognition();
  const lastYear = rec.years.at(-1);
  const nameOfPeer = (id) => (id === 'home' ? open.data.facility.name : peerById(id)?.name ?? id); // (Milestone 31: R08 too)
  const benchSections = [
    { lines: [{ text: peers.length ? `Your home against the ${peers.length} peer home${peers.length === 1 ? '' : 's'} in the network. They are a yardstick only: they never take residents, staff or funding.` : 'No peer homes yet.', color: COL.textMuted }], bars: bench.map((b) => ({ label: b.name, value: b.home, color: scoreColour(b.home), text: `${Math.round(b.home)}`, tick: b.peerAvg ?? undefined })) },
    { title: 'Score by score', lines: bench.map((b) => ({ text: b.of ? `${b.name}: you ${Math.round(b.home)} · peers ${Math.round(b.peerAvg)} on average · best ${b.best.name} ${Math.round(b.best.v)}${b.ahead ? ` (${b.ahead} of ${b.of} ahead)` : ' (you lead)'}` : `${b.name}: you ${Math.round(b.home)}`, color: b.ahead ? COL.actionDark : COL.good })) },
    { title: 'Peer homes', columns: 1, buttons: peers.map((p) => ({ id: `peer:${p.def.id}`, label: p.def.name, sub: `${p.def.identity} · strong in ${p.def.strength} · average ${Math.round(p.avg)}`, icon: p.def.logo, accent: COL.progress, onTap: () => openPeer(p.def.id) })) },
    { title: 'Recognition table', lines: lastYear ? [{ text: `Year ${lastYear.year}: ${lastYear.table.map((r) => `${r.place}. ${nameOfPeer(r.id)} ${Math.round(r.avg)}`).join(' · ')}`, color: COL.actionDark }, { text: `All years (points): ${rec.table.map((r) => `${nameOfPeer(r.id)} ${r.points}`).join(' · ')}`, color: COL.textMuted }] : [{ text: 'The first table comes at the end of Year 1: every home placed by the average of its five scores.', color: COL.textMuted }] },
  ];
  const insp = [...Q.inspections()].reverse();
  const inspSections = [
    { lines: [{ text: `A routine review comes at the end of each year and grades the home (A–D, or S). Incidents handled never count against the home.${Q.applied() ? ` Booked: ${accreditationById(Q.applied().id).name}, ${aheadWord(w, Q.applied().day)}.` : ''}`, color: COL.textMuted }] },
    ...(insp.length ? insp.slice(0, 8).map((x) => inspectionSection(w, x)) : [{ lines: [{ text: 'No inspections yet.', color: COL.textMuted }] }]),
  ];
  return [
    { id: 'scores', label: 'Scores', sections: scoreSections },
    { id: 'accreditation', label: 'Accreditation', badge: Q.accreditations().filter((a) => a.status === 'ready' && a.check.pass).length || null, sections: accSections },
    { id: 'benchmark', label: 'Benchmark', sections: benchSections },
    { id: 'inspections', label: 'Inspections', badge: Q.unseen().length || null, sections: inspSections },
    { id: 'records', label: 'Records', sections: recordSections(w) }, // (Milestone 27)
  ];
}
// Quality → Records (Milestone 27): the Memory Book (account-wide) and how each end-of-life period went — a gentle note
// where it could have been better, never a penalty.
function recordSections(w) {
  const results = [...w.endOfLife.results()].reverse().slice(0, 6);
  return [
    { lines: [{ text: 'Your records across every home. A resident passing is never scored: only their comfort, the plan, the family’s support and their wishes are.', color: COL.textMuted }], columns: 1, buttons: [{ id: 'records:book', label: BOOK.title, sub: `${memoryBook.count} page${memoryBook.count === 1 ? '' : 's'} · ${BOOK.subtitle.toLowerCase()}`, icon: MEMORIAL.art.book, accent: COL.progress, onTap: () => openMemoryBook() }, { id: 'records:secrets', label: 'Secrets', sub: secretsSub(w), icon: SECRETS_ICON, accent: COL.progress, onTap: () => openSecrets() }, { id: 'records:achievements', label: ACH_TEXT.title, sub: achievementsSub(w), icon: ACH_ICON, accent: COL.progress, onTap: () => openAchievements() }, { id: 'records:home', label: ACH_TEXT.records, sub: ACH_TEXT.recordsSub, icon: ACH_ICON, accent: COL.progress, onTap: () => openHomeRecords() }, { id: 'records:hall', label: ACH_TEXT.hall, sub: `${w.achievements.hall.length} in the Hall of Fame${w.achievements.candidates().length ? ` · ${w.achievements.candidates().length} can be added` : ''}`, icon: ACH_ICON, accent: COL.progress, onTap: () => openHallOfFame() }] }, // (Milestone 29: Records → Secrets; Milestone 32: Achievements, Home Records, Staff Hall of Fame)
    { title: 'End-of-life care in this home', lines: results.length ? results.flatMap((r) => [{ text: `${dateWord(w, r.day)} · ${r.name}: comfort ${r.score}${r.good ? ' · a well-supported time' : ''}`, color: r.good ? COL.good : COL.actionDark }, ...(r.note ? [{ text: `What could have been better: ${r.note}`, color: COL.textMuted }] : [])]) : [{ text: 'Nothing yet.', color: COL.textMuted }] },
  ];
}
function inspectionSection(w, x) {
  const a = x.id ? accreditationById(x.id) : null;
  const title = x.kind === 'routine' ? `Routine review: grade ${x.grade} (${x.total} / 100)` : `${a.name}: ${x.pass ? 'awarded' : 'fell short'}`;
  const lines = [{ text: `${dateWord(w, x.day)}${x.kind === 'routine' && x.reputation ? ` · Reputation +${x.reputation}` : ''}${x.pass && a ? ` · ${a.reward.text}` : ''}`, color: COL.textMuted }];
  const shown = x.kind === 'accreditation' && !x.pass ? x.lines.filter((l) => !l.ok) : x.lines;
  if (x.kind === 'accreditation' && !x.pass) lines.push({ text: 'What fell short:', color: COL.bad });
  for (const l of shown) lines.push({ text: `${l.info ? '·' : l.ok ? '✓' : '✗'} ${l.text}`, color: l.info ? COL.textMuted : l.ok ? COL.good : COL.bad });
  return { title, titleDot: x.pass ? COL.good : COL.warn, lines };
}
function openQuality(tab = null) {
  open?.world?.quality.markSeen();
  sheet.open(() => {
    const w = open?.world;
    if (!w) return { title: '', sections: [] };
    const s = w.quality.scores();
    const low = SCORES.reduce((m, sc) => (s[sc.id] < s[m.id] ? sc : m), SCORES[0]);
    return { title: 'Quality', subtitle: `Rank ${w.quality.rank} · ${w.quality.wonIds().length} accreditation${w.quality.wonIds().length === 1 ? '' : 's'} · lowest: ${low.name} ${Math.round(s[low.id])}`, art: QUALITY_ART.icon, accent: accentNow(), tabs: qualityTabs(w) };
  });
  if (tab) sheet.setTab(tab);
}
function openScoreParts() {
  sheet.open(() => {
    const w = open?.world;
    if (!w) return { title: '', sections: [] };
    const s = w.quality.scores();
    return { title: 'What makes up each score', subtitle: 'Yesterday’s readings, each from the home’s own records', art: QUALITY_ART.icon, accent: accentNow(), sections: SCORES.map((sc) => ({ title: `${sc.name}: ${Math.round(s[sc.id])} (the month)`, bars: w.quality.parts(sc.id).map((p) => ({ label: `${p.label} ×${p.weight}`, value: p.value, color: scoreColour(p.value), text: `${Math.round(p.value)}` })) })) };
  });
}
let accMessage = null;
function openAccreditation(id) {
  accMessage = null;
  sheet.open(() => {
    const w = open?.world;
    if (!w) return { title: '', sections: [] };
    const a = w.quality.accreditations().find((x) => x.def.id === id);
    const past = w.quality.inspections().filter((x) => x.id === id).slice(-1);
    const can = a.status === 'ready';
    return {
      title: a.def.name,
      subtitle: `${a.def.id} · Rank ${a.def.rank} · ${STATUS_WORDS[a.status]}`,
      art: a.def.art,
      badge: a.status === 'won' ? PLAQUES[a.def.id] ?? null : null, // (Milestone 28b: the plaque / trophy once won)
      accent: a.status === 'won' ? COL.good : accentNow(),
      sections: [
        { lines: [{ text: a.def.text, color: COL.actionDark }, { text: `Reward: ${a.def.reward.text}`, color: COL.good, ...(PLAQUES[a.def.id] ? { glyph: artGlyph(PLAQUES[a.def.id]) } : {}) }, ...(accMessage ? [{ text: accMessage, color: COL.bad }] : [])] },
        { title: a.status === 'won' ? 'What the inspection found then' : 'What an inspection would find today', lines: (a.status === 'won' && past.length ? past[0].lines : a.check.lines).map((l) => ({ text: `${l.info ? '·' : l.ok ? '✓' : '✗'} ${l.text}`, color: l.info ? COL.textMuted : l.ok ? COL.good : COL.bad })) },
        ...(past.length && a.status !== 'won' ? [inspectionSection(w, past[0])] : []),
        ...(a.status === 'won' ? [] : [{ columns: 1, buttons: [{ id: `acc:apply:${id}`, label: a.status === 'applied' ? `Inspection ${aheadWord(w, a.inspectionDay)}` : 'Apply for an inspection', sub: can ? `The inspectors come in ${INSPECTION.daysOut} days and look at the home as it is then` : accreditationSub(w, a), disabled: !can, accent: COL.action, onTap: () => {
          const r = w.quality.apply(id);
          accMessage = r.ok ? null : r.reason;
          if (r.ok) {
            dayBeat.showText(`Inspection booked: ${a.def.name}, ${aheadWord(w, r.day)}`, true);
            autosave.request('quality');
          }
        } }] }]),
      ],
    };
  });
}
function openPeer(id) {
  sheet.open(() => {
    const w = open?.world;
    const p = w?.quality.peers().find((x) => x.def.id === id);
    if (!p) return { title: '', sections: [] };
    const s = w.quality.scores();
    return { title: p.def.name, subtitle: `${p.def.identity} · strong in ${p.def.strength} · in the network since Year ${p.def.year ?? w.clock.dateOf(p.joined).year}`, art: p.def.logo, accent: COL.progress, sections: [
      { lines: [{ text: p.def.adaptive ? 'A prestige benchmark: it keeps a step ahead of your home on every score. A yardstick, never a rival for your residents, staff or funding.' : 'A peer home in the benchmark network: a yardstick, never a rival for your residents, staff or funding.', color: COL.textMuted }], bars: SCORES.map((sc) => ({ label: sc.name, value: p.scores[sc.id], color: COL.progress, text: `${Math.round(p.scores[sc.id])}`, tick: s[sc.id] })) },
      { lines: [{ text: 'The mark on each bar is your home.', color: COL.textMuted }] },
    ] };
  });
}
// The Inbox's quality items: inspection results not yet seen (they stay until Quality or the Inbox is opened).
function qualityInbox(w, fresh) {
  return fresh.map((x) => ({ ...inspectionSection(w, x), columns: 1, buttons: [{ id: `inbox:quality:${x.uid}`, label: 'Open Quality', sub: x.kind === 'routine' ? 'Scores, Rank and inspections' : 'Accreditation', icon: QUALITY_ART.icon, accent: COL.progress, onTap: () => openQuality(x.kind === 'routine' ? 'inspections' : 'accreditation') }] }));
}
// Milestone 26: rank-ups and awards (Milestone 28: their beats come from the director, as Recognition).
bus.on('quality:rankUp', () => open && autosave.request('rank'));
bus.on('quality:award', () => open && autosave.request('award'));
// Quality → Compliments & complaints: the home's Family Trust, open improvement tasks with their trails, the resolved ones,
// and the compliments list.
function openComplaints() {
  sheet.open(() => {
    const w = open?.world;
    if (!w) return { title: '', sections: [] };
    for (const c of w.family.unseen()) w.family.seenComplaint(c.id);
    const t = w.family.trust();
    const openList = w.family.open();
    const resolved = w.family.complaints().filter((c) => c.status === 'resolved').slice(-6).reverse();
    const compliments = [...w.family.compliments()].reverse().slice(0, 10);
    const n = w.residents.filter((p) => !p.state.leaving && w.family.recordOf(p.id)?.contact).length;
    return {
      title: 'Compliments & complaints',
      subtitle: `Family Trust ${t == null ? '—' : Math.round(t)} / 100 · ${openList.length} open · ${compliments.length ? `${w.family.compliments().length} compliments` : 'no compliments yet'}`,
      art: FAMILY_ICONS.trust,
      accent: accentNow(),
      sections: [
        { lines: [{ text: t == null ? 'No families yet.' : `Family Trust: ${Math.round(t)} / 100, the average over ${n} famil${n === 1 ? 'y' : 'ies'}`, color: trustColour(t) }, { text: 'A complaint becomes an improvement task: fix what went wrong, then mark it done to win the family’s trust back. Complaints never cost Credits. Left past the due date, trust drifts down slowly.', color: COL.textMuted }], bars: t == null ? [] : [{ label: 'Family Trust', value: t, color: trustColour(t), text: `${Math.round(t)}` }] },
        ...(openList.length ? openList.map((c) => complaintSection(w, c, 'quality')) : [{ title: 'Open complaints', lines: [{ text: 'None open.', color: COL.good }] }]),
        { title: 'Resolved', lines: resolved.length ? resolved.flatMap((c) => [{ text: `${first(c.name)}: ${COMPLAINTS[c.kind]?.title ?? ''} · raised ${agoWord(w, c.raised)}, resolved ${agoWord(w, c.resolved)} · Family Trust ${signed1(c.drop)} then ${signed1(c.recovered)}${c.drifted ? ` (drifted ${signed1(c.drifted)})` : ''}`, color: COL.actionDark }, ...c.trail.map((x) => ({ text: `   ${agoWord(w, x.day)}  ${x.text}`, color: COL.textMuted }))]) : [{ text: 'Nothing resolved yet.', color: COL.textMuted }] },
        { title: `Compliments${compliments.length ? ` (${w.family.compliments().length})` : ''}`, lines: compliments.length ? compliments.map((k) => ({ glyph: artGlyph(FAMILY_ICONS.compliment), text: `${agoWord(w, k.day)}: ${k.text}${k.staff.length ? ` · ${k.staff.map((id) => first(w.byId(id)?.name ?? id)).join(', ')} +${k.morale} Morale` : ''} · Family Trust ${signed1(k.trust)}`, color: COL.good })) : [{ text: 'None yet. Good visits, birthdays done well and residents going home after rehab bring them.', color: COL.textMuted }] },
      ],
    };
  });
}
// The Inbox's family items: a meeting the family asked for, a room or party request, a new complaint.
function familyInbox(w) {
  const out = [];
  const can = w.family.canBook();
  for (const a of w.family.asks()) {
    const p = w.residentById(a.resident);
    out.push({ title: `${w.family.whoOf(a.resident)}: a care-plan meeting`, lines: [{ text: `${w.family.whoOf(a.resident)} would like a care-plan meeting about ${w.family.callOf(a.resident)}${a.why === 'low' ? ': they are not happy with how things are going' : ': the plan is due for a review'}.`, color: COL.actionDark }], columns: 2, buttons: [
      { id: `ask:book:${a.id}`, label: a.why === 'review' ? 'Book a review with them' : 'Book a meeting', sub: can ? `The Founder or a nurse attends for an hour · Family Trust +${MEETING.lift}` : 'Needs the Founder or a nurse on the Afternoon shift', disabled: !can, accent: COL.good, onTap: () => {
        const r = w.family.answerAsk(a.id, true);
        if (r.ok) autosave.request('family');
      } },
      { id: `ask:later:${a.id}`, label: 'Not now', sub: `Kindly · Family Trust ${signed1(MEETING_ASK.declineTrust)}`, accent: COL.progress, onTap: () => {
        w.family.answerAsk(a.id, false);
        autosave.request('family');
      } },
      ...(p ? [{ id: `ask:card:${a.id}`, label: `${first(p.name)}'s card`, sub: 'Their plan and family', accent: COL.progress, onTap: () => openHomeSheet(p.id) }] : []),
    ] });
  }
  const message = familyMessage;
  for (const q of w.family.requests()) {
    const R = REQUESTS[q.kind];
    out.push({ title: q.title, lines: [{ text: q.text, color: COL.actionDark }, ...(message ? [{ text: message, color: COL.bad }] : []), { text: `An answer by ${aheadWord(w, q.until + 1)}; no answer is taken as a kind no.`, color: COL.textMuted }], columns: 2, buttons: [
      { id: `request:yes:${q.id}`, label: 'Agree', sub: `${q.kind === 'birthdayParty' ? 'The family comes to the birthday tea' : `Moves to room ${w.roomNumber(q.room)} now`} · Family Trust +${R.agreeTrust}`, accent: COL.good, onTap: () => {
        const r = w.family.answerRequest(q.id, true);
        familyMessage = r.ok ? null : r.reason;
        if (r.ok) autosave.request('family');
      } },
      { id: `request:no:${q.id}`, label: 'Kindly decline', sub: `Family Trust ${signed1(REQUEST.declineTrust)}`, accent: COL.progress, onTap: () => {
        w.family.answerRequest(q.id, false);
        autosave.request('family');
      } },
    ] });
  }
  for (const c of w.family.unseen()) out.push({ title: `A complaint from ${c.from}`, titleDot: COL.warn, lines: [{ text: c.text, color: COL.actionDark }, { text: `Improvement task: ${c.fixText} · no Credits lost`, color: COL.textMuted }], columns: 1, buttons: [{ id: `complaint:inbox:${c.id}`, label: 'Open the improvement task', sub: 'Quality → Compliments & complaints', accent: COL.action, onTap: () => openComplaints() }] });
  return out;
}
const familyWaiting = () => (open?.world?.family ? open.world.family.asks().length + open.world.family.requests().length + open.world.family.unseen().length : 0);
// Quality's badge: new complaints, and open ones ready to mark done.
const qualityBadge = () => (open?.world?.family ? open.world.family.unseen().length + open.world.family.open().filter((c) => open.world.family.improvement(c.id).ok).length || null : null);
// The Reception / Family Desk card: Family Trust, today's visits, meetings booked, what is waiting.
function familyDeskSections(w) {
  const t = w.family.trust();
  const today = w.family.visitsToday();
  const booked = w.residents.map((p) => ({ p, m: w.family.recordOf(p.id)?.meeting })).filter((x) => x.m);
  const low = w.residents.filter((p) => !p.state.leaving && w.family.recordOf(p.id)?.contact).map((p) => ({ p, t: w.family.recordOf(p.id).trust })).sort((a, b) => a.t - b.t).slice(0, 3);
  const lines = [
    { text: t == null ? 'Family Trust: no families yet' : `Family Trust: ${Math.round(t)} / 100 (the home's average)`, color: trustColour(t) },
    ...today.map((v) => ({ text: `${w.family.whoOf(v.resident)} → ${first(w.residentById(v.resident)?.name ?? '')}: ${v.phase === 'due' ? `expected at ${clockText(v.at % 24)}` : v.phase === 'leaving' ? 'on the way out' : v.phase === 'with' ? 'visiting now' : 'arriving'}${v.meeting ? ' (care-plan meeting)' : v.party ? ' (birthday party)' : ''}`, color: v.phase === 'with' ? COL.good : COL.textMuted })),
    ...(today.length ? [] : [{ text: 'No visitors expected today.', color: COL.textMuted }]),
    ...booked.map((x) => ({ text: `Meeting: ${first(x.p.name)}'s family, ${aheadWord(w, x.m.day)} afternoon`, color: COL.actionDark })),
    ...(low.length ? [{ text: `Lowest trust: ${low.map((x) => `${first(x.p.name)} ${Math.round(x.t)}`).join(' · ')}`, color: COL.textMuted }] : []),
  ];
  const waiting = familyWaiting();
  return [{ title: 'Families', lines, bars: t == null ? [] : [{ label: 'Family Trust', value: t, color: trustColour(t), text: `${Math.round(t)}` }], columns: 1, buttons: [{ id: 'desk:quality', label: 'Compliments & complaints', sub: `${w.family.open().length} open · ${w.family.compliments().length} compliments${waiting ? ` · ${waiting} in the Inbox` : ''}`, icon: FAMILY_ICONS.complaint, accent: COL.action, onTap: () => openComplaints() }] }];
}
// --- Milestone 16: mobility, rehab goals, falls risk, discharge ----------------------------------------------------------
const REHAB_COLOUR = { 'Ready to go home': COL.good, 'On track': COL.good, Slow: COL.warn, 'Just started': COL.actionDark };
function readyNotice(w, r, from) {
  const left = r.autoDay - w.clock.totalDays;
  return { title: `${first(r.name)} is ready to go home`, lines: [
    { text: 'Every rehab goal is met. Keeping them longer brings nothing extra: their funding drops to the ready-to-go-home rate.', color: COL.actionDark },
    { text: r.kept ? 'Kept on for now: no extra funding or reward while they stay.' : left > 0 ? `They go home on their own in ${left} day${left === 1 ? '' : 's'} if you don't send them sooner.` : 'They go home today.', color: r.kept ? COL.warn : COL.textMuted },
  ], columns: 2, buttons: [
    { id: `discharge:${from}:${r.id}`, label: 'Send home now', sub: `With family · +${DISCHARGE.rewards.reputation} Reputation, +${DISCHARGE.rewards.research} Research`, accent: COL.good, onTap: () => {
      const res = w.discharge(r.id);
      if (res.ok) autosave.request('discharge');
      if (from === 'card') sheet.close();
    } },
    { id: `keep:${from}:${r.id}`, label: r.kept ? 'Kept on' : 'Keep for now', sub: 'Brings nothing extra', disabled: !!r.kept, accent: COL.progress, onTap: () => {
      w.keepForNow(r.id);
      autosave.request('discharge');
    } },
  ] };
}
function rehabSections(w, it) {
  const st = it.state;
  const out = [];
  const m = st.mobility;
  if (m) {
    const f = w.fallsOf(it.id);
    const mods = (f?.parts ?? []).filter((x) => x.key !== 'level' && x.key !== 'aid').map((x) => `${x.text} ${x.value > 0 ? '+' : ''}${Math.round(x.value)}`);
    out.push({ title: 'Mobility', lines: [
      { glyph: artGlyph(SECTION_ICONS.mobility), text: `${AIDS[m.aid].name}${m.aid === 'none' ? '' : ` · walks at ${Math.round(AIDS[m.aid].speed * 100)}% of the usual pace`}`, color: COL.actionDark },
      { text: `Falls risk ${f.risk} (${f.band})${mods.length ? ` · ${mods.join(' · ')}` : ''}`, color: f.band === 'High' ? COL.warn : COL.textMuted },
      { text: fallLine(w, it), color: it.state.fallRest || it.state.fallen ? COL.warn : COL.textMuted }, // (Milestone 25: falls happen now)
    ], bars: [{ label: 'Mobility level', value: m.level, color: COL.progress }] });
  }
  const r = st.rehab;
  if (r?.active) {
    const status = w.rehabStatus(it.id);
    const lines = [
      { text: status, color: REHAB_COLOUR[status] ?? COL.actionDark },
      { text: `Therapy at ${w.therapySpaceOf(it.id)} · ${r.sessions} session${r.sessions === 1 ? '' : 's'}${r.missed ? ` · ${r.missed} missed` : ''} · the marks are ${theirOf(it.id)} targets`, color: COL.textMuted },
    ];
    if (st.outcomes.mood < 40) lines.push({ text: 'Low Mood is slowing progress', color: COL.warn });
    if (st.needs.nutrition > 60) lines.push({ text: 'Not eating well: progress is slower', color: COL.warn });
    out.push({ title: 'Rehab goals', lines: withGlyph(lines, SECTION_ICONS.rehab), bars: GOALS.map((g) => ({ label: g.name, value: r.goals[g.id], tick: r.targets[g.id], color: r.goals[g.id] >= r.targets[g.id] ? COL.good : COL.progress, text: `${Math.round(r.goals[g.id])}/${r.targets[g.id]}` })) });
    if (r.readyDay != null && !st.leaving) out.push(readyNotice(w, { id: it.id, name: it.name, readyDay: r.readyDay, autoDay: r.readyDay + DISCHARGE.autoDays, kept: !!r.kept }, 'card'));
  }
  return out;
}
// Milestone 13: pin a team member to a small group of residents (tap to add / remove; up to CONTINUITY.maxResidents).
function openContinuity(staffId) {
  let message = null;
  sheet.open(() => {
    const w = open?.world;
    const q = w?.byId(staffId);
    if (!q) return { title: '', sections: [] };
    const grp = w.continuityOf(staffId);
    const rows = w.residents.filter((r) => !r.state.leaving && !r.state.guest).map((r) => {
      const on = grp.includes(r.id);
      return { id: `pin:${r.id}`, label: `${on ? '✓ ' : ''}${r.name}`, sub: `${r.def.support} · familiarity ${Math.round(familiarityOfCare(w, r.id, staffId))}`, icon: r.art, iconCrop: PORTRAIT_CROP, selected: on, accent: on ? COL.good : COL.progress, onTap: () => {
        const res = w.toggleContinuity(staffId, r.id);
        message = res.ok ? null : res.reason;
        if (res.ok) autosave.request('roster');
      } };
    });
    return {
      title: `${first(q.name)}'s residents`,
      subtitle: `Continuity group · ${grp.length} of ${CONTINUITY.maxResidents}`,
      art: q.art,
      badge: ROLES[q.role].badge,
      accent: accentNow(),
      sections: [
        { lines: [...(message ? [{ text: message, color: COL.bad }] : []), { text: 'Tap a resident to add or remove them. When on shift, they are preferred for these residents; nobody is held back when they are off.', color: COL.textMuted }] },
        { columns: 1, buttons: rows },
        { columns: 1, buttons: [{ id: 'group:back', label: '‹ Back to the roster', accent: COL.progress, onTap: () => openRoster() }] },
      ],
    };
  });
}
const familiarityOfCare = (w, residentId, staffId) => w.topStaffFor(residentId, 99).find((r) => r.staff === staffId)?.familiarity ?? 0;
// Develop / Quality: what will live there.
// --- Develop and Build Mode (Milestone 10) -----------------------------------------------------------------------------
const stageOf = (n) => STAGES[n - 1];
// Develop: Build Mode, the home's stage and capacity, and (?debug=1) the upgrade and the unlock-all switch.
function openDevelop() {
  const slot = BOTTOM_SLOTS.find((s) => s.id === 'develop');
  sheet.open(() => {
    const w = open?.world;
    if (!w) return { title: '', sections: [] };
    const st = w.stage;
    const next = stageOf(st.n + 1);
    const stageRows = [{ id: 'dev:build', label: 'Build Mode', sub: 'Place, move and sell rooms and facilities (50% back when you sell)', icon: slot.icon, accent: COL.action, onTap: () => {
      sheet.close();
      homeScreen.setBuildMode(true);
    } }];
    // Milestone 24: the next stage with its real unlock (the parts the game can check show ✓), its cost and building
    // days — or the building under way; the specialist wings
    const up = w.build.upgradeStatus();
    const bld = w.build.building;
    if (bld) stageRows.push({ id: 'dev:stage', label: `Building Stage ${bld.to}: ${stageOf(bld.to).name}`, sub: `Ready on day ${bld.doneDay + 1} (${Math.max(0, bld.doneDay - w.clock.totalDays)} days left) · the home carries on as usual`, disabled: true, accent: COL.gold });
    else if (next) stageRows.push({ id: 'dev:stage', label: `Stage ${next.n}: ${next.name}`, sub: `${up.ok ? 'Ready' : 'Locked'} — ${up.parts.map((x) => `${x.ok ? '✓ ' : ''}${x.text}`).join(' · ')} · room for ${Math.min(next.capacity, LOGICAL_CAP)} residents${next.cost ? ` · ${credits(next.cost)} Credits, ${next.buildDays} days to build` : ''}`, disabled: !up.ok, accent: up.ok ? COL.good : COL.progress, onTap: () => upgradeStage() });
    const wl = w.wings.list();
    stageRows.push(st.n >= 3
      ? { id: 'dev:wings', label: 'Specialist wings', sub: wl.filter((x) => x.unlocked).map((x) => `${x.def.short}: ${x.active ? `${x.residents} residents` : x.tiles ? 'needs its hub' : 'not painted'}`).join(' · '), icon: 'facility_f31', accent: COL.action, onTap: () => openWings() }
      : { id: 'dev:wings', label: 'Specialist wings', sub: 'The Memory and Rehabilitation wings open at Stage 3; High-Care and Palliative at Stage 4', disabled: true, accent: COL.progress });
    // Milestone 21: research
    const rq = w.research.queues().filter((q) => q.open);
    const busy = rq.filter((q) => q.nodeId);
    stageRows.push({ id: 'dev:research', label: 'Research', sub: `${w.research.rp.toLocaleString('en-GB')} RP · ${w.research.doneIds().length} of ${RESEARCH.length} done · ${busy.length ? `researching ${busy.map((q) => researchById(q.nodeId).name).join(', ')}` : 'the slot is free'}`, icon: 'care_ui_03', accent: COL.action, onTap: () => openResearch() });
    // Milestone 20: the specialist programs
    const nRun = w.programs.running().length;
    const nReady = w.programs.list().filter((x) => x.can.ok).length;
    stageRows.push({ id: 'dev:programs', label: 'Programs', sub: `${nRun} running · ${nReady} ready to start · sessions residents choose to join`, icon: 'program_prg01', accent: COL.action, onTap: () => openPrograms() });
    const dbg = debug.enabled
      ? [{ title: 'Debug', columns: 1, buttons: [
        ...(next && !bld ? [{ id: 'dev:upgrade', label: `Upgrade to Stage ${next.n} now (debug)`, sub: `Skips the Rank rule for testing${next.cost ? ` · ${credits(next.cost)} Credits, ${next.buildDays} days of building` : ''}`, accent: COL.progress, onTap: () => {
          const r = upgradeStage();
          if (r && !r.ok) debug.log(r.reason);
        } }] : []),
        { id: 'dev:fill', label: `Fill to cap (debug): Stage 5, ${LOGICAL_CAP} rooms, every resident, ~40 staff`, sub: 'For the performance check: Memory and High-Care wings with their hubs and rooms', accent: COL.progress, onTap: () => {
          const r = w.fillToCapForDebug();
          debug.log(`fill: ${JSON.stringify(r)}`);
          window.__cw.fillReport = r;
          sheet.close();
          autosave.request('debug');
        } },
        { id: 'dev:unlock', label: `Unlock all rooms and facilities (debug): ${w.layout.debugUnlock ? 'On' : 'Off'}`, sub: 'For testing (the two secret facilities stay hidden)', accent: w.layout.debugUnlock ? COL.good : COL.progress, onTap: () => {
          w.build.setDebugUnlock(!w.layout.debugUnlock);
          autosave.request('debug');
        } },
      ] }]
      : [];
    return {
      title: slot.title,
      subtitle: `Stage ${st.n}: ${st.name} · ${w.rooms.length} of ${st.capacity} rooms`,
      art: slot.icon,
      accent: accentNow(),
      sections: [
        { lines: [`Residents live one to a room: ${w.rooms.length} rooms built, ${w.freeRooms().length} free. Stage ${st.n} holds up to ${st.capacity}.`], columns: 1, buttons: stageRows },
        ...dbg,
      ],
    };
  });
}
// Milestone 24: the specialist wings — what each is for, its floor, its hub, its rooms, residents and staff — and Paint,
// which goes to Build Mode with that wing's brush.
function openWings() {
  sheet.open(() => {
    const w = open?.world;
    if (!w) return { title: '', sections: [] };
    const sections = [{ lines: [{ text: 'A wing is floor you paint in Build Mode, with its hub inside. Wing rooms must stand in their wing; residents who need a wing prefer a room there; staff can be assigned to it on the roster, and Safe Coverage is counted for each wing.', color: COL.textMuted }] }];
    for (const x of w.wings.list()) {
      const d = x.def;
      const hubs = d.hubs.map((id) => facilityById(id).name).join(' or ');
      const lines = !x.unlocked
        ? [{ text: `Opens at Stage ${d.stage}`, color: COL.textMuted }]
        : [
          { text: x.tiles ? `${x.tiles} tiles of floor` : 'Not painted yet', color: x.tiles ? COL.actionDark : COL.textMuted },
          { text: x.hub ? `Hub: ${x.hub.name} — the wing is working` : `Needs its hub inside it: ${hubs}`, color: x.hub ? COL.good : COL.warn },
          `Wing rooms: ${d.rooms.map((id) => roomById(id).name).join(', ')} · ${x.rooms} rooms here, ${x.residents} residents, ${x.staff} staff assigned`,
          ...(d.later ? [{ text: d.later, color: COL.textMuted }] : []),
        ];
      sections.push({ title: d.name, lines, columns: 1, buttons: [{ id: `wing:paint:${d.id}`, label: x.tiles ? `Paint or clear the ${d.short} wing` : `Paint the ${d.short} wing`, sub: x.unlocked ? 'Build Mode: tap two corners of a rectangle' : `Opens at Stage ${d.stage}`, icon: facilityById(d.hubs[0]).art, disabled: !x.unlocked, accent: COL.action, onTap: () => {
        sheet.close();
        homeScreen.startWingPaint(d.id);
      } }] });
    }
    sections.push({ columns: 1, buttons: [{ id: 'wings:back', label: '‹ Back to Develop', accent: COL.progress, onTap: () => openDevelop() }] });
    return { title: 'Specialist wings', subtitle: `Stage ${w.stage.n} · ${w.wings.list().filter((x) => x.active).length} working`, art: 'facility_f31', accent: accentNow(), sections };
  });
}
// --- Research (Milestone 21, bible §26) ----------------------------------------------------------------------------------
const branchOf = (id) => BRANCHES.find((b) => b.id === id);
// What a node opens or improves, in plain words.
function nodeDoes(x) {
  const out = x.unlocks.map((u) => (u.type === 'program' ? `Opens the program: ${VISIBLE_PROGRAMS.find((p) => p.id === u.id)?.name ?? u.id}` : `Opens in Build Mode: ${facilityById(u.id)?.name ?? u.id} (${u.id})`));
  out.push(...x.effects.map((e) => e.text));
  if (x.later) out.push('Comes into play later (its part of the home arrives in a later update)');
  return out;
}
// The picture on a node's card: what it opens (a program icon, a facility), else the Develop icon.
function nodeIcon(x) {
  const u = x.unlocks[0];
  if (u?.type === 'program') return VISIBLE_PROGRAMS.find((p) => p.id === u.id)?.icon ?? 'care_ui_03';
  if (u?.type === 'facility') return facilityById(u.id)?.art ?? 'care_ui_03';
  return branchOf(x.branch)?.icon ?? 'care_ui_03'; // (Milestone 28b: its branch's icon)
}
const STATE_WORD = { done: 'Done', active: 'Researching', available: 'Available', locked: 'Locked' };
let researchPick = null;
function openResearch(pick = null) {
  researchPick = pick ?? researchPick;
  let message = null;
  sheet.open(() => {
    const w = open?.world;
    if (!w) return { title: '', sections: [] };
    const R = w.research;
    // the queue
    const qLines = [];
    const qBars = [];
    for (const q of R.queues()) {
      if (!q.open) {
        qLines.push({ text: `${QUEUES[q.i].name}: locked — ${q.text ?? 'opens later'}`, color: COL.textMuted });
        continue;
      }
      if (!q.nodeId) {
        qLines.push({ text: `${QUEUES[q.i].name}: free — choose a node below`, color: COL.actionDark });
        continue;
      }
      const x = researchById(q.nodeId);
      qBars.push({ label: `${x.name} (${x.id})`, value: q.fraction * 100, color: COL.progress, text: `${q.daysLeft} day${q.daysLeft === 1 ? '' : 's'}` });
    }
    // the chosen node
    const x = researchPick && researchById(researchPick);
    const pickSec = [];
    if (x) {
      const st = R.status(x.id);
      const why = R.why(x.id);
      const can = R.canStart(x.id);
      const lines = [
        ...(message ? [{ text: message, color: COL.bad }] : []),
        { text: x.text, color: COL.actionDark },
        `Cost: ${x.cost.toLocaleString('en-GB')} RP, paid when it starts · then ${x.days} days`,
        { text: x.requires.length ? `Needs first: ${x.requires.map((r) => `${nodeLabel(r)}${R.has(r) ? ' ✓' : ''}`).join(', ')}` : 'Needs first: nothing', color: x.requires.every((r) => R.has(r)) ? COL.good : COL.textMuted },
        { text: `State: ${STATE_WORD[st]}${st === 'active' ? ` (${Math.round(R.fraction(x.id) * 100)}%)` : ''}${why && st !== 'active' ? ` — ${why}` : ''}`, color: st === 'done' ? COL.good : st === 'locked' ? COL.bad : COL.actionDark },
        ...nodeDoes(x).map((t) => ({ text: t, color: COL.good })),
      ];
      const btn = st === 'done' || st === 'active'
        ? []
        : [{ id: 'res:start', label: `Start ${x.name}`, sub: can.ok ? `Pay ${x.cost.toLocaleString('en-GB')} RP now · done in ${x.days} days` : can.reason, disabled: !can.ok, accent: COL.good, onTap: () => {
          const r = R.start(x.id);
          message = r.ok ? null : r.reason;
          if (r.ok) autosave.request('research');
        } }];
      pickSec.push({ title: `${x.name} (${x.id})`, lines, columns: 1, buttons: btn });
    } else pickSec.push({ lines: [{ text: 'Tap a node to see what it needs and what it does.', color: COL.textMuted }] });
    // six columns: one per branch
    const lanes = BRANCHES.map((b) => {
      const nodes = RESEARCH.filter((y) => y.branch === b.id);
      return {
        id: `res:lane:${b.id}`,
        title: b.id,
        sub: `${nodes.filter((y) => R.has(y.id)).length} / 6`,
        accent: COL.progress,
        items: nodes.map((y) => {
          const st = R.status(y.id);
          return {
            id: `res:${y.id}`,
            label: y.id,
            sub: st === 'done' ? 'Done' : st === 'active' ? `${Math.round(R.fraction(y.id) * 100)}%` : `${y.cost} RP`,
            icon: nodeIcon(y),
            tag: st === 'done' ? '✓' : st === 'active' ? 'NOW' : null,
            accent: st === 'done' ? COL.good : st === 'active' ? COL.gold : st === 'available' ? COL.action : COL.progress,
            selected: researchPick === y.id && st !== 'done', // (a done node stays green)
            onTap: () => {
              researchPick = y.id;
              message = null;
            },
          };
        }),
      };
    });
    const dbg = debug.enabled ? [{ title: 'Debug', columns: 1, buttons: [{ id: 'res:debugRp', label: 'Add 1,000 RP (debug)', sub: 'For testing: a ledger line like any other', accent: COL.progress, onTap: () => R.addRp(1000, 'Debug', 'debug') }] }] : [];
    return {
      title: 'Research',
      subtitle: `${R.rp.toLocaleString('en-GB')} Research Points · ${R.doneIds().length} of ${RESEARCH.length} done`,
      art: 'care_ui_03',
      badge: REWARD_ART.research, // (Milestone 28b: the Research Token)
      accent: accentNow(),
      sections: [
        { title: 'Researching', lines: qLines, bars: qBars },
        ...pickSec,
        { title: 'Branches', lines: BRANCHES.map((b) => ({ text: `${b.id} ${b.name}`, color: COL.textMuted, glyph: artGlyph(b.icon) })), lanes }, // (Milestone 28b: each branch's icon)
        { lines: [{ text: 'Research Points come from good care: successful discharges, compliments, a good month, running programs and the learning rooms.', color: COL.textMuted }] },
        ...dbg,
        { columns: 1, buttons: [{ id: 'res:back', label: '‹ Back to Develop', accent: COL.progress, onTap: () => openDevelop() }] },
      ],
    };
  });
}
// The Ledger: Research Points (a run currency) — this month's ins and outs.
function researchLedger(w, range) {
  const lines = w.ledger.economy.ledger.filter((l) => l.currency === 'rp' && l.day >= range.fromDay);
  const inn = lines.filter((l) => l.amount > 0).reduce((a, l) => a + l.amount, 0);
  const out = lines.filter((l) => l.amount < 0).reduce((a, l) => a + l.amount, 0);
  return {
    title: 'Research Points',
    lines: [
      { text: `Balance: ${w.research.rp.toLocaleString('en-GB')} RP`, color: COL.actionDark },
      ...lines.slice(-5).reverse().map((l) => ({ text: `${l.amount < 0 ? '−' : '+'}${Math.abs(l.amount)} RP  ${l.reason}`, color: l.amount < 0 ? COL.bad : COL.good })),
      { text: `This month: earned ${inn} · spent ${-out}`, color: COL.textMuted },
    ],
  };
}
// --- Specialist programs (Milestone 20, bible §23) ----------------------------------------------------------------------
const SLOT_TIME = { morning: 'mornings', afternoon: 'afternoons' };
// "Gardening club: Tue, Fri mornings" · "Music & Memory session: Mon, Wed, Fri at 15:00" · "nothing extra on the timetable"
function programSchedule(d) {
  const A = d.adds;
  if (A.kind === 'session') return `${A.name}: ${dayList(A.days)} ${SLOT_TIME[A.slot]}`;
  if (A.kind === 'task') return `${A.name}: ${dayList(A.days)} at ${(Array.isArray(A.at) ? A.at : [A.at]).map(clockText).join(' and ')}`;
  return 'Nothing extra on the timetable: it changes what already happens';
}
function programSub(w, x) {
  const d = x.def;
  const cost = `${credits(d.resources.weeklyCost)} Credits a week`;
  if (x.running) return `Running since ${agoWord(w, x.running.since)} · ${x.running.joined} joined, ${x.running.declined} chose not to · ${cost}`;
  if (!x.can.ok) return `${x.can.reason} · ${cost}`;
  return `Start · ${x.hours.text} · ${cost}`;
}
// Develop → Programs: the ten visible programs, and PRG11 / PRG12 once their secret is found (Milestone 31).
const SECRET_PROGRAM_ICON = 'care_ui_29';
function openPrograms() {
  sheet.open(() => {
    const w = open?.world;
    if (!w) return { title: '', sections: [] };
    const list = w.programs.list();
    const row = (x) => ({ id: `prog:${x.def.id}`, label: `${x.def.name} · ${x.def.focus}`, sub: programSub(w, x), icon: x.def.icon, iconBadge: x.prestige ? SECRET_PROGRAM_ICON : null, accent: x.running ? COL.good : x.can.ok ? COL.action : COL.progress, onTap: () => openProgram(x.def.id) }); // (Milestone 31: a prestige program wears the Secret Program icon)
    const running = list.filter((x) => x.running);
    const rest = list.filter((x) => !x.running);
    const weekly = running.reduce((a, x) => a + x.def.resources.weeklyCost, 0);
    const dbg = debug.enabled
      ? [{ title: 'Debug', columns: 1, buttons: [{ id: 'prog:debug', label: `Unlock research, partner and wing programs (debug): ${w.programs.debug ? 'On' : 'Off'}`, sub: 'For testing: the facility, staff-hours and Credits rules still apply', accent: w.programs.debug ? COL.good : COL.progress, onTap: () => {
        w.programs.setDebugUnlock(!w.programs.debug);
        autosave.request('debug');
      } }] }]
      : [];
    return {
      title: 'Programs',
      subtitle: `${running.length} running · ${credits(weekly)} Credits a week · residents choose whether to join`,
      art: 'program_prg01',
      accent: accentNow(),
      sections: [
        { lines: [{ text: 'A program offers sessions and support; each resident decides for themselves. A refusal is never overridden, and a program runs whether or not anyone joins.', color: COL.textMuted }] },
        ...(running.length ? [{ title: 'Running', columns: 1, buttons: running.map(row) }] : []),
        { title: running.length ? 'Not running' : 'Programs', columns: 1, buttons: rest.map(row) },
        ...dbg,
        { columns: 1, buttons: [{ id: 'prog:back', label: '‹ Back to Develop', accent: COL.progress, onTap: () => openDevelop() }] },
      ],
    };
  });
}
// One program: what it is, its unlock, resources against the roster, what it adds, who it suits, its effect, how
// residents have taken part — and Start / Stop.
function openProgram(id) {
  let message = null;
  sheet.open(() => {
    const w = open?.world;
    const x = w?.programs.list().find((y) => y.def.id === id);
    if (!x) return { title: '', sections: [] };
    const d = x.def;
    const R = d.resources;
    const run = x.running;
    const fac = R.facility ? facilityById(R.facility) : null;
    const head = [{ text: d.text, color: COL.actionDark }, { text: `Unlock: ${unlockWords(d)}`, color: x.unlock.ok ? COL.good : COL.textMuted }, `Scope: ${d.scope === 'wing' ? 'one wing (Home)' : 'the whole home'}`];
    if (message) head.unshift({ text: message, color: COL.bad });
    const res = [
      { text: `Staff: ${x.hours.text}`, color: x.hours.ok || run ? COL.actionDark : COL.bad },
      { text: fac ? `Facility: ${fac.name}${w.layout.ofDef(R.facility).length ? ' (placed)' : ' (not placed yet)'}` : 'Facility: none needed', color: !fac || w.layout.ofDef(R.facility).length ? COL.actionDark : COL.bad },
      `Cost: ${credits(R.weeklyCost)} Credits a week, paid at the end of each week it runs (stopping pays only for the days it ran)`,
      ...(R.prop ? ['Brings its own things to the session (the activity prop)'] : []),
    ];
    if (run && !x.hours.ok) res.push({ text: 'Short of staff hours on the roster now: sessions still run when someone can lead them', color: COL.warn });
    const adds = [programSchedule(d), { text: `Suits: ${d.suits.text}`, color: COL.actionDark }, { text: 'Residents choose: nobody is made to join, and a refused plan option or activity is never overridden.', color: COL.textMuted }];
    const fx = [{ text: x.effect, color: COL.good }, ...(x.prestige ? [{ text: x.boost > 1 ? `The Centenarian Garden is making it ${Math.round((x.boost - 1) * 100)}% stronger` : 'A Centenarian Garden in the home would make it stronger', color: x.boost > 1 ? COL.good : COL.textMuted }] : [])]; // (Milestone 31)
    const part = run ? [
      { text: `Running since ${agoWord(w, run.since)}: ${run.sessions} session${run.sessions === 1 ? '' : 's'} so far`, color: COL.actionDark },
      `Offered ${run.offered} · joined ${run.joined} · chose not to ${run.declined}`,
      `Paid so far: ${credits(run.paid)} Credits`,
    ] : [{ text: 'Not running', color: COL.textMuted }];
    const btn = run
      ? { id: 'prog:stop', label: 'Stop this program', sub: 'No penalty: residents just lose the benefit', accent: COL.bad, onTap: () => confirmStopProgram(id) }
      : { id: 'prog:start', label: `Start · ${credits(R.weeklyCost)} Credits a week`, sub: x.can.ok ? x.hours.text : x.can.reason, disabled: !x.can.ok, accent: COL.good, onTap: () => {
        const r = w.programs.start(id);
        message = r.ok ? null : r.reason;
        if (r.ok) autosave.request('program');
      } };
    return {
      title: d.name,
      subtitle: `${d.focus} · ${run ? 'Running' : x.can.ok ? 'Ready to start' : 'Not running'}`,
      art: d.icon,
      badge: x.prestige ? SECRET_PROGRAM_ICON : null, // (Milestone 31)
      accent: accentNow(),
      sections: [
        { lines: head },
        { title: 'Resources', lines: res },
        { title: 'What it adds', lines: adds },
        { title: 'Effect', lines: fx },
        { title: 'Taking part', lines: part, columns: 1, buttons: [btn] },
        { columns: 1, buttons: [{ id: 'prog:list', label: '‹ Back to Programs', accent: COL.progress, onTap: () => openPrograms() }] },
      ],
    };
  });
}
function confirmStopProgram(id) {
  const w = open?.world;
  const d = w?.programs.byId(id);
  if (!d) return;
  dialog.confirm({
    title: `Stop ${d.name}?`,
    body: 'It can start again any time. It pays only for the days it ran this week; residents lose its sessions and benefit.',
    art: d.icon,
    yes: 'Stop it',
    danger: true,
    onYes: () => {
      if (w.programs.stop(id).ok) autosave.request('program');
      openProgram(id);
    },
  });
}
// The resident card: their part in each running program (joined / chose not to).
function programSections(w, it) {
  const mine = w.programs.residentOf(it.id);
  const pilot = w.pilotOf(it.id); // (Milestone 23: their own answer to the assistive-tech pilot)
  if (!mine.length && !pilot) return [];
  const pl = pilot ? [{ text: pilot.answer === 'yes' ? `Assistive-tech pilot: said yes · ${pilot.sessions} of ${PILOT.sessions} sessions` : 'Assistive-tech pilot: chose not to take part', color: COL.actionDark }] : [];
  return [{ title: 'Programs', lines: [...mine.map((m) => `${m.def.name}: joined ${m.joined}${m.declined ? ` · chose not to ${m.declined}` : ''}`), ...pl, { text: 'Always their choice', color: COL.textMuted }] }];
}
// The Ledger: what the programs cost this month (paid at the end of each week they run).
function programLedger(w, range) {
  const lines = w.programs.costsSince(range.fromDay);
  const running = w.programs.running();
  const sum = lines.reduce((a, l) => a + l.amount, 0);
  return {
    title: 'Specialist programs (paid each week)',
    lines: [
      ...(running.length ? running.map((r) => ({ text: `${r.def.name}: ${credits(r.def.resources.weeklyCost)} a week`, color: COL.actionDark })) : [{ text: 'No programs running', color: COL.textMuted }]),
      { text: `This month so far: ${sum ? '−' : ''}${credits(-sum)}`, color: sum ? COL.bad : COL.textMuted },
    ],
  };
}
// The Build list: every room and facility (the two secret ones only once their secret is found — Milestone 31) with its picture, cost, what it does or why it is
// locked. Tap one to place it (a ghost in the home).
function openBuildList() {
  sheet.open(() => {
    const w = open?.world;
    if (!w) return { title: '', sections: [] };
    const row = (d, kind) => {
      const u = w.layout.unlock(d.id);
      const cost = w.build.costOf?.(d.id) ?? d.cost; // (Milestone 30b: Bolt on the team builds for less)
      const afford = w.ledger.balance >= cost;
      const full = kind === 'room' && w.rooms.length >= w.stage.capacity;
      const why = !u.ok ? u.reason : full ? `Stage ${w.stage.n} holds ${w.stage.capacity} residents` : !afford ? 'Not enough Credits' : null;
      const what = kind === 'room' ? `${d.bestFor} · ${d.effect.text}` : d.effect.text;
      return { id: `buy:${d.id}`, label: `${d.name} · ${credits(cost)}`, sub: why ? `${why} · ${what}` : what, icon: d.art, disabled: !!why, accent: kind === 'room' ? COL.action : COL.progress, onTap: () => {
        sheet.close();
        homeScreen.startPlacing(d.id);
      } };
    };
    const prestige = PRESTIGE_FACILITIES.filter((d) => w.prestige.open(d.unlock.flag)); // (Milestone 31)
    return {
      title: 'Build',
      subtitle: `${credits(w.ledger.balance)} Credits · Stage ${w.stage.n}: ${w.rooms.length} of ${w.stage.capacity} rooms`,
      art: 'care_ui_03',
      accent: accentNow(),
      sections: [
        { title: 'Rooms', columns: 1, buttons: ROOMS.map((d) => row(d, 'room')) },
        { title: 'Facilities', columns: 1, buttons: BUILDABLE_FACILITIES.map((d) => row(d, 'facility')) },
        // (Milestone 31: the prestige spaces, once their secret is found — never before, not even greyed)
        ...(prestige.length ? [{ title: 'Prestige spaces', columns: 1, buttons: prestige.map((d) => row(d, 'facility')) }] : []),
      ],
    };
  });
}
// Selling asks first (50% back); a room with a resident, or the home's only Dining Room / Nurse Station …, can't go.
function confirmSell(it) {
  const w = open?.world;
  if (!w) return;
  const can = w.build.canSell(it.uid);
  if (!can.ok) return;
  dialog.confirm({
    title: `Sell the ${it.def.name}?`,
    body: `You get ${credits(can.refund)} Credits back (half its price).`,
    art: it.def.art,
    yes: 'Sell',
    danger: true,
    onYes: () => {
      const r = w.build.sell(it.uid);
      if (r.ok) {
        homeScreen.pick(null);
        homeScreen.build.message = { text: `Sold: ${it.def.name} (+${credits(r.refund)} Credits)`, good: true };
        autosave.request('sell');
      }
    },
  });
}
// The next stage (Milestone 26: its real unlock; ?debug=1 lets it through). Stage 2 opens at once; Stages 3–5 cost Credits and take a
// few days of building while the home keeps running. The big moment comes when the floor opens ('home:stage').
function upgradeStage() {
  const w = open?.world;
  if (!w) return null;
  const r = w.build.startUpgrade({ debug: debug.enabled });
  if (!r.ok) return r;
  sheet.close();
  autosave.request('stage');
  return r;
}
// The big feedback beat (style guide: big moments get a picture): shown over the home for a few seconds, tap to close.
let bigBeat = null;
const BIG_BEAT_LIFE = 4.5;
function drawBigBeat(ctx) {
  const b = bigBeat;
  if (!b) return;
  const H = renderer.height;
  const k = Math.min(1, b.age / 0.35) * Math.min(1, (BIG_BEAT_LIFE - b.age) / 0.5);
  ctx.save();
  ctx.globalAlpha = Math.max(0, k);
  ctx.fillStyle = 'rgba(30, 24, 18, 0.55)';
  ctx.fillRect(0, 0, W, H);
  const w = Math.min(W - 120, 820);
  const h = w / assets.aspect(b.art);
  const x = (W - w) / 2;
  const y = H / 2 - h / 2 - 120;
  // (Milestone 28b: the Prestige Aura behind a Rank S / S+ or C10 picture — off with Reduced flashes or Low graphics)
  if (b.aura && fxOn()) {
    ctx.save();
    ctx.globalAlpha *= 0.55 + 0.25 * Math.sin(b.age * 2.4);
    assets.drawContained(ctx, CARE_FX.prestige.art, { x: x - w * 0.15, y: y - h * 0.15, w: w * 1.3, h: h * 1.3 });
    ctx.restore();
  }
  assets.draw(ctx, b.art, x, y, w, h);
  // (Milestone 28b: the Award Confetti over an award's picture, drifting down — off with Reduced flashes or Low graphics)
  if (b.confetti && fxOn()) assets.drawContained(ctx, QUALITY_ART.confetti, { x: x - w * 0.1, y: y - h * 0.25 + b.age * 40, w: w * 1.2, h: h * 0.7 });
  // (Milestone 28b: a second picture in the corner — the Rehab Success Badge, the National Excellence Trophy)
  if (b.badge) assets.drawContained(ctx, b.badge, { x: x + w - w * 0.34, y: y + h - h * 0.38, w: w * 0.36, h: h * 0.36 });
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.font = font(THEME.size.major, true);
  ctx.fillText(b.title, W / 2, y + h + 110);
  ctx.font = font(THEME.size.body, false);
  ctx.fillText(b.text, W / 2, y + h + 190);
  ctx.restore();
}

// --- Milestone 27: end of life and the Memory Book --------------------------------------------------------------------
// The memorial moment (core/MajorFeedback: restrained — the room's light dims softly, a short quiet card with the friends
// and staff who knew them, then the game carries on), the resident card's Care stage section, the Inbox's care-stage
// lines and the comfort-first offer, and the Memory Book: kept in the ACCOUNT store (core/AccountBook — never a campaign
// slot, so a new campaign or New Game+ keeps every page; there is no delete).
const memoryBook = new AccountBook({ name: EOL_ACCOUNT_KEY, bus });
let bookSaving = Promise.resolve();
let accountChain = Promise.resolve(); // (Milestone 32: the Memory Book, the secrets and the achievements write the account store in turn)
async function loadMemoryBook() {
  try {
    const acc = await campaigns.slots.loadAccount();
    memoryBook.load(acc?.[EOL_ACCOUNT_KEY]);
  } catch (err) {
    debug.log(`memory book: ${err?.message ?? err}`);
  }
}
// Pages into the account book (the home's name added); written to the account store when any is new. → how many new
function keepPages(pages, home) {
  const n = memoryBook.merge((pages ?? []).map((p) => ({ ...p, home: p.home ?? home ?? null })));
  if (n && campaigns) {
    bookSaving = accountChain = accountChain // (Milestone 32: one queue for every account-store write, so none overwrites another)
      .then(async () => {
        const acc = await campaigns.slots.loadAccount();
        memoryBook.load(acc?.[EOL_ACCOUNT_KEY]); // (never drops a page another tab kept)
        await campaigns.slots.saveAccount({ ...acc, [EOL_ACCOUNT_KEY]: memoryBook.serialize() });
      })
      .catch((err) => debug.log(`memory book not saved: ${err?.message ?? err}`));
  }
  if (n) open?.world?.achievements?.bookChanged(); // (Milestone 32: Memory Book milestones and #29)
  return n;
}
const memorial = new MajorFeedback({ layout, width: W, height: renderer.height, pause: () => {}, minShowSec: 1.6, hint: 'Tap to carry on' });
let memorialResume = false;
function showMemorial(e, uid = null) {
  const w = open?.world;
  if (!w) return;
  const pt = homeScreen.worldPointOfPlace?.(e.room);
  if (pt && !lowFx()) vfx.sprite('world', MEMORIAL.art.glow, pt.x, pt.y, { size: 340, life: 4.5, from: 0.6, to: 1, hold: 3, alpha: 0.75 });
  if (!memorial.active) memorialResume = !w.clock.paused;
  w.clock.pause();
  const lines = [e.friends.length ? `Friends: ${e.friends.map(first).join(', ')}` : null, (e.staff.length ? e.staff : e.page?.staff ?? []).length ? `The team who knew ${theirOf(e.resident) === 'her' ? 'her' : 'him'}: ${(e.staff.length ? e.staff : e.page.staff).map(first).join(', ')}` : null].filter(Boolean);
  memorial.show({
    title: e.name,
    subtitle: e.card,
    accent: '#B06A3E',
    drawFn: (ctx, t) => drawMemorial(ctx, t, e, lines),
    onAck: () => {
      if (uid != null) open?.world?.events?.ack(uid); // (Milestone 28)
      if (!memorial.active && memorialResume) open?.world?.clock.resume();
    },
  });
}
function drawMemorial(ctx, t, e, lines) {
  // a calm panel in the middle of the safe area (over the dimmed home, never over the bars): the portrait in the Memorial
  // Glow, then the friends and staff who knew them
  const k = Math.min(1, t / 0.6);
  const sr = layout.safeRect;
  const pw = Math.min(sr.w - 96, 780);
  const ph = 430 + lines.length * 58;
  const x = sr.x + (sr.w - pw) / 2;
  const y = Math.max(sr.y + 260, sr.y + sr.h / 2 - ph / 2 - 140);
  ctx.save();
  ctx.globalAlpha = 0.9 * k;
  ctx.fillStyle = 'rgba(46, 36, 30, 0.9)';
  ctx.beginPath();
  ctx.roundRect(x, y, pw, ph, 32);
  ctx.fill();
  ctx.globalAlpha = 0.7 * k;
  assets.draw(ctx, MEMORIAL.art.glow, W / 2 - 230, y - 10, 460, 400);
  ctx.globalAlpha = k;
  const ps = 300;
  assets.drawCrop(ctx, e.art, PORTRAIT_CROP, { x: W / 2 - ps / 2, y: y + 40, w: ps, h: ps });
  if (e.good) assets.draw(ctx, MEMORIAL.art.star, W / 2 + ps / 2 - 30, y + 30, 100, 100); // (a well-supported time: the Memory Book Star)
  ctx.fillStyle = '#FFF4DC';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = font(THEME.size.body, false);
  lines.forEach((l, i) => ctx.fillText(l, W / 2, y + 400 + i * 58, pw - 60));
  ctx.restore();
}
bus.on('care:passed', (e) => {
  keepPages([e.page], open?.data?.facility?.name);
  debug.log(`passed peacefully: ${e.name} (comfort ${e.score})`);
  // (Milestone 28: the memorial moment is the director's choice card: one at a time, never over another pop-up)
});
// The resident card's Care stage section: the stage and its forecast line, their wishes, the comfort-first offer, the
// palliative support meeting and the comfort score so far (Approaching end of life / Final days).
function stageSection(w, it) {
  const E = w.endOfLife;
  const f = E.forecast(it.id);
  if (!f) return null;
  const lines = [{ text: f.stage.line, color: f.stage.id === 'settled' ? COL.actionDark : COL.progress }];
  if (!f.eligible && f.stage.id === 'settled') lines.push({ text: 'A short stay: care stages are only for residents living here for good', color: COL.textMuted });
  if (f.stage.id !== 'settled') lines.push({ text: `${f.stage.name} for ${f.days} day${f.days === 1 ? '' : 's'}${f.slowed ? ` · good care has slowed this by ${f.slowed} day${f.slowed === 1 ? '' : 's'}` : ''}. Changes come slowly; the next one is always shown here first.`, color: COL.textMuted });
  if (f.told.length) lines.push({ text: `Family told (${agoWord(w, f.told.at(-1).day)})`, color: COL.good });
  const sections = [{ title: 'Care stage', titleDot: f.stage.id === 'settled' ? null : COL.progress, lines: withGlyph(lines, SECTION_ICONS.comfort) }];
  if (debug.enabled && f.eligible) {
    sections[0].columns = 1;
    sections[0].buttons = [f.next ? { id: `eol:debugNext:${it.id}`, label: `Next stage (debug): ${f.next.name}`, sub: 'Starts it now, as in play (the forecast, the Inbox line, the family told)', accent: COL.progress, onTap: () => {
      E.setStageForTests(it.id, f.next.id, f.next.id === 'final' ? { due: 0 } : {});
      autosave.request('debug');
    } } : { id: `eol:debugPass:${it.id}`, label: 'Pass now (debug)', sub: 'The memorial moment and the Memory Book page now', accent: COL.progress, onTap: () => {
      sheet.close();
      E.passNowForTests(it.id);
    } }];
  }
  if (!E.inEol(it.id)) return sections;
  const wish = E.wishes(it.id);
  const c = E.comfortNow(it.id);
  const plan = it.state.plan ?? {};
  const onPlan = Object.entries(EOL_PLAN.options).every(([d, o]) => plan[d] === o);
  const rec = w.family.recordOf(it.id);
  const buttons = [
    { id: `eol:plan:${it.id}`, label: onPlan ? 'Comfort care in place' : 'Switch to comfort care', sub: onPlan ? 'Palliative Comfort Plan and Family Setup on the plan' : EOL_PLAN.offer(first(it.name)), disabled: onPlan, accent: COL.action, onTap: () => {
      const r = w.endOfLife.acceptPlan(it.id);
      eolMessage = r.ok ? null : r.reason;
      if (r.ok) autosave.request('eol');
    } },
  ];
  if (rec?.contact) {
    const can = w.family.canBook();
    buttons.push({ id: `eol:meet:${it.id}`, label: rec.meeting ? 'Meeting booked' : 'Palliative support meeting', sub: rec.meeting ? `${aheadWord(w, rec.meeting.day)} afternoon` : can ? `The Founder or a nurse sits with ${rec.contact.name}: what to expect, and how to stay close` : 'Needs the Founder or a nurse on the Afternoon shift', disabled: !!rec.meeting || !can, accent: COL.action, onTap: () => bookMeeting(w, it.id, { kind: 'palliative' }) });
  }
  sections.push({ title: 'Their wishes', lines: [...wish.map((x) => ({ text: x.text, color: COL.actionDark })), ...(eolMessage ? [{ text: eolMessage, color: COL.bad }] : [])], columns: 1, buttons });
  if (c) sections.push({ title: `Comfort so far: ${c.score}`, lines: [{ text: 'Judged only on comfort, the plan, the family’s support, familiar faces, their wishes and staffing. Never on the passing itself.', color: COL.textMuted }, ...(c.boosts ? [{ text: `Boosts: +${c.boosts} (Palliative Practice, the Family Lounge, a Palliative Suite, the program, the wing hub)`, color: COL.good }] : [])], bars: c.parts.map((p) => ({ label: p.label, value: p.value, color: p.value >= 70 ? COL.good : p.value >= 50 ? COL.actionDark : COL.warn, text: `${p.value}` })) });
  return sections;
}
let eolMessage = null;
// The Inbox: each open comfort-first offer (Milestone 28: the care-stage lines are in the "In memory" group).
function eolInbox(w, fresh) {
  const E = w.endOfLife;
  const out = [];
  for (const id of E.offers()) {
    const p = w.residentById(id);
    if (!p) continue;
    out.push({ title: `${p.name}: comfort care offered`, lines: [{ text: EOL_PLAN.offer(first(p.name)), color: COL.actionDark }, { text: 'Never forced: the plan stays as it is unless you switch it.', color: COL.textMuted }], columns: 2, buttons: [
      { id: `eolInbox:accept:${id}`, label: 'Switch to comfort care', sub: 'CL08 and EN08 on the plan', accent: COL.good, onTap: () => {
        E.acceptPlan(id);
        autosave.request('eol');
      } },
      { id: `eolInbox:keep:${id}`, label: 'Keep the plan', sub: 'Switch later from the card', accent: COL.progress, onTap: () => {
        E.keepPlan(id);
        autosave.request('eol');
      } },
    ] });
  }
  void fresh; // (Milestone 28: the care-stage lines are the Inbox's "In memory" lines now — the director's log)
  return out;
}
// The Memory Book (Quality → Records, and the Menu): a page per resident who passed at any of your homes, newest first.
function openMemoryBook() {
  sheet.open(() => {
    const pages = [...memoryBook.list].reverse();
    return {
      title: BOOK.title,
      subtitle: `${pages.length ? `${pages.length} page${pages.length === 1 ? '' : 's'} · ${BOOK.subtitle}` : BOOK.subtitle}${open?.world?.achievements?.cover() ? ` · the ${open.world.achievements.cover()}` : ''}`, // (Milestone 32: the cover keepsake)
      art: MEMORIAL.art.book,
      accent: '#B06A3E',
      sections: [...(pages.length
        ? [{ lines: [{ text: 'Kept for good across every home and New Game+. Pages can be read; nothing here can be removed.', color: COL.textMuted }], columns: 1, buttons: pages.map((p) => ({ id: `book:${p.id}`, label: p.name, sub: `${p.time} at ${p.home ?? 'the home'} · ${p.passed}`, icon: p.art, iconCrop: PORTRAIT_CROP, iconBadge: (p.comfort ?? 0) >= COMFORT.good ? MEMORIAL.art.star : null, accent: COL.progress, onTap: () => openMemoryPage(p.id) })) }] // (Milestone 28b: the Memory Book Star on a well-supported time)
        : [{ lines: [{ text: BOOK.empty, color: COL.textMuted }] }]), legacySection()], // (Milestone 28b: Living Legacy, locked)
    };
  });
}
// Milestone 28b: the Living Legacy picture at the end of the book — faded and locked until the Year-16 ending.
function legacySection() {
  return { title: FIRSTS_TEXT.legacy.title, columns: 1, buttons: [{ id: 'book:legacy', label: FIRSTS_TEXT.legacy.title, sub: FIRSTS_TEXT.legacy.locked, icon: FIRST_ART.legacy, locked: true, accent: COL.progress, onTap: () => {} }] };
}
// --- Milestone 29: secrets (Records → Secrets, core/DiscoveryArchive through src/systems/secrets.js) ------------------------
// Found secrets show their name and reward; a secret with a clue shows "???" and its newest clue line; nothing ever shows the
// condition. The account half (found in any run, Prestige Tokens, records, palettes) is kept in the account store.
const SECRETS_ICON = 'care_ui_28';
let secretsAccount = null; // the account store's secrets record (read at boot; every world starts from it)
let secretsSaving = Promise.resolve();
async function loadSecretsAccount() {
  try {
    const acc = await campaigns.slots.loadAccount();
    secretsAccount = acc?.secrets ?? null;
  } catch (err) {
    debug.log(`secrets account: ${err?.message ?? err}`);
  }
}
function saveSecretsAccount(data) {
  secretsAccount = data;
  if (!campaigns) return secretsSaving;
  secretsSaving = accountChain = accountChain
    .then(async () => {
      const acc = await campaigns.slots.loadAccount();
      await campaigns.slots.saveAccount({ ...acc, secrets: data });
    })
    .catch((err) => debug.log(`secrets not saved: ${err?.message ?? err}`));
  return secretsSaving;
}
function secretsSub(w) {
  const rows = w.secrets.archive();
  const found = rows.filter((r) => r.state === 'found' || r.state === 'known').length;
  const clues = rows.filter((r) => r.state === 'clue').length;
  return `${found} found${clues ? ` · ${clues} rumour${clues === 1 ? '' : 's'}` : ''} · hidden things that reward thoughtful care`;
}
function openSecrets() {
  sheet.open(() => {
    const w = open?.world;
    if (!w) return { title: 'Secrets', sections: [] };
    const rows = w.secrets.archive();
    const found = rows.filter((r) => r.state === 'found' || r.state === 'known');
    const clues = rows.filter((r) => r.state === 'clue');
    const hidden = rows.filter((r) => r.state !== 'clue' && r.state !== 'found' && r.state !== 'known').length;
    const sections = [
      { lines: [{ text: 'Secrets reward thoughtful, steady care: friendships, continuity, a balanced home. Never neglect, never harm. A rumour comes as you get close; what it needs stays a mystery.', color: COL.textMuted }] },
      { title: 'Found', lines: found.length ? found.flatMap((r) => [{ text: `${r.name}${r.state === 'known' ? ' (found in an earlier home)' : r.day != null ? ` · ${dateWord(w, r.day)}` : ''}`, color: COL.good }, { text: `Reward: ${r.reward}`, color: COL.textMuted }]) : [{ text: 'None yet.', color: COL.textMuted }] },
      { title: 'Rumours', lines: clues.length ? clues.flatMap((r) => [{ text: `??? · clue ${r.stage} of ${r.of}`, color: COL.actionDark }, { text: `“${r.clue}”`, color: COL.textMuted }]) : [{ text: 'No rumours yet.', color: COL.textMuted }] },
      ...(hidden ? [{ lines: [{ text: `${hidden} more secret${hidden === 1 ? '' : 's'} not yet hinted at.`, color: COL.textMuted }] }] : []),
    ];
    if (w.secrets.prestigeTokens) sections.push({ lines: [{ text: `Prestige Tokens from secrets: ${w.secrets.prestigeTokens} (kept for every home)`, glyph: artGlyph(REWARD_ART.prestige) }] });
    // (Milestone 30b) the Works Gods who have worked here (every home), and the Pantheon achievement — only once one has come
    const gods = w.secrets.godsHired();
    if (Object.keys(gods).length) sections.push({ title: 'The Works Gods', lines: [{ text: `Welcomed so far: ${GODS.filter((g) => gods[g.god]).map((g) => g.name.split(',')[0]).join(', ')} (${Object.keys(gods).length} of ${GODS.length})`, color: COL.actionDark }, w.secrets.pantheon ? { text: 'Pantheon: all five Works Gods have worked in your homes', color: COL.good } : { text: 'Pantheon: welcome all five Works Gods to your home', color: COL.textMuted }] });
    if (debug.enabled) sections.push({ title: 'Debug', columns: 1, buttons: [{ id: 'secrets:debug', label: 'Secrets debug: why not yet?', sub: 'Every rule, each condition met / not met with its value now', accent: COL.progress, onTap: () => openSecretsDebug() }] });
    return { title: 'Secrets', subtitle: secretsSub(w), art: SECRETS_ICON, accent: accentNow(), sections };
  });
}
// ?debug=1: the why-false inspector — every rule, each condition ✓ / ✗ with its value against what it needs.
function openSecretsDebug() {
  sheet.open(() => {
    const w = open?.world;
    if (!w) return { title: 'Secrets debug', sections: [] };
    const all = w.secrets.whyFalseAll();
    const sections = all.map((r) => ({
      title: `${r.id} · ${r.name}`,
      titleDot: r.found ? COL.good : r.ok ? COL.good : COL.warn,
      lines: [{ text: `${r.found ? 'Found' : r.ok ? 'All met: unlocks at its next trigger' : `${r.met} of ${r.total} met`} · clue stage ${r.stage} · once per ${r.scope} · checked on ${r.triggers.join(', ')}`, color: COL.textMuted }, ...r.rows.map((x) => ({ text: `${x.met ? '✓' : '✗'} ${x.kind === 'forbid' ? 'Never: ' : ''}${x.text}`, color: x.met ? COL.good : COL.bad }))],
      buttons: r.found ? [] : [{ id: `secrets:force:${r.id}`, label: 'Force (debug)', sub: 'As if its conditions held: rewards once', accent: COL.progress, onTap: () => w.secrets.debugForce(r.id) }],
    }));
    if (w.secrets.dropped.length) sections.unshift({ title: 'Refused by the forbid-harm guard', lines: w.secrets.dropped.map((t) => ({ text: t, color: COL.bad })) });
    return { title: 'Secrets debug', subtitle: `${all.length} rules · ${all.filter((r) => r.found).length} found`, art: SECRETS_ICON, accent: accentNow(), sections };
  });
}
// --- Milestone 32: Records → Achievements, Home Records, Staff Hall of Fame (src/systems/achievements.js) ---------------------
// The account half (achievements earned in any home, account bests, the Hall of Fame, keepsakes) is the account store's
// achievements record; each home's own half is in its save. Achievements give no power: a small Reputation lift or a keepsake.
let achievementsAccount = null; // the account store's achievements record (read at boot; every world starts from it)
let achievementsSaving = Promise.resolve();
async function loadAchievementsAccount() {
  try {
    const acc = await campaigns.slots.loadAccount();
    achievementsAccount = acc?.[ACH_ACCOUNT_KEY] ?? null;
  } catch (err) {
    debug.log(`achievements account: ${err?.message ?? err}`);
  }
}
function saveAchievementsAccount(data) {
  achievementsAccount = data;
  if (!campaigns) return achievementsSaving;
  achievementsSaving = accountChain = accountChain
    .then(async () => {
      const acc = await campaigns.slots.loadAccount();
      await campaigns.slots.saveAccount({ ...acc, [ACH_ACCOUNT_KEY]: data });
    })
    .catch((err) => debug.log(`achievements not saved: ${err?.message ?? err}`));
  return achievementsSaving;
}
const ACH_ICON = 'care_ui_28';
// A date from any home: its own year / month / day (the game's calendar is the same in every home).
const anyDate = (w, d) => (d == null ? '' : dateWord(w, d));
function achievementsSub(w) {
  const a = w.achievements;
  return `${a.count} of ${VISIBLE_COUNT} earned · ${a.countHere} in this home`;
}
function openAchievements() {
  sheet.open(() => {
    const w = open?.world;
    if (!w) return { title: ACH_TEXT.title, sections: [] };
    const a = w.achievements;
    a.system.markAllSeen();
    const rows = a.rows();
    const earned = rows.filter((r) => r.earned);
    const locked = rows.filter((r) => !r.earned);
    const runId = open.data.seed;
    const earnedLine = (r) => {
      const where = r.when?.runId && r.when.runId !== runId && r.when.home ? ` at ${r.when.home}` : '';
      const here = r.scope === 'run' ? (r.here ? ' · this home ✓' : ' · not yet in this home') : ' · account';
      return [{ text: `${r.n}. ${r.name} · ${anyDate(w, r.when?.day)}${where}${here}`, color: COL.good }, { text: `${r.text}${r.reward ? ` · ${r.reward}` : ''}`, color: COL.textMuted }];
    };
    const sections = [
      { lines: [{ text: 'Goals for a caring home. Once earned they stay earned in every home; each one’s small reward comes only once. Ranks, stages and scores are earned again in each home, and count on your account.', color: COL.textMuted }] },
      { title: `Earned (${earned.length})`, lines: earned.length ? earned.flatMap(earnedLine) : [{ text: 'None yet: admitting your first resident is a good start.', color: COL.textMuted }] },
      { title: `Still to earn (${locked.length})`, lines: locked.flatMap((r) => [{ text: `${r.hidden ? '?' : r.n}. ${r.name}`, color: COL.actionDark }, { text: r.text, color: COL.textMuted }]) },
    ];
    const keeps = a.keepsakes();
    if (keeps.length) sections.push({ title: 'Keepsakes', lines: keeps.map((k) => ({ text: `${k.name} · ${k.where}`, color: COL.actionDark })) });
    if (debug.enabled) sections.push({ title: 'Debug', columns: 1, buttons: [{ id: 'ach:debug', label: 'Earn the next one (debug)', sub: 'As if its goal were met: its reward once', accent: COL.progress, onTap: () => { const next = locked.find((r) => !r.hidden); if (next) a.debugUnlock(next.id); } }] });
    return { title: ACH_TEXT.title, subtitle: achievementsSub(w), art: ACH_ICON, accent: accentNow(), sections };
  });
}
function openHomeRecords() {
  sheet.open(() => {
    const w = open?.world;
    if (!w) return { title: ACH_TEXT.records, sections: [] };
    const groups = w.achievements.recordRows();
    const sections = [{ lines: [{ text: 'This home’s best, and the best across all your homes. Records are kept from real care: they only ever go up.', color: COL.textMuted }] }];
    for (const g of groups) {
      sections.push({
        title: g.title,
        lines: g.rows.flatMap((r) => [
          { text: `${r.name}: ${r.run ? `${r.runText}${r.run.info?.who ? ` · ${r.run.info.who}` : ''}` : 'not yet'}`, color: r.run ? COL.actionDark : COL.textMuted },
          { text: `Best ever: ${r.account ? `${r.accountText}${r.account.info?.who ? ` · ${r.account.info.who}` : ''}${r.account.info?.home && r.account.runId !== open.data.seed ? ` (${r.account.info.home})` : ''}` : '—'}`, color: COL.textMuted },
        ]),
      });
    }
    return { title: ACH_TEXT.records, subtitle: ACH_TEXT.recordsSub, art: ACH_ICON, accent: accentNow(), sections };
  });
}
function openHallOfFame() {
  sheet.open(() => {
    const w = open?.world;
    if (!w) return { title: ACH_TEXT.hall, sections: [] };
    const a = w.achievements;
    const hall = a.hall;
    const cands = a.candidates();
    const frame = a.frame();
    const yearsWord = (y) => (y >= 1 ? `${y} year${y === 1 ? '' : 's'}` : 'under a year');
    const sections = [{ lines: [{ text: `A keepsake across every home: legends join when they first arrive, anyone with five years’ service joins then, and anyone who leaves can be added here.${frame ? ` Portraits wear the ${frame}.` : ''}`, color: COL.textMuted }] }];
    sections.push(hall.length
      ? { title: `In the Hall of Fame (${hall.length})`, columns: 1, buttons: hall.map((e) => ({ id: `hof:${e.id}`, label: e.name, sub: `${HALL.tag[e.why] ?? e.why} · ${yearsWord(e.years)}${e.home && e.home !== open.data.facility.name ? ` at ${e.home}` : ''} · ${e.best}`, icon: e.art, iconCrop: PORTRAIT_CROP, accent: COL.progress, onTap: () => {} })) }
      : { title: 'In the Hall of Fame', lines: [{ text: 'Nobody yet.', color: COL.textMuted }] });
    if (cands.length) sections.push({ title: 'Can be added', columns: 1, buttons: cands.map((c) => ({ id: `hof:add:${c.id}`, label: `Add ${c.name}`, sub: `Left · ${yearsWord(Math.round((c.days / 336) * 10) / 10)}${c.home && c.home !== open.data.facility.name ? ` at ${c.home}` : ''} · Level ${c.level}`, icon: c.art, iconCrop: PORTRAIT_CROP, accent: COL.good, onTap: () => a.addToHall(c.id) })) });
    return { title: ACH_TEXT.hall, subtitle: ACH_TEXT.hallSub, art: ACH_ICON, accent: accentNow(), sections };
  });
}
// A face for a name on a page (pages keep names; the art is found from the home's people or the data).
const staffArtByName = (n) => ALL_STAFF.find((x) => x.name === n)?.art ?? FOUNDERS.find((x) => x.name === n)?.art ?? null;
const residentArtByName = (n) => RESIDENTS.find((x) => x.name === n)?.art ?? null;
function faceButtons(prefix, names, artOf, sub) {
  return names.map((n, i) => ({ id: `${prefix}:${i}`, label: n, sub, icon: artOf(n), iconCrop: PORTRAIT_CROP, accent: COL.progress, onTap: () => {} }));
}
function openMemoryPage(id) {
  sheet.open(() => {
    const p = memoryBook.get(id);
    if (!p) return { title: BOOK.title, sections: [] };
    const they = p.pronoun === 'she' ? 'She' : 'He';
    return {
      title: p.name,
      subtitle: `${p.time} at ${p.home ?? 'the home'} · ${p.arrived} to ${p.passed}`,
      art: p.art,
      accent: '#B06A3E',
      sections: [
        { columns: 1, buttons: [{ id: 'book:back', label: '‹ Memory Book', accent: COL.progress, onTap: () => openMemoryBook() }] },
        { lines: [{ text: `${they} loved ${String(p.interest ?? 'good company').toLowerCase()}.`, color: COL.actionDark }, ...(p.beside ? [{ text: `Passed peacefully, with ${p.beside} beside ${they === 'She' ? 'her' : 'him'}.`, color: COL.actionDark }] : [])] },
        p.friends.length ? { title: 'Friendships', columns: 2, buttons: faceButtons('book:friend', p.friends, residentArtByName, 'Friend') } : { title: 'Friendships', lines: [{ text: 'Friendly with everyone', color: COL.textMuted }] }, // (Milestone 28b: their faces)
        { title: 'Story moments', lines: p.moments.map((m) => ({ text: `${m.when}: ${m.text}`, color: COL.actionDark })) },
        p.staff.length ? { title: 'The staff who knew them best', columns: 2, buttons: faceButtons('book:staff', p.staff, staffArtByName, 'Knew them well') } : { title: 'The staff who knew them best', lines: [{ text: 'The whole team', color: COL.textMuted }] },
      ],
    };
  });
}

function openPlaceholder(slot) {
  sheet.open(() => ({ title: slot.title, subtitle: slot.text, art: slot.icon, accent: accentNow(), sections: [] }));
}
// Business (Milestone 6): the Ledger, and Save and Main Menu (the run is saved first).
// --- Milestone 25: incidents, outbreaks and emergencies ------------------------------------------------------------------
// The Nurse Station's Emergency tab (Preparedness and what raises it, the event under way with its responses, supplies,
// falls, past events), the Inbox (an event waiting for a choice, the after-reports) and Business → Emergency supplies.
// Every response is free or paid in Credits; none is ever a purchase.
const EMERGENCY_ICON = 'care_ui_27';
const BAND_COLOUR = { mild: COL.good, moderate: COL.actionDark, severe: COL.warn };
const costChip = (c) => (c ? `${credits(c)} Cr` : 'Free');
const absNowOf = (w) => w.clock.totalDays * 24 + w.hour;
const emergencyWaiting = () => {
  const inc = open?.world?.incidents;
  return inc ? (inc.active && !inc.active.response ? 1 : 0) + inc.reports().length : 0;
};
const namesOf = (w, ids) => ids.map((id) => first(w.byId(id)?.name ?? w.residentById(id)?.name ?? id));
function leftWords(w, ev) {
  const h = Math.max(0, ev.end - absNowOf(w));
  return h < 1 ? 'ending now' : h < 20 ? `about ${Math.round(h)} hour${Math.round(h) === 1 ? '' : 's'} left` : `about ${Math.round(h / 24) || 1} day${Math.round(h / 24) === 1 ? '' : 's'} left`;
}
// The event under way: what is happening, its band and Preparedness, and its responses (until one is chosen).
function incidentSection(w, from) {
  const inc = w.incidents;
  const ev = inc.active;
  if (!ev) return null;
  const tpl = incidentById(ev.kind);
  const T = ev.targets;
  const lines = [
    { text: tpl.text, color: COL.textMuted },
    { text: `${SEVERITY.names[ev.band]} · Preparedness ${ev.prep.score} when it began · ${leftWords(w, ev)}${ev.hub ? ' · the Emergency Preparedness Hub: impact −15%' : ''}`, color: BAND_COLOUR[ev.band] },
  ];
  if (T.residents.length) lines.push({ text: `Unwell: ${namesOf(w, T.residents).join(', ')} (isolation in their rooms)${inc.visitsPaused() ? ' · family visits paused for now' : ''}`, color: COL.actionDark });
  if (T.facilities.length) lines.push({ text: `Out of action: ${T.facilities.map((id) => facilityById(id)?.name ?? id).join(', ')}${ev.restored ? ' (back on: the generator)' : ''}`, color: ev.restored ? COL.good : COL.actionDark });
  if (ev.kind === 'equipment') lines.push({ text: 'The lifting hoist is out: getting up, moving and going to bed take longer', color: COL.actionDark });
  if (ev.kind === 'storm' || ev.kind === 'water') lines.push({ text: ev.kind === 'water' ? 'The kitchen and laundry are slowed; meals are a little plainer' : 'Meals are kept simple until the power is back', color: COL.actionDark });
  if (T.staff.length) lines.push({ text: `Off sick: ${namesOf(w, T.staff).join(', ')} · the roster's fallback covers the gaps`, color: COL.actionDark });
  if (T.resident) lines.push({ text: `${first(w.residentById(T.resident)?.name ?? '')} seems very unwell: the six choices are on ${theirOf(T.resident)} card too`, color: COL.actionDark });
  if (ev.response) lines.push({ text: `Chosen${ev.by === 'auto' ? ' by the home' : ev.by === 'nurse' ? ' by the nurse on shift' : ''}: ${ev.response.name}`, color: COL.good });
  else lines.push({ text: `Choose a response — or the home will “${tpl.responses.find((r) => r.id === tpl.auto).name.toLowerCase()}” in about ${Math.max(1, Math.ceil(ev.autoAt - absNowOf(w)))} hour${Math.ceil(ev.autoAt - absNowOf(w)) <= 1 ? '' : 's'}. Pausing never makes it worse.`, color: COL.textMuted });
  const buttons = ev.response
    ? []
    : inc.responses().map((r) => ({ id: `inc:${from}:${r.id}`, label: r.name, sub: r.can.ok ? r.text : r.can.reason, cost: costChip(r.cost), disabled: !r.can.ok, icon: EMERGENCY_ICON, accent: r.cost ? COL.progress : COL.action, onTap: () => {
      if (w.incidents.respond(r.id).ok) autosave.request('incident');
    } }));
  return { title: ev.name, titleDot: ev.response ? null : COL.bad, lines, columns: 1, buttons };
}
function reportSection(w, h, from) {
  const R = h.report;
  const lines = [
    { text: `${SEVERITY.names[h.band]} · ${h.days} day${h.days === 1 ? '' : 's'} · ${h.response ? `${h.by === 'auto' ? 'the home chose' : h.by === 'nurse' ? 'the nurse chose' : 'you chose'}: ${h.response.name.toLowerCase()}` : 'no response needed'}`, color: BAND_COLOUR[h.band] },
    ...R.lines.map((t) => ({ text: t, color: COL.actionDark })),
    { text: `What helped: ${R.helped.length ? R.helped.join('; ') : 'not much was in place yet'}`, color: COL.good },
    ...(R.next.length ? [{ text: `Next time: ${R.next.join('; ')}`, color: COL.textMuted }] : []),
    { text: 'The home is back to normal.', color: COL.textMuted },
  ];
  return { title: `After the ${h.name.toLowerCase()}`, lines, columns: 1, buttons: [{ id: `incReport:${from}:${h.id}`, label: 'Got it', accent: COL.action, onTap: () => {
    w.incidents.markSeen(h.id);
    autosave.request('incident');
  } }] };
}
function fallsLines(w) {
  const falls = w.incidents.falls();
  const lines = [{ text: `Falls this month: ${w.incidents.fallsThisMonth()} · so far: ${w.incidents.state.fallCount ?? 0}`, color: COL.actionDark }];
  for (const f of falls.slice(-3).reverse()) {
    const help = f.helpedAt != null ? `helped up in ${f.minutes ?? 0} min` : f.alert ? 'got up on their own (nobody came in time)' : 'help on the way';
    lines.push({ text: `${first(f.name)} · ${agoWord(w, f.day)} · ${f.severity === 'moderate' ? 'a harder fall' : 'a small fall'} · ${help}${f.well ? ' · looked after well' : ''}`, color: COL.textMuted });
  }
  lines.push({ text: 'Each resident’s falls risk sets how often: the Falls Prevention Plan (MO05), a Falls-Safe Layout (EN05), a Falls specialist on shift, the Falls Prevention Lab (F19), the Falls Prevention Program and falls research all lower it.', color: COL.textMuted });
  return lines;
}
// The Nurse Station's Emergency tab.
function emergencySections(w) {
  const inc = w.incidents;
  const pr = inc.prep();
  const band = bandFor(pr.score);
  const out = [];
  const ev = incidentSection(w, 'station');
  if (ev) out.push(ev);
  for (const h of inc.reports()) out.push(reportSection(w, h, 'station'));
  out.push({ title: 'Preparedness', lines: [
    { text: `Preparedness ${pr.score} / 100: an event now would be ${SEVERITY.names[band].toLowerCase()}`, color: BAND_COLOUR[band] },
    { text: `Mild from ${SEVERITY.moderateBelow}, moderate from ${SEVERITY.severeBelow}. Better prepared: milder, shorter events. Events are rare, end on their own and never need a purchase.`, color: COL.textMuted },
  ], bars: pr.parts.map((x) => ({ label: x.name, value: x.value, max: x.max, color: x.value >= x.max ? COL.good : x.value > 0 ? COL.progress : COL.textMuted, text: `${Math.round(x.value)}/${x.max}` })) });
  const raise = pr.parts.filter((x) => x.value < x.max);
  out.push({ title: 'What raises it', lines: raise.length ? raise.map((x) => ({ text: `${x.name} (${x.detail}): ${x.raise}`, color: COL.textMuted })) : [{ text: 'Everything is in place.', color: COL.good }] });
  const sp = inc.supplies;
  out.push({ title: 'Emergency supplies', lines: [{ text: `Stock ${Math.round(sp.stock)} / 100 · ${sp.plan.name}${sp.plan.perWeek ? ` (${sp.plan.perWeek} Credits a week)` : ': it slowly runs down'}`, color: sp.stock >= 60 ? COL.good : sp.stock >= 30 ? COL.actionDark : COL.warn }], bars: [{ label: 'Supplies', value: sp.stock, color: COL.progress }], columns: 1, buttons: [{ id: 'station:supplies', label: 'Emergency supplies', sub: 'A standing order, or a one-off top-up (Business)', icon: EMERGENCY_ICON, accent: COL.action, onTap: () => openSupplies() }] });
  out.push({ title: 'Falls', lines: fallsLines(w) });
  const past = inc.history().filter((h) => h.seen).slice(-5).reverse();
  out.push({ title: 'Past events', lines: past.length ? past.map((h) => ({ text: `${h.name} (${SEVERITY.names[h.band].toLowerCase()}) · ${agoWord(w, Math.floor(h.start / 24))} · ${h.days} day${h.days === 1 ? '' : 's'}${h.response ? ` · ${h.response.name.toLowerCase()}` : ''}`, color: COL.textMuted })) : [{ text: 'None yet. A new home has its first 28 days quiet.', color: COL.textMuted }] });
  if (debug.enabled) {
    out.push({ title: 'Debug', columns: 2, buttons: [
      ...INCIDENTS.map((t) => ({ id: `incDebug:${t.id}`, label: `Start: ${t.name} (debug)`, disabled: !!inc.active, accent: COL.progress, onTap: () => inc.start(t.id) })),
      { id: 'incDebug:end', label: 'End it now (debug)', disabled: !inc.active, accent: COL.progress, onTap: () => inc.end() },
      { id: 'incDebug:fall', label: 'A fall now (debug)', sub: 'The first resident who can', accent: COL.progress, onTap: () => w.residents.some((p) => inc.fallNow(p.id).ok) },
    ] });
  }
  return out;
}
function openSupplies() {
  let message = null;
  sheet.open(() => {
    const w = open?.world;
    if (!w) return { title: 'Emergency supplies', sections: [] };
    const sp = w.incidents.supplies;
    const pr = w.incidents.prep().parts.find((x) => x.key === 'supplies');
    return {
      title: 'Emergency supplies',
      subtitle: 'Stock for when things go wrong: part of the home’s Preparedness',
      art: 'care_equipment_08', // (Milestone 28b: the Emergency Supply Cart)
      badge: EMERGENCY_ICON,
      accent: accentNow(),
      sections: [
        ...(message ? [{ lines: [{ text: message, color: COL.bad }] }] : []),
        { lines: [
          { text: `Stock ${Math.round(sp.stock)} / 100 · Preparedness +${Math.round(pr.value)} of ${pr.max}`, color: COL.actionDark },
          { text: `Each event uses some (more in a severe one). Without a standing order the stock runs down by ${SUPPLIES.fadePerDay} a day; an order tops it up by ${SUPPLIES.refillPerDay} a day to its level and is paid weekly.`, color: COL.textMuted },
        ], bars: [{ label: 'Supplies', value: sp.stock, color: COL.progress }] },
        { title: 'Standing order', columns: 1, buttons: SUPPLIES.plans.map((p) => ({ id: `supplies:${p.id}`, label: `${sp.plan.id === p.id ? '✓ ' : ''}${p.name}`, sub: p.level ? `Keeps the stock at ${p.level}` : 'Nothing ordered', cost: p.perWeek ? `${p.perWeek} Cr a week` : 'Free', accent: sp.plan.id === p.id ? COL.good : COL.action, onTap: () => {
          sp.setPlan(p.id);
          autosave.request('supplies');
        } })) },
        { title: 'One-off', columns: 1, buttons: [{ id: 'supplies:topUp', label: `Top up now (+${SUPPLIES.topUp.points})`, sub: 'Straight away', cost: `${credits(SUPPLIES.topUp.cost)} Cr`, disabled: sp.stock >= 100, accent: COL.action, onTap: () => {
          const r = sp.topUp();
          message = r.ok ? null : r.reason;
          if (r.ok) autosave.request('supplies');
        } }] },
      ],
    };
  });
}
function incidentInbox(w) {
  const out = [];
  const ev = incidentSection(w, 'inbox');
  if (ev && !w.incidents.active.response) out.push(ev);
  for (const h of w.incidents.reports()) out.push(reportSection(w, h, 'inbox'));
  return out;
}
function emergencyLedger(w, range) {
  const ls = w.ledger.economy.ledger.filter((l) => l.day >= range.fromDay && l.category === LEDGER_CATEGORY_EMERGENCY);
  const sum = ls.reduce((t, l) => t + l.amount, 0);
  const evs = w.incidents.history().filter((h) => Math.floor(h.start / 24) >= range.fromDay);
  return { title: 'Emergencies', lines: [
    { text: `Events this month: ${evs.length}${w.incidents.active ? ' (one under way)' : ''} · falls this month: ${w.incidents.fallsThisMonth()}`, color: COL.actionDark },
    { text: `Emergency supplies and responses this month: ${sum ? '−' : ''}${credits(-sum)} Credits`, color: sum ? COL.bad : COL.textMuted },
    { text: `Preparedness ${w.incidents.prep().score} / 100 (Nurse Station → Emergency)`, color: COL.textMuted },
  ] };
}
function fallLine(w, it) {
  const st = it.state;
  const mine = w.incidents.falls().filter((f) => f.resident === it.id);
  if (st.fallen) return 'Had a fall: help is on the way';
  if (st.fallRest) return `Resting after a fall: back to activities in ${Math.max(1, st.fallRest.until - w.clock.totalDays)} day${st.fallRest.until - w.clock.totalDays === 1 ? '' : 's'} (the plan is flagged for review)`;
  return mine.length ? `Falls here: ${mine.length} (last ${agoWord(w, mine[mine.length - 1].day)}) · a lower risk means fewer falls` : 'No falls here · a lower risk means fewer falls';
}
function openBusiness() {
  const slot = BOTTOM_SLOTS.find((s) => s.id === 'business');
  sheet.open(() => {
    const b = balanceNow();
    const t = open?.world?.family?.trust() ?? null; // (Milestone 19: the home's Family Trust, in the top area)
    return {
      title: slot.title,
      subtitle: slot.text,
      art: slot.icon,
      accent: accentNow(),
      sections: [
        { lines: [{ text: t == null ? 'Family Trust: no families yet' : `Family Trust: ${Math.round(t)} / 100 (every family's average)`, color: trustColour(t) }], bars: t == null ? [] : [{ label: 'Family Trust', value: t, color: trustColour(t), text: `${Math.round(t)}` }], columns: 1, buttons: [{ id: 'business:family', label: 'Compliments & complaints', sub: open?.world ? `${open.world.family.open().length} open · ${open.world.family.compliments().length} compliments` : '', icon: FAMILY_ICONS.trust, accent: COL.action, onTap: () => openQuality() }] },
        {
          columns: 1,
          lines: [...(open?.world ? open.world.economy.warnings().map((t) => ({ text: t, color: COL.bad })) : []), 'Your home saves itself as you play.'], // (Milestone 22: debt)
          buttons: [
            { id: 'ledger', label: 'Ledger', sub: `Balance ${credits(b)} Credits · this month and last, line by line`, icon: 'care_ui_05', accent: COL.action, onTap: () => openLedger() },
            ...(open?.world ? [partnersButton(open.world), grantsButton(open.world)] : []), // (Milestone 23)
            ...(open?.world ? [{ id: 'business:supplies', label: 'Emergency supplies', sub: `Stock ${Math.round(open.world.incidents.supplies.stock)} / 100 · ${open.world.incidents.supplies.plan.name} · Preparedness ${open.world.incidents.prep().score}`, icon: EMERGENCY_ICON, accent: COL.action, onTap: () => openSupplies() }] : []), // (Milestone 25)
            { id: 'mainMenu', label: 'Save and Main Menu', accent: COL.progress, onTap: () => leaveHome() },
          ],
        },
      ],
    };
  });
}
// --- Milestone 23: community partners and grants ----------------------------------------------------------------------
// Partners support the home; they never buy access to residents. Every obligation is a number the game counts, and only
// what residents chose to join counts. Grants are recovery / expansion help — never required.
const pctBar = (count, min) => Math.round((100 * Math.min(count, min)) / Math.max(1, min));
function partnersButton(w) {
  const P = w.partners;
  const act = P.active();
  const offers = P.offers().length;
  return { id: 'business:partners', label: 'Community partners', sub: `${act.length} of ${P.slots()} slot${P.slots() === 1 ? '' : 's'} in use${act.length ? ` (${act.map((a) => a.def.name).join(', ')})` : ''}${offers ? ` · ${offers} offer${offers === 1 ? '' : 's'} waiting` : ''}`, icon: act[0]?.def.logo ?? 'partner_logo_spn01', accent: offers ? COL.good : COL.action, onTap: () => openPartners() };
}
function grantsButton(w) {
  const G = w.partners.grants;
  return { id: 'business:grants', label: 'Grant board', sub: `${G.active().length} of ${GRANT_RULES.maxActive} active · ${G.board().length} on offer this month`, icon: 'care_ui_05', accent: COL.action, onTap: () => openGrants() };
}
// One deal's progress as a bar: the exact count ("Family reviews 2 / 3") or the month checks.
function dealBar(x) {
  const g = x.progress;
  if (!g) return [];
  if (g.kind === 'count') return [{ label: g.text, value: pctBar(g.count, g.min), color: g.met ? COL.good : COL.progress, text: `${Math.min(g.count, g.min)} / ${g.min}` }];
  return [{ label: `${x.def.obligation.label} now`, value: g.now == null ? 0 : Math.min(100, g.now), color: g.broken ? COL.bad : g.now != null && g.now < x.def.obligation.min ? COL.warn : COL.good, text: g.now == null ? '—' : `${Math.round(g.now)} / ${x.def.obligation.min}` }];
}
function dealLines(w, x) {
  const g = x.progress;
  const out = [{ text: `Perk: ${w.partners.perksActive().filter((k) => k.def.id === x.def.id).map((k) => k.text + (x.tier.perkMult > 1 ? ` (× ${x.tier.perkMult} at ${x.tier.name})` : '')).join(' · ')}`, color: COL.good }, { text: `Obligation: ${x.def.obligation.text}`, color: COL.actionDark }];
  if (g?.kind === 'check') out.push({ text: g.broken ? `Missed at a month check (last: ${g.last}) — this deal won't be met, with no other penalty` : `Kept at ${g.count} of ${g.checks} month check${g.checks === 1 ? '' : 's'} so far`, color: g.broken ? COL.bad : COL.textMuted });
  else if (g?.met) out.push({ text: 'Met — the relationship grows when the deal ends', color: COL.good });
  out.push({ text: `${x.daysLeft} day${x.daysLeft === 1 ? '' : 's'} left of 6 months · ${x.tier.name}`, color: COL.textMuted });
  return out;
}
function openPartners() {
  let message = null;
  sheet.open(() => {
    const w = open?.world;
    if (!w) return { title: '', sections: [] };
    const P = w.partners;
    const say = (r, why) => {
      message = r.ok ? null : r.reason;
      if (r.ok) autosave.request(why);
    };
    const sections = [{ lines: [
      ...(message ? [{ text: message, color: COL.bad }] : []),
      { text: 'Partners support the home. They never buy access to residents, and nothing they ask needs a resident to take part who doesn’t want to.', color: COL.textMuted },
      { text: `Slots: ${P.active().length} of ${P.slots()} in use (Rank ${P.rank()}; more slots at Rank C and A) · deals last 6 months · cancel any time (the perk ends)`, color: COL.actionDark },
    ] }];
    for (const x of P.active()) sections.push({ title: `${x.def.name} · ${x.tier.name}`, lines: dealLines(w, x), bars: dealBar(x), columns: 1, buttons: [
      { id: `partner:open:${x.def.id}`, label: `${x.def.name}`, sub: `${x.def.theme} · tap for the full card`, icon: x.def.logo, accent: COL.action, onTap: () => openPartner(x.def.id) },
      { id: `partner:cancel:${x.def.id}`, label: 'Cancel this partnership', sub: 'The perk ends now; no other penalty', accent: COL.bad, onTap: () => confirmCancelPartner(x.def.id) },
    ] });
    for (const o of P.offers()) {
      const can = P.canSign(o.def.id);
      const T = PARTNER_TIERS[P.tierOf(o.def.id)];
      sections.push({ title: `Offer: ${o.def.name}${o.offer.renewal ? ' (to renew)' : ''}`, lines: [
        { text: `${o.def.theme} · ${T.name} · ${credits(T.supportPerMonth)} Credits support a month while it runs`, color: COL.actionDark },
        { text: `Perk: ${o.def.perks.map((k) => k.text).join(' · ')}${T.perkMult > 1 ? ` (× ${T.perkMult})` : ''}`, color: COL.good },
        { text: `Obligation: ${o.def.obligation.text}`, color: COL.actionDark },
        { text: `The offer stands for ${Math.max(0, o.offer.untilDay - w.clock.totalDays)} more day${o.offer.untilDay - w.clock.totalDays === 1 ? '' : 's'}`, color: COL.textMuted },
      ], columns: 2, buttons: [
        { id: `partner:sign:${o.def.id}`, label: 'Sign · 6 months', sub: can.ok ? 'The perk starts at once' : can.reason, icon: o.def.logo, disabled: !can.ok, accent: COL.good, onTap: () => say(P.sign(o.def.id), 'partner') },
        { id: `partner:decline:${o.def.id}`, label: 'Not now', sub: 'With thanks: they may ask again', accent: COL.progress, onTap: () => say(P.decline(o.def.id), 'partner') },
      ] });
    }
    sections.push({ title: 'All partners', columns: 1, buttons: P.list().map((x) => ({ id: `partner:card:${x.def.id}`, label: `${x.def.name} · ${x.tier.name}`, sub: x.active ? `Partner now · ${x.progress?.text ?? ''}` : x.locked ? x.locked : x.offer ? 'Offer waiting' : `${x.def.theme} · ${x.def.obligation.text}`, icon: x.def.logo, accent: x.active ? COL.good : x.locked ? COL.progress : COL.action, onTap: () => openPartner(x.def.id) })) });
    const hist = P.history(4).reverse();
    if (hist.length) sections.push({ title: 'Earlier deals', lines: hist.map((h) => ({ text: `${partnerById(h.id).name}: ${h.result === 'met' ? 'met' : h.result === 'cancelled' ? 'cancelled' : 'not met'} (day ${h.startDay + 1}–${h.endDay + 1}) · ${PARTNER_TIERS[h.tierAfter].name}`, color: h.result === 'met' ? COL.good : COL.textMuted })) });
    if (debug.enabled) sections.push({ title: 'Debug', columns: 1, buttons: [
      { id: 'partner:debug', label: `Unlock locked partners and grants (debug): ${P.debug ? 'On' : 'Off'}`, sub: 'SilverLine (outings) and the transport grant', accent: P.debug ? COL.good : COL.progress, onTap: () => {
        P.setDebug(!P.debug);
        autosave.request('debug');
      } },
      { id: 'partner:rank', label: `Rank for partner slots (debug): ${P.rank()}`, sub: 'Tap to step E → D → C → B → A → S', accent: COL.progress, onTap: () => {
        const R = ['E', 'D', 'C', 'B', 'A', 'S'];
        P.setRank(R[(R.indexOf(P.rank()) + 1) % R.length]);
        autosave.request('debug');
      } },
      { id: 'partner:offer', label: 'An offer now (debug)', sub: 'The next offer arrives today', accent: COL.progress, onTap: () => {
        P.state.nextOfferDay = w.clock.totalDays;
        P.daily(w.clock.totalDays);
      } },
      { id: 'partner:outing', label: 'Count a stub outing (debug)', sub: 'Outings come in a later update', disabled: !P.debug, accent: COL.progress, onTap: () => P.outingForDebug() },
    ] });
    sections.push({ columns: 1, buttons: [{ id: 'partners:back', label: '‹ Back to Business', accent: COL.progress, onTap: () => openBusiness() }] });
    return { title: 'Community partners', subtitle: `${P.active().length} of ${P.slots()} slots · ${P.offers().length} offer${P.offers().length === 1 ? '' : 's'}`, art: P.active()[0]?.def.logo ?? 'partner_logo_spn01', accent: accentNow(), sections };
  });
}
// One partner's card: logo, theme, tier, perk, obligation (and why it is locked), this deal and earlier ones.
function openPartner(id) {
  sheet.open(() => {
    const w = open?.world;
    const x = w?.partners.list().find((y) => y.def.id === id);
    if (!x) return { title: '', sections: [] };
    const d = x.def;
    const T = x.tier;
    const next = PARTNER_TIERS[Math.min(PARTNER_TIERS.length - 1, PARTNER_TIERS.indexOf(T) + 1)];
    const head = [{ text: `${d.theme} · relationship: ${T.name}`, color: COL.actionDark }, { text: `Perk: ${d.perks.map((k) => k.text).join(' · ')}${T.perkMult > 1 ? ` (× ${T.perkMult} at ${T.name})` : ''}`, color: COL.good }, { text: `Obligation: ${d.obligation.text}`, color: COL.actionDark }, { text: `Support: ${credits(T.supportPerMonth)} Credits a month while a deal runs${next !== T ? ` · at ${next.name}: perk × ${next.perkMult}, ${credits(next.supportPerMonth)} a month` : ''}`, color: COL.textMuted }];
    if (x.locked) head.unshift({ text: x.locked, color: COL.warn });
    if (d.pilot) head.push({ text: 'The pilot is offered to every resident here; only those who say yes take part, and they can still say no on the day. If nobody wants to, the deal simply isn’t met.', color: COL.textMuted });
    const hist = w.partners.history(20).filter((h) => h.id === id).slice(-4).reverse();
    return {
      title: d.name,
      subtitle: `${d.theme} · ${x.active ? 'Partner now' : x.offer ? 'Offer waiting' : x.locked ? 'Locked' : 'Not a partner'}`,
      art: d.logo,
      accent: accentNow(),
      sections: [
        { lines: head },
        ...(x.active ? [{ title: 'This deal', lines: dealLines(w, { ...x, tier: PARTNER_TIERS[x.active.tier ?? 0] }), bars: dealBar(x) }] : []),
        { title: 'Earlier deals', lines: hist.length ? hist.map((h) => `${h.result === 'met' ? 'Met' : h.result === 'cancelled' ? 'Cancelled' : 'Not met'} · day ${h.startDay + 1}–${h.endDay + 1} · ${PARTNER_TIERS[h.tier].name} → ${PARTNER_TIERS[h.tierAfter].name}`) : [{ text: 'None yet', color: COL.textMuted }] },
        { columns: 1, buttons: [{ id: 'partner:list', label: '‹ Back to partners', accent: COL.progress, onTap: () => openPartners() }] },
      ],
    };
  });
}
function confirmCancelPartner(id) {
  const w = open?.world;
  const d = partnerById(id);
  if (!w || !d) return;
  dialog.confirm({
    title: `Cancel ${d.name}?`,
    body: 'The perk ends now. The relationship stays at its tier; there is no other penalty.',
    art: d.logo,
    yes: 'Cancel it',
    danger: true,
    onYes: () => {
      if (w.partners.cancel(id).ok) autosave.request('partner');
      openPartners();
    },
  });
}
const grantPay = (c) => [c.payOnAccept ? `${credits(c.payOnAccept)} on acceptance` : null, c.payOnComplete ? `${credits(c.payOnComplete)} when the goal is met` : null].filter(Boolean).join(' + ');
const grantGoal = (c) => `${COUNTER_LABELS[c.goal.counter] ?? c.goal.counter}${c.goal.stay ? ` (${c.goal.stay})` : ''}`;
// The Grant board (§29): this month's offers, the active ones (at most 2) with their goal as a bar, and what came of
// earlier ones. Recovery and expansion help — never required, and missing a deadline costs nothing.
function openGrants() {
  let message = null;
  sheet.open(() => {
    const w = open?.world;
    if (!w) return { title: '', sections: [] };
    const G = w.partners.grants;
    const say = (r) => {
      message = r.ok ? null : r.reason;
      if (r.ok) autosave.request('grant');
    };
    const sections = [{ lines: [
      ...(message ? [{ text: message, color: COL.bad }] : []),
      { text: `Grants and service contracts help a home recover or grow. Up to ${GRANT_RULES.maxActive} at once; a new board each month${G.struggling() ? ' (more offers while the home is struggling)' : ''}. Missing a deadline costs nothing: any advance is simply handed back.`, color: COL.textMuted },
    ] }];
    for (const c of G.active()) {
      const g = G.progressOf(c);
      sections.push({ title: c.name, lines: [{ text: grantById(c.grantId).text, color: COL.actionDark }, { text: `Pays ${grantPay(c)}`, color: COL.good }, { text: `${Math.max(0, c.dueDay - w.clock.totalDays)} days left`, color: COL.textMuted }], bars: [{ label: grantGoal(c), value: pctBar(g.count, g.min), color: g.met ? COL.good : COL.progress, text: `${Math.min(g.count, g.min)} / ${g.min}` }] });
    }
    if (!G.active().length) sections.push({ title: 'Active', lines: [{ text: 'No grants active', color: COL.textMuted }] });
    const board = G.board();
    sections.push({ title: 'On offer this month', lines: board.length ? [] : [{ text: 'Nothing on offer: a new board comes with the month’s close', color: COL.textMuted }], columns: 1, buttons: board.flatMap((c) => {
      const can = G.canAccept(c.id);
      return [
        { id: `grant:accept:${c.id}`, label: `${c.name} · ${grantPay(c)}`, sub: `${can.ok ? `Goal: ${grantGoal(c)} ${c.goal.min} within ${c.deadlineDays} days` : can.reason} · ${grantById(c.grantId).text}`, icon: 'care_ui_05', disabled: !can.ok, accent: COL.good, onTap: () => say(G.accept(c.id)) },
        { id: `grant:decline:${c.id}`, label: `Pass on the ${c.name.toLowerCase()}`, sub: 'It leaves the board', accent: COL.progress, onTap: () => say(G.decline(c.id)) },
      ];
    }) });
    const done = G.done(4).reverse();
    if (done.length) sections.push({ title: 'Earlier grants', lines: done.map((c) => ({ text: `${c.name}: ${c.status === 'success' ? 'goal met, paid' : c.result?.reason === 'deadline' ? 'deadline passed (nothing lost)' : 'ended'}`, color: c.status === 'success' ? COL.good : COL.textMuted })) });
    sections.push({ columns: 1, buttons: [{ id: 'grants:back', label: '‹ Back to Business', accent: COL.progress, onTap: () => openBusiness() }] });
    return { title: 'Grant board', subtitle: `${G.active().length} of ${GRANT_RULES.maxActive} active · ${board.length} on offer`, art: 'care_ui_05', accent: accentNow(), sections };
  });
}
// The Inbox: partner offers (sign or not now).
function partnerInbox(w) {
  return w.partners.offers().map((o) => {
    const can = w.partners.canSign(o.def.id);
    return { title: `A partnership offer: ${o.def.name}`, lines: [{ text: `${o.def.theme} · Perk: ${o.def.perks.map((k) => k.text).join(' · ')}`, color: COL.good }, { text: `Obligation: ${o.def.obligation.text}`, color: COL.actionDark }], columns: 2, buttons: [
      { id: `inbox:partner:${o.def.id}`, label: 'Sign · 6 months', sub: can.ok ? 'The perk starts at once' : can.reason, icon: o.def.logo, disabled: !can.ok, accent: COL.good, onTap: () => {
        if (w.partners.sign(o.def.id).ok) autosave.request('partner');
      } },
      { id: `inbox:partnerNo:${o.def.id}`, label: 'Not now', sub: 'Or see Business → Community partners', accent: COL.progress, onTap: () => {
        w.partners.decline(o.def.id);
        autosave.request('partner');
      } },
    ] };
  });
}
// The Ledger: what partners and grants brought this month.
function partnerLedger(w, range) {
  const ls = w.ledger.economy.ledger.filter((l) => ['partnerSupport', 'partnerPerk', 'grants'].includes(l.category) && l.day >= range.fromDay);
  const perks = w.partners.perksActive();
  return { title: 'Partners and grants', lines: [
    ...(perks.length ? perks.map((k) => ({ text: `${k.def.name}: ${k.text}`, color: COL.good })) : [{ text: 'No partner perks running', color: COL.textMuted }]),
    ...ls.slice(-4).map((l) => ({ text: `${l.reason}: +${credits(l.amount)}`, color: COL.actionDark })),
    { text: 'Food, equipment and upkeep savings post at the month’s close', color: COL.textMuted },
  ] };
}

// Milestone 22: the Ledger — this month (so far, with the close's lines as they stand) and last month for every income and
// cost line, a small 6-month balance line, the loan / investor status.
function ledgerMonth(w) {
  const range = w.monthRange();
  const sum = {};
  for (const l of w.ledger.economy.ledger) if (l.currency === 'credits' && l.day >= range.fromDay && !['opening', 't', 'test', 'debug'].includes(l.category) && !(l.day === range.fromDay && CLOSE_CATS.includes(l.category))) sum[l.category] = (sum[l.category] ?? 0) + l.amount;
  for (const l of w.ledger.forecast({ ...range, day: w.clock.totalDays, residents: w.payers(), staff: w.payroll(), home: w.homeCosts(), feeMult: w.blessings?.feeMult() ?? 1 })) sum[l.category] = (sum[l.category] ?? 0) + l.amount;
  return sum;
}
const signedCredits = (v) => `${v < 0 ? '−' : v > 0 ? '+' : ''}${credits(Math.abs(v))}`;
// A small line of the month-end balances (code-drawn), for a sheet line's glyph.
function balanceGlyph(points) {
  return (ctx, x, y, size) => {
    const w = 520;
    const h = size * 1.1;
    ctx.strokeStyle = COL.track;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    if (points.length < 2) return;
    const lo = Math.min(...points, 0);
    const hi = Math.max(...points, 0);
    const span = Math.max(1, hi - lo);
    const py = (v) => y + h - 4 - ((v - lo) / span) * (h - 8);
    if (lo < 0 && hi > 0) {
      ctx.strokeStyle = COL.bad;
      ctx.beginPath();
      ctx.moveTo(x, py(0));
      ctx.lineTo(x + w, py(0));
      ctx.stroke();
    }
    ctx.strokeStyle = COL.good;
    ctx.lineWidth = 5;
    ctx.beginPath();
    points.forEach((v, k) => {
      const px = x + 8 + (k / (points.length - 1)) * (w - 16);
      if (k) ctx.lineTo(px, py(v));
      else ctx.moveTo(px, py(v));
    });
    ctx.stroke();
    ctx.fillStyle = COL.good;
    points.forEach((v, k) => {
      ctx.beginPath();
      ctx.arc(x + 8 + (k / (points.length - 1)) * (w - 16), py(v), 7, 0, Math.PI * 2);
      ctx.fill();
    });
  };
}
function offerSection(w, o, say) {
  const D = DEBT;
  if (o.kind === 'loan') {
    const owed = Math.round(D.loan.amount * (1 + D.loan.interestPct / 100));
    return { title: 'Emergency Credit', lines: [{ text: `The home is in deep debt (${credits(w.ledger.balance)} Credits). A loan of ${credits(D.loan.amount)} now, repaid as ${D.loan.months} monthly payments of ${credits(Math.ceil(owed / D.loan.months))} (${D.loan.interestPct}% on top).`, color: COL.actionDark }, { text: 'Nobody is let go and nothing changes for the residents either way.', color: COL.textMuted }], columns: 2, buttons: [
      { id: 'offer:loan:yes', label: 'Take the loan', sub: `+${credits(D.loan.amount)} now`, accent: COL.good, onTap: () => {
        const r = w.economy.accept('loan');
        say(r.ok ? null : r.reason);
        if (r.ok) autosave.request('economy');
      } },
      { id: 'offer:loan:no', label: 'Not now', sub: `It may be offered again in ${D.reofferDays} days`, accent: COL.progress, onTap: () => {
        w.economy.decline('loan');
        autosave.request('economy');
      } },
    ] };
  }
  return { title: 'A Rescue Investor', lines: [{ text: `The balance has kept sinking. An investor will clear the debt (to ${credits(D.investor.buffer)} Credits, and any Emergency Credit still owed) for ${D.investor.sharePct}% of each month's profit for ${D.investor.months} months.`, color: COL.actionDark }, { text: 'The home and everyone in it carry on as they are.', color: COL.textMuted }], columns: 2, buttons: [
    { id: 'offer:investor:yes', label: 'Accept the investor', sub: `Debt cleared · ${D.investor.sharePct}% of profit`, accent: COL.good, onTap: () => {
      const r = w.economy.accept('investor');
      say(r.ok ? null : r.reason);
      if (r.ok) autosave.request('economy');
    } },
    { id: 'offer:investor:no', label: 'Not now', sub: 'Asked again if it keeps sinking', accent: COL.progress, onTap: () => {
      w.economy.decline('investor');
      autosave.request('economy');
    } },
  ] };
}
function openLedger() {
  sheet.open(() => {
    const w = open?.world;
    if (!w) return { title: '', sections: [] };
    const b = w.ledger.balance;
    const c = w.clock;
    const now = ledgerMonth(w);
    const last = w.economy.history(1)[0]?.byCat ?? {};
    const row = (r) => {
      const t = now[r.cat] ?? 0;
      const l = last[r.cat] ?? 0;
      const later = /later/.test(r.name);
      if (!t && !l && !later && !['fees', 'funding', 'wages', 'food', 'supplies', 'equipment', 'upkeep', 'utilities'].includes(r.cat)) return null;
      return { id: `ledger:${r.cat}`, label: r.name, sub: later ? 'Comes in a later update' : `This month ${signedCredits(t)} · last month ${signedCredits(l)}`, icon: r.icon, accent: later ? COL.progress : r.kind === 'income' ? COL.good : COL.action, disabled: later };
    };
    const inc = LEDGER_ROWS.filter((r) => r.kind === 'income').map(row).filter(Boolean);
    const cost = LEDGER_ROWS.filter((r) => r.kind === 'cost').map(row).filter(Boolean);
    const tot = (kind) => LEDGER_ROWS.filter((r) => r.kind === kind).reduce((t, r) => t + (now[r.cat] ?? 0), 0);
    const totLast = (kind) => LEDGER_ROWS.filter((r) => r.kind === kind).reduce((t, r) => t + (last[r.cat] ?? 0), 0);
    const hist = w.economy.history(6);
    const d = w.economy.state.debt;
    const debtLines = [];
    for (const t of w.economy.warnings()) debtLines.push({ text: t, color: COL.bad });
    if (d.loan) debtLines.push({ text: `Emergency Credit: ${credits(d.loan.owed)} still owed · ${d.loan.left} monthly payments of ${credits(d.loan.payment)} left`, color: COL.actionDark });
    if (d.investor) debtLines.push({ text: `Rescue Investor: ${d.investor.sharePct}% of each month's profit for ${d.investor.left} more month${d.investor.left === 1 ? '' : 's'}`, color: COL.actionDark });
    if (d.offer) debtLines.push({ text: `An offer is waiting in the Inbox: ${d.offer.kind === 'loan' ? 'Emergency Credit' : 'a Rescue Investor'}`, color: COL.warn });
    if (!debtLines.length) debtLines.push({ text: `No loans. Emergency Credit is offered if the balance falls below ${credits(DEBT.floor)}.`, color: COL.textMuted });
    const sections = [
      { lines: [{ text: `Balance: ${credits(b)} Credits`, color: b < 0 ? COL.bad : COL.actionDark }, { text: `This month so far: income ${credits(tot('income'))} · costs ${credits(-tot('cost'))} · net ${signedCredits(tot('income') + tot('cost'))}`, color: COL.actionDark }, { text: `Last month: income ${credits(totLast('income'))} · costs ${credits(-totLast('cost'))} · net ${signedCredits(totLast('income') + totLast('cost'))}`, color: COL.textMuted }] },
      { title: 'The last 6 months', lines: hist.length ? [{ text: ' ', glyph: balanceGlyph(hist.map((h) => h.balance)) }, { text: `Month-end balances; nets: ${hist.map((h) => signedCredits(h.net)).join(' · ')}`, color: COL.actionDark }] : [{ text: 'No month has closed yet.', color: COL.textMuted }] },
      { title: `Income (Month ${c.month} so far · last month)`, columns: 1, buttons: inc },
      { title: 'Costs', columns: 1, buttons: cost },
      { title: 'Loans and investors', lines: debtLines },
      // (Milestone 7: shifts run unsafe; Milestone 16: the care-outcome counters)
      { title: 'Care outcomes', lines: [{ text: `Successful discharges: ${w.rewards.positiveOutcomes}${w.rewards.discharges.length ? ` (last: ${first(w.rewards.discharges.at(-1).name)})` : ''}`, color: COL.actionDark }, `Reputation: ${w.rewards.reputation}`, { text: `Unsafe shifts so far: ${w.staffState.coverage.unsafe} (run under minimum with no agency cover)`, color: w.staffState.coverage.unsafe ? COL.bad : COL.textMuted }] },
      { title: 'Other currencies', lines: [{ text: `Research Points: ${w.research.rp.toLocaleString('en-GB')} (Develop → Research)`, glyph: artGlyph(REWARD_ART.research) }, { text: `Care Tokens: ${w.economy.tokens} (earned for firsts and good months; nothing to spend them on yet)`, glyph: artGlyph(TOP_ICONS.careTokens) }, { text: `Prestige Tokens: ${w.economy.prestige + w.secrets.prestigeTokens} (account: from secrets; New Game+ brings more later)`, ...((open.data.ngPlus ?? 0) > 0 || w.economy.prestige + w.secrets.prestigeTokens > 0 ? { glyph: artGlyph(REWARD_ART.prestige) } : {}) }] }, // (Milestone 28b: the tokens; the Prestige Token on New Game+ only)
      partnerLedger(w, w.monthRange()), // (Milestone 23)
      programLedger(w, w.monthRange()),
      researchLedger(w, w.monthRange()),
      clinicalLedger(w, w.monthRange()),
      emergencyLedger(w, w.monthRange()), // (Milestone 25)
      { columns: 1, buttons: [{ id: 'ledger:back', label: '‹ Back to Business', accent: COL.progress, onTap: () => openBusiness() }] },
    ];
    return { title: 'Ledger', subtitle: `Credits · Month ${c.month}, Year ${c.year}`, art: 'care_ui_05', accent: accentNow(), sections };
  });
}
function openTopSheet(id) {
  const t = TOP_SHEETS[id];
  // (Milestone 25c: Help always reaches Settings and the Menu, even with the Menu button turned off)
  const more = id === 'help' ? [{ columns: 2, buttons: [
    { id: 'help:settings', label: SETTINGS_TEXT.title, sub: 'Sound, graphics, text, the Menu button and hints', icon: MENU_TEXT.icon, accent: COL.progress, onTap: () => openSettings() },
    { id: 'help:menu', label: MENU_TEXT.title, sub: 'Every screen in the home', icon: MENU_TEXT.icon, accent: COL.progress, onTap: () => openNavMenu() },
    { id: 'help:credits', label: 'Credits', sub: 'Who made CAREWORKS', icon: BRAND.title, accent: COL.progress, onTap: () => openCredits() }, // (Milestone 28b)
  ] }] : [];
  sheet.open(() => ({ title: t.title, subtitle: t.text, accent: COL.progress, sections: open ? more : more.map((x) => ({ ...x, columns: 1, buttons: x.buttons.filter((b) => b.id !== 'help:menu') })) }));
}
// Milestone 28b: the Credits, closed by the series end mark (care_brand_07) as the sheet's picture.
function openCredits() {
  sheet.open(() => ({
    title: 'CAREWORKS',
    subtitle: 'A Banx Games game · the Canvas Management Series',
    art: BRAND.endMark,
    accent: COL.progress,
    sections: [
      { lines: [{ text: 'Made by Banx Games. Art by Aaron.', color: COL.actionDark }, { text: 'The Works Gods: Bolt, Jinx, Zip, Kaching and Havoc, the series’ recurring cast.', color: COL.textMuted }, { text: 'One of the Works games: BOTWORKS, RACEWORKS, DEVWORKS, GOALWORKS and CAREWORKS share one world and one engine.', color: COL.textMuted }, { text: 'Thank you for playing, and for looking after everyone here.', color: COL.good }] },
      { columns: 1, buttons: [{ id: 'credits:back', label: '‹ Back', accent: COL.progress, onTap: () => openTopSheet('help') }] },
    ],
  }));
}
// A card opened from a list gets a way back to that list, and the person's ring in the home.
function openFrom(id, list) {
  const it = open?.world.byId(id);
  if (it) homeScreen.selection.select(it);
  openHomeSheet(id, list);
}

// --- Admissions (Milestone 6, bible §8) -----------------------------------------------------------------------------
const admitCtxNow = () => open.world.admitCtx();
function openAdmissions() {
  sheet.open(() => {
    const w = open?.world;
    if (!w) return { title: '', sections: [] };
    const adm = w.admissions;
    const ctx = admitCtxNow();
    const row = (app, wait) => {
      const def = adm.defOf(app);
      const p = adm.prereq(app, ctx);
      const days = adm.daysLeft(app, ctx.day);
      const status = wait ? `${days} day${days === 1 ? '' : 's'} left on the list` : `${def.urgency} urgency`;
      return { id: `app:${app.id}`, label: `${def.name}, ${def.age}${app.returning ? ' · Returning' : ''}`, sub: `${def.support} · ${stayWords(def, app.stayDays)} · ${status} · ${p.ok ? 'Ready' : p.text}`, icon: def.art, iconCrop: PORTRAIT_CROP, accent: p.ok ? COL.progress : COL.textFaint, onTap: () => openApplicant(app.id) };
    };
    const free = w.freeRooms().length;
    return {
      title: 'Admissions',
      subtitle: `${free} of ${w.rooms.length} rooms free (Stage ${w.stage.n} holds ${w.stage.capacity}) · new applicants every few days`,
      art: CARE_ICONS.admissions,
      accent: accentNow(),
      sections: [
        adm.board.length ? { title: 'Applicants', columns: 1, buttons: adm.board.map((a) => row(a, false)) } : { title: 'Applicants', lines: [{ text: 'Nobody is applying right now. New applicants arrive every few days.', color: COL.textMuted }] },
        adm.waiting.length ? { title: 'Waiting list', columns: 1, buttons: adm.waiting.map((a) => row(a, true)) } : { title: 'Waiting list', lines: [{ text: 'Nobody is waiting.', color: COL.textMuted }] },
        { columns: 1, buttons: [{ id: 'adm:back', label: '‹ Back to residents', accent: COL.progress, onTap: () => openResidents() }] },
      ],
    };
  });
}
// One applicant's card (bible §8): who they are, their needs, what they want and need, and the four choices. A choice
// that can't be made now is greyed with the reason in plain words — never a hidden fail.
function openApplicant(id) {
  let message = null;
  sheet.open(() => {
    const w = open?.world;
    const adm = w?.admissions;
    const app = adm?.get(id);
    if (!app) return { title: 'No longer applying', subtitle: 'They have found a place elsewhere.', accent: COL.progress, sections: [{ columns: 1, buttons: [{ id: 'app:back', label: '‹ Back to admissions', accent: COL.progress, onTap: () => openAdmissions() }] }] };
    const def = adm.defOf(app);
    const ctx = admitCtxNow();
    const p = adm.prereq(app, ctx);
    const can = adm.canAdmit(app, ctx);
    const level = levelOfNeeds(app.needs ?? def.needs); // (Milestone 22: from their assessed needs)
    const days = adm.daysLeft(app, ctx.day);
    const wait = app.status === 'wait';
    const nextRoom = w.roomsFor(id)[0];
    const act = (fn, ok) => {
      const r = fn();
      if (!r.ok) {
        message = r.reason;
        return;
      }
      bus.emit('admissions:action', { id });
      ok?.();
    };
    const lines = [];
    if (message) lines.push({ text: message, color: COL.bad });
    lines.push({ text: p.ok ? 'Ready: the home can meet their needs' : p.text, color: p.ok ? COL.good : COL.bad });
    if (!p.ok) lines.push({ text: p.reason, color: COL.bad });
    if (app.returning) lines.push({ text: `Returning: ${first(def.name)} stayed here before and went home. Familiar Care is kept.`, color: COL.good });
    lines.push({ text: `Stay: ${stayWords(def, app.stayDays, true)}`, color: COL.actionDark });
    lines.push(`Wants: ${ROOM_TEMPLATES[def.room].name} · Urgency: ${def.urgency}`);
    lines.push(`Support Level ${level} (from their needs) · Care Support Funding ${credits(fundingOf(level, (app.needs ?? def.needs).clinical > ON_CALL.clinicalNeedAbove))} a month · required care about ${credits(requiredCost(level).total)} · fee from ${credits(ROOM_FEES[nextRoom?.defId] ?? ROOM_FEES.default)} a month`);
    lines.push(`Visitors: ${def.visitors} · ${def.personality} · enjoys ${def.interest}`);
    lines.push({ text: def.story, color: COL.textMuted });
    lines.push({ text: `Life story: ${def.tags.join(' · ')}`, color: COL.textMuted });
    lines.push({ text: wait ? `On the waiting list: ${days} day${days === 1 ? '' : 's'} left before they look elsewhere` : `Applying: ${days} day${days === 1 ? '' : 's'} before they look elsewhere if nobody answers`, color: COL.textMuted });
    if (app.assessReady != null && ctx.day < app.assessReady) lines.push({ text: 'Assessment update under way: back tomorrow.', color: COL.actionDark });
    else if (app.assessed) lines.push({ text: 'Assessment updated.', color: COL.textMuted });
    return {
      title: def.name,
      subtitle: `${def.age} · ${def.support} · ${stayWords(def, app.stayDays)}${app.returning ? ' · Returning' : ''}`,
      art: def.art,
      accent: accentNow(),
      sections: [
        { lines },
        { title: 'Needs', lines: [{ text: 'How much support they need now (their assessment)', color: COL.textMuted }], bars: NEEDS.map((n) => ({ label: n.name, value: app.needs[n.id], color: COL.progress })) },
        {
          columns: 1,
          buttons: [
            { id: 'act:admit', label: 'Admit now', sub: can.ok ? `Room ${w.roomNumber(nextRoom?.id)} · walks in now, joins the routine from the next band` : can.reason, disabled: !can.ok, accent: COL.good, onTap: () => act(() => w.admit(id), () => {
              sheet.close();
              const person = w.residentById(id);
              if (person) homeScreen.selection.select(person);
            }) },
            { id: 'act:wait', label: 'Wait-list', sub: wait ? 'Already on the waiting list' : `Keeps their place for ${ADMISSION.waitDays} days`, disabled: wait, accent: COL.progress, onTap: () => act(() => adm.waitlist(id, ctx.day)) },
            { id: 'act:decline', label: 'Decline / refer elsewhere', sub: 'They look for a place elsewhere (and may apply again later)', accent: COL.progress, onTap: () => act(() => adm.decline(id, ctx.day), () => openAdmissions()) },
            { id: 'act:assess', label: 'Request assessment update', sub: app.assessed ? 'Already updated once' : 'A fresh look at their needs · takes a day', disabled: app.assessed, accent: COL.progress, onTap: () => act(() => adm.requestAssessment(id, ctx.day)) },
            { id: 'app:back', label: '‹ Back to admissions', accent: COL.progress, onTap: () => openAdmissions() },
          ],
        },
      ],
    };
  });
}

// Milestone 9: "Respite · 21 days" (long: "Respite · 21 days, then home"; Long Term: "Long Term").
function stayWords(def, days, long = false) {
  const t = STAYS[def.stay]?.text ?? def.stay;
  if (days == null) return long ? `${t} (stays)` : t;
  return long ? `${t} · ${days} days, then home (the room frees up)` : `${t} · ${days} days`;
}
// The resident card's stay line: how long is left, or Long Term.
function stayLine(w, it) {
  const st = it.state;
  const t = STAYS[it.def.stay]?.text ?? it.def.stay;
  if (st.leaving) return st.rehab?.dischargedDay != null ? `${t}: rehab complete, heading home with family` : `${t}: the stay is over, heading home today`;
  if (st.rehab?.active) return st.rehab.readyDay != null ? `${t}: ready to go home` : `${t}: goes home when ${theirOf(it.id)} rehab goals are met`; // (Milestone 16)
  if (!st.stay) return `${t}: no set end`;
  const left = w.stayDaysLeft(it.id);
  if (st.stay.opening && !w.residents.some((q) => q !== it && !q.state.leaving && !q.state.guest)) return `${t}: stays on while ${theirOf(it.id) === 'her' ? 'she is' : 'he is'} the only resident (${left} day${left === 1 ? '' : 's'} left once someone else moves in)`;
  const d = w.clock.dateOf(st.stay.leaveDay);
  return left === 0 ? `${t}: heads home today` : `${t}: heads home on Day ${d.day}, Month ${d.month} (${left} day${left === 1 ? '' : 's'} left)`;
}

// --- ?debug=1 "Spawn all 60" (Milestone 9) -----------------------------------------------------------------------------
// A test home in place of the campaign's (never saved, autosave off): every resident not in it comes in as a guest
// (ignoring rooms and capacity), walks to a spot, and each card is opened once and drawn. Then the test home clears
// and the campaign comes back as it was. Result: window.__cw.spawnReport and a sheet.
const SPAWN_WALK_SEC = 1.5; // walking before the cards
const SPAWN_CARD_FRAMES = 3; // frames each card stays open (it is drawn)
function startSpawnCheck() {
  if (!open || spawn) return;
  sheet.close();
  homeScreen.selection.clear();
  const real = open.world;
  const world = createHomeWorld({ founderId: open.data.facility.founder?.id, seed: 'spawn-check' });
  const guests = world.spawnGuests();
  const people = world.residents;
  spawn = { real, world, ids: people.map((p) => p.id), starts: new Map(people.map((p) => [p.id, { x: p.agent.x, y: p.agent.y }])), i: 0, t: 0, frames: 0, phase: 'walk', errors: [], cards: 0, guests: guests.length, started: performance.now() };
  open.world = world;
  homeScreen.enter(); // the home screen now draws and moves the test home (same slot: the view is kept)
  assets.startTracking();
  debug.log(`spawn check: ${people.length} residents in the test home`);
}
function tickSpawnCheck(dt) {
  const s = spawn;
  if (!s) return;
  s.t += dt;
  if (s.phase === 'walk') {
    if (s.t >= SPAWN_WALK_SEC) s.phase = 'cards';
    return;
  }
  if (s.phase === 'cards') {
    if (s.frames === 0) {
      const id = s.ids[s.i];
      const it = s.world.byId(id);
      try {
        if (!it) throw new Error('not in the test home');
        residentSections(s.world, it); // the card's content builds without an error
        homeScreen.selection.select(it);
        openHomeSheet(id);
        s.cards++;
      } catch (err) {
        s.errors.push(`${id}: ${err.message}`);
      }
    }
    if (++s.frames >= SPAWN_CARD_FRAMES) {
      s.frames = 0;
      if (++s.i >= s.ids.length) finishSpawnCheck();
    }
  }
}
function finishSpawnCheck() {
  const s = spawn;
  const track = assets.trackingReport();
  assets.stopTracking();
  const moved = s.world.residents.filter((p) => {
    const a = s.starts.get(p.id);
    return p.agent.state !== 'walking' || Math.hypot(p.agent.x - a.x, p.agent.y - a.y) > 1;
  }).length;
  const defs = s.ids.map((id) => s.world.byId(id)?.def).filter(Boolean);
  const artDrawn = defs.filter((d) => assets.has(d.art) && track?.drawn[d.art] && !track.fallbacks[d.art]).length;
  const missingArt = defs.filter((d) => !(assets.has(d.art) && track?.drawn[d.art] && !track.fallbacks[d.art])).map((d) => d.id);
  sheet.close();
  homeScreen.selection.clear();
  s.world.clearGuests();
  open.world = s.real;
  spawn = null;
  homeScreen.enter(); // back to the campaign's own home
  const report = { residents: s.ids.length, guests: s.guests, cards: s.cards, artDrawn, missingArt, walked: moved, errors: s.errors, seconds: +((performance.now() - s.started) / 1000).toFixed(1), ok: s.ids.length === RESIDENTS.length && s.cards === s.ids.length && artDrawn === s.ids.length && moved === s.ids.length && !s.errors.length };
  if (window.__cw) window.__cw.spawnReport = report;
  debug.log(`spawn check: ${report.cards}/${report.residents} cards, ${report.artDrawn} portraits, ${report.errors.length} errors`);
  sheet.open(() => ({
    title: 'Spawn check',
    subtitle: report.ok ? `All ${report.residents} residents spawned, walked, drew their portrait and card` : 'Problems found',
    accent: report.ok ? COL.good : COL.bad,
    sections: [
      { lines: [`Residents in the test home: ${report.residents} of ${RESIDENTS.length}`, `Cards opened and drawn: ${report.cards}`, `Portraits drawn: ${report.artDrawn}`, `Walked to a spot: ${report.walked}`, `Took ${report.seconds} s · the test home is cleared, your home is as it was`, ...report.errors.map((e) => ({ text: e, color: COL.bad })), ...(report.missingArt.length ? [{ text: `Art not drawn: ${report.missingArt.join(', ')}`, color: COL.bad }] : [])] },
      { columns: 1, buttons: [{ id: 'spawn:close', label: 'Close', accent: COL.progress, onTap: () => sheet.close() }] },
    ],
  }));
}

// --- Recruitment and training (Milestone 11) ---------------------------------------------------------------------------
const STAT_WORDS = Object.fromEntries(STATS.map((x) => [x.id, x.id]));
// Staff → Recruit: the board of three, the next free board, and a paid board from each channel (locked ones greyed with
// the reason; ?debug=1 opens them).
function openRecruit() {
  let message = null;
  sheet.open(() => {
    const w = open?.world;
    if (!w) return { title: '', sections: [] };
    const sf = w.staffing;
    const daysToFree = Math.max(0, sf.nextFreeDay - w.clock.totalDays);
    const full = w.team.length >= sf.cap;
    const cards = sf.board.map((c) => ({ id: `cand:${c.id}`, label: `${c.name} · ${TIERS[c.tier].name}`, sub: `${c.channel === 'special' ? 'Special arrival' : ROLES[c.role].name} · Lv ${c.level} · ${c.salary} a month · ${TRAITS[c.trait]?.name ?? ''}`, icon: c.art, iconCrop: PORTRAIT_CROP, iconBadge: ROLES[c.role].badge, tag: TIER_TAG[c.tier] ?? null, accent: TIER_ACCENT[c.tier] ?? COL.progress, onTap: () => openCandidate(c.id) }));
    const chans = sf.channels().map(({ channel: c, ok, reason }) => ({ id: `chan:${c.id}`, label: c.id === 'special' ? c.name : `${c.name} · ${credits(c.cost)}`, sub: ok ? c.text : `${reason} · ${c.text}`, disabled: !ok || c.id === 'special', accent: COL.progress, onTap: () => {
      const r = sf.refresh(c.id);
      message = r.ok ? { text: `A new board from ${c.name}`, good: true } : { text: r.reason, good: false };
      if (r.ok) autosave.request('recruit');
    } }));
    const lines = [];
    if (message) lines.push({ text: message.text, color: message.good ? COL.good : COL.bad });
    lines.push({ text: `Staff ${w.team.length} / ${sf.cap} (Rank ${RANK_NOW})${full ? ': the team is full' : ''} · a free new board in ${daysToFree} day${daysToFree === 1 ? '' : 's'}`, color: full ? COL.bad : COL.textMuted });
    return {
      title: 'Recruit',
      subtitle: 'Candidates for the team · hire someone to have them walk in',
      art: 'care_ui_02',
      accent: accentNow(),
      sections: [
        { lines },
        cards.length ? { title: 'Candidates', columns: 1, buttons: cards } : { title: 'Candidates', lines: [{ text: 'Nobody on the board: try a new board.', color: COL.textMuted }] },
        { title: 'A new board now', columns: 1, buttons: chans },
        ...(debug.enabled ? [{ title: 'Debug', columns: 1, buttons: [
          { id: 'chan:debug', label: `Open every channel and training without a room (debug): ${sf.debug ? 'On' : 'Off'}`, sub: 'Also counts as the Rank the Rare and Elite rules ask for', accent: sf.debug ? COL.good : COL.progress, onTap: () => sf.setDebug(!sf.debug) },
          { id: 'chan:elite', label: `Unlock Elite staff (debug): ${sf.eliteUnlock ? 'On' : 'Off'}`, sub: 'Counts every Elite condition as met. Legendary and Secret staff never appear on a board.', accent: sf.eliteUnlock ? COL.good : COL.progress, onTap: () => {
            sf.setEliteUnlock(!sf.eliteUnlock);
            autosave.request('debug');
          } },
        ] }] : []),
        { columns: 1, buttons: [{ id: 'recruit:back', label: '‹ Back to the roster', accent: COL.progress, onTap: () => openRoster() }] },
      ],
    };
  });
}
// Milestone 12: the tier's tag and accent on a candidate, and every trait as lines (a pending one says it comes later;
// a signature is marked).
const TIER_TAG = { rare: 'RARE', elite: 'ELITE', legendary: 'LEGENDARY', secret: 'PRESTIGE', divine: 'DIVINE' }; // (Milestone 30b: the Works Gods)
const TIER_ACCENT = { rare: COL.gold, elite: COL.action, legendary: COL.gold, secret: COL.gold, divine: COL.gold };
// Milestone 30b: a Works God's portrait with a small gold glow behind it — a canvas made once from the loaded file, under
// its own key (made again after a lost canvas: AssetManager drops made images). The file itself is never changed.
function godArt(key) {
  const glow = `${key}__glow`;
  if (assets.has(glow)) return glow;
  const img = assets.get(key);
  if (!img || typeof document === 'undefined' || !img.naturalWidth) return key;
  const pad = Math.round(img.naturalHeight * 0.1);
  const c = document.createElement('canvas');
  c.width = img.naturalWidth + pad * 2;
  c.height = img.naturalHeight + pad * 2;
  const x = c.getContext('2d');
  const r = Math.max(c.width, c.height) * 0.5;
  const g = x.createRadialGradient(c.width / 2, c.height / 2, r * 0.2, c.width / 2, c.height / 2, r);
  g.addColorStop(0, 'rgba(255, 214, 92, 0.6)');
  g.addColorStop(1, 'rgba(255, 214, 92, 0)');
  x.fillStyle = g;
  x.fillRect(0, 0, c.width, c.height);
  x.drawImage(img, pad, pad);
  c.naturalWidth = c.width; // (AssetManager reads an image's natural size)
  c.naturalHeight = c.height;
  assets.images.set(glow, c);
  return glow;
}
function traitLines(ids) {
  return ids.map((id) => TRAITS[id]).filter(Boolean).map((t) => (t.blessing
    ? { text: `Blessing · ${t.name}: ${t.text}`, color: COL.actionDark } // (Milestone 30b: a Works God's blessing, live from the day they join)
    : t.pendingSystem
    ? { text: `${t.signature ? 'Signature · ' : ''}${t.name}: ${t.text} (comes into play in a later update)`, color: COL.textMuted }
    : `${t.name}: ${t.text}`));
}
// One candidate: who they are, their stats against their tier cap, pay, trait, shift preference — and Hire.
function openCandidate(cardId) {
  let message = null;
  sheet.open(() => {
    const w = open?.world;
    const c = w?.staffing.card(cardId);
    if (!c) return { title: 'No longer on the board', subtitle: 'They took another job.', accent: COL.progress, sections: [{ columns: 1, buttons: [{ id: 'cand:back', label: '‹ Back to Recruit', accent: COL.progress, onTap: () => openRecruit() }] }] };
    const can = w.staffing.canHire(cardId);
    const cap = TIERS[c.tier].statCap;
    const def = staffById(c.personId);
    return {
      title: c.name,
      subtitle: `${ROLES[c.role].name} · ${TIERS[c.tier].name} · Lv ${c.level}`,
      art: c.tier === 'divine' ? godArt(c.art) : c.art, // (Milestone 30b: a Works God's gold glow)
      badge: ROLES[c.role].badge,
      tag: TIER_TAG[c.tier] ? { text: TIER_TAG[c.tier] } : null,
      accent: accentNow(),
      sections: [
        { lines: [...(message ? [{ text: message, color: COL.bad }] : []), `Salary ${c.salary} Credits a month · prefers ${PREF_WORD[c.shiftPref] ?? '—'} shifts`, ...traitLines(c.traits ?? [c.trait]), { text: `From ${CHANNELS.find((x) => x.id === c.channel)?.name ?? 'the board'}${def?.rule && c.tier !== 'standard' ? ` · eligible: ${def.rule.text}` : ''}`, color: COL.textMuted }] },
        { title: `Stats (tier cap ${cap})`, bars: STATS.map((x) => ({ label: x.name, value: c.stats[x.id], max: cap, color: x.id === ROLES[c.role].primaryStat ? COL.action : COL.progress })) },
        {
          columns: 1,
          buttons: [
            { id: 'cand:hire', label: 'Hire', sub: can.ok ? 'Joins Off shift and walks in from the front door; put them on a shift in the roster' : can.reason, disabled: !can.ok, accent: COL.good, onTap: () => {
              const r = w.hire(cardId);
              if (!r.ok) return void (message = r.reason);
              autosave.request('hire');
              openRecruit();
            } },
            { id: 'cand:back', label: '‹ Back to Recruit', accent: COL.progress, onTap: () => openRecruit() },
          ],
        },
      ],
    };
  });
}
// A staff member's courses: what each would add (trimmed at the tier cap: "Would reach cap"), days, cost, specialty.
function openCourses(staffId) {
  let message = null;
  sheet.open(() => {
    const w = open?.world;
    const q = w?.crew.byId(staffId);
    if (!q) return { title: '', sections: [] };
    const rows = w.staffing.courses(staffId).map((x) => {
      const c = x.course;
      const gains = x.preview.map((g) => `${STAT_WORDS[g.key]} +${g.min}–${g.max}`).join(', ');
      const sp = c.specialty ? ` · ${SPECIALTIES[c.specialty].name}${x.specialtyNote ? ` (${x.specialtyNote})` : ''}` : '';
      const cap = x.capped ? ' · Would reach cap' : '';
      return { id: `course:${c.id}`, label: `${c.name} · ${credits(c.cost)} · ${c.days} days`, sub: x.ok ? `${gains}${cap}${sp}` : `${x.reason}${gains ? ` · ${gains}` : ''}`, disabled: !x.ok, accent: x.capped ? COL.gold : COL.progress, tag: x.capped ? 'CAP' : null, onTap: () => {
        const r = w.train(c.id, staffId);
        if (!r.ok) return void (message = r.reason);
        autosave.request('training');
        openHomeSheet(staffId, 'roster');
      } };
    });
    const hasRoom = w.layout.ofDef('F11').length > 0;
    return {
      title: `Training: ${q.name}`,
      subtitle: `${ROLES[q.role].name} · ${TIERS[q.model.tier].name} (cap ${TIERS[q.model.tier].statCap}) · specialties ${w.specialtiesOf(staffId).length} of ${w.staffing.specialtyLimit(staffId)}`,
      art: q.art,
      badge: ROLES[q.role].badge,
      accent: accentNow(),
      sections: [
        { lines: [...(message ? [{ text: message, color: COL.bad }] : []), { text: hasRoom ? 'Away from the roster at the Training Room for the course.' : 'Needs a Training Room (Build Mode; it opens at Rank D).', color: hasRoom ? COL.textMuted : COL.bad }] },
        { columns: 1, buttons: rows },
        { columns: 1, buttons: [{ id: 'courses:back', label: '‹ Back to their card', accent: COL.progress, onTap: () => openHomeSheet(staffId, 'roster') }] },
      ],
    };
  });
}
// Let go: asks first; the Founder asks twice (the Founding Staff flag ends and they never come back).
function confirmLetGo(staffId) {
  const w = open?.world;
  const q = w?.crew.byId(staffId);
  if (!q) return;
  const founder = w.staffState.founder.id === staffId && !w.staffState.founder.ended;
  const go = () => {
    const r = w.letGo(staffId);
    if (r.ok) {
      autosave.request('letGo');
      openRoster();
    }
  };
  dialog.confirm({
    title: `Let ${first(q.name)} go?`,
    body: `They leave the home. Their Familiar Care with residents stays on record, and they could be hired again later.`,
    art: q.art,
    yes: 'Let go',
    danger: true,
    onYes: () => {
      if (!founder) return go();
      dialog.confirm({ title: 'Your Founder?', body: `${q.name} has been with you since Day 1. The Founding Staff flag and perk end, and a Founder never comes back.`, art: q.art, yes: 'Let the Founder go', danger: true, onYes: go });
    },
  });
}

// --- a resident's card (Milestones 2–6) --------------------------------------------------------------------------------
// What they are doing now, their six needs and five outcomes as bars, today's log and their likes; who helps with each
// step (a picker, which since Milestone 4 pins that step's task); the Care Plan section (six rows, each opening its
// domain's options), today's care tasks, the call bells and Familiar Care. Milestone 6: any resident, not only Arthur.
function residentSections(w, it) {
  const st = it.state;
  const step = st.step && w.joined(it) ? stepName(st.step.id) : null;
  const log = st.log.slice(-LOG_SHOWN).map((e) => `${e.t}  ${e.text}`);
  const pick = (p) => ROUTINE.filter((s) => (st.prefs[s.id] ?? 'accept') === p).map((s) => (s.activity ? s.name : s.name.toLowerCase()));
  const likes = [pick('prefer').length && `Enjoys: ${pick('prefer').join(', ')}`, pick('dislike').length && `Would rather not: ${pick('dislike').join(', ')}`, pick('refuse').length && `Says no to: ${pick('refuse').join(', ')}`].filter(Boolean);
  const bell = w.bellFor(it.id);
  const they = theirOf(it.id) === 'her' ? 'she' : 'he';
  const room = st.room ? `Room ${w.roomNumber(st.room)}` : 'No room (test home)';
  return [
    { lines: [{ text: step ? `${step}: ${w.stateOf(it)}` : w.stateOf(it), color: COL.actionDark }, ...(bell ? [{ text: `Call bell ringing (${needName(bell.need)})`, color: COL.bad }] : []), `${room} · Support Level ${w.levelOf(it.id) ?? supportLevel(it.def)} · funding ${credits(fundingOf(w.levelOf(it.id) ?? 1))}, required care ${credits(requiredCost(w.levelOf(it.id) ?? 1).total)} a month`, `${WAKE.windows[wakeWindowOf(it.def)].name} · gets up at ${clockText(st.wakeAt ?? 7)}`, { text: stayLine(w, it), color: st.stay ? COL.actionDark : COL.textMuted }] },
    { title: 'Life story', lines: [it.def.story, { text: (st.tags?.length ? st.tags : it.def.tags).join(' · '), color: COL.actionDark }, ...(st.returning ? [{ text: 'Returning: stayed here before', color: COL.good }] : [])] },
    ...(stageSection(w, it) ?? []), // (Milestone 27)
    planSection(w, it),
    ...healthSections(w, it),
    { title: 'Tasks today', lines: taskLines(w, it) },
    { title: 'Call bells', lines: bellLines(w, it, they) },
    familiarSection(w, it),
    friendsSection(w, it),
    familySection(w, it), // (Milestone 19)
    activitySection(w, it),
    ...programSections(w, it), // (Milestone 20)
    mealsSection(w, it),
    ...rehabSections(w, it),
    ...memorySections(w, it),
    { title: 'Needs', lines: [{ text: `How much support ${they} needs right now`, color: COL.textMuted }], bars: NEEDS.map((n) => ({ label: n.name, value: st.needs[n.id], color: COL.progress })) },
    { title: 'Outcomes', bars: OUTCOMES.map((o) => ({ label: o.name, value: st.outcomes[o.id], color: COL.good })) },
    { title: 'Today', lines: log.length ? log : ['Nothing yet today'] },
    { title: 'Likes and dislikes', lines: likes },
    { title: 'Who helps', lines: [{ text: 'Staff pick their own tasks. Tap a step to pin it to one person (Auto: whoever scores best).', color: COL.textMuted }], buttons: helpButtons(w, it), columns: 2 },
  ];
}
// Milestone 4: the Care Plan section — one row per domain (bible §9), tap → that domain's options. Milestone 8: the
// review (an amber dot and the reasons while it is due, the last review day, and Reviewed).
function planSection(w, it) {
  const stale = w.staleOf(it.id);
  const r = it.state.review;
  const lines = stale.map((x) => ({ text: x.text, color: COL.warn }));
  lines.push({ text: r?.day == null ? 'Not reviewed yet.' : `Last reviewed ${r.day === w.clock.totalDays ? 'today' : `${w.clock.totalDays - r.day} day${w.clock.totalDays - r.day === 1 ? '' : 's'} ago`}. Tap a row to change it; a change shapes tomorrow's tasks, and today's where that part hasn't happened yet.`, color: COL.textMuted });
  const buttons = planButtons(w, it);
  buttons.push({ id: 'plan:review', label: stale.length ? 'Reviewed' : 'Reviewed (confirm the plan)', sub: stale.length ? 'The plan is right as it stands: mark it reviewed' : 'Up to date: review again any time', accent: stale.length ? COL.action : COL.progress, onTap: () => {
    w.reviewPlan(it.id);
    autosave.request('review');
  } });
  // Milestone 19: a review can include the family (a care-plan meeting; reviewed when it is held)
  const rec = w.family.recordOf(it.id);
  if (rec?.contact) buttons.push({ id: 'plan:reviewFamily', label: 'Review with family', sub: rec.meeting ? `Meeting booked: ${aheadWord(w, rec.meeting.day)} afternoon` : w.family.canBook() ? `With ${rec.contact.name}: reviewed when the meeting is held (Family Trust +${MEETING.lift})` : 'Needs the Founder or a nurse on the Afternoon shift', disabled: !!rec.meeting || !w.family.canBook(), accent: COL.action, onTap: () => bookMeeting(w, it.id, { review: true }) });
  return { title: stale.length ? 'Care Plan · review due' : 'Care Plan', titleDot: stale.length ? COL.warn : null, lines, buttons, columns: 1 };
}
const PREF_WORDS = { prefer: 'likes this', dislike: 'dislikes this', refuse: 'refuses this' };
function planButtons(w, it) {
  return DOMAINS.map((d) => {
    const o = optionById(it.state.plan?.[d.id]);
    const pref = o && w.optionPref(o.id, it.id);
    const note = pref === 'refuse' ? ' · refused: its tasks are refused' : pref === 'dislike' ? ' · disliked' : '';
    return { id: `plan:${d.id}`, label: d.name, sub: o ? `${o.name}${note}` : 'Not set', accent: pref === 'refuse' ? COL.bad : COL.progress, onTap: () => openPlanPicker(d.id, it.id) };
  });
}
// "07:00  Wake up · done with Ruby"
const TASK_WORDS = { open: 'to do', claimed: 'on the way', working: 'being helped', done: 'done', missed: 'missed', refused: 'said no', self: 'on their own', unstaffed: 'no one on shift', scaled: 'scaled back (short-staffed)', away: 'away (hospital service)' };
function taskLines(w, it) {
  if (!w.joined(it)) return [{ text: 'Settling in: care tasks start from the next band.', color: COL.textMuted }];
  const tasks = w.tasksToday(it.id).filter((t) => t.type !== 'bell');
  if (!tasks.length) return [{ text: 'No care tasks planned for this band (no one is on shift).', color: COL.textMuted }];
  return tasks.sort((a, b) => (a.at ?? a.opens % 24) - (b.at ?? b.opens % 24)).map((t) => {
    const who = t.slots[0] ? ` · ${first(w.byId(t.slots[0])?.name ?? t.slots[0])}` : '';
    const at = t.at ?? t.opens % 24;
    const word = t.status === 'open' && t.opens > w.clock.totalDays * 24 + w.hour ? 'later' : TASK_WORDS[t.status];
    const color = t.status === 'missed' ? COL.bad : t.status === 'done' ? COL.good : t.status === 'open' ? COL.textMuted : COL.actionDark;
    return { text: `${clockText(at)}  ${t.name} · ${word}${who}`, color };
  });
}
function bellLines(w, it, they) {
  const b = w.bellSummary(it.id);
  const lines = [];
  if (!b.last.length) lines.push({ text: 'No call bells yet.', color: COL.textMuted });
  else {
    lines.push(`Last ${b.last.length}: ${b.last.map((r) => `${r.minutes} min`).join(' · ')}`);
    lines.push({ text: `Average response: ${Math.round(b.avg)} min (${b.count} bell${b.count === 1 ? '' : 's'} so far)`, color: COL.actionDark });
  }
  const cap = they.charAt(0).toUpperCase() + they.slice(1);
  lines.push({ text: `${cap} rings when a need reaches ${BELL.line}; the time counts until someone is at ${theirOf(it.id)} side.`, color: COL.textMuted });
  return lines;
}
// Milestone 12: the three staff on the team who know them best (a Familiar Care record each: familiarity 0–100, tasks
// together, when they first met), with a small bar each.
// Milestone 13: a small heart drawn in code beside the favourite staff member's line.
// Milestone 28b: a picture as a line's glyph (an icon, or a face with crop) — drawn as it is, scaled to the line.
const artGlyph = (key, crop = null) => (ctx, x, y, size) => {
  const r = { x, y: y - size * 0.1, w: size * 1.15, h: size * 1.15 };
  if (crop) assets.drawCrop(ctx, key, crop, r);
  else assets.drawContained(ctx, key, r);
};
// The first line of a section carries the picture (nothing is added when there are no lines).
function withGlyph(lines, key) {
  if (!lines.length) return lines;
  const [l, ...rest] = lines;
  return [{ ...(typeof l === 'string' ? { text: l } : l), glyph: artGlyph(key) }, ...rest];
}
function heartGlyph(ctx, x, y, size) {
  const s = size * 0.9;
  const cx = x + s / 2;
  const top = y + s * 0.3;
  ctx.fillStyle = COL.bad;
  ctx.beginPath();
  ctx.moveTo(cx, y + s * 0.95);
  ctx.bezierCurveTo(x - s * 0.1, y + s * 0.55, x + s * 0.05, y, cx, top);
  ctx.bezierCurveTo(x + s * 0.95, y, x + s * 1.1, y + s * 0.55, cx, y + s * 0.95);
  ctx.fill();
}
function familiarSection(w, it) {
  const top = w.topStaffFor(it.id, 3);
  const lines = top.length ? [] : [{ text: 'Nobody knows them well yet: familiarity builds with every task done together.', color: COL.textMuted }];
  // Milestone 13: the favourite (most familiar, at least FAVOURITE.at) with a heart; their usual carers (continuity)
  const fav = w.favouriteOf(it.id);
  if (fav) lines.push({ text: `Favourite: ${w.byId(fav)?.name ?? fav}`, color: COL.actionDark, glyph: heartGlyph });
  const usual = w.usualCarers(it.id);
  lines.push({ text: usual.length ? `Usual carers: ${usual.map((id) => first(w.byId(id)?.name ?? id)).join(', ')}` : 'Usual carers: none yet (pin a continuity group on the roster)', color: usual.length ? COL.text : COL.textMuted });
  if (top.length) {
    lines.push({ text: `Most familiar: ${w.byId(top[0].staff)?.name ?? top[0].staff}`, color: COL.actionDark });
    lines.push({ text: `Tasks together: ${top.map((r) => `${first(w.byId(r.staff)?.name ?? r.staff)} ${r.tasks}${r.firstDay != null ? ` (since day ${r.firstDay + 1})` : ''}`).join(' · ')}`, color: COL.textMuted });
  }
  return { title: 'Familiar Care', lines: withGlyph(lines, SECTION_ICONS.familiar), bars: top.map((r) => ({ label: w.byId(r.staff)?.name ?? r.staff, value: Math.round(r.familiarity), max: 100, color: COL.good })) };
}
// Milestone 13: their three best friends here (friendship 0–100), a bar each; friends (≥ FRIENDSHIP.friendAt) are named.
function friendsSection(w, it) {
  const top = w.friendsOf(it.id, 3);
  const name = (id) => w.residentById(id)?.name ?? id;
  const friends = top.filter((r) => r.friendship >= FRIENDSHIP.friendAt);
  const lines = top.length
    ? [{ text: friends.length ? `Friends: ${friends.map((r) => first(name(r.other))).join(', ')}` : 'Getting to know the others at meals and activities', color: friends.length ? COL.actionDark : COL.textMuted }]
    : [{ text: 'No friendships yet: they grow at shared meals, activities and neighbouring seats.', color: COL.textMuted }];
  return { title: 'Friends', lines, bars: top.map((r) => ({ label: name(r.other), value: Math.round(r.friendship), max: 100, color: COL.gold })) };
}
// "Mobility for Betty" (Milestone 8: all eight options): each row says whether it can be chosen (greyed with the
// reason when not), the current one and their like / dislike / refusal. Tap a row to see it; Choose to take it.
const NEED_WORDS = Object.fromEntries(NEEDS.map((n) => [n.id, n.name]));
const OUTCOME_WORDS = Object.fromEntries(OUTCOMES.map((o) => [o.id, o.name]));
function openPlanPicker(domainId, residentId, suggest = null) {
  let looking = suggest; // the option tapped (its details and Choose); Milestone 18: the one an alert suggests
  let message = null;
  sheet.open(() => {
    const w = open?.world;
    const d = DOMAINS.find((x) => x.id === domainId);
    const it = w?.residentById(residentId);
    if (!w || !d || !it) return { title: '', sections: [] };
    const current = it.state.plan?.[d.id];
    const who = first(it.name);
    const rows = optionsFor(d.id).map((o) => {
      const el = w.eligibility(o.id, residentId);
      const pref = w.optionPref(o.id, residentId);
      const isCurrent = o.id === current;
      let sub;
      if (isCurrent) sub = `Current${PREF_WORDS[pref] ? ` · ${who} ${PREF_WORDS[pref]}` : ''}`;
      else if (!el.ok) sub = el.reason;
      else sub = `${PREF_WORDS[pref] ? `${who} ${PREF_WORDS[pref]} · ` : ''}about ${o.minutesPerDay} min a day`;
      return { id: `option:${o.id}`, label: o.name, sub, disabled: !el.ok && !isCurrent, accent: isCurrent ? COL.good : looking === o.id ? COL.action : pref === 'refuse' ? COL.bad : COL.progress, onTap: () => {
        looking = o.id;
        message = null;
        sheet.scrollY = 0;
      } };
    });
    const sections = [];
    if (message) sections.push({ lines: [{ text: message, color: COL.bad }] });
    const o = looking && optionById(looking);
    if (o) {
      const pref = w.optionPref(o.id, residentId);
      const el = w.eligibility(o.id, residentId);
      const lines = [
        o.text,
        { text: `${o.roles.map((r) => ROLES[r].name).join(' / ')} · about ${o.minutesPerDay} min a day`, color: COL.textMuted },
        { text: `Eases: ${o.nudges.needs.map((n) => NEED_WORDS[n]).join(', ') || 'nothing directly'}${o.nudges.outcomes.length ? ` · Helps: ${o.nudges.outcomes.map((x) => OUTCOME_WORDS[x]).join(', ')}` : ''}`, color: COL.textMuted },
      ];
      if (o.removes?.length) lines.push({ text: `${o.removes.map((x) => stepName(x)).join(', ')}: no staff help (${who} does it ${theirOf(it.id) === 'her' ? 'her' : 'his'} own way)`, color: COL.textMuted });
      if (pref === 'dislike') lines.push({ text: `${who} dislikes this: choosing it costs ${-OPTION_PREF_MOOD.dislike} Mood, and ${theirOf(it.id) === 'her' ? 'she' : 'he'} may say no to its tasks.`, color: COL.warn });
      if (pref === 'refuse') lines.push({ text: `${who} refuses this: you can choose it, but its tasks will be refused whenever they come up.`, color: COL.bad });
      if (pref === 'prefer') lines.push({ text: `${who} likes this (+${OPTION_PREF_MOOD.prefer} Mood when chosen).`, color: COL.good });
      if (!el.ok) lines.push({ text: el.reason, color: COL.bad });
      if (o.id === suggest) lines.push({ text: 'Suggested for the alert: a plan that fits how they are now', color: COL.good });
      const choose = () => {
        const r = w.changePlan(d.id, o.id, residentId);
        if (!r.ok) {
          message = r.reason;
          return;
        }
        if (r.changed) autosave.request('plan');
        openHomeSheet(residentId);
      };
      const label = o.id === current ? 'Current option' : pref === 'dislike' ? `Choose anyway (Mood −${-OPTION_PREF_MOOD.dislike})` : pref === 'refuse' ? 'Choose anyway (tasks refused)' : `Choose ${o.name}`;
      sections.push({ title: o.name, lines, columns: 1, buttons: [{ id: 'option:choose', label, disabled: !el.ok || o.id === current, accent: pref === 'dislike' || pref === 'refuse' ? COL.warn : COL.action, onTap: choose }] });
    }
    sections.push({ title: o ? 'All options' : null, lines: o ? [] : [{ text: 'Tap an option to see what it does. Greyed ones can\'t be chosen yet: the reason is on the row.', color: COL.textMuted }], columns: 1, buttons: [...rows, { id: 'option:back', label: `‹ Back to ${who}`, accent: COL.progress, onTap: () => openHomeSheet(residentId) }] });
    return { title: `${d.name} for ${who}`, subtitle: 'Care plan · eight options · pick one', art: it.art, accent: paletteById(open.data.facility.palette).hex, sections };
  });
}
// Milestone 3: one button per routine step — who will help with it. Milestone 7: someone is rostered then when their
// shift's hours hold the step's time.
const inShift = (sh, h) => (sh.from < sh.to ? h >= sh.from && h < sh.to : h >= sh.from || h < sh.to);
const rosteredAt = (w, step) => w.team.filter((p) => {
  const sh = w.roster.shiftOf(p.id);
  return sh && inShift(sh, step.at);
});
const onMorningShift = (step) => !!open && rosteredAt(open.world, step).length > 0;
function helpButtons(w, it) {
  return ROUTINE.map((step) => {
    const chosen = w.chosenFor(step.id, it.id);
    const who = (id) => w.byId(id)?.name.split(' ')[0];
    let sub;
    if (!onMorningShift(step)) sub = chosen ? `${who(chosen)} · off shift then` : 'Off shift: on their own';
    else if (chosen) sub = `${who(chosen)} (chosen)`;
    else {
      // Auto names who normally does it: the first team member whose role fits (busy right now or not).
      const fit = rosteredAt(w, step).find((p) => step.roles.includes(p.role));
      sub = fit ? `Auto · ${who(fit.id)}` : 'Auto · no one on the team fits';
    }
    return { id: `help:${step.id}`, label: step.name, sub, accent: chosen ? COL.action : COL.progress, onTap: () => openPicker(step.id, it.id) };
  });
}
// "Who helps with breakfast?": Auto, or any team member. A role that doesn't fit is refused in plain words.
function openPicker(stepId, residentId) {
  let message = null;
  sheet.open(() => {
    const w = open?.world;
    const step = ROUTINE.find((s) => s.id === stepId);
    const it = w?.residentById(residentId);
    if (!w || !step || !it) return { title: '', sections: [] };
    const needs = step.roles.map((r) => ROLES[r].name).join(' or ');
    const lines = [];
    if (message) lines.push({ text: message, color: COL.bad });
    if (!onMorningShift(step)) lines.push({ text: `No one is rostered at ${clockText(step.at)}: ${first(it.name)} manages on their own unless agency cover comes (Staff → Roster).`, color: COL.textMuted });
    const chosen = w.chosenFor(stepId, residentId);
    const pick = (id) => {
      const r = w.assign(stepId, id, residentId);
      if (!r.ok) {
        message = r.reason;
        return;
      }
      autosave.request('assign');
      openHomeSheet(residentId);
    };
    return {
      title: `Who helps ${first(it.name)} with ${step.activity ? step.name : step.name.toLowerCase()}?`,
      subtitle: `Needs a ${needs} · ${step.task.replace(/\bhim\b/g, theirOf(it.id) === 'her' ? 'her' : 'him')} · from ${clockText(step.at)}`,
      art: it.art,
      accent: paletteById(open.data.facility.palette).hex,
      sections: [
        { lines },
        {
          columns: 1,
          buttons: [
            { id: 'pick:auto', label: 'Auto', sub: 'Staff pick it themselves by urgency, role, familiarity and distance', accent: chosen ? COL.progress : COL.good, onTap: () => pick(null) },
            ...w.team.map((p) => {
              const fits = step.roles.includes(p.role);
              return { id: `pick:${p.id}`, label: p.name, sub: `${ROLES[p.role].name}${fits ? '' : ' · role does not fit'}${chosen === p.id ? ' · chosen' : ''}`, icon: p.art, accent: !fits ? COL.textFaint : chosen === p.id ? COL.good : COL.progress, onTap: () => pick(p.id) };
            }),
            { id: 'pick:back', label: `‹ Back to ${first(it.name)}`, accent: COL.progress, onTap: () => openHomeSheet(residentId) },
          ],
        },
      ],
    };
  });
}
// The staff card (Milestone 3): portrait with the role badge, FOUNDER tag, tier and level, five stat bars, Energy and
// Morale, the trait, the shift and what they are doing now; Milestone 6: how familiar they are with each resident.
function staffMenu(w, p, accent) {
  const m = p.model;
  const cap = TIERS[m.tier]?.statCap ?? 220;
  const isFounder = w.staffState.founder.id === p.id && !w.staffState.founder.ended;
  const h = w.staffState.founder.history;
  const agency = w.roster.isAgency(p.id);
  const pref = staffById(p.id)?.shiftPref;
  const wing = w.roster.wingOf(p.id);
  const shiftLines = agency
    ? [w.roster.label(p.id), 'Agency worker: booked for this shift only; builds no Familiar Care and is never on records.']
    : [w.roster.label(p.id), `Prefers ${PREF_WORD[pref] ?? '—'} shifts${pref !== 'night' ? ' · Night shifts cost a little Morale' : ''} · ${wing ? `${WINGS.find((x) => x.id === wing)?.short} wing` : w.roster.isFloat(p.id) ? 'float: tied to no wing' : 'no wing'}`];
  const status = [m.status.tired && 'Tired', m.status.stressed && 'Stressed'].filter(Boolean);
  const fam = w.topResidentsFor(p.id, 3); // (Milestone 12: the three residents here who know them best)
  const sections = [
    { lines: [{ text: w.stateOf(p), color: COL.actionDark }, ...shiftLines, agency ? `Tasks helped with: ${m.counters.tasks ?? 0} · Fee ${SHORT_STAFFING.agencyFeePerShift} Credits a shift` : `Tasks helped with: ${m.counters.tasks ?? 0} · Salary ${m.salary} Credits a month`] },
    { title: 'Stats', bars: STATS.map((s) => ({ label: s.name, value: m.stats[s.id], max: cap, color: s.id === ROLES[m.role].primaryStat ? COL.action : COL.progress })) },
    { title: status.length ? `Energy and Morale · ${status.join(', ')}` : 'Energy and Morale', bars: [{ label: 'Energy', value: m.energy, color: m.energy < 25 ? COL.bad : COL.good }, { label: 'Morale', value: m.morale, color: m.morale < 25 ? COL.bad : COL.gold }] },
    { title: m.traits.length > 1 ? 'Traits' : 'Trait', lines: m.traits.length ? traitLines(m.traits) : ['None'] },
  ];
  if (!agency) {
    const grp = w.continuityOf(p.id);
    sections.push({ title: 'Continuity group', lines: [{ text: grp.length ? `${first(p.name)}'s residents: ${grp.map((id) => first(w.residentById(id)?.name ?? id)).join(', ')}` : 'No residents pinned: they help whoever needs it most', color: grp.length ? COL.actionDark : COL.textMuted }], columns: 1, buttons: [{ id: `group:${p.id}`, label: grp.length ? 'Change their residents' : 'Pin residents to them', sub: `Up to ${CONTINUITY.maxResidents}: they are preferred for these residents when on shift`, accent: COL.progress, onTap: () => openContinuity(p.id) }] });
    const famLines = fam.length
      ? [...fam.filter((r) => w.mostFamiliar(r.resident) === p.id).map((r) => ({ text: `${first(w.residentById(r.resident)?.name ?? r.resident)}'s most familiar staff member`, color: COL.actionDark })), { text: `Tasks together: ${fam.map((r) => `${first(w.residentById(r.resident)?.name ?? r.resident)} ${r.tasks}`).join(' · ')}`, color: COL.textMuted }]
      : [{ text: 'Not familiar with anyone yet: it builds with every task done together.', color: COL.textMuted }];
    sections.push({ title: 'Familiar Care', lines: withGlyph(famLines, SECTION_ICONS.familiar), bars: fam.map((r) => ({ label: w.residentById(r.resident)?.name ?? r.resident, value: Math.round(r.familiarity), max: 100, color: COL.good })) });
  }
  // Milestone 11: specialties, training, let go
  if (!agency) {
    const sp = w.specialtiesOf(p.id);
    const lim = w.staffing.specialtyLimit(p.id);
    const tr = w.staffing.trainingOf(p.id);
    const course = tr && w.staffing.training.course(tr.courseId);
    sections.push({ title: `Specialties (${sp.length} of ${lim})`, lines: [sp.length ? sp.map((x) => SPECIALTIES[x].name).join(' · ') : { text: 'None yet: courses can give one', color: COL.textMuted }] });
    sections.push({
      title: 'Training',
      lines: [tr ? { text: `At the Training Room: ${course?.name} · ${tr.days - tr.daysDone} day${tr.days - tr.daysDone === 1 ? '' : 's'} left`, color: COL.actionDark } : { text: 'Courses raise stats (never past the tier cap) and can give a specialty.', color: COL.textMuted }],
      columns: 2,
      buttons: [
        { id: 'staff:train', label: 'Train', sub: tr ? 'Already training' : 'Choose a course', disabled: !!tr, accent: COL.progress, onTap: () => openCourses(p.id) },
        { id: 'staff:letGo', label: 'Let go', sub: isFounder ? 'The Founder: asks twice' : 'Asks first', accent: COL.bad, onTap: () => confirmLetGo(p.id) },
      ],
    });
  }
  if (!agency) {
    // Milestone 25c: care equipment — what they love (×1.5 and a little Morale) or aren't keen on (×0.5), their season's
    // item points, and Give
    const lk = w.items.likesOf(p.id);
    const got = w.items.received(p.id);
    sections.push({
      title: 'Care equipment',
      lines: [
        { text: `Loves ${lk.loves.map((g) => itemGroupById(g)?.name).join(' and ')}${lk.dislike ? ` · not keen on ${itemGroupById(lk.dislike)?.name}` : ''}`, color: COL.actionDark },
        { text: `Item points left this season: ${w.items.pointsLeft(p.id)} of ${ITEM_RULES.periodCap}${got.length ? ` · ${got.length} given so far (${got.map((g) => `${g.stat} +${g.gain}`).join(', ')})` : ''}`, color: COL.textMuted },
      ],
      columns: 1,
      buttons: [{ id: 'staff:give', label: 'Give equipment', sub: w.items.count ? `${w.items.count} in the store: raises a stat for good` : 'The store is empty: equipment comes from play', disabled: !w.items.count, icon: ITEM_RULES.storeIcon, accent: COL.progress, onTap: () => openGiveTo(p.id) }],
    });
  }
  if (isFounder) {
    const f = FOUNDERS.find((x) => x.id === p.id);
    sections.push({ title: 'Founding Staff', lines: [`${f.perk.name}: ${f.perk.text}`, `With you since Day 1 · ${h.daysEmployed} days (${yearsEmployed(h)} years) · ${h.careTasks} care tasks`] });
  }
  return { title: p.name, subtitle: `${ROLES[m.role].name} · ${agency ? 'Agency cover' : `${TIERS[m.tier]?.name ?? m.tier} · Lv ${m.level}`}`, art: m.tier === 'divine' ? godArt(p.art) : p.art, badge: ROLES[m.role].badge, tag: isFounder ? { text: 'FOUNDER' } : agency ? { text: 'AGENCY' } : TIER_TAG[m.tier] === 'DIVINE' ? { text: 'DIVINE' } : null, accent, sections }; // (Milestone 30b: a Works God's gold glow and tag)
}
// from: 'residents' / 'roster' when opened from a bottom-bar list (Milestone 5) — the card then has a way back to it.
const BACK_TO = { residents: { label: '‹ Back to residents', open: () => openResidents() }, roster: { label: '‹ Back to the roster', open: () => openRoster() } };
function openHomeSheet(id, from = null, { tab = null } = {}) {
  if (open?.world.residentById(id)) markMissedSeen(id);
  const back = BACK_TO[from];
  const withBack = (menu) => (back ? { ...menu, sections: [{ columns: 1, buttons: [{ id: 'back', label: back.label, accent: COL.progress, onTap: back.open }] }, ...menu.sections] } : menu);
  sheet.open(() => {
    const w = open?.world;
    const it = w?.byId(id);
    if (!it) return { title: '', sections: [] };
    const accent = paletteById(open.data.facility.palette).hex;
    if (it.kind === 'resident') return withBack({ title: it.name, subtitle: it.line, art: it.art, accent, sections: residentSections(w, it) });
    if (it.kind === 'staff') return withBack(staffMenu(w, it, accent));
    const here = w.people.filter((p) => w.whereIs(p) === it.id).map((p) => p.name.split(' ')[0]);
    const lines = [here.length ? `Here now: ${here.join(' and ')}` : 'Nobody here right now'];
    let sub = it.def.text;
    const sections = [{ lines }];
    if (it.kind === 'room') {
      const who = it.residentId ? w.byId(it.residentId) : null;
      const n = w.roomNumber(it.id);
      sub = who ? `Room ${n} · ${who.name}'s room` : `Room ${n} · Empty`;
      lines.unshift(who ? `Resident: ${who.name} (${who.def.support})` : 'Empty: ready for a new resident. Admit one from Care → Admissions.');
      if (!who) sections.push({ columns: 1, buttons: [{ id: 'room:admissions', label: 'Admissions', sub: `${w.admissions.board.length} applying`, icon: CARE_ICONS.admissions, accent: COL.action, onTap: () => openAdmissions() }] });
    }
    if (it.defId === 'F05') sections.push({ columns: 1, buttons: [{ id: 'place:activities', label: 'Activities', sub: activitiesSub(w), accent: COL.action, onTap: () => openActivities() }] });
    if (it.defId === 'F05') {
      // Milestone 13: the activity groups (regulars: they prefer it, or have joined it often)
      for (const g of ACTIVITY_GROUPS) {
        const members = w.activityGroup(g.id).map((id) => first(w.residentById(id)?.name ?? id));
        lines.push({ text: members.length ? `${g.name}: ${members.join(', ')}` : `${g.name}: no regulars yet`, color: members.length ? COL.actionDark : COL.textMuted });
      }
    }
    if (it.defId === 'F03') sections.push(...diningSections(w)); // (Milestone 15)
    if (it.defId === 'F04' || it.defId === 'F16') sections.push(...kitchenSections(w, it));
    // Milestone 17: the memory-support places
    if (it.defId === 'F21' || it.defId === 'F22' || it.defId === 'F06') lines.push({ text: w.calmPlace()?.id === it.id ? 'A calm place: residents with memory support have their morning rest here' : 'A calm place to sit', color: COL.actionDark });
    if (it.defId === 'F20') lines.push({ text: 'Life-story time and memory-care sessions go further here', color: COL.actionDark });
    if (it.defId === 'F22' && !w.walkPath) lines.push({ text: 'Mark a safe walking path round it in Build Mode (Walking path)', color: COL.textMuted });
    if (it.defId === 'F17') lines.push({ text: 'Plans every special menu (soft, balanced, small plates, hearty), whoever is cooking', color: COL.actionDark });
    // Milestone 18: the clinical places
    if (it.defId === 'F01') sections.push(...clinicalSections(w));
    if (it.defId === 'F02') lines.push({ text: `The Medication Cart is kept here: each medicine round starts here (round safety +${Math.round(it.def.effect.value * w.layout.levelMultOf(it.uid))}%)`, color: COL.actionDark });
    if (it.defId === 'F23') lines.push({ text: 'Moderate alerts can be handled in-house: assessments and senior reviews go further', color: COL.actionDark });
    if (it.defId === 'F28') lines.push({ text: `Medicine rounds are safer and better recorded (round safety +${Math.round(it.def.effect.value * w.layout.levelMultOf(it.uid))}%)`, color: COL.actionDark });
    if (it.defId === 'F09') sections.push(...familyDeskSections(w)); // (Milestone 19)
    if (it.defId === 'F15') lines.push({ text: `Visits happen here when the resident is free, and family meetings go ${MEETING.familyRoomPct}% further`, color: COL.actionDark });
    if (it.defId === 'F29') lines.push({ text: `Every Family Trust gain goes ${TRUST.partnershipPct}% further`, color: COL.actionDark });
    if (it.defId === 'F09') sections.push({ columns: 1, buttons: [{ id: 'place:recruit', label: 'Recruit', sub: `${w.staffing.board.length} candidates · Staff ${w.team.length} / ${w.staffing.cap}`, accent: COL.action, onTap: () => openRecruit() }] });
    if (it.defId === 'F11') {
      const trainees = w.team.filter((q) => w.roster.isTraining(q.id));
      lines.push(trainees.length ? `Training now: ${trainees.map((q) => `${first(q.name)} (${w.staffing.training.course(w.staffing.trainingOf(q.id)?.courseId)?.name ?? ''})`).join(', ')}` : 'Nobody training right now: choose a course from a staff card.');
    }
    for (const r of w.programs.at(it.defId)) lines.push({ text: `Program here: ${r.def.name} — ${programSchedule(r.def)}`, color: COL.good }); // (Milestone 20)
    const lvInfo = w.build.levelInfo(it.uid); // (Milestone 25c)
    if (lvInfo) sections.push(upgradeSection(w, it, lvInfo));
    sections.push({ columns: 1, buttons: [{ id: 'place:build', label: 'Move or sell in Build Mode', sub: it.def.effect ? `${it.def.effect.text}${lvInfo?.level > 1 && lvInfo.scaled ? ` ×${lvInfo.mult} (Level ${LEVELS.names[lvInfo.level - 1]})` : ''}${it.def.effect.wired ? '' : ' (its system comes later)'}` : '', accent: COL.progress, onTap: () => {
      homeScreen.setBuildMode(true);
      homeScreen.pick(it);
    } }] });
    // Milestone 25: the Nurse Station has two tabs — Clinical (as before) and Emergency (Preparedness, events, supplies, falls)
    if (it.defId === 'F01') return { title: it.def.name, subtitle: sub, art: sheet.tab === 'emergency' ? EMERGENCY_ICON : it.def.art, accent, tabs: [{ id: 'clinical', label: 'Clinical', sections }, { id: 'emergency', label: 'Emergency', badge: emergencyWaiting() || null, sections: emergencySections(w) }] };
    return { title: it.def.name, subtitle: sub, art: it.def.art, accent, sections };
  }, { tab });
}
// Leaving the home for the Main Menu: save the run first; a reload after this opens the menu again.
async function leaveHome() {
  if (spawn) {
    // (a spawn check under way: the campaign's own home comes back first)
    assets.stopTracking();
    spawn.world.clearGuests();
    open.world = spawn.real;
    spawn = null;
    homeScreen.enter();
  }
  rememberHome(null);
  router.go('menu');
  await autosave.flush();
  await campaigns.refresh();
  open = null;
}

// ---------------------------------------------------------------------------
// Milestone 25c — the series common features.
// The Menu sheet (core/ui/MenuSheet, data/menu.js): each row opens the very same sheet the art or a bar opens.
const placedOf = (defId) => open?.world.placed.find((p) => p.defId === defId) ?? null;
const MENU_OPEN = {
  residents: () => openResidents(),
  admissions: () => openAdmissions(),
  carePlans: () => openResidents(),
  activities: () => openActivities(),
  programs: () => openPrograms(),
  emergency: () => placedOf('F01') && openHomeSheet(placedOf('F01').id, null, { tab: 'emergency' }),
  roster: () => openRoster(),
  recruit: () => openRecruit(),
  training: () => placedOf('F11') && openHomeSheet(placedOf('F11').id),
  itemStore: () => openItemStore(),
  build: () => {
    sheet.close();
    homeScreen.setBuildMode(true);
  },
  develop: () => openDevelop(),
  research: () => openResearch(),
  quality: () => openQuality(),
  complaints: () => openComplaints(), // (Milestone 26: Quality is the hub now)
  memoryBook: () => openMemoryBook(), // (Milestone 27: account-wide)
  secrets: () => openSecrets(), // (Milestone 29: Records → Secrets)
  achievements: () => openAchievements(), // (Milestone 32: Records → Achievements, Home Records, Staff Hall of Fame)
  homeRecords: () => openHomeRecords(),
  hallOfFame: () => openHallOfFame(),
  family: () => placedOf('F09') && openHomeSheet(placedOf('F09').id),
  business: () => openBusiness(),
  partners: () => openPartners(),
  grants: () => openGrants(),
  ledger: () => openLedger(),
  inbox: () => openInbox(),
  settings: () => openSettings(),
  help: () => openTopSheet('help'),
  mainMenu: () => {
    sheet.close();
    leaveHome();
  },
};
function menuState(id) {
  const w = open?.world;
  if (!w) return {};
  if (id === 'training' && !placedOf('F11')) return { locked: 'Needs a Training Room (Build Mode)' };
  if (id === 'family' && !placedOf('F09')) return { locked: 'Needs a Reception / Family Desk (Build Mode)' };
  if (id === 'emergency' && !placedOf('F01')) return { locked: 'Needs the Central Nurse Station' };
  if (id === 'itemStore') return { badge: w.items.count || null, sub: `${w.items.count} of ${w.items.max} · give one to raise a staff member's stat for good` };
  if (id === 'inbox' && inboxCountNow()) return { badge: inboxCountNow() };
  if (id === 'carePlans' && w.stalePlans().length) return { badge: w.stalePlans().length };
  if (id === 'roster' && w.coverage.warnings().length) return { badge: w.coverage.warnings().length };
  if (id === 'memoryBook') return { sub: `${memoryBook.count} page${memoryBook.count === 1 ? '' : 's'} · kept for good across every home` };
  return {};
}
function openNavMenu() {
  sheet.open(() => menuSheet({ title: MENU_TEXT.title, subtitle: MENU_TEXT.subtitle, art: MENU_TEXT.icon, accent: accentNow(), groups: MENU_GROUPS, open: (id) => MENU_OPEN[id]?.(), state: menuState }));
}
// The Menu icon, drawn by code (three bars on a cream tile; no file).
assets.setFallback(MENU_TEXT.icon, (ctx, x, y, w, h) => {
  const sz = Math.min(w, h);
  const ox = x + (w - sz) / 2;
  const oy = y + (h - sz) / 2;
  ctx.save();
  ctx.fillStyle = '#FFF6E5';
  ctx.strokeStyle = COL.outline;
  ctx.lineWidth = Math.max(2, sz * 0.05);
  ctx.beginPath();
  ctx.roundRect(ox + sz * 0.08, oy + sz * 0.08, sz * 0.84, sz * 0.84, sz * 0.18);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = COL.action;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.roundRect(ox + sz * 0.24, oy + sz * (0.28 + i * 0.18), sz * 0.52, sz * 0.09, sz * 0.045);
    ctx.fill();
  }
  ctx.restore();
});
// Care equipment pictures: filed art where it fits, code placeholders in the group colour for the rest, every rarity
// frame drawn by code (core/ui/ItemArt).
registerItemArt(assets, { types: ITEM_TYPES, groups: ITEM_GROUPS, rarities: ITEM_RARITIES });

// The Inbox count: everything waiting, plus care equipment that arrived since the Inbox was last opened.
function inboxBase() {
  return (open?.world?.activities?.notices().length ?? 0) + (open?.world?.readyToGoHome?.().length ?? 0) + alertsWaiting() + familyWaiting() + (open?.world?.economy?.offers().length ?? 0) + (open?.world?.partners?.offers().length ?? 0) + emergencyWaiting() + (open?.world?.endOfLife?.offers().length ?? 0); // (Milestone 27: a comfort-first offer)
}
function inboxCountNow() {
  return inboxBase() + (open?.world?.events?.unread().length ?? 0); // (Milestone 28: the waiting choices plus every unread line — equipment, results, care stages… are lines now)
}

// The next-step hint line (data/menu.js NEXT_HINTS): the first that holds is shown; tapping it opens the right sheet.
function hintRules() {
  const W = () => open.world;
  const here = () => W().residents.filter((p) => !p.state.guest && !p.state.leaving);
  const onShift = (sh) => W().team.filter((q) => W().roster.shiftOf(q.id)?.id === sh).length;
  const emptyRoom = () => W().placed.some((p) => p.kind === 'room' && !W().byId(p.id)?.residentId);
  const stale = () => W().stalePlans();
  return [
    { id: 'emergency', text: NEXT_HINTS.emergency, when: () => emergencyWaiting() > 0, open: () => openInbox() },
    { id: 'admitFirst', text: NEXT_HINTS.admitFirst, when: () => here().length <= 1 && W().admissions.board.length > 0 && emptyRoom(), open: () => openAdmissions() },
    { id: 'afternoon', text: NEXT_HINTS.afternoon, when: () => onShift('afternoon') === 0, open: () => openRoster() },
    { id: 'night', text: NEXT_HINTS.night, when: () => onShift('night') === 0, open: () => openRoster() },
    { id: 'short', text: NEXT_HINTS.short, when: () => W().coverage.warnings().length > 0, open: () => openRoster() },
    { id: 'dining', text: NEXT_HINTS.dining, when: () => !placedOf('F03'), open: () => openBuildList() },
    { id: 'kitchen', text: NEXT_HINTS.kitchen, when: () => !placedOf('F04') && !placedOf('F16'), open: () => openBuildList() },
    { id: 'plan', text: () => NEXT_HINTS.plan(first(W().residentById(stale()[0]?.resident)?.name ?? 'A resident')), when: () => stale().length > 0, open: () => openHomeSheet(stale()[0].resident) },
    { id: 'accredit', text: () => NEXT_HINTS.accredit(W().quality.accreditations().find((a) => a.status === 'ready' && a.check.pass).def.name), when: () => !W().quality.applied() && W().quality.accreditations().some((a) => a.status === 'ready' && a.check.pass), open: () => openQuality('accreditation') }, // (Milestone 26)
    { id: 'item', text: () => NEXT_HINTS.item(W().items.count), when: () => W().items.count > 0, open: () => openItemStore() },
    { id: 'partner', text: NEXT_HINTS.partner, when: () => W().partners.offers().length > 0, open: () => openPartners() },
    { id: 'inbox', text: () => NEXT_HINTS.inbox(inboxCountNow()), when: () => inboxCountNow() > 0, open: () => openInbox() },
  ];
}

// Settings (data/settings.js): the series list in its order, Help / Privacy / Credits, then the CAREWORKS extras.
// Reachable from the main menu, the Menu sheet and Help (top bar).
function openSettings() {
  sheet.open(() => {
    const sections = [];
    let group = null;
    const optionRow = (d) => ({
      title: d.label,
      lines: d.line ? [{ text: d.line, color: COL.textMuted }] : [],
      columns: Math.min(d.options.length, 5),
      buttons: d.options.map((o) => {
        const on = settings.get(d.id) === o.id;
        return { id: `set_${d.id}_${o.id}`, label: `${on ? '✓ ' : ''}${o.label}`, accent: on ? COL.good : COL.progress, onTap: () => settings.set(d.id, o.id) };
      }),
    });
    const heading = (g) => g !== group && sections.push({ title: (group = g).toUpperCase(), lines: [] });
    for (const d of SETTINGS.filter((x) => !x.extra)) {
      heading(d.group);
      sections.push(optionRow(d));
    }
    heading(SETTINGS_TEXT.helpGroup);
    const ok = [{ id: 'ok', label: 'OK', accent: COL.progress }];
    sections.push({ columns: 1, buttons: [
      { id: 'setHelp', label: SETTINGS_TEXT.help, sub: SETTINGS_TEXT.helpLine, icon: 'care_ui_28', accent: COL.progress, onTap: () => openTopSheet('help') },
      { id: 'setLegal', label: SETTINGS_TEXT.legal, sub: SETTINGS_TEXT.legalLine, icon: 'care_ui_28', accent: COL.progress, onTap: () => dialog.show({ title: SETTINGS_TEXT.legal, body: SETTINGS_TEXT.legalBody, buttons: ok }) },
      { id: 'setCredits', label: SETTINGS_TEXT.credits, sub: SETTINGS_TEXT.creditsLine, icon: 'care_reward_05', accent: COL.progress, onTap: () => dialog.show({ title: SETTINGS_TEXT.credits, body: SETTINGS_TEXT.creditsBody, buttons: ok }) },
    ] });
    for (const d of SETTINGS.filter((x) => x.extra)) {
      heading(d.group);
      sections.push(optionRow(d));
    }
    sections.push({ columns: 1, buttons: [{ id: 'test', label: SETTINGS_TEXT.display, sub: SETTINGS_TEXT.displayLine, accent: COL.progress, onTap: () => router.go('test') }] }); // (the Milestone 0 display test)
    return { title: SETTINGS_TEXT.title, subtitle: SETTINGS_TEXT.subtitle, art: MENU_TEXT.icon, accent: COL.progress, sections };
  });
}

// Facility and room levels: the Upgrade section of a piece's sheet (style guide §3).
let upgradeMsg = null;
function upgradeSection(w, it, info) {
  const N = LEVELS.names;
  const lines = [{ text: `Level ${N[info.level - 1]} of ${N[info.max - 1]}${info.scaled ? ` · its bonus ×${info.mult}` : ''}`, color: COL.actionDark }];
  if (!info.scaled) lines.push({ text: 'Its effect is an unlock, or not yet in the game: the level is kept and will strengthen it then.', color: COL.textMuted });
  if (info.invested) lines.push({ text: `Spent on upgrades: ${credits(info.invested)} Credits (half comes back if it is sold)`, color: COL.textMuted });
  if (upgradeMsg) lines.push({ text: upgradeMsg, color: COL.bad });
  const nx = info.next;
  const buttons = nx
    ? [{ id: 'place:upgrade', label: info.pending ? `Upgrading to Level ${N[info.pending.to - 1]}…` : `Upgrade to Level ${N[nx.level - 1]}`, sub: info.block ?? `${credits(nx.cost)} Credits · ${nx.days} days · its bonus ×${info.nextMult}`, disabled: !!info.block, accent: COL.action, onTap: () => {
        const r = w.build.startLevel(it.uid);
        upgradeMsg = r.ok ? null : r.reason;
      } }]
    : [];
  return { title: 'Upgrade', lines, columns: 1, buttons };
}

// The care-equipment store (data/items.js): what the home has earned, each item's picture in its rarity frame. Tap one
// to give it (each staff member's exact gain shown) or sell it back.
const statName = (id) => STATS.find((x) => x.id === id)?.name ?? id;
const itemSub = (w, it) => {
  const t = w.items.typeOf(it);
  const r = ITEM_RARITIES[it.rarity];
  return `${r.name} · ${itemGroupById(t.group)?.name} · +${r.gain} ${statName(t.stat)}`;
};
let itemMsg = null;
function openItemStore() {
  sheet.open(() => {
    const w = open?.world;
    if (!w) return { title: ITEM_RULES.storeName, sections: [] };
    const list = w.items.list();
    const sections = [];
    if (itemMsg) sections.push({ lines: [{ text: itemMsg, color: COL.actionDark }] });
    sections.push({ lines: [`Each piece raises one staff member's stat for good — never past their tier's cap, and no more than ${ITEM_RULES.periodCap} item points each a season (3 months). Loved kinds give ×1.5.`, { text: 'Equipment only comes from play: care outcomes, great training, community partners and their events, families, well-wishers and grants. It is never bought.', color: COL.textMuted }] });
    if (list.length) sections.push({ title: `In the store (${list.length} of ${w.items.max})`, columns: 1, buttons: list.map((it) => ({ id: `item:${it.uid}`, label: w.items.typeOf(it).name, sub: itemSub(w, it), icon: itemIcon(it.type, it.rarity), accent: COL.progress, onTap: () => openItem(it.uid) })) });
    else sections.push({ title: 'In the store', lines: [{ text: 'Empty for now.', color: COL.textMuted }] });
    const arr = w.items.arrivals().slice(0, 5);
    if (arr.length) sections.push({ title: 'Recently', lines: arr.map((a) => ({ text: `${agoWord(w, a.day)}: ${a.text}`, color: COL.textMuted })) });
    return { title: ITEM_RULES.storeName, subtitle: `${list.length} of ${w.items.max} · given from here or from a staff card`, art: ITEM_RULES.storeIcon, accent: accentNow(), sections };
  });
}
// The people who could have this item, best gain first (loved kinds marked).
function giveRow(w, uid, q, after) {
  const pv = w.items.preview(uid, q.id);
  const like = pv.like === 'love' ? ' · loves this kind (×1.5, Morale +)' : pv.like === 'dislike' ? ' · not keen (×0.5)' : '';
  const cap = pv.capped === 'tier' ? ' · trimmed by their tier cap' : pv.capped === 'period' ? ' · trimmed by this season’s points' : '';
  return {
    pv,
    btn: { id: `give:${uid}:${q.id}`, label: q.name, sub: pv.ok ? `${statName(pv.stat)} +${pv.gain} (now ${pv.now})${like}${cap}` : pv.why, disabled: !pv.ok, icon: q.art, iconCrop: PORTRAIT_CROP, accent: pv.like === 'love' ? COL.good : COL.progress, onTap: () => {
      const r = w.items.give(uid, q.id);
      itemMsg = r.ok ? `${first(q.name)}: ${statName(r.stat)} +${r.gain}${r.like === 'love' ? ' — and a happy Morale lift' : ''}` : r.why;
      if (r.ok) autosave.request('item');
      after();
    } },
  };
}
const teamForItems = (w) => w.team.filter((q) => !w.roster.isAgency(q.id));
function openItem(uid) {
  sheet.open(() => {
    const w = open?.world;
    const it = w?.items.get(uid);
    if (!it) return { title: ITEM_RULES.storeName, subtitle: itemMsg ?? 'Given', accent: accentNow(), sections: [{ columns: 1, buttons: [{ id: 'back', label: '‹ Back to the store', accent: COL.progress, onTap: () => openItemStore() }] }] };
    const t = w.items.typeOf(it);
    const r = ITEM_RARITIES[it.rarity];
    const rows = teamForItems(w).map((q) => giveRow(w, uid, q, () => openItemStore())).sort((a, b) => (b.pv.ok - a.pv.ok) || (b.pv.gain ?? 0) - (a.pv.gain ?? 0));
    return {
      title: t.name,
      subtitle: itemSub(w, it),
      art: itemIcon(it.type, it.rarity),
      accent: accentNow(),
      sections: [
        { columns: 1, buttons: [{ id: 'back', label: '‹ Back to the store', accent: COL.progress, onTap: () => openItemStore() }] },
        { lines: [{ text: `From: ${(w.items.arrivals().find((a) => a.item?.type === it.type)?.text ?? 'play').split(':')[0]}`, color: COL.textMuted }] },
        { title: 'Give to', columns: 1, buttons: rows.map((x) => x.btn) },
        { columns: 1, buttons: [{ id: `sell:${uid}`, label: `Sell it back for ${r.sell} Credits`, sub: 'A spare: it leaves the store', accent: COL.bad, onTap: () => {
          const v = w.items.sell(uid);
          itemMsg = v != null ? `Sold: ${t.name} (+${v} Credits)` : null;
          autosave.request('item');
          openItemStore();
        } }] },
      ],
    };
  });
}
// From a staff card: every item in the store with this person's exact gain.
function openGiveTo(staffId) {
  sheet.open(() => {
    const w = open?.world;
    const q = w?.byId(staffId);
    if (!q) return { title: '', sections: [] };
    const rows = w.items.list().map((it) => {
      const g = giveRow(w, it.uid, q, () => openHomeSheet(staffId));
      return { pv: g.pv, btn: { ...g.btn, id: `give:${it.uid}`, label: w.items.typeOf(it).name, icon: itemIcon(it.type, it.rarity), iconCrop: null } };
    }).sort((a, b) => (b.pv.ok - a.pv.ok) || (b.pv.gain ?? 0) - (a.pv.gain ?? 0));
    return {
      title: `Give equipment to ${first(q.name)}`,
      subtitle: `${w.items.pointsLeft(staffId)} of ${ITEM_RULES.periodCap} item points left this season`,
      art: q.art,
      accent: accentNow(),
      sections: [
        { columns: 1, buttons: [{ id: 'back', label: `‹ Back to ${first(q.name)}`, accent: COL.progress, onTap: () => openHomeSheet(staffId) }] },
        ...(itemMsg ? [{ lines: [{ text: itemMsg, color: COL.actionDark }] }] : []),
        rows.length ? { title: 'From the store', columns: 1, buttons: rows.map((x) => x.btn) } : { lines: [{ text: 'The store is empty.', color: COL.textMuted }] },
      ],
    };
  });
}

// ---------------------------------------------------------------------------
// Boot screen: shows while the images and the saves load, then the Main Menu (or the test screen).
// Milestone 28b: the Banx Gamex studio logo on black first (as painted, never redrawn — the same as the other Works games),
// then the CAREWORKS key art (care_brand_02) with the loading bar. Both pictures load before everything else. A tap skips
// the rest once everything has loaded; the studio logo is never cut short of its fade.
const BOOT = { logoIn: 0.4, logoHold: 1.2, logoOut: 0.35, artMin: 1.1 };
const BOOT_LOGO_END = BOOT.logoIn + BOOT.logoHold + BOOT.logoOut;
let staffArtReport = null;
const bootScreen = {
  progress: 0,
  t: 0,
  ready: false,
  left: false,
  enter() {
    this.progress = 0;
    this.t = 0;
    this.ready = false;
    this.left = false;
    const first = Promise.all([assets.loadImage('studioLogo', ASSETS.studioLogo), assets.loadImage(BRAND.splash, ASSETS[BRAND.splash])]);
    Promise.all([
      first.then(() => assets.loadImages(ASSETS, (done, total) => (this.progress = done / total))).then((r) => {
        debug.log(`assets: ${r.loaded} loaded, ${r.missing.length} missing`);
        // Milestone 12: every staff member's portrait and every role badge loaded, no two staff sharing art (agency aside)
        if (debug.enabled) {
          staffArtReport = checkStaffArt((p) => assets.has(p.split('/').pop().replace('.png', '')), { agency: AGENCY });
          debug.log(staffArtReport.problems.length ? `staff art: ${staffArtReport.problems.join('; ')}` : `staff art: ${staffArtReport.checked.portraits} portraits, ${staffArtReport.checked.badges} badges mapped`);
        }
      }),
      prepareSaves().catch((err) => console.error('[CAREWORKS] saves unavailable', err)),
    ]).then(() => (this.ready = true));
  },
  leave() {
    if (this.left) return;
    this.left = true;
    const n = START_SCREEN === 'menu' ? homeToResume() : null;
    if (n) playSlot(n);
    else router.go(START_SCREEN);
  },
  update(dt) {
    this.t += dt;
    if (this.ready && this.t >= BOOT_LOGO_END + BOOT.artMin) this.leave();
  },
  onTap() {
    if (this.ready && this.t >= BOOT_LOGO_END) this.leave();
  },
  render(ctx) {
    const H = renderer.height;
    const t = this.t;
    if (t < BOOT_LOGO_END) {
      // the studio logo on black: fade in, hold, fade out
      ctx.fillStyle = '#000000';
      ctx.fillRect(-4000, -4000, W + 8000, H + 8000);
      const k = t < BOOT.logoIn ? t / BOOT.logoIn : t < BOOT.logoIn + BOOT.logoHold ? 1 : Math.max(0, 1 - (t - BOOT.logoIn - BOOT.logoHold) / BOOT.logoOut);
      const w = Math.min(W - 80, 1000);
      ctx.save();
      ctx.globalAlpha = k;
      if (assets.has('studioLogo')) assets.drawContained(ctx, 'studioLogo', { x: (W - w) / 2, y: H / 2 - w / 3 - 40, w, h: (w * 2) / 3 });
      ctx.restore();
      return;
    }
    // the key art, then the loading bar under it
    ctx.fillStyle = COL.bg;
    ctx.fillRect(-4000, -4000, W + 8000, H + 8000);
    const k = Math.min(1, (t - BOOT_LOGO_END) / 0.35);
    const size = Math.min(W - 40, H - 420, 1040);
    const r = { x: (W - size) / 2, y: Math.max(40, (H - size) / 2 - 110), w: size, h: size };
    ctx.save();
    ctx.globalAlpha = k;
    if (assets.has(BRAND.splash)) drawArtCrop(ctx, assets, BRAND.splash, ART_CROP[BRAND.splash], r);
    else {
      ctx.fillStyle = COL.text;
      ctx.font = font(THEME.size.major, true);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('CAREWORKS', W / 2, H / 2 - 60);
    }
    const by = Math.min(H - 120, r.y + r.h + 40);
    ctx.fillStyle = COL.track;
    ctx.fillRect(W / 2 - 300, by, 600, 24);
    ctx.fillStyle = COL.progress;
    ctx.fillRect(W / 2 - 300, by, 600 * this.progress, 24);
    ctx.restore();
  },
};

// The Milestone 0 placeholder sheet (test screen).
const testSheet = () => ({
  title: 'Test sheet',
  subtitle: 'Placeholder bottom sheet for Milestone 0.',
  art: 'm0Real',
  sections: [
    {
      lines: ['Close it with ✕, by tapping above it, with Close, or with the phone Back button.'],
      buttons: [
        { id: 'menu', label: 'Main Menu', onTap: () => router.go('menu') },
        { id: 'close', label: 'Close', accent: COL.progress, onTap: () => sheet.close() },
      ],
    },
  ],
});

router
  .register('boot', bootScreen)
  .register('menu', menuScreen)
  .register('slots', slotsScreen)
  .register('setup', setupScreen)
  .register('home', homeScreen)
  .register('test', createTestScreen({ renderer, layout, assets, openSheet: () => sheet.open(testSheet), onTapLogged: (p) => window.__cw?.taps.push({ x: p.x, y: p.y }) }));

// ?debug=1: a test hook for automated checks.
if (debug.enabled) {
  window.__cw = { openAchievements, openHomeRecords, openHallOfFame, get achievementsSaving() { return achievementsSaving; }, openSecrets, openSecretsDebug, get secretsSaving() { return secretsSaving; }, careFx, fxLog, fxOn, openCredits, openTopSheet, openPrograms, openProgram, openResidents, memoryBook, memorial, openMemoryBook, openMemoryPage, keepPages, get bookSaving() { return bookSaving; }, openQuality, openAccreditation, openComplaints, openScoreParts, openPeer, settings, governor, lowFx, haptics, hintLine, openNavMenu, MENU_OPEN, menuState, openSettings, openItemStore, openItem, openGiveTo, syncMenuSlot, bottomItems, inboxCountNow, renderer, layout, input, loop, router, assets, sheet, dialog, systemBack, textPrompt, menuScreen, slotsScreen, setupScreen, homeScreen, topBar, topBarCredits: () => balanceNow(), bottomBar, vfx, carePops, dayBeat, openBottom, get lastRoute() { return lastRoute; }, playSlot, startFacility, deleteSlot, newGame, taps: [], autosave, saveRun, openRecruit, openCandidate, openCourses, openContinuity, openHomeSheet, openActivities, openSlotPicker, openInbox, openSupplies, openLedger, openQuality, openBusiness, openPartners, openPartner, openGrants, openWings, openRoster, openMenu, openDishPicker, confirmLetGo, openDevelop, openResearch, openBuildList, openApplicant, confirmSell, upgradeStage, get bigBeat() { return bigBeat; }, startSpawnCheck, get spawning() { return !!spawn; }, spawnReport: null, get staffArtReport() { return staffArtReport; }, get campaigns() { return campaigns; }, get open() { return open; } };
}

router.go('boot');
loop.start();
