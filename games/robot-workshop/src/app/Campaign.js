// One Robot Workshop run: seeded RNG, calendar, staff, robot projects, history, money, products,
// reputation, market, contracts, and saving/loading.
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
import { STAFF, ROLES, TIERS, STARTER_IDS } from '../../data/staff.js';
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
};

export class Campaign {
  constructor({ bus, saveManager = null }) {
    this.bus = bus;
    this.saveManager = saveManager;
    this.campaignId = null;
    this.seed = CAMPAIGN_SEED;
    this.rng = new Rng(this.seed);
    this.clock = new Clock({ bus, ...CALENDAR });
    this.clock.speedAllowed = (speed) => this.speedUnlocked(speed);
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
    this.assignments = new AssignmentSystem({ staff: this.staff, getJobs: () => this.projects.jobs, bus });
    this.projects.assignments = this.assignments;
    this.robots = new RobotBuildSystem({ rng: this.rng, staff: this.staff, traits: TRAITS, bus, now: () => this.clock.now() });
    this.projects.hooks = this.robots.hooks();

    this.economy = new EconomySystem({ bus, currencies: CURRENCIES, debt: DEBT_RULES, now: () => this.clock.totalDays });
    this.reputation = new ReputationSystem({ bus, ranks: RANKS });
    this.marketRng = new Rng(`${this.seed}|market`);
    this.contractRng = new Rng(`${this.seed}|contracts`);
    this.market = new MarketSystem({ rng: this.marketRng, segments: SEGMENTS, rules: MARKET_RULES, bus });
    this.sales = new Sales({ rng: this.rng, market: this.market, reputation: this.reputation });
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
      if (job.data.contractId) this.deliverRecord(job.data.contractId, record.number);
    });
    this.flags = {};
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
    this.staff.dailyTick();
    this._pushStreaks();
    this.contracts.dailyTick(this.clock.totalDays); // deadlines
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

  // §20.5 project operating cost per project day (no facilities yet, so that part is 0).
  operatingCostPerDay(job) {
    const c = OPERATING_COST;
    const staff = this.projects.teamOf(job).reduce((t, s) => t + this.salaryFor(s), 0);
    const base = c.base + job.data.buildCost / c.componentCostDivisor;
    return Math.round((base + staff / c.salaryDivisor) * c.focusMultiplier[job.data.budgetFocus]);
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

  // --- what is open (research arrives in Milestone 9; debug can open everything) ---
  isOpen(rule) {
    return rule?.type === 'start' || !!this.flags.debugUnlockAll;
  }

  get openPurposes() {
    return PURPOSE_ORDER.filter((id) => this.isOpen(PURPOSES[id].unlock));
  }

  get openParts() {
    return new Set(Object.values(COMPONENTS).filter((c) => this.isOpen(c.unlock)).map((c) => c.id));
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
    this.economy.add('credits', c.payout, `Contract: ${c.title}`, 'contract');
    this.reputation.add(c.reputation, `Contract: ${c.title}`);
    if (this.contractRng.chance(c.specialChance)) {
      this.economy.add('techChips', CONTRACT_RULES.special.techChips, `Contract bonus: ${c.title}`, 'reward');
      c.result.special = true;
    }
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
    this.projects.start(job);
    this.economy.add('credits', -job.data.buildCost, `Build cost: ${job.name}`, 'projectBuild');
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
    this.reputation.load({ value: 0, highestRankIndex: 0 });
    this.clock.load({ year: 1, month: 1, day: 1, totalDays: 0, dayProgress: 0, speed: CALENDAR.speeds[0] });
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
