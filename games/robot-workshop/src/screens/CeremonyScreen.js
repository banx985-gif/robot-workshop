// The Global Robotics Awards (Milestone 19, bible §25, §45, §30.1): the Year 16 ending ceremony, a big bright
// sequence in the workshop style. The calendar stays paused until the player taps through it.
//   title      the key art, the awards' title and the opening line (it changes if the World Championship was won)
//   recap      four company recap cards: best robot, top worker, trophies won, money made
//   scores     the eight §45 categories fill in one by one, with the running total
//   grade      the grade reveal: the rank-up burst (vfx_07), reputation stars and confetti
//   invitation the encrypted invitation arrives (§25) — readable only once its secret is found
//   choice     Continue (postgame) · Credits · New Game+ (the NG+ setup screen, Milestone 20)
// The NG+3 hidden ending variant (§30.7): when the Unknown robot was built this run, the title, host line and picture
// change and the final secret badge shows on the choice.
// How far it got is kept in the save (core/CampaignEnding state.stage): a reload during the ceremony starts it again
// from the top; one after the invitation opens straight on the choice.
import { THEME, font } from '../../../../core/Theme.js';
import { drawButton, hitRect } from '../../../../core/ui/Button.js';
import { CEREMONY_TEXT, ENDING_ART, GRADE_BANDS, INVITATION, END_CHOICES } from '../../data/ending.js';
import { panel, text, bar, fmt, wrapText } from '../ui/widgets.js';
import { wrapLines } from '../ui/competitionDraw.js';
import { scramble } from '../systems/invitationText.js';
const C = THEME.color;
const Z = THEME.size;

const STAGES = ['title', 'recap', 'scores', 'grade', 'invitation', 'choice'];
const CARD_GAP = 0.45; // seconds between recap cards
const FILL_SEC = 0.7; // one category's bar filling

export function createCeremonyScreen({ renderer, layout, assets, campaign, router, vfx = null, audio = null }) {
  const W = renderer.width;
  let stage = 'title';
  let t = 0; // seconds in this stage
  let confetti = [];

  const sr = () => layout.safeRect;
  const summary = () => campaign.endingSummary;
  const champion = () => !!summary()?.recap?.worldChampion;
  const hidden = () => !!summary()?.hiddenEnding;
  const band = () => GRADE_BANDS.find((b) => b.id === summary()?.grade.band) ?? GRADE_BANDS[0];
  const bandColor = () => C[band().color] ?? C.gold;

  const choiceRect = (i) => {
    const s = sr();
    const h = 150;
    const top = s.y + s.h - 70 - 3 * (h + 90);
    return { x: s.x + 80, y: top + i * (h + 90), w: s.w - 160, h };
  };
  const skipRect = () => ({ x: sr().x + sr().w - 24 - 220, y: sr().y + 24, w: 220, h: 110 });

  function go(next) {
    stage = next;
    t = 0;
    if (next === 'grade') startConfetti();
    else confetti = []; // only the grade reveal has confetti: it would cover the words that follow
    if (next === 'grade') audio?.play('levelUp');
    if (next === 'invitation') {
      campaign.receiveInvitation();
      campaign.ending.setStage('invitation');
      campaign.save().catch(() => {});
    }
    if (next === 'choice') {
      campaign.ending.setStage('choice');
      campaign.save().catch(() => {});
    }
  }

  // --- how long each stage animates (a tap before then finishes it; a tap after moves on) ---------------------
  function animDone() {
    if (stage === 'recap') return t >= 4 * CARD_GAP + 0.3;
    if (stage === 'scores') return t >= (summary()?.grade.categories.length ?? 8) * FILL_SEC + 0.3;
    return t >= 0.8;
  }
  function finishAnim() {
    if (stage === 'recap') t = 4 * CARD_GAP + 0.3;
    else if (stage === 'scores') t = (summary()?.grade.categories.length ?? 8) * FILL_SEC + 0.3;
    else t = 0.8;
  }

  function startConfetti() {
    const cols = ['#F2862B', '#1597BF', '#2E8B57', '#B87A00', '#7650C4', '#C8402F', '#FFD166'];
    confetti = Array.from({ length: vfx?.reducedFlashes ? 40 : 140 }, (_, i) => ({
      x: Math.random() * W,
      y: -Math.random() * renderer.height * 0.8,
      vy: 220 + Math.random() * 260,
      vx: -60 + Math.random() * 120,
      r: Math.random() * Math.PI,
      vr: -4 + Math.random() * 8,
      w: 14 + Math.random() * 14,
      h: 24 + Math.random() * 18,
      c: cols[i % cols.length],
    }));
  }

  const screen = {
    get stage() {
      return stage;
    },
    go,
    choiceRect,
    skipRect,
    enter(params = {}) {
      campaign.clock.pause();
      const saved = campaign.ending.state.stage;
      stage = params.stage ?? (saved === 'choice' ? 'choice' : saved === 'invitation' ? 'invitation' : 'title');
      t = 0;
      confetti = [];
      if (stage === 'invitation') campaign.receiveInvitation();
    },
    update(dt) {
      t += dt;
      for (const p of confetti) {
        p.y += p.vy * dt;
        p.x += p.vx * dt;
        p.r += p.vr * dt;
      }
      confetti = confetti.filter((p) => p.y < renderer.height + 60);
    },
    onBack: () => true, // the ceremony plays through; its choice is the way out (§6.2)
    onTap(p) {
      if (stage === 'choice') {
        if (hitRect(p, choiceRect(0))) return continuePostgame();
        if (hitRect(p, choiceRect(1))) return router.go('credits', { back: 'ceremony' });
        if (hitRect(p, choiceRect(2)) && !campaign.ngPlusBlock()) return router.go('ngplus', { back: 'ceremony' });
        return;
      }
      if (!animDone()) return finishAnim();
      const i = STAGES.indexOf(stage);
      go(STAGES[i + 1]);
    },
    render(ctx) {
      drawBackdrop(ctx);
      if (stage === 'title') drawTitle(ctx);
      else if (stage === 'recap') drawRecap(ctx);
      else if (stage === 'scores') drawScores(ctx);
      else if (stage === 'grade') drawGrade(ctx);
      else if (stage === 'invitation') drawInvitation(ctx);
      else drawChoice(ctx);
      if (stage !== 'choice' && animDone()) {
        const s = sr();
        ctx.save();
        ctx.globalAlpha = 0.55 + 0.45 * Math.sin(t * 4) ** 2;
        text(ctx, CEREMONY_TEXT.tap, W / 2, s.y + s.h - 60, { size: Z.body, bold: true, align: 'center', baseline: 'middle', color: C.actionDark });
        ctx.restore();
      }
    },
  };

  function continuePostgame() {
    campaign.ending.continuePostgame();
    campaign.save().catch(() => {});
    router.go('workshop');
    campaign.clock.resume(); // the calendar keeps running — nothing is reset
  }

  // --- drawing -------------------------------------------------------------------------------------------------
  function drawBackdrop(ctx) {
    const H = renderer.height;
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    // A warm stage light from the top.
    const g = ctx.createRadialGradient(W / 2, H * 0.2, 60, W / 2, H * 0.3, H * 0.8);
    g.addColorStop(0, 'rgba(255,245,226,0.95)');
    g.addColorStop(1, 'rgba(255,245,226,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    for (const p of confetti) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
  }

  const fade = (delay = 0, len = 0.35) => Math.max(0, Math.min(1, (t - delay) / len));

  function heading(ctx, str, y, color = C.text) {
    text(ctx, str, W / 2, y, { size: Z.title, bold: true, align: 'center', color, maxWidth: sr().w - 60 });
  }

  function paragraph(ctx, str, y, { size = Z.body, color = C.text, bold = false, maxLines = 3 } = {}) {
    const lines = wrapLines(str, sr().w - 120, size, bold).slice(0, maxLines);
    lines.forEach((l, i) => text(ctx, l, W / 2, y + i * Math.round(size * 1.3), { size, color, bold, align: 'center', maxWidth: sr().w - 100 }));
    return lines.length * Math.round(size * 1.3);
  }

  function drawTitle(ctx) {
    const s = sr();
    // Sized to the screen and centred, so tall phones don't get an empty band.
    const keyH = Math.round(Math.min(760, s.h * 0.3));
    const artH = Math.round(Math.max(300, Math.min(860, s.h - 140 - keyH - 420)));
    const total = keyH + 40 + 100 + 44 + 30 + artH + 30 + 110;
    const top = s.y + Math.max(30, (s.h - 140 - total) / 2);
    ctx.save();
    ctx.globalAlpha = fade(0, 0.6);
    assets.drawContained(ctx, ENDING_ART.keyArt, { x: s.x + 60, y: top + (1 - fade(0, 0.6)) * 40, w: s.w - 120, h: keyH });
    ctx.restore();
    let y = top + keyH + 40;
    ctx.save();
    ctx.globalAlpha = fade(0.3);
    text(ctx, hidden() ? CEREMONY_TEXT.hidden.title : CEREMONY_TEXT.title, W / 2, y, { size: 72, bold: true, align: 'center', color: hidden() ? C.purple : C.actionDark, maxWidth: s.w - 60 });
    y += 100;
    y += paragraph(ctx, CEREMONY_TEXT.subtitle, y, { color: C.textMuted });
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = fade(0.6);
    y += 30;
    const art = hidden() ? ENDING_ART.hiddenMoment : champion() ? ENDING_ART.worldMoment : ENDING_ART.nationalMoment;
    assets.drawContained(ctx, art, { x: s.x + 100, y, w: s.w - 200, h: artH });
    y += artH + 30;
    const intro = hidden() ? CEREMONY_TEXT.hidden.intro : champion() ? CEREMONY_TEXT.intro.champion : CEREMONY_TEXT.intro.normal;
    paragraph(ctx, intro, y, { size: 38, bold: true, color: hidden() ? C.purple : champion() ? C.gold : C.text });
    ctx.restore();
  }

  function drawRecap(ctx) {
    const s = sr();
    const r = summary()?.recap ?? {};
    let y = s.y + 50;
    heading(ctx, CEREMONY_TEXT.recapTitle, y);
    y += 90;
    y += paragraph(ctx, hidden() ? CEREMONY_TEXT.hidden.host : champion() ? CEREMONY_TEXT.host.champion : CEREMONY_TEXT.host.normal, y, { color: hidden() ? C.purple : C.textMuted, maxLines: 2 });
    y += 30;
    const room = s.y + s.h - 140 - y;
    const cardH = Math.min(400, Math.floor((room - 3 * 24) / 4));
    y += Math.max(0, (room - (4 * cardH + 3 * 24)) / 2); // centred in what is left
    const cards = [
      { title: 'Best robot', art: r.bestRobot?.art ?? 'ui_icon_06_robot', lines: r.bestRobot ? [r.bestRobot.name, `Quality ${(Math.round(r.bestRobot.quality * 10) / 10).toFixed(1)} · review ${r.bestRobot.review ?? '—'}`] : ['No robots finished', 'Next time!'] },
      { title: 'Top worker', art: r.topWorker?.art ?? 'ui_icon_05_staff', lines: r.topWorker ? [r.topWorker.name, `Level ${r.topWorker.level} ${r.topWorker.role}`] : ['—', ''] },
      { title: 'Trophies won', trophies: r.trophies ?? [], lines: (r.trophies ?? []).length ? [`${r.trophies.length} on the shelf`] : ['None yet — the shelf is waiting!'] },
      { title: 'Money made', art: 'ui_icon_01_money', lines: [`${fmt(r.moneyMade ?? 0)} credits`, `${r.robotsBuilt ?? 0} robots built`] },
    ];
    cards.forEach((c, i) => {
      const a = fade(i * CARD_GAP, 0.35);
      if (a <= 0) return;
      const rect = { x: s.x + 40 + (1 - a) * 80, y, w: s.w - 80, h: cardH };
      ctx.save();
      ctx.globalAlpha = a;
      panel(ctx, rect, { fill: C.panel, stroke: C.gold, lineWidth: 5, radius: 28 });
      const pic = { x: rect.x + 20, y: rect.y + 20, w: cardH - 40, h: cardH - 40 };
      const tx = rect.x + cardH + 10;
      const tw = rect.x + rect.w - 24 - tx;
      text(ctx, c.title, tx, rect.y + 24, { size: Z.body, bold: true, color: C.actionDark, maxWidth: tw });
      if (c.trophies) {
        // The best trophy large on the left, the whole shelf in a row beside it.
        assets.drawContained(ctx, c.trophies.length ? c.trophies.at(-1).art : 'ui_icon_19', pic);
        const tsz = Math.min(Math.floor((tw - 5 * 8) / 6), cardH - 150);
        c.trophies.slice(0, 6).forEach((tr, k) => assets.drawContained(ctx, tr.art, { x: tx + k * (tsz + 8), y: rect.y + 76, w: tsz, h: tsz }));
        if (c.trophies.length) text(ctx, c.lines[0], tx, rect.y + 86 + tsz, { size: Z.small, color: C.textMuted, maxWidth: tw });
        else text(ctx, c.lines[0], tx, rect.y + 90, { size: Z.body, maxWidth: tw });
      } else {
        assets.drawContained(ctx, c.art, pic);
        text(ctx, c.lines[0], tx, rect.y + 80, { size: Z.button, bold: true, maxWidth: tw });
        if (c.lines[1]) text(ctx, c.lines[1], tx, rect.y + 136, { size: Z.body, color: C.textMuted, maxWidth: tw });
      }
      ctx.restore();
      y += cardH + 24;
    });
  }

  function drawScores(ctx) {
    const s = sr();
    const g = summary()?.grade;
    if (!g) return;
    let y = s.y + 50;
    heading(ctx, CEREMONY_TEXT.scoresTitle, y);
    y += 110;
    const n = g.categories.length;
    const room = s.y + s.h - 140 - y - 170; // above "Tap to continue", leaving the total's box
    const rowH = Math.min(196, Math.floor(room / n));
    y += Math.max(0, (room - rowH * n) / 2);
    let running = 0;
    g.categories.forEach((c, i) => {
      const f = Math.max(0, Math.min(1, (t - i * FILL_SEC) / FILL_SEC));
      const shown = Math.round(c.score * f);
      running += shown;
      const rect = { x: s.x + 30, y, w: s.w - 60, h: rowH - 14 };
      ctx.save();
      ctx.globalAlpha = f > 0 ? 1 : 0.45;
      panel(ctx, rect, { fill: f >= 1 ? C.panelGold : C.panel, stroke: f >= 1 ? C.gold : C.line, lineWidth: 4, radius: 22 });
      const icon = Math.min(96, rect.h - 20);
      assets.drawContained(ctx, iconOf(c.id), { x: rect.x + 14, y: rect.y + (rect.h - icon) / 2, w: icon, h: icon });
      const x = rect.x + icon + 34;
      text(ctx, c.name, x, rect.y + 14, { size: Z.body, bold: true, maxWidth: rect.w - (x - rect.x) - 220 });
      text(ctx, `${shown} / ${c.max}`, rect.x + rect.w - 20, rect.y + 14, { size: Z.button, bold: true, align: 'right', color: C.progress });
      bar(ctx, x, rect.y + rect.h - 44, rect.x + rect.w - 20 - x, 26, (c.score / c.max) * f, C.good);
      ctx.restore();
      y += rowH;
    });
    y += 20;
    panel(ctx, { x: s.x + 30, y, w: s.w - 60, h: 150 }, { fill: C.panelInfo, stroke: C.progress, lineWidth: 5, radius: 28 });
    text(ctx, 'Total', s.x + 70, y + 75, { size: Z.heading, bold: true, baseline: 'middle' });
    text(ctx, `${fmt(running)} / ${fmt(g.max)}`, s.x + s.w - 70, y + 75, { size: 64, bold: true, align: 'right', baseline: 'middle', color: C.progress });
  }

  const ICONS = { rank: 'ui_icon_03_reputation', profit: 'ui_icon_01_money', quality: 'ui_icon_06_robot', research: 'ui_icon_04_research', staff: 'ui_icon_05_staff', market: 'ui_icon_13', trophies: 'ui_icon_19', discoveries: 'ui_icon_12' };
  const iconOf = (id) => ICONS[id] ?? 'ui_icon_09_records';

  function drawGrade(ctx) {
    const s = sr();
    const g = summary()?.grade;
    if (!g) return;
    const cx = W / 2;
    const BS = 820; // the burst's box
    const block = BS + 420; // burst + the lines under it
    const cy = s.y + 150 + Math.max(0, (s.h - 150 - 140 - block) / 2) + BS / 2;
    let y = s.y + 50;
    heading(ctx, CEREMONY_TEXT.gradeTitle, y);
    // The rank-up burst behind the grade (pulsing), with the reputation stars above it.
    const a = fade(0, 0.5);
    ctx.save();
    ctx.globalAlpha = a * (vfx?.reducedFlashes ? 0.6 : 1);
    const pulse = vfx?.reducedFlashes ? 0 : Math.sin(t * 2.5) * 24;
    const bs = BS - 24 + pulse;
    assets.drawContained(ctx, ENDING_ART.burst, { x: cx - bs / 2, y: cy - bs / 2, w: bs, h: bs });
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = fade(0.3, 0.5);
    assets.drawContained(ctx, ENDING_ART.stars, { x: cx - 260, y: cy - BS / 2 - 90, w: 520, h: 190 });
    ctx.restore();
    // The grade sits on its own cream disc so it always reads over the art.
    const disc = fade(0.2, 0.3);
    if (disc > 0) {
      ctx.save();
      ctx.globalAlpha = disc;
      ctx.beginPath();
      ctx.arc(cx, cy, 190, 0, Math.PI * 2);
      ctx.fillStyle = C.panel;
      ctx.fill();
      ctx.lineWidth = 12;
      ctx.strokeStyle = bandColor();
      ctx.stroke();
      ctx.restore();
    }
    // The grade itself pops in.
    const pop = fade(0.25, 0.3);
    const scale = pop < 1 ? 0.4 + pop * 0.8 : 1 + Math.max(0, 0.2 - (t - 0.55)) ;
    ctx.save();
    ctx.globalAlpha = pop;
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    const id = g.band;
    const size = id.length > 2 ? 96 : id.length > 1 ? 190 : 240;
    ctx.font = font(size, true);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 14;
    ctx.strokeStyle = C.panel;
    ctx.strokeText(id, 0, 0);
    ctx.fillStyle = bandColor();
    ctx.fillText(id, 0, 0);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = fade(0.7);
    y = cy + BS / 2 + 20;
    text(ctx, `${fmt(g.total)} / ${fmt(g.max)} points`, cx, y, { size: 56, bold: true, align: 'center', color: C.text });
    y += 90;
    y += paragraph(ctx, band().line, y, { size: 38, bold: true, color: bandColor() });
    y += 30;
    paragraph(ctx, champion() ? CEREMONY_TEXT.rivals.champion : CEREMONY_TEXT.rivals.normal, y, { color: C.textMuted });
    ctx.restore();
  }

  function drawInvitation(ctx) {
    const s = sr();
    const readable = campaign.invitationReadable;
    let y = s.y + Math.max(60, (s.h - 140 - (110 + 90 + 40 + 900 + 80)) / 2); // centred on tall screens
    heading(ctx, 'One more thing…', y);
    y += 110;
    y += paragraph(ctx, 'As the lights go down, a message arrives for your workshop.', y, { color: C.textMuted });
    y += 40;
    const a = fade(0.2, 0.5);
    const cardH = 900;
    const rect = { x: s.x + 50, y: y + (1 - a) * 60, w: s.w - 100, h: cardH };
    ctx.save();
    ctx.globalAlpha = a;
    panel(ctx, rect, { fill: C.panel, stroke: C.purple, lineWidth: 6, radius: 32 });
    assets.drawContained(ctx, ENDING_ART.invitation, { x: rect.x + rect.w / 2 - 90, y: rect.y + 30, w: 180, h: 180 });
    text(ctx, INVITATION.title, rect.x + rect.w / 2, rect.y + 240, { size: Z.heading, bold: true, align: 'center', color: C.purple, maxWidth: rect.w - 40 });
    text(ctx, INVITATION.from, rect.x + rect.w / 2, rect.y + 300, { size: Z.small, align: 'center', color: C.textMuted });
    const body = readable ? INVITATION.text : scramble(INVITATION.text, Math.floor(t * 6));
    const lines = wrapLines(body, rect.w - 100, Z.body).slice(0, 8);
    lines.forEach((l, i) => text(ctx, l, rect.x + 50, rect.y + 370 + i * 46, { size: Z.body, color: readable ? C.text : C.textMuted, maxWidth: rect.w - 100 }));
    wrapText(ctx, readable ? INVITATION.readNote : INVITATION.lockedNote, rect.x + 50, rect.y + cardH - 150, rect.w - 100, { size: Z.body, lineH: 44, maxLines: 3, bold: true, color: readable ? C.good : C.purple });
    ctx.restore();
    if (!readable) paragraph(ctx, 'It is kept in the Rumour Archive (Inbox → Rumours).', rect.y + cardH + 30, { size: Z.small, color: C.textMuted });
  }

  function drawChoice(ctx) {
    const s = sr();
    const g = summary()?.grade;
    let y = s.y + 60;
    assets.drawContained(ctx, ENDING_ART.logo, { x: s.x + 140, y, w: s.w - 280, h: 300 });
    y += 330;
    // The key art fills the space between the grade line and the buttons (tall screens have room for it).
    const artTop = y + 170 + (hidden() ? 130 : 0); // the final badge line sits under the grade on the hidden ending
    const artH = choiceRect(0).y - 40 - artTop;
    if (artH > 200) assets.drawContained(ctx, ENDING_ART.keyArt, { x: s.x + 80, y: artTop, w: s.w - 160, h: artH });
    heading(ctx, 'What next?', y);
    y += 100;
    if (g) text(ctx, `Grade ${g.band} · ${fmt(g.total)} / ${fmt(g.max)}`, W / 2, y, { size: Z.button, bold: true, align: 'center', color: bandColor() });
    if (hidden()) {
      assets.drawContained(ctx, ENDING_ART.finalBadge, { x: s.x + 60, y: y + 60, w: 90, h: 90 });
      paragraph(ctx, CEREMONY_TEXT.hidden.badge, y + 70, { size: Z.small, bold: true, color: C.purple, maxLines: 2 });
    }
    const opts = [END_CHOICES.continue, END_CHOICES.credits, END_CHOICES.ngPlus];
    opts.forEach((o, i) => {
      const r = choiceRect(i);
      const locked = i === 2 && !!campaign.ngPlusBlock();
      drawButton(ctx, r, i === 2 ? `${o.label} (NG+${campaign.nextNgPlusLevel})` : o.label, { accent: i === 0 ? C.action : i === 2 ? C.purple : C.progress, locked, disabled: locked, font: font(44, true) });
      text(ctx, o.sub, W / 2, r.y + r.h + 14, { size: Z.small, align: 'center', color: C.textMuted });
    });
  }

  return screen;
}
