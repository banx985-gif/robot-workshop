// Competition result (bible §21.4, §21.7): the final placings, prizes, what the pilot got out of it, the three
// segments, the event's records and Local Cup progress. Reached from the watch view (or Skip) and from the list.
import { ScrollPanel } from '../../../../core/ui/ScrollPanel.js';
import { drawButton } from '../../../../core/ui/Button.js';
import { COMPETITIONS_BY_ID, TROPHIES, COMPETITION_ART } from '../../data/competitions.js';
import { TUNINGS, STRATEGIES } from '../../data/tuning.js';
import { TRAITS } from '../../data/traits.js';
import { robotArtOf } from '../systems/robotVisual.js';
import { panel, text, hit, fmt } from '../ui/widgets.js';
import { drawMarker, rivalOf, placeText, placeColor, row, PLAYER_COLOR } from '../ui/competitionDraw.js';

const FOOTER_H = 150;
const NAME = (list, id) => list.find((x) => x.id === id)?.name ?? id;

export function createCompetitionResultScreen({ renderer, layout, assets, campaign, router, vfx }) {
  const W = renderer.width;
  let result = null;
  let ev = null;
  let resumeOnExit = false;
  const scroll = new ScrollPanel({ getRect: bodyRect, contentHeight: 0 });

  function bodyRect() {
    const sr = layout.safeRect;
    return { x: sr.x + 24, y: sr.y + 24, w: sr.w - 48, h: sr.h - 24 - FOOTER_H };
  }
  const footerY = () => layout.safeRect.y + layout.safeRect.h - FOOTER_H + 24;
  const replayRect = () => ({ x: layout.safeRect.x + 24, y: footerY(), w: 300, h: 110 });
  const doneRect = () => ({ x: layout.safeRect.x + 24 + 316, y: footerY(), w: layout.safeRect.w - 48 - 316, h: 110 });
  const cw = () => bodyRect().w;

  function leave(to, params) {
    if (resumeOnExit) campaign.clock.resume();
    resumeOnExit = false;
    router.go(to, params);
  }

  const screen = {
    scroll,
    doneRect,
    get result() {
      return result;
    },
    enter(params = {}) {
      result = campaign.competitions.result(params.resultId) ?? campaign.competitions.latest;
      ev = COMPETITIONS_BY_ID[result.eventId];
      resumeOnExit = !!params.resumeOnExit;
      scroll.scrollY = 0;
      const sr = layout.safeRect;
      if (params.resumeOnExit !== undefined && result.won) vfx.confetti('screen', sr.x + sr.w / 2, sr.y + 200, { count: 36 });
    },
    onTap(p) {
      if (hit(p, doneRect())) return leave('competitions');
      if (hit(p, replayRect())) return router.go('compWatch', { resultId: result.id, resumeOnExit: resumeOnExit || !campaign.clock.paused });
    },
    onDragStart: (p) => scroll.beginDrag(p),
    onDrag: (p) => scroll.drag(p),
    onDragEnd: (p) => scroll.endDrag(p),

    render(ctx) {
      ctx.fillStyle = '#101418';
      ctx.fillRect(0, 0, W, renderer.height);
      if (!result) return;
      scroll.begin(ctx);
      let y = 0;
      y = drawHeader(ctx, y);
      y = drawStandings(ctx, y + 20);
      y = drawRewards(ctx, y + 20);
      y = drawSegments(ctx, y + 20);
      y = drawRecords(ctx, y + 20);
      scroll.contentHeight = y + 30;
      scroll.end(ctx);
      drawButton(ctx, replayRect(), 'Watch again', { font: 'bold 32px system-ui, sans-serif' });
      drawButton(ctx, doneRect(), 'Done', { active: true, accent: '#7CFFB2', font: 'bold 38px system-ui, sans-serif' });
    },
  };

  function drawHeader(ctx, y) {
    const w = cw();
    const h = 250;
    const dnf = result.player.dnf;
    panel(ctx, { x: 0, y, w, h }, { stroke: placeColor(result.place, dnf), lineWidth: 5 });
    if (result.won) assets.drawContained(ctx, COMPETITION_ART.winBurst, { x: w - 250, y: y + 10, w: 230, h: 230 });
    text(ctx, dnf ? 'DNF' : placeText(result.place), w - 135, y + 125, { size: 96, bold: true, align: 'center', baseline: 'middle', color: placeColor(result.place, dnf) });
    text(ctx, result.eventName, 24, y + 20, { size: 40, bold: true, maxWidth: w - 300 });
    const head = dnf ? 'A breakdown ended the run.' : result.won ? 'You won!' : result.place <= 3 ? 'A podium finish!' : `Finished ${placeText(result.place)} of ${result.standings.length}.`;
    text(ctx, head, 24, y + 76, { size: 32, bold: true, color: placeColor(result.place, dnf), maxWidth: w - 300 });
    text(ctx, `${result.setup.entrantName} · pilot ${result.setup.pilotName}`, 24, y + 128, { size: 26, maxWidth: w - 300 });
    text(ctx, `${NAME(STRATEGIES, result.setup.strategyId)} · ${NAME(TUNINGS, result.setup.tuningId)} · score ${result.player.final.toFixed(1)}`, 24, y + 166, { size: 26, color: '#9AA8B5', maxWidth: w - 300 });
    text(ctx, `Paid: entry ${result.costs?.entry ? fmt(result.costs.entry) : 'free'}${result.costs?.tuning ? `, tuning ${fmt(result.costs.tuning)}` : ''}${result.signatures?.length ? ` · ${result.signatures.map((s) => TRAITS[s]?.name ?? s).join(', ')}` : ''}`, 24, y + 204, { size: 22, color: '#7F8C99', maxWidth: w - 300 });
    return y + h;
  }

  function drawStandings(ctx, y) {
    const w = cw();
    const rows = result.standings;
    const h = 70 + rows.length * 84;
    panel(ctx, { x: 0, y, w, h });
    text(ctx, 'Final placings', 24, y + 18, { size: 32, bold: true });
    text(ctx, 'score', w - 24, y + 24, { size: 24, color: '#9AA8B5', align: 'right' });
    const art = robotArtOf(campaign.history.get(result.robotNumber)?.result);
    rows.forEach((s, i) => {
      const ry = y + 70 + i * 84;
      const me = s.id === 'player';
      if (me) {
        ctx.fillStyle = 'rgba(124,255,178,0.1)';
        ctx.fillRect(8, ry, w - 16, 80);
      }
      text(ctx, s.dnf ? '–' : placeText(s.place), 70, ry + 40, { size: 32, bold: true, align: 'center', baseline: 'middle', color: placeColor(s.place, s.dnf) });
      drawMarker(ctx, assets, 170, ry + 40, 66, { player: me, rivalId: s.id, robotArt: art });
      text(ctx, me ? `${result.setup.entrantName} (you)` : rivalOf(s.id).name, 220, ry + 40, { size: 28, bold: me, baseline: 'middle', color: me ? PLAYER_COLOR : '#E8EEF2', maxWidth: w - 420 });
      text(ctx, s.dnf ? 'DNF' : s.final.toFixed(1), w - 24, ry + 40, { size: 30, bold: true, align: 'right', baseline: 'middle', color: me ? PLAYER_COLOR : '#E8EEF2' });
    });
    return y + h;
  }

  function drawRewards(ctx, y) {
    const w = cw();
    const r = result.rewards;
    const lines = [
      ['Prize money', r.credits ? `+${fmt(r.credits)}` : '—', r.credits ? '#7CFFB2' : '#7F8C99'],
      ['Reputation', `+${r.rep}`, '#FFD166'],
      ['Research Points', `+${r.rp}`, '#4FC3F7'],
      [`${result.setup.pilotName}: XP`, `+${r.xp}`, '#FFD166'],
      [`${result.setup.pilotName}: Morale`, r.morale ? `${r.morale > 0 ? '+' : ''}${r.morale}` : '—', r.morale > 0 ? '#7CFFB2' : r.morale < 0 ? '#FF8A80' : '#7F8C99'],
    ];
    const h = 76 + lines.length * 46;
    panel(ctx, { x: 0, y, w, h });
    text(ctx, 'Rewards', 24, y + 18, { size: 32, bold: true });
    lines.forEach(([l, v, c], i) => row(ctx, l, v, 24, y + 70 + i * 46, w - 48, { color: c }));
    return y + h;
  }

  function drawSegments(ctx, y) {
    const w = cw();
    const h = 76 + result.segments.length * 80 + 50;
    panel(ctx, { x: 0, y, w, h });
    text(ctx, 'The three segments', 24, y + 18, { size: 32, bold: true });
    result.segments.forEach((s, i) => {
      const ry = y + 70 + i * 80;
      text(ctx, `${i + 1}. ${s.name}`, 24, ry, { size: 28, bold: true, maxWidth: w - 220 });
      text(ctx, s.dnf ? '—' : s.score.toFixed(1), w - 24, ry, { size: 30, bold: true, align: 'right' });
      const notes = [];
      if (s.dnf) notes.push('did not run (out of the event)');
      if (s.boost) notes.push('boost');
      if (s.carryPct) notes.push(`still shaken −${s.carryPct}%`);
      if (s.stressPct) notes.push(`pressure −${s.stressPct}%`);
      if (s.breakdown) notes.push(`${s.breakdown.severity} breakdown${s.breakdown.severity === 'catastrophic' ? ' (DNF)' : ` −${s.breakdown.lossPct}%`}`);
      text(ctx, notes.join(' · ') || 'clean run', 24, ry + 38, { size: 23, color: s.breakdown ? '#FF8A80' : '#9AA8B5', maxWidth: w - 48 });
    });
    const n = result.numbers;
    text(ctx, `Robot ${n.weighted} + pilot ${n.pilot}${n.prep ? ` + prep ${n.prep}` : ''} → base ${n.base} · breakdown chance ${n.breakdownPct}% a segment (REL ${n.effectiveRel})`, 24, y + h - 44, { size: 21, color: '#7F8C99', maxWidth: w - 48 });
    return y + h;
  }

  function drawRecords(ctx, y) {
    const w = cw();
    const rec = campaign.competitions.records[result.eventId];
    const b = rec?.best;
    const cupId = ev.rewards.trophy;
    const cup = cupId ? TROPHIES[cupId] : null;
    const lines = [
      ['Entries / wins / podiums', `${rec.entries} / ${rec.wins} / ${rec.podiums}`],
      ['Best score', b ? `${b.score.toFixed(1)} (${placeText(b.place)})` : '—'],
      ['Best robot', b?.entrant ?? '—'],
      ['Best pilot', b?.pilot ?? '—'],
      ['Best strategy', b ? `${NAME(STRATEGIES, b.strategy)} · ${NAME(TUNINGS, b.tuning)}` : '—'],
      ['Breakdowns in best run', b ? String(b.breakdowns) : '—'],
      ['Strongest segment', rec.bestSegment ? `${rec.bestSegment.score.toFixed(1)} (${rec.bestSegment.name})` : '—'],
    ];
    const cupH = cup ? 170 : 0;
    const h = 76 + lines.length * 46 + cupH;
    panel(ctx, { x: 0, y, w, h });
    text(ctx, `${ev.name} records`, 24, y + 18, { size: 32, bold: true, maxWidth: w - 48 });
    lines.forEach(([l, v], i) => row(ctx, l, v, 24, y + 70 + i * 46, w - 48));
    if (cup) {
      const cy = y + 76 + lines.length * 46;
      if (cup.art) assets.drawContained(ctx, cup.art, { x: 24, y: cy, w: 120, h: 150 });
      const x = cup.art ? 170 : 24;
      text(ctx, `${cup.name} progress`, x, cy + 12, { size: 30, bold: true, color: '#FFD166' });
      const parts = cup.needs.map((id) => {
        const e = COMPETITIONS_BY_ID[id];
        const won = (campaign.competitions.records[id]?.wins ?? 0) > 0;
        return `${id} ${won ? '✓ won' : e ? 'not yet' : '(later)'}`;
      });
      text(ctx, `${cup.note}: ${parts.join(' · ')}`, x, cy + 58, { size: 24, maxWidth: w - x - 24 });
      text(ctx, 'The trophy cabinet opens in a later update.', x, cy + 98, { size: 22, color: '#7F8C99', maxWidth: w - x - 24 });
    }
    return y + h;
  }

  return screen;
}
