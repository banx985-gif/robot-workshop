// Market and sales numbers (bible §14.1–14.4). Milestone 4: one segment only.

export const SEGMENTS = [{ id: 'homeHobby', name: 'Home & Hobby' }];

// Purpose → the segment its sales use (§14.1; Helper's other segment, Small Business, arrives with the rest).
export const PURPOSE_SEGMENT = { helper: 'homeHobby' };

export const DEMAND_RANGE = { min: 60, max: 140 }; // monthly, seeded

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
  noveltyPenalty: 0.85, // identical parts + purpose as an earlier product: -15%
};

// §14.2 active product slots at the start
export const PRODUCT_SLOTS = 2;
