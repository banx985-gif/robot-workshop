// Contracts (bible §14.6–14.7): Offered / Active / Done.
// Each card: customer, requirements, pay and reputation, deadline, and a "can my robots meet this?" hint
// (a finished robot that already meets it, or what the team is expected to build with the suggested parts).
// Offered → Accept (max 2 active). Active → Build for this / Deliver a finished robot. Done → the result.
import { ScrollPanel } from '../../../../core/ui/ScrollPanel.js';
import { drawButton } from '../../../../core/ui/Button.js';
import { COMPONENTS, SLOTS } from '../../data/components.js';
import { predictBuild } from '../systems/Capability.js';
import { checkRecord, requirementLines, segmentOf } from '../systems/ContractRules.js';
import { createTopBar } from '../ui/TopBar.js';
import { panel, text, contained, hit, fmt } from '../ui/widgets.js';

const TABS = [
  { id: 'offered', label: 'Offered' },
  { id: 'active', label: 'Active' },
  { id: 'done', label: 'Done' },
];
const CARD_H = 440;
const GAP = 20;

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
  const scroll = new ScrollPanel({ getRect: bodyRect, contentHeight: 0 });
  const K = () => campaign.contracts;

  function tabRect(i) {
    const sr = layout.safeRect;
    const t = topBar.rect();
    const w = (sr.w - 48 - 2 * 16) / 3;
    return { x: sr.x + 24 + i * (w + 16), y: t.y + t.h + 16, w, h: 90 };
  }
  function bodyRect() {
    const sr = layout.safeRect;
    const t = tabRect(0);
    const y = t.y + t.h + 70;
    return { x: sr.x + 24, y, w: sr.w - 48, h: sr.y + sr.h - 24 - y };
  }
  const cw = () => bodyRect().w - 12;
  const cardRect = (i) => ({ x: 0, y: i * (CARD_H + GAP), w: cw(), h: CARD_H });
  const buttonRect = (i, n = 0) => {
    const c = cardRect(i);
    return { x: c.x + c.w - 24 - (n + 1) * 250 - n * 14, y: c.y + c.h - 24 - 84, w: 250, h: 84 };
  };

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
          message = res.ok ? { text: `Accepted: ${k.title}`, color: '#7CFFB2' } : { text: res.reason, color: '#FF8A80' };
          if (res.ok) campaign.save().catch(() => {});
          return;
        }
        if (tab === 'active') {
          const h = hint(k);
          if (h.robot && hit(c, buttonRect(i, 1))) {
            const res = campaign.deliverRecord(k.id, h.robot.number);
            message = res.ok ? { text: `Delivered! +${fmt(k.payout)} credits`, color: '#7CFFB2' } : { text: res.failures.join(', '), color: '#FF8A80' };
            campaign.save().catch(() => {});
            return;
          }
          if (hit(c, buttonRect(i, 0))) {
            if (campaign.activeProject) message = { text: 'The workshop is busy — finish the current project first', color: '#FFD166' };
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
      ctx.fillStyle = '#101418';
      ctx.fillRect(0, 0, W, renderer.height);
      topBar.render(ctx);
      const k = K();
      const counts = { offered: k.offers.length, active: `${k.active.length}/${k.maxActive}`, done: k.done.length };
      TABS.forEach((t, i) => drawButton(ctx, tabRect(i), `${t.label} ${counts[t.id]}`, { selected: tab === t.id, font: 'bold 32px system-ui, sans-serif', badge: t.id === 'offered' && k.offers.length && k.canAccept && tab !== 'offered' ? '!' : null }));
      const b = bodyRect();
      const sub = message?.text ?? (tab === 'offered' ? 'New offers arrive at the start of every month. Take up to 2 at once.' : tab === 'active' ? 'Build a robot for a contract, or hand over a finished one that meets it.' : 'Finished and failed contracts.');
      text(ctx, sub, b.x + 4, b.y - 36, { size: 26, bold: !!message, color: message?.color ?? '#9AA8B5', baseline: 'middle', maxWidth: b.w });

      const items = list();
      scroll.contentHeight = Math.max(1, items.length) * (CARD_H + GAP);
      scroll.begin(ctx);
      if (!items.length) {
        const none = { offered: 'No offers right now — check again next month.', active: 'No active contracts. Accept one from Offered.', done: 'Nothing finished yet.' }[tab];
        text(ctx, none, 4, 20, { size: 30, color: '#9AA8B5', maxWidth: cw() });
      }
      items.forEach((c, i) => drawCard(ctx, c, i));
      scroll.end(ctx);
    },
  };

  function drawCard(ctx, c, i) {
    const r = cardRect(i);
    const day = campaign.clock.totalDays;
    const seg = segmentOf(c.segment);
    const stroke = c.story ? '#FFB74D' : c.status === 'success' ? '#7CFFB2' : c.status === 'failed' ? '#FF8A80' : '#35414F';
    panel(ctx, r, { stroke, lineWidth: c.story ? 5 : 3 });
    contained(ctx, assets, seg.customerArt, { x: r.x + 14, y: r.y + 14, w: 150, h: 200 }, 'bottom');
    const x = r.x + 184;
    const mw = r.w - 200;
    text(ctx, c.title, x, r.y + 20, { size: 34, bold: true, maxWidth: mw - (c.story ? 150 : 0) });
    if (c.story) text(ctx, '★ Signature', r.x + r.w - 20, r.y + 24, { size: 24, bold: true, color: '#FFB74D', align: 'right' });
    text(ctx, `${c.customer} · ${seg.name} · ${c.tier[0].toUpperCase() + c.tier.slice(1)} size`, x, r.y + 64, { size: 24, color: '#9AA8B5', maxWidth: mw });
    if (c.blurb) text(ctx, c.blurb, x, r.y + 96, { size: 22, color: '#C9D3DD', maxWidth: mw });
    requirementLines(c).slice(1).forEach((line, j) => text(ctx, line, x, r.y + 134 + j * 36, { size: 27, bold: j === 0, color: '#E8EEF2', maxWidth: mw }));
    text(ctx, `Pays ${fmt(c.payout)} · +${c.reputation} Rep · fail ${c.failReputation} Rep · ${Math.round(c.specialChance * 100)}% bonus chance`, x, r.y + 210, { size: 24, color: '#FFD166', maxWidth: mw });

    const y2 = r.y + 250;
    if (c.status === 'offered' || c.status === 'active') {
      const left = c.status === 'active' ? Math.max(0, c.dueDay - day) : null;
      text(ctx, c.status === 'active' ? `${left} days left` : `Deadline: ${c.deadlineDays} days after you accept`, r.x + 24, y2, { size: 28, bold: true, color: left !== null && left < 20 ? '#FF8A80' : '#E8EEF2', maxWidth: r.w - 48 });
      const h = hint(c);
      text(ctx, `${h.ok ? '✓' : '✗'} ${h.text}`, r.x + 24, y2 + 42, { size: 25, color: h.ok ? '#7CFFB2' : '#FFB74D', maxWidth: r.w - 48 });
      text(ctx, `Suggested: ${SLOTS.map((s) => COMPONENTS[c.suggested[s.id]].name).join(', ')}`, r.x + 24, y2 + 78, { size: 22, color: '#7F8C99', maxWidth: r.w - 48 - 280 });
      if (c.status === 'offered') {
        drawButton(ctx, buttonRect(i), campaign.contracts.canAccept ? 'Accept' : `Full (${campaign.contracts.maxActive})`, { active: campaign.contracts.canAccept, disabled: !campaign.contracts.canAccept, accent: '#7CFFB2', font: 'bold 34px system-ui, sans-serif' });
      } else {
        drawButton(ctx, buttonRect(i, 0), 'Build for this', { disabled: !!campaign.activeProject, font: 'bold 30px system-ui, sans-serif' });
        if (h.robot) drawButton(ctx, buttonRect(i, 1), `Deliver #${h.robot.number}`, { active: true, accent: '#7CFFB2', font: 'bold 30px system-ui, sans-serif' });
      }
      return;
    }
    const when = campaign.clock.shortLabel(c.resolvedDay);
    if (c.status === 'success') {
      text(ctx, `✓ Delivered ${when} · paid ${fmt(c.payout)}${c.result?.special ? ' + bonus Tech Chip' : ''}`, r.x + 24, y2, { size: 30, bold: true, color: '#7CFFB2', maxWidth: r.w - 48 });
    } else {
      const why = { deadline: 'deadline passed', cancelled: 'cancelled' }[c.result?.reason] ?? c.result?.reason;
      text(ctx, `✗ Failed ${when} (${why}) · ${c.failReputation} Rep`, r.x + 24, y2, { size: 30, bold: true, color: '#FF8A80', maxWidth: r.w - 48 });
    }
  }

  return screen;
}
