// Care made visible (Milestone 5, bible §41): small art pops in the home. Plain data only; src/ui/carePops.js shows them.
//   connection  a task done together (a helper and Arthur)       → at the pair
//   activity    he joined an activity (Cards, a group activity)  → at the Activity Lounge
//   meal        a meal finished                                  → at the Dining Room table
// size = drawn width in world px at zoom 1; life = seconds; gap = real seconds before the same kind shows again.
// The call bell keeps its Milestone 4 code-drawn marker.
export const CARE_POPS = {
  connection: { art: 'care_vfx_01', size: 150, life: 1.6, gap: 1.2 },
  activity: { art: 'care_vfx_02', size: 190, life: 1.9, gap: 2 },
  meal: { art: 'care_vfx_04', size: 170, life: 1.8, gap: 2 },
};
// At most this many pops at once, and one per spot (never stacked).
export const POPS_MAX_LIVE = 3;

// The end-of-day beat (a medium feedback card): seconds it stays up.
export const DAY_BEAT = { life: 4.5 };
