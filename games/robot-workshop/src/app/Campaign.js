// One Robot Workshop run: seeded RNG, calendar, staff, robot projects, history, money, products,
// reputation, market, contracts, the workshop layout (facilities + expansions), research, and saving/loading.
// Random numbers: the main stream drives staff, projects and sales; the market and the contracts each
// have their own seeded stream, so contract offers never change how a robot build rolls.
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
import { STAFF, ROLES, TIERS, STARTER_IDS, EMPLOYEE_CAP } from '../../data/staff.js';
import { TRAITS } from '../../data/traits.js';
import { STAT_KEYS } from '../../data/stats.js';
import { PHASES, BUDGET_FOCUS } from '../../data/phases.js';
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
};

// Things research unlock actions name ("part:CH02", "facility:F07"…): for these, the research part of their
// unlock rule is met only by that action having fired (see data/research.js).
const PROMISED = new Set(RESEARCH_NODES.flatMap((n) => n.actions.map((a) => `${a.type}:${a.id}`)));
const QUEUE_RULES = new Set(RESEARCH_QUEUES.map((q) => q.rule));

export class Campaign {
  constructor({ bus, saveManager = null }) {
    this.bus = bus;
    this.saveManager = saveManager;
    this.campaignId = null;
    this.seed = CAMPAIGN_SEED;
    this.rng = new Rng(this.seed);
    this.clock = new Clock({ bus, ...CALENDAR });
    this.clock.speedAllowed = (speed) => this.speedUnlocked(speed);
    // Workshop layout (§18). Other systems read facility bonuses through fx(key), never by facility id.
    this.facilities = new FacilitySystem({
      bus,
      defs: FACILITIES,
      area: { cols: WORKSHOP_START.cols, rows: WORKSHOP_START.rows },
      zones: EXPANSIONS,
      entrance: WORKSHOP_START.entrance,
      sellRefundPct: WORKSHOP_START.sellRefundPct,
    });
    const fx = (key) => this.facilities.total(key);
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
      planActivity: (s) => (s.assigned ? 'working' : 'resting'),
      energyLossMultiplier: (s) => 1 + (this.focusFor(s)?.energyDrainPct ?? 0) / 100,
      restModifier: () => ({ energyMult: 1 + fx('restEnergyPct') / 100, morale: fx('restMorale') }), // Break Table, Charging Dock
    });
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
        busyElsewhere: (id) => {
          const job = this.assignments.jobOf(id);
          return job ? `On ${job.name}` : null;
        },
        onComplete: (node, { staffId }) => staffId && this.staff.addXp(staffId, node.cost * RESEARCH_RULES.xpPerRp),
      },
    });
    this.assignments = new AssignmentSystem({
      staff: this.staff,
      getJobs: () => this.projects.jobs,
      bus,
      busyElsewhere: (id) => (this.research.busyIds.includes(id) ? 'On research' : null),
      otherBusyIds: () => this.research.busyIds,
    });
    for (const e of ['research:start', 'research:assign', 'research:stop', 'research:complete']) bus.on(e, () => this.assignments.refresh());
    bus.on('research:rp', ({ amount }) => amount > 0 && (this.flags.firstRp = true)); // opens the Research Desk (F11, §18.2)
    bus.on('unlock:fired', () => this.applyFeatures());
    bus.on('facility:placed', ({ item }) => item.def === RESEARCH_QUEUES[0].rule.id && bus.emit('research:desk', { item }));
    bus.on('facility:sold', () => {
      this.research.closeLockedQueues(); // e.g. the Research Desk was sold: its queue stops, progress kept
      this.assignments.refresh();
    });
    this.projects.assignments = this.assignments;
    this.robots = new RobotBuildSystem({ rng: this.rng, staff: this.staff, traits: TRAITS, bus, now: () => this.clock.now(), effects: fx });
    this.projects.hooks = this.robots.hooks();

    this.economy = new EconomySystem({ bus, currencies: CURRENCIES, debt: DEBT_RULES, now: () => this.clock.totalDays });
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
    // A robot built for a contract is checked against it as soon as it is finished.
    bus.on('project:complete', ({ job, record }) => {
      this.projectRp(record);
      if (job.data.contractId) this.deliverRecord(job.data.contractId, record.number);
    });
    this.flags = {};
    this.guideState = undefined; // first-time guide progress (owned by the game's GuideSystem); null = older save
    this.lastSaveError = null;

    bus.on('clock:day', () => this._day());
    bus.on('clock:month', () => this._month());
    bus.on('economy:closure', () => {
      this.flags.closed = true;
      this.clock.pause();
    });
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
    this.staff.dailyTick();
    this._pushStreaks();
    this.contracts.dailyTick(this.clock.totalDays); // deadlines
    this._displayReputation();
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
    return Math.round((base + staff / c.salaryDivisor + this.fx('runningCostPerDay')) * c.focusMultiplier[job.data.budgetFocus]);
  }

  // What the parts bill comes to today, after Parts Racks / Storage Crates.
  buildCostFor(components) {
    return Math.round(this.robots.buildCost(components) * (1 + this.fx('materialCostPct') / 100));
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
    this.reputation.add(rec.result.quality * REPUTATION_RULES.launchPerQuality, `Launch: ${rec.name}`);
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
      case 'all':
        return rule.of.every((r) => this.ruleMet(r, subject));
      default:
        return false; // competitions, counters, secrets: later milestones
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
    if (!this.economy.canAfford('credits', d.cost)) return 'Not enough credits';
    return null;
  }

  buildFacility(defId, col, row, rot = 0) {
    const block = this.buyBlock(defId);
    if (block) return { ok: false, reason: block };
    const res = this.facilities.place(defId, col, row, rot);
    if (!res.ok) return res;
    this.economy.add('credits', -FACILITIES[defId].cost, `Built: ${FACILITIES[defId].name}`, 'facility');
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
    this.research.addRp(RP_SOURCES.project.base + (r.totalCx ?? 0) * RP_SOURCES.project.perComplexity, `Robot finished: ${record.name}`, day);
    const firsts = Object.values(r.components ?? {}).filter((id) => this.research.firstTime('part', id));
    if (firsts.length) this.research.addRp(firsts.length * RP_SOURCES.firstPartUse, `First use: ${firsts.map((id) => COMPONENTS[id]?.name ?? id).join(', ')}`, day);
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
    this.reputation.add(c.reputation, `Contract: ${c.title}`);
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
    this.flags = {};
    this.guideState = undefined; // a brand-new run: the guide starts from step 1
    this.reputation.load({ value: 0, highestRankIndex: 0 });
    this.clock.load({ year: 1, month: 1, day: 1, totalDays: 0, dayProgress: 0, speed: CALENDAR.speeds[0] });
    this.startLayout();
    this.staff.load([]);
    for (const id of STARTER_IDS) this.staff.addFromDefinition(STAFF.find((s) => s.id === id));
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
    this.applyFeatures();
    this.guideState = data.guide ?? null;
    this.assignments.refresh();
    this.bus.emit('campaign:ready', { fresh: false });
  }

  async save() {
    if (!this.saveManager) return null;
    try {
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
