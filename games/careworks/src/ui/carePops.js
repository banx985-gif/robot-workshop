// Care made visible (Milestone 5, style guide §5 / §7, bible §41): small art pops in the home, and the end-of-day beat.
//   a task done together  → Connection Sparkle (care_vfx_01) between the helper and Arthur
//   an activity joined    → Activity Joy (care_vfx_02) over the Activity Lounge
//   a meal finished       → Meal Satisfaction (care_vfx_04) over the Dining Room's tables
//   a gardening session   → Garden Sparkle (care_vfx_03) over the garden it runs in (Milestone 28b; only while fxOn():
//                           Reduced flashes and Low graphics turn it off)
// Routine meals and activities pop from 'care:step' (so a meal he has on his own still shows); every other finished
// task pops from 'care:task'. Pops go through core/VfxSystem's pooled 'world' layer (the home screen draws it under its
// camera). Never stacked: one per spot, none within NEAR of a live one, at most POPS_MAX_LIVE at once, and a gap between
// pops of the same kind in real seconds (so a faster speed never floods the home). A pop that can't show now is skipped.
//   createCarePops({ bus, world(), vfx, screen, isVisible(), fxOn() }) → { update(dt), clear(), log, live() }   clear(): a new run
//   opened (or the home left) — no spot or gap carried over
//   createDayBeat() → { show(summary, dayLabel), showText(text, good), update(dt), render(ctx, x, y, w), current }
//     the medium beat: "Day 3 — all routine care done" / "Day 3 — 2 tasks missed"; Milestone 6: "Welcome, Betty Finch"
import { THEME, font } from '../../../../core/Theme.js';
import { CARE_POPS, POPS_MAX_LIVE, DAY_BEAT } from '../../data/pops.js';
import { CARE_FX } from '../../data/artMoments.js';
import { ROUTINE } from '../../data/routine.js';
import { HOME, PLACED } from '../../data/home.js';
// (Milestone 10: the pieces move — the live one from the world when there is one)

const NEAR = 150; // world px: a pop never starts this close to one still showing
const LIFT = { pair: 235, place: 190 }; // world px above the floor: over the pair's heads; over the middle of a room's art
const stepOf = (id) => ROUTINE.find((s) => s.id === id) ?? null;
const popKindOfStep = (step) => (step?.activity ? 'activity' : step?.place === 'dining' ? 'meal' : null);
// The middle of a placed thing's footprint (its art rises from there): the lounge, the Dining Room.
let liveWorld = null;
const placeCentre = (id) => {
  const it = liveWorld?.() ?? null;
  const fp = (it?.placed.find((p) => p.id === id || p.defId === id) ?? PLACED.find((p) => p.id === id)).fp;
  return { x: (fp.col + fp.w / 2) * HOME.cellSize, y: (fp.row + fp.h / 2) * HOME.cellSize };
};

export function createCarePops({ bus, world: getWorld, vfx, screen, isVisible, fxOn = () => true }) {
  liveWorld = getWorld;
  const pops = []; // live: { key, x, y, left }
  const since = {}; // kind → real seconds since it last showed
  const log = []; // shown pops (tests / debug): { kind, spot, t }
  let clock = 0;

  // plan = { x, y } in plan units; spot = the key that may hold only one pop.
  function pop(kind, spot, plan, lift = LIFT.place) {
    const cfg = CARE_POPS[kind] ?? CARE_FX[kind]; // (Milestone 28b: the garden sparkle)
    if (!cfg || !plan || !isVisible()) return false;
    if (pops.length >= POPS_MAX_LIVE) return false;
    if ((since[kind] ?? Infinity) < cfg.gap) return false;
    const at = screen.worldPointOf(plan.x, plan.y, lift);
    if (pops.some((p) => p.key === spot || Math.hypot(p.x - at.x, p.y - at.y) < NEAR)) return false;
    vfx.sprite('world', cfg.art, at.x, at.y, { size: cfg.size, life: cfg.life, from: 0.45, to: 1, rise: 40, hold: 0.5 });
    pops.push({ key: spot, x: at.x, y: at.y, left: cfg.life });
    since[kind] = 0;
    log.push({ kind, spot, t: +clock.toFixed(2) });
    if (log.length > 40) log.shift();
    return true;
  }

  // Between the helper and the resident when they are together; over the helper otherwise (e.g. a room check while the
  // resident is out).
  function pairPoint(staffId, residentId) {
    const w = getWorld();
    const p = w?.byId(staffId);
    const a = (residentId && w?.residentById?.(residentId)) || w?.resident;
    if (!p || !a) return null;
    const d = Math.hypot(p.agent.x - a.agent.x, p.agent.y - a.agent.y);
    return d < HOME.cellSize * 2.5 ? { x: (p.agent.x + a.agent.x) / 2, y: (p.agent.y + a.agent.y) / 2 } : { x: p.agent.x, y: p.agent.y };
  }

  bus.on('care:step', ({ step, status }) => {
    if (status !== 'done') return;
    const kind = popKindOfStep(stepOf(step));
    if (kind === 'meal') pop('meal', 'dining', placeCentre('F03'));
    else if (kind === 'activity') {
      // (Milestone 28b: a gardening session sparkles over its garden — the Courtyard Garden, else the lounge it falls back to)
      const w = getWorld();
      const info = w?.sessionInfo?.(w.clock.totalDays, step === 'morningActivity' ? 'morning' : 'afternoon');
      if (info?.activity?.id === 'gardening' && fxOn()) {
        const g = w.placed.find((p) => p.defId === info.activity.where.facility);
        if (pop('garden', 'garden', g ? { x: (g.fp.col + g.fp.w / 2) * HOME.cellSize, y: (g.fp.row + g.fp.h / 2) * HOME.cellSize } : placeCentre('F05'))) return;
      }
      pop('activity', 'lounge', placeCentre('F05'));
    }
  });
  bus.on('care:task', ({ id, type, status, staff, resident }) => {
    if (status !== 'done') return;
    const t = getWorld()?.care.tasks.find((x) => x.id === id);
    if (t?.source === 'routine' && popKindOfStep(stepOf(t.stepId))) return; // the step's own pop (above)
    if (type === 'activity') pop('activity', 'lounge', placeCentre('F05'));
    else if (type === 'meal') pop('meal', 'dining', placeCentre('F03'));
    else pop('connection', `pair:${staff}`, pairPoint(staff, resident), LIFT.pair);
  });

  return {
    log,
    live: () => pops.length,
    pop, // tests: show one now
    clear() {
      pops.length = 0;
      for (const k of Object.keys(since)) delete since[k];
    },
    // Real seconds (pops keep their pace at any game speed).
    update(dt) {
      clock += dt;
      for (const k of Object.keys(since)) since[k] += dt;
      for (let i = pops.length - 1; i >= 0; i--) if ((pops[i].left -= dt) <= 0) pops.splice(i, 1);
    },
  };
}

// The end-of-day beat (style guide §7 "medium" feedback): a plain-text card that slides in under the top bar, stays a
// few seconds and fades. Never stacks: a new day's beat replaces the old one.
export function beatText(summary, dayLabel) {
  if (!summary.missed) return `${dayLabel} — all routine care done`;
  return `${dayLabel} — ${summary.missed} task${summary.missed === 1 ? '' : 's'} missed`;
}
export function createDayBeat() {
  const C = THEME.color;
  const beat = {
    current: null, // { text, good, age }
    show(summary, dayLabel) {
      beat.current = { text: beatText(summary, dayLabel), good: !summary.missed, age: 0 };
    },
    showText(text, good = true) {
      beat.current = { text, good, age: 0 };
    },
    update(dt) {
      if (beat.current && (beat.current.age += dt) >= DAY_BEAT.life) beat.current = null;
    },
    render(ctx, x, y, w) {
      const b = beat.current;
      if (!b) return;
      const inK = Math.min(1, b.age / 0.3);
      const outK = Math.min(1, (DAY_BEAT.life - b.age) / 0.6);
      const h = 120;
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(inK, outK));
      const yy = y - (1 - inK) * 40;
      ctx.fillStyle = C.panel;
      ctx.strokeStyle = b.good ? C.good : C.warn;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.roundRect(x, yy, w, h, 30);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = b.good ? C.good : C.warn;
      ctx.beginPath();
      ctx.arc(x + 62, yy + h / 2, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      if (b.good) {
        ctx.moveTo(x + 48, yy + h / 2 + 1);
        ctx.lineTo(x + 58, yy + h / 2 + 12);
        ctx.lineTo(x + 77, yy + h / 2 - 11);
      } else {
        ctx.moveTo(x + 62, yy + h / 2 - 14);
        ctx.lineTo(x + 62, yy + h / 2 + 4);
        ctx.moveTo(x + 62, yy + h / 2 + 15);
        ctx.lineTo(x + 62, yy + h / 2 + 16);
      }
      ctx.stroke();
      ctx.fillStyle = C.text;
      ctx.font = font(THEME.size.heading, true);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.text, x + 112, yy + h / 2 + 2, w - 140);
      ctx.restore();
    },
  };
  return beat;
}
