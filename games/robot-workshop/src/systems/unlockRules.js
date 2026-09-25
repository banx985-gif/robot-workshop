// Reading unlock rules (data/unlocks.js). Parts and purposes: only 'start' content is open in normal play
// until research arrives (Milestone 9). Facilities are checked for real by Campaign.unlockMet().
import { RESEARCH_BRANCHES, FACILITY_NAMES, COUNTERS, COMPETITION_EVENTS, FLAG_NAMES } from '../../data/unlocks.js';
import { FACILITIES } from '../../data/facilities.js';
import { ROLES } from '../../data/staff.js';

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
      return FACILITIES[rule.id]?.name ?? FACILITY_NAMES[rule.id] ?? rule.id;
    case 'rank':
      return `Company Rank ${rule.rank}`;
    case 'counter':
      return (COUNTERS[rule.counter] ?? `{n} × ${rule.counter}`).replace('{n}', rule.min);
    case 'competition':
      return COMPETITION_EVENTS[rule.event] ?? rule.event;
    case 'secret':
      return 'Secret';
    case 'flag':
      return FLAG_NAMES[rule.flag] ?? rule.flag;
    case 'role':
      return `First ${ROLES[rule.role]?.name ?? rule.role} hired`;
    case 'all':
      return rule.of.map(describeUnlock).join(' + ');
    default:
      return 'Unknown';
  }
}
