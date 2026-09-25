// Robot Workshop sales: the §14.4 monthly formula, which segment a robot sells to, and the forecast
// shown before launch. Demand comes from the shared MarketSystem; the exact-copy penalty (novelty) is
// set by the shared ProductSystem when a product launches.
import { PURPOSE_SEGMENTS } from '../../data/segments.js';
import { PRICE_POSITIONS, BASE_UNIT_VALUE, SALES_RULES } from '../../data/market.js';

export class Sales {
  constructor({ rng, market, reputation, effects = () => 0 }) {
    this.effects = effects; // shared effect query (a Showroom's +% units sold, an event's trend, a sponsor's revenue)
    this.rng = rng; // seeded variance (the campaign's main stream, as in Milestone 4)
    this.market = market;
    this.reputation = reputation;
  }

  // §14.1: a purpose with two segments sells to the one with more demand on launch day.
  segmentFor(purpose) {
    const list = PURPOSE_SEGMENTS[purpose] ?? ['homeHobby'];
    let best = list[0];
    for (const id of list) if (this.market.demand(id) > this.market.demand(best)) best = id;
    return best;
  }

  // Product data for a finished robot record + price position.
  productData(record, positionId) {
    const r = record.result;
    return {
      historyNumber: record.number,
      purpose: r.purpose,
      components: { ...r.components },
      tier: r.tier,
      segment: this.segmentFor(r.purpose),
      position: positionId,
      quality: r.quality,
      fit: r.fit,
      review: r.review,
      baseUnitValue: BASE_UNIT_VALUE[r.tier],
      premiumDemandMult: r.premiumDemandMult ?? null, // Future Form (signature trait)
      reviews: [],
    };
  }

  // §14.4 for one month. product: { data, novelty }. variance null = seeded roll; 1 = expected value.
  sales(product, monthIndex, variance = null) {
    const data = product.data;
    const pos = PRICE_POSITIONS[data.position];
    const demandMult = data.position === 'premium' && data.premiumDemandMult ? data.premiumDemandMult : pos.demandMult;
    const fitFactor = 0.55 + data.fit / 200;
    let qualityFactor = 0.45 + data.quality / 120;
    if (pos.qualityBelow && data.quality < pos.qualityBelow) qualityFactor *= pos.penaltyMult;
    const repFactor = 0.7 + Math.min(this.reputation.value, SALES_RULES.reputationCap) / 20000;
    const demand = this.market.demand(data.segment);
    const trendFactor = demand / 100;
    const ageFactor = SALES_RULES.ageCurve[monthIndex] ?? 0;
    const novelty = product.novelty ?? data.novelty ?? 1; // data.novelty: products saved before Milestone 7
    const v = variance ?? this.rng.range(SALES_RULES.variance.min, SALES_RULES.variance.max);
    const units = Math.max(0, Math.round(SALES_RULES.baseUnits * fitFactor * qualityFactor * repFactor * trendFactor * ageFactor * demandMult * novelty * v * (1 + this.effects('salesUnitsPct') / 100)));
    const unitPrice = Math.round(data.baseUnitValue * pos.priceMult);
    const revenue = Math.round(units * unitPrice * (1 + this.effects('salesRevenuePct') / 100)); // a sponsor's +% revenue
    return { units, unitPrice, revenue, demand };
  }

  // Rough 6-month forecast for the launch picker (no randomness, this month's demand).
  forecast(data, novelty = 1) {
    let units = 0;
    let revenue = 0;
    const p = { data, novelty };
    for (let m = 0; m < SALES_RULES.ageCurve.length; m++) {
      const s = this.sales(p, m, 1);
      units += s.units;
      revenue += s.revenue;
    }
    return { firstMonth: this.sales(p, 0, 1), units, revenue };
  }
}
