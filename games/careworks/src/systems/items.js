// Care equipment — items (Milestone 25c, series common feature §4) on core/ItemSystem, with CAREWORKS's data
// (data/items.js) and hooks. An item is given to a staff member from their card: it raises one of the five stats training
// raises for good (never past their tier's cap, and no more than the season's item points), then it is used up. Loved
// groups give ×1.5 and a little Morale; a disliked one ×0.5. Spares sell back for a little.
// Items only ever come from play — this file is the only place one is added, and only through grant(source) with a
// source from ITEM_SOURCES (tests scan them: never a shop, Care Tokens or real money).
//
//   const items = createItems({ state, seed, bus, person, ledger, today, season })
//     person(id) → a staff member (crew person) or null · pay(amount, reason, category): the home's ledger (spares sold) ·
//     today() → the game day · season() → the season key ('Y1S0' …: 3 game months)
//   items.list() · items.count · items.max · items.full · items.get(uid) · items.typeOf(item)
//   items.grant(sourceId, { weights?, filter?, why? }) → the item or null (a full store: none, and an Inbox line says so)
//   items.rollSource(sourceId, opts) → the item or null (the source's chance first)
//   items.preview(uid, staffId) · items.give(uid, staffId) · items.sell(uid) → Credits · items.likesOf(staffId)
//   items.pointsLeft(staffId) · items.arrivals() (newest first) · items.unseen() · items.markSeen() · items.tick()
//   items.serialize()
import { ItemSystem } from '../../../../core/ItemSystem.js';
import { Rng } from '../../../../core/Rng.js';
import { ITEM_TYPES, ITEM_RARITIES, ITEM_RULES, ITEM_SOURCES, WELLBEING_WEIGHTS, ITEM_GROUPS } from '../../data/items.js';
import { staffById, staffLikes } from '../../data/staff.js';
import { TIERS } from '../../data/roles.js';

const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

export function newItemsState() {
  return { core: null, rng: null, arrivals: [], seenUpTo: 0, nextNote: 1 };
}

export function createItems({ state, seed = 'careworks', bus = null, person, pay, today = () => 0, season = () => 'Y1S0' }) {
  const st = state;
  st.arrivals ??= [];
  st.seenUpTo ??= 0;
  st.nextNote ??= 1;
  const rng = new Rng(`${seed}:items`);
  if (Number.isFinite(st.rng)) rng.state = st.rng >>> 0;
  const sys = new ItemSystem({
    types: ITEM_TYPES,
    rarities: ITEM_RARITIES,
    rules: { inventoryMax: ITEM_RULES.inventoryMax, periodCap: ITEM_RULES.periodCap, loveMult: ITEM_RULES.loveMult, dislikeMult: ITEM_RULES.dislikeMult, loveMorale: ITEM_RULES.loveMorale, likes: ITEM_RULES.likes },
    rng,
    bus,
    person: (id) => person(id),
    statOf: (p, stat) => p.model.stats?.[stat] ?? 0,
    statCap: (p) => TIERS[p.model.tier]?.statCap ?? 220,
    raise: (p, stat, n) => {
      p.model.stats[stat] = (p.model.stats[stat] ?? 0) + n;
    },
    morale: (p, n) => {
      p.model.morale = clamp(p.model.morale + n);
    },
  });
  sys.load(st.core);
  sys.newPeriod(sys.period ?? season());

  // A staff member's likes come from their data (role and id); anyone without data (agency cover) by their role too.
  function likesOf(id) {
    if (!sys.likes[id]) {
      const def = staffById(id) ?? (person(id) ? { id, role: person(id).model.role } : null);
      sys.setLikes(id, staffLikes(def));
    }
    return sys.likesOf(id);
  }
  const note = (text, item = null) => {
    st.arrivals.unshift({ n: st.nextNote++, day: today(), text, item: item ? { type: item.type, rarity: item.rarity } : null });
    if (st.arrivals.length > 30) st.arrivals.length = 30;
  };
  const typeName = (t) => ITEM_TYPES.find((x) => x.id === t)?.name ?? t;

  function grant(sourceId, { weights = null, filter = null, why = null } = {}) {
    const src = ITEM_SOURCES[sourceId];
    if (!src) return null;
    const type = sys.rollType(filter);
    const group = ITEM_TYPES.find((t) => t.id === type)?.group;
    const w = group === 'wellbeing' ? WELLBEING_WEIGHTS : weights ?? src.weights ?? null;
    const rarity = sys.rollRarity(w);
    const it = sys.add(type, rarity, sourceId, today());
    const from = why ? `${src.text}: ${why}` : src.text;
    if (!it) note(`${from} — but the equipment store is full (${sys.rules.inventoryMax}). Give or sell something to make room.`);
    else note(`${from}: ${/^[AEIOU]/.test(ITEM_RARITIES[rarity].name) ? 'an' : 'a'} ${ITEM_RARITIES[rarity].name} ${typeName(type)} (${ITEM_GROUPS.find((g) => g.id === group)?.name})`, it);
    bus?.emit('items:arrived', { item: it, source: sourceId, why });
    return it;
  }
  function rollSource(sourceId, opts = {}) {
    const src = ITEM_SOURCES[sourceId];
    if (!src || !(src.chance > 0)) return null;
    const ch = Math.min(1, src.chance * (opts.chanceMult ?? 1)); // (Milestone 30b: Jinx's blessing raises a good surprise's chance)
    if (ch < 1 && rng.next() >= ch) return null;
    return grant(sourceId, opts);
  }

  const items = {
    system: sys,
    list: () => [...sys.inventory],
    get count() {
      return sys.inventory.length;
    },
    get max() {
      return sys.rules.inventoryMax;
    },
    get full() {
      return sys.full;
    },
    get: (uid) => sys.get(uid),
    typeOf: (item) => sys.typeOf(item),
    grant,
    rollSource,
    chance: (p) => rng.next() < p, // (the items' own seeded, saved generator)
    likesOf,
    pointsLeft: (id) => sys.pointsLeft(id),
    preview(uid, staffId) {
      likesOf(staffId);
      const pv = sys.preview(uid, staffId);
      if (!pv.ok && pv.why === 'No item points left this year') pv.why = `No item points left this season (${sys.rules.periodCap} a season)`;
      return pv;
    },
    give(uid, staffId) {
      likesOf(staffId);
      const r = sys.give(uid, staffId);
      if (!r.ok && r.why === 'No item points left this year') r.why = `No item points left this season (${sys.rules.periodCap} a season)`;
      return r;
    },
    sell(uid) {
      const it = sys.get(uid);
      const v = sys.sell(uid);
      if (v == null) return null;
      if (v) pay(v, `Sold spare equipment: ${typeName(it.type)}`, 'sell');
      return v;
    },
    received: (id) => sys.received[id] ?? [],
    arrivals: () => st.arrivals,
    unseen: () => st.arrivals.filter((a) => a.n > st.seenUpTo),
    markSeen() {
      st.seenUpTo = st.arrivals[0]?.n ?? st.seenUpTo;
    },
    // Each day: a new season (3 game months) starts everyone's item points again.
    tick() {
      sys.newPeriod(season());
    },
    serialize() {
      st.core = sys.serialize();
      st.rng = rng.state;
      return JSON.parse(JSON.stringify(st));
    },
  };
  return items;
}
