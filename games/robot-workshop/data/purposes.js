// Robot purpose classes (bible §10.2, §10.5). Milestone 3: Helper only; the other nine arrive in Milestone 6.
// Weights sum to 100 and drive the review score.
export const PURPOSES = {
  helper: {
    id: 'helper',
    name: 'Workshop Helper',
    shortName: 'Helper',
    weights: { SPD: 5, PWR: 10, CTL: 10, INT: 20, END: 10, REL: 30, APL: 15 },
    art: 'robot_full_01_workshop_helper',
  },
};
