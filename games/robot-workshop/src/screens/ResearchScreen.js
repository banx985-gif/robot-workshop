// Research Tree (bible §6.3, §19): the research queues at the top, the whole six-branch tree as a map of
// done / active / available / locked dots (tap a branch), then that branch's six topics with their RP cost,
// (Milestone 17: a seventh column, the Secret Lab, once it is owned — prestige part topics costing RP + Prestige Tokens)
// what each one unlocks, and what is still missing. Tap "Research…" to pick a worker and start.
// The game pauses while this screen is open (bible §4.2: research selection pauses).
// Debug builds (?debug=1) add "Debug: finish all" under the milestones: every topic completes through the normal
// completion path (tree order), so each unlock action fires exactly once.
import { ScrollPanel } from '../../../../core/ui/ScrollPanel.js';
import { drawButton, drawPadlock, hitRect } from '../../../../core/ui/Button.js';
import { COMPONENTS } from '../../data/components.js';
import { FACILITIES } from '../../data/facilities.js';
import { FACILITY_NAMES } from '../../data/unlocks.js';
import { PURPOSES, PURPOSE_ORDER } from '../../data/purposes.js';
import { ROLES } from '../../data/staff.js';
import { WORK_STATS } from '../../data/stats.js';
import { RESEARCH_BRANCH_ORDER, RESEARCH_BRANCH_INFO, RESEARCH_MILESTONES, RESEARCH_ART, FEATURES, SECRET_RESEARCH_BRANCH } from '../../data/research.js';
import { describeUnlock, missingParts } from '../systems/unlockRules.js';
import { panel, text, contained, bar, fmt } from '../ui/widgets.js';

const HEADER_H = 130;
const QUEUE_H = 150;
const MAP_H = 340;
const ROW_H = 214;
const GAP = 14;
const PICK_ROW = 112;
const GREEN = '#7CFFB2';
const CYAN = '#4FC3F7';
const GOLD = '#FFD166';
const GREY = '#6B7785';
const RED = '#FF8A80';
const STATUS_COLOR = { done: GREEN, active: CYAN, available: '#FFFFFF', locked: GREY };
const STAT_NAME = Object.fromEntries(WORK_STATS.map((s) => [s.key, s]));

// Which purposes each node helps open (from the purposes' unlock rules), e.g. MO-R1 → Delivery.
function researchParts(rule) {
  if (rule?.type === 'all') return rule.of.flatMap(researchParts);
  return rule?.type === 'research' ? [rule] : [];
}
const PURPOSES_BY_NODE = {};
for (const id of PURPOSE_ORDER) {
  for (const r of researchParts(PURPOSES[id].unlock)) (PURPOSES_BY_NODE[`${r.branch}:${r.level}`] ||= []).push(id);
}

export function createResearchScreen({ renderer, layout, assets, bus, campaign, router, debugEnabled = false }) {
  const W = renderer.width;
  const res = campaign.research;
  let branch = null; // shown branch
  let picker = null; // { mode: 'start' | 'assign', queue, nodeId, staffId }
  let message = null;
  let resumeOnExit = false;
  const scroll = new ScrollPanel({ getRect: bodyRect, contentHeight: 0 });

  const sr = () => layout.safeRect;
  function backRect() {
    return { x: sr().x + 24, y: sr().y + 24, w: 180, h: 86 };
  }
  function queueRect(i) {
    const s = sr();
    return { x: s.x + 24, y: s.y + HEADER_H + i * (QUEUE_H + GAP), w: s.w - 48, h: QUEUE_H };
  }
  function queueButton(i, k) {
    const q = queueRect(i);
    const w = 170;
    return { x: q.x + q.w - 20 - (k + 1) * w - k * 14, y: q.y + q.h - 20 - 72, w, h: 72 };
  }
  function mapRect() {
    const s = sr();
    return { x: s.x + 24, y: s.y + HEADER_H + res.queueDefs.length * (QUEUE_H + GAP), w: s.w - 48, h: MAP_H };
  }
  function columnRect(b) {
    const m = mapRect();
    const list = branches();
    const i = list.indexOf(b);
    const w = (m.w - (list.length - 1) * 12) / list.length;
    return { x: m.x + i * (w + 12), y: m.y, w, h: m.h };
  }
  function bodyRect() {
    const s = sr();
    const m = mapRect();
    const y = m.y + m.h + 16;
    return { x: s.x + 24, y, w: s.w - 48, h: s.y + s.h - 24 - y };
  }
  const rowRect = (i) => ({ x: 0, y: i * (ROW_H + GAP), w: bodyRect().w - 12, h: ROW_H });
  const rowButton = (i) => {
    const r = rowRect(i);
    return { x: r.x + r.w - 20 - 230, y: r.y + r.h - 20 - 76, w: 230, h: 76 };
  };
  const nodesOf = (b) => res.nodes.filter((n) => n.branch === b);
  // The six visible branches, plus the Secret Lab's topics once it is owned (M17).
  const branches = () => (campaign.facilities.has('F34') ? [...RESEARCH_BRANCH_ORDER, SECRET_RESEARCH_BRANCH] : RESEARCH_BRANCH_ORDER);
  // A Secret Lab topic stays '???' until its secret has made it appear.
  const secretHidden = (n) => n.hidden && !campaign.unlocks.has('secretResearch', n.id);
  const priceText = (n, cost) => (n.prestigeTokens ? fmt(cost) + ' RP + ' + n.prestigeTokens + ' PT' : fmt(cost) + ' RP');
  const milestoneTop = () => nodesOf(branch).length * (ROW_H + GAP) + 10;
  const debugRect = () => ({ x: 0, y: milestoneTop() + 70 + RESEARCH_MILESTONES.length * 64 + 10, w: 420, h: 80 });

  // Debug: finish every topic in tree order (prerequisites first), through the normal completion path.
  function debugFinishAll() {
    let n = 0;
    for (let guard = 0; guard < 40 && res.doneCount < res.nodes.length; guard++) {
      for (const node of res.nodes) if (!res.isDone(node.id) && res.missing(node.id).nodes.length === 0 && campaign.debugCompleteResearch(node.id)) n++;
    }
    say(`Debug: ${n} topics finished (${res.doneCount}/36)`, GREEN);
  }

  // Screen rect of something inside the scroll panel, only if fully in view (guide / tests).
  function inScroll(r) {
    const b = bodyRect();
    const y = b.y + r.y - scroll.scrollY;
    if (y < b.y - 1 || y + r.h > b.y + b.h + 1) return null;
    return { x: b.x + r.x, y, w: r.w, h: r.h };
  }

  // --- picker ------------------------------------------------------------------------------
  function dialogRect() {
    const s = sr();
    const h = 330 + campaign.staff.staff.length * (PICK_ROW + 12) + 140;
    return { x: s.x + 40, y: Math.max(s.y + 40, s.y + s.h / 2 - h / 2), w: s.w - 80, h };
  }
  function pickRowRect(i) {
    const d = dialogRect();
    return { x: d.x + 30, y: d.y + 300 + i * (PICK_ROW + 12), w: d.w - 60, h: PICK_ROW };
  }
  function dialogButton(k) {
    const d = dialogRect();
    const w = (d.w - 60 - 20) / 2;
    return { x: d.x + 30 + k * (w + 20), y: d.y + d.h - 30 - 96, w, h: 96 };
  }

  const freeQueue = () => res.queues.findIndex((q, i) => res.queueOpen(i) && !q.nodeId);
  const statOf = (s, node) => s.stats[RESEARCH_BRANCH_INFO[node.branch].stat] ?? 0;
  // Why this worker can't research on queue i right now, or null.
  function workerBlock(i, s) {
    const a = res.canAssign(i, s.id);
    return a.ok ? null : a.reason;
  }
  // Days to finish node on queue i with this worker (from today's progress).
  function daysWith(node, s) {
    const r = res.rules;
    const rate = (r.basePerDay + statOf(s, node) / r.statDivisor + (res.hooks.bonusPerDay?.() ?? 0)) * (1 + (res.hooks.speedPct?.() ?? 0) / 100);
    return Math.ceil((res.costOf(node) - (res.progress[node.id] ?? 0)) / rate);
  }

  function openPicker(mode, queue, nodeId) {
    const node = res.node(nodeId);
    const free = campaign.staff.staff.filter((s) => !workerBlock(queue, s));
    const current = res.queues[queue]?.staffId;
    const best = free.slice().sort((a, b) => statOf(b, node) - statOf(a, node))[0];
    bus.emit('research:picker', { nodeId }); // before it opens: the guide step that asked for it is still on screen
    picker = { mode, queue, nodeId, staffId: current ?? best?.id ?? null };
  }

  function confirmPicker() {
    const p = picker;
    const res1 = p.mode === 'start' ? campaign.startResearch(p.queue, p.nodeId, p.staffId) : res.assign(p.queue, p.staffId);
    if (!res1.ok) {
      say(res1.reason, RED);
      return;
    }
    picker = null;
    say(p.mode === 'start' ? `Research started: ${res.node(p.nodeId).name}` : 'Worker changed', GREEN);
    campaign.save().catch(() => {});
  }

  function say(str, color = GOLD, secs = 3) {
    message = { text: str, color, until: performance.now() + secs * 1000 };
  }

  // Start button state for a node row: { label, ok, reason }
  function rowAction(node) {
    const st = res.status(node.id);
    if (st !== 'available') return null;
    if (!res.openQueues) return { label: 'Research…', ok: false, reason: 'Build a Research Desk first' };
    const q = freeQueue();
    if (q < 0) return { label: 'Research…', ok: false, reason: 'The queue is busy — stop it or wait' };
    const can = res.canStart(q, node.id);
    return { label: res.paid[node.id] ? 'Resume…' : 'Research…', ok: can.ok, reason: can.reason, queue: q };
  }

  const screen = {
    scroll,
    get branch() {
      return branch;
    },
    get picker() {
      return picker;
    },
    columnRect,
    // Guide / test helpers (screen rects, null when not showing).
    nodeRowRect(nodeId) {
      const n = res.node(nodeId);
      if (!n || picker || n.branch !== branch) return null;
      return inScroll(rowRect(nodesOf(branch).indexOf(n)));
    },
    nodeButtonRect(nodeId) {
      const n = res.node(nodeId);
      if (!n || picker || n.branch !== branch) return null;
      return inScroll(rowButton(nodesOf(branch).indexOf(n)));
    },
    // Where to tap to start the next topic: the preferred topic if it can start (its button, or its branch first),
    // else an available topic's button in this branch, else the branch that has one.
    pickTargetRect(preferId = null) {
      if (picker) return null;
      const pref = preferId ? res.node(preferId) : null;
      if (pref && rowAction(pref)?.ok) return pref.branch === branch ? screen.nodeButtonRect(pref.id) : columnRect(pref.branch);
      const here = nodesOf(branch).find((n) => rowAction(n)?.ok);
      if (here) return screen.nodeButtonRect(here.id);
      const other = res.nodes.find((n) => rowAction(n)?.ok);
      return other ? columnRect(other.branch) : null;
    },
    startButtonRect: () => (picker ? dialogButton(0) : null),
    pickerRowRect: (i) => (picker ? pickRowRect(i) : null),
    queueRect,
    openPicker,
    debugFinishAll,
    setBranch(b) {
      branch = b;
      scroll.scrollY = 0;
    },

    enter(params = {}) {
      picker = null;
      message = null;
      resumeOnExit = !campaign.clock.paused;
      campaign.clock.pause();
      if (params.branch) branch = params.branch;
      if (!branch || !branches().includes(branch)) branch = RESEARCH_BRANCH_ORDER.find((b) => nodesOf(b).some((n) => res.status(n.id) === 'available')) ?? RESEARCH_BRANCH_ORDER[0];
      scroll.scrollY = 0;
    },
    exit() {
      picker = null;
      if (resumeOnExit) campaign.clock.resume();
    },

    onTap(p) {
      if (picker) {
        tapPicker(p);
        return;
      }
      if (hitRect(p, backRect())) {
        router.go('workshop');
        return;
      }
      for (let i = 0; i < res.queueDefs.length; i++) {
        if (!hitRect(p, queueRect(i))) continue;
        tapQueue(i, p);
        return;
      }
      for (const b of branches()) {
        if (hitRect(p, columnRect(b))) {
          if (b !== branch) screen.setBranch(b);
          return;
        }
      }
      if (!scroll.contains(p)) return;
      const c = scroll.toContent(p);
      if (debugEnabled && hitRect(c, debugRect())) {
        debugFinishAll();
        return;
      }
      nodesOf(branch).forEach((n, i) => {
        if (!hitRect(c, rowButton(i))) return;
        const a = rowAction(n);
        if (!a) return;
        if (!a.ok) say(a.reason, RED);
        else openPicker('start', a.queue, n.id);
      });
    },
    onDragStart: (p) => !picker && scroll.beginDrag(p),
    onDrag: (p) => scroll.drag(p),
    onDragEnd: (p) => scroll.endDrag(p),

    render(ctx) {
      ctx.fillStyle = '#101418';
      ctx.fillRect(0, 0, W, renderer.height);
      const s = sr();
      drawButton(ctx, backRect(), '‹ Back', { font: 'bold 32px system-ui, sans-serif' });
      contained(ctx, assets, RESEARCH_ART.icon, { x: s.x + 224, y: s.y + 26, w: 80, h: 80 });
      text(ctx, 'Research', s.x + 318, s.y + 66, { size: 48, bold: true, baseline: 'middle' });
      contained(ctx, assets, RESEARCH_ART.rp, { x: s.x + s.w - 24 - 250, y: s.y + 30, w: 72, h: 72 });
      text(ctx, `${fmt(res.rp)} RP`, s.x + s.w - 24, s.y + 66, { size: 44, bold: true, baseline: 'middle', align: 'right', color: CYAN, maxWidth: 170 });

      res.queueDefs.forEach((_, i) => drawQueue(ctx, i));
      drawMap(ctx);

      const list = nodesOf(branch);
      const milestoneY = milestoneTop();
      scroll.contentHeight = milestoneY + 70 + RESEARCH_MILESTONES.length * 64 + 20 + (debugEnabled ? 100 : 0);
      scroll.begin(ctx);
      list.forEach((n, i) => drawNode(ctx, n, i, list));
      drawMilestones(ctx, milestoneY);
      if (debugEnabled) drawButton(ctx, debugRect(), 'Debug: finish all', { font: 'bold 30px system-ui, sans-serif', accent: '#FF8A80' });
      scroll.end(ctx);

      if (message && performance.now() < message.until) {
        const b = bodyRect();
        const r = { x: b.x + 40, y: b.y + b.h - 110, w: b.w - 80, h: 84 };
        panel(ctx, r, { fill: 'rgba(12,16,20,0.95)', stroke: message.color, radius: 20 });
        text(ctx, message.text, r.x + r.w / 2, r.y + r.h / 2, { size: 30, bold: true, align: 'center', baseline: 'middle', color: message.color, maxWidth: r.w - 30 });
      }
      if (picker) drawPicker(ctx);
    },
  };

  function tapQueue(i, p) {
    const q = res.queues[i];
    if (!res.queueOpen(i)) {
      if (i === 0) router.go('build');
      else say(`Needs ${missingParts(res.queueDefs[i].rule, (r) => campaign.ruleMet(r)).join(' + ')}`, GOLD);
      return;
    }
    if (!q.nodeId) {
      say('Pick a topic below and tap Research…', CYAN);
      return;
    }
    if (hitRect(p, queueButton(i, 0))) {
      res.stop(i);
      say('Stopped — progress is kept. Resume it any time for free.', GOLD, 4);
      campaign.save().catch(() => {});
    } else if (hitRect(p, queueButton(i, 1))) openPicker('assign', i, q.nodeId);
  }

  function tapPicker(p) {
    if (hitRect(p, dialogButton(0))) {
      confirmPicker();
      return;
    }
    if (hitRect(p, dialogButton(1)) || !hitRect(p, dialogRect())) {
      picker = null;
      return;
    }
    campaign.staff.staff.forEach((s, i) => {
      if (!hitRect(p, pickRowRect(i))) return;
      const block = workerBlock(picker.queue, s);
      if (block) say(`${s.name}: ${block}`, RED);
      else picker.staffId = s.id;
    });
  }

  // --- drawing -----------------------------------------------------------------------------
  function drawQueue(ctx, i) {
    const r = queueRect(i);
    const def = res.queueDefs[i];
    const open = res.queueOpen(i);
    const q = res.queues[i];
    const node = q.nodeId ? res.node(q.nodeId) : null;
    panel(ctx, r, { fill: open ? 'rgba(26,32,40,0.96)' : 'rgba(20,24,30,0.96)', stroke: node ? CYAN : open ? '#35414F' : '#2A323C', lineWidth: node ? 5 : 3 });
    text(ctx, `Queue ${i + 1}`, r.x + 24, r.y + 18, { size: 26, bold: true, color: '#9AA8B5' });
    if (!open) {
      drawPadlock(ctx, r.x + 34, r.y + 92, 30, '#FFB74D');
      const needs = missingParts(def.rule, (rule) => campaign.ruleMet(rule)).join(' + ');
      text(ctx, i === 0 ? 'Build a Research Desk to open research' : 'Locked', r.x + 74, r.y + 70, { size: 32, bold: true, color: '#AEB8C2', maxWidth: r.w - 300 });
      text(ctx, `Needs ${needs}`, r.x + 74, r.y + 110, { size: 26, color: '#FFB74D', maxWidth: r.w - 300 });
      if (i === 0) drawButton(ctx, { x: r.x + r.w - 20 - 200, y: r.y + r.h / 2 - 40, w: 200, h: 80 }, 'Build', { accent: '#FFB74D', font: 'bold 32px system-ui, sans-serif' });
      return;
    }
    if (!node) {
      text(ctx, 'Free — pick a topic below', r.x + 24, r.y + 64, { size: 34, bold: true, maxWidth: r.w - 48 });
      text(ctx, `${res.nodes.filter((n) => res.status(n.id) === 'available').length} topics available · ${res.doneCount}/36 done`, r.x + 24, r.y + 108, { size: 26, color: '#9AA8B5', maxWidth: r.w - 48 });
      return;
    }
    const s = q.staffId ? campaign.staff.get(q.staffId) : null;
    const bw = r.w - 48 - 2 * 170 - 30;
    text(ctx, `${node.id} · ${node.name}`, r.x + 150, r.y + 14, { size: 30, bold: true, maxWidth: r.w - 170 });
    bar(ctx, r.x + 24, r.y + 64, bw, 22, res.fraction(node.id), CYAN);
    text(ctx, `${Math.floor(res.fraction(node.id) * 100)}%`, r.x + 24 + bw, r.y + 92, { size: 24, bold: true, align: 'right', color: CYAN });
    const days = res.daysLeft(i);
    const who = s ? `${s.name.split(' ')[0]} · ${res.perDay(i).toFixed(1)} RP/day · ${days} day${days === 1 ? '' : 's'} left` : 'Nobody on it — tap Worker';
    text(ctx, who, r.x + 24, r.y + 102, { size: 25, color: s ? '#C9D3DD' : RED, maxWidth: bw - 80 });
    drawButton(ctx, queueButton(i, 0), 'Stop', { font: 'bold 30px system-ui, sans-serif', accent: '#FFB74D' });
    drawButton(ctx, queueButton(i, 1), 'Worker', { font: 'bold 30px system-ui, sans-serif' });
  }

  // The whole tree: one column per branch, six dots each (done / active / available / locked), joined top to bottom.
  function drawMap(ctx) {
    for (const b of branches()) {
      const r = columnRect(b);
      const info = RESEARCH_BRANCH_INFO[b];
      const list = nodesOf(b);
      const sel = b === branch;
      panel(ctx, r, { fill: sel ? 'rgba(34,46,58,0.98)' : 'rgba(22,27,34,0.96)', stroke: sel ? info.color : '#2A323C', lineWidth: sel ? 5 : 3, radius: 18 });
      text(ctx, info.short, r.x + r.w / 2, r.y + 14, { size: 26, bold: true, align: 'center', color: sel ? info.color : '#C9D3DD', maxWidth: r.w - 10 });
      const done = list.filter((n) => res.isDone(n.id)).length;
      text(ctx, `${done}/${list.length}`, r.x + r.w / 2, r.y + 46, { size: 22, align: 'center', color: '#9AA8B5' });
      const cx = r.x + r.w / 2;
      const top = r.y + 98;
      const step = (r.h - 98 - 30) / (list.length - 1);
      ctx.strokeStyle = '#35414F';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cx, top);
      ctx.lineTo(cx, top + step * (list.length - 1));
      ctx.stroke();
      list.forEach((n, k) => {
        const st = res.status(n.id);
        const y = top + k * step;
        if (k > 0 && res.isDone(list[k - 1].id)) {
          ctx.strokeStyle = GREEN;
          ctx.beginPath();
          ctx.moveTo(cx, y - step);
          ctx.lineTo(cx, st === 'done' ? y : y - step / 2);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(cx, y, 15, 0, Math.PI * 2);
        ctx.fillStyle = st === 'locked' ? '#1A2028' : STATUS_COLOR[st];
        ctx.fill();
        ctx.strokeStyle = STATUS_COLOR[st];
        ctx.lineWidth = 3;
        ctx.stroke();
        if (st === 'active') {
          ctx.beginPath();
          ctx.arc(cx, y, 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * res.fraction(n.id));
          ctx.strokeStyle = CYAN;
          ctx.lineWidth = 4;
          ctx.stroke();
        }
      });
    }
  }

  function unlockItems(node) {
    return node.actions.map((a) => {
      if (a.type === 'part') return { art: COMPONENTS[a.id].art, label: COMPONENTS[a.id].name, extra: extraNeeds(a.id) };
      if (a.type === 'facility') return { art: null, label: `${FACILITIES[a.id]?.name ?? FACILITY_NAMES[a.id] ?? a.id}${FACILITIES[a.id] ? ' (build)' : ' (later update)'}` };
      return { art: null, label: FEATURES[a.id]?.name ?? a.id };
    });
  }

  // A part that also needs something besides this research (e.g. Rank A): say so.
  function extraNeeds(partId) {
    const rule = COMPONENTS[partId].unlock;
    if (rule.type !== 'all') return null;
    const others = rule.of.filter((r) => r.type !== 'research');
    return others.length ? others.map(describeUnlock).join(' + ') : null;
  }

  function drawNode(ctx, n, i, list) {
    const r = rowRect(i);
    const st = res.status(n.id);
    const color = STATUS_COLOR[st];
    const info = RESEARCH_BRANCH_INFO[n.branch];
    // chain line to the next topic
    if (i < list.length - 1) {
      ctx.fillStyle = res.isDone(n.id) ? GREEN : '#2A323C';
      ctx.fillRect(r.x + 52, r.y + r.h, 6, GAP);
    }
    panel(ctx, r, { fill: st === 'locked' ? 'rgba(20,24,30,0.96)' : 'rgba(26,32,40,0.96)', stroke: st === 'available' ? info.color : st === 'active' ? CYAN : st === 'done' ? '#2F5A46' : '#2A323C', lineWidth: st === 'available' || st === 'active' ? 5 : 3 });
    ctx.beginPath();
    ctx.arc(r.x + 55, r.y + 56, 34, 0, Math.PI * 2);
    ctx.fillStyle = st === 'locked' ? '#1A2028' : st === 'done' ? '#2F5A46' : '#22303C';
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.stroke();
    text(ctx, st === 'done' ? '✓' : String(n.level), r.x + 55, r.y + 57, { size: 34, bold: true, align: 'center', baseline: 'middle', color });
    if (st === 'locked') drawPadlock(ctx, r.x + 42, r.y + 118, 26, '#8C98A5');

    const x = r.x + 110;
    const mw = r.w - 130;
    text(ctx, secretHidden(n) ? '??? · A secret topic' : `${n.id} · ${n.name}`, x, r.y + 16, { size: 32, bold: true, color: st === 'locked' ? '#AEB8C2' : '#FFFFFF', maxWidth: mw - 220 });
    const cost = res.costOf(n);
    const right =
      st === 'done' ? 'Done ✓' : st === 'active' ? `${Math.floor(res.fraction(n.id) * 100)}%` : res.paid[n.id] ? `Paid · ${Math.floor(res.fraction(n.id) * 100)}%` : secretHidden(n) ? '???' : priceText(n, cost);
    text(ctx, right, r.x + r.w - 20, r.y + 18, { size: 30, bold: true, align: 'right', color: st === 'done' ? GREEN : st === 'active' ? CYAN : st === 'locked' ? '#8C98A5' : res.rp >= cost || res.paid[n.id] ? GOLD : RED });

    // What it unlocks: part icons + names.
    let ux = x;
    const uy = r.y + 60;
    for (const u of secretHidden(n) ? [] : unlockItems(n)) {
      if (r.x + r.w - 20 - ux < 120) break;
      if (u.art) {
        ctx.save();
        if (st === 'locked') ctx.globalAlpha = 0.45;
        contained(ctx, assets, u.art, { x: ux, y: uy, w: 60, h: 60 });
        ctx.restore();
        ux += 66;
      }
      ctx.font = 'bold 24px system-ui, sans-serif';
      const label = u.extra ? `${u.label} (+ ${u.extra})` : u.label;
      const w = Math.min(ctx.measureText(label).width, r.x + r.w - 20 - ux);
      text(ctx, label, ux, uy + 30, { size: 24, bold: true, baseline: 'middle', color: st === 'locked' ? '#8C98A5' : GREEN, maxWidth: w });
      ux += w + 24;
    }

    // Robot types this helps open.
    const opens = (PURPOSES_BY_NODE[`${n.branch}:${n.level}`] ?? []).map((id) => {
      const open = campaign.openPurposes.includes(id);
      const self = (rule) => rule.type === 'research' && rule.branch === n.branch && rule.level === n.level;
      const other = missingParts(PURPOSES[id].unlock, (rule) => self(rule) || campaign.unlockMet(rule));
      return `${PURPOSES[id].name}${open ? ' ✓' : other.length ? ` (+ ${other.join(' + ')})` : ''}`;
    });
    const line3 = opens.length ? `Opens robots: ${opens.join(', ')}` : `Researcher uses ${STAT_NAME[info.stat].name} (${STAT_NAME[info.stat].short})`;
    text(ctx, line3, x, r.y + 132, { size: 24, color: opens.length ? '#C9D3DD' : '#9AA8B5', maxWidth: st === 'available' ? mw - 260 : mw });

    // Bottom line: what is missing, who is on it, or the start button.
    if (st === 'locked') {
      const m = res.missing(n.id);
      const needs = [...m.nodes, ...(m.condition ? missingParts(m.condition, (rule) => campaign.unlockMet(rule)) : [])];
      text(ctx, `Needs ${needs.join(' + ')}`, x, r.y + 170, { size: 25, bold: true, color: '#FFB74D', maxWidth: mw });
    } else if (st === 'active') {
      const qi = res.queueOf(n.id);
      const s = campaign.staff.get(res.queues[qi].staffId);
      text(ctx, s ? `Being researched by ${s.name} (queue ${qi + 1})` : `In queue ${qi + 1} — nobody working on it`, x, r.y + 170, { size: 25, bold: true, color: s ? CYAN : RED, maxWidth: mw });
    } else if (st === 'available') {
      const a = rowAction(n);
      if (!a.ok) text(ctx, a.reason, x, r.y + 170, { size: 24, color: RED, maxWidth: mw - 260 });
      drawButton(ctx, rowButton(i), a.label, { font: 'bold 30px system-ui, sans-serif', disabled: !a.ok, accent: info.color });
    }
  }

  function drawMilestones(ctx, y) {
    const w = bodyRect().w - 12;
    text(ctx, `Business milestones (all branches) · ${res.doneCount}/36 topics done`, 4, y + 14, { size: 28, bold: true });
    RESEARCH_MILESTONES.forEach((m, k) => {
      const hitIt = res.milestonesHit.includes(m.count);
      const names = m.actions.map((a) => FEATURES[a.id]?.name ?? a.id).join(' + ');
      const ry = y + 64 + k * 64;
      panel(ctx, { x: 0, y: ry, w, h: 54 }, { fill: hitIt ? 'rgba(34,56,46,0.96)' : 'rgba(22,27,34,0.96)', stroke: hitIt ? '#2F5A46' : '#2A323C', radius: 14 });
      text(ctx, `${m.count}`, 24, ry + 27, { size: 28, bold: true, baseline: 'middle', color: hitIt ? GREEN : GOLD });
      const note = hitIt ? FEATURES[m.actions.at(-1).id]?.note : null;
      text(ctx, hitIt ? `✓ ${names} — ${note}` : names, 90, ry + 27, { size: 24, baseline: 'middle', color: hitIt ? GREEN : '#C9D3DD', maxWidth: w - 110 });
    });
  }

  function drawPicker(ctx) {
    ctx.fillStyle = 'rgba(6,8,12,0.66)';
    ctx.fillRect(0, 0, W, renderer.height);
    const d = dialogRect();
    const node = res.node(picker.nodeId);
    const info = RESEARCH_BRANCH_INFO[node.branch];
    const stat = STAT_NAME[info.stat];
    panel(ctx, d, { fill: 'rgba(26,32,40,0.99)', stroke: info.color, lineWidth: 5, radius: 28 });
    text(ctx, `${node.id} · ${node.name}`, d.x + d.w / 2, d.y + 36, { size: 42, bold: true, align: 'center', maxWidth: d.w - 60 });
    const cost = res.costOf(node);
    const costLine = picker.mode === 'assign' ? 'Change who researches it' : res.paid[node.id] ? 'Already paid — resumes where it stopped' : `Costs ${priceText(node, cost)} · you have ${fmt(res.rp)} RP`;
    text(ctx, costLine, d.x + d.w / 2, d.y + 100, { size: 30, align: 'center', color: res.rp >= cost || res.paid[node.id] || picker.mode === 'assign' ? GOLD : RED, maxWidth: d.w - 60 });
    text(ctx, `Unlocks: ${unlockItems(node).map((u) => u.label).join(', ')}`, d.x + d.w / 2, d.y + 150, { size: 26, align: 'center', color: GREEN, maxWidth: d.w - 60 });
    text(ctx, `Who researches it? Faster with high ${stat.name} (${stat.short}).`, d.x + 30, d.y + 206, { size: 28, bold: true, maxWidth: d.w - 60 });
    text(ctx, 'They leave the robot team while researching.', d.x + 30, d.y + 246, { size: 24, color: '#9AA8B5', maxWidth: d.w - 60 });
    campaign.staff.staff.forEach((s, i) => {
      const r = pickRowRect(i);
      const block = workerBlock(picker.queue, s);
      const on = picker.staffId === s.id;
      panel(ctx, r, { fill: on ? 'rgba(40,64,56,0.96)' : 'rgba(20,24,30,0.96)', stroke: on ? GREEN : '#35414F', lineWidth: on ? 5 : 3, radius: 18 });
      ctx.save();
      if (block) ctx.globalAlpha = 0.45;
      contained(ctx, assets, s.art, { x: r.x + 10, y: r.y + 6, w: 80, h: r.h - 12 });
      text(ctx, s.name, r.x + 104, r.y + 16, { size: 30, bold: true, maxWidth: r.w - 420 });
      text(ctx, `${ROLES[s.role].name} · ${stat.short} ${statOf(s, node)}`, r.x + 104, r.y + 58, { size: 24, color: '#9AA8B5', maxWidth: r.w - 420 });
      ctx.restore();
      const tag = block ?? `≈ ${daysWith(node, s)} days`;
      text(ctx, on ? `✓ ${tag}` : tag, r.x + r.w - 20, r.y + r.h / 2, { size: 26, bold: true, align: 'right', baseline: 'middle', color: block ? RED : on ? GREEN : '#C9D3DD', maxWidth: 300 });
    });
    const label = picker.mode === 'assign' ? 'Assign' : res.paid[node.id] ? 'Resume' : `Start · ${priceText(node, cost)}`;
    const ok = !!picker.staffId && (picker.mode === 'assign' || res.canStart(picker.queue, node.id).ok);
    drawButton(ctx, dialogButton(0), label, { active: ok, disabled: !ok, accent: GREEN, font: 'bold 36px system-ui, sans-serif' });
    drawButton(ctx, dialogButton(1), 'Cancel', { font: 'bold 36px system-ui, sans-serif' });
  }

  return screen;
}
