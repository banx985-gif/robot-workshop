// Debug "why not?" inspector (?debug=1, Milestone 16): pick any secret rule and see every condition — the fact it
// reads, its live value, the value needed (and the eased value on a repeat), true / false — plus how often the
// engine has checked it on its trigger events. "Eased view" shows the §30.4a numbers even on a first run.
// Also the debug New Game+ level setter and the "ending reached" switch (until Milestones 19–20 build them).
import { THEME, font } from '../../../../core/Theme.js';
import { ScrollPanel } from '../../../../core/ui/ScrollPanel.js';
import { drawButton } from '../../../../core/ui/Button.js';
import { SECRETS } from '../../data/secrets.js';
import { ruleLines } from '../systems/secretText.js';
import { panel, text, hit } from '../ui/widgets.js';
const COL = THEME.color;

const HEAD_H = 230;
const LINE = 40;

export function createSecretDebugScreen({ renderer, layout, campaign, router }) {
  const W = renderer.width;
  const scroll = new ScrollPanel({ getRect: bodyRect, contentHeight: 0 });
  let pick = 0;
  let forceEased = false;

  function headRect() {
    const sr = layout.safeRect;
    return { x: sr.x + 24, y: sr.y + 24, w: sr.w - 48, h: HEAD_H - 24 };
  }
  const backRect = () => ({ ...headRect(), w: 180, h: 86 });
  const easedRect = () => {
    const h = headRect();
    return { x: h.x + h.w - 250, y: h.y, w: 250, h: 86 };
  };
  // Second row: ‹ rule › · NG+ − n + · Ending on/off
  const rowBtn = (k) => {
    const h = headRect();
    const xs = [0, 110, 330, 440, 520, 640, 780];
    const ws = [96, 210, 96, 70, 96, 130, 250];
    return { x: h.x + xs[k], y: h.y + 104, w: ws[k], h: 86 };
  };
  function bodyRect() {
    const sr = layout.safeRect;
    const y = sr.y + HEAD_H + 12;
    return { x: sr.x + 24, y, w: sr.w - 48, h: sr.y + sr.h - 24 - y };
  }

  // What the inspector shows for a rule right now (also read by tests).
  function inspect(i = pick, eased = forceEased || campaign.secrets.isRepeat(SECRETS[i].id)) {
    const rule = SECRETS[i];
    campaign.syncSecretFacts();
    const res = campaign.secrets.evaluate(rule, {}, { eased });
    return { rule, res, lines: ruleLines(res, { debug: true }) };
  }

  const screen = {
    scroll,
    inspect,
    select(i) {
      pick = i;
    },
    enter() {
      scroll.scrollY = 0;
    },
    onTap(p) {
      if (hit(p, backRect())) return router.go('rumours');
      if (hit(p, easedRect())) forceEased = !forceEased;
      if (hit(p, rowBtn(0))) pick = (pick + SECRETS.length - 1) % SECRETS.length;
      if (hit(p, rowBtn(2))) pick = (pick + 1) % SECRETS.length;
      if (hit(p, rowBtn(4))) campaign.setDebugNgPlus(campaign.ngPlusRuns - 1);
      if (hit(p, rowBtn(5))) campaign.setDebugNgPlus(campaign.ngPlusRuns + 1);
      if (hit(p, rowBtn(6))) campaign.setDebugEnding(!campaign.flags.endingReached);
    },
    onDragStart: (p) => scroll.beginDrag(p),
    onDrag: (p) => scroll.drag(p),
    onDragEnd: (p) => scroll.endDrag(p),
    render(ctx) {
      ctx.fillStyle = COL.bg;
      ctx.fillRect(0, 0, W, renderer.height);
      const h = headRect();
      drawButton(ctx, backRect(), '‹ Back', { font: font(32, true) });
      text(ctx, 'Why not?', h.x + 200, h.y + 43, { size: 42, bold: true, baseline: 'middle' });
      drawButton(ctx, easedRect(), forceEased ? 'Eased view ✓' : 'Eased view', { active: forceEased, font: font(28, true) });
      const f = font(28, true);
      drawButton(ctx, rowBtn(0), '‹', { font: font(40, true) });
      text(ctx, `${pick + 1}/${SECRETS.length}`, rowBtn(1).x + rowBtn(1).w / 2, rowBtn(1).y + 43, { size: 30, bold: true, align: 'center', baseline: 'middle' });
      drawButton(ctx, rowBtn(2), '›', { font: font(40, true) });
      text(ctx, 'NG+', rowBtn(3).x + 4, rowBtn(3).y + 43, { size: 26, bold: true, baseline: 'middle', color: COL.textMuted });
      drawButton(ctx, rowBtn(4), `− ${campaign.ngPlusRuns}`, { font: f });
      drawButton(ctx, rowBtn(5), '+', { font: f });
      drawButton(ctx, rowBtn(6), campaign.flags.endingReached ? 'Ending ✓' : 'Ending: no', { active: !!campaign.flags.endingReached, font: f });
      const { rule, res, lines } = inspect();
      const S = campaign.secrets;
      const w = bodyRect().w - 12;
      scroll.begin(ctx);
      panel(ctx, { x: 0, y: 0, w, h: 250 });
      text(ctx, `${rule.id} · ${rule.name}`, 20, 18, { size: 32, bold: true, maxWidth: w - 40 });
      text(ctx, res.ok ? 'ALL MET — unlocks on its next trigger event' : 'Not met yet', 20, 64, { size: 28, bold: true, color: res.ok ? COL.good : COL.bad });
      text(ctx, `Triggers: ${rule.triggerEvents.join(', ')} · ${rule.oncePerAccount ? 'once per account' : 'once per run'} · NG+ ${res.ng.value} / needs ${res.ng.need}`, 20, 108, { size: 24, color: COL.textMuted, maxWidth: w - 40 });
      text(ctx, `Run: ${S.unlockedInRun(rule.id) ? 'unlocked' : 'locked'} · clue stage ${S.clueStage(rule.id)} · account history: ${S.account.history[rule.id] ? `${S.account.history[rule.id].runs.length} run(s)` : 'none'} · ${res.eased ? 'EASED values' : 'first-time values'}`, 20, 146, { size: 24, color: COL.textMuted, maxWidth: w - 40 });
      text(ctx, `Checked ${S.stats.byRule[rule.id] ?? 0}× · engine: ${S.stats.notifications} events seen, ${S.stats.checks} rule checks (${Object.entries(S.stats.byEvent).map(([k, v]) => `${k} ${v}`).join(', ') || 'none yet'})`, 20, 184, { size: 22, color: COL.textMuted, maxWidth: w - 40 });
      lines.forEach((l, i) => {
        const y = 280 + i * LINE;
        text(ctx, l.ok ? '✓' : '✗', 12 + l.depth * 36, y, { size: 28, bold: true, color: l.ok ? COL.good : COL.bad });
        text(ctx, l.text, 52 + l.depth * 36, y + 2, { size: 24, color: COL.text, maxWidth: w - 64 - l.depth * 36 });
      });
      scroll.contentHeight = 300 + lines.length * LINE;
      scroll.end(ctx);
    },
  };
  return screen;
}
