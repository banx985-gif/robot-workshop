// The home's layout (Milestone 10, bible §10 / §24 / §25): every room and facility is a piece on the hidden grid that
// Build Mode can place, move and sell, and the home's stage (S1 → S2 grows the floor). Built on core/FacilitySystem
// (footprints, overlap, the floor and its expansion zone, 50% sell value, effect totals, save) with CAREWORKS' own
// rules on top: a room's walls and doorway come with it (data/rooms.js ROOM_SHAPE), a facility's seats and posts come
// with it (data/facilities.js spots), and the access check — every room and working facility must be reachable
// through its doorway / seats from the front entrance (and so from the Nurse Station), and no part of the floor may be
// cut off. Pure rules on plain state (no drawing, no walking, no money): the home world moves people and pays.
//
//   createLayout({ saved, bus }) → layout
//   layout.pieces · layout.byId(id) · layout.byUid(uid) · layout.rooms · layout.roomNumber(id) · layout.ofDef(defId)
//   layout.stage · layout.stageDef · layout.floor { cols, rows } · layout.capacity · layout.cap
//   layout.spotTile(ref) · layout.buildGrid(grid) · layout.wallTiles() · layout.doorways() · layout.props()
//   layout.unlock(defId) → { ok, reason } (Milestone 21: a research unlock passes once its node is done — setResearchCheck(fn)) · layout.check(defId, col, row, uid?) → { ok, code, reason }
//   layout.place(defId, col, row) · layout.move(uid, col, row) · layout.sell(uid) → { ok, reason, piece, refund }
//   layout.canSell(uid, { occupied }) → { ok, reason } · layout.findSpot(defId, near, uid?)
//   layout.upgrade() → { ok, reason } · layout.problems() → [{ piece, text }] · layout.fixUp() → [moved pieces]
//   layout.effectTotal(key) · layout.serialize()
// Milestone 25c: levels 1–3 per placed piece (core/FacilitySystem levels; data/facilities.js LEVELS): layout.levelOf(uid)
//   · levelOfDef(defId) (the best copy, 0 when none) · levelMultOf(uid) · levelMultOfDef(defId) (1 when none) ·
//   upgradePending(uid) · invested(uid) · nextUpgrade(uid) → { level, cost, days, rank } | null ·
//   startUpgrade(uid, { today }) (the home world checks money and rank first) · tickUpgrades(today) → [{ uid, level }]
// Milestone 24: stages S3–S5 (each opens one or two floor zones), the building site (layout.building: the upgrade under
// way, the world finishes it), the 70-resident logical cap, and specialist wings: painted floor tiles per wing
// (layout.wings: paint / tilesOf / wingAt / wingOfPiece / hubOf / active / unlocked). Wing-only rooms (RM04–RM07) and
// the Rank A hubs (F30–F32) must stand fully inside their wing; a wing works once a hub stands inside it.
import { FacilitySystem } from '../../../../core/FacilitySystem.js';
import { ROOMS, ROOM_SHAPE, roomById } from '../../data/rooms.js';
import { FACILITIES, facilityById, LEVELS, upgradeCost, levelMultOf } from '../../data/facilities.js';
import { FIXED_WALLS, DEFAULT_LAYOUT, PROPS, STAGES, MAX_FLOOR, ENTRANCE, SPOTS, pieceTiles, zonesOf, LOGICAL_CAP } from '../../data/home.js';
import { WINGS_SPECIAL, wingById, wingForRoom, HUB_ONLY } from '../../data/wings.js';

const key = (c, r) => `${c},${r}`;
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
// Old spot names (Milestones 3–9) that now belong to a piece: resolved on the first piece of that kind.
const ALIASES = {
  'help.room': ['RM01', 'help'], 'help.room2': ['RM01', 'help2'],
  'help.dining': ['F03', 'help1'], ...Object.fromEntries([2, 3, 4, 5, 6].map((n) => [`help.dining${n}`, ['F03', `help${n}`]])),
  'help.lounge': ['F05', 'help1'], ...Object.fromEntries([2, 3, 4, 5, 6].map((n) => [`help.lounge${n}`, ['F05', `help${n}`]])),
  ...Object.fromEntries([1, 2, 3, 4, 5].map((n) => [`rest.${n}`, ['F08', `rest${n}`]])),
};
const wallCells = (w) => {
  const out = [];
  for (let i = 0; i < w.len; i++) {
    const t = w.dir === 'row' ? { col: w.col + i, row: w.row } : { col: w.col, row: w.row + i };
    out.push({ ...t, gap: w.gaps.includes(i), wall: w.id, dir: w.dir });
  }
  return out;
};
const FIXED_CELLS = FIXED_WALLS.flatMap(wallCells);
const FIXED_PROPS = PROPS.filter((p) => !p.attach);
const defOf = (defId) => roomById(defId) ?? facilityById(defId);
export const isRoomDef = (defId) => !!roomById(defId);

export function newLayoutState() {
  return { placement: DEFAULT_LAYOUT.map((p, i) => ({ uid: i + 1, def: p.def, col: p.col, row: p.row, rot: 0 })), names: Object.fromEntries(DEFAULT_LAYOUT.map((p, i) => [i + 1, p.id])), nextUid: DEFAULT_LAYOUT.length + 1, stage: 1, sold: [], debugUnlock: false, wings: {}, building: null };
}

export function createLayout({ saved = null, bus = null } = {}) {
  const defs = {};
  for (const r of ROOMS) defs[r.id] = { id: r.id, name: r.name, cost: r.cost, w: ROOM_SHAPE.w, h: ROOM_SHAPE.h, effects: [{ key: r.effect.key, value: r.effect.value }] };
  for (const f of FACILITIES) defs[f.id] = { id: f.id, name: f.name, cost: f.cost, w: f.w, h: f.h, effects: [{ key: f.effect.key, value: f.effect.value }] };
  const S1 = STAGES[0];
  const fs = new FacilitySystem({
    bus,
    defs,
    area: { cols: S1.cols, rows: S1.rows },
    zones: STAGES.flatMap(zonesOf).map((z) => ({ ...z })), // (Milestone 24: S3–S5's zones too)
    entrance: ENTRANCE,
    keepClear: FIXED_CELLS.filter((c) => c.gap), // the lounge's doorways
    fixed: [...FIXED_CELLS.filter((c) => !c.gap), ...FIXED_PROPS.map((p) => ({ col: p.col, row: p.row }))],
    levels: { max: LEVELS.max, mult: LEVELS.mult }, // (Milestone 25c)
    reasons: { outside: 'Off the floor', locked: 'Off the floor: that part comes with a bigger stage', overlap: 'Overlaps the {name}', door: 'Keep the doorway clear', blocked: 'Blocks the only path to the {name}', fixed: 'That is part of the building (a wall or fixed furniture)' },
  });
  const s = { ...newLayoutState(), ...(saved ?? {}) };
  s.names = { ...s.names };
  s.sold = [...(s.sold ?? [])];
  s.wings = Object.fromEntries(Object.entries(s.wings ?? {}).filter(([id]) => wingById(id)).map(([id, t]) => [id, [...t]])); // (Milestone 24; an older save: none)
  s.building = s.building ? { ...s.building } : null;
  fs.load({ placement: s.placement, nextUid: s.nextUid, expansions: STAGES.filter((st) => st.n <= s.stage).flatMap(zonesOf).map((z) => z.id), levels: s.levels ?? null }); // (Milestone 25c: an older save has no levels — all Level I)

  // --- pieces ---------------------------------------------------------------------------------------------------
  let cache = null;
  let cacheV = -1;
  const idOf = (item) => s.names[item.uid] ?? `${item.def}-${item.uid}`;
  function pieces() {
    if (cacheV === fs.version && cache) return cache;
    cache = fs.placed.map((it) => ({ uid: it.uid, defId: it.def, col: it.col, row: it.row, ...pieceTiles({ id: idOf(it), def: it.def, col: it.col, row: it.row }) }));
    cacheV = fs.version;
    return cache;
  }
  const byId = (id) => pieces().find((p) => p.id === id) ?? null;
  const byUid = (uid) => pieces().find((p) => p.uid === uid) ?? null;
  const ofDef = (defId) => pieces().filter((p) => p.defId === defId);
  const rooms = () => pieces().filter((p) => p.kind === 'room');
  const stageDef = () => STAGES[s.stage - 1];
  const floor = () => ({ cols: stageDef().cols, rows: stageDef().rows });

  // Everything nobody walks through for a list of pieces: the floor beyond the stage, fixed walls and props, each
  // room's furniture and walls, each facility's footprint. → Uint8Array (1 = blocked) over MAX_FLOOR.
  const COLS = MAX_FLOOR.cols;
  const ROWS = MAX_FLOOR.rows;
  function blockedFor(list) {
    const b = new Uint8Array(COLS * ROWS);
    const { cols, rows } = floor();
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (c >= cols || r >= rows) b[r * COLS + c] = 1;
    const set = (c, r) => {
      if (c >= 0 && r >= 0 && c < COLS && r < ROWS) b[r * COLS + c] = 1;
    };
    for (const t of FIXED_CELLS) if (!t.gap) set(t.col, t.row);
    for (const p of FIXED_PROPS) set(p.col, p.row);
    for (const p of list) {
      const rects = p.kind === 'room' ? p.blockedInside : [p.box];
      for (const q of rects) for (let r = q.row; r < q.row + q.h; r++) for (let c = q.col; c < q.col + q.w; c++) set(c, r);
      for (const w of p.walls) for (const t of wallCells(w)) if (!t.gap) set(t.col, t.row);
    }
    return b;
  }
  function reachFrom(blocked, start) {
    const seen = new Uint8Array(COLS * ROWS);
    if (blocked[start.row * COLS + start.col]) return seen;
    const stack = [start.row * COLS + start.col];
    seen[stack[0]] = 1;
    while (stack.length) {
      const i = stack.pop();
      const c = i % COLS;
      const r = (i - c) / COLS;
      for (const [dc, dr] of DIRS) {
        const nc = c + dc;
        const nr = r + dr;
        if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS) continue;
        const ni = nr * COLS + nc;
        if (seen[ni] || blocked[ni]) continue;
        seen[ni] = 1;
        stack.push(ni);
      }
    }
    return seen;
  }
  // The access rules for a list of pieces → [{ piece, code: 'spot' | 'noWay' | 'pocket', spot?, covered? }].
  //   every spot of every piece (a room's doorway and inside, a facility's seats and posts) is open floor that can be
  //   walked to from the front entrance; a piece without spots has at least one open cell beside it that can; and
  //   (before = the reach of the layout as it is now) no floor that can be walked to now is cut off by the change. (A
  //   corner that was already closed off — the one under the Staff Room since Milestone 5 — is not held against it.)
  function accessOf(list, before = null) {
    const blocked = blockedFor(list);
    const reached = reachFrom(blocked, ENTRANCE);
    const ok = (t) => t.col >= 0 && t.row >= 0 && t.col < COLS && t.row < ROWS && reached[t.row * COLS + t.col] === 1;
    const out = [];
    for (const p of list) {
      const spots = Object.entries(p.spots);
      if (spots.length) {
        for (const [name, t] of spots) {
          if (ok(t)) continue;
          out.push({ piece: p, code: 'spot', spot: name, covered: blocked[t.row * COLS + t.col] === 1 });
          break;
        }
      } else {
        const b = p.box;
        const around = [];
        for (let c = b.col; c < b.col + b.w; c++) around.push({ col: c, row: b.row - 1 }, { col: c, row: b.row + b.h });
        for (let r = b.row; r < b.row + b.h; r++) around.push({ col: b.col - 1, row: r }, { col: b.col + b.w, row: r });
        if (!around.some(ok)) out.push({ piece: p, code: 'noWay' });
      }
    }
    let pocket = 0;
    if (before) for (let i = 0; i < COLS * ROWS; i++) if (before[i] && !blocked[i] && !reached[i]) pocket++;
    if (pocket) out.push({ piece: null, code: 'pocket', cells: pocket });
    return out;
  }
  const SPOT_WORDS = { doorway: 'doorway', inside: 'way in', dining: 'seats', resident: 'seats', staff: 'staff post', rest: 'rest area' };
  const spotWord = (name) => SPOT_WORDS[name] ?? (/^seat|^help/.test(name) ? 'seats' : /^rest/.test(name) ? 'rest area' : 'way in');
  function problemText(pr, candidateUid) {
    if (pr.code === 'pocket') return 'Would cut off part of the floor: every part of the home must stay reachable';
    const name = pr.piece.name;
    if (pr.piece.uid === candidateUid) return pr.code === 'noWay' ? `The ${name} would have no way in` : `The ${name}'s ${spotWord(pr.spot)} would be blocked`;
    if (pr.code === 'spot' && pr.covered) return `Covers the ${name}'s ${spotWord(pr.spot)}`;
    return `Blocks the only path to the ${name}`;
  }

  // --- unlocks, capacity ---------------------------------------------------------------------------------------------
  let researched = () => false; // (Milestone 21: the home world says which research nodes are done)
  let rankOk = () => false; // (Milestone 26: the home world says whether the home has reached a Rank)
  let secretOk = () => false; // (Milestone 31: the home world says whether a secret's unlock flag is set)
  function unlock(defId) {
    const d = defOf(defId);
    if (!d) return { ok: false, reason: 'Unknown' };
    // (Milestone 31) F34 / F35 open only through their own secret's flag — never by ?debug=1's unlock
    if (d.secret) return secretOk(d.unlock.flag) ? { ok: true, reason: null } : { ok: false, reason: 'Unknown' };
    if (d.unlock.type === 'start' || s.debugUnlock) return { ok: true, reason: null };
    if (d.unlock.type === 'research' && d.unlock.node && researched(d.unlock.node)) return { ok: true, reason: null };
    if (d.unlock.type === 'rank' && rankOk(d.unlock.value)) return { ok: true, reason: null }; // (Milestone 26)
    // (Milestone 24: a wing unlock — the wing's own hub needs the wing painted; its rooms need the wing working)
    const w = d.unlock.type === 'wing' ? wingById(d.unlock.value) : null;
    if (w) {
      if (!wingUnlocked(w.id)) return { ok: false, reason: `Locked: ${d.unlock.text} (it opens at Stage ${w.stage})` };
      if (wingTiles(w.id).size && (w.hubs.includes(defId) || hubOf(w.id))) return { ok: true, reason: null };
      return { ok: false, reason: `Locked: ${d.unlock.text} — paint it in Build Mode → Wings${w.hubs.includes(defId) ? '' : ', with its hub inside'}` };
    }
    return { ok: false, reason: `Locked: ${d.unlock.text}` };
  }
  const cap = () => Math.min(stageDef().capacity, LOGICAL_CAP); // (Milestone 24: never more than 70, whatever the stage)
  const capacity = () => Math.min(rooms().length, cap());

  // Can defId stand at (col, row)? uid: the piece being moved (null for a new one). → { ok, code, reason }
  function check(defId, col, row, uid = null) {
    if (!defs[defId]) return { ok: false, code: 'unknown', reason: 'Unknown' };
    if (uid == null && isRoomDef(defId) && rooms().length >= cap()) return { ok: false, code: 'capacity', reason: `Stage ${s.stage} holds ${cap()} residents: every room is built${s.stage < STAGES.length ? ' (upgrade the home for more)' : ''}` };
    const base = fs.check(defId, col, row, 0, uid);
    if (!base.ok && base.code !== 'blocked') return base;
    // (Milestone 24: a wing-only room or a wing hub stands fully inside its wing — wherever wings can exist, Stage 3 on.
    // Before that they stay locked; only the ?debug=1 unlock places them, anywhere, as in Milestones 10–23.)
    const needWing = wingForRoom(defId) ?? HUB_ONLY[defId] ?? null;
    if (needWing && (s.stage >= 3 || !s.debugUnlock)) {
      const w = wingById(needWing);
      const box = { col, row, w: defs[defId].w, h: defs[defId].h };
      if (!wingUnlocked(needWing)) return { ok: false, code: 'wing', reason: `Needs the ${w.name}: it opens at Stage ${w.stage}` };
      if (!boxIn(box, needWing)) return { ok: false, code: 'wing', reason: `The ${defs[defId].name} must stand inside the ${w.name} (paint it in Build Mode → Wings)` };
    }
    const cand = { uid: uid ?? -1, defId, col, row, ...pieceTiles({ id: uid != null ? idOf({ uid, def: defId }) : 'new', def: defId, col, row }) };
    const list = pieces().filter((p) => p.uid !== uid).concat(cand);
    const probs = accessOf(list, reachFrom(blockedFor(pieces()), ENTRANCE));
    if (probs.length) {
      const first = probs.find((x) => x.piece?.uid === cand.uid) ?? probs.find((x) => x.code !== 'pocket') ?? probs[0];
      return { ok: false, code: 'access', reason: problemText(first, cand.uid) };
    }
    if (!base.ok) return base;
    return { ok: true, code: null, reason: null };
  }
  function place(defId, col, row) {
    const u = unlock(defId);
    if (!u.ok) return u;
    const c = check(defId, col, row);
    if (!c.ok) return c;
    const taken = !!byId(defId);
    const res = fs.place(defId, col, row);
    if (!res.ok) return res;
    // its own id: a room R<n>; a facility its def id (F14), or F03-12 for a second Dining Room
    s.names[res.item.uid] = isRoomDef(defId) ? `R${res.item.uid}` : taken ? `${defId}-${res.item.uid}` : defId;
    cache = null;
    return { ok: true, reason: null, piece: byUid(res.item.uid) };
  }
  function move(uid, col, row) {
    const p = byUid(uid);
    if (!p) return { ok: false, reason: 'Nothing there' };
    const c = check(p.defId, col, row, uid);
    if (!c.ok) return c;
    const res = fs.move(uid, col, row);
    if (!res.ok) return res;
    cache = null;
    return { ok: true, reason: null, piece: byUid(uid), from: { col: p.col, row: p.row } };
  }
  // occupied(pieceId) → the resident living in it (a room), or null
  function canSell(uid, { occupied = () => null } = {}) {
    const p = byUid(uid);
    if (!p) return { ok: false, reason: 'Nothing there' };
    const who = occupied(p.id);
    if (who) return { ok: false, reason: `${who} lives here: a room can only be sold when it is empty` };
    const f = facilityById(p.defId);
    if (f?.essential && ofDef(p.defId).length <= 1) return { ok: false, reason: `The home needs its ${f.name}: it is the only one` };
    return { ok: true, reason: null, refund: fs.sellValue(fs.get(uid)) };
  }
  function sell(uid, opts = {}) {
    const can = canSell(uid, opts);
    if (!can.ok) return can;
    const p = byUid(uid);
    const res = fs.remove(uid);
    s.sold.push({ id: p.id, def: p.defId, col: p.col, row: p.row, refund: res.refund, day: opts.day ?? null });
    if (s.sold.length > 40) s.sold.shift();
    delete s.names[uid];
    cache = null;
    return { ok: true, reason: null, piece: p, refund: res.refund };
  }
  function findSpot(defId, near = null, uid = null) {
    const n = near ?? { col: Math.floor(floor().cols / 2), row: Math.floor(floor().rows / 2) };
    const spots = [];
    const { cols, rows } = floor();
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) spots.push({ col: c, row: r, d: Math.abs(c - n.col) + Math.abs(r - n.row) });
    spots.sort((a, b) => a.d - b.d || a.row - b.row || a.col - b.col);
    for (const sp of spots) {
      if (Math.abs(sp.col - n.col) + Math.abs(sp.row - n.row) > 40) break;
      if (!fs.check(defId, sp.col, sp.row, 0, uid).ok) continue; // (cheap first)
      if (check(defId, sp.col, sp.row, uid).ok) return { col: sp.col, row: sp.row };
    }
    return null;
  }

  // --- spots ---------------------------------------------------------------------------------------------------------
  const firstOf = (defId) => ofDef(defId)[0] ?? null;
  // (Milestone 32) The placed piece a spot ref stands at ('lounge.lc', 'F04.cook2', an alias) — null for a tile or a name.
  function pieceOfSpot(ref) {
    if (!ref || typeof ref !== 'string' || ref.startsWith('tile:')) return null;
    const alias = ALIASES[ref];
    if (alias) return byId(alias[0]) ?? (alias[0] === 'RM01' ? null : firstOf(alias[0]));
    const dot = ref.indexOf('.');
    if (dot <= 0) return null;
    const key = ref.slice(0, dot);
    return byId(key) ?? (facilityById(key) ? firstOf(key) : null);
  }
  function openTile(t) {
    const b = blockedFor(pieces());
    const reached = reachFrom(b, ENTRANCE);
    if (reached[t.row * COLS + t.col]) return t;
    let best = null;
    let bestD = Infinity;
    for (let i = 0; i < COLS * ROWS; i++) {
      if (!reached[i]) continue;
      const c = i % COLS;
      const r = (i - c) / COLS;
      const d = Math.abs(c - t.col) + Math.abs(r - t.row);
      if (d < bestD) [best, bestD] = [{ col: c, row: r }, d];
    }
    return best ?? t;
  }
  const openCache = new Map();
  let openV = -1;
  // Milestone 15: a kitchen's cook spots ('F04.cook', 'F04.cook2'): the open cells beside it that can be walked to,
  // nearest its front first. A kitchen has no spots of its own, so the access check (and older saves' layouts) is
  // unchanged.
  function besideTile(p, n) {
    const b = p.box;
    const blocked = blockedFor(pieces());
    const reached = reachFrom(blocked, ENTRANCE);
    const around = [];
    for (let c = b.col; c < b.col + b.w; c++) around.push({ col: c, row: b.row + b.h }, { col: c, row: b.row - 1 });
    for (let r = b.row; r < b.row + b.h; r++) around.push({ col: b.col + b.w, row: r }, { col: b.col - 1, row: r });
    const front = { col: b.col + Math.floor(b.w / 2), row: b.row + b.h };
    const open = around.filter((t) => t.col >= 0 && t.row >= 0 && t.col < COLS && t.row < ROWS && reached[t.row * COLS + t.col] === 1);
    open.sort((x, y) => Math.abs(x.col - front.col) + Math.abs(x.row - front.row) - (Math.abs(y.col - front.col) + Math.abs(y.row - front.row)));
    return open[n] ?? open[0] ?? openTile(front);
  }
  // 'F03.dining' (a piece's spot, by its id), an old name ('help.dining', 'rest.2' → that piece's), or a hall spot
  // ('hall.cwPost': where it was, or the nearest open tile if a piece now stands on it).
  function spotTile(ref) {
    const alias = ALIASES[ref];
    if (alias) {
      const p = byId(alias[0]) ?? firstOf(alias[0] === 'RM01' ? '__none' : alias[0]);
      const t = p?.spots[alias[1]];
      if (t) return t;
    }
    const dot = ref.indexOf('.');
    if (dot > 0 && !SPOTS[ref]) {
      const p = byId(ref.slice(0, dot)) ?? (facilityById(ref.slice(0, dot)) ? firstOf(ref.slice(0, dot)) : null); // ('F01.staff' after the first one was sold: the next)
      const t = p?.spots[ref.slice(dot + 1)];
      if (t) return t;
    }
    if (openV !== fs.version) {
      openCache.clear();
      openV = fs.version;
    }
    const cook = dot > 0 && /^(?:cook|therapy|calm)([0-9]?)$/.exec(ref.slice(dot + 1)); // (Milestone 16: therapy spots beside the gym / physio space too)
    if (cook) {
      const p = byId(ref.slice(0, dot)) ?? firstOf(ref.slice(0, dot));
      if (p) {
        if (!openCache.has(ref)) openCache.set(ref, besideTile(p, cook[1] ? Number(cook[1]) - 1 : 0));
        return openCache.get(ref);
      }
    }
    const base = SPOTS[ref];
    if (!base) throw new Error(`No spot ${ref}`);
    if (!openCache.has(ref)) openCache.set(ref, openTile(base));
    return openCache.get(ref);
  }

  // --- wings (Milestone 24) -------------------------------------------------------------------------------------------
  let wv = 0; // bumped on every paint (the tile sets are rebuilt)
  const wingSets = new Map();
  let wingSetsV = -1;
  function wingTiles(id) {
    if (wingSetsV !== wv) {
      wingSets.clear();
      wingSetsV = wv;
    }
    if (!wingSets.has(id)) wingSets.set(id, new Set(s.wings[id] ?? []));
    return wingSets.get(id);
  }
  const wingUnlocked = (id) => !!wingById(id) && s.stage >= wingById(id).stage;
  const wingAt = (c, r) => WINGS_SPECIAL.find((w) => wingTiles(w.id).has(key(c, r)))?.id ?? null;
  function boxIn(b, id) {
    const t = wingTiles(id);
    if (!t.size) return false;
    for (let r = b.row; r < b.row + b.h; r++) for (let c = b.col; c < b.col + b.w; c++) if (!t.has(key(c, r))) return false;
    return true;
  }
  // The hub standing fully inside the wing (null: none — the wing does not work yet).
  function hubOf(id) {
    const w = wingById(id);
    return w ? pieces().find((p) => w.hubs.includes(p.defId) && boxIn(p.box, id)) ?? null : null;
  }
  // A piece's wing (null: the Home wing): a room by where its resident stands, a facility by its middle.
  function wingOfPiece(p) {
    if (!p) return null;
    const t = p.kind === 'room' ? p.spots.inside : { col: p.box.col + Math.floor(p.box.w / 2), row: p.box.row + Math.floor(p.box.h / 2) };
    return wingAt(t.col, t.row);
  }
  // Paint (on) or clear (off) a rectangle of floor for a wing. Painting takes only floor no other wing holds; clearing
  // may not leave one of its wing-only rooms or its hub outside it. → { ok, reason, changed }
  function paint(id, rect, on = true) {
    const w = wingById(id);
    if (!w) return { ok: false, reason: 'No such wing', changed: 0 };
    if (!wingUnlocked(id)) return { ok: false, reason: `The ${w.name} opens at Stage ${w.stage}`, changed: 0 };
    const { cols, rows } = floor();
    const c0 = Math.max(0, rect.col);
    const r0 = Math.max(0, rect.row);
    const c1 = Math.min(cols - 1, rect.col + rect.w - 1);
    const r1 = Math.min(rows - 1, rect.row + rect.h - 1);
    const cur = new Set(s.wings[id] ?? []);
    let changed = 0;
    let taken = 0;
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const k = key(c, r);
        if (on) {
          const other = wingAt(c, r);
          if (other && other !== id) taken++;
          else if (!cur.has(k)) {
            cur.add(k);
            changed++;
          }
        } else if (cur.delete(k)) changed++;
      }
    }
    if (!on) {
      const bad = pieces().find((p) => (wingForRoom(p.defId) ?? HUB_ONLY[p.defId]) === id && !boxInSet(p.box, cur));
      if (bad) return { ok: false, reason: `The ${bad.name} must stay inside the ${w.name}: move or sell it first`, changed: 0 };
    }
    if (!changed) return { ok: false, reason: taken ? 'That floor belongs to another wing' : on ? 'That floor is already in the wing' : 'That floor is not part of the wing', changed: 0 };
    if (cur.size) s.wings[id] = [...cur];
    else delete s.wings[id];
    wv++;
    return { ok: true, reason: null, changed, taken };
  }
  function boxInSet(b, set) {
    for (let r = b.row; r < b.row + b.h; r++) for (let c = b.col; c < b.col + b.w; c++) if (!set.has(key(c, r))) return false;
    return true;
  }
  const wings = {
    paint,
    tilesOf: (id) => [...wingTiles(id)].map((k) => k.split(',').map(Number)).map(([col, row]) => ({ col, row })),
    count: (id) => wingTiles(id).size,
    wingAt,
    wingOfPiece,
    hubOf,
    boxIn,
    unlocked: wingUnlocked,
    active: (id) => !!hubOf(id),
    painted: () => WINGS_SPECIAL.filter((w) => wingTiles(w.id).size).map((w) => w.id),
    get version() {
      return wv;
    },
  };
  let reachCache = null;
  let reachV = null;

  // (Milestone 30b) the home world may make level-ups cheaper / quicker (Bolt's blessing): cost(c) and days(d)
  let upgradeMods = { cost: (c) => c, days: (d) => d };
  const layout = {
    setUpgradeMods(m) {
      upgradeMods = { cost: m?.cost ?? ((c) => c), days: m?.days ?? ((d) => d) };
    },
    fs,
    wings,
    LOGICAL_CAP,
    state: s,
    get pieces() {
      return pieces();
    },
    byId,
    byUid,
    ofDef,
    get rooms() {
      return rooms();
    },
    roomNumber: (id) => rooms().findIndex((r) => r.id === id) + 1,
    get version() {
      return fs.version;
    },
    get stage() {
      return s.stage;
    },
    get stageDef() {
      return stageDef();
    },
    get floor() {
      return floor();
    },
    get cap() {
      return cap();
    },
    get capacity() {
      return capacity();
    },
    get debugUnlock() {
      return !!s.debugUnlock;
    },
    setDebugUnlock(on) {
      s.debugUnlock = !!on;
    },
    unlock,
    setResearchCheck(fn) {
      researched = fn ?? (() => false);
    },
    setRankCheck(fn) {
      rankOk = fn ?? (() => false);
    },
    setSecretCheck(fn) {
      secretOk = fn ?? (() => false);
    },
    check,
    place,
    move,
    sell,
    canSell,
    findSpot,
    spotTile,
    pieceOfSpot, // (Milestone 32)
    sellValue: (uid) => (fs.get(uid) ? fs.sellValue(fs.get(uid)) : 0),
    costOf: (defId) => defs[defId]?.cost ?? 0,
    effectTotal: (k) => fs.total(k),
    // --- Milestone 25c: levels ---
    levelOf: (uid) => fs.level(uid),
    levelOfDef: (defId) => fs.levelOfDef(defId),
    levelMultOf: (uid) => (fs.get(uid) ? levelMultOf(fs.get(uid).def, fs.level(uid)) : 1),
    levelMultOfDef: (defId) => levelMultOf(defId, Math.max(1, fs.levelOfDef(defId))),
    upgradePending: (uid) => fs.upgradePending(uid),
    invested: (uid) => fs.invested(uid),
    nextUpgrade(uid) {
      const it = fs.get(uid);
      if (!it) return null;
      const level = fs.level(uid) + 1;
      if (level > LEVELS.max) return null;
      // (Milestone 30b: the home world's upgrade mods — Bolt's blessing, cheaper and quicker)
      return { level, cost: upgradeMods.cost(upgradeCost(defs[it.def].cost, level)), days: upgradeMods.days(LEVELS.days[level - 1]), rank: LEVELS.rank[level - 1] };
    },
    startUpgrade(uid, { today = 0 } = {}) {
      const nx = layout.nextUpgrade(uid);
      if (!nx) return { ok: false, reason: 'Already at Level III' };
      const r = fs.startUpgrade(uid, { cost: nx.cost, today, days: nx.days });
      cache = null;
      return r.ok ? { ok: true, reason: null, ...nx, doneDay: r.doneDay } : { ok: false, reason: r.why };
    },
    tickUpgrades(today) {
      const done = fs.tickUpgrades(today);
      if (done.length) cache = null;
      return done;
    },
    // Mark a pathing Grid (MAX_FLOOR in size) for the current layout.
    buildGrid(grid) {
      const b = blockedFor(pieces());
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) grid.setBlocked(c, r, b[r * COLS + c] === 1);
      return grid;
    },
    isOpen(col, row) {
      if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return false;
      // (Milestone 24: worked out once per layout change — the S5 floor is 5,760 tiles, asked about tile by tile)
      const v = `${fs.version}:${s.stage}`;
      if (reachV !== v) {
        reachCache = reachFrom(blockedFor(pieces()), ENTRANCE);
        reachV = v;
      }
      return reachCache[row * COLS + col] === 1;
    },
    // Wall tiles to draw (the lounge's and each room's), doorway tiles (a doormat each) and where the props stand.
    wallTiles: () => [...FIXED_CELLS, ...pieces().flatMap((p) => p.walls.flatMap(wallCells))].filter((t) => !t.gap),
    doorways: () => [...FIXED_CELLS, ...pieces().flatMap((p) => p.walls.flatMap(wallCells))].filter((t) => t.gap),
    props() {
      return PROPS.flatMap((p) => {
        if (!p.attach) return [{ ...p }];
        const host = byId(p.attach.piece);
        return host ? [{ ...p, col: host.col + p.attach.col, row: host.row + p.attach.row }] : [];
      });
    },
    // What is wrong with the layout as it stands (an older save, a test) → [{ piece, text }].
    problems: () => accessOf(pieces()).map((pr) => ({ piece: pr.piece, text: problemText(pr, null) })),
    // A one-time fix-up for a layout that fails the access check: each piece in the way moves to the nearest spot where
    // everything passes (a room keeps its resident: the home world moves them with it). → the moved pieces
    fixUp() {
      const moved = [];
      for (let n = 0; n < pieces().length && accessOf(pieces()).length; n++) {
        const pr = accessOf(pieces()).find((x) => x.piece) ?? null;
        // facilities first (the nearest to the problem): a room, and whoever lives in it, moves only as a last resort
        const near = (p) => (pr ? Math.abs(p.col - pr.piece.col) + Math.abs(p.row - pr.piece.row) : 0);
        const others = pieces().filter((p) => p !== pr?.piece);
        const suspects = [...others.filter((p) => p.kind !== 'room').sort((a, b) => near(a) - near(b)), ...(pr ? [pr.piece] : []), ...others.filter((p) => p.kind === 'room').sort((a, b) => near(a) - near(b))];
        let done = false;
        for (const p of suspects) {
          const before = accessOf(pieces()).length;
          const spot = findSpot(p.defId, { col: p.col, row: p.row }, p.uid);
          if (!spot || (spot.col === p.col && spot.row === p.row)) continue;
          fs.move(p.uid, spot.col, spot.row);
          cache = null;
          if (accessOf(pieces()).length < before) {
            moved.push({ id: p.id, from: { col: p.col, row: p.row }, to: spot });
            done = true;
            break;
          }
          fs.move(p.uid, p.col, p.row); // (no better: put it back)
          cache = null;
        }
        if (!done) break;
      }
      return moved;
    },
    // The next stage's floor opens (S2 in front; S3–S5 beside and in front); every piece stays where it is.
    upgrade() {
      const next = STAGES[s.stage];
      if (!next) return { ok: false, reason: 'The home is at its largest stage' };
      const zs = zonesOf(next);
      if (!zs.every((z) => fs.zoneReady(z.id))) return { ok: false, reason: 'That floor is already open' };
      for (const z of zs) fs.openZone(z.id);
      s.stage = next.n;
      s.building = null;
      cache = null;
      return { ok: true, reason: null, stage: next };
    },
    // Milestone 24: the upgrade being built ({ to, startDay, doneDay } or null) — the home world starts and finishes it.
    get building() {
      return s.building;
    },
    setBuilding(b) {
      s.building = b ? { ...b } : null;
    },
    // The building site (the next stage's zones) while it is under way, for the drawing.
    siteZones: () => (s.building ? zonesOf(STAGES[s.building.to - 1]) : []),
    serialize() {
      const f = fs.serialize();
      return { placement: f.placement, nextUid: f.nextUid, ...(f.levels && Object.keys(f.levels).length ? { levels: f.levels } : {}), names: { ...s.names }, stage: s.stage, sold: s.sold.map((x) => ({ ...x })), debugUnlock: !!s.debugUnlock, wings: Object.fromEntries(Object.entries(s.wings).map(([id, t]) => [id, [...t]])), building: s.building ? { ...s.building } : null };
    },
  };
  return layout;
}
