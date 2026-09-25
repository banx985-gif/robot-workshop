// Which of the 20 robot pictures a finished robot uses (bible §13).
// activeSynergies: the combos that fired on the robot (Milestone 14). The highest priority advanced look wins:
//   Unknown > Lunar > Neural > Titanium > purpose-specific advanced > base purpose.
// Always returns exactly one family from VISUAL_FAMILIES (never null).
import { VISUAL_FAMILIES, VISUALS, FALLBACK_VISUAL } from '../../data/visuals.js';
import { PURPOSES } from '../../data/purposes.js';

export function robotVisual(purposeId, activeSynergies = []) {
  const active = new Set(activeSynergies);
  let best = null;
  for (const v of VISUAL_FAMILIES) {
    if (!v.synergy || !active.has(v.synergy)) continue;
    if (!best || v.priority > best.priority) best = v; // ties: first in catalogue order
  }
  if (best) return best;
  return VISUALS[PURPOSES[purposeId]?.visual] ?? VISUALS[FALLBACK_VISUAL];
}

// Picture for a finished robot's saved result (older saves have no visual stored).
export function robotArtOf(result) {
  return (VISUALS[result?.visual] ?? robotVisual(result?.purpose)).art;
}
