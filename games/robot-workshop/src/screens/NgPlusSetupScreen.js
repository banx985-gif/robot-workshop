// New Game+ setup (Milestone 20, bible §6.3 "New Game+ Setup", §30): the bright workshop style, one long scrolling
// page with the big orange start button always in view at the bottom.
//   the NG+ key art and the level the new run will be
//   Always comes with you   (§30.3, with this account's numbers)
//   Your NG+ advantages     (§30.5 at the new level)
//   New at this level       (§30.7)
//   Legacy Staff            portraits, tap to pick (§30.4: 1 / 2 / 3)
//   Blueprint Memory        robot pictures, tap to pick (1 per completed level, 3 at most)
//   Challenge (optional)    one of the four §30.8 modifiers, or none
//   the first-time guide on/off (skippable in NG+)
//   Starts fresh            (§30.6)
// Reached from the ending ceremony's choice and, while playing on after the ending, the Money menu.
import { THEME, font } from '../../../../core/Theme.js';
import { ScrollPanel } from '../../../../core/ui/ScrollPanel.js';
import { drawButton, hitRect } from '../../../../core/ui/Button.js';
import { NG_PLUS, NG_PLUS_CONTENT, NG_PLUS_ART, NG_PLUS_TEXT } from '../../data/ngplus.js';
import { ROLES } from '../../data/staff.js';
import { RECRUIT_ART } from '../../data/recruitment.js';
import { STARTING_MONEY } from '../../data/economy.js';
import { ACHIEVEMENTS } from '../../data/achievements.js';
import { SECRETS } from '../../data/secrets.js';
import { panel, text, fmt } from '../ui/widgets.js';
import { wrapLines } from '../ui/competitionDraw.js';
import { blueprintLines } from '../systems/ngPlusRun.js';
const C = THEME.color;
const Z = THEME.size;

const HEAD_H = 140;
const FOOT_H = 200;
const GAP = 16;
const CARD_H = 330;
const BP_H = 300;
const MOD_H = 150;

export function createNgPlusSetupScreen({ renderer, layout, assets, campaign, router, onStarted = () => {} }) {
  const W = renderer.width;
  let back = 'workshop';
  let picks = { legacyStaff: [], blueprints: [], modifier: null, guide: false };
  let options = { legacy: [], blueprints: [], modifiers: [] };
  let note = null; // { text, t }
  let confirm = false;
  let hits = []; // tap areas in content coordinates, rebuilt every frame
  const scroll = new ScrollPanel({ getRect: bodyRect, contentHeight: 0 });

  const sr = () => layout.safeRect;
  const headRect = () => ({ x: sr().x + 24, y: sr().y + 24, w: sr().w - 48, h: HEAD_H });
  const backRect = () => ({ x: headRect().x, y: headRect().y + 15, w: 200, h: 110 });
  function bodyRect() {
    const s = sr();
    const y = s.y + 24 + HEAD_H + 10;
    return { x: s.x + 24, y, w: s.w - 48, h: s.y + s.h - FOOT_H - y };
  }
  const startRect = () => {
    const s = sr();
    return { x: s.x + 40, y: s.y + s.h - FOOT_H + 30, w: s.w - 80, h: 140 };
  };
  const confirmBox = () => {
    const s = sr();
    const h = 720;
    return { x: s.x + 50, y: s.y + (s.h - h) / 2, w: s.w - 100, h };
  };
  const confirmYes = () => {
    const b = confirmBox();
    return { x: b.x + 40, y: b.y + b.h - 300, w: b.w - 80, h: 120 };
  };
  const confirmNo = () => {
    const b = confirmBox();
    return { x: b.x + 40, y: b.y + b.h - 160, w: b.w - 80, h: 120 };
  };
  const cw = () => bodyRect().w - 12;

  const level = () => campaign.nextNgPlusLevel;
  const legacyMax = () => campaign.ngPlusSys.picks('legacy', level());
  const blueMax = () => campaign.ngPlusSys.picks('blueprints', level());
  const flash = (str) => (note = { text: str, t: performance.now() });

  function toggle(list, id, max, what) {
    const cur = picks[list];
    if (cur.includes(id)) picks[list] = cur.filter((x) => x !== id);
    else if (cur.length < max) picks[list] = [...cur, id];
    else flash(`Only ${max} ${what} at NG+${level()} — tap one to swap it out`);
  }

  function start() {
    const res = campaign.startNewGamePlus({ ...picks });
    confirm = false;
    if (!res.ok) return flash(res.reason);
    onStarted(res);
  }

  const screen = {
    scroll,
    get picks() {
      return picks;
    },
    get options() {
      return options;
    },
    get confirming() {
      return confirm;
    },
    startRect,
    confirmYes,
    // Tests: the tap area of a card / row by its key ('legacy:ENG01', 'blueprint:<id>', 'mod:leanStart', 'guide').
    hitRect(key) {
      const h = hits.find((x) => x.key === key);
      if (!h) return null;
      const b = bodyRect();
      return { x: b.x + h.r.x, y: b.y + h.r.y - scroll.scrollY, w: h.r.w, h: h.r.h };
    },
    scrollTo(key) {
      const h = hits.find((x) => x.key === key);
      if (h) scroll.scrollY = Math.max(0, h.r.y - 200);
      scroll.clamp();
    },
    enter(params = {}) {
      back = params.back ?? 'workshop';
      campaign.clock.pause();
      options = campaign.ngPlusOptions();
      picks = { legacyStaff: [], blueprints: [], modifier: null, guide: false };
      confirm = false;
      note = null;
      scroll.scrollY = 0;
    },
    onTap(p) {
      if (confirm) {
        if (hitRect(p, confirmYes())) return start();
        if (hitRect(p, confirmNo()) || !hitRect(p, confirmBox())) confirm = false;
        return;
      }
      if (hitRect(p, backRect())) return router.go(back);
      if (hitRect(p, startRect())) {
        const block = campaign.ngPlusBlock();
        if (block) return flash(block);
        confirm = true;
        return;
      }
      if (!scroll.contains(p)) return;
      const q = scroll.toContent(p);
      const h = hits.find((x) => hitRect(q, x.r));
      h?.onTap();
    },
    onDragStart: (p) => !confirm && scroll.beginDrag(p),
    onDrag: (p) => scroll.drag(p),
    onDragEnd: (p) => scroll.endDrag(p),
    render(ctx) {
      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, W, renderer.height);
      const h = headRect();
      drawButton(ctx, backRect(), '‹ Back', { font: font(Z.button, true) });
      assets.drawContained(ctx, NG_PLUS_ART.icon, { x: h.x + 216, y: h.y + 20, w: 100, h: 100 });
      text(ctx, NG_PLUS_TEXT.title, h.x + 330, h.y + h.h / 2, { size: Z.title, bold: true, baseline: 'middle', maxWidth: h.w - 330 - 190 });
      levelChip(ctx, { x: h.x + h.w - 176, y: h.y + 30, w: 176, h: 80 });
      hits = [];
      scroll.begin(ctx);
      const y = drawBody(ctx);
      scroll.contentHeight = y + 30;
      scroll.end(ctx);
      drawFooter(ctx);
      if (confirm) drawConfirm(ctx);
    },
  };

  function levelChip(ctx, r) {
    panel(ctx, r, { fill: C.purple, stroke: C.outline, lineWidth: 4, radius: 40 });
    text(ctx, `NG+${level()}`, r.x + r.w / 2, r.y + r.h / 2, { size: Z.heading, bold: true, align: 'center', baseline: 'middle', color: C.textOnDark });
  }

  // Wrapped lines; returns the height used.
  function para(ctx, str, x, y, w, { size = Z.body, color = C.text, bold = false, lineH = Math.round(size * 1.3) } = {}) {
    const lines = wrapLines(str, w, size, bold);
    lines.forEach((l, i) => text(ctx, l, x, y + i * lineH, { size, color, bold, maxWidth: w }));
    return lines.length * lineH;
  }

  function heading(ctx, str, y, sub = null) {
    text(ctx, str, 4, y, { size: Z.heading, bold: true });
    if (!sub) return 64;
    return 64 + para(ctx, sub, 4, y + 60, cw() - 8, { size: Z.small, color: C.textMuted });
  }

  function drawBody(ctx) {
    const w = cw();
    let y = 4;
    // Key art and the level line.
    const artH = 420;
    assets.drawContained(ctx, NG_PLUS_ART.keyArt, { x: 0, y, w, h: artH });
    y += artH + 16;
    y += para(ctx, NG_PLUS_TEXT.intro, 4, y, w - 8, { size: Z.button, bold: true, color: C.actionDark }) + 8;
    const done = campaign.archive.list.length;
    y += para(ctx, `This will be NG+${level()}${level() >= NG_PLUS.maxLevel && campaign.ngPlusRuns >= NG_PLUS.maxLevel ? ' again (NG+3 rules from here on)' : ''}. Finished campaigns on this device: ${done}.`, 4, y, w - 8, { color: C.textMuted }) + 24;

    y = drawCarries(ctx, y, w);
    y = drawAdvantages(ctx, y, w);
    y = drawContent(ctx, y, w);
    y = drawLegacy(ctx, y, w);
    y = drawBlueprints(ctx, y, w);
    y = drawChallenges(ctx, y, w);
    y = drawGuide(ctx, y, w);
    y = drawResets(ctx, y, w);
    return y;
  }

  // §30.3 with this account's numbers.
  function carryRows() {
    const eco = campaign.economy;
    const S = campaign.secrets;
    const flags = S.account.flags;
    const facts = (k) => S.accountFact(k) ?? [];
    const purchases = Object.keys(campaign.ngPlusAccount.purchases ?? {}).length;
    const value = {
      techChips: fmt(eco.balance('techChips')),
      prestigeTokens: fmt(eco.balance('prestigeTokens')),
      purchases: purchases ? `${purchases}` : 'None yet',
      achievements: `${campaign.achievements.count} of ${ACHIEVEMENTS.length}`,
      records: 'All kept',
      combos: `${Object.keys(campaign.synergyArchive.account.found).length} known`,
      secretRecipes: `${Object.keys(S.account.history).length} of ${SECRETS.length}`,
      discoveryArchive: `${facts('staffEverHired').length} staff · ${facts('partsDiscovered').length} parts`,
      accountFlags: flags.blackCircuit ? 'Black Circuit open' : flags.blackCircuitInvite ? 'Invitation kept' : flags.invitation ? 'Invitation kept' : '—',
      pastCampaigns: `${campaign.archive.list.length} kept`,
      highestLevel: `NG+${Math.max(campaign.ngPlusAccount.highest ?? 0, level())}`,
    };
    return NG_PLUS.fields.always.map((f) => ({ label: f.label, value: value[f.id] ?? '' }));
  }

  function drawCarries(ctx, y, w) {
    y += heading(ctx, NG_PLUS_TEXT.carries, y);
    const rows = carryRows();
    const rowH = 58;
    const r = { x: 0, y, w, h: rows.length * rowH + 30 };
    panel(ctx, r, { fill: C.panelGood, stroke: C.good, lineWidth: 4, radius: 28 });
    rows.forEach((row, i) => {
      const ry = y + 16 + i * rowH;
      text(ctx, `✓ ${row.label}`, 24, ry + 8, { size: Z.body, maxWidth: w * 0.58 });
      text(ctx, row.value, w - 24, ry + 8, { size: Z.body, bold: true, align: 'right', color: C.good, maxWidth: w * 0.38 });
    });
    return y + r.h + 36;
  }

  function drawAdvantages(ctx, y, w) {
    const a = campaign.ngPlusSys.advantages(level());
    const start = STARTING_MONEY.credits + a.startingCredits;
    y += heading(ctx, NG_PLUS_TEXT.advantages, y, `One step for every finished campaign, up to NG+${NG_PLUS.advantages.maxRuns}.`);
    const lines = [
      [`Research costs ${Math.abs(a.researchCostPct)}% less`, NG_PLUS_ART.icon],
      [`Research is ${a.researchSpeedPct}% faster`, NG_PLUS_ART.icon],
      [`+${fmt(a.startingCredits)} starting credits (${fmt(start)} in all)`, 'ui_icon_01_money'],
      [`+${a.freeRefreshes} free job-board refresh${a.freeRefreshes === 1 ? '' : 'es'} a year`, RECRUIT_ART.icon],
    ];
    const rowH = 76;
    const r = { x: 0, y, w, h: lines.length * rowH + 24 };
    panel(ctx, r, { fill: C.panelInfo, stroke: C.progress, lineWidth: 4, radius: 28 });
    lines.forEach(([str, icon], i) => {
      const ry = y + 12 + i * rowH;
      assets.drawContained(ctx, icon, { x: 20, y: ry + 6, w: 60, h: 60 });
      text(ctx, str, 100, ry + 18, { size: Z.body, bold: true, maxWidth: w - 120 });
    });
    return y + r.h + 36;
  }

  function drawContent(ctx, y, w) {
    y += heading(ctx, `New in NG+${level()}`, y, 'Secret content that only New Game+ can open (§30.7).');
    for (let lv = 1; lv <= level(); lv++) {
      for (const line of NG_PLUS_CONTENT[lv] ?? []) {
        const tag = lv < level() ? `NG+${lv}` : 'New';
        text(ctx, tag, 4, y + 4, { size: Z.small, bold: true, color: lv < level() ? C.textMuted : C.purple });
        y += para(ctx, line, 110, y, w - 114, { size: Z.body }) + 10;
      }
    }
    return y + 26;
  }

  // On the section heading's line, right-aligned.
  function pickCount(ctx, y, n, max) {
    text(ctx, `${n} of ${max} picked`, cw() - 4, y + 6, { size: Z.body, bold: true, align: 'right', color: n ? C.good : C.textMuted });
  }

  function drawLegacy(ctx, y, w) {
    const max = legacyMax();
    pickCount(ctx, y, picks.legacyStaff.length, max);
    y += heading(ctx, NG_PLUS_TEXT.legacy, y, NG_PLUS_TEXT.legacyHelp(max));
    const list = options.legacy;
    if (!list.length) return y + para(ctx, 'Nobody on the team to bring along.', 4, y, w, { color: C.textMuted }) + 36;
    const cols = 2;
    const cardW = (w - GAP) / cols;
    list.forEach((s, i) => {
      const r = { x: (i % cols) * (cardW + GAP), y: y + Math.floor(i / cols) * (CARD_H + GAP), w: cardW, h: CARD_H };
      const on = picks.legacyStaff.includes(s.id);
      const blocked = NG_PLUS.legacy.historyTiers.includes(s.tier) && !s.everHired;
      panel(ctx, r, { fill: blocked ? C.panelDim : on ? C.panelGood : C.panel, stroke: on ? C.good : C.line, lineWidth: on ? 6 : 3, radius: 28 });
      ctx.save();
      if (blocked) ctx.globalAlpha = 0.45;
      assets.drawContained(ctx, s.art, { x: r.x + 20, y: r.y + 16, w: 150, h: 170 });
      const badge = RECRUIT_ART.tierBadges[s.tier];
      if (badge) assets.drawContained(ctx, badge, { x: r.x + r.w - 88, y: r.y + 16, w: 70, h: 70 });
      ctx.restore();
      if (on) text(ctx, '✓', r.x + r.w - 54, r.y + 100, { size: Z.title, bold: true, color: C.good, align: 'center' });
      const tx = r.x + 20;
      const tw = r.w - 40;
      text(ctx, s.name, tx, r.y + 196, { size: Z.body, bold: true, maxWidth: tw });
      text(ctx, `${ROLES[s.role]?.name ?? s.role} · Lv ${s.level} → ${NG_PLUS.legacy.startLevel}`, tx, r.y + 240, { size: Z.small, color: C.textMuted, maxWidth: tw });
      const main = ROLES[s.role]?.primaryStat;
      const now = campaign.ngPlusSys.legacyStats(s.stats, s.floor)[main];
      text(ctx, blocked ? 'Never hired before' : `${main?.toUpperCase()} ${s.stats[main]} → ${now}`, tx, r.y + 280, { size: Z.small, bold: true, color: blocked ? C.bad : C.progress, maxWidth: tw });
      hits.push({ key: `legacy:${s.id}`, r, onTap: () => (blocked ? flash(`${s.name} can only come along once hired`) : toggle('legacyStaff', s.id, max, 'Legacy Staff')) });
    });
    return y + Math.ceil(list.length / cols) * (CARD_H + GAP) + 30;
  }

  function drawBlueprints(ctx, y, w) {
    const max = blueMax();
    pickCount(ctx, y, picks.blueprints.length, max);
    y += heading(ctx, NG_PLUS_TEXT.blueprints, y, NG_PLUS_TEXT.blueprintHelp(max));
    const list = options.blueprints;
    if (!list.length) return y + para(ctx, 'No finished robots to remember yet.', 4, y, w, { color: C.textMuted }) + 36;
    list.forEach((b, i) => {
      const r = { x: 0, y: y + i * (BP_H + GAP), w, h: BP_H };
      const on = picks.blueprints.includes(b.id);
      panel(ctx, r, { fill: on ? C.panelGood : C.panel, stroke: on ? C.good : C.line, lineWidth: on ? 6 : 3, radius: 28 });
      assets.drawContained(ctx, NG_PLUS_ART.blueprint, { x: r.x + 10, y: r.y + 20, w: 250, h: 250 });
      assets.drawContained(ctx, b.art, { x: r.x + 30, y: r.y + 30, w: 210, h: 230 });
      const L = blueprintLines(b);
      const tx = r.x + 280;
      const tw = r.w - 300 - (on ? 70 : 0);
      text(ctx, L.title, tx, r.y + 20, { size: Z.body, bold: true, maxWidth: tw });
      text(ctx, `${L.quality}${b.carried ? ' · remembered from before' : ''}`, tx, r.y + 66, { size: Z.small, color: C.progress, bold: true, maxWidth: tw });
      let ly = r.y + 110;
      for (const l of wrapLines(L.parts, r.w - 300, Z.small).slice(0, 3)) {
        text(ctx, l, tx, ly, { size: Z.small, color: C.textMuted, maxWidth: r.w - 300 });
        ly += 36;
      }
      if (L.combos) text(ctx, L.combos, tx, ly + 4, { size: Z.small, bold: true, color: C.gold, maxWidth: r.w - 300 });
      if (on) text(ctx, '✓', r.x + r.w - 40, r.y + 20, { size: Z.title, bold: true, color: C.good, align: 'center' });
      hits.push({ key: `blueprint:${b.id}`, r, onTap: () => toggle('blueprints', b.id, max, 'blueprints') });
    });
    return y + list.length * (BP_H + GAP) + 30;
  }

  function drawChallenges(ctx, y, w) {
    y += heading(ctx, NG_PLUS_TEXT.challenge, y, NG_PLUS_TEXT.challengeHelp);
    const list = [{ id: null, name: 'No challenge', text: 'Play NG+ as it comes', icon: NG_PLUS_ART.icon }, ...NG_PLUS.modifiers];
    list.forEach((m, i) => {
      const r = { x: 0, y: y + i * (MOD_H + GAP), w, h: MOD_H };
      const on = picks.modifier === m.id;
      panel(ctx, r, { fill: on ? C.panelGold : C.panel, stroke: on ? C.gold : C.line, lineWidth: on ? 6 : 3, radius: 28 });
      assets.drawContained(ctx, m.icon, { x: r.x + 20, y: r.y + 25, w: 100, h: 100 });
      text(ctx, m.name, r.x + 144, r.y + 26, { size: Z.button, bold: true, maxWidth: r.w - 144 - 150 });
      text(ctx, m.text, r.x + 144, r.y + 84, { size: Z.body, color: C.textMuted, maxWidth: r.w - 144 - 30 });
      if (on) text(ctx, m.id ? '+1 PT' : '✓', r.x + r.w - 30, r.y + 28, { size: Z.button, bold: true, color: C.gold, align: 'right' });
      hits.push({ key: `mod:${m.id ?? 'none'}`, r, onTap: () => (picks.modifier = m.id) });
    });
    return y + list.length * (MOD_H + GAP) + 30;
  }

  function drawGuide(ctx, y, w) {
    const r = { x: 0, y, w, h: 130 };
    panel(ctx, r, { fill: C.panel, stroke: C.line, lineWidth: 3, radius: 28 });
    text(ctx, NG_PLUS_TEXT.guide, 24, y + 22, { size: Z.button, bold: true, maxWidth: w - 280 });
    text(ctx, 'You know the ropes — it starts off. Help can turn it on later.', 24, y + 76, { size: Z.small, color: C.textMuted, maxWidth: w - 280 });
    const b = { x: w - 230, y: y + 10, w: 210, h: 110 };
    drawButton(ctx, b, picks.guide ? 'On' : 'Off', { accent: picks.guide ? C.good : C.progress, font: font(Z.button, true) });
    hits.push({ key: 'guide', r, onTap: () => (picks.guide = !picks.guide) });
    return y + r.h + 40;
  }

  function drawResets(ctx, y, w) {
    y += heading(ctx, NG_PLUS_TEXT.resets, y, 'Back to Year 1 with a small workshop and the three starters.');
    const list = NG_PLUS.fields.reset.filter((f) => !f.hidden);
    const r = { x: 0, y, w, h: 0 };
    let ly = y + 18;
    const lines = [];
    for (const f of list) lines.push(...wrapLines(`• ${f.label}`, w - 48, Z.small).map((l, i) => (i ? `   ${l}` : l)));
    r.h = lines.length * 40 + 30;
    panel(ctx, r, { fill: C.panelAlt, stroke: C.line, lineWidth: 3, radius: 28 });
    for (const l of lines) {
      text(ctx, l, 24, ly, { size: Z.small, color: C.text, maxWidth: w - 48 });
      ly += 40;
    }
    return y + r.h + 30;
  }

  function drawFooter(ctx) {
    const s = sr();
    const top = s.y + s.h - FOOT_H;
    ctx.fillStyle = C.sheet;
    ctx.fillRect(0, top, W, renderer.height - top);
    ctx.fillStyle = C.line;
    ctx.fillRect(0, top, W, 4);
    const b = startRect();
    const block = campaign.ngPlusBlock();
    drawButton(ctx, b, NG_PLUS_TEXT.start, { font: font(Z.heading, true), disabled: !!block });
    const msg = note && performance.now() - note.t < 3500 ? note.text : block;
    if (msg) {
      const m = { x: s.x + 30, y: b.y - 96, w: s.w - 60, h: 80 };
      panel(ctx, m, { fill: C.panelBad, stroke: C.bad, lineWidth: 4, radius: 24 });
      text(ctx, msg, W / 2, m.y + m.h / 2, { size: Z.small, bold: true, align: 'center', baseline: 'middle', color: C.bad, maxWidth: m.w - 30 });
    }
  }

  function drawConfirm(ctx) {
    ctx.fillStyle = C.overlay;
    ctx.fillRect(0, 0, W, renderer.height);
    const b = confirmBox();
    panel(ctx, b, { fill: C.panel, stroke: C.outline, lineWidth: 5, radius: 32 });
    assets.drawContained(ctx, NG_PLUS_ART.icon, { x: b.x + b.w / 2 - 50, y: b.y + 26, w: 100, h: 100 });
    text(ctx, `Start NG+${level()}?`, b.x + b.w / 2, b.y + 140, { size: Z.heading, bold: true, align: 'center', maxWidth: b.w - 40 });
    const sum = [`${picks.legacyStaff.length} Legacy Staff`, `${picks.blueprints.length} blueprint${picks.blueprints.length === 1 ? '' : 's'}`, picks.modifier ? NG_PLUS.modifiers.find((m) => m.id === picks.modifier)?.name : 'no challenge'].join(' · ');
    para(ctx, NG_PLUS_TEXT.confirm, b.x + 40, b.y + 200, b.w - 80, { size: Z.body });
    text(ctx, sum, b.x + b.w / 2, b.y + 330, { size: Z.small, bold: true, align: 'center', color: C.progress, maxWidth: b.w - 60 });
    drawButton(ctx, confirmYes(), NG_PLUS_TEXT.start, { font: font(Z.button, true) });
    drawButton(ctx, confirmNo(), 'Not yet', { accent: C.progress, font: font(Z.button, true) });
  }

  return screen;
}
