// Top bar shared by the game screens (Milestone 17b: slim and big — the row of small text buttons is gone):
//   row 1: "‹ Workshop" (every screen but the workshop itself), the date, Inbox (unread badge) and Help
//   row 2: the money chip — credits, Tech Chips, reputation + rank (tap → Finance) — and big Pause / 1× / 2× / 4×
//          (2× and 4× show a padlock until unlocked, bible §4.2)
//   home: true on the workshop (no back button); back: { label, onTap } replaces "‹ Workshop" (e.g. Build mode "Done")
//   hud: { assets, vfx, goFinance, goHome, goHelp, goInbox } shared by every screen (made in main.js)
// Saving by hand moved to the Money menu (autosave still runs every month).
import { THEME, font } from '../../../../core/Theme.js';
import { drawButton, hitRect } from '../../../../core/ui/Button.js';
import { contained, text } from './widgets.js';
const COL = THEME.color;
const S = THEME.size;

export const TOP_BAR_HEIGHT = 250;
const ROW1 = { y: 10, h: 110 };
const ROW2 = { y: 130, h: 110 };

// Where the bar and its money chip sit (same on every screen), for effects that land on them.
export function topBarRect(layout) {
  const sr = layout.safeRect;
  return layout.anchor('top', sr.w - 32, TOP_BAR_HEIGHT, 16);
}

const SPEED_W = { pause: 150, speed: 108, locked: 124 };

export function moneyBarRect(layout, speeds = [1, 2, 4], locked = () => false) {
  const r = topBarRect(layout);
  const sw = SPEED_W.pause + speeds.reduce((t, s) => t + (locked(s) ? SPEED_W.locked : SPEED_W.speed) + 10, 0) + 10;
  return { x: r.x + 16, y: r.y + ROW2.y, w: r.w - 32 - sw, h: ROW2.h };
}

export function createTopBar({ layout, campaign, hud, home = false, back = null }) {
  const rect = () => topBarRect(layout);
  const clock = campaign.clock;
  const moneyRect = () => moneyBarRect(layout, clock.speeds, (s) => !clock.canUseSpeed(s));

  const helpRect = () => {
    const r = rect();
    return { x: r.x + r.w - 16 - 150, y: r.y + ROW1.y, w: 150, h: ROW1.h };
  };
  const inboxRect = () => {
    const r = rect();
    return { x: r.x + r.w - 16 - 150 - 12 - 180, y: r.y + ROW1.y, w: 180, h: ROW1.h };
  };
  const backRect = () => {
    if (home) return null;
    const r = rect();
    return { x: r.x + 16, y: r.y + ROW1.y, w: 250, h: ROW1.h };
  };

  // Pause and speeds, right of the money chip; plus the back button (id 'home') so tests / the guide find them.
  function buttons() {
    const r = rect();
    const m = moneyRect();
    const y = r.y + ROW2.y;
    const list = [{ id: 'pause', label: clock.paused ? 'Paused' : 'Pause', x: m.x + m.w + 10, w: SPEED_W.pause, active: clock.paused }];
    let x = m.x + m.w + 10 + SPEED_W.pause + 10;
    for (const s of clock.speeds) {
      const locked = !clock.canUseSpeed(s);
      const w = locked ? SPEED_W.locked : SPEED_W.speed;
      list.push({ id: `speed${s}`, label: `${s}×`, x, w, active: !clock.paused && clock.speed === s, speed: s, locked });
      x += w + 10;
    }
    const out = list.map((b) => ({ ...b, rect: { x: b.x, y, w: b.w, h: ROW2.h } }));
    const br = backRect();
    if (br) out.push({ id: 'home', label: back?.label ?? '‹ Workshop', rect: br, onTap: back?.onTap ?? (() => hud.goHome?.()) });
    return out;
  }

  let savedNote = null;
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
    ctx.fillStyle = debt ? COL.panelBad : COL.panel;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(m.x, m.y + 4, m.w, m.h - 8, 26);
    else ctx.rect(m.x, m.y + 4, m.w, m.h - 8);
    ctx.fill();
    ctx.strokeStyle = debt ? COL.bad : COL.outline;
    ctx.lineWidth = 4;
    ctx.stroke();
    const cy = m.y + m.h / 2;
    let x = m.x + 12;
    const icon = (key, s = 60) => {
      contained(ctx, hud.assets, key, { x, y: cy - s / 2, w: s, h: s });
      x += s + 4;
    };
    icon(debt ? 'ui_icon_29' : 'ui_icon_01_money');
    const cashText = cash.toLocaleString('en-US');
    text(ctx, cashText, x, cy, { size: S.body, bold: true, baseline: 'middle', color: debt ? COL.bad : COL.text });
    x += ctx.measureText(cashText).width + 14;
    icon('ui_icon_02_premium', 52);
    text(ctx, String(eco.balance('techChips')), x, cy, { size: S.body, bold: true, baseline: 'middle' });
    x += ctx.measureText(String(eco.balance('techChips'))).width + 12;
    icon('ui_icon_03_reputation', 52);
    const rep = campaign.reputation;
    text(ctx, `Rank ${rep.ranks[rep.highestRankIndex].id}`, x, cy, { size: S.body, bold: true, baseline: 'middle', color: COL.actionDark, maxWidth: m.x + m.w - x - 10 });
  }

  const bar = {
    rect,
    buttons,
    moneyRect,
    // Products and Contracts moved to the stations / bottom bar (Milestone 17b): no buttons for them here.
    productsRect: () => null,
    contractsRect: () => null,
    helpRect,
    inboxRect,
    backRect,
    contains: (p) => hitRect(p, rect()),
    // Returns true if the tap was used by the bar.
    handleTap(p) {
      if (!hitRect(p, rect())) return false;
      if (hitRect(p, moneyRect())) {
        hud.goFinance();
        return true;
      }
      if (hitRect(p, inboxRect())) {
        hud.goInbox?.();
        return true;
      }
      if (hitRect(p, helpRect())) {
        hud.goHelp();
        return true;
      }
      const b = buttons().find((x) => hitRect(p, x.rect));
      if (!b) return true;
      if (b.id === 'home') {
        b.onTap();
        return true;
      }
      if (campaign.closed) return true;
      if (b.id === 'pause') clock.togglePause();
      else if (b.speed && b.locked) {
        const hint = campaign.speedLockHint(b.speed);
        if (hint) hud.vfx.text('screen', hint, b.rect.x + b.rect.w / 2, b.rect.y + b.rect.h + 40, { color: COL.actionDark, size: S.body, life: 1.8, rise: 30 });
      } else if (b.speed) clock.setSpeed(b.speed);
      return true;
    },
    save: doSave,
    get savedNote() {
      return savedNote && performance.now() < savedNote.until ? savedNote.text : null;
    },
    render(ctx) {
      const r = rect();
      ctx.save();
      ctx.fillStyle = COL.sheet;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(r.x, r.y, r.w, r.h, 30);
      else ctx.rect(r.x, r.y, r.w, r.h);
      ctx.fill();
      ctx.strokeStyle = COL.outline;
      ctx.lineWidth = 4;
      ctx.stroke();
      const br = backRect();
      const dateX = br ? br.x + br.w + 20 : r.x + 28;
      const dateW = inboxRect().x - 16 - dateX;
      const d = clock.dateOf(clock.totalDays);
      text(ctx, home ? `Year ${d.year} · Month ${d.month} · Day ${d.day}` : `Y${d.year} · M${d.month} · D${d.day}`, dateX, r.y + ROW1.y + ROW1.h / 2, { size: home ? S.heading : S.body, bold: true, baseline: 'middle', maxWidth: dateW });
      const saved = bar.savedNote;
      if (saved) text(ctx, saved, dateX + dateW, r.y + ROW1.y + ROW1.h - 6, { size: S.small, bold: true, align: 'right', baseline: 'bottom', color: COL.good });
      const ir = inboxRect();
      const unread = campaign.notes?.unread ?? 0;
      drawButton(ctx, ir, 'Inbox', { accent: COL.progress, badge: unread ? (unread > 99 ? '99+' : unread) : null });
      const hr = helpRect();
      drawButton(ctx, hr, 'Help', { accent: COL.progress });
      drawMoney(ctx);
      for (const b of buttons()) {
        drawButton(ctx, b.rect, b.label, { active: b.active, locked: b.locked, accent: b.id === 'pause' ? COL.warn : b.id === 'home' ? COL.progress : COL.action, font: font(S.button, true) });
      }
      ctx.restore();
    },
  };
  return bar;
}
