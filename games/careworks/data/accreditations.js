// Accreditations C01–C10 (Milestone 26, bible §31). Plain data only; src/systems/quality.js applies the rules.
//
// Each is applied for from Quality → Accreditation once its Rank is reached; an inspection comes INSPECTION.daysOut
// game days later and judges the home on what really happened — its rolling headline scores, its counters and its
// recent history (data/quality.js INSPECTION.history) — never on anything filled in. Pass: the award, its reward, an
// Inbox line and a big beat. Fail: a plain "what fell short" list and a cooldown before applying again; nothing else.
//
// requirement: every entry must hold on the inspection day.
//   { type: 'score', score, min }            a headline score's rolling (one-month) average
//   { type: 'allScores', min }               all five rolling headline scores
//   { type: 'measure', measure, min }        another rolling reading: 'nutrition' (residents' dining satisfaction)
//   { type: 'counter', counter, min, days? } a count from play: 'rehabDischarges' (ever), 'communityEvents' (in `days`)
//   { type: 'program', program, days }       a specialist program running for at least `days` days in a row
//   { type: 'year', min }                    the campaign year
//   { type: 'accreditations', ids }          these accreditations already won
// reward: { reputation, credits (a recognition bonus on the Ledger, bible §27), bonus: { key: value } (added to the home's boosts — the same keys research uses), flags: [...] }
//   flags: 'eliteClue' (Recruit shows how far each Elite condition is), 'reputationBoost' (sustained-score reputation
//   ×1.25), 'finale' (the Year-16 ending's hook — the ending itself comes later)
export const ACCREDITATIONS = [
  {
    id: 'C01', name: 'Local Quality Review', rank: 'E', art: 'care_award_01',
    text: 'The local authority’s first look at how the home is run.',
    requirement: [{ type: 'allScores', min: 55 }],
    reward: { reputation: 200, credits: 500, bonus: {}, flags: [], text: 'Your first accreditation · Reputation +200 · a 500-Credit recognition bonus' },
  },
  {
    id: 'C02', name: 'Resident Choice Recognition', rank: 'D', art: 'care_award_02',
    text: 'Residents living the days they choose.',
    requirement: [{ type: 'score', score: 'residentWellbeing', min: 65 }],
    reward: { reputation: 250, credits: 800, bonus: { activityPct: 5 }, flags: [], text: 'Lifestyle reputation: activities lift residents 5% more · Reputation +250 · an 800-Credit recognition bonus' },
  },
  {
    id: 'C03', name: 'Family Trust Award', rank: 'D', art: 'care_award_03',
    text: 'Families who trust the home with the people they love.',
    requirement: [{ type: 'score', score: 'familyTrust', min: 70 }],
    reward: { reputation: 250, credits: 800, bonus: { meetingPct: 10 }, flags: [], text: 'Family program: care-plan meetings build 10% more Trust · opens Stage 3 with Rank C · Reputation +250 · an 800-Credit recognition bonus' },
  },
  {
    id: 'C04', name: 'Workforce Excellence', rank: 'C', art: 'care_award_04',
    text: 'A team that is well, well trained and stays.',
    requirement: [{ type: 'score', score: 'staffWellbeing', min: 70 }],
    reward: { reputation: 300, credits: 1000, bonus: { energyPct: 5 }, flags: ['eliteClue'], text: 'Elite recruitment clue: Recruit shows how close each Elite condition is · staff Energy lasts 5% longer · Reputation +300 · a 1,000-Credit recognition bonus' },
  },
  {
    id: 'C05', name: 'Safe Care Accreditation', rank: 'C', art: 'care_award_05',
    text: 'Medicines, checks and escalation done safely, day after day.',
    requirement: [{ type: 'score', score: 'clinicalSafety', min: 78 }],
    reward: { reputation: 300, credits: 1000, bonus: { fundingPct: 5 }, flags: [], text: 'Clinical funding bonus: Care Support Funding +5% · Reputation +300 · a 1,000-Credit recognition bonus' },
  },
  {
    id: 'C06', name: 'Dining & Nutrition Award', rank: 'B', art: 'care_award_06',
    text: 'Meals people look forward to, matched to every diet.',
    requirement: [{ type: 'measure', measure: 'nutrition', min: 80 }],
    reward: { reputation: 350, credits: 1200, bonus: { mealQuality: 3 }, flags: [], text: 'Hospitality recognition: meal quality +3 · Reputation +350 · a 1,200-Credit recognition bonus' },
  },
  {
    id: 'C07', name: 'Reablement Excellence', rank: 'B', art: 'care_award_07',
    text: 'Residents back on their feet and home again.',
    requirement: [{ type: 'counter', counter: 'rehabDischarges', min: 3 }],
    reward: { reputation: 350, credits: 1200, bonus: { rehabPct: 10 }, flags: [], text: 'Rehab prestige: rehab progress +10% · Reputation +350 · a 1,200-Credit recognition bonus' },
  },
  {
    id: 'C08', name: 'Memory Support Excellence', rank: 'A', art: 'care_award_08',
    text: 'Calm, familiar days for residents who need memory support.',
    requirement: [{ type: 'program', program: 'PRG02', days: 56 }, { type: 'score', score: 'residentWellbeing', min: 82 }],
    reward: { reputation: 450, credits: 1500, bonus: { memoryPct: 10 }, flags: [], text: 'Memory prestige: memory sessions +10% · Reputation +450 · a 1,500-Credit recognition bonus' },
  },
  {
    id: 'C09', name: 'Community Care Leadership', rank: 'A', art: 'care_award_09',
    text: 'A home at the heart of its community.',
    requirement: [{ type: 'counter', counter: 'communityEvents', min: 4, days: 336 }, { type: 'score', score: 'familyTrust', min: 85 }],
    reward: { reputation: 450, credits: 1500, bonus: {}, flags: ['reputationBoost'], text: 'Global reputation: reputation from sustained scores ×1.25 · Reputation +450 · a 1,500-Credit recognition bonus' },
  },
  {
    id: 'C10', name: 'National Residential Care Excellence', rank: 'S', art: 'care_award_10', finale: true,
    text: 'The national finale: the best care in the country, across everything.',
    requirement: [{ type: 'year', min: 16 }, { type: 'accreditations', ids: ['C01', 'C02', 'C03', 'C04', 'C05', 'C06', 'C07', 'C08', 'C09'] }, { type: 'allScores', min: 85 }],
    reward: { reputation: 800, credits: 3000, bonus: {}, flags: ['finale'], text: 'The Year-16 finale · Reputation +800 (the ending itself comes in a later update) · a 3,000-Credit recognition bonus' },
  },
];
// C11 Master Care Circle and C12 Home, Not Hospital Honour are secret (Milestone 31, bible §31): never listed or shown
// until their own secret's unlock flag is set (SEC-COMP-01 → unlock:C11, SEC-COMP-02 → unlock:C12 — src/systems/secrets.js
// unlocked(id)). Then they sit on Quality → Accreditation like the others: applied for at Rank S, judged by a real
// inspection on what really happened, won once (a big beat), never bought.
//   { type: 'facility', ids }        one of these facilities placed (C11: a prestige facility, F34 or F35)
//   { type: 'essentialClean', days } no essential care missed in the last `days` days (C12: three months, 84 days)
//   reward.prestige: Prestige Tokens (once per device, keyed by the award, like a secret's tokens)
//   reward.accolade: a recognition the home keeps (data/secrets.js RECOGNITIONS)
//   reward.beat: the big beat's line (neither has a Credits bonus)
export const PRESTIGE_ACCREDITATIONS = [
  {
    id: 'C11', name: 'Master Care Circle', rank: 'S', art: 'care_award_11', secret: true, unlockFlag: 'C11',
    text: 'The circle of homes that hold the national honour and keep a prestige space of their own.',
    requirement: [{ type: 'accreditations', ids: ['C10'] }, { type: 'facility', ids: ['F34', 'F35'] }],
    reward: { reputation: 600, credits: 0, prestige: 3, bonus: {}, flags: [], text: '3 Prestige Tokens (once on this device) · Reputation +600', beat: 'Awarded · 3 Prestige Tokens · Reputation +600' },
  },
  {
    id: 'C12', name: 'Home, Not Hospital Honour', rank: 'S', art: 'care_award_12', secret: true, unlockFlag: 'C12',
    text: 'The ultimate care recognition: clinical care that is safe, and a life that feels like home.',
    requirement: [{ type: 'score', score: 'clinicalSafety', min: 95 }, { type: 'score', score: 'residentWellbeing', min: 95 }, { type: 'essentialClean', days: 84 }],
    reward: { reputation: 1000, credits: 0, accolade: 'homeNotHospital', bonus: {}, flags: [], text: 'The ultimate care recognition: the Home, Not Hospital accolade · Reputation +1,000', beat: 'The ultimate care recognition · Reputation +1,000' },
  },
];
export const SECRET_ACCREDITATIONS = PRESTIGE_ACCREDITATIONS.map((a) => a.id);
export const ALL_ACCREDITATIONS = [...ACCREDITATIONS, ...PRESTIGE_ACCREDITATIONS];
export const accreditationById = (id) => ALL_ACCREDITATIONS.find((a) => a.id === id) ?? null;

export const COUNTER_NAMES = { rehabDischarges: 'successful rehab discharges', communityEvents: 'community events held' };
export const MEASURE_NAMES = { nutrition: 'Nutrition (dining satisfaction)' };
export const REQUIREMENT_TYPES = ['score', 'allScores', 'measure', 'counter', 'program', 'year', 'accreditations', 'facility', 'essentialClean'];

export function validateAccreditations(v, { scoreIds, programIds, rankIds }) {
  v.check(ACCREDITATIONS.length === 10, 'accreditations: C01–C10 (C11 / C12 stay secret)');
  ACCREDITATIONS.forEach((a, i) => {
    const who = `accreditation ${a.id}`;
    v.check(a.id === `C${String(i + 1).padStart(2, '0')}`, `${who}: in order`);
    v.check(rankIds.includes(a.rank), `${who}: rank`);
    v.check(a.art === `care_award_${a.id.slice(1)}`, `${who}: art`);
    v.check(a.requirement.length > 0, `${who}: a requirement`);
    for (const r of a.requirement) {
      v.check(REQUIREMENT_TYPES.includes(r.type), `${who}: requirement type ${r.type}`);
      if (r.type === 'score') v.check(scoreIds.includes(r.score), `${who}: score ${r.score}`);
      if (r.type === 'program') v.check(programIds.includes(r.program), `${who}: program ${r.program}`);
      if (r.type === 'counter') v.check(r.counter in COUNTER_NAMES, `${who}: counter ${r.counter}`);
      if (r.type === 'measure') v.check(r.measure in MEASURE_NAMES, `${who}: measure ${r.measure}`);
    }
    v.check(Number.isFinite(a.reward.reputation) && !!a.reward.text, `${who}: reward`);
  });
  // (Milestone 31) the two prestige recognitions: secret, opened only by their own unlock flag
  PRESTIGE_ACCREDITATIONS.forEach((a, i) => {
    const who = `accreditation ${a.id}`;
    v.check(a.id === `C${11 + i}` && a.secret && a.unlockFlag === a.id, `${who}: secret, opened by unlock:${a.id}`);
    v.check(a.art === `care_award_${a.id.slice(1)}` && rankIds.includes(a.rank), `${who}: art, rank`);
    for (const r of a.requirement) v.check(REQUIREMENT_TYPES.includes(r.type), `${who}: requirement type ${r.type}`);
    v.check(Number.isFinite(a.reward.reputation) && !!a.reward.text && !!a.reward.beat, `${who}: reward`);
  });
  return v;
}
