// Sales numbers (bible §14.2–14.4). Segments and demand rules live in segments.js.

// §14.3 price positions
export const PRICE_POSITIONS = {
  value: { id: 'value', name: 'Value', priceMult: 0.75, demandMult: 1.25, note: 'Cheaper, sells more. Forgiving on quality.' },
  standard: { id: 'standard', name: 'Standard', priceMult: 1.0, demandMult: 1.0, note: 'The normal price.' },
  premium: {
    id: 'premium',
    name: 'Premium',
    priceMult: 1.45,
    demandMult: 0.68,
    note: 'Costs more, sells fewer. Quality under 75 is penalised.',
    qualityBelow: 75,
    penaltyMult: 0.85, // M4 choice: sales ×0.85 when Quality is under 75
  },
};
export const PRICE_ORDER = ['value', 'standard', 'premium'];

// §14.3 base unit value by project tier
export const BASE_UNIT_VALUE = { starter: 180, standard: 320, advanced: 550, elite: 900, prestige: 1450 };

// §14.4 monthly sales formula
export const SALES_RULES = {
  baseUnits: 18,
  ageCurve: [1.0, 1.12, 1.0, 0.82, 0.62, 0.45], // month 1..6 on sale
  variance: { min: 0.9, max: 1.1 },
  reputationCap: 12000,
  noveltyPenalty: 0.85, // same purpose + the exact same six parts as an earlier product: -15%
  noveltyPenaltyResearched: 0.92, // §19.6: after 18 research topics the successor penalty drops to -8%
  reviewMonths: [0, 3], // §14.5 customer feedback at launch and at month 3
};

// §14.2 active product slots by company rank: 2 at the start, 3 at Rank C, 4 at Rank A.
export const PRODUCT_SLOT_STEPS = [
  { rank: 'E', slots: 2 },
  { rank: 'C', slots: 3 },
  { rank: 'A', slots: 4 },
];
