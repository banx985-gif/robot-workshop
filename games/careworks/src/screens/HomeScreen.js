// The home (Milestone 1, bible §4): a small residential home on a hidden 12×16 grid in the 3/4 dollhouse view, floor
// and walls drawn by code (warm cream, sage, timber — a home, not a hospital). Arthur Lane and the team walk their day
// (src/systems/homeWorld.js) through the doorways. Drag pans, pinch / wheel zooms (clamped to the home); tapping a
// person or a place opens its bottom sheet. A long press on empty floor enters a placeholder Build Mode (banner + Done).
// Back returns to the Main Menu.
// Milestone 2: the game clock; the home dims a little at night. Milestone 4: a small code-drawn marker over each
// helper's head (one shape per task type, no text) and the ringing call bell over Arthur (src/ui/taskMarkers.js).
// Milestone 5 (first art / phone feel): the shared series bars (core/ui TopBar and BottomBar, made in main) replace the
// Milestone 1–4 menu button, clock row and shortcut; a slim line under the top bar gives the time, band and facility.
// Every placed thing in its art at one scale (the Dining Room and Staff Room join), the five early props (decoration:
// never tapped, never on a walkway), a hall runner and timber back hall, wainscot on the walls, soft daylight from the
// windows and soft floor shadows under furniture and people. People hop and sway as they walk (one hop per stride
// walked: no sliding), lean gently while helping, breathe while standing or resting; a status icon over staff (their
// task, resting, or tired). Care pops (src/ui/carePops.js) draw here through core/VfxSystem's 'world' layer; the
// end-of-day beat under the time line.
// Milestone 10: Build Mode (long-press empty floor, or Develop → Build): a banner with Shop and Done; tap a room or
// facility to Move or Sell it; Shop (main's sheet) or Move gives a ghost of the piece — green where it may stand, red
// with the reason where it may not — dragged with a finger or dropped where you tap, then Place / Cancel. The walls,
// floors and doormats follow the live layout, and the view grows with the home's stage.
// Plan space lives in the world; only drawing and tapping go through the IsoProjection here.
//   createHomeScreen({ renderer, layout, assets, bus, sheet, campaign, world, openSheet(kind, id), onMenu, topBar,
//                      bottomBar, vfx, dayBeat, debug, onStaffWarning, onShop(), onSell(item) })
//   campaign() → { n, data } of the open slot · world() → its home world (main makes one per opened campaign)
import { THEME, font } from '../../../../core/Theme.js';
import { IsoProjection } from '../../../../core/IsoProjection.js';
import { Camera } from '../../../../core/Camera.js';
import { WorldGestures } from '../../../../core/WorldGestures.js';
import { CachedLayer } from '../../../../core/CachedLayer.js';
import { Selection } from '../../../../core/Selection.js';
import { drawIsoRoom, isoPath, wallPatch } from '../../../../core/IsoRoom.js';
import { characterPose, drawCharacter } from '../../../../core/CharacterMotion.js';
import { drawButton, hitRect } from '../../../../core/ui/Button.js';
import { text } from '../../../../core/ui/Kit.js';
import { HOME, FLOORS, ART_DRAW, PERSON, MOTION, WINDOWS, ENTRANCE, HOME_LOOK as L, STAGES, zonesOf } from '../../data/home.js';
import { WINGS_SPECIAL, wingById } from '../../data/wings.js';
import { WALK } from '../../data/balance.js';
import { paletteById } from '../../data/setup.js';
import { ROOM_SHAPE, roomById } from '../../data/rooms.js';
import { facilityById } from '../../data/facilities.js';
import { ART_FIT } from '../../data/assets.js';
import { bandAt, clockText } from '../systems/residentNeeds.js';
import { TASK_TYPES } from '../../data/tasks.js';
import { drawTaskMarker, drawBellMarker } from '../ui/taskMarkers.js';
import { VISITOR_LOOK } from '../../data/family.js';
import { findPath } from '../../../../core/Pathing.js';
import { MEMORIAL } from '../../data/endOfLife.js';
const MEMORIAL_GLOW = MEMORIAL.art.glow; // (Milestone 27: a room held after a passing)
// Milestone 30b: a soft gold glow behind a Works God (code-drawn: a radial gradient, so no art is needed)
function drawGodGlow(ctx, x, y, rad) {
  const g = ctx.createRadialGradient(x, y, rad * 0.15, x, y, rad);
  g.addColorStop(0, 'rgba(255, 214, 92, 0.55)');
  g.addColorStop(1, 'rgba(255, 214, 92, 0)');
  ctx.save();
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, rad, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

const C = THEME.color;
const S = THEME.size;
const WALL_T = 0.24; // inside-wall thickness, in tiles
// Sprite detail steps: the smallest step at or above the camera zoom. Drawn about 1:1 at any zoom (so frames stay cheap
// on big screens — caching at full zoom and shrinking every frame cost ~20 ms a frame on a tablet) with only a few
// cached sizes per picture, remade once when a pinch crosses a step.
const DETAIL_STEPS = [0.5, 0.7, 1.0, 1.4];
const detailFor = (zoom) => DETAIL_STEPS.find((d) => d >= zoom - 1e-3) ?? DETAIL_STEPS[DETAIL_STEPS.length - 1];
const isPerson = (it) => it.kind === 'resident' || it.kind === 'staff';

export function createHomeScreen({ renderer, layout, assets, bus, sheet, campaign, world: getWorld, openSheet, onMenu, topBar, bottomBar, vfx = null, dayBeat = null, debug = null, onStaffWarning = null, onShop = null, onSell = null, onWings = null, hint = null, prefs = {} }) {
  const W = renderer.width;
  const { cellSize: CELL, wallH, innerWallH, margin } = HOME;
  const { halfW: HW, halfH: HH } = HOME.view;
  // Milestone 10: the floor's size follows the home's stage (S2 grows it forward), so the projection and the world's
  // size are remade when it changes (the pieces keep their tiles; the view moves with them).
  let cols = HOME.cols;
  let rows = HOME.rows;
  const iso = new IsoProjection({ tileSize: CELL, halfW: HW, halfH: HH, originX: margin + rows * HW, originY: margin + wallH });
  let worldW = (cols + rows) * HW + margin * 2;
  let worldH = (cols + rows) * HH + wallH + margin * 2;
  const floorLayer = new CachedLayer({ width: worldW, height: worldH, draw: drawFloor });
  // Milestone 6: the home is bigger, so the cached floor picture is capped in size (a very big one costs ~20 ms a frame);
  // near the cap the floor is a touch softer at full zoom on a tablet — the people and art stay sharp.
  let floorCap = Math.sqrt(HOME.floorMaxPixels / (worldW * worldH));
  const floorScale = () => Math.min(renderer.pixelScale * detailFor(camera.zoom), floorCap);
  const camera = new Camera({ viewW: W, viewH: renderer.height, worldW, worldH });
  camera.minZoom = HOME.zoom.min;
  camera.maxZoom = HOME.zoom.max;

  let world = null;
  let palette = paletteById('sage');
  let slotN = null;
  let walls = [];
  // Milestone 10: after a layout change (or a stage change): the walls again, the floor picture, what can be tapped.
  // Milestone 24: fCols / fRows = the open floor; cols / rows = the view, which already takes in the next stage while it
  // is being built (the site shows), so nothing shifts when it opens.
  let fCols = cols;
  let fRows = rows;
  function syncLayout() {
    if (!world) return;
    const b = world.layout.building;
    const f = b ? STAGES[b.to - 1] : world.floor;
    fCols = world.floor.cols;
    fRows = world.floor.rows;
    camera.minZoom = HOME.zoom.minByStage?.[world.layout.stage] ?? HOME.zoom.min; // (Milestone 24: zoom out further on a bigger home)
    if (f.cols !== cols || f.rows !== rows) {
      const cx = camera.x + camera.visibleW / 2;
      const cy = camera.y + camera.visibleH / 2;
      const plan = iso.toPlan(cx, cy);
      cols = f.cols;
      rows = f.rows;
      iso.originX = margin + rows * HW;
      worldW = (cols + rows) * HW + margin * 2;
      worldH = (cols + rows) * HH + wallH + margin * 2;
      floorCap = Math.sqrt(HOME.floorMaxPixels / (worldW * worldH));
      floorLayer.resize(worldW, worldH);
      camera.setWorld(worldW, worldH);
      const back = iso.toWorld(plan.x, plan.y);
      camera.centerOn(back.x, back.y);
    }
    // (Milestone 25b: a room or facility is a self-contained box — never a code wall across its picture's footprint)
    const inPicture = (t) => world.placed.some(({ fp }) => t.col >= fp.col && t.col < fp.col + fp.w && t.row >= fp.row && t.row < fp.row + fp.h);
    walls = world.layout.wallTiles().filter((t) => !inPicture(t)).map((t) => ({ kind: 'wall', col: t.col, row: t.row, wall: t.wall, dir: t.dir }));
    for (const it of [...selection.items]) if (!isPerson(it) && !world.placed.includes(it)) selection.remove(it);
    for (const it of world.placed) if (!selection.items.includes(it)) selection.add(it);
    floorLayer.invalidate();
  }
  bus.on('home:layout', () => syncLayout());

  // --- where things are drawn (projected world) ----------------------------------------------------------------
  // Every placed picture at one scale: its width follows its footprint (ART_DRAW), so a 3×3 facility and a 1×1 prop
  // match the grid the same way.
  // Milestone 25b: a room or facility picture sits on its footprint by its measured floor (data/assets.js ART_FIT): the
  // painted floor's left and right corners on the footprint's, so its width is the footprint's, and its bottom tip on
  // the footprint's bottom corner.
  const artRect = (it) => {
    const fp = it.fp;
    const fit = ART_FIT[it.def.art];
    if (fit) {
      const w = ((fp.w + fp.h) * HW) / (fit.right - fit.left);
      const h = w / assets.aspect(it.def.art);
      return { x: iso.corner(fp.col, fp.row + fp.h).x - fit.left * w, y: iso.corner(fp.col + fp.w, fp.row + fp.h).y - fit.tipY * h, w, h };
    }
    const look = ART_DRAW[it.kind];
    const w = (fp.w + fp.h) * HW * look.width * (it.def.scale ?? 1); // (Milestone 28b: a big set-dressing prop — the bus, the fountain)
    const h = w / assets.aspect(it.def.art);
    const cx = iso.corner(fp.col + fp.w / 2, fp.row + fp.h / 2).x;
    const base = iso.corner(fp.col + fp.w, fp.row + fp.h).y + HH * look.drop;
    return { x: cx - w / 2, y: base - h, w, h };
  };
  const feetOf = (p) => {
    const f = iso.toWorld(p.agent.x, p.agent.y);
    return { x: f.x, y: f.y + HH * 0.2 };
  };
  const personRect = (p) => {
    const f = feetOf(p);
    const h = PERSON.height;
    const w = h * assets.aspect(p.art);
    return { x: f.x - w / 2, y: f.y - h, w, h };
  };
  // A person is tapped on their body (the art's transparent margin is left out), a place on its art.
  const tapRect = (it) => {
    if (world?.hiddenPerson?.(it)) return { x: -1e9, y: -1e9, w: 0, h: 0 }; // (Milestone 18: away at the hospital service)
    if (isPerson(it)) {
      const r = personRect(it);
      return { x: r.x + r.w * 0.22, y: r.y + r.h * 0.04, w: r.w * 0.56, h: r.h * 0.94 };
    }
    return artRect(it);
  };
  // Milestone 18: everyone drawn — not a resident away at the hospital service
  const shownPeople = () => (world.hiddenPerson ? world.people.filter((p) => !world.hiddenPerson(p)) : world.people);
  // Milestone 19: visitors (code-drawn, a name tag; tapping one opens their resident's card)
  const shownVisitors = () => world?.visitors ?? [];
  // Draw order: plan x + y (further back first).
  // Milestone 25b: a room or facility picture paints its own back walls, so it comes after every wall and piece behind
  // its footprint (their x + y is at most its back corner's + its longer side − 1) and before anyone standing in it or in
  // front of it (a room's people stand on its front strip, outside the picture). Rooms used to be part of the floor,
  // under every wall: the walls of the room behind cut across their beds.
  const depthOf = (it) => {
    if (isPerson(it) || it.kind === 'visitor') return it.agent.x + it.agent.y;
    if (it.kind === 'wall') return (it.col + it.row + 1) * CELL;
    const fp = it.fp;
    const middle = fp.col + fp.w / 2 + fp.row + fp.h / 2;
    if (it.kind === 'prop') return middle * CELL;
    return Math.max(middle, fp.col + fp.row + Math.max(fp.w, fp.h) - 0.5) * CELL;
  };
  // People first when they overlap a place (they stand in front of it); among places, the nearest.
  const selection = new Selection(bus, { boundsOf: tapRect, depthOf: (it) => depthOf(it) + (isPerson(it) ? 100000 : 0), minHitSize: 90 });

  // --- UI rects (screen) ------------------------------------------------------------------------------------------
  let buildMode = false;
  const bannerRect = () => {
    const sr = layout.safeRect;
    return { x: sr.x + 24, y: sr.y + 24, w: sr.w - 48, h: 330 };
  };
  // Milestone 10: the banner's buttons sit in a row along its foot (the last one — Done / Cancel — on the right).
  const bannerButtonRects = (n) => {
    const b = bannerRect();
    const gap = 16;
    const w = Math.min(300, (b.w - 48 - gap * (n - 1)) / n);
    return Array.from({ length: n }, (_, i) => ({ x: b.x + b.w - 24 - (n - i) * w - (n - 1 - i) * gap, y: b.y + b.h - 24 - 116, w, h: 116 }));
  };
  const doneRect = () => bannerButtons().find((x) => x.id === 'done' || x.id === 'cancel')?.rect ?? bannerButtonRects(1)[0];
  // The time line under the top bar: "08:20 · Morning peak" and the facility's name.
  const infoRect = () => {
    const t = topBar.rect();
    return { x: t.x + 8, y: t.y + t.h + 10, w: t.w - 16, h: 64 };
  };
  // Milestone 7: the short-staffing banner under the time line (a shift short now, or about to start short); tap → roster.
  const staffWarnings = () => world?.coverage?.warnings?.() ?? [];
  // Milestone 25c: the next-step hint line (core/ui/HintLine, made in main) sits under the time line; the staff warning
  // and the day's beat move down below it while it shows.
  const hintRect = () => {
    const r = infoRect();
    return { x: r.x + 24, y: r.y + r.h + 10, w: r.w - 48, h: 64 };
  };
  const hintShown = () => !buildMode && !!hint?.current;
  const underInfo = () => (hintShown() ? hintRect().y + hintRect().h : infoRect().y + infoRect().h);
  const warnRect = () => {
    const r = infoRect();
    return { x: r.x + 40, y: underInfo() + 10, w: r.w - 80, h: 110 };
  };
  const pref = (k) => (prefs[k] ? prefs[k]() : true); // (Milestone 25c: Settings → name tags, task markers; Low graphics)
  const lowFx = () => !!prefs.lowFx?.();
  const onUi = (p) => (buildMode ? hitRect(p, bannerRect()) : topBar.contains(p) || bottomBar.contains(p) || (hintShown() && hint.contains(p)) || (staffWarnings().length > 0 && hitRect(p, warnRect())));
  const overSheet = (p) => sheet.active && p.y >= sheet.rect().y;

  // The camera sees the space between the time line and the bottom bar: the bars never cover the home's edges.
  function fitView() {
    const top = infoRect();
    const bottom = bottomBar.rect();
    camera.viewX = 0;
    camera.viewY = top.y + top.h + 6;
    camera.setView(W, bottom.y - 8 - camera.viewY);
  }
  function resetView() {
    fitView();
    camera.zoom = HOME.zoom.start;
    // Milestone 11: open centred on the Nurse Station (the heart of the bigger home); the corridor if it was sold.
    const f01 = world?.placed.find((p) => p.defId === 'F01');
    const c = f01 ? iso.cellCenter(f01.box.col + f01.box.w / 2, f01.box.row + f01.box.h / 2) : iso.cellCenter(6, 7);
    camera.centerOn(c.x, c.y);
  }
  // Milestone 11: double-tap a station (or room) to jump the camera to it.
  let lastTap = null;
  const DOUBLE_TAP_SEC = 0.4;
  function jumpTo(it) {
    const r = artRect(it);
    camera.centerOn(r.x + r.w / 2, r.y + r.h * 0.6);
  }

  // --- how each person moves (Milestone 5) -----------------------------------------------------------------------
  // stride: plan distance walked (the walking clock, so hops keep pace with the feet at any speed); flip: the way they
  // face on screen.
  const motion = new Map(); // id → { x, y, stride, flip, seed }
  const pose = { bob: 0, tilt: 0, flip: 1 };
  const poseAgent = { state: 'idle', facing: 1 };
  let animT = 0; // the breathe / help clock (stops while the game is paused)
  const motionOf = (p) => {
    let m = motion.get(p.id);
    if (!m) {
      m = { x: p.agent.x, y: p.agent.y, stride: 0, flip: 1, seed: motion.size * 1.7 + 0.4 };
      motion.set(p.id, m);
    }
    return m;
  };
  function updateMotion(dt) {
    if (!world) return;
    if (!world.clock.paused) animT += dt;
    for (const p of [...world.people, ...shownVisitors()]) {
      const m = motionOf(p);
      const dx = p.agent.x - m.x;
      const dy = p.agent.y - m.y;
      const d = Math.hypot(dx, dy);
      if (d > CELL * 3) m.stride = 0; // placed, not walked (a load, the stuck fallback)
      else m.stride += d;
      const sx = dx - dy; // plan → screen: x grows with col, shrinks with row
      if (Math.abs(sx) > 0.5) m.flip = sx > 0 ? 1 : -1;
      m.x = p.agent.x;
      m.y = p.agent.y;
    }
  }
  // What their body is doing: walking, helping (a task under way), or still (standing, resting, sitting, asleep).
  function stateOf(p) {
    if (p.agent.state === 'walking') return 'walking';
    if (p.kind === 'staff' && p.mode === 'helping' && world.taskOf(p)?.status === 'working') return 'working';
    return 'idle';
  }

  // --- gestures ------------------------------------------------------------------------------------------------------
  let active = false;
  const gestures = new WorldGestures({ camera, bus, isActive: () => active });
  // Milestone 6: a new resident can be tapped as soon as they walk in.
  bus.on('care:admit', ({ resident }) => {
    const p = world?.byId(resident);
    if (p && !selection.items.includes(p)) selection.add(p);
  });
  const taps = []; // recent taps and what they hit (tests / debug)
  // People first; when several people overlap under the finger (a helper standing right beside Arthur), the one whose
  // body is nearest the finger — not simply the one drawn in front — so each of them can still be tapped.
  const pickAt = (sx, sy) => {
    const w = camera.screenToWorld(sx, sy);
    const hit = (r) => w.x >= r.x && w.x <= r.x + r.w && w.y >= r.y && w.y <= r.y + r.h;
    // (Milestone 19: a visitor counts too, and stands for their resident: the tap opens that resident's card)
    const bodyOf = (p) => (p.kind === 'visitor' ? visitorRect(p) : tapRect(p));
    const people = [...(world?.people ?? []), ...shownVisitors()].filter((p) => hit(bodyOf(p)));
    if (people.length) {
      const dist = (p) => {
        const r = bodyOf(p);
        return Math.abs(w.x - (r.x + r.w / 2)) + Math.abs(w.y - (r.y + r.h / 2)) * 0.35;
      };
      const best = people.length > 1 ? people.reduce((a, b) => (dist(b) < dist(a) ? b : a)) : people[0];
      if (best.kind === 'visitor') return world.residentById(best.resident) ?? null;
      if (people.length > 1) return best;
    }
    return selection.pick(w.x, w.y);
  };
  const cellAt = (sx, sy) => {
    const w = camera.screenToWorld(sx, sy);
    const plan = iso.toPlan(w.x, w.y);
    const c = { col: Math.floor(plan.x / CELL), row: Math.floor(plan.y / CELL) };
    return world && c.col >= 0 && c.row >= 0 && c.col < fCols && c.row < fRows ? c : null;
  };
  const open = (it) => {
    selection.select(it);
    openSheet(it.kind, it.id);
  };

  const screen = {
    camera,
    iso,
    selection,
    taps,
    motion,
    get world() {
      return world;
    },
    get buildMode() {
      return buildMode;
    },
    get slot() {
      return slotN;
    },
    // Tests / the guide: a bar button ('pause', 'speed1', 'inbox', 'help', a bottom slot id), 'done', 'banner', 'info'.
    rectOf(id) {
      const b = topBar.buttons().find((x) => x.id === id);
      if (b) return b.rect;
      if (id === 'inbox') return topBar.inboxRect();
      if (id === 'help') return topBar.helpRect();
      if (id === 'stats') return topBar.statsRect();
      const slot = bottomBar.buttonRect(id);
      if (slot) return slot;
      const bb = buildMode ? bannerButtons().find((x) => x.id === id) : null;
      if (bb) return bb.rect;
      return { done: doneRect(), banner: bannerRect(), info: infoRect(), staffWarning: warnRect(), hint: hintRect() }[id] ?? null;
    },
    // Screen point on a person's body or a place's art (tests): the visible middle of what a finger would tap.
    screenPointOf(id) {
      const it = world.byId(id) ?? shownVisitors().find((x) => x.id === id); // (Milestone 19: a visitor too)
      const r = it.kind === 'visitor' ? visitorRect(it) : tapRect(it);
      return camera.worldToScreen(r.x + r.w / 2, r.y + r.h * (it.kind === 'room' ? 0.45 : 0.55));
    },
    screenPointOfCell(col, row) {
      const w = iso.cellCenter(col, row);
      return camera.worldToScreen(w.x, w.y);
    },
    // Milestone 27: the middle of a place's art in world px (the memorial glow over a room).
    worldPointOfPlace(id) {
      const it = id && world?.byId(id);
      if (!it || (it.kind !== 'room' && it.kind !== 'station')) return null;
      const r = artRect(it);
      return { x: r.x + r.w / 2, y: r.y + r.h * 0.45 };
    },
    // A plan point lifted off the floor, in world px (the care pops).
    worldPointOf(x, y, lift = 0) {
      const w = iso.toWorld(x, y);
      return { x: w.x, y: w.y - lift };
    },
    // On screen inside the home's view (tests).
    inView(sx, sy) {
      return sx >= 0 && sx <= W && sy >= camera.viewY && sy <= camera.viewY + camera.viewH;
    },
    // Screen rect of a placed thing's or a prop's art (tests).
    artScreenRect(it) {
      const r = artRect(it);
      const a = camera.worldToScreen(r.x, r.y);
      const b = camera.worldToScreen(r.x + r.w, r.y + r.h);
      return { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y };
    },
    cellAt,
    pickAt,

    setBuildMode(on) {
      if (buildMode === on) return;
      buildMode = on;
      Object.assign(B, { ghost: null, picked: null, message: null, drag: null, path: null, wing: null });
      if (on) {
        sheet.close();
        selection.clear();
      } else selection.clear();
      debug?.log(`Build Mode ${on ? 'on' : 'off'}`);
    },

    enter() {
      active = true;
      const c = campaign();
      if (!c) return;
      const w = getWorld();
      if (w && w !== world) {
        const sameSlot = slotN === c.n;
        world = w;
        motion.clear();
        for (const it of [...selection.items]) selection.remove(it);
        for (const it of [...world.placed, ...world.people]) selection.add(it); // (props are decoration: never picked)
        slotN = c.n;
        if (!sameSlot) screen.viewSet = false; // the same slot reopened keeps its view
      }
      syncLayout();
      const was = palette;
      palette = paletteById(c.data.facility.palette);
      if (palette !== was) floorLayer.invalidate(); // the doormats are in the facility's colour
      screen.resize();
      if (!screen.viewSet) {
        screen.viewSet = true;
        resetView();
      }
    },
    exit() {
      active = false;
      gestures.reset();
      screen.setBuildMode(false);
      selection.clear();
      vfx?.clear();
    },
    resize() {
      camera.pixelScale = renderer.pixelScale;
      floorLayer.setPixelScale(floorScale()); // near the drawn size (see render)
      const cx = camera.x + camera.visibleW / 2;
      const cy = camera.y + camera.visibleH / 2;
      fitView();
      camera.centerOn(cx, cy);
    },
    update(dt) {
      world?.update(dt);
      updateMotion(dt);
    },
    onBack() {
      if (buildMode && B.ghost) B.ghost = null;
      else if (buildMode && B.wing) B.wing = null; // (Milestone 24)
      else if (buildMode && B.picked) {
        B.picked = null;
        selection.clear();
      } else if (buildMode) screen.setBuildMode(false);
      else onMenu();
      return true;
    },

    onDown(p) {
      B.downAt = { x: p.x, y: p.y }; // (Build Mode: a drag grabs the ghost where the finger went down)
      if (overSheet(p) || onUi(p)) return; // the bars, the banner and the sheet never pan or pinch the home
      gestures.down(p);
    },
    onUp(p) {
      gestures.up(p);
    },
    onDragStart(p) {
      // Build Mode: a drag that starts on the ghost moves it (a finger on the floor elsewhere still pans)
      const at = B.downAt ?? p;
      const c = buildMode && B.ghost ? cellAt(at.x, at.y) : null;
      const g = B.ghost;
      if (c && g) {
        const sz = sizeOf(g.defId);
        if (c.col >= g.col - 1 && c.col <= g.col + sz.w && c.row >= g.row - 1 && c.row <= g.row + sz.h) {
          B.drag = { dc: c.col - g.col, dr: c.row - g.row };
          return;
        }
      }
      gestures.dragStart(p);
    },
    onDrag(p) {
      if (B.drag && B.ghost) {
        const c = cellAt(p.x, p.y);
        if (c) {
          const col = c.col - B.drag.dc;
          const row = c.row - B.drag.dr;
          if (col !== B.ghost.col || row !== B.ghost.row) ghostAt(col, row);
        }
        return;
      }
      gestures.drag(p);
    },
    onDragEnd(p) {
      if (B.drag) {
        B.drag = null;
        return;
      }
      gestures.dragEnd(p);
    },
    onWheel(p) {
      gestures.wheel(p);
    },
    onTap(p) {
      if (!world || gestures.multiTouch) return;
      if (buildMode) {
        buildTap(p);
        taps.push({ x: p.x, y: p.y, picked: B.picked?.id ?? null, build: true });
        return;
      }
      if (topBar.handleTap(p)) {
        taps.push({ x: p.x, y: p.y, picked: 'topBar' });
        return;
      }
      if (bottomBar.handleTap(p)) {
        taps.push({ x: p.x, y: p.y, picked: 'bottomBar' });
        return;
      }
      if (hintShown() && hint.handleTap(p)) {
        taps.push({ x: p.x, y: p.y, picked: 'hint' });
        return;
      }
      if (onStaffWarning && staffWarnings().length && hitRect(p, warnRect())) {
        onStaffWarning();
        taps.push({ x: p.x, y: p.y, picked: 'staffWarning' });
        return;
      }
      const picked = pickAt(p.x, p.y);
      const t = performance.now() / 1000;
      if (picked && !isPerson(picked) && lastTap?.id === picked.id && t - lastTap.t < DOUBLE_TAP_SEC) jumpTo(picked);
      lastTap = picked ? { id: picked.id, t, x: p.x, y: p.y } : null;
      if (picked) open(picked);
      else selection.clear();
      taps.push({ x: p.x, y: p.y, picked: picked?.id ?? null });
      if (taps.length > 50) taps.shift();
    },
    // Long press on empty floor → Build Mode. On a person or a place it opens their sheet, like a tap.
    onHold(p) {
      if (!world || gestures.multiTouch || gestures.fingers > 1 || buildMode || onUi(p) || overSheet(p)) return;
      const picked = pickAt(p.x, p.y);
      if (picked) open(picked);
      else if (cellAt(p.x, p.y)) screen.setBuildMode(true);
    },

    render(ctx) {
      if (!world) return;
      ctx.fillStyle = palette.light;
      ctx.fillRect(0, 0, W, renderer.height);
      camera.apply(ctx);
      // The floor picture is kept near the size it is drawn (remade once when a pinch crosses a detail step), and only its
      // visible part is drawn: the whole picture every frame held a tablet to ~33 fps.
      floorLayer.setPixelScale(floorScale());
      floorLayer.renderView(ctx, { x: camera.x, y: camera.y, w: camera.visibleW, h: camera.visibleH }); // only what is on screen
      assets.detail = detailFor(camera.zoom); // sprites cached near the size they are drawn: sharp, and a plain copy each frame
      if (buildMode) drawBuildFloor(ctx);
      if (buildMode) drawWingEdges(ctx); // (Milestone 24)
      drawWalkPath(ctx); // (Milestone 17: the safe walking path — stepping stones; the loop being traced in Build Mode)
      if (buildMode) drawPicked(ctx);
      drawPersonShadows(ctx);
      drawSelectionMark(ctx);
      const items = [...world.placed, ...world.props, ...(world.decor ?? []), ...walls, ...shownPeople(), ...shownVisitors()].sort((a, b) => depthOf(a) - depthOf(b));
      const pictures = [];
      const people = [];
      for (const it of items) {
        if (it.kind === 'wall') drawWall(ctx, it);
        else if (it.kind === 'station' || it.kind === 'room') {
          const r = artRect(it);
          assets.draw(ctx, it.def.art, ...rectArgs(r));
          pictures.push(r);
          drawLevelMark(ctx, it); // (Milestone 25c: its level badge, a scaffold while it is being upgraded)
          if (it.kind === 'room') drawHeldMark(ctx, it, r); // (Milestone 27: a room held after a passing)
        } else if (it.kind === 'prop') drawProp(ctx, it);
        else {
          if (it.kind === 'visitor') drawVisitor(ctx, it);
          else drawPerson(ctx, it);
          people.push({ it, after: pictures.length });
        }
      }
      drawHidden(ctx, people, pictures);
      if (buildMode && B.ghost) drawGhost(ctx);
      assets.detail = 1;
      camera.restore(ctx);
      drawNight(ctx);
      // Name tags in screen space: always the small text size (28), whatever the zoom.
      if (pref('nameTags')) {
        layoutTags(ctx);
        for (const p of [...shownPeople(), ...shownVisitors()]) drawTag(ctx, p);
      }
      drawSiteSign(ctx); // (Milestone 24: a stage being built)
      if (pref('taskMarkers')) drawMarkers(ctx); // a status icon over each staff member (their task, resting, tired); the call bell over Arthur
      // The care pops, in the world but over the tags for their second or two (so a name never hides one).
      if (vfx) {
        camera.apply(ctx);
        vfx.render(ctx, 'world');
        camera.restore(ctx);
      }
      if (buildMode) drawBanner(ctx);
      else {
        drawInfo(ctx);
        const warned = drawStaffWarning(ctx);
        if (hintShown()) hint.render(ctx);
        const beatY = warned ? warnRect().y + warnRect().h + 14 : underInfo() + 14;
        dayBeat?.render(ctx, infoRect().x + 20, beatY, infoRect().w - 40);
        topBar.render(ctx);
        bottomBar.render(ctx);
      }
    },
  };

  const rectArgs = (r) => [r.x, r.y, r.w, r.h];

  // The time line (Milestone 5): "08:20 · Morning peak" (with "Paused" while paused) and the facility's name, on a slim
  // cream strip under the top bar.
  function drawInfo(ctx) {
    const clock = world.clock;
    const r = infoRect();
    ctx.save();
    ctx.fillStyle = 'rgba(255, 250, 240, 0.94)';
    ctx.strokeStyle = palette.hex;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(r.x, r.y, r.w, r.h, r.h / 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    const band = bandAt(world.hour);
    const time = `${clockText(world.hour)} · ${band.name}`;
    const left = clock.paused ? `Paused · ${time}` : time;
    text(ctx, left, r.x + 30, r.y + r.h / 2, { size: S.small, bold: true, color: clock.paused ? C.actionDark : C.text, baseline: 'middle', maxWidth: r.w * 0.6 });
    const f = campaign()?.data.facility;
    text(ctx, f?.name ?? '', r.x + r.w - 30, r.y + r.h / 2, { size: S.small, bold: true, color: palette.dark, align: 'right', baseline: 'middle', maxWidth: r.w * 0.36 });
  }
  // "Night shift starts short at 22:00 — tap to open the roster" (red), while any shift is short or about to be.
  function drawStaffWarning(ctx) {
    const warns = staffWarnings();
    if (!warns.length) return false;
    const a = warns[0];
    const name = { morning: 'Morning', afternoon: 'Afternoon', night: 'Night' }[a.shift] ?? a.shift;
    const r = warnRect();
    ctx.save();
    ctx.fillStyle = C.bad;
    ctx.strokeStyle = C.outline;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(r.x, r.y, r.w, r.h, 26);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    const head = a.running ? `${name} shift is running short-staffed` : `${name} shift starts short-staffed`;
    const more = warns.length > 1 ? ` (+${warns.length - 1} more)` : '';
    text(ctx, head + more, r.x + r.w / 2, r.y + 36, { size: S.small, bold: true, color: C.textOnDark, align: 'center', baseline: 'middle', maxWidth: r.w - 40 });
    text(ctx, `${a.reasons.join(' · ')} — tap for the roster`, r.x + r.w / 2, r.y + 78, { size: S.small, color: C.textOnDark, align: 'center', baseline: 'middle', maxWidth: r.w - 40 });
    return true;
  }
  // Night: the home dims a little (a soft blue veil over the world, not the bars).
  function drawNight(ctx) {
    const h = world.hour;
    const dark = h >= 21 || h < 5 ? 1 : h >= 19.5 ? (h - 19.5) / 1.5 : h < 6.5 ? 1 - (h - 5) / 1.5 : 0;
    if (dark <= 0) return;
    ctx.save();
    ctx.globalAlpha = dark * 0.22;
    ctx.fillStyle = '#23305A';
    ctx.fillRect(0, camera.viewY, W, camera.viewH);
    ctx.restore();
  }

  // --- drawing ---------------------------------------------------------------------------------------------------
  function patch(g, pts, fill, stroke = null, lw = 2) {
    isoPath(g, pts);
    g.fillStyle = fill;
    g.fill();
    if (stroke) {
      g.strokeStyle = stroke;
      g.lineWidth = lw;
      g.stroke();
    }
  }
  // Floor and the two outer walls (core/IsoRoom) with the wainscot, the timber floors, the lounge carpet, the hall
  // runner, windows with their daylight, doormats, and the soft shadows under the facilities and props — drawn once
  // into the cached layer.
  function drawFloor(g) {
    drawIsoRoom(g, iso, { cols: fCols, rows: fRows, wallH, look: L, bands: [{ from: 0, to: 0.07, color: L.skirting }, { from: 0.07, to: 0.36, color: L.wainscot }, { from: 0.36, to: 0.39, color: L.rail }] });
    g.lineJoin = 'round';
    // Milestone 10: the room floors come with the rooms (wherever they stand); the hall runs the whole floor
    const floors = [
      ...FLOORS.filter((f) => f.look !== 'room'),
      ...(world?.placed ?? []).filter((it) => it.kind === 'room').map((it) => ({ col: it.box.col + ROOM_SHAPE.floor.col, row: it.box.row + ROOM_SHAPE.floor.row, w: ROOM_SHAPE.floor.w, h: ROOM_SHAPE.floor.h, look: 'room' })),
    ];
    drawStageFloors(g); // (Milestone 24: S3–S5's finishes, the campus courtyards, the wings' zoning colours, the site)
    for (const f of floors) {
      const look = L.floors[f.look];
      if (!look) continue;
      for (let c = f.col; c < f.col + f.w; c++) {
        for (let r = f.row; r < f.row + f.h; r++) patch(g, iso.outline(c, r, 1, 1), (c + r) % 2 ? look.a : look.b, look.line, 1);
      }
    }
    // The foot of both outer walls in soft shade.
    patch(g, [iso.corner(0, 0), iso.corner(fCols, 0), iso.corner(fCols, 0.3), iso.corner(0.3, 0.3)], L.shadow);
    patch(g, [iso.corner(0, 0), iso.corner(0.3, 0.3), iso.corner(0.3, fRows), iso.corner(0, fRows)], L.shadow);
    // Windows, and the soft pool of daylight each one lays across the floor (light from the upper left).
    for (const w of WINDOWS) {
      patch(g, wallPatch(iso, w.side, w.from, w.to, 70, 185), L.window.frame, L.wallCap, 3);
      patch(g, wallPatch(iso, w.side, w.from + 0.12, w.to - 0.12, 80, 175), L.window.glass, L.wallLine, 1.5);
      patch(g, wallPatch(iso, w.side, w.from + 0.3, w.from + 0.55, 95, 165), L.window.shine);
      const a = iso.corner(0.05, w.from);
      const b = iso.corner(0.05, w.to);
      const grad = g.createLinearGradient(a.x, a.y, iso.corner(2.6, w.from).x, iso.corner(2.6, w.from).y);
      grad.addColorStop(0, L.daylight);
      grad.addColorStop(1, 'rgba(255, 246, 214, 0)');
      patch(g, [iso.corner(0.05, w.from), iso.corner(0.05, w.to), iso.corner(2.6, w.to + 0.9), iso.corner(2.6, w.from + 0.9)], grad);
    }
    // A doormat in every doorway, and at the front entrance (Milestone 6: new residents come in there).
    patch(g, iso.outline(ENTRANCE.col + 0.1, ENTRANCE.row + 0.1, 0.8, 0.8), palette.hex, L.wallCap, 2);
    for (const t of world?.layout.doorways() ?? []) patch(g, iso.outline(t.col + 0.12, t.row + 0.12, 0.76, 0.76), palette.hex, L.wallCap, 2);
    // Soft shadows under the facilities and props (the art has none): the footprint, a little inset, feathered.
    g.save();
    g.filter = 'blur(6px)';
    for (const it of [...(world?.placed ?? []), ...(world?.props ?? [])]) {
      if (it.kind === 'room') continue;
      const inset = it.kind === 'prop' ? 0.2 : 0.06;
      patch(g, iso.outline(it.fp.col + inset, it.fp.row + inset, it.fp.w - inset * 2, it.fp.h - inset * 2), L.softShadow);
    }
    g.restore();
  }
  // Milestone 24: each stage's own floor (a two-tone checker, a little brighter and calmer stage by stage — still a home),
  // the S5 garden courtyards (lawn and shrubs where no piece stands), each wing's soft zoning colour, and the building
  // site while a stage is being built (sandy ground, hatching, a dashed edge and cones).
  function drawStageFloors(g) {
    if (!world) return;
    const stage = world.layout.stage;
    const boxes = world.placed.map((it) => it.box);
    const free = (c, r, w, h) => !boxes.some((b) => c < b.col + b.w && b.col < c + w && r < b.row + b.h && b.row < r + h);
    for (const st of STAGES) {
      if (st.n > stage || !st.look) continue;
      const look = L.stageFloors[st.look];
      for (const z of zonesOf(st)) {
        for (let c = z.col; c < z.col + z.w; c++) for (let r = z.row; r < z.row + z.h; r++) patch(g, iso.outline(c, r, 1, 1), (c + r) % 2 ? look.a : look.b, look.line, 1);
        const cy = look.courtyard;
        if (!cy) continue;
        for (let r = z.row + 3; r + cy.h <= z.row + z.h; r += cy.every) {
          for (let c = z.col + 3; c + cy.w <= z.col + z.w; c += cy.every) {
            if (!free(c, r, cy.w, cy.h)) continue;
            for (let i = 0; i < cy.w; i++) for (let j = 0; j < cy.h; j++) patch(g, iso.outline(c + i, r + j, 1, 1), (i + j) % 2 ? look.lawn : look.lawnB);
            patch(g, iso.outline(c + 0.1, r + 0.1, cy.w - 0.2, cy.h - 0.2), 'rgba(0,0,0,0)', look.shrub, 3);
            for (const [dc, dr] of [[0.6, 0.6], [cy.w - 0.6, 0.7], [cy.w / 2, cy.h - 0.6]]) {
              const p = iso.cellCenter(c + dc - 0.5, r + dr - 0.5);
              g.fillStyle = look.shrub;
              g.beginPath();
              g.ellipse(p.x, p.y - 10, 34, 22, 0, 0, Math.PI * 2);
              g.fill();
            }
          }
        }
      }
    }
    // the wings' zoning colours (soft: Build Mode shows their edges more clearly)
    for (const w of WINGS_SPECIAL) for (const t of world.layout.wings.tilesOf(w.id)) patch(g, iso.outline(t.col, t.row, 1, 1), w.tint);
    // the building site
    for (const z of world.layout.siteZones()) {
      const S = L.site;
      patch(g, iso.outline(z.col, z.row, z.w, z.h), S.ground);
      g.save();
      isoPath(g, iso.outline(z.col, z.row, z.w, z.h));
      g.clip();
      g.strokeStyle = S.hatch;
      g.lineWidth = 6;
      for (let k = 0; k <= z.w + z.h; k += 2) {
        const a = iso.corner(z.col + Math.min(k, z.w), z.row + Math.max(0, k - z.w));
        const b = iso.corner(z.col + Math.max(0, k - z.h), z.row + Math.min(k, z.h));
        g.beginPath();
        g.moveTo(a.x, a.y);
        g.lineTo(b.x, b.y);
        g.stroke();
      }
      g.restore();
      g.save();
      g.setLineDash([22, 16]);
      patch(g, iso.outline(z.col, z.row, z.w, z.h), 'rgba(0,0,0,0)', S.line, 5);
      g.restore();
      for (const [c, r] of [[z.col + 0.5, z.row + 0.5], [z.col + z.w - 0.5, z.row + 0.5], [z.col + 0.5, z.row + z.h - 0.5], [z.col + z.w - 0.5, z.row + z.h - 0.5]]) drawCone(g, iso.cellCenter(c - 0.5, r - 0.5), S);
    }
  }
  function drawCone(g, p, S) {
    g.fillStyle = S.cone;
    g.strokeStyle = L.wallCap;
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(p.x - 22, p.y);
    g.lineTo(p.x, p.y - 62);
    g.lineTo(p.x + 22, p.y);
    g.closePath();
    g.fill();
    g.stroke();
    g.fillStyle = S.coneBand;
    g.fillRect(p.x - 11, p.y - 34, 22, 9);
  }
  // The site's sign (screen space, over the floor): "Building Stage 3 · 4 days left".
  function drawSiteSign(ctx) {
    const b = world.layout.building;
    if (!b) return;
    const z = world.layout.siteZones()[0];
    if (!z) return;
    const w = iso.cellCenter(z.col + z.w / 2, z.row + Math.min(z.h, 12) / 2);
    const s = camera.worldToScreen(w.x, w.y);
    if (s.y < camera.viewY || s.y > camera.viewY + camera.viewH || s.x < -200 || s.x > W + 200) return;
    const left = Math.max(0, b.doneDay - world.clock.totalDays);
    const label = `Building Stage ${b.to}: ${STAGES[b.to - 1].name} · ${left} day${left === 1 ? '' : 's'} left`;
    ctx.save();
    ctx.font = font(S.small, true);
    const tw = Math.min(W - 40, ctx.measureText(label).width + 48);
    ctx.fillStyle = 'rgba(255, 246, 228, 0.95)';
    ctx.strokeStyle = L.site.line;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(s.x - tw / 2, s.y - 34, tw, 68, 34);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    text(ctx, label, s.x, s.y, { size: S.small, bold: true, color: C.actionDark, align: 'center', baseline: 'middle', maxWidth: tw - 32 });
  }
  // Build Mode: each painted wing's edge (where it meets other floor), and the rectangle being painted.
  function drawWingEdges(ctx) {
    ctx.save();
    ctx.lineWidth = 4;
    for (const w of WINGS_SPECIAL) {
      const tiles = world.layout.wings.tilesOf(w.id);
      if (!tiles.length) continue;
      const set = new Set(tiles.map((t) => `${t.col},${t.row}`));
      ctx.strokeStyle = w.line;
      ctx.beginPath();
      for (const t of tiles) {
        if (!onScreenCell(t.col, t.row)) continue;
        const edge = (a, b) => {
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
        };
        if (!set.has(`${t.col},${t.row - 1}`)) edge(iso.corner(t.col, t.row), iso.corner(t.col + 1, t.row));
        if (!set.has(`${t.col},${t.row + 1}`)) edge(iso.corner(t.col, t.row + 1), iso.corner(t.col + 1, t.row + 1));
        if (!set.has(`${t.col - 1},${t.row}`)) edge(iso.corner(t.col, t.row), iso.corner(t.col, t.row + 1));
        if (!set.has(`${t.col + 1},${t.row}`)) edge(iso.corner(t.col + 1, t.row), iso.corner(t.col + 1, t.row + 1));
      }
      ctx.stroke();
    }
    const P = B.wing;
    if (P?.from) {
      const to = P.hover ?? P.from;
      const c0 = Math.min(P.from.col, to.col);
      const r0 = Math.min(P.from.row, to.row);
      isoPath(ctx, iso.outline(c0, r0, Math.abs(to.col - P.from.col) + 1, Math.abs(to.row - P.from.row) + 1));
      ctx.fillStyle = P.erase ? 'rgba(214, 64, 52, 0.25)' : 'rgba(242, 181, 48, 0.35)';
      ctx.fill();
      ctx.strokeStyle = P.erase ? '#B3261E' : '#8A5A00';
      ctx.stroke();
    }
    ctx.restore();
  }
  // Is a tile's middle anywhere near the view (Build Mode draws only those: an S5 floor is 5,760 tiles)?
  function onScreenCell(c, r) {
    const p = iso.cellCenter(c, r);
    return p.x > camera.x - HW * 2 && p.x < camera.x + camera.visibleW + HW * 2 && p.y > camera.y - HH * 2 && p.y < camera.y + camera.visibleH + HH * 2;
  }
  // A soft shadow at each person's feet — it stays on the floor while they hop, so the hop reads as a hop.
  function drawPersonShadows(ctx) {
    ctx.save();
    ctx.fillStyle = L.personShadow;
    for (const p of [...shownPeople(), ...shownVisitors()]) {
      const f = feetOf(p);
      ctx.beginPath();
      ctx.ellipse(f.x, f.y - 4, 40, 15, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  function drawProp(ctx, it) {
    const r = artRect(it);
    if (!it.def.flip) return void assets.draw(ctx, it.def.art, r.x, r.y, r.w, r.h);
    ctx.save();
    ctx.translate(r.x + r.w / 2, 0);
    ctx.scale(-1, 1);
    assets.draw(ctx, it.def.art, -r.w / 2, r.y, r.w, r.h);
    ctx.restore();
  }
  // A person with their pose (core/CharacterMotion): hop + sway walking, a gentle lean helping, breathing otherwise.
  function drawPerson(ctx, p) {
    const m = motionOf(p);
    poseAgent.state = stateOf(p);
    poseAgent.facing = m.flip;
    const t = poseAgent.state === 'walking' ? m.stride / (MOTION.stride * WALK.speedMultiplier) : animT; // (Milestone 14: longer hops at 5× speed)
    characterPose(poseAgent, t, m.seed, pose, p.kind === 'resident' ? MOTION.resident : MOTION.staff);
    if (lowFx()) {
      // (Milestone 25c: Low graphics — simpler figures: no sway or breathing, just a small hop while walking)
      pose.tilt = 0;
      if (poseAgent.state !== 'walking') pose.bob = 0;
    }
    const f = feetOf(p);
    const r = personRect(p);
    // Milestone 15: pushing the Hydration Cart on a drinks round, the dining trolley to a tray (beside them, the way they
    // face, while they walk; at the resident's side it waits out of the way)
    const cart = p.kind === 'staff' && poseAgent.state === 'walking' ? world.trolleyOf?.(p) : null;
    const ch = PERSON.height * 0.52;
    const cw = cart ? ch * assets.aspect(cart) : 0;
    const cx = f.x + (m.flip ? -1 : 1) * r.w * 0.58 - cw / 2;
    // Milestone 16: a resident's walking frame or wheelchair beside them where they sit
    const aid = p.kind === 'resident' && poseAgent.state !== 'walking' ? world.aidPropOf?.(p) : null;
    const ah = PERSON.height * 0.42;
    const aw = aid ? ah * assets.aspect(aid) : 0;
    const ax = f.x + (m.flip ? 1 : -1) * r.w * 0.5 - aw / 2;
    if (aid) assets.draw(ctx, aid, ax, f.y - ah, aw, ah);
    if (p.kind === 'staff' && p.model?.tier === 'divine') drawGodGlow(ctx, f.x, f.y - r.h * 0.5, r.h * 0.62); // (Milestone 30b: a Works God's small gold glow)
    drawCharacter(ctx, assets, p.art, f.x, f.y, r.w, r.h, pose);
    if (cart) assets.draw(ctx, cart, cx, f.y - ch, cw, ch);
  }
  // Milestone 19: a visitor — a plain code-drawn figure (legs, an outdoor coat, a head with hair, a small bag), a little
  // shorter than the art people so the name tag reads it; the same hop as everyone while walking.
  const visitorRect = (x) => {
    const f = feetOf(x);
    const h = PERSON.height * 0.82;
    return { x: f.x - h * 0.2, y: f.y - h, w: h * 0.4, h };
  };
  const pickOf = (list, id) => {
    let n = 0;
    for (const ch of id) n = (n * 31 + ch.charCodeAt(0)) >>> 0;
    return list[n % list.length];
  };
  function drawVisitor(ctx, x) {
    const m = motionOf(x);
    const walking = x.agent.state === 'walking';
    const t = walking ? m.stride / (MOTION.stride * WALK.speedMultiplier) : animT;
    const bob = walking ? Math.abs(Math.sin(t * Math.PI)) * MOTION.staff.walkBobPx * 1.2 : Math.sin(animT * Math.PI * 2 * MOTION.resident.idleBreathPerSec) * MOTION.resident.idleBreathPx;
    const f = feetOf(x);
    const H = PERSON.height * 0.82;
    const cx = f.x;
    const y = f.y - bob;
    const L = VISITOR_LOOK;
    ctx.save();
    ctx.lineWidth = 3;
    ctx.strokeStyle = C.outline;
    // legs (a small stride while walking)
    const step = walking ? Math.sin(t * Math.PI) * H * 0.04 : 0;
    ctx.fillStyle = L.legs;
    for (const [dx, s] of [[-H * 0.07, step], [H * 0.02, -step]]) {
      ctx.beginPath();
      ctx.roundRect(cx + dx + s, y - H * 0.3, H * 0.075, H * 0.3, H * 0.03);
      ctx.fill();
      ctx.stroke();
    }
    // the coat
    ctx.fillStyle = pickOf(L.coats, x.id);
    ctx.beginPath();
    ctx.roundRect(cx - H * 0.16, y - H * 0.68, H * 0.32, H * 0.42, H * 0.09);
    ctx.fill();
    ctx.stroke();
    // a small bag on one side (the way they face)
    const side = m.flip >= 0 ? 1 : -1;
    ctx.fillStyle = L.bag;
    ctx.beginPath();
    ctx.roundRect(cx + side * H * 0.15 - H * 0.05, y - H * 0.42, H * 0.1, H * 0.1, H * 0.02);
    ctx.fill();
    ctx.stroke();
    // head and hair
    ctx.fillStyle = pickOf(L.skin, `${x.id}s`);
    ctx.beginPath();
    ctx.arc(cx, y - H * 0.82, H * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = pickOf(L.hair, `${x.id}h`);
    ctx.beginPath();
    ctx.arc(cx, y - H * 0.845, H * 0.155, Math.PI * 1.02, Math.PI * 1.98);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  // Milestone 25b: a room or facility picture paints tall walls, so it can stand in front of someone (a resident in their
  // room behind the next room, a carer in the corridor behind a facility). Anyone a later picture overlaps shows faintly
  // through it, so nobody disappears from the home.
  function drawHidden(ctx, people, pictures) {
    const over = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    ctx.save();
    ctx.globalAlpha = 0.4;
    for (const { it, after } of people) {
      const body = it.kind === 'visitor' ? visitorRect(it) : tapRect(it);
      let hidden = false;
      for (let i = after; i < pictures.length && !hidden; i++) hidden = over(body, pictures[i]);
      if (!hidden) continue;
      if (it.kind === 'visitor') drawVisitor(ctx, it);
      else drawPerson(ctx, it);
    }
    ctx.restore();
  }
  // Milestone 25c: a piece's level — a small code-drawn badge (II / III) at the front corner of its floor, and while an
  // upgrade is under way a little scaffold (two poles, two boards) beside it. Level I shows nothing.
  const ROMAN = ['I', 'II', 'III'];
  // Milestone 27: for the few days a room is held after a passing, its light is softly dimmed and a small Memorial Glow
  // rests over it (restrained: no text, no flashing).
  function drawHeldMark(ctx, it, r) {
    if (!world.endOfLife?.heldUntil(it.id)) return;
    const fp = it.fp;
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = '#2B2440';
    isoPath(ctx, iso.outline(fp.col, fp.row, fp.w, fp.h));
    ctx.fill();
    ctx.globalAlpha = 0.5 + 0.15 * Math.sin(performance.now() / 1400);
    const sz = Math.min(r.w, r.h) * 0.42;
    assets.draw(ctx, MEMORIAL_GLOW, r.x + r.w / 2 - sz / 2, r.y + r.h * 0.18, sz, sz);
    ctx.restore();
  }
  function drawLevelMark(ctx, it) {
    const lv = world.build?.levelOf?.(it.uid) ?? 1;
    const pending = world.build?.upgradePending?.(it.uid) ?? null;
    if (lv <= 1 && !pending) return;
    const fp = it.fp;
    const tip = iso.corner(fp.col + fp.w, fp.row + fp.h);
    ctx.save();
    if (pending) {
      const l = iso.corner(fp.col, fp.row + fp.h);
      const x0 = l.x + (tip.x - l.x) * 0.25;
      const y0 = l.y + (tip.y - l.y) * 0.25;
      const H = 150;
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#B8875A';
      for (const dx of [0, 70]) {
        ctx.beginPath();
        ctx.moveTo(x0 + dx, y0 + dx * 0.55);
        ctx.lineTo(x0 + dx, y0 + dx * 0.55 - H);
        ctx.stroke();
      }
      ctx.strokeStyle = '#E2B04A';
      ctx.lineWidth = 9;
      for (const h of [0.45, 0.85]) {
        ctx.beginPath();
        ctx.moveTo(x0 - 6, y0 - H * h);
        ctx.lineTo(x0 + 76, y0 + 38 - H * h);
        ctx.stroke();
      }
    }
    if (lv > 1) {
      const R = 30;
      const cx = tip.x;
      const cy = tip.y - 26;
      ctx.fillStyle = lv >= 3 ? '#F2B233' : '#1597BF';
      ctx.strokeStyle = C.outline;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cx, cy - R);
      ctx.lineTo(cx + R * 0.9, cy - R * 0.45);
      ctx.lineTo(cx + R * 0.75, cy + R * 0.6);
      ctx.lineTo(cx, cy + R);
      ctx.lineTo(cx - R * 0.75, cy + R * 0.6);
      ctx.lineTo(cx - R * 0.9, cy - R * 0.45);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = font(26, true);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ROMAN[lv - 1], cx, cy + 2);
    }
    ctx.restore();
  }
  // An inside wall: a low slab through the middle of its tile (two front faces and the top).
  function drawWall(ctx, t) {
    const h = innerWallH;
    const [x0, x1, y0, y1] = t.dir === 'row' ? [t.col, t.col + 1, t.row + 0.5 - WALL_T / 2, t.row + 0.5 + WALL_T / 2] : [t.col + 0.5 - WALL_T / 2, t.col + 0.5 + WALL_T / 2, t.row, t.row + 1];
    const P = (c, r, up = 0) => {
      const p = iso.corner(c, r);
      return { x: p.x, y: p.y - up };
    };
    const face = (pts, fill) => {
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = L.innerWall.line;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    };
    ctx.save();
    ctx.lineJoin = 'round';
    face([P(x0, y1), P(x1, y1), P(x1, y1, h), P(x0, y1, h)], L.innerWall.front); // the face towards the lower left
    face([P(x1, y0), P(x1, y1), P(x1, y1, h), P(x1, y0, h)], L.innerWall.side); // the face towards the lower right
    face([P(x0, y0, h), P(x1, y0, h), P(x1, y1, h), P(x0, y1, h)], L.innerWall.top);
    ctx.restore();
  }
  function drawSelectionMark(ctx) {
    const it = selection.selected;
    if (!it) return;
    ctx.save();
    ctx.strokeStyle = C.progress;
    ctx.lineWidth = 6;
    if (isPerson(it)) {
      const f = feetOf(it);
      ctx.beginPath();
      ctx.ellipse(f.x, f.y, HW * 0.55, HH * 0.55, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      isoPath(ctx, iso.outline(it.fp.col, it.fp.row, it.fp.w, it.fp.h));
      ctx.stroke();
    }
    ctx.restore();
  }
  // Milestone 17: the safe walking path — soft stepping stones on its tiles (clearer in Build Mode), and the loop being
  // traced in amber.
  function drawWalkPath(ctx) {
    const saved = world.walkPath?.tiles ?? [];
    const editing = B.path?.tiles ?? null;
    if (!saved.length && !editing) return;
    ctx.save();
    const stone = (t, fill, stroke, k) => {
      const c = iso.cellCenter(t.col, t.row);
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, iso.halfW * 0.36 * k, iso.halfH * 0.36 * k, 0, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    };
    if (!editing) for (const t of saved) stone(t, buildMode ? 'rgba(84, 150, 96, 0.75)' : 'rgba(120, 170, 120, 0.45)', buildMode ? '#3F7A4A' : null, buildMode ? 1.3 : 1);
    if (editing) {
      for (const t of editing) {
        isoPath(ctx, iso.outline(t.col, t.row, 1, 1));
        ctx.fillStyle = 'rgba(242, 181, 48, 0.45)';
        ctx.fill();
      }
      if (editing.length) stone(editing[0], '#F2B530', '#8A5A00', 1.5);
    }
    ctx.restore();
  }
  function drawBuildFloor(ctx) {
    ctx.save();
    ctx.lineWidth = 1.5;
    world.grid.forEachTile((c, r) => {
      if (world.grid.isBlocked(c, r) || c >= fCols || r >= fRows || !onScreenCell(c, r)) return; // (Milestone 24: only what is on screen)
      isoPath(ctx, iso.outline(c, r, 1, 1));
      ctx.fillStyle = L.buildTint;
      ctx.fill();
      ctx.strokeStyle = L.buildLine;
      ctx.stroke();
    });
    ctx.restore();
  }
  // Name tags: a fixed size on screen at every zoom (text 28). When people stand close their tags stack upwards instead
  // of covering each other (the person nearest the viewer keeps theirs just over their head).
  const TAG_H = 48;
  const tags = new Map(); // id → { x, y, w } this frame
  function layoutTags(ctx) {
    tags.clear();
    ctx.save();
    ctx.font = font(PERSON.tagSize, true);
    const list = [...shownPeople(), ...shownVisitors()].map((p) => {
      const r = p.kind === 'visitor' ? visitorRect(p) : personRect(p);
      const s = camera.worldToScreen(r.x + r.w / 2, r.y + r.h * 0.02);
      const w = ctx.measureText(p.name.split(' ')[0]).width + 36;
      return { id: p.id, x: s.x - w / 2, y: s.y - TAG_H - 6, w };
    });
    ctx.restore();
    list.sort((a, b) => b.y - a.y);
    const placed = [];
    for (const t of list) {
      for (let n = 0; n < 6; n++) {
        const hit = placed.find((o) => t.x < o.x + o.w + 4 && o.x < t.x + t.w + 4 && t.y < o.y + TAG_H + 4 && o.y < t.y + TAG_H + 4);
        if (!hit) break;
        t.y = hit.y - TAG_H - 6;
      }
      placed.push(t);
      tags.set(t.id, t);
    }
  }
  function drawTag(ctx, p) {
    const t = tags.get(p.id);
    if (!t || t.y + TAG_H < camera.viewY || t.y > camera.viewY + camera.viewH) return;
    const label = p.name.split(' ')[0];
    const { x, y, w } = t;
    const s = { x: x + w / 2 };
    ctx.save();
    ctx.font = font(PERSON.tagSize, true);
    ctx.fillStyle = p.kind === 'resident' ? '#FFFFFF' : p.kind === 'visitor' ? VISITOR_LOOK.tag : palette.hex; // (Milestone 19: a visitor's cream tag)
    ctx.strokeStyle = C.outline;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(x, y, w, TAG_H, TAG_H / 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = p.kind === 'resident' || p.kind === 'visitor' ? C.text : '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, s.x, y + TAG_H / 2 + 1);
    ctx.restore();
  }
  // A small status icon over each staff member's head (Milestone 4's task markers; Milestone 5 adds resting and tired)
  // and the bell over a resident whose call bell is ringing. Screen space, above the name tag, the same size at any zoom.
  const MARK_R = 34;
  let markT = 0;
  function markerAt(p) {
    const r = personRect(p);
    const s = camera.worldToScreen(r.x + r.w / 2, r.y + r.h * 0.02);
    const tagY = tags.get(p.id)?.y ?? s.y - TAG_H - 6;
    return { x: s.x, y: tagY - 12 - MARK_R * 1.35 };
  }
  const statusIcon = (p) => {
    const t = world.taskOf(p);
    if (t) return { icon: TASK_TYPES[t.type].icon, ring: t.status === 'working' ? C.good : C.outline };
    if (p.model.status.tired) return { icon: 'tired', ring: C.warn };
    if (p.mode === 'resting') return { icon: 'rest', ring: C.progress };
    return null;
  };
  function drawMarkers(ctx) {
    markT = performance.now() / 1000;
    const onScreen = (m) => m.y > camera.viewY - MARK_R && m.y < camera.viewY + camera.viewH;
    for (const p of world.staff) {
      const st = statusIcon(p);
      if (!st) continue;
      const m = markerAt(p);
      if (onScreen(m)) drawTaskMarker(ctx, m.x, m.y, MARK_R, st.icon, { ring: st.ring });
    }
    for (const r of world.residents) {
      if (!world.bellFor(r.id)) continue;
      const m = markerAt(r);
      if (onScreen(m)) drawBellMarker(ctx, m.x, m.y, MARK_R * 1.15, markT);
    }
    // Milestone 18: an alert's plain word over the resident (code-drawn; above the bell when both show)
    for (const r of world.residents) {
      const word = world.clinical?.wordOf(r.id);
      if (!word || world.hiddenPerson?.(r)) continue;
      const m = markerAt(r);
      const y = m.y - (world.bellFor(r.id) ? MARK_R * 2.9 : 0);
      if (onScreen({ y })) drawAlertWord(ctx, m.x, y, word);
    }
  }
  // "unwell" in a soft red bubble with a small ! badge, pulsing gently; the same size at any zoom.
  function drawAlertWord(ctx, x, y, word) {
    ctx.save();
    ctx.font = font(PERSON.tagSize, true);
    const h = MARK_R * 1.6;
    const w = ctx.measureText(word).width + h * 1.25;
    const pulse = 0.5 + 0.5 * Math.sin(markT * 4);
    ctx.fillStyle = `rgba(224, 100, 90, ${0.18 + 0.14 * pulse})`;
    ctx.beginPath();
    ctx.roundRect(x - w / 2 - 8, y - h / 2 - 8, w + 16, h + 16, (h + 16) / 2);
    ctx.fill();
    ctx.fillStyle = '#FFF4F1';
    ctx.strokeStyle = '#C0392B';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y - h / 2, w, h, h / 2);
    ctx.fill();
    ctx.stroke();
    const bx = x - w / 2 + h / 2;
    ctx.fillStyle = '#E0645A';
    ctx.beginPath();
    ctx.arc(bx, y, h * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', bx, y + 1);
    ctx.fillStyle = '#8E2A20';
    ctx.textAlign = 'left';
    ctx.fillText(word, bx + h * 0.48, y + 1);
    ctx.restore();
  }
  screen.alertWordAt = (id) => (world?.clinical?.wordOf(id) ? markerAt(world.byId(id)) : null); // (tests)
  // Where a person's marker is drawn, and which status icon they show (tests).
  screen.markerPoint = (id) => markerAt(world.byId(id));
  screen.statusIconOf = (id) => statusIcon(world.byId(id))?.icon ?? null;
  screen.poseStateOf = (id) => stateOf(world.byId(id));
  screen.jumpTo = (id) => world && jumpTo(world.byId(id)); // (Milestone 11: what a double-tap does)
  // The second tap of a double-tap may land on the sheet the first one opened: main asks here first.
  screen.doubleTap = (p) => {
    const t = performance.now() / 1000;
    if (!world || !active || buildMode || !lastTap || t - lastTap.t >= DOUBLE_TAP_SEC || Math.hypot(p.x - lastTap.x, p.y - lastTap.y) > 60) return false;
    const it = world.byId(lastTap.id);
    lastTap = null;
    if (!it || isPerson(it)) return false;
    jumpTo(it);
    return true;
  };

  // --- Build Mode (Milestone 10) ---------------------------------------------------------------------------------------
  // ghost: { defId, uid (a piece being moved) | null (a new one), col, row, res (the check: { ok, reason }) }
  // picked: the placed piece tapped (Move / Sell); message: the last result line
  // path (Milestone 17): the walking path being traced — { tiles: [{ col, row }] } — or null
  // wing (Milestone 24): the wing being painted — { id, erase, from (the first corner tapped) } — or null
  const B = { ghost: null, picked: null, message: null, drag: null, path: null, wing: null };
  const sizeOf = (defId) => {
    const r = roomById(defId);
    const f = r ? null : facilityById(defId);
    return r ? { w: ROOM_SHAPE.w, h: ROOM_SHAPE.h } : { w: f.w, h: f.h };
  };
  const nameOf = (defId) => (roomById(defId) ?? facilityById(defId)).name;
  const pieceAtCell = (c) => (c ? world.placed.find((it) => c.col >= it.box.col && c.col < it.box.col + it.box.w && c.row >= it.box.row && c.row < it.box.row + it.box.h) ?? null : null);
  function ghostAt(col, row) {
    const g = B.ghost;
    g.col = col;
    g.row = row;
    g.res = world.build.check(g.defId, col, row, g.uid);
  }
  // The middle of the home's view, as a tile (a new piece starts at the nearest valid spot to it).
  const viewCell = () => cellAt(W / 2, camera.viewY + camera.viewH / 2) ?? { col: Math.floor(fCols / 2), row: Math.floor(fRows / 2) };
  screen.startPlacing = (defId) => {
    if (!world) return;
    screen.setBuildMode(true);
    const sz = sizeOf(defId);
    const c = viewCell();
    const near = { col: c.col - Math.floor(sz.w / 2), row: c.row - Math.floor(sz.h / 2) };
    const at = world.build.findSpot(defId, near) ?? near;
    B.picked = null;
    selection.clear();
    B.message = null;
    B.ghost = { defId, uid: null };
    ghostAt(at.col, at.row);
  };
  screen.startMove = (item) => {
    if (!world || !item) return;
    B.ghost = { defId: item.defId, uid: item.uid };
    ghostAt(item.box.col, item.box.row);
    B.picked = null;
    selection.clear();
  };
  screen.ghostTo = (col, row) => B.ghost && ghostAt(col, row); // (tests)
  screen.pick = (item) => {
    B.picked = item;
    if (item) selection.select(item);
    else selection.clear();
  };
  Object.defineProperty(screen, 'build', { get: () => B });
  function confirmGhost() {
    const g = B.ghost;
    if (!g) return;
    const r = g.uid == null ? world.build.place(g.defId, g.col, g.row) : world.build.move(g.uid, g.col, g.row);
    if (!r.ok) {
      g.res = r;
      return;
    }
    B.ghost = null;
    B.message = { text: g.uid == null ? `Built: ${nameOf(g.defId)} (−${r.cost.toLocaleString('en-GB')} Credits)` : `Moved: ${nameOf(g.defId)}`, good: true };
    debug?.log(B.message.text);
  }
  // The banner's buttons for the state it is in.
  function bannerButtons() {
    let list;
    if (B.ghost) {
      const ok = !!B.ghost.res?.ok;
      const cost = B.ghost.uid == null ? world?.layout.costOf(B.ghost.defId) : 0;
      list = [
        { id: 'place', label: cost ? `Place · ${cost.toLocaleString('en-GB')}` : 'Place here', accent: C.good, disabled: !ok, onTap: () => confirmGhost() },
        { id: 'cancel', label: 'Cancel', accent: C.progress, onTap: () => (B.ghost = null) },
      ];
    } else if (B.picked) {
      const it = B.picked;
      const can = world.build.canSell(it.uid);
      list = [
        { id: 'move', label: 'Move', accent: C.progress, onTap: () => screen.startMove(it) },
        { id: 'sell', label: can.ok ? `Sell · +${can.refund.toLocaleString('en-GB')}` : 'Sell', accent: C.bad, disabled: !can.ok, onTap: () => onSell?.(it) },
        { id: 'done', label: 'Done', accent: C.good, onTap: () => screen.setBuildMode(false) },
      ];
    } else if (B.wing) {
      // Milestone 24: painting a wing — two taps mark a rectangle's corners
      const P = B.wing;
      list = [
        { id: 'wingMode', label: P.erase ? 'Clearing' : 'Painting', accent: P.erase ? C.bad : C.good, onTap: () => Object.assign(P, { erase: !P.erase, from: null }) },
        { id: 'wingOther', label: 'Wings', accent: C.progress, onTap: () => onWings?.() },
        { id: 'done', label: 'Done', accent: C.good, onTap: () => (B.wing = null) },
      ];
    } else if (B.path) {
      // Milestone 17: tracing the safe walking path
      const n = B.path.tiles.length;
      list = [
        { id: 'pathSave', label: 'Save loop', accent: C.good, disabled: n < 3, onTap: () => savePath() },
        { id: 'pathUndo', label: 'Undo', accent: C.progress, disabled: !n, onTap: () => B.path.tiles.splice(Math.max(0, n - (B.path.legs?.pop() ?? 1))) },
        { id: 'pathClear', label: world.walkPath ? 'Remove path' : 'Clear', accent: C.bad, onTap: () => clearPath() },
        { id: 'cancel', label: 'Cancel', accent: C.progress, onTap: () => (B.path = null) },
      ];
    } else {
      list = [
        { id: 'shop', label: 'Build', accent: C.action, onTap: () => onShop?.() },
        { id: 'walkpath', label: 'Walking path', accent: C.progress, onTap: () => (B.path = { tiles: [], legs: [] }) }, // (Milestone 17)
        { id: 'wings', label: 'Wings', accent: C.progress, disabled: world.layout.stage < 3, onTap: () => onWings?.() }, // (Milestone 24: from Stage 3)
        { id: 'done', label: 'Done', accent: C.good, onTap: () => screen.setBuildMode(false) },
      ];
    }
    const rects = bannerButtonRects(list.length);
    return list.map((x, i) => ({ ...x, rect: rects[i] }));
  }
  function bannerLine() {
    if (B.wing) {
      if (B.message) return { text: B.message.text, color: B.message.good ? '#9BE7A4' : '#FFB3A8' };
      const w = wingById(B.wing.id);
      const n = world.layout.wings.count(w.id);
      const hub = world.layout.wings.hubOf(w.id);
      const how = B.wing.from ? 'now tap the opposite corner' : `tap one corner, then the opposite one, to ${B.wing.erase ? 'clear' : 'paint'} floor`;
      return { text: `${how} · ${n} tiles · ${hub ? `hub: ${hub.name}` : `needs its hub inside: ${w.hubs.map((id) => facilityById(id).name).join(' or ')}`}`, color: C.textOnDark };
    }
    if (B.path) {
      if (B.message) return { text: B.message.text, color: B.message.good ? '#9BE7A4' : '#FFB3A8' };
      const n = B.path.tiles.length;
      return { text: n ? `Walking path: ${n} tiles · tap more floor to carry the loop on, then Save loop (it joins back to the start)` : 'Walking path: tap the floor to trace a loop residents can walk calmly (a Memory Garden is ideal)', color: C.textOnDark };
    }
    if (B.ghost) {
      const g = B.ghost;
      if (g.res?.ok) return { text: g.uid == null ? `${nameOf(g.defId)}: fits here. Drag it or tap the floor, then Place.` : `${nameOf(g.defId)}: fits here. Place here to move it.`, color: '#9BE7A4' };
      return { text: g.res?.reason ?? '', color: '#FFB3A8' };
    }
    if (B.picked) {
      const it = B.picked;
      if (!world.placed.includes(it)) return { text: '', color: C.textOnDark };
      const who = it.residentId ? world.byId(it.residentId)?.name : null;
      const room = it.kind === 'room' ? ` · Room ${world.roomNumber(it.id)}${who ? ` · ${who}` : ' · empty'}` : '';
      const can = world.build.canSell(it.uid);
      return { text: `${it.def.name}${room}${can.ok ? '' : ` — ${can.reason}`}`, color: C.textOnDark };
    }
    if (B.message) return { text: B.message.text, color: B.message.good ? '#9BE7A4' : '#FFB3A8' };
    return { text: `Tap a room or facility to move or sell it · Build for more · ${world.rooms.length} of ${world.stage.capacity} rooms (Stage ${world.stage.n})`, color: C.textOnDark };
  }
  function buildTap(p) {
    for (const b of bannerButtons()) {
      if (!hitRect(p, b.rect)) continue;
      if (!b.disabled) b.onTap();
      return;
    }
    if (hitRect(p, bannerRect())) return;
    const c = cellAt(p.x, p.y);
    if (B.wing) return wingTap(c); // (Milestone 24)
    if (B.path) return pathTap(c); // (Milestone 17)
    if (B.ghost) {
      if (!c) return;
      const sz = sizeOf(B.ghost.defId);
      ghostAt(c.col - Math.floor(sz.w / 2), c.row - Math.floor(sz.h / 2));
      return;
    }
    B.message = null;
    screen.pick(pieceAtCell(c));
  }
  // Milestone 17: tracing the walking path — each tap joins the new tile to the last by the shortest open way.
  const openCell = (c) => !!c && !world.grid.isBlocked(c.col, c.row) && world.layout.isOpen(c.col, c.row);
  function pathTap(c) {
    B.message = null;
    if (!openCell(c)) {
      B.message = { text: 'The path must stay on open floor', good: false };
      return;
    }
    const tiles = B.path.tiles;
    if (!tiles.length) {
      tiles.push({ col: c.col, row: c.row });
      B.path.legs.push(1);
      return;
    }
    const last = tiles[tiles.length - 1];
    const leg = findPath(world.grid, last, c) ?? [];
    const add = leg.filter((t) => !(t.col === last.col && t.row === last.row));
    if (!add.length) return;
    tiles.push(...add.map((t) => ({ col: t.col, row: t.row })));
    B.path.legs.push(add.length);
  }
  function savePath() {
    const tiles = B.path.tiles;
    const last = tiles[tiles.length - 1];
    const back = (findPath(world.grid, last, tiles[0]) ?? []).filter((t) => !(t.col === tiles[0].col && t.row === tiles[0].row) && !(t.col === last.col && t.row === last.row));
    const loop = [...tiles, ...back.map((t) => ({ col: t.col, row: t.row }))];
    const r = world.setWalkPath(loop);
    if (!r.ok) {
      B.message = { text: r.reason, good: false };
      return;
    }
    B.path = null;
    B.message = { text: `Walking path saved: ${loop.length} tiles`, good: true };
    debug?.log(B.message.text);
  }
  function clearPath() {
    if (B.path.tiles.length) {
      B.path = { tiles: [], legs: [] };
      return;
    }
    world.setWalkPath(null);
    B.path = null;
    B.message = { text: 'Walking path removed', good: true };
  }
  // Milestone 24: painting a wing — the first tap marks a corner, the second paints (or clears) the rectangle.
  function wingTap(c) {
    B.message = null;
    if (!c) return;
    const P = B.wing;
    if (!P.from) {
      P.from = c;
      P.hover = c;
      return;
    }
    const rect = { col: Math.min(P.from.col, c.col), row: Math.min(P.from.row, c.row), w: Math.abs(c.col - P.from.col) + 1, h: Math.abs(c.row - P.from.row) + 1 };
    P.from = null;
    const r = world.build.paintWing(P.id, rect, !P.erase);
    B.message = r.ok ? { text: `${wingById(P.id).name}: ${P.erase ? 'cleared' : 'painted'} ${r.changed} tiles${r.taken ? ` (${r.taken} belong to another wing)` : ''}`, good: true } : { text: r.reason, good: false };
    debug?.log(B.message.text);
  }
  screen.startWingPaint = (id) => {
    if (!world) return;
    screen.setBuildMode(true);
    B.ghost = null;
    B.picked = null;
    B.path = null;
    B.message = null;
    B.wing = { id, erase: false, from: null, hover: null };
  };
  screen.wingTapForTests = (col, row) => wingTap({ col, row });
  screen.pathTapForTests = (col, row) => pathTap({ col, row });
  screen.pathForTests = () => B.path?.tiles ?? null;
  screen.bannerButtonsForTests = () => (buildMode ? bannerButtons().map((x) => ({ id: x.id, label: x.label, disabled: !!x.disabled, rect: x.rect })) : []);
  function drawPicked(ctx) {
    const it = B.picked;
    if (!it || B.ghost) return;
    ctx.save();
    ctx.strokeStyle = C.progress;
    ctx.lineWidth = 6;
    isoPath(ctx, iso.outline(it.box.col, it.box.row, it.box.w, it.box.h));
    ctx.stroke();
    ctx.restore();
  }
  // The ghost: its footprint green (it fits) or red (it doesn't), and its picture faded on top.
  function drawGhost(ctx) {
    const g = B.ghost;
    const sz = sizeOf(g.defId);
    const ok = !!g.res?.ok;
    ctx.save();
    isoPath(ctx, iso.outline(g.col, g.row, sz.w, sz.h));
    ctx.fillStyle = ok ? 'rgba(46, 170, 90, 0.35)' : 'rgba(214, 64, 52, 0.35)';
    ctx.fill();
    ctx.strokeStyle = ok ? '#1F8A4C' : '#B3261E';
    ctx.lineWidth = 5;
    ctx.stroke();
    const room = roomById(g.defId);
    const fp = room ? { col: g.col + ROOM_SHAPE.art.col, row: g.row + ROOM_SHAPE.art.row, w: ROOM_SHAPE.art.w, h: ROOM_SHAPE.art.h } : { col: g.col, row: g.row, w: sz.w, h: sz.h };
    ctx.globalAlpha = 0.72;
    const def = room ?? facilityById(g.defId);
    assets.draw(ctx, def.art, ...rectArgs(artRect({ kind: room ? 'room' : 'station', fp, def })));
    ctx.restore();
  }
  function drawBanner(ctx) {
    const b = bannerRect();
    ctx.save();
    ctx.fillStyle = C.chip;
    ctx.beginPath();
    ctx.roundRect(b.x, b.y, b.w, b.h, THEME.panel.radius);
    ctx.fill();
    ctx.restore();
    const title = B.wing ? wingById(B.wing.id).name : B.path ? 'Walking path' : B.ghost ? (B.ghost.uid == null ? `Build: ${nameOf(B.ghost.defId)}` : `Move: ${nameOf(B.ghost.defId)}`) : 'Build Mode';
    text(ctx, title, b.x + 36, b.y + 56, { size: S.title, bold: true, color: C.textOnDark, baseline: 'middle', maxWidth: b.w - 72 });
    const line = bannerLine();
    text(ctx, line.text, b.x + 36, b.y + 128, { size: S.small, color: line.color, baseline: 'middle', maxWidth: b.w - 72 });
    for (const x of bannerButtons()) drawButton(ctx, x.rect, x.label, { accent: x.accent, disabled: x.disabled });
  }

  return screen;
}
