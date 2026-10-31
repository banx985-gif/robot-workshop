// Set dressing (Milestone 28b): Aaron's care equipment and community / activity props standing beside the rooms and
// facilities they belong to. Plain data only; src/systems/homeWorld.js (decorNow) places them, the home draws them like
// the other decor (never tapped, never blocking: nobody's path or the simulation changes — they are pictures only).
//
//   art      the picture (assets/images/equipment or props)
//   beside   piece ids (a facility F.. or a room template RM..): one stands beside the FIRST placed piece of each
//   when     optional: 'incident' (only while an emergency event is under way), 'textureMeal' (only through a meal service
//            while someone here eats the texture-modified menu)
//   scale    optional: drawn this much bigger than a one-tile prop (the bus, the fountain, the pergola, the arch)
export const SET_DRESSING = [
  // care equipment (care_equipment_01 Medication Cart and 06 Hydration Cart already move with the rounds)
  { art: 'care_equipment_02', name: 'Clinical Observation Trolley', beside: ['F01', 'F23'] },
  { art: 'care_equipment_03', name: 'Transfer Hoist', beside: ['F18', 'F30', 'RM04'] },
  { art: 'care_equipment_04', name: 'Standing Aid', beside: ['F07', 'RM06'] },
  { art: 'care_equipment_05', name: 'Pressure Care Chair', beside: ['RM04', 'F30'] },
  { art: 'care_equipment_07', name: 'Portable Therapy Steps', beside: ['F07', 'F19', 'F31'] },
  { art: 'care_equipment_08', name: 'Emergency Supply Cart', beside: ['F33'] },
  { art: 'care_equipment_08', name: 'Emergency Supply Cart (an emergency under way)', beside: ['F01'], when: 'incident' },
  { art: 'care_equipment_09', name: 'Texture Meal Station', beside: ['F17'] },
  { art: 'care_equipment_09', name: 'Texture Meal Station (a meal service with texture-modified meals)', beside: ['F03'], when: 'textureMeal' },
  { art: 'care_equipment_10', name: 'Family Comfort Recliner', beside: ['RM07', 'F24', 'F15', 'F32'] },
  // activity prop not used by an activity
  { art: 'activity_prop_07', name: 'Knitting Basket', beside: ['F06', 'F13'] },
  // community props
  { art: 'community_prop_01', name: 'Facility Bus', beside: ['F26'], scale: 1.7 },
  { art: 'activity_prop_10', name: 'Outing Picnic Set (ready for the outings the Transport Bay opens)', beside: ['F26'] },
  { art: 'community_prop_02', name: 'Garden Bench', beside: ['F14', 'RM02'] },
  { art: 'community_prop_03', name: 'Raised Garden Bed', beside: ['F14'] },
  { art: 'community_prop_04', name: 'Bird Feeder', beside: ['F22', 'RM02'] },
  { art: 'community_prop_05', name: 'Courtyard Fountain', beside: ['F14'], scale: 1.3 },
  { art: 'community_prop_06', name: 'Shade Pergola', beside: ['F22', 'F25'], scale: 1.4 },
  { art: 'community_prop_07', name: 'Walking Path Sign', beside: ['F18', 'F19'] },
  { art: 'community_prop_09', name: 'Outdoor Exercise Rail', beside: ['F07', 'F18'] },
  { art: 'community_prop_10', name: 'Memory Garden Arch', beside: ['F22'], scale: 1.4 },
];
export const DRESSING_ART = [...new Set(SET_DRESSING.map((d) => d.art))];
