// Top bar shared by the game screens:
//   row 1: date (+ "Saved" note)
//   row 2: money bar — credits, Tech Chips, reputation (tap → finance) and a Products button
//   row 3: Pause / 1× / 2× / 4× (2× and 4× show a padlock until unlocked, bible §4.2), Save (for testing) and screen buttons
//   nav: [{ id, label, onTap, badge?() }]  drawn right-aligned after Save; badge() → attention badge text or null
//   hud: { assets, vfx, goFinance, goProducts } shared by every screen (made in main.js)
import { drawButton, hitRect } from '../../../../core/ui/Button.js';
import { contained, text } from './widgets.js';

export const TOP_BAR_HEIGHT = 290;
const BTN_FONT = 'bold 30px system-ui, sans-serif';

// Where the bar and its money row sit (same on every screen), for effects that land on them.
export function topBarRect(layout) {
  const sr = layout.safeRect;
  return layout.anchor('top', sr.w - 48, TOP_BAR_HEIGHT, 24);
}

export function moneyBarRect(layout) {
  const r = topBarRect(layout);
  return { x: r.x + 20, y: r.y + 86, w: r.w - 40 - 2 * 210 - 2 * 12, h: 84 };
}

export function createTopBar({ layout, campaign, nav = [], hud }) {
  let savedNote = null; // { text, until }

  const rect = () => topBarRect(layout);
  const moneyRect = () => moneyBarRect(layout);

  function productsRect() {
    const r = rect();
    return { x: r.x + r.w - 20 - 2 * 210 - 12, y: r.y + 86, w: 210, h: 84 };
  }

  function helpRect() {
    const r = rect();
    return { x: r.x + r.w - 20 - 150, y: r.y + 10, w: 150, h: 68 };
  }

  function contractsRect() {
    const r = rect();
    return { x: r.x + r.w - 20 - 210, y: r.y + 86, w: 210, h: 84 };
  }

  function buttons() {
    const r = rect();
    const y = r.y + 186;
    const h = 90;
    const clock = campaign.clock;
    const list = [{ id: 'pause', label: clock.paused ? 'Paused' : 'Pause', x: r.x + 20, w: 150, active: clock.paused }];
    let x = r.x + 20 + 150 + 10;
    for (const s of clock.speeds) {
      const locked = !clock.canUseSpeed(s);
      list.push({ id: `speed${s}`, label: `${s}×`, x, w: locked ? 118 : 92, active: !clock.paused && clock.speed === s, speed: s, locked });
      x += (locked ? 118 : 92) + 10;
    }
    // Right side, from the right edge inwards: nav buttons (last first), then Save.
    const right = [{ id: 'save', label: 'Save' }, ...nav];
    const w = 150;
    let rx = r.x + r.w - 20;
    for (let i = right.length - 1; i >= 0; i--) {
      rx -= w;
      list.push({ ...right[i], x: rx, w });
      rx -= 10;
    }
    return list.map((b) => ({ ...b, rect: { x: b.x, y, w: b.w, h } }));
  }

  async function doSave() {
    try {
      await campaign.save();
      savedNote = { text: 'Saved ✓', until: performance.now() + 2000 };
    } catch {
      savedNote = { text: 'Save failed', until: performance.now() + 3000 };
    }
  }

  function drawMoney(ctx) {
    const m = moneyRect();
    const eco = campaign.economy;
    const cash = eco.balance('credits');
    const debt = eco.inDebt;
    ctx.fillStyle = debt ? 'rgba(90,24,24,0.95)' : 'rgba(34,42,52,0.95)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(m.x, m.y, m.w, m.h, 18);
    else ctx.rect(m.x, m.y, m.w, m.h);
    ctx.fill();
    ctx.strokeStyle = debt ? '#FF5A5A' : '#35414F';
    ctx.lineWidth = 3;
    ctx.stroke();

    const cy = m.y + m.h / 2;
    let x = m.x + 14;
    const icon = (key) => {
      contained(ctx, hud.assets, key, { x, y: cy - 28, w: 56, h: 56 });
      x += 62;
    };
    icon(debt ? 'ui_icon_29' : 'ui_icon_01_money');
    text(ctx, cash.toLocaleString('en-US'), x, cy, { size: 34, bold: true, baseline: 'middle', color: debt ? '#FF8A80' : '#FFFFFF' });
    x += Math.max(150, ctx.measureText(cash.toLocaleString('en-US')).width + 24);
    icon('ui_icon_02_premium');
    text(ctx, String(eco.balance('techChips')), x, cy, { size: 34, bold: true, baseline: 'middle' });
    x += 60;
    icon('ui_icon_03_reputation');
    const rep = campaign.reputation;
    text(ctx, `${rep.value} · ${rep.rank.id}`, x, cy, { size: 32, bold: true, baseline: 'middle', maxWidth: m.x + m.w - x - 12 });
  }

  return {
    rect,
    buttons,
    moneyRect,
    productsRect,
    contractsRect,
    helpRect,
    contains: (p) => hitRect(p, rect()),
    // Returns true if the tap was used by the bar.
    handleTap(p) {
      if (!hitRect(p, rect())) return false;
      if (hitRect(p, moneyRect())) {
        hud.goFinance();
        return true;
      }
      if (hitRect(p, productsRect())) {
        hud.goProducts();
        return true;
      }
      if (hitRect(p, helpRect())) {
        hud.goHelp();
        return true;
      }
      if (hitRect(p, contractsRect())) {
        hud.goContracts();
        return true;
      }
      const b = buttons().find((b) => hitRect(p, b.rect));
      if (!b) return true;
      if (campaign.closed) return true;
      if (b.id === 'pause') campaign.clock.togglePause();
      else if (b.speed && b.locked) {
        const hint = campaign.speedLockHint(b.speed);
        if (hint) hud.vfx.text('screen', hint, b.rect.x + b.rect.w / 2, b.rect.y + b.rect.h + 40, { color: '#FFD166', size: 32, life: 1.8, rise: 30 });
      } else if (b.speed) campaign.clock.setSpeed(b.speed);
      else if (b.id === 'save') doSave();
      else b.onTap?.();
      return true;
    },
    save: doSave,
    render(ctx) {
      const r = rect();
      ctx.save();
      ctx.fillStyle = 'rgba(16,20,24,0.92)';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(r.x, r.y, r.w, r.h, 24);
      else ctx.rect(r.x, r.y, r.w, r.h);
      ctx.fill();
      text(ctx, campaign.clock.label(), r.x + 24, r.y + 44, { size: 40, bold: true, baseline: 'middle', maxWidth: r.w - 280 });
      if (savedNote && performance.now() < savedNote.until) {
        text(ctx, savedNote.text, r.x + r.w - 24 - 170, r.y + 44, { size: 32, bold: true, baseline: 'middle', align: 'right', color: '#7CFFB2' });
      }
      const hr = helpRect();
      drawButton(ctx, hr, '', { font: BTN_FONT });
      contained(ctx, hud.assets, 'ui_icon_27', { x: hr.x + 10, y: hr.y + 6, w: 50, h: 50 });
      text(ctx, 'Help', hr.x + 64, hr.y + 31, { size: 28, bold: true, baseline: 'middle' });
      drawMoney(ctx);
      const pr = productsRect();
      drawButton(ctx, pr, `Products ${campaign.products.active.length}/${campaign.products.slotCount}`, { font: BTN_FONT });
      const k = campaign.contracts;
      drawButton(ctx, contractsRect(), `Contracts ${k.active.length}/${k.maxActive}`, { font: BTN_FONT, badge: k.offers.length && k.canAccept ? k.offers.length : null });
      for (const b of buttons()) {
        drawButton(ctx, b.rect, b.label, {
          active: b.active,
          locked: b.locked,
          badge: b.badge?.() ?? null,
          accent: b.id === 'pause' ? '#FFD166' : '#4FC3F7',
          font: BTN_FONT,
        });
      }
      ctx.restore();
    },
  };
}

