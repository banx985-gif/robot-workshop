// Reading unlock rules (data/unlocks.js). Milestone 6: only 'start' content is open in normal play;
// research, facilities, ranks, counters, competitions and secrets start opening things from Milestone 9.
import { RESEARCH_BRANCHES, FACILITY_NAMES, COUNTERS, COMPETITION_EVENTS } from '../../data/unlocks.js';

export function isOpenNow(rule) {
  return rule?.type === 'start';
}

// Plain words for a rule, e.g. "Mechanical Research 3" or "Materials Lab + Mechanical Research 5".
export function describeUnlock(rule) {
  switch (rule?.type) {
    case 'start':
      return 'Available from the start';
    case 'research':
      return `${RESEARCH_BRANCHES[rule.branch] ?? rule.branch} ${rule.level}`;
    case 'facility':
      return FACILITY_NAMES[rule.id] ?? rule.id;
    case 'rank':
      return `Company Rank ${rule.rank}`;
    case 'counter':
      return (COUNTERS[rule.counter] ?? `{n} × ${rule.counter}`).replace('{n}', rule.min);
    case 'competition':
      return COMPETITION_EVENTS[rule.event] ?? rule.event;
    case 'secret':
      return 'Secret';
    case 'all':
      return rule.of.map(describeUnlock).join(' + ');
    default:
      return 'Unknown';
  }
}
