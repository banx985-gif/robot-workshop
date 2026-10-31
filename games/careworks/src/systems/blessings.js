// The Works Gods' blessings (Milestone 30b, SERIES_WORKS_GODS.md). Pure reads of who is on the team and on shift: the
// home world asks here where each blessing lands, and the numbers are data/staff.js BLESSINGS. Nothing here changes how
// care is given — no blessing ever lowers care, safety or health, and Havoc's mishaps only ever cost a few Credits or
// give a funny line (tests/careworks/m30b.test.mjs checks it).
//
//   createBlessings({ team, onShift, seed }) → blessings
//     team() → the team (no agency workers) · onShift(staffId) → are they on shift now
//   blessings.has(god) · blessings.onShift(god)              ('bolt' · 'jinx' · 'zip' · 'kaching' · 'havoc')
//   buildCostMult() · buildDaysMult() · environmentBonus()   Bolt (on the team)
//   surpriseMult()                                           Jinx (on the team): the good surprises' chances ×
//   taskRate(staffId) · bellFirst()                          Zip: his own work rate · the call-bell score while he is on
//   partnerMult() · feeMult()                                Kaching (on the team)
//   session(s, key) → { lucky, chaos, mishap }               Jinx's lucky day (a program session on her shift) and
//                                                            Havoc's chaos roll (a program, community event or birthday
//                                                            tea on his shift), rolled once per session (kept on it)
import { Rng } from '../../../../core/Rng.js';
import { GODS, BLESSINGS, MISHAPS } from '../../data/staff.js';

const GOD_BY_ID = Object.fromEntries(GODS.map((g) => [g.id, g.god]));
export const godKeyOf = (staffId) => GOD_BY_ID[staffId] ?? null;

export function createBlessings({ team = () => [], onShift = () => false, seed = 'careworks' } = {}) {
  const here = (key) => team().filter((q) => godKeyOf(q.id) === key);
  const has = (key) => here(key).length > 0;
  const on = (key) => here(key).some((q) => onShift(q.id));
  const B = BLESSINGS;
  return {
    has,
    onShift: on,
    // Bolt
    buildCostMult: () => (has('bolt') ? 1 - B.bolt.buildCostPct / 100 : 1),
    buildDaysMult: () => (has('bolt') ? 1 - B.bolt.buildDaysPct / 100 : 1),
    environmentBonus: () => (has('bolt') ? B.bolt.environment : 0),
    // Jinx
    surpriseMult: () => (has('jinx') ? 1 + B.jinx.surprisePct / 100 : 1),
    // Zip: 20% less time is a work rate of 1 / 0.8
    taskRate: (staffId) => (godKeyOf(staffId) === 'zip' ? 1 / (1 - B.zip.taskTimePct / 100) : 1),
    bellFirst: () => (on('zip') ? B.zip.bellFirst : 0),
    // Kaching
    partnerMult: () => (has('kaching') ? 1 + B.kaching.partnerPct / 100 : 1),
    feeMult: () => (has('kaching') ? 1 + B.kaching.feePct / 100 : 1),
    // Jinx and Havoc on a session: rolled once, on the session's own seeded stream, and kept on the session (so a reload
    // or the next resident to join gets the same answer). kinds: { program, event, birthday }
    session(s, key, kinds = {}) {
      if (s.blessing) return s.blessing;
      const rng = new Rng(`${seed}:blessing:${key}`);
      const out = { lucky: false, chaos: null, mishap: null };
      if (kinds.program && on('jinx') && rng.next() < B.jinx.luckyChance) out.lucky = true;
      if ((kinds.program || kinds.event || kinds.birthday) && on('havoc')) {
        if (rng.next() < B.havoc.joyChance) out.chaos = 'joy';
        else {
          out.chaos = 'mishap';
          out.mishap = MISHAPS[Math.floor(rng.next() * MISHAPS.length) % MISHAPS.length].id;
        }
      }
      s.blessing = out;
      return out;
    },
  };
}
