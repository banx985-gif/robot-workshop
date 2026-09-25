// Robot Workshop's candidate maker for core/RecruitmentSystem.js: ordinary candidates from role + tier
// templates (data/recruitment.js), and the named tutorial hires (data/staff.js). Never legendary or secret.
import { ROLES, TIERS, STAFF, RECRUITABLE_TIERS } from '../../data/staff.js';
import { TRAITS } from '../../data/traits.js';
import { STAT_KEYS } from '../../data/stats.js';
import { TIER_TEMPLATES, STAT_SHARES, ROLE_SECOND_STAT, PORTRAITS, PORTRAIT_FOLDER, FIRST_NAMES, LAST_NAMES, SIGNING_FEE } from '../../data/recruitment.js';

const ORDINARY_TRAITS = Object.keys(TRAITS);

// taken() → { names: Set, art: Set } of everyone on the roster and the board, to avoid look-alikes.
export function candidateMaker(taken) {
  return (channel, tier, rng) => {
    if (!RECRUITABLE_TIERS.includes(tier)) throw new Error(`recruitment: tier ${tier} can't be rolled`);
    const t = TIER_TEMPLATES[tier];
    const role = rng.pick(channel.roles);
    const primary = ROLES[role].primaryStat;
    const second = ROLE_SECOND_STAT[role];
    const cap = TIERS[tier].statCap;
    const main = rng.int(t.primary[0], t.primary[1]);
    const stats = {};
    for (const k of STAT_KEYS) {
      const share = k === primary ? 1 : k === second ? rng.range(...STAT_SHARES.second) : rng.range(...STAT_SHARES.other);
      stats[k] = Math.min(cap, Math.max(1, Math.round(main * share)));
    }
    const used = taken();
    let name = null;
    for (let i = 0; i < 20 && (!name || used.names.has(name)); i++) name = `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
    const pics = PORTRAITS[tier].map((n) => `staff_${PORTRAIT_FOLDER[role]}_${n}`);
    const free = pics.filter((p) => !used.art.has(p));
    const art = rng.pick(free.length ? free : pics);
    const traits = rng.shuffle(ORDINARY_TRAITS).slice(0, TIERS[tier].traitSlots);
    const salary = Math.max(400, Math.round((t.salary.base + (main - t.salary.ref) * t.salary.perPoint) / 10) * 10);
    return { personId: `P-${name.replace(/\s/g, '')}-${rng.int(1000, 9999)}`, name, role, tier, level: Math.round(t.level[0] + ((main - t.primary[0]) / (t.primary[1] - t.primary[0])) * (t.level[1] - t.level[0])), stats, salary, traits, art };
  };
}

// A named roster member as a candidate (tutorial hires).
export function namedCandidate(staffId) {
  const d = STAFF.find((s) => s.id === staffId);
  return { personId: d.id, staffId: d.id, name: d.name, role: d.role, tier: d.tier, level: d.startLevel, stats: { ...d.stats }, salary: d.salary, traits: [...d.traits], art: d.art };
}

// §15.7 signing fee (feeMult for a discounted special arrival).
export function signingFee(c) {
  const mult = c.feeMult ?? 1;
  return Math.round((c.salary * (SIGNING_FEE[c.tier] ?? 1.5) * mult) / 10) * 10;
}
