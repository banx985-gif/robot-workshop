// The eight rival companies (bible §22) for core/RivalSystem.js. Plain data.
//   strengths          the stats they build for: events that weigh these lift them (specialty modifier, §22.1)
//   growthPctPerYear   their fixed strength curve: % stronger each campaign year past an event's beat year (and weaker
//                      before it), clamped to ±RIVAL_RULES.growthClampPct. It never looks at the player (§22.1).
//   manager            portrait (R01–R05); R06–R08 speak through their logo only (§22)
//   hidden             R08 Nocturne Systems stays out of lists and rankings until its secret chain (Milestones 16–17)
//   lines              short flavour lines (templates: {event}, {robot}, {pilot}) — before an event, when they beat you,
//                      when you beat them, when you fail to finish. Warm, competitive, never nasty (§25).
export const RIVALS = [
  {
    id: 'R01',
    name: 'BoltBarn Robotics',
    identity: 'Friendly local maker',
    strength: 'Reliability, basic builds',
    strengths: ['REL'],
    growthPctPerYear: 0.6,
    logo: 'logo_rival_01',
    manager: 'npc_rival_manager_01',
    color: '#FFB74D',
    lines: {
      before: ['Good luck out there! Ours is held together with love and extra bolts.', 'Nice to see another local workshop at the {event}.'],
      theyWon: ['Slow and steady does it! Come by the barn some time.', 'Reliability wins again — no hard feelings!'],
      youWon: ['Well built! {robot} earned that one.', "Ha! You've been practising. Congratulations!"],
      youDnf: ['Rotten luck. A spare bolt helps, trust me.'],
    },
  },
  {
    id: 'R02',
    name: 'Swift Arc Labs',
    identity: 'Sleek startup',
    strength: 'Speed and control',
    strengths: ['SPD', 'CTL'],
    growthPctPerYear: 1.0,
    logo: 'logo_rival_02',
    manager: 'npc_rival_manager_02',
    color: '#4FC3F7',
    lines: {
      before: ["We've shaved three grams off everything. Try to keep up.", 'Our investors are watching the {event}. No pressure.'],
      theyWon: ['Fast is a feature. See you at the next one.', 'Another one for the pitch deck!'],
      youWon: ['Okay, {robot} is quick. Noted. Very noted.', 'Back to the whiteboard for us…'],
      youDnf: ['Ouch. Speed is nothing without the finish.'],
    },
  },
  {
    id: 'R03',
    name: 'Iron Mule Automation',
    identity: 'Industrial incumbent',
    strength: 'Power and endurance',
    strengths: ['PWR', 'END'],
    growthPctPerYear: 0.8,
    logo: 'logo_rival_03',
    manager: 'npc_rival_manager_03',
    color: '#A1887F',
    lines: {
      before: ['Forty years of heavy lifting. Show us what the little workshop has.', 'Our machines work double shifts. This is a warm-up.'],
      theyWon: ['Power and patience. Old lessons.', 'Solid work beats flashy work.'],
      youWon: ['Hmph. Decent machine. Decent.', 'You kids might last in this business after all.'],
      youDnf: ['Build it heavier next time.'],
    },
  },
  {
    id: 'R04',
    name: 'Lumen Logic',
    identity: 'Software-led company',
    strength: 'Intelligence and control',
    strengths: ['INT', 'CTL'],
    growthPctPerYear: 1.1,
    logo: 'logo_rival_04',
    manager: 'npc_rival_manager_04',
    color: '#B39DDB',
    lines: {
      before: ['Our model predicts a 71% chance we win. Nothing personal.', 'We ran the {event} ten thousand times last night.'],
      theyWon: ['As simulated.', 'Clean code, clean run.'],
      youWon: ["Our model didn't see {robot} coming. Updating it now.", 'Interesting. Very interesting data.'],
      youDnf: ['Have you tried a better fault checker?'],
    },
  },
  {
    id: 'R05',
    name: 'Apex Motion',
    identity: 'Competition specialist',
    strength: 'Speed and pilots',
    strengths: ['SPD'],
    growthPctPerYear: 1.3,
    logo: 'logo_rival_05',
    manager: 'npc_rival_manager_05',
    color: '#FF8A80',
    lines: {
      before: ["We don't build helpers. We build winners.", 'Our pilot has raced the {event} since it began.'],
      theyWon: ["That's why they call us Apex.", 'Podiums are our business.'],
      youWon: ['Enjoy it. We will be back faster.', "Fine. {pilot} drove well. Don't tell them I said so."],
      youDnf: ['Racing is hard, isn’t it?'],
    },
  },
  {
    id: 'R06',
    name: 'Northstar Rescue Tech',
    identity: 'Emergency systems',
    strength: 'Reliability and intelligence',
    strengths: ['REL', 'INT'],
    growthPctPerYear: 0.9,
    logo: 'logo_rival_06',
    manager: null,
    color: '#80CBC4',
    lines: {
      before: ['Northstar: ready when it matters.', 'Every run is a rehearsal for a real rescue.'],
      theyWon: ['Northstar: steady hands, safe results.', 'Dependable wins the day.'],
      youWon: ['Northstar congratulates the {robot} team.', 'Well done. We will study your run.'],
      youDnf: ['Northstar: glad nobody was hurt. Try again.'],
    },
  },
  {
    id: 'R07',
    name: 'TitanWorks',
    identity: 'Global industrial giant',
    strength: 'High balanced stats',
    strengths: [],
    growthPctPerYear: 1.2,
    logo: 'logo_rival_07',
    manager: null,
    color: '#CFD8DC',
    lines: {
      before: ['TitanWorks: excellence at every scale.', 'TitanWorks thanks the organisers of the {event}.'],
      theyWon: ['TitanWorks: results, delivered.', 'Another win for TitanWorks engineering.'],
      youWon: ['TitanWorks notes a strong new competitor.', 'TitanWorks will respond.'],
      youDnf: ['TitanWorks recommends a maintenance plan.'],
    },
  },
  {
    id: 'R08',
    name: 'Nocturne Systems',
    identity: 'Prestige / secret rival',
    strength: 'Adaptive hidden build',
    strengths: [],
    growthPctPerYear: 1.5,
    logo: 'logo_rival_08',
    manager: null,
    color: '#7E57C2',
    hidden: true,
    lines: {
      before: ['…'],
      theyWon: ['Nocturne: as expected.'],
      youWon: ['Nocturne: noted.'],
      youDnf: ['Nocturne: …'],
    },
  },
];

export const RIVALS_BY_ID = Object.fromEntries(RIVALS.map((r) => [r.id, r]));

// §22.1 model numbers (M12/M13 choices). growthClampPct: a rival is at most this much above/below the event level.
export const RIVAL_RULES = {
  specialtyBase: 40,
  specialtyPctPerPoint: 0.15,
  ngPlusPct: 6,
  growthClampPct: 12,
};

// How a hidden rival shows before it is revealed.
export const HIDDEN_RIVAL = { name: 'Unknown team', color: '#6E7B88' };
