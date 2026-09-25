// Reading unlock rules (data/unlocks.js) as plain words. Whether a rule is met is Campaign.unlockMet().
import { RESEARCH_BRANCHES, FACILITY_NAMES, COUNTERS, COMPETITION_EVENTS, FLAG_NAMES } from '../../data/unlocks.js';
import { FACILITIES } from '../../data/facilities.js';
import { ROLES } from '../../data/staff.js';
import { FEATURES } from '../../data/research.js';
import { PURPOSES } from '../../data/purposes.js';
import { COMPETITIONS_BY_ID, TROPHIES_BY_ID } from '../../data/competitions.js';

const eventName = (id) => COMPETITIONS_BY_ID[id]?.name ?? id;

// Plain words for a rule, e.g. "Mechanical Research 3" or "Materials Lab + Mechanical Research 5".
export function describeUnlock(rule) {
  switch (rule?.type) {
    case 'start':
      return 'Available from the start';
    case 'research':
      return `${RESEARCH_BRANCHES[rule.branch] ?? rule.branch} ${rule.level}`;
    case 'researchCount':
      return `${rule.min} research topics done`;
    case 'feature':
      return FEATURES[rule.id]?.name ?? rule.id;
    case 'facility':
      return FACILITIES[rule.id]?.name ?? FACILITY_NAMES[rule.id] ?? rule.id;
    case 'rank':
      return `Company Rank ${rule.rank}`;
    case 'counter':
      return (COUNTERS[rule.counter] ?? `{n} × ${rule.counter}`).replace('{n}', rule.min);
    case 'competition':
      return (COMPETITION_EVENTS[rule.event] ?? rule.event).replace('{n}', rule.min);
    case 'secret':
      return 'Secret';
    case 'starter':
      return 'Starter team';
    case 'tutorial':
      return rule.when === 'month1' ? 'Tutorial hire (Month 1)' : 'Tutorial hire (Local Trial)';
    case 'flag':
      return FLAG_NAMES[rule.flag] ?? rule.flag;
    case 'role':
      return `First ${ROLES[rule.role]?.name ?? rule.role} hired`;
    case 'yearReached':
      return `Year ${rule.year}`;
    case 'eventWins':
      return rule.events.length === 1 ? `Win the ${eventName(rule.events[0])}` : `Win any ${rule.min ?? rule.events.length} of ${rule.events.join(', ')}`;
    case 'eventEntered':
      return rule.event ? `Enter the ${eventName(rule.event)}` : 'Enter a competition';
    case 'totalWins':
      return `Win ${rule.min} competitions`;
    case 'trophy':
      return `Own the ${TROPHIES_BY_ID[rule.id]?.name ?? rule.id}`;
    case 'purposeBuilt':
      return `A finished ${PURPOSES[rule.purpose]?.name ?? rule.purpose} robot`;
    case 'all':
      return rule.of.map(describeUnlock).join(' + ');
    default:
      return 'Unknown';
  }
}

// The parts of a rule that are not met yet, in words (e.g. "Company Rank D"). met(rule) → bool.
export function missingParts(rule, met) {
  if (rule?.type === 'all') return rule.of.flatMap((r) => missingParts(r, met));
  return met(rule) ? [] : [describeUnlock(rule)];
}
