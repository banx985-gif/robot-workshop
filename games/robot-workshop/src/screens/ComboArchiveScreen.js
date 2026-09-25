// Combo Archive (bible §12.2): every combo in order. Discovered ones (this run, or known from an earlier run)
// show their exact recipe and reward; combos the player got close to show their vague clue; the rest stay "???".
// Hidden prestige combos give no clue at all, and SYN20 stays a secret until Milestone 17.
// params.back / params.backParams: where Back goes (default the workshop).
import { ScrollPanel } from '../../../../core/ui/ScrollPanel.js';
import { drawButton } from '../../../../core/ui/Button.js';
import { SYNERGIES, SYNERGY_ART } from '../../data/synergies.js';
import { recipeText, rewardText, lookOf } from '../systems/Synergies.js';
import { panel, text, hit, wrapText } from '../ui/widgets.js';

const HEAD_H = 130;
const ROW_H = 270;
const TOP = 110;
const TIER = { normal: ['Combo', '#4FC3F7'], advanced: ['Advanced', '#B388FF'], prestige: ['Prestige', '#FFD166'] };

export function createComboArchiveScreen({ renderer, layout, assets, campaign, router }) {
  const W = renderer.width;
  let back = 'workshop';
  let backParams = {};
  let resumeOnExit = false;
  const scroll = new ScrollPanel({ getRect: bodyRect, contentHeight: 0 });

  function headRect() {
    const sr = layout.safeRect;
    return { x: sr.x + 24, y: sr.y + 24, w: sr.w - 48, h: HEAD_H - 24 };
  }
  const backRect = () => {
    const h = headRect();
    return { x: h.x, y: h.y, w: 180, h: 86 };
  };
  function bodyRect() {
    const sr = layout.safeRect;
    const y = sr.y + HEAD_H + 12;
    return { x: sr.x + 24, y, w: sr.w - 48, h: sr.y + sr.h - 24 - y };
  }
  const cw = () => bodyRect().w - 12;
  const rowRect = (i) => ({ x: 0, y: TOP + i * (ROW_H + 14), w: cw(), h: ROW_H });

  const archive = () => campaign.synergyArchive;

  const screen = {
    scroll,
    rowRect,
    enter(params = {}) {
      back = params.back ?? 'workshop';
      backParams = params.backParams ?? {};
      scroll.scrollY = 0;
      resumeOnExit = !campaign.clock.paused;
      campaign.clock.pause();
    },
    exit() {
      if (resumeOnExit && !campaign.closed) campaign.clock.resume();
    },
    onTap(p) {
      if (hit(p, backRect())) router.go(back, backParams);
    },
    onDragStart: (p) => scroll.beginDrag(p),
    onDrag: (p) => scroll.drag(p),
    onDragEnd: (p) => scroll.endDrag(p),

    render(ctx) {
      ctx.fillStyle = '#101418';
      ctx.fillRect(0, 0, W, renderer.height);
      const h = headRect();
      drawButton(ctx, backRect(), '‹ Back', { font: 'bold 32px system-ui, sans-serif' });
      assets.drawContained(ctx, SYNERGY_ART.icon, { x: h.x + 200, y: h.y + 4, w: 80, h: 80 });
      text(ctx, 'Combo Archive', h.x + 296, h.y + 43, { size: 46, bold: true, baseline: 'middle', maxWidth: h.w - 300 });

      const a = archive();
      const counts = { found: 0, known: 0, clue: 0 };
      for (const s of SYNERGIES) counts[a.state(s.id)] = (counts[a.state(s.id)] ?? 0) + 1;
      scroll.contentHeight = TOP + SYNERGIES.length * (ROW_H + 14) + 20;
      scroll.begin(ctx);
      const w = cw();
      text(ctx, `Found this run: ${counts.found} of ${SYNERGIES.length}${counts.known ? ` · known from earlier runs: ${counts.known}` : ''} · clues: ${counts.clue}`, 4, 8, { size: 28, bold: true, maxWidth: w });
      text(ctx, 'Some part mixes work better together. Get close and the builder gives you a clue.', 4, 54, { size: 24, color: '#9AA8B5', maxWidth: w });
      SYNERGIES.forEach((s, i) => drawRow(ctx, s, rowRect(i)));
      scroll.end(ctx);
    },
  };

  function drawRow(ctx, s, r) {
    const a = archive();
    const st = a.state(s.id); // found · known · clue · unknown
    const open = st === 'found' || st === 'known';
    const [tierName, tierColor] = TIER[s.tier];
    panel(ctx, r, { fill: open ? 'rgba(26,32,40,0.96)' : 'rgba(20,24,30,0.96)', stroke: st === 'found' ? tierColor : st === 'clue' ? '#4FC3F7' : '#2A323C', lineWidth: st === 'found' ? 5 : 3 });
    const icon = { x: r.x + 14, y: r.y + 20, w: 170, h: r.h - 40 };
    const look = lookOf(s.id);
    ctx.save();
    if (!open) ctx.globalAlpha = st === 'clue' ? 0.55 : 0.8;
    assets.drawContained(ctx, open ? (look ? look.art : SYNERGY_ART.icon) : st === 'clue' ? SYNERGY_ART.icon : SYNERGY_ART.secret, icon);
    ctx.restore();

    const x = r.x + 206;
    const mw = r.w - 220;
    const title = open ? `${s.id} · ${s.name}` : `${s.id} · ???`;
    text(ctx, title, x, r.y + 18, { size: 34, bold: true, color: open ? '#FFFFFF' : '#AEB8C2', maxWidth: mw - 200 });
    if (open || !s.hidden) text(ctx, tierName, r.x + r.w - 20, r.y + 24, { size: 24, bold: true, color: tierColor, align: 'right' });

    if (open) {
      wrapText(ctx, recipeText(s), x, r.y + 66, mw, { size: 25, color: '#E8EEF2', maxLines: 3 });
      text(ctx, rewardText(s), x, r.y + 172, { size: 26, bold: true, color: '#7CFFB2', maxWidth: mw });
      const f = a.run.found[s.id];
      const status = st === 'found' ? `Found ${f?.day != null ? campaign.clock.shortLabel(f.day) : 'this run'}${f?.robot ? ` · ${f.robot}` : ''}` : 'Known from an earlier run — build it again for its discovery RP';
      text(ctx, status, x, r.y + 218, { size: 24, color: st === 'found' ? tierColor : '#9AA8B5', maxWidth: mw });
      return;
    }
    if (st === 'clue') {
      text(ctx, 'Clue', x, r.y + 66, { size: 24, bold: true, color: '#4FC3F7' });
      wrapText(ctx, s.hint, x, r.y + 102, mw, { size: 26, color: '#C9E8F7', maxLines: 3 });
      return;
    }
    const why = s.locked ? 'A secret. Nobody knows how to make this one… yet.' : s.hidden ? 'A prestige secret — no clues. You will know it when you see it.' : 'Not found yet. Get within one part of it and a clue appears in the builder.';
    wrapText(ctx, why, x, r.y + 76, mw, { size: 25, color: '#8C98A5', maxLines: 3 });
  }

  return screen;
}
