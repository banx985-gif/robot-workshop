// Milestone 28b: where the last of Aaron's pictures show. Plain data only (src/main.js, src/ui/carePops.js and the
// screens read it); every picture is drawn as it is — scaled, placed, faded — never drawn on.

// The brand art: the loading screen's key art, the title logo, the art behind the campaign slots, the NG+ key art (a
// slot whose home is on New Game+), the end mark of the Credits, and the Memory Book's own emblem.
export const BRAND = { splash: 'care_brand_02', title: 'care_brand_03', slots: 'care_brand_05', ngPlus: 'care_brand_06', endMark: 'care_brand_07', book: 'memory_book_emblem' };

// The firsts and the ending: Opening Small Home (the first morning of a new home, a big beat), First Resident Welcome
// (the first resident admitted from the Admissions board, a big beat), Living Legacy Ending (the Year-16 ending —
// the Memory Book shows it faded and locked until then).
export const FIRST_ART = { opening: 'care_event_01', welcome: 'care_event_02', legacy: 'care_event_10' };
export const FIRSTS_TEXT = {
  opening: { title: 'Opening day', text: (home) => `${home} opens its doors: look after Arthur and grow from here` },
  welcome: { title: 'A first welcome', text: (name) => `${name} is the first to move in from the Admissions board` },
  legacy: { title: 'Living Legacy', locked: 'The ending of a whole career: it opens at the end of Year 16' },
};

// Reward pictures: the Research Token (Research Points: the Research sheet, the Ledger), the Prestige Token (New Game+
// only: the Ledger), the Rehab Success Badge (beside a rehab discharge's big beat), the Safety Plaque and Wellbeing
// Plaque (beside their accreditation once won: C05 Safe Care, C02 Resident Choice), the National Excellence Trophy (the
// C10 moment, and C10 once won).
export const REWARD_ART = { research: 'care_reward_03', prestige: 'care_reward_04', rehab: 'care_reward_06', safety: 'care_reward_07', wellbeing: 'care_reward_08', trophy: 'care_reward_09' };
export const PLAQUES = { C05: REWARD_ART.safety, C02: REWARD_ART.wellbeing, C10: REWARD_ART.trophy, C11: REWARD_ART.prestige, C12: REWARD_ART.trophy }; // (Milestone 31: the two prestige awards)

// Care effects in the home (core/VfxSystem 'world' layer, like the M5 pops; Reduced flashes or Low graphics turn them
// off). size = drawn width in world px at zoom 1; life = real seconds; gap = real seconds before the same kind again.
//   garden      a gardening session (an activity or the gardening program) — over the garden it runs in
//   training    a staff member finishes a course — over them
//   research    a research node is done — over the Nurse Station (the home's office)
//   compliment  a family compliment — over the resident
//   prestige    Rank S / S+, the C10 award — the Prestige Aura behind the big beat's picture
export const CARE_FX = {
  garden: { art: 'care_vfx_03', size: 190, life: 1.9, gap: 2 },
  training: { art: 'care_vfx_05', size: 170, life: 1.8, gap: 1.5 },
  research: { art: 'care_vfx_06', size: 200, life: 2, gap: 1.5 },
  compliment: { art: 'care_vfx_07', size: 170, life: 1.9, gap: 1.5 },
  prestige: { art: 'care_vfx_09' },
};
// Ranks whose rank-up beat carries the Prestige Aura.
export const PRESTIGE_RANKS = ['S', 'S+'];

// UI icons not used before Milestone 28b: the five headline scores (Quality → Scores), the research branches, the
// Inbox's Rehabilitation and In memory groups, Safe Coverage (the roster), Familiar Care (a card's section), Palliative
// Comfort (the care stage section) and Outing (the outing activity's badge).
export const SCORE_ICONS = { clinicalSafety: 'care_ui_17', residentWellbeing: 'care_ui_18', familyTrust: 'care_ui_10', staffWellbeing: 'care_ui_19', environment: 'care_ui_20' };
export const SECTION_ICONS = { coverage: 'care_ui_08', familiar: 'care_ui_11', comfort: 'care_ui_26', outing: 'care_ui_22', mobility: 'care_ui_16', nutrition: 'care_ui_15', rehab: 'care_ui_13' };

// The painted part of each brand picture (fractions of the 512 × 512 file; measured from the alpha, not by eye): the
// screens crop the clear margin away so the art can fill its space — the picture itself is never changed.
export const ART_CROP = {
  care_brand_02: { x: 0.268, y: 0.021, w: 0.465, h: 0.957 },
  care_brand_03: { x: 0.256, y: 0.189, w: 0.488, h: 0.621 },
  care_brand_05: { x: 0.266, y: 0.096, w: 0.469, h: 0.807 },
  care_brand_06: { x: 0.266, y: 0.094, w: 0.469, h: 0.811 },
  care_brand_07: { x: 0.26, y: 0.186, w: 0.477, h: 0.629 },
};
