// Nutrition and dining (Milestone 15, bible §19, §9 NU01–NU08, §25 F03 Dining Room / F04 Kitchen / F16 Commercial
// Kitchen / F17 Nutrition Office, §12 Hospitality & Nutrition). Plain data only; the rules are in src/systems/dining.js
// and the home world (src/systems/homeWorld.js) walks people to the work. Placeholder numbers, logged in
// docs/DECISIONS.md — tune here.
//
// The rule for this milestone (bible §19): menus are fictional and simple. No clinical diets, no calories, no
// nutrients, no dose-like numbers: the player never prescribes a diet — they choose plan options and run the kitchen.

// The three meal services. step = the routine step (data/routine.js) each resident eats it at; at = when the service
// starts (a late riser's breakfast is later: their own step time); prepAt = when the kitchen starts getting it ready.
export const MEALS = [
  { id: 'breakfast', name: 'Breakfast', step: 'breakfast', at: 8.5, prepAt: 7.25, rota: null },
  { id: 'lunch', name: 'Lunch', step: 'lunch', at: 12.25, prepAt: 10.75, rota: 'main' }, // (prep done before the noon shift change)
  { id: 'dinner', name: 'Evening meal', step: 'dinner', at: 17.5, prepAt: 16.5, rota: 'pudding' },
];
export const mealById = (id) => MEALS.find((m) => m.id === id) ?? null;
export const mealOfStep = (stepId) => MEALS.find((m) => m.step === stepId) ?? null;
// Milestone 16 (fix first): which shift serves which meal (the roster sheet warns when a shift has nobody to serve it).
export const MEAL_SHIFTS = { morning: ['breakfast'], afternoon: ['lunch', 'dinner'] };

// The kitchens (the best one placed counts). quality: meal-quality points (§25 "Meal quality +8%", "Meal production
// +15%"); prepRate: × how fast prep goes there. Without either, meals come late from the Dining Room hatch.
export const KITCHENS = {
  F16: { name: 'Commercial Kitchen', quality: 15, prepRate: 1.15 },
  F04: { name: 'Kitchen', quality: 8, prepRate: 1 },
};
export const KITCHEN_IDS = ['F16', 'F04']; // best first
// Kitchen prep: one task a meal at the kitchen (its cook spots), from prepAt; minutes of work for a Hospitality worker.
// A Care Worker may prep when no Hospitality worker takes it (the task AI's penalty, worth that many tiles of walking),
// and more slowly (rate). Prep still running when the service starts makes the meals served meanwhile late; prep not
// done dueAfter hours after the service starts is given up (the kitchen sends what it can: lower quality).
export const PREP = { minutes: 40, roles: ['HN', 'CW'], careWorkerPenalty: 30, careWorkerRate: 0.6, dueAfter: 0.75, spots: ['cook', 'cook2'] };

// Meal quality 0–100, worked out when each resident is served.
//   base · kitchen (above; none: noKitchen) · prep (done on time / late / not done) · the cook's NUT stat (+1 for each
//   nutPer points over nutFrom, up to nutMax) · the cook's meal traits (their 'task' bonus on meals, in points:
//   Warm Welcome 5, Comfort Food 8, Kitchen Mentor 10) · careStaffServe (no Hospitality worker on shift: care staff
//   serve — a small penalty)
export const QUALITY = { base: 50, noKitchen: -15, prep: { onTime: 10, late: 3, none: 0 }, nutFrom: 50, nutPer: 10, nutMax: 15, careStaffServe: -5, historyKept: 12, shown: 5 };

// Dining satisfaction 0–100 for one resident at one meal: the meal's quality, then
//   mismatch   their plan asks for a menu nobody on shift could make (they get the standard one)
//   favourite  their favourite dish is on today's menu (NU07 Favourite-Food Boost: × favouriteBoost)
//   late       served more than onTimeHours after they were ready (or before the kitchen had it ready)
//   friends    per friend (60+, Milestone 13) eating at the same Dining Room, up to friendsMax
//   atmosphere the Dining Room's own effect (§25 F03 "Dining satisfaction +6"); crowded: more diners in a room than its
//              seats; tray: eating in their room (no atmosphere, no company)
//   host       a server with Dining Host adds a little
//   baking     they baked at today's Cooking club (Milestone 14) and it's on the evening menu
// It feeds Mood (+ (sat − moodFrom) / moodPer after each meal) and the Nutrition outcome: the meal's Nutrition drop ×
// (1 + nutritionPer × (sat − nutritionFrom)) above nutritionFrom — a happy diner eats well; a plain meal is eaten as
// before (the drop never shrinks, so a home without a Kitchen still feeds everyone).
// avgPull: each resident's running average moves this share of the way to each new meal's score.
export const SATISFACTION = {
  officePct: 10, // (Milestone 25c: the Nutrition Office's +10% on a meal's Nutrition, was a literal 1.1 in src/systems/dining.js; × its level)
  mismatch: -25, favourite: 10, favouriteBoost: 2, late: -15, onTimeHours: 0.75, friend: 5, friendsMax: 10, atmosphere: 6, crowded: -10, tray: -5, host: 4, baking: 5,
  moodFrom: 50, moodPer: 25, nutritionFrom: 50, nutritionPer: 0.006, avgPull: 0.25, lowestShown: 3,
};
// The words for the lowest residents on the Dining Room card (their biggest minus at their last meal).
export const SAT_REASONS = { mismatch: 'Not their menu', late: 'Late meal', lateTray: 'Late tray', crowded: 'Crowded dining room', tray: 'Eating in their room', quality: 'Plain cooking', none: 'Happy with their meals' };

// Trays: a resident who can't come to the Dining Room has the meal brought to their room (a room task): bed-bound today
// (Mobility need bedMobility+), unwell (Clinical need unwellClinical+), or still waiting to be got up afterWaking hours
// after their breakfast time (or their wake-up was missed).
export const TRAY = { minutes: 10, bedMobility: 95, unwellClinical: 90, afterWaking: 0.25 }; // (both above the call-bell line, 85)

// Hydration (§19): a drinks round for everyone, Morning and Afternoon, from the drinks trolley — plus drinks at every
// meal. NU03 Hydration Plan adds an extra round for that resident (its own task, data/carePlans.js). A missed round
// just lets the Nutrition need rise. hydrationGap: the resident card flags "Due a drink" this many hours after the last.
export const HYDRATION = {
  rounds: [
    { id: 'amDrinks', name: 'Morning drinks round', at: 10.5, band: 'morning' },
    { id: 'pmDrinks', name: 'Afternoon drinks round', at: 15, band: 'afternoon' },
  ],
  roles: ['HN', 'CW'], minutes: 5, drops: { nutrition: 8 }, dueAfter: 1.5, gapHours: 6,
  stopShare: 0.25, // one resident's stop on the round: a quarter of a whole task's Energy / Morale and Familiar Care
  serveShare: 0.5, // (Milestone 16) serving a meal at the table or a tray: half a task's Familiar Care (a short contact)
};

// The trolleys: staff push the dining trolley to a tray and the Hydration Cart on a drinks round (drawn beside them while
// they walk); during a meal service the dining trolley stands beside the Dining Room (serviceHours: from the service's
// start − before, for that many hours — breakfast runs longest, with the late risers).
export const TROLLEYS = { meal: 'care_prop_early_04', round: 'care_equipment_06', before: 0.25, serviceHours: { breakfast: 2.25, lunch: 1.4, dinner: 1.75 } };

// Diets (§9 NU options → a simple menu tag; nothing clinical). Each resident's diet comes from their Nutrition plan
// option. needs: 'skill' — a Hospitality worker on shift with a matching skill (the Nutrition specialty, or a trait
// below) or a Nutrition Office (F17); 'hospitality' — any Hospitality worker on shift (or the Nutrition Office).
export const DIETS = {
  standard: { name: 'Standard', menu: 'the standard menu', needs: null },
  lowSugar: { name: 'Low-Sugar', menu: 'the balanced menu', needs: 'skill', option: 'NU04' },
  texture: { name: 'Texture-Modified', menu: 'the soft menu', needs: 'skill', option: 'NU05' },
  smallFrequent: { name: 'Small Frequent', menu: 'small plates', needs: 'hospitality', option: 'NU06' },
  highProtein: { name: 'High-Protein', menu: 'the hearty menu', needs: 'hospitality', option: 'NU02' },
};
export const DIET_IDS = Object.keys(DIETS);
export const dietOfOption = (optionId) => DIET_IDS.find((d) => DIETS[d].option === optionId) ?? 'standard';
export const DIET_OFFICE = 'F17'; // the Nutrition Office plans every special menu
export const DIET_SPECIALTY = 'nutrition'; // data/training.js SPECIALTIES

// The dish list (fictional, simple). The weekly menu (a rota the player can change on the Kitchen card) has one main
// (served at lunch) and one pudding (at the evening meal) a day.
export const DISHES = [
  { id: 'roast', name: 'Sunday roast', kind: 'main' },
  { id: 'fishChips', name: 'Fish and chips', kind: 'main' },
  { id: 'cottagePie', name: 'Cottage pie', kind: 'main' },
  { id: 'stew', name: 'Beef stew and dumplings', kind: 'main' },
  { id: 'soup', name: 'Vegetable soup and fresh bread', kind: 'main' },
  { id: 'sausageMash', name: 'Sausage and mash', kind: 'main' },
  { id: 'chickenPie', name: 'Chicken and leek pie', kind: 'main' },
  { id: 'macCheese', name: 'Macaroni cheese', kind: 'main' },
  { id: 'curry', name: 'Mild chicken curry', kind: 'main' },
  { id: 'fishPie', name: 'Fish pie', kind: 'main' },
  { id: 'lemonSlice', name: 'Lemon slice', kind: 'pudding' },
  { id: 'appleCrumble', name: 'Apple crumble and custard', kind: 'pudding' },
  { id: 'ricePudding', name: 'Rice pudding', kind: 'pudding' },
  { id: 'jamSponge', name: 'Jam sponge', kind: 'pudding' },
  { id: 'trifle', name: 'Trifle', kind: 'pudding' },
  { id: 'scones', name: 'Scones and jam', kind: 'pudding' },
  { id: 'breadButter', name: 'Bread and butter pudding', kind: 'pudding' },
];
export const dishById = (id) => DISHES.find((d) => d.id === id) ?? null;
export const dishesOf = (kind) => DISHES.filter((d) => d.kind === kind);
// Mon … Sun (data/activities.js TIMETABLE.days). A new home, and an M14 save, starts with this.
export const DEFAULT_ROTA = [
  { main: 'cottagePie', pudding: 'ricePudding' },
  { main: 'chickenPie', pudding: 'jamSponge' },
  { main: 'sausageMash', pudding: 'appleCrumble' },
  { main: 'stew', pudding: 'lemonSlice' },
  { main: 'fishChips', pudding: 'trifle' },
  { main: 'macCheese', pudding: 'scones' },
  { main: 'roast', pudding: 'breadButter' },
];

// Favourite dishes come from life-story tags (data/lifeStories.js): each tag suggests two dishes, and each resident
// has favourites.min–max of their tags' dishes (picked from their id: the same in every run).
export const TAG_DISHES = {
  Gardening: ['soup', 'appleCrumble'],
  Music: ['trifle', 'macCheese'],
  Dancing: ['trifle', 'curry'],
  Reading: ['ricePudding', 'cottagePie'],
  History: ['stew', 'breadButter'],
  Community: ['roast', 'scones'],
  Cards: ['sausageMash', 'jamSponge'],
  Football: ['fishChips', 'chickenPie'],
  Fishing: ['fishChips', 'fishPie'],
  Faith: ['roast', 'scones'],
  Crafts: ['lemonSlice', 'ricePudding'],
  Pets: ['stew', 'jamSponge'],
  Travel: ['curry', 'macCheese'],
  Cooking: ['roast', 'lemonSlice'],
};
// On a day their favourite is on the menu, eating that meal lifts Mood by mood (NU07 Favourite-Food Boost: × boost).
export const FAVOURITES = { min: 1, max: 2, mood: 2, boost: 2 };

// A simple food cost: Credits for each meal served (in the Dining Room or on a tray), posted once a day. The full
// economy is Milestone 22.
export const FOOD_COST = { perMeal: 2 };

// Check the lists (the Node tests). tags = data/lifeStories.js LIFE_TAGS.
export function validateDining(v, tags) {
  v.check(MEALS.length === 3, 'three meal services');
  for (const d of DEFAULT_ROTA) v.check(dishById(d.main)?.kind === 'main' && dishById(d.pudding)?.kind === 'pudding', `rota ${d.main} / ${d.pudding}`);
  v.check(DEFAULT_ROTA.length === 7, 'a 7-day rota');
  for (const t of tags) v.check((TAG_DISHES[t] ?? []).length > 0 && TAG_DISHES[t].every((id) => !!dishById(id)), `tag ${t}: dishes`);
  for (const d of DISHES) v.check(!/\d/.test(d.name), `${d.id}: no numbers on the menu`);
  return v;
}
