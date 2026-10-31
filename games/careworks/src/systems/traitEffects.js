// Trait effects (Milestone 12, bible §11 / §12). Each trait in data/staff.js TRAITS either has small live effects on
// hooks the game already has, or waits for a later milestone's system (pendingSystem: a no-op here). Pure functions on a
// person's trait ids, so the task AI, the crew's Energy / Morale and Familiar Care read them the same way.
//   taskPct(traits, type)      % more of the needs a task of this type eases when they help ('task')
//   matchesTask(traits, type)  a specialty-like tip in the task AI ('match')
//   energyPct(traits, shift)   % change to the Energy they use on shift ('energy'; only on its shift, if it names one)
//   moralePerHour(traits)      Morale they gain an hour while working ('morale')
//   familiarPct(traits)        % faster Familiar Care ('familiar')
//   shiftPct(traits)           % more Morale from working their preferred shift ('shift')
//   dietSkillsOf(traits) → Set of diets · dietPct(traits, diet) · diningPct(traits)   Milestone 15 ('diet', 'dining')
//   activityPct(traits, activityId, { event, outcome })   Milestone 20 ('activity')
//   isLive(id) · pendingOf(id) → 'Mnn' | null
import { TRAITS } from '../../data/staff.js';

const effectsOf = (traits, kind) => (traits ?? []).flatMap((id) => (TRAITS[id]?.live ?? []).filter((fx) => fx.kind === kind));
const sum = (list, key) => list.reduce((a, fx) => a + (fx[key] ?? 0), 0);

export const taskPct = (traits, type) => sum(effectsOf(traits, 'task').filter((fx) => fx.types.includes(type)), 'pct');
export const matchesTask = (traits, type) => effectsOf(traits, 'match').some((fx) => fx.types.includes(type));
export const energyPct = (traits, shift) => sum(effectsOf(traits, 'energy').filter((fx) => !fx.shift || fx.shift === shift), 'pct');
export const moralePerHour = (traits) => sum(effectsOf(traits, 'morale'), 'perHour');
export const familiarPct = (traits) => sum(effectsOf(traits, 'familiar'), 'pct');
export const shiftPct = (traits) => sum(effectsOf(traits, 'shift'), 'pct');
// Milestone 15: the special menus they can make ('diet'), the satisfaction bonus when they cook one, the dining lift
export const dietSkillsOf = (traits) => new Set(effectsOf(traits, 'diet').flatMap((fx) => fx.diets));
export const dietPct = (traits, diet) => sum(effectsOf(traits, 'diet').filter((fx) => fx.diets.includes(diet)), 'pct');
export const diningPct = (traits) => sum(effectsOf(traits, 'dining'), 'pct');
// Milestone 16: % more on a rehab goal in a session they lead ('rehab')
export const rehabPct = (traits, goal) => sum(effectsOf(traits, 'rehab').filter((fx) => !fx.goals || fx.goals.includes(goal)), 'pct');
// Milestone 17: % further with a memory-support resident ('memory')
export const memoryPct = (traits) => sum(effectsOf(traits, 'memory'), 'pct');
// Milestone 18: % on complex residents' round safety and on their assessments / senior reviews ('clinical')
export const clinicalPct = (traits) => sum(effectsOf(traits, 'clinical'), 'pct');
// Milestone 19: % better visits (on shift) and family meetings (attending) ('family')
export const familyPct = (traits) => sum(effectsOf(traits, 'family'), 'pct');
// Milestone 20: % more on a session of this activity (or a community event), for this outcome ('activity')
export const activityPct = (traits, activityId, { event = false, outcome = null } = {}) => sum(effectsOf(traits, 'activity').filter((fx) => (fx.activities?.includes(activityId) || (event && fx.events)) && (!fx.outcomes || !outcome || fx.outcomes.includes(outcome))), 'pct');
export const isLive = (id) => !!TRAITS[id]?.live;
export const pendingOf = (id) => TRAITS[id]?.pendingSystem ?? null;
