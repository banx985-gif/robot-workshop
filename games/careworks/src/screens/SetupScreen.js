// Facility Setup (Milestone 0, bible §3.5.2–3.5.7) for one campaign slot. Top to bottom, in the bible's order:
// Facility Name (type it or Random), Facility Director Name (type it or Random; shown as "Facility Director <name>"),
// Accent Colour (six palettes or Random, with the sign preview — cosmetic only), Choose Founding Staff (five cards:
// role, trait and Founder Perk; code-drawn portraits for now), then RANDOMISE ALL (every field stays editable after).
// "Review and start" opens the confirmation panel (facility, Director, Founder + role, perk, colour preview) with
// START FACILITY. Drag scrolls. Layout and tapping share one pass, so they can never disagree.
import { THEME, font } from '../../../../core/Theme.js';
import { ScrollPanel } from '../../../../core/ui/ScrollPanel.js';
import { drawButton, hitRect } from '../../../../core/ui/Button.js';
import { card, text, para } from '../../../../core/ui/Kit.js';
import { pickName, pickIndex } from '../../../../core/NamePicker.js';
import { FOUNDERS, PALETTES, FACILITY_NAMES, DIRECTOR_NAMES, NAME_MAX, ROLES, founderById, paletteById } from '../../data/setup.js';
import { drawPortrait, drawSign, diceButton } from '../ui/careArt.js';
import { directorLine } from '../systems/facility.js';

const C = THEME.color;
const S = THEME.size;
const PAD = 32;

export function createSetupScreen({ layout, assets, textPrompt, onBack, onStart }) {
  let slot = 1;
  let replacing = null; // the summary of the facility this slot holds now (START asks before replacing it)
  let setup = null; // { facility, director, palette, founder }
  let confirming = false;

  const headerRect = () => {
    const sr = layout.safeRect;
    return { x: sr.x + 24, y: sr.y + 24, w: 220, h: 110 };
  };
  const bottomRect = () => layout.anchor('bottom', layout.safeRect.w - 64, THEME.button.minH + 20, 24);
  const panelRect = () => {
    const h = headerRect();
    const sr = layout.safeRect;
    const y = h.y + h.h + 20;
    return { x: sr.x + 16, y, w: sr.w - 32, h: bottomRect().y - 16 - y };
  };
  const scroll = new ScrollPanel({ getRect: panelRect });
  const missing = () => [!setup.facility.trim() && 'a facility name', !setup.director.trim() && "the Director's name"].filter(Boolean);

  const indexOf = (list, id) => list.findIndex((x) => x.id === id);
  const random = {
    facility: () => (setup.facility = pickName(FACILITY_NAMES, { not: setup.facility })),
    director: () => (setup.director = pickName(DIRECTOR_NAMES, { not: setup.director })),
    palette: () => (setup.palette = PALETTES[pickIndex(PALETTES.length, { not: indexOf(PALETTES, setup.palette) })].id),
    founder: () => (setup.founder = FOUNDERS[pickIndex(FOUNDERS.length, { not: indexOf(FOUNDERS, setup.founder) })].id),
  };
  const randomiseAll = () => Object.values(random).forEach((fn) => fn());

  // One pass over the scrolling content (content coordinates). Draws when ctx is given, returns the action under
  // `tap`, and records every tappable rect by id in `rects`.
  function pass(ctx, tap, rects = null) {
    const w = panelRect().w;
    const cw = w - PAD * 2;
    const palette = paletteById(setup.palette);
    let y = PAD;
    let hit = null;
    const box = (r, fn, id) => {
      if (rects && id) rects[id] = r;
      if (tap && !hit && hitRect(tap, r)) hit = fn;
    };
    const heading = (n, label, sub = null) => {
      if (ctx) {
        text(ctx, `${n}. ${label}`, PAD, y, { size: S.heading, bold: true, maxWidth: sub ? cw * 0.55 : cw });
        if (sub) text(ctx, sub, PAD + cw, y + 10, { size: S.small, color: C.textMuted, align: 'right', maxWidth: cw * 0.43 });
      }
      y += 66;
    };

    // A typed field with a Random button beside it.
    const field = (id, n, label, value, placeholder, max) => {
      heading(n, label);
      const f = { x: PAD, y, w: cw - 270, h: 110 };
      const rnd = { x: PAD + cw - 250, y, w: 250, h: 110 };
      if (ctx) {
        ctx.fillStyle = C.sheet;
        ctx.strokeStyle = value.trim() ? C.outline : C.action;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.roundRect(f.x, f.y, f.w, f.h, 22);
        ctx.fill();
        ctx.stroke();
        text(ctx, value || placeholder, f.x + 28, f.y + f.h / 2, { size: S.heading, bold: !!value, color: value ? C.text : C.textFaint, baseline: 'middle', maxWidth: f.w - 56 });
        diceButton(ctx, assets, rnd, 'Random', { accent: C.progress });
      }
      box(f, () => edit(id, f, max, placeholder), id);
      box(rnd, random[id], `${id}Random`);
      y += 110 + 20;
    };
    field('facility', 1, 'Facility Name', setup.facility, 'Tap to name your facility', NAME_MAX.facility);
    y += 16;
    field('director', 2, 'Facility Director Name', setup.director, 'Tap to type your name', NAME_MAX.director);
    if (ctx) text(ctx, directorLine(setup.director.trim(), setup.facility.trim()), PAD, y, { size: S.body, color: palette.dark, bold: true, maxWidth: cw });
    y += 50 + 30;

    // 3. Accent colour: six palettes + Random, then the sign preview.
    heading(3, 'Accent Colour', 'cosmetic only');
    const n = PALETTES.length + 1;
    const sw = Math.min(120, (cw - (n - 1) * 16) / n);
    PALETTES.forEach((p, i) => {
      const r = { x: PAD + i * (sw + 16), y, w: sw, h: sw };
      const on = setup.palette === p.id;
      if (ctx) {
        ctx.fillStyle = p.hex;
        ctx.strokeStyle = C.outline;
        ctx.lineWidth = on ? 8 : 4;
        ctx.beginPath();
        ctx.roundRect(r.x + 6, r.y + 6, r.w - 12, r.h - 12, 22);
        ctx.fill();
        ctx.stroke();
        if (on) text(ctx, '✓', r.x + r.w / 2, r.y + r.h / 2 + 2, { size: 56, bold: true, color: '#FFFFFF', align: 'center', baseline: 'middle' });
      }
      box(r, () => (setup.palette = p.id), `palette:${p.id}`);
    });
    const rr = { x: PAD + (n - 1) * (sw + 16), y, w: sw, h: sw };
    if (ctx) diceButton(ctx, assets, rr, '', { accent: C.progress });
    box(rr, random.palette, 'paletteRandom');
    y += sw + 12;
    if (ctx) text(ctx, palette.name, PAD, y, { size: S.small, bold: true, color: palette.dark });
    y += 48;
    if (ctx) drawSign(ctx, assets, { x: PAD + cw * 0.1, y, w: cw * 0.8, h: 240 }, setup.facility.trim(), palette, setup.director.trim() ? `Facility Director ${setup.director.trim()}` : '');
    y += 240 + 40;

    // 4. Choose Founding Staff: five cards.
    heading(4, 'Choose Founding Staff', 'perk lasts the whole run');
    for (const f of FOUNDERS) {
      const on = setup.founder === f.id;
      const tw = cw - 230 - 40;
      const perkH = para(null, f.perk.text, 0, 0, tw, { size: S.small });
      const h = Math.max(240, 200 + perkH);
      const r = { x: PAD, y, w: cw, h };
      if (ctx) {
        card(ctx, r, on ? 'selected' : 'normal');
        drawPortrait(ctx, { x: r.x + 20, y: r.y + 20, w: 200, h: 200 }, f, on ? C.good : null, assets); // (Milestone 28b: their own portrait)
        const tx = r.x + 250;
        let ty = r.y + 24;
        text(ctx, f.name, tx, ty, { size: S.heading, bold: true, maxWidth: tw - 160 });
        if (on) text(ctx, '✓ Founder', r.x + r.w - 24, ty + 6, { size: S.small, bold: true, color: C.good, align: 'right' });
        ty += 56;
        text(ctx, `${ROLES[f.role].name} · ${f.trait}`, tx, ty, { size: S.body, color: C.textMuted, maxWidth: tw });
        ty += 48;
        text(ctx, f.perk.name, tx, ty, { size: S.body, bold: true, color: C.purple, maxWidth: tw });
        ty += 46;
        para(ctx, f.perk.text, tx, ty, tw, { size: S.small });
      }
      box(r, () => (setup.founder = f.id), `founder:${f.id}`);
      y += h + 20;
    }
    y += 20;

    // 5. RANDOMISE ALL.
    const all = { x: PAD, y, w: cw, h: 130 };
    if (ctx) diceButton(ctx, assets, all, 'RANDOMISE ALL', { accent: C.purple, font: font(S.button, true) });
    box(all, randomiseAll, 'randomAll');
    y += 130 + 16;
    if (ctx) text(ctx, 'Fills every field. You can still change any of them.', PAD + cw / 2, y, { size: S.small, color: C.textMuted, align: 'center', maxWidth: cw });
    y += 50;
    return { height: y + PAD, hit };
  }

  function edit(id, fieldContent, max, placeholder) {
    const pr = panelRect();
    const rect = { x: pr.x + fieldContent.x, y: pr.y + fieldContent.y - scroll.scrollY, w: fieldContent.w, h: fieldContent.h };
    textPrompt.open({ rect, value: setup[id], maxLength: max, placeholder, onDone: (v) => (setup[id] = v.trim().slice(0, max)) });
  }

  // --- 6. the confirmation panel (bible §3.5.7) ----------------------------------------------------------------
  const confirmLayout = () => {
    const sr = layout.safeRect;
    const w = Math.min(sr.w - 48, 1000);
    const h = Math.min(sr.h - 80, 1240);
    const x = sr.x + (sr.w - w) / 2;
    const y = sr.y + (sr.h - h) / 2;
    const start = { x: x + 40, y: y + h - 40 - 130, w: w - 80, h: 130 };
    const change = { x: x + 40, y: start.y - 24 - 110, w: w - 80, h: 110 };
    return { box: { x, y, w, h }, start, change };
  };
  function drawConfirm(ctx) {
    const L = confirmLayout();
    const b = L.box;
    const sr = layout.safeRect;
    ctx.fillStyle = C.overlay;
    ctx.fillRect(sr.x - 2000, sr.y - 2000, sr.w + 4000, sr.h + 4000);
    card(ctx, b, 'gold');
    const f = founderById(setup.founder);
    const palette = paletteById(setup.palette);
    const room = L.change.y - b.y; // everything above the buttons
    const k = Math.min(1, room / 900);
    let y = b.y + 32 * k;
    text(ctx, 'Ready to open your facility?', b.x + b.w / 2, y, { size: S.title, bold: true, align: 'center', maxWidth: b.w - 60 });
    y += 84 * k;
    const signH = 200 * k;
    drawSign(ctx, assets, { x: b.x + b.w * 0.15, y, w: b.w * 0.7, h: signH }, setup.facility, palette, palette.name);
    y += signH + 24 * k;
    const ps = 180 * k;
    drawPortrait(ctx, { x: b.x + 40, y, w: ps, h: ps }, f, palette.hex, assets);
    const tx = b.x + 40 + ps + 30;
    const tw = b.x + b.w - 40 - tx;
    const rows = [
      ['Facility', setup.facility],
      ['Facility Director', setup.director],
      ['Founder', f.name],
      ['Role', ROLES[f.role].name],
    ];
    let ry = y;
    for (const [key, v] of rows) {
      text(ctx, key, tx, ry, { size: S.small, color: C.textMuted });
      text(ctx, v, tx + tw, ry - 4, { size: S.body, bold: true, align: 'right', maxWidth: tw - 250 });
      ry += 46 * k;
    }
    y = Math.max(ry, y + ps) + 24 * k;
    text(ctx, `Founder Perk: ${f.perk.name}`, b.x + 40, y, { size: S.body, bold: true, color: C.purple, maxWidth: b.w - 80 });
    y += 48;
    y += para(ctx, f.perk.text, b.x + 40, y, b.w - 80, { size: S.small });
    if (replacing) {
      y += 12;
      text(ctx, `Replaces Slot ${slot}: ${replacing.facility} (Year ${replacing.year})`, b.x + 40, y, { size: S.small, bold: true, color: C.bad, maxWidth: b.w - 80 });
    }
    drawButton(ctx, L.change, 'Change something', { accent: C.progress });
    drawButton(ctx, L.start, 'START FACILITY', { accent: palette.hex, font: font(48, true) });
  }

  const screen = {
    get setup() {
      return setup;
    },
    get slot() {
      return slot;
    },
    get confirming() {
      return confirming;
    },
    get ready() {
      return missing().length === 0;
    },
    randomiseAll,
    enter(params = {}) {
      slot = params.slot ?? 1;
      replacing = params.replacing ?? null;
      confirming = false;
      setup = { facility: '', director: '', palette: PALETTES[0].id, founder: FOUNDERS[0].id };
      scroll.scrollY = 0;
    },
    exit() {
      textPrompt.close();
    },
    onBack() {
      if (confirming) {
        confirming = false;
        return true;
      }
      onBack();
      return true;
    },
    onDragStart(p) {
      if (!confirming) scroll.beginDrag(p);
    },
    onDrag(p) {
      if (!confirming) scroll.drag(p);
    },
    onDragEnd(p) {
      scroll.endDrag(p);
    },
    onUp(p) {
      scroll.endDrag(p);
    },
    onWheel(p) {
      if (confirming) return;
      scroll.scrollY += p.deltaY ?? p.dy ?? 0;
      scroll.clamp();
    },
    onTap(p) {
      if (confirming) {
        const L = confirmLayout();
        if (hitRect(p, L.start)) {
          confirming = false;
          onStart(slot, { ...setup, facility: setup.facility.trim(), director: setup.director.trim() });
        } else if (hitRect(p, L.change) || !hitRect(p, L.box)) confirming = false;
        return;
      }
      if (hitRect(p, headerRect())) return void onBack();
      if (hitRect(p, bottomRect())) {
        if (screen.ready) {
          textPrompt.close();
          confirming = true;
        }
        return;
      }
      if (!scroll.contains(p)) return;
      pass(null, scroll.toContent(p)).hit?.();
    },
    render(ctx) {
      const hr = headerRect();
      const sr = layout.safeRect;
      drawButton(ctx, hr, '‹ Back', { accent: C.progress });
      text(ctx, 'Facility Setup', sr.x + sr.w / 2 + 60, hr.y + hr.h / 2 - 20, { size: S.title, bold: true, align: 'center', baseline: 'middle' });
      const sub = replacing ? `Campaign slot ${slot} · replaces ${replacing.facility}` : `Campaign slot ${slot}`;
      text(ctx, sub, sr.x + sr.w / 2 + 60, hr.y + hr.h / 2 + 34, { size: S.small, bold: !!replacing, color: replacing ? C.bad : C.textMuted, align: 'center', baseline: 'middle', maxWidth: sr.w - 320 });
      const r = panelRect();
      ctx.fillStyle = C.panel;
      ctx.strokeStyle = C.outline;
      ctx.lineWidth = THEME.panel.line;
      ctx.beginPath();
      ctx.roundRect(r.x, r.y, r.w, r.h, THEME.panel.radius);
      ctx.fill();
      ctx.stroke();
      scroll.begin(ctx);
      scroll.contentHeight = pass(ctx, null).height;
      scroll.end(ctx);
      const miss = missing();
      drawButton(ctx, bottomRect(), miss.length ? `Needs ${miss.join(' and ')}` : 'Review and start', { disabled: miss.length > 0, font: font(miss.length ? S.body : S.button, true) });
      if (confirming) drawConfirm(ctx);
    },
  };
  // Screen rect of a tappable thing (tests): 'randomAll', 'facility', 'facilityRandom', 'palette:teal',
  // 'paletteRandom', 'founder:RN01'… plus 'review', 'start', 'change'.
  screen.rectOf = (what) => {
    if (what === 'review') return bottomRect();
    if (what === 'start' || what === 'change') return confirmLayout()[what];
    const rects = {};
    scroll.contentHeight = pass(null, null, rects).height;
    const r = rects[what];
    const pr = panelRect();
    return r ? { x: pr.x + r.x, y: pr.y + r.y - scroll.scrollY, w: r.w, h: r.h } : null;
  };
  screen.scrollTo = (what) => {
    const rects = {};
    scroll.contentHeight = pass(null, null, rects).height;
    const r = rects[what];
    if (r) {
      scroll.scrollY = r.y - 40;
      scroll.clamp();
    }
  };
  return screen;
}
