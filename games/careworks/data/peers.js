// Peer homes R01–R07 (Milestone 26, bible §32): the benchmark network. Plain data only; src/systems/quality.js moves
// them. A peer is a yardstick only — it never takes residents, staff or funding from the home (bible §32: no predatory
// competition). Each appears at the start of its year with five benchmark scores (the same five as the home's), which
// drift once a month, seeded: up in its strong areas (to a ceiling), a little either way elsewhere.
// R08 Legacy House Network is secret (Milestone 31): PRESTIGE_PEERS below.
//   base: the five scores on arrival (clinicalSafety, residentWellbeing, familyTrust, staffWellbeing, environment)
//   strong: the scores that drift up
export const PEERS = [
  { id: 'R01', name: 'Willow Grove', identity: 'Warm community home', strength: 'Lifestyle / Family', year: 1, logo: 'peer_logo_r01', strong: ['residentWellbeing', 'familyTrust'], base: [58, 64, 66, 60, 58] },
  { id: 'R02', name: 'Silver Pines', identity: 'Efficient residential care', strength: 'Operations', year: 2, logo: 'peer_logo_r02', strong: ['environment', 'staffWellbeing'], base: [62, 58, 58, 64, 66] },
  { id: 'R03', name: 'Harbour View Care', identity: 'Premium rooms and dining', strength: 'Hospitality', year: 3, logo: 'peer_logo_r03', strong: ['residentWellbeing', 'environment'], base: [64, 68, 64, 62, 70] },
  { id: 'R04', name: 'Meadow House', identity: 'Rehabilitation', strength: 'Mobility', year: 5, logo: 'peer_logo_r04', strong: ['clinicalSafety', 'residentWellbeing'], base: [70, 70, 66, 66, 66] },
  { id: 'R05', name: 'Sunrise Memory Centre', identity: 'Memory support', strength: 'Memory', year: 7, logo: 'peer_logo_r05', strong: ['residentWellbeing', 'familyTrust'], base: [70, 76, 74, 68, 70] },
  { id: 'R06', name: 'Northstar Nursing', identity: 'Clinical excellence', strength: 'Clinical', year: 9, logo: 'peer_logo_r06', strong: ['clinicalSafety', 'environment'], base: [82, 72, 72, 72, 76] },
  { id: 'R07', name: 'Crown Haven', identity: 'Elite all-rounder', strength: 'Balanced', year: 12, logo: 'peer_logo_r07', strong: ['clinicalSafety', 'residentWellbeing', 'familyTrust', 'staffWellbeing', 'environment'], base: [80, 80, 80, 80, 80] },
];
// R08 Legacy House Network (Milestone 31, bible §32: "Prestige benchmark · Adaptive · Secret"): joins the network only once
// SEC-RIVAL-01's flag is set (unlock:benchmarkNetwork). Adaptive: it arrives `lead` points above the home on every score
// and each month moves `pull` of the way back to `lead` above the home's own score (± noise, never past `ceiling`), so it
// is always a stretch. Like every peer it never takes residents, staff or funding.
export const PRESTIGE_PEERS = [
  { id: 'R08', name: 'Legacy House Network', identity: 'Prestige benchmark', strength: 'Adaptive', year: null, logo: 'peer_logo_r08', secret: true, unlockFlag: 'benchmarkNetwork', strong: [], base: null, adaptive: { lead: 3, pull: 0.5, noise: 0.4, ceiling: 99 } },
];
export const SECRET_PEERS = PRESTIGE_PEERS.map((p) => p.id);
export const ALL_PEERS = [...PEERS, ...PRESTIGE_PEERS];
export const peerById = (id) => ALL_PEERS.find((p) => p.id === id) ?? null;

// The monthly drift: a strong score moves up by strongUp ± noise (never past ceiling); any other by ± noise (kept
// between floor and ceiling).
export const PEER_DRIFT = { strongUp: 0.35, noise: 0.6, floor: 45, ceiling: 94 };

// The yearly recognition table (core/Rankings): every peer that has appeared and the home, placed by the average of
// their five scores at the year's end; points for each place.
export const RECOGNITION = { points: [25, 18, 15, 12, 10, 8, 6, 4, 2], homeId: 'home' }; // (Milestone 31: a ninth place, for R08)

export function validatePeers(v) {
  v.check(PEERS.length === 7, 'peers: R01–R07 (R08 stays secret)');
  PEERS.forEach((p, i) => {
    const who = `peer ${p.id}`;
    v.check(p.id === `R0${i + 1}` && p.logo === `peer_logo_${p.id.toLowerCase()}`, `${who}: id / logo`);
    v.check(p.base.length === 5 && p.base.every((x) => x >= 0 && x <= 100), `${who}: five base scores`);
    v.check(p.strong.length > 0, `${who}: a strong area`);
    v.check(Number.isInteger(p.year) && p.year >= 1 && p.year <= 16, `${who}: year`);
  });
  return v;
}
