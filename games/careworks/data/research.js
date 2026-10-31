// Research (Milestone 21, bible §26 — 36 visible nodes, §23 / §25 unlock columns, §27 Research Points). Plain data only;
// the rules are in src/systems/research.js on core/ResearchSystem + core/UnlockActions. Placeholder numbers, logged in
// docs/DECISIONS.md. Secret research is not in this file (none exists yet; it stays outside the 36).
//
// A node: id (CLN1 …), branch, tier (1–6), name, cost (RP, §26), days (how long it takes once paid for), requires (node
//   ids: the one before it in its branch, plus a few cross-branch links), text (one plain line), and what it does —
//     unlocks: [{ type: 'program' | 'facility', id }]   what it opens (programs: data/programs.js; facilities: Build Mode)
//     effects: [{ key, value, text }]   small boosts on systems that exist (src/systems/homeWorld.js reads them by key):
//       taskPct.<type>   tasks of that type (data/tasks.js) ease needs value% more
//       roundSafety      medicine-round safety + value points          resolvePct   alert actions resolve value% more often
//       falls            + value on every resident's falls risk          rehabPct     rehab-goal gains + value%
//       memoryPct        life-story / music sessions + value%           familiarPct  Familiar Care builds value% faster
//       activityPct      activity lifts + value%                        mealQuality  meal quality + value points
//       energyPct        Energy used on shift + value% (negative: tire more slowly)
//       meetingPct       family-meeting Trust + value%                  trustPct     every Family Trust gain + value%
//       comfortScore     the end-of-life comfort score + value points (Milestone 27)
//     later: 'Mnn'   stored and shown: its system comes in that milestone ("comes into play later")
export const BRANCHES = [
  { id: 'CLN', name: 'Clinical', icon: 'care_ui_17', colour: '#3E7CB1' },
  { id: 'PER', name: 'Personal Care', icon: 'care_ui_01', colour: '#C0587E' },
  { id: 'MOB', name: 'Mobility', icon: 'care_ui_16', colour: '#4E9A57' },
  { id: 'MEM', name: 'Memory', icon: 'care_ui_12', colour: '#7A5BB0' },
  { id: 'NUT', name: 'Nutrition', icon: 'care_ui_15', colour: '#D07A2B' },
  { id: 'OPS', name: 'Operations', icon: 'care_ui_08', colour: '#5B7387' },
];
export const COSTS = [120, 220, 420, 700, 1050, 1500]; // §26, tier 1–6
export const DAYS = [3, 5, 8, 12, 16, 21]; // research time once paid for, tier 1–6

const fx = (key, value, text) => ({ key, value, text });
const n = (id, name, text, { extra = [], unlocks = [], effects = [], later = null } = {}) => {
  const branch = id.slice(0, 3);
  const tier = Number(id.slice(3));
  const requires = [...(tier > 1 ? [`${branch}${tier - 1}`] : []), ...extra];
  return { id, branch, tier, name, cost: COSTS[tier - 1], days: DAYS[tier - 1], requires, text, unlocks, effects, later };
};

export const RESEARCH = [
  // --- Clinical ---
  n('CLN1', 'Safe Medication', 'Clearer charts and checks on every medicine round', { effects: [fx('roundSafety', 4, 'Medicine-round safety +4')] }),
  n('CLN2', 'Complex Care', 'Planning care for residents with complex clinical needs', { effects: [fx('resolvePct', 8, 'Alert actions settle 8% more often')] }),
  n('CLN3', 'Skin Care Practice', 'Skin checks and gentle skin care done well', // (M18 rule: the bible's name was a diagnosis word)
    { effects: [fx('taskPct.observation', 8, 'Health checks go 8% further')] }),
  n('CLN4', 'Clinical Escalation', 'Knowing when and how to escalate', { effects: [fx('resolvePct', 8, 'Alert actions settle a further 8% more often')] }),
  n('CLN5', 'Palliative Practice', 'Comfort-first care at the end of life', { extra: ['PER4'], effects: [fx('comfortScore', 6, 'End-of-life comfort score +6')] }), // (Milestone 27)
  n('CLN6', 'Advanced Clinical Leadership', 'Clinical leadership across the home', { effects: [fx('roundSafety', 4, 'Medicine-round safety +4'), fx('taskPct.meds', 5, 'Medicine rounds go 5% further')] }),
  // --- Personal care ---
  n('PER1', 'Dignity & Choice', 'Personal care that keeps dignity and choice', { effects: [fx('taskPct.personal', 5, 'Personal care goes 5% further')] }),
  n('PER2', 'Personal Routines', 'Mornings and evenings the way each resident likes', { effects: [fx('taskPct.wake', 8, 'Wake-ups go 8% further'), fx('taskPct.settle', 8, 'Settling goes 8% further')] }),
  n('PER3', 'Memory-Friendly Care', 'Calm, familiar support for memory needs', { effects: [fx('memoryPct', 8, 'Life-story and music sessions go 8% further')] }),
  n('PER4', 'Complex Personal Support', 'Support for residents with high personal needs', { unlocks: [{ type: 'program', id: 'PRG08' }], effects: [fx('taskPct.personal', 5, 'Personal care goes a further 5%')] }),
  n('PER5', 'Familiar Care Teams', 'Small, steady teams around each resident', { effects: [fx('familiarPct', 15, 'Familiar Care builds 15% faster')] }),
  n('PER6', 'Resident-Led Practice', 'Residents shape their own days', { effects: [fx('activityPct', 10, 'Activities lift Mood and connection 10% more')] }),
  // --- Mobility ---
  n('MOB1', 'Safe Transfers', 'Safer moving and handling', { effects: [fx('taskPct.mobility', 5, 'Mobility support goes 5% further')] }),
  n('MOB2', 'Falls Prevention', 'Spotting and reducing fall risks', { unlocks: [{ type: 'program', id: 'PRG04' }], effects: [fx('falls', -3, 'Falls risk −3 for every resident')] }),
  n('MOB3', 'Strength & Balance', 'Exercise that keeps people steady', { effects: [fx('rehabPct', 10, 'Rehab goals move 10% faster')] }),
  n('MOB4', 'Reablement', 'Helping people regain everyday skills', { extra: ['CLN1'], unlocks: [{ type: 'program', id: 'PRG05' }, { type: 'facility', id: 'F19' }] }),
  n('MOB5', 'Rehabilitation Pathways', 'Clear routes home after rehab', { effects: [fx('rehabPct', 10, 'Rehab goals move a further 10% faster')] }),
  n('MOB6', 'Advanced Mobility', 'Expert mobility support across the home', { effects: [fx('falls', -3, 'Falls risk −3 for every resident'), fx('taskPct.mobility', 5, 'Mobility support goes a further 5%')] }),
  // --- Memory ---
  n('MEM1', 'Memory Basics', 'Understanding memory change', { effects: [fx('memoryPct', 5, 'Life-story and music sessions go 5% further')] }),
  n('MEM2', 'Communication Support', 'Gentle ways to talk and listen', { unlocks: [{ type: 'program', id: 'PRG02' }] }),
  n('MEM3', 'Meaningful Activity', 'Activities that mean something to each person', { extra: ['PER3'], unlocks: [{ type: 'facility', id: 'F20' }] }),
  n('MEM4', 'Low-Stimulation Design', 'Calm, quiet spaces', { unlocks: [{ type: 'facility', id: 'F21' }] }),
  n('MEM5', 'Secure Outdoor Living', 'Safe gardens to wander in', { later: 'M24' }),
  n('MEM6', 'Advanced Memory Excellence', 'Memory care at its best', { effects: [fx('memoryPct', 10, 'Life-story and music sessions go a further 10%')] }),
  // --- Nutrition ---
  n('NUT1', 'Hydration Basics', 'Enough to drink, all day', { effects: [fx('taskPct.hydration', 8, 'Drinks rounds go 8% further')] }),
  n('NUT2', 'Dietary Needs', 'Getting each special menu right', { effects: [fx('taskPct.meal', 5, 'Meals go 5% further')] }),
  n('NUT3', 'Texture Modification', 'Soft and modified meals done well', { unlocks: [{ type: 'facility', id: 'F17' }] }),
  n('NUT4', 'Nutrition Support', 'Nutrition plans that work', { unlocks: [{ type: 'program', id: 'PRG07' }] }),
  n('NUT5', 'Dining Experience', 'Mealtimes worth looking forward to', { effects: [fx('mealQuality', 3, 'Meal quality +3')] }),
  n('NUT6', 'Advanced Hospitality', 'A kitchen and dining room at their best', { effects: [fx('mealQuality', 3, 'Meal quality +3')] }),
  // --- Operations ---
  n('OPS1', 'Shift Planning', 'Better rosters and handovers', { effects: [fx('energyPct', -5, 'Staff tire 5% more slowly on shift')] }),
  n('OPS2', 'Family Partnership', 'Families as partners in care', { extra: ['PER1'], unlocks: [{ type: 'program', id: 'PRG06' }], effects: [fx('meetingPct', 5, 'Family meetings lift Trust 5% more')] }),
  n('OPS3', 'Infection Control', 'Fewer outbreaks', { later: 'M25' }),
  n('OPS4', 'Emergency Readiness', 'Plans and practice for when things go wrong', { unlocks: [{ type: 'facility', id: 'F33' }] }),
  n('OPS5', 'Governance & Audit', 'Checking care and learning from it', { effects: [fx('roundSafety', 3, 'Medicine-round safety +3')] }),
  n('OPS6', 'Premier Care Leadership', 'A home families recommend', { effects: [fx('trustPct', 5, 'Every Family Trust gain +5%')] }),
];
export const researchById = (id) => RESEARCH.find((x) => x.id === id) ?? null;
// "Reablement (MOB4)"
export const nodeLabel = (id) => (researchById(id) ? `${researchById(id).name} (${id})` : id);
export const EFFECT_KEYS = ['roundSafety', 'resolvePct', 'falls', 'rehabPct', 'memoryPct', 'familiarPct', 'activityPct', 'mealQuality', 'energyPct', 'meetingPct', 'trustPct', 'comfortScore']; // (Milestone 27: comfortScore)

// Queues (§26): one slot to start. The second opens with the Staff Education Centre (F27) — facility progression. VIP
// (Milestone 36) is only a hook here: an entitlement that can open the second slot, never skip a prerequisite (core
// ResearchSystem checks prerequisites for every start, whichever queue). Nothing sets it yet.
export const VIP = { entitlement: 'vip', milestone: 'M36', queueSlots: 1 };
export const QUEUES = [
  { id: 'q1', name: 'Research' },
  { id: 'q2', name: 'Second research slot', rule: { any: [{ facility: 'F27' }, { vip: true }] }, text: 'Opens with a Staff Education Centre (F27)' },
];

// Research Points (§27: a run currency on the ledger, category 'research'). Only positive care earns them — never
// neglect, never keeping a resident longer.
//   discharge          a successful rehab discharge (M16)
//   compliment         a family compliment (M19)
//   month              the month's close, when Clinical Safety and the residents' average Mood are both at or above
//                      their lines (good care that month)
//   programWeek        each running program, at the end of each week it ran (paid with its weekly cost)
//   facilityWeek       each week while placed: the Training Room, Staff Education Centre, Clinical Governance Office
//   counterRp          an M16–M20 save's stored Research counter (5 a discharge) becomes RP once, at this rate
export const RP_INCOME = {
  discharge: 40,
  compliment: 10,
  month: { rp: 60, clinical: 75, mood: 65 },
  programWeek: 5,
  facilityWeek: { F11: 5, F27: 10, F28: 10 },
  counterRp: 8,
};

// Check the tree (debug builds at start-up, and the Node tests). v = a core/DataValidator.
export function validateResearch(v, { facilities = null, programs = null } = {}) {
  v.uniqueIds('research', RESEARCH);
  v.check(RESEARCH.length === 36, 'research: 36 visible nodes (§26)');
  for (const b of BRANCHES) v.check(RESEARCH.filter((x) => x.branch === b.id).length === 6, `research: six ${b.id} nodes`);
  const ids = new Set(RESEARCH.map((x) => x.id));
  for (const x of RESEARCH) {
    const who = `research ${x.id}`;
    v.check(x.cost === COSTS[x.tier - 1] && x.days === DAYS[x.tier - 1], `${who}: cost / days`);
    v.check(!!x.name && !!x.text, `${who}: name and line`);
    for (const r of x.requires) v.check(ids.has(r), `${who}: requires ${r}`);
    if (x.tier > 1) v.check(x.requires.includes(`${x.branch}${x.tier - 1}`), `${who}: needs the one before it`);
    for (const u of x.unlocks) {
      v.check(['program', 'facility'].includes(u.type), `${who}: unlock type ${u.type}`);
      if (u.type === 'facility' && facilities) v.check(facilities.includes(u.id), `${who}: facility ${u.id}`);
      if (u.type === 'program' && programs) v.check(programs.includes(u.id), `${who}: program ${u.id}`);
    }
    for (const e of x.effects) v.check(EFFECT_KEYS.includes(e.key) || e.key.startsWith('taskPct.'), `${who}: effect ${e.key}`);
    v.check(x.unlocks.length + x.effects.length > 0 || !!x.later, `${who}: does something (or is stored for later)`);
  }
  v.noCycles('research', RESEARCH);
  return v;
}
