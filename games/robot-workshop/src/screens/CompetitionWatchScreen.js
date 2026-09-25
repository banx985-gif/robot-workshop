// Watching a competition (bible §21.4): three segments played back from the stored, already-decided result
// (core/CompetitionSystem.js playback), with the player and rival markers, the live placing, callouts for
// breakdowns and boosts, and the pilot's reaction. Nothing here can change the result — Skip (offered once the
// event has been watched through once) jumps to the same result screen.
import { drawButton } from '../../../../core/ui/Button.js';
import { playback } from '../../../../core/CompetitionSystem.js';
import { COMPETITIONS_BY_ID, COMPETITION_ART } from '../../data/competitions.js';
import { robotArtOf } from '../systems/robotVisual.js';
import { panel, text, bar, hit } from '../ui/widgets.js';
import { drawBackdrop, drawMarker, rivalOf, placeText, placeColor, PLAYER_COLOR } from '../ui/competitionDraw.js';

const INTRO_SEC = 1.8; // "Ready…" before the start
const SEGMENT_SEC = 9; // real seconds per segment at 1× (3 segments + intro ≈ 29 s, bible: 25–50 s)
const CALLOUT_LIFE = 0.3; // how long a callout stays up, in segments
const LANE_H = 96;

export function createCompetitionWatchScreen({ renderer, layout, assets, campaign, router, vfx, held = () => false }) {
  const W = renderer.width;
  let result = null;
  let ev = null;
  let clock = 0; // real seconds since the start (after the intro, 1 segment = SEGMENT_SEC / speed)
  let t = 0; // playback position 0..3
  let speed = 1;
  let finished = false;
  let resumeOnExit = false;
  let callouts = [];
  let fired = new Set();
  let robotArt = null;
  let pilot = null;

  // --- layout ---
  const sr = () => layout.safeRect;
  const titleRect = () => ({ x: sr().x + 24, y: sr().y + 24, w: sr().w - 48, h: 150 });
  const buttonsY = () => sr().y + sr().h - 24 - 110;
  const pilotRect = () => ({ x: sr().x + 24, y: buttonsY() - 16 - 150, w: sr().w - 48, h: 150 });
  function lanesRect() {
    const n = (result?.rivals.length ?? 5) + 1;
    const h = 64 + n * LANE_H;
    return { x: sr().x + 24, y: pilotRect().y - 16 - h, w: sr().w - 48, h };
  }
  function sceneRect() {
    const top = titleRect().y + titleRect().h + 16;
    return { x: sr().x + 24, y: top, w: sr().w - 48, h: lanesRect().y - 16 - top };
  }
  const speedRect = () => ({ x: sr().x + 24, y: buttonsY(), w: 240, h: 110 });
  const mainRect = () => ({ x: sr().x + 24 + 256, y: buttonsY(), w: sr().w - 48 - 256, h: 110 });
  const canSkip = () => !finished && !!campaign.competitions.records[result.eventId]?.watched;

  // Callouts from the stored result: segment starts, boosts, the carried-over hit, breakdowns, the final push.
  function buildCallouts() {
    const out = [];
    const n = result.segments.length;
    result.segments.forEach((s, i) => {
      if (s.dnf) return;
      out.push({ t: i, text: `${i === n - 1 ? 'Final push' : i === 0 ? 'Start' : 'Mid-event challenge'}: ${s.name}`, color: '#E8EEF2', kind: 'segment' });
      if (s.carryPct) out.push({ t: i + 0.06, text: `Still shaken from the breakdown (−${s.carryPct}%)`, color: '#FFB74D', kind: 'carry' });
      if (s.boost) out.push({ t: i + 0.12, text: 'Boost! A great run', color: '#7CFFB2', kind: 'boost' });
      if (i === n - 1 && s.stressPct > 0) out.push({ t: i + 0.2, text: `The pressure is on (−${s.stressPct.toFixed(1)}%)`, color: '#B39DDB', kind: 'stress' });
      if (s.breakdown) {
        const words = { minor: `Minor breakdown! Quick repair (−${s.breakdown.lossPct}%)`, major: `Major breakdown! (−${s.breakdown.lossPct}%, and −8% next)`, catastrophic: 'Catastrophic breakdown — out of the event!' };
        out.push({ t: i + s.breakdown.at, text: words[s.breakdown.severity], color: '#FF8A80', kind: 'breakdown' });
      }
    });
    return out.sort((a, b) => a.t - b.t);
  }

  function currentCallout() {
    let c = null;
    for (const x of callouts) if (x.t <= t && t - x.t < CALLOUT_LIFE) c = x;
    return c;
  }

  // Where a lane's marker sits (screen x) for a score so far.
  function markerX(done) {
    const l = lanesRect();
    const x0 = l.x + 110;
    const x1 = l.x + l.w - 160;
    const max = Math.max(...result.standings.map((s) => s.total), 1);
    return x0 + (x1 - x0) * Math.min(1, done / max);
  }

  function laneY(i) {
    const l = lanesRect();
    return l.y + 64 + i * LANE_H + LANE_H / 2;
  }

  // Effects the first time playback passes a callout.
  function fireEffects(state) {
    for (const [i, c] of callouts.entries()) {
      if (fired.has(i) || c.t > t) continue;
      fired.add(i);
      const pi = state.rows.findIndex((r) => r.id === 'player');
      const px = markerX(state.rows[pi].done);
      const py = laneY(pi);
      if (c.kind === 'breakdown') vfx.sprite('screen', COMPETITION_ART.lossPuff, px, py, { size: 150, life: 1.1, from: 0.4, to: 1.1, hold: 0.3 });
      if (c.kind === 'boost') vfx.sparks('screen', px, py, { count: 10 });
    }
  }

  function finish() {
    if (finished) return;
    finished = true;
    campaign.competitions.markWatched(result.eventId);
    campaign.save().catch(() => {});
    const s = sceneRect();
    if (result.won) {
      vfx.sprite('screen', COMPETITION_ART.winBurst, s.x + s.w / 2, s.y + s.h * 0.62, { size: 520, life: 1.6, from: 0.3, to: 1.1, hold: 0.5 });
      vfx.confetti('screen', s.x + s.w / 2, s.y + s.h * 0.3, { count: 40 });
    } else vfx.sprite('screen', COMPETITION_ART.lossPuff, s.x + s.w / 2, s.y + s.h * 0.65, { size: 320, life: 1.3, from: 0.4, to: 1, hold: 0.4 });
  }

  const goResult = () => router.go('compResult', { resultId: result.id, resumeOnExit });

  function reaction(state) {
    if (clock < INTRO_SEC) return 'Ready… deep breath.';
    const me = state.rows.find((r) => r.id === 'player');
    if (finished || t >= result.segments.length) {
      if (result.player.dnf) return "Oh no… we'll fix it and come back.";
      if (result.won) return 'We did it!!';
      if (result.place <= 3) return 'A podium — not bad at all!';
      return "We'll be back stronger.";
    }
    if (me.stopped) return "That's it for us today…";
    if (me.breakdown) return 'Come on… quick fix!';
    if (me.place === 1) return 'Leading! Keep it steady.';
    if (me.place <= 3) return 'Right on their tail!';
    return 'Pushing hard…';
  }

  const screen = {
    get t() {
      return t;
    },
    get finished() {
      return finished;
    },
    get result() {
      return result;
    },
    mainRect,
    enter(params = {}) {
      result = campaign.competitions.result(params.resultId) ?? campaign.competitions.latest;
      ev = COMPETITIONS_BY_ID[result.eventId];
      clock = 0;
      t = 0;
      speed = 1;
      finished = false;
      fired = new Set();
      callouts = buildCallouts();
      robotArt = robotArtOf(campaign.history.get(result.robotNumber)?.result);
      pilot = campaign.staff.get(result.setup.pilotId);
      // The calendar waits while the event plays.
      resumeOnExit = params.resumeOnExit ?? !campaign.clock.paused;
      campaign.clock.pause();
    },
    update(dt) {
      if (!result || held()) return;
      clock += dt * speed;
      const n = result.segments.length;
      t = Math.min(n, Math.max(0, (clock - INTRO_SEC) / SEGMENT_SEC));
      if (t >= n) finish();
    },
    onTap(p) {
      if (hit(p, speedRect()) && !finished) {
        speed = speed === 1 ? 2 : speed === 2 ? 4 : 1;
        return;
      }
      if (hit(p, mainRect())) {
        if (finished) goResult();
        else if (canSkip()) goResult();
      }
    },

    render(ctx) {
      ctx.fillStyle = '#101418';
      ctx.fillRect(0, 0, W, renderer.height);
      if (!result) return;
      const n = result.segments.length;
      const state = playback(result, t);
      fireEffects(state);

      // Title + event progress.
      const tr = titleRect();
      panel(ctx, tr);
      text(ctx, ev.name, tr.x + 24, tr.y + 18, { size: 40, bold: true, maxWidth: tr.w - 240 });
      const segLabel = clock < INTRO_SEC ? 'Get ready…' : t >= n ? 'Finished!' : `Segment ${state.segment + 1} of ${n} · ${result.segments[state.segment].name}`;
      text(ctx, segLabel, tr.x + 24, tr.y + 72, { size: 28, color: '#C9D3DD', maxWidth: tr.w - 240 });
      bar(ctx, tr.x + 24, tr.y + 118, tr.w - 48, 14, t / n, '#4FC3F7');
      for (let i = 1; i < n; i++) {
        ctx.fillStyle = '#101418';
        ctx.fillRect(tr.x + 24 + ((tr.w - 48) * i) / n - 2, tr.y + 114, 4, 22);
      }
      const me = state.rows.find((r) => r.id === 'player');
      text(ctx, me.stopped ? 'DNF' : `P${me.place}`, tr.x + tr.w - 24, tr.y + 58, { size: 72, bold: true, align: 'right', baseline: 'middle', color: me.stopped ? '#FF8A80' : placeColor(me.place) });

      // Scene: the backdrop, then the callout on top.
      const s = sceneRect();
      drawBackdrop(ctx, assets, ev, s, { radius: 24 });
      const c = currentCallout();
      const intro = clock < INTRO_SEC ? (clock < INTRO_SEC * 0.5 ? 'Ready…' : 'GO!') : null;
      const words = intro ?? (t >= n ? (result.player.dnf ? 'Did not finish' : result.won ? 'WINNER!' : `Finished ${placeText(result.place)}`) : c?.text);
      if (words) {
        const big = intro || t >= n;
        ctx.font = `bold ${big ? 64 : 34}px system-ui, sans-serif`;
        const tw = Math.min(s.w - 60, ctx.measureText(words).width + 60);
        const bh = big ? 110 : 76;
        const by = big ? s.y + s.h * 0.2 : s.y + s.h - bh - 20; // the big banner sits high, clear of the end effect
        panel(ctx, { x: s.x + (s.w - tw) / 2, y: by, w: tw, h: bh }, { fill: 'rgba(16,20,24,0.86)', stroke: big ? (t >= n ? placeColor(result.place, result.player.dnf) : '#FFD166') : c.color, lineWidth: 4, radius: 22 });
        text(ctx, words, s.x + s.w / 2, by + bh / 2, { size: big ? 64 : 34, bold: true, align: 'center', baseline: 'middle', color: big ? '#FFFFFF' : c.color, maxWidth: tw - 40 });
      }

      // Lanes: live order, markers, pace so far.
      const l = lanesRect();
      panel(ctx, l);
      text(ctx, 'Live standings', l.x + 24, l.y + 18, { size: 28, bold: true });
      text(ctx, 'pace', l.x + l.w - 24, l.y + 22, { size: 24, color: '#9AA8B5', align: 'right' });
      state.rows.forEach((r, i) => {
        const y = laneY(i);
        const isMe = r.id === 'player';
        if (isMe) {
          ctx.fillStyle = 'rgba(124,255,178,0.08)';
          ctx.fillRect(l.x + 8, y - LANE_H / 2 + 4, l.w - 16, LANE_H - 8);
        }
        text(ctx, r.stopped ? '–' : String(r.place), l.x + 50, y, { size: 38, bold: true, align: 'center', baseline: 'middle', color: isMe ? PLAYER_COLOR : '#9AA8B5' });
        const x0 = markerX(0);
        const x1 = markerX(Math.max(...result.standings.map((z) => z.total)));
        ctx.strokeStyle = '#2A3440';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(x0, y);
        ctx.lineTo(x1, y);
        ctx.stroke();
        const name = isMe ? `${result.setup.entrantName} · ${result.setup.pilotName}` : rivalOf(r.id, (id) => campaign.rivalShown(id)).name;
        text(ctx, name, x0, y - LANE_H / 2 + 4, { size: 21, color: isMe ? PLAYER_COLOR : '#7F8C99', maxWidth: x1 - x0 - 60 });
        drawMarker(ctx, assets, markerX(r.done), y + 16, 56, { player: isMe, rivalId: r.id, robotArt, dim: r.stopped, shown: (id) => campaign.rivalShown(id) });
        const pace = t > 0.02 ? r.done / t : 0;
        text(ctx, pace ? pace.toFixed(1) : '—', l.x + l.w - 24, y, { size: 30, bold: true, align: 'right', baseline: 'middle', color: isMe ? PLAYER_COLOR : '#E8EEF2' });
      });

      // Pilot reaction.
      const pr = pilotRect();
      panel(ctx, pr);
      if (pilot) assets.drawContained(ctx, pilot.art, { x: pr.x + 12, y: pr.y + 8, w: 110, h: pr.h - 16 });
      text(ctx, `${result.setup.pilotName} (pilot)`, pr.x + 140, pr.y + 26, { size: 26, color: '#9AA8B5', maxWidth: pr.w - 160 });
      text(ctx, `“${reaction(state)}”`, pr.x + 140, pr.y + 70, { size: 36, bold: true, maxWidth: pr.w - 160 });

      // Buttons.
      drawButton(ctx, speedRect(), `Speed ${speed}×`, { disabled: finished, font: 'bold 32px system-ui, sans-serif' });
      if (finished) drawButton(ctx, mainRect(), 'See result', { active: true, accent: '#7CFFB2', font: 'bold 38px system-ui, sans-serif' });
      else if (canSkip()) drawButton(ctx, mainRect(), 'Skip to result', { font: 'bold 36px system-ui, sans-serif' });
      else drawButton(ctx, mainRect(), 'Watch once to unlock Skip', { disabled: true, font: 'bold 30px system-ui, sans-serif' });
    },
  };
  return screen;
}
