// Workshop: the room in the 3/4 "dollhouse" view, the staff and every facility the player has built.
// The logic is a plain grid (walking, pathing, footprints — core/FacilitySystem.js); only drawing and
// tapping go through the 3/4 projection (bible §18.1). Floor, walls, locked expansion areas and the
// facilities' floor shadows are drawn once into a cached layer and redrawn only when the layout changes (§40.1).
// Staff on the robot project take turns at the station for the stage they are working (Engineering Desk in
// Engineering, and so on), or a workbench if there is none: home spot → station → work a few seconds → home spot.
// Staff not on the project rest at a Break Table or Charging Dock if there is a free seat, else at their home spot.
// Drag pans; tap selects a worker or a facility. The Build screen (BuildScreen.js) reuses this view.
import { Camera } from '../../../../core/Camera.js';
import { Grid } from '../../../../core/Grid.js';
import { Agent } from '../../../../core/Agent.js';
import { Selection } from '../../../../core/Selection.js';
import { IsoProjection } from '../../../../core/IsoProjection.js';
import { CachedLayer } from '../../../../core/CachedLayer.js';
import { characterPose, drawCharacter } from '../../../../core/CharacterMotion.js';
import { ContextCard } from '../../../../core/ui/ContextCard.js';
import { drawButton, hitRect } from '../../../../core/ui/Button.js';
import { ROLES } from '../../data/staff.js';
import { PHASES } from '../../data/phases.js';
import { FACILITIES, STATIONS, FALLBACK_STATIONS, BUILD_ART, FACILITY_DRAW, EXPANSIONS } from '../../data/facilities.js';
import { robotArtOf } from '../systems/robotVisual.js';
import { describeUnlock } from '../systems/unlockRules.js';
import { ROOM, LAYOUT, SIZES, ROUTINE, ROOM_ART } from '../../data/workshop.js';
import { VFX_ART, STATUS_ART, STATUS_ORDER, FLOAT_COLORS } from '../../data/feedback.js';
import { createTopBar } from '../ui/TopBar.js';

const TASK_LABELS = {
  home: 'At home spot',
  waiting: 'Waiting for a station',
  toStation: 'Walking to a station',
  working: 'Working',
  toHome: 'Walking back to home spot',
  resting: 'Resting (not on a project)',
};

export function createWorkshopScreen({ renderer, layout, assets, bus, debug, campaign, router, goProject, hud }) {
  const W = renderer.width;
  const vfx = hud.vfx;
  const F = campaign.facilities;
  const { halfW: HW, halfH: HH } = ROOM.view;

  const grid = new Grid({ cols: F.cols, rows: F.rows, tileSize: ROOM.cellSize }); // the whole floor that can ever exist
  const iso = new IsoProjection({ tileSize: ROOM.cellSize, halfW: HW, halfH: HH });
  const camera = new Camera({ viewW: W, viewH: renderer.height, worldW: W, worldH: renderer.height });
  const room = new CachedLayer({ width: 1, height: 1, draw: drawRoom });
  let roomOps = null; // floor tiles, zone marks, shadows and wall pieces, worked out once the art has loaded
  let roomFor = null; // "cols×rows" the ops were made for (a new extent moves the room's origin)
  let buildMode = false; // Build screen: grid lines and footprints are baked into the room layer too
  let ghost = null; // Build screen placement preview: { def, col, row, rot, ok, hideUid }
  let buildSelected = null; // Build screen: uid of the facility being edited
  const topBar = createTopBar({
    layout,
    campaign,
    hud,
    nav: [
      { id: 'project', label: 'Project', onTap: goProject, badge: () => (campaign.activeProject ? null : '!') },
      { id: 'roster', label: 'Roster', onTap: () => router.go('roster') },
    ],
  });

  // --- facilities ------------------------------------------------------------
  // One view per placed facility: where it is drawn, who is using it, where people stand at it.
  let stations = [];
  const defOf = (v) => FACILITIES[v.item.def];

  function facilityRectFor(def, fp) {
    const c = iso.corner(fp.col + fp.w / 2, fp.row + fp.h / 2);
    const width = (fp.w + fp.h) * HW * FACILITY_DRAW.widthPerCell * (def.scale ?? 1);
    const h = width / assets.aspect(def.art);
    const feetY = c.y + HH * (def.drop ?? 0.3 * (fp.w + fp.h));
    return { x: c.x - width / 2, y: feetY - h * (def.feet ?? FACILITY_DRAW.feet), w: width, h };
  }

  function makeView(item) {
    const v = {
      kind: 'facility',
      uid: item.uid,
      item,
      fp: F.footprint(item),
      user: null, // agent at the station (walking to it or working)
      queue: [], // agents waiting their turn
      pop: 0, // seconds left of the "phase done" bounce
      spot: null, // where a worker stands to use it
      restSpots: [], // seats for resting workers (Break Table, Charging Dock)
      displayIndex: -1, // which finished robot it shows (pedestals)
      getBounds() {
        const d = defOf(v);
        const r = facilityRectFor(d, v.fp);
        if (!d.stand || !displayRecord(v)) return r;
        const top = r.y + r.h * d.stand - SIZES.robotH;
        return { x: r.x, y: top, w: r.w, h: r.y + r.h - top };
      },
      get depth() {
        return (v.fp.col + v.fp.w / 2 + v.fp.row + v.fp.h / 2) * ROOM.cellSize;
      },
    };
    return v;
  }

  const displayRecord = (v) => (v.displayIndex >= 0 ? campaign.displayedRecords()[v.displayIndex] ?? null : null);

  // Stations for a stage: its own station(s) if built, else the fallbacks in order.
  function candidates(phaseId) {
    const groups = [STATIONS[phaseId] ?? [], ...FALLBACK_STATIONS.map((id) => [id])];
    for (const ids of groups) {
      const list = stations.filter((s) => ids.includes(s.item.def) && s.spot);
      if (list.length) return list;
    }
    return [];
  }

  function stationFor(phaseId) {
    const list = candidates(phaseId);
    if (!list.length) return null;
    const load = (s) => (s.user ? 1 : 0) + s.queue.length;
    return list.reduce((a, b) => (load(b) < load(a) ? b : a));
  }

  const primaryStation = (phaseId) => candidates(phaseId)[0] ?? null;

  function phaseIdOf(a) {
    const job = campaign.assignments.jobOf(a.staffId);
    return job ? PHASES[job.phaseIndex]?.id : null;
  }

  // --- layout changes --------------------------------------------------------------
  // Rebuild the walking grid, the station views, the standing spots, and put everyone somewhere sensible.
  function onLayout() {
    F.buildGrid(grid);
    const old = new Map(stations.map((s) => [s.uid, s]));
    stations = F.placed.map((item) => {
      const v = old.get(item.uid) ?? makeView(item);
      old.delete(item.uid);
      v.item = item;
      v.fp = F.footprint(item);
      v.user = null;
      v.queue = [];
      return v;
    });
    for (const gone of old.values()) selection.remove(gone);
    for (const s of stations) selection.add(s);

    // Standing spots: one work spot per station first, then seats, then home spots — no two on one cell.
    const taken = new Set();
    const key = (p) => `${p.col},${p.row}`;
    for (const s of stations) {
      const cells = F.accessCells(s.uid);
      s.spot = cells.find((p) => !taken.has(key(p))) ?? cells[0] ?? null;
      if (s.spot) taken.add(key(s.spot));
    }
    let shown = 0;
    for (const s of stations) {
      const d = defOf(s);
      s.displayIndex = d.stand ? shown++ : -1;
      s.restSpots = [];
      if (!d.rest) continue;
      for (const p of F.accessCells(s.uid)) {
        if (s.restSpots.length >= d.rest) break;
        if (taken.has(key(p))) continue;
        taken.add(key(p));
        s.restSpots.push(p);
      }
    }
    homes = LAYOUT.homeSpots.map((h) => {
      const p = F.nearestOpen(h.col, h.row, taken) ?? F.entrance;
      taken.add(key(p));
      return p;
    });
    for (const a of agents) resetAgent(a);
    room.invalidate();
    bus.emit('workshop:layout', {});
  }
  let homes = [];

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

  let agents = []; // one per staff member, rebuilt when a campaign loads
  bus.on('campaign:ready', () => buildAgents());
  bus.on('facility:layout', () => onLayout());

  function buildAgents() {
    for (const a of agents) selection.remove(a);
    agents = campaign.staff.staff.map((s, i) => {
      const h = SIZES.staffH;
      const a = new Agent({ id: s.id, name: s.name, speed: ROUTINE.walkSpeed, width: Math.round(h * assets.aspect(s.art)), height: h });
      a.kind = 'worker';
      a.staffId = s.id;
      a.art = s.art;
      a.homeIndex = i;
      a.task = 'home';
      a.loops = 0;
      a.seed = i * 1.7;
      a.pose = { bob: 0, tilt: 0, flip: 1 };
      a.facing = i % 2 ? -1 : 1;
      a.station = null;
      a.restAt = null; // { view, spot } while resting at a seat
      return selection.add(a);
    });
    onLayout(); // spots for the new team; places everyone at home
    agents.forEach((a, i) => {
      const h = homeOf(a);
      a.placeAtTile(grid, h.col, h.row);
      a.stateTime = -i * 1.5; // stagger start times so they don't all queue at once
    });
  }

  const homeOf = (a) => homes[a.homeIndex % Math.max(1, homes.length)] ?? F.entrance;
  const staffOf = (a) => campaign.staff.get(a.staffId);

  // After the layout changes: stop, step off anything built on top of them, and start the routine again.
  function resetAgent(a) {
    const t = a.tile(grid);
    if (!t || !F.isOpenCell(t.col, t.row)) {
      const p = F.nearestOpen(t?.col ?? 0, t?.row ?? 0) ?? homeOf(a);
      a.placeAtTile(grid, p.col, p.row);
    }
    a.path = [];
    a.goal = null;
    a._onArrive = null;
    a.setState('idle');
    a.station = null;
    a.restAt = null;
    a.task = staffOf(a)?.assigned ? 'home' : 'resting';
    a.restPending = a.task === 'resting';
  }

  // --- worker routine -------------------------------------------------------
  function updateRoutine(a) {
    const onShift = !!staffOf(a)?.assigned; // on the active project
    switch (a.task) {
      case 'home':
        if (!onShift) startResting(a);
        else if (a.state !== 'walking' && a.stateTime >= ROUTINE.idleSeconds) {
          const st = stationFor(phaseIdOf(a));
          if (st) {
            a.station = st;
            st.queue.push(a);
            a.task = 'waiting';
          }
        }
        break;
      case 'resting':
        if (onShift) {
          a.restAt = null;
          a.task = 'home';
          a.setState('idle');
        } else if (a.restPending) startResting(a);
        break;
      case 'waiting': {
        const st = a.station;
        if (!onShift || !stations.includes(st)) {
          if (st) st.queue = st.queue.filter((q) => q !== a);
          a.station = null;
          if (onShift) a.task = 'home';
          else startResting(a);
        } else if (!st.user && st.queue[0] === a) {
          st.queue.shift();
          goToStation(a, st);
        }
        break;
      }
      case 'working':
        if (a.stateTime >= ROUTINE.workSeconds) goHome(a);
        break;
    }
  }

  function goToStation(a, st) {
    st.user = a;
    a.task = 'toStation';
    a.walkTo(grid, st.spot.col, st.spot.row, () => {
      a.task = 'working';
      a.setState('working');
      a.facing = faceTowards(st.spot, st.fp);
      puffAt(a);
    });
  }

  function goHome(a) {
    const st = a.station;
    if (st && st.user === a) st.user = null; // next in line can set off while this one walks away
    a.station = null;
    a.task = 'toHome';
    const h = homeOf(a);
    a.walkTo(grid, h.col, h.row, () => {
      a.task = 'home';
      a.loops++;
      puffAt(a);
    });
  }

  // Off the project: a free seat at a Break Table / Charging Dock, else the home spot.
  function startResting(a) {
    a.task = 'resting';
    a.restPending = false;
    a.station = null;
    const busy = new Set(agents.filter((o) => o !== a && o.restAt).map((o) => `${o.restAt.spot.col},${o.restAt.spot.row}`));
    let seat = null;
    for (const s of stations) {
      for (const spot of s.restSpots) {
        if (!busy.has(`${spot.col},${spot.row}`)) {
          seat = { view: s, spot };
          break;
        }
      }
      if (seat) break;
    }
    a.restAt = seat;
    const to = seat ? seat.spot : homeOf(a);
    a.walkTo(grid, to.col, to.row, () => {
      if (seat) a.facing = faceTowards(seat.spot, seat.view.fp);
    });
  }

  // Which way (on screen) a worker standing at `spot` faces to look at footprint fp.
  function faceTowards(spot, fp) {
    const a = iso.cellCenter(spot.col, spot.row);
    const b = iso.corner(fp.col + fp.w / 2, fp.row + fp.h / 2);
    return b.x >= a.x ? 1 : -1;
  }

  function puffAt(a) {
    const f = agentFeet(a);
    vfx.dust('world', f.x, f.y);
  }

  function taskLabel(a) {
    if (a.task === 'working' && a.station) return `Working at the ${defOf(a.station).name}`;
    if (a.task === 'toStation' && a.station) return `Walking to the ${defOf(a.station).name}`;
    if (a.task === 'waiting' && a.station) return `Waiting for the ${defOf(a.station).name}`;
    if (a.task === 'resting' && a.restAt) return `Resting at the ${defOf(a.restAt.view).name}`;
    return TASK_LABELS[a.task];
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
        lines: [`Energy ${Math.round(s.energy)} · Morale ${Math.round(s.morale)}`, `Now: ${taskLabel(item)}`],
        accent: '#FFB74D',
        buttons: [{ id: 'roster', label: 'View in roster' }],
      };
    }
    if (item.kind === 'facility') {
      const d = defOf(item);
      const lines = wrap(d.blurb, 36).slice(0, 2);
      if (d.stand) {
        const rec = displayRecord(item);
        lines.push(rec ? `Showing ${rec.name} · Rep ${rec.displayRep ?? 0}/50` : 'Your finished robots stand here');
      } else if (item.user) lines.push(`In use by ${item.user.name.split(' ')[0]}${item.queue.length ? ` · waiting: ${item.queue.map((a) => a.name.split(' ')[0]).join(', ')}` : ''}`);
      else if (d.rest) {
        const who = agents.filter((a) => a.restAt?.view === item).map((a) => a.name.split(' ')[0]);
        lines.push(who.length ? `Resting here: ${who.join(', ')}` : 'Free seats for resting staff');
      } else lines.push('Free');
      return { title: d.name, subtitle: `Facility · ${item.fp.w}×${item.fp.h} tiles`, lines, accent: '#4FC3F7', buttons: [{ id: 'build', label: 'Build mode' }] };
    }
    return { title: '?' };
  }

  // --- room layer (floor + walls + zones + shadows, drawn once per layout) -----------------
  // Works out every piece as { key, w, h, m (placement), lx, ly } (pictures) or { draw(g) } (runtime-drawn),
  // then the size of the layer that holds them all, and where the grid's corner sits inside it.
  function layoutRoom() {
    const ext = F.viewExtent();
    const oldOrigin = { x: iso.originX, y: iso.originY };
    const ops = [];
    const F0 = ROOM_ART.floor;
    const img = assets.get(F0.key);
    const iw = img?.naturalWidth ?? 475;
    const ih = img?.naturalHeight ?? 394;
    const n = F0.cells; // one floor picture covers n×n cells (its 2×2 panels = one cell each)
    const fx = (HW * n + 0.6) / F0.halfW; // a hair over its cells so neighbours overlap: no seams
    const fy = (HH * n + 0.4) / F0.halfH; // squashes the slightly tall tile to the walls' 2:1 slope
    const shownCell = (c, r) => F.inBase(c, r) || (F.zoneAt(c, r) && (F.isOwned(F.zoneAt(c, r).id) || F.zoneReady(F.zoneAt(c, r).id)));
    // Back to front, so each tile covers the thick edges of the ones behind it.
    for (let s = 0; s <= ext.cols + ext.rows - 2; s += n) {
      for (let c = 0; c < ext.cols; c += n) {
        const r = s - c;
        if (r < 0 || r >= ext.rows || r % n || !shownCell(c, r)) continue;
        const x = (c - r) * HW;
        const y = (c + r) * HH;
        ops.push({ key: F0.key, w: iw * fx, h: ih * fy, m: new DOMMatrix().translate(x - F0.faceTop[0] * fx, y - F0.faceTop[1] * fy), lx: 0, ly: 0 });
      }
    }
    ops.push({ draw: drawFloorMarks }); // locked zones, test-zone floors, shadows, build grid
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
    wallRun(ops, ROOM_ART.rightWall, F.area.cols, ext.cols, false);
    wallRun(ops, ROOM_ART.leftWall, F.area.rows, ext.rows, true);

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const op of ops) {
      if (op.draw) continue;
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
    // The room grew: keep what was on screen where it was.
    if (roomOps) camera.moveTo(camera.x + iso.originX - oldOrigin.x, camera.y + iso.originY - oldOrigin.y);
    roomFor = `${ext.cols}x${ext.rows}`;
    return ops;
  }

  // One back wall: the starting room's pieces spread evenly from the corner post to the end of the base wall
  // (neighbouring end posts overlapping), then plain wall pieces on to the end of an expansion.
  // Each piece is sheared so its floor line runs at the room's slope.
  function wallRun(ops, ids, baseLength, length, mirror) {
    const ws = ROOM_ART.wallScale;
    const corner = ROOM_ART.corner;
    const pieces = ids.map((id) => ROOM_ART.pieces[id]);
    const spanOf = (p) => (p.span * ws) / HW; // in cells along the wall
    const spans = pieces.map(spanOf);
    const start = ((corner.arm - corner.post) * ws) / HW;
    const total = spans.reduce((a, b) => a + b, 0);
    const overlap = pieces.length > 1 ? (total - (baseLength - start)) / (pieces.length - 1) : 0;
    const minOverlap = (pieces[0].post * ws) / HW;
    if (overlap < minOverlap * 0.6) console.warn(`[Workshop] wall of ${baseLength} cells has gaps: add a piece`);
    const slope = HH / HW;
    const put = (p, t) => {
      const img = assets.get(p.key);
      let m = new DOMMatrix();
      if (mirror) m = m.scale(-1, 1);
      m = m.translate(t * HW, t * HH).multiply(new DOMMatrix([1, slope - p.slope, 0, 1, 0, 0]));
      ops.push({ key: p.key, w: (img?.naturalWidth ?? 444) * ws, h: (img?.naturalHeight ?? 423) * ws, m, lx: -p.base[0] * ws, ly: -p.base[1] * ws });
    };
    let t = start;
    pieces.forEach((p, i) => {
      put(p, t);
      t += spans[i] - overlap;
    });
    const extra = length - baseLength;
    if (extra <= 0) return;
    // Extension: n plain pieces, each overlapping the one before by the same amount, ending at the new corner.
    const wall = ROOM_ART.pieces.wall;
    const span = spanOf(wall);
    let count = 1;
    while ((count * span - extra) / count < minOverlap) count++;
    const ov = (count * span - extra) / count;
    let te = baseLength - ov;
    for (let i = 0; i < count; i++) {
      put(i % 3 === 1 ? ROOM_ART.pieces.window : wall, te);
      te += span - ov;
    }
  }

  function drawRoom(g) {
    g.save();
    g.translate(iso.originX, iso.originY);
    for (const op of roomOps) {
      if (op.draw) {
        g.save();
        g.translate(-iso.originX, -iso.originY); // runtime marks draw in projected world units
        op.draw(g);
        g.restore();
        continue;
      }
      const sprite = assets.sprite(op.key, op.w, op.h);
      g.save();
      g.transform(op.m.a, op.m.b, op.m.c, op.m.d, op.m.e, op.m.f);
      if (sprite) g.drawImage(sprite, op.lx, op.ly, op.w, op.h);
      else assets.drawPlaceholder(g, op.key, op.lx, op.ly, op.w, op.h);
      g.restore();
    }
    g.restore();
  }

  function diamond(g, col, row, w, h) {
    const pts = iso.outline(col, row, w, h);
    g.beginPath();
    pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
    g.closePath();
  }

  // Runtime-drawn floor marks, baked into the room layer: locked expansion areas, test-zone floors,
  // soft shadows under each facility, and in Build mode the grid and footprints.
  function drawFloorMarks(g) {
    for (const z of F.nextZones) {
      g.save();
      diamond(g, z.col, z.row, z.w, z.h);
      g.fillStyle = 'rgba(16,20,24,0.55)';
      g.fill();
      g.setLineDash([16, 12]);
      g.lineWidth = 5;
      g.strokeStyle = 'rgba(255,112,90,0.85)';
      g.stroke();
      g.setLineDash([]);
      const c = iso.corner(z.col + z.w / 2, z.row + z.h / 2);
      const bw = Math.min(260, (z.w + z.h) * HW * 0.55);
      const bh = bw / assets.aspect(BUILD_ART.boundary);
      const sprite = assets.sprite(BUILD_ART.boundary, bw, bh);
      if (sprite) g.drawImage(sprite, c.x - bw / 2, c.y - bh * 0.62, bw, bh);
      const def = EXPANSIONS.find((e) => e.id === z.id);
      g.font = 'bold 26px system-ui, sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      const label = `${def.name} · ${def.buyable ? describeUnlock(def.unlock) : 'later'}`;
      const tw = g.measureText(label).width + 28;
      g.fillStyle = 'rgba(16,20,24,0.85)';
      g.beginPath();
      if (g.roundRect) g.roundRect(c.x - tw / 2, c.y + bh * 0.42, tw, 40, 20);
      else g.rect(c.x - tw / 2, c.y + bh * 0.42, tw, 40);
      g.fill();
      g.fillStyle = '#FFB199';
      g.fillText(label, c.x, c.y + bh * 0.42 + 21);
      g.restore();
    }
    for (const s of stations) {
      const d = defOf(s);
      if (d.floor) {
        // Test-zone floor: the tile picture stretched over the footprint's diamond, clipped to it.
        const left = iso.corner(s.fp.col, s.fp.row + s.fp.h).x;
        const top = iso.corner(s.fp.col, s.fp.row).y;
        const w = (s.fp.w + s.fp.h) * HW;
        const h = (s.fp.w + s.fp.h) * HH;
        const sprite = assets.sprite(d.floor, w, h);
        if (sprite) {
          g.save();
          diamond(g, s.fp.col, s.fp.row, s.fp.w, s.fp.h);
          g.clip();
          g.drawImage(sprite, left, top, w, h);
          g.restore();
        }
      }
      g.save();
      diamond(g, s.fp.col + 0.08, s.fp.row + 0.08, s.fp.w - 0.16, s.fp.h - 0.16);
      g.fillStyle = 'rgba(0,0,0,0.16)';
      g.fill();
      g.restore();
    }
    if (!buildMode) return;
    g.save();
    g.lineWidth = 1.5;
    g.strokeStyle = 'rgba(79,195,247,0.28)';
    for (let r = 0; r < F.rows; r++) {
      for (let c = 0; c < F.cols; c++) {
        if (!F.isUsable(c, r)) continue;
        diamond(g, c, r, 1, 1);
        g.stroke();
      }
    }
    const e = F.entrance;
    diamond(g, e.col, e.row, 1, 1);
    g.fillStyle = 'rgba(124,255,178,0.28)';
    g.fill();
    g.lineWidth = 3;
    g.strokeStyle = 'rgba(79,195,247,0.7)';
    for (const s of stations) {
      diamond(g, s.fp.col, s.fp.row, s.fp.w, s.fp.h);
      g.stroke();
    }
    g.restore();
  }

  function ensureRoom() {
    const ext = F.viewExtent();
    if (!roomOps || roomFor !== `${ext.cols}x${ext.rows}`) roomOps = layoutRoom();
  }

  // --- drawing ---------------------------------------------------------------
  let time = 0; // real seconds, for motion and effects
  const drawables = [];

  function drawShadow(ctx, x, y, rx, ry) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawFacilityArt(ctx, def, fp, flip, pop = 0, alpha = 1) {
    const r = facilityRectFor(def, fp);
    const s = pop > 0 ? 1 + Math.sin((pop / 0.35) * Math.PI) * 0.06 : 1;
    ctx.save();
    if (alpha < 1) ctx.globalAlpha = alpha;
    ctx.translate(r.x + r.w / 2, r.y + r.h);
    ctx.scale(flip ? -s : s, 2 - s);
    assets.draw(ctx, def.art, -r.w / 2, -r.h, r.w, r.h);
    ctx.restore();
    return r;
  }

  function drawStation(ctx, v) {
    const d = defOf(v);
    const r = drawFacilityArt(ctx, d, v.fp, !!v.item.rot, v.pop);
    if (!d.stand) return;
    const rec = displayRecord(v);
    if (!rec) return;
    const key = robotArtOf(rec.result);
    const h = SIZES.robotH;
    const w = h * assets.aspect(key);
    const fx = r.x + r.w / 2;
    const fy = r.y + r.h * d.stand;
    let s = 1;
    if (v.reveal) s = easeOutBack(Math.min(1, v.reveal.t / 0.55));
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = '#000';
    drawShadow(ctx, fx, fy, w * 0.36 * s, 9 * s);
    ctx.restore();
    const bob = Math.sin(time * 2.2 + v.uid) * 1.5; // idle hover on the display
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

  // Phase progress pill over the stage's station, moving smoothly between day ticks (bible §40.2).
  let perDay = 0;
  let perDayAt = -1;
  function drawProgressPill(ctx) {
    const job = campaign.activeProject;
    if (!job) return;
    const st = primaryStation(PHASES[job.phaseIndex].id);
    if (!st) return;
    if (perDayAt !== campaign.clock.totalDays) {
      perDay = campaign.projects.progressPerDay(job);
      perDayAt = campaign.clock.totalDays;
    }
    const smooth = campaign.clock.paused ? 0 : campaign.clock.dayProgress * perDay;
    const frac = Math.min(1, (job.phaseProgress + smooth) / job.phaseTarget);
    const r = facilityRectFor(defOf(st), st.fp);
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

  function outlinePath(ctx, fp) {
    const pts = iso.outline(fp.col, fp.row, fp.w, fp.h);
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
  }

  function drawSelection(ctx) {
    const s = buildMode ? stations.find((v) => v.uid === buildSelected) : selection.selected;
    if (!s || (ghost && ghost.hideUid === s.uid)) return;
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
      outlinePath(ctx, s.fp);
      ctx.strokeStyle = buildMode ? '#FFD166' : '#4FC3F7';
      ctx.fillStyle = buildMode ? 'rgba(255,209,102,0.25)' : 'rgba(79,195,247,0.22)';
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  // Build screen: the footprint under the ghost, green if it fits, red if not.
  function drawGhostFloor(ctx) {
    if (!ghost) return;
    const s = F.sizeOf(ghost.def, ghost.rot);
    ctx.save();
    outlinePath(ctx, { col: ghost.col, row: ghost.row, w: s.w, h: s.h });
    ctx.fillStyle = ghost.ok ? 'rgba(124,255,178,0.38)' : 'rgba(255,90,90,0.42)';
    ctx.strokeStyle = ghost.ok ? '#7CFFB2' : '#FF5A5A';
    ctx.lineWidth = 5;
    ctx.fill();
    ctx.stroke();
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
      const can = campaign.canStartProject();
      ctx.fillStyle = '#FFD166';
      ctx.font = 'bold 32px system-ui, sans-serif';
      ctx.fillText(can.ok ? 'No project running — tap here to build a robot' : can.reason, tx, r.y + r.h / 2, r.w - 120);
    } else {
      const phase = PHASES[job.phaseIndex];
      const pct = Math.min(1, job.phaseProgress / job.phaseTarget);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 30px system-ui, sans-serif';
      const forWho = job.data.contractId ? campaign.contracts.get(job.data.contractId)?.customer : null;
      ctx.fillText(`${job.name}${forWho ? ` for ${forWho}` : ''} · ${job.phaseIndex + 1}/5 ${phase.name}`, tx, r.y + 28, r.w - 380);
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

  // Build shortcut (bible §6.3 Workshop Hub): bottom right, above the info card when one is open.
  function buildButtonRect() {
    const sr = layout.safeRect;
    const w = 230;
    const h = 116;
    const bottom = card.isOpen ? card.rect().y - 20 : sr.y + sr.h - 28;
    return { x: sr.x + sr.w - 28 - w, y: bottom - h, w, h };
  }

  function drawBuildButton(ctx) {
    const r = buildButtonRect();
    drawButton(ctx, r, '', { accent: '#FFB74D' });
    assets.drawContained(ctx, BUILD_ART.buildIcon, { x: r.x + 14, y: r.y + 10, w: 88, h: 88 });
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 40px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('Build', r.x + 110, r.y + r.h / 2 - 2);
  }

  function focusOn(a) {
    const f = agentFeet(a, { x: 0, y: 0 });
    camera.centerOn(f.x, f.y - a.height / 2);
  }

  // --- effects hooked to game events ---------------------------------------------
  // Point on a station's top where the welding happens.
  function weldPoint(st) {
    const r = facilityRectFor(defOf(st), st.fp);
    return { x: r.x + r.w * 0.52, y: r.y + r.h * 0.5 };
  }

  bus.on('project:phase', ({ job, phase }) => {
    const st = primaryStation(phase.id);
    if (!st) return;
    const p = weldPoint(st);
    st.pop = 0.35;
    vfx.sprite('world', VFX_ART.blueprintPop, p.x, p.y - 30, { size: 140, life: 1.1, rise: 30 });
    // The last phase ends in the robot-finished moment, which says it louder.
    if (job.phaseIndex < PHASES.length - 1) vfx.text('world', `${phase.name} done!`, p.x, p.y - 120, { color: FLOAT_COLORS.info, size: 34, life: 1.8 });
  });

  bus.on('robot:breakthroughRoll', ({ hit, phase }) => {
    if (!hit) return;
    const st = primaryStation(phase.id);
    if (!st) return;
    const p = weldPoint(st);
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

  // A new facility lands with a puff and a pop.
  bus.on('facility:placed', ({ item }) => {
    const v = stations.find((s) => s.uid === item.uid);
    if (!v) return;
    v.pop = 0.35;
    const c = iso.corner(v.fp.col + v.fp.w / 2, v.fp.row + v.fp.h / 2);
    vfx.dust('world', c.x, c.y, { count: 10, spreadX: 60 });
  });

  // Welding sparks while someone works at a station (visual only, real time).
  let sparkTimer = 0;
  let spriteSparkTimer = 0;
  function updateSparks(dt) {
    if (campaign.clock.paused || !campaign.activeProject) return;
    sparkTimer -= dt;
    spriteSparkTimer -= dt;
    for (const st of stations) {
      const a = st.user;
      if (!a || a.task !== 'working') continue;
      const p = weldPoint(st);
      if (sparkTimer <= 0) vfx.sparks('world', p.x + (Math.random() - 0.5) * 30, p.y, { count: 4 });
      if (spriteSparkTimer <= 0) vfx.sprite('world', VFX_ART.smallSparks, p.x, p.y - 20, { size: 76, life: 0.4, from: 0.6, to: 1, hold: 0.1 });
    }
    if (sparkTimer <= 0) sparkTimer = 0.08 + Math.random() * 0.14;
    if (spriteSparkTimer <= 0) spriteSparkTimer = 0.9 + Math.random() * 0.8;
  }

  // --- screen hooks --------------------------------------------------------
  let dragId = null;
  const screen = {
    camera,
    iso,
    room,
    selection,
    card,
    topBar,
    taps: [], // for automated checks: { screen, world, picked }
    get grid() {
      return grid;
    },
    get stations() {
      return stations;
    },
    get agents() {
      return agents;
    },
    // First station of a type (tests, guide).
    stationOf: (defId) => stations.find((s) => s.item.def === defId) ?? null,
    stationFor,
    agentFor: (staffId) => agents.find((a) => a.staffId === staffId) || null,
    taskLabel: (staffId) => {
      const a = screen.agentFor(staffId);
      return a ? taskLabel(a) : '';
    },
    // Screen rect of a worker's picture (for the guide).
    screenRectOf(a) {
      const b = agentBounds(a);
      const p = camera.worldToScreen(b.x, b.y);
      return { x: p.x, y: p.y, w: b.w * camera.zoom, h: b.h * camera.zoom };
    },
    // Screen (logical) point of a worker's middle, for tests.
    screenPointOf(a) {
      const b = agentBounds(a);
      return camera.worldToScreen(b.x + b.w / 2, b.y + b.h / 2);
    },
    // Screen point of a cell's centre (tests, Build screen).
    screenPointOfCell(col, row) {
      const c = iso.cellCenter(col, row);
      return camera.worldToScreen(c.x, c.y);
    },
    // The grid cell under a screen point (may be outside the floor).
    cellAt(p) {
      const w = camera.screenToWorld(p.x, p.y);
      const plan = iso.toPlan(w.x, w.y);
      return { col: Math.floor(plan.x / ROOM.cellSize), row: Math.floor(plan.y / ROOM.cellSize) };
    },
    // The facility under a screen point, or null: the one standing on the floor cell under the finger first
    // (tall pictures overlap their neighbours), else the picture drawn there.
    facilityAt(p) {
      const cell = screen.cellAt(p);
      const onCell = stations.find((s) => cell.col >= s.fp.col && cell.row >= s.fp.row && cell.col < s.fp.col + s.fp.w && cell.row < s.fp.row + s.fp.h);
      if (onCell) return onCell;
      const w = camera.screenToWorld(p.x, p.y);
      const hit = selection.pick(w.x, w.y);
      return hit?.kind === 'facility' ? hit : null;
    },
    buildButtonRect,
    stripRect,

    // Build screen hooks.
    setBuildMode(on) {
      if (buildMode === !!on) return;
      buildMode = !!on;
      ghost = null;
      buildSelected = null;
      room.invalidate();
    },
    get buildMode() {
      return buildMode;
    },
    setGhost(g) {
      ghost = g;
    },
    get ghost() {
      return ghost;
    },
    setBuildSelected(uid) {
      buildSelected = uid;
    },
    // Centre the room (or a cell) in the camera's view.
    centerRoom(cell = null) {
      ensureRoom();
      if (cell) {
        const c = iso.cellCenter(cell.col, cell.row);
        camera.centerOn(c.x, c.y);
        return;
      }
      // The floor the company owns (not the locked areas beyond it).
      let cols = F.area.cols;
      let rows = F.area.rows;
      for (const z of F.zones) if (F.isOwned(z.id)) (cols = Math.max(cols, z.col + z.w)), (rows = Math.max(rows, z.row + z.h));
      const g = iso.gridBounds(cols, rows);
      camera.centerOn(g.x + g.w / 2, g.y + g.h / 2 - 60);
    },

    init() {
      roomOps = layoutRoom();
      room.setPixelScale(renderer.pixelScale);
      camera.pixelScale = renderer.pixelScale;
      screen.centerRoom();
    },

    // Screen pixel scale changed (resize / rotate): layer and sprites are remade at the new size.
    resize() {
      room.setPixelScale(renderer.pixelScale);
      camera.pixelScale = renderer.pixelScale;
      if (router.currentName === 'build') return; // the Build screen sets its own view
      // Tall phones have a taller view: keep the room where it was, clamped/centred in the new view.
      const cx = camera.x + camera.visibleW / 2;
      const cy = camera.y + camera.visibleH / 2;
      camera.setView(W, renderer.height);
      camera.centerOn(cx, cy);
    },

    // A robot just finished: it pops onto the newest display with the completion flash and confetti.
    celebrate() {
      selection.clear();
      const st = stations.find((s) => s.displayIndex === 0) ?? primaryStation('assembly');
      if (!st) return;
      const d = defOf(st);
      const r = facilityRectFor(d, st.fp);
      const x = r.x + r.w / 2;
      const y = d.stand ? r.y + r.h * d.stand - SIZES.robotH / 2 : r.y + r.h * 0.4;
      camera.centerOn(x, y + 120);
      st.reveal = { t: 0 };
      vfx.flash({ peak: 0.7, life: 0.45 });
      vfx.sprite('world', VFX_ART.robotDone, x, y, { size: 250, life: 1.1, from: 0.3, to: 1.05, hold: 0.1, alpha: 0.9 });
      vfx.sprite('world', VFX_ART.bigBurst, x, y + 10, { size: 160, life: 0.55, from: 0.5, to: 1.1, hold: 0.05 });
      vfx.confetti('world', x, y - 20, { count: 56 });
    },

    // params.selectId: select that worker and centre on them.
    enter(params = {}) {
      if (!roomOps) screen.init();
      camera.viewX = 0;
      camera.viewY = 0;
      camera.setView(W, renderer.height);
      screen.setBuildMode(false);
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

    // Real-time visuals (runs while paused too).
    update(dt) {
      time += dt;
      for (const st of stations) {
        if (st.pop > 0) st.pop = Math.max(0, st.pop - dt);
        if (st.reveal && (st.reveal.t += dt) > 1) st.reveal = null;
      }
      updateSparks(dt);
    },

    onTap(p) {
      if (topBar.handleTap(p)) return;
      if (hitRect(p, stripRect())) {
        goProject();
        return;
      }
      if (card.contains(p)) {
        const b = card.buttonAt(p);
        if (b === 'roster') router.go('roster', { focusId: card.item.staffId });
        if (b === 'build') router.go('build', { selectUid: card.item.uid });
        return; // taps on the card stay on the card
      }
      if (hitRect(p, buildButtonRect())) {
        router.go('build');
        return;
      }
      const w = camera.screenToWorld(p.x, p.y);
      const picked = selection.handleTap(w.x, w.y);
      screen.taps.push({ screen: { x: p.x, y: p.y }, world: w, picked: picked ? picked.staffId || picked.item?.def || picked.kind : null });
      if (screen.taps.length > 50) screen.taps.shift();
    },

    onDragStart(p) {
      const start = { x: p.startX, y: p.startY };
      if (dragId !== null || card.contains(start) || topBar.contains(start) || hitRect(start, stripRect()) || hitRect(start, buildButtonRect())) return;
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

    // The room and everything in it, in the camera (shared with the Build screen).
    renderWorld(ctx) {
      ensureRoom();
      camera.apply(ctx);
      room.render(ctx, 0, 0);
      drawGhostFloor(ctx);
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
      for (const s of stations) if (!(ghost && ghost.hideUid === s.uid)) drawables.push(s);
      for (const a of agents) drawables.push(a);
      if (ghost) drawables.push(ghostDrawable(ghost));
      drawables.sort(byDepth);
      for (const d of drawables) {
        if (d.kind === 'worker') {
          if (camera.isVisible(agentBounds(d))) drawWorker(ctx, d);
        } else if (d.kind === 'ghost') drawFacilityArt(ctx, FACILITIES[d.g.def], d.fp, !!d.g.rot, 0, 0.72);
        else if (camera.isVisible(d.getBounds())) drawStation(ctx, d);
      }
      if (!buildMode) drawProgressPill(ctx);
      drawOverheads(ctx);
      vfx.render(ctx, 'world');
      camera.restore(ctx);
    },

    render(ctx) {
      ctx.fillStyle = '#0B0E12';
      ctx.fillRect(0, 0, W, renderer.height);
      screen.renderWorld(ctx);
      topBar.render(ctx);
      drawStrip(ctx);
      drawBuildButton(ctx);
      card.render(ctx);
    },
  };

  const ghostView = { kind: 'ghost', g: null, fp: null, depth: 0 };
  function ghostDrawable(g) {
    const s = F.sizeOf(g.def, g.rot);
    ghostView.g = g;
    ghostView.fp = { col: g.col, row: g.row, w: s.w, h: s.h };
    ghostView.depth = (g.col + s.w / 2 + g.row + s.h / 2) * ROOM.cellSize;
    return ghostView;
  }

  function byDepth(a, b) {
    return depthOf(a) - depthOf(b);
  }
  function depthOf(d) {
    return d.kind === 'worker' ? d.x + d.y : d.depth;
  }
  return screen;
}

// Split a sentence into lines of about n characters (whole words).
function wrap(str, n) {
  const out = [];
  let line = '';
  for (const word of str.split(' ')) {
    if (line && (line + ' ' + word).length > n) {
      out.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) out.push(line);
  return out;
}

function easeOutBack(k) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
}
