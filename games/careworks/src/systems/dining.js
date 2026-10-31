// Nutrition and dining (Milestone 15, bible §19): meal quality, diet matching, favourite foods, dining satisfaction and
// the weekly menu. Pure rules on plain state, so the Node tests use them as they are; the home world
// (src/systems/homeWorld.js) runs the services (kitchen prep, serving at the seats, trays, drinks rounds) and calls these.
// Nothing clinical: diets are simple menu tags from the Nutrition plan option; no calories, nutrients or doses.
//
// The run's dining state (care.dining, saved with the care state):
//   { rota: [{ main, pudding }] (7 days, Mon–Sun), meals: { 'day:mealId': meal record }, served: { day: n } }
//   a meal record: { day, meal, prep: { status: 'waiting' | 'cooking' | 'done' | 'late' | 'unprepped' | 'noKitchen' |
//     'noStaff', by, doneAt, task }, kitchen, served, trays, late, mismatched, favourites, byCare, qualitySum, satSum }
// A resident's dining state (st.dining): { avg, n, last: { day, meal, sat, quality, reason }, favDay }, their last drink
// (st.hydration: { last: absolute game hour }).
//
//   dietOf(st) → diet id · favouritesOf(def, st?) → [dish ids]
//   skillsOf({ traits, specialties }) → Set of diets they can make
//   canMake(diet, { office, onShift: [{ role, skills }] }) → true | false
//   mealQuality({ kitchen, prep, cook, hospitalityOn, program }) → { quality, parts }   (Milestone 20: program)
//   satisfaction({ quality, … }) → { sat, parts, reason }
//   nutritionMult(sat, office) · moodFrom(sat)
//   createDining({ care }) → the rota / meal records controller
import { Rng } from '../../../../core/Rng.js';
import { DIETS, dietOfOption, TAG_DISHES, FAVOURITES, DEFAULT_ROTA, dishById, KITCHENS, QUALITY, SATISFACTION, SAT_REASONS, MEALS } from '../../data/dining.js';
import { dietSkillsOf, taskPct } from './traitEffects.js';

const clamp = (x) => Math.max(0, Math.min(100, x));
const SPECIAL = Object.keys(DIETS).filter((d) => DIETS[d].needs);

// --- diets and favourites ---------------------------------------------------------------------------------------------
// Their diet: from their Nutrition plan option (a refused option: the standard menu).
export function dietOf(st) {
  const opt = st?.plan?.NU;
  if (!opt || st?.optionPrefs?.[opt] === 'refuse') return 'standard';
  return dietOfOption(opt);
}
// One or two favourite dishes from their life-story tags, picked from their id (the same in every run).
const favCache = new Map();
export function favouritesOf(def, st = null) {
  const tags = st?.tags ?? def?.tags ?? [];
  const key = `${def?.id}:${tags.join()}`;
  if (favCache.has(key)) return favCache.get(key);
  const pool = [...new Set(tags.flatMap((t) => TAG_DISHES[t] ?? []))];
  const rng = new Rng(`favourites:${def?.id}`);
  const n = Math.min(pool.length, FAVOURITES.min + Math.floor(rng.next() * (FAVOURITES.max - FAVOURITES.min + 1)));
  const out = [];
  while (out.length < n) {
    const left = pool.filter((d) => !out.includes(d));
    out.push(left[Math.floor(rng.next() * left.length)]);
  }
  favCache.set(key, out);
  return out;
}
// The special menus someone can make: their diet traits, and every one with the Nutrition specialty.
export function skillsOf({ traits = [], specialties = [] } = {}) {
  const out = dietSkillsOf(traits);
  if (specialties.includes('nutrition')) for (const d of SPECIAL) out.add(d);
  return out;
}
// Can the home make this menu now? office: a Nutrition Office (F17) is placed; onShift: [{ role, skills }] (a Nutrition
// specialist counts as Hospitality — data/training.js standsInFor).
export function canMake(diet, { office = false, onShift = [] } = {}) {
  const need = DIETS[diet]?.needs;
  if (!need || office) return true;
  const hosp = onShift.filter((q) => q.role === 'HN' || q.skills?.size);
  if (need === 'hospitality') return hosp.length > 0;
  return hosp.some((q) => q.skills?.has(diet));
}
export const dietWords = (diet) => DIETS[diet]?.menu ?? DIETS.standard.menu;

// --- meal quality -----------------------------------------------------------------------------------------------------
// kitchen: 'F16' | 'F04' | null · prep: 'onTime' | 'late' | 'none' · cook: { nut, traits } | null (who prepped it) ·
// hospitalityOn: a Hospitality worker is on shift (else care staff serve).
// (Milestone 20: program — Nutrition Plus's quality points when it runs, 0 otherwise)
// (Milestone 21: research — the home's research quality points, 0 otherwise)
export function mealQuality({ kitchen = null, prep = 'none', cook = null, hospitalityOn = true, program = 0, research = 0, incident = 0, kitchenMult = 1 }) {
  const parts = { base: QUALITY.base };
  parts.kitchen = kitchen ? KITCHENS[kitchen].quality * kitchenMult : QUALITY.noKitchen; // (Milestone 25c: × the kitchen's level)
  parts.prep = kitchen ? QUALITY.prep[prep] ?? 0 : 0;
  parts.cook = cook ? Math.min(QUALITY.nutMax, Math.max(0, (cook.nut - QUALITY.nutFrom) / QUALITY.nutPer)) + taskPct(cook.traits, 'meal') : 0;
  parts.serve = hospitalityOn ? 0 : QUALITY.careStaffServe;
  if (program) parts.program = program;
  if (research) parts.research = research;
  if (incident) parts.incident = incident; // (Milestone 25: a storm or water issue keeps meals simple)
  const quality = clamp(Object.values(parts).reduce((a, v) => a + v, 0));
  return { quality: Math.round(quality * 10) / 10, parts };
}

// --- dining satisfaction ----------------------------------------------------------------------------------------------
//   quality · mismatch (their menu couldn't be made) · dietPct (the cook's diet-trait bonus when it was) · favourite ·
//   boost (NU07) · late · tray · friends (count) · crowded · atmosphere (a Dining Room: true) · host (a Dining Host
//   served) · baking (their own Cooking-club baking on the evening menu)
// → { sat, parts, reason } — reason: the key of their biggest minus (SAT_REASONS), 'none' when there is none
export function satisfaction({ quality, mismatch = false, dietPct = 0, favourite = false, boost = false, late = false, tray = false, friends = 0, crowded = false, atmosphere = true, host = false, baking = false }) {
  const S = SATISFACTION;
  const parts = { quality };
  if (mismatch) parts.mismatch = S.mismatch;
  else if (dietPct) parts.diet = dietPct;
  if (favourite) parts.favourite = S.favourite * (boost ? S.favouriteBoost : 1);
  if (late) parts[tray ? 'lateTray' : 'late'] = S.late;
  if (tray) parts.tray = S.tray;
  else {
    if (atmosphere) parts.atmosphere = S.atmosphere * (atmosphere === true ? 1 : atmosphere); // (Milestone 25c: × the Dining Room's level)
    if (friends) parts.friends = Math.min(S.friendsMax, friends * S.friend);
    if (crowded) parts.crowded = S.crowded;
  }
  if (host) parts.host = S.host;
  if (baking) parts.baking = S.baking;
  const sat = Math.round(clamp(Object.values(parts).reduce((a, v) => a + v, 0)) * 10) / 10;
  const minus = Object.entries(parts).filter(([k, v]) => v < 0 && SAT_REASONS[k]).sort((a, b) => a[1] - b[1])[0];
  const reason = minus ? minus[0] : quality < 50 ? 'quality' : 'none';
  return { sat, parts, reason };
}
// A happy diner eats well: × on the meal's Nutrition drop (never below the drop as before; the Nutrition Office: +10%).
export const nutritionMult = (sat, office = false) => (1 + SATISFACTION.nutritionPer * Math.max(0, sat - SATISFACTION.nutritionFrom)) * (office ? 1 + SATISFACTION.officePct * +office / 100 : 1); // (Milestone 25c: office = its level ×; true = ×1)
export const moodFrom = (sat) => (sat - SATISFACTION.moodFrom) / SATISFACTION.moodPer;
// Their running dining satisfaction after a meal.
export function noteMeal(st, rec) {
  const d = (st.dining ??= { avg: null, n: 0, last: null, favDay: null });
  d.avg = d.avg == null ? rec.sat : Math.round((d.avg + (rec.sat - d.avg) * SATISFACTION.avgPull) * 10) / 10;
  d.n = (d.n ?? 0) + 1;
  d.last = rec;
  return d;
}

// --- the rota and the meal records --------------------------------------------------------------------------------------
const KEEP_DAYS = 6;
export function newDiningState() {
  return { rota: DEFAULT_ROTA.map((d) => ({ ...d })), meals: {}, served: {} };
}
export function ensureDiningState(saved) {
  const fresh = newDiningState();
  if (!saved) return fresh;
  return {
    ...fresh,
    ...saved,
    rota: DEFAULT_ROTA.map((d, i) => {
      const s = saved.rota?.[i] ?? {};
      return { main: dishById(s.main)?.kind === 'main' ? s.main : d.main, pudding: dishById(s.pudding)?.kind === 'pudding' ? s.pudding : d.pudding };
    }),
    meals: Object.fromEntries(Object.entries(saved.meals ?? {}).map(([k, m]) => [k, { ...m, prep: { ...(m.prep ?? {}) } }])),
    served: { ...(saved.served ?? {}) },
  };
}
export function createDining({ care }) {
  care.dining = ensureDiningState(care.dining);
  const S = () => care.dining;
  const dow = (day) => ((day % 7) + 7) % 7;
  const d = {
    get state() {
      return S();
    },
    rota: () => S().rota.map((r) => ({ ...r })),
    menuOn: (day) => ({ ...S().rota[dow(day)] }),
    // Change one dish on the rota (Mon = 0 … Sun = 6; kind 'main' | 'pudding'). → { ok, reason }
    setDish(dayOfWeek, kind, dishId) {
      const dish = dishById(dishId);
      if (!dish || dish.kind !== kind) return { ok: false, reason: 'That dish is not on the list.' };
      if (!(dayOfWeek >= 0 && dayOfWeek < 7)) return { ok: false, reason: 'No such day.' };
      S().rota[dayOfWeek][kind] = dishId;
      return { ok: true, reason: null };
    },
    // Today's dish at a meal (lunch: the main, evening meal: the pudding; breakfast: none).
    dishAt(day, mealId) {
      const kind = MEALS.find((m) => m.id === mealId)?.rota;
      return kind ? S().rota[dow(day)][kind] : null;
    },
    record(day, mealId) {
      const k = `${day}:${mealId}`;
      S().meals[k] ??= { day, meal: mealId, prep: { status: 'waiting', by: null, doneAt: null, task: null }, kitchen: null, served: 0, trays: 0, late: 0, mismatched: 0, favourites: 0, byCare: 0, qualitySum: 0, satSum: 0 };
      return S().meals[k];
    },
    peek: (day, mealId) => S().meals[`${day}:${mealId}`] ?? null,
    // The meals that have been served, newest first.
    recent(n = QUALITY.shown) {
      return Object.values(S().meals).filter((m) => m.served > 0).sort((a, b) => b.day - a.day || MEALS.findIndex((x) => x.id === b.meal) - MEALS.findIndex((x) => x.id === a.meal)).slice(0, n);
    },
    served(day) {
      return S().served[day] ?? 0;
    },
    countServed(day) {
      S().served[day] = (S().served[day] ?? 0) + 1;
    },
    prune(today) {
      for (const k of Object.keys(S().meals)) if (S().meals[k].day < today - KEEP_DAYS) delete S().meals[k];
      for (const k of Object.keys(S().served)) if (Number(k) < today - KEEP_DAYS) delete S().served[k];
    },
  };
  return d;
}
export const avgOf = (rec, key) => (rec.served ? Math.round((rec[key] / rec.served) * 10) / 10 : null);
