// The 30 visible achievements (bible §27.1) — plain data for core/AchievementSystem.js (Milestone 18).
// Facts are read by name from src/systems/secretFacts.js (the same registry the secret engine uses).
// Rewards are paid once per account, into the run where the achievement is earned.
//
// M18 interpretations:
//   ACH01 "Finish tutorial"        = the first-time guide is finished, or the first competition result is in (§26:
//                                    the tutorial ends after the first competition result)
//   ACH07 "2 projects at once"     = two robot projects running at the same moment (needs the second project bay)
//   ACH21 "all 36 visible nodes"   = the 36 normal research topics (Secret Lab topics don't count)
//   ACH23 "19 visible/non-Unknown" = every combo except the secret Singularity Workshop (SYN20): 19 of the 20
//   ACH24 "lifetime credits"       = credits earned this run (sales, contracts, prizes, events, rewards — not the
//                                    starting money, loans or refunds for selling facilities)
//   ACH26 "no Emergency Credit"    = the credits balance never went below zero this run
//   ACH27 "four normal expansions" = Expansions 1–4 (not the secret basement)
//   ACH29 / ACH30                  = the Year 16 ending (Milestone 19; the ?debug=1 "ending reached" switch until then)
import { SYNERGIES } from './synergies.js';

// Engine event names → the game's bus events.
export const ACHIEVEMENT_TRIGGERS = {
  guide: 'guide:change', // after the guide's progress is stored (guide:done comes just before it)
  projectStarted: 'project:start',
  projectFinished: 'project:complete',
  launch: 'product:launch',
  sale: 'product:sales',
  hire: 'staff:hired',
  training: 'training:complete',
  levelUp: 'staff:levelup',
  rankUp: 'reputation:rankUp',
  competition: 'competition:enter',
  research: 'research:complete',
  combo: 'synergy:discovered',
  contract: 'contract:success',
  expansion: 'facility:expansion',
  month: 'clock:month',
  runEnded: 'campaign:ending',
};

// Combos ACH23 counts: all but the secret one(s) that can't be hinted at.
export const ACH23_COMBOS = SYNERGIES.filter((s) => !s.locked).map((s) => s.id);

export const ACHIEVEMENT_ART = {
  icon: 'ui_icon_19', // trophies
  records: 'ui_icon_09_records',
  badge: 'reward_05', // the reward badge on the "Achievement unlocked!" card
  burst: 'vfx_07', // rank-up burst behind it
  stars: 'vfx_06', // reputation stars
};

const at = (fact, value, op = 'gte') => ({ fact, op, value });
const chips = (n) => [{ currency: 'techChips', amount: n }];
const rp = (n) => [{ currency: 'rp', amount: n }];
const bar = (fact, target) => ({ fact, target });

export const ACHIEVEMENTS = [
  { id: 'ACH01', name: 'Doors Open', text: 'Finish the tutorial', triggerEvents: ['guide', 'competition'], requires: at('run.tutorialDone', true, 'eq'), reward: [{ currency: 'credits', amount: 500 }] },
  { id: 'ACH02', name: 'First of Many', text: 'Complete your first robot', triggerEvents: ['projectFinished'], requires: at('run.projectsFinished', 1), reward: chips(1) },
  { id: 'ACH03', name: 'On the Market', text: 'Launch your first commercial model', triggerEvents: ['launch'], requires: at('run.commercialLaunches', 1), reward: chips(1) },
  { id: 'ACH04', name: 'Five-Star-ish', text: 'Get a review of 8.0 or more', triggerEvents: ['projectFinished', 'launch'], requires: at('run.bestReview', 8.0), reward: rp(20) },
  { id: 'ACH05', name: "Critics' Choice", text: 'Get a review of 9.0 or more', triggerEvents: ['projectFinished', 'launch'], requires: at('run.bestReview', 9.0), reward: rp(50) },
  { id: 'ACH06', name: 'Zero Defects', text: 'Finish a project with 0 faults', triggerEvents: ['projectFinished'], requires: at('run.zeroFaultProjects', 1), reward: rp(20) },
  { id: 'ACH07', name: 'Busy Floor', text: 'Run 2 robot projects at the same time', triggerEvents: ['projectStarted'], requires: at('run.projectsRunning', 2), progress: bar('run.projectsRunning', 2), reward: chips(1) },
  { id: 'ACH08', name: 'Full Crew', text: 'Employ all 5 roles', triggerEvents: ['hire', 'month'], requires: at('run.rolesEmployedCount', 5), progress: bar('run.rolesEmployedCount', 5), reward: chips(1) },
  { id: 'ACH09', name: 'Ten Strong', text: 'Employ 10 staff', triggerEvents: ['hire', 'month'], requires: at('run.staffCount', 10), progress: bar('run.staffCount', 10), reward: chips(1) },
  { id: 'ACH10', name: "Teacher's Pet", text: 'Train one worker 5 times', triggerEvents: ['training'], requires: at('run.mostTrainingOneWorker', 5), progress: bar('run.mostTrainingOneWorker', 5), reward: rp(30) },
  { id: 'ACH11', name: 'Rank D', text: 'Reach Company Rank D', triggerEvents: ['rankUp', 'month'], requires: at('run.rankIndex', 1), reward: chips(2) },
  { id: 'ACH12', name: 'Rank C', text: 'Reach Company Rank C', triggerEvents: ['rankUp', 'month'], requires: at('run.rankIndex', 2), reward: chips(2) },
  { id: 'ACH13', name: 'Rank B', text: 'Reach Company Rank B', triggerEvents: ['rankUp', 'month'], requires: at('run.rankIndex', 3), reward: chips(2) },
  { id: 'ACH14', name: 'Rank A', text: 'Reach Company Rank A', triggerEvents: ['rankUp', 'month'], requires: at('run.rankIndex', 4), reward: chips(2) },
  { id: 'ACH15', name: 'Rank S', text: 'Reach Company Rank S', triggerEvents: ['rankUp', 'month'], requires: at('run.rankIndex', 5), reward: chips(3) },
  { id: 'ACH16', name: 'Local Winner', text: 'Win the Local Workshop Trial (C01)', triggerEvents: ['competition'], requires: at('run.eventsWon', 'C01', 'has'), reward: chips(1) },
  { id: 'ACH17', name: 'Regional Champion', text: 'Win the Regional Racing Circuit (C07)', triggerEvents: ['competition'], requires: at('run.eventsWon', 'C07', 'has'), reward: chips(2) },
  { id: 'ACH18', name: 'National Champion', text: 'Win the National Robotics Arena (C08)', triggerEvents: ['competition'], requires: at('run.eventsWon', 'C08', 'has'), reward: chips(3) },
  { id: 'ACH19', name: 'World Champion', text: 'Win the World Robotics Championship (C09)', triggerEvents: ['competition'], requires: at('run.eventsWon', 'C09', 'has'), reward: chips(5) },
  { id: 'ACH20', name: 'Researcher', text: 'Complete 10 research topics', triggerEvents: ['research'], requires: at('run.visibleResearchCount', 10), progress: bar('run.visibleResearchCount', 10), reward: rp(50) },
  { id: 'ACH21', name: 'Research Master', text: 'Complete all 36 research topics', triggerEvents: ['research'], requires: at('run.visibleResearchCount', 36), progress: bar('run.visibleResearchCount', 36), reward: chips(3) },
  { id: 'ACH22', name: 'Combo Hunter', text: 'Discover 10 combos', triggerEvents: ['combo', 'projectFinished'], requires: at('run.combosDiscoveredCount', 10), progress: bar('run.combosDiscoveredCount', 10), reward: chips(2) },
  { id: 'ACH23', name: 'Combo Master', text: 'Discover 19 combos (all but the secret one)', triggerEvents: ['combo', 'projectFinished'], requires: at('run.normalCombosCount', ACH23_COMBOS.length), progress: bar('run.normalCombosCount', ACH23_COMBOS.length), reward: chips(3) },
  { id: 'ACH24', name: 'Market Leader', text: 'Earn 500,000 credits in one run', triggerEvents: ['sale', 'contract', 'competition', 'month'], requires: at('run.creditsEarned', 500000), progress: bar('run.creditsEarned', 500000), reward: chips(3) },
  { id: 'ACH25', name: 'Contract Pro', text: 'Complete 25 contracts', triggerEvents: ['contract'], requires: at('run.contractsDone', 25), progress: bar('run.contractsDone', 25), reward: chips(3) },
  { id: 'ACH26', name: 'No Bailout', text: 'Reach Year 16 without going into Emergency Credit', triggerEvents: ['month', 'runEnded'], requires: { all: [at('run.year', 16), at('run.everInDebt', false, 'eq')] }, reward: chips(2) },
  { id: 'ACH27', name: 'Workshop Empire', text: 'Buy all four workshop expansions', triggerEvents: ['expansion'], requires: at('run.normalExpansions', 4), progress: bar('run.normalExpansions', 4), reward: chips(2) },
  { id: 'ACH28', name: 'Staff Developer', text: 'Raise any worker to Level 30', triggerEvents: ['levelUp'], requires: at('run.maxStaffLevel', 30), progress: bar('run.maxStaffLevel', 30), reward: chips(3) },
  { id: 'ACH29', name: 'Long Haul', text: 'Reach the Year 16 ending', triggerEvents: ['runEnded'], requires: at('run.flag.endingReached', true, 'eq'), reward: [{ currency: 'techChips', amount: 10 }, { currency: 'prestigeTokens', amount: 1 }] },
  { id: 'ACH30', name: 'Again, Better', text: 'Complete a New Game+ ending', triggerEvents: ['runEnded'], requires: { all: [at('run.flag.endingReached', true, 'eq'), at('run.ngPlus', 1)] }, reward: [{ currency: 'techChips', amount: 10 }, { currency: 'prestigeTokens', amount: 2 }] },
];

// How a reward reads ("2 Tech Chips + 1 Prestige Token").
const CURRENCY_NAMES = { credits: ['credit', 'credits'], techChips: ['Tech Chip', 'Tech Chips'], rp: ['RP', 'RP'], prestigeTokens: ['Prestige Token', 'Prestige Tokens'] };
export function rewardLabel(reward) {
  return (reward ?? []).map((r) => `${r.amount.toLocaleString('en-US')} ${CURRENCY_NAMES[r.currency]?.[r.amount === 1 ? 0 : 1] ?? r.currency}`).join(' + ');
}
