// Staff content for Robot Workshop: the three starters (bible §15.6) plus the two tutorial hires (Milestone 10):
// DES01 Tessa Vale (Month 1) and PIL01 Kai West (when the Local Trial unlocks). The other named staff arrive in Milestone 11.
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
  {
    id: 'DES01',
    name: 'Tessa Vale',
    nameKey: 'staff.DES01.name',
    role: 'designer',
    tier: 'standard',
    startLevel: 1,
    stats: { eng: 24, des: 60, prg: 22, fab: 26, tst: 28 },
    salary: 470,
    traits: ['marketSense'],
    unlock: { type: 'tutorial', when: 'month1' },
    art: 'staff_designer_01',
  },
  {
    id: 'PIL01',
    name: 'Kai West',
    nameKey: 'staff.PIL01.name',
    role: 'pilot',
    tier: 'standard',
    startLevel: 1,
    stats: { eng: 24, des: 24, prg: 28, fab: 28, tst: 64 },
    salary: 500,
    traits: ['calmUnderPressure'],
    unlock: { type: 'tutorial', when: 'localTrial' },
    art: 'staff_pilot_01',
  },
];

export const STARTER_IDS = STAFF.filter((s) => s.unlock.type === 'starter').map((s) => s.id);

// §39.1 employee cap by Company Rank (hiring is refused at the cap).
export const EMPLOYEE_CAP = { E: 6, D: 8, C: 12, B: 16, A: 20, S: 24, 'S+': 24 };

// Tiers that ordinary recruitment can ever roll (§9.4: legendary and secret staff only arrive through their own events).
export const RECRUITABLE_TIERS = ['standard', 'rare', 'elite'];
