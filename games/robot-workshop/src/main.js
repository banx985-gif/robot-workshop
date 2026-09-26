// Robot Workshop — boot.
// Starts the shared engine, loads (or starts) the campaign and opens the workshop.
// Add ?screen=test to the address to open the Milestone 0 scaling/tap test screen instead.
import { THEME, font } from '../../../core/Theme.js';
import { EventBus } from '../../../core/EventBus.js';
import { Rng } from '../../../core/Rng.js';
import { Renderer } from '../../../core/Renderer.js';
import { UiLayout } from '../../../core/UiLayout.js';
import { Input } from '../../../core/Input.js';
import { ScreenRouter } from '../../../core/ScreenRouter.js';
import { AssetManager } from '../../../core/AssetManager.js';
import { FixedStepLoop } from '../../../core/FixedStepLoop.js';
import { DebugOverlay } from '../../../core/DebugOverlay.js';
import { SaveManager } from '../../../core/SaveManager.js';
import { createStorageAdapter } from '../../../core/StorageAdapter.js';
import { VfxSystem } from '../../../core/VfxSystem.js';
import { AudioManager } from '../../../core/AudioManager.js';
import { MajorFeedback } from '../../../core/MajorFeedback.js';
import { setPressPoint, clearPress } from '../../../core/ui/Button.js';
import { GuideSystem } from '../../../core/GuideSystem.js';
import { CoachMark } from '../../../core/ui/CoachMark.js';
import { GUIDE_STEPS, GUIDE_INTRO_STEPS, GUIDE_FACE, HELP_ICON } from '../data/guide.js';
import { createGuideTargets } from './ui/guideTargets.js';
import { createHelpScreen } from './screens/HelpScreen.js';
import { createWorkshopScreen } from './screens/WorkshopScreen.js';
import { createStaffRosterScreen } from './screens/StaffRosterScreen.js';
import { createRobotBuilderScreen } from './screens/RobotBuilderScreen.js';
import { createProjectDetailScreen } from './screens/ProjectDetailScreen.js';
import { createProjectResultScreen } from './screens/ProjectResultScreen.js';
import { createProductCatalogueScreen } from './screens/ProductCatalogueScreen.js';
import { createFinanceScreen } from './screens/FinanceScreen.js';
import { createClosureScreen } from './screens/ClosureScreen.js';
import { createComponentsScreen } from './screens/ComponentsScreen.js';
import { createContractsScreen } from './screens/ContractsScreen.js';
import { createBuildScreen } from './screens/BuildScreen.js';
import { createResearchScreen } from './screens/ResearchScreen.js';
import { createRecruitmentScreen } from './screens/RecruitmentScreen.js';
import { createTrainingScreen } from './screens/TrainingScreen.js';
import { createStaffDetailScreen } from './screens/StaffDetailScreen.js';
import { createStaffDebugScreen } from './screens/StaffDebugScreen.js';
import { createCompetitionListScreen } from './screens/CompetitionListScreen.js';
import { createCompetitionSetupScreen } from './screens/CompetitionSetupScreen.js';
import { createCompetitionWatchScreen } from './screens/CompetitionWatchScreen.js';
import { createCompetitionResultScreen } from './screens/CompetitionResultScreen.js';
import { createRankingsScreen } from './screens/RankingsScreen.js';
import { createTrophyScreen } from './screens/TrophyScreen.js';
import { createComboArchiveScreen } from './screens/ComboArchiveScreen.js';
import { createInboxScreen } from './screens/InboxScreen.js';
import { BottomSheet } from '../../../core/ui/BottomSheet.js';
import { createStationMenus } from './ui/stationMenus.js';
import { PROPS } from '../data/workshop.js';
import { createRumourArchiveScreen } from './screens/RumourArchiveScreen.js';
import { createSecretDebugScreen } from './screens/SecretDebugScreen.js';
import { SECRET_ART } from '../data/secrets.js';
import { createEventPopup } from './ui/EventPopup.js';
import { drawToasts } from '../../../core/ui/Toast.js';
import { FloatFeed } from '../../../core/FloatFeed.js';
import { createRecordsScreen } from './screens/RecordsScreen.js';
import { createAchievementMoment } from './ui/achievementMoment.js';
import { ACHIEVEMENT_ART, rewardLabel } from '../data/achievements.js';
import { wireMessages, effectsText, fillText } from './app/Messages.js';
import { EVENTS_BY_ID, EVENT_ICONS, MILESTONE_EVENTS } from '../data/events.js';
import { SPONSORS } from '../data/sponsors.js';
import { SYNERGIES_BY_ID, SYNERGY_ART } from '../data/synergies.js';
import { rewardText, lookOf } from './systems/Synergies.js';
import { COMPETITIONS, COMPETITION_ART, TROPHIES } from '../data/competitions.js';
import { RIVALS } from '../data/rivals.js';
import { TUTORIAL_HIRES } from '../data/recruitment.js';
import { RECRUIT_ART, PORTRAITS, PORTRAIT_FOLDER } from '../data/recruitment.js';
import { TRAINING_ART } from '../data/training.js';
import { RESEARCH_ART } from '../data/research.js';
import { FACILITIES, BUILD_ART } from '../data/facilities.js';
import { FIRST_CONTRACT_ART } from '../data/contracts.js';
import { SEGMENTS } from '../data/segments.js';
import { createDebugBuilderScreen } from './screens/DebugBuilderScreen.js';
import { validateGameData } from './app/validateData.js';
import { VISUAL_FAMILIES } from '../data/visuals.js';
import { moneyBarRect, topBarRect } from './ui/TopBar.js';
import { Campaign, SAVE_MIGRATIONS } from './app/Campaign.js';
import { COMPONENTS } from '../data/components.js';
import { STAFF, ROLES } from '../data/staff.js';
import { SAVE_VERSION } from '../data/balance.js';
import { ROOM_ART } from '../data/workshop.js';
import { VFX_ART, STATUS_ART, SOUNDS, FLOAT_COLORS } from '../data/feedback.js';
const COL = THEME.color;

const W = 1080;
const BASE_H = 1920; // 9:16; taller phones grow the height (see Renderer)
const MAX_H = 2640; // up to 9:22 fills edge to edge; taller still gets thin bars top and bottom

const art = (folder, key) => [key, `assets/images/${folder}/${key}.png`];
const ASSETS = {
  // Workshop room: floor, walls, the expansion boundary and the test-zone floor; facilities F01–F15; build icons.
  ...Object.fromEntries([ROOM_ART.floor.key, ROOM_ART.corner.key, ...Object.values(ROOM_ART.pieces).map((p) => p.key), BUILD_ART.boundary].map((k) => art('env', k))),
  ...Object.fromEntries(Object.values(FACILITIES).map((f) => art('facilities', f.art))),
  ...Object.fromEntries(Object.values(FACILITIES).filter((f) => f.floor).map((f) => art('env', f.floor))),
  ...Object.fromEntries([BUILD_ART.buildIcon, BUILD_ART.expansionIcon, BUILD_ART.lockIcon].map((k) => art('ui', k))),
  // Effects and status icons.
  ...Object.fromEntries(Object.values(VFX_ART).map((k) => art('vfx', k))),
  ...Object.fromEntries(Object.values(STATUS_ART).map((k) => art('status', k))),
  // Staff portraits: all 50 named staff (Milestone 11), plus every portrait candidates can use; role and tier badges.
  ...Object.fromEntries(STAFF.map((s) => [s.art, `assets/images/staff/${s.art}.png`])),
  ...Object.fromEntries(Object.values(PORTRAIT_FOLDER).flatMap((f) => Object.values(PORTRAITS).flat().map((n) => art('staff', `staff_${f}_${n}`)))),
  ...Object.fromEntries(Object.values(ROLES).map((r) => art('badges', r.badge))),
  ...Object.fromEntries(Object.values(RECRUIT_ART.tierBadges).map((k) => art('badges', k))),
  // Hiring and training icons.
  [RECRUIT_ART.icon]: `assets/images/ui/${RECRUIT_ART.icon}.png`,
  [TRAINING_ART.icon]: `assets/images/ui/${TRAINING_ART.icon}.png`,
  [TRAINING_ART.manual]: `assets/images/rewards/${TRAINING_ART.manual}.png`,
  // Robot project art: finished robots, part icons, menu icons.
  ...Object.fromEntries(VISUAL_FAMILIES.map((v) => art('robots', v.art))), // all 20 robot families
  ...Object.fromEntries(Object.values(COMPONENTS).map((c) => [c.art, `assets/images/components/${c.art}.png`])),
  ui_icon_11: 'assets/images/ui/ui_icon_11.png',
  ui_icon_06_robot: 'assets/images/ui/ui_icon_06_robot.png',
  // Money art.
  ui_icon_01_money: 'assets/images/ui/ui_icon_01_money.png',
  ui_icon_02_premium: 'assets/images/ui/ui_icon_02_premium.png',
  ui_icon_03_reputation: 'assets/images/ui/ui_icon_03_reputation.png',
  ui_icon_13: 'assets/images/ui/ui_icon_13.png',
  // Contracts: icon, customer portraits, the first-contract moment.
  ui_icon_14: 'assets/images/ui/ui_icon_14.png',
  // Milestone 17b: the workshop props, the save icon and the effects the build show uses.
  ...Object.fromEntries(PROPS.map((p) => art('props', p.art))),
  ...Object.fromEntries(['ui_icon_28', 'ui_icon_05_staff', 'ui_icon_13', 'ui_icon_12'].map((k) => art('ui', k))),
  ...Object.fromEntries(['vfx_01', 'vfx_02', 'vfx_03', 'vfx_04', 'vfx_09', 'vfx_11', 'vfx_12'].map((k) => art('vfx', k))),
  // First-time guide: help icon and the two event pictures.
  [HELP_ICON]: `assets/images/ui/${HELP_ICON}.png`,
  event_art_01: 'assets/images/events/event_art_01.png',
  event_art_02: 'assets/images/events/event_art_02.png',
  ...Object.fromEntries([...new Set(SEGMENTS.map((s) => s.customerArt))].map((k) => art('npc', k))),
  [FIRST_CONTRACT_ART]: `assets/images/events/${FIRST_CONTRACT_ART}.png`,
  ui_icon_29: 'assets/images/ui/ui_icon_29.png',
  reward_01: 'assets/images/rewards/reward_01.png',
  // Research (Milestone 9): icon and RP token (the glow and blueprint effects are in VFX art).
  [RESEARCH_ART.icon]: `assets/images/ui/${RESEARCH_ART.icon}.png`,
  [RESEARCH_ART.rp]: `assets/images/rewards/${RESEARCH_ART.rp}.png`,
  [RESEARCH_ART.glow]: `assets/images/vfx/${RESEARCH_ART.glow}.png`,
  // Competitions (Milestones 12–13): all 12 event backdrops, icons, win/loss/rank-up effects, the 6 trophies, the first-event
  // and World Championship art, rival logos and the five rival managers.
  ...Object.fromEntries(COMPETITIONS.map((c) => art('backdrops', c.art))),
  ...Object.fromEntries([art('ui', COMPETITION_ART.icon), art('vfx', COMPETITION_ART.winBurst), art('vfx', COMPETITION_ART.lossPuff), art('events', COMPETITION_ART.firstMoment)]),
  ...Object.fromEntries([art('ui', COMPETITION_ART.rankingsIcon), art('ui', COMPETITION_ART.trophiesIcon), art('vfx', COMPETITION_ART.rankUpBurst), art('events', COMPETITION_ART.worldMoment)]),
  ...Object.fromEntries(TROPHIES.map((t) => art('trophies', t.art))),
  ...Object.fromEntries(RIVALS.map((r) => art('logos', r.logo))),
  ...Object.fromEntries(RIVALS.filter((r) => r.manager).map((r) => art('npc', r.manager))),
  // Combos (Milestone 14): discovery glow, combos icon, the ??? marker (robots 11–20 are in the robot families above).
  ...Object.fromEntries([art('vfx', SYNERGY_ART.discover), art('vfx', SYNERGY_ART.blueprint), art('ui', SYNERGY_ART.icon), art('ui', SYNERGY_ART.secret)]),
  // Events, sponsors and the inbox (Milestone 15): the 8 milestone pictures, the event icons, the two sponsor reps
  // and the sponsors' icons.
  ...Object.fromEntries(MILESTONE_EVENTS.map((e) => art('events', e.art))),
  ...Object.fromEntries(Object.values(EVENT_ICONS).map((k) => art(k.startsWith('reward_') ? 'rewards' : 'ui', k))),
  ...Object.fromEntries(SPONSORS.map((s) => (s.art ? art('npc', s.art) : art('ui', s.icon)))),
  // Secrets (Milestone 16): the ??? marker, the discovery effect and the records icon.
  // Milestone 17: legendary aura, Prestige Token, secret badge (the 09/10 staff, prestige parts, F34/F35, robots 18–20,
  // event art 07/08 and the Nocturne logo come in with their own lists above).
  ...Object.fromEntries([art('ui', SECRET_ART.marker), art('vfx', SECRET_ART.discover), art('ui', SECRET_ART.records), art('vfx', SECRET_ART.aura), art('rewards', SECRET_ART.token), art('badges', SECRET_ART.badge)]),
  // Achievements and records (Milestone 18): records icon, trophies icon, reward badge, rank-up burst, reputation stars.
  ...Object.fromEntries([art('ui', ACHIEVEMENT_ART.records), art('ui', ACHIEVEMENT_ART.icon), art('rewards', ACHIEVEMENT_ART.badge), art('vfx', ACHIEVEMENT_ART.burst), art('vfx', ACHIEVEMENT_ART.stars)]),
  ...Object.fromEntries(['ui_icon_04_research', 'ui_icon_08_competition', 'ui_icon_10_secret', 'ui_icon_12'].map((k) => art('ui', k))),
  // Deliberately missing file: proves the placeholder fallback.
  placeholderTest: 'assets/m0-missing-test.png',
};
// ?screen=test: the Milestone 0 test screen. ?debug=1&screen=debugbuilder: open straight into the debug builder.
const SCREEN_PARAM = new URLSearchParams(window.location.search).get('screen');
const DEBUG_PARAM = new URLSearchParams(window.location.search).get('debug') === '1';
const START_SCREEN = SCREEN_PARAM === 'test' ? 'test' : SCREEN_PARAM === 'debugbuilder' && DEBUG_PARAM ? 'debugbuilder' : 'workshop';

const bus = new EventBus();
const rng = new Rng('robot-workshop-m0');
const renderer = new Renderer(document.getElementById('game'), { width: W, height: BASE_H, maxHeight: MAX_H, maxDpr: 2, bus });
let H = renderer.height; // live logical height
const layout = new UiLayout(renderer);
bus.on('renderer:resize', () => layout.refresh());
const input = new Input(renderer, bus);
const assets = new AssetManager({ bus });
const router = new ScreenRouter(bus);

// Game feel (Milestone 5): effects, sound hooks, and the "big moment" pause.
// Reduced Flashes: add ?flashes=reduced to the address (remembered on this device) until the settings screen exists.
const vfx = new VfxSystem({ assets, width: W, height: H, reducedFlashes: readFlashSetting() });
const audio = new AudioManager({ bus, sounds: SOUNDS });
const major = new MajorFeedback({ layout, width: W, height: H, pause: () => campaign.clock.pause() });
// Text events and reopened inbox messages (Milestone 15). Together with the big moments they form the router's
// modal: while either shows, it takes every tap. Only one of them is ever up (see presentNext below).
const eventPopup = createEventPopup({
  layout,
  assets,
  width: W,
  height: () => H,
  pause: () => {
    if (campaign.clock.paused) return false;
    campaign.clock.pause();
    return true;
  },
  resume: () => campaign.clock.resume(),
});
const modal = {
  get active() {
    return major.active || eventPopup.active;
  },
  onTap: (p) => (major.active ? major.onTap(p) : eventPopup.onTap(p)),
};
router.modal = modal;

// Sprites are cached at the screen's real pixel size: remake them when that changes.
assets.setPixelScale(renderer.pixelScale);
bus.on('renderer:resize', () => {
  H = renderer.height;
  assets.setPixelScale(renderer.pixelScale);
  vfx.height = H;
  major.height = H;
  debug.top = H - 690; // under the workshop room, whatever the height
});

// Pressed button look: any button under a finger that is down.
bus.on('input:down', (p) => setPressPoint(p, renderer.pixelScale));
bus.on('input:up', () => clearPress());
bus.on('input:dragstart', () => clearPress());
bus.on('input:tap', () => audio.play('tap'));

const loop = new FixedStepLoop({
  stepHz: 60,
  bus,
  update: (dt) => {
    if (campaignReady) {
      campaign.clock.update(dt);
      workshopScreen.tick(dt);
    }
    router.update(dt);
    vfx.update(dt); // real time: effects keep playing while the calendar is paused
    floats.update(dt, { hold: modal.active || !campaignReady || router.currentName !== 'workshop' });
    major.update(dt);
    eventPopup.update(dt);
    if (router.currentName === 'workshop') sheet.update(dt);
    coach.update(dt);
    if (campaignReady) {
      campaign.notes.update(dt, { hold: !toastPlace() }); // toasts fade in real time, only while they can show
      flushAchievements();
      if (presentPlace()) achMoment.update(dt);
      presentNext();
      guide.update();
    }
  },
  render: (alpha) => {
    const ctx = renderer.begin(COL.bg);
    router.render(ctx, alpha);
    if (router.currentName === 'workshop') sheet.render(ctx); // station menus (Milestone 17b)
    if (campaignReady && toastPlace()) drawToastStack(ctx);
    if (campaignReady && presentPlace()) achMoment.render(ctx);
    if (guide.active) {
      const step = guide.current;
      coach.render(ctx, step, guideTarget(step.target), { block: step.block, next: !!step.advance.next });
    }
    major.render(ctx);
    eventPopup.render(ctx);
    vfx.render(ctx, 'screen');
    debug.render(ctx);
  },
});
const debug = new DebugOverlay({ loop, renderer, layout, input, bus, top: H - 690, maxLines: 3 }); // under the room, clear of the top bar and project strip
bus.on('loop:pause', () => input.reset());
// The full debug box sits under the workshop room; on list screens it shrinks to one FPS line so it hides nothing.
bus.on('screen:change', ({ to }) => (debug.compact = !['workshop', 'test', 'boot'].includes(to)));

// Campaign: calendar + staff + save slot.
const campaign = new Campaign({ bus });
let campaignReady = false;
// Messages (Milestone 15): what happens in play becomes inbox entries, toasts and queued pop-ups. Wired before the
// handlers below, so a moment's entry exists by the time they run.
wireMessages({ bus, campaign, ready: () => campaignReady });
async function startCampaign() {
  const adapter = await createStorageAdapter({ dbName: 'robot-workshop', prefix: 'robot-workshop:' });
  campaign.saveManager = new SaveManager({ adapter, key: 'campaign', version: SAVE_VERSION, migrations: SAVE_MIGRATIONS, bus });
  campaign.accountManager = new SaveManager({ adapter, key: 'account', version: 1, bus }); // combo archive across runs
  const loaded = await campaign.loadOrNew();
  if (!loaded) await campaign.save().catch(() => {});
  debug.log(`campaign ${loaded ? 'loaded' : 'new'} (${adapter.kind})`);
  campaignReady = true;
  // Milestone 18: a run from before achievements catches up on everything it has already done.
  campaign.achievements.checkAll();
}

// ---------------------------------------------------------------------------
// Boot screen: shows while assets load, then hands over to the first real screen.
const bootScreen = {
  progress: 0,
  enter() {
    this.progress = 0;
    // Art first: the workshop sizes each worker from their picture when the campaign arrives.
    assets
      .loadImages(ASSETS, (done, total) => (this.progress = done / total))
      .then(startCampaign)
      .then(() => router.go(campaign.closed && START_SCREEN !== 'test' ? 'closed' : START_SCREEN))
      .catch((err) => {
        console.error('[boot] failed', err);
        debug.log(`boot failed: ${err.message}`);
      });
  },
  render(ctx) {
    ctx.fillStyle = COL.text;
    ctx.font = font(64, true);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Robot Workshop', W / 2, H / 2 - 60);
    ctx.fillStyle = COL.line;
    ctx.fillRect(W / 2 - 300, H / 2 + 20, 600, 24);
    ctx.fillStyle = COL.progress;
    ctx.fillRect(W / 2 - 300, H / 2 + 20, 600 * this.progress, 24);
  },
};

// ---------------------------------------------------------------------------
// Test screen: grid, corner markers, a circle (must stay round), safe-area frame,
// tap marker, drag trail, hold ring, a spinner that stops when paused, and a pause button.
const testScreen = {
  enter() {
    this.time = 0;
    this.angle = 0;
    this.tap = null; // last tap { x, y, age }
    this.hold = null;
    this.trail = [];
    this.swatches = Array.from({ length: 8 }, () => `hsl(${rng.int(0, 359)} 70% 55%)`);
  },

  pauseButton() {
    return layout.anchor('top-right', 240, 110, 80); // clear of the corner labels
  },

  update(dt) {
    this.time += dt;
    this.angle += dt * Math.PI; // half a turn per second
    if (this.tap) this.tap.age += dt;
    if (this.hold) this.hold.age += dt;
  },

  onTap(p) {
    const b = this.pauseButton();
    if (hit(p, b)) {
      loop.togglePause();
      return;
    }
    if (loop.paused) {
      loop.resume('tap');
      return;
    }
    this.tap = { x: p.x, y: p.y, age: 0 };
    window.__m0?.taps.push({ x: p.x, y: p.y });
  },

  onHold(p) {
    if (!loop.paused) this.hold = { x: p.x, y: p.y, age: 0 };
  },

  onDragStart(p) {
    this.trail = [{ x: p.startX, y: p.startY }, { x: p.x, y: p.y }];
  },

  onDrag(p) {
    this.trail.push({ x: p.x, y: p.y });
    if (this.trail.length > 200) this.trail.shift();
  },

  render(ctx) {
    drawGrid(ctx);
    drawFrame(ctx);

    // Round-ness check: this must look like a perfect circle on every screen shape.
    ctx.strokeStyle = COL.progress;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 300, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeRect(W / 2 - 300, H / 2 - 300, 600, 600);

    // Spinner driven by the fixed-step update: freezes while paused.
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(this.angle);
    ctx.fillStyle = COL.gold;
    ctx.fillRect(-12, -260, 24, 220);
    ctx.restore();

    ctx.fillStyle = COL.text;
    ctx.font = font(44, true);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Milestone 0 — test screen', W / 2, H / 2 - 420);
    ctx.font = font(30);
    ctx.fillStyle = COL.textMuted;
    ctx.fillText('Tap anywhere: the cross should sit exactly under your finger.', W / 2, H / 2 - 360);
    ctx.fillText(`sim time ${this.time.toFixed(2)}s`, W / 2, H / 2 + 360);

    // Placeholder fallback + seeded RNG swatches.
    const sr = layout.safeRect;
    assets.draw(ctx, 'placeholderTest', W / 2 - 160, sr.y + sr.h - 460, 320, 200);
    this.swatches.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(W / 2 - 320 + i * 80, sr.y + sr.h - 220, 64, 64);
    });
    ctx.fillStyle = COL.textMuted;
    ctx.font = font(24);
    ctx.fillText('seeded colours (same every reload)', W / 2, sr.y + sr.h - 124);

    // Drag trail
    if (this.trail.length > 1) {
      ctx.strokeStyle = 'rgba(124,255,178,0.8)';
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      this.trail.forEach((pt, i) => (i ? ctx.lineTo(pt.x, pt.y) : ctx.moveTo(pt.x, pt.y)));
      ctx.stroke();
    }

    // Hold ring
    if (this.hold && this.hold.age < 1.5) {
      ctx.strokeStyle = `rgba(255,79,216,${1 - this.hold.age / 1.5})`;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(this.hold.x, this.hold.y, 60 + this.hold.age * 80, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Tap marker: stays put, with the logical coordinates written next to it.
    if (this.tap) drawTapMarker(ctx, this.tap);

    drawPauseButton(ctx, this.pauseButton(), loop.paused);

    if (loop.paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = COL.text;
      ctx.font = font(96, true);
      ctx.textAlign = 'center';
      ctx.fillText('PAUSED', W / 2, H / 2);
      ctx.font = font(34);
      ctx.fillText('tap to resume', W / 2, H / 2 + 80);
    }
  },
};

function hit(p, r) {
  return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
}

function drawGrid(ctx) {
  ctx.lineWidth = 1;
  ctx.font = '18px ui-monospace, Consolas, monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  for (let x = 0; x <= W; x += 60) {
    ctx.strokeStyle = x % 120 === 0 ? COL.bgDeep : COL.bgDeep;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y <= H; y += 60) {
    ctx.strokeStyle = y % 120 === 0 ? COL.bgDeep : COL.bgDeep;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  ctx.fillStyle = '#3C4C5E';
  for (let x = 120; x < W; x += 240) ctx.fillText(String(x), x + 4, 4);
  for (let y = 120; y < H; y += 240) ctx.fillText(String(y), 4, y + 4);
}

// Red border on the logical edge + corner labels: if any are cut off, the canvas is clipping.
// Green dashed box = safe area (inside notch/home bar).
function drawFrame(ctx) {
  ctx.strokeStyle = COL.bad;
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, W - 8, H - 8);
  ctx.fillStyle = COL.bad;
  ctx.font = 'bold 26px ui-monospace, Consolas, monospace';
  const m = 16;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillText('0,0', m, m + 24);
  ctx.textAlign = 'right';
  ctx.fillText(`${W},0`, W - m, m + 24);
  ctx.textBaseline = 'bottom';
  ctx.fillText(`${W},${H}`, W - m, H - m);
  ctx.textAlign = 'left';
  ctx.fillText(`0,${H}`, m, H - m);

  const sr = layout.safeRect;
  if (sr.x > 0 || sr.y > 0 || sr.w < W || sr.h < H) {
    ctx.strokeStyle = COL.good;
    ctx.lineWidth = 4;
    ctx.setLineDash([16, 12]);
    ctx.strokeRect(sr.x + 2, sr.y + 2, sr.w - 4, sr.h - 4);
    ctx.setLineDash([]);
  }
}

function drawTapMarker(ctx, tap) {
  const { x, y } = tap;
  ctx.strokeStyle = COL.text;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - 50, y);
  ctx.lineTo(x + 50, y);
  ctx.moveTo(x, y - 50);
  ctx.lineTo(x, y + 50);
  ctx.stroke();
  ctx.strokeStyle = '#FF4FD8';
  ctx.beginPath();
  ctx.arc(x, y, 28, 0, Math.PI * 2);
  ctx.stroke();
  const pulse = Math.max(0, 1 - tap.age * 2);
  if (pulse > 0) {
    ctx.strokeStyle = `rgba(255,79,216,${pulse})`;
    ctx.beginPath();
    ctx.arc(x, y, 28 + (1 - pulse) * 60, 0, Math.PI * 2);
    ctx.stroke();
  }
  const label = `${x.toFixed(1)}, ${y.toFixed(1)}`;
  ctx.font = 'bold 30px ui-monospace, Consolas, monospace';
  ctx.textBaseline = 'middle';
  const right = x < W - 320;
  ctx.textAlign = right ? 'left' : 'right';
  const tx = right ? x + 60 : x - 60;
  const ty = y < 80 ? y + 60 : y - 60;
  const tw = ctx.measureText(label).width;
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(right ? tx - 8 : tx - tw - 8, ty - 22, tw + 16, 44);
  ctx.fillStyle = COL.text;
  ctx.fillText(label, tx, ty);
}

function drawPauseButton(ctx, b, paused) {
  ctx.fillStyle = paused ? COL.gold : COL.line;
  ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.strokeStyle = COL.progress;
  ctx.lineWidth = 4;
  ctx.strokeRect(b.x, b.y, b.w, b.h);
  ctx.fillStyle = paused ? COL.bg : COL.text;
  ctx.font = font(40, true);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(paused ? 'RESUME' : 'PAUSE', b.x + b.w / 2, b.y + b.h / 2);
}

// ---------------------------------------------------------------------------
window.addEventListener('keydown', (e) => {
  if (e.key !== 'p' && e.key !== 'P' && e.key !== ' ') return;
  if (modal.active) return;
  if (router.currentName === 'test') loop.togglePause();
  else if (campaignReady && !campaign.closed) campaign.clock.togglePause();
});

// Test hook for automated checks (debug builds only).
if (debug.enabled) {
  window.__m0 = { renderer, layout, input, loop, router, assets, taps: [] };
}

// "Project" button: the running project, or the builder if none is running.
const goProject = () => router.go(campaign.activeProject ? 'project' : 'builder');
// Shared by every top bar: art, floating "+cash" numbers, and the money-bar shortcuts.
const hud = {
  assets,
  vfx,
  goFinance: () => router.go('finance'),
  goProducts: () => router.go('products'),
  goContracts: () => router.go('contracts'),
  goHelp: () => router.go('help'),
  goHome: () => router.go('workshop'),
  goInbox: () => router.go('inbox'),
  floats: null, // the float feed (below)
};
// Station menus (Milestone 17b): tap a station, a worker or a bottom-bar button → a bottom sheet (core/ui/BottomSheet).
const sheet = new BottomSheet({ layout, assets, onClose: () => workshopScreen.selection.clear() });
const menuHolder = { reg: null, for: (kind, target) => menuHolder.reg?.for(kind, target) ?? null };
// Floating numbers (Milestone 18 fix): one after another, at most three at once, each from the thing that earned it.
// They only float on the workshop view (other screens have text where they would go; the money is in the ledger
// anyway): elsewhere they wait a moment, then are dropped. With no source they rise from just under the top bar.
const floats = new FloatFeed({
  vfx,
  where: (source, lane) => (sheet.active ? null : workshopScreen.floatPoint(source, lane)),
  fallback: (lane) => {
    const t = topBarRect(layout);
    return { x: W / 2, y: t.y + t.h + 110 + lane * 58 };
  },
});
hud.floats = floats;
const workshopScreen = createWorkshopScreen({ renderer, layout, assets, bus, debug, campaign, router, goProject, hud, sheet, menus: menuHolder });
menuHolder.reg = createStationMenus({ campaign, router, workshop: workshopScreen, sheet });
// Every screen change closes the sheet and tells the guide which screen opened ('screen:builder', …).
bus.on('screen:change', ({ to }) => {
  if (to !== 'workshop') sheet.close();
  bus.emit(`screen:${to}`, {});
});
bus.on('renderer:resize', () => workshopScreen.resize());
const rosterScreen = createStaffRosterScreen({ renderer, layout, assets, bus, debug, campaign, router, workshop: workshopScreen, goProject, hud });
const builderScreen = createRobotBuilderScreen({ renderer, layout, assets, campaign, router, debugEnabled: debug.enabled });
const projectScreen = createProjectDetailScreen({ renderer, layout, assets, campaign, router, hud });
const resultScreen = createProjectResultScreen({ renderer, layout, assets, campaign, router });
const productsScreen = createProductCatalogueScreen({ renderer, layout, assets, campaign, router, goProject, hud });
const financeScreen = createFinanceScreen({ renderer, layout, assets, campaign, router, goProject, hud });
const closedScreen = createClosureScreen({ renderer, layout, assets, campaign, router });
const componentsScreen = createComponentsScreen({ renderer, layout, assets, campaign, router });

// --- First-time guide (Milestone 7b) -----------------------------------------------------
// Steps are data (data/guide.js); the engine (core/GuideSystem.js) shows one at a time when it makes sense,
// pauses the game while it waits, and its progress travels in the save. ?guide=reset replays it.
const GUIDE_RESET = new URLSearchParams(window.location.search).get('guide') === 'reset';
const guideTarget = createGuideTargets({ router, campaign, sheet });
const guide = new GuideSystem({
  steps: GUIDE_STEPS,
  bus,
  targetRect: guideTarget,
  screen: () => router.currentName,
  // A pop-up waiting on the workshop goes first; the guide steps back until it has been read.
  canShow: () => campaignReady && !modal.active && !(campaign.notes.pending && presentPlace()) && !campaign.closed && !buildScreen?.confirm && !['boot', 'test', 'debugbuilder', 'help', 'components', 'staffdebug', 'secretdebug'].includes(router.currentName),
  pause: () => {
    if (campaign.clock.paused) return false;
    campaign.clock.pause();
    return true;
  },
  resume: () => campaign.clock.resume(),
});
const coach = new CoachMark({ layout, assets, face: GUIDE_FACE });
router.layers.push({ get active() { return guide.active; }, handleInput: (hook, p) => guide.handleInput(hook, p, hook === 'onTap' ? coach.hit(p) : null) });
// "Achievement unlocked!" (Milestone 18): a small card above the bottom bar; a tap on it opens Records.
const achMoment = createAchievementMoment({ assets, layout, bottomBar: workshopScreen.bottomBar, vfx, onOpen: () => router.go('records', { back: 'workshop' }) });
router.layers.push({ get active() { return achMoment.active && presentPlace(); }, handleInput: (hook, p) => achMoment.handleInput(hook, p) });
// The open menu sheet takes its taps and drags before the workshop does (the guide still comes first).
router.layers.push({ get active() { return sheet.active && router.currentName === 'workshop'; }, handleInput: (hook, p) => sheet.handleInput(hook, p) });
bus.on('guide:change', () => (campaign.guideState = guide.serialize()));
bus.on('guide:done', ({ step }) => {
  if (step.id === 'S2') sheet.close(); // "Got it" also closes Mina's card
  campaign.save().catch(() => {});
});
bus.on('campaign:ready', () => {
  const saved = campaign.guideState;
  if (GUIDE_RESET || saved === undefined) guide.reset(); // new run (or replay for testing): from step 1
  else if (saved === null) {
    // A run started before the guide existed: skip the intro steps it has clearly done already.
    guide.reset();
    if (campaign.history.count || campaign.projects.jobs.length) guide.state.done.push(...GUIDE_INTRO_STEPS);
  } else guide.load(saved);
  // Research arrived in Milestone 9: an older run that has been back-paid RP counts as having earned it.
  if (campaign.research.rpEarned > 0 && !guide.state.events.includes('research:rp')) guide.state.events.push('research:rp');
  campaign.guideState = guide.serialize();
});
// The Research Desk card is far down the Build catalogue: bring it into view for its guide step.
bus.on('screen:change', ({ to }) => to === 'build' && guide.current?.id === 'S21' && buildScreen.scrollToCard('F11'));
const helpScreen = createHelpScreen({ renderer, layout, assets, router, guide });
const contractsScreen = createContractsScreen({ renderer, layout, assets, campaign, router, goProject, hud });
const buildScreen = createBuildScreen({ renderer, layout, assets, campaign, router, workshop: workshopScreen, hud });
const recruitScreen = createRecruitmentScreen({ renderer, layout, assets, bus, campaign, router });
const trainingScreen = createTrainingScreen({ renderer, layout, assets, bus, campaign, router });
const staffDetailScreen = createStaffDetailScreen({ renderer, layout, assets, bus, campaign, router, workshop: workshopScreen });
const staffDebugScreen = createStaffDebugScreen({ renderer, layout, assets, campaign, router });
const researchScreen = createResearchScreen({ renderer, layout, assets, bus, campaign, router, debugEnabled: debug.enabled });
// A throwaway run with the three starters on its own bus: the debug builder builds robots in it.
const makeSandbox = () => {
  const c = new Campaign({ bus: new EventBus() });
  c.newGame();
  return c;
};
const debugBuilderScreen = createDebugBuilderScreen({ renderer, layout, assets, campaign, router, makeSandbox });
// Competitions (Milestone 12). The watch view holds still while a guide step is showing.
const competitionsScreen = createCompetitionListScreen({ renderer, layout, assets, campaign, router, goProject, hud, debugEnabled: debug.enabled });
const rankingsScreen = createRankingsScreen({ renderer, layout, assets, campaign, router });
const trophyScreen = createTrophyScreen({ renderer, layout, assets, campaign, router });
const comboArchiveScreen = createComboArchiveScreen({ renderer, layout, assets, campaign, router });
const rumourScreen = createRumourArchiveScreen({ renderer, layout, assets, campaign, router, debugEnabled: debug.enabled });
const secretDebugScreen = createSecretDebugScreen({ renderer, layout, campaign, router });
bus.on('secret:unlocked', ({ rule, eased, actions }) => debug.log(`secret ${rule.id}${eased ? ' (eased)' : ''}: ${actions.map((a) => a.type).join(', ')}`));
bus.on('secret:clue', ({ rule, stage }) => debug.log(`clue ${rule.id} → stage ${stage}`));
const recordsScreen = createRecordsScreen({ renderer, layout, assets, campaign, router });
// Achievements unlocked in the same moment become one pop-up in the queue (three or more: one summary card).
const pendingAch = [];
bus.on('achievement:unlocked', (res) => {
  pendingAch.push(res);
  debug.log(`achievement ${res.def.id} ${res.def.name}${res.paidNow ? ' (paid)' : ''}`);
});
function flushAchievements() {
  if (!pendingAch.length) return;
  const list = pendingAch.splice(0);
  const day = campaign.clock.totalDays;
  const one = (d) => ({ kind: 'achievement', level: 'medium', popup: true, day, icon: ACHIEVEMENT_ART.badge, title: 'Achievement unlocked!', body: rewardLabel(d.reward), data: { id: d.id, name: d.name } });
  if (list.length <= 2) for (const r of list) campaign.notes.post(one(r.def));
  else {
    const e = one(list[0].def);
    campaign.notes.post({ ...e, title: `${list.length} achievements unlocked!`, body: list.map((r) => r.def.name).join(', '), data: { ids: list.map((r) => r.def.id), name: 'See them all in Records' } });
  }
  campaign.save().catch(() => {});
}
const inboxScreen = createInboxScreen({ renderer, layout, assets, campaign, router, goProject, hud, openEntry });
bus.on('event:fired', ({ instance, def }) => debug.log(`event ${def.id} (${def.kind}) day ${instance.day}`));
bus.on('sponsor:signed', ({ def }) => debug.log(`sponsor signed: ${def.name}`));
bus.on('sponsor:ended', ({ def, record }) => debug.log(`sponsor ended: ${def.name} (${record.result})`));
bus.on('notify:fold', ({ entry }) => debug.log(`folded into inbox: ${entry.title}`));
const compSetupScreen = createCompetitionSetupScreen({ renderer, layout, assets, bus, campaign, router });
const compWatchScreen = createCompetitionWatchScreen({ renderer, layout, assets, campaign, router, vfx, held: () => guide.active || major.active });
const compResultScreen = createCompetitionResultScreen({ renderer, layout, assets, campaign, router, vfx });
// An event invites the company. The first one (the Local Trial, §26: Kai West on the Roster) and the World
// Championship are illustrated milestone events; the rest arrive as a toast (all queued by src/app/Messages.js).
bus.on('competition:invite', ({ event }) => {
  debug.log(`competition open: ${event.id} ${event.name}`);
  if (!campaignReady) return;
  audio.play('levelUp');
  campaign.save().catch(() => {});
});
// The guide's "hire Kai" steps end when Kai joins (the Tessa steps already used staff:hired).
bus.on('staff:hired', ({ staff }) => staff.id === TUTORIAL_HIRES.kai.staffId && bus.emit('guide:pilotReady', {}));
bus.on('trophy:awarded', ({ trophy }) => debug.log(`trophy: ${trophy.name}`));
bus.on('competition:result', ({ result }) => debug.log(`${result.eventId}: ${result.won ? 'WON' : result.player.dnf ? 'DNF' : `place ${result.place}`} · ${result.player.final} · seed ${result.seed}`));

bus.on('economy:closure', () => router.go('closed'));
bus.on('product:sales', ({ product, sale }) => debug.log(`${product.name}: ${sale.units} sold, +${sale.revenue}`));

// A finished robot (major feedback, bible §33.4): the game pauses, the Helper pops onto the pedestal
// with the completion flash, and nothing moves on until the player taps. Then the result screen.
// The "Robot finished!" card and any "New combo discovered!" cards are queued pop-ups (src/app/Messages.js).
bus.on('project:complete', ({ record }) => {
  const wasRunning = !campaign.clock.paused;
  campaign.clock.pause();
  if (router.currentName !== 'workshop') router.go('workshop');
  workshopScreen.celebrate(record);
  audio.play('robotDone');
  const e = campaign.notes.inbox.find((x) => x.kind === 'robotDone' && x.data?.number === record.number);
  if (e) e.data.resume = wasRunning; // the result screen restarts the clock if it was running
  campaign.save().catch(() => {});
});

// --- Pop-ups (Milestone 15) -----------------------------------------------------------------------
// Everything that pops up waits in one queue (campaign.notes, saved with the run) and shows one at a time, only on
// the workshop view and only when nothing else is open there — never over another pop-up, a guide step or a screen.
const presentPlace = () => campaignReady && !campaign.closed && router.currentName === 'workshop' && !sheet.active; // never over an open menu
function presentNext() {
  if (modal.active || !presentPlace() || guide.active || achMoment.active) return;
  const e = campaign.notes.take();
  if (e) present(e);
}

const LEVEL_ACCENT = { minor: COL.progress, medium: COL.gold, major: COL.gold };
const goArgs = { contracts: { tab: 'offered' }, competitions: { eventId: 'C09' }, recruit: { focusSpecial: true } };

function present(e) {
  debug.log(`pop-up: ${e.kind} "${e.title}"`);
  switch (e.kind) {
    case 'event':
      return showEvent(e);
    case 'milestone': {
      const def = EVENTS_BY_ID[e.data?.id];
      audio.play('levelUp');
      return major.show({
        title: e.title,
        subtitle: e.body,
        accent: COL.gold,
        drawFn: (ctx, t) => {
          const s = Math.min(1, t / 0.4);
          ctx.save();
          ctx.globalAlpha = s;
          assets.drawContained(ctx, e.art, { x: W / 2 - 380, y: H / 2 - 520 + (1 - s) * 60, w: 760, h: 760 });
          ctx.restore();
        },
        onAck: def?.goto ? () => router.go(def.goto, goArgs[def.goto] ?? {}) : null,
      });
    }
    case 'robotDone':
      return major.show({ title: e.title, subtitle: e.body, accent: COL.good, onAck: () => router.go('result', { number: e.data.number, resumeOnExit: !!e.data.resume }) });
    case 'combo':
      return showComboDiscovered(e.data);
    case 'secret':
      return showSecretDiscovered(e);
    case 'achievement':
      audio.play('levelUp');
      return achMoment.show(e);
    case 'rankUp':
      audio.play('levelUp');
      return major.show({ title: e.title, subtitle: e.body, accent: COL.gold });
    case 'researchMilestone':
      return major.show({ title: e.title, subtitle: e.body, accent: COL.progress });
    case 'sponsorEnded':
      return eventPopup.show({
        title: e.title,
        body: e.body,
        icon: e.icon,
        accent: e.data?.result === 'met' ? COL.good : COL.gold,
        choices: e.data?.renewal ? [{ label: 'See the renewal (Finance)' }, { label: 'Later' }] : [],
        onChoose: (i) => i === 0 && e.data?.renewal && router.go('finance'),
      });
    default:
      return showMessage(e);
  }
}

// A text event: its question and choices (each with what it will do), or — once answered — what happened.
function showEvent(e) {
  const inst = campaign.events.instance(e.data?.uid);
  const def = EVENTS_BY_ID[e.data?.id];
  if (!inst || !def || inst.status !== 'open') return showMessage(e);
  eventPopup.show({
    title: e.title,
    body: fillText(def.text, inst.params),
    icon: e.icon,
    accent: COL.gold,
    choices: def.choices.map((c, i) => ({ label: c.label, sub: effectsText(inst.choices[i] ?? [], { staffName: inst.params.staff ?? '' }) || 'Nothing changes' })),
    onChoose: (i) => {
      campaign.answerEvent(inst.uid, i);
      campaign.notes.queue = campaign.notes.queue.filter((id) => id !== e.id); // answered from the inbox: no pop-up later
      debug.log(`event ${def.id}: ${def.choices[i]?.id}`);
      if (def.choices[i]?.goto) router.go(def.choices[i].goto);
    },
  });
}

// Any message, reopened (the inbox) or shown as is: its picture or icon, its words, OK.
function showMessage(e) {
  eventPopup.show({ title: e.title, body: e.body, icon: e.art ? null : e.icon, art: e.art, accent: LEVEL_ACCENT[e.level], choices: [], okLabel: 'OK' });
}

// The inbox reopens a message. A waiting question can be answered from there; it then leaves the pop-up queue.
function openEntry(e) {
  if (modal.active) return;
  campaign.notes.queue = campaign.notes.queue.filter((id) => id !== e.id);
  if (e.kind === 'event') showEvent(e);
  else if (e.kind === 'combo') showComboDiscovered(e.data);
  else showMessage(e);
}

// Toasts: on the workshop view, just above the bottom bar — never over another screen's content or a
// pop-up (they wait, and every one is in the inbox anyway).
const toastPlace = () => presentPlace() && !modal.active && !achMoment.active;
function drawToastStack(ctx) {
  const toasts = campaign.notes.toasts;
  if (!toasts.length) return;
  const sr = layout.safeRect;
  // Milestone 18 fix: one at a time, just above the bottom bar (over the floor, not the machines).
  drawToasts(ctx, toasts, {
    anchor: 'bottom',
    x: sr.x + 48,
    y: workshopScreen.bottomBar.rect().y - 24,
    w: sr.w - 96,
    life: campaign.notes.toastSec,
    accent: (e) => (e.icon === EVENT_ICONS.warning ? COL.bad : LEVEL_ACCENT[e.level]),
    drawIcon: (c, e, r) => (e.art ?? e.icon) && assets.drawContained(c, e.art ?? e.icon, r),
  });
}

// "Secret discovered!" (Milestone 16): the secret-discovery effect behind the ??? marker. Tap → the Rumour Archive.
function showSecretDiscovered(e) {
  audio.play('levelUp');
  major.show({
    title: e.title,
    subtitle: e.body,
    accent: COL.purple,
    drawFn: (ctx, t) => {
      const s = Math.min(1, t / 0.35);
      const cx = W / 2;
      const cy = H / 2 - 260;
      ctx.save();
      ctx.globalAlpha = s * (vfx.reducedFlashes ? 0.5 : 0.9);
      const g = 640 + (vfx.reducedFlashes ? 0 : Math.sin(t * 3) * 30);
      assets.drawContained(ctx, SECRET_ART.discover, { x: cx - g / 2, y: cy - g / 2, w: g, h: g });
      ctx.globalAlpha = s;
      assets.drawContained(ctx, SECRET_ART.marker, { x: cx - 160, y: cy - 160 + (1 - s) * 50, w: 320, h: 320 });
      ctx.restore();
    },
    onAck: () => router.go('rumours', { back: 'workshop' }),
  });
}

// "New combo discovered!": the rare-unlock glow behind the combo's look (or the combos icon), a blueprint pop.
function showComboDiscovered({ id, firstEver }) {
  const rule = SYNERGIES_BY_ID[id];
  if (!rule) return;
  const look = lookOf(id);
  debug.log(`combo discovered: ${id} ${rule.name}${firstEver ? ' (first ever)' : ''}`);
  major.show({
    title: 'New combo discovered!',
    subtitle: `${rule.name} — ${rewardText(rule, 0) || 'a special build'}. See the Combo Archive.`,
    accent: COL.gold,
    onShow: () => audio.play('levelUp'),
    drawFn: (ctx, t) => {
      const s = Math.min(1, t / 0.35);
      const cx = W / 2;
      const cy = H / 2 - 260;
      ctx.save();
      ctx.globalAlpha = s * (vfx.reducedFlashes ? 0.5 : 0.85);
      const g = 620 + (vfx.reducedFlashes ? 0 : Math.sin(t * 3) * 30);
      assets.drawContained(ctx, SYNERGY_ART.discover, { x: cx - g / 2, y: cy - g / 2, w: g, h: g });
      if (t < 0.9) {
        ctx.globalAlpha = 1 - t / 0.9;
        assets.drawContained(ctx, SYNERGY_ART.blueprint, { x: cx - 320, y: cy - 320, w: 640, h: 640 });
      }
      ctx.globalAlpha = s;
      const size = look ? 520 : 300;
      assets.drawContained(ctx, look ? look.art : SYNERGY_ART.icon, { x: cx - size / 2, y: cy - size / 2 + (1 - s) * 50, w: size, h: size });
      ctx.restore();
    },
  });
}

// Small and medium feedback: sounds, and money / reputation numbers floating off the top bar.
bus.on('project:phase', () => audio.play('phaseDone'));
bus.on('staff:levelup', () => audio.play('levelUp'));
// Numbers go through the float feed (Milestone 18): the same kind from the same source adds up while it waits.
// source: where it was earned — a station ({ facility }) — or null (then it floats from under the top bar).
const plus = (unit) => (n) => `+${Math.round(n).toLocaleString('en-US')}${unit}`;
function floatNumber(key, amount, unit, color, icon, source = null) {
  floats.push({ key, amount, label: plus(unit), color, icon, source });
}
// The station that earned a number, from its ledger / reputation / RP reason.
const firstStation = (...ids) => ids.find((id) => campaign.facilities.has(id)) ?? null;
function sourceFor(reason = '') {
  const r = String(reason);
  let id = null;
  if (/^(Sales|Launch|On display)|sales$/.test(r)) id = firstStation('F31', 'F15', 'F09');
  else if (/^Contract/.test(r)) id = firstStation('F13', 'F05');
  else if (/^(Competition|Prize)/.test(r)) id = firstStation('F08', 'F35');
  else if (/^(Robot finished|First use|Combo)/.test(r)) id = firstStation('F05', 'F01');
  else if (/research/i.test(r)) id = firstStation('F11', 'F33');
  return id ? { facility: id } : null;
}
bus.on('product:sales', ({ sale }) => {
  const m = moneyBarRect(layout);
  vfx.sprite('screen', VFX_ART.cashBurst, m.x + 42, m.y + m.h / 2, { size: 130, life: 1.0, from: 0.4, to: 1, hold: 0.15 });
  floatNumber('credits', sale.revenue, '', FLOAT_COLORS.credits, 'ui_icon_01_money', sourceFor('Sales'));
  audio.play('sale');
});
bus.on('economy:change', (line) => {
  if (line.currency === 'techChips' && line.amount > 0 && line.category !== 'start') floatNumber('techChips', line.amount, ' Tech Chips', FLOAT_COLORS.techChips, 'ui_icon_02_premium', sourceFor(line.reason));
});
// Contracts: pay-out floats up; a failure floats red. The very first offer gets a "first customer" moment.
bus.on('contract:success', ({ contract }) => {
  floatNumber('credits', contract.result?.paid ?? contract.payout, '', FLOAT_COLORS.credits, 'ui_icon_01_money', sourceFor('Contract'));
  audio.play('sale');
});
// A failed contract is a toast and an inbox message; the first contract offer is an illustrated milestone event
// (both from src/app/Messages.js).
bus.on('reputation:change', ({ amount, quiet, reason }) => {
  if (amount > 0 && !quiet) floatNumber('rep', amount, ' Rep', FLOAT_COLORS.reputation, 'ui_icon_03_reputation', sourceFor(reason));
});
// A new Company Rank (§8.3) is a big moment (a queued pop-up): what it opens, then carry on.
bus.on('reputation:rankUp', () => campaignReady && campaign.save().catch(() => {}));
// Money for building shows in the ledger; a sale floats its refund.
// Research (Milestone 9): RP float up in cyan; a finished topic is a medium moment (sound + note in the workshop);
// the first RP ever and a business milestone get a short message.
bus.on('research:rp', ({ amount, first, reason }) => {
  if (amount <= 0 || !campaignReady) return;
  floatNumber('rp', amount, ' RP', FLOAT_COLORS.research, RESEARCH_ART.rp, sourceFor(reason));
  if (first) debug.log('first Research Points earned');
});
// (A finished topic is a toast; a research milestone a queued pop-up — src/app/Messages.js.)
bus.on('research:complete', ({ node, fired }) => {
  audio.play('phaseDone');
  campaign.save().catch(() => {});
  debug.log(`research ${node.id} done: ${fired.map((a) => a.type + ' ' + a.id).join(', ')}`);
});
// Hiring and training (Milestone 10): a new face walks in; a finished course floats its gains over the worker.
bus.on('staff:hired', ({ staff, debug: spawned }) => {
  audio.play('levelUp');
  debug.log(`${spawned ? 'debug-spawned' : 'hired'} ${staff.name} (${staff.id})`);
});
bus.on('training:complete', ({ staff, course, gains }) => {
  const txt = Object.entries(gains).map(([k, v]) => `${k.toUpperCase()} +${v}`).join(' ');
  debug.log(`${staff.name} finished ${course.name}: ${txt || 'no gain (cap)'}`);
  campaign.save().catch(() => {});
  workshopScreen.celebrateTraining(staff, txt || 'At the tier cap');
});
bus.on('facility:sold', ({ refund }) => floatNumber('credits', refund, '', FLOAT_COLORS.credits, 'ui_icon_01_money'));
bus.on('project:phase', ({ job, phase }) => debug.log(`${job.name}: ${phase.name} done`));
bus.on('robot:fault', ({ job }) => debug.log(`${job.name}: fault (${job.data.faults.length} open)`));
bus.on('robot:breakthroughRoll', ({ job, phase, hit }) => debug.log(`${job.name}: ${phase.name} 60% check → ${hit ? 'BREAKTHROUGH' : 'none'}`));
if (debug.enabled) {
  window.__m1 = { ...window.__m0, workshop: workshopScreen };
  window.__m2 = { ...window.__m1, campaign, roster: rosterScreen, Campaign, EventBus };
  window.__m3 = { ...window.__m2, builder: builderScreen, project: projectScreen, result: resultScreen };
  window.__m4 = { ...window.__m3, products: productsScreen, finance: financeScreen, closed: closedScreen, hud };
  window.__m5 = { ...window.__m4, vfx, audio, major };
  window.__m6 = { ...window.__m5, components: componentsScreen, debugBuilder: debugBuilderScreen, makeSandbox, validation: null };
  // §41.5: check all content at start (debug builds only). Results go to the debug box and the console.
  validateGameData({ manifest: ASSETS, placeholders: ['placeholderTest'] }).then((report) => {
    window.__m6.validation = report;
    debug.log(`data check: ${report.errors.length} errors, ${report.warnings.length} warnings, ${report.counts.art} images`);
    if (report.errors.length) console.error('[data check]', report.errors);
    else console.info('[data check] OK', report.counts, report.warnings);
  });
  // Debug: F toggles Reduced Flashes; sound hooks show in the log.
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'f' && e.key !== 'F') return;
    vfx.reducedFlashes = !vfx.reducedFlashes;
    debug.log(`Reduced Flashes ${vfx.reducedFlashes ? 'on' : 'off'}`);
  });
  bus.on('audio:play', ({ name, silent }) => name !== 'tap' && debug.log(`sound: ${name}${silent ? ' (placeholder)' : ''}`));
  bus.on('contract:offered', ({ contract }) => debug.log(`offer: ${contract.title}`));
  bus.on('market:month', ({ started }) => started && debug.log(`trend: ${Object.entries(started.shifts).map(([k, v]) => k + (v > 0 ? ' +' : ' ') + v).join(', ')} for ${started.months} mo`));
  window.__m7 = { ...window.__m6, contracts: contractsScreen, SEGMENTS };
  window.__m7b = { ...window.__m7, guide, coach, guideTarget, help: helpScreen };
  window.__m8 = { ...window.__m7b, build: buildScreen, facilities: campaign.facilities, FACILITIES };
  window.__m9 = { ...window.__m8, research: researchScreen, researchSystem: campaign.research, unlocks: campaign.unlocks };
  window.__m10 = { ...window.__m9, recruit: recruitScreen, training: trainingScreen, recruitment: campaign.recruitment, trainingSystem: campaign.training, roster: rosterScreen };
  window.__m11 = { ...window.__m10, staffDetail: staffDetailScreen, staffDebug: staffDebugScreen, careers: campaign.careers, STAFF };
  window.__m12 = { ...window.__m11, competitions: competitionsScreen, compSetup: compSetupScreen, compWatch: compWatchScreen, compResult: compResultScreen, competitionSystem: campaign.competitions };
  window.__m13 = { ...window.__m12, rankings: rankingsScreen, trophiesScreen: trophyScreen, rankingSystem: campaign.rankings, trophyCase: campaign.trophies, rivalSystem: campaign.rivals };
  window.__m14 = { ...window.__m13, combos: comboArchiveScreen, synergyArchive: campaign.synergyArchive, showComboDiscovered };
  window.__m15 = { ...window.__m14, bus, inbox: inboxScreen, eventPopup, modal, events: campaign.events, sponsors: campaign.sponsors, notes: campaign.notes, presentPlace, EVENTS_BY_ID };
  window.__m16 = { ...window.__m15, rumours: rumourScreen, secretDebug: secretDebugScreen, secrets: campaign.secrets, research: researchScreen, build: buildScreen, recruit: recruitScreen };
  window.__m17b = { ...window.__m16, sheet, menus: menuHolder, bottomBar: workshopScreen.bottomBar, debug, guideTarget };
  window.__m18 = { ...window.__m17b, records: recordsScreen, achievements: campaign.achievements, accountRecords: campaign.records, floats, achMoment };
  const firedCount = {}; // every unlock action, counted as it fires (must end at 1 each)
  window.__m9.firedCount = firedCount;
  bus.on('unlock:fired', ({ action }) => (firedCount[`${action.type}:${action.id}`] = (firedCount[`${action.type}:${action.id}`] ?? 0) + 1));
  bus.on('facility:layout', () => debug.log(`layout v${campaign.facilities.version}: ${campaign.facilities.placed.length} facilities`));
}

router
  .register('boot', bootScreen)
  .register('test', testScreen)
  .register('workshop', workshopScreen)
  .register('roster', rosterScreen)
  .register('builder', builderScreen)
  .register('project', projectScreen)
  .register('result', resultScreen)
  .register('products', productsScreen)
  .register('finance', financeScreen)
  .register('closed', closedScreen)
  .register('components', componentsScreen)
  .register('contracts', contractsScreen)
  .register('help', helpScreen)
  .register('build', buildScreen)
  .register('research', researchScreen)
  .register('recruit', recruitScreen)
  .register('training', trainingScreen)
  .register('staffDetail', staffDetailScreen)
  .register('competitions', competitionsScreen)
  .register('compSetup', compSetupScreen)
  .register('compWatch', compWatchScreen)
  .register('compResult', compResultScreen)
  .register('rankings', rankingsScreen)
  .register('trophies', trophyScreen)
  .register('combos', comboArchiveScreen)
  .register('inbox', inboxScreen)
  .register('rumours', rumourScreen)
  .register('records', recordsScreen)
  .register('debugbuilder', debugBuilderScreen);
if (debug.enabled) router.register('staffdebug', staffDebugScreen).register('secretdebug', secretDebugScreen); // ?debug=1 only // ?debug=1 only: spawn any of the 50
router.go('boot');
loop.start();

// Reduced Flashes (bible §36 accessibility): ?flashes=reduced or ?flashes=normal sets it, and it is remembered.
function readFlashSetting() {
  const key = 'robot-workshop:reducedFlashes';
  const q = new URLSearchParams(window.location.search).get('flashes');
  try {
    if (q) localStorage.setItem(key, q === 'reduced' ? '1' : '0');
    return localStorage.getItem(key) === '1';
  } catch {
    return q === 'reduced';
  }
}
