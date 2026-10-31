// The three shift templates, wings and Safe Coverage Points (Milestone 7, bible §3, §14). Plain data only; the rules
// are in src/systems/roster.js (who is on when) and src/systems/coverage.js (the points and the four-step fallback).
// Placeholder numbers, logged in docs/DECISIONS.md — tune here. The money side (agency fee, care recovery) is in
// data/balance.js.
//
// SHIFT_TEMPLATES[id]:
//   name · from / to (game hours; Night wraps past midnight) · bands (the day bands whose care tasks it plans — bible §3:
//   Morning = the tail of Night / early morning + the Morning peak, Afternoon = Afternoon / activities + Evening /
//   settling, Night = the Night band)
//   demand     the shift's demand factor: × each resident's Support Level weight = the Safe Coverage Points it needs
//   peaks      its demand profile: the task types (data/tasks.js) that peak on it (shown on the roster sheet)
//   clinical   rn: a Registered Nurse must be on it · onCall: …or an RN on call (the roster's on-call switch for that
//              shift, with an RN on the team) will do while the home is small (data/balance.js ON_CALL)
import { WINGS_SPECIAL } from './wings.js';

export const SHIFT_TEMPLATES = {
  morning: {
    name: 'Morning',
    from: 5,
    to: 12,
    bands: ['morning'],
    demand: 1.0,
    peaks: ['wake', 'meal', 'meds', 'personal'],
    clinical: { rn: true, onCall: false },
  },
  afternoon: {
    name: 'Afternoon',
    from: 12,
    to: 22,
    bands: ['afternoon', 'evening'],
    demand: 0.9,
    peaks: ['activity', 'observation', 'meal', 'settle'],
    clinical: { rn: true, onCall: true }, // (Milestone 10 fix: on call while the home is small — data/balance.js ON_CALL)
  },
  night: {
    name: 'Night',
    from: 22,
    to: 6,
    bands: ['night'],
    demand: 0.4,
    peaks: ['bell', 'roomCheck', 'personal'],
    clinical: { rn: true, onCall: true },
  },
};
export const SHIFT_IDS = Object.keys(SHIFT_TEMPLATES);
export const OFF = 'off'; // the roster's Off column: on the team, on no shift (resting)

// Wings (bible §14 "staff to wings/zones"). One for now; Milestone 24 adds more. rooms: the room ids in it (data/home.js
// ROOM_IDS). A staff member assigned to a wing (and not a float) counts as "assigned to" every resident living in it
// for the task AI's second rule (bible §15).
// Milestone 24: the four specialist wings join it (data/wings.js). Which rooms are in a wing is the layout's (the painted
// tiles): the home world gives the roster that rule; every room not in a specialist wing is in the Home wing.
export const WINGS = [{ id: 'home', name: 'Home', short: 'Home', rooms: 'all' }, ...WINGS_SPECIAL.map((w) => ({ id: w.id, name: w.name, short: w.short, rooms: [] }))]; // (Milestone 10: every room, wherever it is built)
export const DEFAULT_WING = 'home';

// Safe Coverage Points (bible §14).
//   required = Σ residents' supportWeight[Support Level] × the shift's demand
//   provided = Σ on-shift staff: (all five stats + the role's primary stat again) / statsPerPoint × Energy factor
//              Energy factor = energyFloor + (1 − energyFloor) × Energy / 100 (a tired carer still counts for something)
//   bands: the bar's colour — green ≥ good %, amber ≥ amber %, red below. A shift is "under minimum" below minimumPct
//   or when its clinical rule fails.
export const COVERAGE = {
  supportWeight: { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 },
  statsPerPoint: 100,
  energyFloor: 0.5,
  minimumPct: 100,
  good: 100,
  amber: 80,
};

// Energy / Morale on shifts (bible §11 shift preference). Night costs a little Morale an hour unless Night is their
// preference; working the shift they prefer lifts it a little. Off shift they rest in the Staff Room (data/balance.js).
export const SHIFT_MORALE = { nightPerHour: -0.5, preferredPerHour: 0.15 };

// The four-step fallback (bible §14) when a shift is about to start under minimum:
//   1 a warning from the start of the band before the shift's first band (a banner and a red badge on Staff)
//   2 floats on other shifts move to cover, if they are rested (Energy ≥ floatRestedAt) and their own shift doesn't
//     overlap it
//   3 agency cover, hired automatically while the ledger can pay the fee (at most maxAgency a shift)
//   4 still short: admissions pause until the shift ends and the next Cards activity is skipped
export const FALLBACK = {
  floatRestedAt: 60,
  maxAgency: 2,
  minHoursLeft: 2, // a shift already under way when the home opens (or a save loads) with less left than this: no cover
  historyKept: 21, // shift records (7 days)
  logKept: 40,
};

// Agency workers (bible §14: expensive, competent at baseline safety, low Familiar Care, never on records). Generic art
// (the Start candidates' files), tagged AGENCY (so the Milestone 12 art check leaves them out of "no two staff share
// art"). They arrive at the front entrance for their one shift and leave after.
export const AGENCY = {
  RN: { name: 'Agency Nurse', art: 'staff_rn02', tag: 'AGENCY', stats: { CLN: 100, PER: 60, MOB: 60, SOC: 50, NUT: 50 } },
  CW: { name: 'Agency Carer', art: 'staff_cw02', tag: 'AGENCY', stats: { CLN: 55, PER: 105, MOB: 60, SOC: 55, NUT: 55 } },
};

// A new home's roster (the opening team is three: bible §3.5.4): the Registered Nurse and the Care Worker on Morning
// (wake-ups, breakfast, the medicine round), everyone else on Afternoon, nobody on Night. Milestone 10 fix: the nurse on
// call starts on for Night (onCall) and Afternoon (onCallAfternoon), so while the home is small (data/balance.js ON_CALL)
// every shift is safe and no agency is hired unless the player changes something.
export const DEFAULT_ROSTER = { byRole: { RN: 'morning', CW: 'morning' }, others: 'afternoon', onCall: true, onCallAfternoon: true };
