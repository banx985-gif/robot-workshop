// Account records (bible §27.2, §21.7) — plain data for core/AccountRecords.js (Milestone 18).
// They live in the account save, so they survive every new campaign. src/systems/gameRecords.js fills them in.
//   better: 'max' | 'min'     keyed: one record per purpose / robot stat / event
//   format: how the value reads ('int', 'score1' one decimal, 'credits', 'days', 'years')
//   group:  the section on the Records screen
// "Best ending grade" arrives with the Year 16 ending (Milestone 19); until then it shows "—".
export const RECORD_GROUPS = [
  { id: 'company', name: 'Company' },
  { id: 'robots', name: 'Robots' },
  { id: 'sales', name: 'Sales' },
  { id: 'people', name: 'People' },
  { id: 'competitions', name: 'Competitions' },
  { id: 'discovery', name: 'Discoveries' },
];

export const RECORDS = [
  { id: 'bestEnding', group: 'company', label: 'Best ending grade', better: 'max', format: 'grade', icon: 'ui_icon_09_records', later: 'Arrives with the Year 16 ending' },
  { id: 'highestCash', group: 'company', label: 'Highest cash', better: 'max', format: 'credits', icon: 'ui_icon_01_money' },
  { id: 'highestReputation', group: 'company', label: 'Highest reputation', better: 'max', format: 'int', icon: 'ui_icon_03_reputation' },
  { id: 'ngPlusCompleted', group: 'company', label: 'New Game+ level completed', better: 'max', format: 'ngPlus', icon: 'ui_icon_09_records' },
  { id: 'bestQuality', group: 'robots', label: 'Highest robot Quality', better: 'max', format: 'score1', icon: 'ui_icon_06_robot' },
  { id: 'bestInnovation', group: 'robots', label: 'Highest Innovation', better: 'max', format: 'int', icon: 'ui_icon_06_robot' },
  { id: 'fastestProject', group: 'robots', label: 'Fastest project', better: 'min', format: 'days', icon: 'ui_icon_11' },
  { id: 'mostFaultsReleased', group: 'robots', label: 'Most faults on a launched robot', better: 'max', format: 'int', icon: 'ui_icon_29' },
  { id: 'bestPerPurpose', group: 'robots', label: 'Best robot per purpose', better: 'max', format: 'score1', keyed: 'purpose', icon: 'ui_icon_06_robot' },
  { id: 'bestStat', group: 'robots', label: 'Highest robot stat', better: 'max', format: 'int', keyed: 'robotStat', icon: 'ui_icon_06_robot' },
  { id: 'bestReview', group: 'sales', label: 'Best review', better: 'max', format: 'review', icon: 'ui_icon_13' },
  { id: 'mostMonthlyUnits', group: 'sales', label: 'Most units sold in one month', better: 'max', format: 'int', icon: 'ui_icon_13' },
  { id: 'mostUnitsOneModel', group: 'sales', label: 'Most units sold by one model', better: 'max', format: 'int', icon: 'ui_icon_13' },
  { id: 'staffHighestLevel', group: 'people', label: 'Highest staff level', better: 'max', format: 'int', icon: 'ui_icon_05_staff' },
  { id: 'staffHighestStat', group: 'people', label: 'Highest staff stat', better: 'max', format: 'int', icon: 'ui_icon_05_staff' },
  { id: 'longestServing', group: 'people', label: 'Longest-serving worker', better: 'max', format: 'service', icon: 'ui_icon_05_staff' },
  { id: 'specialStaff', group: 'people', label: 'Legendary and secret staff found', better: 'max', format: 'int', icon: 'ui_icon_05_staff' },
  { id: 'totalTrophies', group: 'competitions', label: 'Trophies on the shelf (best run)', better: 'max', format: 'int', icon: 'ui_icon_19' },
  { id: 'competitionBest', group: 'competitions', label: 'Best score per event', better: 'max', format: 'score1', keyed: 'event', icon: 'ui_icon_08_competition' },
  { id: 'synergiesDiscovered', group: 'discovery', label: 'Combos discovered (all runs)', better: 'max', format: 'int', icon: 'ui_icon_12' },
  { id: 'secretsDiscovered', group: 'discovery', label: 'Secrets discovered (all runs)', better: 'max', format: 'int', icon: 'ui_icon_10_secret' },
];
