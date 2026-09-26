// Combo Archive (bible §12.2): every combo in order. Discovered ones (this run, or known from an earlier run)
// show their exact recipe and reward; combos the player got close to show their vague clue; the rest stay "???".
// Hidden prestige combos give no clue at all, and SYN20 stays a secret until Milestone 17.
// params.back / params.backParams: where Back goes (default the workshop).
import { THEME, font } from '../../../../core/Theme.js';
import { ScrollPanel } from '../../../../core/ui/ScrollPanel.js';
import { drawButton } from '../../../../core/ui/Button.js';
import { SYNERGIES, SYNERGY_ART } from '../../data/synergies.js';
import { recipeText, rewardText, lookOf } from '../systems/Synergies.js';
import { panel, text, hit } from '../ui/widgets.js';
import { wrapLines } from '../ui/competitionDraw.js';
const COL = THEME.color;

const HEAD_H = 150;
const GAP = 14;
const ICON_W = 150;
const S = THEME.size;
const TIER = { normal: ['Combo', COL.progress], advanced: ['Advanced', COL.purple], prestige: ['Prestige', COL.gold] };

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
    return { x: h.x, y: h.y, w: 200, h: 110 };
  };
  function bodyRect() {
    const sr = layout.safeRect;
    const y = sr.y + HEAD_H + 12;
    return { x: sr.x + 24, y, w: sr.w - 48, h: sr.y + sr.h - 24 - y };
  }
  const cw = () => bodyRect().w - 12;

  const archive = () => campaign.synergyArchive;

  // The intro lines at the top (wrapped), then each row sized to its wrapped text (Milestone 18: §33.2 sizes).
  function introOps() {
    const a = archive();
    const counts = { found: 0, known: 0, clue: 0 };
    for (const s of SYNERGIES) counts[a.state(s.id)] = (counts[a.state(s.id)] ?? 0) + 1;
    const w = cw();
    const ops = [];
    let y = 8;
    for (const l of wrapLines(`Found this run: ${counts.found} of ${SYNERGIES.length}${counts.known ? ` · known from earlier runs: ${counts.known}` : ''} · clues: ${counts.clue}`, w - 8, S.body, true)) {
      ops.push([l, 4, y, { size: S.body, bold: true, maxWidth: w }]);
      y += 42;
    }
    y += 4;
    for (const l of wrapLines('Some part mixes work better together. Get close and the builder gives you a clue.', w - 8, S.small)) {
      ops.push([l, 4, y, { size: S.small, color: COL.textMuted, maxWidth: w }]);
      y += 36;
    }
    return { ops, h: y + 16 };
  }

  function rowLayout(s) {
    const a = archive();
    const st = a.state(s.id); // found · known · clue · unknown
    const open = st === 'found' || st === 'known';
    const [tierName, tierColor] = TIER[s.tier];
    const mw = cw() - (ICON_W + 50);
    const x = ICON_W + 30;
    const ops = [];
    let y = 18;
    const put = (str, size, opts = {}, maxLines = 4) => {
      const lh = Math.round(size * 1.26);
      wrapLines(str, mw, size, !!opts.bold)
        .slice(0, maxLines)
        .forEach((l) => {
          ops.push([l, x, y, { size, maxWidth: mw, ...opts }]);
          y += lh;
        });
    };
    if (open || !s.hidden) {
      ops.push([tierName, x, y, { size: S.small, bold: true, color: tierColor }]);
      y += 38;
    }
    put(open ? `${s.id} · ${s.name}` : `${s.id} · ???`, S.button, { bold: true, color: open ? COL.text : COL.textMuted }, 2);
    y += 6;
    if (open) {
      put(recipeText(s), S.body);
      put(rewardText(s), S.body, { bold: true, color: COL.good });
      const f = a.run.found[s.id];
      const status = st === 'found' ? `Found ${f?.day != null ? campaign.clock.shortLabel(f.day) : 'this run'}${f?.robot ? ` · ${f.robot}` : ''}` : 'Known from an earlier run — build it again for its discovery RP';
      put(status, S.small, { color: st === 'found' ? tierColor : COL.textMuted });
    } else if (st === 'clue') {
      put('Clue', S.small, { bold: true, color: COL.progress });
      put(s.hint, S.body, { color: COL.progress });
    } else {
      const why = s.locked ? 'A secret. Nobody knows how to make this one… yet.' : s.hidden ? 'A prestige secret — no clues. You will know it when you see it.' : 'Not found yet. Get within one part of it and a clue appears in the builder.';
      put(why, S.body, { color: COL.textMuted });
    }
    return { st, open, tierColor, ops, h: Math.max(230, y + 20) };
  }

  const rowRect = (i) => {
    let y = introOps().h;
    for (let k = 0; k < i; k++) y += rowLayout(SYNERGIES[k]).h + GAP;
    return { x: 0, y, w: cw(), h: rowLayout(SYNERGIES[i]).h };
  };

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
      ctx.fillStyle = COL.bg;
      ctx.fillRect(0, 0, W, renderer.height);
      const h = headRect();
      drawButton(ctx, backRect(), '‹ Back');
      assets.drawContained(ctx, SYNERGY_ART.icon, { x: h.x + 220, y: h.y + 10, w: 90, h: 90 });
      text(ctx, 'Combo Archive', h.x + 322, h.y + 55, { size: 46, bold: true, baseline: 'middle', maxWidth: h.w - 326 });

      const intro = introOps();
      const rows = SYNERGIES.map(rowLayout);
      scroll.contentHeight = intro.h + rows.reduce((t, r) => t + r.h + GAP, 0) + 20;
      scroll.begin(ctx);
      for (const [str, x, y, opts] of intro.ops) text(ctx, str, x, y, opts);
      let y = intro.h;
      SYNERGIES.forEach((s, i) => {
        drawRow(ctx, s, rows[i], { x: 0, y, w: cw(), h: rows[i].h });
        y += rows[i].h + GAP;
      });
      scroll.end(ctx);
    },
  };

  function drawRow(ctx, s, L, r) {
    const { st, open, tierColor } = L;
    panel(ctx, r, { fill: open ? COL.panel : COL.panelDim, stroke: st === 'found' ? tierColor : st === 'clue' ? COL.progress : COL.line, lineWidth: st === 'found' ? 5 : 3 });
    const icon = { x: r.x + 14, y: r.y + 20, w: ICON_W, h: Math.min(r.h - 40, 200) };
    const look = lookOf(s.id);
    ctx.save();
    if (!open) ctx.globalAlpha = st === 'clue' ? 0.55 : 0.8;
    assets.drawContained(ctx, open ? (look ? look.art : SYNERGY_ART.icon) : st === 'clue' ? SYNERGY_ART.icon : SYNERGY_ART.secret, icon);
    ctx.restore();
    for (const [str, x, y, opts] of L.ops) text(ctx, str, r.x + x, r.y + y, opts);
  }

  return screen;
}
