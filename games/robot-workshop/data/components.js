// Robot parts: the full v1.0 catalogue (bible §10.3, §11) — 50 parts in six slots.
//   cost  = per-project build charge;  cx = complexity 1–10 (fault risk and project tier)
//   stats = changes to the seven robot stats ("all stats +18" is written out for all seven)
//   inn   = Innovation added to the robot;  faultPct = extra daily fault chance in % points (CH09 "base fault +3%")
//   tags  = simple labels for later rules (synergies, Milestone 14)
//   unlock = how the part opens, as data. Only 'start' parts are open until research arrives (Milestone 9).
//     { type: 'start' } | { type: 'research', branch, level } | { type: 'facility', id } | { type: 'rank', rank }
//     { type: 'counter', counter, min } | { type: 'competition', event } | { type: 'secret', id } | { type: 'all', of: [rules] }

export const SLOTS = [
  { id: 'chassis', name: 'Chassis', art: 'chassis' },
  { id: 'mobility', name: 'Mobility', art: 'mobility' },
  { id: 'ai', name: 'AI / Sensor', art: 'ai' },
  { id: 'tool', name: 'Tool / Payload', art: 'tool' },
  { id: 'power', name: 'Power System', art: 'power' },
  { id: 'special', name: 'Special Module', art: 'special' },
];

const START = { type: 'start' };
const research = (branch, level) => ({ type: 'research', branch, level });
const secret = (id) => ({ type: 'secret', id });
const all = (...of) => ({ type: 'all', of });
const every = (n) => ({ SPD: n, PWR: n, CTL: n, INT: n, END: n, REL: n, APL: n });

// [id, name, cost, cx, stats, unlock, tags, extra]
const ROWS = {
  chassis: [
    ['CH01', 'Compact Chassis', 400, 1, { SPD: 8, CTL: 8, REL: 12, APL: 5 }, START, ['light', 'starter']],
    ['CH02', 'Standard Chassis', 700, 2, { PWR: 10, END: 12, REL: 15 }, research('mechanical', 1), ['standard']],
    ['CH03', 'Heavy Chassis', 1200, 3, { PWR: 28, END: 25, REL: 12, SPD: -6 }, research('mechanical', 2), ['heavy']],
    ['CH04', 'Aero Chassis', 1800, 4, { SPD: 30, CTL: 14, APL: 8, END: -5 }, research('mechanical', 3), ['aero', 'speed']],
    ['CH05', 'Rugged Chassis', 2600, 4, { END: 32, REL: 28, PWR: 10 }, research('mechanical', 4), ['rugged']],
    ['CH06', 'Precision Chassis', 3800, 5, { CTL: 32, REL: 22, APL: 18 }, all({ type: 'facility', id: 'F21' }, research('mechanical', 5)), ['precision']],
    ['CH07', 'Modular Chassis', 5500, 6, { INT: 12, CTL: 20, END: 20, REL: 20 }, { type: 'rank', rank: 'B' }, ['modular']],
    ['CH08', 'Titanium Chassis', 8000, 7, { PWR: 35, END: 38, REL: 35, SPD: 8 }, all(research('mechanical', 6), { type: 'competition', event: 'worldTier' }), ['titanium', 'heavy']],
    ['CH09', 'Experimental Chassis', 12000, 8, every(18), all({ type: 'counter', counter: 'researchPrototypes', min: 5 }, research('ai', 5)), ['experimental'], { inn: 8, faultPct: 3 }],
    ['CH10', '??? Prestige Chassis', 20000, 10, every(35), secret('SEC-COMP-01'), ['prestige', 'secret'], { inn: 15 }],
  ],
  mobility: [
    ['MO01', 'Basic Wheels', 250, 1, { SPD: 12, CTL: 8, REL: 8 }, START, ['wheels', 'starter']],
    ['MO02', 'Performance Wheels', 700, 2, { SPD: 26, CTL: 18, REL: 5 }, research('mobility', 1), ['wheels', 'speed']],
    ['MO03', 'Heavy Tracks', 1100, 3, { PWR: 12, END: 25, REL: 18, SPD: -8 }, research('mobility', 2), ['tracks', 'heavy']],
    ['MO04', 'Omni Wheels', 1700, 4, { SPD: 15, CTL: 35, INT: 8 }, research('mobility', 3), ['wheels', 'precision']],
    ['MO05', 'Biped Legs', 2700, 5, { CTL: 26, PWR: 20, APL: 10, REL: -4 }, research('mobility', 4), ['legs']],
    ['MO06', 'Quad Legs', 4000, 6, { CTL: 24, END: 30, REL: 22 }, research('mobility', 5), ['legs', 'rugged']],
    ['MO07', 'Hover Drive', 6500, 8, { SPD: 42, CTL: 34, INT: 12, REL: -8 }, all(research('mobility', 6), { type: 'rank', rank: 'A' }), ['hover', 'speed']],
    ['MO08', 'Rocket/Skate Drive', 10000, 9, { SPD: 65, CTL: 20, REL: -12 }, secret('SEC-COMP-02'), ['rocket', 'speed', 'secret'], { inn: 8 }],
  ],
  ai: [
    ['AI01', 'Basic Camera', 250, 1, { INT: 10, CTL: 5 }, START, ['sensor', 'starter']],
    ['AI02', 'Depth Sensor', 650, 2, { INT: 20, CTL: 10, REL: 5 }, research('ai', 1), ['sensor']],
    ['AI03', 'Lidar Array', 1300, 3, { INT: 30, CTL: 16 }, research('ai', 2), ['sensor']],
    ['AI04', 'Thermal Sensor', 2000, 4, { INT: 24, REL: 12, END: 8 }, research('ai', 3), ['sensor', 'rescue']],
    ['AI05', 'Navigation AI', 3000, 5, { INT: 42, CTL: 24, REL: 8 }, research('ai', 4), ['ai', 'navigation']],
    ['AI06', 'Learning AI', 4800, 6, { INT: 55, CTL: 15 }, research('ai', 5), ['ai', 'learning'], { inn: 5 }],
    ['AI07', 'Competition AI', 7000, 7, { INT: 42, SPD: 16, CTL: 30 }, all(research('ai', 6), { type: 'competition', event: 'nationalCup' }), ['ai', 'competition']],
    ['AI08', 'Experimental Neural Core', 12000, 9, { INT: 75, CTL: 35, REL: -8 }, secret('SEC-COMP-03'), ['ai', 'experimental', 'secret'], { inn: 12 }],
  ],
  tool: [
    ['TO01', 'Gripper Hands', 250, 1, { PWR: 8, CTL: 8, APL: 4 }, START, ['gripper', 'starter']],
    ['TO02', 'Cargo Lifter', 800, 2, { PWR: 30, END: 10 }, research('tool', 1), ['lifter', 'heavy']],
    ['TO03', 'Precision Tool Arm', 1500, 3, { CTL: 28, INT: 12, APL: 6 }, research('tool', 2), ['precision']],
    ['TO04', 'Rescue Cutter', 2300, 4, { PWR: 22, CTL: 14, REL: 10 }, research('tool', 3), ['rescue']],
    ['TO05', 'Construction Tool', 3200, 5, { PWR: 40, END: 18, REL: 8 }, research('tool', 4), ['construction', 'heavy']],
    ['TO06', 'Survey Package', 4100, 5, { INT: 30, END: 12, APL: 8 }, research('tool', 5), ['survey']],
    ['TO07', 'Sport/Arena Attachment', 6000, 7, { SPD: 15, PWR: 22, CTL: 28 }, all(research('tool', 6), { type: 'competition', event: 'regionalCup' }), ['arena']],
    ['TO08', 'Experimental Multi-Tool', 9000, 8, { PWR: 30, CTL: 30, INT: 30 }, { type: 'counter', counter: 'distinctPurposesCompleted', min: 10 }, ['experimental'], { inn: 7 }],
  ],
  power: [
    ['PO01', 'Basic Battery', 250, 1, { END: 12, REL: 8 }, START, ['battery', 'starter']],
    ['PO02', 'Extended Battery', 650, 2, { END: 28, REL: 10 }, research('power', 1), ['battery']],
    ['PO03', 'Fast-Discharge Pack', 1200, 3, { SPD: 18, PWR: 18, END: 8, REL: -3 }, research('power', 2), ['battery', 'speed']],
    ['PO04', 'High-Density Cell', 2000, 4, { END: 40, PWR: 10 }, research('power', 3), ['battery']],
    ['PO05', 'Regenerative System', 3200, 5, { END: 36, REL: 16, CTL: 8 }, research('power', 4), ['regen']],
    ['PO06', 'Fuel-Cell Module', 4800, 6, { END: 55, PWR: 20, REL: 12 }, research('power', 5), ['fuelCell']],
    ['PO07', 'Micro-Reactor Prototype', 8500, 8, { PWR: 45, END: 65, REL: -10 }, all(research('power', 6), { type: 'counter', counter: 'researchPrototypes', min: 3 }), ['reactor', 'experimental'], { inn: 8 }],
    ['PO08', 'Prestige Quantum Core', 15000, 10, { SPD: 18, PWR: 55, END: 80, REL: 18 }, secret('SEC-COMP-04'), ['prestige', 'secret'], { inn: 15 }],
  ],
  special: [
    ['SP01', 'Cargo Rack', 200, 1, { PWR: 8, END: 10 }, START, ['cargo', 'starter']],
    ['SP02', 'Cooling Package', 700, 2, { REL: 22, END: 8 }, research('special', 1), ['cooling']],
    ['SP03', 'Armour Shell', 1400, 3, { END: 28, REL: 18, SPD: -5 }, research('special', 2), ['armour', 'heavy']],
    ['SP04', 'Boost Module', 2200, 4, { SPD: 30, PWR: 10, REL: -5 }, research('special', 3), ['boost', 'speed']],
    ['SP05', 'Emergency Beacon', 2800, 4, { INT: 10, REL: 20, APL: 5 }, research('special', 4), ['beacon', 'rescue']],
    ['SP06', 'Auto-Repair Kit', 4200, 6, { REL: 38, END: 15 }, research('special', 5), ['repair']],
    ['SP07', 'Adaptive Control Module', 6500, 7, { CTL: 40, INT: 24, REL: 10 }, research('special', 6), ['control', 'precision']],
    ['SP08', 'Secret Prestige Module', 14000, 10, every(22), secret('SEC-COMP-05'), ['prestige', 'secret'], { inn: 12 }],
  ],
};

export const COMPONENTS = {};
for (const slot of SLOTS) {
  ROWS[slot.id].forEach(([id, name, cost, cx, stats, unlock, tags, extra = {}], i) => {
    COMPONENTS[id] = {
      id,
      slot: slot.id,
      name,
      cost,
      cx,
      stats,
      inn: extra.inn ?? 0,
      faultPct: extra.faultPct ?? 0,
      tags,
      unlock,
      art: `component_${slot.art}_${String(i + 1).padStart(2, '0')}`,
    };
  });
}

// Parts of one slot, in catalogue order.
export const partsInSlot = (slotId) => Object.values(COMPONENTS).filter((c) => c.slot === slotId);

// The part picked for each slot when a new project opens.
export const STARTER_PARTS = { chassis: 'CH01', mobility: 'MO01', ai: 'AI01', tool: 'TO01', power: 'PO01', special: 'SP01' };
