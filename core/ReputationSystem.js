// Company reputation: one number that good work raises, with named ranks from game data.
// Reputation never drops below the floor of the highest rank already reached.
//   ranks: [{ id: 'E', min: 0 }, { id: 'D', min: 250 }, ...] (ascending)
// Emits 'reputation:change' ({ amount, reason, value }) and 'reputation:rankUp' ({ rank }).
export class ReputationSystem {
  constructor({ bus = null, ranks }) {
    this.bus = bus;
    this.ranks = ranks;
    this.value = 0;
    this.highestRankIndex = 0;
  }

  rankIndexFor(value) {
    let i = 0;
    for (let k = 0; k < this.ranks.length; k++) if (value >= this.ranks[k].min) i = k;
    return i;
  }

  get rank() {
    return this.ranks[this.rankIndexFor(this.value)];
  }

  get nextRank() {
    return this.ranks[this.rankIndexFor(this.value) + 1] || null;
  }

  add(amount, reason = '') {
    const delta = Math.round(amount);
    if (!delta) return;
    const floor = this.ranks[this.highestRankIndex].min;
    this.value = Math.max(floor, this.value + delta);
    this.bus?.emit('reputation:change', { amount: delta, reason, value: this.value });
    const idx = this.rankIndexFor(this.value);
    if (idx > this.highestRankIndex) {
      this.highestRankIndex = idx;
      this.bus?.emit('reputation:rankUp', { rank: this.ranks[idx] });
    }
  }

  serialize() {
    return { value: this.value, highestRankIndex: this.highestRankIndex };
  }

  load(s) {
    this.value = s?.value ?? 0;
    this.highestRankIndex = s?.highestRankIndex ?? 0;
  }
}
