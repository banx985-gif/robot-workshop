// Training (bible §17, §39.2): the training slots with who is training and how far along, then every course
// with its cost, days and effect. "Train…" opens a worker picker showing each worker's expected gain, already
// clamped to their tier cap. A worker in training is off projects and research. The game pauses here.
import { THEME, font } from '../../../../core/Theme.js';
import { ScrollPanel } from '../../../../core/ui/ScrollPanel.js';
import { drawButton, drawPadlock, hitRect } from '../../../../core/ui/Button.js';
import { ROLES, TIERS } from '../../data/staff.js';
import { WORK_STATS } from '../../data/stats.js';
import { COURSES, TRAINING_SLOTS, TRAINING_ART } from '../../data/training.js';
import { describeUnlock } from '../systems/unlockRules.js';
import { panel, text, contained, bar, fmt } from '../ui/widgets.js';
const COL = THEME.color;

const HEADER_H = 150;
const SLOT_ROW = 124;
const GAP = 14;
const PICK_ROW = 128;
const LINE = 44; // one line of body text (34 px) with its spacing
const BTN_W = 240;
const SIZE = THEME.size;
const GREEN = COL.good;
const GOLD = COL.gold;
const RED = COL.bad;
const CYAN = COL.progress;
const SHORT = Object.fromEntries(WORK_STATS.map((s) => [s.key, s.short]));

// Word-wrap for layout: row heights are measured before drawing, so taps and the guide see the same rects.
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

function effectText(c) {
  const e = c.effect;
  const range = `+${e.min}–${e.max}`;
  const parts = [];
  if (e.kind === 'stat') parts.push(`${SHORT[e.stat]} ${range}`);
  if (e.kind === 'primary') parts.push(`Main stat ${range}`);
  if (e.kind === 'lowest') parts.push(`${e.count} lowest stats ${range} each`);
  if (e.kind === 'all') parts.push(`All stats ${range}`);
  if (e.morale) parts.push(`+${e.morale} Morale`);
  if (c.limit?.perWorkerPerYear) parts.push('once a year per worker');
  if (c.limit?.perWorkerPerRun) parts.push('once per worker');
  return parts.join(' · ');
}

export function createTrainingScreen({ renderer, layout, assets, bus, campaign, router }) {
  const W = renderer.width;
  const tr = campaign.training;
  let picker = null; // { courseId, staffId }
  let prefer = null; // worker picked on the roster
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
  // Slot lines: every slot of every kind, including locked ones (count 0) so the player sees them.
  function slotLines() {
    const lines = [];
    for (const sl of TRAINING_SLOTS) {
      const n = tr.slotCount(sl);
      const running = tr.active.filter((a) => a.slotId === sl.id);
      for (let i = 0; i < Math.max(n, 1, running.length); i++) lines.push({ slot: sl, open: i < n, t: running[i] ?? null });
    }
    return lines;
  }
  const slotsH = () => 80 + slotLines().length * SLOT_ROW + 10;
  const coursesTop = () => slotsH() + 124; // the Courses heading and its note sit above the first row
  // Why a course can't start right now (locked, no slot, nobody free), or null.
  function courseBlockNote(c) {
    return tr.courseBlock(c.id) ?? (campaign.staff.staff.some((s) => !tr.workerBlock(c.id, s.id)) ? null : tr.active.length >= tr.slots.reduce((t, sl) => t + tr.slotCount(sl), 0) ? 'All training slots are busy' : 'Nobody free for this right now');
  }
  // A course row: name, cost · days, then the effect and any note, wrapped beside the Train button.
  function courseLines(c) {
    const textW = cw() - 48 - BTN_W - 20;
    const locked = tr.courseBlock(c.id) === 'Locked';
    const note = locked ? `Needs ${describeUnlock(c.requires)}` : courseBlockNote(c) ?? '';
    return { effect: wrapLines(effectText(c), textW), note: note ? wrapLines(note, textW, SIZE.body, true) : [], textW, locked };
  }
  const rowHeight = (c) => {
    const l = courseLines(c);
    return Math.max(250, 116 + (l.effect.length + l.note.length) * LINE + 20);
  };
  const rowRect = (i) => {
    let y = coursesTop();
    for (let k = 0; k < i; k++) y += rowHeight(COURSES[k]) + GAP;
    return { x: 0, y, w: cw(), h: rowHeight(COURSES[i]) };
  };
  const rowButton = (i) => {
    const r = rowRect(i);
    return { x: r.x + r.w - 20 - BTN_W, y: r.y + r.h - 20 - 110, w: BTN_W, h: 110 };
  };

  function inScroll(r) {
    const b = bodyRect();
    const y = b.y + r.y - scroll.scrollY;
    if (y < b.y - 1 || y + r.h > b.y + b.h + 1) return null;
    return { x: b.x + r.x, y, w: r.w, h: r.h };
  }

  // The picker's heading lines (course details and the question), wrapped to the dialog width.
  function pickerHead() {
    const c = tr.course(picker.courseId);
    const w = sr().w - 80 - 60;
    const sub = wrapLines(`${fmt(c.cost)} cr · ${c.days} days · ${effectText(c)}`, w);
    const ask = wrapLines('Who trains? They leave projects and research until it is done.', w, SIZE.body, true);
    return { sub, ask, h: 96 + sub.length * LINE + 16 + ask.length * LINE + 20 };
  }
  function dialogRect() {
    const s = sr();
    const h = pickerHead().h + campaign.staff.staff.length * (PICK_ROW + 10) + 150;
    return { x: s.x + 40, y: Math.max(s.y + 40, s.y + s.h / 2 - h / 2), w: s.w - 80, h };
  }
  const pickRowRect = (i) => {
    const d = dialogRect();
    return { x: d.x + 30, y: d.y + pickerHead().h + i * (PICK_ROW + 10), w: d.w - 60, h: PICK_ROW };
  };
  const dialogButton = (k) => {
    const d = dialogRect();
    const w = (d.w - 80) / 2;
    return { x: d.x + 30 + k * (w + 20), y: d.y + d.h - 30 - 110, w, h: 110 };
  };

  function say(str, color = GOLD, secs = 3) {
    message = { text: str, color, until: performance.now() + secs * 1000 };
  }

  function openPicker(courseId) {
    const free = campaign.staff.staff.filter((s) => !tr.workerBlock(courseId, s.id));
    // The worker picked on the roster, else someone whose main stat this course trains, else the first free worker.
    const e = tr.course(courseId).effect;
    const main = (s) => ROLES[s.role].primaryStat === e.stat || e.kind === 'primary';
    const pick = free.find((s) => s.id === prefer) ?? free.find(main) ?? free[0];
    bus.emit('training:picker', { courseId }); // before it opens: the guide step asking for it is still showing
    picker = { courseId, staffId: pick?.id ?? null };
  }

  function start() {
    const r = campaign.startTraining(picker.courseId, picker.staffId);
    if (!r.ok) return say(r.reason, RED);
    const s = campaign.staff.get(picker.staffId);
    say(`${s.name} started ${tr.course(picker.courseId).name} (${r.training.days} days)`, GREEN, 3.5);
    picker = null;
    campaign.save().catch(() => {});
  }

  const screen = {
    scroll,
    get picker() {
      return picker;
    },
    courseButtonRect(courseId) {
      const i = COURSES.findIndex((c) => c.id === courseId);
      return i < 0 || picker ? null : inScroll(rowButton(i));
    },
    // The first course that can start now (the guide points at it), preferring preferId.
    pickTargetRect(preferId = null) {
      if (picker) return null;
      const ok = (c) => !tr.courseBlock(c.id) && campaign.staff.staff.some((s) => !tr.workerBlock(c.id, s.id));
      const c = [COURSES.find((x) => x.id === preferId), ...COURSES].find((x) => x && ok(x));
      if (!c) return null;
      const r = screen.courseButtonRect(c.id);
      if (!r) scroll.scrollY = rowRect(COURSES.indexOf(c)).y - 200;
      return r;
    },
    startButtonRect: () => (picker ? dialogButton(0) : null),
    openPicker,

    enter(params = {}) {
      picker = null;
      message = null;
      prefer = params.staffId ?? null;
      resumeOnExit = !campaign.clock.paused;
      campaign.clock.pause();
      scroll.scrollY = 0;
    },
    exit() {
      picker = null;
      if (resumeOnExit) campaign.clock.resume();
    },

    onTap(p) {
      if (picker) {
        if (hitRect(p, dialogButton(0))) return start();
        if (hitRect(p, dialogButton(1)) || !hitRect(p, dialogRect())) return (picker = null);
        campaign.staff.staff.forEach((s, i) => {
          if (!hitRect(p, pickRowRect(i))) return;
          const b = tr.workerBlock(picker.courseId, s.id);
          if (b) say(`${s.name}: ${b}`, RED);
          else picker.staffId = s.id;
        });
        return;
      }
      if (hitRect(p, backRect())) {
        router.go('roster');
        return;
      }
      if (!scroll.contains(p)) return;
      const c = scroll.toContent(p);
      COURSES.forEach((course, i) => {
        if (!hitRect(c, rowButton(i))) return;
        const b = tr.courseBlock(course.id);
        if (b) return say(b === 'Locked' ? `Needs ${describeUnlock(course.requires)}` : b, RED);
        if (!campaign.staff.staff.some((s) => !tr.workerBlock(course.id, s.id))) return say('Nobody can take this course right now', RED);
        openPicker(course.id);
      });
    },
    onDragStart: (p) => !picker && scroll.beginDrag(p),
    onDrag: (p) => scroll.drag(p),
    onDragEnd: (p) => scroll.endDrag(p),

    render(ctx) {
      ctx.fillStyle = COL.bg;
      ctx.fillRect(0, 0, W, renderer.height);
      const s = sr();
      drawButton(ctx, backRect(), '‹ Back', { font: font(SIZE.button, true) });
      contained(ctx, assets, TRAINING_ART.icon, { x: s.x + 224, y: s.y + 26, w: 80, h: 80 });
      text(ctx, 'Training', s.x + 318, s.y + 66, { size: 48, bold: true, baseline: 'middle' });
      contained(ctx, assets, TRAINING_ART.manual, { x: s.x + s.w - 24 - 270, y: s.y + 30, w: 72, h: 72 });
      text(ctx, `${fmt(campaign.economy.balance('credits'))} cr`, s.x + s.w - 24, s.y + 66, { size: 36, bold: true, align: 'right', baseline: 'middle', maxWidth: 190 });

      const w = cw();
      const lastRow = rowRect(COURSES.length - 1);
      scroll.contentHeight = lastRow.y + lastRow.h + 30;
      scroll.begin(ctx);
      drawSlots(ctx, w);
      text(ctx, 'Courses', 4, slotsH() + 14, { size: SIZE.heading, bold: true });
      text(ctx, "Gains never go past the worker's tier cap.", 4, slotsH() + 72, { size: SIZE.small, color: COL.textMuted, maxWidth: w - 8 });
      COURSES.forEach((c, i) => drawCourse(ctx, c, i));
      scroll.end(ctx);

      if (message && performance.now() < message.until) {
        const b = bodyRect();
        const r = { x: b.x + 40, y: b.y + b.h - 110, w: b.w - 80, h: 84 };
        panel(ctx, r, { fill: COL.panel, stroke: message.color, radius: 20 });
        text(ctx, message.text, r.x + r.w / 2, r.y + r.h / 2, { size: SIZE.body, bold: true, align: 'center', baseline: 'middle', color: message.color, maxWidth: r.w - 30 });
      }
      if (picker) drawPicker(ctx);
    },
  };

  function drawSlots(ctx, w) {
    const lines = slotLines();
    panel(ctx, { x: 0, y: 0, w, h: slotsH() - 10 }, { stroke: CYAN });
    const open = lines.filter((l) => l.open).length;
    text(ctx, `Training slots · ${tr.active.length}/${open} in use`, 20, 18, { size: SIZE.button, bold: true, maxWidth: w - 40 });
    lines.forEach((l, i) => {
      const y = 80 + i * SLOT_ROW;
      if (!l.open && !l.t) {
        drawPadlock(ctx, 36, y + 30, 24, COL.textFaint);
        text(ctx, `${l.slot.name}${l.slot.roles ? ' (pilots only)' : ''}`, 70, y + 10, { size: SIZE.body, bold: true, color: COL.textMuted, maxWidth: w - 90 });
        text(ctx, `${l.slot.roles ? 'Needs a Pilot Simulator' : 'Needs a Training Station'} (later update)`, 70, y + 58, { size: SIZE.small, color: COL.textMuted, maxWidth: w - 90 });
        return;
      }
      if (!l.t) {
        text(ctx, `${l.slot.name}${l.slot.roles ? ' (pilots only)' : ''}: free`, 24, y + 30, { size: SIZE.body, bold: true, color: GREEN, maxWidth: w - 48 });
        return;
      }
      const st = campaign.staff.get(l.t.staffId);
      const c = tr.course(l.t.courseId);
      contained(ctx, assets, st?.art, { x: 16, y: y + 4, w: 80, h: 108 });
      text(ctx, `${st?.name ?? '?'} · ${c.name}`, 110, y + 8, { size: SIZE.body, bold: true, maxWidth: w - 130 });
      bar(ctx, 110, y + 70, w - 110 - 240, 26, l.t.daysDone / l.t.days, CYAN);
      text(ctx, `day ${l.t.daysDone}/${l.t.days}`, w - 20, y + 64, { size: SIZE.body, bold: true, align: 'right', color: CYAN });
    });
  }

  function drawCourse(ctx, c, i) {
    const r = rowRect(i);
    const block = courseBlockNote(c);
    const l = courseLines(c);
    const locked = l.locked;
    panel(ctx, r, { fill: locked ? COL.panelDim : COL.panel, stroke: COL.line });
    if (locked) drawPadlock(ctx, r.x + 30, r.y + 38, 24, COL.action);
    const x = r.x + (locked ? 60 : 24);
    text(ctx, c.name, x, r.y + 18, { size: SIZE.button, bold: true, color: locked ? COL.textMuted : COL.text, maxWidth: r.x + r.w - 24 - x });
    const cost = c.currency === 'credits' ? `${fmt(c.cost)} cr` : `${c.cost} Prestige Token`;
    text(ctx, `${cost} · ${c.days} days`, r.x + 24, r.y + 68, { size: SIZE.body, bold: true, color: locked ? COL.textMuted : GOLD, maxWidth: r.w - 48 });
    let y = r.y + 116;
    for (const line of l.effect) {
      text(ctx, line, r.x + 24, y, { size: SIZE.body, color: locked ? COL.textMuted : GREEN, maxWidth: l.textW });
      y += LINE;
    }
    for (const line of l.note) {
      text(ctx, line, r.x + 24, y, { size: SIZE.body, bold: true, color: locked ? COL.actionDark : RED, maxWidth: l.textW });
      y += LINE;
    }
    drawButton(ctx, rowButton(i), locked ? 'Locked' : 'Train…', { disabled: !!block, locked, font: font(SIZE.button, true), accent: CYAN });
  }

  function drawPicker(ctx) {
    ctx.fillStyle = COL.overlay;
    ctx.fillRect(0, 0, W, renderer.height);
    const d = dialogRect();
    const c = tr.course(picker.courseId);
    const head = pickerHead();
    panel(ctx, d, { fill: COL.panel, stroke: CYAN, lineWidth: 5, radius: 28 });
    text(ctx, c.name, d.x + d.w / 2, d.y + 30, { size: SIZE.heading, bold: true, align: 'center', maxWidth: d.w - 60 });
    let hy = d.y + 96;
    for (const line of head.sub) {
      text(ctx, line, d.x + d.w / 2, hy, { size: SIZE.body, align: 'center', color: GOLD, maxWidth: d.w - 60 });
      hy += LINE;
    }
    hy += 16;
    for (const line of head.ask) {
      text(ctx, line, d.x + 30, hy, { size: SIZE.body, bold: true, maxWidth: d.w - 60 });
      hy += LINE;
    }
    campaign.staff.staff.forEach((s, i) => {
      const r = pickRowRect(i);
      const block = tr.workerBlock(picker.courseId, s.id);
      const on = picker.staffId === s.id;
      panel(ctx, r, { fill: on ? COL.panelGood : COL.panelDim, stroke: on ? GREEN : COL.line, lineWidth: on ? 5 : 3, radius: 18 });
      ctx.save();
      if (block) ctx.globalAlpha = 0.45;
      contained(ctx, assets, s.art, { x: r.x + 10, y: r.y + 6, w: 84, h: r.h - 12 });
      text(ctx, s.name, r.x + 108, r.y + 16, { size: SIZE.body, bold: true, maxWidth: r.w - 108 - 400 });
      text(ctx, `${ROLES[s.role].name} · ${TIERS[s.tier].name} · cap ${campaign.staff.statCap(s)}`, r.x + 108, r.y + 72, { size: SIZE.small, color: COL.textMuted, maxWidth: r.w - 108 - 400 });
      ctx.restore();
      let tag = block;
      if (!block) {
        const pv = tr.preview(picker.courseId, s.id).filter((g) => g.max > 0);
        tag = pv.length > 2 ? `${pv.length} stats +${Math.min(...pv.map((g) => g.min))}–${Math.max(...pv.map((g) => g.max))}` : pv.map((g) => `${SHORT[g.key]} ${g.from}→${g.from + g.min}–${g.from + g.max}`).join(', ');
      }
      text(ctx, on ? `✓ ${tag}` : tag, r.x + r.w - 20, r.y + r.h / 2, { size: SIZE.body, bold: true, align: 'right', baseline: 'middle', color: block ? RED : on ? GREEN : COL.textMuted, maxWidth: 380 });
    });
    const ok = !!picker.staffId && !tr.workerBlock(picker.courseId, picker.staffId) && !tr.courseBlock(picker.courseId);
    drawButton(ctx, dialogButton(0), `Start · ${fmt(c.cost)}`, { active: ok, disabled: !ok, accent: GREEN, font: font(SIZE.button, true) });
    drawButton(ctx, dialogButton(1), 'Cancel', { font: font(SIZE.button, true) });
  }

  return screen;
}
