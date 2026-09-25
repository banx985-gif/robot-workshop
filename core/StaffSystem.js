// Holds the roster and runs the staff rules: daily Energy/Morale, monthly idle check, XP and level-ups.
// All numbers come from the game's rules/data; all randomness comes from the seeded Rng passed in,
// in a fixed order, so the same seed always gives the same results.
//
// config:
//   rng, bus
//   statKeys:  ['eng', 'des', ...]                      work stat keys
//   roles:     { engineer: { primaryStat: 'eng' }, ... }
//   tiers:     { standard: { statCap: 220, traitSlots: 1 }, ... }
//   traits:    { quickLearner: { effects: { xpGainPct: 20 } }, ... }
//   rules:     see DEFAULT_RULES
//   planActivity(staff) → 'working' | 'resting' | 'idle'   optional: decides each worker's day
//   energyLossMultiplier(staff) → number                   optional: extra multiplier on working Energy loss
//   restModifier(staff) → { energyMult, morale }           optional: resting bonuses (e.g. a break room)
import { StaffModel } from './StaffModel.js';

export const DEFAULT_RULES = {
  startEnergy: 100,
  startMorale: 70,
  workEnergyLoss: { min: 0.7, max: 1.5 }, // per working day
  restEnergyGain: 4, // per resting day
  tiredBelow: 25,
  stressedBelow: 25,
  inspired: { moraleAbove: 85, energyAbove: 65, dailyChance: 0.05 },
  unassignedMorale: { afterMonths: 2, perMonth: -5 },
  levelCap: 30,
  xpCurve: { base: 80, perLevel: 25, perLevelSq: 5 },
  levelUp: { primaryMin: 4, primaryMax: 8, otherCount: 2, otherMin: 1, otherMax: 4 },
  workMultiplier: { base: 0.7, energyDiv: 250, moraleDiv: 500, min: 0.65, max: 1.3 },
};

// Trait effect keys this system understands (values are percentages or points):
//   xpGainPct      +% XP gained
//   energyLossPct  +/-% Energy lost while working
//   moraleFloor    Morale can't drop below this

export class StaffSystem {
  constructor({ rng, bus = null, statKeys, roles = {}, tiers = {}, traits = {}, rules = {}, planActivity = null, energyLossMultiplier = null, restModifier = null }) {
    this.rng = rng;
    this.bus = bus;
    this.statKeys = statKeys;
    this.roles = roles;
    this.tiers = tiers;
    this.traits = traits;
    this.rules = { ...DEFAULT_RULES, ...rules };
    this.planActivity = planActivity;
    this.energyLossMultiplier = energyLossMultiplier;
    this.restModifier = restModifier;
    this.staff = [];
  }

  // --- roster --------------------------------------------------------------
  add(model) {
    this.staff.push(model);
    return model;
  }

  addFromDefinition(def) {
    return this.add(StaffModel.fromDefinition(def, this.rules));
  }

  get(id) {
    return this.staff.find((s) => s.id === id) || null;
  }

  serialize() {
    return this.staff.map((s) => s.toJSON());
  }

  load(list) {
    this.staff = list.map((o) => StaffModel.fromJSON(o));
  }

  // --- derived values ------------------------------------------------------
  traitEffect(staff, key) {
    let total = 0;
    for (const t of staff.traits) total += this.traits[t]?.effects?.[key] ?? 0;
    return total;
  }

  statCap(staff) {
    return this.tiers[staff.tier]?.statCap ?? Infinity;
  }

  traitSlots(staff) {
    return this.tiers[staff.tier]?.traitSlots ?? 1;
  }

  xpNeeded(level) {
    const c = this.rules.xpCurve;
    return c.base + c.perLevel * level + c.perLevelSq * level * level;
  }

  workMultiplier(staff) {
    return staff.workMultiplier(this.rules.workMultiplier);
  }

  // --- XP / levels ---------------------------------------------------------
  // Returns { gained, levelsGained }.
  addXp(staffOrId, amount) {
    const s = typeof staffOrId === 'string' ? this.get(staffOrId) : staffOrId;
    if (!s || amount <= 0) return { gained: 0, levelsGained: 0 };
    const gained = Math.round(amount * (1 + this.traitEffect(s, 'xpGainPct') / 100));
    s.xp += gained;
    let levelsGained = 0;
    while (s.level < this.rules.levelCap && s.xp >= this.xpNeeded(s.level)) {
      s.xp -= this.xpNeeded(s.level);
      this._levelUp(s);
      levelsGained++;
    }
    if (s.level >= this.rules.levelCap) s.xp = 0;
    this.bus?.emit('staff:xp', { staff: s, gained, levelsGained });
    return { gained, levelsGained };
  }

  _levelUp(s) {
    const lu = this.rules.levelUp;
    const cap = this.statCap(s);
    const primary = this.roles[s.role]?.primaryStat;
    const gains = {};
    if (primary) gains[primary] = this.rng.int(lu.primaryMin, lu.primaryMax);
    const others = this.rng.shuffle(this.statKeys.filter((k) => k !== primary)).slice(0, lu.otherCount);
    for (const k of others) gains[k] = this.rng.int(lu.otherMin, lu.otherMax);
    for (const [k, v] of Object.entries(gains)) s.stats[k] = Math.min(cap, (s.stats[k] ?? 0) + v);
    s.level++;
    s.energy = 100;
    this._updateStatus(s, false);
    this.bus?.emit('staff:levelup', { staff: s, level: s.level, gains });
  }

  // --- daily / monthly -----------------------------------------------------
  dailyTick() {
    const r = this.rules;
    for (const s of this.staff) {
      if (this.planActivity) s.activity = this.planActivity(s);
      if (s.activity === 'working') {
        const loss = this.rng.range(r.workEnergyLoss.min, r.workEnergyLoss.max);
        const extra = this.energyLossMultiplier ? this.energyLossMultiplier(s) : 1;
        s.energy -= loss * (1 + this.traitEffect(s, 'energyLossPct') / 100) * extra;
      } else if (s.activity === 'resting') {
        const mod = this.restModifier?.(s);
        s.energy += r.restEnergyGain * (mod?.energyMult ?? 1);
        if (mod?.morale) s.morale = round1(clamp(s.morale + mod.morale, 0, 100));
      }
      s.energy = round1(clamp(s.energy, 0, 100));
      this._applyMoraleFloor(s);
      this._updateStatus(s, true);
    }
    this.bus?.emit('staff:day', { staff: this.staff });
  }

  monthlyTick() {
    const u = this.rules.unassignedMorale;
    for (const s of this.staff) {
      if (s.assigned) {
        s.monthsUnassigned = 0;
      } else {
        s.monthsUnassigned++;
        if (s.monthsUnassigned >= u.afterMonths) this.changeMorale(s, u.perMonth);
      }
      this._updateStatus(s, false);
    }
    this.bus?.emit('staff:month', { staff: this.staff });
  }

  changeMorale(s, delta) {
    s.morale = round1(clamp(s.morale + delta, 0, 100));
    this._applyMoraleFloor(s);
  }

  _applyMoraleFloor(s) {
    const floor = this.traitEffect(s, 'moraleFloor');
    if (s.morale < floor) s.morale = floor;
  }

  // Tired / Stressed follow the numbers; Inspired is a small daily roll while conditions hold.
  _updateStatus(s, rollInspired) {
    const r = this.rules;
    s.status.tired = s.energy < r.tiredBelow;
    s.status.stressed = s.morale < r.stressedBelow;
    const canInspire = s.morale > r.inspired.moraleAbove && s.energy > r.inspired.energyAbove;
    if (!canInspire) s.status.inspired = false;
    else if (rollInspired && !s.status.inspired) s.status.inspired = this.rng.chance(r.inspired.dailyChance);
  }
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

function round1(v) {
  return Math.round(v * 10) / 10;
}
