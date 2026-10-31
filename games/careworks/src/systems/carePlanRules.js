// Care-plan rules (Milestone 8, bible §9, §6): who may have which option (eligibility, in plain words), a resident's
// preference for an option, the plan review / stale flag, and a new resident's first plan. Pure rules on plain data, so
// the Node tests use them as they are; the home world (src/systems/homeWorld.js) builds the context and calls them.
//
//   eligibilityOf(option, ctx) → { ok, reason }          every rule in option.eligibility must pass; reason = the first
//     ctx = { name, needs, level, support, stay, visitors,             that fails, in plain words
//             teamRoles: Set, shiftRoles: { morning: Set, … }, shiftCounts: { morning: n, … },
//             rooms: Set (room templates the home can place), facilities: Set (placed facility ids), programs: Set,
//             dietSkills: Set (Milestone 15: the special menus someone on the team can make — src/systems/dining.js) }
//   optionPrefOf(st, optionId) → 'prefer' | 'accept' | 'dislike' | 'refuse'
//   staleReasons(st, today) → [{ key: 'first' | 'need' | 'missed' | 'period', text }]   (empty: up to date)
//   markReviewed(st, today) · noteDay(st, day, missedEssential)   (the missed-essential streak)
//   admissionPlan(def, st, ctx) → plan    the first eligible option they don't dislike / refuse, per ADMISSION_PLANS
import { DOMAINS, optionById, REVIEW, ADMISSION_PLANS, DEFAULT_PLAN } from '../../data/carePlans.js';
import { NEEDS } from '../../data/residents.js';

const first = (name) => (name ?? '').split(' ')[0];
const needName = (id) => NEEDS.find((n) => n.id === id)?.name ?? id;

function passes(r, ctx) {
  switch (r.type) {
    case 'roleOnTeam':
      return ctx.teamRoles?.has(r.role);
    case 'roleOnShifts':
      return r.shifts.every((s) => ctx.shiftRoles?.[s]?.has(r.role));
    case 'staffOnShift':
      return (ctx.shiftCounts?.[r.shift] ?? 0) >= r.count;
    case 'need':
      return (ctx.needs?.[r.need] ?? 0) >= r.min;
    case 'supportLevel':
      return (ctx.level ?? 0) >= r.min;
    case 'support':
      return (r.supports ?? []).includes(ctx.support) || (r.stays ?? []).includes(ctx.stay);
    case 'visitors':
      return (r.visitors ?? []).includes(ctx.visitors);
    case 'room':
      return !!ctx.rooms?.has(r.room);
    case 'facility':
      return !!ctx.facilities?.has(r.facility);
    case 'program':
      return !!ctx.programs?.has(r.program);
    case 'dietSkill': // Milestone 15: someone on the team who can make that menu, or a Nutrition Office (F17)
      return !!ctx.facilities?.has('F17') || !!ctx.dietSkills?.has(r.diet);
    case 'endOfLife': // Milestone 27: their care stage is one of these (CL08 / EN08: approaching the end of life)
      return (r.stages ?? []).includes(ctx.eolStage);
    default:
      return false;
  }
}
// The plain-words reason, with the resident's own number where it helps ("… (Betty is at 42)").
function reasonOf(r, ctx) {
  if (r.type === 'need') return `${r.reason} (${first(ctx.name)} is at ${Math.round(ctx.needs?.[r.need] ?? 0)})`;
  if (r.type === 'supportLevel') return `${r.reason} (${first(ctx.name)} is Support Level ${ctx.level})`;
  return r.reason;
}
export function eligibilityOf(option, ctx) {
  const o = typeof option === 'string' ? optionById(option) : option;
  if (!o) return { ok: false, reason: 'No such option.' };
  for (const r of o.eligibility ?? []) if (!passes(r, ctx)) return { ok: false, reason: reasonOf(r, ctx) };
  return { ok: true, reason: null };
}

export const optionPrefOf = (st, optionId) => st?.optionPrefs?.[optionId] ?? 'accept';

// --- plan review --------------------------------------------------------------------------------------------------
// st.review = { day (last review; null: never — a new resident), needs (their needs then), reasons (saved copy) }
// st.missStreak = { days (essential care missed on this many days running), lastDay }
export function staleReasons(st, today) {
  const r = st.review;
  if (!r || r.day == null) return [{ key: 'first', text: 'New resident: first plan review due' }];
  const out = [];
  let worst = null;
  for (const n of NEEDS) {
    const d = Math.abs((st.needs?.[n.id] ?? 0) - (r.needs?.[n.id] ?? st.needs?.[n.id] ?? 0));
    if (d >= REVIEW.needChange && (!worst || d > worst.d)) worst = { id: n.id, d };
  }
  if (worst) out.push({ key: 'need', text: `${needName(worst.id)} has changed by ${Math.round(worst.d)} since the last review` });
  const streak = st.missStreak?.days ?? 0;
  if (streak >= REVIEW.missedStreakDays) out.push({ key: 'missed', text: `Essential care missed ${streak} days running` });
  const since = today - r.day;
  if (since >= REVIEW.periodDays) out.push({ key: 'period', text: `${since} days since the last review` });
  if (r.hospital != null) out.push({ key: 'hospital', text: 'Back from the hospital service: review the plan' }); // (Milestone 18)
  if (r.fall != null) out.push({ key: 'fall', text: 'After a fall: review the plan (falls prevention)' }); // (Milestone 25)
  return out;
}
export function markReviewed(st, today) {
  st.review = { day: today, needs: { ...st.needs }, reasons: [] };
  st.missStreak = { days: 0, lastDay: today - 1 };
}
// At the end of a day: was any of their essential care missed? (a run of days makes the plan stale)
export function noteDay(st, day, missedEssential) {
  const s = st.missStreak ?? { days: 0, lastDay: null };
  if (s.lastDay === day) return;
  st.missStreak = { days: missedEssential ? s.days + 1 : 0, lastDay: day };
}

// --- the first plan on admission ---------------------------------------------------------------------------------------
export function admissionPlan(def, st, ctx) {
  const table = ADMISSION_PLANS[def.support] ?? {};
  const plan = { ...DEFAULT_PLAN };
  for (const d of DOMAINS) {
    for (const id of table[d.id] ?? []) {
      const pref = optionPrefOf(st, id);
      if (pref === 'dislike' || pref === 'refuse') continue;
      if (eligibilityOf(id, ctx).ok) {
        plan[d.id] = id;
        break;
      }
    }
  }
  return plan;
}
