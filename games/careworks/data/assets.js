// CAREWORKS image list: key → path (relative to index.html). Batch art is added here milestone by milestone; anything
// missing draws the placeholder box, never crashes.
import { PLACED, PROPS, STAGES } from './home.js';
import { ROOMS } from './rooms.js';
import { BUILDABLE_FACILITIES, PRESTIGE_FACILITIES } from './facilities.js';
import { BOTTOM_SLOTS, TOP_ICONS, CARE_ICONS } from './bars.js';
import { CARE_POPS } from './pops.js';
import { RESIDENTS } from './residents.js';
import { FOUNDERS } from './setup.js';
import { STAFF, GODS } from './staff.js';
import { ROLES } from './roles.js';
import { ACTIVITIES, BIRTHDAY } from './activities.js';
import { TROLLEYS } from './dining.js';
import { DISCHARGE } from './mobility.js';
import { ROUND } from './clinical.js';
import { FAMILY_ICONS, FIRSTS, COMPLIMENT } from './family.js';
import { VISIBLE_PROGRAMS, PRESTIGE_PROGRAMS } from './programs.js';
import { PARTNERS } from './partners.js';
import { WINGS_SPECIAL } from './wings.js';
import { INCIDENTS } from './incidents.js';
import { ITEM_TYPES } from './items.js';
import { ACCREDITATIONS, PRESTIGE_ACCREDITATIONS } from './accreditations.js';
import { PEERS, PRESTIGE_PEERS } from './peers.js';
import { QUALITY_ART } from './quality.js';
import { MEMORIAL } from './endOfLife.js';
import { DRESSING_ART } from './dressing.js';
import { BRAND, FIRST_ART, REWARD_ART, CARE_FX } from './artMoments.js';

const art = (folder, key) => [key, `assets/images/${folder}/${key}.png`];

export const ASSETS = {
  // Milestone 1, the small home: the placed station / lounge / room, Arthur, and every Founder (the worker is the run's
  // Founder).
  ...Object.fromEntries(PLACED.map((p) => art(p.kind === 'room' ? 'rooms' : 'facilities', p.art))),
  // Milestone 10: every room and facility Build Mode can place (not the two secret ones), and the stage pictures
  ...Object.fromEntries(ROOMS.map((r) => art('rooms', r.art))),
  ...Object.fromEntries(BUILDABLE_FACILITIES.map((f) => art('facilities', f.art))),
  ...Object.fromEntries(STAGES.filter((s) => s.art).map((s) => art('events', s.art))),
  ...Object.fromEntries(RESIDENTS.map((r) => art('residents', r.art))),
  ...Object.fromEntries(FOUNDERS.map((f) => art('staff', f.art))),
  // Milestone 3: every staff portrait on the roster data and the five role badges (staff cards).
  ...Object.fromEntries([...STAFF, ...GODS].map((s) => art('staff', s.art))), // (Milestone 30b: and the five Works Gods)
  ...Object.fromEntries(Object.values(ROLES).map((r) => art('badges', r.badge))),
  // Milestone 5: the five early props, the three care pops, the bar icons (bottom-bar slots, Credits / Care Tokens) and
  // the Care sheet's icons (Admissions, the call bell).
  ...Object.fromEntries(PROPS.map((p) => art('props', p.art))),
  ...Object.fromEntries(Object.values(CARE_POPS).map((p) => art('vfx', p.art))),
  ...Object.fromEntries(BOTTOM_SLOTS.map((s) => art('ui', s.icon))),
  ...Object.fromEntries(Object.values(TOP_ICONS).map((k) => art('rewards', k))),
  ...Object.fromEntries(Object.values(CARE_ICONS).map((k) => art('ui', k))),
  // Milestone 14: the activity props (drawn in the room while a session runs) and the First Birthday picture
  ...Object.fromEntries(ACTIVITIES.filter((a) => a.prop).map((a) => art('props', a.prop))),
  ...Object.fromEntries([art('events', BIRTHDAY.firstArt)]),
  // Milestone 15: the Hydration Cart on the drinks rounds (the dining trolley is one of the early props)
  ...Object.fromEntries([art('equipment', TROLLEYS.round)]),
  // Milestone 16: the First Rehab Discharge picture (the aid props are early props, listed above)
  ...Object.fromEntries([art('events', DISCHARGE.firstArt)]),
  // Milestone 18: the Medication Cart (pushed on the medicine round; beside the Medication Room otherwise)
  ...Object.fromEntries([art('equipment', ROUND.cart)]),
  // Milestone 19: the Family Trust / complaint / compliment icons, the First Family Visit picture, the Family Thank-You
  // Card (the first compliment)
  ...Object.fromEntries(Object.values(FAMILY_ICONS).map((k) => art('ui', k))),
  ...Object.fromEntries([art('events', FIRSTS.visitArt), art('rewards', COMPLIMENT.firstArt)]),
  // Milestone 20: the ten visible program icons (PRG11 / PRG12 are secret: not loaded, never listed)
  ...Object.fromEntries(VISIBLE_PROGRAMS.map((p) => art('programs', p.icon))),
  // Milestone 23: the eight community partners' logos (the Partners sheet)
  ...Object.fromEntries(PARTNERS.map((p) => art('logos', p.logo))),
  // Milestone 24: a wing's opening moment (the Memory Wing's own picture; the others show their hub, already listed)
  ...Object.fromEntries(WINGS_SPECIAL.filter((w) => w.beat.startsWith('care_event')).map((w) => art('events', w.beat))),
  // Milestone 25: the Emergency icon (the Nurse Station's Emergency tab, the events, Emergency supplies)
  ...Object.fromEntries([...new Set(INCIDENTS.map((t) => t.icon))].map((k) => art('ui', k))),
  // Milestone 25c: every UI icon (the Menu sheet's rows, the equipment store) and the filed pictures care-equipment items
  // reuse (care equipment, rewards, UI icons). The rest of the items are code placeholders until their files exist.
  // (Milestone 28b: care_ui_29, the Secret Program icon, is loaded with the prestige art below — Milestone 31)
  ...Object.fromEntries(Array.from({ length: 30 }, (_, i) => `care_ui_${String(i + 1).padStart(2, '0')}`).filter((k) => k !== 'care_ui_29').map((k) => art('ui', k))),
  ...Object.fromEntries(ITEM_TYPES.filter((t) => !t.art.startsWith('care_item_')).map((t) => art({ care_equipment: 'equipment', care_reward: 'rewards', care_ui: 'ui' }[t.art.replace(/_[0-9]+$/, '')], t.art))),
  // Milestone 26: the ten visible award icons (C11 / C12 are secret: not loaded), the seven peer logos (R08 secret), the
  // national finale picture
  ...Object.fromEntries(ACCREDITATIONS.map((x) => art('awards', x.art))),
  ...Object.fromEntries(PEERS.map((p) => art('logos', p.logo))),
  ...Object.fromEntries([art('events', QUALITY_ART.finale), art('vfx', QUALITY_ART.confetti)]),
  // Milestone 27: the Memorial Glow (a held room, the memorial moment) and the Memory Book Star (the Memory Book is
  // care_ui_25, already listed with the UI icons; memory_book_emblem isn't drawn yet — assets/ART_STATUS.md)
  ...Object.fromEntries([art('vfx', MEMORIAL.art.glow), art('rewards', MEMORIAL.art.star)]),
  // Milestone 28b: every picture still unused — the brand art (loading screen, title, slots, NG+, the credits' end mark),
  // the Memory Book emblem, the set dressing (care equipment and community props, data/dressing.js), the firsts and the
  // ending's picture, the reward pictures and the care effects (data/artMoments.js), and the Banx Gamex studio logo.
  ...Object.fromEntries(Object.values(BRAND).map((k) => art('brand', k))),
  ...Object.fromEntries(DRESSING_ART.map((k) => art(k.startsWith('care_equipment') ? 'equipment' : 'props', k))),
  ...Object.fromEntries(Object.values(FIRST_ART).map((k) => art('events', k))),
  ...Object.fromEntries(Object.values(REWARD_ART).map((k) => art('rewards', k))),
  ...Object.fromEntries(Object.values(CARE_FX).map((x) => art('vfx', x.art))),
  // Milestone 31: the prestige chain's art — F34 / F35, C11 / C12, PRG11 / PRG12 and the Secret Program icon, R08's logo
  // (loaded now; shown only once each one's secret flag opens it)
  ...Object.fromEntries(PRESTIGE_FACILITIES.map((f) => art('facilities', f.art))),
  ...Object.fromEntries(PRESTIGE_ACCREDITATIONS.map((x) => art('awards', x.art))),
  ...Object.fromEntries(PRESTIGE_PROGRAMS.map((p) => art('programs', p.icon))),
  ...Object.fromEntries(PRESTIGE_PEERS.map((p) => art('logos', p.logo))),
  ...Object.fromEntries([art('ui', 'care_ui_29')]),
  studioLogo: 'assets/branding/banx_gamex_logo.png',
  // Milestone 0 loader test (?screen=test): the placeholder PWA icon as a real image, and one deliberately missing file.
  m0Real: 'assets/branding/pwa/icon-192.png',
  m0Missing: 'assets/m0-missing-test.png',
};

// Milestone 25b: where each room / facility picture's painted floor is (measured by tools/careworks-art-fit.mjs, never
// by eye), as fractions of the picture: left / right = the floor's left and right corners (the walls' vertical edges),
// tipX / tipY = its bottom tip. The home sits the tip on the footprint's bottom corner and scales the picture so the
// floor's width is the footprint's width (src/screens/HomeScreen.js artRect). Re-run the tool when art is replaced.
export const ART_FIT = {
  room_rm01: { left: 0.166, right: 0.832, tipX: 0.503, tipY: 0.977 }, // 30.8° / 32.6°
  room_rm02: { left: 0.172, right: 0.826, tipX: 0.496, tipY: 0.976 }, // 30.1° / 30.2°
  room_rm03: { left: 0.176, right: 0.824, tipX: 0.51, tipY: 0.977 }, // no floor diamond: tip = lowest point
  room_rm04: { left: 0.189, right: 0.809, tipX: 0.517, tipY: 0.975 }, // 28.4° / 28.6°
  room_rm05: { left: 0.209, right: 0.791, tipX: 0.479, tipY: 0.982 }, // 30.0° / 27.7°
  room_rm06: { left: 0.131, right: 0.869, tipX: 0.472, tipY: 0.945 }, // 27.7° / 31.2°
  room_rm07: { left: 0.115, right: 0.883, tipX: 0.479, tipY: 0.947 }, // 27.7° / 32.5°
  facility_f01: { left: 0.104, right: 0.896, tipX: 0.588, tipY: 0.965 }, // 28.5° / 31.2°
  facility_f02: { left: 0.086, right: 0.914, tipX: 0.623, tipY: 0.98 }, // 29.2° / 30.0°
  facility_f03: { left: 0.152, right: 0.848, tipX: 0.522, tipY: 0.893 }, // 29.8° / 30.1°
  facility_f04: { left: 0.176, right: 0.826, tipX: 0.506, tipY: 0.904 }, // 29.6° / 29.9°
  facility_f05: { left: 0.146, right: 0.854, tipX: 0.538, tipY: 0.919 }, // 29.6° / 30.9°
  facility_f06: { left: 0.188, right: 0.811, tipX: 0.434, tipY: 0.905 }, // 31.5° / 28.5°
  facility_f07: { left: 0.158, right: 0.842, tipX: 0.478, tipY: 0.919 }, // 31.0° / 28.8°
  facility_f08: { left: 0.168, right: 0.834, tipX: 0.46, tipY: 0.904 }, // 33.0° / 29.0°
  facility_f09: { left: 0.174, right: 0.824, tipX: 0.486, tipY: 0.985 }, // 28.5° / 27.3°
  facility_f10: { left: 0.184, right: 0.82, tipX: 0.523, tipY: 1.001 }, // 26.0° / 24.9°
  facility_f11: { left: 0.178, right: 0.818, tipX: 0.493, tipY: 1 }, // 23.3° / 29.4°
  facility_f12: { left: 0.18, right: 0.82, tipX: 0.506, tipY: 0.997 }, // 22.9° / 26.0°
  facility_f13: { left: 0.168, right: 0.834, tipX: 0.529, tipY: 0.979 }, // 24.2° / 26.5°
  facility_f14: { left: 0.184, right: 0.818, tipX: 0.582, tipY: 0.977 }, // no floor diamond: tip = lowest point
  facility_f15: { left: 0.037, right: 0.963, tipX: 0.498, tipY: 1.035 }, // 35.2° / 32.4°
  facility_f16: { left: 0.18, right: 0.818, tipX: 0.492, tipY: 0.998 }, // 32.7° / 31.7°
  facility_f17: { left: 0.164, right: 0.836, tipX: 0.486, tipY: 0.966 }, // 30.7° / 25.2°
  facility_f18: { left: 0.191, right: 0.809, tipX: 0.494, tipY: 0.986 }, // 29.1° / 30.0°
  facility_f19: { left: 0.186, right: 0.814, tipX: 0.544, tipY: 0.975 }, // 28.9° / 27.3°
  facility_f20: { left: 0.189, right: 0.811, tipX: 0.497, tipY: 0.98 }, // 28.7° / 29.2°
  facility_f21: { left: 0.182, right: 0.818, tipX: 0.515, tipY: 0.977 }, // no floor diamond: tip = lowest point
  facility_f22: { left: 0.166, right: 0.834, tipX: 0.518, tipY: 0.959 }, // 30.8° / 27.7°
  facility_f23: { left: 0.172, right: 0.826, tipX: 0.49, tipY: 0.933 }, // 28.4° / 26.6°
  facility_f24: { left: 0.17, right: 0.83, tipX: 0.502, tipY: 0.926 }, // no floor diamond: tip = lowest point
  facility_f25: { left: 0.172, right: 0.828, tipX: 0.5, tipY: 0.994 }, // 25.4° / 26.3°
  facility_f26: { left: 0.17, right: 0.828, tipX: 0.392, tipY: 0.975 }, // no floor diamond: tip = lowest point
  facility_f27: { left: 0.168, right: 0.83, tipX: 0.512, tipY: 1 }, // 20.0° / 25.8°
  facility_f28: { left: 0.17, right: 0.832, tipX: 0.491, tipY: 0.928 }, // 26.2° / 23.8°
  facility_f29: { left: 0.164, right: 0.838, tipX: 0.463, tipY: 0.889 }, // no floor diamond: tip = lowest point
  facility_f30: { left: 0.16, right: 0.84, tipX: 0.537, tipY: 0.938 }, // 25.5° / 27.3°
  facility_f31: { left: 0.164, right: 0.836, tipX: 0.478, tipY: 0.927 }, // 29.0° / 26.5°
  facility_f32: { left: 0.158, right: 0.84, tipX: 0.473, tipY: 0.887 }, // no floor diamond: tip = lowest point
  facility_f33: { left: 0.168, right: 0.83, tipX: 0.553, tipY: 0.943 }, // no floor diamond: tip = lowest point
  facility_f34: { left: 0.166, right: 0.836, tipX: 0.54, tipY: 0.926 }, // no floor diamond: tip = lowest point
  facility_f35: { left: 0.17, right: 0.836, tipX: 0.505, tipY: 0.936 }, // no floor diamond: tip = lowest point
};
