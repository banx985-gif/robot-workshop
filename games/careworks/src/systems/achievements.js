// Achievements, Home Records, Memory Book milestones and the Staff Hall of Fame (Milestone 32, bible §34; Kairosoft gap #3).
// Nothing here changes how the home runs: it only reads facts (the secrets' registry, src/systems/secretFacts.js, plus the
// few ach.* below) and gives a small reward through a system that already exists (Reputation) or a cosmetic keepsake.
//   • achievements: data/achievements.js on core/AchievementSystem (its account record: unlocked / paid / seen). A 'run'
//     achievement is also kept in this home's save (state.run) — "earned in this home" — and counted on the account ("best
//     ever"); an 'account' one only on the account. A reward is paid once per account (core: paid is set before paying);
//     state.paid notes which were first earned on the account in this home (reward settled), so a reload whose account save
//     was lost puts them (and every state.run one) back as earned and paid — never paid or announced twice.
//   • records: each a run best (state.records) and an account best (core/AccountRecords), from real play: daily readings,
//     each month's close, discharges, tasks done at a facility (state.uses), courses finished (state.trained)
//   • Memory Book milestones (account): 10 / 25 / 50 / 100 pages → a cover keepsake and a quiet line, each once
//   • the Hall of Fame (account): Legendary / Secret / Divine staff when they first join, anyone with 5+ years' service, and
//     anyone let go whom the player adds (they are offered as candidates)
//
//   createCareAchievements({ env, state, account, bus }) → api
//     api.onEmit(name, payload) · api.daily() · api.monthClosed(rec) · api.notify(trigger) · api.catchUp()
//     api.rows() · api.recordRows() · api.hall · api.candidates() · api.addToHall(id) · api.keepsakes() · api.cover()
//     api.accountData() · api.loadAccount(data) · api.setAccountStore({ save }) · api.flush() · api.serialize()
//   Moments it raises on the home's bus: 'care:achievement' { id, name, beat, first }, 'care:hallOfFame' { name, why,
//   candidate }, 'care:keepsake' { line, name }.
import { AchievementSystem } from '../../../../core/AchievementSystem.js';
import { AccountRecords } from '../../../../core/AccountRecords.js';
import { ACHIEVEMENTS, KEEPSAKES, MEMORY_MILESTONES, RECORD_DEFS, RECORD_GROUPS, HALL, achievementById } from '../../data/achievements.js';
import { FRIENDSHIP } from '../../data/relationships.js';
import { SCORE_IDS } from '../../data/quality.js';

const copy = (x) => JSON.parse(JSON.stringify(x));
const r1 = (x) => Math.round(x * 10) / 10;
const DAYS_PER_YEAR = 336;

export function newAchievementsState() {
  return { v: 1, run: {}, paid: {}, admitted: 0, reviews: 0, trained: {}, safeMonths: 0, records: {}, uses: {} };
}
export function ensureAchievementsState(saved) {
  const fresh = newAchievementsState();
  if (!saved || typeof saved !== 'object') return fresh;
  const s = copy(saved);
  return { ...fresh, ...s, run: { ...(s.run ?? {}) }, paid: { ...(s.paid ?? {}) }, trained: { ...(s.trained ?? {}) }, records: { ...(s.records ?? {}) }, uses: { ...(s.uses ?? {}) } };
}
const newAccount = () => ({ hall: [], candidates: {}, keepsakes: {}, memory: {} });

export function createCareAchievements({ env, state, account = null, bus = null, defs = ACHIEVEMENTS }) {
  const st = state;
  let store = { save: () => {} };
  let acct = newAccount();
  let dirty = false;
  const today = () => env.today();
  const records = new AccountRecords({ defs: RECORD_DEFS, now: () => ({ day: today(), runId: env.runId }) });

  // --- facts: the secrets' registry, plus these -------------------------------------------------------------------------
  const fam = () => env.care.family ?? {};
  const own = {
    'ach.admitted': () => Math.max(st.admitted, (env.firsts?.() ?? []).includes('firstAdmission') ? 1 : 0),
    // reviews done here (an older save: plans reviewed after the resident moved in — a new home's opening plan doesn't count)
    'ach.plansReviewed': () => Math.max(st.reviews, env.residentsHere().filter((p) => p.state.review?.day != null && p.state.review.day > (p.state.admittedDay ?? 0)).length),
    'ach.compliments': () => (fam().compliments ?? []).length,
    'ach.familyReviews': () => Math.max(fam().reviews ?? 0, fam().firsts?.review != null ? 1 : 0),
    'ach.programsStarted': () => (env.secrets.facts.get('run.programsEver') ?? []).length,
    'ach.safeMonths': () => st.safeMonths,
    // the unbroken run of closed months at Clinical Safety 90+ that ends with the latest
    'ach.clinical90Months': () => {
      const months = env.secrets.log?.months ?? [];
      let k = 0;
      for (let i = months.length - 1; i >= 0 && (months[i].scores?.clinicalSafety ?? 0) >= 90; i--) k++;
      return k;
    },
    'ach.legacyEnding': () => !!env.legacyEnding?.(), // (Milestone 33 builds the ending: never true before it)
    'ach.pantheon': () => !!env.secrets.pantheon,
  };
  const facts = { get: (name) => (name in own ? own[name]() : env.secrets.facts.get(name, {})), has: (name) => name in own || env.secrets.facts.has(name) };

  // --- rewards ---------------------------------------------------------------------------------------------------------
  const rewardWords = (d) => (d.reward ?? []).map((r) => (r.currency === 'reputation' ? `Reputation +${r.amount}` : KEEPSAKES[r.id]?.name ?? r.id)).join(' · ');
  function giveKeepsake(id) {
    if (acct.keepsakes[id]) return false;
    acct.keepsakes[id] = { day: today(), runId: env.runId, home: env.homeName?.() ?? null };
    return true;
  }
  const ach = new AchievementSystem({
    defs,
    facts,
    now: () => ({ day: today(), year: env.year(), runId: env.runId, home: env.homeName?.() ?? null }),
    pay: (line, def) => {
      st.paid[def.id] = true;
      if (line.currency === 'reputation') env.addReputation?.(line.amount, `Achievement: ${def.name}`);
      if (line.currency === 'keepsake') giveKeepsake(line.id);
    },
  });
  const index = new Map();
  for (const d of defs) for (const ev of d.triggerEvents ?? []) (index.get(ev) ?? index.set(ev, []).get(ev)).push(d);

  function save() {
    dirty = false;
    return store.save?.(accountData());
  }

  // --- achievements ------------------------------------------------------------------------------------------------------
  const earnedHere = (d) => (d.scope === 'run' ? !!st.run[d.id] : ach.isUnlocked(d.id));
  function check(list) {
    const out = [];
    for (const d of list) {
      if (earnedHere(d) && ach.isUnlocked(d.id)) continue;
      if (!ach.met(d.requires)) continue;
      const newHere = d.scope === 'run' && !st.run[d.id];
      if (newHere) st.run[d.id] = { day: today() };
      const res = ach.unlock(d.id); // null when the account already had it (nothing paid again)
      if (res) st.paid[d.id] = true; // (first earned on the account in this home: its reward, if any, is settled)
      if (!newHere && !res) continue;
      out.push(d.id);
      bus?.emit('care:achievement', { id: d.id, name: d.name, beat: res ? d.beat ?? null : null, first: !!res, reward: res ? rewardWords(d) : '' });
    }
    if (out.length) save();
    return out;
  }
  const notify = (trigger) => check(index.get(trigger) ?? []);

  // --- records --------------------------------------------------------------------------------------------------------------
  function submit(id, value, info = {}) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return;
    const v = Math.round(value * 10) / 10;
    const cur = st.records[id];
    if (!cur || v > cur.value) st.records[id] = { value: v, info: { ...info }, day: today() };
    if (records.submit(id, v, { ...info, home: env.homeName?.() ?? null })) dirty = true;
  }
  const best = (list, val) => list.reduce((b, x) => (val(x) > (b ? val(b) : -Infinity) ? x : b), null);
  // residents each staff member has looked after (any task together, in this home)
  function caredCounts() {
    const out = {};
    for (const [key, r] of Object.entries(env.care.relations ?? {})) {
      if (!((r.tasks ?? 0) > 0 || (r.familiarity ?? 0) > 0)) continue;
      const s = key.split('|')[1];
      out[s] = (out[s] ?? 0) + 1;
    }
    return out;
  }
  function friendCounts() {
    const here = new Set(env.residentsHere().map((p) => p.id));
    const out = {};
    for (const r of Object.values(env.care.friendships ?? {})) {
      if ((r.friendship ?? 0) < FRIENDSHIP.friendAt || !here.has(r.a) || !here.has(r.b)) continue;
      out[r.a] = (out[r.a] ?? 0) + 1;
      out[r.b] = (out[r.b] ?? 0) + 1;
    }
    return out;
  }
  function readRecords() {
    const here = env.residentsHere();
    const who = (p) => ({ who: p.name, art: p.def?.art ?? null });
    const stay = best(here, (p) => today() - (p.state.admittedDay ?? 0));
    if (stay) submit('res.longestStay', today() - (stay.state.admittedDay ?? 0), who(stay));
    const old = best(here, (p) => env.ageOf(p));
    if (old) submit('res.oldest', env.ageOf(old), who(old));
    const fc = friendCounts();
    const fr = best(here, (p) => fc[p.id] ?? 0);
    if (fr) submit('res.mostFriends', fc[fr.id] ?? 0, who(fr));
    submit('res.mostWishes', env.secrets.facts.get('run.wishesHonoured') ?? 0, { who: env.homeName?.() ?? 'This home' });
    const team = env.team();
    const sw = (q) => ({ who: q.name, art: q.art ?? null });
    const serving = best(team, (q) => env.daysEmployed(q.id));
    if (serving) submit('staff.longestServing', env.daysEmployed(serving.id), sw(serving));
    const cc = caredCounts();
    const cared = best(team, (q) => cc[q.id] ?? 0);
    if (cared) submit('staff.mostCared', cc[cared.id] ?? 0, sw(cared));
    const trained = best(team, (q) => st.trained[q.id] ?? 0);
    if (trained) submit('staff.mostTrained', st.trained[trained.id] ?? 0, sw(trained));
    const lv = best(team, (q) => q.level ?? 1);
    if (lv) submit('staff.highestLevel', lv.level ?? 1, sw(lv));
    const pieces = env.facilities();
    const used = best(Object.values(st.uses), (u) => u.n);
    if (used) submit('fac.mostUsed', used.n, { who: used.name });
    const top = best(pieces, (pc) => pc.level ?? 1);
    if (top) submit('fac.highestLevel', top.level ?? 1, { who: top.name });
    return { cc };
  }

  // --- the Hall of Fame -----------------------------------------------------------------------------------------------------
  const bestLine = (s) => [`Level ${s.level ?? 1}`, `cared for ${s.cared ?? 0}`, ...(s.courses ? [`${s.courses} course${s.courses === 1 ? '' : 's'}`] : [])].join(' · ');
  function snapshot(id, cc = caredCounts()) {
    const q = env.staffInfo(id);
    if (!q) return null;
    const days = env.daysEmployed(id);
    return { id, name: q.name, role: q.role, tier: q.tier ?? null, art: q.art ?? null, level: q.level ?? 1, days, cared: cc[id] ?? 0, courses: st.trained[id] ?? 0, home: env.homeName?.() ?? null, runId: env.runId, day: today() };
  }
  const yearsOf = (days) => r1(days / DAYS_PER_YEAR);
  function induct(s, why) {
    if (!s) return false;
    const cur = acct.hall.find((e) => e.id === s.id);
    if (cur) {
      if (cur.runId === s.runId && s.days >= cur.days) Object.assign(cur, { days: s.days, years: yearsOf(s.days), level: s.level, cared: s.cared, courses: s.courses, best: bestLine(s) }); // (their numbers go on growing in the home they were inducted from)
      return false;
    }
    acct.hall.push({ ...s, years: yearsOf(s.days), best: bestLine(s), why, ngPlus: env.ngPlus?.() ?? 0 });
    delete acct.candidates[s.id];
    bus?.emit('care:hallOfFame', { id: s.id, name: s.name, why: HALL.why[why] ?? why, candidate: false });
    return true;
  }
  function checkHall(cc) {
    let changed = false;
    for (const q of env.team()) {
      const inHall = acct.hall.find((e) => e.id === q.id);
      if (inHall?.runId === env.runId) {
        induct(snapshot(q.id, cc), inHall.why);
        dirty = true; // (their growing numbers go with the next flush)
      } else if (!inHall && HALL.autoTiers.includes(q.tier)) changed = induct(snapshot(q.id, cc), 'tier') || changed;
      else if (!inHall && env.daysEmployed(q.id) >= HALL.servedDays) changed = induct(snapshot(q.id, cc), 'served') || changed;
    }
    return changed;
  }
  function offerCandidate(id) {
    if (acct.hall.some((e) => e.id === id)) return false;
    const s = snapshot(id);
    if (!s) return false;
    acct.candidates[id] = s;
    const keep = Object.values(acct.candidates).sort((x, y) => (y.day ?? 0) - (x.day ?? 0)).slice(0, HALL.candidatesKept).map((x) => x.id);
    for (const k of Object.keys(acct.candidates)) if (!keep.includes(k)) delete acct.candidates[k];
    bus?.emit('care:hallOfFame', { id, name: s.name, why: 'can join the Hall of Fame', candidate: true });
    save();
    return true;
  }

  // --- Memory Book milestones -------------------------------------------------------------------------------------------------
  function checkMemory() {
    const pages = facts.get('account.memoryBook') ?? 0;
    let got = false;
    for (const m of MEMORY_MILESTONES) {
      if (pages < m.pages || acct.memory[m.pages]) continue;
      acct.memory[m.pages] = { day: today(), runId: env.runId };
      giveKeepsake(m.keepsake);
      bus?.emit('care:keepsake', { line: m.line, name: KEEPSAKES[m.keepsake]?.name ?? m.keepsake });
      got = true;
    }
    if (got) save();
    return got;
  }

  // --- the account half ---------------------------------------------------------------------------------------------------------
  function accountData() {
    return copy({ ach: ach.serialize(), records: records.serialize(), ...acct });
  }
  // A reload whose account save was lost: what this home already paid is put back as unlocked and paid (never paid twice).
  function repair() {
    for (const id of new Set([...Object.keys(st.paid), ...Object.keys(st.run)])) {
      if (ach.account.paid[id]) continue;
      ach.account.paid[id] = true;
      ach.account.unlocked[id] ??= { day: st.run[id]?.day ?? today(), runId: env.runId, home: env.homeName?.() ?? null };
    }
  }
  function loadAccount(data) {
    const d = data ? copy(data) : {};
    ach.load(d.ach ?? null);
    records.load(d.records ?? null);
    for (const e of d.hall ?? []) {
      const cur = acct.hall.find((x) => x.id === e.id);
      if (!cur) acct.hall.push(e);
      else if ((e.days ?? 0) > (cur.days ?? 0)) Object.assign(cur, e);
    }
    acct.candidates = { ...(d.candidates ?? {}), ...acct.candidates };
    for (const id of acct.hall.map((e) => e.id)) delete acct.candidates[id];
    acct.keepsakes = { ...(d.keepsakes ?? {}), ...acct.keepsakes };
    acct.memory = { ...(d.memory ?? {}), ...acct.memory };
    repair();
  }
  if (account) loadAccount(account);
  else repair();

  const api = {
    system: ach,
    facts,
    accountRecords: records,
    state: st,
    notify,
    // Every moment the home raises: the counters the records need, then the achievements indexed under it.
    onEmit(name, payload = {}) {
      if (name === 'care:admit') st.admitted++;
      if (name === 'care:review') st.reviews++;
      if (name === 'staff:trained' && payload.id) st.trained[payload.id] = (st.trained[payload.id] ?? 0) + 1;
      if (name === 'care:task' && payload.status === 'done' && payload.spot) {
        const pc = env.pieceOfSpot?.(payload.spot);
        if (pc) {
          const u = (st.uses[pc.uid] ??= { uid: pc.uid, defId: pc.defId, name: pc.name, n: 0 });
          u.n++;
          u.name = pc.name;
        }
      }
      if (name === 'care:discharge' && payload.resident) {
        const start = env.secrets.log?.indStart?.[payload.resident];
        const d = (env.care.rewards?.discharges ?? []).filter((x) => x.id === payload.resident).at(-1);
        if (d && start != null && d.independence != null) submit('res.bestRehab', d.independence - start, { who: d.name ?? payload.name, art: env.residentArt?.(payload.resident) ?? null });
      }
      if (name === 'staff:hired' && payload.id) {
        const s = snapshot(payload.id);
        if (s && HALL.autoTiers.includes(s.tier) && induct(s, 'tier')) save();
      }
      if (name === 'staff:letGo' && payload.id) offerCandidate(payload.id);
      if (index.has(name)) notify(name);
    },
    // each midnight, after the secrets' day
    daily() {
      const { cc } = readRecords();
      const hall = checkHall(cc);
      notify('ach:day');
      checkMemory();
      if (hall) save();
    },
    // each month's close, after the secrets' month record (rec: that record — profit, the five scores)
    monthClosed(rec) {
      if (rec) {
        submit('fac.bestProfit', rec.net ?? 0, { who: `Month ${env.monthOf?.(rec.day) ?? rec.m}, Year ${rec.year ?? env.year()}` });
        if (rec.scores) submit('fac.bestScores', r1(SCORE_IDS.reduce((t, id) => t + (rec.scores[id] ?? 0), 0) / SCORE_IDS.length), { who: `Month ${env.monthOf?.(rec.day) ?? rec.m}, Year ${rec.year ?? env.year()}` });
        const open = (env.care.clinical?.alerts ?? []).filter((x) => x.status === 'open').length;
        if ((rec.residents ?? 0) > 0 && open === 0) st.safeMonths++;
      }
      notify('ach:month');
      save(); // (the month's records into the account store: at most once a game month, plus each unlock / keepsake / Hall entry)
    },
    // the Memory Book changed (src/main.js keepPages): its milestones and #29 at once
    bookChanged() {
      checkMemory();
      notify('ach:book');
    },
    // After a load (once the event director is live): anything already met is earned now (an older home catches up).
    catchUp() {
      const out = check(defs);
      checkHall(caredCounts());
      checkMemory();
      return out;
    },
    // The Records → Achievements rows: locked ones show their name and plain goal (a hidden one shows "???"), earned ones
    // the date (and the home) it was first earned, and whether this home has earned it.
    rows() {
      return defs.map((d) => {
        const u = ach.account.unlocked[d.id] ?? null;
        const secret = d.hidden && !u;
        return { id: d.id, n: d.n, name: secret ? '???' : d.name, text: secret ? 'A hidden achievement' : d.text, hidden: !!d.hidden, scope: d.scope, earned: !!u, when: u, here: d.scope === 'run' ? st.run[d.id] ?? null : null, reward: secret ? '' : rewardWords(d), beat: d.beat ?? null };
      });
    },
    get count() {
      return defs.filter((d) => !d.hidden && ach.isUnlocked(d.id)).length;
    },
    get countHere() {
      return defs.filter((d) => d.scope === 'run' && st.run[d.id]).length;
    },
    earnedHere: (id) => !!achievementById(id) && earnedHere(achievementById(id)),
    isUnlocked: (id) => ach.isUnlocked(id),
    // The Home Records rows, by group: this home's best and the best across all homes.
    recordRows() {
      return RECORD_GROUPS.map((g) => ({ ...g, rows: RECORD_DEFS.filter((d) => d.group === g.id).map((d) => ({ id: d.id, name: d.name, run: st.records[d.id] ?? null, account: records.get(d.id), runText: st.records[d.id] ? d.unit(st.records[d.id].value) : null, accountText: records.get(d.id) ? d.unit(records.get(d.id).value) : null })) }));
    },
    runBest: (id) => st.records[id] ?? null,
    accountBest: (id) => records.get(id),
    get hall() {
      return [...acct.hall].sort((x, y) => (y.days ?? 0) - (x.days ?? 0));
    },
    candidates: () => Object.values(acct.candidates).sort((x, y) => (y.day ?? 0) - (x.day ?? 0)),
    // The player adds a candidate (someone who left) to the Hall of Fame.
    addToHall(id) {
      const s = acct.candidates[id];
      if (!s) return false;
      const ok = induct({ ...s }, 'left');
      save();
      return ok;
    },
    keepsakes: () => Object.entries(acct.keepsakes).map(([id, k]) => ({ id, ...k, ...(KEEPSAKES[id] ?? { name: id }) })),
    hasKeepsake: (id) => !!acct.keepsakes[id],
    // The Memory Book's cover: the newest cover keepsake earned (null: the plain cover)
    cover() {
      const m = [...MEMORY_MILESTONES].reverse().find((x) => acct.keepsakes[x.keepsake]);
      return m ? KEEPSAKES[m.keepsake].name : null;
    },
    frame() {
      return acct.keepsakes.frameLegacy ? KEEPSAKES.frameLegacy.name : acct.keepsakes.frameGold ? KEEPSAKES.frameGold.name : null;
    },
    memoryMilestones: () => ({ ...acct.memory }),
    accountData,
    loadAccount,
    setAccountStore(s) {
      store = s ?? { save: () => {} };
    },
    // Records that only grew (a longer stay, an older resident) are written with the next save, the month's close or now.
    flush() {
      return dirty ? save() : null;
    },
    get dirty() {
      return dirty;
    },
    // ?debug=1 / tests: earn one now, as if its facts held (its reward once).
    debugUnlock(id) {
      const d = achievementById(id);
      if (!d) return null;
      if (d.scope === 'run') st.run[d.id] ??= { day: today() };
      const res = ach.unlock(id);
      if (res) st.paid[d.id] = true;
      bus?.emit('care:achievement', { id: d.id, name: d.name, beat: res ? d.beat ?? null : null, first: !!res, reward: res ? rewardWords(d) : '' });
      save();
      return res;
    },
    serialize() {
      return st;
    },
  };
  return api;
}
