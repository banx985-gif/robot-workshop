// Customer feedback templates (bible §14.5) — flavour only. {name} = the robot's name.
// strong: about its best stat; weak: about its weakest; fit: how well it suits its buyers.
export const REVIEW_TEMPLATES = {
  strong: {
    SPD: ['"{name} is wonderfully quick!"', '"Zips about like it\'s late for something."'],
    PWR: ['"{name} lifts things I can\'t even budge."', '"Strong as an ox."'],
    CTL: ['"So precise — it never bumps the furniture."', '"Handles like a dream."'],
    INT: ['"{name} figures things out on its own."', '"Clever little thing."'],
    END: ['"Runs all day on one charge."', '"{name} just keeps going."'],
    REL: ['"Never breaks down. Rock solid."', '"{name} works every single time."'],
    APL: ['"Everyone stops to smile at {name}."', '"Gorgeous design."'],
  },
  weak: {
    SPD: ['A bit slow, though.', 'Could be quicker.'],
    PWR: ['Struggles with heavy things.', 'Not very strong.'],
    CTL: ['Steering is a little clumsy.', 'Bumps into things now and then.'],
    INT: ['Needs a lot of instructions.', 'Not the brightest.'],
    END: ['The battery runs down fast.', 'Needs lots of charging.'],
    REL: ['Had a couple of hiccups.', 'Glitches now and then.'],
    APL: ['Looks rather plain.', 'Not much to look at.'],
  },
  fit: {
    high: ['Exactly what we needed. ★★★★★', 'Perfect for the job.'],
    mid: ['Does the job well enough. ★★★', 'Good, not great.'],
    low: ['Not really what we were after. ★★', 'Handy, but built for something else.'],
  },
};

// Fit → which fit lines to use.
export const FIT_BANDS = { high: 75, mid: 50 }; // Fit ≥ 75 high, ≥ 50 mid, else low
