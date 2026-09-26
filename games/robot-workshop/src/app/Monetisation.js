// BOTWORKS monetisation glue (Milestone 23, bible §32): the shared ad, store and entitlement services (core/) set up
// with this game's data (data/monetisation.js), and what each rewarded placement, purchase and VIP perk does here.
// The Campaign owns one of these; the screens ask it what to show. With no provider (a normal web build) the ads and
// the store report "not available" and the game carries on exactly as before; ?debug=1 installs the pretend provider.
//
// What lives where: entitlements, processed transaction ids, interstitial timing and real-time reward limits are
// account data (they survive new runs and New Game+); rewarded uses per stage / topic / game month are run data.
import { EntitlementService } from '../../../../core/EntitlementService.js';
import { AdService } from '../../../../core/AdService.js';
import { CommerceService } from '../../../../core/CommerceService.js';
import { PRODUCTS, REWARDED_BY_ID, REWARD_CEILING, INTERSTITIAL_CAPS, REWARDED, VIP, STORE_MESSAGES, AD_TEXT } from '../../data/monetisation.js';
import { RECRUIT_RULES } from '../../data/recruitment.js';
import { PHASES } from '../../data/phases.js';

const fmt = (n) => Math.round(n).toLocaleString('en-US');
const HOUR = 3600 * 1000;

export class GameMonetisation {
  constructor({ campaign, bus, now = () => Date.now() }) {
    this.c = campaign;
    this.bus = bus;
    this.now = now;
    this.stamp = 0; // bumps whenever something worth saving changes (the 30-second autosave looks at it)
    this.heldTechChips = 0; // bought with no run open (or kept from a reset run): paid into the next run
    this.entitlements = new EntitlementService({ graceHours: VIP.graceHours, now, bus });
    this.ads = new AdService({ caps: INTERSTITIAL_CAPS, placements: REWARDED, now, adFree: () => this.entitlements.adFree(this.now()), bus });
    this.commerce = new CommerceService({
      products: PRODUCTS,
      entitlements: this.entitlements,
      grant: (p, tx) => this._grantProduct(p, tx),
      commit: () => this.commit(),
      messages: STORE_MESSAGES,
      now,
      bus,
    });
    this.provider = null;
    bus.on('commerce:purchased', ({ granted }) => {
      this.ads.notePurchase(); // §32.1: never an interstitial straight after a purchase
      if (granted) this.stamp++;
    });
    bus.on('entitlements:change', () => {
      this.stamp++;
      this.c.applyPerks?.();
    });
  }

  setProvider(p) {
    this.provider = p ?? null;
    this.ads.setProvider(p);
    this.commerce.setProvider(p);
  }

  get providerId() {
    return this.provider?.id ?? 'none';
  }

  // The purchase is written to storage before the store is told it is done (a crash in between re-delivers it, and
  // the processed id then stops a second grant). With no run open only the account slot is written.
  commit() {
    return this.c.hasRun ? this.c.save() : this.c.saveAccount();
  }

  // --- entitlements -----------------------------------------------------------------------------------------------
  get vip() {
    return this.entitlements.vipActive(this.now());
  }

  get removeAds() {
    return this.entitlements.removeAds;
  }

  get adFree() {
    return this.entitlements.adFree(this.now());
  }

  // Start-up and "when online": purchases the store re-delivers, then a quiet recheck of what is owned.
  async startup() {
    const pending = await this.commerce.processPending();
    const check = await this.commerce.recheck();
    return { pending, check };
  }

  // --- purchases --------------------------------------------------------------------------------------------------
  _grantProduct(p, tx) {
    const g = p.grant;
    if (!g || g.currency !== 'techChips') return;
    if (this.c.hasRun && !this.c.closed) {
      this.c.economy.add('techChips', g.amount, `Store: ${p.name}`, 'purchase');
      this.c.flags.techChipsBought = (this.c.flags.techChipsBought ?? 0) + g.amount;
    } else this.heldTechChips += g.amount;
    this.stamp++;
  }

  // Tech Chips bought while no run was open (or kept from a reset run) arrive in the run now open.
  payHeld() {
    if (!this.heldTechChips || !this.c.hasRun || this.c.closed) return 0;
    const n = this.heldTechChips;
    this.heldTechChips = 0;
    this.c.economy.add('techChips', n, 'Bought Tech Chips', 'purchase');
    this.c.flags.techChipsBought = (this.c.flags.techChipsBought ?? 0) + n;
    this.stamp++;
    return n;
  }

  // Settings → Reset this campaign: bought Tech Chips still held in that run are kept for the next one.
  keepBoughtChips() {
    if (!this.c.hasRun) return 0;
    const n = Math.max(0, Math.min(this.c.economy.balance('techChips'), this.c.flags.techChipsBought ?? 0));
    this.heldTechChips += n;
    return n;
  }

  // --- VIP ----------------------------------------------------------------------------------------------------------
  dayKey(t = this.now()) {
    const d = new Date(t);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  claimBlock() {
    if (!this.vip) return 'VIP is not active';
    if (!this.c.hasRun || this.c.closed) return 'Start or continue a game to claim';
    if (this.entitlements.claimDayBlock(this.dayKey())) return 'Already claimed today';
    return null;
  }

  claimDaily() {
    const block = this.claimBlock();
    if (block) return { ok: false, reason: block };
    this.entitlements.claimDay(this.dayKey());
    this.c.economy.add('techChips', VIP.dailyChips, 'VIP daily Tech Chips', 'vip');
    this.stamp++;
    this.c.save().catch(() => {});
    return { ok: true, amount: VIP.dailyChips };
  }

  // --- rewarded placements (§32.1) -----------------------------------------------------------------------------------
  // What each placement would be used on right now: { show, scope, target, block } (block: why not, or null).
  _target(id, ctx = {}) {
    const c = this.c;
    const top = REWARD_CEILING;
    switch (id) {
      case 'workshopBoost': {
        const job = c.activeProject;
        if (!job) return { show: false };
        const out = { show: true, scope: `${job.id}:${job.phaseIndex}`, target: job };
        if (!c.projects.teamOf(job).length) out.block = 'Put someone on the robot team first';
        else if (job.phaseProgress >= job.phaseTarget * top) out.block = 'This stage is nearly done';
        return out;
      }
      case 'recruitmentRefresh':
        return { show: c.hasRun, scope: `month:${c.monthIndex}` };
      case 'researchAssist': {
        const res = c.research;
        const q = res.queues[ctx.queue ?? 0];
        if (!q?.nodeId || !res.queueOpen(ctx.queue ?? 0)) return { show: false };
        const out = { show: true, scope: q.nodeId, target: q.nodeId };
        if ((res.progress[q.nodeId] ?? 0) >= res.costOf(q.nodeId) * top) out.block = 'This topic is nearly done';
        return out;
      }
      case 'bonusContract': {
        const k = c.contracts.done.find((x) => x.id === ctx.contractId);
        const p = REWARDED_BY_ID.bonusContract;
        if (!k || k.status !== 'success' || k.story || c.clock.totalDays - (k.resolvedDay ?? 0) > p.windowDays) return { show: false };
        return { show: true, scope: k.id, target: k };
      }
      case 'recoveryGrant':
        return { show: c.hasRun && c.economy.inDebt, scope: 'grant' };
      default:
        return { show: false };
    }
  }

  // For the screens: { show, ok, label, sub } — show = the button belongs here now; ok = it can be tapped.
  placement(id, ctx = {}) {
    const p = REWARDED_BY_ID[id];
    const t = this._target(id, ctx);
    if (!p || !t.show) return { show: false, ok: false, label: '', sub: '' };
    const lim = this.ads.limitBlock(id, t.scope);
    let sub = p.blurb;
    let ok = true;
    if (t.block) {
      sub = t.block;
      ok = false;
    } else if (lim) {
      ok = false;
      sub = this._usedText(p);
    } else if (!this.ads.available) {
      ok = false;
      sub = AD_TEXT.unavailable;
    }
    return { show: true, ok, label: `${AD_TEXT.tag}: ${p.name}`, sub, tag: AD_TEXT.tag };
  }

  _usedText(p) {
    switch (p.limit.per) {
      case 'phase':
        return 'Used on this stage — again next stage';
      case 'gameMonth':
        return 'Used this month — again next month';
      case 'node':
        return 'Used on this topic';
      case 'contract':
        return 'Bonus already added';
      case 'realHours': {
        const at = this.ads.nextFreeAt(p.id);
        const h = at ? Math.max(1, Math.ceil((at - this.now()) / HOUR)) : p.limit.hours;
        return `Used — again in about ${h} hour${h === 1 ? '' : 's'}`;
      }
      default:
        return AD_TEXT.used;
    }
  }

  // Watch a rewarded ad. The reward happens only after the provider says it was watched to the end.
  // Returns { ok, message }.
  async watch(id, ctx = {}) {
    const p = REWARDED_BY_ID[id];
    const t = this._target(id, ctx);
    if (!p || !t.show) return { ok: false, message: 'Not available here right now' };
    if (t.block) return { ok: false, message: t.block };
    const res = await this.ads.rewarded(id, t.scope, () => this._reward(id, ctx));
    if (!res.ok) {
      const m = { cancelled: AD_TEXT.cancelled, failed: AD_TEXT.failed, offline: AD_TEXT.offline, 'limit reached': this._usedText(p), 'no ad available': AD_TEXT.unavailable }[res.reason];
      return { ok: false, message: m ?? res.reason ?? AD_TEXT.failed, status: res.status };
    }
    this.stamp++;
    this.c.save().catch(() => {});
    return { ok: true, message: res.reward?.message ?? `${p.name}: done!`, reward: res.reward };
  }

  // The rewards themselves. None of them can finish a stage or a topic, open a part, reveal a secret, bring a special
  // worker or touch a competition result: they only add progress, morale, an ordinary refresh or credits.
  // Returns { message } or false (nothing to give — then nothing is counted).
  _reward(id, ctx) {
    const c = this.c;
    const p = REWARDED_BY_ID[id];
    const t = this._target(id, ctx);
    if (!t.show || t.block) return false;
    switch (id) {
      case 'workshopBoost': {
        const job = t.target;
        const add = Math.min(job.phaseTarget * (p.effect.phaseProgressPct / 100), job.phaseTarget * REWARD_CEILING - job.phaseProgress);
        if (add <= 0) return false;
        job.phaseProgress += add;
        for (const s of c.projects.teamOf(job)) c.staff.changeMorale(s, p.effect.teamMorale);
        const stage = PHASES[job.phaseIndex]?.name ?? 'this stage';
        return { message: `Workshop Boost: +${p.effect.phaseProgressPct}% on ${stage}, +${p.effect.teamMorale} team morale` };
      }
      case 'recruitmentRefresh':
        c.recruitment.refresh(RECRUIT_RULES.freeChannel, 'ad'); // §16.4 ordinary pool only
        return { message: 'New candidates!' };
      case 'researchAssist': {
        const res = c.research;
        const node = t.target;
        const cost = res.costOf(node);
        const have = res.progress[node] ?? 0;
        const add = Math.min(cost * (p.effect.nodeProgressPct / 100), cost * REWARD_CEILING - have);
        if (add <= 0) return false;
        res.progress[node] = have + add;
        return { message: `Research Assist: +${p.effect.nodeProgressPct}% on ${res.node(node)?.name ?? node}` };
      }
      case 'bonusContract': {
        const k = t.target;
        const amount = Math.round((k.result?.paid ?? k.payout) * (p.effect.contractCashPct / 100));
        c.economy.add('credits', amount, `Ad bonus: ${k.title}`, 'ad'); // cash only — never Tech Chips or Prestige Tokens
        k.result = { ...(k.result ?? {}), adBonus: amount };
        return { message: `+${fmt(amount)} credits bonus` };
      }
      case 'recoveryGrant':
        c.economy.add('credits', p.effect.credits, 'Recovery Grant (ad)', 'ad');
        return { message: `+${fmt(p.effect.credits)} credits Recovery Grant` };
      default:
        return false;
    }
  }

  // --- interstitials ----------------------------------------------------------------------------------------------
  // A natural break point (leaving a competition or robot result). context: { tutorial, decisionPending }.
  interstitialBlock(breakPoint, context = {}) {
    return this.ads.interstitialBlock(breakPoint, context);
  }

  breakPoint(breakPoint, context = {}) {
    return this.ads.interstitial(breakPoint, context);
  }

  // --- save ---------------------------------------------------------------------------------------------------------
  serializeAccount() {
    return {
      entitlements: this.entitlements.serialize(),
      processedTransactions: this.entitlements.serializeProcessed(),
      ads: this.ads.serializeAccount(),
      heldTechChips: this.heldTechChips,
    };
  }

  loadAccount(a) {
    this.entitlements.load(a?.entitlements);
    this.entitlements.loadProcessed(a?.processedTransactions);
    this.ads.loadAccount(a?.ads);
    this.heldTechChips = Math.max(0, a?.heldTechChips ?? 0);
  }

  // Reset everything: what is owned goes (Restore Purchases brings it back). The processed transaction ids and the
  // install time stay, so a purchase the store delivers again can never be granted twice.
  resetAccount() {
    const processed = this.entitlements.serializeProcessed();
    const firstSeenAt = this.ads.account.firstSeenAt;
    this.entitlements.reset();
    this.entitlements.loadProcessed(processed);
    this.ads.loadAccount({ firstSeenAt });
    this.heldTechChips = 0;
    this.stamp++;
  }

  serializeRun() {
    return this.ads.serializeRun();
  }

  loadRun(s) {
    this.ads.loadRun(s);
  }
}
