// Robot Workshop's content rules for the shared DataValidator (bible §41.5).
// Runs at start in debug builds (?debug=1). Returns the validator's report; never throws.
import { DataValidator } from '../../../../core/DataValidator.js';
import { PURPOSES, PURPOSE_ORDER } from '../../data/purposes.js';
import { COMPONENTS, SLOTS, STARTER_PARTS } from '../../data/components.js';
import { VISUAL_FAMILIES, VISUALS } from '../../data/visuals.js';
import { SYNERGIES, SYNERGY_ART } from '../../data/synergies.js';
import { usesFinalStat } from '../systems/Synergies.js';
import { PHASES, PROJECT_TIERS } from '../../data/phases.js';
import { ROBOT_STAT_KEYS, STAT_KEYS } from '../../data/stats.js';
import { STAFF, ROLES, TIERS, STARTER_IDS, CAREER_COUNTERS } from '../../data/staff.js';
import { TRAITS, NORMAL_TRAITS, LATER_WORDS } from '../../data/traits.js';
import { SIGNATURE_HOOKS } from '../systems/signatureHooks.js';
import { RANKS } from '../../data/economy.js';
import { UNLOCK_TYPES, RESEARCH_BRANCHES, RESEARCH_MAX_LEVEL, FACILITY_NAMES, COUNTERS, COMPETITION_EVENTS, FLAG_NAMES } from '../../data/unlocks.js';
import { FACILITIES, FACILITY_ORDER, STATIONS, FALLBACK_STATIONS, EXPANSIONS, WORKSHOP_START, PROJECT_BAYS, BUILD_ART } from '../../data/facilities.js';
import { EMPLOYEE_CAP } from '../../data/staff.js';
import { FacilitySystem } from '../../../../core/FacilitySystem.js';
import { SEGMENTS, PURPOSE_SEGMENTS, MARKET_RULES } from '../../data/segments.js';
import { CONTRACT_RULES, SIGNATURE_CONTRACTS } from '../../data/contracts.js';
import { PRODUCT_SLOT_STEPS } from '../../data/market.js';
import { CALENDAR } from '../../data/balance.js';
import { CHANNELS, RECRUIT_RULES, STORE_ITEMS, SIGNING_FEE, TUTORIAL_HIRES, TIER_TEMPLATES, PORTRAITS, PORTRAIT_FOLDER, RECRUIT_ART } from '../../data/recruitment.js';
import { COURSES, TRAINING_SLOTS } from '../../data/training.js';
import { RECRUITABLE_TIERS } from '../../data/staff.js';
import { CURRENCIES } from '../../data/economy.js';
import { COMPETITIONS, COMPETITION_RULES, TROPHIES, COMPETITION_ART, RANKING_POINTS } from '../../data/competitions.js';
import { RIVALS } from '../../data/rivals.js';
import { COMPETITION_RULE_TYPES } from '../../../../core/CompetitionPrereqs.js';
import { TUNINGS, STRATEGIES, DEFAULT_TUNING, DEFAULT_STRATEGY } from '../../data/tuning.js';
import { RESEARCH_NODES, RESEARCH_BRANCH_ORDER, RESEARCH_BRANCH_INFO, RESEARCH_MILESTONES, RESEARCH_QUEUES, FEATURES, RP_SOURCES, researchNodeId } from '../../data/research.js';

import { EVENTS, MILESTONE_EVENTS, REPEATABLE_EVENTS, EVENT_CAPS, EVENT_ICONS, EVENT_CONDITIONS, NOTIFY_RULES } from '../../data/events.js';
import { SPONSORS, SPONSOR_RULES } from '../../data/sponsors.js';

const SLOT_COUNTS ={ chassis: 10, mobility: 8, ai: 8, tool: 8, power: 8, special: 8 }; // §11
const ROBOT_ART = (key) => `assets/images/robots/${key}.png`;
const PART_ART = (key) => `assets/images/components/${key}.png`;

// manifest: the game's image list { key: path }; placeholders: keys that are allowed to be missing.
export async function validateGameData({ manifest = {}, placeholders = [] } = {}) {
  const v = new DataValidator();
  const statSet = new Set(ROBOT_STAT_KEYS);
  const rankSet = new Set(RANKS.map((r) => r.id));
  const WORK_STAT_KEYS = new Set(STAT_KEYS);

  // --- unlock rules ---
  for (const t of COMPETITION_RULE_TYPES) v.check(UNLOCK_TYPES.includes(t), `unlock types: core competition rule "${t}" missing`);
  const checkUnlock = (owner, rule) => {
    if (!v.check(rule && UNLOCK_TYPES.includes(rule.type), `${owner}: unlock rule missing or of unknown type "${rule?.type}"`)) return;
    switch (rule.type) {
      case 'research':
        v.check(rule.branch in RESEARCH_BRANCHES, `${owner}: unknown research branch "${rule.branch}"`);
        v.check(Number.isInteger(rule.level) && rule.level >= 1 && rule.level <= RESEARCH_MAX_LEVEL, `${owner}: research level ${rule.level} out of range`);
        break;
      case 'facility':
        v.check(rule.id in FACILITY_NAMES || rule.id in FACILITIES, `${owner}: unknown facility "${rule.id}"`);
        break;
      case 'flag':
        v.check(rule.flag in FLAG_NAMES, `${owner}: unknown flag "${rule.flag}"`);
        break;
      case 'role':
        v.ref(owner, 'role', rule.role, new Set(Object.keys(ROLES)));
        break;
      case 'feature':
        v.check(rule.id in FEATURES, `${owner}: unknown feature "${rule.id}"`);
        break;
      case 'researchCount':
        v.check(Number.isInteger(rule.min) && rule.min >= 1 && rule.min <= 36, `${owner}: research count ${rule.min} out of range`);
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
      case 'yearReached':
        v.check(Number.isInteger(rule.year) && rule.year >= 1 && rule.year <= CALENDAR.campaignYears, `${owner}: year ${rule.year} outside the campaign`);
        break;
      case 'eventWins':
        v.check(Array.isArray(rule.events) && rule.events.length > 0 && rule.events.every((id) => COMPETITIONS.some((e) => e.id === id)) && (rule.min ?? 1) <= rule.events.length, `${owner}: bad eventWins rule`);
        break;
      case 'eventEntered':
        v.check(!rule.event || COMPETITIONS.some((e) => e.id === rule.event), `${owner}: unknown event ${rule.event}`);
        break;
      case 'totalWins':
        v.check(rule.min > 0, `${owner}: bad totalWins rule`);
        break;
      case 'trophy':
        v.check(TROPHIES.some((t) => t.id === rule.id), `${owner}: unknown trophy ${rule.id}`);
        break;
      case 'purposeBuilt':
        v.ref(owner, 'purpose', rule.purpose, new Set(PURPOSE_ORDER));
        break;
      case 'secret':
        v.check(/^SEC-[A-Z]+-([A-Z]\d|\d\d)$/.test(rule.id), `${owner}: bad secret id "${rule.id}"`);
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

  // --- synergies (§12.1) ---
  const synIds = v.uniqueIds('synergies', SYNERGIES);
  v.check(SYNERGIES.length === 20 && SYNERGIES.every((s, i) => s.id === `SYN${String(i + 1).padStart(2, '0')}`), 'synergies: expected SYN01–SYN20 in order');
  const TIER_BY_ID = (i) => (i < 10 ? 'normal' : i < 16 ? 'advanced' : 'prestige');
  const partSet = new Set(Object.keys(COMPONENTS));
  const condStats = new Set([...ROBOT_STAT_KEYS, 'INN', 'QUALITY']);
  SYNERGIES.forEach((s, i) => {
    const o = `synergy ${s.id}`;
    v.check(s.tier === TIER_BY_ID(i) && s.tier in RP_SOURCES.firstSynergy, `${o}: tier should be ${TIER_BY_ID(i)}`);
    v.check(!!s.hidden === (s.tier === 'prestige'), `${o}: prestige combos (only) are hidden`);
    v.check(s.hidden || (typeof s.hint === 'string' && s.hint.length > 10), `${o}: needs a vague hint`);
    v.check(Array.isArray(s.conditions) && s.conditions.length > 0, `${o}: no conditions`);
    for (const c of s.conditions) {
      switch (c.kind) {
        case 'purpose':
          for (const p of c.any) v.ref(o, 'purpose', p, new Set(PURPOSE_ORDER));
          break;
        case 'part':
          for (const p of c.any) v.ref(o, 'part', p, partSet);
          v.check(new Set(c.any.map((p) => COMPONENTS[p]?.slot)).size === 1, `${o}: "any of" parts must share a slot`);
          break;
        case 'stat':
          v.check(condStats.has(c.stat) && c.min > 0, `${o}: bad stat condition`);
          break;
        case 'partCount':
          v.check(c.min > 0 && c.minCx > 0, `${o}: bad part count`);
          break;
        case 'discovered':
          v.check(/^(part|synergy):/.test(c.key) && !!c.label, `${o}: bad discovery flag`);
          break;
        case 'rule':
          checkUnlock(o, c.rule);
          v.check(!!c.label, `${o}: a game rule needs a label`);
          break;
        default:
          v.check(['tag', 'staff', 'ngPlus'].includes(c.kind), `${o}: unknown condition "${c.kind}"`);
      }
    }
    const r = s.reward ?? {};
    v.check(Object.keys(r).every((k) => ['stats', 'fit', 'inn', 'rp', 'repFirst'].includes(k)) && Object.keys(r.stats ?? {}).every((k) => statSet.has(k)), `${o}: unknown reward`);
    if (usesFinalStat(s)) v.check(!r.stats && !r.fit && !r.inn, `${o}: needs the final Quality, so it can't give stats, Fit or Innovation`);
    const look = VISUAL_FAMILIES.find((f) => f.synergy === s.id);
    v.check(i < 10 ? !look : !!look, `${o}: ${i < 10 ? 'normal combos have no look' : 'needs its visual family'}`);
  });
  v.check(SYNERGIES.find((s) => s.id === 'SYN20')?.locked === true && SYNERGIES.filter((s) => s.locked).length === 1, 'synergies: only SYN20 is locked (until Milestone 17)');
  for (const f of VISUAL_FAMILIES) if (f.synergy) v.check(synIds.has(f.synergy), `visual ${f.id}: unknown synergy ${f.synergy}`);
  for (const k of Object.values(SYNERGY_ART)) v.check(typeof k === 'string', 'synergy art: bad key');

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

  // --- staff (§15, Milestone 11): all 50, ids unique, stats within tier caps, traits exist, art exists ---
  v.staffRoster('staff', STAFF, { roles: ROLES, tiers: TIERS, traits: TRAITS, statKeys: STAT_KEYS, artPath: (s) => `assets/images/staff/${s.art}.png` });
  v.check(STAFF.length === 50, `staff: expected 50, found ${STAFF.length}`);
  // Each role has 01–10; 01–08 are Standard/Rare/Elite, 09 Legendary, 10 Secret (§15.1–15.5).
  for (const [roleId, r] of Object.entries(ROLES)) {
    const ids = STAFF.filter((s) => s.role === roleId).map((s) => s.id);
    v.check(ids.join() === Array.from({ length: 10 }, (_, i) => `${r.idPrefix}${String(i + 1).padStart(2, '0')}`).join(), `staff: ${r.name} ids should be ${r.idPrefix}01–${r.idPrefix}10 in order`);
  }
  const STAFF_UNLOCK_TYPES = ['starter', 'tutorial'];
  const ROLE_ORDER = Object.keys(ROLES); // L1/S1 = engineer … L5/S5 = pilot (§29.1–29.2)
  for (const s of STAFF) {
    const o = `staff ${s.id}`;
    const n = Number(s.id.slice(3));
    v.check(s.art === `staff_${ROLES[s.role]?.artFolder}_${s.id.slice(3)}`, `${o}: art "${s.art}" does not match the roster id`);
    v.check(n === 9 ? s.tier === 'legendary' : n === 10 ? s.tier === 'secret' : RECRUITABLE_TIERS.includes(s.tier), `${o}: tier ${s.tier} is wrong for number ${n}`);
    v.check(Number.isInteger(s.startLevel) && s.startLevel >= 1 && s.startLevel <= 30, `${o}: bad starting level`);
    v.check(Number.isInteger(s.salary) && s.salary > 0 && s.salary % 10 === 0, `${o}: bad salary ${s.salary}`);
    v.check(typeof s.name === 'string' && s.name.length > 0, `${o}: no name`);
    if (STAFF_UNLOCK_TYPES.includes(s.unlock?.type)) v.check(s.unlock.type === 'starter' || ['month1', 'localTrial'].includes(s.unlock.when), `${o}: bad tutorial rule`);
    else checkUnlock(o, s.unlock);
    for (const ch of s.channels ?? []) v.ref(o, 'channel', ch, new Set(CHANNELS.map((c) => c.id)));
    // Legendary and secret staff stay locked: a secret rule, never a channel (§9.4, §16.3).
    const secretIn = (rule) => (rule?.type === 'all' ? rule.of.some(secretIn) : rule?.type === 'secret');
    if (!RECRUITABLE_TIERS.includes(s.tier)) {
      v.check(secretIn(s.unlock) && !s.channels, `${o}: legendary/secret staff must be locked behind a secret (no channels)`);
      v.check(s.unlock.id === `SEC-STAFF-${s.tier === 'legendary' ? 'L' : 'S'}${ROLE_ORDER.indexOf(s.role) + 1}` || s.unlock.of?.some((r) => r.id === `SEC-STAFF-S${ROLE_ORDER.indexOf(s.role) + 1}`), `${o}: wrong secret id`);
    } else v.check(!secretIn(s.unlock), `${o}: only legendary/secret staff use secret rules`);
  }
  v.check(STARTER_IDS.join() === 'ENG01,PRG01,MEC01', 'staff: starters must be ENG01, PRG01, MEC01 (§15.6)');
  // Traits: the 20 of §9.8 plus 10 signatures, one per legendary/secret worker; every signature hook is written.
  v.check(NORMAL_TRAITS.length === 20, `traits: expected the 20 of §9.8, found ${NORMAL_TRAITS.length}`);
  for (const [id, t] of Object.entries(TRAITS)) {
    const o = `trait ${id}`;
    v.check(typeof t.name === 'string' && typeof t.description === 'string' && t.description.length > 10, `${o}: needs a name and a plain-English description`);
    if (t.signature) {
      v.check(t.signature.hook in SIGNATURE_HOOKS, `${o}: unknown signature hook "${t.signature.hook}"`);
      v.check(STAFF.filter((s) => s.traits.includes(id)).length === 1, `${o}: a signature belongs to exactly one person`);
    } else v.check(!!t.effects && Object.keys(t.effects).length > 0, `${o}: no effects`);
    if (t.later) v.check(t.later in LATER_WORDS, `${o}: unknown "later" system`);
  }
  v.check(Object.values(TRAITS).filter((t) => t.signature).length === 10, 'traits: expected 10 signature traits');
  for (const h of Object.values(SIGNATURE_HOOKS)) v.check(typeof h.point === 'string' && typeof h.apply === 'function', 'signature hooks: each needs a point and apply()');
  v.check(CAREER_COUNTERS.length === 6 && new Set(CAREER_COUNTERS.map((c) => c.key)).size === 6, 'career counters: expected six');

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

  // --- facilities (§18.2: F01–F15 in Milestone 8, F33 in Milestone 9), expansions (§18.1), bays (§18.3), staff caps (§39.1) ---
  const EFFECT_KEYS = /^(progressPct\.(concept|engineering|software|assembly|testing)|stationStatPct\.(eng|des|prg|fab|tst)|gainPct\.[A-Z]{3}|robotStat\.[A-Z]{3}|commercialStat\.[A-Z]{3}|materialCostPct|contractPayoutPct|restEnergyPct|restMorale|displaySlots|projectBays|researchQueues|researchPerDay|researchSpeedPct|runningCostPerDay|salesUnitsPct)$/;
  v.keysMatchIds('facilities', FACILITIES);
  const facIds = v.uniqueIds('facilities', Object.values(FACILITIES));
  const EXPECTED_FACILITIES = [...Array.from({ length: 15 }, (_, i) => `F${String(i + 1).padStart(2, '0')}`), 'F33'];
  v.check(FACILITY_ORDER.join() === EXPECTED_FACILITIES.join(), 'facilities: expected F01–F15 and F33 in order');
  v.uniqueIds('facility art', Object.values(FACILITIES), (f) => f.art);
  for (const f of Object.values(FACILITIES)) {
    const o = `facility ${f.id}`;
    v.check(typeof f.name === 'string' && f.name.length > 0 && typeof f.blurb === 'string', `${o}: needs a name and blurb`);
    v.check(Number.isInteger(f.cost) && f.cost > 0, `${o}: bad cost ${f.cost}`);
    v.check([f.w, f.h].every((n) => Number.isInteger(n) && n >= 1 && n <= 4), `${o}: bad footprint ${f.w}×${f.h}`);
    v.check(Array.isArray(f.effects) && f.effects.length > 0, `${o}: no effects`);
    for (const e of f.effects ?? []) {
      v.check(EFFECT_KEYS.test(e.key), `${o}: unknown effect key "${e.key}"`);
      if (/^(gainPct|robotStat|commercialStat)\./.test(e.key)) v.check(statSet.has(e.key.split('.')[1]), `${o}: unknown robot stat in "${e.key}"`);
      v.check(Number.isFinite(e.value) && e.value !== 0, `${o}: effect ${e.key} needs a value`);
      if (e.cap !== undefined) v.check(Math.sign(e.cap) === Math.sign(e.value), `${o}: cap and value of ${e.key} have different signs`);
    }
    checkUnlock(o, f.unlock);
    v.art(o, `assets/images/facilities/${f.art}.png`);
    if (f.floor) v.art(`${o} floor`, `assets/images/env/${f.floor}.png`);
  }
  for (const [phase, ids] of Object.entries(STATIONS)) {
    v.ref('stations', 'phase', phase, new Set([...PHASES.map((p) => p.id), 'research']));
    for (const id of ids) v.ref(`stations (${phase})`, 'facility', id, facIds);
  }
  for (const id of FALLBACK_STATIONS) v.ref('fallback stations', 'facility', id, facIds);
  v.uniqueIds('expansions', EXPANSIONS);
  v.check(EXPANSIONS.length === 4, `expansions: expected 4, found ${EXPANSIONS.length}`);
  for (const z of EXPANSIONS) {
    const o = `expansion ${z.id}`;
    v.check(z.cost > 0 && z.w > 0 && z.h > 0, `${o}: bad size or cost`);
    checkUnlock(o, z.unlock);
    for (const r of z.requires) v.ref(o, 'expansion', r, new Set(EXPANSIONS.map((x) => x.id)));
    v.check(z.w % 2 === 0 && z.h % 2 === 0 && z.col % 2 === 0 && z.row % 2 === 0, `${o}: floor tiles cover 2×2 cells — keep zones on even cells`);
  }
  v.check(EXPANSIONS[0].buyable && EXPANSIONS[0].unlock.rank === 'D', 'expansions: Expansion 1 must be buyable at Rank D');
  v.check(WORKSHOP_START.cols === 8 && WORKSHOP_START.rows === 10, 'workshop: starting grid must be 8 × 10 (§18.1)');
  // The starting layout must pass the same placement rules as the player's.
  const trial = new FacilitySystem({ defs: FACILITIES, area: WORKSHOP_START, zones: EXPANSIONS, entrance: WORKSHOP_START.entrance });
  for (const p of WORKSHOP_START.layout) {
    const res = trial.place(p.def, p.col, p.row, p.rot);
    v.check(res.ok, `workshop start: ${p.def} at ${p.col},${p.row}: ${res.reason}`);
  }
  v.check(trial.total(PROJECT_BAYS.effect) >= 1, 'workshop start: needs a project bay');
  for (const id of PROJECT_BAYS.second.needsAny) v.check(/^F(19|20)$/.test(id), `project bays: ${id} should be F19 or F20`);
  for (const r of RANKS) v.check(Number.isInteger(EMPLOYEE_CAP[r.id]), `employee cap: no value for Rank ${r.id}`);
  for (const k of Object.values(BUILD_ART)) v.check(typeof k === 'string', 'build art: bad key');

  // --- research (§19): 36 visible nodes, six branches of six, no loops, every promise backed by data ---
  const BIBLE_RP = {
    mechanical: [80, 140, 220, 320, 480, 700],
    mobility: [80, 140, 220, 320, 480, 750],
    ai: [80, 140, 220, 340, 520, 780],
    power: [80, 140, 220, 340, 520, 820],
    tool: [70, 130, 210, 310, 450, 680],
    special: [70, 130, 210, 300, 460, 700],
  };
  v.uniqueIds('research nodes', RESEARCH_NODES);
  v.check(RESEARCH_NODES.length === 36, `research: expected 36 visible nodes, found ${RESEARCH_NODES.length}`);
  v.check(RESEARCH_BRANCH_ORDER.length === 6 && RESEARCH_BRANCH_ORDER.every((b) => b in RESEARCH_BRANCH_INFO), 'research: expected six branches');
  v.noCycles('research', RESEARCH_NODES);
  const promised = new Map(); // "part:CH02" → node id
  for (const n of RESEARCH_NODES) {
    const o = `research ${n.id}`;
    v.check(n.id === researchNodeId(n.branch, n.level), `${o}: id does not match branch/level`);
    v.check(BIBLE_RP[n.branch]?.[n.level - 1] === n.cost, `${o}: cost ${n.cost} RP differs from bible §19 (${BIBLE_RP[n.branch]?.[n.level - 1]})`);
    v.check(typeof n.name === 'string' && n.name.length > 0, `${o}: no name`);
    v.check(WORK_STAT_KEYS.has(RESEARCH_BRANCH_INFO[n.branch]?.stat), `${o}: branch has no researcher stat`);
    if (n.condition) checkUnlock(o, n.condition);
    v.check(Array.isArray(n.actions) && n.actions.length > 0, `${o}: unlocks nothing`);
    for (const a of n.actions) {
      const key = `${a.type}:${a.id}`;
      v.check(!promised.has(key), `${o}: ${key} is also unlocked by ${promised.get(key)}`);
      promised.set(key, n.id);
      const hasRule = (rule) => (rule?.type === 'all' ? rule.of.some(hasRule) : rule?.type === 'research' && rule.branch === n.branch && rule.level === n.level);
      if (a.type === 'part') {
        if (v.ref(o, 'part', a.id, partIds)) v.check(hasRule(COMPONENTS[a.id].unlock), `${o}: part ${a.id}'s unlock rule does not name ${RESEARCH_BRANCHES[n.branch]} ${n.level}`);
      } else if (a.type === 'facility') {
        v.check(a.id in FACILITIES || a.id in FACILITY_NAMES, `${o}: unknown facility "${a.id}"`);
        if (FACILITIES[a.id]) v.check(hasRule(FACILITIES[a.id].unlock), `${o}: facility ${a.id}'s unlock rule does not name this research`);
      } else if (a.type === 'feature') v.check(a.id in FEATURES, `${o}: unknown feature "${a.id}"`);
      else v.error(`${o}: unknown unlock action "${a.type}"`);
    }
  }
  // Every normal part/facility whose rule names research must be promised by that node (CH08 and CH09 are
  // separate later projects in the bible, §19.1 / §11.1).
  const LATER_PROJECTS = new Set(['CH08', 'CH09']);
  const researchIn = (rule) => (rule?.type === 'all' ? rule.of.flatMap(researchIn) : rule?.type === 'research' ? [rule] : []);
  for (const c of parts) {
    for (const r of researchIn(c.unlock)) {
      if (LATER_PROJECTS.has(c.id)) continue;
      v.check(promised.get(`part:${c.id}`) === researchNodeId(r.branch, r.level), `component ${c.id}: no research node unlocks it (${RESEARCH_BRANCHES[r.branch]} ${r.level})`);
    }
  }
  for (const f of Object.values(FACILITIES)) for (const r of researchIn(f.unlock)) v.check(promised.get(`facility:${f.id}`) === researchNodeId(r.branch, r.level), `facility ${f.id}: no research node unlocks it`);
  RESEARCH_MILESTONES.forEach((m, i) => {
    v.check(i === 0 || m.count > RESEARCH_MILESTONES[i - 1].count, 'research milestones: counts must go up');
    for (const a of m.actions) v.check(a.type === 'feature' && a.id in FEATURES, `research milestone ${m.count}: unknown feature "${a.id}"`);
  });
  v.check(RESEARCH_MILESTONES.map((m) => m.count).join() === '2,8,18,36', 'research milestones: §19.6 asks for 2 / 8 / 18 / 36');
  v.check(RESEARCH_QUEUES.length === 2, 'research: expected two queues (the second off until Server Rack + Rank A)');
  RESEARCH_QUEUES.forEach((q) => checkUnlock(`research queue ${q.id}`, q.rule));
  for (const [t, rp] of Object.entries(RP_SOURCES.contract)) v.check(rp >= 10 && rp <= 80, `RP sources: contract ${t} gives ${rp} (bible: 10–80)`);

  // --- recruitment (§16, §15.7): five channels, legal tiers only, fees by tier ---
  const BIBLE_CHANNELS = { localAd: [300, null], workshopNetwork: [900, 'D'], agency: [2000, 'C'], headHunt: [4500, 'B'], globalSearch: [8000, 'A'] };
  v.uniqueIds('channels', CHANNELS);
  v.check(CHANNELS.map((c) => c.id).join() === Object.keys(BIBLE_CHANNELS).join(), 'channels: expected the five §16.2 channels in order');
  const roleSet = new Set(Object.keys(ROLES));
  for (const ch of CHANNELS) {
    const o = `channel ${ch.id}`;
    const [cost, rank] = BIBLE_CHANNELS[ch.id] ?? [];
    v.check(ch.cost === cost, `${o}: cost ${ch.cost} differs from bible §16.2 (${cost})`);
    checkUnlock(o, ch.unlock);
    const ranks = (ch.unlock.type === 'all' ? ch.unlock.of : [ch.unlock]).filter((r) => r.type === 'rank').map((r) => r.rank);
    v.check(rank ? ranks.includes(rank) : ch.unlock.type === 'start', `${o}: should unlock at ${rank ? 'Rank ' + rank : 'the start'}`);
    v.check(ch.roles.length > 0 && ch.roles.every((r) => roleSet.has(r)), `${o}: bad roles`);
    for (const [t, w] of Object.entries(ch.weights)) {
      v.check(RECRUITABLE_TIERS.includes(t), `${o}: tier "${t}" can never be recruited (legendary/secret only arrive by event)`);
      v.check(w >= 0, `${o}: negative weight`);
    }
    v.check(Object.values(ch.weights).reduce((a, b) => a + b, 0) === 100, `${o}: weights should add to 100`);
    if (ch.eliteNeeds) checkUnlock(o, ch.eliteNeeds);
  }
  v.check(!CHANNELS[0].roles.includes('pilot') && CHANNELS[1].roles.includes('pilot'), 'channels: Local Ad has no pilots, Workshop Network does (§16.2)');
  v.check(!CHANNELS[0].weights.elite && !CHANNELS[1].weights.elite, 'channels: Local Ad and Workshop Network never roll Elite');
  v.ref('recruit rules', 'channel', RECRUIT_RULES.freeChannel, new Set(CHANNELS.map((c) => c.id)));
  v.check(RECRUIT_RULES.techChipItem in STORE_ITEMS && STORE_ITEMS[RECRUIT_RULES.techChipItem].cost === 3 && STORE_ITEMS[RECRUIT_RULES.techChipItem].currency === 'techChips', 'store: Tech Chip refresh must cost 3 Tech Chips (§16.4)');
  v.check(RECRUIT_RULES.boardSize === 3 && RECRUIT_RULES.specialDays === 56, 'recruitment: 3 cards, special arrivals stay 56 days (§16.1, §15.7)');
  v.check(JSON.stringify(SIGNING_FEE) === JSON.stringify({ standard: 1.5, rare: 2.0, elite: 3.0, legendary: 4.0, secret: 5.0 }), 'signing fees differ from §15.7');
  for (const t of RECRUITABLE_TIERS) {
    const tt = TIER_TEMPLATES[t];
    if (!v.check(!!tt && !!PORTRAITS[t], `candidate templates: no template/portraits for ${t}`)) continue;
    v.check(tt.primary[1] <= TIERS[t].statCap, `candidate templates: ${t} main stat can exceed the ${TIERS[t].statCap} cap`);
    for (const n of PORTRAITS[t]) v.check(!['01', '09', '10'].includes(n), `candidate portraits: ${n} is reserved (starters/tutorial, legendary, secret)`);
    for (const f of Object.values(PORTRAIT_FOLDER)) v.art(`candidate portrait ${t}`, `assets/images/staff/staff_${f}_${PORTRAITS[t][0]}.png`);
  }
  for (const [k, h] of Object.entries(TUTORIAL_HIRES)) v.check(STAFF.some((s) => s.id === h.staffId), `tutorial hire ${k}: unknown staff ${h.staffId}`);
  v.check(STAFF.find((s) => s.id === 'DES01')?.name === 'Tessa Vale' && STAFF.find((s) => s.id === 'PIL01')?.name === 'Kai West', 'tutorial hires: DES01 Tessa Vale and PIL01 Kai West');
  for (const k of Object.values(RECRUIT_ART.tierBadges)) v.art('tier badge', `assets/images/badges/${k}.png`);

  // --- training (§17, §39.2) ---
  const BIBLE_COURSES = { engWorkshop: [900, 14], designSprint: [900, 14], codeCamp: [900, 14], fabDrill: [900, 14], simSession: [900, 14], crossTraining: [1400, 21], conference: [2200, 14], certification: [4000, 28], prestigeSeminar: [1, 28] };
  v.uniqueIds('courses', COURSES);
  v.check(COURSES.map((c) => c.id).join() === Object.keys(BIBLE_COURSES).join(), 'training: expected the nine §17 courses in order');
  for (const c of COURSES) {
    const o = `course ${c.id}`;
    v.check(c.cost === BIBLE_COURSES[c.id]?.[0] && c.days === BIBLE_COURSES[c.id]?.[1], `${o}: cost/days differ from bible §17`);
    v.check(c.currency in CURRENCIES || c.currency === 'prestigeTokens', `${o}: unknown currency ${c.currency}`);
    v.check(['stat', 'primary', 'lowest', 'all'].includes(c.effect.kind) && c.effect.min > 0 && c.effect.max >= c.effect.min, `${o}: bad effect`);
    if (c.effect.kind === 'stat') v.check(STAT_KEYS.includes(c.effect.stat), `${o}: unknown stat`);
    if (c.requires) checkUnlock(o, c.requires);
  }
  v.check(COURSES.at(-1).requires?.type === 'all', 'training: Prestige Seminar must stay locked (NG+ and Rank S)');
  v.check(TRAINING_SLOTS.find((s) => s.id === 'general')?.base === 1, 'training: one general slot to start (§39.2)');
  v.check(TRAINING_SLOTS.every((s) => s.max >= s.base && (!s.roles || s.roles.every((r) => roleSet.has(r)))), 'training: bad slot data');

  // --- competitions (§21: all 12 events, Milestone 13) ---
  const W6 = (n) => ({ SPD: n, PWR: n, CTL: n, INT: n, END: n, REL: n });
  const BIBLE_EVENTS = {
    C01: { target: 75, entry: 0, credits: 1500, rep: 50, weights: { REL: 30, CTL: 25, INT: 20, PWR: 15, SPD: 10 } },
    C02: { target: 115, entry: 500, credits: 3000, rep: 80, weights: { SPD: 30, CTL: 25, INT: 20, REL: 15, END: 10 } },
    C03: { target: 145, entry: 700, credits: 4000, rep: 100, weights: { PWR: 35, END: 25, REL: 20, CTL: 10, INT: 10 } },
    C04: { target: 180, entry: 1000, credits: 5500, rep: 130, weights: { CTL: 30, SPD: 25, INT: 20, REL: 15, END: 10 } },
    C05: { target: 215, entry: 1300, credits: 7000, rep: 160, weights: { REL: 30, INT: 20, CTL: 15, PWR: 15, END: 15, SPD: 5 } },
    C06: { target: 245, entry: 1600, credits: 8500, rep: 190, weights: { PWR: 30, REL: 25, END: 20, CTL: 15, INT: 10 } },
    C07: { target: 275, entry: 2000, credits: 11000, rep: 250, weights: { SPD: 40, CTL: 30, REL: 15, INT: 10, END: 5 } },
    C08: { target: 325, entry: 3000, credits: 16000, rep: 400, weights: W6(10) },
    C09: { target: 395, entry: 5000, credits: 28000, rep: 800, weights: { SPD: 15, PWR: 15, CTL: 15, INT: 20, END: 15, REL: 20 } },
    C10: { target: 455, entry: 7500, credits: 40000, rep: 0, tokens: 1 },
    C11: { target: 520, entry: 10000, credits: 60000, rep: 0, tokens: 2, weights: { END: 25, INT: 20, REL: 20, CTL: 15, SPD: 10, PWR: 10 } },
    C12: { target: 590, entry: 15000, credits: 100000, rep: 0, tokens: 4, weights: W6(8) },
  };
  const scoreKeys = new Set([...ROBOT_STAT_KEYS, 'QLT', 'INN']);
  v.uniqueIds('competitions', COMPETITIONS);
  v.check(COMPETITIONS.map((e) => e.id).join() === Object.keys(BIBLE_EVENTS).join(), 'competitions: expected the 12 events of §21.5 in order');
  const rivalIds = new Set(RIVALS.map((r) => r.id));
  const trophyIds = new Set(TROPHIES.map((t) => t.id));
  let lastBeat = 0;
  for (const e of COMPETITIONS) {
    const o = `competition ${e.id}`;
    const b = BIBLE_EVENTS[e.id];
    if (!v.check(!!b, `${o}: not in §21.5`)) continue;
    v.check(e.target === b.target && e.entry === b.entry && e.rewards.credits === b.credits && (e.rewards.rep ?? 0) === b.rep && (e.rewards.prestigeTokens ?? 0) === (b.tokens ?? 0), `${o}: target/entry/prize differ from §21.5`);
    if (b.weights) v.check(JSON.stringify(e.weights) === JSON.stringify(b.weights), `${o}: weights differ from §21.5`);
    v.check((e.rotate || Object.values(e.weights).reduce((t, x) => t + x, 0) === 100) && Object.keys(e.weights).every((k) => scoreKeys.has(k)), `${o}: weights must be robot stats (or QLT/INN) adding to 100 (rotating events: base weights, checked below)`);
    if (e.rotate) {
      v.check(e.rotate.pool.every((k) => statSet.has(k)) && e.rotate.base * e.rotate.pool.length + e.rotate.boosts.reduce((t, x) => t + x, 0) === 100, `${o}: rotating weights must add to 100`);
      v.check(e.rotate.pool.length >= e.rotate.boosts.length, `${o}: more boosts than stats`);
    }
    checkUnlock(o, e.unlock);
    v.check(e.field.length >= 3 && e.field.every(([id]) => rivalIds.has(id)), `${o}: unknown rival in the field`);
    v.check(e.segments?.length === COMPETITION_RULES.stressPct.length, `${o}: needs one name per segment`);
    v.check(e.rp >= 15 && e.rp <= 150, `${o}: RP ${e.rp} outside §19.7 (15–150)`);
    v.check(e.beatYear >= 1 && e.beatYear <= CALENDAR.campaignYears && e.beatYear >= lastBeat, `${o}: beat year must sit inside the 16-year campaign, in ladder order`);
    lastBeat = e.beatYear;
    v.check(e.rankWeight > 0, `${o}: needs a rank weight`);
    if (e.rewards.trophy) v.check(trophyIds.has(e.rewards.trophy), `${o}: unknown trophy`);
    v.art(`${o} backdrop`, `assets/images/backdrops/${e.art}.png`);
  }
  // §4.3 beats: Local/Delivery/Warehouse early, Regional Years 6–9, National 10–14, World 15–16.
  const beat = (id) => COMPETITIONS.find((e) => e.id === id)?.beatYear;
  v.check(beat('C03') <= 5 && beat('C07') >= 6 && beat('C07') <= 9 && beat('C08') >= 10 && beat('C08') <= 14 && beat('C09') >= 15, 'competitions: ladder beats do not match §4.3');
  // C11 / C12 need secrets (Milestones 16–17): they must never open in normal play.
  const secretIn = (r) => r?.type === 'secret' || (r?.type === 'all' && r.of.some(secretIn));
  for (const id of ['C11', 'C12']) v.check(secretIn(COMPETITIONS.find((e) => e.id === id)?.unlock), `competition ${id}: must stay behind its secret`);
  v.check(COMPETITIONS.find((e) => e.id === 'C12')?.hiddenWeights && COMPETITIONS.find((e) => e.id === 'C08')?.rotate?.boosts.length === 2, 'competitions: C08 rotates two boosted stats; C12 hides its weights');
  // §22 rivals.
  v.uniqueIds('rivals', RIVALS);
  v.check(RIVALS.map((r) => r.id).join() === 'R01,R02,R03,R04,R05,R06,R07,R08', 'rivals: expected R01–R08 (§22)');
  v.check(RIVALS.filter((r) => r.manager).map((r) => r.id).join() === 'R01,R02,R03,R04,R05', 'rivals: managers for R01–R05 only; R06–R08 speak through their logo (§22)');
  v.check(RIVALS.find((r) => r.id === 'R08')?.hidden === true, 'rivals: R08 Nocturne Systems stays hidden until its secret chain');
  for (const r of RIVALS) {
    v.check(r.strengths.every((k) => statSet.has(k)) && r.growthPctPerYear >= 0, `rival ${r.id}: bad strengths / growth`);
    for (const k of ['before', 'theyWon', 'youWon', 'youDnf']) v.check(r.lines?.[k]?.length > 0, `rival ${r.id}: needs "${k}" lines`);
    v.art(`rival ${r.id} logo`, `assets/images/logos/${r.logo}.png`);
    if (r.manager) v.art(`rival ${r.id} manager`, `assets/images/npc/${r.manager}.png`);
  }
  // §21.6 trophies.
  v.uniqueIds('trophies', TROPHIES);
  v.check(TROPHIES.map((t) => t.id).join() === 'localCup,regionalCup,nationalCup,worldCup,eliteMasters,prestigeCrown', 'trophies: expected the six of §21.6 in order');
  for (const [i, t] of TROPHIES.entries()) {
    checkUnlock(`trophy ${t.id}`, t.rule);
    v.check(t.art === `trophy_0${i + 1}`, `trophy ${t.id}: should use trophy_0${i + 1}`);
    v.art(`trophy ${t.id}`, `assets/images/trophies/${t.art}.png`);
  }
  v.check(RANKING_POINTS.every((p, i) => i === 0 || p <= RANKING_POINTS[i - 1]), 'rankings: points must not go up with a worse place');
  const BIBLE_TUNING = { reliability: 600, performance: 900, control: 900, power: 900, fullPrep: 2000 };
  v.uniqueIds('tunings', TUNINGS);
  for (const [id, cost] of Object.entries(BIBLE_TUNING)) v.check(TUNINGS.find((t) => t.id === id)?.cost === cost, `tuning ${id}: cost differs from §21.1 (${cost})`);
  v.check(TUNINGS.find((t) => t.id === 'fullPrep')?.requires?.rank === 'B', 'tuning: Full Race Prep needs Rank B (§21.1)');
  for (const t of TUNINGS) {
    if (t.requires) checkUnlock(`tuning ${t.id}`, t.requires);
    v.check(Object.keys(t.stats).every((k) => statSet.has(k)), `tuning ${t.id}: unknown stat`);
  }
  const BIBLE_STRAT = { conservative: [-4, 25, 0.55], balanced: [0, 0, 1], aggressive: [8, -20, 1.55] };
  v.check(STRATEGIES.map((x) => x.id).join() === Object.keys(BIBLE_STRAT).join(), 'strategies: expected the three of §21.2');
  for (const x of STRATEGIES) v.check(JSON.stringify([x.scorePct, x.relBonus, x.breakdownMult]) === JSON.stringify(BIBLE_STRAT[x.id]), `strategy ${x.id}: numbers differ from §21.2`);
  v.check(TUNINGS.some((t) => t.id === DEFAULT_TUNING) && STRATEGIES.find((x) => x.id === DEFAULT_STRATEGY)?.recommended, 'competition defaults: Balanced must be the recommended default (§26)');
  const CB = COMPETITION_RULES.breakdown;
  v.check(CB.basePct === 8 && CB.minPct === 0.5 && CB.relDivisor === 55 && CB.perFaultPct === 2 && CB.minorPct === 12 && CB.majorPct === 30 && CB.majorNextPct === 8 && CB.catastrophicRelBelow === 120 && CB.catastrophicFaults === 3, 'competition breakdowns: numbers differ from §21.3');
  v.check(JSON.stringify(COMPETITION_RULES.pilotWeights) === JSON.stringify({ tst: 0.28, eng: 0.04, prg: 0.04 }) && COMPETITION_RULES.form.min === 0.97 && COMPETITION_RULES.form.max === 1.03, 'competition formula: pilot weights / form differ from §21.3');
  v.check(COMPETITION_RULES.winMorale.min === 5 && COMPETITION_RULES.winMorale.max === 12, 'competition win morale must be +5 to +12 (§9.5)');
  for (const k of Object.values(COMPETITION_ART)) v.check(typeof k === 'string', 'competition art: bad key');

  // --- §24 events and §23 sponsors (Milestone 15) ---
  v.uniqueIds('events', EVENTS);
  v.check(MILESTONE_EVENTS.length === 8 && MILESTONE_EVENTS.every((e, i) => e.kind === 'milestone' && e.art === `event_art_0${i + 1}`), 'events: the 8 milestone events use event_art_01…08 in §24.1 order');
  v.check(REPEATABLE_EVENTS.length === 20, 'events: expected the 20 repeatable text events of §24.1');
  v.check(EVENT_CAPS.choice === 14 && EVENT_CAPS.flavour === 5, 'events: cadence caps differ from §24.3 (14 / 5 days)');
  v.check(NOTIFY_RULES.maxQueue === 20, 'notifications: §40 caps queued pop-ups at 20');
  const EFFECT_TYPES = ['credits', 'rep', 'rp', 'morale', 'energy', 'modifier', 'chance', 'sponsorOffer'];
  const checkEffects = (owner, list) => {
    for (const e of list ?? []) {
      v.check(EFFECT_TYPES.includes(e.type), `${owner}: unknown effect "${e.type}"`);
      if (e.type === 'chance') {
        v.check(e.p > 0 && e.p < 1, `${owner}: chance p must be between 0 and 1`);
        checkEffects(owner, e.then);
        checkEffects(owner, e.else);
      }
      if (e.type === 'modifier') v.check(typeof e.key === 'string' && Number.isFinite(e.value) && e.days > 0, `${owner}: modifier needs key, value, days`);
      if (['credits', 'rep', 'rp'].includes(e.type)) v.check(Number.isFinite(e.amount?.base), `${owner}: ${e.type} needs amount.base`);
    }
  };
  for (const e of REPEATABLE_EVENTS) {
    const o = `event ${e.id}`;
    v.check(e.kind in EVENT_CAPS, `${o}: kind must be one of ${Object.keys(EVENT_CAPS).join(', ')}`);
    v.check(e.icon in EVENT_ICONS, `${o}: unknown icon "${e.icon}"`);
    if (e.trigger && !EVENT_CONDITIONS.includes(e.trigger.type)) checkUnlock(o, e.trigger);
    checkEffects(o, e.effects);
    if (e.kind === 'choice') {
      v.check(e.choices?.length >= 2 && e.choices.filter((c) => c.default).length === 1, `${o}: a choice event needs 2+ choices and exactly one default`);
      for (const c of e.choices ?? []) checkEffects(`${o} ${c.id}`, c.effects);
    } else v.check(!e.choices, `${o}: only choice events have choices`);
  }
  v.check(REPEATABLE_EVENTS.at(-1)?.secret && REPEATABLE_EVENTS.at(-1).trigger?.type === 'secret', 'events: the mysterious anonymous message stays behind a secret rule until Milestones 16–17');
  for (const e of MILESTONE_EVENTS) v.art(`event ${e.id}`, `assets/images/events/${e.art}.png`);
  v.uniqueIds('sponsors', SPONSORS);
  v.check(SPONSORS.length === 6 && SPONSOR_RULES.dealMonths === 6 && SPONSOR_RULES.unlock.rank === 'C', 'sponsors: six sponsors, 6-month deals, open at Rank C (§23)');
  const BENEFIT_KEYS = /^(salesRevenuePct|partCostPct\.\w+|competitionEntryPct|competitionPrizePct|facilityCostPct|purposeStat\.\w+\.[A-Z]{3}|competitionStat\.[A-Z]{3}|projectRpPct)$/;
  for (const s of SPONSORS) {
    const o = `sponsor ${s.id}`;
    checkUnlock(o, s.requirement);
    v.check(s.benefits.length > 0 && s.benefits.every((b) => BENEFIT_KEYS.test(b.key) && Number.isFinite(b.value)), `${o}: unknown benefit key`);
    v.check(['count', 'avoid'].includes(s.obligation?.type) && ['launch', 'competitionEntered', 'contractDone', 'contractFailed', 'robotFinished'].includes(s.obligation.signal), `${o}: bad obligation`);
    v.check(!!(s.art || s.icon) && !!s.benefitText && !!s.obligationText, `${o}: needs art or an icon and its words`);
    v.art(o, s.art ? `assets/images/npc/${s.art}.png` : `assets/images/ui/${s.icon}.png`);
  }

  // --- every image the game loads ---
  for (const [key, path] of Object.entries(manifest)) v.art(`image "${key}"`, path, { placeholder: placeholders.includes(key) });

  await v.checkArt();
  return v.report();
}
