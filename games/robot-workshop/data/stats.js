// Robot Workshop work stats (bible §9.2). Keys match the staff data shape (§42.1).
export const WORK_STATS = [
  { key: 'eng', short: 'ENG', name: 'Engineering' },
  { key: 'des', short: 'DES', name: 'Design' },
  { key: 'prg', short: 'PRG', name: 'Programming' },
  { key: 'fab', short: 'FAB', name: 'Fabrication' },
  { key: 'tst', short: 'TST', name: 'Testing/Piloting' },
];

export const STAT_KEYS = WORK_STATS.map((s) => s.key);

// Robot performance stats (bible §10.4), shown on a 0–999 scale.
export const ROBOT_STATS = [
  { key: 'SPD', name: 'Speed' },
  { key: 'PWR', name: 'Power' },
  { key: 'CTL', name: 'Control' },
  { key: 'INT', name: 'Intelligence' },
  { key: 'END', name: 'Endurance' },
  { key: 'REL', name: 'Reliability' },
  { key: 'APL', name: 'Appeal' },
];

export const ROBOT_STAT_KEYS = ROBOT_STATS.map((s) => s.key);
