// Which of the 20 robot pictures a finished robot uses (bible §13).
// Synergies arrive in Milestone 14, so today activeSynergies is always empty and the answer is the
// purpose's base family — but the priority order is already here:
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
