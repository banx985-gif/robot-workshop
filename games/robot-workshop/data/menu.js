// BOTWORKS front end (Milestone 21, bible §5 app flow, §6.3): the splash, main menu, company setup, settings, the
// pause menu and the "Coming soon" store entries — plain data for the screens in src/screens/.
// The game is called BOTWORKS (locked 26 Sept); folders, code ids, the web address and the save key stay robot-workshop.

export const GAME_TITLE = 'BOTWORKS';

// Art (already in the folder — never moved or edited).
export const MENU_ART = {
  keyArt: 'brand_02_splash_key_art',
  logo: 'brand_03_title_logo',
  seriesMark: 'brand_07_credits_series_mark',
  ngPlus: 'brand_06_ngplus_key_art',
  continue: 'ui_icon_28',
  newGame: 'ui_icon_07_workshop',
  ngPlusIcon: 'ui_icon_20',
  records: 'ui_icon_09_records',
  settings: 'ui_icon_25',
  credits: 'ui_icon_19',
  audio: 'ui_icon_26',
  help: 'ui_icon_27',
  save: 'ui_icon_28',
  store: 'ui_icon_21',
  vip: 'ui_icon_22',
  warning: 'ui_icon_29',
  lock: 'ui_icon_30',
};

export const SPLASH_TEXT = {
  loading: 'Loading the workshop…',
  checking: 'Checking your save…',
  found: 'Save found',
  none: 'No save yet — a fresh workshop awaits',
  failed: 'Could not read the save',
  artFailed: 'Some pictures could not load — the game will use stand-ins.',
  tap: 'Tap to start',
};

// §6.3 Main Menu. New Game+ stays greyed with its rule until the Year 16 ending has been reached (M20 rules).
export const MAIN_MENU = {
  continue: { label: 'Continue', none: 'No save yet' },
  newGame: { label: 'New Game', sub: 'A new company, Year 1' },
  ngPlus: { label: 'New Game+', lockedSub: 'Reach the Year 16 ending first' },
  records: { label: 'Records', sub: 'Achievements, records, completion' },
  settings: { label: 'Settings', sub: 'Sound, text size, save' },
  credits: { label: 'Credits', sub: 'The people behind BOTWORKS' },
  replaceTitle: 'Start a new game?',
  replaceBody: 'Your current run will be replaced. Finished campaigns, achievements and records stay.',
  loadErrorTitle: 'Your save could not be read',
  loadErrorBody: 'It may be from a newer version or damaged. You can try again, or start a new game.',
};

// §6.2 the small menu the back button opens on the workshop.
export const PAUSE_MENU = {
  title: 'Paused',
  resume: 'Resume',
  settings: 'Settings',
  save: 'Save now',
  saved: 'Saved ✓',
  mainMenu: 'Main Menu',
};

// §6.3 Company Setup: names and one of six accent colours (small UI touches only — no stat effect).
export const COMPANY = {
  title: 'Your company',
  intro: 'Name your robot company and its manager. You can pick a colour for the little touches.',
  nameLabel: 'Company name',
  managerLabel: 'Manager name',
  accentLabel: 'Accent colour',
  accentNote: 'Just for looks — it never changes the game.',
  start: 'Open the workshop',
  random: 'Random',
  maxLength: 20,
  defaults: { name: 'Sparkplug Robotics', manager: 'Alex', accent: 'orange' },
  accents: [
    { id: 'orange', name: 'Workshop Orange', color: '#F2862B' },
    { id: 'cyan', name: 'Circuit Cyan', color: '#1597BF' },
    { id: 'green', name: 'Bolt Green', color: '#2E8B57' },
    { id: 'gold', name: 'Trophy Gold', color: '#B87A00' },
    { id: 'purple', name: 'Prototype Purple', color: '#7650C4' },
    { id: 'red', name: 'Rocket Red', color: '#C8402F' },
  ],
  names: ['Sparkplug Robotics', 'Cog & Co.', 'Bright Bolt Works', 'Tin Star Labs', 'Gearbox Garage', 'Rivet Rocket', 'Circuit Cat Robotics', 'Nuts & Volts', 'Brass Beacon', 'Tiny Titan Works'],
  managers: ['Alex', 'Sam', 'Robin', 'Jules', 'Casey', 'Morgan', 'Riley', 'Quinn', 'Avery', 'Kit'],
  discardTitle: 'Discard your company?',
  discardBody: 'Your names and colour will not be kept.',
};

// §6.3 Settings (device settings, not the run's). performance is a placeholder until Milestone 27; sound is silent
// placeholders for now, so the volumes are stored and passed to the audio engine ready for real sounds.
export const SETTINGS = [
  { id: 'soundVolume', label: 'Sound volume', kind: 'steps', steps: [0, 25, 50, 75, 100], unit: '%', icon: 'ui_icon_26', note: 'Sounds are placeholders for now' },
  { id: 'musicVolume', label: 'Music volume', kind: 'steps', steps: [0, 25, 50, 75, 100], unit: '%', icon: 'ui_icon_26', note: 'Music arrives in a later update' },
  { id: 'haptics', label: 'Haptics (vibration)', kind: 'toggle', icon: 'ui_icon_05_staff' },
  { id: 'textSize', label: 'Text size', kind: 'choice', options: [{ id: 'normal', label: 'Normal' }, { id: 'large', label: 'Large' }], icon: 'ui_icon_27' },
  { id: 'reducedFlashes', label: 'Reduced Flashes', kind: 'toggle', icon: 'ui_icon_29', note: 'Softer bursts and no flashing' },
  { id: 'screenShake', label: 'Screen shake', kind: 'toggle', icon: 'ui_icon_08_competition', note: 'For big moments' },
  { id: 'performance', label: 'Performance', kind: 'choice', options: [{ id: 'auto', label: 'Auto' }, { id: 'battery', label: 'Battery saver' }], icon: 'ui_icon_07_workshop', note: 'Placeholder — real modes come later' },
];
export const SETTINGS_DEFAULTS = { soundVolume: 100, musicVolume: 100, haptics: true, textSize: 'normal', reducedFlashes: false, screenShake: true, performance: 'auto' };
export const TEXT_SCALES = { normal: 1, large: 1.15 }; // Large = +15%

export const SETTINGS_TEXT = {
  title: 'Settings',
  legal: 'Privacy & legal',
  legalBody: 'BOTWORKS keeps your save on this device only. It collects no personal data. Full privacy and legal pages arrive with the store.',
  // §37.7 (Milestone 22): two resets.
  resetCampaign: 'Reset this campaign',
  resetCampaignSub: 'Deletes the current run only',
  resetCampaignTitle: 'Reset this campaign?',
  resetCampaignBody: 'Your current run is deleted. Tech Chips and Prestige Tokens earned in it go with it. Achievements, records, discoveries and finished campaigns stay.',
  resetCampaignYes: 'Delete this run',
  resetCampaignDone: 'The campaign was reset — your achievements and records are safe.',
  resetAll: 'Reset everything',
  resetAllSub: 'Deletes all progress on this device',
  resetAllTitle: 'Reset everything?',
  resetAllBody: 'This deletes your run, achievements, records, discoveries, Prestige Tokens and finished campaigns. They cannot come back. (Purchases can be restored from the store later.) Hold the button to confirm.',
  resetAllYes: 'Hold to delete everything',
  resetAllHold: 2,
  inspector: 'Save inspector (debug)',
  resetDone: 'Everything was reset — starting fresh.',
};

// Store and VIP: menu entries only until Milestone 23.
export const COMING_SOON = {
  store: { title: 'Store — coming soon', body: 'Remove Ads, Tech Chip packs and Restore Purchases arrive in a later update.', art: 'ui_icon_21' },
  vip: { title: 'VIP — coming soon', body: 'VIP benefits and how to manage them arrive in a later update.', art: 'ui_icon_22' },
};

// Leaving a screen with choices not kept yet (§6.2).
export const DISCARD = {
  title: 'Discard your choices?',
  body: 'You have picked things on this screen that will not be kept.',
  yes: 'Discard',
  no: 'Keep editing',
};
