// Trophy shelf and competition records (bible §21.6, §21.7): the six trophies (won ones shine, the rest are dark
// silhouettes, the secret one stays a mystery), then every event's records.
import { THEME, font } from '../../../../core/Theme.js';
import { ScrollPanel } from '../../../../core/ui/ScrollPanel.js';
import { drawButton } from '../../../../core/ui/Button.js';
import { COMPETITIONS, COMPETITIONS_BY_ID, TROPHIES, COMPETITION_ART } from '../../data/competitions.js';
import { TUNINGS, STRATEGIES } from '../../data/tuning.js';
import { panel, text, hit, emptyState, stateHeight } from '../ui/widgets.js';
import { placeText, row, wrapLines } from '../ui/competitionDraw.js';
const COL = THEME.color;

const HEAD_H = 140;
const SHELF_H = 530;
const REC_H = 400;
const S = THEME.size;
const NAME = (list, id) => list.find((x) => x.id === id)?.name ?? id;

export function createTrophyScreen({ renderer, layout, assets, campaign, router }) {
  const W = renderer.width;
  let emptyHit = null; // the empty state's button (Milestone 21)
  const scroll = new ScrollPanel({ getRect: bodyRect, contentHeight: 0 });

  function headRect() {
    const sr = layout.safeRect;
    return { x: sr.x + 24, y: sr.y + 24, w: sr.w - 48, h: HEAD_H };
  }
  const backRect = () => {
    const h = headRect();
    return { x: h.x, y: h.y + 12, w: 200, h: h.h - 24 };
  };
  const rankingsRect = () => {
    const h = headRect();
    return { x: h.x + h.w - 260, y: h.y + 12, w: 260, h: h.h - 24 };
  };
  // Room kept free left of Rankings for one more header button (a 260-wide slot).
  const spareRect = () => {
    const r = rankingsRect();
    return { x: r.x - 14 - 260, y: r.y, w: 260, h: r.h };
  };
  function bodyRect() {
    const sr = layout.safeRect;
    const h = headRect();
    const y = h.y + h.h + 20;
    return { x: sr.x + 24, y, w: sr.w - 48, h: sr.y + sr.h - 24 - y };
  }
  const cw = () => bodyRect().w - 12;
  // Two trophies a row, so their names read at body size (Milestone 18).
  const cellRect = (i) => {
    const w = (cw() - 16) / 2;
    return { x: (i % 2) * (w + 16), y: 70 + Math.floor(i / 2) * (SHELF_H + 16), w, h: SHELF_H };
  };

  const screen = {
    scroll,
    cellRect,
    spareRect,
    enter() {
      scroll.scrollY = 0;
    },
    onTap(p) {
      if (hit(p, backRect())) return router.go('competitions');
      if (hit(p, rankingsRect())) return router.go('rankings');
      if (emptyHit && scroll.contains(p) && hit(scroll.toContent(p), emptyHit.r)) return emptyHit.go();
      if (hit(p, spareRect())) return router.go('records', { back: 'trophies' }); // Milestone 18
    },
    onDragStart: (p) => scroll.beginDrag(p),
    onDrag: (p) => scroll.drag(p),
    onDragEnd: (p) => scroll.endDrag(p),
    render(ctx) {
      ctx.fillStyle = COL.bg;
      ctx.fillRect(0, 0, W, renderer.height);
      const h = headRect();
      drawButton(ctx, backRect(), '‹ Back');
      assets.drawContained(ctx, COMPETITION_ART.trophiesIcon, { x: h.x + 210, y: h.y + 24, w: 84, h: 84 });
      text(ctx, 'Trophies', h.x + 302, h.y + h.h / 2, { size: S.heading, bold: true, baseline: 'middle', maxWidth: spareRect().x - 12 - (h.x + 302) });
      drawButton(ctx, rankingsRect(), 'Rankings', { accent: COL.gold });
      drawButton(ctx, spareRect(), 'Records', { accent: COL.progress, badge: campaign.achievements.unseen || null });
      scroll.begin(ctx);
      text(ctx, `Your shelf: ${campaign.trophies.count} of ${TROPHIES.length}`, 4, 12, { size: S.body, bold: true });
      TROPHIES.forEach((t, i) => drawTrophy(ctx, t, cellRect(i)));
      let y = cellRect(TROPHIES.length - 1).y + SHELF_H + 40;
      text(ctx, 'Competition records', 4, y, { size: S.heading, bold: true });
      y += 66;
      const entered = COMPETITIONS.filter((e) => campaign.competitions.records[e.id]?.entries);
      emptyHit = null;
      if (!entered.length) {
        const s = { art: 'ui_icon_08_competition', text: 'No events entered yet — every trophy starts with one race.', button: { label: 'Competitions' } };
        const h = stateHeight(cw(), s);
        emptyHit = { r: emptyState(ctx, assets, { x: 0, y, w: cw(), h }, s), go: () => router.go('competitions') };
        y += h + 20;
      }
      for (const e of entered) {
        const rh = recHeight(e);
        drawRecord(ctx, e, y, rh);
        y += rh + 16;
      }
      scroll.contentHeight = y + 30;
      scroll.end(ctx);
    },
  };

  function drawTrophy(ctx, t, r) {
    const won = campaign.trophies.awarded[t.id];
    const mystery = t.secret && !won;
    panel(ctx, r, { fill: won ? COL.panelGold : COL.panelDim, stroke: won ? COL.gold : COL.line, lineWidth: won ? 5 : 3 });
    // A shelf board under the trophy.
    ctx.fillStyle = won ? COL.gold : COL.line;
    ctx.fillRect(r.x + 16, r.y + 250, r.w - 32, 14);
    const art = { x: r.x + 20, y: r.y + 16, w: r.w - 40, h: 234 };
    if (mystery) text(ctx, '?', r.x + r.w / 2, art.y + art.h / 2, { size: 120, bold: true, align: 'center', baseline: 'middle', color: COL.line });
    else {
      ctx.save();
      if (!won) {
        ctx.globalAlpha = 0.28;
        ctx.filter = 'grayscale(1) brightness(0.5)';
      }
      assets.drawContained(ctx, t.art, art, 'bottom');
      ctx.restore();
    }
    const nameLines = wrapLines(mystery ? '???' : t.name, r.w - 24, S.body, true).slice(0, 2);
    nameLines.forEach((l, i) => text(ctx, l, r.x + r.w / 2, r.y + 280 + i * 42, { size: S.body, bold: true, align: 'center', color: won ? COL.gold : COL.textMuted, maxWidth: r.w - 20 }));
    const sub = won ? `Won ${won.day != null ? campaign.clock.shortLabel(won.day) : ''}${won.eventId ? ` · ${COMPETITIONS_BY_ID[won.eventId]?.id ?? ''}` : ''}` : mystery ? 'A secret' : t.note;
    wrapLines(sub, r.w - 28, S.body)
      .slice(0, 3)
      .forEach((l, i) => text(ctx, l, r.x + r.w / 2, r.y + 290 + nameLines.length * 42 + i * 42, { size: S.body, align: 'center', color: won ? COL.good : COL.textMuted, maxWidth: r.w - 24 }));
  }

  function recHeight(e) {
    return 32 + wrapLines(`${e.id} · ${e.name}`, cw() - 48, S.button, true).length * 48 + 6 * 52 + 16;
  }

  function drawRecord(ctx, e, y, h) {
    const w = cw();
    const rec = campaign.competitions.records[e.id];
    const b = rec.best;
    panel(ctx, { x: 0, y, w, h });
    const title = wrapLines(`${e.id} · ${e.name}`, w - 48, S.button, true);
    title.forEach((l, i) => text(ctx, l, 24, y + 16 + i * 48, { size: S.button, bold: true, maxWidth: w - 48 }));
    const lines = [
      ['Entries / wins / podiums', `${rec.entries} / ${rec.wins} / ${rec.podiums}`],
      ['Best score', b ? `${b.score.toFixed(1)} (${placeText(b.place)})` : '—'],
      ['Robot · pilot', b ? `${b.entrant} · ${b.pilot}` : '—'],
      ['Strategy', b ? `${NAME(STRATEGIES, b.strategy)} · ${NAME(TUNINGS, b.tuning)}` : '—'],
      ['Breakdowns in best run', b ? String(b.breakdowns) : '—'],
      ['Strongest segment', rec.bestSegment ? `${rec.bestSegment.score.toFixed(1)} (${rec.bestSegment.name})` : '—'],
    ];
    const y0 = y + 24 + title.length * 48;
    lines.forEach(([l, v], i) => row(ctx, l, v, 24, y0 + i * 52, w - 48, { size: S.body }));
  }

  return screen;
}
