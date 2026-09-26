// Competitions (bible §21, §23 "Competition List"): the whole ladder of 12 events — available events, records,
// the rivals in each field, entry requirements and rewards. Open events can be entered once a game month; locked
// ones say what opens them (the two secret events only hint). Header: your ranking + Rankings and Trophies.
import { THEME, font } from '../../../../core/Theme.js';
import { ScrollPanel } from '../../../../core/ui/ScrollPanel.js';
import { drawButton } from '../../../../core/ui/Button.js';
import { COMPETITIONS, COMPETITION_RULES, TROPHIES_BY_ID, COMPETITION_ART } from '../../data/competitions.js';
import { TUNINGS, STRATEGIES } from '../../data/tuning.js';
import { describeUnlock, missingParts } from '../systems/unlockRules.js';
import { createTopBar } from '../ui/TopBar.js';
import { panel, text, hit, fmt } from '../ui/widgets.js';
import { drawBackdrop, drawMarker, weightsLine, placeText, placeColor } from '../ui/competitionDraw.js';
import { ordinal } from '../systems/CompetitionRules.js';
import { wrapLines } from '../ui/competitionDraw.js';
const COL = THEME.color;

const GAP = 20;
const HEAD_H = 236;
const ART = { w: 280, h: 230 };
const S = THEME.size;
const NAME = (list, id) => list.find((x) => x.id === id)?.name ?? id;

export function createCompetitionListScreen({ renderer, layout, assets, campaign, router, goProject, hud, debugEnabled = false }) {
  const W = renderer.width;
  const topBar = createTopBar({
    layout,
    campaign,
    hud,
    nav: [
      { id: 'project', label: 'Project', onTap: goProject },
      { id: 'workshop', label: 'Workshop', onTap: () => router.go('workshop') },
    ],
  });
  let message = null;
  const scroll = new ScrollPanel({ getRect: bodyRect, contentHeight: 0 });
  const shown = (id) => campaign.rivalShown(id);

  function bodyRect() {
    const sr = layout.safeRect;
    const t = topBar.rect();
    const y = t.y + t.h + 20;
    return { x: sr.x + 24, y, w: sr.w - 48, h: sr.y + sr.h - 24 - y };
  }
  const cw = () => bodyRect().w - 12;
  const headButton = (i) => ({ x: cw() - (i + 1) * 250 - i * 14 - 12, y: 20, w: 250, h: 110 });
  // Cards grow with their wrapped text (Milestone 18: body text at the §33.2 size, wrapped, never squeezed).
  const cardRect = (i) => {
    let y = HEAD_H + GAP;
    for (let k = 0; k < i; k++) y += layoutCard(COMPETITIONS[k]).h + GAP;
    return { x: 0, y, w: cw(), h: layoutCard(COMPETITIONS[i]).h };
  };
  const enterRect = (i) => {
    const c = cardRect(i);
    return { x: c.x + c.w - 24 - 260, y: c.y + c.h - 24 - 110, w: 260, h: 110 };
  };
  const lastRect = (i) => {
    const r = enterRect(i);
    return { x: r.x - 16 - 240, y: r.y, w: 240, h: r.h };
  };
  const cardsBottom = () => {
    const r = cardRect(COMPETITIONS.length - 1);
    return r.y + r.h + GAP;
  };
  const debugRect = () => ({ x: 0, y: cardsBottom(), w: cw(), h: 110 });
  // A content rect → screen rect, only when fully in view (guide targets).
  function inScroll(r) {
    const b = bodyRect();
    const y = b.y + r.y - scroll.scrollY;
    if (y < b.y - 1 || y + r.h > b.y + b.h + 1) return null;
    return { x: b.x + r.x, y, w: r.w, h: r.h };
  }

  // What the Enter button does / why not: { ok, label, reason }.
  function status(ev) {
    if (!campaign.competitionOpen(ev.id)) {
      // §29.5 Black Circuit: once invited, the one-time stake of 3 Prestige Tokens (never credits or Tech Chips).
      if (ev.id === 'C12' && campaign.secrets.account.flags.blackCircuitInvite && !campaign.secrets.account.flags.blackCircuit) {
        const block = campaign.blackCircuitStakeBlock();
        return { ok: !block, stake: true, label: 'Pay stake', reason: block ?? 'Pay the 3 Prestige Token invitation stake' };
      }
      if (ev.id === 'C12' && campaign.secrets.account.flags.blackCircuit) return { ok: false, label: 'Rank A', reason: 'Stake paid — the Black Circuit opens at Company Rank A' };
      if (ev.secret) return { ok: false, label: 'Secret', reason: 'A secret invitation — nobody will say how to get one' };
      const met = campaign.competitionUnlocked(ev);
      const miss = missingParts(ev.unlock, (r) => campaign.ruleMet(r));
      return { ok: false, label: met ? 'Invite soon' : 'Locked', reason: met ? 'The invitation is on its way' : `Needs ${(miss.length ? miss : [describeUnlock(ev.unlock)]).join(' + ')}` };
    }
    const rec = campaign.competitions.records[ev.id];
    if (COMPETITION_RULES.oncePerMonth && rec?.lastPeriod === campaign.monthIndex) return { ok: false, label: 'Next month', reason: 'Raced this month — it runs again next month' };
    if (!campaign.competitionRobots.length) return { ok: false, label: 'No robot', reason: 'Finish a robot first' };
    return { ok: true, label: 'Enter…', reason: null };
  }

  const lastOf = (id) => [...campaign.competitions.results].reverse().find((r) => r.eventId === id) ?? null;

  const screen = {
    topBar,
    scroll,
    enterRectOf(id) {
      const i = COMPETITIONS.findIndex((e) => e.id === id);
      return i < 0 ? null : inScroll(enterRect(i));
    },
    scrollToEvent(id) {
      const i = COMPETITIONS.findIndex((e) => e.id === id);
      if (i >= 0) scroll.scrollY = Math.max(0, Math.min(scroll.maxScroll, cardRect(i).y - 10));
    },
    enter(params = {}) {
      message = null;
      if (params.eventId) {
        scroll.contentHeight = contentHeight();
        screen.scrollToEvent(params.eventId);
      }
    },
    onTap(p) {
      if (topBar.handleTap(p)) return;
      if (!scroll.contains(p)) return;
      const c = scroll.toContent(p);
      if (hit(c, headButton(0))) return router.go('trophies');
      if (hit(c, headButton(1))) return router.go('rankings');
      if (debugEnabled && hit(c, debugRect())) {
        campaign.setDebugCompetitions(!campaign.flags.debugCompetitions);
        message = { text: campaign.flags.debugCompetitions ? 'Debug: every event is open (secret ones too)' : 'Debug override off (events already open stay open)', color: COL.action };
        return;
      }
      COMPETITIONS.forEach((ev, i) => {
        if (hit(c, enterRect(i))) {
          const st = status(ev);
          if (st.stake && st.ok) {
            const res = campaign.payBlackCircuitStake();
            message = res.ok ? { text: 'Stake paid: the Black Circuit is yours for good (from Rank A)', color: COL.purple } : { text: res.reason, color: COL.bad };
          } else if (st.ok) router.go('compSetup', { eventId: ev.id });
          else message = { text: `${ev.id}: ${st.reason}`, color: COL.gold };
        }
        const last = lastOf(ev.id);
        if (last && hit(c, lastRect(i))) router.go('compResult', { resultId: last.id });
      });
    },
    onDragStart: (p) => scroll.beginDrag(p),
    onDrag: (p) => scroll.drag(p),
    onDragEnd: (p) => scroll.endDrag(p),

    render(ctx) {
      ctx.fillStyle = COL.bg;
      ctx.fillRect(0, 0, W, renderer.height);
      topBar.render(ctx);
      scroll.contentHeight = contentHeight();
      scroll.begin(ctx);
      drawHeader(ctx);
      COMPETITIONS.forEach((ev, i) => drawCard(ctx, ev, i));
      if (debugEnabled) drawButton(ctx, debugRect(), campaign.flags.debugCompetitions ? 'Debug: all events open (tap to turn off)' : 'Debug: open every event (C11/C12 too)', { accent: COL.action, selected: !!campaign.flags.debugCompetitions });
      scroll.end(ctx);
    },
  };

  function contentHeight() {
    return cardsBottom() + (debugEnabled ? 110 : 0);
  }

  // One card's text, wrapped to its width: { h, ops: [[str, x, y, opts]], fieldY } (y relative to the card top).
  function layoutCard(ev) {
    const w = cw();
    const open = campaign.competitionOpen(ev.id);
    const st = status(ev);
    const hideAll = ev.secret && !open;
    const ops = [];
    const put = (str, x, y, mw, size, opts = {}, maxLines = 3) => {
      const lines = wrapLines(str, mw, size, !!opts.bold).slice(0, maxLines);
      const lh = Math.round(size * 1.24);
      lines.forEach((l, i) => ops.push([l, x, y + i * lh, { size, maxWidth: mw, ...opts }]));
      return y + lines.length * lh;
    };
    // Beside the picture: name, weights, the month's boost.
    const x = 16 + ART.w + 20;
    const mw = w - x - 20;
    let y = put(`${ev.id} · ${ev.name}`, x, 18, mw, S.button, { bold: true }, 2) + 8;
    const weights = campaign.competitionWeights(ev.id);
    const hidden = !campaign.weightsKnown(ev.id);
    y = put(weightsLine(weights, { hidden }), x, y, mw, S.body, { bold: true, color: COL.progress }) + 6;
    const boosted = ev.rotate && !hidden ? `This month boosted: ${Object.entries(weights).filter(([, v]) => v > ev.rotate.base).map(([k]) => k).join(' & ')}` : ev.rotate ? 'Weights change every month' : null;
    if (boosted) y = put(boosted, x, y, mw, S.small, { color: COL.progress }, 2);
    // Full width below.
    const fx = 24;
    const fw = w - 48;
    y = Math.max(y, 16 + ART.h) + 16;
    y = put(hideAll ? 'An invitation only a few workshops ever receive.' : ev.blurb, fx, y, fw, S.small, { color: COL.textMuted }) + 8;
    y = put(`Rivals ≈ ${ev.target} · Entry ${campaign.entryFee(ev.id) ? fmt(campaign.entryFee(ev.id)) : 'free'}`, fx, y, fw, S.body) + 4;
    const extras = [ev.rewards.rep ? `${ev.rewards.rep} Rep` : null, ev.rewards.prestigeTokens ? `${ev.rewards.prestigeTokens} Prestige Token${ev.rewards.prestigeTokens > 1 ? 's' : ''}` : null, ev.rewards.trophy ? TROPHIES_BY_ID[ev.rewards.trophy].name : null].filter(Boolean);
    y = put(`1st: ${fmt(ev.rewards.credits)}${extras.length ? ' + ' + extras.join(' · ') : ''}`, fx, y, fw, S.body, { bold: true, color: COL.gold }) + 12;
    const fieldY = y; // the rival logos row (80 tall)
    y += 92;
    const rec = campaign.competitions.records[ev.id];
    if (rec?.entries) {
      const b = rec.best;
      y = put(`Won ${rec.wins} of ${rec.entries} · podiums ${rec.podiums}${rec.bestSegment ? ` · best segment ${rec.bestSegment.score.toFixed(1)}` : ''}`, fx, y, fw, S.body, { bold: true });
      if (b) y = put(`Best ${b.score.toFixed(1)} (${placeText(b.place)}) · ${b.entrant} · ${b.pilot} · ${NAME(STRATEGIES, b.strategy)}, ${NAME(TUNINGS, b.tuning)}`, fx, y + 4, fw, S.body, { color: COL.textMuted });
    } else {
      y = put(open ? 'Not entered yet.' : st.reason, fx, y, fw, S.body, { bold: !open, color: open ? COL.textMuted : COL.action });
    }
    return { h: y + 20 + 110 + 24, ops, fieldY };
  }

  function drawHeader(ctx) {
    const w = cw();
    panel(ctx, { x: 0, y: 0, w, h: HEAD_H });
    assets.drawContained(ctx, COMPETITION_ART.icon, { x: 12, y: 24, w: 100, h: 100 });
    text(ctx, 'Competitions', 122, 74, { size: S.heading, bold: true, baseline: 'middle', maxWidth: headButton(1).x - 16 - 122 });
    const k = campaign.competitions;
    const pos = campaign.rankings.positionOf('player', campaign.rankingIds());
    const line = message?.text ?? `Won ${k.totalWins} of ${k.totalEntries}${pos ? ` · ranked ${ordinal(pos)}` : ''} · ${campaign.trophies.count} troph${campaign.trophies.count === 1 ? 'y' : 'ies'}`;
    wrapLines(line, w - 48, S.body, !!message)
      .slice(0, 2)
      .forEach((l, i) => text(ctx, l, 24, 146 + i * 42, { size: S.body, bold: !!message, color: message?.color ?? COL.textMuted, maxWidth: w - 48 }));
    const btn = (i, icon, label) => {
      const r = headButton(i);
      drawButton(ctx, r, '', { accent: COL.gold });
      assets.drawContained(ctx, icon, { x: r.x + 8, y: r.y + 14, w: 72, h: 72 });
      text(ctx, label, r.x + 86, r.y + r.h / 2 - 3, { size: S.body, bold: true, baseline: 'middle', maxWidth: r.w - 94 });
    };
    btn(0, COMPETITION_ART.trophiesIcon, 'Trophies');
    btn(1, COMPETITION_ART.rankingsIcon, 'Rankings');
  }

  function drawCard(ctx, ev, i) {
    const r = cardRect(i);
    const L = layoutCard(ev);
    const open = campaign.competitionOpen(ev.id);
    const st = status(ev);
    const hideAll = ev.secret && !open;
    panel(ctx, r, { stroke: open ? COL.progress : COL.line, lineWidth: open ? 4 : 3 });
    const art = { x: r.x + 16, y: r.y + 16, w: ART.w, h: ART.h };
    drawBackdrop(ctx, assets, ev, art);
    if (!open) {
      ctx.fillStyle = COL.overlay;
      ctx.fillRect(art.x, art.y, art.w, art.h);
      if (hideAll) text(ctx, '?', art.x + art.w / 2, art.y + art.h / 2, { size: 110, bold: true, align: 'center', baseline: 'middle', color: COL.textFaint });
    }
    for (const [str, x, y, opts] of L.ops) text(ctx, str, r.x + x, r.y + y, opts);

    // The field: rival logos.
    const fy = r.y + L.fieldY + 40;
    text(ctx, 'Field:', r.x + 24, fy, { size: S.small, color: COL.textMuted, baseline: 'middle' });
    ev.field.forEach(([id], j) => drawMarker(ctx, assets, r.x + 150 + j * 84, fy, 70, { rivalId: id, shown }));

    const last = lastOf(ev.id);
    if (last) {
      const lr = lastRect(i);
      drawButton(ctx, lr, '');
      text(ctx, 'Last:', lr.x + 20, lr.y + lr.h / 2 - 3, { size: S.body, bold: true, baseline: 'middle' });
      text(ctx, placeText(last.place, last.player.dnf), lr.x + lr.w - 20, lr.y + lr.h / 2 - 3, { size: S.button, bold: true, baseline: 'middle', align: 'right', color: placeColor(last.place, last.player.dnf) });
    }
    drawButton(ctx, enterRect(i), st.label, { active: st.ok, disabled: !st.ok, locked: !open && !st.stake, accent: st.stake ? COL.purple : COL.good, badge: st.ok ? '!' : null });
  }

  return screen;
}
