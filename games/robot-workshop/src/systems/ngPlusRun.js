// Robot Workshop's side of New Game+ (Milestone 20, bible §30): what the player can pick from (Legacy Staff,
// Blueprint Memory, a challenge) and the snapshot core/NgPlusSystem.js turns into the carry package.
//
// The snapshot holds EVERY part of the run save (Campaign.serialize) and of the account save, each under the name
// data/ngplus.js gives it. A save field with no name there is passed through under its own key, which the core
// refuses — so a later milestone that adds something to the save has to decide whether it carries over.
import { STAFF_BY_ID, ROLES } from '../../data/staff.js';
import { TIER_TEMPLATES, STAT_SHARES, ROLE_SECOND_STAT } from '../../data/recruitment.js';
import { STAT_KEYS } from '../../data/stats.js';
import { NG_PLUS } from '../../data/ngplus.js';
import { COMPONENTS } from '../../data/components.js';
import { PURPOSES } from '../../data/purposes.js';
import { SYNERGIES_BY_ID } from '../../data/synergies.js';
import { robotArtOf } from './robotVisual.js';

// Run save key → the declared field it belongs to. economy and research are split (see below).
const RUN_FIELDS = {
  campaignId: 'campaignId',
  seed: 'seed',
  rngState: 'rngState',
  calendar: 'calendar',
  staff: 'staff',
  projects: 'projects',
  history: 'history',
  reputation: 'reputation',
  market: 'market',
  products: 'products',
  contracts: 'contracts',
  workshop: 'workshop',
  unlocks: 'unlocks',
  recruitment: 'recruitment',
  training: 'training',
  careers: 'careers',
  competitions: 'competitions',
  rankings: 'rankings',
  trophies: 'trophies',
  synergies: 'runCombos',
  events: 'events',
  sponsors: 'sponsors',
  notifications: 'notifications',
  secrets: 'runSecrets',
  ending: 'ending',
  guide: 'guide',
  flags: 'flags',
  ngplus: 'ngplus',
};
const CARRIED_CURRENCIES = ['techChips', 'prestigeTokens'];

// A worker's normal starting stats — the floor for a Legacy worker (§30.4). Named staff: their roster stats. Anyone
// else: what they were hired with (kept since Milestone 20), else the low end of their tier's candidate template.
export function normalStartStats(s) {
  const def = STAFF_BY_ID[s.id];
  if (def) return { ...def.stats };
  if (s.counters?.startStats) return { ...s.counters.startStats };
  const t = TIER_TEMPLATES[s.tier] ?? TIER_TEMPLATES.standard;
  const primary = ROLES[s.role]?.primaryStat;
  const second = ROLE_SECOND_STAT[s.role];
  const main = t.primary[0];
  return Object.fromEntries(STAT_KEYS.map((k) => [k, k === primary ? main : Math.round(main * (k === second ? STAT_SHARES.second[0] : STAT_SHARES.other[0]))]));
}

// Hired in any run (this one included).
function everHired(c, id) {
  return !!c.careers.get(id) || (c.secrets.accountFact('staffEverHired') ?? []).includes(id);
}

// §30.4 Legacy Staff: the team at the end of the run.
export function legacyPool(c) {
  return c.staff.staff.map((s) => ({
    id: s.id,
    name: s.name,
    role: s.role,
    tier: s.tier,
    level: s.level,
    stats: { ...s.stats },
    traits: [...s.traits],
    salary: STAFF_BY_ID[s.id]?.salary ?? s.salary, // their normal roster salary
    art: s.art,
    floor: normalStartStats(s),
    everHired: everHired(c, s.id),
  }));
}

// §30.4 Blueprint Memory: the blueprints this run already carries, then this run's finished robots — one per distinct
// build (purpose + six parts), best Quality first.
export function blueprintPool(c, max = 12) {
  const out = [];
  const seen = new Set();
  const key = (b) => `${b.purpose}|${Object.keys(b.components).sort().map((k) => b.components[k]).join(',')}`;
  for (const b of c.ngPlusRun?.blueprints ?? []) {
    if (seen.has(key(b))) continue;
    seen.add(key(b));
    out.push({ ...b, carried: true });
  }
  const robots = c.history.records.filter((r) => r.result?.components && r.result.purpose).sort((a, b) => (b.result.quality ?? 0) - (a.result.quality ?? 0));
  for (const rec of robots) {
    if (out.length >= max) break;
    const r = rec.result;
    const b = {
      id: `${c.campaignId}#${rec.number}`,
      name: rec.name,
      purpose: r.purpose,
      components: { ...r.components },
      synergies: [...(r.synergies ?? [])].filter((id) => SYNERGIES_BY_ID[id]),
      quality: r.quality ?? 0,
      review: r.review ?? null,
      visual: r.visual ?? null,
      art: robotArtOf(r),
    };
    if (seen.has(key(b))) continue;
    seen.add(key(b));
    out.push(b);
  }
  return out;
}

export function ngPlusOptions(c) {
  return { legacy: legacyPool(c), blueprints: blueprintPool(c), modifiers: NG_PLUS.modifiers };
}

// Everything, named (see the top of this file).
export function ngPlusSnapshot(c, options = ngPlusOptions(c)) {
  const snap = {};
  for (const [k, v] of Object.entries(c.serialize())) {
    if (k === 'economy') {
      const { balances, ...rest } = v;
      for (const [cur, amount] of Object.entries(balances)) {
        if (cur === 'credits') snap.credits = amount;
        else if (CARRIED_CURRENCIES.includes(cur)) snap[cur] = amount;
        else snap[`currency:${cur}`] = amount; // a currency nobody declared: refused
      }
      snap.ledger = rest;
    } else if (k === 'research') {
      const { rp, ...rest } = v;
      snap.researchPoints = rp;
      snap.research = rest;
    } else snap[RUN_FIELDS[k] ?? k] = v;
  }
  const acc = c.secrets.serializeAccount();
  const { families, ...flags } = acc.flags ?? {};
  Object.assign(snap, {
    purchases: { ...(c.ngPlusAccount?.purchases ?? {}) },
    achievements: c.achievements.serialize(),
    records: c.records.serialize(),
    combos: c.synergyArchive.serializeAccount(),
    secretRecipes: acc.history,
    discoveryArchive: { facts: acc.facts, families: families ?? {} },
    accountFlags: flags,
    pastCampaigns: c.archive.serialize(),
    highestLevel: c.ngPlusAccount?.highest ?? 0,
    legacyStaff: options.legacy,
    blueprints: options.blueprints,
    modifier: Object.fromEntries(options.modifiers.map((m) => [m.id, m])),
  });
  return snap;
}

// Short words for a blueprint card.
export function blueprintLines(b) {
  const parts = Object.values(b.components).map((id) => COMPONENTS[id]?.name ?? id);
  const combos = (b.synergies ?? []).map((id) => SYNERGIES_BY_ID[id]?.name).filter(Boolean);
  return {
    title: `${b.name} · ${PURPOSES[b.purpose]?.name ?? b.purpose}`,
    parts: parts.join(', '),
    combos: combos.length ? `Combos: ${combos.join(', ')}` : null,
    quality: `Quality ${(Math.round((b.quality ?? 0) * 10) / 10).toFixed(1)}`,
  };
}
