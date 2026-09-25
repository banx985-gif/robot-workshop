// Trophy shelf and competition records (bible §21.6, §21.7): the six trophies (won ones shine, the rest are dark
// silhouettes, the secret one stays a mystery), then every event's records.
import { ScrollPanel } from '../../../../core/ui/ScrollPanel.js';
import { drawButton } from '../../../../core/ui/Button.js';
import { COMPETITIONS, COMPETITIONS_BY_ID, TROPHIES, COMPETITION_ART } from '../../data/competitions.js';
import { TUNINGS, STRATEGIES } from '../../data/tuning.js';
import { panel, text, hit } from '../ui/widgets.js';
import { placeText, row } from '../ui/competitionDraw.js';

const HEAD_H = 130;
const SHELF_H = 400;
const REC_H = 330;
const NAME = (list, id) => list.find((x) => x.id === id)?.name ?? id;

export function createTrophyScreen({ renderer, layout, assets, campaign, router }) {
  const W = renderer.width;
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
  function bodyRect() {
    const sr = layout.safeRect;
    const h = headRect();
    const y = h.y + h.h + 20;
    return { x: sr.x + 24, y, w: sr.w - 48, h: sr.y + sr.h - 24 - y };
  }
  const cw = () => bodyRect().w - 12;
  const cellRect = (i) => {
    const w = (cw() - 32) / 3;
    return { x: (i % 3) * (w + 16), y: 70 + Math.floor(i / 3) * (SHELF_H + 16), w, h: SHELF_H };
  };

  const screen = {
    scroll,
    cellRect,
    enter() {
      scroll.scrollY = 0;
    },
    onTap(p) {
      if (hit(p, backRect())) return router.go('competitions');
      if (hit(p, rankingsRect())) return router.go('rankings');
    },
    onDragStart: (p) => scroll.beginDrag(p),
    onDrag: (p) => scroll.drag(p),
    onDragEnd: (p) => scroll.endDrag(p),
    render(ctx) {
      ctx.fillStyle = '#101418';
      ctx.fillRect(0, 0, W, renderer.height);
      const h = headRect();
      drawButton(ctx, backRect(), '‹ Back', { font: 'bold 32px system-ui, sans-serif' });
      assets.drawContained(ctx, COMPETITION_ART.trophiesIcon, { x: h.x + 216, y: h.y + 14, w: 100, h: 100 });
      text(ctx, 'Trophies', h.x + 326, h.y + h.h / 2, { size: 44, bold: true, baseline: 'middle', maxWidth: h.w - 326 - 280 });
      drawButton(ctx, rankingsRect(), 'Rankings', { accent: '#FFD166', font: 'bold 32px system-ui, sans-serif' });
      scroll.begin(ctx);
      text(ctx, `Your shelf: ${campaign.trophies.count} of ${TROPHIES.length}`, 4, 12, { size: 32, bold: true });
      TROPHIES.forEach((t, i) => drawTrophy(ctx, t, cellRect(i)));
      let y = cellRect(TROPHIES.length - 1).y + SHELF_H + 40;
      text(ctx, 'Competition records', 4, y, { size: 32, bold: true });
      y += 56;
      const entered = COMPETITIONS.filter((e) => campaign.competitions.records[e.id]?.entries);
      if (!entered.length) {
        text(ctx, 'No events entered yet.', 4, y, { size: 26, color: '#9AA8B5' });
        y += 60;
      }
      for (const e of entered) {
        drawRecord(ctx, e, y);
        y += REC_H + 16;
      }
      scroll.contentHeight = y + 30;
      scroll.end(ctx);
    },
  };

  function drawTrophy(ctx, t, r) {
    const won = campaign.trophies.awarded[t.id];
    const mystery = t.secret && !won;
    panel(ctx, r, { fill: won ? 'rgba(52,44,24,0.96)' : 'rgba(22,26,32,0.96)', stroke: won ? '#FFD166' : '#35414F', lineWidth: won ? 5 : 3 });
    // A shelf board under the trophy.
    ctx.fillStyle = won ? '#7A5A2A' : '#2A3038';
    ctx.fillRect(r.x + 16, r.y + 228, r.w - 32, 14);
    const art = { x: r.x + 20, y: r.y + 16, w: r.w - 40, h: 212 };
    if (mystery) text(ctx, '?', r.x + r.w / 2, art.y + art.h / 2, { size: 120, bold: true, align: 'center', baseline: 'middle', color: '#3A4452' });
    else {
      ctx.save();
      if (!won) {
        ctx.globalAlpha = 0.28;
        ctx.filter = 'grayscale(1) brightness(0.5)';
      }
      assets.drawContained(ctx, t.art, art, 'bottom');
      ctx.restore();
    }
    text(ctx, mystery ? '???' : t.name, r.x + r.w / 2, r.y + 258, { size: 26, bold: true, align: 'center', color: won ? '#FFD166' : '#C9D3DD', maxWidth: r.w - 20 });
    const sub = won ? `Won ${won.day != null ? campaign.clock.shortLabel(won.day) : ''}${won.eventId ? ` · ${COMPETITIONS_BY_ID[won.eventId]?.id ?? ''}` : ''}` : mystery ? 'A secret' : t.note;
    wrapCentered(ctx, sub, r.x + r.w / 2, r.y + 300, r.w - 24, won ? '#7CFFB2' : '#9AA8B5');
  }

  function wrapCentered(ctx, str, cx, y, w, color) {
    ctx.font = '21px system-ui, sans-serif';
    const words = str.split(' ');
    const lines = [];
    let cur = '';
    for (const wd of words) {
      const t = cur ? `${cur} ${wd}` : wd;
      if (ctx.measureText(t).width > w && cur) {
        lines.push(cur);
        cur = wd;
      } else cur = t;
    }
    if (cur) lines.push(cur);
    lines.slice(0, 3).forEach((l, i) => text(ctx, l, cx, y + i * 28, { size: 21, align: 'center', color, maxWidth: w }));
  }

  function drawRecord(ctx, e, y) {
    const w = cw();
    const rec = campaign.competitions.records[e.id];
    const b = rec.best;
    panel(ctx, { x: 0, y, w, h: REC_H });
    text(ctx, `${e.id} · ${e.name}`, 24, y + 16, { size: 28, bold: true, maxWidth: w - 48 });
    const lines = [
      ['Entries / wins / podiums', `${rec.entries} / ${rec.wins} / ${rec.podiums}`],
      ['Best score', b ? `${b.score.toFixed(1)} (${placeText(b.place)})` : '—'],
      ['Robot · pilot', b ? `${b.entrant} · ${b.pilot}` : '—'],
      ['Strategy', b ? `${NAME(STRATEGIES, b.strategy)} · ${NAME(TUNINGS, b.tuning)}` : '—'],
      ['Breakdowns in best run', b ? String(b.breakdowns) : '—'],
      ['Strongest segment', rec.bestSegment ? `${rec.bestSegment.score.toFixed(1)} (${rec.bestSegment.name})` : '—'],
    ];
    lines.forEach(([l, v], i) => row(ctx, l, v, 24, y + 60 + i * 44, w - 48, { size: 24 }));
  }

  return screen;
}
