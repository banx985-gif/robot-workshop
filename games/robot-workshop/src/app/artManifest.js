// BOTWORKS art manifest: every picture the game loads, key → file under assets/images/ (the originals; the game
// is served web-sized copies of them — see core/AssetPaths.js and tools/optimize-images.mjs). Moved out of main.js in
// Milestone 24 so the asset validator can read it in the tests as well as in ?debug=1.
import { HELP_ICON } from '../../data/guide.js';
import { PROPS, ROOM_ART } from '../../data/workshop.js';
import { SECRET_ART } from '../../data/secrets.js';
import { NG_PLUS_ART } from '../../data/ngplus.js';
import { MENU_ART } from '../../data/menu.js';
import { ENDING_ART } from '../../data/ending.js';
import { ACHIEVEMENT_ART } from '../../data/achievements.js';
import { EVENT_ICONS, MILESTONE_EVENTS } from '../../data/events.js';
import { SPONSORS } from '../../data/sponsors.js';
import { SYNERGY_ART } from '../../data/synergies.js';
import { COMPETITIONS, COMPETITION_ART, TROPHIES } from '../../data/competitions.js';
import { RIVALS } from '../../data/rivals.js';
import { RECRUIT_ART, PORTRAITS, PORTRAIT_FOLDER } from '../../data/recruitment.js';
import { TRAINING_ART } from '../../data/training.js';
import { RESEARCH_ART } from '../../data/research.js';
import { FACILITIES, BUILD_ART } from '../../data/facilities.js';
import { FIRST_CONTRACT_ART } from '../../data/contracts.js';
import { SEGMENTS } from '../../data/segments.js';
import { VISUAL_FAMILIES } from '../../data/visuals.js';
import { COMPONENTS, PART_GRADES } from '../../data/components.js';
import { CREDITS } from '../../data/credits.js';
import { STAFF, ROLES } from '../../data/staff.js';
import { VFX_ART, STATUS_ART } from '../../data/feedback.js';

const art = (folder, key) => [key, `assets/images/${folder}/${key}.png`];
export const ASSETS = {
  // Workshop room: floor, walls, the expansion boundary and the test-zone floor; facilities F01–F15; build icons.
  ...Object.fromEntries([ROOM_ART.floor.key, ROOM_ART.corner.key, ...Object.values(ROOM_ART.pieces).map((p) => p.key), ...Object.values(ROOM_ART.zoneFloors ?? {}).map((f) => f.key), BUILD_ART.boundary].map((k) => art('env', k))),
  ...Object.fromEntries(Object.values(FACILITIES).map((f) => art('facilities', f.art))),
  ...Object.fromEntries(Object.values(FACILITIES).filter((f) => f.floor).map((f) => art('env', f.floor))),
  ...Object.fromEntries([BUILD_ART.buildIcon, BUILD_ART.expansionIcon, BUILD_ART.lockIcon].map((k) => art('ui', k))),
  // Effects and status icons.
  ...Object.fromEntries(Object.values(VFX_ART).map((k) => art('vfx', k))),
  ...Object.fromEntries(Object.values(STATUS_ART).map((k) => art('status', k))),
  // Staff portraits: all 50 named staff (Milestone 11), plus every portrait candidates can use; role and tier badges.
  ...Object.fromEntries(STAFF.map((s) => [s.art, `assets/images/staff/${s.art}.png`])),
  ...Object.fromEntries(Object.values(PORTRAIT_FOLDER).flatMap((f) => Object.values(PORTRAITS).flat().map((n) => art('staff', `staff_${f}_${n}`)))),
  ...Object.fromEntries(Object.values(ROLES).map((r) => art('badges', r.badge))),
  ...Object.fromEntries(Object.values(RECRUIT_ART.tierBadges).map((k) => art('badges', k))),
  // Hiring and training icons.
  [RECRUIT_ART.icon]: `assets/images/ui/${RECRUIT_ART.icon}.png`,
  [TRAINING_ART.icon]: `assets/images/ui/${TRAINING_ART.icon}.png`,
  [TRAINING_ART.manual]: `assets/images/rewards/${TRAINING_ART.manual}.png`,
  // Robot project art: finished robots, part icons, menu icons.
  ...Object.fromEntries(VISUAL_FAMILIES.map((v) => art('robots', v.art))), // all 20 robot families
  ...Object.fromEntries(Object.values(COMPONENTS).map((c) => [c.art, `assets/images/components/${c.art}.png`])),
  ui_icon_11: 'assets/images/ui/ui_icon_11.png',
  ui_icon_06_robot: 'assets/images/ui/ui_icon_06_robot.png',
  // Money art.
  ui_icon_01_money: 'assets/images/ui/ui_icon_01_money.png',
  ui_icon_02_premium: 'assets/images/ui/ui_icon_02_premium.png',
  ui_icon_03_reputation: 'assets/images/ui/ui_icon_03_reputation.png',
  ui_icon_13: 'assets/images/ui/ui_icon_13.png',
  // Contracts: icon, customer portraits, the first-contract moment.
  ui_icon_14: 'assets/images/ui/ui_icon_14.png',
  // Milestone 17b: the workshop props, the save icon and the effects the build show uses.
  ...Object.fromEntries(PROPS.map((p) => art(p.folder ?? 'props', p.art))),
  ...Object.fromEntries(['ui_icon_28', 'ui_icon_05_staff', 'ui_icon_13', 'ui_icon_12'].map((k) => art('ui', k))),
  ...Object.fromEntries(['vfx_01', 'vfx_02', 'vfx_03', 'vfx_04', 'vfx_09', 'vfx_11', 'vfx_12'].map((k) => art('vfx', k))),
  // First-time guide: help icon and the two event pictures.
  [HELP_ICON]: `assets/images/ui/${HELP_ICON}.png`,
  event_art_01: 'assets/images/events/event_art_01.png',
  event_art_02: 'assets/images/events/event_art_02.png',
  ...Object.fromEntries([...new Set(SEGMENTS.map((s) => s.customerArt))].map((k) => art('npc', k))),
  [FIRST_CONTRACT_ART]: `assets/images/events/${FIRST_CONTRACT_ART}.png`,
  ui_icon_29: 'assets/images/ui/ui_icon_29.png',
  reward_01: 'assets/images/rewards/reward_01.png',
  // Research (Milestone 9): icon and RP token (the glow and blueprint effects are in VFX art).
  [RESEARCH_ART.icon]: `assets/images/ui/${RESEARCH_ART.icon}.png`,
  [RESEARCH_ART.rp]: `assets/images/rewards/${RESEARCH_ART.rp}.png`,
  [RESEARCH_ART.glow]: `assets/images/vfx/${RESEARCH_ART.glow}.png`,
  // Competitions (Milestones 12–13): all 12 event backdrops, icons, win/loss/rank-up effects, the 6 trophies, the first-event
  // and World Championship art, rival logos and the five rival managers.
  ...Object.fromEntries(COMPETITIONS.map((c) => art('backdrops', c.art))),
  ...Object.fromEntries([art('ui', COMPETITION_ART.icon), art('vfx', COMPETITION_ART.winBurst), art('vfx', COMPETITION_ART.lossPuff), art('events', COMPETITION_ART.firstMoment)]),
  ...Object.fromEntries([art('ui', COMPETITION_ART.rankingsIcon), art('ui', COMPETITION_ART.trophiesIcon), art('vfx', COMPETITION_ART.rankUpBurst), art('events', COMPETITION_ART.worldMoment)]),
  ...Object.fromEntries(TROPHIES.map((t) => art('trophies', t.art))),
  ...Object.fromEntries(RIVALS.map((r) => art('logos', r.logo))),
  ...Object.fromEntries(RIVALS.filter((r) => r.manager).map((r) => art('npc', r.manager))),
  // Combos (Milestone 14): discovery glow, combos icon, the ??? marker (robots 11–20 are in the robot families above).
  ...Object.fromEntries([art('vfx', SYNERGY_ART.discover), art('vfx', SYNERGY_ART.blueprint), art('ui', SYNERGY_ART.icon), art('ui', SYNERGY_ART.secret)]),
  // Events, sponsors and the inbox (Milestone 15): the 8 milestone pictures, the event icons, the two sponsor reps
  // and the sponsors' icons.
  ...Object.fromEntries(MILESTONE_EVENTS.map((e) => art('events', e.art))),
  ...Object.fromEntries(Object.values(EVENT_ICONS).map((k) => art(k.startsWith('reward_') ? 'rewards' : 'ui', k))),
  ...Object.fromEntries(SPONSORS.map((s) => (s.art ? art('npc', s.art) : art('ui', s.icon)))),
  // Secrets (Milestone 16): the ??? marker, the discovery effect and the records icon.
  // Milestone 17: legendary aura, Prestige Token, secret badge (the 09/10 staff, prestige parts, F34/F35, robots 18–20,
  // event art 07/08 and the Nocturne logo come in with their own lists above).
  ...Object.fromEntries([art('ui', SECRET_ART.marker), art('vfx', SECRET_ART.discover), art('ui', SECRET_ART.records), art('vfx', SECRET_ART.aura), art('rewards', SECRET_ART.token), art('badges', SECRET_ART.badge)]),
  // Achievements and records (Milestone 18): records icon, trophies icon, reward badge, rank-up burst, reputation stars.
  ...Object.fromEntries([art('ui', ACHIEVEMENT_ART.records), art('ui', ACHIEVEMENT_ART.icon), art('rewards', ACHIEVEMENT_ART.badge), art('vfx', ACHIEVEMENT_ART.burst), art('vfx', ACHIEVEMENT_ART.stars)]),
  ...Object.fromEntries(['ui_icon_04_research', 'ui_icon_08_competition', 'ui_icon_10_secret', 'ui_icon_12'].map((k) => art('ui', k))),
  // The Year 16 ending (Milestone 19): key art, logo and series end-card; the World Championship / national
  // moments, trophies, burst and stars are loaded above.
  ...Object.fromEntries([ENDING_ART.keyArt, ENDING_ART.logo, ENDING_ART.seriesMark].map((k) => art('brand', k))),
  ...Object.fromEntries([art('events', ENDING_ART.worldMoment), art('events', ENDING_ART.nationalMoment), art('vfx', ENDING_ART.burst), art('vfx', ENDING_ART.stars)]),
  // New Game+ (Milestone 20): key art, the NG+ burst and icon (the Prestige Token, portraits and blueprint glow are above).
  ...Object.fromEntries([art('brand', NG_PLUS_ART.keyArt), art('vfx', NG_PLUS_ART.burst), art('ui', NG_PLUS_ART.icon)]),
  // The front end (Milestone 21): every menu / settings / store icon and the splash art.
  ...Object.fromEntries(['ui_icon_07_workshop', 'ui_icon_15', 'ui_icon_16', 'ui_icon_17', 'ui_icon_18', 'ui_icon_21', 'ui_icon_22', 'ui_icon_25', 'ui_icon_26', 'ui_icon_27', 'ui_icon_30'].map((k) => art('ui', k))),
  ...Object.fromEntries([MENU_ART.keyArt, MENU_ART.logo, MENU_ART.seriesMark, MENU_ART.ngPlus].map((k) => art('brand', k))),
  // Store, VIP and ads (Milestone 23): the store / VIP / rewarded-ad / Remove Ads icons and the Tech Chip rewards.
  ...Object.fromEntries(['ui_icon_23', 'ui_icon_24'].map((k) => art('ui', k))),
  ...Object.fromEntries(['reward_02', 'reward_03'].map((k) => art('rewards', k))),
  // Milestone 24: the parts crates (rare / elite / legendary part grades) and the app icon at the end of the credits.
  ...Object.fromEntries(PART_GRADES.map((g) => art('rewards', g.art))),
  ...Object.fromEntries(CREDITS.filter((c) => c.image).map((c) => art('brand', c.image))),
};
