// Rankings (bible §23 "Rankings"): company rank, the competition league table (player + rivals, updated after every
// event), the rival companies (§22) and the best robot for each event.
import { THEME, font } from '../../../../core/Theme.js';
import { ScrollPanel } from '../../../../core/ui/ScrollPanel.js';
import { drawButton } from '../../../../core/ui/Button.js';
import { COMPETITIONS, COMPETITION_ART } from '../../data/competitions.js';
import { RANKING_POINTS } from '../../data/competitions.js';
import { RANKS } from '../../data/economy.js';
import { robotArtOf } from '../systems/robotVisual.js';
import { panel, text, hit, fmt } from '../ui/widgets.js';
import { drawMarker, rivalOf, PLAYER_COLOR } from '../ui/competitionDraw.js';
const COL = THEME.color;

const HEAD_H = 140;
const ROW_H = 84;
const RIVAL_H = 190;

export function createRankingsScreen({ renderer, layout, assets, campaign, router }) {
  const W = renderer.width;
  const scroll = new ScrollPanel({ getRect: bodyRect, contentHeight: 0 });
  const shown = (id) => campaign.rivalShown(id);

  function headRect() {
    const sr = layout.safeRect;
    return { x: sr.x + 24, y: sr.y + 24, w: sr.w - 48, h: HEAD_H };
  }
  const backRect = () => {
    const h = headRect();
    return { x: h.x, y: h.y + 12, w: 200, h: h.h - 24 };
  };
  const trophiesRect = () => {
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

  const screen = {
    scroll,
    enter() {
      scroll.scrollY = 0;
    },
    onTap(p) {
      if (hit(p, backRect())) return router.go('competitions');
      if (hit(p, trophiesRect())) return router.go('trophies');
    },
    onDragStart: (p) => scroll.beginDrag(p),
    onDrag: (p) => scroll.drag(p),
    onDragEnd: (p) => scroll.endDrag(p),
    render(ctx) {
      ctx.fillStyle = COL.bg;
      ctx.fillRect(0, 0, W, renderer.height);
      const h = headRect();
      drawButton(ctx, backRect(), '‹ Back', { font: font(32, true) });
      assets.drawContained(ctx, COMPETITION_ART.rankingsIcon, { x: h.x + 216, y: h.y + 14, w: 100, h: 100 });
      text(ctx, 'Rankings', h.x + 326, h.y + h.h / 2, { size: 44, bold: true, baseline: 'middle', maxWidth: h.w - 326 - 280 });
      drawButton(ctx, trophiesRect(), 'Trophies', { accent: COL.gold, font: font(32, true) });
      scroll.begin(ctx);
      let y = 0;
      y = drawCompany(ctx, y);
      y = drawTable(ctx, y + 20);
      y = drawRivals(ctx, y + 20);
      y = drawBestRobots(ctx, y + 20);
      scroll.contentHeight = y + 30;
      scroll.end(ctx);
    },
  };

  function drawCompany(ctx, y) {
    const w = cw();
    const rep = campaign.reputation;
    const i = rep.highestRankIndex;
    const next = RANKS[i + 1];
    panel(ctx, { x: 0, y, w, h: 150 });
    text(ctx, 'Company Rank', 24, y + 20, { size: 28, color: COL.textMuted });
    text(ctx, RANKS[i].id, 24, y + 56, { size: 72, bold: true, color: COL.gold });
    text(ctx, `${fmt(rep.value)} reputation`, 200, y + 66, { size: 32, bold: true, maxWidth: w - 220 });
    text(ctx, next ? `Rank ${next.id} at ${fmt(next.min)}` : 'Top rank reached', 200, y + 108, { size: 24, color: COL.textMuted, maxWidth: w - 220 });
    return y + 150;
  }

  function drawTable(ctx, y) {
    const w = cw();
    const rows = campaign.rankings.table(campaign.rankingIds());
    const any = campaign.rankings.events > 0;
    const h = 110 + (any ? rows.length * ROW_H : 60);
    panel(ctx, { x: 0, y, w, h });
    text(ctx, 'Competition rankings', 24, y + 18, { size: 32, bold: true });
    text(ctx, `Points per event: ${RANKING_POINTS.join('/')} × event size`, 24, y + 60, { size: 21, color: COL.textMuted, maxWidth: w - 48 });
    const cols = [w - 330, w - 230, w - 130, w - 24];
    ['pts', 'wins', 'podiums', 'events'].forEach((l, i) => text(ctx, l, cols[i], y + 60, { size: 21, color: COL.textMuted, align: 'right' }));
    if (!any) {
      text(ctx, 'Enter a competition to join the rankings.', 24, y + 110, { size: 28, color: COL.textMuted });
      return y + h;
    }
    const art = robotArtOf(campaign.history.latest()?.result);
    rows.forEach((r, i) => {
      const ry = y + 100 + i * ROW_H;
      const me = r.id === 'player';
      if (me) {
        ctx.fillStyle = COL.panelGood;
        ctx.fillRect(8, ry, w - 16, ROW_H - 4);
      }
      text(ctx, String(r.position), 50, ry + ROW_H / 2, { size: 32, bold: true, align: 'center', baseline: 'middle', color: me ? PLAYER_COLOR : COL.textMuted });
      drawMarker(ctx, assets, 130, ry + ROW_H / 2, 62, { player: me, rivalId: r.id, robotArt: art, shown });
      text(ctx, me ? 'Your workshop' : rivalOf(r.id, shown).name, 176, ry + ROW_H / 2, { size: 27, bold: me, baseline: 'middle', color: me ? PLAYER_COLOR : COL.text, maxWidth: cols[0] - 90 - 176 });
      [r.points, r.wins, r.podiums, r.entries].forEach((v, k) => text(ctx, String(v), cols[k], ry + ROW_H / 2, { size: k ? 26 : 30, bold: !k, align: 'right', baseline: 'middle', color: me ? PLAYER_COLOR : COL.text }));
    });
    return y + h;
  }

  function drawRivals(ctx, y) {
    const w = cw();
    const list = campaign.rivals.visible(shown);
    text(ctx, 'Rival companies', 4, y, { size: 32, bold: true });
    y += 50;
    list.forEach((rv, i) => {
      const r = { x: 0, y: y + i * (RIVAL_H + 14), w, h: RIVAL_H };
      panel(ctx, r, { stroke: rv.color, lineWidth: 3 });
      if (rv.manager) assets.drawContained(ctx, rv.manager, { x: r.x + 10, y: r.y + 10, w: 130, h: r.h - 20 }, 'bottom');
      else assets.drawContained(ctx, rv.logo, { x: r.x + 20, y: r.y + 35, w: 110, h: 110 });
      if (rv.manager) assets.drawContained(ctx, rv.logo, { x: r.x + 100, y: r.y + r.h - 64, w: 54, h: 54 });
      const x = r.x + 170;
      const mw = r.w - 190;
      text(ctx, `${rv.id} · ${rv.name}`, x, r.y + 16, { size: 30, bold: true, color: rv.color, maxWidth: mw });
      text(ctx, `${rv.identity} · strong at ${rv.strength.toLowerCase()}`, x, r.y + 58, { size: 23, color: COL.textMuted, maxWidth: mw });
      const row = campaign.rankings.rows[rv.id];
      const vs = row && row.aheadOfFocus + row.behindFocus ? `Against you: finished ahead ${row.aheadOfFocus}×, behind ${row.behindFocus}×` : 'Not raced against you yet';
      text(ctx, vs, x, r.y + 96, { size: 23, maxWidth: mw });
      text(ctx, `Gets ${rv.growthPctPerYear}% stronger every year (a fixed curve — they never copy your scores)`, x, r.y + 134, { size: 20, color: COL.textMuted, maxWidth: mw });
    });
    return y + list.length * (RIVAL_H + 14);
  }

  function drawBestRobots(ctx, y) {
    const w = cw();
    const recs = COMPETITIONS.filter((e) => campaign.competitions.records[e.id]?.best);
    const h = 76 + Math.max(1, recs.length) * 50;
    panel(ctx, { x: 0, y, w, h });
    text(ctx, 'Best robot at each event', 24, y + 18, { size: 32, bold: true });
    if (!recs.length) text(ctx, 'No finishes yet.', 24, y + 76, { size: 26, color: COL.textMuted });
    recs.forEach((e, i) => {
      const b = campaign.competitions.records[e.id].best;
      const ry = y + 72 + i * 50;
      text(ctx, `${e.id} ${e.name}`, 24, ry, { size: 24, color: COL.textMuted, maxWidth: w * 0.45 });
      text(ctx, `${b.entrant} · ${b.score.toFixed(1)}`, w - 24, ry, { size: 24, bold: true, align: 'right', maxWidth: w * 0.5 });
    });
    return y + h;
  }

  return screen;
}
