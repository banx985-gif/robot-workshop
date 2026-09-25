// Robot parts (bible §10.3, §11). Milestone 3: only the six Start parts.
// cost = per-project build charge (shown, not charged until Milestone 4); cx = complexity 1–10.

export const SLOTS = [
  { id: 'chassis', name: 'Chassis' },
  { id: 'mobility', name: 'Mobility' },
  { id: 'ai', name: 'AI / Sensor' },
  { id: 'tool', name: 'Tool / Payload' },
  { id: 'power', name: 'Power System' },
  { id: 'special', name: 'Special Module' },
];

export const COMPONENTS = {
  CH01: {
    id: 'CH01',
    slot: 'chassis',
    name: 'Compact Chassis',
    cost: 400,
    cx: 1,
    stats: { SPD: 8, CTL: 8, REL: 12, APL: 5 },
    unlock: { type: 'start' },
    art: 'component_chassis_01',
  },
  MO01: {
    id: 'MO01',
    slot: 'mobility',
    name: 'Basic Wheels',
    cost: 250,
    cx: 1,
    stats: { SPD: 12, CTL: 8, REL: 8 },
    unlock: { type: 'start' },
    art: 'component_mobility_01',
  },
  AI01: {
    id: 'AI01',
    slot: 'ai',
    name: 'Basic Camera',
    cost: 250,
    cx: 1,
    stats: { INT: 10, CTL: 5 },
    unlock: { type: 'start' },
    art: 'component_ai_01',
  },
  TO01: {
    id: 'TO01',
    slot: 'tool',
    name: 'Gripper Hands',
    cost: 250,
    cx: 1,
    stats: { PWR: 8, CTL: 8, APL: 4 },
    unlock: { type: 'start' },
    art: 'component_tool_01',
  },
  PO01: {
    id: 'PO01',
    slot: 'power',
    name: 'Basic Battery',
    cost: 250,
    cx: 1,
    stats: { END: 12, REL: 8 },
    unlock: { type: 'start' },
    art: 'component_power_01',
  },
  SP01: {
    id: 'SP01',
    slot: 'special',
    name: 'Cargo Rack',
    cost: 200,
    cx: 1,
    stats: { PWR: 8, END: 10 },
    unlock: { type: 'start' },
    art: 'component_special_01',
  },
};

// The part picked for each slot when a new project opens.
export const STARTER_PARTS = { chassis: 'CH01', mobility: 'MO01', ai: 'AI01', tool: 'TO01', power: 'PO01', special: 'SP01' };
