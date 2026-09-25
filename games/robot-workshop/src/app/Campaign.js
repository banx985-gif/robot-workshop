// One Robot Workshop run: seeded RNG, calendar, staff, robot projects, history, money, products,
// reputation, market, contracts, the workshop layout (facilities + expansions), research, hiring, training,
// career records (Milestone 11), competitions (Milestone 12), the competition ladder, rivals, rankings and
// trophies (Milestone 13), combos and their discovery archive (Milestone 14), events, sponsors and the message
// inbox (Milestone 15) and saving/loading.
// The combo archive has two halves: this run (in the campaign save) and the account (its own save record,
// kept across new runs — accountManager).
// Random numbers: the main stream drives staff, projects and sales; the market and the contracts each
// have their own seeded stream, so contract offers never change how a robot build rolls. Events have their own too.
// Everything that must come back identical after a reload lives here.
import { Rng } from '../../../../core/Rng.js';
import { Clock } from '../../../../core/Clock.js';
import { StaffSystem } from '../../../../core/StaffSystem.js';
import { ProjectSystem } from '../../../../core/ProjectSystem.js';
import { AssignmentSystem } from '../../../../core/AssignmentSystem.js';
import { JobHistory } from '../../../../core/JobHistory.js';
import { EconomySystem } from '../../../../core/EconomySystem.js';
import { ProductSystem, slotsFromRank } from '../../../../core/ProductSystem.js';
import { MarketSystem } from '../../../../core/MarketSystem.js';
import { ContractSystem } from '../../../../core/ContractSystem.js';
import { writeReview } from '../../../../core/ReviewText.js';
import { ReputationSystem } from '../../../../core/ReputationSystem.js';
import { FacilitySystem } from '../../../../core/FacilitySystem.js';
import { rankAtLeast, valueForRank } from '../../../../core/CompanyRank.js';
import { ResearchSystem } from '../../../../core/ResearchSystem.js';
import { UnlockRunner } from '../../../../core/UnlockActions.js';
import { RecruitmentSystem } from '../../../../core/RecruitmentSystem.js';
import { TrainingSystem } from '../../../../core/TrainingSystem.js';
import { StoreStub } from '../../../../core/StoreStub.js';
import { StaffModel } from '../../../../core/StaffModel.js';
import { CareerRecords } from '../../../../core/CareerRecords.js';
import { CompetitionSystem, rotatingWeights } from '../../../../core/CompetitionSystem.js';
import { RivalSystem } from '../../../../core/RivalSystem.js';
import { Rankings } from '../../../../core/Rankings.js';
import { TrophyCase } from '../../../../core/TrophyCase.js';
import { competitionRuleMet } from '../../../../core/CompetitionPrereqs.js';
import { DiscoveryArchive } from '../../../../core/DiscoveryArchive.js';
import { EventSystem } from '../../../../core/EventSystem.js';
import { SponsorSystem } from '../../../../core/SponsorSystem.js';
import { NotificationSystem } from '../../../../core/NotificationSystem.js';
import { EVENTS, EVENTS_BY_ID, EVENT_CAPS, EVENT_RULES, NOTIFY_RULES } from '../../data/events.js';
import { SPONSORS, SPONSOR_RULES } from '../../data/sponsors.js';
import { SecretEngine } from '../../../../core/SecretEngine.js';
import { SECRETS, SECRETS_BY_ID, SECRET_RULES, SECRET_TRIGGERS } from '../../data/secrets.js';
import { createSecretFacts, runAccountFacts } from '../systems/secretFacts.js';
import { SYNERGIES_BY_ID } from '../../data/synergies.js';
import { COMPETITIONS, COMPETITIONS_BY_ID, COMPETITION_RULES, TROPHIES, RANKING_POINTS } from '../../data/competitions.js';
import { RIVALS, RIVAL_RULES } from '../../data/rivals.js';
import { TUNINGS, STRATEGIES } from '../../data/tuning.js';
import { entrantOf, pilotMods, pilotOf, ordinal } from '../systems/CompetitionRules.js';
import { CHANNELS, RECRUIT_RULES, STORE_ITEMS, TUTORIAL_HIRES } from '../../data/recruitment.js';
import { COURSES, TRAINING_SLOTS, TRAINING_DURATION_EFFECTS, TRAINING_RULES } from '../../data/training.js';
import { candidateMaker, namedCandidate, signingFee } from '../systems/Candidates.js';
import { STAFF, STAFF_BY_ID, ROLES, TIERS, STARTER_IDS, EMPLOYEE_CAP, RECRUITABLE_TIERS, NOT_IN_POOL, CAREER_COUNTERS } from '../../data/staff.js';
import { AI_HEAVY } from '../../data/unlocks.js';
import { SIGNATURE_HOOKS } from '../systems/signatureHooks.js';
import { TRAITS } from '../../data/traits.js';
import { STAT_KEYS, ROBOT_STAT_KEYS } from '../../data/stats.js';
import { PHASES, BUDGET_FOCUS, PROJECT_TIERS } from '../../data/phases.js';
import { STARTER_PARTS, COMPONENTS } from '../../data/components.js';
import { PURPOSES, PURPOSE_ORDER } from '../../data/purposes.js';
import { SEGMENTS, MARKET_RULES } from '../../data/segments.js';
import { CONTRACT_RULES } from '../../data/contracts.js';
import { REVIEW_TEMPLATES, FIT_BANDS } from '../../data/reviews.js';
import { CALENDAR, SPEED_UNLOCKS, STAFF_RULES, PROJECT_RULES, CAMPAIGN_SEED } from '../../data/balance.js';
import { CURRENCIES, STARTING_MONEY, DEBT_RULES, SALARY_RULES, OPERATING_COST, TECH_CHIP_REWARDS, RANKS, REPUTATION_RULES } from '../../data/economy.js';
import { PRODUCT_SLOT_STEPS, SALES_RULES } from '../../data/market.js';
import { FACILITIES, EXPANSIONS, WORKSHOP_START, PROJECT_BAYS, DISPLAY_RULES, LOCKED_LATER } from '../../data/facilities.js';
import { RESEARCH_NODES, RESEARCH_MILESTONES, RESEARCH_QUEUES, RESEARCH_RULES, RESEARCH_BRANCH_INFO, RP_SOURCES, NG_PLUS_RESEARCH, researchNodeId } from '../../data/research.js';
import { describeUnlock } from '../systems/unlockRules.js';
import { RobotBuildSystem } from '../systems/RobotBuildSystem.js';
import { Sales } from '../systems/Sales.js';
import { contractHooks, checkRecord } from '../systems/ContractRules.js';

// Save migrations (bible §37.6): each step upgrades one version.
export const SAVE_MIGRATIONS = {
  // v1 (Milestone 2) had no projects or history.
  1: (record) => ({ ...record, data: { ...record.data, projects: { nextId: 1, jobs: [] }, history: { count: 0, records: [] } } }),
  // v2 (Milestone 3) had no money: start the ledger with the first-run money.
  2: (record) => {
    const day = record.data.calendar?.totalDays ?? 0;
    const ledger = [
      { n: 1, day, currency: 'credits', amount: STARTING_MONEY.credits, reason: 'Starting money', category: 'start', balance: STARTING_MONEY.credits },
      { n: 2, day, currency: 'techChips', amount: STARTING_MONEY.techChips, reason: 'Welcome grant', category: 'start', balance: STARTING_MONEY.techChips },
    ];
    return {
      ...record,
      data: {
        ...record.data,
        economy: { balances: { ...STARTING_MONEY }, ledger, nextLine: 3, badMonths: 0, closed: false },
        reputation: { value: 0, highestRankIndex: 0 },
        market: { demand: { homeHobby: 100 } },
        products: { nextId: 1, products: [] },
        flags: {},
      },
    };
  },
  // v3 (Milestone 4–6) had one market segment and no contracts: the new market starts fresh on load
  // (Campaign.loadData), contracts start empty, products keep their saved sales exactly.
  3: (record) => ({ ...record, data: { ...record.data, market: null, contracts: null } }),
  // v4 (Milestone 7) had no first-time guide: null tells the game this is an older run (see main.js).
  4: (record) => ({ ...record, data: { ...record.data, guide: null } }),
  // v5 (Milestone 7b) had a fixed room: null = start from the starting layout (bench, pedestal, Assembly Bay).
  5: (record) => ({ ...record, data: { ...record.data, workshop: null } }),
  // v6 (Milestone 8) had no research: null = start it fresh, with RP back-paid for robots already built (Campaign.loadData).
  6: (record) => ({ ...record, data: { ...record.data, research: null, unlocks: null } }),
  // v7 (Milestone 9) had no hiring or training: null = a fresh candidate board, nobody training (Campaign.loadData).
  7: (record) => ({ ...record, data: { ...record.data, recruitment: null, training: null } }),
  // v8 (Milestone 10) had no career records: null = rebuild them from the roster and the robot history (Campaign.loadData).
  8: (record) => ({ ...record, data: { ...record.data, careers: null } }),
  // v9 (Milestone 11) had no competitions: null = no entries yet; invitations open on the next game day.
  9: (record) => ({ ...record, data: { ...record.data, competitions: null } }),
  // v10 (Milestone 12) had no rankings or trophies: null = rebuilt from the results and records kept (Campaign.loadData).
  10: (record) => ({ ...record, data: { ...record.data, rankings: null, trophies: null } }),
  // v11 (Milestone 13) had no combos: null = nothing discovered yet in this run.
  11: (record) => ({ ...record, data: { ...record.data, synergies: null } }),
  // v12 (Milestone 14) had no events, sponsors or inbox: null = start them fresh from the day the save is loaded.
  12: (record) => ({ ...record, data: { ...record.data, events: null, sponsors: null, notifications: null } }),
  // v13 (Milestone 15) had no secret engine: null = no clues or secrets yet in this run.
  13: (record) => ({ ...record, data: { ...record.data, secrets: null } }),
};

// Things research unlock actions name ("part:CH02", "facility:F07"…): for these, the research part of their
// unlock rule is met only by that action having fired (see data/research.js).
const PROMISED = new Set(RESEARCH_NODES.flatMap((n) => n.actions.map((a) => `${a.type}:${a.id}`)));
const QUEUE_RULES = new Set(RESEARCH_QUEUES.map((q) => q.rule));
// Project tiers that count as an "advanced robot" (C09 needs 5): Advanced and above.
const ADVANCED_TIERS = PROJECT_TIERS.slice(PROJECT_TIERS.findIndex((t) => t.id === 'advanced')).map((t) => t.id);

export class Campaign {
  constructor({ bus, saveManager = null, accountManager = null }) {
    this.bus = bus;
    this.saveManager = saveManager;
    this.accountManager = accountManager; // account-wide record (combo archive), survives new runs
    this.synergyArchive = new DiscoveryArchive({ bus });
    this.campaignId = null;
    this.seed = CAMPAIGN_SEED;
    this.rng = new Rng(this.seed);
    this.clock = new Clock({ bus, ...CALENDAR });
    this.clock.speedAllowed = (speed) => this.speedUnlocked(speed);
    // Workshop layout (§18). Other systems read bonuses through fx(key), never by facility id: the shared effect
    // query adds up the facilities, the active sponsor's benefits and the timed effects of events (Milestone 15).
    this.facilities = new FacilitySystem({
      bus,
      defs: FACILITIES,
      area: { cols: WORKSHOP_START.cols, rows: WORKSHOP_START.rows },
      zones: EXPANSIONS,
      entrance: WORKSHOP_START.entrance,
      sellRefundPct: WORKSHOP_START.sellRefundPct,
    });
    const fx = (key) => this.facilities.total(key) + (this.sponsors?.total(key) ?? 0) + (this.events?.total(key) ?? 0);
    this.fx = fx;
    this.staff = new StaffSystem({
      rng: this.rng,
      bus,
      statKeys: STAT_KEYS,
      roles: ROLES,
      tiers: TIERS,
      traits: TRAITS,
      rules: STAFF_RULES,
      // On a project → working (Energy drains); otherwise resting (§9.5).
      // On a project or research → working (Energy drains); in training → away (no change); otherwise resting (§9.5).
      planActivity: (s) => (this.training?.trainingOf(s.id) ? 'training' : s.assigned ? 'working' : 'resting'),
      energyLossMultiplier: (s) => 1 + (this.focusFor(s)?.energyDrainPct ?? 0) / 100,
      restModifier: () => ({ energyMult: 1 + fx('restEnergyPct') / 100, morale: fx('restMorale') }), // Break Table, Charging Dock
      signatureHooks: SIGNATURE_HOOKS, // what each legendary/secret signature trait does
    });
    // Career record per worker (kept after they leave): projects, robots, zero-fault builds, events, training.
    this.careers = new CareerRecords({ bus, counters: CAREER_COUNTERS.map((c) => c.key) });
    this.history = new JobHistory({ bus });
    this.projects = new ProjectSystem({
      bus,
      staff: this.staff,
      history: this.history,
      phases: PHASES,
      rules: {
        progressBase: PROJECT_RULES.progressBase,
        progressDivisor: PROJECT_RULES.progressDivisor,
        progressScale: PROJECT_RULES.progressScale,
        checkpoints: [PROJECT_RULES.breakthroughCheckAt],
      },
    });
    // Research (§19): a worker on a research queue can't be on a project, and the other way round.
    this.unlocks = new UnlockRunner({ bus });
    this.research = new ResearchSystem({
      bus,
      nodes: RESEARCH_NODES,
      milestones: RESEARCH_MILESTONES,
      queues: RESEARCH_QUEUES,
      runner: this.unlocks,
      staff: this.staff,
      rules: RESEARCH_RULES,
      hooks: {
        // Queue rules are never opened by debug "unlock all"; node conditions are.
        conditionMet: (rule) => (QUEUE_RULES.has(rule) ? this.ruleMet(rule) : this.unlockMet(rule)),
        workerStat: (s, node) => s.stats[RESEARCH_BRANCH_INFO[node.branch].stat] ?? 0,
        bonusPerDay: () => fx('researchPerDay'),
        speedPct: () => fx('researchSpeedPct') + this.ngPlusRuns * NG_PLUS_RESEARCH.speedPctPerRun,
        costPct: () => this.ngPlusRuns * NG_PLUS_RESEARCH.costPctPerRun,
        busyElsewhere: (id) => this.busyReason(id, 'research'),
        onComplete: (node, { staffId }) => staffId && this.staff.addXp(staffId, node.cost * RESEARCH_RULES.xpPerRp),
      },
    });
    this.assignments = new AssignmentSystem({
      staff: this.staff,
      getJobs: () => this.projects.jobs,
      bus,
      busyElsewhere: (id) => this.busyReason(id, 'project'),
      otherBusyIds: () => [...this.research.busyIds, ...this.training.busyIds],
    });
    // Hiring (§16) and training (§17). Each has its own random stream, so neither changes robot or market rolls.
    this.store = new StoreStub({ economy: null, items: STORE_ITEMS, bus });
    this.recruitRng = new Rng(`${this.seed}|recruit`);
    this.trainingRng = new Rng(`${this.seed}|training`);
    this.recruitment = new RecruitmentSystem({
      rng: this.recruitRng,
      bus,
      channels: CHANNELS,
      boardSize: RECRUIT_RULES.boardSize,
      reappearChance: RECRUIT_RULES.reappearChance,
      freeManualPerYear: RECRUIT_RULES.freeManualPerYear,
      hooks: {
        makeCandidate: candidateMaker(
          () => this.takenLooks(),
          (ch, tier) => this.namedPool(ch, tier),
        ),
        // §16.2: Agency's small elite chance only after its condition.
        tierWeights: (ch) => (ch.eliteNeeds && !this.ruleMet(ch.eliteNeeds) ? { ...ch.weights, elite: 0 } : ch.weights),
      },
    });
    this.training = new TrainingSystem({
      rng: this.trainingRng,
      bus,
      staff: this.staff,
      statKeys: STAT_KEYS,
      courses: COURSES,
      slots: TRAINING_SLOTS,
      rules: TRAINING_RULES,
      hooks: {
        statCap: (s) => this.staff.statCap(s),
        primaryStat: (s) => ROLES[s.role]?.primaryStat,
        slotCount: (slot) => Math.min(slot.max, slot.base + fx(slot.effect)),
        conditionMet: (rule) => this.unlockMet(rule),
        busyElsewhere: (id) => this.busyReason(id, 'training'),
        canPay: (c) => {
          if (!this.economy.currencies[c.currency]) return 'Not available yet';
          return this.economy.balance(c.currency) >= c.cost ? null : `Not enough ${this.economy.currencies[c.currency].name}`;
        },
        pay: (c, s) => this.economy.add(c.currency, -c.cost, `Training: ${c.name} (${s.name})`, 'training'),
        durationPct: (c, s) => fx(s.role === 'pilot' ? TRAINING_DURATION_EFFECTS.pilot : TRAINING_DURATION_EFFECTS.other),
        now: () => ({ day: this.clock.totalDays, year: this.clock.year }),
        onComplete: (s, c) => {
          this.staff.addXp(s, c.days * TRAINING_RULES.xpPerDay);
          this.careers.bump(s.id, 'training');
        },
      },
    });
    for (const e of ['training:start', 'training:complete', 'training:cancel']) bus.on(e, () => this.assignments.refresh());
    for (const e of ['research:start', 'research:assign', 'research:stop', 'research:complete']) bus.on(e, () => this.assignments.refresh());
    bus.on('research:rp', ({ amount }) => amount > 0 && (this.flags.firstRp = true)); // opens the Research Desk (F11, §18.2)
    bus.on('unlock:fired', () => this.applyFeatures());
    bus.on('facility:placed', ({ item }) => item.def === RESEARCH_QUEUES[0].rule.id && bus.emit('research:desk', { item }));
    bus.on('facility:sold', () => {
      this.research.closeLockedQueues(); // e.g. the Research Desk was sold: its queue stops, progress kept
      this.assignments.refresh();
    });
    this.projects.assignments = this.assignments;
    this.robots = new RobotBuildSystem({
      rng: this.rng,
      staff: this.staff,
      traits: TRAITS,
      bus,
      now: () => this.clock.now(),
      effects: fx,
      // Combos read game rules with ruleMet (debug "unlock all" never switches one on) and earlier discoveries.
      synergyEnv: () => ({ hooks: { discovered: (key) => this.discoveredKey(key), ruleMet: (r) => this.ruleMet(r) }, ngPlus: this.ngPlusRuns }),
    });
    this.projects.hooks = this.robots.hooks();

    this.economy = new EconomySystem({ bus, currencies: CURRENCIES, debt: DEBT_RULES, now: () => this.clock.totalDays });
    this.store.economy = this.economy;
    this.reputation = new ReputationSystem({ bus, ranks: RANKS });
    this.marketRng = new Rng(`${this.seed}|market`);
    this.contractRng = new Rng(`${this.seed}|contracts`);
    this.market = new MarketSystem({ rng: this.marketRng, segments: SEGMENTS, rules: MARKET_RULES, bus });
    this.sales = new Sales({ rng: this.rng, market: this.market, reputation: this.reputation, effects: fx });
    const slotSteps = PRODUCT_SLOT_STEPS.map((s) => ({ minRankIndex: RANKS.findIndex((r) => r.id === s.rank), slots: s.slots }));
    this.products = new ProductSystem({
      bus,
      slots: () => slotsFromRank(slotSteps, this.reputation.highestRankIndex), // §14.2: 2 → 3 at Rank C → 4 at Rank A
      cycleMonths: SALES_RULES.ageCurve.length,
      noveltyPenalty: SALES_RULES.noveltyPenalty,
      hooks: {
        monthlySales: (p, monthIndex) => this.sales.sales(p, monthIndex),
        onSale: (p, sale) => {
          this.economy.add('credits', sale.revenue, `Sales: ${p.name} (month ${sale.month}, ${sale.units} units)`, 'sales');
          this.reputation.add(sale.units * REPUTATION_RULES.salesPerUnit, `${p.name} sales`);
          if (SALES_RULES.reviewMonths.includes(sale.month)) this.addReview(p, sale.month);
        },
        // §14.4: the exact same purpose and six parts as an earlier product is a copy (−15% sales).
        isCopy: (data, earlier) => earlier.data.purpose === data.purpose && Object.keys(data.components).every((slot) => earlier.data.components[slot] === data.components[slot]),
      },
    });
    this.contracts = new ContractSystem({
      rng: this.contractRng,
      bus,
      maxActive: CONTRACT_RULES.maxActive,
      offersPerMonth: CONTRACT_RULES.offersPerMonth,
      hooks: {
        ...contractHooks(),
        onSuccess: (c, rec) => this._contractPaid(c, rec),
        onFail: (c, reason) => this.reputation.add(c.failReputation, `Contract failed (${reason}): ${c.title}`),
      },
    });
    // Competitions (§21): the shared engine scores; entry, prizes and invitations are here (enterCompetition).
    this.rivals = new RivalSystem({ rivals: RIVALS, rules: RIVAL_RULES });
    this.competitions = new CompetitionSystem({ bus, events: COMPETITIONS, tunings: TUNINGS, strategies: STRATEGIES, rivalSystem: this.rivals, rules: COMPETITION_RULES });
    this.rankings = new Rankings({ bus, points: RANKING_POINTS, focusId: 'player' });
    this.trophies = new TrophyCase({ bus, trophies: TROPHIES });
    // A robot built for a contract is checked against it as soon as it is finished.
    bus.on('robot:joined', ({ staffId }) => this.careers.bump(staffId, 'projects'));
    bus.on('project:complete', ({ job, record }) => {
      this._careerFinish(job, record);
      this._synergiesFinished(record);
      this.projectRp(record);
      this.sponsors.signal('robotFinished', { record }, this.clock.totalDays);
      if (job.data.contractId) this.deliverRecord(job.data.contractId, record.number);
    });
    // Events (§24), sponsors (§23) and the message inbox (Milestone 15). Events roll on their own seeded stream.
    this.eventRng = new Rng(`${this.seed}|events`);
    this.events = new EventSystem({
      bus,
      rng: this.eventRng,
      defs: EVENTS,
      caps: EVENT_CAPS,
      rules: EVENT_RULES,
      hooks: {
        conditionMet: (rule) => this.eventCondition(rule),
        setup: (inst, def, rng) => this._eventSetup(inst, def, rng),
        resolve: (e, inst, rng) => this._eventResolve(e, inst, rng),
        apply: (e, inst) => this._eventApply(e, inst),
      },
    });
    this.sponsors = new SponsorSystem({
      bus,
      defs: SPONSORS,
      dealDays: SPONSOR_RULES.dealMonths * CALENDAR.daysPerMonth,
      offerDays: SPONSOR_RULES.offerDays,
      cooldownDays: SPONSOR_RULES.cooldownDays,
      hooks: {
        eligible: (d) => this.sponsorsOpen && this.ruleMet(d.requirement),
        matches: (ob, p) => this._sponsorMatch(ob, p),
      },
    });
    this.notes = new NotificationSystem({ bus, ...NOTIFY_RULES });
    bus.on('contract:success', () => this.sponsors.signal('contractDone', {}, this.clock.totalDays));
    bus.on('contract:failed', ({ reason }) => this.sponsors.signal('contractFailed', { reason }, this.clock.totalDays));
    this.flags = {};
    this.guideState = undefined; // first-time guide progress (owned by the game's GuideSystem); null = older save
    this.lastSaveError = null;

    bus.on('clock:day', () => this._day());
    bus.on('clock:month', () => this._month());
    bus.on('economy:closure', () => {
      this.flags.closed = true;
      this.clock.pause();
    });

    // Secrets (Milestone 16, §28): the shared engine, the robot facts, and rewards through the unlock-action runner.
    // Wired last, so each trigger event is checked after the rest of the game has handled it (the month's sales are
    // in, the finished robot is in the history…). The account half of the engine lives in the account save.
    this.secrets = new SecretEngine({
      bus,
      rules: SECRETS,
      facts: createSecretFacts(this),
      runner: this.unlocks,
      ngPlus: () => this.ngPlusRuns,
      currencyTypes: SECRET_RULES.currencyTypes,
      easing: SECRET_RULES.easing,
      now: () => ({ day: this.clock.totalDays, year: this.clock.year, runId: this.campaignId }),
    });
    this.unlocks.handlers = {
      ...this.unlocks.handlers,
      currency: (a) => this._secretCurrency(a),
      event: (a) => this.events.fire(a.id, this.clock.totalDays, { secret: a.secret }), // e.g. EV20, the mysterious message
    };
    for (const [ev, busEvent] of Object.entries(SECRET_TRIGGERS)) bus.on(busEvent, (payload) => this.checkSecrets(ev, payload));
  }

  // --- secrets (§28) ---
  // A trigger event: only the rules indexed under it are checked (core/SecretEngine).
  checkSecrets(ev, payload = {}) {
    if (!this.campaignId) return [];
    this.syncSecretFacts();
    return this.secrets.notify(ev, payload ?? {});
  }

  // This run's share of the "across all runs" facts (set, not added, so an older save can't double count).
  syncSecretFacts() {
    if (!this.campaignId) return;
    for (const [k, v] of Object.entries(runAccountFacts(this))) this.secrets.setRunFact(k, v, this.campaignId);
  }

  _secretCurrency(a) {
    const rule = SECRETS_BY_ID[a.secret];
    const why = `Secret: ${rule?.name ?? a.secret}`;
    if (a.currency === 'rp') this.research.addRp(a.amount, why, this.clock.totalDays);
    else if (a.currency === 'techChips') this.economy.add('techChips', a.amount, why, 'reward');
    else if (a.currency === 'prestigeTokens') this.flags.prestigeTokensEarned = (this.flags.prestigeTokensEarned ?? 0) + a.amount; // paid out with NG+
  }

  get closed() {
    return !!this.flags.closed;
  }

  // Order inside a day: running costs for today, project work (uses today's Energy), then staff condition.
  _day() {
    for (const job of this.projects.jobs) {
      this.economy.add('credits', -this.operatingCostPerDay(job), `Running cost: ${job.name}`, 'projectDaily');
    }
    this.projects.dailyTick();
    this.research.dailyTick();
    this.training.dailyTick();
    this.staff.dailyTick();
    this.recruitment.dailyTick(this.clock.totalDays); // a special arrival's time running out
    this._tutorialHires();
    this._pushStreaks();
    this.contracts.dailyTick(this.clock.totalDays); // deadlines
    this._competitionInvites();
    this._displayReputation();
    this.sponsors.dailyTick(this.clock.totalDays); // offers run out, a finished deal ends
    this.events.dailyTick(this.clock.totalDays); // seeded, within the §24.3 caps
  }

  // F15: each robot on display earns reputation daily, up to a cap per robot (newest robots go on show).
  _displayReputation() {
    const slots = this.fx('displaySlots');
    if (!slots) return;
    for (const rec of this.displayedRecords(slots)) {
      const got = rec.displayRep ?? 0;
      if (got >= DISPLAY_RULES.capPerModel) continue;
      const add = Math.min(DISPLAY_RULES.repPerDay, DISPLAY_RULES.capPerModel - got);
      rec.displayRep = got + add;
      this.reputation.add(add, `On display: ${rec.name}`, { quiet: true });
    }
  }

  // The newest finished robots, one per display (newest first).
  displayedRecords(slots = this.fx('displaySlots')) {
    return slots > 0 ? this.history.records.slice(-slots).reverse() : [];
  }

  // Month end, then the new month's day 1.
  _month() {
    this.products.monthlyTick(); // last month's sales land
    this.market.rollMonth(); // demand and trends for the new month
    this.recruitment.monthStart(this.clock.month, RECRUIT_RULES.freeChannel); // §16.1 free refresh, odd months
    this.contracts.monthStart(this.contractContext(), this.clock.totalDays); // three new offers
    this.economy.monthEnd(); // debt interest + closure check on the month-end balance
    if (this.closed) return;
    this.paySalaries(); // §9.6: day 1 of each month
    this.staff.monthlyTick();
    this.save().catch(() => {}); // month rollover autosave
  }

  // §9.6: base salary +2% every five levels, rounded to 10.
  salaryFor(s) {
    const steps = Math.floor(s.level / SALARY_RULES.everyLevels);
    const raw = s.salary * Math.pow(1 + SALARY_RULES.raisePct / 100, steps);
    return Math.round(raw / SALARY_RULES.roundTo) * SALARY_RULES.roundTo;
  }

  paySalaries() {
    for (const s of this.staff.staff) this.economy.add('credits', -this.salaryFor(s), `Salary: ${s.name}`, 'salary');
  }

  // §20.5 project operating cost per project day. The facility part (advanced facilities) comes from the effect query.
  operatingCostPerDay(job) {
    const c = OPERATING_COST;
    const staff = this.projects.teamOf(job).reduce((t, s) => t + this.salaryFor(s), 0);
    const base = c.base + job.data.buildCost / c.componentCostDivisor;
    const frugal = 1 + this.robots.teamPct(job, 'runningCostPct') / 100; // Frugal
    return Math.round((base + staff / c.salaryDivisor + this.fx('runningCostPerDay')) * c.focusMultiplier[job.data.budgetFocus] * frugal);
  }

  // What the parts bill comes to today: each part after its slot's discount (a sponsor's cheaper power systems), then
  // Parts Racks / Storage Crates and event price changes on the whole bill.
  buildCostFor(components) {
    let t = 0;
    for (const [slot, id] of Object.entries(components)) t += (COMPONENTS[id]?.cost ?? 0) * (1 + this.fx(`partCostPct.${slot}`) / 100);
    return Math.round(t * (1 + this.fx('materialCostPct') / 100));
  }

  // Product data for launching a robot at a price position (also used for the launch forecast).
  productDataFor(recordNumber, positionId) {
    return this.sales.productData(this.history.get(recordNumber), positionId);
  }

  // Put a finished robot on sale. Returns { product, reason }.
  launchProduct(recordNumber, positionId) {
    const rec = this.history.get(recordNumber);
    if (!rec) return { product: null, reason: 'unknown robot' };
    if (rec.launchedProductId) return { product: null, reason: 'already launched' };
    if (rec.deliveredContractId) return { product: null, reason: 'delivered to a contract' };
    if (!this.products.freeSlots) return { product: null, reason: 'no free product slot' };
    const data = this.sales.productData(rec, positionId);
    const product = this.products.launch({ name: rec.name, launchedAt: this.clock.now(), data });
    rec.launchedProductId = product.id;
    this.addReview(product, 0);
    this.reputation.add(Math.round(rec.result.quality * REPUTATION_RULES.launchPerQuality * this.celebrityMult()), `Launch: ${rec.name}`);
    this.sponsors.signal('launch', { record: rec }, this.clock.totalDays);
    if (!this.flags.firstLaunch) {
      this.flags.firstLaunch = true;
      this.economy.add('techChips', TECH_CHIP_REWARDS.firstLaunch, 'First commercial launch', 'reward');
    }
    return { product, reason: null };
  }

  // §14.5 customer feedback (flavour text) at launch and month 3, from the robot's best/worst stats and Fit.
  addReview(product, month) {
    const rec = this.history.get(product.data.historyNumber);
    const stats = rec?.result?.stats;
    if (!stats) return;
    const fit = product.data.fit;
    const fitBand = fit >= FIT_BANDS.high ? 'high' : fit >= FIT_BANDS.mid ? 'mid' : 'low';
    const text = writeReview(REVIEW_TEMPLATES, { stats, fitBand, name: product.name, seed: `${this.seed}|${product.id}|${month}` });
    (product.data.reviews ||= []).push({ month, text });
  }

  // --- unlock rules (data/unlocks.js) ---
  // subject: what the rule belongs to ({ type: 'part', id }). For things a research node promises, the research
  // part of the rule is met by that node's unlock action having fired. Debug "unlock all" opens everything here.
  unlockMet(rule, subject = null) {
    return !!this.flags.debugUnlockAll || this.ruleMet(rule, subject);
  }

  ruleMet(rule, subject = null) {
    switch (rule?.type) {
      case 'start':
        return true;
      case 'rank':
        return rankAtLeast(RANKS, this.reputation.highestRankIndex, rule.rank);
      case 'flag':
        return !!this.flags[rule.flag];
      case 'role':
        return this.staff.staff.some((s) => s.role === rule.role);
      case 'facility':
        return this.facilities.has(rule.id);
      case 'research':
        if (subject && PROMISED.has(`${subject.type}:${subject.id}`)) return this.unlocks.has(subject.type, subject.id);
        return this.research.isDone(researchNodeId(rule.branch, rule.level));
      case 'researchCount':
        return this.research.doneCount >= rule.min;
      case 'feature':
        return this.feature(rule.id);
      case 'counter':
        return this.counter(rule.counter) >= rule.min;
      case 'purposeBuilt':
        return this.history.records.some((r) => r.result?.purpose === rule.purpose);
      case 'competition':
        return this.competitionProgress(rule);
      case 'yearReached':
        return this.clock.year >= rule.year;
      case 'eventWins':
      case 'eventEntered':
      case 'totalWins':
      case 'trophy':
        return competitionRuleMet(rule, { competitions: this.competitions, trophies: this.trophies });
      case 'contractsDone':
        return this.contracts.done.filter((c) => c.status === 'success' && (!rule.purpose || c.purpose === rule.purpose)).length >= rule.min;
      case 'all':
        return rule.of.every((r) => this.ruleMet(r, subject));
      case 'secret':
        return this.secrets.unlockedInRun(rule.id); // the real §29 rules arrive in Milestone 17
      default:
        return false;
    }
  }

  // Run counters for unlock rules. Only the ones built so far count; the rest stay at 0 until their milestone.
  counter(name) {
    const recs = this.history.records;
    switch (name) {
      case 'projectsCompleted':
        return this.history.count;
      case 'commercialLaunches':
        return recs.filter((r) => r.launchedProductId).length;
      case 'zeroFaultProjects':
        return recs.filter((r) => r.result && r.result.faults === 0).length;
      case 'advancedRobots':
        return recs.filter((r) => ADVANCED_TIERS.includes(r.result?.tier)).length;
      case 'aiHeavyProjects':
        return recs.filter((r) => (COMPONENTS[r.result?.components?.[AI_HEAVY.slot]]?.cx ?? 0) >= AI_HEAVY.minCx).length;
      default:
        return 0; // researchPrototypes, distinctPurposesCompleted: later milestones
    }
  }

  facilityUnlocked(defId) {
    return this.unlockMet(FACILITIES[defId]?.unlock, { type: 'facility', id: defId });
  }

  // §39.1 employee cap at the company's rank.
  get employeeCap() {
    return valueForRank(RANKS, EMPLOYEE_CAP, this.reputation.highestRankIndex);
  }

  // §18.3 project bays: the Assembly Bay gives one; a second needs Rank C and F19 or F20.
  get projectBays() {
    const b = PROJECT_BAYS;
    if (this.fx(b.effect) < 1) return 0;
    let n = 1;
    if (rankAtLeast(RANKS, this.reputation.highestRankIndex, b.second.rank) && b.second.needsAny.some((id) => this.facilities.has(id))) n++;
    return Math.min(b.max, n);
  }

  // Can a new robot project start now? { ok, reason }
  canStartProject() {
    if (!this.projectBays) return { ok: false, reason: 'Build an Assembly Bay first (tap Build)' };
    if (this.projects.jobs.length >= this.projectBays) return { ok: false, reason: 'The project bay is busy — finish the current project first' };
    return { ok: true, reason: null };
  }

  // --- building (bible §18; money here, layout rules in core/FacilitySystem) ---
  // Why this facility can't be bought right now, or null.
  buyBlock(defId) {
    const d = FACILITIES[defId];
    if (!d) return 'Unknown facility';
    if (!this.facilityUnlocked(defId)) return `Locked: ${describeUnlock(d.unlock)}`;
    if (this.economy.isBlocked('facility')) return 'No building while in debt';
    if (!this.economy.canAfford('credits', this.facilityCost(defId))) return 'Not enough credits';
    return null;
  }

  // A facility's price today (a sponsor can make them cheaper). Selling refunds half the list price.
  facilityCost(defId) {
    const d = FACILITIES[defId];
    return d ? Math.round(d.cost * (1 + this.fx('facilityCostPct') / 100)) : 0;
  }

  buildFacility(defId, col, row, rot = 0) {
    const block = this.buyBlock(defId);
    if (block) return { ok: false, reason: block };
    const res = this.facilities.place(defId, col, row, rot);
    if (!res.ok) return res;
    this.economy.add('credits', -this.facilityCost(defId), `Built:${FACILITIES[defId].name}`, 'facility');
    return res;
  }

  moveFacility(uid, col, row, rot) {
    return this.facilities.move(uid, col, row, rot);
  }

  // Why this facility can't be sold, or null.
  sellBlock(uid) {
    const item = this.facilities.get(uid);
    if (!item) return 'Unknown facility';
    const bay = (FACILITIES[item.def].effects ?? []).some((e) => e.key === PROJECT_BAYS.effect);
    if (bay && this.projects.jobs.length && this.fx(PROJECT_BAYS.effect) - 1 < this.projects.jobs.length) return 'A robot is being built in this bay';
    return null;
  }

  sellFacility(uid) {
    const block = this.sellBlock(uid);
    if (block) return { ok: false, reason: block };
    const { item, refund } = this.facilities.remove(uid);
    this.economy.add('credits', refund, `Sold: ${FACILITIES[item.def].name}`, 'facilitySale');
    return { ok: true, item, refund };
  }

  // Why this expansion can't be bought right now, or null.
  expansionBlock(zoneId) {
    const z = EXPANSIONS.find((e) => e.id === zoneId);
    if (!z) return 'Unknown expansion';
    if (this.facilities.isOwned(zoneId)) return 'Already open';
    if (!z.buyable) return LOCKED_LATER;
    if (!this.facilities.zoneReady(zoneId)) return `Open ${z.requires.map((r) => EXPANSIONS.find((e) => e.id === r)?.name ?? r).join(', ')} first`;
    if (!this.unlockMet(z.unlock)) return `Needs ${describeUnlock(z.unlock)}`;
    if (this.economy.isBlocked('facility')) return 'No building while in debt';
    if (!this.economy.canAfford('credits', z.cost)) return 'Not enough credits';
    return null;
  }

  buyExpansion(zoneId) {
    const block = this.expansionBlock(zoneId);
    if (block) return { ok: false, reason: block };
    const z = EXPANSIONS.find((e) => e.id === zoneId);
    this.economy.add('credits', -z.cost, `Workshop ${z.name}`, 'expansion');
    this.facilities.openZone(zoneId);
    return { ok: true, zone: z };
  }

  // A new run's room: the starting layout from data.
  startLayout() {
    this.facilities.reset();
    for (const p of WORKSHOP_START.layout) {
      const res = this.facilities.place(p.def, p.col, p.row, p.rot);
      if (!res.ok) console.error('[Campaign] starting layout:', p.def, res.reason);
    }
  }

  // --- what is open (research, rank…; debug can open everything) ---
  get openPurposes() {
    return PURPOSE_ORDER.filter((id) => this.unlockMet(PURPOSES[id].unlock));
  }

  partOpen(id, { ignoreDebug = false } = {}) {
    const c = COMPONENTS[id];
    if (!c) return false;
    return (!ignoreDebug && !!this.flags.debugUnlockAll) || this.ruleMet(c.unlock, { type: 'part', id });
  }

  get openParts() {
    return new Set(Object.keys(COMPONENTS).filter((id) => this.partOpen(id)));
  }

  // --- research (§19) ---
  get ngPlusRuns() {
    return Math.min(NG_PLUS_RESEARCH.maxRuns, this.flags.ngPlusRuns ?? 0); // NG+ arrives later (§30.5 stored now)
  }

  feature(id) {
    return this.unlocks.has('feature', id);
  }

  // Research features that change other systems (§19.6), re-applied after every unlock and every load.
  applyFeatures() {
    this.products.noveltyPenalty = this.feature('successorPenalty') ? SALES_RULES.noveltyPenaltyResearched : SALES_RULES.noveltyPenalty;
    if (this.feature('trendForecast') !== this.market.lookahead) this.market.setLookahead(this.feature('trendForecast'));
  }

  // §19.7: a finished robot earns 10 + complexity × 2, plus 10 for each part used for the first time.
  projectRp(record) {
    const r = record?.result;
    if (!r) return;
    const day = this.clock.totalDays;
    const pct = 1 + this.fx('projectRpPct') / 100; // OmniSoft
    this.research.addRp(Math.round((RP_SOURCES.project.base + (r.totalCx ?? 0) * RP_SOURCES.project.perComplexity) * pct), `Robot finished: ${record.name}`, day);
    const firsts = Object.values(r.components ?? {}).filter((id) => this.research.firstTime('part', id));
    if (firsts.length) this.research.addRp(firsts.length * RP_SOURCES.firstPartUse, `First use: ${firsts.map((id) => COMPONENTS[id]?.name ?? id).join(', ')}`, day);
  }

  // --- combos (§12) ---
  // A "prior discovery flag" a combo can need: 'part:AI06' = that part was in an earlier finished robot this run;
  // 'synergy:SYN03' = that combo has been discovered (any run).
  discoveredKey(key) {
    const [kind, id] = String(key).split(':');
    if (kind === 'part') return (this.research.firsts.part ?? []).includes(id);
    if (kind === 'synergy') return this.synergyArchive.known(id);
    return false;
  }

  // A finished robot's combos: the first time in this run each one is recorded (run + account) and pays its
  // discovery RP (10 normal / 25 advanced / 100 prestige); RP rewards pay every time, "first time" Rep once a run.
  // Combos one condition away become clues. record.newSynergies lists the ones discovered just now.
  _synergiesFinished(record) {
    const r = record?.result;
    if (!r?.synergies) return;
    const day = this.clock.totalDays;
    record.newSynergies = [];
    for (const id of r.synergies) {
      const rule = SYNERGIES_BY_ID[id];
      const reward = r.synergyRewards?.[id] ?? {};
      const { firstInRun, firstEver } = this.synergyArchive.discover(id, { day, year: this.clock.year, robot: record.name, campaignId: this.campaignId });
      if (firstInRun) {
        record.newSynergies.push({ id, firstEver });
        this.research.addRp(RP_SOURCES.firstSynergy[rule.tier] ?? RP_SOURCES.firstSynergy.normal, `Combo discovered: ${rule.name}`, day);
        if (reward.repFirst) this.reputation.add(Math.round(reward.repFirst * this.celebrityMult()), `Combo: ${rule.name}`);
      }
      if (reward.rp) this.research.addRp(reward.rp, `Combo: ${rule.name} (${record.name})`, day);
    }
    for (const id of r.synergyNear ?? []) if (!SYNERGIES_BY_ID[id]?.hidden) this.synergyArchive.addClue(id, { day });
    if (record.newSynergies.length) this.bus.emit('synergy:discovered', { record, found: record.newSynergies });
  }

  // The builder shows a vague hint: from now on the Combo Archive lists it as a clue.
  noteSynergyClue(id) {
    const rule = SYNERGIES_BY_ID[id];
    if (!rule || rule.hidden || rule.locked) return false;
    return this.synergyArchive.addClue(id, { day: this.clock.totalDays });
  }

  // Start research on queue i with a worker. Returns { ok, reason }.
  startResearch(i, nodeId, staffId) {
    if (!staffId) return { ok: false, reason: 'Pick who will research it' };
    return this.research.start(i, nodeId, staffId);
  }

  // Debug: finish a node now through the normal completion path (its actions and milestones fire once).
  debugCompleteResearch(nodeId) {
    return this.research.complete(nodeId);
  }

  setDebugUnlockAll(on) {
    this.flags.debugUnlockAll = !!on;
  }

  // --- people: who is busy where (a worker does one thing at a time: project, research or training) ---
  busyReason(id, except = null) {
    if (except !== 'project') {
      const job = this.assignments.jobOf(id);
      if (job) return `On ${job.name}`;
    }
    if (except !== 'research' && this.research.busyIds.includes(id)) return 'On research';
    if (except !== 'training' && this.training.trainingOf(id)) return 'In training';
    return null;
  }

  // Names and portraits in use (roster + board), so new candidates don't look like someone already here.
  takenLooks() {
    const people = [...this.staff.staff, ...this.recruitment.cards];
    return { names: new Set(people.map((p) => p.name)), art: new Set(people.map((p) => p.art)) };
  }

  // --- recruitment (§16, §15.7, §39.1) ---
  channelOpen(id) {
    const ch = this.recruitment.channel(id);
    return !!ch && this.unlockMet(ch.unlock);
  }

  // kind: 'free' (the yearly free tap), 'paid' (cash, through a channel), 'techChips' (store, ordinary only).
  refreshBlock(kind, channelId = RECRUIT_RULES.freeChannel) {
    if (kind === 'free') return this.recruitment.freeManualLeft(this.clock.year) ? null : 'Free refresh used this year';
    if (kind === 'techChips') return this.store.block(RECRUIT_RULES.techChipItem);
    const ch = this.recruitment.channel(channelId);
    if (!ch) return 'Unknown channel';
    if (!this.channelOpen(channelId)) return `Needs ${describeUnlock(ch.unlock)}`;
    if (ch.debtBlock && this.economy.isBlocked(ch.debtBlock)) return 'Not while in debt';
    if (this.economy.balance('credits') < ch.cost) return 'Not enough credits';
    return null;
  }

  refreshBoard(kind, channelId = RECRUIT_RULES.freeChannel) {
    const block = this.refreshBlock(kind, channelId);
    if (block) return { ok: false, reason: block };
    if (kind === 'free') {
      this.recruitment.useFreeManual(this.clock.year);
      this.recruitment.refresh(RECRUIT_RULES.freeChannel, 'free');
    } else if (kind === 'techChips') {
      const r = this.store.purchase(RECRUIT_RULES.techChipItem, 'Tech Chip candidate refresh');
      if (!r.ok) return r;
      this.recruitment.refresh(RECRUIT_RULES.freeChannel, 'techChips'); // §16.4: ordinary pool only
    } else {
      const ch = this.recruitment.channel(channelId);
      this.economy.add('credits', -ch.cost, `Recruitment: ${ch.name}`, 'hiring');
      this.recruitment.refresh(channelId, 'paid');
    }
    return { ok: true, reason: null };
  }

  feeFor(candidateId) {
    const c = this.recruitment.get(candidateId);
    return c ? signingFee(c) : 0;
  }

  // Why this candidate can't be hired now, or null. The tutorial hire is always affordable (§26).
  hireBlock(candidateId) {
    const c = this.recruitment.get(candidateId);
    if (!c) return 'No longer available';
    if (this.staff.staff.length >= this.employeeCap) return `Staff cap ${this.employeeCap} reached (Rank ${RANKS[this.reputation.highestRankIndex].id})`;
    if (this.staff.get(c.staffId ?? c.personId)) return 'Already on the team';
    if (!c.guaranteed && this.economy.balance('credits') < signingFee(c)) return 'Not enough credits';
    return null;
  }

  hire(candidateId) {
    const block = this.hireBlock(candidateId);
    if (block) return { ok: false, reason: block };
    const c = this.recruitment.get(candidateId);
    const fee = signingFee(c);
    const short = fee - Math.max(0, this.economy.balance('credits')); // covers the fee, not any debt
    if (c.guaranteed && short > 0) this.economy.add('credits', short, `Help to hire ${c.name}`, 'reward');
    this.recruitment.take(candidateId);
    const s = this.staff.add(
      new StaffModel({
        id: c.staffId ?? c.personId,
        name: c.name,
        role: c.role,
        tier: c.tier,
        level: c.level,
        stats: c.stats,
        traits: c.traits,
        salary: c.salary,
        art: c.art,
        energy: STAFF_RULES.startEnergy,
        morale: STAFF_RULES.startMorale,
      }),
    );
    if (fee) this.economy.add('credits', -fee, `Signing fee: ${c.name}`, 'hiring');
    this.careers.join(s, this.clock.totalDays); // a returning worker picks up their old record
    this.assignments.refresh();
    this.bus.emit('staff:hired', { staff: s, fee });
    return { ok: true, staff: s, fee };
  }

  // Named §15 staff who could be on a card from this channel at this tier right now: unlock rule met (debug
  // "unlock all" counts), the channel fits them, and they aren't already here, on the board or in the pool of
  // people who left. Legendary and secret staff are never here (§9.4); starters and tutorial hires arrive their own way.
  namedPool(channel, tier) {
    const onBoard = new Set(this.recruitment.cards.map((c) => c.staffId).filter(Boolean));
    const gone = new Set(this.recruitment.former.map((f) => f.staffId).filter(Boolean));
    return STAFF.filter(
      (d) =>
        d.tier === tier &&
        RECRUITABLE_TIERS.includes(d.tier) &&
        !NOT_IN_POOL.includes(d.unlock.type) &&
        (d.channels ? d.channels.includes(channel.id) : channel.roles.includes(d.role)) &&
        !this.staff.get(d.id) &&
        !onBoard.has(d.id) &&
        !gone.has(d.id) &&
        this.unlockMet(d.unlock),
    );
  }

  // Debug override (?debug=1): put any of the 50 straight onto the team — free, ignores the staff cap and every
  // lock, including legendary and secret staff. Returns { ok, staff, reason }.
  debugSpawnStaff(staffId) {
    const d = STAFF_BY_ID[staffId];
    if (!d) return { ok: false, reason: 'Unknown staff id' };
    if (this.staff.get(staffId)) return { ok: false, reason: 'Already on the team' };
    this.recruitment.board = this.recruitment.board.filter((c) => c.staffId !== staffId);
    if (this.recruitment.special?.staffId === staffId) this.recruitment.special = null;
    this.recruitment.former = this.recruitment.former.filter((f) => f.staffId !== staffId);
    const s = this.staff.add(StaffModel.fromDefinition(d, STAFF_RULES));
    this.careers.join(s, this.clock.totalDays);
    this.assignments.refresh();
    this.bus.emit('staff:hired', { staff: s, fee: 0, debug: true });
    return { ok: true, staff: s };
  }

  // Celebrity: +% reputation from launches and contracts while a Celebrity works here.
  celebrityMult() {
    return 1 + this.staff.groupEffect(this.staff.staff, 'reputationPct') / 100;
  }

  // Career records when a robot is finished: everyone who worked on it.
  _careerFinish(job, record) {
    const ids = new Set([...(job.data.contributors ?? []), ...(record?.team ?? []).map((t) => t.id)]);
    for (const id of ids) {
      this.careers.bump(id, 'robots');
      if (record?.result?.faults === 0) this.careers.bump(id, 'zeroFault');
    }
  }

  // Years/months with the company (all stints), for the detail screen.
  careerTime(id) {
    const days = this.careers.daysEmployed(id, this.clock.totalDays);
    const months = Math.floor(days / CALENDAR.daysPerMonth);
    return { days, years: Math.floor(months / CALENDAR.monthsPerYear), months: months % CALENDAR.monthsPerYear };
  }

  // Saves from before Milestone 11: a record for everyone on the team (hire day from their signing-fee ledger
  // line, else the start), with the robots they finished taken from the history.
  _rebuildCareers() {
    this.careers.reset();
    for (const s of this.staff.staff) {
      const line = this.economy.ledger.findLast?.((l) => l.reason === `Signing fee: ${s.name}`);
      this.careers.join(s, line?.day ?? 0);
    }
    for (const rec of this.history.records) {
      for (const t of rec.team ?? []) {
        this.careers.bump(t.id, 'projects');
        this.careers.bump(t.id, 'robots');
        if (rec.result?.faults === 0) this.careers.bump(t.id, 'zeroFault');
      }
    }
    for (const job of this.projects.jobs) for (const id of new Set(job.slots.filter(Boolean))) {
      this.careers.bump(id, 'projects');
      (job.data.contributors ||= []).push(id);
    }
  }

  fireBlock(id) {
    if (!this.staff.get(id)) return 'Unknown worker';
    if (this.staff.staff.length <= 1) return 'You need at least one worker';
    return null;
  }

  // §39.1: they leave the roster (no refund, no severance) and may reappear on a later board.
  fire(id) {
    const block = this.fireBlock(id);
    if (block) return { ok: false, reason: block };
    const job = this.assignments.jobOf(id);
    if (job) this.assignments.unassign(job, id);
    const q = this.research.queueOfWorker(id);
    if (q >= 0) this.research.assign(q, null);
    this.training.cancel(id);
    const s = this.staff.remove(id);
    this.careers.leave(s.id, this.clock.totalDays); // the record stays (secrets and records read it later)
    const named = !!STAFF_BY_ID[s.id];
    this.recruitment.release({ personId: s.id, staffId: named ? s.id : undefined, name: s.name, role: s.role, tier: s.tier, level: s.level, stats: { ...s.stats }, salary: s.salary, traits: [...s.traits], art: s.art });
    this.assignments.refresh();
    this.bus.emit('staff:fired', { staff: s });
    return { ok: true, staff: s };
  }

  // §26 tutorial hires. Tessa: Month 1 (and straight away in runs started before hiring existed).
  _tutorialHires() {
    const t = TUTORIAL_HIRES.tessa;
    if (this.flags.tessaOffered || this.clock.totalDays < t.day - 1) return;
    this.flags.tessaOffered = true;
    if (this.staff.get(t.staffId)) return;
    this.recruitment.addSpecial({ ...namedCandidate(t.staffId), guaranteed: t.guaranteed }, { day: this.clock.totalDays, days: RECRUIT_RULES.specialDays, note: t.note });
  }

  // §15.6: Kai West arrives, cheap, when the Local Trial unlocks (the competition invitation calls this).
  localTrialUnlocked() {
    const k = TUTORIAL_HIRES.kai;
    if (this.flags.kaiOffered) return false;
    this.flags.kaiOffered = true;
    if (this.staff.get(k.staffId)) return false;
    this.recruitment.addSpecial({ ...namedCandidate(k.staffId), feeMult: k.feeMult }, { day: this.clock.totalDays, days: RECRUIT_RULES.specialDays, note: k.note });
    return true;
  }

  // --- competitions (§21) ---
  // Unlock rules about competition progress: the words staff and parts use (data/unlocks.js COMPETITION_EVENTS).
  competitionProgress(rule) {
    const recs = this.competitions.records;
    switch (rule.event) {
      case 'firstEntry':
        return this.competitions.totalEntries >= 1;
      case 'localTrial':
        return (recs.C01?.entries ?? 0) >= 1;
      case 'wins':
        return this.competitions.totalWins >= (rule.min ?? 1);
      case 'regionalCup':
        return this.trophies.has('regionalCup');
      case 'nationalCup':
        return this.trophies.has('nationalCup');
      case 'worldTier':
        return this.competitionOpen('C09');
      default:
        return false;
    }
  }

  // Can this event invite the company? Its own unlock rule (debug "unlock all" does NOT open events, so the ladder's
  // rules are what gets tested), or the ?debug=1 competition override — the only way into C11/C12 before secrets exist.
  competitionUnlocked(ev) {
    return !!this.flags.debugCompetitions || this.ruleMet(ev.unlock);
  }

  // Invitations: an event opens once its unlock rule has held for its delay. The Local Trial also brings Kai West.
  // Returns the events opened today.
  _competitionInvites() {
    const day = this.clock.totalDays;
    const opened = [];
    for (const ev of COMPETITIONS) {
      if (this.competitionOpen(ev.id) || !this.competitionUnlocked(ev)) continue;
      const met = (this.flags[`compMet_${ev.id}`] ??= day);
      if (day - met < (ev.inviteDelayDays ?? 0)) continue;
      this.flags[`compOpen_${ev.id}`] = day;
      if (ev.id === TUTORIAL_HIRES.kai.event) this.localTrialUnlocked();
      opened.push(ev);
      this.bus.emit('competition:invite', { event: ev, first: !this.flags.firstInvite });
      this.flags.firstInvite = true;
    }
    return opened;
  }

  // Debug (?debug=1): open every event, secret ones included.
  setDebugCompetitions(on) {
    this.flags.debugCompetitions = !!on;
    if (on) this._competitionInvites();
  }

  competitionOpen(id) {
    return this.flags[`compOpen_${id}`] != null;
  }

  get openCompetitions() {
    return COMPETITIONS.filter((e) => this.competitionOpen(e.id));
  }

  // Game month number (each event runs once a month, M12 choice): one "running" of every event.
  get monthIndex() {
    return Math.floor(this.clock.totalDays / CALENDAR.daysPerMonth);
  }

  // This month's weights for an event (C08 / C12 rotate every running; the rest are fixed).
  competitionWeights(eventId) {
    const ev = COMPETITIONS_BY_ID[eventId];
    return ev.rotate ? rotatingWeights(ev, `${this.seed}|running|${eventId}|${this.monthIndex}`) : { ...ev.weights };
  }

  // C12's weights stay hidden until the first attempt (§21.5).
  weightsKnown(eventId) {
    return !COMPETITIONS_BY_ID[eventId]?.hiddenWeights || (this.competitions.records[eventId]?.entries ?? 0) > 0;
  }

  // Where the campaign is, for the rivals' fixed curves (never the player's scores).
  get competitionContext() {
    return { year: this.clock.year, ngPlusRuns: this.ngPlusRuns };
  }

  // A hidden rival (R08) shows only once its secret chain reveals it (Milestones 16–17).
  rivalShown(id) {
    const r = this.rivals.get(id);
    return !!r && (!r.hidden || !!this.flags[`rivalRevealed_${id}`]);
  }

  // Who appears in the rankings table: the player and every rival the player may see.
  rankingIds() {
    return ['player', ...this.rivals.visible((id) => this.rivalShown(id)).map((r) => r.id)];
  }

  // Finished robots that can still race (a robot handed to a contract customer has gone).
  get competitionRobots() {
    return this.history.records.filter((r) => r.result && !r.deliveredContractId).reverse();
  }

  // Everyone who could pilot today: Test Pilots first (best TST first), then the rest. Training = away.
  get competitionPilots() {
    const pilots = this.staff.staff.filter((s) => !this.training.trainingOf(s.id));
    const pil = (s) => (s.role === 'pilot' ? 1 : 0);
    return pilots.sort((a, b) => pil(b) - pil(a) || b.stats.tst - a.stats.tst);
  }

  tuningOpen(id) {
    const t = this.competitions.tuning(id);
    return !!t && (!t.requires || this.unlockMet(t.requires));
  }

  // The setup CompetitionSystem scores, from the player's picks. null if a pick is missing.
  competitionSetup({ eventId, robotNumber, pilotId, tuningId, strategyId }) {
    const rec = this.history.get(robotNumber);
    const s = this.staff.get(pilotId);
    if (!rec?.result || !s || !COMPETITIONS_BY_ID[eventId]) return null;
    const { mods, signatures } = pilotMods(this.staff, s);
    const entrant = entrantOf(rec);
    for (const k of ROBOT_STAT_KEYS) entrant.stats[k] = Math.min(999, entrant.stats[k] + this.fx(`competitionStat.${k}`)); // Velocity Lab
    return { eventId, tuningId, strategyId, weights: this.competitionWeights(eventId), entrant, pilot: pilotOf(s), mods, signatures, prepBonus: this.fx('competitionPrep') };
  }

  // An event's entry fee today (a sponsor can cut it).
  entryFee(eventId) {
    const e = COMPETITIONS_BY_ID[eventId]?.entry ?? 0;
    return Math.round(e * (1 + this.fx('competitionEntryPct') / 100));
  }

  // Credits this entry costs: entry fee + tuning.
  competitionCost(eventId, tuningId) {
    return this.entryFee(eventId) + (this.competitions.tuning(tuningId)?.cost ?? 0);
  }

  // Why this entry can't go ahead, or null.
  competitionBlock({ eventId, robotNumber, pilotId, tuningId, strategyId }) {
    const ev = COMPETITIONS_BY_ID[eventId];
    if (!ev) return 'Unknown event';
    if (!this.competitionOpen(eventId)) return `Not open yet: ${describeUnlock(ev.unlock)}`;
    if (COMPETITION_RULES.oncePerMonth && this.competitions.records[eventId]?.lastPeriod === this.monthIndex) return 'Already raced this month — it runs again next month';
    const rec = this.history.get(robotNumber);
    if (!rec?.result) return 'Pick a robot';
    if (rec.deliveredContractId) return 'That robot went to a customer';
    if (!this.staff.get(pilotId)) return 'Pick a pilot';
    if (this.training.trainingOf(pilotId)) return 'That pilot is away training';
    const t = this.competitions.tuning(tuningId);
    if (!t) return 'Pick a tuning package';
    if (!this.tuningOpen(tuningId)) return `${t.name} needs ${describeUnlock(t.requires)}`;
    if (!this.competitions.strategy(strategyId)) return 'Pick a strategy';
    const cost = this.competitionCost(eventId, tuningId);
    if (cost > 0 && this.economy.balance('credits') < cost) return `Not enough credits (needs ${cost.toLocaleString('en-US')})`;
    return null;
  }

  // The seed for the next entry into an event: the run's seed + the event + how many times it has been entered.
  // Reloading a save and entering again gives the same dice; only the setup changes the result.
  competitionSeed(eventId) {
    return `${this.seed}|competition|${eventId}|${this.competitions.records[eventId]?.entries ?? 0}`;
  }

  previewCompetition(choice) {
    const setup = this.competitionSetup(choice);
    return setup ? this.competitions.preview(setup, this.competitionContext) : null;
  }

  // Enter: pay, run the whole event now (seeded), keep the result and hand out prizes, ranking points and trophies.
  // The watch view only plays the stored result back, so watching and skipping end the same way.
  // Returns { ok, reason, result }.
  enterCompetition(choice) {
    const block = this.competitionBlock(choice);
    if (block) return { ok: false, reason: block };
    const ev = COMPETITIONS_BY_ID[choice.eventId];
    const tuning = this.competitions.tuning(choice.tuningId);
    const setup = this.competitionSetup(choice);
    const day = this.clock.totalDays;
    const fee = this.entryFee(ev.id);
    if (fee) this.economy.add('credits', -fee, `Entry fee: ${ev.name}`, 'competition');
    if (tuning.cost) this.economy.add('credits', -tuning.cost, `Tuning: ${tuning.name} (${ev.name})`, 'competition');
    const run = this.competitions.run(setup, this.competitionSeed(ev.id), this.competitionContext);
    const ranking = this.rankings.record(run.standings, ev.rankWeight ?? 1); // { before, after } positions
    const result = this.competitions.commit(run, { day, period: this.monthIndex, costs: { entry: fee, tuning: tuning.cost }, signatures: setup.signatures, robotNumber: choice.robotNumber, ranking });
    const w = result.rewards;
    w.credits = Math.round((w.credits ?? 0) * (1 + this.fx('competitionPrizePct') / 100)); // BrightGear, a rival challenge
    if (w.credits) this.economy.add('credits', w.credits, `Prize: ${ev.name} (${ordinal(result.place)})`, 'competition');
    w.rep = Math.round(w.rep * this.celebrityMult());
    if (w.rep) this.reputation.add(w.rep, `Competition: ${ev.name}`, { quiet: true }); // shown on the result screen
    if (w.rp) this.research.addRp(w.rp, `Competition: ${ev.name}`, day);
    // Prestige Tokens (C10–C12): counted now, paid out when the currency arrives with New Game+.
    if (result.won && ev.rewards.prestigeTokens) {
      w.prestigeTokens = ev.rewards.prestigeTokens;
      this.flags.prestigeTokensEarned = (this.flags.prestigeTokensEarned ?? 0) + w.prestigeTokens;
    }
    const pilot = this.staff.get(choice.pilotId);
    this.staff.addXp(pilot, w.xp);
    if (w.morale) this.staff.changeMorale(pilot, w.morale);
    this.careers.bump(pilot.id, 'eventsEntered');
    if (result.won) this.careers.bump(pilot.id, 'eventsWon');
    const rec = this.history.get(choice.robotNumber);
    rec.competitions = { entries: (rec.competitions?.entries ?? 0) + 1, wins: (rec.competitions?.wins ?? 0) + (result.won ? 1 : 0) };
    // Trophies (§21.6): awarded once, shown on the result screen.
    result.trophies = this.trophies.check((r) => this.ruleMet(r), { day, resultId: result.id, eventId: ev.id }).map((t) => t.id);
    // A rival finished ahead of the player (the guide's "rivals get stronger" step).
    const beatenBy = result.standings.find((s) => s.id !== 'player' && (result.player.dnf || s.place < result.place));
    if (beatenBy) this.bus.emit('competition:beaten', { result, rivalId: beatenBy.id });
    this.sponsors.signal('competitionEntered', { eventId: ev.id, result }, day);
    this.bus.emit('competition:enter', { result });
    return { ok: true, reason: null, result };
  }

  // Saves from before Milestone 13: rankings from the results kept, trophies from the records.
  _rebuildLadder() {
    this.rankings.reset();
    for (const r of this.competitions.results) this.rankings.record(r.standings, COMPETITIONS_BY_ID[r.eventId]?.rankWeight ?? 1);
    this.trophies.reset();
    this.trophies.check((rule) => this.ruleMet(rule), { day: this.clock.totalDays, rebuilt: true });
  }

  // --- events (§24) ---
  // Event trigger words (data/events.js EVENT_CONDITIONS), then the unlock words (secret rules stay shut until M16).
  eventCondition(rule) {
    switch (rule?.type) {
      case 'robotsBuilt':
        return this.history.count >= rule.min;
      case 'productsOnSale':
        return this.products.active.length >= rule.min;
      case 'projectRunning':
        return this.projects.jobs.length > 0;
      case 'staffEnergyBelow':
        return this.staff.staff.some((s) => s.energy < rule.value);
      case 'facilitiesOwned':
        return this.facilities.placed.length >= rule.min;
      case 'competitionsOpen':
        return this.openCompetitions.length >= rule.min;
      case 'secret':
        return false; // secret events (EV20) are only ever fired by a secret rule's reward
      case 'sponsorOfferable':
        return !this.sponsors.offers.length && this.sponsors.offerable(this.clock.totalDays).length > 0;
      case 'rpEarned':
        return this.research.rpEarned > 0;
      default:
        return this.ruleMet(rule);
    }
  }

  // Who an event is about, picked (seeded) the moment it happens.
  _eventSetup(inst, def, rng) {
    const staff = this.staff.staff;
    let s = null;
    if (def.who === 'staff') s = rng.pick(staff);
    else if (def.who === 'tired') s = staff.reduce((a, b) => (b.energy < a.energy ? b : a), staff[0]);
    else if (def.who === 'team') s = rng.pick(this.activeProject ? this.projects.teamOf(this.activeProject) : []) ?? rng.pick(staff);
    if (s) return { staffId: s.id, staff: s.name };
    if (def.who === 'rival') {
      const r = rng.pick(this.rivals.visible((id) => this.rivalShown(id)));
      return r ? { rivalId: r.id, rival: r.name } : {};
    }
    if (def.who === 'sponsor') {
      const d = rng.pick(this.sponsors.offerable(this.clock.totalDays));
      return d ? { sponsorId: d.id, sponsor: d.name } : {};
    }
    return {};
  }

  // An effect's numbers, rolled when the event happens: Year 1 = base, + perYear each later year, ± spread.
  _eventResolve(e, inst, rng) {
    if (!e.amount || typeof e.amount !== 'object') return { ...e };
    const a = e.amount;
    let v = a.base + (a.perYear ?? 0) * (this.clock.year - 1);
    if (a.spread) v *= rng.range(1 - a.spread, 1 + a.spread);
    return { ...e, amount: e.type === 'credits' ? Math.round(v / 50) * 50 : Math.round(v) };
  }

  _eventApply(e, inst) {
    const def = EVENTS_BY_ID[inst.id];
    const why = `Event: ${def?.title ?? inst.id}`;
    const day = this.clock.totalDays;
    const people = e.who === 'one' ? [this.staff.get(inst.params.staffId)].filter(Boolean) : e.who === 'team' && this.activeProject ? this.projects.teamOf(this.activeProject) : this.staff.staff;
    switch (e.type) {
      case 'credits':
        if (e.amount) this.economy.add('credits', e.amount, why, 'event');
        break;
      case 'rep':
        this.reputation.add(e.amount, why);
        break;
      case 'rp':
        if (e.amount > 0) this.research.addRp(e.amount, why, day);
        break;
      case 'morale':
        for (const s of people) this.staff.changeMorale(s, e.amount);
        break;
      case 'energy':
        for (const s of people) this.staff.changeEnergy(s, e.amount);
        break;
      case 'sponsorOffer':
        if (inst.params.sponsorId) this.sponsors.offer(inst.params.sponsorId, day);
        break;
    }
  }

  // The player's answer to a choice event. Saved straight away: the answer and its outcome are committed.
  answerEvent(uid, choiceIndex) {
    const inst = this.events.choose(uid, choiceIndex, { day: this.clock.totalDays });
    if (inst) this.save().catch(() => {});
    return inst;
  }

  // A milestone moment (§24.1 illustrated events): once each, ignores the caps.
  fireMilestone(id, params = {}) {
    return this.events.milestone(id, this.clock.totalDays, params);
  }

  // Debug (?debug=1): make an event happen now (ignores caps and triggers).
  debugFireEvent(id) {
    return this.events.fire(id, this.clock.totalDays);
  }

  // --- sponsors (§23) ---
  get sponsorsOpen() {
    return this.ruleMet(SPONSOR_RULES.unlock);
  }

  _sponsorMatch(ob, p) {
    const comps = p.record?.result?.components ?? {};
    if (ob.power && (COMPONENTS[comps[ob.power.slot]]?.cx ?? 0) < ob.power.minCx) return false;
    if (ob.events && !ob.events.includes(p.eventId)) return false;
    if (ob.aiHeavy && (COMPONENTS[comps[AI_HEAVY.slot]]?.cx ?? 0) < AI_HEAVY.minCx) return false;
    return true;
  }

  signSponsor(id) {
    const res = this.sponsors.sign(id, this.clock.totalDays);
    if (res.ok) this.save().catch(() => {});
    return res;
  }

  // Debug (?debug=1): an offer from this sponsor now, requirement or not.
  debugSponsorOffer(id) {
    return this.sponsors.offer(id, this.clock.totalDays, { renewal: true });
  }

  // --- training (§17, §39.2) ---
  startTraining(courseId, staffId) {
    return this.training.start(courseId, staffId);
  }

  // --- contracts ---
  contractContext() {
    return {
      campaign: this,
      year: this.clock.year,
      month: this.clock.month,
      openPurposes: this.openPurposes,
      openParts: this.openParts,
      rankIndex: this.reputation.highestRankIndex,
    };
  }

  acceptContract(id) {
    return this.contracts.accept(id, this.clock.totalDays);
  }

  // Would this finished robot meet the contract? { ok, failures }
  checkContract(contractId, recordNumber) {
    const c = this.contracts.get(contractId);
    return c ? checkRecord(c, this.history.get(recordNumber)) : { ok: false, failures: ['unknown contract'] };
  }

  // Hand a finished robot to an active contract. The result is stored on the robot's record.
  deliverRecord(contractId, recordNumber) {
    const rec = this.history.get(recordNumber);
    const res = this.contracts.deliver(contractId, rec, this.clock.totalDays);
    if (rec) rec.contract = { id: contractId, ok: res.ok, failures: res.failures ?? [] };
    return res;
  }

  // Finished robots that could be handed to this contract right now.
  robotsFor(contractId) {
    return this.history.records.filter((r) => !r.launchedProductId && !r.deliveredContractId && this.checkContract(contractId, r.number).ok);
  }

  _contractPaid(c, rec) {
    if (rec) rec.deliveredContractId = c.id;
    const paid = Math.round(c.payout * (1 + this.fx('contractPayoutPct') / 100)); // Reception Desk
    c.result.paid = paid;
    this.economy.add('credits', paid, `Contract: ${c.title}`, 'contract');
    this.reputation.add(Math.round(c.reputation * this.celebrityMult()), `Contract: ${c.title}`);
    if (this.contractRng.chance(c.specialChance)) {
      this.economy.add('techChips', CONTRACT_RULES.special.techChips, `Contract bonus: ${c.title}`, 'reward');
      c.result.special = true;
    }
    this.research.addRp(RP_SOURCES.contract[c.tier] ?? RP_SOURCES.contract.starter, `Contract: ${c.title}`, this.clock.totalDays);
    this.flags.firstContractDone = true;
    if (c.setsFlag) this.flags[c.setsFlag] = true;
  }

  // §4.2: which game speeds are open yet (Pause and 1× always are).
  speedUnlocked(speed) {
    const rule = SPEED_UNLOCKS[speed];
    if (!rule) return true;
    if (rule.flag && this.flags[rule.flag]) return true;
    if (rule.rank && this.reputation.highestRankIndex >= RANKS.findIndex((r) => r.id === rule.rank)) return true;
    if (rule.afterYear && this.clock.year > rule.afterYear) return true;
    return false;
  }

  speedLockHint(speed) {
    return this.speedUnlocked(speed) ? null : SPEED_UNLOCKS[speed].hint;
  }

  get activeProject() {
    return this.projects.jobs[0] || null;
  }

  focusFor(s) {
    const job = this.assignments.jobOf(s.id);
    return job ? BUDGET_FOCUS[job.data.budgetFocus] : null;
  }

  // §9.5: Push Quality for more than 7 days in a row costs 1 Morale a day (Night Owl ignores it).
  _pushStreaks() {
    const p = PROJECT_RULES.pushStreak;
    for (const s of this.staff.staff) {
      if (this.focusFor(s)?.id === 'push') {
        s.counters.pushStreak = (s.counters.pushStreak ?? 0) + 1;
        if (s.counters.pushStreak > p.afterDays && !this.staff.traitEffect(s, 'noPushStreakPenalty')) {
          this.staff.changeMorale(s, p.moralePerDay);
        }
      } else if (s.counters.pushStreak) {
        s.counters.pushStreak = 0;
      }
    }
  }

  // Start a robot project with the given team. Returns the job.
  // contractId: build it for that active contract (checked against it when finished).
  startRobotProject({ purposeId = 'helper', components = STARTER_PARTS, budgetFocus = 'balanced', teamIds = [], contractId = null }) {
    const job = this.robots.createProject(this.projects, this.history, { purposeId, components, budgetFocus });
    job.data.contractId = contractId;
    job.data.paidCost = this.buildCostFor(components); // after facility discounts
    this.projects.start(job);
    this.economy.add('credits', -job.data.paidCost, `Build cost: ${job.name}`, 'projectBuild');
    for (const id of teamIds) this.assignments.assign(job, id);
    return job;
  }

  newGame(seed = CAMPAIGN_SEED) {
    this.seed = seed;
    this.campaignId = `run-${Date.now().toString(36)}`;
    this.rng.setSeed(seed);
    this.marketRng.setSeed(`${seed}|market`);
    this.contractRng.setSeed(`${seed}|contracts`);
    this.recruitRng.setSeed(`${seed}|recruit`);
    this.trainingRng.setSeed(`${seed}|training`);
    this.eventRng.setSeed(`${seed}|events`);
    this.events.reset(0);
    this.sponsors.reset();
    this.notes.reset();
    this.flags = {};
    this.guideState = undefined; // a brand-new run: the guide starts from step 1
    this.reputation.load({ value: 0, highestRankIndex: 0 });
    this.clock.load({ year: 1, month: 1, day: 1, totalDays: 0, dayProgress: 0, speed: CALENDAR.speeds[0] });
    this.startLayout();
    this.staff.load([]);
    for (const id of STARTER_IDS) this.staff.addFromDefinition(STAFF_BY_ID[id]);
    this.careers.reset();
    for (const s of this.staff.staff) this.careers.join(s, 0);
    this.projects.load({ nextId: 1, jobs: [] });
    this.history.load({ count: 0, records: [] });
    this.assignments.refresh();
    this.economy.reset();
    this.products.load({ nextId: 1, products: [] });
    this.economy.add('credits', STARTING_MONEY.credits, 'Starting money', 'start');
    this.economy.add('techChips', STARTING_MONEY.techChips, 'Welcome grant', 'start');
    this.market.start();
    this.contracts.reset();
    this.unlocks.reset();
    this.research.reset();
    this.training.reset();
    this.competitions.reset();
    this.rankings.reset();
    this.trophies.reset();
    this.synergyArchive.resetRun(); // the account half stays
    this.secrets.resetRun(); // clues and unlocks start again; the account history stays (repeat easing)
    this.recruitment.reset();
    this.recruitment.refresh(RECRUIT_RULES.freeChannel, 'start');
    this.applyFeatures();
    this.contracts.monthStart(this.contractContext(), 0);
    this.paySalaries(); // day 1 of month 1
    this.bus.emit('campaign:ready', { fresh: true });
  }

  // Save schema (subset of bible §37.5 — grows with later milestones).
  serialize() {
    return {
      campaignId: this.campaignId,
      seed: this.seed,
      rngState: this.rng.getState(),
      calendar: this.clock.serialize(),
      staff: this.staff.serialize(),
      projects: this.projects.serialize(),
      history: this.history.serialize(),
      economy: this.economy.serialize(),
      reputation: this.reputation.serialize(),
      market: this.market.serialize(),
      products: this.products.serialize(),
      contracts: this.contracts.serialize(),
      workshop: this.facilities.serialize(),
      research: this.research.serialize(),
      unlocks: this.unlocks.serialize(),
      recruitment: this.recruitment.serialize(),
      training: this.training.serialize(),
      careers: this.careers.serialize(),
      competitions: this.competitions.serialize(),
      rankings: this.rankings.serialize(),
      trophies: this.trophies.serialize(),
      synergies: this.synergyArchive.serializeRun(),
      events: this.events.serialize(),
      sponsors: this.sponsors.serialize(),
      notifications: this.notes.serialize(),
      secrets: this.secrets.serializeRun(),
      guide: this.guideState ?? null,
      flags: { ...this.flags },
    };
  }

  loadData(data) {
    this.campaignId = data.campaignId;
    this.seed = data.seed;
    this.rng.setSeed(data.seed);
    this.rng.setState(data.rngState);
    this.marketRng.setSeed(`${data.seed}|market`);
    this.contractRng.setSeed(`${data.seed}|contracts`);
    this.recruitRng.setSeed(`${data.seed}|recruit`);
    this.trainingRng.setSeed(`${data.seed}|training`);
    // Flags and reputation first: the clock checks them when it restores a saved speed (2×/4× locks).
    this.flags = { ...(data.flags ?? {}) };
    this.reputation.load(data.reputation);
    this.clock.load(data.calendar);
    this.staff.load(data.staff);
    this.projects.load(data.projects);
    this.history.load(data.history);
    this.economy.load(data.economy);
    if (!this.market.load(data.market)) this.market.start(); // saves from before Milestone 7
    this.products.load(data.products);
    this.contracts.load(data.contracts);
    if (data.workshop) this.facilities.load(data.workshop);
    else this.startLayout(); // saves from before Milestone 8
    this.unlocks.load(data.unlocks);
    this.research.load(data.research);
    if (!data.research) for (const rec of this.history.records) this.projectRp(rec); // saves from before Milestone 9
    if (!this.recruitment.load(data.recruitment)) this.recruitment.refresh(RECRUIT_RULES.freeChannel, 'start'); // saves from before Milestone 10
    this.training.load(data.training);
    if (!this.careers.load(data.careers)) this._rebuildCareers(); // saves from before Milestone 11
    this.competitions.load(data.competitions); // null before Milestone 12: no entries yet
    const hasRankings = this.rankings.load(data.rankings);
    const hasTrophies = this.trophies.load(data.trophies);
    if (!hasRankings || !hasTrophies) this._rebuildLadder(); // saves from before Milestone 13
    this.synergyArchive.loadRun(data.synergies); // null before Milestone 14: nothing discovered yet
    this.synergyArchive.loadAccount(null); // anything this run found is known to the account too
    this.eventRng.setSeed(`${data.seed}|events`);
    this.events.load(data.events, this.clock.totalDays); // null before Milestone 15: events start from today
    this.sponsors.load(data.sponsors);
    this.notes.load(data.notifications);
    this.secrets.loadRun(data.secrets); // null before Milestone 16
    this.applyFeatures();
    this.guideState = data.guide ?? null;
    this.assignments.refresh();
    this.bus.emit('campaign:ready', { fresh: false });
  }

  async save() {
    if (!this.saveManager) return null;
    try {
      this.syncSecretFacts();
      if (this.accountManager) await this.accountManager.save({ synergies: this.synergyArchive.serializeAccount(), secrets: this.secrets.serializeAccount() });
      const rec = await this.saveManager.save(this.serialize());
      this.lastSaveError = null;
      return rec;
    } catch (err) {
      this.lastSaveError = err;
      console.error('[Campaign] save failed', err);
      throw err;
    }
  }

  // Load the save if there is one, else start a new run. Returns true if a save was loaded.
  async loadOrNew() {
    try {
      const account = await this.accountManager?.load();
      this.synergyArchive.loadAccount(account?.synergies);
      this.secrets.loadAccount(account?.secrets); // secret history + facts across runs
    } catch (err) {
      console.error('[Campaign] could not load the account record', err);
    }
    let data = null;
    try {
      data = await this.saveManager?.load();
    } catch (err) {
      console.error('[Campaign] could not load save, starting new game', err);
    }
    if (data) {
      this.loadData(data);
      return true;
    }
    this.newGame();
    return false;
  }

  // Jump ahead whole days (tests / debug). Fires the same day/month events as normal play.
  simulateDays(n) {
    for (let i = 0; i < n; i++) this.clock.advanceDay();
  }
}
