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
import { drawMarker, rivalOf, PLAYER_COLOR, wrapLines } from '../ui/competitionDraw.js';
const COL = THEME.color;

const HEAD_H = 140;
const ROW_H = 92;
const S = THEME.size;
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
      drawButton(ctx, backRect(), '‹ Back');
      assets.drawContained(ctx, COMPETITION_ART.rankingsIcon, { x: h.x + 216, y: h.y + 14, w: 100, h: 100 });
      text(ctx, 'Rankings', h.x + 326, h.y + h.h / 2, { size: 44, bold: true, baseline: 'middle', maxWidth: h.w - 326 - 280 });
      drawButton(ctx, trophiesRect(), 'Trophies', { accent: COL.gold });
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
    panel(ctx, { x: 0, y, w, h: 170 });
    text(ctx, 'Company Rank', 24, y + 18, { size: S.small, color: COL.textMuted });
    text(ctx, RANKS[i].id, 24, y + 58, { size: 80, bold: true, color: COL.gold });
    text(ctx, `${fmt(rep.value)} reputation`, 210, y + 56, { size: S.body, bold: true, maxWidth: w - 230 });
    text(ctx, next ? `Rank ${next.id} at ${fmt(next.min)}` : 'Top rank reached', 210, y + 106, { size: S.small, color: COL.textMuted, maxWidth: w - 230 });
    return y + 170;
  }

  function drawTable(ctx, y) {
    const w = cw();
    const rows = campaign.rankings.table(campaign.rankingIds());
    const any = campaign.rankings.events > 0;
    const h = 176 + (any ? rows.length * ROW_H : 70);
    panel(ctx, { x: 0, y, w, h });
    text(ctx, 'Competition rankings', 24, y + 18, { size: S.heading, bold: true, maxWidth: w - 48 });
    text(ctx, `Points per event: ${RANKING_POINTS.join('/')} × event size`, 24, y + 76, { size: S.small, color: COL.textMuted, maxWidth: w - 48 });
    const cols = [w - 414, w - 294, w - 154, w - 24];
    ['pts', 'wins', 'podiums', 'events'].forEach((l, i) => text(ctx, l, cols[i], y + 122, { size: S.small, color: COL.textMuted, align: 'right' }));
    if (!any) {
      text(ctx, 'Enter a competition to join the rankings.', 24, y + 170, { size: S.body, color: COL.textMuted, maxWidth: w - 48 });
      return y + h;
    }
    const art = robotArtOf(campaign.history.latest()?.result);
    rows.forEach((r, i) => {
      const ry = y + 164 + i * ROW_H;
      const me = r.id === 'player';
      if (me) {
        ctx.fillStyle = COL.panelGood;
        ctx.fillRect(8, ry, w - 16, ROW_H - 4);
      }
      text(ctx, String(r.position), 46, ry + ROW_H / 2, { size: S.body, bold: true, align: 'center', baseline: 'middle', color: me ? PLAYER_COLOR : COL.textMuted });
      drawMarker(ctx, assets, 124, ry + ROW_H / 2, 68, { player: me, rivalId: r.id, robotArt: art, shown });
      text(ctx, me ? 'Your workshop' : rivalOf(r.id, shown).name, 172, ry + ROW_H / 2, { size: S.body, bold: me, baseline: 'middle', color: me ? PLAYER_COLOR : COL.text, maxWidth: cols[0] - 90 - 172 });
      [r.points, r.wins, r.podiums, r.entries].forEach((v, k) => text(ctx, String(v), cols[k], ry + ROW_H / 2, { size: S.body, bold: !k, align: 'right', baseline: 'middle', color: me ? PLAYER_COLOR : COL.text }));
    });
    return y + h;
  }

  // A rival card's wrapped lines (so the card grows to fit).
  function rivalLines(rv, mw) {
    const row = campaign.rankings.rows[rv.id];
    const vs = row && row.aheadOfFocus + row.behindFocus ? `Against you: finished ahead ${row.aheadOfFocus}×, behind ${row.behindFocus}×` : 'Not raced against you yet';
    const out = [];
    const add = (str, size, opts) => wrapLines(str, mw, size, !!opts.bold).forEach((l) => out.push([l, size, opts]));
    add(`${rv.id} · ${rv.name}`, S.button, { bold: true, color: rv.color });
    add(`${rv.identity} · strong at ${rv.strength.toLowerCase()}`, S.small, { color: COL.textMuted });
    add(vs, S.body, {});
    add(`Gets ${rv.growthPctPerYear}% stronger every year (a fixed curve — they never copy your scores)`, S.small, { color: COL.textMuted });
    return out;
  }

  function drawRivals(ctx, y) {
    const w = cw();
    const list = campaign.rivals.visible(shown);
    text(ctx, 'Rival companies', 4, y, { size: S.heading, bold: true });
    y += 64;
    const x0 = 170;
    const mw = w - x0 - 20;
    for (const rv of list) {
      const lines = rivalLines(rv, mw);
      const h = Math.max(RIVAL_H, 32 + lines.reduce((t, [, size]) => t + Math.round(size * 1.28), 0));
      const r = { x: 0, y, w, h };
      panel(ctx, r, { stroke: rv.color, lineWidth: 3 });
      if (rv.manager) assets.drawContained(ctx, rv.manager, { x: r.x + 10, y: r.y + 10, w: 130, h: RIVAL_H - 20 }, 'bottom');
      else assets.drawContained(ctx, rv.logo, { x: r.x + 20, y: r.y + 35, w: 110, h: 110 });
      if (rv.manager) assets.drawContained(ctx, rv.logo, { x: r.x + 100, y: r.y + RIVAL_H - 64, w: 54, h: 54 });
      let ly = r.y + 16;
      for (const [l, size, opts] of lines) {
        text(ctx, l, x0, ly, { size, maxWidth: mw, ...opts });
        ly += Math.round(size * 1.28);
      }
      y += h + 14;
    }
    return y;
  }

  function drawBestRobots(ctx, y) {
    const w = cw();
    const recs = COMPETITIONS.filter((e) => campaign.competitions.records[e.id]?.best);
    const RH = 92;
    const h = 90 + Math.max(1, recs.length) * RH;
    panel(ctx, { x: 0, y, w, h });
    text(ctx, 'Best robot at each event', 24, y + 18, { size: S.heading, bold: true, maxWidth: w - 48 });
    if (!recs.length) text(ctx, 'No finishes yet.', 24, y + 90, { size: S.body, color: COL.textMuted });
    recs.forEach((e, i) => {
      const b = campaign.competitions.records[e.id].best;
      const ry = y + 84 + i * RH;
      text(ctx, `${e.id} ${e.name}`, 24, ry, { size: S.small, color: COL.textMuted, maxWidth: w - 48 });
      text(ctx, `${b.entrant} · ${b.score.toFixed(1)}`, 24, ry + 38, { size: S.body, bold: true, maxWidth: w - 48 });
    });
    return y + h;
  }

  return screen;
}
