// Competitions (bible §21): every event built so far (C01, C02, C07 in Milestone 12). Open events can be entered
// once a game month; locked ones say what opens them. Each card shows its weights, target, prize and records (§21.7).
import { ScrollPanel } from '../../../../core/ui/ScrollPanel.js';
import { drawButton } from '../../../../core/ui/Button.js';
import { COMPETITIONS, COMPETITION_RULES, TROPHIES, COMPETITION_ART } from '../../data/competitions.js';
import { TUNINGS, STRATEGIES } from '../../data/tuning.js';
import { describeUnlock } from '../systems/unlockRules.js';
import { createTopBar } from '../ui/TopBar.js';
import { panel, text, hit, fmt } from '../ui/widgets.js';
import { drawBackdrop, weightsLine, placeText, placeColor } from '../ui/competitionDraw.js';

const CARD_H = 470;
const GAP = 20;
const HEAD_H = 150;
const NAME = (list, id) => list.find((x) => x.id === id)?.name ?? id;

export function createCompetitionListScreen({ renderer, layout, assets, campaign, router, goProject, hud }) {
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

  function bodyRect() {
    const sr = layout.safeRect;
    const t = topBar.rect();
    const y = t.y + t.h + 20;
    return { x: sr.x + 24, y, w: sr.w - 48, h: sr.y + sr.h - 24 - y };
  }
  const cw = () => bodyRect().w - 12;
  const cardRect = (i) => ({ x: 0, y: HEAD_H + GAP + i * (CARD_H + GAP), w: cw(), h: CARD_H });
  const enterRect = (i) => {
    const c = cardRect(i);
    return { x: c.x + c.w - 24 - 260, y: c.y + c.h - 24 - 90, w: 260, h: 90 };
  };
  const lastRect = (i) => {
    const r = enterRect(i);
    return { x: r.x - 16 - 260, y: r.y, w: 260, h: r.h };
  };
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
      const met = campaign.unlockMet(ev.unlock);
      return { ok: false, label: met ? 'Invite soon' : 'Locked', reason: met ? 'The invitation is on its way' : `Needs ${describeUnlock(ev.unlock)}` };
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
    enter() {
      message = null;
    },
    onTap(p) {
      if (topBar.handleTap(p)) return;
      if (!scroll.contains(p)) return;
      const c = scroll.toContent(p);
      COMPETITIONS.forEach((ev, i) => {
        if (hit(c, enterRect(i))) {
          const st = status(ev);
          if (st.ok) router.go('compSetup', { eventId: ev.id });
          else message = { text: st.reason, color: '#FFD166' };
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
      scroll.contentHeight = HEAD_H + GAP + COMPETITIONS.length * (CARD_H + GAP);
      scroll.begin(ctx);
      drawHeader(ctx);
      COMPETITIONS.forEach((ev, i) => drawCard(ctx, ev, i));
      scroll.end(ctx);
    },
  };

  function drawHeader(ctx) {
    const w = cw();
    panel(ctx, { x: 0, y: 0, w, h: HEAD_H });
    assets.drawContained(ctx, COMPETITION_ART.icon, { x: 16, y: 16, w: 118, h: 118 });
    text(ctx, 'Competitions', 150, 22, { size: 42, bold: true });
    const k = campaign.competitions;
    const line = message?.text ?? `Entered ${k.totalEntries} · Won ${k.totalWins} · each event runs once a month`;
    text(ctx, line, 150, 82, { size: 26, bold: !!message, color: message?.color ?? '#9AA8B5', maxWidth: w - 170 - 150 });
    // Local Cup progress (§21.6: win C01–C03 at least once; C03 comes in Milestone 13).
    const cup = TROPHIES.localCup;
    const won = cup.needs.filter((id) => (k.records[id]?.wins ?? 0) > 0).length;
    assets.drawContained(ctx, cup.art, { x: w - 150, y: 10, w: 80, h: 90 });
    text(ctx, `${cup.name} ${won}/${cup.needs.length}`, w - 110, 104, { size: 22, bold: true, color: '#FFD166', align: 'center' });
  }

  function drawCard(ctx, ev, i) {
    const r = cardRect(i);
    const open = campaign.competitionOpen(ev.id);
    const st = status(ev);
    panel(ctx, r, { stroke: open ? '#4FC3F7' : '#35414F', lineWidth: open ? 4 : 3 });
    const art = { x: r.x + 16, y: r.y + 16, w: 300, h: 250 };
    drawBackdrop(ctx, assets, ev, art);
    if (!open) {
      ctx.fillStyle = 'rgba(16,20,24,0.55)';
      ctx.fillRect(art.x, art.y, art.w, art.h);
    }
    const x = r.x + 336;
    const mw = r.w - 356;
    text(ctx, `${ev.id} · ${ev.name}`, x, r.y + 20, { size: 34, bold: true, maxWidth: mw });
    text(ctx, ev.blurb, x, r.y + 66, { size: 23, color: '#C9D3DD', maxWidth: mw });
    text(ctx, weightsLine(ev), x, r.y + 104, { size: 25, bold: true, color: '#4FC3F7', maxWidth: mw });
    text(ctx, `Rivals ≈ ${ev.target} · Entry ${ev.entry ? fmt(ev.entry) : 'free'}`, x, r.y + 144, { size: 26, maxWidth: mw });
    text(ctx, `1st: ${fmt(ev.rewards.credits)} + ${ev.rewards.rep} Rep${ev.rewards.trophy ? ` · ${TROPHIES[ev.rewards.trophy].name}` : ''}`, x, r.y + 182, { size: 26, color: '#FFD166', maxWidth: mw });

    // Records (§21.7).
    const rec = campaign.competitions.records[ev.id];
    const y2 = r.y + 286;
    if (rec?.entries) {
      const b = rec.best;
      text(ctx, `Won ${rec.wins} of ${rec.entries} · podiums ${rec.podiums}${rec.bestSegment ? ` · best segment ${rec.bestSegment.score.toFixed(1)}` : ''}`, r.x + 24, y2, { size: 26, bold: true, maxWidth: r.w - 48 });
      if (b) text(ctx, `Best ${b.score.toFixed(1)} (${placeText(b.place)}) · ${b.entrant} · ${b.pilot} · ${NAME(STRATEGIES, b.strategy)}, ${NAME(TUNINGS, b.tuning)} · ${b.breakdowns} breakdown${b.breakdowns === 1 ? '' : 's'}`, r.x + 24, y2 + 38, { size: 22, color: '#9AA8B5', maxWidth: r.w - 48 });
    } else {
      text(ctx, open ? 'Not entered yet.' : st.reason, r.x + 24, y2, { size: 27, bold: !open, color: open ? '#9AA8B5' : '#FFB74D', maxWidth: r.w - 48 });
    }
    const last = lastOf(ev.id);
    if (last) {
      drawButton(ctx, lastRect(i), '', { font: 'bold 28px system-ui, sans-serif' });
      const lr = lastRect(i);
      text(ctx, 'Last:', lr.x + 20, lr.y + lr.h / 2 - 3, { size: 26, bold: true, baseline: 'middle' });
      text(ctx, placeText(last.place, last.player.dnf), lr.x + lr.w - 20, lr.y + lr.h / 2 - 3, { size: 30, bold: true, baseline: 'middle', align: 'right', color: placeColor(last.place, last.player.dnf) });
    }
    drawButton(ctx, enterRect(i), st.label, { active: st.ok, accent: '#7CFFB2', disabled: !st.ok, locked: !open, font: 'bold 32px system-ui, sans-serif', badge: st.ok ? '!' : null });
  }

  return screen;
}
