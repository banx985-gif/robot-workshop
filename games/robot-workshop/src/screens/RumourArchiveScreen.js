// Rumour Archive (bible §28.1, Milestones 16–17): the secrets you know about, by clue stage.
//   1 its rumour · 2 its clue + the category of what is missing · discovered: the exact conditions, forever (from the
//   account history, with the eased numbers on a repeat run — §30.4a).
// Before the Year 16 ending it lists only secrets you have heard of — never how many there are. After the ending
// (or in New Game+) the unknown ones show as "???" too.
// Milestone 19: the encrypted invitation from the Year 16 ending sits at the top — scrambled until its secret is found.
// Opened from the Inbox. ?debug=1 adds a "Why not?" button (the inspector).
import { THEME, font } from '../../../../core/Theme.js';
import { ScrollPanel } from '../../../../core/ui/ScrollPanel.js';
import { drawButton } from '../../../../core/ui/Button.js';
import { SECRETS, SECRET_ART, SECRET_GROUPS } from '../../data/secrets.js';
import { ruleLines } from '../systems/secretText.js';
import { panel, text, hit } from '../ui/widgets.js';
import { wrapLines } from '../ui/competitionDraw.js';
import { INVITATION, ENDING_ART } from '../../data/ending.js';
import { scramble } from '../systems/invitationText.js';
import { FINAL_BADGE } from '../../data/ngplus.js';
const COL = THEME.color;

const HEAD_H = 150;
const LINE = 38;
const GROUP_H = 70;
const SZ = THEME.size;

export function createRumourArchiveScreen({ renderer, layout, assets, campaign, router, debugEnabled = false }) {
  const W = renderer.width;
  const scroll = new ScrollPanel({ getRect: bodyRect, contentHeight: 0 });
  let back = 'inbox';

  function headRect() {
    const sr = layout.safeRect;
    return { x: sr.x + 24, y: sr.y + 24, w: sr.w - 48, h: HEAD_H - 24 };
  }
  const backRect = () => ({ ...headRect(), w: 200, h: 110 });
  const whyRect = () => {
    const h = headRect();
    return { x: h.x + h.w - 230, y: h.y, w: 230, h: 110 };
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
    // §30.7 NG+2: a rule that opens at a later NG+ level can already whisper (the Unknown robot's extra clue stage).
    if (gated && rule.earlyClue && campaign.ngPlusRuns >= rule.earlyClue.ngPlus) return { rule, stage: 1, early: rule.earlyClue.text, lines: [], h: 190 };
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
      ctx.fillStyle = COL.bg;
      ctx.fillRect(0, 0, W, renderer.height);
      const h = headRect();
      drawButton(ctx, backRect(), '‹ Back');
      assets.drawContained(ctx, SECRET_ART.records, { x: h.x + 196, y: h.y, w: 86, h: 86 });
      text(ctx, 'Rumour Archive', h.x + 292, h.y + 43, { size: 44, bold: true, baseline: 'middle', maxWidth: h.w - 292 - (debugEnabled ? 240 : 0) });
      if (debugEnabled) drawButton(ctx, whyRect(), 'Why not?', { accent: COL.gold });
      const w = bodyRect().w - 12;
      scroll.begin(ctx);
      const groups = rows();
      let y = 8;
      for (const l of wrapLines(groups.length ? 'Secrets you have heard about. Discovered ones show exactly what they took — for good.' : 'No rumours yet. Keep building — people talk.', w - 8, SZ.small)) {
        text(ctx, l, 4, y, { size: SZ.small, color: COL.textMuted, maxWidth: w });
        y += 36;
      }
      y += 12;
      if (campaign.invitationReceived) y = drawInvitation(ctx, y, w) + 24;
      if (S().account.flags[FINAL_BADGE.flag]) y = drawFinalBadge(ctx, y, w) + 24;
      for (const g of groups) {
        text(ctx, g.group, 4, y + 12, { size: SZ.button, bold: true, color: COL.purple });
        y += GROUP_H;
        for (const r of g.rows) {
          const L = rowOps(r, w);
          drawRow(ctx, r, y, w, L);
          y += L.h + 14;
        }
      }
      scroll.contentHeight = y + 20;
      scroll.end(ctx);
    },
  };

  // A row's wrapped lines (Milestone 18: §33.2 sizes, wrapped rather than squeezed). y is from the row top.
  function rowOps(r, w) {
    const rule = r.rule;
    const x = 146;
    const mw = w - x - 20;
    const ops = [];
    let y = 18;
    const put = (str, size, opts = {}, indent = 0, maxLines = 6) => {
      const lh = Math.round(size * 1.26);
      wrapLines(str, mw - indent, size, !!opts.bold)
        .slice(0, maxLines)
        .forEach((l) => {
          ops.push([l, x + indent, y, { size, maxWidth: mw - indent, ...opts }]);
          y += lh;
        });
    };
    if (r.stage === 3) {
      const got = S().run.unlocked[rule.id] ?? S().account.history[rule.id]?.first;
      put(rule.name, SZ.button, { bold: true, color: COL.gold }, 0, 2);
      put(`${S().unlockedInRun(rule.id) ? `Discovered ${campaign.clock.shortLabel(got?.day ?? 0)}` : 'Discovered in an earlier run'}${S().isRepeat(rule.id) ? ' · repeat: easier numbers this run' : ''}`, SZ.small, { color: COL.textMuted });
      y += 6;
      for (const l of r.lines) put(`${l.ok ? '✓' : '•'} ${l.text}`, SZ.body, { color: l.ok ? COL.good : COL.text }, l.depth * 40);
    } else if (r.stage === 0) {
      ops.push(['???', x, y + 6, { size: 40, bold: true, color: COL.textMuted }]);
      y += 62;
      put('No rumours yet.', SZ.body, { color: COL.textMuted });
    } else {
      put(r.early ? 'A New Game+ whisper' : r.stage === 2 ? 'A clue' : 'A rumour', SZ.body, { bold: true, color: COL.purple });
      put(r.early ?? rule.clueStages[r.stage - 1]?.text ?? '', SZ.body);
      if (r.stage === 2 && r.missing?.length) put(`Missing: ${r.missing.join(', ')}`, SZ.body, { bold: true, color: COL.gold });
    }
    return { ops, h: Math.max(150, y + 18) };
  }

  // The encrypted invitation (§25): its words stay scrambled until the Lunar Invitation secret is discovered.
  function drawInvitation(ctx, y, w) {
    const readable = campaign.invitationReadable;
    const x = 146;
    const mw = w - x - 20;
    const body = wrapLines(readable ? INVITATION.text : scramble(INVITATION.text, 0), mw, SZ.body).slice(0, 7);
    const note = wrapLines(readable ? INVITATION.readNote : INVITATION.lockedNote, mw, SZ.body, true).slice(0, 3);
    const h = 30 + 56 + 44 + body.length * 44 + 14 + note.length * 44 + 24;
    panel(ctx, { x: 0, y, w, h }, { stroke: readable ? COL.gold : COL.purple, lineWidth: 5 });
    assets.drawContained(ctx, ENDING_ART.invitation, { x: 16, y: y + 24, w: 110, h: 110 });
    let ly = y + 24;
    text(ctx, INVITATION.title, x, ly, { size: SZ.button, bold: true, color: readable ? COL.gold : COL.purple, maxWidth: mw });
    ly += 56;
    text(ctx, `${INVITATION.from} · received ${campaign.clock.shortLabel(campaign.secrets.account.flags.invitation?.day ?? 0)}`, x, ly, { size: SZ.small, color: COL.textMuted, maxWidth: mw });
    ly += 44;
    for (const l of body) {
      text(ctx, l, x, ly, { size: SZ.body, color: readable ? COL.text : COL.textMuted, maxWidth: mw });
      ly += 44;
    }
    ly += 14;
    for (const l of note) {
      text(ctx, l, x, ly, { size: SZ.body, bold: true, color: readable ? COL.good : COL.purple, maxWidth: mw });
      ly += 44;
    }
    return y + h;
  }

  // §30.7 NG+3: the final secret completion badge.
  function drawFinalBadge(ctx, y, w) {
    const h = 170;
    panel(ctx, { x: 0, y, w, h }, { fill: COL.panelGold, stroke: COL.gold, lineWidth: 5 });
    assets.drawContained(ctx, FINAL_BADGE.art, { x: 16, y: y + 20, w: 130, h: 130 });
    text(ctx, FINAL_BADGE.name, 170, y + 30, { size: SZ.button, bold: true, color: COL.purple, maxWidth: w - 190 });
    text(ctx, FINAL_BADGE.text, 170, y + 90, { size: SZ.body, maxWidth: w - 190 });
    return y + h;
  }

  function drawRow(ctx, r, y, w, L) {
    const found = r.stage === 3;
    panel(ctx, { x: 0, y, w, h: L.h }, { stroke: found ? COL.gold : r.stage ? COL.purple : COL.line, lineWidth: found ? 4 : 3 });
    assets.drawContained(ctx, found ? SECRET_ART.badge : SECRET_ART.marker, { x: 16, y: y + 20, w: 110, h: 110 });
    for (const [str, x, ly, opts] of L.ops) text(ctx, str, x, y + ly, opts);
  }
  return screen;
}
