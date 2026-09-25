// Competition setup (bible §21.1–21.2, §26): pick the robot, the pilot, a tuning package and a strategy, see a plain
// "your chances" hint (average dice, never the seeded result), then Enter. Balanced is recommended, not forced.
import { ScrollPanel } from '../../../../core/ui/ScrollPanel.js';
import { drawButton } from '../../../../core/ui/Button.js';
import { COMPETITIONS_BY_ID } from '../../data/competitions.js';
import { TUNINGS, STRATEGIES, DEFAULT_TUNING, DEFAULT_STRATEGY } from '../../data/tuning.js';
import { ROLES } from '../../data/staff.js';
import { TRAITS } from '../../data/traits.js';
import { describeUnlock } from '../systems/unlockRules.js';
import { chanceWords } from '../systems/CompetitionRules.js';
import { robotArtOf } from '../systems/robotVisual.js';
import { panel, text, hit, fmt } from '../ui/widgets.js';
import { drawBackdrop, weightsLine, eventRating } from '../ui/competitionDraw.js';

const FOOTER_H = 330;
const ROW_H = 140;
const PILOT_TRAITS = new Set(['calmUnderPressure', 'tuner', 'riskTaker', 'perfectLine', 'beyondRedline']);

export function createCompetitionSetupScreen({ renderer, layout, assets, bus, campaign, router }) {
  const W = renderer.width;
  let ev = null;
  let choice = null;
  let picker = null; // 'robot' | 'pilot' | null
  let message = null;
  const scroll = new ScrollPanel({ getRect: bodyRect, contentHeight: 0 });

  function bodyRect() {
    const sr = layout.safeRect;
    return { x: sr.x + 24, y: sr.y + 24, w: sr.w - 48, h: sr.h - 24 - FOOTER_H };
  }
  function footerRect() {
    const sr = layout.safeRect;
    return { x: sr.x + 24, y: sr.y + sr.h - FOOTER_H + 12, w: sr.w - 48, h: FOOTER_H - 24 };
  }
  const backRect = () => {
    const f = footerRect();
    return { x: f.x, y: f.y + f.h - 104, w: 240, h: 104 };
  };
  const enterRect = () => {
    const f = footerRect();
    return { x: f.x + 256, y: f.y + f.h - 104, w: f.w - 256, h: 104 };
  };
  const cw = () => bodyRect().w;

  const robots = () => campaign.competitionRobots;
  const pilots = () => campaign.competitionPilots;

  // Content layout, worked out fresh each frame (pickers open and close).
  function sections() {
    const w = cw();
    const out = {};
    let y = 0;
    out.header = { x: 0, y, w, h: 250 };
    y += 250 + 30;
    for (const kind of ['robot', 'pilot']) {
      out[`${kind}Label`] = y;
      y += 50;
      out[kind] = { x: 0, y, w, h: ROW_H };
      out[`${kind}Change`] = { x: w - 24 - 200, y: y + (ROW_H - 84) / 2, w: 200, h: 84 };
      y += ROW_H + 12;
      out[`${kind}List`] = [];
      if (picker === kind) {
        const items = kind === 'robot' ? robots() : pilots();
        for (const it of items) {
          out[`${kind}List`].push({ item: it, r: { x: 30, y, w: w - 30, h: ROW_H } });
          y += ROW_H + 10;
        }
      }
      y += 24;
    }
    out.tuningLabel = y;
    y += 50;
    const tw = (w - 16) / 2;
    out.tunings = TUNINGS.map((t, i) => ({ t, r: { x: (i % 2) * (tw + 16), y: y + Math.floor(i / 2) * 146, w: tw, h: 132 } }));
    y += Math.ceil(TUNINGS.length / 2) * 146 + 24;
    out.strategyLabel = y;
    y += 50;
    const sw = (w - 32) / 3;
    out.strategies = STRATEGIES.map((s, i) => ({ s, r: { x: i * (sw + 16), y, w: sw, h: 190 } }));
    y += 190 + 40;
    out.height = y;
    return out;
  }

  function inScroll(r) {
    const b = bodyRect();
    const y = b.y + r.y - scroll.scrollY;
    if (y < b.y - 1 || y + r.h > b.y + b.h + 1) return null;
    return { x: b.x + r.x, y, w: r.w, h: r.h };
  }

  function defaults(eventId) {
    const e = COMPETITIONS_BY_ID[eventId];
    const rs = robots();
    const best = rs.reduce((b, r) => (!b || eventRating(e, r.result.stats) > eventRating(e, b.result.stats) ? r : b), null);
    return { eventId, robotNumber: best?.number ?? null, pilotId: pilots()[0]?.id ?? null, tuningId: DEFAULT_TUNING, strategyId: DEFAULT_STRATEGY };
  }

  function tryEnter() {
    const res = campaign.enterCompetition(choice);
    if (!res.ok) {
      message = { text: res.reason, color: '#FF8A80' };
      return;
    }
    campaign.save().catch(() => {});
    router.go('compWatch', { resultId: res.result.id });
  }

  const screen = {
    scroll,
    enterRect,
    strategyRect(i) {
      const s = sections().strategies[i];
      return s ? inScroll(s.r) : null;
    },
    get choice() {
      return choice;
    },
    set(part) {
      choice = { ...choice, ...part };
    },
    enter(params = {}) {
      ev = COMPETITIONS_BY_ID[params.eventId] ?? ev;
      choice = defaults(ev.id);
      picker = null;
      message = null;
      scroll.scrollY = 0;
      bus.emit('competition:setup', { eventId: ev.id });
    },
    onTap(p) {
      if (hit(p, backRect())) return router.go('competitions');
      if (hit(p, enterRect())) return tryEnter();
      if (!scroll.contains(p)) return;
      const c = scroll.toContent(p);
      const s = sections();
      message = null;
      for (const kind of ['robot', 'pilot']) {
        if (hit(c, s[`${kind}Change`]) || hit(c, s[kind])) {
          picker = picker === kind ? null : kind;
          return;
        }
        for (const { item, r } of s[`${kind}List`]) {
          if (!hit(c, r)) continue;
          if (kind === 'robot') choice.robotNumber = item.number;
          else choice.pilotId = item.id;
          picker = null;
          return;
        }
      }
      for (const { t, r } of s.tunings) {
        if (!hit(c, r)) continue;
        if (!campaign.tuningOpen(t.id)) message = { text: `${t.name} needs ${describeUnlock(t.requires)}`, color: '#FFD166' };
        else choice.tuningId = t.id;
        return;
      }
      for (const { s: st, r } of s.strategies) if (hit(c, r)) choice.strategyId = st.id;
    },
    onDragStart: (p) => scroll.beginDrag(p),
    onDrag: (p) => scroll.drag(p),
    onDragEnd: (p) => scroll.endDrag(p),

    render(ctx) {
      ctx.fillStyle = '#101418';
      ctx.fillRect(0, 0, W, renderer.height);
      const s = sections();
      scroll.contentHeight = s.height;
      scroll.begin(ctx);
      drawHeader(ctx, s.header);
      drawPickSection(ctx, s, 'robot', 'Robot');
      drawPickSection(ctx, s, 'pilot', 'Pilot');
      text(ctx, 'Tuning package', 4, s.tuningLabel, { size: 32, bold: true });
      text(ctx, 'one event only', cw() - 4, s.tuningLabel + 6, { size: 24, color: '#9AA8B5', align: 'right' });
      for (const { t, r } of s.tunings) drawTuning(ctx, t, r);
      text(ctx, 'Strategy', 4, s.strategyLabel, { size: 32, bold: true });
      for (const { s: st, r } of s.strategies) drawStrategy(ctx, st, r);
      scroll.end(ctx);
      drawFooter(ctx);
    },
  };

  function drawHeader(ctx, r) {
    panel(ctx, r);
    drawBackdrop(ctx, assets, ev, { x: r.x + 14, y: r.y + 14, w: 280, h: r.h - 28 });
    const x = r.x + 314;
    const mw = r.w - 334;
    text(ctx, ev.name, x, r.y + 20, { size: 38, bold: true, maxWidth: mw });
    text(ctx, weightsLine(ev), x, r.y + 72, { size: 26, bold: true, color: '#4FC3F7', maxWidth: mw });
    text(ctx, `Rival field ≈ ${ev.target} · Entry ${ev.entry ? fmt(ev.entry) : 'free'}`, x, r.y + 114, { size: 26, maxWidth: mw });
    text(ctx, `1st place: ${fmt(ev.rewards.credits)} + ${ev.rewards.rep} Rep`, x, r.y + 152, { size: 26, color: '#FFD166', maxWidth: mw });
    text(ctx, `3 segments: ${ev.segments.join(' → ')}`, x, r.y + 192, { size: 22, color: '#9AA8B5', maxWidth: mw });
  }

  function drawPickSection(ctx, s, kind, label) {
    text(ctx, label, 4, s[`${kind}Label`], { size: 32, bold: true });
    const sel = kind === 'robot' ? campaign.history.get(choice.robotNumber) : campaign.staff.get(choice.pilotId);
    const r = s[kind];
    if (sel) (kind === 'robot' ? drawRobotRow : drawPilotRow)(ctx, sel, r, true, s[`${kind}Change`].w + 24);
    else {
      panel(ctx, r);
      text(ctx, kind === 'robot' ? 'No robot can race yet — finish one first.' : 'Nobody free to pilot.', 24, r.y + r.h / 2, { size: 28, color: '#FF8A80', baseline: 'middle' });
    }
    drawButton(ctx, s[`${kind}Change`], picker === kind ? 'Close' : 'Change', { font: 'bold 30px system-ui, sans-serif', selected: picker === kind });
    for (const { item, r: rr } of s[`${kind}List`]) (kind === 'robot' ? drawRobotRow : drawPilotRow)(ctx, item, rr, kind === 'robot' ? item.number === choice.robotNumber : item.id === choice.pilotId, 0);
  }

  function drawRobotRow(ctx, rec, r, on, rightPad) {
    panel(ctx, r, { fill: on ? 'rgba(40,64,56,0.96)' : 'rgba(26,32,40,0.96)', stroke: on ? '#7CFFB2' : '#35414F', lineWidth: on ? 5 : 3 });
    assets.drawContained(ctx, robotArtOf(rec.result), { x: r.x + 12, y: r.y + 10, w: 110, h: r.h - 20 });
    const x = r.x + 140;
    const mw = r.w - 160 - rightPad;
    const st = rec.result.stats;
    text(ctx, `#${rec.number} ${rec.name}`, x, r.y + 16, { size: 32, bold: true, maxWidth: mw });
    text(ctx, `Event rating ${eventRating(ev, st)} · REL ${st.REL}${rec.result.faults ? ` · ${rec.result.faults} open fault${rec.result.faults === 1 ? '' : 's'}` : ''}`, x, r.y + 58, { size: 25, color: rec.result.faults ? '#FFB74D' : '#C9D3DD', maxWidth: mw });
    const c = rec.competitions;
    text(ctx, `${rec.result.purposeName}${rec.launchedProductId ? ' · on sale' : ''}${c ? ` · raced ${c.entries}, won ${c.wins}` : ''}`, x, r.y + 96, { size: 22, color: '#9AA8B5', maxWidth: mw });
  }

  function drawPilotRow(ctx, s, r, on, rightPad) {
    panel(ctx, r, { fill: on ? 'rgba(40,64,56,0.96)' : 'rgba(26,32,40,0.96)', stroke: on ? '#7CFFB2' : '#35414F', lineWidth: on ? 5 : 3 });
    assets.drawContained(ctx, s.art, { x: r.x + 12, y: r.y + 8, w: 100, h: r.h - 16 });
    const x = r.x + 130;
    const mw = r.w - 150 - rightPad;
    const isPilot = s.role === 'pilot';
    text(ctx, s.name, x, r.y + 16, { size: 32, bold: true, maxWidth: mw });
    text(ctx, `${ROLES[s.role].name} · Lv ${s.level} · TST ${s.stats.tst}${isPilot ? '' : ' · not a Test Pilot'}`, x, r.y + 58, { size: 25, color: isPilot ? '#C9D3DD' : '#FFB74D', maxWidth: mw });
    const traits = s.traits.filter((t) => PILOT_TRAITS.has(t)).map((t) => TRAITS[t].name);
    const notes = [...traits, s.status?.stressed ? 'Stressed (more race pressure)' : null, campaign.busyReason(s.id, 'training')].filter(Boolean);
    text(ctx, notes.join(' · ') || 'No race traits', x, r.y + 96, { size: 22, color: traits.length ? '#FFD166' : '#9AA8B5', maxWidth: mw });
  }

  function drawTuning(ctx, t, r) {
    const on = choice.tuningId === t.id;
    const open = campaign.tuningOpen(t.id);
    const tuner = campaign.staff.get(choice.pilotId)?.traits.includes('tuner');
    panel(ctx, r, { fill: on ? 'rgba(40,56,72,0.96)' : 'rgba(26,32,40,0.96)', stroke: on ? '#4FC3F7' : '#35414F', lineWidth: on ? 5 : 3, radius: 18 });
    text(ctx, t.name, r.x + 18, r.y + 16, { size: 28, bold: true, color: open ? '#E8EEF2' : '#6E7B88', maxWidth: r.w - 150 });
    text(ctx, t.cost ? fmt(t.cost) : 'free', r.x + r.w - 18, r.y + 18, { size: 26, bold: true, align: 'right', color: open ? '#FFD166' : '#6E7B88' });
    const sub = open ? `${t.blurb}${tuner && t.id !== 'none' ? ' (+10% Tuner)' : ''}` : `Needs ${describeUnlock(t.requires)}`;
    text(ctx, sub, r.x + 18, r.y + 62, { size: 22, color: open ? '#9AA8B5' : '#FFB74D', maxWidth: r.w - 36 });
  }

  function drawStrategy(ctx, st, r) {
    const on = choice.strategyId === st.id;
    panel(ctx, r, { fill: on ? 'rgba(40,64,56,0.96)' : 'rgba(26,32,40,0.96)', stroke: on ? '#7CFFB2' : '#35414F', lineWidth: on ? 5 : 3, radius: 18 });
    text(ctx, st.name, r.x + r.w / 2, r.y + 18, { size: 30, bold: true, align: 'center', maxWidth: r.w - 20 });
    if (st.recommended) text(ctx, 'Recommended', r.x + r.w / 2, r.y + 56, { size: 22, bold: true, color: '#7CFFB2', align: 'center' });
    const words = st.blurb.split(': ');
    text(ctx, words[0], r.x + r.w / 2, r.y + 96, { size: 22, color: '#C9D3DD', align: 'center', maxWidth: r.w - 20 });
    if (words[1]) text(ctx, words[1], r.x + r.w / 2, r.y + 130, { size: 20, color: '#9AA8B5', align: 'center', maxWidth: r.w - 20 });
  }

  function drawFooter(ctx) {
    const f = footerRect();
    panel(ctx, { x: f.x, y: f.y, w: f.w, h: f.h - 120 }, { fill: 'rgba(22,28,36,0.98)' });
    const pv = choice.robotNumber != null && choice.pilotId ? campaign.previewCompetition(choice) : null;
    const cost = campaign.competitionCost(choice.eventId, choice.tuningId);
    const block = campaign.competitionBlock(choice);
    if (message) text(ctx, message.text, f.x + 20, f.y + 20, { size: 28, bold: true, color: message.color, maxWidth: f.w - 40 });
    else if (pv) {
      const cw2 = chanceWords(pv);
      text(ctx, `Your chances: ${cw2.line}`, f.x + 20, f.y + 18, { size: 29, bold: true, color: cw2.color, maxWidth: f.w - 40 });
      text(ctx, cw2.riskLine, f.x + 20, f.y + 60, { size: 24, color: cw2.riskColor, maxWidth: f.w - 40 });
      const best = Math.max(...pv.rivals.map((r) => r.expected));
      text(ctx, `Expected score ≈ ${pv.expected.toFixed(0)} · best rival ≈ ${best.toFixed(0)} · cost ${cost ? fmt(cost) : 'free'}`, f.x + 20, f.y + 98, { size: 24, color: '#9AA8B5', maxWidth: f.w - 40 });
      text(ctx, block ?? 'A hint only: each run has its own luck.', f.x + 20, f.y + 134, { size: block ? 24 : 20, bold: !!block, color: block ? '#FFB74D' : '#6E7B88', maxWidth: f.w - 40 });
    } else text(ctx, 'Pick a robot and a pilot.', f.x + 20, f.y + 20, { size: 28, color: '#FFD166' });
    drawButton(ctx, backRect(), 'Back', { font: 'bold 34px system-ui, sans-serif' });
    drawButton(ctx, enterRect(), `Enter${cost ? ` · ${fmt(cost)}` : ''}`, { active: !block, disabled: !!block, accent: '#7CFFB2', font: 'bold 38px system-ui, sans-serif' });
  }

  return screen;
}
