// Life stories (Milestone 9, bible §2.2 "life-story facts"). The §7 roster gives each resident one interest (Cards /
// Football / Fishing); later systems (friendships M13, programs, the §36 resident secrets M29/M30) need richer tags, so
// every resident has 2–4 tags from the fixed LIFE_TAGS list (their §7 interest is always one of them) and one short,
// warm life-story line (no medical detail). pronoun: 'she' | 'he' for the card lines, matching their portrait.
// Plain data only; validateResidents (data/residents.js) checks it, and TAG_MINIMUMS is what the roster must hold so the
// §36 secrets stay reachable (The Gardener, Old Friends, The Band, Book Club).

export const LIFE_TAGS = ['Gardening', 'Music', 'Dancing', 'Reading', 'History', 'Community', 'Cards', 'Football', 'Fishing', 'Faith', 'Crafts', 'Pets', 'Travel', 'Cooking'];
export const TAGS_PER_RESIDENT = { min: 2, max: 4 };

// Roster-wide minimums (bible §36 resident secrets). any: residents with at least one of these tags; all: residents
// with every one of them; longTerm: only Long Term residents count (Old Friends needs two compatible long-term
// residents).
export const TAG_MINIMUMS = [
  { id: 'gardening', label: 'Gardening', any: ['Gardening'], min: 4, secret: 'SEC-RES-01' },
  { id: 'musicDancing', label: 'Music / Dancing', any: ['Music', 'Dancing'], min: 5, secret: 'SEC-RES-03' },
  { id: 'readingHistory', label: 'Reading / History', any: ['Reading', 'History'], min: 6, secret: 'SEC-RES-04' },
  { id: 'historyCommunity', label: 'History + Community (long term)', all: ['History', 'Community'], longTerm: true, min: 4, secret: 'SEC-RES-02' },
];

const s = (pronoun, tags, line) => ({ pronoun, tags, line });
export const LIFE_STORIES = {
  RES01: s('he', ['Cards', 'Cooking', 'Community'], 'Ran the corner café for forty years and still makes the best pot of tea in the building.'),
  RES02: s('she', ['Football', 'Crafts', 'Community'], 'Never missed a home match in fifty years and knits a scarf for every new grandchild.'),
  RES03: s('he', ['Fishing', 'History', 'Reading'], 'A keen local historian who can name every ship ever built at the old yard.'),
  RES04: s('she', ['Cards', 'Faith', 'Music'], "Played the organ at St Mary's every Sunday for thirty-two years."),
  RES05: s('he', ['Football', 'Travel'], 'Walked the whole coast path twice and means to do it once more.'),
  RES06: s('she', ['Fishing', 'Cooking', 'Gardening'], 'Grew prize tomatoes on her allotment and cooked for half the street at harvest time.'),
  RES07: s('he', ['Cards', 'Community', 'History'], 'Drove the 43 bus for thirty years and still knows every stop.'),
  RES08: s('she', ['Football', 'Dancing', 'Music'], 'Taught ballroom on Friday nights and still taps out the beat with her foot.'),
  RES09: s('he', ['Fishing', 'Travel', 'Reading'], 'Sailed on cargo ships as a young man and has a story for every port.'),
  RES10: s('she', ['Cards', 'Reading', 'Crafts'], 'A retired librarian who still reads a chapter every night before bed.'),
  RES11: s('he', ['Football', 'History', 'Community'], 'Kept the scorebook for the village cricket club for forty summers.'),
  RES12: s('she', ['Fishing', 'Community', 'Faith'], 'Organised every church fête for twenty years with her trusty clipboard.'),
  RES13: s('he', ['Cards', 'Football', 'Community'], 'Coached the under-twelves on Saturday mornings and is keen to get back on his feet.'),
  RES14: s('she', ['Football', 'Crafts', 'Cooking'], "Knits blankets for the children's ward and bakes a famous lemon cake."),
  RES15: s('he', ['Fishing', 'Pets', 'Reading'], 'Shares his flat with a ginger cat and a shelf of well-thumbed westerns.'),
  RES16: s('she', ['Cards', 'Crafts', 'Music'], 'Made the costumes for every village pantomime and hums the songs while she sews.'),
  RES17: s('he', ['Football', 'Reading', 'History'], 'Wrote the history of his football club, one match report at a time.'),
  RES18: s('she', ['Fishing', 'Dancing', 'Music'], 'Won a jive contest at the Palais in 1965 and has the photo to prove it.'),
  RES19: s('he', ['Cards', 'Pets', 'Community'], 'Walked his golden retriever round the park at seven sharp every morning.'),
  RES20: s('she', ['Football', 'Travel', 'Faith'], 'Crossed the world at nineteen and still calls her sisters every Sunday.'),
  RES21: s('she', ['Fishing', 'Dancing', 'Community'], "Taught dance at the community hall and wants to be dancing at her granddaughter's wedding."),
  RES22: s('he', ['Cards', 'Cooking', 'Gardening'], "Ran a greengrocer's stall for forty years and can still pick the ripest melon."),
  RES23: s('she', ['Football', 'Community', 'History'], 'Volunteered at the town museum and knows the story behind every old photograph.'),
  RES24: s('he', ['Fishing', 'Music', 'Travel'], 'Played trumpet in a touring jazz band and still counts the band in.'),
  RES25: s('she', ['Cards', 'Gardening', 'Reading'], 'Kept a cottage garden that was in the village show every single year.'),
  RES26: s('he', ['Football', 'Travel', 'History'], 'Worked the railways for forty years and can still recite the old timetables.'),
  RES27: s('she', ['Fishing', 'Reading', 'History'], 'Keeps a photo album of every seaside holiday she ever took.'),
  RES28: s('he', ['Cards', 'Reading', 'Community'], 'Ran the village post office and still does the crossword in ink.'),
  RES29: s('she', ['Football', 'Dancing', 'Music'], 'Ran the local keep-fit class and is determined to lead it again.'),
  RES30: s('he', ['Fishing', 'Gardening', 'Cooking'], 'Tended the same allotment for fifty years and still talks to his runner beans.'),
  RES31: s('she', ['Cards', 'Dancing', 'Music'], 'Sang with a dance band in the fifties and still knows every word.'),
  RES32: s('he', ['Football', 'Pets', 'Community'], "Bred champion spaniels and loves a visit from any dog who'll sit still."),
  RES33: s('she', ['Fishing', 'Gardening', 'Faith'], 'Arranged the flowers at the parish church every week for twenty years.'),
  RES34: s('she', ['Cards', 'Crafts', 'Music'], 'Stitched a quilt for every baby born on her street.'),
  RES35: s('he', ['Football', 'Reading', 'History'], 'A retired history teacher who can still name every king and queen in order.'),
  RES36: s('she', ['Fishing', 'Community', 'History'], 'Ran the school office for thirty years and still remembers every class photo.'),
  RES37: s('he', ['Cards', 'Football', 'Community'], 'Boxed for the county as a young man and is training hard to get home again.'),
  RES38: s('she', ['Football', 'Gardening', 'Cooking'], "Won the village show's giant sunflower prize three years running."),
  RES39: s('he', ['Fishing', 'Music', 'Dancing'], "Played guitar at the working men's club every Saturday night for decades."),
  RES40: s('she', ['Cards', 'Crafts', 'Faith'], "Sews patchwork blankets from her family's old clothes."),
  RES41: s('he', ['Football', 'Travel', 'History'], 'Photographed every town he ever visited and has boxes of slides to share.'),
  RES42: s('she', ['Fishing', 'Dancing', 'Community'], 'Ran the Saturday tea dance at the church hall for twenty years.'),
  RES43: s('he', ['Cards', 'Reading', 'History'], 'Collects old maps and can trace any street back a hundred years.'),
  RES44: s('she', ['Football', 'Community', 'Crafts'], 'Led the Brownies for thirty years and still ties a perfect reef knot.'),
  RES45: s('he', ['Fishing', 'Crafts', 'Travel'], 'Built his own boat in the back garden and wants to take it out once more.'),
  RES46: s('she', ['Cards', 'Cooking', 'Faith'], 'Made Sunday lunch for the whole family every week for fifty years.'),
  RES47: s('she', ['Football', 'Community', 'History'], 'Ran the corner shop where the whole street came for the news.'),
  RES48: s('he', ['Fishing', 'Music', 'Faith'], 'Sang bass in the chapel choir and still joins in with every hymn.'),
  RES49: s('she', ['Cards', 'Gardening', 'Pets'], 'Grew orchids on every windowsill and named each one after a film star.'),
  RES50: s('he', ['Football', 'Community', 'History'], 'Delivered the post on the same round for thirty-five years and knew every dog by name.'),
  RES51: s('she', ['Fishing', 'History', 'Crafts'], 'Keeps a scrapbook of her family going back five generations.'),
  RES52: s('he', ['Cards', 'Community', 'History'], "Chaired the residents' association and still enjoys a good meeting."),
  RES53: s('she', ['Football', 'Dancing', 'Travel'], 'Took up salsa at seventy and plans to be dancing again by spring.'),
  RES54: s('he', ['Fishing', 'Cooking', 'Travel'], "Cooked in ships' galleys all over the world and still guards his curry recipe."),
  RES55: s('she', ['Cards', 'Reading', 'Faith'], 'Read to the children at the library every Tuesday morning.'),
  RES56: s('he', ['Football', 'Travel', 'Pets'], 'Followed his team to every away ground in the country by coach.'),
  RES57: s('she', ['Fishing', 'Gardening', 'Music'], 'Sold flowers from a barrow on the high street and sang while she worked.'),
  RES58: s('he', ['Cards', 'Travel', 'Reading'], 'Walked every hill in the Lakes and ticked each one off in a little book.'),
  RES59: s('she', ['Football', 'Reading', 'History'], 'Wrote a local-history column for the paper for twenty-five years.'),
  RES60: s('he', ['Fishing', 'Crafts', 'Music'], 'Repaired radios in his shed and can still tune one by ear.'),
};

// How many residents meet each minimum: [{ id, label, count, min, ok }].
export function tagCoverage(list) {
  return TAG_MINIMUMS.map((m) => {
    const count = list.filter((r) => {
      const tags = r.tags ?? [];
      if (m.longTerm && r.stay !== 'Long Term') return false;
      return m.all ? m.all.every((t) => tags.includes(t)) : m.any.some((t) => tags.includes(t));
    }).length;
    return { id: m.id, label: m.label, count, min: m.min, ok: count >= m.min };
  });
}
