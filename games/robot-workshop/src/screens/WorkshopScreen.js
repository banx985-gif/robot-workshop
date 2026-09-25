// Workshop: one room in the 3/4 "dollhouse" view, the staff, the workbench and the prototype pedestal.
// The logic is still a plain 8×10 grid (walking, pathing, footprints); only drawing and tapping go
// through the 3/4 projection (bible §18.1). Floor and walls are drawn once into a cached layer.
// Staff on the robot project take turns at the bench: home spot → bench → work a few seconds → home spot.
// Staff not on the project rest at their home spot. Drag pans; tap selects a worker, the bench or the pedestal.
import { Camera } from '../../../../core/Camera.js';
import { Grid } from '../../../../core/Grid.js';
import { Agent } from '../../../../core/Agent.js';
import { Selection } from '../../../../core/Selection.js';
import { IsoProjection } from '../../../../core/IsoProjection.js';
import { CachedLayer } from '../../../../core/CachedLayer.js';
import { characterPose, drawCharacter } from '../../../../core/CharacterMotion.js';
import { ContextCard } from '../../../../core/ui/ContextCard.js';
import { hitRect } from '../../../../core/ui/Button.js';
import { ROLES } from '../../data/staff.js';
import { PHASES } from '../../data/phases.js';
import { robotArtOf } from '../systems/robotVisual.js';
import { ROOM, LAYOUT, SIZES, ROUTINE, ROOM_ART, FURNITURE_ART } from '../../data/workshop.js';
import { VFX_ART, STATUS_ART, STATUS_ORDER, FLOAT_COLORS } from '../../data/feedback.js';
import { createTopBar } from '../ui/TopBar.js';

const TASK_LABELS = {
  home: 'At home spot',
  waiting: 'Waiting for the workbench',
  toBench: 'Walking to the workbench',
  working: 'Working at the workbench',
  toHome: 'Walking back to home spot',
  resting: 'Resting (not on a project)',
};

export function createWorkshopScreen({ renderer, layout, assets, bus, debug, campaign, router, goProject, hud }) {
  const W = renderer.width;
  const H = renderer.height;
  const vfx = hud.vfx;
  const { halfW: HW, halfH: HH } = ROOM.view;

  const grid = new Grid({ cols: ROOM.cols, rows: ROOM.rows, tileSize: ROOM.cellSize });
  const iso = new IsoProjection({ tileSize: ROOM.cellSize, halfW: HW, halfH: HH });
  const camera = new Camera({ viewW: W, viewH: H, worldW: W, worldH: H });
  const room = new CachedLayer({ width: 1, height: 1, draw: drawRoom });
  let roomOps = null; // floor tiles and wall pieces, worked out once the art has loaded
  const topBar = createTopBar({
    layout,
    campaign,
    hud,
    nav: [
      { id: 'project', label: 'Project', onTap: goProject, badge: () => (campaign.activeProject ? null : '!') },
      { id: 'roster', label: 'Roster', onTap: () => router.go('roster') },
    ],
  });

  // --- furniture -----------------------------------------------------------
  grid.blockRect(LAYOUT.bench.col, LAYOUT.bench.row, LAYOUT.bench.w, LAYOUT.bench.h);
  grid.blockRect(LAYOUT.pedestal.col, LAYOUT.pedestal.row, LAYOUT.pedestal.w, LAYOUT.pedestal.h);

  // A footprint's drawn picture: centred on the footprint, legs on its middle-front.
  function furnitureRect(fp, art, width) {
    const c = iso.corner(fp.col + fp.w / 2, fp.row + fp.h / 2);
    const h = width / assets.aspect(art.key);
    const feetY = c.y + HH * 0.9;
    return { x: c.x - width / 2, y: feetY - h * art.feet, w: width, h };
  }

  const bench = {
    kind: 'facility',
    name: 'Basic Workbench',
    fp: LAYOUT.bench,
    user: null, // agent currently at the bench (walking to it or working)
    queue: [], // agents waiting their turn
    pop: 0, // seconds left of the "phase done" bounce
    getBounds: () => furnitureRect(LAYOUT.bench, FURNITURE_ART.bench, SIZES.benchW),
    get depth() {
      return (LAYOUT.bench.col + LAYOUT.bench.w / 2 + LAYOUT.bench.row + LAYOUT.bench.h / 2) * ROOM.cellSize;
    },
  };
  const pedestal = {
    kind: 'pedestal',
    name: 'Prototype Pedestal',
    fp: LAYOUT.pedestal,
    reveal: null, // { t } while a new robot pops onto it
    getBounds() {
      const r = furnitureRect(LAYOUT.pedestal, FURNITURE_ART.pedestal, SIZES.pedestalW);
      if (!pedestalRecord()) return r;
      const top = r.y + r.h * FURNITURE_ART.pedestal.stand - SIZES.robotH;
      return { x: r.x, y: top, w: r.w, h: r.y + r.h - top };
    },
    get depth() {
      return (LAYOUT.pedestal.col + 0.5 + LAYOUT.pedestal.row + 0.5) * ROOM.cellSize;
    },
  };
  const pedestalRecord = () => campaign.history.latest();

  // --- selection (in projected world space) ---------------------------------
  const feet = { x: 0, y: 0 };
  function agentFeet(a, out = feet) {
    return iso.toWorld(a.x, a.y, out);
  }
  function agentBounds(a) {
    const f = agentFeet(a);
    return { x: f.x - a.width / 2, y: f.y - a.height, w: a.width, h: a.height };
  }
  const selection = new Selection(bus, {
    boundsOf: (item) => (item.kind === 'worker' ? agentBounds(item) : item.getBounds()),
    depthOf: (item) => (item.kind === 'worker' ? item.x + item.y : item.depth),
  });
  selection.add(bench);
  selection.add(pedestal);

  let agents = []; // one per staff member, rebuilt when a campaign loads
  bus.on('campaign:ready', () => buildAgents());

  function buildAgents() {
    for (const a of agents) selection.remove(a);
    bench.user = null;
    bench.queue = [];
    agents = campaign.staff.staff.map((s, i) => {
      const h = SIZES.staffH;
      const a = new Agent({ id: s.id, name: s.name, speed: ROUTINE.walkSpeed, width: Math.round(h * assets.aspect(s.art)), height: h });
      a.kind = 'worker';
      a.staffId = s.id;
      a.art = s.art;
      a.home = LAYOUT.homeSpots[i % LAYOUT.homeSpots.length];
      a.task = 'home';
      a.loops = 0;
      a.seed = i * 1.7;
      a.pose = { bob: 0, tilt: 0, flip: 1 };
      a.facing = i % 2 ? -1 : 1;
      a.placeAtTile(grid, a.home.col, a.home.row);
      a.stateTime = -i * 1.5; // stagger start times so they don't all queue at once
      return selection.add(a);
    });
  }

  const staffOf = (a) => campaign.staff.get(a.staffId);

  // --- worker routine -------------------------------------------------------
  function updateRoutine(a) {
    const onShift = !!staffOf(a)?.assigned; // on the active project
    switch (a.task) {
      case 'home':
        if (!onShift) a.task = 'resting';
        else if (a.stateTime >= ROUTINE.idleSeconds) {
          a.task = 'waiting';
          bench.queue.push(a);
        }
        break;
      case 'resting':
        if (onShift) {
          a.task = 'home';
          a.setState('idle');
        }
        break;
      case 'waiting':
        if (!onShift) {
          bench.queue = bench.queue.filter((q) => q !== a);
          a.task = 'resting';
        } else if (!bench.user && bench.queue[0] === a) {
          bench.queue.shift();
          goToBench(a);
        }
        break;
      case 'working':
        if (a.stateTime >= ROUTINE.workSeconds) goHome(a);
        break;
    }
  }

  function goToBench(a) {
    bench.user = a;
    a.task = 'toBench';
    a.walkTo(grid, LAYOUT.workSpot.col, LAYOUT.workSpot.row, () => {
      a.task = 'working';
      a.setState('working');
      a.facing = 1;
      puffAt(a);
    });
  }

  function goHome(a) {
    a.task = 'toHome';
    a.walkTo(grid, a.home.col, a.home.row, () => {
      a.task = 'home';
      a.loops++;
      puffAt(a);
    });
    bench.user = null; // next in line can set off while this one walks away
  }

  function puffAt(a) {
    const f = agentFeet(a);
    vfx.dust('world', f.x, f.y);
  }

  // --- info card ------------------------------------------------------------
  const card = new ContextCard(layout, { describe, height: 300 });
  bus.on('selection:change', ({ selected }) => {
    if (!selected) {
      card.close();
      return;
    }
    card.open(selected);
    // Selection pulse under whatever was picked.
    if (selected.kind === 'worker') {
      const f = agentFeet(selected);
      vfx.pulse('world', f.x, f.y, { rx: 48, ry: 22, color: '#FFB74D' });
    } else {
      const c = iso.corner(selected.fp.col + selected.fp.w / 2, selected.fp.row + selected.fp.h / 2);
      vfx.pulse('world', c.x, c.y, { rx: HW * (selected.fp.w + selected.fp.h) * 0.55, ry: HH * (selected.fp.w + selected.fp.h) * 0.55, color: '#4FC3F7' });
    }
  });

  function describe(item) {
    if (item.kind === 'worker') {
      const s = staffOf(item);
      const status = STATUS_ORDER.filter((k) => s.status[k]).map((k) => k[0].toUpperCase() + k.slice(1));
      return {
        title: s.name,
        subtitle: `${ROLES[s.role].name} · Lv ${s.level}${status.length ? ' · ' + status.join(', ') : ''}`,
        lines: [`Energy ${Math.round(s.energy)} · Morale ${Math.round(s.morale)}`, `Now: ${TASK_LABELS[item.task]}`],
        accent: '#FFB74D',
        buttons: [{ id: 'roster', label: 'View in roster' }],
      };
    }
    if (item === bench) {
      const lines = [bench.user ? `In use by ${bench.user.name}` : 'Free'];
      if (bench.queue.length) lines.push(`Waiting: ${bench.queue.map((a) => a.name.split(' ')[0]).join(', ')}`);
      return { title: bench.name, subtitle: 'Facility · 2×1 tiles', lines, accent: '#4FC3F7' };
    }
    if (item === pedestal) {
      const rec = pedestalRecord();
      const lines = rec
        ? [`Showing ${rec.name}`, `Review ${rec.result.review.toFixed(1)} / 10 · Quality ${rec.result.quality.toFixed(1)}`]
        : ['Your finished robots stand here'];
      return { title: pedestal.name, subtitle: 'Display · 1×1 tile', lines, accent: '#4FC3F7' };
    }
    return { title: '?' };
  }

  // --- room layer (floor + walls, drawn once) --------------------------------
  // Works out every floor tile and wall piece as { key, w, h, m (placement), lx, ly }, then the
  // size of the layer that holds them all, and where the grid's corner sits inside it.
  function layoutRoom() {
    const ops = [];
    const F = ROOM_ART.floor;
    const img = assets.get(F.key);
    const iw = img?.naturalWidth ?? 475;
    const ih = img?.naturalHeight ?? 394;
    const n = F.cells; // one floor picture covers n×n cells (its 2×2 panels = one cell each)
    const fx = (HW * n + 0.6) / F.halfW; // a hair over its cells so neighbours overlap: no seams
    const fy = (HH * n + 0.4) / F.halfH; // squashes the slightly tall tile to the walls' 2:1 slope
    // Back to front, so each tile covers the thick edges of the ones behind it.
    for (let s = 0; s <= ROOM.cols + ROOM.rows - 2; s += n) {
      for (let c = 0; c < ROOM.cols; c += n) {
        const r = s - c;
        if (r < 0 || r >= ROOM.rows || r % n) continue;
        const x = (c - r) * HW;
        const y = (c + r) * HH;
        ops.push({ key: F.key, w: iw * fx, h: ih * fy, m: new DOMMatrix().translate(x - F.faceTop[0] * fx, y - F.faceTop[1] * fy), lx: 0, ly: 0 });
      }
    }
    // Walls: the back corner, then each back wall from the corner outwards (nearer pieces drawn later).
    const ws = ROOM_ART.wallScale;
    const corner = ROOM_ART.corner;
    const cornerImg = assets.get(corner.key);
    ops.push({
      key: corner.key,
      w: (cornerImg?.naturalWidth ?? 474) * ws,
      h: (cornerImg?.naturalHeight ?? 380) * ws,
      m: new DOMMatrix(),
      lx: -corner.apex[0] * ws,
      ly: -corner.apex[1] * ws,
    });
    wallRun(ops, ROOM_ART.rightWall, ROOM.cols, false);
    wallRun(ops, ROOM_ART.leftWall, ROOM.rows, true);

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const op of ops) {
      for (const [px, py] of [
        [op.lx, op.ly],
        [op.lx + op.w, op.ly],
        [op.lx, op.ly + op.h],
        [op.lx + op.w, op.ly + op.h],
      ]) {
        const p = op.m.transformPoint({ x: px, y: py });
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
      }
    }
    const M = ROOM.margin;
    iso.originX = Math.ceil(-minX + M.x);
    iso.originY = Math.ceil(-minY + M.top);
    room.resize(Math.ceil(maxX - minX + M.x * 2), Math.ceil(maxY - minY + M.top + M.bottom));
    camera.setWorld(room.width, room.height);
    return ops;
  }

  // One back wall: pieces spread evenly from the corner post to the end of the wall,
  // neighbouring end posts overlapping. Each piece is sheared so its floor line runs at the room's slope.
  function wallRun(ops, ids, length, mirror) {
    const ws = ROOM_ART.wallScale;
    const corner = ROOM_ART.corner;
    const pieces = ids.map((id) => ROOM_ART.pieces[id]);
    const spans = pieces.map((p) => (p.span * ws) / HW); // in cells along the wall
    const start = ((corner.arm - corner.post) * ws) / HW;
    const total = spans.reduce((a, b) => a + b, 0);
    const overlap = pieces.length > 1 ? (total - (length - start)) / (pieces.length - 1) : 0;
    const minOverlap = (pieces[0].post * ws) / HW;
    if (overlap < minOverlap * 0.6) console.warn(`[Workshop] wall of ${length} cells has gaps: add a piece`);
    const slope = HH / HW;
    let t = start;
    pieces.forEach((p, i) => {
      const img = assets.get(p.key);
      let m = new DOMMatrix();
      if (mirror) m = m.scale(-1, 1);
      m = m.translate(t * HW, t * HH).multiply(new DOMMatrix([1, slope - p.slope, 0, 1, 0, 0]));
      ops.push({ key: p.key, w: (img?.naturalWidth ?? 444) * ws, h: (img?.naturalHeight ?? 423) * ws, m, lx: -p.base[0] * ws, ly: -p.base[1] * ws });
      t += spans[i] - overlap;
    });
  }

  function drawRoom(g) {
    g.save();
    g.translate(iso.originX, iso.originY);
    for (const op of roomOps) {
      const sprite = assets.sprite(op.key, op.w, op.h);
      g.save();
      g.transform(op.m.a, op.m.b, op.m.c, op.m.d, op.m.e, op.m.f);
      if (sprite) g.drawImage(sprite, op.lx, op.ly, op.w, op.h);
      else assets.drawPlaceholder(g, op.key, op.lx, op.ly, op.w, op.h);
      g.restore();
    }
    g.restore();
  }

  // --- drawing ---------------------------------------------------------------
  let time = 0; // real seconds, for motion and effects
  const drawables = [];

  function drawShadow(ctx, x, y, rx, ry) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawBench(ctx) {
    const r = bench.getBounds();
    if (bench.pop > 0) {
      const k = bench.pop / 0.35;
      const s = 1 + Math.sin(k * Math.PI) * 0.06;
      ctx.save();
      ctx.translate(r.x + r.w / 2, r.y + r.h);
      ctx.scale(s, 2 - s);
      assets.draw(ctx, FURNITURE_ART.bench.key, -r.w / 2, -r.h, r.w, r.h);
      ctx.restore();
    } else {
      assets.draw(ctx, FURNITURE_ART.bench.key, r.x, r.y, r.w, r.h);
    }
  }

  function drawPedestal(ctx) {
    const art = FURNITURE_ART.pedestal;
    const r = furnitureRect(LAYOUT.pedestal, art, SIZES.pedestalW);
    assets.draw(ctx, art.key, r.x, r.y, r.w, r.h);
    const rec = pedestalRecord();
    if (!rec) return;
    const key = robotArtOf(rec.result);
    const h = SIZES.robotH;
    const w = h * assets.aspect(key);
    const fx = r.x + r.w / 2;
    const fy = r.y + r.h * art.stand;
    let s = 1;
    if (pedestal.reveal) {
      const k = Math.min(1, pedestal.reveal.t / 0.55);
      s = easeOutBack(k);
    }
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = '#000';
    drawShadow(ctx, fx, fy, w * 0.36 * s, 9 * s);
    ctx.restore();
    const bob = Math.sin(time * 2.2) * 1.5; // idle hover on the display
    if (s === 1) assets.draw(ctx, key, fx - w / 2, fy - h + bob, w, h);
    else {
      ctx.save();
      ctx.translate(fx, fy);
      ctx.scale(s, s);
      assets.draw(ctx, key, -w / 2, -h, w, h);
      ctx.restore();
    }
  }

  function drawWorker(ctx, a) {
    const f = agentFeet(a);
    characterPose(a, time, a.seed, a.pose);
    drawCharacter(ctx, assets, a.art, f.x, f.y, a.width, a.height, a.pose);
  }

  // Status icons (tired / stressed / inspired) above heads, then name tags under the feet.
  function drawOverheads(ctx) {
    const size = SIZES.statusIcon;
    for (const a of agents) {
      const s = staffOf(a);
      const f = agentFeet(a);
      let n = 0;
      for (const k of STATUS_ORDER) if (s?.status[k]) n++;
      if (n) {
        let x = f.x - (n * size + (n - 1) * 6) / 2;
        const y = f.y - a.height - size - 4 + Math.sin(time * 2.4 + a.seed) * 3 + a.pose.bob;
        for (const k of STATUS_ORDER) {
          if (!s.status[k]) continue;
          assets.drawContained(ctx, STATUS_ART[k], { x, y, w: size, h: size });
          x += size + 6;
        }
      }
    }
    ctx.font = `bold ${SIZES.nameTag}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const a of agents) {
      const f = agentFeet(a);
      const label = a.task === 'resting' ? a.restLabel || (a.restLabel = `${a.name.split(' ')[0]} · resting`) : a.firstName || (a.firstName = a.name.split(' ')[0]);
      const w = ctx.measureText(label).width + 22;
      const y = f.y + 12;
      ctx.fillStyle = 'rgba(16,20,24,0.78)';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(f.x - w / 2, y, w, 36, 18);
      else ctx.rect(f.x - w / 2, y, w, 36);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(label, f.x, y + 18);
    }
  }

  // Phase progress pill over the bench, moving smoothly between day ticks (bible §40.2).
  let perDay = 0;
  let perDayAt = -1;
  function drawBenchProgress(ctx) {
    const job = campaign.activeProject;
    if (!job) return;
    if (perDayAt !== campaign.clock.totalDays) {
      perDay = campaign.projects.progressPerDay(job);
      perDayAt = campaign.clock.totalDays;
    }
    const smooth = campaign.clock.paused ? 0 : campaign.clock.dayProgress * perDay;
    const frac = Math.min(1, (job.phaseProgress + smooth) / job.phaseTarget);
    const r = bench.getBounds();
    const w = 180;
    const x = r.x + r.w / 2 - w / 2;
    const y = r.y - 30;
    ctx.fillStyle = 'rgba(16,20,24,0.85)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x - 6, y - 6, w + 12, 30, 15);
    else ctx.rect(x - 6, y - 6, w + 12, 30);
    ctx.fill();
    ctx.fillStyle = '#0E1217';
    ctx.fillRect(x, y, w, 18);
    ctx.fillStyle = '#4FC3F7';
    ctx.fillRect(x, y, w * frac, 18);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(x, y, w * frac, 5);
  }

  function drawSelection(ctx) {
    const s = selection.selected;
    if (!s) return;
    ctx.save();
    ctx.lineWidth = 5;
    if (s.kind === 'worker') {
      const f = agentFeet(s);
      ctx.strokeStyle = '#FFB74D';
      ctx.fillStyle = 'rgba(255,183,77,0.25)';
      ctx.beginPath();
      ctx.ellipse(f.x, f.y, 46, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      const pts = iso.outline(s.fp.col, s.fp.row, s.fp.w, s.fp.h);
      ctx.strokeStyle = '#4FC3F7';
      ctx.fillStyle = 'rgba(79,195,247,0.22)';
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawPaths(ctx) {
    if (!debug.enabled) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(124,255,178,0.7)';
    ctx.lineWidth = 5;
    ctx.setLineDash([12, 10]);
    const p = { x: 0, y: 0 };
    for (const a of agents) {
      if (a.state !== 'walking' || !a.path.length) continue;
      ctx.beginPath();
      iso.toWorld(a.x, a.y, p);
      ctx.moveTo(p.x, p.y);
      for (const q of a.path) {
        iso.toWorld(q.x, q.y, p);
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  // Strip under the top bar: the running project at a glance (tap to open it).
  function stripRect() {
    const t = topBar.rect();
    return { x: t.x, y: t.y + t.h + 14, w: t.w, h: 92 };
  }

  function drawStrip(ctx) {
    const r = stripRect();
    const job = campaign.activeProject;
    ctx.save();
    ctx.fillStyle = 'rgba(16,20,24,0.9)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(r.x, r.y, r.w, r.h, 20);
    else ctx.rect(r.x, r.y, r.w, r.h);
    ctx.fill();
    assets.drawContained(ctx, 'ui_icon_11', { x: r.x + 20, y: r.y + (r.h - 64) / 2, w: 64, h: 64 });
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const tx = r.x + 100;
    if (!job) {
      ctx.fillStyle = '#FFD166';
      ctx.font = 'bold 32px system-ui, sans-serif';
      ctx.fillText('No project running — tap here to build a robot', tx, r.y + r.h / 2, r.w - 120);
    } else {
      const phase = PHASES[job.phaseIndex];
      const pct = Math.min(1, job.phaseProgress / job.phaseTarget);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 30px system-ui, sans-serif';
      ctx.fillText(`${job.name} · ${job.phaseIndex + 1}/5 ${phase.name}`, tx, r.y + 28, r.w - 380);
      ctx.fillStyle = '#9AA8B5';
      ctx.font = '26px system-ui, sans-serif';
      const team = job.slots.filter(Boolean).length;
      ctx.fillText(`Faults ${job.data.faults.length} · Team ${team}/5${team ? '' : ' — nobody working!'}`, tx, r.y + 66, r.w - 380);
      const bx = r.x + r.w - 270;
      ctx.fillStyle = '#0E1217';
      ctx.fillRect(bx, r.y + 30, 190, 30);
      ctx.fillStyle = '#7CFFB2';
      ctx.fillRect(bx, r.y + 30, 190 * pct, 30);
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'right';
      ctx.font = 'bold 28px system-ui, sans-serif';
      ctx.fillText(`${Math.floor(pct * 100)}%`, r.x + r.w - 20, r.y + 46);
    }
    ctx.restore();
  }

  function focusOn(a) {
    const f = agentFeet(a, { x: 0, y: 0 });
    camera.centerOn(f.x, f.y - a.height / 2);
  }

  // --- effects hooked to game events ---------------------------------------------
  // Point on the bench top where the welding happens.
  function weldPoint() {
    const r = bench.getBounds();
    return { x: r.x + r.w * 0.52, y: r.y + r.h * 0.5 };
  }

  bus.on('project:phase', ({ job, phase }) => {
    const p = weldPoint();
    bench.pop = 0.35;
    vfx.sprite('world', VFX_ART.blueprintPop, p.x, p.y - 30, { size: 140, life: 1.1, rise: 30 });
    // The last phase ends in the robot-finished moment, which says it louder.
    if (job.phaseIndex < PHASES.length - 1) vfx.text('world', `${phase.name} done!`, p.x, p.y - 120, { color: FLOAT_COLORS.info, size: 34, life: 1.8 });
  });

  bus.on('robot:breakthroughRoll', ({ hit }) => {
    if (!hit) return;
    const p = weldPoint();
    vfx.sprite('world', STATUS_ART.breakthrough, p.x, p.y - 90, { size: 96, life: 2.2, rise: 40, hold: 0.6 });
    vfx.text('world', 'Breakthrough!', p.x, p.y - 150, { color: '#FFD166', size: 34, life: 2 });
  });

  bus.on('staff:levelup', ({ staff, level }) => {
    const a = screen.agentFor(staff.id);
    if (!a) return;
    const f = agentFeet(a, { x: 0, y: 0 });
    vfx.sprite('world', VFX_ART.levelUp, f.x, f.y - a.height * 0.5, { size: 140, life: 1.2, hold: 0.2 });
    vfx.text('world', `Level ${level}!`, f.x, f.y - a.height - 14, { color: FLOAT_COLORS.level, size: 32, life: 1.9, rise: 50, delay: 0.15 });
  });

  // Welding sparks while someone works at the bench (visual only, real time).
  let sparkTimer = 0;
  let spriteSparkTimer = 0;
  function updateSparks(dt) {
    const a = bench.user;
    if (!a || a.task !== 'working' || campaign.clock.paused || !campaign.activeProject) return;
    sparkTimer -= dt;
    spriteSparkTimer -= dt;
    const p = weldPoint();
    if (sparkTimer <= 0) {
      sparkTimer = 0.08 + Math.random() * 0.14;
      vfx.sparks('world', p.x + (Math.random() - 0.5) * 30, p.y, { count: 4 });
    }
    if (spriteSparkTimer <= 0) {
      spriteSparkTimer = 0.9 + Math.random() * 0.8;
      vfx.sprite('world', VFX_ART.smallSparks, p.x, p.y - 20, { size: 76, life: 0.4, from: 0.6, to: 1, hold: 0.1 });
    }
  }

  // --- screen hooks --------------------------------------------------------
  let dragId = null;
  const screen = {
    camera,
    grid,
    iso,
    room,
    bench,
    pedestal,
    selection,
    card,
    topBar,
    taps: [], // for automated checks: { screen, world, picked }
    get agents() {
      return agents;
    },
    agentFor: (staffId) => agents.find((a) => a.staffId === staffId) || null,
    taskLabel: (staffId) => {
      const a = screen.agentFor(staffId);
      return a ? TASK_LABELS[a.task] : '';
    },
    // Screen (logical) point of a worker's middle, for tests.
    screenPointOf(a) {
      const b = agentBounds(a);
      return camera.worldToScreen(b.x + b.w / 2, b.y + b.h / 2);
    },

    init() {
      roomOps = layoutRoom();
      room.setPixelScale(renderer.pixelScale);
      camera.pixelScale = renderer.pixelScale;
      const g = iso.gridBounds(ROOM.cols, ROOM.rows);
      camera.centerOn(g.x + g.w / 2, g.y + g.h / 2 - 60);
    },

    // Screen pixel scale changed (resize / rotate): layer and sprites are remade at the new size.
    resize() {
      room.setPixelScale(renderer.pixelScale);
      camera.pixelScale = renderer.pixelScale;
    },

    // A robot just finished: it pops onto the pedestal with the completion flash and confetti.
    celebrate() {
      const r = furnitureRect(LAYOUT.pedestal, FURNITURE_ART.pedestal, SIZES.pedestalW);
      const x = r.x + r.w / 2;
      const y = r.y + r.h * FURNITURE_ART.pedestal.stand - SIZES.robotH / 2;
      camera.centerOn(x, y + 120);
      selection.clear();
      pedestal.reveal = { t: 0 };
      vfx.flash({ peak: 0.7, life: 0.45 });
      vfx.sprite('world', VFX_ART.robotDone, x, y, { size: 250, life: 1.1, from: 0.3, to: 1.05, hold: 0.1, alpha: 0.9 });
      vfx.sprite('world', VFX_ART.bigBurst, x, y + 10, { size: 160, life: 0.55, from: 0.5, to: 1.1, hold: 0.05 });
      vfx.confetti('world', x, y - 20, { count: 56 });
    },

    // params.selectId: select that worker and centre on them.
    enter(params = {}) {
      if (!roomOps) screen.init();
      if (params.selectId) {
        const a = screen.agentFor(params.selectId);
        if (a) {
          selection.select(a);
          focusOn(a);
        }
      }
    },

    // Runs every step, even while another screen is showing, so the room keeps living.
    tick(dt) {
      if (campaign.clock.paused) return;
      for (const a of agents) {
        a.update(dt, grid);
        updateRoutine(a);
      }
    },

    // Real-time visuals (only while this screen is showing; runs while paused too).
    update(dt) {
      time += dt;
      if (bench.pop > 0) bench.pop = Math.max(0, bench.pop - dt);
      if (pedestal.reveal && (pedestal.reveal.t += dt) > 1) pedestal.reveal = null;
      updateSparks(dt);
    },

    stripRect,

    onTap(p) {
      if (topBar.handleTap(p)) return;
      if (hitRect(p, stripRect())) {
        goProject();
        return;
      }
      if (card.contains(p)) {
        if (card.buttonAt(p) === 'roster') router.go('roster', { focusId: card.item.staffId });
        return; // taps on the card stay on the card
      }
      const w = camera.screenToWorld(p.x, p.y);
      const picked = selection.handleTap(w.x, w.y);
      screen.taps.push({ screen: { x: p.x, y: p.y }, world: w, picked: picked ? picked.staffId || picked.kind : null });
      if (screen.taps.length > 50) screen.taps.shift();
    },

    onDragStart(p) {
      const start = { x: p.startX, y: p.startY };
      if (dragId !== null || card.contains(start) || topBar.contains(start) || hitRect(start, stripRect())) return;
      dragId = p.id;
      camera.beginDrag(p.startX, p.startY);
      camera.dragTo(p.x, p.y);
    },

    onDrag(p) {
      if (p.id === dragId) camera.dragTo(p.x, p.y);
    },

    onDragEnd(p) {
      if (p.id !== dragId) return;
      camera.endDrag();
      dragId = null;
    },

    render(ctx) {
      ctx.fillStyle = '#0B0E12';
      ctx.fillRect(0, 0, W, H);

      camera.apply(ctx);
      room.render(ctx, 0, 0);
      drawSelection(ctx);
      drawPaths(ctx);

      // Soft floor shadows (Canvas-drawn; the art has none baked in).
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      for (const a of agents) {
        const f = agentFeet(a);
        drawShadow(ctx, f.x, f.y, a.width * 0.36, 11);
      }
      ctx.restore();

      // Nearer things (bigger grid x + y) are drawn later, in front. Off-camera items are skipped.
      drawables.length = 0;
      drawables.push(bench, pedestal);
      for (const a of agents) drawables.push(a);
      drawables.sort(byDepth);
      for (const d of drawables) {
        if (d.kind === 'worker') {
          if (camera.isVisible(agentBounds(d))) drawWorker(ctx, d);
        } else if (d === bench) drawBench(ctx);
        else drawPedestal(ctx);
      }
      drawBenchProgress(ctx);
      drawOverheads(ctx);
      vfx.render(ctx, 'world');
      camera.restore(ctx);

      topBar.render(ctx);
      drawStrip(ctx);
      card.render(ctx);
    },
  };

  function byDepth(a, b) {
    return depthOf(a) - depthOf(b);
  }
  function depthOf(d) {
    return d.kind === 'worker' ? d.x + d.y : d.depth;
  }
  return screen;
}

function easeOutBack(k) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
}
