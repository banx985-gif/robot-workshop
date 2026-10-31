// Settings (Milestone 25c, series common feature §2): the player's settings on core/Settings — kept on this device under
// SETTINGS_KEY (and in the account store), never in a campaign slot, so every home on this device shares them. The
// series list in its order and names (Robot Workshop's Settings screen; RACEWORKS and DEVWORKS follow it), then Help /
// tutorial replay, Privacy & legal and Credits (main.js), then CAREWORKS's own extras at the bottom.
// CAREWORKS has no sound yet (Milestone 38): the sound switches are kept and read through core/Settings all the same.
//   Each entry: { id, label, group, options: [{ id, label }], line? } · extra: true = a CAREWORKS extra
const onOff = [{ id: false, label: 'Off' }, { id: true, label: 'On' }];
const lvl = (ids) => ids.map((id) => ({ id, label: id === 0 ? 'Off' : `${id}%` }));
const muteOpts = [{ id: false, label: 'Playing' }, { id: true, label: 'Muted' }];

export const SETTINGS = [
  { id: 'muted', label: 'Sound', group: 'Sound and music', options: [{ id: true, label: 'Off' }, { id: false, label: 'On' }], line: 'All music and sound effects on or off (the home’s sounds arrive in a later update).' },
  { id: 'music', label: 'Music volume', group: 'Sound and music', options: lvl([0, 25, 50, 75, 100]) },
  { id: 'musicMuted', label: 'Music mute', group: 'Sound and music', options: muteOpts },
  { id: 'sfx', label: 'Sound effects volume', group: 'Sound and music', options: lvl([0, 25, 50, 75, 100]) },
  { id: 'sfxMuted', label: 'Sound effects mute', group: 'Sound and music', options: muteOpts },
  { id: 'haptics', label: 'Vibration', group: 'Feel and look', options: onOff, line: 'A small buzz on the big moments. Phones only.' },
  { id: 'fpsMode', label: 'Graphics', group: 'Feel and look', options: [{ id: 'auto', label: 'Auto' }, { id: 'high', label: 'High' }, { id: 'low', label: 'Low' }], line: 'Auto: 60 FPS, a steady 30 if the phone struggles. High: always 60 with every effect. Low: 30 FPS, fewer effects, simpler figures.' },
  { id: 'textSize', label: 'Text size', group: 'Feel and look', options: [{ id: 'normal', label: 'Normal' }, { id: 'large', label: 'Large' }, { id: 'larger', label: 'Larger' }], line: 'Large: every text 15% bigger; Larger: 30%.' },
  { id: 'reducedFlashes', label: 'Reduced flashes', group: 'Feel and look', options: onOff, line: 'No bright flashes: the big moments fade in gently.' },
  { id: 'screenShake', label: 'Screen shake', group: 'Feel and look', options: [{ id: 'off', label: 'Off' }, { id: 'low', label: 'Low' }, { id: 'normal', label: 'Normal' }], line: 'The little shakes on big moments — never needed to follow the game.' },
  { id: 'showMenu', label: 'Show Menu button', group: 'Menu and hints', options: onOff, line: 'Off: tap the art to get around (Settings stays on the main menu and in Help).' },
  { id: 'showHints', label: 'Show next-step hints', group: 'Menu and hints', options: onOff, line: 'A line under the time saying what to do next; tap it to go there.' },
  // CAREWORKS extras (after the series list).
  { id: 'nameTags', label: 'Show name tags', group: 'In the home', extra: true, options: onOff, line: 'Everyone’s first name over their head.' },
  { id: 'taskMarkers', label: 'Show task markers', group: 'In the home', extra: true, options: onOff, line: 'The small icon over each staff member (their task, resting, tired) and the call bell.' },
  { id: 'bellSound', label: 'Call-bell alert sound', group: 'In the home', extra: true, options: onOff, line: 'A soft chime when a call bell rings (with the home’s sounds, in a later update).' },
];
export const SETTINGS_DEFAULTS = {
  muted: false, music: 75, musicMuted: false, sfx: 100, sfxMuted: false, haptics: true, fpsMode: 'auto', textSize: 'normal', reducedFlashes: false, screenShake: 'normal',
  showMenu: true, showHints: true, nameTags: true, taskMarkers: true, bellSound: true,
};
export const SETTINGS_KEY = 'careworks:settings';
export const TEXT_SCALE = { normal: 1, large: 1.15, larger: 1.3 };
export const SETTINGS_TEXT = {
  title: 'Settings',
  subtitle: 'This device · every home',
  helpGroup: 'Help and about',
  help: 'Help / tutorial replay',
  helpLine: 'How to run the home. The first-time guide comes in a later update.',
  legal: 'Privacy & legal',
  legalLine: 'How your homes are kept',
  legalBody: 'CAREWORKS keeps your homes on this device. It has no account and collects no personal data of its own. Everyone in the home is fictional.',
  credits: 'Credits',
  creditsLine: 'The people behind CAREWORKS',
  creditsBody: 'CAREWORKS — a Canvas Management Series game by Aaron (Banx Games). Art by Aaron; code by Claude Code. Thanks for playing!',
  display: 'Display test',
  displayLine: 'The screen-shape and tap test (for checking a new phone)',
};
