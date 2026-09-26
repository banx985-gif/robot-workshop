// Hiring (bible §16): the candidate board (3 cards + a special-arrival card), free and Tech Chip refreshes,
// and the five channels (paid refreshes). Candidate cards reuse core/ui/StaffCard.js. Opened from the roster.
// The game pauses while this screen is open.
import { THEME, font } from '../../../../core/Theme.js';
import { SECRET_ART } from '../../data/secrets.js';
import { ScrollPanel } from '../../../../core/ui/ScrollPanel.js';
import { drawStaffCard, staffCardButtonAt, STAFF_CARD_HEIGHT } from '../../../../core/ui/StaffCard.js';
import { drawButton, drawPadlock, hitRect } from '../../../../core/ui/Button.js';
import { ROLES, TIERS } from '../../data/staff.js';
import { TRAITS } from '../../data/traits.js';
import { WORK_STATS } from '../../data/stats.js';
import { CHANNELS, RECRUIT_RULES, RECRUIT_ART, STORE_ITEMS } from '../../data/recruitment.js';
import { describeUnlock } from '../systems/unlockRules.js';
import { panel, text, contained, fmt } from '../ui/widgets.js';
const COL = THEME.color;

const HEADER_H = 150;
const GAP = 22;
const LINE = 44; // one line of body text (34 px) with its spacing
const CH_BTN_W = 300;
const SIZE = THEME.size;

// Word-wrap for layout: heights are measured before drawing, so taps and the guide see the same rects.
const measure = document.createElement('canvas').getContext('2d');
function wrapLines(str, w, size = SIZE.body, bold = false) {
  measure.font = font(size, bold);
  const lines = [];
  let cur = '';
  for (const word of String(str).split(' ')) {
    const t = cur ? `${cur} ${word}` : word;
    if (measure.measureText(t).width > w && cur) {
      lines.push(cur);
      cur = word;
    } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}
const GREEN = COL.good;
const GOLD = COL.gold;
const RED = COL.bad;

export function createRecruitmentScreen({ renderer, layout, assets, bus, campaign, router }) {
  const W = renderer.width;
  const rec = campaign.recruitment;
  let message = null;
  let resumeOnExit = false;
  const scroll = new ScrollPanel({ getRect: bodyRect, contentHeight: 0 });

  const sr = () => layout.safeRect;
  const backRect = () => ({ x: sr().x + 24, y: sr().y + 24, w: 200, h: 110 });
  function bodyRect() {
    const s = sr();
    const y = s.y + HEADER_H;
    return { x: s.x + 24, y, w: s.w - 48, h: s.y + s.h - 24 - y };
  }
  const cw = () => bodyRect().w - 12;
  // The free-refresh panel: how refreshes work (wrapped), taps left, then the two refresh buttons.
  const infoLines = () => wrapLines('New candidates arrive free on day 1 of every odd month.', cw() - 40, SIZE.body, true);
  const infoH = () => 20 + infoLines().length * LINE + LINE + 16 + 110 + 20;
  const infoButton = (k) => {
    const w = (cw() - 40 - 20) / 2;
    return { x: 20 + k * (w + 20), y: infoH() - 20 - 110, w, h: 110 };
  };
  const cardRect = (i) => ({ x: 0, y: infoH() + GAP + i * (STAFF_CARD_HEIGHT + GAP), w: cw(), h: STAFF_CARD_HEIGHT });
  const channelsTop = () => infoH() + GAP + rec.cards.length * (STAFF_CARD_HEIGHT + GAP) + 10;
  // A channel row: name, who it finds (wrapped), then its tier odds or what opens it (wrapped), beside the button.
  function channelLines(ch) {
    const textW = cw() - 48 - CH_BTN_W - 20;
    const open = campaign.channelOpen(ch.id);
    const tiers = Object.entries(campaign.recruitment.hooks.tierWeights(ch)).filter(([, v]) => v > 0).map(([t, v]) => `${TIERS[t].name} ${v}%`).join(' · ');
    return { open, textW, pool: wrapLines(ch.pool, textW), odds: wrapLines(open ? tiers : `Needs ${describeUnlock(ch.unlock)}`, textW, SIZE.body, !open) };
  }
  const channelHeight = (ch) => {
    const l = channelLines(ch);
    return Math.max(150, 20 + 50 + (l.pool.length + l.odds.length) * LINE + 16);
  };
  const channelRect = (i) => {
    let y = channelsTop() + 110;
    for (let k = 0; k < i; k++) y += channelHeight(CHANNELS[k]) + 14;
    return { x: 0, y, w: cw(), h: channelHeight(CHANNELS[i]) };
  };
  const channelButton = (i) => {
    const r = channelRect(i);
    return { x: r.x + r.w - 20 - CH_BTN_W, y: r.y + (r.h - 110) / 2, w: CH_BTN_W, h: 110 };
  };

  function inScroll(r) {
    const b = bodyRect();
    const y = b.y + r.y - scroll.scrollY;
    if (y < b.y - 1 || y + r.h > b.y + b.h + 1) return null;
    return { x: b.x + r.x, y, w: r.w, h: r.h };
  }

  function say(str, color = GOLD, secs = 3) {
    message = { text: str, color, until: performance.now() + secs * 1000 };
  }

  function viewFor(c) {
    const fee = campaign.feeFor(c.id);
    const block = campaign.hireBlock(c.id);
    const via = c.special ? 'Special arrival' : `via ${rec.channel(c.channel)?.name ?? c.channel}`;
    const days = c.special ? Math.max(0, c.special.until - campaign.clock.totalDays) : 0;
    let footer = `${via}${c.returning ? ' (back again)' : ''} · salary ${fmt(c.salary)}/month`;
    if (c.special) footer = `${days} days left · salary ${fmt(c.salary)}/month`;
    if (block) footer = `Can't hire: ${block}`;
    else if (c.guaranteed && campaign.economy.balance('credits') < fee) footer = 'Short of the fee? We cover the difference.';
    return {
      title: c.name,
      subtitle: `${ROLES[c.role].name} · Lv ${c.level} · ${TIERS[c.tier].name}`,
      portraitKey: c.art,
      badgeKey: RECRUIT_ART.tierBadges[c.tier],
      stats: WORK_STATS.map((st) => ({ label: st.short, value: c.stats[st.key] })),
      chips: c.traits.map((t) => ({ label: TRAITS[t]?.name ?? t })),
      bars: [],
      footer,
      buttons: [{ id: 'hire', label: `Hire · ${fmt(fee)}` }],
    };
  }

  const screen = {
    scroll,
    viewFor,
    // Guide / test helpers.
    hireRectOf(candidateId) {
      const i = rec.cards.findIndex((c) => c.id === candidateId);
      if (i < 0) return null;
      const r = cardRect(i);
      return inScroll({ x: r.x + r.w - 24 - 180, y: r.y + 24, w: 180, h: 64 });
    },
    cardRectOf(candidateId) {
      const i = rec.cards.findIndex((c) => c.id === candidateId);
      return i < 0 ? null : inScroll(cardRect(i));
    },
    scrollToCard(candidateId) {
      const i = rec.cards.findIndex((c) => c.id === candidateId);
      if (i >= 0) scroll.scrollY = cardRect(i).y;
    },
    channelButtonRect: (i) => inScroll(channelButton(i)),
    infoButtonRect: (k) => inScroll(infoButton(k)),

    enter(params = {}) {
      message = null;
      resumeOnExit = !campaign.clock.paused;
      campaign.clock.pause();
      scroll.scrollY = 0;
      if (params.focusSpecial && rec.special) screen.scrollToCard(rec.special.id);
    },
    exit() {
      if (resumeOnExit) campaign.clock.resume();
    },

    onTap(p) {
      if (hitRect(p, backRect())) {
        router.go('roster');
        return;
      }
      if (!scroll.contains(p)) return;
      const c = scroll.toContent(p);
      for (const [k, kind] of ['free', 'techChips'].entries()) {
        if (!hitRect(c, infoButton(k))) continue;
        const r = campaign.refreshBoard(kind);
        say(r.ok ? 'New candidates!' : r.reason, r.ok ? GREEN : RED);
        if (r.ok) campaign.save().catch(() => {});
        return;
      }
      for (const [i, cand] of rec.cards.entries()) {
        const r = cardRect(i);
        if (!hitRect(c, r)) continue;
        if (staffCardButtonAt(r, viewFor(cand), c) === 'hire') {
          const res = campaign.hire(cand.id);
          say(res.ok ? `${res.staff.name} joined the team!` : res.reason, res.ok ? GREEN : RED, 3.5);
          if (res.ok) campaign.save().catch(() => {});
        }
        return;
      }
      CHANNELS.forEach((ch, i) => {
        if (!hitRect(c, channelButton(i))) return;
        const r = campaign.refreshBoard('paid', ch.id);
        say(r.ok ? `${ch.name}: new candidates!` : r.reason, r.ok ? GREEN : RED);
        if (r.ok) {
          scroll.scrollY = 0;
          campaign.save().catch(() => {});
        }
      });
    },
    onDragStart: (p) => scroll.beginDrag(p),
    onDrag: (p) => scroll.drag(p),
    onDragEnd: (p) => scroll.endDrag(p),

    render(ctx) {
      ctx.fillStyle = COL.bg;
      ctx.fillRect(0, 0, W, renderer.height);
      const s = sr();
      drawButton(ctx, backRect(), '‹ Back', { font: font(SIZE.button, true) });
      contained(ctx, assets, RECRUIT_ART.icon, { x: s.x + 224, y: s.y + 26, w: 80, h: 80 });
      text(ctx, 'Hiring', s.x + 318, s.y + 66, { size: 48, bold: true, baseline: 'middle' });
      const full = campaign.staff.staff.length >= campaign.employeeCap;
      text(ctx, `Staff ${campaign.staff.staff.length} / ${campaign.employeeCap}`, s.x + s.w - 24, s.y + 50, { size: 38, bold: true, align: 'right', baseline: 'middle', color: full ? RED : COL.text });
      text(ctx, `${fmt(campaign.economy.balance('credits'))} cr · ${campaign.economy.balance('techChips')} TC`, s.x + s.w - 24, s.y + 94, { size: SIZE.small, align: 'right', baseline: 'middle', color: COL.textMuted });

      const w = cw();
      const lastCh = channelRect(CHANNELS.length - 1);
      scroll.contentHeight = lastCh.y + lastCh.h + 20;
      scroll.begin(ctx);
      // Free refresh info
      panel(ctx, { x: 0, y: 0, w, h: infoH() });
      const left = rec.freeManualLeft(campaign.clock.year);
      let iy = 20;
      for (const line of infoLines()) {
        text(ctx, line, 20, iy, { size: SIZE.body, bold: true, maxWidth: w - 40 });
        iy += LINE;
      }
      text(ctx, `Free refresh taps left this year: ${left}`, 20, iy, { size: SIZE.body, color: left ? GREEN : COL.textMuted, maxWidth: w - 40 });
      drawButton(ctx, infoButton(0), left ? 'Free refresh' : 'Free refresh used', { disabled: !left, font: font(36, true), accent: GREEN });
      const tc = STORE_ITEMS[RECRUIT_RULES.techChipItem];
      drawButton(ctx, infoButton(1), `Refresh · ${tc.cost} Tech Chips`, { disabled: !!campaign.refreshBlock('techChips'), font: font(36, true), accent: COL.purple });

      rec.cards.forEach((c, i) => {
        // Legendary / secret arrivals (M17): the legendary aura behind their card.
        if (['legendary', 'secret'].includes(c.tier)) {
          const cr = cardRect(i);
          ctx.save();
          ctx.globalAlpha = 0.55;
          assets.drawContained(ctx, SECRET_ART.aura, { x: cr.x - 30, y: cr.y - 30, w: 320, h: cr.h + 60 });
          ctx.restore();
        }
        drawStaffCard(ctx, cardRect(i), viewFor(c), assets, { highlight: !!c.special, accent: GOLD });
        if (c.special) text(ctx, `★ ${c.special.note ?? 'Special arrival'}`, cardRect(i).x + 262, cardRect(i).y + cardRect(i).h - 24, { size: SIZE.small, bold: true, color: GOLD, baseline: 'bottom', maxWidth: cardRect(i).w - 290 });
      });
      if (!rec.cards.length) text(ctx, 'No candidates right now — refresh below.', w / 2, infoH() + GAP + 60, { size: SIZE.body, align: 'center', color: COL.textMuted, maxWidth: w - 20 });

      const ct = channelsTop();
      text(ctx, 'Advertise', 4, ct + 6, { size: SIZE.heading, bold: true });
      text(ctx, 'A paid advert replaces the candidates above.', 4, ct + 62, { size: SIZE.small, color: COL.textMuted, maxWidth: w - 8 });
      CHANNELS.forEach((ch, i) => drawChannel(ctx, ch, i));
      scroll.end(ctx);

      if (message && performance.now() < message.until) {
        const b = bodyRect();
        const r = { x: b.x + 40, y: b.y + b.h - 110, w: b.w - 80, h: 84 };
        panel(ctx, r, { fill: COL.panel, stroke: message.color, radius: 20 });
        text(ctx, message.text, r.x + r.w / 2, r.y + r.h / 2, { size: SIZE.body, bold: true, align: 'center', baseline: 'middle', color: message.color, maxWidth: r.w - 30 });
      }
    },
  };

  function drawChannel(ctx, ch, i) {
    const r = channelRect(i);
    const l = channelLines(ch);
    const open = l.open;
    const block = campaign.refreshBlock('paid', ch.id);
    panel(ctx, r, { fill: open ? COL.panel : COL.panelDim, stroke: COL.line });
    if (!open) drawPadlock(ctx, r.x + 34, r.y + 40, 26, COL.action);
    text(ctx, ch.name, r.x + (open ? 24 : 64), r.y + 20, { size: SIZE.button, bold: true, color: open ? COL.text : COL.textMuted, maxWidth: l.textW - (open ? 0 : 40) });
    let y = r.y + 70;
    for (const line of l.pool) {
      text(ctx, line, r.x + 24, y, { size: SIZE.body, color: COL.textMuted, maxWidth: l.textW });
      y += LINE;
    }
    for (const line of l.odds) {
      text(ctx, line, r.x + 24, y, { size: SIZE.body, bold: !open, color: open ? COL.text : COL.actionDark, maxWidth: l.textW });
      y += LINE;
    }
    drawButton(ctx, channelButton(i), open ? `Refresh · ${fmt(ch.cost)}` : 'Locked', { disabled: !!block, locked: !open, font: font(SIZE.body, true) });
  }

  return screen;
}
