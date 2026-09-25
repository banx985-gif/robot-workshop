// Robot purpose classes (bible §10.2) with their purpose weights (§10.5).
// Weights sum to 100 and drive Fit and the review score. `visual` is the base visual family (§13);
// `art` is that family's robot picture (kept here so older screens and saves can find it).
// unlock (Milestone 9 rules, paced to the bible §4.3 campaign beats over 16 years). Research topics done in
// total (done(n)) work as the campaign's clock: RP arrive steadily, so they spread the openings over the years.
//   Years 1–2  Helper (start) + Delivery (Mobility 1)
//   Years 3–5  Warehouse, Builder (Rank C + first Tools/Mechanical topics), Scout (6 topics), Service (8 topics)
//   Years 6–9  Racing (Mobility 2, 11 topics), Sport (Mobility 3 + Tools 2, 12 topics), Rescue (Tools 3, 12 topics) — Rank C+
//   Experimental: Rank B (when Research Prototypes open, §10.1) + 12 topics
const research = (branch, level) => ({ type: 'research', branch, level });
const rank = (r) => ({ type: 'rank', rank: r });
const all = (...of) => ({ type: 'all', of });
const done = (min) => ({ type: 'researchCount', min });

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
    unlock: research('mobility', 1),
  },
  warehouse: {
    id: 'warehouse',
    name: 'Warehouse',
    shortName: 'Lifter',
    weights: { SPD: 5, PWR: 30, CTL: 10, INT: 10, END: 20, REL: 20, APL: 5 },
    visual: 'V03',
    art: 'robot_full_03_warehouse_lifter',
    unlock: all(research('tool', 1), rank('C')),
  },
  scout: {
    id: 'scout',
    name: 'Exploration / Scout',
    shortName: 'Scout',
    weights: { SPD: 15, PWR: 5, CTL: 20, INT: 25, END: 15, REL: 15, APL: 5 },
    visual: 'V04',
    art: 'robot_full_04_scout',
    unlock: all(research('ai', 2), rank('C'), done(6)),
  },
  racing: {
    id: 'racing',
    name: 'Racing',
    shortName: 'Racer',
    weights: { SPD: 35, PWR: 10, CTL: 25, INT: 10, END: 5, REL: 10, APL: 5 },
    visual: 'V05',
    art: 'robot_full_05_racer',
    unlock: all(research('mobility', 2), rank('C'), done(11)),
  },
  rescue: {
    id: 'rescue',
    name: 'Rescue',
    shortName: 'Rescue',
    weights: { SPD: 10, PWR: 20, CTL: 15, INT: 15, END: 15, REL: 20, APL: 5 },
    visual: 'V06',
    art: 'robot_full_06_rescue',
    unlock: all(research('tool', 3), rank('C'), done(12)),
  },
  builder: {
    id: 'builder',
    name: 'Construction / Builder',
    shortName: 'Builder',
    weights: { SPD: 5, PWR: 30, CTL: 10, INT: 10, END: 20, REL: 20, APL: 5 },
    visual: 'V07',
    art: 'robot_full_07_builder',
    unlock: all(research('mechanical', 2), research('tool', 1), rank('C')),
  },
  service: {
    id: 'service',
    name: 'Service',
    shortName: 'Service',
    weights: { SPD: 5, PWR: 5, CTL: 15, INT: 25, END: 5, REL: 20, APL: 25 },
    visual: 'V08',
    art: 'robot_full_08_service',
    unlock: all(research('ai', 2), research('special', 1), rank('C'), done(8)),
  },
  sport: {
    id: 'sport',
    name: 'Sport / Arena',
    shortName: 'Sport',
    weights: { SPD: 25, PWR: 15, CTL: 25, INT: 10, END: 10, REL: 10, APL: 5 },
    visual: 'V09',
    art: 'robot_full_09_sport',
    unlock: all(research('mobility', 3), research('tool', 2), rank('C'), done(12)),
  },
  experimental: {
    id: 'experimental',
    name: 'Experimental',
    shortName: 'Prototype',
    weights: { SPD: 14, PWR: 14, CTL: 14, INT: 16, END: 14, REL: 14, APL: 14 },
    visual: 'V10',
    art: 'robot_full_10_experimental',
    unlock: all(rank('B'), done(12)),
  },
};
