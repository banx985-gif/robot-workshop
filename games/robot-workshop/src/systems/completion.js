// Robot Workshop's completion numbers (bible §27.3) for core/Completion.js — the Records screen's Completion tab.
// Only normal catalogue content is counted here; secret things never appear in a total. Secrets are counted
// separately as Discovery, which core/Completion.js keeps hidden until the first Year 16 ending.
import { completionView } from '../../../../core/Completion.js';
import { ACHIEVEMENTS, ACH23_COMBOS } from '../../data/achievements.js';
import { RESEARCH_NODES } from '../../data/research.js';
import { EVENTS } from '../../data/events.js';
import { COMPONENTS } from '../../data/components.js';
import { VISUAL_FAMILIES } from '../../data/visuals.js';
import { TROPHIES } from '../../data/competitions.js';
import { STAFF } from '../../data/staff.js';
import { SECRETS, SECRET_GROUPS } from '../../data/secrets.js';

// Content that only a secret opens stays out of the normal catalogue.
const SECRET_EVENTS = new Set(['EV20']);
const SECRET_LOOKS = new Set(['V18', 'V19', 'V20']);
const NORMAL_EVENTS = EVENTS.filter((e) => !SECRET_EVENTS.has(e.id)).map((e) => e.id);
const NORMAL_PARTS = Object.values(COMPONENTS).filter((p) => p.unlock?.type !== 'secret').map((p) => p.id);
const NORMAL_LOOKS = VISUAL_FAMILIES.filter((v) => !SECRET_LOOKS.has(v.id)).map((v) => v.id);
const NORMAL_TROPHIES = TROPHIES.filter((t) => !t.secret).map((t) => t.id);
const NORMAL_STAFF = STAFF.filter((s) => !['legendary', 'secret'].includes(s.tier)).map((s) => s.id);

// Has the player ever reached a Year 16 ending (this run, an earlier run, or the achievement for it)?
export function endingSeen(c) {
  return !!c.flags.endingReached || c.achievements.isUnlocked('ACH29') || (c.secrets.accountFact('endings') ?? 0) > 0;
}

export function completionFor(c) {
  c.syncSecretFacts();
  const S = c.secrets;
  const acct = (name) => S.accountFact(name) ?? [];
  const has = (list, ids) => ids.filter((id) => list.includes(id)).length;
  const looks = [...acct('robotFamilies')];
  const catalogue = [
    { id: 'achievements', label: 'Achievements', found: c.achievements.count, total: ACHIEVEMENTS.length, icon: 'ui_icon_19', scope: 'all runs' },
    { id: 'research', label: 'Research topics', found: RESEARCH_NODES.filter((n) => c.research.isDone(n.id)).length, total: RESEARCH_NODES.length, icon: 'ui_icon_04_research', scope: 'this run' },
    { id: 'combos', label: 'Combos', found: ACH23_COMBOS.filter((id) => c.synergyArchive.known(id)).length, total: ACH23_COMBOS.length, icon: 'ui_icon_12', scope: 'all runs' },
    { id: 'parts', label: 'Parts', found: has(acct('partsDiscovered'), NORMAL_PARTS), total: NORMAL_PARTS.length, icon: 'ui_icon_12', scope: 'all runs' },
    { id: 'looks', label: 'Robot looks', found: has(looks, NORMAL_LOOKS), total: NORMAL_LOOKS.length, icon: 'ui_icon_06_robot', scope: 'all runs' },
    { id: 'events', label: 'Events seen', found: has(Object.keys(c.events.state.count ?? {}), NORMAL_EVENTS), total: NORMAL_EVENTS.length, icon: 'ui_icon_29', scope: 'this run' },
    { id: 'trophies', label: 'Trophies', found: has(Object.keys(c.trophies.awarded), NORMAL_TROPHIES), total: NORMAL_TROPHIES.length, icon: 'ui_icon_19', scope: 'this run' },
    { id: 'staff', label: 'Staff hired', found: has(acct('staffEverHired'), NORMAL_STAFF), total: NORMAL_STAFF.length, icon: 'ui_icon_05_staff', scope: 'all runs' },
  ];
  const seen = endingSeen(c);
  // Only worked out once the ending has been seen; before that nothing about secrets leaves this function.
  let discovery = null;
  if (seen) {
    const families = Object.keys(SECRET_GROUPS).map((g) => {
      const list = SECRETS.filter((s) => s.group === g);
      return { id: g, name: SECRET_GROUPS[g], total: list.length, revealed: list.some((s) => S.everUnlocked(s.id) || (S.run.clues[s.id] ?? 0) > 0) };
    });
    discovery = { found: Object.keys(S.account.history).length, families, fullReveal: acct('eventsWon').includes('C12') };
  }
  return completionView({ catalogue, endingSeen: seen, discovery });
}
