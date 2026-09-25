// Robot Workshop market: monthly segment demand and the §14.4 sales formula, plugged into the
// shared ProductSystem. Milestone 4 has one segment (Home & Hobby).
import { SEGMENTS, PURPOSE_SEGMENT, DEMAND_RANGE, PRICE_POSITIONS, BASE_UNIT_VALUE, SALES_RULES } from '../../data/market.js';

export class MarketSystem {
  constructor({ rng, reputation }) {
    this.rng = rng;
    this.reputation = reputation; // ReputationSystem
    this.demand = {}; // segmentId → demand this month (60–140)
  }

  // New demand for every segment (at the start of a run and each new month).
  rollDemand() {
    for (const s of SEGMENTS) this.demand[s.id] = this.rng.int(DEMAND_RANGE.min, DEMAND_RANGE.max);
  }

  segmentFor(purpose) {
    return PURPOSE_SEGMENT[purpose] ?? SEGMENTS[0].id;
  }

  // Product data for a finished robot record + price position.
  productData(record, positionId, earlierProducts) {
    const r = record.result;
    const sameBuild = earlierProducts.some(
      (p) => p.data.purpose === r.purpose && JSON.stringify(p.data.components) === JSON.stringify(r.components),
    );
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
      novelty: sameBuild ? SALES_RULES.noveltyPenalty : 1,
    };
  }

  // §14.4. With variance = 1 this is the "expected" number shown before launch.
  sales(data, monthIndex, variance = null) {
    const pos = PRICE_POSITIONS[data.position];
    const fitFactor = 0.55 + data.fit / 200;
    let qualityFactor = 0.45 + data.quality / 120;
    if (pos.qualityBelow && data.quality < pos.qualityBelow) qualityFactor *= pos.penaltyMult;
    const repFactor = 0.7 + Math.min(this.reputation.value, SALES_RULES.reputationCap) / 20000;
    const trendFactor = (this.demand[data.segment] ?? 100) / 100;
    const ageFactor = SALES_RULES.ageCurve[monthIndex] ?? 0;
    const v = variance ?? this.rng.range(SALES_RULES.variance.min, SALES_RULES.variance.max);
    const units = Math.round(
      SALES_RULES.baseUnits * fitFactor * qualityFactor * repFactor * trendFactor * ageFactor * pos.demandMult * data.novelty * v,
    );
    const unitPrice = Math.round(data.baseUnitValue * pos.priceMult);
    return { units, unitPrice, revenue: units * unitPrice, demand: this.demand[data.segment] };
  }

  // Rough 6-month forecast for the launch picker (no randomness, this month's demand).
  forecast(data) {
    let units = 0;
    let revenue = 0;
    for (let m = 0; m < SALES_RULES.ageCurve.length; m++) {
      const s = this.sales(data, m, 1);
      units += s.units;
      revenue += s.revenue;
    }
    return { firstMonth: this.sales(data, 0, 1), units, revenue };
  }

  serialize() {
    return { demand: { ...this.demand } };
  }

  load(s) {
    this.demand = { ...(s?.demand ?? {}) };
  }
}
