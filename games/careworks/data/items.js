// Care equipment — items (Milestone 25c, series common feature §4). Plain data for core/ItemSystem (src/systems/items.js).
// An item given to one staff member permanently raises the stat training raises, then is used up: Clinical kit → CLN,
// Comfort & dignity → PER, Mobility kit → MOB, Activity & chat → SOC, Kitchen & table → NUT; Staff wellbeing items are
// smaller treats that each raise one stat (they only ever come as Common or Rare). Everything is fictional and
// non-clinical: no medicines, doses or diagnoses (the Milestone 18 rule).
//
// Pictures: an item uses filed art where it fits (art: a key already in data/assets.js — care equipment, rewards, UI
// icons); the rest are code placeholders in the group's colour (core/ui/ItemArt) until their own files exist
// (assets/ART_STATUS.md "Wanted later"). The rarity frame is always drawn by code.
//
// Items only ever come from play (ITEM_SOURCES): care outcomes, a great training effort, community partners, families
// and the community, a well-wisher now and then, grants, partner-hosted events (and achievements, a Milestone 31 hook).
// Never a shop, never Care Tokens, never real money — tests/careworks/m25c.test.mjs scans every source.
//
// PLACEHOLDERS (DECISIONS.md, M25c): every number and every like below.

export const ITEM_GROUPS = [
  { id: 'clinical', name: 'Clinical kit', stat: 'CLN', color: '#3E7CB1', shape: 'book' },
  { id: 'comfort', name: 'Comfort & dignity', stat: 'PER', color: '#6FA86A', shape: 'blob' },
  { id: 'mobility', name: 'Mobility kit', stat: 'MOB', color: '#8A6CC0', shape: 'slab' },
  { id: 'activity', name: 'Activity & chat', stat: 'SOC', color: '#E0913F', shape: 'disc' },
  { id: 'kitchen', name: 'Kitchen & table', stat: 'NUT', color: '#C8634E', shape: 'cup' },
  { id: 'wellbeing', name: 'Staff wellbeing', stat: null, color: '#D9A93B', shape: 'trophy' },
];
export const itemGroupById = (id) => ITEM_GROUPS.find((g) => g.id === id) ?? null;

// [name, art (an existing picture, or null for a placeholder), stat (wellbeing items only)]
const NAMES = {
  clinical: [['Observation Clipboard', 'care_equipment_02'], ['Pocket Care Handbook', null], ['Hand-Hygiene Kit', null], ['Handover Notebook', null]],
  comfort: [['Soft Wash Kit', null], ['Warm Blanket Set', null], ['Dignity Screen', null], ['Pressure Cushion', 'care_equipment_05']],
  mobility: [['Transfer Belt', null], ['Standing Aid', 'care_equipment_04'], ['Therapy Steps', 'care_equipment_07'], ['Slide Sheet', null]],
  activity: [['Reminiscence Box', null], ['Card Games Set', null], ['Music Player', null], ['Memory Book', 'care_ui_25']],
  kitchen: [['Hydration Cart', 'care_equipment_06'], ['Texture Meal Kit', 'care_equipment_09'], ['Tasting Spoons Set', null], ['Recipe Folder', null]],
  wellbeing: [['Comfy Work Shoes', null, 'MOB'], ['Break-Room Kettle', null, 'NUT'], ['Team Thank-You Card', 'care_reward_05', 'SOC'], ['Calm Minutes Journal', null, 'PER']],
};
const pad = (n) => String(n).padStart(2, '0');
// { id: 'CI01', name, group, stat, art } … CI24
export const ITEM_TYPES = ITEM_GROUPS.flatMap((g, gi) => NAMES[g.id].map(([name, art, stat], i) => {
  const n = gi * 4 + i + 1;
  return { id: `CI${pad(n)}`, name, group: g.id, stat: stat ?? g.stat, art: art ?? `care_item_${pad(n)}` };
}));
export const itemTypeById = (id) => ITEM_TYPES.find((t) => t.id === id) ?? null;
// Wanted later (ART_STATUS.md): a picture for each placeholder item, and an equipment-store icon.
export const ITEM_ART_WANTED = ITEM_TYPES.filter((t) => t.art.startsWith('care_item_')).map((t) => ({ key: t.art, name: t.name }));

// Rarity: gain = stat points, sell = Credits back for a spare, weight = the default odds.
export const ITEM_RARITIES = {
  common: { name: 'Common', gain: 2, sell: 40, weight: 60, color: '#8A9099', frame: 'thin' },
  rare: { name: 'Rare', gain: 4, sell: 100, weight: 28, color: '#1597BF' },
  elite: { name: 'Elite', gain: 7, sell: 250, weight: 10, color: '#7A5CFF', gem: true },
  legendary: { name: 'Legendary', gain: 12, sell: 600, weight: 2, color: '#F2B233', gem: true },
};
export const WELLBEING_WEIGHTS = { common: 70, rare: 30, elite: 0, legendary: 0 }; // (small treats)

export const ITEM_RULES = {
  inventoryMax: 16, // the store holds this many
  periodCap: 20, // item points one staff member can take in a season (3 game months)
  seasonMonths: 3,
  loveMult: 1.5,
  dislikeMult: 0.5,
  loveMorale: 4, // a loved item lifts Morale too
  likes: { loves: [1, 2], dislikeChance: 0.5 },
  storeIcon: 'care_ui_19', // Staff Wellbeing (an equipment-store picture is wanted later)
  storeName: 'Care equipment store',
};

// Likes (data/staff.js staffLikes reads this): each role loves its own group and one more (by person), and may dislike
// one (about half of them).
export const ROLE_LIKES = {
  RN: { love: 'clinical', also: ['comfort', 'wellbeing'], dislike: ['kitchen', 'activity'] },
  CW: { love: 'comfort', also: ['activity', 'mobility'], dislike: ['clinical', 'kitchen'] },
  LC: { love: 'activity', also: ['kitchen', 'comfort'], dislike: ['clinical', 'mobility'] },
  AH: { love: 'mobility', also: ['wellbeing', 'clinical'], dislike: ['kitchen', 'activity'] },
  HN: { love: 'kitchen', also: ['activity', 'wellbeing'], dislike: ['clinical', 'mobility'] },
};

// Where items come from (src/systems/items.js; rolls use the items' own seeded generator, saved with the home).
//   chance: of one item when it happens · weights: rarity odds for that source (else ITEM_RARITIES weights)
export const ITEM_SOURCES = {
  discharge: { text: 'A successful rehab discharge', chance: 1, weights: { common: 40, rare: 40, elite: 18, legendary: 2 } },
  compliment: { text: 'A compliment from a family', chance: 0.5 },
  birthday: { text: 'A birthday tea done well', chance: 0.5 },
  calmMonth: { text: 'A calm month: no essential care missed', chance: 1, weights: { common: 30, rare: 45, elite: 22, legendary: 3 } },
  training: { text: 'A great training effort', chance: 0.5, minShare: 0.8 }, // a course whose gains were at least 80% of the most it could give
  partner: { text: 'A community partner', chance: 1, weights: { common: 10, rare: 50, elite: 32, legendary: 8 } }, // a deal reaching a new tier
  partnerEvent: { text: 'A partner-hosted event', chance: 1 },
  family: { text: 'A thank-you gift from a family', chance: 0.06, minTrust: 75 }, // a visit, when Family Trust is high
  wellWisher: { text: 'A well-wisher from the community', monthlyChance: 0.12 },
  grant: { text: 'A grant goal met', chance: 1 },
  achievement: { text: 'An achievement', chance: 0 }, // hook only (achievements come in Milestone 31)
  secret: { text: 'A secret found', chance: 1, weights: { common: 10, rare: 45, elite: 35, legendary: 10 } }, // (Milestone 29: a secret's item reward)
};
// Never: the test fails if any source says it is bought or paid for.
export const NEVER_SOURCES = ['shop', 'store purchase', 'Care Tokens', 'real money', 'purchase', 'buy'];
