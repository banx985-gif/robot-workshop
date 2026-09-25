// Staff content for Robot Workshop. Milestone 2: the three starters only (bible §15.1/15.3/15.4, §15.6).
// Shape follows bible §42.1.

// Five fixed roles (§9.1). primaryStat drives level-up growth (§9.3).
export const ROLES = {
  engineer: { name: 'Engineer', primaryStat: 'eng', badge: 'badge_role_01_engineer' },
  designer: { name: 'Designer', primaryStat: 'des', badge: 'badge_role_02_designer' },
  programmer: { name: 'Programmer', primaryStat: 'prg', badge: 'badge_role_03_programmer' },
  mechanic: { name: 'Mechanic', primaryStat: 'fab', badge: 'badge_role_04_mechanic' },
  pilot: { name: 'Test Pilot', primaryStat: 'tst', badge: 'badge_role_05_pilot' },
};

// Tiers (§9.4): stat cap per work stat and trait slots.
export const TIERS = {
  standard: { name: 'Standard', statCap: 220, traitSlots: 1 },
  rare: { name: 'Rare', statCap: 300, traitSlots: 1 },
  elite: { name: 'Elite', statCap: 400, traitSlots: 2 },
  legendary: { name: 'Legendary', statCap: 520, traitSlots: 2, signature: true },
  secret: { name: 'Secret', statCap: 650, traitSlots: 3, signature: true },
};

export const STAFF = [
  {
    id: 'ENG01',
    name: 'Mina Rowe',
    nameKey: 'staff.ENG01.name',
    role: 'engineer',
    tier: 'standard',
    startLevel: 1,
    stats: { eng: 58, des: 28, prg: 24, fab: 38, tst: 22 },
    salary: 480,
    traits: ['quickLearner'],
    unlock: { type: 'starter' },
    art: 'staff_engineer_01',
  },
  {
    id: 'PRG01',
    name: 'Rami Cole',
    nameKey: 'staff.PRG01.name',
    role: 'programmer',
    tier: 'standard',
    startLevel: 1,
    stats: { eng: 26, des: 24, prg: 62, fab: 22, tst: 30 },
    salary: 490,
    traits: ['debugger'],
    unlock: { type: 'starter' },
    art: 'staff_programmer_01',
  },
  {
    id: 'MEC01',
    name: 'Gus Hale',
    nameKey: 'staff.MEC01.name',
    role: 'mechanic',
    tier: 'standard',
    startLevel: 1,
    stats: { eng: 34, des: 20, prg: 18, fab: 62, tst: 28 },
    salary: 460,
    traits: ['fabricator'],
    unlock: { type: 'starter' },
    art: 'staff_mechanic_01',
  },
];

export const STARTER_IDS = STAFF.filter((s) => s.unlock.type === 'starter').map((s) => s.id);
