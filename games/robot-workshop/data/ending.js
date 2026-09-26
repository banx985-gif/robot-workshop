// The Year 16 ending (bible §45 grade, §25 story and tone, §4.3 finale, §30.1 postgame, §37 archived summaries) —
// plain data for core/CampaignEnding.js, core/GradeEngine.js and core/RunArchive.js (Milestone 19).
import { CALENDAR } from './balance.js';

// §4.1: the first-run ending is the end of Year 16, Month 12. §37.2: 3 archived ending summaries.
export const ENDING_RULES = { endYear: CALENDAR.campaignYears, archiveMax: 3, gradeTotal: 1000 };

// §45: eight categories, 1,000 points. Each part scores points × value ÷ full (never more than its points).
// The facts are worked out from the finished run by src/systems/endingSummary.js. The "full" marks are M19 choices
// (the bible gives only the category maxima) — recheck them in the balance pass (M28).
export const GRADE_CATEGORIES = [
  {
    id: 'rank',
    name: 'Company Rank & Reputation',
    max: 150,
    icon: 'ui_icon_03_reputation',
    parts: [
      { fact: 'rankIndex', label: 'Highest Company Rank (S+ = full)', full: 6, points: 100 },
      { fact: 'reputation', label: 'Reputation (20,000 = full)', full: 20000, points: 50 },
    ],
  },
  {
    id: 'profit',
    name: 'Profit & Solvency',
    max: 120,
    icon: 'ui_icon_01_money',
    parts: [
      { fact: 'profit', label: 'Lifetime profit: credits now − starting money (1,000,000 = full)', full: 1000000, points: 90 },
      { fact: 'solvency', label: 'Solvent: never in Emergency Credit = full, left it = half, still in it = 0', full: 1, points: 30 },
    ],
  },
  {
    id: 'quality',
    name: 'Robot Quality & Reviews',
    max: 150,
    icon: 'ui_icon_06_robot',
    parts: [
      { fact: 'topQuality', label: 'Average Quality of your 5 best robots (90 = full)', full: 90, points: 90 },
      { fact: 'bestReview', label: 'Best review (9.5 = full)', full: 9.5, points: 60 },
    ],
  },
  {
    id: 'research',
    name: 'Research',
    max: 120,
    icon: 'ui_icon_04_research',
    parts: [{ fact: 'researchDone', label: 'Research topics done (all 36 = full)', full: 36, points: 120 }],
  },
  {
    id: 'staff',
    name: 'Staff Development',
    max: 120,
    icon: 'ui_icon_05_staff',
    parts: [
      { fact: 'topLevel', label: 'Average level of your 8 highest-level workers (25 = full)', full: 25, points: 80 },
      { fact: 'rolesCovered', label: 'Roles on the team (all 5 = full)', full: 5, points: 20 },
      { fact: 'coursesDone', label: 'Training courses finished (20 = full)', full: 20, points: 20 },
    ],
  },
  {
    id: 'market',
    name: 'Contracts & Market',
    max: 100,
    icon: 'ui_icon_13',
    parts: [
      { fact: 'contractsDone', label: 'Contracts completed (40 = full)', full: 40, points: 50 },
      { fact: 'unitsSold', label: 'Robots sold, all models (10,000 = full)', full: 10000, points: 50 },
    ],
  },
  {
    id: 'trophies',
    name: 'Competition Trophies',
    max: 150,
    icon: 'ui_icon_19',
    parts: [
      { fact: 'trophies', label: 'Local, Regional, National and World Cups won (all 4 = full)', full: 4, points: 100 },
      { fact: 'competitionWins', label: 'Competition wins (30 = full)', full: 30, points: 50 },
    ],
  },
  {
    id: 'discoveries',
    name: 'Discoveries & Combos',
    max: 90,
    icon: 'ui_icon_12',
    parts: [
      { fact: 'combos', label: 'Combos discovered this run (15 = full)', full: 15, points: 60 },
      { fact: 'secretsFound', label: 'Secrets discovered this run (8 = full)', full: 8, points: 30 },
    ],
  },
];

// §45 bands.
export const GRADE_BANDS = [
  { id: 'C', min: 0, color: 'progress', line: 'A workshop with heart. Every legend starts somewhere!' },
  { id: 'B', min: 400, color: 'good', line: 'A solid, respected robotics company.' },
  { id: 'A', min: 550, color: 'action', line: 'One of the finest workshops in the country.' },
  { id: 'S', min: 700, color: 'gold', line: 'World class. Rivals study your robots.' },
  { id: 'S+', min: 850, color: 'gold', line: 'Superb. The whole industry talks about you.' },
  { id: 'LEGEND', min: 950, color: 'purple', line: 'A legend of robotics. They will tell this story for years.' },
];

// The Global Robotics Awards (§25): warm and playful; rivals are good sports. Winning the World Championship changes
// the lines. {company} is filled in by the ceremony.
export const CEREMONY_TEXT = {
  title: 'Global Robotics Awards',
  subtitle: 'Sixteen years of sparks, bolts and big ideas',
  intro: {
    champion: 'Tonight we honour the World Champions! The whole robotics world is on its feet for your workshop.',
    normal: 'Tonight the whole robotics world gathers — and your little workshop has a seat at the big table.',
  },
  recapTitle: 'Your sixteen years',
  scoresTitle: 'The judges score your company',
  host: {
    champion: 'World Champions — and it shows in every category!',
    normal: 'Every workshop tells a different story. Here is yours.',
  },
  rivals: {
    champion: 'Your rivals line up to shake hands. Next year, they say, it will be different!',
    normal: 'Your rivals clap along. They know how hard this business is.',
  },
  gradeTitle: 'Your grade',
  tap: 'Tap to continue',
  // §30.7 NG+3 hidden ending variant: the Unknown robot (Singularity Workshop) was built this run.
  hidden: {
    title: 'The Singularity Awards',
    intro: 'The lights flicker. On stage stands a robot nobody has ever seen — yours. The whole hall falls silent.',
    host: 'Every prestige part, every legend, one machine. Tonight the story is yours alone.',
    badge: 'Final secret found: the Singularity Badge is yours.',
  },
};

// Art (already in the folder — never moved or edited).
export const ENDING_ART = {
  keyArt: 'brand_02_splash_key_art',
  logo: 'brand_03_title_logo',
  seriesMark: 'brand_07_credits_series_mark',
  worldMoment: 'event_art_06', // the World Championship moment
  nationalMoment: 'event_art_05', // shown instead when the World Championship was not won
  burst: 'vfx_07', // the grade reveal
  stars: 'vfx_06',
  trophies: ['trophy_01', 'trophy_02', 'trophy_03', 'trophy_04', 'trophy_05', 'trophy_06'],
  invitation: 'ui_icon_10_secret',
  hiddenMoment: 'event_art_08', // the Unknown robot's endgame picture (hidden ending, §30.7)
  finalBadge: 'badge_rarity_05_secret',
};

// The encrypted invitation (§25): sent after the ceremony. It reads only once its secret has been discovered (the
// Lunar Invitation, SEC-COMPETITION-01 — any run); until then it sits scrambled in the Rumour Archive.
export const INVITATION = {
  secretId: 'SEC-COMPETITION-01',
  title: 'An encrypted invitation',
  from: 'Sender unknown',
  text: 'To a handful of workshops only: the Lunar Robotics League is looking for machines that never tire. Win the Elite Expo, finish the Orbital contract, reach Rank S — and we will send the launch codes.',
  lockedNote: 'The message is scrambled. Something about it waits on a secret you have not found yet.',
  toastNote: 'Scrambled — kept in the Rumour Archive.',
  readNote: 'Decoded! The Lunar Robotics League wrote to you.',
};

// The end of the ceremony (§30.1): play on, roll the credits, or New Game+ (Milestone 20).
export const END_CHOICES = {
  continue: { label: 'Continue (postgame)', sub: 'Keep everything and play on' },
  credits: { label: 'Credits', sub: 'The people behind the workshop' },
  ngPlus: { label: 'New Game+', sub: 'Start again with Legacy Staff, blueprints and more' },
};
