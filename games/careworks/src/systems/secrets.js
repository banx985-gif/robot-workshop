// Secrets (Milestone 29, bible §35): the CAREWORKS side of core/SecretEngine (rules as data, trigger-event indexing,
// requiresAll / requiresAny / forbids, countOf / consecutive / sequence / sameAcross, clue stages, once per run / account)
// and core/DiscoveryArchive (the Records → Secrets page). Nothing here changes how the home runs: a secret only reads facts
// (src/systems/secretFacts.js) and, once found, gives its reward through a system that already exists.
//   • the forbid-harm guard: validateSecretRules(rules) on every rule at load and in the tests — a harm fact (data/secrets.js
//     FACTS harm) may only appear in forbids, as "it happened"; a bad rule stops the game in ?debug=1 (strict) and is
//     dropped in a release build
//   • triggers: the home's own moments (data/secrets.js TRIGGERS) as they are emitted, 'secrets:day' each midnight after
//     the quality scores, 'secrets:month' at each month's close after its record is written
//   • clue stages 1–4 then found (5): a new stage is a quiet Inbox line ('secret:clue'); found is a big beat
//     ('secret:found') through the M28 director; nothing ever names the condition
//   • rewards (data REWARD_TYPES), each exactly once per its flag: run rewards through core/UnlockRunner (its fired list is
//     in the campaign save), account rewards keyed by secret in the account store (Prestige Tokens, records, palettes);
//     a reload mid-award repairs whichever half was not saved, never giving anything twice
//   • whyFalse(id): every condition met / not met with its current value against what it needs (the ?debug=1 Secrets
//     panel and the tests)
//
//   createSecrets({ env, state, rules, bus, strict, runId, account }) → api
//     api.notify(trigger, payload) · api.onEmit(name, payload) (the world's bus) · api.daily(day) · api.monthClosed()
//     api.stage(id) · api.whyFalse(id) · api.whyFalseAll() · api.archive() (the Secrets page rows) · api.found(id)
//     api.prestigeTokens · api.records() · api.palettes() · api.flags · api.recognitions
//     api.accountData() / api.loadAccount(data) / api.setAccountStore({ save }) · api.setAccountFacts({ memoryBook })
//     api.serialize() (into care.secrets) · api.dropped (rules the guard refused) · api.debugForce(id)
import { SecretEngine, SECRET_OPS, readPath } from '../../../../core/SecretEngine.js';
import { UnlockRunner } from '../../../../core/UnlockActions.js';
import { DiscoveryArchive } from '../../../../core/DiscoveryArchive.js';
import { CLUE, EASING, TRIGGERS, FACTS, REWARD_TYPES, SECRET_RULES, RECORDS, factDef } from '../../data/secrets.js';
import { GODS } from '../../data/staff.js';
import { godKeyOf } from './blessings.js';

const GOD_KEYS = GODS.map((g) => g.god); // (Milestone 30b)
import { createSecretFacts, ensureLog, monthRecord, dailyRecord, noteMoment } from './secretFacts.js';
import { SCORES } from '../../data/quality.js';

const OWN_TRIGGERS = ['secrets:day', 'secrets:month'];
// The firsts the history fact (run.timeline) keeps, in the order they happen.
const FIRST_KEYS = { 'care:birthday': () => 'birthday', 'care:discharge': () => 'discharge', 'care:compliment': () => 'compliment', 'quality:award': (x) => `award:${x.id}`, 'quality:rankUp': (x) => `rank:${x.rank}`, 'home:stage': (x) => `stage:${x.stage}`, 'partners:signed': (x) => `partner:${x.id}`, 'staff:trained': () => 'course' };
const HAPPENED_OPS = ['gt', 'gte', 'eq', 'has'];
const CURRENCY = Object.entries(REWARD_TYPES).filter(([, t]) => t.currency).map(([k]) => k);
const copy = (x) => JSON.parse(JSON.stringify(x));

// --- the forbid-harm guard (§35, §0.1 rule 11) -----------------------------------------------------------------------------
// A condition "wants" a harm fact when it is in requiresAll / requiresAny (at any depth), or a `where` test of a requirement
// reads a harm field. In forbids, a harm fact must read "it happened" (more than zero / at least one / yes): "fewer than" in
// forbids would want more of it.
const fieldDef = (fact, field) => {
  const f = factDef(fact)?.fields?.[String(field).split('.')[0]];
  return typeof f === 'object' ? f : f ? { name: f } : null;
};
const nameOf = (c) => factDef(c.fact)?.name ?? c.fact;
// A list field in words (scores.familyTrust → Family Trust).
const fieldName = (fact, field) => (String(field).startsWith('scores.') ? SCORES.find((s) => s.id === field.slice(7))?.name : null) ?? fieldDef(fact, field)?.name ?? field;
function happened(op, value) {
  if (!HAPPENED_OPS.includes(op)) return false;
  if (op === 'gt') return typeof value === 'number' && value >= 0;
  if (op === 'gte') return typeof value === 'number' && value > 0;
  if (op === 'eq') return value === true || (typeof value === 'number' && value > 0);
  return true;
}
export function validateSecretRules(rules = SECRET_RULES, { triggers = TRIGGERS, facts = FACTS } = {}) {
  const errors = [];
  const good = [];
  const ids = new Set();
  for (const r of rules) {
    const bad = [];
    const say = (text) => bad.push(`${r?.id ?? '(no id)'}: ${text}`);
    if (!r?.id) say('needs an id');
    else if (ids.has(r.id)) say('the same id twice');
    ids.add(r?.id);
    if (!r?.name) say('needs a name');
    if (!!r?.oncePerRun === !!r?.oncePerAccount) say('needs exactly one of oncePerRun / oncePerAccount');
    if ((r?.clueStages ?? []).length !== CLUE.stages || r.clueStages.some((s) => !s?.text)) say(`needs ${CLUE.stages} clue stages, each with words`);
    if (!(r?.triggerEvents ?? []).length) say('needs at least one trigger');
    for (const t of r?.triggerEvents ?? []) if (!triggers.includes(t)) say(`unknown trigger ${t}`);
    for (const a of r?.rewardActions ?? []) if (!REWARD_TYPES[a?.type]) say(`unknown reward ${a?.type}`);
    if (!(r?.rewardActions ?? []).length) say('needs a reward');
    if (!(r?.requiresAll ?? []).length && !(r?.requiresAny ?? []).length) say('needs at least one condition');
    const walk = (c, where) => {
      if (!c || typeof c !== 'object') return say('a condition that is not an object');
      if (c.all || c.any) return (c.all ?? c.any).forEach((x) => walk(x, where));
      if (!c.fact) return say('a condition with no fact');
      const def = factDef(c.fact) ?? (facts !== FACTS ? facts[c.fact] : null);
      if (!def) say(`unknown fact ${c.fact}`);
      if (!SECRET_OPS.includes(c.op)) say(`unknown operator ${c.op} on ${c.fact}`);
      const harmWhere = (c.where ?? []).filter((w) => fieldDef(c.fact, w.field)?.harm);
      if (where === 'requires') {
        if (def?.harm) say(`"${nameOf(c)}" counts harm — a secret may never want it. Put it in forbids ("and none of these happened").`);
        for (const w of harmWhere) say(`"${fieldDef(c.fact, w.field).name}" (in ${nameOf(c)}) counts harm — a secret may never want it. Put it in forbids.`);
      } else {
        const list = c.op === 'countOf' || c.op === 'consecutive' || c.op === 'sameAcross';
        if (def?.harm && !list && !happened(c.op, c.value)) say(`"${nameOf(c)}" in forbids must read "it happened" (more than none); "${c.op} ${c.value}" would want more of it.`);
        if (list && harmWhere.length) {
          const cmp = c.cmp ?? 'gte';
          if (!happened(cmp, c.value) || harmWhere.some((w) => !happened(w.op, w.value))) say(`"${nameOf(c)}" in forbids must count months or items where harm happened; this would want more of it.`);
        }
      }
    };
    for (const c of [...(r?.requiresAll ?? []), ...(r?.requiresAny ?? [])]) walk(c, 'requires');
    for (const c of r?.forbids ?? []) walk(c, 'forbids');
    for (const c of r?.clueGate ?? []) walk(c, 'requires'); // (Milestone 30: a clue gate may never wait for harm either)
    if (bad.length) errors.push(...bad);
    else good.push(r);
  }
  return { ok: !errors.length, errors, good };
}

// --- the clue gate (Milestone 30 Batch B) -------------------------------------------------------------------------------------
// A rule's optional `clueGate: [cond]`: no rumour (no clue stage, no Inbox line, nothing on the Secrets page) until every one
// holds — the Legendary staff secrets wait for Rank B. The core engine as it is, with its clue step wrapped here.
class CareSecretEngine extends SecretEngine {
  gateOpen(rule) {
    return (rule.clueGate ?? []).every((c) => this.evalCond(c, { event: 'gate', payload: {} }, false).ok);
  }
  _clues(rule, res) {
    if (this.gateOpen(rule)) super._clues(rule, res);
  }
  clueStage(id) {
    const rule = this.byId[id];
    if (rule && !this.unlockedInRun(id) && !this.account.history[id] && !this.gateOpen(rule)) return 0;
    return super.clueStage(id);
  }
}

// --- the system ------------------------------------------------------------------------------------------------------------
export function newSecretsState() {
  return { log: null, run: null, runner: null, archive: null, flags: [], recognitions: [] };
}
export function ensureSecretsState(saved) {
  const fresh = newSecretsState();
  if (!saved || typeof saved !== 'object') return fresh;
  return { ...fresh, ...copy(saved), flags: [...(saved.flags ?? [])], recognitions: [...(saved.recognitions ?? [])] };
}

export function createSecrets({ env, state, rules = SECRET_RULES, bus = null, strict = false, runId = 'run', account = null }) {
  const st = state;
  const check = validateSecretRules(rules);
  if (!check.ok && strict) throw new Error(`[CAREWORKS] secret rules refused by the forbid-harm guard:\n${check.errors.join('\n')}`);
  if (!check.ok) console.warn('[CAREWORKS] secret rules dropped:', check.errors.join('; '));
  const live = check.good;
  const byId = Object.fromEntries(live.map((r) => [r.id, r]));
  let log = ensureLog(st.log, env);
  let accountStore = { save: () => {} };
  let accountFacts = { memoryBook: () => 0 };
  const now = () => ({ day: env.today(), year: env.year(), runId });

  // The engine's own moments go to the home as calm ones (the director decides how they show).
  const engineBus = {
    emit(name, payload) {
      if (name === 'secret:clue') onClue(payload);
      if (name === 'secret:unlocked') onFound(payload);
    },
  };

  // --- rewards: one function per type; account rewards keyed by secret, so they can't be given twice ----------------------
  const acct = () => {
    const f = engine.account.flags;
    f.rewards ||= {};
    f.records ||= {};
    f.palettes ||= {};
    f.godsHired ||= {}; // (Milestone 30b: god key → { day, runId } the first time each Works God joined a team)
    return f;
  };
  const ruleName = (a) => byId[a.secret]?.name ?? a.secret;
  const handlers = {
    prestige: (a) => {
      acct().rewards[`${a.secret}:prestige`] ??= { amount: a.amount ?? 0, day: env.today(), runId };
      saveAccount();
    },
    record: (a) => {
      acct().records[a.id] ??= { day: env.today(), home: env.homeName?.() ?? null, secret: a.secret };
      saveAccount();
    },
    palette: (a) => {
      acct().palettes[a.id] ??= { day: env.today(), secret: a.secret };
      saveAccount();
    },
    recognition: (a) => {
      if (st.recognitions.some((x) => x.id === a.id)) return;
      st.recognitions.push({ id: a.id, day: env.today(), secret: a.secret });
      env.addRecognition?.(); // (the Founder's history: recognitions — bible §3.5.5)
    },
    item: (a) => env.items?.grant('secret', { why: ruleName(a) }),
    // (Milestone 30: the named person's card on the Recruit board, waiting until hired — staffing.arrive, once per person)
    arrival: (a) => {
      if (!st.flags.includes(`arrival:${a.id}`)) st.flags.push(`arrival:${a.id}`);
      env.specialArrival?.(a.id);
    },
    event: (a) => !st.flags.includes(`event:${a.id}`) && st.flags.push(`event:${a.id}`),
    // (Milestone 30 Batch B: an unlock flag — a facility, program, plan or boost a later milestone builds and reads)
    unlock: (a) => !st.flags.includes(`unlock:${a.id}`) && st.flags.push(`unlock:${a.id}`),
  };
  const runner = new UnlockRunner({ handlers });
  const facts = createSecretFacts({ env, log: () => log, engine: () => engine, account: () => ({ memoryBook: () => accountFacts.memoryBook(), prestigeTokens: () => api.prestigeTokens, godsHired: () => Object.keys(acct().godsHired) }) });
  const engine = new CareSecretEngine({ bus: engineBus, rules: live, facts, runner, ngPlus: () => env.ngPlus(), currencyTypes: CURRENCY, easing: EASING, now, discoveredStage: CLUE.found });
  const archive = new DiscoveryArchive({});

  // --- clues and found -------------------------------------------------------------------------------------------------
  const clueText = (rule, stage) => rule.clueStages?.[stage - 1]?.text ?? '';
  function onClue({ rule, stage }) {
    if (!byId[rule.id] || engine.everUnlocked(rule.id)) return;
    archive.addClue(rule.id, { stage, day: env.today() });
    archive.run.clues[rule.id] = { ...(archive.run.clues[rule.id] ?? {}), stage, day: env.today() };
    bus?.emit('secret:clue', { id: rule.id, stage, text: clueText(rule, stage) });
  }
  function onFound({ rule, eased, actions }) {
    if (!byId[rule.id]) return;
    const first = archive.discover(rule.id, { day: env.today(), runId }).firstEver;
    saveAccount();
    bus?.emit('secret:found', { id: rule.id, name: rule.name, reward: rule.reward, first, eased, actions: (actions ?? []).map((a) => a.type) });
  }

  // --- the account half (this device): history, flags, rewards, the archive's account record --------------------------------
  const accountData = () => copy({ engine: engine.serializeAccount(), archive: archive.serializeAccount() });
  function saveAccount() {
    return accountStore.save?.(accountData());
  }
  // A reload mid-award: whichever half (campaign or account) wasn't saved is put right, giving nothing twice.
  function repair() {
    const id = runId;
    for (const r of live) {
      const h = engine.account.history[r.id];
      const inRun = !!engine.run.unlocked[r.id];
      if (h?.runs.includes(id) && !inRun) {
        // the account saw it found in this run; the campaign save didn't keep it: found again quietly, run rewards once
        engine.run.unlocked[r.id] = { ...(h.first ?? now()), runId: id, eased: false, repaired: true };
        const actions = (r.rewardActions ?? []).filter((a) => REWARD_TYPES[a.type].scope === 'run').map((a) => ({ ...a, id: a.id ?? `${r.id}:${a.type}`, secret: r.id }));
        runner.run(actions, `secret:${r.id}`);
        archive.discover(r.id, { day: env.today(), runId: id });
      } else if (inRun && !h?.runs.includes(id)) {
        // the campaign kept it; the account save didn't: the account half again (keyed, so never twice)
        const hh = (engine.account.history[r.id] ||= { runs: [], first: engine.run.unlocked[r.id] });
        hh.runs.push(id);
        for (const a of r.rewardActions ?? []) if (REWARD_TYPES[a.type].scope === 'account') handlers[a.type]({ ...a, secret: r.id });
        archive.discover(r.id, { day: env.today(), runId: id });
      }
    }
  }
  function loadAccount(data) {
    engine.loadAccount(data?.engine ?? null);
    archive.loadAccount(data?.archive ?? null);
    repair();
  }

  // --- the run half (this campaign) ------------------------------------------------------------------------------------
  engine.loadRun(st.run ?? null);
  runner.load(st.runner ?? null);
  archive.loadRun(st.archive ?? null);
  if (account) loadAccount(account);

  // --- triggers ----------------------------------------------------------------------------------------------------------
  const notify = (trigger, payload = {}) => engine.notify(trigger, payload);
  // Milestone 30b: a Works God joined the team — the account remembers it (Havoc's secret reads it), and all five hired at
  // least once (every run) gives the Pantheon record once. → true when this was the fifth
  function godHired(staffId) {
    const key = godKeyOf(staffId);
    if (!key) return false;
    const g = acct().godsHired;
    if (g[key]) return false;
    g[key] = { day: env.today(), runId };
    const all = GOD_KEYS.every((k) => g[k]);
    if (all) handlers.record({ id: 'pantheon', secret: 'pantheon' });
    saveAccount();
    if (all) bus?.emit('secret:pantheon', { name: RECORDS.pantheon.name, text: RECORDS.pantheon.text });
    return all;
  }
  // Every moment the home emits: the records the facts read, then any rule indexed under it.
  function onEmit(name, payload = {}) {
    if (name === 'care:birthday') log.birthdays = (log.birthdays ?? 0) + (payload.residents?.length ?? 1);
    if (name === 'care:discharge') log.discharges = (log.discharges ?? 0) + 1;
    noteMoment(env, log, name, payload); // (Milestone 30 Batch B: birthdays at 100 / a round age, Night shifts, community sessions, the pilot)
    const key = FIRST_KEYS[name]?.(payload);
    if (key && !(log.timeline ??= []).some((x) => x.key === key)) log.timeline.push({ key, day: env.today() });
    if (name === 'staff:hired' && payload.id && log.joined[payload.id] == null) log.joined[payload.id] = env.today();
    if (name === 'staff:hired') godHired(payload.id); // (Milestone 30b)
    if (name === 'staff:left' && payload.id) {
      delete log.joined[payload.id];
      log.lastLeft = env.today();
    }
    if (TRIGGERS.includes(name) && !OWN_TRIGGERS.includes(name)) notify(name, payload);
  }

  // --- the why-false inspector -------------------------------------------------------------------------------------------
  const show = (v) => (v === undefined || v === null ? '—' : typeof v === 'boolean' ? (v ? 'yes' : 'no') : Array.isArray(v) ? (v.length ? v.join(', ') : 'none') : typeof v === 'number' ? String(Math.round(v * 10) / 10) : String(v));
  const OPW = { gte: '+', gt: '+', lte: ' or less', lt: '', eq: '', neq: '' };
  // the unbroken run that ends with the latest item (a broken streak starts again from 0)
  function trailing(cond) {
    const list = facts.get(cond.fact, {}) ?? [];
    let n = 0;
    for (let i = list.length - 1; i >= 0; i--) {
      if (!(cond.where ?? []).every((w) => passes(readPath(list[i], w.field), w.op, w.value))) break;
      n++;
    }
    return n;
  }
  const passes = (a, op, b) => ({ eq: a === b, neq: a !== b, gt: a > b, gte: a >= b, lt: a < b, lte: a <= b, has: Array.isArray(a) && a.includes(b), in: Array.isArray(b) && b.includes(a) })[op] ?? false;
  function rowOf(p, kind) {
    const c = p.cond;
    const label = c.label ?? (c.fact ? nameOf(c) : `${p.group} of these`);
    if (p.group) {
      const parts = p.parts.map((x) => rowOf(x, kind));
      const met = kind === 'forbid' ? !p.ok : p.ok;
      return { kind, label, met, value: null, need: null, text: `${label}: ${parts.map((x) => `${x.met ? '✓' : '✗'} ${x.label}`).join(' · ')}`, parts };
    }
    const met = kind === 'forbid' ? !p.ok : p.ok;
    let text;
    if (kind === 'forbid') text = `${label}: ${p.ok ? `it happened (${show(p.value)})` : `none (now ${show(p.value)})`}`;
    else if (c.op === 'consecutive') {
      const unit = c.unit ?? 'in a row';
      const lastItem = (facts.get(c.fact, {}) ?? []).at(-1);
      const lastWords = lastItem ? (c.where ?? []).map((w) => `${fieldName(c.fact, w.field)} ${show(readPath(lastItem, w.field))} / ${show(w.value)}`).join(' · ') : 'none closed yet';
      text = `${label} for ${p.need} ${unit} — ${trailing(c)} of ${p.need} ${unit} so far (best ${show(p.value)}); latest: ${lastWords}`;
    } else if (c.op === 'countOf' || c.op === 'sameAcross') text = `${label} — ${show(p.value)} of ${show(p.need)}`;
    else if (c.op === 'sequence') text = `${label} — ${show(p.value)} of ${show(p.need)} in order`;
    else if (c.op === 'has') text = `${label} — ${p.ok ? 'yes' : 'not yet'}`;
    else if (c.op === 'lt' || c.op === 'lte') text = `${label} — now ${show(p.value)} (needs ${c.op === 'lt' ? 'under' : 'at most'} ${show(p.need)})`;
    else text = `${label} — ${show(p.value)} / ${show(p.need)}${OPW[c.op] ?? ''}`;
    return { kind, label, fact: c.fact, op: c.op, value: p.value, need: p.need, met, text, ...(c.op === 'consecutive' ? { soFar: trailing(c) } : {}) };
  }
  function whyFalse(id) {
    const rule = byId[id];
    if (!rule) return null;
    const res = engine.evaluate(rule, { event: 'inspect', payload: {} });
    const rows = [];
    if (rule.ngPlusMin) rows.push({ kind: 'ng', label: `New Game+ ${rule.ngPlusMin}`, met: res.ng.ok, value: res.ng.value, need: res.ng.need, text: `New Game+ ${rule.ngPlusMin} — now New Game+ ${res.ng.value}` });
    rows.push(...res.all.map((p) => rowOf(p, 'all')), ...res.any.map((p) => rowOf(p, 'any')), ...res.forbids.map((p) => rowOf(p, 'forbid')));
    return { id, name: rule.name, scope: rule.oncePerAccount ? 'account' : 'run', stage: stage(id), found: engine.everUnlocked(id), foundHere: engine.unlockedInRun(id) || (!!rule.oncePerAccount && !!engine.account.history[id]), ok: res.ok, met: rows.filter((r) => r.met).length, total: rows.length, rows, triggers: rule.triggerEvents };
  }

  // --- stages and the Secrets page -------------------------------------------------------------------------------------------
  const stage = (id) => engine.clueStage(id);
  const rewardWords = (rule) => rule.reward ?? (rule.rewardActions ?? []).map((a) => REWARD_TYPES[a.type].text(a)).join(' · ');

  const api = {
    engine,
    facts,
    runner,
    rules: live,
    dropped: check.errors,
    notify,
    onEmit,
    get log() {
      return log;
    },
    // each midnight, after the quality scores
    daily(day) {
      dailyRecord(env, log); // (Milestone 30)
      return notify('secrets:day', { day });
    },
    // each month's close, after the ledger and the economy: the month's record, then the month's rules
    monthClosed() {
      const rec = monthRecord(env, log);
      notify('secrets:month', { month: rec.m });
      return rec;
    },
    stage,
    whyFalse,
    whyFalseAll: () => live.map((r) => whyFalse(r.id)),
    found: (id) => engine.everUnlocked(id),
    foundInRun: (id) => engine.unlockedInRun(id),
    // The Records → Secrets rows: found (this run or an earlier one) show their name and reward; a clue shows "???" and its
    // newest clue line; nothing else is shown — never the condition.
    archive() {
      return live.map((r) => {
        const s = stage(r.id);
        const st2 = archive.state(r.id);
        if (engine.everUnlocked(r.id)) return { id: r.id, state: engine.unlockedInRun(r.id) ? 'found' : 'known', name: r.name, reward: rewardWords(r), day: engine.run.unlocked[r.id]?.day ?? engine.account.history[r.id]?.first?.day ?? null, stage: CLUE.found };
        if (s > 0) return { id: r.id, state: 'clue', name: '???', clue: clueText(r, s), stage: s, of: CLUE.stages };
        // (a rumour held back by its clue gate — or never reached — shows as not yet hinted at)
        return { id: r.id, state: st2 === 'unknown' || st2 === 'clue' ? 'unknown' : st2, name: '???', stage: 0, of: CLUE.stages };
      });
    },
    get foundCount() {
      return live.filter((r) => engine.everUnlocked(r.id)).length;
    },
    get prestigeTokens() {
      return Object.values(acct().rewards).reduce((t, x) => t + (x.amount ?? 0), 0);
    },
    records: () => ({ ...acct().records }),
    palettes: () => ({ ...acct().palettes }),
    // (Milestone 30b) the Works Gods hired at least once on this device (god key → { day, runId }); Pantheon: all five
    godsHired: () => ({ ...acct().godsHired }),
    get pantheon() {
      return !!acct().records.pantheon;
    },
    godHired,
    get flags() {
      return [...st.flags];
    },
    flag: (f) => st.flags.includes(f),
    // (Milestone 31) Is what an unlock flag opens open here? Its flag in this run — or, for a once-per-account secret
    // found in an earlier run on this device (it can't be found twice), that secret found. Nothing else opens it.
    unlocked(id) {
      if (st.flags.includes(`unlock:${id}`)) return true;
      return live.some((r) => r.oncePerAccount && engine.everUnlocked(r.id) && (r.rewardActions ?? []).some((a) => a.type === 'unlock' && a.id === id));
    },
    // (Milestone 31) A prestige award's own rewards, each once: Prestige Tokens keyed by the award on this device (C11),
    // an accolade kept by this home (C12). A reload repeats the call; nothing is given twice.
    grantPrestige(key, amount) {
      const r = acct().rewards;
      if (r[`${key}:prestige`]) return false;
      r[`${key}:prestige`] = { amount, day: env.today(), runId };
      saveAccount();
      return true;
    },
    grantRecognition(id, why) {
      if (st.recognitions.some((x) => x.id === id)) return false;
      handlers.recognition({ id, secret: why });
      return true;
    },
    get recognitions() {
      return [...st.recognitions];
    },
    accountData,
    loadAccount,
    setAccountStore(store) {
      accountStore = store ?? { save: () => {} };
    },
    setAccountFacts(f) {
      accountFacts = { ...accountFacts, ...(f ?? {}) };
    },
    // ?debug=1 only: the secret as if its facts held (its rewards through the normal runner, once).
    debugForce(id) {
      const rule = byId[id];
      return rule ? engine.unlock(rule) : null;
    },
    serialize() {
      st.log = copy(log);
      st.run = engine.serializeRun();
      st.runner = runner.serialize();
      st.archive = archive.serializeRun();
      return st;
    },
  };
  return api;
}
