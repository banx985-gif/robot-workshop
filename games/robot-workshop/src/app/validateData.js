// Robot Workshop's content rules for the shared DataValidator (bible §41.5).
// Runs at start in debug builds (?debug=1). Returns the validator's report; never throws.
import { DataValidator } from '../../../../core/DataValidator.js';
import { PURPOSES, PURPOSE_ORDER } from '../../data/purposes.js';
import { COMPONENTS, SLOTS, STARTER_PARTS } from '../../data/components.js';
import { VISUAL_FAMILIES, VISUALS } from '../../data/visuals.js';
import { PHASES, PROJECT_TIERS } from '../../data/phases.js';
import { ROBOT_STAT_KEYS, STAT_KEYS } from '../../data/stats.js';
import { STAFF, ROLES, TIERS } from '../../data/staff.js';
import { TRAITS } from '../../data/traits.js';
import { RANKS } from '../../data/economy.js';
import { UNLOCK_TYPES, RESEARCH_BRANCHES, RESEARCH_MAX_LEVEL, FACILITY_NAMES, COUNTERS, COMPETITION_EVENTS } from '../../data/unlocks.js';
import { SEGMENTS, PURPOSE_SEGMENTS, MARKET_RULES } from '../../data/segments.js';
import { CONTRACT_RULES, SIGNATURE_CONTRACTS } from '../../data/contracts.js';
import { PRODUCT_SLOT_STEPS } from '../../data/market.js';
import { CALENDAR } from '../../data/balance.js';

const SLOT_COUNTS = { chassis: 10, mobility: 8, ai: 8, tool: 8, power: 8, special: 8 }; // §11
const ROBOT_ART = (key) => `assets/images/robots/${key}.png`;
const PART_ART = (key) => `assets/images/components/${key}.png`;

// manifest: the game's image list { key: path }; placeholders: keys that are allowed to be missing.
export async function validateGameData({ manifest = {}, placeholders = [] } = {}) {
  const v = new DataValidator();
  const statSet = new Set(ROBOT_STAT_KEYS);
  const rankSet = new Set(RANKS.map((r) => r.id));

  // --- unlock rules ---
  const checkUnlock = (owner, rule) => {
    if (!v.check(rule && UNLOCK_TYPES.includes(rule.type), `${owner}: unlock rule missing or of unknown type "${rule?.type}"`)) return;
    switch (rule.type) {
      case 'research':
        v.check(rule.branch in RESEARCH_BRANCHES, `${owner}: unknown research branch "${rule.branch}"`);
        v.check(Number.isInteger(rule.level) && rule.level >= 1 && rule.level <= RESEARCH_MAX_LEVEL, `${owner}: research level ${rule.level} out of range`);
        break;
      case 'facility':
        v.check(rule.id in FACILITY_NAMES, `${owner}: unknown facility "${rule.id}"`);
        break;
      case 'rank':
        v.ref(owner, 'rank', rule.rank, rankSet);
        break;
      case 'counter':
        v.check(rule.counter in COUNTERS && rule.min > 0, `${owner}: bad counter rule "${rule.counter}"`);
        break;
      case 'competition':
        v.check(rule.event in COMPETITION_EVENTS, `${owner}: unknown competition "${rule.event}"`);
        break;
      case 'secret':
        v.check(/^SEC-[A-Z]+-\d\d$/.test(rule.id), `${owner}: bad secret id "${rule.id}"`);
        break;
      case 'all':
        v.check(Array.isArray(rule.of) && rule.of.length > 1, `${owner}: "all" rule needs two or more parts`);
        (rule.of ?? []).forEach((r) => checkUnlock(owner, r));
        break;
    }
  };

  // --- visual families (§13) ---
  const visualIds = v.uniqueIds('visual families', VISUAL_FAMILIES);
  v.check(VISUAL_FAMILIES.length === 20, `visual families: expected 20, found ${VISUAL_FAMILIES.length}`);
  for (const f of VISUAL_FAMILIES) {
    v.check(!!f.base !== !!f.synergy, `visual ${f.id}: needs exactly one of base / synergy`);
    if (f.base) v.ref(`visual ${f.id}`, 'purpose', f.base, new Set(PURPOSE_ORDER));
    if (f.synergy) v.check(/^SYN\d\d$/.test(f.synergy), `visual ${f.id}: bad synergy id "${f.synergy}"`);
    v.check(Number.isInteger(f.priority) && f.priority >= 0 && f.priority <= 5, `visual ${f.id}: bad priority`);
    v.art(`visual ${f.id}`, ROBOT_ART(f.art));
  }

  // --- purposes (§10.2, §10.5) ---
  v.keysMatchIds('purposes', PURPOSES);
  v.uniqueIds('purposes', Object.values(PURPOSES));
  v.check(PURPOSE_ORDER.length === 10 && PURPOSE_ORDER.every((id) => PURPOSES[id]), 'purposes: expected the 10 purposes in PURPOSE_ORDER');
  v.check(Object.keys(PURPOSES).length === 10, `purposes: expected 10, found ${Object.keys(PURPOSES).length}`);
  for (const p of Object.values(PURPOSES)) {
    const keys = Object.keys(p.weights);
    v.check(keys.length === 7 && keys.every((k) => statSet.has(k)), `purpose ${p.id}: weights must cover the 7 robot stats`);
    const sum = keys.reduce((t, k) => t + p.weights[k], 0);
    v.check(sum === 100, `purpose ${p.id}: weights add up to ${sum}, not 100`);
    if (v.ref(`purpose ${p.id}`, 'visual family', p.visual, visualIds)) {
      v.check(VISUALS[p.visual].base === p.id, `purpose ${p.id}: visual ${p.visual} is not its base family`);
      v.check(VISUALS[p.visual].art === p.art, `purpose ${p.id}: art does not match visual ${p.visual}`);
    }
    checkUnlock(`purpose ${p.id}`, p.unlock);
  }
  v.check(PURPOSES.helper?.unlock.type === 'start', 'purposes: the Helper must be open from the start');

  // --- components (§11) ---
  const parts = Object.values(COMPONENTS);
  v.keysMatchIds('components', COMPONENTS);
  const partIds = v.uniqueIds('components', parts);
  v.uniqueIds('component art', parts, (c) => c.art);
  v.check(parts.length === 50, `components: expected 50, found ${parts.length}`);
  const slotIds = new Set(SLOTS.map((s) => s.id));
  for (const [slot, n] of Object.entries(SLOT_COUNTS)) {
    const found = parts.filter((c) => c.slot === slot).length;
    v.check(found === n, `components: slot ${slot} has ${found} parts, expected ${n}`);
  }
  for (const c of parts) {
    const o = `component ${c.id}`;
    v.ref(o, 'slot', c.slot, slotIds);
    v.check(typeof c.name === 'string' && c.name.length > 0, `${o}: no name`);
    v.check(Number.isInteger(c.cost) && c.cost > 0, `${o}: bad cost ${c.cost}`);
    v.check(Number.isInteger(c.cx) && c.cx >= 1 && c.cx <= 10, `${o}: complexity ${c.cx} outside 1–10`);
    for (const [k, val] of Object.entries(c.stats)) {
      v.check(statSet.has(k), `${o}: unknown stat "${k}"`);
      v.check(Number.isFinite(val), `${o}: stat ${k} is not a number`);
    }
    v.check(Number.isFinite(c.inn) && c.inn >= 0 && Number.isFinite(c.faultPct) && c.faultPct >= 0, `${o}: bad inn / faultPct`);
    v.check(Array.isArray(c.tags) && c.tags.length > 0, `${o}: needs at least one tag`);
    checkUnlock(o, c.unlock);
    v.art(o, PART_ART(c.art));
  }
  for (const s of SLOTS) {
    const id = STARTER_PARTS[s.id];
    if (v.ref(`starter parts (${s.id})`, 'component', id, partIds)) {
      v.check(COMPONENTS[id].slot === s.id, `starter parts: ${id} is not a ${s.id} part`);
      v.check(COMPONENTS[id].unlock.type === 'start', `starter parts: ${id} is not a Start part`);
    }
  }
  v.check(parts.filter((c) => c.unlock.type === 'start').length === 6, 'components: exactly six Start parts expected (one per slot)');

  // --- tiers and phases ---
  v.uniqueIds('project tiers', PROJECT_TIERS);
  PROJECT_TIERS.forEach((t, i) => {
    if (i === 0) return;
    const prev = PROJECT_TIERS[i - 1];
    v.check(t.maxCx > prev.maxCx && t.phaseTarget > prev.phaseTarget, `tier ${t.id}: must be bigger than ${prev.id}`);
  });
  v.check(PROJECT_TIERS.at(-1).maxCx === Infinity, 'tiers: the last tier must take any complexity');
  v.check(PROJECT_TIERS[0].maxCx >= 6, 'tiers: six complexity-1 parts must fit the first tier');
  v.uniqueIds('phases', PHASES);
  for (const ph of PHASES) {
    const sum = Object.values(ph.weights).reduce((a, b) => a + b, 0);
    v.check(Math.abs(sum - 1) < 1e-9, `phase ${ph.id}: work weights add up to ${sum}`);
    for (const k of Object.keys(ph.weights)) v.check(STAT_KEYS.includes(k), `phase ${ph.id}: unknown work stat "${k}"`);
    for (const k of Object.keys(ph.gains)) v.check(statSet.has(k), `phase ${ph.id}: unknown robot stat "${k}"`);
    v.ref(`phase ${ph.id}`, 'role', ph.roleMatch, new Set(Object.keys(ROLES)));
  }

  // --- staff (only the parts this milestone uses) ---
  v.uniqueIds('staff', STAFF);
  for (const s of STAFF) {
    const o = `staff ${s.id}`;
    v.ref(o, 'role', s.role, new Set(Object.keys(ROLES)));
    if (v.ref(o, 'tier', s.tier, new Set(Object.keys(TIERS)))) {
      for (const [k, val] of Object.entries(s.stats)) v.check(val <= TIERS[s.tier].statCap, `${o}: starting ${k} ${val} is over the ${s.tier} cap`);
    }
    for (const t of s.traits) v.ref(o, 'trait', t, new Set(Object.keys(TRAITS)));
  }

  // --- market (§14.1–14.2) ---
  const segIds = v.uniqueIds('segments', SEGMENTS);
  v.check(SEGMENTS.length === 8, `segments: expected 8, found ${SEGMENTS.length}`);
  for (const s of SEGMENTS) {
    v.check(Number.isInteger(s.min) && Number.isInteger(s.max) && s.min < s.max, `segment ${s.id}: bad demand range`);
    v.check(Array.isArray(s.customers) && s.customers.length > 0, `segment ${s.id}: needs customer names`);
    v.art(`segment ${s.id}`, `assets/images/npc/${s.customerArt}.png`);
  }
  for (const id of PURPOSE_ORDER) {
    const list = PURPOSE_SEGMENTS[id];
    if (v.check(Array.isArray(list) && list.length > 0, `purpose ${id}: no market segment`)) for (const s of list) v.ref(`purpose ${id} segments`, 'segment', s, segIds);
  }
  for (const s of segIds) v.check(Object.values(PURPOSE_SEGMENTS).some((l) => l.includes(s)), `segment ${s}: no purpose sells to it`);
  v.check(MARKET_RULES.trendMonths[0] >= 1 && MARKET_RULES.trendMonths[1] >= MARKET_RULES.trendMonths[0], 'market: bad trend length');
  for (const st of PRODUCT_SLOT_STEPS) v.ref('product slots', 'rank', st.rank, rankSet);

  // --- contracts (§14.6–14.7) ---
  for (const t of Object.keys(CONTRACT_RULES.tierMinCx)) v.ref('contract sizes', 'tier', t, new Set(PROJECT_TIERS.map((x) => x.id)));
  for (const b of CONTRACT_RULES.tierByYear) for (const t of Object.keys(b.weights)) v.ref(`contracts from year ${b.fromYear}`, 'tier', t, new Set(PROJECT_TIERS.map((x) => x.id)));
  v.uniqueIds('signature contracts', SIGNATURE_CONTRACTS);
  v.check(SIGNATURE_CONTRACTS.length === 8, `signature contracts: expected 8, found ${SIGNATURE_CONTRACTS.length}`);
  for (const s of SIGNATURE_CONTRACTS) {
    const o = `signature ${s.id}`;
    v.ref(o, 'purpose', s.purpose, new Set(PURPOSE_ORDER));
    if (v.ref(o, 'segment', s.segment, segIds)) v.check(PURPOSE_SEGMENTS[s.purpose]?.includes(s.segment), `${o}: segment ${s.segment} does not buy ${s.purpose} robots`);
    for (const k of s.stats) v.check(statSet.has(k), `${o}: unknown stat "${k}"`);
    if (s.requiredPart) v.ref(o, 'component', s.requiredPart, partIds);
    v.ref(o, 'tier', s.tier, new Set(PROJECT_TIERS.map((x) => x.id)));
    v.check(s.appear.year >= 1 && s.appear.year <= CALENDAR.campaignYears && s.appear.month >= 1 && s.appear.month <= 12, `${o}: appears outside the 16-year campaign`);
    v.check(s.difficulty > 0 && s.difficulty < 1, `${o}: difficulty must be below 1 (so it is always possible)`);
  }

  // --- every image the game loads ---
  for (const [key, path] of Object.entries(manifest)) v.art(`image "${key}"`, path, { placeholder: placeholders.includes(key) });

  await v.checkArt();
  return v.report();
}
