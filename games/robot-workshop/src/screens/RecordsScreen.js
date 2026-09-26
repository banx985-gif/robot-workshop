// Records (bible §27, Milestone 18): three tabs in the bright workshop style.
//   Achievements — the 30 visible goals, with their reward, a bar for the count-style ones, unlocked or not
//   Records      — Past campaigns (the archived Year 16 endings, core/RunArchive.js — Milestone 19), then the account
//                  records that survive every new campaign (core/AccountRecords.js)
//   Completion   — the normal catalogue counts; Company Completion and Discovery only after the first Year 16
//                  ending, and Discovery never shows the secret total until the full reveal (core/Completion.js)
// Reached from the Trophy Display / Compete menu (the Compete bottom-bar button opens it too) and from Trophies.
import { THEME, font } from '../../../../core/Theme.js';
import { ScrollPanel } from '../../../../core/ui/ScrollPanel.js';
import { drawButton, hitRect } from '../../../../core/ui/Button.js';
import { ACHIEVEMENTS, ACHIEVEMENT_ART, rewardLabel } from '../../data/achievements.js';
import { RECORDS, RECORD_GROUPS } from '../../data/records.js';
import { ROBOT_STATS } from '../../data/stats.js';
import { PURPOSES, PURPOSE_ORDER } from '../../data/purposes.js';
import { COMPETITIONS } from '../../data/competitions.js';
import { CALENDAR } from '../../data/balance.js';
import { completionFor } from '../systems/completion.js';
import { GRADE_BANDS } from '../../data/ending.js';
import { panel, text, bar, wrapText, fmt, emptyState, stateHeight } from '../ui/widgets.js';
const C = THEME.color;
const Z = THEME.size;

const HEAD_H = 140;
const TABS_H = 130;
const ACH_H = 262;
const REC_H = 150;
const CAT_H = 170;
const GAP = 16;
const TABS = [
  { id: 'achievements', label: 'Achievements' },
  { id: 'records', label: 'Records' },
  { id: 'completion', label: 'Completion' },
];

function formatValue(def, v) {
  switch (def.format) {
    case 'credits':
      return `${fmt(v)} cr`;
    case 'score1':
      return (Math.round(v * 10) / 10).toFixed(1);
    case 'review':
      return `${(Math.round(v * 10) / 10).toFixed(1)} / 10`;
    case 'days':
      return `${fmt(v)} days`;
    case 'service': {
      const months = Math.floor(v / CALENDAR.daysPerMonth);
      const y = Math.floor(months / CALENDAR.monthsPerYear);
      const m = months % CALENDAR.monthsPerYear;
      return y ? `${y} yr ${m} mo` : `${m} months`;
    }
    case 'ngPlus':
      return v ? `NG+${v}` : 'First run';
    case 'grade':
      return `${gradeOf(v)} · ${fmt(v)}`;
    default:
      return fmt(v);
  }
}

const gradeOf = (score) => GRADE_BANDS.reduce((b, g) => (score >= g.min ? g.id : b), GRADE_BANDS[0].id);
const bandColor = (id) => C[GRADE_BANDS.find((g) => g.id === id)?.color] ?? C.gold;
const PAST_H = 250;

// Who / what holds a record ("Sparky 3 · Delivery").
function detailOf(e) {
  const i = e.info ?? {};
  const parts = [i.robot, i.name, i.stat, i.pilot && `pilot ${i.pilot}`].filter(Boolean);
  return parts.join(' · ');
}

export function createRecordsScreen({ renderer, layout, assets, campaign, router }) {
  const W = renderer.width;
  let tab = 'achievements';
  let back = 'workshop';
  const scroll = new ScrollPanel({ getRect: bodyRect, contentHeight: 0 });

  const sr = () => layout.safeRect;
  const headRect = () => ({ x: sr().x + 24, y: sr().y + 24, w: sr().w - 48, h: HEAD_H });
  const backRect = () => ({ x: headRect().x, y: headRect().y + 15, w: 200, h: 110 });
  const tabRect = (i) => {
    const h = headRect();
    const w = (h.w - 2 * 12) / TABS.length;
    return { x: h.x + i * (w + 12), y: h.y + h.h + 10, w, h: 110 };
  };
  function bodyRect() {
    const s = sr();
    const y = s.y + 24 + HEAD_H + 10 + TABS_H;
    return { x: s.x + 24, y, w: s.w - 48, h: s.y + s.h - 24 - y };
  }
  const cw = () => bodyRect().w - 12;

  function setTab(id) {
    if (tab === 'achievements' && id !== tab) campaign.achievements.markAllSeen();
    tab = id;
    scroll.scrollY = 0;
  }

  const screen = {
    scroll,
    get tab() {
      return tab;
    },
    setTab,
    tabRect: (id) => tabRect(TABS.findIndex((t) => t.id === id)),
    enter(params = {}) {
      back = params.back ?? 'workshop';
      tab = params.tab ?? 'achievements';
      scroll.scrollY = 0;
    },
    exit() {
      if (tab === 'achievements') campaign.achievements.markAllSeen();
      campaign.save().catch(() => {});
    },
    onTap(p) {
      if (hitRect(p, backRect())) return router.go(back);
      const i = TABS.findIndex((t, k) => hitRect(p, tabRect(k)));
      if (i >= 0) return setTab(TABS[i].id);
    },
    onDragStart: (p) => scroll.beginDrag(p),
    onDrag: (p) => scroll.drag(p),
    onDragEnd: (p) => scroll.endDrag(p),
    render(ctx) {
      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, W, renderer.height);
      const h = headRect();
      drawButton(ctx, backRect(), '‹ Back', { font: font(Z.button, true) });
      assets.drawContained(ctx, ACHIEVEMENT_ART.records, { x: h.x + 216, y: h.y + 20, w: 100, h: 100 });
      text(ctx, 'Records', h.x + 330, h.y + h.h / 2, { size: Z.title, bold: true, baseline: 'middle', maxWidth: h.w - 340 });
      const unseen = campaign.achievements.unseen;
      TABS.forEach((t, i) => drawButton(ctx, tabRect(i), t.label, { active: tab === t.id, accent: C.progress, font: font(Z.button, true), badge: t.id === 'achievements' && unseen ? unseen : null }));
      scroll.begin(ctx);
      let y = 0;
      if (tab === 'achievements') y = drawAchievements(ctx);
      else if (tab === 'records') y = drawRecords(ctx);
      else y = drawCompletion(ctx);
      scroll.contentHeight = y + 30;
      scroll.end(ctx);
    },
  };

  // --- Achievements ---------------------------------------------------------------------------------------
  function drawAchievements(ctx) {
    const A = campaign.achievements;
    const w = cw();
    text(ctx, `${A.count} of ${ACHIEVEMENTS.length} unlocked`, 4, 10, { size: Z.heading, bold: true });
    text(ctx, 'Each reward is paid once, ever — even over New Game+.', 4, 68, { size: Z.small, color: C.textMuted, maxWidth: w });
    let y = 120;
    for (const d of ACHIEVEMENTS) {
      drawAchievement(ctx, d, { x: 0, y, w, h: ACH_H });
      y += ACH_H + GAP;
    }
    return y;
  }

  function drawAchievement(ctx, d, r) {
    const A = campaign.achievements;
    const got = A.account.unlocked[d.id];
    const fresh = got && !A.account.seen[d.id];
    panel(ctx, r, { fill: got ? C.panelGold : C.panel, stroke: fresh ? C.action : got ? C.gold : C.line, lineWidth: got ? 5 : 3, radius: 28 });
    const icon = { x: r.x + 18, y: r.y + 40, w: 150, h: 150 };
    ctx.save();
    if (!got) {
      ctx.globalAlpha = 0.35;
      ctx.filter = 'grayscale(1)';
    }
    assets.drawContained(ctx, got ? ACHIEVEMENT_ART.badge : ACHIEVEMENT_ART.icon, icon);
    ctx.restore();
    const x = r.x + 190;
    const tw = r.x + r.w - 24 - x;
    text(ctx, d.name, x, r.y + 18, { size: Z.button, bold: true, color: got ? C.gold : C.text, maxWidth: tw - (fresh ? 110 : 0) });
    if (fresh) text(ctx, 'NEW', r.x + r.w - 24, r.y + 22, { size: Z.small, bold: true, color: C.action, align: 'right' });
    wrapText(ctx, d.text, x, r.y + 66, tw, { size: Z.body, lineH: 42, maxLines: 2 });
    text(ctx, rewardLabel(d.reward), x, r.y + 156, { size: Z.body, bold: true, color: got ? C.good : C.gold, maxWidth: tw * 0.62 });
    const pr = A.progress(d);
    if (got) {
      const when = got.runId === campaign.campaignId && got.day != null ? campaign.clock.shortLabel(got.day) : 'an earlier run';
      text(ctx, '✓ Unlocked', r.x + r.w - 24, r.y + 156, { size: Z.body, bold: true, color: C.good, align: 'right' });
      text(ctx, `Unlocked ${when}`, x, r.y + 208, { size: Z.small, color: C.textMuted, maxWidth: tw });
    } else if (pr) {
      text(ctx, `${fmt(pr.value)} / ${fmt(pr.target)}`, r.x + r.w - 24, r.y + 156, { size: Z.body, bold: true, color: C.progress, align: 'right', maxWidth: tw * 0.36 });
      bar(ctx, x, r.y + 214, tw, 24, pr.frac, C.progress);
    } else text(ctx, 'Not yet', r.x + r.w - 24, r.y + 156, { size: Z.body, bold: true, color: C.textMuted, align: 'right' });
  }

  // --- Records --------------------------------------------------------------------------------------------
  function recordRows() {
    const R = campaign.records;
    const rows = [];
    for (const g of RECORD_GROUPS) {
      const list = [];
      for (const d of RECORDS.filter((x) => x.group === g.id)) {
        if (!d.keyed) {
          list.push({ def: d, label: d.label, entry: R.get(d.id) });
          continue;
        }
        const all = R.all(d.id);
        const keys = d.keyed === 'purpose' ? PURPOSE_ORDER : d.keyed === 'robotStat' ? ROBOT_STATS.map((s) => s.key) : COMPETITIONS.map((e) => e.id);
        const name = (k) => (d.keyed === 'purpose' ? `Best ${PURPOSES[k]?.name ?? k} robot` : d.keyed === 'robotStat' ? `Highest ${ROBOT_STATS.find((s) => s.key === k)?.name ?? k}` : `${k} ${COMPETITIONS.find((e) => e.id === k)?.name ?? ''} best`);
        const shown = keys.filter((k) => all[k]);
        if (!shown.length) list.push({ def: d, label: d.label, entry: null });
        for (const k of shown) list.push({ def: d, label: name(k), entry: all[k] });
      }
      rows.push({ group: g, list });
    }
    return rows;
  }

  // Past campaigns (Milestone 19): the last few Year 16 endings (data/ending.js archiveMax), newest first.
  function drawPast(ctx, y, w) {
    const list = campaign.archive.list;
    text(ctx, 'Past campaigns', 4, y + 10, { size: Z.heading, bold: true, color: C.actionDark });
    y += 70;
    if (!list.length) {
      const r = { x: 0, y, w, h: 130 };
      panel(ctx, r, { fill: C.panelDim, radius: 24 });
      wrapText(ctx, 'Reach the end of Year 16 to see your first campaign here, with its grade.', 24, y + 24, w - 48, { size: Z.body, lineH: 42, maxLines: 2, color: C.textMuted });
      return y + 130 + 28;
    }
    for (const e of list) {
      const r = { x: 0, y, w, h: PAST_H };
      const here = e.runId === campaign.campaignId;
      const col = bandColor(e.grade.band);
      panel(ctx, r, { fill: here ? C.panelGold : C.panel, stroke: col, lineWidth: 5, radius: 28 });
      text(ctx, e.grade.band, 110, y + 70, { size: e.grade.band.length > 2 ? Z.heading : 88, bold: true, align: 'center', baseline: 'middle', color: col });
      text(ctx, `${fmt(e.grade.total)} / ${fmt(e.grade.max)}`, 110, y + 150, { size: Z.small, bold: true, align: 'center', color: C.textMuted });
      const x = 220;
      const tw = w - x - 24;
      text(ctx, `${e.ngPlus ? `NG+${e.ngPlus}` : 'First run'} · Year ${e.endedYear} ending${here ? ' · this run' : ''}`, x, y + 22, { size: Z.button, bold: true, maxWidth: tw });
      const rc = e.recap ?? {};
      text(ctx, `Rank ${e.rank} · ${rc.robotsBuilt ?? 0} robots · ${(rc.trophies ?? []).length} trophies${rc.worldChampion ? ' · World Champions' : ''}`, x, y + 80, { size: Z.body, maxWidth: tw });
      text(ctx, `Best robot: ${rc.bestRobot ? `${rc.bestRobot.name} (Quality ${(Math.round(rc.bestRobot.quality * 10) / 10).toFixed(1)})` : '—'}`, x, y + 128, { size: Z.body, maxWidth: tw });
      text(ctx, `Money made: ${fmt(rc.moneyMade ?? 0)} cr`, x, y + 176, { size: Z.small, color: C.textMuted, maxWidth: tw });
      y += PAST_H + 12;
    }
    return y + 16;
  }

  function drawRecords(ctx) {
    const w = cw();
    let y = drawPast(ctx, 0, w);
    text(ctx, 'Your bests — kept across every run', 4, y + 10, { size: Z.heading, bold: true, maxWidth: w });
    y += 80;
    for (const { group, list } of recordRows()) {
      text(ctx, group.name, 4, y + 10, { size: Z.heading, bold: true, color: C.actionDark });
      y += 70;
      for (const row of list) {
        drawRecord(ctx, row, { x: 0, y, w, h: REC_H });
        y += REC_H + 12;
      }
      y += 16;
    }
    return y;
  }

  function drawRecord(ctx, { def, label, entry }, r) {
    panel(ctx, r, { fill: entry ? C.panel : C.panelDim, radius: 24 });
    assets.drawContained(ctx, def.icon, { x: r.x + 16, y: r.y + 25, w: 100, h: 100 });
    const x = r.x + 136;
    const valW = 300;
    text(ctx, label, x, r.y + 22, { size: Z.body, bold: true, maxWidth: r.w - 24 - x - valW + r.x });
    const detail = entry ? detailOf(entry) : def.later ?? 'Not set yet';
    text(ctx, detail || (entry?.runId === campaign.campaignId ? 'This run' : 'An earlier run'), x, r.y + 84, { size: Z.small, color: C.textMuted, maxWidth: r.w - 24 - x + r.x });
    text(ctx, entry ? formatValue(def, entry.value) : '—', r.x + r.w - 24, r.y + 22, { size: Z.button, bold: true, align: 'right', color: entry ? C.progress : C.textFaint, maxWidth: valW });
  }

  // --- Completion -----------------------------------------------------------------------------------------
  function drawCompletion(ctx) {
    const w = cw();
    const v = completionFor(campaign);
    let y = 0;
    if (v.company) {
      const r = { x: 0, y, w, h: 220 };
      panel(ctx, r, { fill: C.panelGold, stroke: C.gold, lineWidth: 5, radius: 28 });
      assets.drawContained(ctx, ACHIEVEMENT_ART.icon, { x: 18, y: y + 40, w: 140, h: 140 });
      text(ctx, 'Company Completion', 180, y + 24, { size: Z.heading, bold: true, maxWidth: w - 360 });
      text(ctx, `${v.company.pct}%`, w - 24, y + 24, { size: Z.title, bold: true, align: 'right', color: C.gold });
      bar(ctx, 180, y + 100, w - 204, 30, v.company.found / (v.company.total || 1), C.good);
      text(ctx, `Visible content: ${fmt(v.company.found)} of ${fmt(v.company.total)}`, 180, y + 150, { size: Z.body, maxWidth: w - 204 });
      y += r.h + GAP;
    }
    if (v.discovery) {
      const r = { x: 0, y, w, h: 220 };
      panel(ctx, r, { fill: C.panelInfo, stroke: C.purple, lineWidth: 5, radius: 28 });
      assets.drawContained(ctx, 'ui_icon_10_secret', { x: 18, y: y + 40, w: 140, h: 140 });
      text(ctx, 'Discovery', 180, y + 24, { size: Z.heading, bold: true, color: C.purple });
      // Discovered secrets, kept apart from the visible total (§27.3): a % only once the full total is known.
      const dpct = v.discovery.total ? `${Math.floor((v.discovery.found / v.discovery.total) * 100)}%` : null;
      text(ctx, dpct ?? v.discovery.text, w - 24, y + 24, { size: Z.title, bold: true, align: 'right', color: C.purple, maxWidth: w - 460 });
      wrapText(ctx, v.discovery.total ? `Every secret is on the map now: ${v.discovery.text} found.` : 'Secrets found. The total grows as you hear of new kinds of secret.', 180, y + 110, w - 204, { size: Z.body, lineH: 42, maxLines: 2 });
      y += r.h + GAP;
    }
    if (!v.company) {
      // Before the first Year 16 ending only the catalogue counts show (§27.3).
      const s = { art: ACHIEVEMENT_ART.icon, title: 'Completion', text: 'Company Completion (the visible content) and Discovery (secrets found) appear after your first Year 16 ending.' };
      const h = stateHeight(w, s);
      emptyState(ctx, assets, { x: 0, y, w, h }, s);
      y += h + GAP;
    }
    text(ctx, 'Catalogue', 4, y + 10, { size: Z.heading, bold: true, color: C.actionDark });
    y += 74;
    for (const c of v.catalogue) {
      const r = { x: 0, y, w, h: CAT_H };
      const done = c.found >= c.total;
      panel(ctx, r, { fill: done ? C.panelGood : C.panel, stroke: done ? C.good : C.line, radius: 24 });
      assets.drawContained(ctx, c.icon, { x: 16, y: y + 30, w: 110, h: 110 });
      text(ctx, c.label, 146, y + 20, { size: Z.body, bold: true, maxWidth: w - 146 - 220 });
      text(ctx, `${c.found} / ${c.total}`, w - 24, y + 18, { size: Z.button, bold: true, align: 'right', color: done ? C.good : C.progress });
      bar(ctx, 146, y + 80, w - 170, 26, c.found / (c.total || 1), done ? C.good : C.progress);
      text(ctx, c.scope === 'this run' ? 'This run' : 'All runs', 146, y + 120, { size: Z.small, color: C.textMuted });
      y += CAT_H + 12;
    }
    return y;
  }

  return screen;
}
