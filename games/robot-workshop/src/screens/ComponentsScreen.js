// Components / Blueprint Archive (bible §6.3, Milestone 21): every part by slot, plus the robot looks.
//   Parts: open ones show normally; locked ones are greyed with a padlock and the rule that opens them (what is still
//          missing in gold).
//   Secret things (§33.3): absent until a clue about them has reached the player; then a "???" card; once found (any
//          run) the full card with its exact rule.
//   Looks: the 20 robot families — seen ones in colour, the rest as dim silhouettes with what makes them.
// params.back: screen to return to (default 'builder'); params.slot: open on that slot; params.tab 'looks'.
import { THEME, font } from '../../../../core/Theme.js';
import { ScrollPanel } from '../../../../core/ui/ScrollPanel.js';
import { drawButton } from '../../../../core/ui/Button.js';
import { SLOTS, partsInSlot } from '../../data/components.js';
import { ROBOT_STAT_KEYS } from '../../data/stats.js';
import { VISUAL_FAMILIES } from '../../data/visuals.js';
import { PURPOSES } from '../../data/purposes.js';
import { SYNERGIES_BY_ID } from '../../data/synergies.js';
import { SECRET_ART } from '../../data/secrets.js';
import { describeUnlock, missingParts } from '../systems/unlockRules.js';
import { text, contained, hit, fmt, listRow, listRowHeight, emptyState, stateHeight } from '../ui/widgets.js';
const COL = THEME.color;
const SIZE = THEME.size;

const HEADER_H = 150;
const TAB_H = 110;
const TAB_GAP = 16;
const COLS = 4;
const LOOKS = 'looks';
// The secret behind each secret look (their robot paths, data/secrets.js §29.6).
const LOOK_SECRETS = { V18: 'SEC-ROBOT-01', V19: 'SEC-ROBOT-02', V20: 'SEC-ROBOT-03' };

export function createComponentsScreen({ renderer, layout, assets, campaign, router }) {
  const W = renderer.width;
  let slotId = SLOTS[0].id;
  let back = 'builder';
  let backParams = {};
  let resumeOnExit = false;
  let rows = []; // content rects of the rows drawn last frame
  const scroll = new ScrollPanel({ getRect: bodyRect, contentHeight: 0 });
  const TABS = [...SLOTS.map((s) => ({ id: s.id, name: s.name.split(/[ /]/)[0] })), { id: LOOKS, name: 'Looks' }]; // short tab names: Chassis, Mobility, AI, Tool…
  const tabRows = Math.ceil(TABS.length / COLS);

  function backRect() {
    const sr = layout.safeRect;
    return { x: sr.x + 24, y: sr.y + 24, w: 200, h: 110 };
  }
  function tabRect(i) {
    const sr = layout.safeRect;
    const w = (sr.w - 48 - (COLS - 1) * TAB_GAP) / COLS;
    return { x: sr.x + 24 + (i % COLS) * (w + TAB_GAP), y: sr.y + HEADER_H + Math.floor(i / COLS) * (TAB_H + TAB_GAP), w, h: TAB_H };
  }
  function bodyRect() {
    const sr = layout.safeRect;
    const y = sr.y + HEADER_H + tabRows * (TAB_H + TAB_GAP) + 8;
    return { x: sr.x + 24, y, w: sr.w - 48, h: sr.y + sr.h - 24 - y };
  }

  // --- secrets (§33.3) ---
  const S = () => campaign.secrets;
  function partState(c) {
    if (c.unlock?.type !== 'secret') return campaign.partOpen(c.id) ? 'open' : 'locked';
    if (campaign.partOpen(c.id)) return 'open';
    if (S().everUnlocked(c.unlock.id)) return 'locked'; // its secret is known: the full card and its rule
    return S().clueStage(c.unlock.id) >= 1 ? 'clue' : 'hidden';
  }
  const shownParts = (slot) => partsInSlot(slot).filter((c) => partState(c) !== 'hidden');

  function looksSeen() {
    const seen = new Set([...(S().accountFact('robotFamilies') ?? []), ...Object.keys(S().account.flags.families ?? {})]);
    for (const r of campaign.history.records) if (r.result?.visual) seen.add(r.result.visual);
    return seen;
  }
  function lookState(v, seen) {
    if (seen.has(v.id)) return 'seen';
    const sec = LOOK_SECRETS[v.id];
    if (!sec) return 'unseen';
    if (S().everUnlocked(sec)) return 'unseen';
    return S().clueStage(sec) >= 1 ? 'clue' : 'hidden';
  }

  // --- rows ---
  function partRow(c) {
    const st = partState(c);
    if (st === 'clue') return { art: SECRET_ART.marker, title: '??? · A secret part', state: 'secret', lines: [{ text: 'A rumour says something special fits here. The Rumour Archive keeps what you have heard.', color: COL.purple }] };
    const open = st === 'open';
    const stats = ROBOT_STAT_KEYS.filter((k) => c.stats[k]).map((k) => `${k} ${c.stats[k] > 0 ? '+' : ''}${c.stats[k]}`);
    if (c.inn) stats.push(`INN +${c.inn}`);
    const lock = open ? 'Open — ready to use' : `Locked — needs ${missingParts(c.unlock, (r) => campaign.unlockMet(r, { type: 'part', id: c.id })).join(' + ') || describeUnlock(c.unlock)}`;
    return {
      art: c.art,
      title: `${c.id} · ${c.name}`,
      locked: !open,
      state: open ? 'good' : 'locked',
      lines: [
        { text: `Cost ${fmt(c.cost)} · Complexity ${c.cx}${c.faultPct ? ` · fault chance +${c.faultPct}%` : ''}`, color: open ? COL.text : COL.textMuted },
        { text: stats.join('  '), bold: true, color: open ? COL.good : COL.textMuted },
        { text: lock, bold: true, color: open ? COL.good : COL.gold },
      ],
      artSize: 150,
    };
  }

  function lookRow(v, st) {
    if (st === 'clue') return { art: SECRET_ART.marker, title: '??? · A secret look', state: 'secret', lines: [{ text: 'Nobody has seen it yet — only rumours.', color: COL.purple }] };
    const how = v.base ? `Build a robot for: ${PURPOSES[v.base]?.name ?? v.base}` : v.synergy ? `Discover the combo: ${SYNERGIES_BY_ID[v.synergy]?.name ?? v.synergy}` : '';
    const seen = st === 'seen';
    return { art: v.art, title: `${v.id} · ${v.name}`, dimArt: !seen, state: seen ? 'good' : 'locked', lines: [{ text: seen ? 'Seen — kept in the archive for good' : how, bold: !seen, color: seen ? COL.good : COL.gold }], artSize: 150 };
  }

  function currentRows() {
    if (slotId === LOOKS) {
      const seen = looksSeen();
      return VISUAL_FAMILIES.map((v) => ({ v, st: lookState(v, seen) })).filter((x) => x.st !== 'hidden').map((x) => lookRow(x.v, x.st));
    }
    return shownParts(slotId).map(partRow);
  }

  const screen = {
    scroll,
    tabRect: (i) => tabRect(i),
    rowRect: (i) => rows[i],
    get slotId() {
      return slotId;
    },
    rowsFor: (id) => (id === LOOKS ? VISUAL_FAMILIES.map((v) => lookState(v, looksSeen())) : partsInSlot(id).map((c) => ({ id: c.id, state: partState(c) }))),
    enter(params = {}) {
      back = params.back ?? 'builder';
      backParams = params.backParams ?? {};
      if (params.slot) slotId = params.slot;
      if (params.tab === LOOKS) slotId = LOOKS;
      scroll.scrollY = 0;
      resumeOnExit = !campaign.clock.paused;
      campaign.clock.pause();
    },
    exit() {
      if (resumeOnExit) campaign.clock.resume();
    },
    onTap(p) {
      if (hit(p, backRect())) return router.go(back, backParams);
      TABS.forEach((t, i) => {
        if (hit(p, tabRect(i)) && t.id !== slotId) {
          slotId = t.id;
          scroll.scrollY = 0;
        }
      });
    },
    onDragStart: (p) => scroll.beginDrag(p),
    onDrag: (p) => scroll.drag(p),
    onDragEnd: (p) => scroll.endDrag(p),

    render(ctx) {
      ctx.fillStyle = COL.bg;
      ctx.fillRect(0, 0, W, renderer.height);
      const sr = layout.safeRect;
      drawButton(ctx, backRect(), '‹ Back', { font: font(SIZE.button, true) });
      contained(ctx, assets, 'ui_icon_06_robot', { x: sr.x + 228, y: sr.y + 28, w: 76, h: 76 });
      text(ctx, 'Parts & looks', sr.x + 320, sr.y + 66, { size: SIZE.title, bold: true, baseline: 'middle', maxWidth: sr.w - 340 });
      const seen = looksSeen();
      TABS.forEach((t, i) => {
        let label;
        if (t.id === LOOKS) label = `${t.name} ${VISUAL_FAMILIES.filter((v) => seen.has(v.id)).length}/${VISUAL_FAMILIES.filter((v) => lookState(v, seen) !== 'hidden').length}`;
        else {
          const list = shownParts(t.id);
          label = `${t.name} ${list.filter((c) => partState(c) === 'open').length}/${list.length}`;
        }
        drawButton(ctx, tabRect(i), label, { selected: t.id === slotId, font: font(SIZE.body, true) });
      });

      const w = bodyRect().w - 12;
      const list = currentRows();
      scroll.begin(ctx);
      let y = 0;
      rows = [];
      if (!list.length) {
        const s = { art: 'ui_icon_06_robot', text: 'Nothing here yet.' };
        emptyState(ctx, assets, { x: 0, y, w, h: stateHeight(w, s) }, s);
        y += stateHeight(w, s);
      }
      for (const row of list) {
        const h = listRowHeight(w, row);
        const r = { x: 0, y, w, h };
        rows.push(r);
        listRow(ctx, assets, r, row);
        y += h + 14;
      }
      scroll.contentHeight = y + 14;
      scroll.end(ctx);
    },
  };

  return screen;
}
