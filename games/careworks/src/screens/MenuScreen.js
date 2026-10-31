// Main Menu (Milestone 0): the CAREWORKS title logo (Milestone 28b: care_brand_03, Aaron's art; the name drawn in code
// only while it loads), then Continue (the last-used slot; hidden when there is
// no facility yet), Campaign Slots, New Game and Settings (a placeholder sheet).
// Layout and tapping share one pass (lay out → draw and/or hit-test), so they can never disagree.
import { THEME, font } from '../../../../core/Theme.js';
import { drawButton, hitRect } from '../../../../core/ui/Button.js';
import { text } from '../../../../core/ui/Kit.js';
import { paletteById } from '../../data/setup.js';
import { BRAND, ART_CROP } from '../../data/artMoments.js';
import { drawArtCrop } from '../ui/careArt.js';

const C = THEME.color;
const S = THEME.size;
const BTN_H = 130;
const GAP = 28;

// continueInfo(): { n, summary } of the last-used slot, or null.
const TITLE_H = 640; // the logo and the line under it

export function createMenuScreen({ layout, assets = null, continueInfo, onContinue, onSlots, onNewGame, onSettings }) {
  const rects = {};

  function pass(ctx, tap) {
    for (const k of Object.keys(rects)) delete rects[k];
    const sr = layout.safeRect;
    const cx = sr.x + sr.w / 2;
    const li = continueInfo();
    let hit = null;
    const rows = [
      li && ['continue', 'Continue', () => onContinue(li.n), C.action],
      ['slots', 'Campaign Slots', onSlots, C.progress],
      ['new', 'New Game', onNewGame, li ? C.progress : C.action],
      ['settings', 'Settings', onSettings, C.progress],
    ].filter(Boolean);
    const blockH = TITLE_H + 60 + rows.length * (BTN_H + GAP) + (li ? 60 : 0);
    let y = sr.y + Math.max(60, (sr.h - blockH) / 2 - 40);
    if (ctx) drawTitle(ctx, cx, y, sr.w);
    y += TITLE_H + 60;
    const bw = Math.min(sr.w - 120, 820);
    for (const [id, label, fn, accent] of rows) {
      const r = { x: cx - bw / 2, y, w: bw, h: BTN_H };
      rects[id] = r;
      if (ctx) drawButton(ctx, r, label, { accent, font: font(id === 'continue' ? 44 : S.button, true) });
      if (tap && !hit && hitRect(tap, r)) hit = fn;
      y += BTN_H;
      if (id === 'continue') {
        if (ctx) {
          const m = li.summary;
          text(ctx, `Slot ${li.n} · ${m.facility} · Year ${m.year}, Month ${m.month}`, cx, y + 10, { size: S.small, bold: true, color: paletteById(m.palette).dark, align: 'center', maxWidth: bw });
        }
        y += 60;
      }
      y += GAP;
    }
    return hit;
  }

  function drawTitle(ctx, cx, y, w) {
    if (assets?.has(BRAND.title)) {
      drawArtCrop(ctx, assets, BRAND.title, ART_CROP[BRAND.title], { x: cx - 300, y: y - 10, w: 600, h: TITLE_H - 80 });
      text(ctx, 'Run a care home people are glad to call home.', cx, y + TITLE_H - 50, { size: S.body, bold: true, color: C.textMuted, align: 'center', maxWidth: w - 80 });
      return;
    }
    // A soft sage roof line over the name: a care home, drawn in code.
    ctx.save();
    ctx.fillStyle = '#E4EFE2';
    ctx.strokeStyle = C.outline;
    ctx.lineWidth = 8;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - 200, y + 110);
    ctx.lineTo(cx, y);
    ctx.lineTo(cx + 200, y + 110);
    ctx.stroke();
    ctx.fillStyle = '#7FA384';
    ctx.beginPath();
    ctx.arc(cx, y + 70, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.font = font(150, true);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.lineWidth = 18;
    ctx.strokeText('CAREWORKS', cx, y + 120, w - 80);
    ctx.fillStyle = '#7FA384';
    ctx.fillText('CAREWORKS', cx, y + 120, w - 80);
    ctx.restore();
    text(ctx, 'Run a care home people are glad to call home.', cx, y + 285, { size: S.body, bold: true, color: C.textMuted, align: 'center', maxWidth: w - 80 });
  }

  return {
    onTap(p) {
      pass(null, p)?.();
    },
    onBack() {
      return false; // the Main Menu is a root: the next Back leaves the app
    },
    render(ctx) {
      pass(ctx, null);
    },
    // Screen rect of a button (tests): 'continue', 'slots', 'new', 'settings'.
    rectOf(id) {
      pass(null, null);
      return rects[id] ?? null;
    },
  };
}
