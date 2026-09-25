// Rumour Archive (bible §28.1, Milestones 16–17): the secrets you know about, by clue stage.
//   1 its rumour · 2 its clue + the category of what is missing · discovered: the exact conditions, forever (from the
//   account history, with the eased numbers on a repeat run — §30.4a).
// Before the Year 16 ending it lists only secrets you have heard of — never how many there are. After the ending
// (or in New Game+) the unknown ones show as "???" too.
// Opened from the Inbox. ?debug=1 adds a "Why not?" button (the inspector).
import { ScrollPanel } from '../../../../core/ui/ScrollPanel.js';
import { drawButton } from '../../../../core/ui/Button.js';
import { SECRETS, SECRET_ART, SECRET_GROUPS } from '../../data/secrets.js';
import { ruleLines } from '../systems/secretText.js';
import { panel, text, hit, wrapText } from '../ui/widgets.js';

const HEAD_H = 130;
const LINE = 38;
const GROUP_H = 60;

export function createRumourArchiveScreen({ renderer, layout, assets, campaign, router, debugEnabled = false }) {
  const W = renderer.width;
  const scroll = new ScrollPanel({ getRect: bodyRect, contentHeight: 0 });
  let back = 'inbox';

  function headRect() {
    const sr = layout.safeRect;
    return { x: sr.x + 24, y: sr.y + 24, w: sr.w - 48, h: HEAD_H - 24 };
  }
  const backRect = () => ({ ...headRect(), w: 180, h: 86 });
  const whyRect = () => {
    const h = headRect();
    return { x: h.x + h.w - 220, y: h.y, w: 220, h: 86 };
  };
  function bodyRect() {
    const sr = layout.safeRect;
    const y = sr.y + HEAD_H + 12;
    return { x: sr.x + 24, y, w: sr.w - 48, h: sr.y + sr.h - 24 - y };
  }

  const S = () => campaign.secrets;
  // After the Year 16 ending (this run or an earlier one) or in NG+, the whole list may show.
  const postEnding = () => !!campaign.flags.endingReached || (S().accountFact('endings') ?? 0) > 0 || campaign.ngPlusRuns > 0;

  // What one row shows, and how tall it is. null = not listed.
  function rowOf(rule) {
    const stage = S().clueStage(rule.id);
    const gated = (rule.ngPlusMin ?? 0) > campaign.ngPlusRuns;
    if (stage === 3) {
      const res = S().evaluate(rule, {});
      const lines = ruleLines(res);
      return { rule, stage, lines, h: 150 + lines.length * LINE };
    }
    if (stage === 0 || gated) return postEnding() ? { rule, stage: 0, lines: [], h: 150 } : null;
    if (stage === 2) return { rule, stage, missing: S().missingCategories(S().evaluate(rule, {})), lines: [], h: 190 };
    return { rule, stage, lines: [], h: 150 };
  }

  function rows() {
    const out = [];
    for (const [g, name] of Object.entries(SECRET_GROUPS)) {
      const list = SECRETS.filter((s) => s.group === g).map(rowOf).filter(Boolean);
      if (list.length) out.push({ group: name, rows: list });
    }
    return out;
  }

  const screen = {
    scroll,
    rows,
    enter(params = {}) {
      back = params.back ?? 'inbox';
      scroll.scrollY = 0;
    },
    onTap(p) {
      if (hit(p, backRect())) return router.go(back);
      if (debugEnabled && hit(p, whyRect())) return router.go('secretdebug');
    },
    onDragStart: (p) => scroll.beginDrag(p),
    onDrag: (p) => scroll.drag(p),
    onDragEnd: (p) => scroll.endDrag(p),
    render(ctx) {
      ctx.fillStyle = '#101418';
      ctx.fillRect(0, 0, W, renderer.height);
      const h = headRect();
      drawButton(ctx, backRect(), '‹ Back', { font: 'bold 32px system-ui, sans-serif' });
      assets.drawContained(ctx, SECRET_ART.records, { x: h.x + 196, y: h.y, w: 86, h: 86 });
      text(ctx, 'Rumour Archive', h.x + 292, h.y + 43, { size: 44, bold: true, baseline: 'middle', maxWidth: h.w - 292 - (debugEnabled ? 240 : 0) });
      if (debugEnabled) drawButton(ctx, whyRect(), 'Why not?', { accent: '#FFD166', font: 'bold 30px system-ui, sans-serif' });
      const w = bodyRect().w - 12;
      scroll.begin(ctx);
      const groups = rows();
      text(ctx, groups.length ? 'Secrets you have heard about. Discovered ones show exactly what they took — for good.' : 'No rumours yet. Keep building — people talk.', 4, 8, { size: 26, color: '#9AA8B5', maxWidth: w });
      let y = 60;
      for (const g of groups) {
        text(ctx, g.group, 4, y + 12, { size: 30, bold: true, color: '#B388FF' });
        y += GROUP_H;
        for (const r of g.rows) {
          drawRow(ctx, r, y, w);
          y += r.h + 14;
        }
      }
      scroll.contentHeight = y + 20;
      scroll.end(ctx);
    },
  };

  function drawRow(ctx, r, y, w) {
    const rule = r.rule;
    const found = r.stage === 3;
    panel(ctx, { x: 0, y, w, h: r.h }, { stroke: found ? '#FFD166' : r.stage ? '#B388FF' : '#35414F', lineWidth: found ? 4 : 3 });
    assets.drawContained(ctx, found ? SECRET_ART.badge : SECRET_ART.marker, { x: 16, y: y + 20, w: 110, h: 110 });
    const x = 146;
    const mw = w - x - 20;
    if (found) {
      const got = S().run.unlocked[rule.id] ?? S().account.history[rule.id]?.first;
      text(ctx, rule.name, x, y + 20, { size: 34, bold: true, color: '#FFD166', maxWidth: mw });
      text(ctx, `${S().unlockedInRun(rule.id) ? `Discovered ${campaign.clock.shortLabel(got?.day ?? 0)}` : 'Discovered in an earlier run'}${S().isRepeat(rule.id) ? ' · repeat: easier numbers this run' : ''}`, x, y + 66, { size: 24, color: '#9AA8B5', maxWidth: mw });
      r.lines.forEach((l, i) => text(ctx, `${'   '.repeat(l.depth)}${l.ok ? '✓' : '•'} ${l.text}`, x, y + 112 + i * LINE, { size: 25, color: l.ok ? '#7CFFB2' : '#E8EEF2', maxWidth: mw }));
    } else if (r.stage === 0) {
      text(ctx, '???', x, y + 30, { size: 40, bold: true, color: '#7F8C99' });
      text(ctx, 'No rumours yet.', x, y + 86, { size: 26, color: '#7F8C99', maxWidth: mw });
    } else {
      text(ctx, r.stage === 2 ? 'A clue' : 'A rumour', x, y + 20, { size: 32, bold: true, color: '#B388FF' });
      wrapText(ctx, rule.clueStages[r.stage - 1]?.text ?? '', x, y + 66, mw, { size: 26, maxLines: 2 });
      if (r.stage === 2 && r.missing?.length) text(ctx, `Missing: ${r.missing.join(', ')}`, x, y + 142, { size: 26, bold: true, color: '#FFD166', maxWidth: mw });
    }
  }
  return screen;
}
