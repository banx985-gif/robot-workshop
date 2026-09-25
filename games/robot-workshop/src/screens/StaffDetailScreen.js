// Staff detail (bible §6.3): one worker in full — portrait, role and tier badges, level/XP, salary,
// Energy/Morale, the five work stats against their tier cap, every trait in plain English (signature traits
// marked), and their career record (Milestone 11). Opened by tapping a roster card; ‹ › flip through the team.
// Buttons: Workshop (back to the room with them selected) and Train.
import { ScrollPanel } from '../../../../core/ui/ScrollPanel.js';
import { drawButton, hitRect } from '../../../../core/ui/Button.js';
import { ROLES, TIERS, STAFF_BY_ID, CAREER_COUNTERS } from '../../data/staff.js';
import { TRAITS, LATER_WORDS } from '../../data/traits.js';
import { WORK_STATS } from '../../data/stats.js';
import { RECRUIT_ART } from '../../data/recruitment.js';
import { CALENDAR } from '../../data/balance.js';
import { panel, text, contained, bar, fmt } from '../ui/widgets.js';

const HEADER_H = 130;
const GAP = 24;
const GOLD = '#FFD166';
const GREEN = '#7CFFB2';
const STAT_COLORS = { eng: '#4FC3F7', des: '#FF8AD8', prg: '#B39DDB', fab: '#FFB74D', tst: '#7CFFB2' };

export function createStaffDetailScreen({ renderer, layout, assets, bus, campaign, router, workshop }) {
  const W = renderer.width;
  let staffId = null;
  const scroll = new ScrollPanel({ getRect: bodyRect, contentHeight: 0 });

  const sr = () => layout.safeRect;
  const backRect = () => ({ x: sr().x + 24, y: sr().y + 24, w: 180, h: 86 });
  const navRect = (k) => ({ x: sr().x + 220 + k * 100, y: sr().y + 24, w: 86, h: 86 }); // ‹ ›
  const actionRect = (k) => {
    const s = sr();
    const w = 200;
    return { x: s.x + s.w - 24 - (2 - k) * w - (1 - k) * 16, y: s.y + 24, w, h: 86 };
  };
  function bodyRect() {
    const s = sr();
    const y = s.y + HEADER_H;
    return { x: s.x + 24, y, w: s.w - 48, h: s.y + s.h - 24 - y };
  }

  const current = () => campaign.staff.get(staffId);

  function flip(dir) {
    const list = campaign.staff.staff;
    const i = list.findIndex((s) => s.id === staffId);
    if (i < 0 || list.length < 2) return;
    staffId = list[(i + dir + list.length) % list.length].id;
    scroll.scrollY = 0;
  }

  function nowText(s) {
    const t = campaign.training.trainingOf(s.id);
    if (t) return `Training: ${campaign.training.course(t.courseId).name} · day ${t.daysDone}/${t.days}`;
    if (campaign.research.busyIds.includes(s.id)) return 'Researching at the Research Desk';
    const job = campaign.assignments.jobOf(s.id);
    if (job) return `On ${job.name}`;
    return workshop.taskLabel(s.id) || 'Resting';
  }

  // Word-wrapped lines at the current ctx font.
  function wrap(ctx, str, maxW) {
    const out = [];
    let line = '';
    for (const word of str.split(' ')) {
      const next = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(next).width > maxW) {
        out.push(line);
        line = word;
      } else line = next;
    }
    if (line) out.push(line);
    return out;
  }

  function dateOf(day) {
    const perYear = CALENDAR.daysPerMonth * CALENDAR.monthsPerYear;
    return `Year ${Math.floor(day / perYear) + 1}, Month ${Math.floor((day % perYear) / CALENDAR.daysPerMonth) + 1}`;
  }

  const screen = {
    scroll,
    get staffId() {
      return staffId;
    },
    enter(params = {}) {
      staffId = params.staffId ?? campaign.staff.staff[0]?.id ?? null;
      scroll.scrollY = 0;
    },
    onTap(p) {
      if (hitRect(p, backRect())) return router.go('roster', { focusId: staffId });
      const s = current();
      if (!s) return router.go('roster');
      if (hitRect(p, navRect(0))) return flip(-1);
      if (hitRect(p, navRect(1))) return flip(1);
      if (hitRect(p, actionRect(0))) return router.go('workshop', { selectId: s.id });
      if (hitRect(p, actionRect(1))) return router.go('training', { staffId: s.id });
    },
    onDragStart: (p) => scroll.beginDrag(p),
    onDrag: (p) => scroll.drag(p),
    onDragEnd: (p) => scroll.endDrag(p),

    render(ctx) {
      ctx.fillStyle = '#101418';
      ctx.fillRect(0, 0, W, renderer.height);
      drawButton(ctx, backRect(), '‹ Back', { font: 'bold 32px system-ui, sans-serif' });
      const s = current();
      if (!s) {
        text(ctx, 'This worker is no longer on the team.', W / 2, bodyRect().y + 80, { size: 32, align: 'center', color: '#9AA8B5' });
        return;
      }
      const many = campaign.staff.staff.length > 1;
      drawButton(ctx, navRect(0), '‹', { disabled: !many, font: 'bold 44px system-ui, sans-serif' });
      drawButton(ctx, navRect(1), '›', { disabled: !many, font: 'bold 44px system-ui, sans-serif' });
      drawButton(ctx, actionRect(0), 'Workshop', { font: 'bold 32px system-ui, sans-serif' });
      drawButton(ctx, actionRect(1), campaign.training.trainingOf(s.id) ? 'Training…' : 'Train', { font: 'bold 32px system-ui, sans-serif', accent: GREEN });

      const w = bodyRect().w - 12;
      const tier = TIERS[s.tier];
      const role = ROLES[s.role];
      scroll.begin(ctx);
      let y = 0;

      // --- hero: portrait, name, badges, level, salary, condition ---
      const heroH = 560;
      panel(ctx, { x: 0, y, w, h: heroH }, { stroke: tier.signature ? GOLD : '#35414F', lineWidth: tier.signature ? 5 : 3 });
      const pr = { x: 20, y: y + 20, w: 300, h: heroH - 40 };
      panel(ctx, pr, { fill: '#131820', stroke: null, radius: 18 });
      contained(ctx, assets, s.art, { x: pr.x + 8, y: pr.y + 8, w: pr.w - 16, h: pr.h - 16 }, 'bottom');
      const tx = 350;
      const tw = w - tx - 24;
      text(ctx, s.name, tx, y + 24, { size: 50, bold: true, maxWidth: tw });
      text(ctx, `${role.name} · ${tier.name}${STAFF_BY_ID[s.id] ? ` · ${s.id}` : ''}`, tx, y + 86, { size: 28, color: '#9AA8B5', maxWidth: tw });
      contained(ctx, assets, role.badge, { x: tx, y: y + 128, w: 84, h: 84 });
      contained(ctx, assets, RECRUIT_ART.tierBadges[s.tier], { x: tx + 96, y: y + 128, w: 84, h: 84 });
      text(ctx, `Level ${s.level}`, tx + 200, y + 136, { size: 40, bold: true });
      const need = campaign.staff.xpNeeded(s.level);
      bar(ctx, tx + 200, y + 188, tw - 200, 16, s.xp / need, '#B39DDB');
      text(ctx, `XP ${Math.round(s.xp)} / ${need}`, tx + 200, y + 210, { size: 22, color: '#B8C2CC' });
      text(ctx, `Salary ${fmt(campaign.salaryFor(s))} / month`, tx, y + 256, { size: 30, bold: true, color: GOLD, maxWidth: tw });
      [
        ['Energy', s.energy, GREEN],
        ['Morale', s.morale, '#FFB74D'],
      ].forEach(([label, v, color], i) => {
        const by = y + 310 + i * 52;
        text(ctx, label, tx, by, { size: 28, color: '#B8C2CC' });
        bar(ctx, tx + 130, by + 6, tw - 200, 24, v / 100, color);
        text(ctx, String(Math.round(v)), tx + tw, by, { size: 28, bold: true, align: 'right' });
      });
      const status = ['tired', 'stressed', 'inspired'].filter((k) => s.status[k]).map((k) => k[0].toUpperCase() + k.slice(1));
      text(ctx, status.length ? status.join(' · ') : 'Feeling fine', tx, y + 420, { size: 28, color: status.includes('Inspired') ? GREEN : status.length ? '#FF8A80' : '#9AA8B5', maxWidth: tw });
      text(ctx, `Now: ${nowText(s)}`, tx, y + 462, { size: 28, color: GOLD, maxWidth: tw });
      y += heroH + GAP;

      // --- work stats against the tier cap ---
      const cap = campaign.staff.statCap(s);
      const statsH = 90 + WORK_STATS.length * 66;
      panel(ctx, { x: 0, y, w, h: statsH });
      text(ctx, 'Skills', 24, y + 24, { size: 36, bold: true });
      text(ctx, `${tier.name} cap ${cap} per skill`, w - 24, y + 30, { size: 26, color: '#9AA8B5', align: 'right' });
      WORK_STATS.forEach((st, i) => {
        const ry = y + 86 + i * 66;
        const v = s.stats[st.key];
        text(ctx, st.name, 24, ry + 4, { size: 28, color: '#C9D3DD', maxWidth: 270 });
        bar(ctx, 300, ry + 10, w - 300 - 190, 26, v / cap, STAT_COLORS[st.key]);
        text(ctx, `${v}`, w - 100, ry, { size: 36, bold: true, align: 'right', color: v >= cap ? GOLD : '#FFFFFF' });
        text(ctx, `/${cap}`, w - 24, ry + 8, { size: 24, align: 'right', color: '#7F8C99' });
      });
      y += statsH + GAP;

      // --- traits (plain English; signature marked) ---
      ctx.font = '28px system-ui, sans-serif';
      const traitBlocks = s.traits.map((id) => {
        const t = TRAITS[id] ?? { name: id, description: '' };
        ctx.font = '28px system-ui, sans-serif';
        return { id, t, lines: wrap(ctx, t.description, w - 72) };
      });
      const traitsH = 84 + traitBlocks.reduce((h, b) => h + 56 + b.lines.length * 38 + (b.t.later ? 36 : 0) + 18, 0);
      panel(ctx, { x: 0, y, w, h: traitsH });
      text(ctx, s.traits.length === 1 ? 'Trait' : 'Traits', 24, y + 24, { size: 36, bold: true });
      let ty = y + 84;
      for (const b of traitBlocks) {
        const sig = !!b.t.signature;
        const chipW = (() => {
          ctx.font = 'bold 30px system-ui, sans-serif';
          return ctx.measureText(b.t.name).width + 36;
        })();
        panel(ctx, { x: 24, y: ty, w: chipW, h: 46 }, { fill: sig ? '#4A3A12' : '#3B2F4F', stroke: sig ? GOLD : null, lineWidth: 2, radius: 23 });
        text(ctx, b.t.name, 42, ty + 7, { size: 30, bold: true, color: sig ? GOLD : '#E1D5FF' });
        if (sig) text(ctx, '★ Signature', 24 + chipW + 16, ty + 10, { size: 26, bold: true, color: GOLD });
        ty += 56;
        for (const line of b.lines) {
          text(ctx, line, 36, ty, { size: 28, color: '#E8EEF2' });
          ty += 38;
        }
        if (b.t.later) {
          text(ctx, LATER_WORDS[b.t.later] ?? '', 36, ty, { size: 24, color: '#9AA8B5' });
          ty += 36;
        }
        ty += 18;
      }
      y += traitsH + GAP;

      // --- career record ---
      const rec = campaign.careers.get(s.id);
      const time = campaign.careerTime(s.id);
      const rows = CAREER_COUNTERS.map((c) => [c.label, String(rec?.counters[c.key] ?? 0)]);
      rows.push(['Time with the company', `${time.years} yr ${time.months} mo`]);
      if (rec?.stints.length) rows.push(['First joined', dateOf(rec.stints[0].from)]);
      if (rec && rec.stints.length > 1) rows.push(['Times rejoined', String(rec.stints.length - 1)]);
      const careerH = 90 + rows.length * 54 + 20;
      panel(ctx, { x: 0, y, w, h: careerH });
      text(ctx, 'Career', 24, y + 24, { size: 36, bold: true });
      text(ctx, 'kept even if they leave', w - 24, y + 30, { size: 24, color: '#7F8C99', align: 'right' });
      rows.forEach(([label, value], i) => {
        const ry = y + 90 + i * 54;
        if (i % 2 === 0) panel(ctx, { x: 16, y: ry - 6, w: w - 32, h: 50 }, { fill: 'rgba(255,255,255,0.04)', stroke: null, radius: 10 });
        text(ctx, label, 32, ry + 2, { size: 28, color: '#C9D3DD' });
        text(ctx, value, w - 32, ry + 2, { size: 28, bold: true, align: 'right' });
      });
      y += careerH + GAP;

      scroll.contentHeight = y;
      scroll.end(ctx);
    },
  };
  bus.on('staff:fired', ({ staff }) => {
    if (staff.id === staffId && router.currentName === 'staffDetail') router.go('roster');
  });
  return screen;
}
