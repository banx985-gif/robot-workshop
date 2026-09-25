// Words for secret conditions (Rumour Archive, debug "why not?" inspector). Reads core/SecretEngine results.
const OP_WORDS = { eq: '=', neq: '≠', gt: '>', gte: '≥', lt: '<', lte: '≤', in: 'one of', has: 'includes' };

const show = (v) => (v === undefined ? '—' : Array.isArray(v) ? (v.length > 4 ? `${v.length} items` : `[${v.join(', ')}]`) : typeof v === 'number' ? String(Math.round(v * 100) / 100) : String(v));

// One evaluated condition → { text, ok, depth } lines (groups add their children, indented).
export function conditionLines(part, { debug = false, depth = 0 } = {}) {
  if (part.group) {
    const head = { text: part.group === 'all' ? 'All of these:' : 'Any one of these:', ok: part.ok, depth };
    return [head, ...part.parts.flatMap((p) => conditionLines(p, { debug, depth: depth + 1 }))];
  }
  const c = part.cond;
  const op = c.op === 'countOf' ? OP_WORDS[c.cmp ?? 'gte'] : OP_WORDS[c.op];
  const need = part.eased && part.need !== part.base ? `${show(part.need)} (eased from ${show(part.base)})` : show(part.need);
  // Eased numbers inside a count-of (e.g. "250 units" → 125 on a repeat run).
  const whereNote = part.whereNeeds?.length ? ` (easier this run: ${part.whereNeeds.map((w) => `${w.field.split('.').at(-1)} ${show(w.need)} instead of ${show(w.base)}`).join(', ')})` : '';
  const label = c.label ?? c.fact;
  // Progress numbers only where they mean something to a player (counts, thresholds, "3 of 5"), not rank indexes.
  const numeric = typeof part.value === 'number' && typeof part.need === 'number' && (['count', 'threshold'].includes(c.kind) || (c.op === 'countOf' && part.need > 1));
  const text = debug
    ? `${c.fact}${c.op === 'countOf' ? ' count-of' : ''} ${op} ${need} · now ${show(part.value)}${part.known ? '' : ' · UNKNOWN FACT'}${c.kind && c.kind !== 'fixed' ? ` · ${c.kind}` : ''}`
    : `${label}: ${numeric ? `${show(part.value)} / ${op} ${need}` : part.ok ? 'done' : 'not yet'}${whereNote}`;
  return [{ text, ok: part.ok, depth }];
}

// Every line of a rule, in order: NG+, all, any, forbids.
export function ruleLines(res, opts = {}) {
  const out = [];
  if (res.ng.need > 0) out.push({ text: `New Game+ ${res.ng.need} or higher (now ${res.ng.value})`, ok: res.ng.ok, depth: 0 });
  for (const p of res.all) out.push(...conditionLines(p, opts));
  if (res.any.length) {
    out.push({ text: 'And any one of:', ok: res.anyOk, depth: 0 });
    for (const p of res.any) out.push(...conditionLines(p, { ...opts, depth: 1 }));
  }
  if (res.forbids.length) {
    out.push({ text: 'And never:', ok: res.forbidOk, depth: 0 });
    for (const p of res.forbids) {
      if (opts.debug) out.push(...conditionLines(p, { ...opts, depth: 1 }).map((l) => ({ ...l, ok: !p.ok })));
      else out.push({ text: `${p.cond.label ?? p.cond.fact}${p.ok ? ' — right now, so it is blocked' : ''}`, ok: !p.ok, depth: 1 });
    }
  }
  return out;
}
