// Code-drawn pieces for the menus, the slot cards and Facility Setup (Milestone 0). The founder portraits are
// the Founder's own portrait (Milestone 28b; the code-drawn head and shoulders only while it loads); the dice and the sign
// come from the shared core/ui/SetupArt.
//   drawPortrait(ctx, r, founder, ring, assets)  the Founder's portrait (their staff art, head and shoulders) in a framed
//                                                card; without assets or while it loads: skin, hair, a tunic, initials
//   drawArtCrop(ctx, assets, key, crop, box, k)  a picture's painted part (crop: fractions of the file) fitted in box,
//                                                centred, at alpha k; returns the drawn rect (null while it loads)
//   drawSign(ctx, assets, r, name, palette, sub) the facility sign in the palette colour (words drawn by code)
//   diceButton(ctx, assets, r, label, opts)      a button with the Random die beside its label
//   accentStrip(ctx, r, palette)                 the palette strip down a slot card's left edge
import { THEME, font } from '../../../../core/Theme.js';
import { drawButton } from '../../../../core/ui/Button.js';
import { drawDice, drawBadge } from '../../../../core/ui/SetupArt.js';
import { ROLES } from '../../data/setup.js';
import { PORTRAIT_CROP } from '../../data/bars.js';

export function drawArtCrop(ctx, assets, key, crop, box, k = 1) {
  const img = assets.get(key);
  if (!img) return null;
  const aspect = (crop.w * img.naturalWidth) / (crop.h * img.naturalHeight);
  const w = Math.min(box.w, box.h * aspect);
  const h = w / aspect;
  const r = { x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w, h };
  ctx.save();
  ctx.globalAlpha *= k;
  assets.drawCrop(ctx, key, crop, r);
  ctx.restore();
  return r;
}

const C = THEME.color;

export function drawPortrait(ctx, r, founder, ring = null, assets = null) {
  ctx.save();
  ctx.fillStyle = C.panelAlt;
  ctx.beginPath();
  ctx.roundRect(r.x, r.y, r.w, r.h, 22);
  ctx.fill();
  if (ring) {
    ctx.strokeStyle = ring;
    ctx.lineWidth = 6;
    ctx.stroke();
  }
  ctx.clip();
  if (founder && assets?.has(founder.art)) assets.drawCrop(ctx, founder.art, PORTRAIT_CROP, r); // (Milestone 28b: their own portrait)
  else if (founder) {
    const s = r.w;
    const cx = r.x + s / 2;
    const role = ROLES[founder.role];
    // shoulders / tunic
    ctx.fillStyle = role.colour;
    ctx.strokeStyle = C.outline;
    ctx.lineWidth = Math.max(3, s * 0.025);
    ctx.beginPath();
    ctx.ellipse(cx, r.y + r.h * 1.02, s * 0.42, r.h * 0.34, 0, Math.PI, 0);
    ctx.fill();
    ctx.stroke();
    // neck, head, hair
    ctx.fillStyle = founder.skin;
    ctx.fillRect(cx - s * 0.07, r.y + r.h * 0.56, s * 0.14, r.h * 0.14);
    ctx.beginPath();
    ctx.arc(cx, r.y + r.h * 0.42, s * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = founder.hair;
    ctx.beginPath();
    ctx.arc(cx, r.y + r.h * 0.39, s * 0.21, Math.PI * 1.05, Math.PI * 1.95);
    ctx.closePath();
    ctx.fill();
    // eyes and a smile
    ctx.fillStyle = C.outline;
    for (const dx of [-0.075, 0.075]) {
      ctx.beginPath();
      ctx.arc(cx + s * dx, r.y + r.h * 0.43, s * 0.018, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.lineWidth = Math.max(2, s * 0.015);
    ctx.beginPath();
    ctx.arc(cx, r.y + r.h * 0.47, s * 0.06, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
    // initials on the tunic
    ctx.fillStyle = '#FFFFFF';
    ctx.font = font(Math.max(THEME.size.small, s * 0.13), true);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(founder.id, cx, r.y + r.h * 0.86, s * 0.6);
  }
  ctx.restore();
}

export function drawSign(ctx, assets, r, name, palette, sub = '') {
  drawBadge(ctx, assets, r, { color: palette.hex, title: name || 'Your Facility', sub });
}

export function diceButton(ctx, assets, r, label, opts = {}) {
  drawButton(ctx, r, '', opts);
  ctx.save();
  ctx.font = opts.font ?? font(THEME.size.button, true);
  const tw = label ? Math.min(ctx.measureText(label).width, r.w - 110) : 0;
  const dice = Math.min(64, r.h * 0.55);
  const x0 = r.x + r.w / 2 - (dice + (label ? 16 + tw : 0)) / 2;
  const cy = r.y + (r.h - THEME.button.lip) / 2;
  drawDice(ctx, assets, { x: x0, y: cy - dice / 2, w: dice, h: dice }, { color: C.outline });
  if (label) {
    ctx.fillStyle = opts.disabled ? C.textFaint : C.textOnAction;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = opts.font ?? font(THEME.size.button, true);
    ctx.fillText(label, x0 + dice + 16, cy + 1, r.w - 110);
  }
  ctx.restore();
}

export function accentStrip(ctx, r, palette) {
  ctx.fillStyle = palette.hex;
  ctx.beginPath();
  ctx.roundRect(r.x + 10, r.y + 18, 18, r.h - 36, 9);
  ctx.fill();
}
