// Robot Workshop's side of a competition entry (bible §21): turns a finished robot and a worker into the
// setup core/CompetitionSystem.js scores. Robot stats, faults and part complexity come from the robot's
// history record; the pilot's traits (§9.8) and signature traits (§15) become the setup's mods.
import { THEME } from '../../../../core/Theme.js';
import { COMPONENTS } from '../../data/components.js';
import { COMPETITION_RULES, QUALITY_STAT_SCALE } from '../../data/competitions.js';
import { Rng } from '../../../../core/Rng.js';
const COL = THEME.color;

// The entrant: a finished robot (its saved stats and the faults still open when it was finished). QLT / INN are its
// Quality and Innovation on the stat scale, for the events that judge them (C10).
export function entrantOf(record) {
  const r = record.result;
  const hc = COMPETITION_RULES.highComplexity;
  const complexParts = Object.values(r.components ?? {}).filter((id) => (COMPONENTS[id]?.cx ?? 0) >= hc.minCx).length;
  return {
    id: record.number,
    name: `#${record.number} ${record.name}`,
    stats: { ...r.stats, QLT: Math.min(999, Math.round((r.quality ?? 0) * QUALITY_STAT_SCALE)), INN: Math.min(999, Math.round((r.innovation ?? 0) * QUALITY_STAT_SCALE)) },
    faults: r.faults ?? 0,
    extraBreakdownPct: complexParts * hc.pctEach, // componentHighComplexityPenalty (§21.3)
  };
}

// The pilot's own traits and signature: Calm Under Pressure, Tuner, Risk Taker, Perfect Line, Beyond Redline.
export function pilotMods(staff, s) {
  const mods = {
    tuningPct: staff.traitEffect(s, 'tuningPct'),
    stressPct: staff.traitEffect(s, 'stressPenaltyPct'),
    aggressiveCeilingPct: staff.traitEffect(s, 'aggressiveCeilingPct'),
    breakdownRiskPct: staff.traitEffect(s, 'breakdownRiskPct'),
    basePct: staff.traitEffect(s, 'competitionScorePct'), // Homegrown Ace (SEC-BEH-08)
    aggressiveScorePct: null,
    noMoralePenalty: false,
  };
  const signatures = staff.runSignatures([s], 'competition', { mods });
  return { mods, signatures };
}

export function pilotOf(s) {
  return { id: s.id, name: s.name, stats: { ...s.stats }, stressed: !!s.status?.stressed };
}

// Plain words for the "your chances" hint from CompetitionSystem.preview().
export function chanceWords(pv) {
  const best = Math.max(...pv.rivals.map((r) => r.expected));
  const gap = (pv.expected - best) / best;
  let line;
  let color;
  if (gap > 0.06) [line, color] = ['Strong favourite to win', COL.good];
  else if (gap > 0) [line, color] = ['Good chance to win — it could be close', COL.good];
  else if (pv.place <= 3) [line, color] = [`Podium likely (about ${ordinal(pv.place)}) — a win needs luck`, COL.gold];
  else [line, color] = [`Tough field — expect about ${ordinal(pv.place)} place`, COL.bad];
  const risk = pv.anyBreakdownPct >= 25 ? 'High' : pv.anyBreakdownPct >= 10 ? 'Some' : 'Low';
  const riskLine = `${risk} breakdown risk (${pv.anyBreakdownPct}% chance of at least one)${pv.catastrophicPossible ? ' · could fail to finish!' : ''}`;
  return { line, color, riskLine, riskColor: risk === 'High' ? COL.bad : risk === 'Some' ? COL.gold : COL.textMuted };
}

export function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// A rival's flavour line (data/rivals.js lines[kind]), picked by a seed so the same moment always says the same thing.
// In New Game+ (ngPlus ≥ 1) their ngPlusLines[kind] are used where they exist (§30.7 altered rival dialogue).
// vars: { event, robot, pilot }
export function rivalLine(rival, kind, seed, vars = {}, ngPlus = 0) {
  const list = (ngPlus > 0 && rival?.ngPlusLines?.[kind]?.length ? rival.ngPlusLines[kind] : null) ?? rival?.lines?.[kind];
  if (!list?.length) return null;
  const line = new Rng(`${seed}|${rival.id}|${kind}`).pick(list);
  return line.replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m);
}

// The honest "falling behind" hint (§22.1): what to improve, never a quiet nerf to the rivals.
// Returns null when the player is in the running.
export function behindHint(expected, bestRival) {
  if (expected >= bestRival * 0.97) return null;
  const gap = Math.round((1 - expected / bestRival) * 100);
  return gap >= 15
    ? `About ${gap}% behind this field: research better parts, build a stronger robot and train your pilot's TST.`
    : `A little behind (about ${gap}%): train your pilot's TST or try a tuning package.`;
}
