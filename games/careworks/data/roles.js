// The five staff roles, the five work stats and the tiers (Milestone 3, bible §11). Plain data only.
//   ROLES[id]: name, short, primaryStat, purpose (one line), badge (art key), colour (the code-drawn portrait placeholder
//   of the setup screen, and name tags)
export const ROLES = {
  RN: { name: 'Registered Nurse', short: 'Nurse', primaryStat: 'CLN', purpose: 'Clinical assessment, medication, complex care and escalation', badge: 'care_role_01', colour: '#3E7CB1' },
  CW: { name: 'Care Worker', short: 'Carer', primaryStat: 'PER', purpose: 'Personal care, routines, companionship and daily support', badge: 'care_role_02', colour: '#6FA86A' },
  LC: { name: 'Lifestyle Coordinator', short: 'Lifestyle', primaryStat: 'SOC', purpose: 'Activities, relationships, community and resident choice', badge: 'care_role_03', colour: '#E0913F' },
  AH: { name: 'Allied Health', short: 'Allied Health', primaryStat: 'MOB', purpose: 'Mobility, rehabilitation, falls prevention and reablement', badge: 'care_role_04', colour: '#8A6CC0' },
  HN: { name: 'Hospitality & Nutrition', short: 'Hospitality', primaryStat: 'NUT', purpose: 'Meals, hydration, dining, dietary support and hospitality', badge: 'care_role_05', colour: '#C8634E' },
};
export const ROLE_IDS = Object.keys(ROLES);

// The five work stats (bible §11). need = the resident need a stat's work eases (a Founder's "+6% contribution" lands
// on that need when they help).
export const STATS = [
  { id: 'CLN', name: 'Clinical', need: 'clinical' },
  { id: 'PER', name: 'Personal Care', need: 'personal' },
  { id: 'MOB', name: 'Mobility / Reablement', need: 'mobility' },
  { id: 'SOC', name: 'Social / Communication', need: 'social' },
  { id: 'NUT', name: 'Nutrition / Hospitality', need: 'nutrition' },
];
export const STAT_IDS = STATS.map((s) => s.id);

// Tier caps (bible §11). signature: legendary / secret staff also bring one signature trait.
export const TIERS = {
  standard: { name: 'Standard', statCap: 220, traitSlots: 1 },
  rare: { name: 'Rare', statCap: 300, traitSlots: 1 },
  elite: { name: 'Elite', statCap: 400, traitSlots: 2 },
  legendary: { name: 'Legendary', statCap: 520, traitSlots: 2, signature: true },
  secret: { name: 'Secret/Prestige', statCap: 650, traitSlots: 3, signature: true },
  // Milestone 30b: the Works Gods (SERIES_WORKS_GODS.md) — a tier above Secret, never on a board, never bought; their
  // signature is their blessing (data/staff.js GODS)
  divine: { name: 'Divine', statCap: 650, traitSlots: 3, signature: true },
};
