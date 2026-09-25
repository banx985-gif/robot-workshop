// The 20 finished-robot visual families (bible §13). Many builds share one family; the part icons and
// stat panels show the exact build.
//   base: the purpose this is the default look for (families 01–10)
//   synergy: the synergy that makes this family eligible (families 11–20; synergies arrive in Milestone 14)
//   priority: when several advanced families match, the highest wins (§13):
//     Unknown 5 > Lunar 4 > Neural 3 > Titanium 2 > purpose-specific advanced 1 > base purpose 0

export const VISUAL_FAMILIES = [
  { id: 'V01', name: 'Workshop Helper', art: 'robot_full_01_workshop_helper', base: 'helper', priority: 0 },
  { id: 'V02', name: 'Delivery Runner', art: 'robot_full_02_delivery_runner', base: 'delivery', priority: 0 },
  { id: 'V03', name: 'Warehouse Lifter', art: 'robot_full_03_warehouse_lifter', base: 'warehouse', priority: 0 },
  { id: 'V04', name: 'Scout', art: 'robot_full_04_scout', base: 'scout', priority: 0 },
  { id: 'V05', name: 'Racer', art: 'robot_full_05_racer', base: 'racing', priority: 0 },
  { id: 'V06', name: 'Rescue Bot', art: 'robot_full_06_rescue', base: 'rescue', priority: 0 },
  { id: 'V07', name: 'Builder', art: 'robot_full_07_builder', base: 'builder', priority: 0 },
  { id: 'V08', name: 'Service Bot', art: 'robot_full_08_service', base: 'service', priority: 0 },
  { id: 'V09', name: 'Sport Bot', art: 'robot_full_09_sport', base: 'sport', priority: 0 },
  { id: 'V10', name: 'Experimental Mk I', art: 'robot_full_10_experimental', base: 'experimental', priority: 0 },
  { id: 'V11', name: 'Precision', art: 'robot_full_11_precision', synergy: 'SYN11', priority: 1 },
  { id: 'V12', name: 'Heavy Industrial', art: 'robot_full_12_heavy_industrial', synergy: 'SYN12', priority: 1 },
  { id: 'V13', name: 'All-Terrain', art: 'robot_full_13_all_terrain', synergy: 'SYN13', priority: 1 },
  { id: 'V14', name: 'Pro Racer', art: 'robot_full_14_pro_racer', synergy: 'SYN14', priority: 1 },
  { id: 'V15', name: 'Elite Rescue', art: 'robot_full_15_elite_rescue', synergy: 'SYN15', priority: 1 },
  { id: 'V16', name: 'Champion Sport', art: 'robot_full_16_champion_sport', synergy: 'SYN16', priority: 1 },
  { id: 'V17', name: 'Titanium Flagship', art: 'robot_full_17_titanium', synergy: 'SYN17', priority: 2 },
  { id: 'V18', name: 'Neural', art: 'robot_full_18_neural', synergy: 'SYN18', priority: 3 },
  { id: 'V19', name: 'Lunar', art: 'robot_full_19_lunar', synergy: 'SYN19', priority: 4 },
  { id: 'V20', name: 'Unknown', art: 'robot_full_20_unknown', synergy: 'SYN20', priority: 5 },
];

export const VISUALS = Object.fromEntries(VISUAL_FAMILIES.map((v) => [v.id, v]));
export const FALLBACK_VISUAL = 'V01';
