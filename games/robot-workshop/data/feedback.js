// Game-feel content: which effect art and which sound goes with which moment (bible §33.4, §36).
// Plain values only. Sounds have no files yet — each is a silent placeholder hook until real audio arrives.

import { THEME } from '../../../core/Theme.js';

export const VFX_ART = {
  smallSparks: 'vfx_01', // welding sparks at the bench
  bigBurst: 'vfx_02', // large welding burst (robot completion)
  blueprintPop: 'vfx_04', // project phase done
  cashBurst: 'vfx_05', // sales landing
  levelUp: 'vfx_08', // worker level-up
  robotDone: 'vfx_09', // robot completion flash
};

export const STATUS_ART = {
  happy: 'status_staff_01_happy',
  tired: 'status_staff_02_tired',
  inspired: 'status_staff_03_inspired',
  stressed: 'status_staff_04_stressed',
  breakthrough: 'status_staff_05_breakthrough',
};

// Status icons shown above a worker's head, most important first.
export const STATUS_ORDER = ['stressed', 'tired', 'inspired'];

export const SOUNDS = {
  tap: { file: null },
  phaseDone: { file: null },
  robotDone: { file: null },
  sale: { file: null },
  levelUp: { file: null },
};

// Colours for floating numbers (bible §33.1: green positive, cyan information).
// Milestone 17b: theme colours, so they read on the cream bars and the bright floor.
export const FLOAT_COLORS = {
  credits: THEME.color.good,
  techChips: THEME.color.purple,
  reputation: THEME.color.gold,
  research: THEME.color.progress, // RP arrive in Milestone 9
  info: THEME.color.progress,
  level: THEME.color.gold,
};
