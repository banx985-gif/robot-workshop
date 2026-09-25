// Robot purpose classes (bible §10.2) with their purpose weights (§10.5).
// Weights sum to 100 and drive Fit and the review score. `visual` is the base visual family (§13);
// `art` is that family's robot picture (kept here so older screens and saves can find it).
// unlock: only the Helper is open in normal play; the rest open through research (Milestone 9).

export const PURPOSE_ORDER = ['helper', 'delivery', 'warehouse', 'scout', 'racing', 'rescue', 'builder', 'service', 'sport', 'experimental'];

export const PURPOSES = {
  helper: {
    id: 'helper',
    name: 'Workshop Helper',
    shortName: 'Helper',
    weights: { SPD: 5, PWR: 10, CTL: 10, INT: 20, END: 10, REL: 30, APL: 15 },
    visual: 'V01',
    art: 'robot_full_01_workshop_helper',
    unlock: { type: 'start' },
  },
  delivery: {
    id: 'delivery',
    name: 'Delivery',
    shortName: 'Courier',
    weights: { SPD: 20, PWR: 5, CTL: 20, INT: 20, END: 10, REL: 20, APL: 5 },
    visual: 'V02',
    art: 'robot_full_02_delivery_runner',
    unlock: { type: 'research', branch: 'mobility', level: 1 },
  },
  warehouse: {
    id: 'warehouse',
    name: 'Warehouse',
    shortName: 'Lifter',
    weights: { SPD: 5, PWR: 30, CTL: 10, INT: 10, END: 20, REL: 20, APL: 5 },
    visual: 'V03',
    art: 'robot_full_03_warehouse_lifter',
    unlock: { type: 'research', branch: 'tool', level: 1 },
  },
  scout: {
    id: 'scout',
    name: 'Exploration / Scout',
    shortName: 'Scout',
    weights: { SPD: 15, PWR: 5, CTL: 20, INT: 25, END: 15, REL: 15, APL: 5 },
    visual: 'V04',
    art: 'robot_full_04_scout',
    unlock: { type: 'research', branch: 'ai', level: 2 },
  },
  racing: {
    id: 'racing',
    name: 'Racing',
    shortName: 'Racer',
    weights: { SPD: 35, PWR: 10, CTL: 25, INT: 10, END: 5, REL: 10, APL: 5 },
    visual: 'V05',
    art: 'robot_full_05_racer',
    unlock: { type: 'research', branch: 'mobility', level: 2 },
  },
  rescue: {
    id: 'rescue',
    name: 'Rescue',
    shortName: 'Rescue',
    weights: { SPD: 10, PWR: 20, CTL: 15, INT: 15, END: 15, REL: 20, APL: 5 },
    visual: 'V06',
    art: 'robot_full_06_rescue',
    unlock: { type: 'research', branch: 'tool', level: 3 },
  },
  builder: {
    id: 'builder',
    name: 'Construction / Builder',
    shortName: 'Builder',
    weights: { SPD: 5, PWR: 30, CTL: 10, INT: 10, END: 20, REL: 20, APL: 5 },
    visual: 'V07',
    art: 'robot_full_07_builder',
    unlock: { type: 'research', branch: 'mechanical', level: 2 },
  },
  service: {
    id: 'service',
    name: 'Service',
    shortName: 'Service',
    weights: { SPD: 5, PWR: 5, CTL: 15, INT: 25, END: 5, REL: 20, APL: 25 },
    visual: 'V08',
    art: 'robot_full_08_service',
    unlock: { type: 'research', branch: 'ai', level: 3 },
  },
  sport: {
    id: 'sport',
    name: 'Sport / Arena',
    shortName: 'Sport',
    weights: { SPD: 25, PWR: 15, CTL: 25, INT: 10, END: 10, REL: 10, APL: 5 },
    visual: 'V09',
    art: 'robot_full_09_sport',
    unlock: { type: 'research', branch: 'mobility', level: 3 },
  },
  experimental: {
    id: 'experimental',
    name: 'Experimental',
    shortName: 'Prototype',
    weights: { SPD: 14, PWR: 14, CTL: 14, INT: 16, END: 14, REL: 14, APL: 14 },
    visual: 'V10',
    art: 'robot_full_10_experimental',
    unlock: { type: 'rank', rank: 'B' },
  },
};
