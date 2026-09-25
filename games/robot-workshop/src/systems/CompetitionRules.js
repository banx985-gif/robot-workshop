// Robot Workshop's side of a competition entry (bible §21): turns a finished robot and a worker into the
// setup core/CompetitionSystem.js scores. Robot stats, faults and part complexity come from the robot's
// history record; the pilot's traits (§9.8) and signature traits (§15) become the setup's mods.
import { COMPONENTS } from '../../data/components.js';
import { COMPETITION_RULES } from '../../data/competitions.js';

// The entrant: a finished robot (its saved stats and the faults still open when it was finished).
export function entrantOf(record) {
  const r = record.result;
  const hc = COMPETITION_RULES.highComplexity;
  const complexParts = Object.values(r.components ?? {}).filter((id) => (COMPONENTS[id]?.cx ?? 0) >= hc.minCx).length;
  return {
    id: record.number,
    name: `#${record.number} ${record.name}`,
    stats: { ...r.stats },
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
    basePct: 0,
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
  if (gap > 0.06) [line, color] = ['Strong favourite to win', '#7CFFB2'];
  else if (gap > 0) [line, color] = ['Good chance to win — it could be close', '#7CFFB2'];
  else if (pv.place <= 3) [line, color] = [`Podium likely (about ${ordinal(pv.place)}) — a win needs luck`, '#FFD166'];
  else [line, color] = [`Tough field — expect about ${ordinal(pv.place)} place`, '#FF8A80'];
  const risk = pv.anyBreakdownPct >= 25 ? 'High' : pv.anyBreakdownPct >= 10 ? 'Some' : 'Low';
  const riskLine = `${risk} breakdown risk (${pv.anyBreakdownPct}% chance of at least one)${pv.catastrophicPossible ? ' · could fail to finish!' : ''}`;
  return { line, color, riskLine, riskColor: risk === 'High' ? '#FF8A80' : risk === 'Some' ? '#FFD166' : '#9AA8B5' };
}

export function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
