// Facility Setup lists (Milestone 0, bible §3.5.2–3.5.4). Plain data only: names have no gameplay effect, the colour
// is cosmetic, and the Founder perks are text until Milestone 3 applies them.

export const NAME_MAX = { facility: 24, director: 16 };

// Made-up care-home names for Random (bible §3.5.2: fictional care-home names only).
export const FACILITY_NAMES = [
  'Banks Care', 'Willow Brook House', 'Maple Rise Lodge', 'Harbour Light Home', 'Rosewood Gardens',
  'Kestrel Court', 'Linden Hill House', 'Quiet Waters Lodge', 'Bramble Cottage Care', 'Sunnyside Terrace',
  'Hollyfield House', 'Juniper Lane Home', 'Oakmere Lodge', 'Lavender Hill Care', 'Seabright House',
  'Cedar Glen Lodge', 'Primrose Court', 'Meadowbank Home', 'Thistledown House', 'Fernleigh Care',
  'Wren Hollow Lodge', 'Chestnut Walk House', 'Elm Tree Court', 'Bluebell Rise', 'Larkspur House',
];

// First names for Random. Shown as "Facility Director <name>".
export const DIRECTOR_NAMES = [
  'Aaron', 'Priya', 'Owen', 'Leila', 'Marcus', 'Hana', 'Tomas', 'Grace', 'Idris', 'Mei', 'Callum', 'Amara',
  'Jonas', 'Sofia', 'Kofi', 'Elena', 'Rafi', 'Bea', 'Declan', 'Noor', 'Luca', 'Tess', 'Arjun', 'Freya',
];

// The six CAREWORKS accent palettes (bible §3.5.2). hex = the main accent; light = a soft wash behind it; dark = text
// or outlines on the light wash. Cosmetic only: the badge/sign, the slot accent strip, small identity markings.
export const PALETTES = [
  { id: 'sage', name: 'Sage', hex: '#7FA384', light: '#E4EFE2', dark: '#3F6446' },
  { id: 'teal', name: 'Teal', hex: '#2E9A94', light: '#DCF1EF', dark: '#1B5E5A' },
  { id: 'peach', name: 'Peach', hex: '#EE9A6E', light: '#FCE8DC', dark: '#A2502A' },
  { id: 'garden', name: 'Garden Green', hex: '#4E9A3F', light: '#E1F1D9', dark: '#2D5E23' },
  { id: 'cyan', name: 'Cyan', hex: '#1E9CC4', light: '#DDF1F8', dark: '#12607A' },
  { id: 'cream', name: 'Warm Cream', hex: '#D4A64A', light: '#FBF0D6', dark: '#81601C' },
];
export const paletteById = (id) => PALETTES.find((p) => p.id === id) ?? PALETTES[0];

// The five roles live in data/roles.js (Milestone 3); re-exported here for the setup screens.
export { ROLES } from './roles.js';

// Choose Founding Staff (bible §3.5.3): one per role. Milestone 3 applies the perk. perk.effects are numbers, read
// through core/FounderPerks: contrib_<STAT> = +% on the need that stat eases when the Founder helps with a step
// (e.g. contrib_PER 6: Personal Support drops 6% more); the rest are small secondary bonuses. live: false = its system is
// not built yet (the number is stored for its milestone). The opening team is built by src/systems/staffTeam.js.
export const FOUNDERS = [
  {
    id: 'RN01', name: 'Maya Finch', role: 'RN', trait: 'Calm Round', skin: '#E8B894', hair: '#5A3A28', art: 'staff_rn01',
    perk: {
      name: 'Founder RN', text: '+6% Clinical contribution on eligible care tasks and −3% medication-round delay risk',
      effects: [{ key: 'contrib_CLN', value: 6 }, { key: 'medRoundDelayPct', value: -3, live: false }],
    },
  },
  {
    id: 'CW01', name: 'Ruby Hale', role: 'CW', trait: 'Gentle Hands', skin: '#F0C7A4', hair: '#B5452F', art: 'staff_cw01',
    perk: {
      name: 'Founder Carer', text: '+6% Personal Care contribution and +5% Familiar Care relationship gain',
      effects: [{ key: 'contrib_PER', value: 6 }, { key: 'familiarCarePct', value: 5, live: false }],
    },
  },
  {
    id: 'LC01', name: 'Zoe Quinn', role: 'LC', trait: 'Conversation Starter', skin: '#C98E66', hair: '#2E211A', art: 'staff_lc01',
    perk: {
      name: 'Founder Lifestyle', text: '+6% Lifestyle contribution and +3% activity Wellbeing gain',
      effects: [{ key: 'contrib_SOC', value: 6 }, { key: 'activityWellbeingPct', value: 3 }],
    },
  },
  {
    id: 'AH01', name: 'Nia Foster', role: 'AH', trait: 'Steady Steps', skin: '#8D5A3B', hair: '#1F1612', art: 'staff_ah01',
    perk: {
      name: 'Founder Allied Health', text: '+6% Mobility contribution and +5% rehabilitation progress',
      effects: [{ key: 'contrib_MOB', value: 6 }, { key: 'rehabProgressPct', value: 5, live: false }],
    },
  },
  {
    id: 'HN01', name: 'Sam Kitchen', role: 'HN', trait: 'Warm Welcome', skin: '#E2AE88', hair: '#7A5A3A', art: 'staff_hn01',
    perk: {
      name: 'Founder Hospitality', text: '+6% Nutrition/Hospitality contribution and +3% meal/hydration satisfaction',
      effects: [{ key: 'contrib_NUT', value: 6 }, { key: 'mealSatisfactionPct', value: 3 }],
    },
  },
];
export const founderById = (id) => FOUNDERS.find((f) => f.id === id) ?? null;

// The chosen founder's permanent run-history flag (bible §3.5.3).
export const FOUNDER_FLAG = 'foundingStaff';
