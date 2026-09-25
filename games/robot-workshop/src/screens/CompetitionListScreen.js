// Competitions (bible §21, §23 "Competition List"): the whole ladder of 12 events — available events, records,
// the rivals in each field, entry requirements and rewards. Open events can be entered once a game month; locked
// ones say what opens them (the two secret events only hint). Header: your ranking + Rankings and Trophies.
import { ScrollPanel } from '../../../../core/ui/ScrollPanel.js';
import { drawButton } from '../../../../core/ui/Button.js';
import { COMPETITIONS, COMPETITION_RULES, TROPHIES_BY_ID, COMPETITION_ART } from '../../data/competitions.js';
import { TUNINGS, STRATEGIES } from '../../data/tuning.js';
import { describeUnlock, missingParts } from '../systems/unlockRules.js';
import { createTopBar } from '../ui/TopBar.js';
import { panel, text, hit, fmt } from '../ui/widgets.js';
import { drawBackdrop, drawMarker, weightsLine, placeText, placeColor } from '../ui/competitionDraw.js';
import { ordinal } from '../systems/CompetitionRules.js';

const CARD_H = 560;
const GAP = 20;
const HEAD_H = 170;
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
  const headButton = (i) => ({ x: cw() - (i + 1) * 230 - i * 14 - 12, y: 30, w: 230, h: 110 });
  const cardRect = (i) => ({ x: 0, y: HEAD_H + GAP + i * (CARD_H + GAP), w: cw(), h: CARD_H });
  const enterRect = (i) => {
    const c = cardRect(i);
    return { x: c.x + c.w - 24 - 260, y: c.y + c.h - 24 - 90, w: 260, h: 90 };
  };
  const lastRect = (i) => {
    const r = enterRect(i);
    return { x: r.x - 16 - 240, y: r.y, w: 240, h: r.h };
  };
  const debugRect = () => ({ x: 0, y: HEAD_H + GAP + COMPETITIONS.length * (CARD_H + GAP), w: cw(), h: 90 });
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
        message = { text: campaign.flags.debugCompetitions ? 'Debug: every event is open (secret ones too)' : 'Debug override off (events already open stay open)', color: '#FFB74D' };
        return;
      }
      COMPETITIONS.forEach((ev, i) => {
        if (hit(c, enterRect(i))) {
          const st = status(ev);
          if (st.stake && st.ok) {
            const res = campaign.payBlackCircuitStake();
            message = res.ok ? { text: 'Stake paid: the Black Circuit is yours for good (from Rank A)', color: '#B388FF' } : { text: res.reason, color: '#FF8A80' };
          } else if (st.ok) router.go('compSetup', { eventId: ev.id });
          else message = { text: `${ev.id}: ${st.reason}`, color: '#FFD166' };
        }
        const last = lastOf(ev.id);
        if (last && hit(c, lastRect(i))) router.go('compResult', { resultId: last.id });
      });
    },
    onDragStart: (p) => scroll.beginDrag(p),
    onDrag: (p) => scroll.drag(p),
    onDragEnd: (p) => scroll.endDrag(p),

    render(ctx) {
      ctx.fillStyle = '#101418';
      ctx.fillRect(0, 0, W, renderer.height);
      topBar.render(ctx);
      scroll.contentHeight = contentHeight();
      scroll.begin(ctx);
      drawHeader(ctx);
      COMPETITIONS.forEach((ev, i) => drawCard(ctx, ev, i));
      if (debugEnabled) drawButton(ctx, debugRect(), campaign.flags.debugCompetitions ? 'Debug: all events open (tap to turn off)' : 'Debug: open every event (C11/C12 too)', { accent: '#FFB74D', selected: !!campaign.flags.debugCompetitions, font: 'bold 28px system-ui, sans-serif' });
      scroll.end(ctx);
    },
  };

  function contentHeight() {
    return HEAD_H + GAP + COMPETITIONS.length * (CARD_H + GAP) + (debugEnabled ? 110 : 0);
  }

  function drawHeader(ctx) {
    const w = cw();
    panel(ctx, { x: 0, y: 0, w, h: HEAD_H });
    assets.drawContained(ctx, COMPETITION_ART.icon, { x: 16, y: 20, w: 120, h: 120 });
    text(ctx, 'Competitions', 150, 24, { size: 40, bold: true, maxWidth: w - 150 - 500 });
    const k = campaign.competitions;
    const pos = campaign.rankings.positionOf('player', campaign.rankingIds());
    const line = message?.text ?? `Won ${k.totalWins} of ${k.totalEntries}${pos ? ` · ranked ${ordinal(pos)}` : ''} · ${campaign.trophies.count} troph${campaign.trophies.count === 1 ? 'y' : 'ies'}`;
    text(ctx, line, 150, 84, { size: 25, bold: !!message, color: message?.color ?? '#9AA8B5', maxWidth: w - 150 - 500 });
    const btn = (i, icon, label) => {
      const r = headButton(i);
      drawButton(ctx, r, '', { accent: '#FFD166' });
      assets.drawContained(ctx, icon, { x: r.x + 8, y: r.y + 12, w: 76, h: 76 });
      text(ctx, label, r.x + 90, r.y + r.h / 2 - 3, { size: 28, bold: true, baseline: 'middle', maxWidth: r.w - 96 });
    };
    btn(0, COMPETITION_ART.trophiesIcon, 'Trophies');
    btn(1, COMPETITION_ART.rankingsIcon, 'Rankings');
  }

  function drawCard(ctx, ev, i) {
    const r = cardRect(i);
    const open = campaign.competitionOpen(ev.id);
    const st = status(ev);
    const hideAll = ev.secret && !open;
    panel(ctx, r, { stroke: open ? '#4FC3F7' : '#35414F', lineWidth: open ? 4 : 3 });
    const art = { x: r.x + 16, y: r.y + 16, w: 300, h: 250 };
    drawBackdrop(ctx, assets, ev, art);
    if (!open) {
      ctx.fillStyle = hideAll ? 'rgba(10,12,16,0.8)' : 'rgba(16,20,24,0.55)';
      ctx.fillRect(art.x, art.y, art.w, art.h);
      if (hideAll) text(ctx, '?', art.x + art.w / 2, art.y + art.h / 2, { size: 110, bold: true, align: 'center', baseline: 'middle', color: '#6E7B88' });
    }
    const x = r.x + 336;
    const mw = r.w - 356;
    text(ctx, `${ev.id} · ${ev.name}`, x, r.y + 20, { size: 32, bold: true, maxWidth: mw });
    text(ctx, hideAll ? 'An invitation only a few workshops ever receive.' : ev.blurb, x, r.y + 64, { size: 22, color: '#C9D3DD', maxWidth: mw });
    const weights = campaign.competitionWeights(ev.id);
    const hidden = !campaign.weightsKnown(ev.id);
    text(ctx, weightsLine(weights, { hidden }), x, r.y + 100, { size: 24, bold: true, color: '#4FC3F7', maxWidth: mw });
    const boosted = ev.rotate && !hidden ? `This month boosted: ${Object.entries(weights).filter(([, v]) => v > ev.rotate.base).map(([k]) => k).join(' & ')}` : ev.rotate ? 'Weights change every month' : null;
    if (boosted) text(ctx, boosted, x, r.y + 134, { size: 22, color: '#80DEEA', maxWidth: mw });
    const y0 = r.y + (boosted ? 168 : 140);
    text(ctx, `Rivals ≈ ${ev.target} · Entry ${campaign.entryFee(ev.id) ? fmt(campaign.entryFee(ev.id)) : 'free'}`, x, y0, { size: 25, maxWidth: mw });
    const extras = [ev.rewards.rep ? `${ev.rewards.rep} Rep` : null, ev.rewards.prestigeTokens ? `${ev.rewards.prestigeTokens} Prestige Token${ev.rewards.prestigeTokens > 1 ? 's' : ''}` : null, ev.rewards.trophy ? TROPHIES_BY_ID[ev.rewards.trophy].name : null].filter(Boolean);
    text(ctx, `1st: ${fmt(ev.rewards.credits)}${extras.length ? ' + ' + extras.join(' · ') : ''}`, x, y0 + 38, { size: 24, color: '#FFD166', maxWidth: mw });

    // The field: rival logos.
    const fy = r.y + 284;
    text(ctx, 'Field:', r.x + 24, fy + 22, { size: 24, color: '#9AA8B5', baseline: 'middle' });
    ev.field.forEach(([id], j) => drawMarker(ctx, assets, r.x + 140 + j * 74, fy + 22, 60, { rivalId: id, shown }));

    // Records (§21.7).
    const rec = campaign.competitions.records[ev.id];
    const y2 = r.y + 362;
    if (rec?.entries) {
      const b = rec.best;
      text(ctx, `Won ${rec.wins} of ${rec.entries} · podiums ${rec.podiums}${rec.bestSegment ? ` · best segment ${rec.bestSegment.score.toFixed(1)}` : ''}`, r.x + 24, y2, { size: 25, bold: true, maxWidth: r.w - 48 });
      if (b) text(ctx, `Best ${b.score.toFixed(1)} (${placeText(b.place)}) · ${b.entrant} · ${b.pilot} · ${NAME(STRATEGIES, b.strategy)}, ${NAME(TUNINGS, b.tuning)}`, r.x + 24, y2 + 36, { size: 21, color: '#9AA8B5', maxWidth: r.w - 48 });
    } else {
      text(ctx, open ? 'Not entered yet.' : st.reason, r.x + 24, y2, { size: 25, bold: !open, color: open ? '#9AA8B5' : '#FFB74D', maxWidth: r.w - 48 });
    }
    const last = lastOf(ev.id);
    if (last) {
      const lr = lastRect(i);
      drawButton(ctx, lr, '', { font: 'bold 28px system-ui, sans-serif' });
      text(ctx, 'Last:', lr.x + 20, lr.y + lr.h / 2 - 3, { size: 26, bold: true, baseline: 'middle' });
      text(ctx, placeText(last.place, last.player.dnf), lr.x + lr.w - 20, lr.y + lr.h / 2 - 3, { size: 30, bold: true, baseline: 'middle', align: 'right', color: placeColor(last.place, last.player.dnf) });
    }
    drawButton(ctx, enterRect(i), st.label, { active: st.ok, disabled: !st.ok, locked: !open && !st.stake, accent: st.stake ? '#B388FF' : '#7CFFB2', font: 'bold 32px system-ui, sans-serif', badge: st.ok ? '!' : null });
  }

  return screen;
}
