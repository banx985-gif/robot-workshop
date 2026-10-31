// The Menu (Milestone 25c, series common feature §1; core/ui/MenuSheet): every CAREWORKS screen in plain words, with its
// icon and a one-line "what this is for". A row opens the very same sheet tapping the art (or a bar) opens
// (src/main.js MENU_OPEN: one code path). A row whose place isn't built yet is greyed with the reason (main.js
// menuState). Plain data only.
const row = (id, label, line, icon) => ({ id, label, line, icon });
export const MENU_GROUPS = [
  { title: 'Residents and care', rows: [
    row('residents', 'Residents', 'Everyone living here: needs, mood and today’s care', 'care_ui_01'),
    row('admissions', 'Admissions', 'Who is applying for a room, and their stay', 'care_ui_06'),
    row('carePlans', 'Care plans', 'Choose a resident, then their Care Plan (plans to review are listed first)', 'care_ui_01'),
    row('activities', 'Activities timetable', 'The week’s group activities and who signs up', 'care_ui_18'),
    row('programs', 'Programs', 'The specialist programs: start, stop, their staff hours', 'care_ui_12'),
    row('emergency', 'Emergency and Preparedness', 'Events under way, Preparedness, supplies and falls', 'care_ui_27'),
  ] },
  { title: 'Staff', rows: [
    row('roster', 'Staff roster', 'Who works which shift, Safe Coverage and floats', 'care_ui_02'),
    row('recruit', 'Recruit', 'Candidates from the recruitment channels', 'care_ui_07'),
    row('training', 'Training', 'Courses at the Training Room that raise stats', 'care_ui_19'),
    row('itemStore', 'Care equipment store', 'Equipment the home has earned: give it to raise a stat for good', 'care_ui_19'),
  ] },
  { title: 'Develop', rows: [
    row('build', 'Build Mode', 'Place, move, sell and upgrade rooms and facilities', 'care_ui_21'),
    row('develop', 'Develop', 'The home’s stage, wings, Build Mode, programs and research', 'care_ui_03'),
    row('research', 'Research', 'Spend Research Points on new care, places and programs', 'care_ui_03'),
  ] },
  { title: 'Quality and family', rows: [
    row('quality', 'Quality', 'Headline scores, Rank, accreditation, benchmarks and inspections', 'care_ui_28'),
    row('complaints', 'Compliments and complaints', 'Family feedback and the improvement tasks it sets', 'care_ui_04'),
    row('memoryBook', 'Memory Book', 'Residents who lived out their days with you, kept for good', 'memory_book_emblem'), // (Milestone 28b: its own emblem) // (Milestone 27: Quality → Records too)
    row('achievements', 'Achievements', 'Thirty goals for a caring home, kept in every home', 'care_ui_28'), // (Milestone 32: Quality → Records too)
    row('homeRecords', 'Home Records', 'This home’s best and the best across all your homes', 'care_ui_28'),
    row('hallOfFame', 'Staff Hall of Fame', 'The people who made your homes what they are', 'care_ui_28'),
    row('family', 'Family', 'The Reception / Family Desk: visits, meetings and Family Trust', 'care_ui_10'),
  ] },
  { title: 'Business', rows: [
    row('business', 'Business', 'Funding, the ledger, partners, grants and supplies', 'care_ui_05'),
    row('partners', 'Community partners', 'Partnership deals, their goals and rewards', 'care_ui_14'),
    row('grants', 'Grants', 'Grants on offer and the goals they pay for', 'care_ui_14'),
    row('ledger', 'Ledger', 'Every Credit in and out, month by month', 'care_reward_01'),
  ] },
  { title: 'More', rows: [
    row('inbox', 'Inbox', 'Notices, offers, alerts and family news', 'care_ui_23'),
    row('settings', 'Settings', 'Sound, graphics, text size, the Menu button and hints', 'care_ui_menu'),
    row('help', 'Help', 'How to run the home', 'care_ui_28'),
    row('mainMenu', 'Save and main menu', 'Saves the home, then back to the title screen', 'care_ui_30'),
  ] },
];
export const MENU_TEXT = { title: 'Menu', subtitle: 'Every screen in the home. Tapping the art works too.', button: 'Menu', icon: 'care_ui_menu' }; // care_ui_menu: drawn by code

// The next-step hint line under the time line (core/ui/HintLine). main.js says when each one holds and what it opens;
// the first that holds is shown. It goes quiet while a sheet is open, in Build Mode, or with Settings → hints off.
export const NEXT_HINTS = {
  emergency: 'An event needs a response: tap to open the Inbox',
  inbox: (n) => `${n} thing${n === 1 ? '' : 's'} in the Inbox ${n === 1 ? 'needs' : 'need'} you: tap to open it`,
  admitFirst: 'Admit your first resident: tap for Admissions',
  afternoon: 'Nobody is on the Afternoon shift: tap for the roster',
  night: 'Nobody is on the Night shift: tap for the roster',
  short: 'A shift is short-staffed: tap for the roster',
  dining: 'Place a Dining Room: tap for Build Mode',
  kitchen: 'Place a Kitchen so meals are cooked here: tap for Build Mode',
  plan: (name) => `${name}’s care plan is due for review: tap to open it`,
  activities: 'Plan the week’s activities: tap for the timetable',
  accredit: (name) => `The home would pass the ${name} inspection today: tap to apply`, // (Milestone 26)
  item: (n) => `${n} piece${n === 1 ? '' : 's'} of care equipment in the store: tap to give one`,
  partner: 'A community partner has made an offer: tap to see it',
  upgrade: 'A facility can be upgraded: tap it, then Upgrade',
};
