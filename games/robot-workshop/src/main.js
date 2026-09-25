// Robot Workshop — boot.
// Starts the shared engine, loads (or starts) the campaign and opens the workshop.
// Add ?screen=test to the address to open the Milestone 0 scaling/tap test screen instead.
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
import { COMPETITIONS, COMPETITION_ART, TROPHIES } from '../data/competitions.js';
import { RIVALS } from '../data/rivals.js';
import { TUTORIAL_HIRES } from '../data/recruitment.js';
import { RECRUIT_ART, PORTRAITS, PORTRAIT_FOLDER } from '../data/recruitment.js';
import { TRAINING_ART } from '../data/training.js';
import { RESEARCH_ART, FEATURES } from '../data/research.js';
import { FACILITIES, BUILD_ART } from '../data/facilities.js';
import { RANK_NOTES } from '../data/economy.js';
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
router.modal = major;

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
    major.update(dt);
    coach.update(dt);
    if (campaignReady) guide.update();
  },
  render: (alpha) => {
    const ctx = renderer.begin('#101418');
    router.render(ctx, alpha);
    if (guide.active) {
      const step = guide.current;
      coach.render(ctx, step, guideTarget(step.target), { block: step.block, next: !!step.advance.next });
    }
    major.render(ctx);
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
async function startCampaign() {
  const adapter = await createStorageAdapter({ dbName: 'robot-workshop', prefix: 'robot-workshop:' });
  campaign.saveManager = new SaveManager({ adapter, key: 'campaign', version: SAVE_VERSION, migrations: SAVE_MIGRATIONS, bus });
  const loaded = await campaign.loadOrNew();
  if (!loaded) await campaign.save().catch(() => {});
  debug.log(`campaign ${loaded ? 'loaded' : 'new'} (${adapter.kind})`);
  campaignReady = true;
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
    ctx.fillStyle = '#E8EEF2';
    ctx.font = 'bold 64px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Robot Workshop', W / 2, H / 2 - 60);
    ctx.fillStyle = '#2A3440';
    ctx.fillRect(W / 2 - 300, H / 2 + 20, 600, 24);
    ctx.fillStyle = '#4FC3F7';
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
    ctx.strokeStyle = '#4FC3F7';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 300, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeRect(W / 2 - 300, H / 2 - 300, 600, 600);

    // Spinner driven by the fixed-step update: freezes while paused.
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(this.angle);
    ctx.fillStyle = '#FFD166';
    ctx.fillRect(-12, -260, 24, 220);
    ctx.restore();

    ctx.fillStyle = '#E8EEF2';
    ctx.font = 'bold 44px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Milestone 0 — test screen', W / 2, H / 2 - 420);
    ctx.font = '30px system-ui, sans-serif';
    ctx.fillStyle = '#9AA8B5';
    ctx.fillText('Tap anywhere: the cross should sit exactly under your finger.', W / 2, H / 2 - 360);
    ctx.fillText(`sim time ${this.time.toFixed(2)}s`, W / 2, H / 2 + 360);

    // Placeholder fallback + seeded RNG swatches.
    const sr = layout.safeRect;
    assets.draw(ctx, 'placeholderTest', W / 2 - 160, sr.y + sr.h - 460, 320, 200);
    this.swatches.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(W / 2 - 320 + i * 80, sr.y + sr.h - 220, 64, 64);
    });
    ctx.fillStyle = '#9AA8B5';
    ctx.font = '24px system-ui, sans-serif';
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
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 96px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PAUSED', W / 2, H / 2);
      ctx.font = '34px system-ui, sans-serif';
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
    ctx.strokeStyle = x % 120 === 0 ? '#243040' : '#18202A';
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y <= H; y += 60) {
    ctx.strokeStyle = y % 120 === 0 ? '#243040' : '#18202A';
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
  ctx.strokeStyle = '#FF5A5A';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, W - 8, H - 8);
  ctx.fillStyle = '#FF5A5A';
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
    ctx.strokeStyle = '#7CFFB2';
    ctx.lineWidth = 4;
    ctx.setLineDash([16, 12]);
    ctx.strokeRect(sr.x + 2, sr.y + 2, sr.w - 4, sr.h - 4);
    ctx.setLineDash([]);
  }
}

function drawTapMarker(ctx, tap) {
  const { x, y } = tap;
  ctx.strokeStyle = '#FFFFFF';
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
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(label, tx, ty);
}

function drawPauseButton(ctx, b, paused) {
  ctx.fillStyle = paused ? '#FFD166' : '#2A3440';
  ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.strokeStyle = '#4FC3F7';
  ctx.lineWidth = 4;
  ctx.strokeRect(b.x, b.y, b.w, b.h);
  ctx.fillStyle = paused ? '#101418' : '#E8EEF2';
  ctx.font = 'bold 40px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(paused ? 'RESUME' : 'PAUSE', b.x + b.w / 2, b.y + b.h / 2);
}

// ---------------------------------------------------------------------------
window.addEventListener('keydown', (e) => {
  if (e.key !== 'p' && e.key !== 'P' && e.key !== ' ') return;
  if (major.active) return;
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
};
const workshopScreen = createWorkshopScreen({ renderer, layout, assets, bus, debug, campaign, router, goProject, hud });
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
const guideTarget = createGuideTargets({ router, campaign });
const guide = new GuideSystem({
  steps: GUIDE_STEPS,
  bus,
  targetRect: guideTarget,
  screen: () => router.currentName,
  canShow: () => campaignReady && !major.active && !campaign.closed && !buildScreen?.confirm && !['boot', 'test', 'debugbuilder', 'help', 'components', 'staffdebug'].includes(router.currentName),
  pause: () => {
    if (campaign.clock.paused) return false;
    campaign.clock.pause();
    return true;
  },
  resume: () => campaign.clock.resume(),
});
const coach = new CoachMark({ layout, assets, face: GUIDE_FACE });
router.layers.push({ get active() { return guide.active; }, handleInput: (hook, p) => guide.handleInput(hook, p, hook === 'onTap' ? coach.hit(p) : null) });
bus.on('guide:change', () => (campaign.guideState = guide.serialize()));
bus.on('guide:done', ({ step }) => {
  if (step.id === 'S2') workshopScreen.selection.clear(); // "Got it" also closes Mina's card
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
const compSetupScreen = createCompetitionSetupScreen({ renderer, layout, assets, bus, campaign, router });
const compWatchScreen = createCompetitionWatchScreen({ renderer, layout, assets, campaign, router, vfx, held: () => guide.active || major.active });
const compResultScreen = createCompetitionResultScreen({ renderer, layout, assets, campaign, router, vfx });
// An event invites the company. The very first one (the Local Trial, §26) is a big moment with Kai West on the Roster.
bus.on('competition:invite', ({ event, first }) => {
  debug.log(`competition open: ${event.id} ${event.name}`);
  if (!campaignReady) return;
  audio.play('levelUp');
  campaign.save().catch(() => {});
  // The World Championship arrives as a big moment of its own (§24.1 "World Championship Arrival").
  if (event.id === 'C09') {
    major.show({
      title: 'The World Robotics Championship!',
      subtitle: 'Your workshop is invited to the world stage. See Compete.',
      accent: '#FFD166',
      drawFn: (ctx, t) => {
        const s = Math.min(1, t / 0.4);
        ctx.save();
        ctx.globalAlpha = s;
        assets.drawContained(ctx, COMPETITION_ART.worldMoment, { x: W / 2 - 380, y: H / 2 - 520 + (1 - s) * 60, w: 760, h: 760 });
        ctx.restore();
      },
      onAck: () => router.go('competitions', { eventId: 'C09' }),
    });
    return;
  }
  if (!first) {
    floatNumber(`New event: ${event.name}!`, FLOAT_COLORS.info, COMPETITION_ART.icon, 0.5);
    return;
  }
  const kai = campaign.recruitment.special?.staffId === TUTORIAL_HIRES.kai.staffId;
  if (!kai) bus.emit('guide:pilotReady', {}); // Kai is here already (or not coming): no hiring steps
  major.show({
    title: `You're invited: ${event.name}!`,
    subtitle: kai ? 'Kai West, a test pilot, wants to join (cheap) — see Roster. Then tap Compete.' : 'Tap Compete in the workshop to enter.',
    accent: '#FFD166',
    drawFn: (ctx, t) => {
      const s = Math.min(1, t / 0.4);
      ctx.save();
      ctx.globalAlpha = s;
      assets.drawContained(ctx, COMPETITION_ART.firstMoment, { x: W / 2 - 380, y: H / 2 - 520 + (1 - s) * 60, w: 760, h: 760 });
      ctx.restore();
    },
  });
});
// The guide's "hire Kai" steps end when Kai joins (the Tessa steps already used staff:hired).
bus.on('staff:hired', ({ staff }) => staff.id === TUTORIAL_HIRES.kai.staffId && bus.emit('guide:pilotReady', {}));
bus.on('trophy:awarded', ({ trophy }) => debug.log(`trophy: ${trophy.name}`));
bus.on('competition:result', ({ result }) => debug.log(`${result.eventId}: ${result.won ? 'WON' : result.player.dnf ? 'DNF' : `place ${result.place}`} · ${result.player.final} · seed ${result.seed}`));

bus.on('economy:closure', () => router.go('closed'));
bus.on('product:sales', ({ product, sale }) => debug.log(`${product.name}: ${sale.units} sold, +${sale.revenue}`));

// A finished robot (major feedback, bible §33.4): the game pauses, the Helper pops onto the pedestal
// with the completion flash, and nothing moves on until the player taps. Then the result screen.
bus.on('project:complete', ({ record }) => {
  const wasRunning = !campaign.clock.paused;
  campaign.clock.pause();
  campaign.save().catch(() => {});
  if (router.currentName !== 'workshop') router.go('workshop');
  workshopScreen.celebrate(record);
  audio.play('robotDone');
  const r = record.result;
  const deal = record.contract ? (record.contract.ok ? ' · contract met!' : ' · missed its contract') : '';
  major.show({
    title: 'Robot finished!',
    subtitle: `${record.name} · Review ${r.review.toFixed(1)} / 10 · Quality ${r.quality.toFixed(1)}${deal}`,
    accent: '#7CFFB2',
    onAck: () => router.go('result', { number: record.number, resumeOnExit: wasRunning }),
  });
});

// Small and medium feedback: sounds, and money / reputation numbers floating off the top bar.
bus.on('project:phase', () => audio.play('phaseDone'));
bus.on('staff:levelup', () => audio.play('levelUp'));
let floatStack = 0; // numbers arriving together are stacked, not drawn on top of each other
let floatStackAt = 0;
function floatNumber(text, color, icon, xFrac) {
  const now = performance.now();
  floatStack = now - floatStackAt < 400 ? floatStack + 1 : 0;
  floatStackAt = now;
  // Just under the top bar, floating up towards the money row without covering the buttons.
  const m = moneyBarRect(layout);
  const t = topBarRect(layout);
  vfx.text('screen', text, m.x + m.w * xFrac, t.y + t.h + 50 + (floatStack % 3) * 52, { color, icon, size: 42, rise: 45, life: 1.9, delay: floatStack * 0.12 });
}
bus.on('product:sales', ({ sale }) => {
  const m = moneyBarRect(layout);
  vfx.sprite('screen', VFX_ART.cashBurst, m.x + 42, m.y + m.h / 2, { size: 130, life: 1.0, from: 0.4, to: 1, hold: 0.15 });
  floatNumber(`+${sale.revenue.toLocaleString('en-US')}`, FLOAT_COLORS.credits, 'ui_icon_01_money', 0.24);
  audio.play('sale');
});
bus.on('economy:change', (line) => {
  if (line.currency === 'techChips' && line.amount > 0 && line.category !== 'start') floatNumber(`+${line.amount} Tech Chips`, FLOAT_COLORS.techChips, 'ui_icon_02_premium', 0.5);
});
// Contracts: pay-out floats up; a failure floats red. The very first offer gets a "first customer" moment.
bus.on('contract:success', ({ contract }) => {
  floatNumber(`+${(contract.result?.paid ?? contract.payout).toLocaleString('en-US')}`, FLOAT_COLORS.credits, 'ui_icon_01_money', 0.24);
  audio.play('sale');
});
bus.on('contract:failed', ({ contract }) => {
  const m = moneyBarRect(layout);
  vfx.text('screen', `Contract failed: ${contract.title}`, m.x + m.w / 2, topBarRect(layout).y + topBarRect(layout).h + 60, { color: '#FF8A80', size: 36, life: 2.6, rise: 30 });
});
bus.on('contract:offered', ({ contract }) => {
  if (campaign.flags.firstContractSeen || !campaignReady) return;
  campaign.flags.firstContractSeen = true;
  major.show({
    title: 'Your first customer!',
    subtitle: `${contract.customer} has a job for you — see Contracts`,
    accent: '#FFB74D',
    drawFn: (ctx, t) => {
      const s = Math.min(1, t / 0.4);
      ctx.save();
      ctx.globalAlpha = s;
      assets.drawContained(ctx, FIRST_CONTRACT_ART, { x: W / 2 - 380, y: H / 2 - 520 + (1 - s) * 60, w: 760, h: 760 });
      ctx.restore();
    },
    onAck: () => router.go('contracts', { tab: 'offered' }),
  });
});
bus.on('reputation:change', ({ amount, quiet }) => {
  if (amount > 0 && !quiet) floatNumber(`+${amount} Rep`, FLOAT_COLORS.reputation, 'ui_icon_03_reputation', 0.74);
});
// A new Company Rank (§8.3) is a big moment: what it opens, then carry on.
bus.on('reputation:rankUp', ({ rank }) => {
  if (!campaignReady) return;
  audio.play('levelUp');
  campaign.save().catch(() => {});
  major.show({ title: `Company Rank ${rank.id}!`, subtitle: RANK_NOTES[rank.id] ?? 'Your workshop is growing.', accent: '#FFD166' });
});
// Money for building shows in the ledger; a sale floats its refund.
// Research (Milestone 9): RP float up in cyan; a finished topic is a medium moment (sound + note in the workshop);
// the first RP ever and a business milestone get a short message.
bus.on('research:rp', ({ amount, first }) => {
  if (amount <= 0 || !campaignReady) return;
  floatNumber(`+${amount} RP`, FLOAT_COLORS.research, RESEARCH_ART.rp, 0.5);
  if (first) debug.log('first Research Points earned');
});
bus.on('research:complete', ({ node, fired }) => {
  audio.play('phaseDone');
  campaign.save().catch(() => {});
  debug.log(`research ${node.id} done: ${fired.map((a) => a.type + ' ' + a.id).join(', ')}`);
  if (router.currentName !== 'workshop' && router.currentName !== 'research') floatNumber(`${node.name} researched!`, FLOAT_COLORS.research, RESEARCH_ART.icon, 0.5);
});
bus.on('research:milestone', ({ milestone, fired }) => {
  if (!campaignReady || !fired.length) return;
  const f = FEATURES[fired.at(-1).id];
  major.show({ title: `${milestone.count} research topics done!`, subtitle: `${fired.map((a) => FEATURES[a.id]?.name ?? a.id).join(' + ')}: ${f?.note ?? ''}`, accent: '#4FC3F7' });
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
bus.on('facility:sold', ({ refund }) => floatNumber(`+${refund.toLocaleString('en-US')}`, FLOAT_COLORS.credits, 'ui_icon_01_money', 0.24));
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
  .register('debugbuilder', debugBuilderScreen);
if (debug.enabled) router.register('staffdebug', staffDebugScreen); // ?debug=1 only: spawn any of the 50
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
