// Campaign Slots (Milestone 0, bible §3.5.1): the four slot cards. An occupied card shows the palette accent strip,
// the Founder portrait (code-drawn placeholder) with name and role, the facility name, "Facility Director <name>" and
// Year / Month and Rank (Milestone 26; NG+, grade and resident count stay hidden until those systems exist). An empty card says NEW
// FACILITY and opens Facility Setup for that slot. A slot that will not read can only be deleted.
// Milestone 28b: the Hero Home Promo (care_brand_05) stands faded behind the cards, the Founder's own portrait is on
// each card, and a home on New Game+ shows the NG+ key art (care_brand_06) with its number.
// Two modes: 'browse' (Play / Delete — Delete asks first) and 'new' (pick where the new facility goes: an empty slot,
// or Replace on an occupied one; START FACILITY asks again before anything is overwritten).
// Layout and tapping share one pass (lay out → draw and/or hit-test), so they can never disagree.
import { THEME } from '../../../../core/Theme.js';
import { drawButton, hitRect } from '../../../../core/ui/Button.js';
import { card, text } from '../../../../core/ui/Kit.js';
import { founderById, paletteById } from '../../data/setup.js';
import { drawPortrait, accentStrip, drawArtCrop } from '../ui/careArt.js';
import { BRAND, ART_CROP } from '../../data/artMoments.js';

const C = THEME.color;
const S = THEME.size;

// cards(): [{ n, empty, summary, error }]; last(): the last-used slot number or null.
export function createSlotsScreen({ layout, assets = null, cards, last, onBack, onPlay, onDelete, onNewInSlot }) {
  let mode = 'browse';
  let note = null;
  const rects = {};

  const backRect = () => {
    const sr = layout.safeRect;
    return { x: sr.x + 24, y: sr.y + 24, w: 220, h: 110 };
  };

  function pass(ctx, tap) {
    for (const k of Object.keys(rects)) delete rects[k];
    const sr = layout.safeRect;
    let hit = null;
    const box = (r, fn, id) => {
      if (id) rects[id] = r;
      if (tap && !hit && hitRect(tap, r)) hit = fn;
    };
    const br = backRect();
    box(br, onBack, 'back');
    if (ctx && assets) drawArtCrop(ctx, assets, BRAND.slots, ART_CROP[BRAND.slots], { x: sr.x, y: sr.y + br.h + 40, w: sr.w, h: sr.h - br.h - 60 }, 0.3);
    if (ctx) {
      drawButton(ctx, br, '‹ Back', { accent: C.progress });
      text(ctx, mode === 'new' ? 'Choose a slot' : 'Campaign Slots', sr.x + sr.w / 2 + 60, br.y + br.h / 2 - 4, { size: S.title, bold: true, align: 'center', baseline: 'middle', maxWidth: sr.w - 320 });
    }
    let y = br.y + br.h + 24;
    const line = note ?? (mode === 'new' ? 'Where should your new facility go?' : null);
    if (line) {
      if (ctx) text(ctx, line, sr.x + sr.w / 2, y, { size: S.body, bold: true, color: C.actionDark, align: 'center', maxWidth: sr.w - 60 });
      y += 64;
    }
    const gap = 24;
    const h = Math.min(360, (sr.y + sr.h - 30 - y - gap * 3) / 4);
    const x = sr.x + 24;
    const w = sr.w - 48;
    for (const s of cards()) {
      const r = { x, y, w, h };
      rects[`slot${s.n}`] = r;
      if (s.summary) occupied(ctx, r, s, box);
      else if (s.error) damaged(ctx, r, s, box);
      else {
        box(r, () => onNewInSlot(s.n), `new${s.n}`);
        if (ctx) empty(ctx, r, s);
      }
      y += h + gap;
    }
    return hit;
  }

  function occupied(ctx, r, s, box) {
    const m = s.summary;
    const isLast = s.n === last();
    const palette = paletteById(m.palette);
    const bw = 230;
    const bh = Math.min(110, (r.h - 60) / 2);
    const b1 = { x: r.x + r.w - bw - 24, y: r.y + r.h / 2 - bh - 10, w: bw, h: bh };
    const b2 = { x: b1.x, y: r.y + r.h / 2 + 10, w: bw, h: bh };
    if (mode === 'new') {
      const rep = { x: b1.x, y: r.y + (r.h - bh) / 2, w: bw, h: bh };
      box(rep, () => onNewInSlot(s.n), `replace${s.n}`);
      if (ctx) layoutCard();
      if (ctx) drawButton(ctx, rep, 'Replace', { accent: C.bad });
    } else {
      box(b1, () => onPlay(s.n), `play${s.n}`);
      box(b2, () => onDelete(s.n), `delete${s.n}`);
      box(r, () => onPlay(s.n), `card${s.n}`);
      if (ctx) {
        layoutCard();
        drawButton(ctx, b1, 'Play');
        drawButton(ctx, b2, 'Delete', { accent: C.bad });
      }
    }
    function layoutCard() {
      card(ctx, r, isLast && mode === 'browse' ? 'info' : 'normal');
      accentStrip(ctx, r, palette);
      const k = Math.min(1, r.h / 340); // lines close up a little on short screens
      const ps = Math.min(r.h - 90 * k, 220);
      const founder = founderById(m.founderId);
      const px = r.x + 48;
      const py = r.y + 20 * k;
      drawPortrait(ctx, { x: px, y: py, w: ps, h: ps }, founder, palette.hex, assets);
      text(ctx, m.founderName, px + ps / 2, py + ps + 6 * k, { size: S.small, bold: true, align: 'center', maxWidth: ps + 30 });
      const tx = px + ps + 30;
      const ng = m.ngPlus ?? 0;
      const ngW = ng > 0 && assets ? Math.min(r.h * 0.5, 150) : 0; // (Milestone 28b: room for the NG+ key art beside the buttons)
      const tw = b1.x - 20 - tx - (ngW ? ngW + 16 : 0);
      let ty = r.y + 22 * k;
      if (ngW) drawArtCrop(ctx, assets, BRAND.ngPlus, ART_CROP[BRAND.ngPlus], { x: b1.x - 16 - ngW, y: r.y + 16, w: ngW, h: r.h - 32 }); // (Milestone 28b: New Game+)
      text(ctx, `SLOT ${s.n}${isLast ? ' · LAST PLAYED' : ''}${ng > 0 ? ` · NEW GAME+ ${ng}` : ''}`, tx, ty, { size: S.small, bold: true, color: isLast ? C.progress : C.textMuted, maxWidth: tw });
      ty += 42 * k;
      text(ctx, m.facility, tx, ty, { size: S.heading, bold: true, color: palette.dark, maxWidth: tw });
      ty += 60 * k;
      text(ctx, `Facility Director ${m.director}`, tx, ty, { size: S.body, maxWidth: tw });
      ty += 52 * k;
      text(ctx, `Founder: ${m.founderRole}`, tx, ty, { size: S.small, color: C.textMuted, maxWidth: tw });
      ty += 46 * k;
      text(ctx, `Year ${m.year} · Month ${m.month} · Rank ${m.rank ?? 'E'}`, tx, ty, { size: S.body, bold: true, color: C.actionDark, maxWidth: tw }); // (Milestone 26: Rank)
    }
  }

  function empty(ctx, r, s) {
    ctx.save();
    ctx.fillStyle = C.panelAlt;
    ctx.strokeStyle = C.action;
    ctx.lineWidth = 5;
    ctx.setLineDash([18, 12]);
    ctx.beginPath();
    ctx.roundRect(r.x, r.y, r.w, r.h, THEME.panel.radius);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    const cy = r.y + r.h / 2;
    const rad = Math.min(62, r.h * 0.28);
    ctx.fillStyle = C.action;
    ctx.beginPath();
    ctx.arc(r.x + 120, cy, rad, 0, Math.PI * 2);
    ctx.fill();
    text(ctx, '+', r.x + 120, cy + 4, { size: rad * 1.5, bold: true, color: C.textOnAction, align: 'center', baseline: 'middle' });
    text(ctx, 'NEW FACILITY', r.x + 220, cy - 32, { size: S.title, bold: true, color: C.actionDark, baseline: 'middle', maxWidth: r.w - 260 });
    text(ctx, `Slot ${s.n} is empty · tap to start`, r.x + 222, cy + 34, { size: S.body, color: C.textMuted, baseline: 'middle', maxWidth: r.w - 260 });
  }

  function damaged(ctx, r, s, box) {
    const del = { x: r.x + r.w - 254, y: r.y + r.h / 2 - 55, w: 230, h: 110 };
    box(del, () => onDelete(s.n), `delete${s.n}`);
    if (!ctx) return;
    card(ctx, r, 'bad');
    text(ctx, `Slot ${s.n}: this save can't be read`, r.x + 40, r.y + r.h / 2 - 30, { size: S.heading, bold: true, color: C.bad, baseline: 'middle', maxWidth: del.x - r.x - 60 });
    text(ctx, 'Delete it to use the slot again.', r.x + 40, r.y + r.h / 2 + 30, { size: S.body, color: C.textMuted, baseline: 'middle', maxWidth: del.x - r.x - 60 });
    drawButton(ctx, del, 'Delete', { accent: C.bad });
  }

  return {
    get mode() {
      return mode;
    },
    enter(params = {}) {
      mode = params.mode ?? 'browse';
      note = params.note ?? null;
    },
    onTap(p) {
      pass(null, p)?.();
    },
    render(ctx) {
      pass(ctx, null);
    },
    // Screen rect of a tappable thing (tests): 'back', 'play1', 'delete2', 'new3', 'replace4', 'slot1'…
    rectOf(id) {
      pass(null, null);
      return rects[id] ?? null;
    },
  };
}
