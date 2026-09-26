// Save inspector (Milestone 22, ?debug=1 only): every save slot and each of its rolling copies — version, size, time,
// checksum status, which one is current — plus the one-time move record, the last save's timing and the autosave
// counts. Buttons to damage the current save (the next load must fall back), load an old sample save (migration),
// reload from storage (like reopening the app), and export / import a save as text for bug reports.
//   createSaveInspectorScreen({ renderer, layout, assets, campaign, router, textPrompt, slots, info, reload })
//     slots: { campaign, account, archive } (core/SaveStore SaveSlot) · info() → { storage, move, autosave }
//     reload() → Promise   read the saves again and open the game where the save says
import { THEME, font, lineH } from '../../../../core/Theme.js';
import { ScrollPanel } from '../../../../core/ui/ScrollPanel.js';
import { drawButton, hitRect } from '../../../../core/ui/Button.js';
import { text, card, iconButton } from '../ui/widgets.js';
const C = THEME.color;
const Z = THEME.size;

const HEAD_H = 140;
// Old sample saves (tests/robot-workshop/save_samples/) — only on the development copy (served from the series root).
const SAMPLE_URL = (v) => `../../tests/robot-workshop/save_samples/v${v}.json`;
const SAMPLE_VERSIONS = [1, 5, 10, 15, 16, 17];

export function createSaveInspectorScreen({ renderer, layout, assets, campaign, router, textPrompt, slots, info, reload }) {
  const W = renderer.width;
  const scroll = new ScrollPanel({ getRect: bodyRect, contentHeight: 0 });
  let rows = { campaign: [], account: [], archive: [] };
  let note = null;
  let sample = SAMPLE_VERSIONS.at(-2);
  let hits = [];
  let back = 'settings';

  const sr = () => layout.safeRect;
  const backRect = () => ({ x: sr().x + 24, y: sr().y + 24 + 15, w: 200, h: 110 });
  function bodyRect() {
    const s = sr();
    const y = s.y + 24 + HEAD_H;
    return { x: s.x + 24, y, w: s.w - 48, h: s.y + s.h - 24 - y };
  }
  const say = (t, color = C.good) => (note = { t, color });

  async function refresh() {
    for (const k of Object.keys(slots)) rows[k] = (await slots[k]?.list()) ?? [];
  }

  const actions = {
    damage: async () => {
      const k = await slots.campaign.damage();
      say(k ? `Damaged ${k} — reload to see the fallback` : 'No good copy to damage', k ? C.gold : C.bad);
      await refresh();
    },
    damageAccount: async () => {
      const k = await slots.account.damage();
      say(k ? `Damaged ${k}` : 'No good account copy', k ? C.gold : C.bad);
      await refresh();
    },
    reload: async () => {
      const res = await reload();
      say(res?.fallback ? 'Reloaded — the damaged copy was skipped (fallback)' : res?.loaded ? 'Reloaded from storage' : `Reload: ${res?.error?.message ?? 'no save'}`, res?.loaded ? C.good : C.bad);
    },
    sample: async () => {
      try {
        const r = await fetch(SAMPLE_URL(sample));
        if (!r.ok) throw new Error('Samples are only on the development copy — paste one with Import instead');
        await slots.campaign.importRecord(await r.json());
        await actions.reload();
        say(`Sample v${sample} migrated to v${slots.campaign.version} and loaded`);
      } catch (err) {
        say(err.message, C.bad);
      }
      await refresh();
    },
    exportSave: async () => {
      await campaign.save();
      const newest = rows.campaign.find((x) => x.current);
      const raw = newest ? await slots.campaign.adapter.get(newest.key) : null;
      textPrompt.openArea({ rect: areaRect(), value: raw ? JSON.stringify(raw) : '', readOnly: true });
      try {
        await navigator.clipboard?.writeText(JSON.stringify(raw));
        say('Save copied to the clipboard (also shown in the box)');
      } catch {
        say('Copy the text from the box');
      }
    },
    importSave: () => {
      textPrompt.openArea({
        rect: areaRect(),
        placeholder: 'Paste a save here, then tap outside the box',
        onDone: async (v) => {
          if (!v.trim()) return;
          try {
            await slots.campaign.importRecord(JSON.parse(v));
            await actions.reload();
            say('Imported and loaded');
          } catch (err) {
            say(`Import failed: ${err.message}`, C.bad);
          }
          await refresh();
        },
      });
    },
  };
  const areaRect = () => ({ x: sr().x + 40, y: sr().y + 300, w: sr().w - 80, h: 900 });

  const screen = {
    scroll,
    actions,
    get rows() {
      return rows;
    },
    get note() {
      return note;
    },
    setSample: (v) => (sample = v),
    refresh,
    async enter(params = {}) {
      back = params.back ?? 'settings';
      note = null;
      scroll.scrollY = 0;
      await refresh();
    },
    exit() {
      textPrompt.close();
    },
    onTap(p) {
      if (hitRect(p, backRect())) return router.go(back);
      if (!scroll.contains(p)) return;
      const q = scroll.toContent(p);
      hits.find((h) => hitRect(q, h.r))?.onTap();
    },
    onDragStart: (p) => scroll.beginDrag(p),
    onDrag: (p) => scroll.drag(p),
    onDragEnd: (p) => scroll.endDrag(p),
    render(ctx) {
      const s = sr();
      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, W, renderer.height);
      drawButton(ctx, backRect(), '‹ Back', { font: font(Z.button, true) });
      text(ctx, 'Save inspector', s.x + 250, s.y + 24 + 15 + 55, { size: Z.title, bold: true, baseline: 'middle', maxWidth: s.w - 270 });
      hits = [];
      scroll.begin(ctx);
      scroll.contentHeight = drawBody(ctx) + 30;
      scroll.end(ctx);
    },
  };

  function drawBody(ctx) {
    const w = bodyRect().w - 12;
    let y = 0;
    const line = (str, color = C.text, size = Z.small, bold = false) => {
      text(ctx, str, 20, y, { size, bold, color, maxWidth: w - 40 });
      y += lineH(size, 1.3);
    };
    const i = info();
    // Storage summary (on an info card).
    const a = i.autosave;
    const lw = campaign.lastSaveMs != null ? `${campaign.lastSaveMs.toFixed(1)} ms` : '—';
    const kb = slots.campaign.lastWrite ? ` · ${(slots.campaign.lastWrite.bytes / 1024).toFixed(1)} KB` : '';
    const summary = [
      [`Storage: ${i.storage}`, C.text, Z.body, true],
      [i.move ? `Move into the new layout: ${i.move.already ? 'done earlier' : `done now — ${i.move.moved.map((m) => `${m.key} from ${m.from}`).join(', ') || 'nothing to move'}`}` : 'Move: —', C.textMuted],
      [`Last save: ${lw}${kb}`, C.textMuted],
      [`Autosaves: ${a.saves} written · ${a.skipped} skipped (nothing changed) · ${a.failed} failed · slowest ${a.maxMs.toFixed(1)} ms`, C.textMuted],
    ];
    card(ctx, { x: 0, y, w, h: 36 + summary.reduce((t, l) => t + lineH(l[2] ?? Z.small, 1.3), 0) }, 'info');
    y += 18;
    for (const l of summary) line(...l);
    y += 30;
    if (note) {
      text(ctx, note.t, 4, y, { size: Z.body, bold: true, color: note.color, maxWidth: w });
      y += lineH(Z.body, 1.5);
    }
    // Each slot, each copy.
    for (const [k, list] of Object.entries(rows)) {
      text(ctx, `${k} slot`, 4, y, { size: Z.heading, bold: true });
      y += lineH(Z.heading, 1.3);
      if (!list.length) {
        line('(empty)', C.textMuted, Z.body);
        y += 10;
      }
      for (const r of list) {
        const h = 20 + lineH(Z.body, 1.3) + lineH(Z.small, 1.3) + 16;
        const st = r.status === 'ok' ? 'good' : r.status === 'legacy' ? 'info' : 'bad';
        card(ctx, { x: 0, y, w, h }, r.current ? 'selected' : st === 'bad' ? 'bad' : 'normal');
        text(ctx, `${r.key}${r.current ? '  ← current' : ''}`, 20, y + 20, { size: Z.body, bold: true, maxWidth: w - 40 });
        text(ctx, `v${r.version ?? '?'} · #${r.seq} · ${(r.bytes / 1024).toFixed(1)} KB · ${r.savedAt ? new Date(r.savedAt).toLocaleTimeString() : '—'} · checksum ${r.status}`, 20, y + 20 + lineH(Z.body, 1.3), { size: Z.small, color: st === 'bad' ? C.bad : C.textMuted, maxWidth: w - 40 });
        y += h + 12;
      }
      y += 12;
    }
    // Tools.
    text(ctx, 'Tools', 4, y, { size: Z.heading, bold: true });
    y += lineH(Z.heading, 1.3);
    const tools = [
      { id: 'damage', label: 'Damage current save', sub: 'The next load must fall back', accent: C.bad },
      { id: 'damageAccount', label: 'Damage account save', sub: 'The run must still load', accent: C.bad },
      { id: 'reload', label: 'Reload from storage', sub: 'Like reopening the app', accent: C.progress },
      { id: 'sample', label: `Load old sample v${sample}`, sub: 'Migrates up, then plays', accent: C.gold },
      { id: 'exportSave', label: 'Export save as text', sub: 'Copies it for a bug report', accent: C.progress },
      { id: 'importSave', label: 'Import save text', sub: 'Paste a save to load it', accent: C.progress },
    ];
    const bw = (w - 18) / 2;
    tools.forEach((t, k) => {
      const r = { x: (k % 2) * (bw + 18), y: y + Math.floor(k / 2) * 168, w: bw, h: 150 };
      iconButton(ctx, assets, r, { label: t.label, sub: t.sub, accent: t.accent, icon: 'ui_icon_28' });
      hits.push({ key: t.id, r, onTap: () => actions[t.id]() });
    });
    y += Math.ceil(tools.length / 2) * 168;
    // Sample version picker.
    const pw = (w - 12 * (SAMPLE_VERSIONS.length - 1)) / SAMPLE_VERSIONS.length;
    SAMPLE_VERSIONS.forEach((v, k) => {
      const r = { x: k * (pw + 12), y, w: pw, h: 110 };
      drawButton(ctx, r, `v${v}`, { active: v === sample, accent: C.gold, font: font(Z.button, true) });
      hits.push({ key: `v${v}`, r, onTap: () => (sample = v) });
    });
    return y + 110;
  }

  return screen;
}
