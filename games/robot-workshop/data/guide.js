// First-time guide steps (Milestone 7b; the full tutorial, bible §26, comes in Milestone 26 and builds on this).
// Plain data for core/GuideSystem.js. Short, friendly words — no walls of text.
// target names are resolved to screen spots by src/ui/guideTargets.js.
// trigger: after = previous step done; event = has happened at least once; screen = only shows there.
// advance: tap = tap the glowing spot; next = "Got it"; event = when it happens in the game.

export const GUIDE_STEPS = [
  {
    id: 'S1',
    title: 'Welcome to your workshop!',
    text: 'These three are your team. Tap Mina to meet her.',
    art: 'event_art_01',
    target: 'mina',
    trigger: { screen: ['workshop'] },
    advance: { tap: true },
    block: true,
    skipAlso: ['S2'], // Mina's card only opens if she was tapped
  },
  {
    id: 'S2',
    title: "Mina's card",
    text: 'Here are her energy and mood. Tired or unhappy workers go slower. Tap Got it to close her card.',
    target: 'staffCard',
    trigger: { after: 'S1', screen: ['workshop'] },
    advance: { next: true },
    block: true,
    restartAt: 'S1',
  },
  {
    id: 'S3',
    title: 'The top bar',
    text: 'Your money, Tech Chips and company rank live up here. Underneath: pause and speed.',
    target: 'topBar',
    trigger: { after: 'S2', screen: ['workshop'] },
    advance: { next: true },
    block: true,
  },
  {
    id: 'S4',
    title: 'Build your first robot',
    text: 'Tap Project to start building.',
    target: 'projectButton',
    trigger: { after: 'S3', screen: ['workshop'] },
    advance: { tap: true },
    block: true,
  },
  {
    id: 'S5',
    title: 'The six parts',
    text: 'The parts are already picked for you. Tap one to see what it does.',
    target: 'builderPart',
    trigger: { after: 'S4', screen: ['builder'] },
    advance: { tap: true },
    block: true,
    restartAt: 'S4',
  },
  {
    id: 'S6',
    title: 'Budget',
    text: 'Balanced is a safe choice for your first robot. Tap it.',
    target: 'balanced',
    trigger: { after: 'S5', screen: ['builder'] },
    advance: { tap: true },
    block: true,
    restartAt: 'S4',
  },
  {
    id: 'S7',
    title: 'Your team',
    text: 'All three workers are on the team (green). Tap Start project!',
    target: 'startButton',
    trigger: { after: 'S6', screen: ['builder'] },
    advance: { event: 'project:start' },
    block: false,
    restartAt: 'S4',
  },
  {
    id: 'S8',
    title: 'Five stages',
    text: 'Your robot is built in 5 stages. Watch the bar fill up. Tired workers work slower.',
    target: 'progress',
    trigger: { after: 'S7', event: 'project:phase' },
    advance: { next: true },
    block: true,
  },
  {
    id: 'S9',
    title: 'A fault!',
    text: 'A fault is a small defect. Testing, the last stage, tries to fix it.',
    target: 'progress',
    trigger: { after: 'S7', event: 'robot:fault' },
    advance: { next: true },
    block: true,
  },
  {
    id: 'S10',
    title: 'Your first robot!',
    text: 'Pick a price — Standard is a good start — then tap Launch to sell it.',
    art: 'event_art_02',
    target: 'launch',
    trigger: { after: 'S7', event: 'project:complete' },
    advance: { event: 'product:launch' },
    block: false,
  },
  {
    id: 'S10b',
    title: "It's on sale!",
    text: 'Great! Tap Back to the workshop and let time run.',
    target: 'resultDone',
    trigger: { after: 'S10', screen: ['result'] },
    advance: { tap: true },
    block: true,
  },
  {
    id: 'S11',
    title: 'Sales day',
    text: 'Sales arrive at the end of each month. Tap Products to see them. Wages are paid on day 1, so keep earning more than you spend!',
    target: 'productsButton',
    trigger: { after: 'S10', event: 'product:sales' },
    advance: { tap: true },
    block: true,
  },
  {
    id: 'S12',
    title: 'Contracts',
    text: 'Contracts are customer orders with a deadline. They pay well! Tap Contracts.',
    target: 'contractsButton',
    trigger: { after: 'S7', event: 'contract:offered' },
    advance: { tap: true },
    block: true,
  },
  {
    id: 'S13',
    title: "You're all set!",
    text: 'That was the basics. Tap Help any time to read these again.',
    target: 'helpButton',
    trigger: { after: 'S11' },
    advance: { next: true },
    block: true,
  },
];

// Steps a player who started before the guide existed has clearly already done (old saves).
export const GUIDE_INTRO_STEPS = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7'];

// The guide's friendly face: Mina, cropped to her head (fractions of her full-body picture).
export const GUIDE_FACE = { key: 'staff_engineer_01', crop: { x: 0.22, y: 0.02, w: 0.58, h: 0.39 } };
export const HELP_ICON = 'ui_icon_27';
