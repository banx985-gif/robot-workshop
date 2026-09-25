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
import { createWorkshopScreen } from './screens/WorkshopScreen.js';
import { createStaffRosterScreen } from './screens/StaffRosterScreen.js';
import { createRobotBuilderScreen } from './screens/RobotBuilderScreen.js';
import { createProjectDetailScreen } from './screens/ProjectDetailScreen.js';
import { createProjectResultScreen } from './screens/ProjectResultScreen.js';
import { createProductCatalogueScreen } from './screens/ProductCatalogueScreen.js';
import { createFinanceScreen } from './screens/FinanceScreen.js';
import { createClosureScreen } from './screens/ClosureScreen.js';
import { moneyBarRect, topBarRect } from './ui/TopBar.js';
import { Campaign, SAVE_MIGRATIONS } from './app/Campaign.js';
import { COMPONENTS } from '../data/components.js';
import { PURPOSES } from '../data/purposes.js';
import { STAFF, ROLES, STARTER_IDS } from '../data/staff.js';
import { SAVE_VERSION } from '../data/balance.js';
import { ROOM_ART, FURNITURE_ART } from '../data/workshop.js';
import { VFX_ART, STATUS_ART, SOUNDS, FLOAT_COLORS } from '../data/feedback.js';

const W = 1080;
const H = 1920;

const starters = STAFF.filter((s) => STARTER_IDS.includes(s.id));
const art = (folder, key) => [key, `assets/images/${folder}/${key}.png`];
const ASSETS = {
  // Workshop room: floor, walls, bench and pedestal.
  ...Object.fromEntries([ROOM_ART.floor.key, ROOM_ART.corner.key, ...Object.values(ROOM_ART.pieces).map((p) => p.key)].map((k) => art('env', k))),
  ...Object.fromEntries(Object.values(FURNITURE_ART).map((f) => art('facilities', f.key))),
  // Effects and status icons.
  ...Object.fromEntries(Object.values(VFX_ART).map((k) => art('vfx', k))),
  ...Object.fromEntries(Object.values(STATUS_ART).map((k) => art('status', k))),
  // Starter staff portraits and their role badges, keyed by art name.
  ...Object.fromEntries(starters.map((s) => [s.art, `assets/images/staff/${s.art}.png`])),
  ...Object.fromEntries(starters.map((s) => [ROLES[s.role].badge, `assets/images/badges/${ROLES[s.role].badge}.png`])),
  // Robot project art: finished robots, part icons, menu icons.
  ...Object.fromEntries(Object.values(PURPOSES).map((p) => [p.art, `assets/images/robots/${p.art}.png`])),
  ...Object.fromEntries(Object.values(COMPONENTS).map((c) => [c.art, `assets/images/components/${c.art}.png`])),
  ui_icon_11: 'assets/images/ui/ui_icon_11.png',
  ui_icon_06_robot: 'assets/images/ui/ui_icon_06_robot.png',
  // Money art.
  ui_icon_01_money: 'assets/images/ui/ui_icon_01_money.png',
  ui_icon_02_premium: 'assets/images/ui/ui_icon_02_premium.png',
  ui_icon_03_reputation: 'assets/images/ui/ui_icon_03_reputation.png',
  ui_icon_13: 'assets/images/ui/ui_icon_13.png',
  ui_icon_29: 'assets/images/ui/ui_icon_29.png',
  reward_01: 'assets/images/rewards/reward_01.png',
  // Deliberately missing file: proves the placeholder fallback.
  placeholderTest: 'assets/m0-missing-test.png',
};
const START_SCREEN = new URLSearchParams(window.location.search).get('screen') === 'test' ? 'test' : 'workshop';

const bus = new EventBus();
const rng = new Rng('robot-workshop-m0');
const renderer = new Renderer(document.getElementById('game'), { width: W, height: H, maxDpr: 2, bus });
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
bus.on('renderer:resize', () => assets.setPixelScale(renderer.pixelScale));

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
  },
  render: (alpha) => {
    const ctx = renderer.begin('#101418');
    router.render(ctx, alpha);
    major.render(ctx);
    vfx.render(ctx, 'screen');
    debug.render(ctx);
  },
});
const debug = new DebugOverlay({ loop, renderer, layout, input, bus, top: 1230, maxLines: 3 }); // under the room, clear of the top bar and project strip
bus.on('loop:pause', () => input.reset());

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
};
const workshopScreen = createWorkshopScreen({ renderer, layout, assets, bus, debug, campaign, router, goProject, hud });
bus.on('renderer:resize', () => workshopScreen.resize());
const rosterScreen = createStaffRosterScreen({ renderer, layout, assets, bus, debug, campaign, router, workshop: workshopScreen, goProject, hud });
const builderScreen = createRobotBuilderScreen({ renderer, layout, assets, campaign, router });
const projectScreen = createProjectDetailScreen({ renderer, layout, assets, campaign, router, hud });
const resultScreen = createProjectResultScreen({ renderer, layout, assets, campaign, router });
const productsScreen = createProductCatalogueScreen({ renderer, layout, assets, campaign, router, goProject, hud });
const financeScreen = createFinanceScreen({ renderer, layout, assets, campaign, router, goProject, hud });
const closedScreen = createClosureScreen({ renderer, layout, assets, campaign, router });

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
  major.show({
    title: 'Robot finished!',
    subtitle: `${record.name} · Review ${r.review.toFixed(1)} / 10 · Quality ${r.quality.toFixed(1)}`,
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
bus.on('reputation:change', ({ amount }) => {
  if (amount > 0) floatNumber(`+${amount} Rep`, FLOAT_COLORS.reputation, 'ui_icon_03_reputation', 0.74);
});
bus.on('project:phase', ({ job, phase }) => debug.log(`${job.name}: ${phase.name} done`));
bus.on('robot:fault', ({ job }) => debug.log(`${job.name}: fault (${job.data.faults.length} open)`));
bus.on('robot:breakthroughRoll', ({ job, phase, hit }) => debug.log(`${job.name}: ${phase.name} 60% check → ${hit ? 'BREAKTHROUGH' : 'none'}`));
if (debug.enabled) {
  window.__m1 = { ...window.__m0, workshop: workshopScreen };
  window.__m2 = { ...window.__m1, campaign, roster: rosterScreen, Campaign, EventBus };
  window.__m3 = { ...window.__m2, builder: builderScreen, project: projectScreen, result: resultScreen };
  window.__m4 = { ...window.__m3, products: productsScreen, finance: financeScreen, closed: closedScreen, hud };
  window.__m5 = { ...window.__m4, vfx, audio, major };
  // Debug: F toggles Reduced Flashes; sound hooks show in the log.
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'f' && e.key !== 'F') return;
    vfx.reducedFlashes = !vfx.reducedFlashes;
    debug.log(`Reduced Flashes ${vfx.reducedFlashes ? 'on' : 'off'}`);
  });
  bus.on('audio:play', ({ name, silent }) => name !== 'tap' && debug.log(`sound: ${name}${silent ? ' (placeholder)' : ''}`));
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
  .register('closed', closedScreen);
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
