// Checks game content at start-up in debug builds (bible §41.5) and gives a clear list of problems.
// It never throws: in normal builds a game can still run it and only log, or skip it.
// The game describes its own rules with these helpers; no content lives here.
//   const v = new DataValidator();
//   v.uniqueIds('components', list);                 every item has an id, none repeat
//   v.ref('component CH06', 'facility', 'F21', ids);  a referenced id exists in a known set
//   v.check(ok, 'message');                          any other rule
//   v.noCycles('research', nodes);                   prerequisites (x.requires) have no loops
//   v.art('component CH01', 'path/to.png');          queue an image path to check
//   await v.checkArt();                              fetches every queued path (missing → error)
//   v.report() → { ok, errors, warnings, counts }
export class DataValidator {
  constructor({ fetchFn = (url) => fetch(url, { method: 'HEAD', cache: 'no-store' }) } = {}) {
    this.fetchFn = fetchFn;
    this.errors = [];
    this.warnings = [];
    this.counts = { checks: 0, ids: 0, refs: 0, art: 0 };
    this._art = []; // { owner, path, placeholder }
  }

  error(msg) {
    this.errors.push(msg);
  }

  warn(msg) {
    this.warnings.push(msg);
  }

  check(ok, msg) {
    this.counts.checks++;
    if (!ok) this.errors.push(msg);
    return !!ok;
  }

  // Every item has a non-empty id and no id is used twice. Returns the Set of ids.
  uniqueIds(label, items, idOf = (x) => x.id) {
    const seen = new Set();
    for (const item of items) {
      const id = idOf(item);
      this.counts.ids++;
      if (id === undefined || id === null || id === '') this.error(`${label}: an item has no id`);
      else if (seen.has(id)) this.error(`${label}: id "${id}" is used more than once`);
      else seen.add(id);
    }
    return seen;
  }

  // Object keys must match each value's own id field (e.g. COMPONENTS.CH01.id === 'CH01').
  keysMatchIds(label, map, idField = 'id') {
    for (const [key, v] of Object.entries(map)) this.check(v?.[idField] === key, `${label}: key "${key}" holds id "${v?.[idField]}"`);
  }

  ref(owner, kind, id, known) {
    this.counts.refs++;
    return this.check(known.has(id), `${owner}: unknown ${kind} "${id}"`);
  }

  // A tree or graph of prerequisites must have no loops (A needs B needs … needs A) and no unknown ids.
  // depsOf(item) → ids it needs. Returns true when there are no loops.
  noCycles(label, items, idOf = (x) => x.id, depsOf = (x) => x.requires ?? []) {
    const byId = new Map(items.map((x) => [idOf(x), x]));
    const state = new Map(); // id → 1 visiting, 2 done
    let ok = true;
    const visit = (id, path) => {
      if (state.get(id) === 2) return;
      if (state.get(id) === 1) {
        ok = false;
        this.error(`${label}: loop ${[...path.slice(path.indexOf(id)), id].join(' → ')}`);
        return;
      }
      state.set(id, 1);
      for (const d of depsOf(byId.get(id))) {
        if (this.ref(`${label} ${id}`, 'prerequisite', d, byId)) visit(d, [...path, id]);
      }
      state.set(id, 2);
    };
    for (const id of byId.keys()) visit(id, []);
    this.counts.checks++;
    return ok;
  }

  // placeholder: true means "no art yet, drawn as a placeholder on purpose" — reported as a warning, not an error.
  art(owner, path, { placeholder = false } = {}) {
    this._art.push({ owner, path, placeholder });
  }

  async checkArt({ concurrency = 12 } = {}) {
    const queue = [...new Map(this._art.map((a) => [a.path, a])).values()];
    let i = 0;
    const worker = async () => {
      while (i < queue.length) {
        const a = queue[i++];
        this.counts.art++;
        let ok = false;
        try {
          const res = await this.fetchFn(a.path);
          ok = res.ok;
        } catch {
          ok = false;
        }
        if (!ok && a.placeholder) this.warn(`${a.owner}: art "${a.path}" missing (placeholder flagged)`);
        else if (!ok) this.error(`${a.owner}: art file not found "${a.path}"`);
      }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, worker));
  }

  report() {
    return { ok: this.errors.length === 0, errors: [...this.errors], warnings: [...this.warnings], counts: { ...this.counts } };
  }
}
