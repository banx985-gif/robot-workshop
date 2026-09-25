// "Things on sale" (robots, dishes, ships…): limited active slots, a fixed sales cycle,
// and a monthly sales tick. How many sell each month comes from the game via hooks.
//
// hooks:
//   monthlySales(product, monthIndex) → { units, revenue, ...extra }   monthIndex 0 = first month on sale
//   onSale(product, sale)                                              after each month's sale is recorded
//   onEnd(product)                                                     cycle finished or retired
// Emits: 'product:launch', 'product:sales', 'product:end'.
export class ProductSystem {
  constructor({ bus = null, slots = 2, cycleMonths = 6, hooks = {} }) {
    this.bus = bus;
    this.slots = slots; // number, or () => number
    this.cycleMonths = cycleMonths;
    this.hooks = hooks;
    this.products = []; // every product ever launched (active, ended and retired)
    this.nextId = 1;
  }

  get slotCount() {
    return typeof this.slots === 'function' ? this.slots() : this.slots;
  }

  get active() {
    return this.products.filter((p) => p.status === 'active');
  }

  get freeSlots() {
    return Math.max(0, this.slotCount - this.active.length);
  }

  get(id) {
    return this.products.find((p) => p.id === id) || null;
  }

  // fields: { name, launchedAt, data } — data is the game's own info (price position, quality…).
  launch({ name, launchedAt = null, data = {} }) {
    if (!this.freeSlots) return null;
    const p = {
      id: `P${this.nextId++}`,
      name,
      launchedAt,
      status: 'active',
      monthsOnSale: 0,
      sales: [], // { month, units, revenue, ... }
      totalUnits: 0,
      totalRevenue: 0,
      data,
    };
    this.products.push(p);
    this.bus?.emit('product:launch', { product: p });
    return p;
  }

  monthsLeft(p) {
    return p.status === 'active' ? this.cycleMonths - p.monthsOnSale : 0;
  }

  retire(id) {
    const p = this.get(id);
    if (!p || p.status !== 'active') return false;
    p.status = 'retired';
    this.hooks.onEnd?.(p);
    this.bus?.emit('product:end', { product: p, reason: 'retired' });
    return true;
  }

  // Call once per month end: every active product sells for its current month.
  monthlyTick() {
    for (const p of this.active) {
      const sale = { month: p.monthsOnSale + 1, ...this.hooks.monthlySales(p, p.monthsOnSale) };
      p.sales.push(sale);
      p.totalUnits += sale.units;
      p.totalRevenue += sale.revenue;
      p.monthsOnSale++;
      this.hooks.onSale?.(p, sale);
      this.bus?.emit('product:sales', { product: p, sale });
      if (p.monthsOnSale >= this.cycleMonths) {
        p.status = 'ended';
        this.hooks.onEnd?.(p);
        this.bus?.emit('product:end', { product: p, reason: 'cycle' });
      }
    }
  }

  serialize() {
    return { nextId: this.nextId, products: JSON.parse(JSON.stringify(this.products)) };
  }

  load(s) {
    this.nextId = s?.nextId ?? 1;
    this.products = JSON.parse(JSON.stringify(s?.products ?? []));
  }
}
