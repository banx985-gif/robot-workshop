// BOTWORKS web-sized art (Milestone 24) — settings for tools/optimize-images.mjs (the web-sized copies) and the art
// loading plan in src/main.js. The originals in assets/images/ are only ever read.
import { MENU_ART } from './menu.js';
import { ROOM_ART, PROPS } from './workshop.js';
import { WORKSHOP_START, FACILITIES, BUILD_ART } from './facilities.js';
import { STAFF_BY_ID, STARTER_IDS, ROLES } from './staff.js';
import { STATUS_ART, VFX_ART } from './feedback.js';
import { RESEARCH_ART } from './research.js';
import { COMPETITION_ART } from './competitions.js';
import { HELP_ICON, GUIDE_FACE } from './guide.js';
import { ART_SIZES } from './artSizes.js';

// §40.1 / the M24 card: what the first screen needs — splash, main menu, the workshop room with its starting stations
// and props, the three starter staff, the bars' icons, status icons and workshop effects. Everything else loads per
// screen (SCREEN_ART) and in the background. The service worker precaches only these.
const firstScreen = [
  ...new Set([
    ...Object.values(MENU_ART),
    ROOM_ART.floor.key,
    ROOM_ART.corner.key,
    ...Object.values(ROOM_ART.pieces).map((p) => p.key),
    BUILD_ART.boundary,
    BUILD_ART.buildIcon,
    ...WORKSHOP_START.layout.map((p) => FACILITIES[p.def].art),
    ...STARTER_IDS.map((id) => STAFF_BY_ID[id].art),
    ...STARTER_IDS.map((id) => ROLES[STAFF_BY_ID[id].role].badge),
    ...PROPS.filter((p) => p.col < WORKSHOP_START.cols && p.row < WORKSHOP_START.rows).map((p) => p.art),
    ...Object.values(STATUS_ART),
    ...Object.values(VFX_ART),
    'ui_icon_01_money',
    'ui_icon_02_premium',
    'ui_icon_03_reputation',
    'ui_icon_05_staff',
    'ui_icon_11',
    'ui_icon_29',
    RESEARCH_ART.icon,
    COMPETITION_ART.icon,
    HELP_ICON,
    GUIDE_FACE.key ?? GUIDE_FACE,
    'event_art_01', // the "workshop opening" moment of a new game
  ]),
].filter(Boolean);

export const WEB_ART = {
  artList: 'data/artList.js',
  sourceDir: 'assets/images',
  outDir: 'assets/img_opt', // generated (safe to delete; remade by the script, and by publish.ps1)
  webpQuality: 0.85,
  backgroundConcurrency: 6,
  // At most 2× the biggest logical size each picture is drawn at (measured by the M24 art tour, data/artSizes.js; the
  // logical canvas is 1080 wide, ≈ the real pixels of a phone). World pictures (drawn under the zoomed camera, up to
  // 3.5× sharper) and full-screen scenes keep their full size.
  maxLongSide: ART_SIZES,
  firstScreen,
};

// Each screen's pictures, by folder: fetched first when that screen opens (the rest keep loading behind).
export const SCREEN_ART = {
  workshop: ['facilities', 'props', 'staff', 'vfx', 'status', 'events', 'robots', 'env'],
  roster: ['staff', 'badges', 'status'],
  staffDetail: ['staff', 'badges', 'status', 'rewards'],
  recruit: ['staff', 'badges', 'vfx'],
  training: ['staff', 'badges', 'rewards'],
  builder: ['components', 'robots', 'staff', 'badges'],
  project: ['components', 'robots', 'staff', 'vfx'],
  result: ['robots', 'components', 'vfx', 'rewards'],
  components: ['components', 'robots', 'rewards'],
  combos: ['robots', 'ui'],
  build: ['facilities', 'env'],
  research: ['ui', 'rewards', 'vfx'],
  competitions: ['backdrops', 'logos', 'trophies', 'robots'],
  compSetup: ['backdrops', 'logos', 'robots', 'staff'],
  compWatch: ['backdrops', 'logos', 'robots', 'vfx'],
  compResult: ['backdrops', 'logos', 'trophies', 'vfx', 'rewards'],
  rankings: ['logos', 'npc'],
  trophies: ['trophies'],
  records: ['ui', 'rewards', 'trophies', 'robots'],
  rumours: ['ui', 'npc', 'logos', 'vfx'],
  contracts: ['npc', 'robots'],
  finance: ['npc', 'rewards', 'ui'],
  products: ['robots', 'npc'],
  projects: ['robots'],
  inbox: ['events', 'ui', 'rewards'],
  ceremony: ['brand', 'trophies', 'events', 'vfx', 'staff', 'robots'],
  credits: ['brand', 'staff', 'logos'],
  ngplus: ['brand', 'staff', 'robots', 'vfx'],
  store: ['ui', 'rewards'],
  vip: ['ui', 'rewards'],
};
