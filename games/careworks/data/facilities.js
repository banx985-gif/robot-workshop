// The 35 facilities of bible §25 (Milestone 9 filed their ids; Milestone 10 fills in each data contract). Plain data
// only; the rules are in src/systems/homeLayout.js (placement, access, money) and the effects are summed by
// core/FacilitySystem (total(key)).
//
// A facility row:
//   id, name, role (the §25 station role), unlock { type, value, text } — start: buildable from day one; rank / research
//   / wing / program / score: that system comes later, so it stays locked with the reason shown; secret: an SEC-FAC
//   reward, never listed anywhere (F34 Centenarian Garden, F35 Legacy House)
//   cost (Credits), effect { key, value, text } (the §25 effect as data, one plain line; stored and shown — only the ones
//   earlier milestones built are live: wired — Milestone 15 wires F04, F16 and F17 in src/systems/dining.js), w / h (footprint in tiles; every picture is drawn at one scale, 3 × 3),
//   art (facilities/facility_fNN.png)
//   essential   the home can't run without one (the task AI and routine use it): the last one can't be sold
//   spots       named tiles relative to the footprint's back corner (they move with it): staff posts, seats (the
//               resident's seat), help1–6 (helpers beside a seated resident), rest1–5 (off-shift rest)
//   seats       the spot names of its resident seats, in order (seat 1 first)
//   text        the line on its sheet (what it is for)
const f = (id, name, role, unlock, cost, effect, extra = {}) => ({ id, name, role, unlock, cost, effect, w: 3, h: 3, art: `facility_${id.toLowerCase()}`, secret: unlock.type === 'secret', ...extra });
const start = { type: 'start', text: 'Available from the start' };
const rank = (r) => ({ type: 'rank', value: r, text: `Needs Rank ${r}` });
// (Milestone 21: node — the research node that opens it, data/research.js)
const research = (branch, level, node, name) => ({ type: 'research', value: `${branch} ${level}`, node, text: `Needs research: ${name} (${node})` });
const fx = (key, value, text, wired = false) => ({ key, value, text, wired });

export const FACILITIES = [
  f('F01', 'Central Nurse Station', 'Thinker', start, 1800, fx('shiftCoordinationPct', 8, 'Shift coordination +8%', true), {
    essential: true, text: 'Coordinates shifts, care rounds and handovers',
    spots: { staff: { col: 1, row: 3 } },
  }),
  f('F02', 'Medication Room', 'Specialist', start, 1600, fx('medicationSafetyPct', 8, 'Medication round safety +8%', true), { text: 'Where medicines are kept and rounds are prepared' }),
  f('F03', 'Dining Room', 'Showcase', start, 1500, fx('diningSatisfaction', 6, 'Dining satisfaction +6', true), {
    essential: true, text: 'Shared meals at the table, with a choice of seats',
    spots: {
      dining: { col: 0, row: 3 }, seat2: { col: 1, row: 3 }, seat3: { col: 2, row: 3 }, seat4: { col: 3, row: 2 },
      help1: { col: 0, row: 4 }, help2: { col: 1, row: 4 }, help3: { col: 2, row: 4 }, help4: { col: 3, row: 3 }, help5: { col: -1, row: 3 }, help6: { col: 3, row: 4 },
    },
    seats: ['dining', 'seat2', 'seat3', 'seat4'],
  }),
  f('F04', 'Kitchen', 'Maker', start, 1900, fx('mealQualityPct', 8, 'Meal quality +8%', true), { text: 'Cooks every meal the home serves' }),
  f('F05', 'Activity Lounge', 'Rest/Lifestyle', start, 1400, fx('groupActivityCapacity', 8, 'Group activity capacity +8', true), {
    essential: true, text: 'Group activities and a comfortable place to relax',
    spots: {
      resident: { col: 0, row: 3 }, seat2: { col: 1, row: 3 }, seat3: { col: 2, row: 3 }, seat4: { col: 3, row: 2 }, staff: { col: 3, row: 1 },
      help1: { col: 0, row: 4 }, help2: { col: 1, row: 4 }, help3: { col: 2, row: 4 }, help4: { col: 3, row: 3 }, help5: { col: -1, row: 3 }, help6: { col: 3, row: 4 },
    },
    seats: ['resident', 'seat2', 'seat3', 'seat4'],
  }),
  f('F06', 'Quiet Lounge', 'Rest', start, 1200, fx('moodRecoveryPct', 6, 'Mood recovery +6%'), { text: 'A calm room to sit and read' }),
  f('F07', 'Basic Physio Space', 'Specialist', start, 1500, fx('mobilityWorkPct', 8, 'Mobility work +8%', true), { text: 'Simple exercise and walking practice' }),
  f('F08', 'Staff Room', 'Rest', start, 1000, fx('staffEnergyRecoveryPct', 20, 'Staff Energy recovery +20%', true), {
    essential: true, text: 'Where staff rest and recover between shifts',
    spots: { rest: { col: 3, row: 1 }, rest1: { col: 3, row: 1 }, rest2: { col: 3, row: 0 }, rest3: { col: 3, row: 2 }, rest4: { col: 4, row: 1 }, rest5: { col: 4, row: 2 } },
  }),
  f('F09', 'Reception / Family Desk', 'Front desk', start, 1100, fx('familyMeetings', 1, 'Admissions and family meetings', true), { text: 'Welcomes families and new residents' }),
  f('F10', 'Laundry / Linen Point', 'Support', start, 1200, fx('roomRoutinePct', 5, 'Room routine efficiency +5%'), { text: 'Fresh linen and clothes for every room' }),
  f('F11', 'Training Room', 'Rest/Training', rank('D'), 1800, fx('staffCourses', 1, 'Unlocks staff courses', true), {
    text: 'Courses and practice for the team',
    spots: { trainee1: { col: 0, row: 3 }, trainee2: { col: 2, row: 3 } }, // (Milestone 11: where trainees sit)
  }),
  f('F12', 'Hair & Grooming Salon', 'Lifestyle', rank('D'), 1600, fx('dignityMoodEvent', 1, 'Dignity and mood event bonus'), { text: 'A proper hairdo and a chat' }),
  f('F13', 'Library Corner', 'Lifestyle', rank('D'), 1200, fx('quietInterest', 6, 'Quiet-interest satisfaction +6'), { text: 'Books, papers and a good chair' }),
  f('F14', 'Courtyard Garden', 'Lifestyle', rank('D'), 2200, fx('outdoorMood', 8, 'Outdoor mood +8'), { text: 'Fresh air, flowers and a bench in the sun' }),
  f('F15', 'Family Room', 'Front desk', rank('C'), 1700, fx('familyTrustMeetingPct', 8, 'Family Trust meeting bonus +8%', true), { text: 'A private room for family visits' }),
  f('F16', 'Commercial Kitchen', 'Maker', rank('C'), 5200, fx('mealProductionPct', 15, 'Meal production +15%; diet plans', true), { text: 'A bigger kitchen for a bigger home' }),
  f('F17', 'Nutrition Office', 'Specialist', research('Nutrition', 3, 'NUT3', 'Texture Modification'), 4600, fx('nutritionOutcomes', 10, 'Nutrition outcomes +10', true), { text: 'Plans special diets and monitors meals' }),
  f('F18', 'Rehabilitation Gym', 'Specialist', rank('C'), 5800, fx('rehabMobilityPct', 15, 'Rehab / mobility +15%', true), { text: 'Equipment for getting back on your feet' }),
  f('F19', 'Falls Prevention Lab', 'Specialist', research('Mobility', 4, 'MOB4', 'Reablement'), 5200, fx('fallsRiskReductionPct', 12, 'Falls risk reduction +12%', true), { text: 'Balance checks and safer walking' }),
  f('F20', 'Memory Activity Room', 'Lifestyle', research('Memory', 3, 'MEM3', 'Meaningful Activity'), 5000, fx('memoryActivitiesPct', 15, 'Memory-care activities +15%', true), { text: 'Familiar things and gentle activities' }),
  f('F21', 'Sensory Room', 'Lifestyle', research('Memory', 4, 'MEM4', 'Low-Stimulation Design'), 5400, fx('lowStimulationComfort', 12, 'Low-stimulation comfort +12', true), { text: 'Soft light and calm sounds' }),
  f('F22', 'Memory Garden', 'Lifestyle', { type: 'wing', value: 'memory', text: 'Needs the Memory Wing' }, 6200, fx('secureOutdoorMemory', 15, 'Secure outdoor memory support +15', true), { text: 'A safe garden to wander' }),
  f('F23', 'Clinical Treatment Room', 'Specialist', rank('B'), 6000, fx('complexClinicalPct', 12, 'Complex clinical tasks +12%', true), { text: 'Care that would otherwise need a hospital trip' }),
  f('F24', 'Palliative Family Lounge', 'Front desk', { type: 'program', value: 'Palliative 3', text: 'Needs the Palliative program at level 3' }, 5600, fx('endOfLifeFamilySupport', 15, 'End-of-life family support +15'), { text: 'Somewhere quiet for families to stay close' }),
  f('F25', 'Community Day Room', 'Lifestyle', rank('B'), 5800, fx('communityEventSlots', 1, 'Community / volunteer events +1 slot'), { text: 'Volunteers, clubs and visitors' }),
  f('F26', 'Transport Bay', 'Support', rank('B'), 7000, fx('outings', 1, 'Unlocks outings and the resident bus'), { text: 'The minibus for trips out' }),
  f('F27', 'Staff Education Centre', 'Training', rank('B'), 6500, fx('advancedTrainingSpeedPct', 15, 'Advanced training speed +15%'), { text: 'Longer courses for experienced staff' }),
  f('F28', 'Clinical Governance Office', 'Thinker', rank('A'), 7200, fx('safetyCompliancePct', 10, 'Safety / compliance +10%', true), { text: 'Keeps care safe and well recorded' }),
  f('F29', 'Family Partnership Centre', 'Front desk', rank('A'), 6800, fx('familyTrustPct', 12, 'Family Trust +12%', true), { text: 'Families as partners in care' }),
  f('F30', 'High-Care Nursing Wing Hub', 'Maker', rank('A'), 9000, fx('highCareWing', 1, 'Unlocks the High-Care wing'), { text: 'The heart of a high-care wing' }),
  f('F31', 'Rehabilitation Wing Hub', 'Maker', rank('A'), 8800, fx('rehabWing', 1, 'Unlocks Rehab wing expansion'), { text: 'The heart of a rehabilitation wing' }),
  f('F32', 'Palliative Care Wing Hub', 'Maker', rank('A'), 9000, fx('palliativeWing', 1, 'Unlocks the Palliative wing'), { text: 'The heart of a palliative wing' }),
  f('F33', 'Emergency Preparedness Hub', 'Thinker', research('Safety', 5, 'OPS4', 'Emergency Readiness'), 7600, fx('emergencySeverityPct', -15, 'Emergency severity −15%', true), { text: 'Plans and kit for when things go wrong' }),
  // (Milestone 31: the two prestige spaces — on the Build list only once their secret's unlock flag is set, `flag`)
  f('F34', 'Centenarian Garden', 'Secret', { type: 'secret', value: 'SEC-FAC-01', flag: 'F34', text: 'A secret: the Centenarian Garden' }, 12000, fx('prestigeWellbeingPct', 20, 'Prestige wellbeing programs +20%', true), { text: 'A beautiful garden for long lives: the prestige programs do more' }),
  f('F35', 'Legacy House', 'Secret', { type: 'secret', value: 'SEC-FAC-02', flag: 'F35', text: 'A secret: Legacy House' }, 15000, fx('prestigeStoryHub', 1, 'Story and Familiar Care hub: life-story time and Familiar Care +25% for residents who use it', true), { text: 'A house of stories: photographs, keepsakes and the people who know them' }),
];
export const facilityById = (id) => FACILITIES.find((x) => x.id === id) ?? null;
// What Build Mode always lists (the secret two never appear, not even greyed, until their flag is set — Milestone 31).
export const BUILDABLE_FACILITIES = FACILITIES.filter((x) => !x.secret);
export const PRESTIGE_FACILITIES = FACILITIES.filter((x) => x.secret);
// (Milestone 31) F35 Legacy House: a resident "uses" it by joining life-story time (a group session or a one-to-one)
// while it stands; for `days` after, their life-story sessions lift × storyMult and the Familiar Care they build with
// the team × familiarMult (each × its level, as other facility bonuses). Placeholder numbers, logged in DECISIONS.
export const LEGACY_HOUSE = { facility: 'F35', days: 28, storyMult: 1.25, familiarMult: 1.25 };

// Check the list. v = a core/DataValidator.
export function validateFacilities(v, list = FACILITIES) {
  v.uniqueIds('facilities', list);
  v.check(list.length === 35, '35 facilities (bible §25)');
  for (const x of list) {
    const who = `facility ${x.id}`;
    v.check(/^F\d{2}$/.test(x.id), `${who}: id must be Fnn`);
    for (const k of ['name', 'role', 'art', 'text']) v.check(typeof x[k] === 'string' && x[k].length > 0, `${who}: ${k} missing`);
    v.check(x.art === `facility_${x.id.toLowerCase()}`, `${who}: art must be facility_${x.id.toLowerCase()}`);
    v.check(['start', 'rank', 'research', 'wing', 'program', 'score', 'secret'].includes(x.unlock?.type) && !!x.unlock.text, `${who}: unlock { type, text }`);
    v.check(Number.isInteger(x.cost) && x.cost > 0, `${who}: cost`);
    v.check(typeof x.effect?.key === 'string' && typeof x.effect.value === 'number' && !!x.effect.text, `${who}: effect { key, value, text }`);
    v.check(Number.isInteger(x.w) && Number.isInteger(x.h) && x.w > 0 && x.h > 0, `${who}: footprint`);
    v.check(x.secret === (x.id === 'F34' || x.id === 'F35'), `${who}: only F34 / F35 are secret`);
    for (const s of x.seats ?? []) v.check(!!x.spots?.[s], `${who}: seat ${s} has no spot`);
  }
  return v;
}

// Milestone 25c — facility levels 1–3 (series common feature §3) on core/FacilitySystem's levels (one level per placed
// piece: a move keeps it, a sale takes it away; the sale pays 50% of the build price AND of what its upgrades cost).
// Every visible facility and every room type can go to Level II and III with Credits. A level multiplies the piece's
// bonus (the part it adds, never the base): ×1.0 / ×1.5 / ×2.0 by default, or the facility's own levelMult below.
//   rank: the Rank each level needs (ranks arrive in Milestone 26; ?debug=1's "Unlock all rooms and facilities" lets
//     them through) · costPct: of the build price · days: game days to finish (the home keeps running and the piece
//     works at its old level meanwhile; a small scaffold shows on it)
// unscaled: pieces whose effect is an unlock or not yet a number in the game — their level is kept and shown, and
// multiplies the effect once its system exists (the sheet says so).
export const LEVELS = {
  max: 3,
  mult: [1, 1.5, 2],
  rank: [null, 'D', 'C'],
  costPct: [0, 0.6, 1],
  days: [0, 3, 5],
  names: ['I', 'II', 'III'],
  levelMult: {}, // (per-facility override, e.g. F08: [1, 1.25, 1.5]; none yet)
  unscaled: ['F01', 'F05', 'F06', 'F09', 'F10', 'F11', 'F12', 'F13', 'F14', 'F24', 'F25', 'F26', 'F27', 'F30', 'F31', 'F32', 'RM01', 'RM02', 'RM04', 'RM07'],
};
// What Level n costs for a piece (50-Credit steps), and its multiplier.
export const upgradeCost = (buildCost, level) => Math.round((buildCost * (LEVELS.costPct[level - 1] ?? 0)) / 50) * 50;
export const levelMultOf = (defId, level) => (LEVELS.levelMult[defId] ?? LEVELS.mult)[Math.max(1, level) - 1] ?? 1;
// The bonus part scaled: 1 + (base − 1) × m for a multiplier (1.15 → 1.225 at ×1.5), and the same for a reduction
// (0.85 → 0.775).
export const scaleBonus = (base, m) => 1 + (base - 1) * m;
