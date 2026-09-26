// Contracts (bible §14.6–14.7): Offered / Active / Done.
// Each card: customer, requirements, pay and reputation, deadline, and a "can my robots meet this?" hint
// (a finished robot that already meets it, or what the team is expected to build with the suggested parts).
// Offered → Accept (max 2 active). Active → Build for this / Deliver a finished robot. Done → the result.
import { THEME, font } from '../../../../core/Theme.js';
import { ScrollPanel } from '../../../../core/ui/ScrollPanel.js';
import { drawButton } from '../../../../core/ui/Button.js';
import { COMPONENTS, SLOTS } from '../../data/components.js';
import { predictBuild } from '../systems/Capability.js';
import { checkRecord, requirementLines, segmentOf } from '../systems/ContractRules.js';
import { createTopBar } from '../ui/TopBar.js';
import { panel, text, contained, hit, fmt, emptyState, stateHeight } from '../ui/widgets.js';
const COL = THEME.color;

const TABS = [
  { id: 'offered', label: 'Offered' },
  { id: 'active', label: 'Active' },
  { id: 'done', label: 'Done' },
];
const GAP = 20;
const BTN_W = 290; // "Build for this" fits at 34 px
const LINE = 44; // one line of body text (34 px)
const SMALL_LINE = 38; // one line of small secondary text (28 px)
const ART_H = 214; // the customer picture; lines under it run the full card width

export function createContractsScreen({ renderer, layout, assets, campaign, router, goProject, hud }) {
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
  let tab = 'offered';
  let message = null; // { text, color }
  let emptyHit = null; // the empty state's button (Milestone 21)
  const scroll = new ScrollPanel({ getRect: bodyRect, contentHeight: 0 });
  const K = () => campaign.contracts;

  function tabRect(i) {
    const sr = layout.safeRect;
    const t = topBar.rect();
    const w = (sr.w - 48 - 2 * 16) / 3;
    return { x: sr.x + 24 + i * (w + 16), y: t.y + t.h + 16, w, h: 110 };
  }
  function bodyRect() {
    const sr = layout.safeRect;
    const t = tabRect(0);
    const y = t.y + t.h + 70;
    return { x: sr.x + 24, y, w: sr.w - 48, h: sr.y + sr.h - 24 - y };
  }
  const cw = () => bodyRect().w - 12;
  // Cards grow with their text (Milestone 18: §33.2 sizes, long lines wrap): heights are measured each frame.
  const measure = document.createElement('canvas').getContext('2d');
  let heights = [];
  const cardTop = (i) => heights.slice(0, i).reduce((t, h) => t + h + GAP, 0);
  const cardRect = (i) => ({ x: 0, y: cardTop(i), w: cw(), h: heights[i] ?? 0 });
  const buttonRect = (i, n = 0) => {
    const c = cardRect(i);
    return { x: c.x + c.w - 24 - (n + 1) * BTN_W - n * 14, y: c.y + c.h - 24 - 110, w: BTN_W, h: 110 };
  };

  // Word-wrap str to width w at a size; at most max lines.
  function wrap(ctx, str, w, size, bold = false, max = 3) {
    ctx.font = font(size, bold);
    const out = [];
    let cur = '';
    for (const word of String(str).split(' ')) {
      const t = cur ? `${cur} ${word}` : word;
      if (ctx.measureText(t).width > w && cur && out.length < max - 1) {
        out.push(cur);
        cur = word;
      } else cur = t;
    }
    if (cur) out.push(cur);
    return out;
  }

  function list() {
    if (tab === 'offered') return K().offers;
    if (tab === 'active') return K().active;
    return [...K().done].reverse();
  }

  // The "can my robots meet this?" hint: { ok, text }.
  function hint(c) {
    const ready = campaign.robotsFor(c.id);
    if (ready.length) return { ok: true, text: `Your robot #${ready[0].number} ${ready[0].name} already meets this`, robot: ready[0] };
    if (!campaign.openPurposes.includes(c.purpose)) return { ok: false, text: 'Needs a purpose you have not opened yet' };
    const pred = predictBuild(campaign, c.purpose, c.suggested);
    const chk = checkRecord(c, { result: { ...pred, purpose: c.purpose, components: c.suggested } });
    if (chk.ok) return { ok: true, text: `Your team can build this (≈${pred.days} days with the suggested parts)` };
    return { ok: false, text: `Hard for your team now: ${chk.failures.join(', ')}` };
  }

  const screen = {
    topBar,
    scroll,
    tabRect,
    buttonRect,
    get tab() {
      return tab;
    },
    enter(params = {}) {
      tab = params.tab ?? (K().active.length && !K().offers.length ? 'active' : tab);
      message = null;
      scroll.scrollY = 0;
    },
    onTap(p) {
      if (topBar.handleTap(p)) return;
      if (emptyHit && scroll.contains(p) && hit(scroll.toContent(p), emptyHit.r)) return emptyHit.go();
      TABS.forEach((t, i) => {
        if (hit(p, tabRect(i))) {
          tab = t.id;
          scroll.scrollY = 0;
          message = null;
        }
      });
      if (!scroll.contains(p)) return;
      const c = scroll.toContent(p);
      const items = list();
      for (let i = 0; i < items.length; i++) {
        const k = items[i];
        if (tab === 'offered' && hit(c, buttonRect(i))) {
          const res = campaign.acceptContract(k.id);
          message = res.ok ? { text: `Accepted: ${k.title}`, color: COL.good } : { text: res.reason, color: COL.bad };
          if (res.ok) campaign.save().catch(() => {});
          return;
        }
        if (tab === 'active') {
          const h = hint(k);
          if (h.robot && hit(c, buttonRect(i, 1))) {
            const res = campaign.deliverRecord(k.id, h.robot.number);
            message = res.ok ? { text: `Delivered! +${fmt(k.result?.paid ?? k.payout)} credits`, color: COL.good } : { text: res.failures.join(', '), color: COL.bad };
            campaign.save().catch(() => {});
            return;
          }
          if (hit(c, buttonRect(i, 0))) {
            const can = campaign.canStartProject();
            if (!can.ok) message = { text: can.reason, color: COL.gold };
            else router.go('builder', { contractId: k.id });
            return;
          }
        }
      }
    },
    onDragStart: (p) => scroll.beginDrag(p),
    onDrag: (p) => scroll.drag(p),
    onDragEnd: (p) => scroll.endDrag(p),

    render(ctx) {
      ctx.fillStyle = COL.bg;
      ctx.fillRect(0, 0, W, renderer.height);
      topBar.render(ctx);
      const k = K();
      const counts = { offered: k.offers.length, active: `${k.active.length}/${k.maxActive}`, done: k.done.length };
      TABS.forEach((t, i) => drawButton(ctx, tabRect(i), `${t.label} ${counts[t.id]}`, { selected: tab === t.id, font: font(THEME.size.button, true), badge: t.id === 'offered' && k.offers.length && k.canAccept && tab !== 'offered' ? '!' : null }));
      const b = bodyRect();
      const sub = message?.text ?? (tab === 'offered' ? 'New offers arrive at the start of every month. Take up to 2 at once.' : tab === 'active' ? 'Build a robot for a contract, or hand over a finished one that meets it.' : 'Finished and failed contracts.');
      text(ctx, sub, b.x + 4, b.y - 36, { size: THEME.size.small, bold: !!message, color: message?.color ?? COL.textMuted, baseline: 'middle', maxWidth: b.w });

      const items = list();
      heights = items.map((c, i) => drawCard(measure, c, i, false));
      scroll.contentHeight = Math.max(1, cardTop(items.length));
      scroll.begin(ctx);
      // Empty lists (Milestone 21): a friendly line and a button to go do the thing.
      emptyHit = null;
      if (!items.length) {
        const E = {
          offered: { text: 'No contracts yet — Reception gets new offers at the start of next month.', label: 'Back to the workshop', go: () => router.go('workshop') },
          active: { text: 'No active contracts. Take one from the offers.', label: 'See the offers', go: () => (tab = 'offered') },
          done: { text: 'Nothing finished yet — deliver a robot to a contract you have taken.', label: 'See the offers', go: () => (tab = 'offered') },
        }[tab];
        const s = { art: 'ui_icon_14', text: E.text, button: { label: E.label } };
        const h = stateHeight(cw(), s);
        scroll.contentHeight = h + 10;
        emptyHit = { r: emptyState(ctx, assets, { x: 0, y: 0, w: cw(), h }, s), go: E.go };
      }
      items.forEach((c, i) => drawCard(ctx, c, i));
      scroll.end(ctx);
    },
  };

  // Draws card i — or, with draw = false, only measures it. Returns the card's height.
  function drawCard(ctx, c, i, draw = true) {
    const r = draw ? cardRect(i) : { x: 0, y: 0, w: cw(), h: 0 };
    const day = campaign.clock.totalDays;
    const seg = segmentOf(c.segment);
    const x = r.x + 184;
    const mw = r.w - 200;
    const full = r.w - 48;
    const ops = []; // [str, x, y, opts]
    let y = r.y + 18;
    const put = (str, px, w, size, opts = {}, max = 3) => {
      const ls = wrap(ctx, str, w, size, !!opts.bold, max);
      const lh = size >= THEME.size.body ? LINE : SMALL_LINE;
      ls.forEach((l, j) => ops.push([l, px, y + j * lh, { size, maxWidth: w, ...opts }]));
      y += ls.length * lh + 6;
    };
    put(c.title, x, mw - (c.story ? 180 : 0), THEME.size.body + 4, { bold: true }, 2);
    put(`${c.customer} · ${seg.name} · ${c.tier[0].toUpperCase() + c.tier.slice(1)} size`, x, mw, THEME.size.small, { color: COL.textMuted }, 2);
    if (c.blurb) put(c.blurb, x, mw, THEME.size.small, { color: COL.textMuted }, 3);
    y += 4;
    requirementLines(c).slice(1).forEach((line, j) => put(line, x, mw, THEME.size.body, { bold: j === 0 }, 2));
    const bonus = campaign.fx('contractPayoutPct');
    put(`Pays ${fmt(c.payout)}${bonus ? ` +${bonus}%` : ''}${c.prestigeTokens ? ` · +${c.prestigeTokens} Prestige Token` : ''} · +${c.reputation} Rep · fail ${c.failReputation} Rep · ${Math.round(c.specialChance * 100)}% bonus chance`, x, mw, THEME.size.body, { color: COL.gold }, 2);
    y = Math.max(y + 8, r.y + ART_H + 16);
    let h;
    const open = c.status === 'offered' || c.status === 'active';
    const hn = open ? hint(c) : null;
    if (open) {
      const left = c.status === 'active' ? Math.max(0, c.dueDay - day) : null;
      put(c.status === 'active' ? `${left} days left` : `Deadline: ${c.deadlineDays} days after you accept`, r.x + 24, full, THEME.size.body, { bold: true, color: left !== null && left < 20 ? COL.bad : COL.text }, 1);
      put(`${hn.ok ? '✓' : '✗'} ${hn.text}`, r.x + 24, full, THEME.size.body, { color: hn.ok ? COL.good : COL.action }, 3);
      // The suggested parts sit beside the button(s) at the bottom of the card.
      const btnW = c.status === 'active' && hn.robot ? BTN_W * 2 + 14 : BTN_W;
      const sugW = full - btnW - 24;
      const sug = wrap(ctx, `Suggested: ${SLOTS.map((sl) => COMPONENTS[c.suggested[sl.id]].name).join(', ')}`, sugW, THEME.size.small, false, 4);
      sug.forEach((l, j) => ops.push([l, r.x + 24, y + j * SMALL_LINE, { size: THEME.size.small, color: COL.textMuted, maxWidth: sugW }]));
      h = y - r.y + Math.max(110, sug.length * SMALL_LINE) + 24;
    } else {
      const when = campaign.clock.shortLabel(c.resolvedDay);
      if (c.status === 'success') put(`✓ Delivered ${when} · paid ${fmt(c.result?.paid ?? c.payout)}${c.result?.special ? ' + bonus Tech Chip' : ''}`, r.x + 24, full, THEME.size.body, { bold: true, color: COL.good }, 2);
      else {
        const why = { deadline: 'deadline passed', cancelled: 'cancelled' }[c.result?.reason] ?? c.result?.reason;
        put(`✗ Failed ${when} (${why}) · ${c.failReputation} Rep`, r.x + 24, full, THEME.size.body, { bold: true, color: COL.bad }, 2);
      }
      h = y - r.y + 14;
    }
    if (!draw) return h;

    const stroke = c.story ? COL.action : c.status === 'success' ? COL.good : c.status === 'failed' ? COL.bad : COL.line;
    panel(ctx, r, { stroke, lineWidth: c.story ? 5 : 3 });
    contained(ctx, assets, seg.customerArt, { x: r.x + 14, y: r.y + 14, w: 150, h: 200 }, 'bottom');
    if (c.story) text(ctx, '★ Signature', r.x + r.w - 20, r.y + 24, { size: THEME.size.small, bold: true, color: COL.action, align: 'right' });
    for (const [str, px, py, opts] of ops) text(ctx, str, px, py, opts);
    if (c.status === 'offered') {
      drawButton(ctx, buttonRect(i), campaign.contracts.canAccept ? 'Accept' : `Full (${campaign.contracts.maxActive})`, { active: campaign.contracts.canAccept, disabled: !campaign.contracts.canAccept, accent: COL.good, font: font(THEME.size.button, true) });
    } else if (c.status === 'active') {
      drawButton(ctx, buttonRect(i, 0), 'Build for this', { disabled: !campaign.canStartProject().ok, font: font(34, true) });
      if (hn.robot) drawButton(ctx, buttonRect(i, 1), `Deliver #${hn.robot.number}`, { active: true, accent: COL.good, font: font(34, true) });
    }
    return h;
  }

  return screen;
}
