// The 8 customer segments (bible §14.1), which purposes sell to them, and how demand moves.
// Demand each month: base 60–140 (a random walk) + any trend (±20 for 1–3 months, one or two segments).
// customerArt: portrait used on this segment's contract cards; customers: made-up buyer names for random contracts.

export const SEGMENTS = [
  { id: 'homeHobby', name: 'Home & Hobby', min: 60, max: 140, customerArt: 'npc_customer_02_logistics_buyer', customers: ['Maple Street Makers', 'Hobby Hut', 'Nguyen Household', 'Weekend Tinkerers Club'] },
  { id: 'smallBusiness', name: 'Small Business', min: 60, max: 140, customerArt: 'npc_customer_01_factory_owner', customers: ['Bramble Bakery', 'Fixit Garage', 'Tall Pines Florist', 'Harbour Dry Cleaners'] },
  { id: 'logistics', name: 'Logistics', min: 60, max: 140, customerArt: 'npc_customer_02_logistics_buyer', customers: ['ParcelPoint', 'Northway Freight', 'QuickCrate Depot', 'Last Mile Co.'] },
  { id: 'industrial', name: 'Industrial', min: 60, max: 140, customerArt: 'npc_customer_01_factory_owner', customers: ['Kettle Steelworks', 'Brightline Plastics', 'Oakridge Mills', 'Delta Components'] },
  { id: 'emergency', name: 'Emergency Services', min: 60, max: 140, customerArt: 'npc_customer_03_rescue_service', customers: ['County Fire Service', 'Coastal Lifeguards', 'Mountain Rescue Team', 'City Ambulance Trust'] },
  { id: 'construction', name: 'Construction', min: 60, max: 140, customerArt: 'npc_customer_01_factory_owner', customers: ['Stack & Sons Builders', 'Cornerstone Homes', 'Gridline Contractors', 'Arch Bridgeworks'] },
  { id: 'sport', name: 'Sport & Entertainment', min: 60, max: 140, customerArt: 'npc_customer_02_logistics_buyer', customers: ['Arena Nine', 'Thunder Park Karting', 'Bot Brawl Live', 'Starlight Theme Park'] },
  { id: 'research', name: 'Research & Exploration', min: 60, max: 140, customerArt: 'npc_customer_03_rescue_service', customers: ['Polar Survey Lab', 'Cavern Mapping Institute', 'Deepwater Institute', 'University Robotics Dept.'] },
];

// §14.1 purpose → primary segment(s). A product sells to the one with more demand on launch day.
export const PURPOSE_SEGMENTS = {
  helper: ['homeHobby', 'smallBusiness'],
  delivery: ['logistics'],
  warehouse: ['industrial', 'logistics'],
  scout: ['research'],
  racing: ['sport'],
  rescue: ['emergency'],
  builder: ['construction'],
  service: ['homeHobby', 'smallBusiness'],
  sport: ['sport'],
  experimental: ['research'],
};

// How demand moves (§14.1). drift: most a base can move in a month (Milestone 7 choice).
export const MARKET_RULES = {
  drift: 25,
  trendChance: 0.3, // chance a new trend starts at a month start (M7 choice)
  trendSegments: [1, 2],
  trendShift: 20,
  trendMonths: [1, 3],
  floor: 40,
  ceiling: 160,
};

// Trend news lines. {segment} = segment name.
export const TREND_NEWS = {
  up: ['{segment} buyers are hungry for robots', 'Boom time in {segment}', '{segment} demand is surging'],
  down: ['{segment} buyers are holding back', 'A slow patch for {segment}', '{segment} demand has cooled'],
};
