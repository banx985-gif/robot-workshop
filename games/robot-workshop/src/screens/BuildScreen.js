// Build mode (bible §6.3 Facilities / Build Mode, §18): the workshop above, the catalogue at the bottom.
//   Facilities tab — every facility; locked ones greyed with their unlock rule. Tap one to place it:
//     a ghost appears on a free spot, green if it fits and red (with the reason) if not; drag it or tap the
//     floor to move it; Rotate; Place pays for it.
//   Tap a built facility to edit it: drag it to move (free), Rotate, or Sell (50% back, with a confirm).
//   Expansions tab — the four workshop expansions, with cost, rank and a Buy button (with a confirm).
// The room itself is drawn by the workshop screen (same camera, cached floor layer).
import { ScrollPanel } from '../../../../core/ui/ScrollPanel.js';
import { drawButton, drawPadlock, hitRect } from '../../../../core/ui/Button.js';
import { FACILITIES, FACILITY_ORDER, EXPANSIONS, BUILD_ART, LOCKED_LATER } from '../../data/facilities.js';
import { describeUnlock } from '../systems/unlockRules.js';
import { createTopBar } from '../ui/TopBar.js';
import { panel, text, contained, fmt } from '../ui/widgets.js';

const CARD_H = 250;
const GAP = 14;
const ROW_H = 150;
const TABS = [
  { id: 'facilities', label: 'Facilities' },
  { id: 'expansions', label: 'Expansions' },
];
const GREEN = '#7CFFB2';
const RED = '#FF8A80';

export function createBuildScreen({ renderer, layout, assets, campaign, router, workshop, hud }) {
  const W = renderer.width;
  const F = campaign.facilities;
  const topBar = createTopBar({ layout, campaign, hud, nav: [{ id: 'done', label: 'Done', onTap: () => router.go('workshop') }] });
  let tab = 'facilities';
  let mode = 'catalogue'; // 'catalogue' | 'place' | 'edit'
  let placing = null; // { def, col, row, rot } while placing a new facility
  let editUid = null; // facility being edited
  let drag = null; // { id, kind: 'ghost' | 'move' | 'pan' | 'scroll', grab: { dc, dr } }
  let confirm = null; // { text, yes, onYes }
  let message = null; // { text, color, until }
  const scroll = new ScrollPanel({ getRect: scrollRect, contentHeight: 0 });

  // --- layout ---------------------------------------------------------------------
  const sr = () => layout.safeRect;
  const catalogueH = () => Math.min(760, Math.round(sr().h * 0.42));
  const panelH = () => (mode === 'catalogue' ? catalogueH() : 350);
  function panelRect(h = panelH()) {
    const s = sr();
    return { x: s.x + 24, y: s.y + s.h - 24 - h, w: s.w - 48, h };
  }
  function msgRect() {
    const t = topBar.rect();
    return { x: t.x, y: t.y + t.h + 12, w: t.w, h: 72 };
  }
  // The room area between the header and the panel. The camera always uses the catalogue-sized one, so the
  // room stays put when the panel shrinks (placing / editing) — the extra space just shows more floor.
  function worldRect(forCamera = false) {
    const m = msgRect();
    const p = panelRect(forCamera ? catalogueH() : panelH());
    const y = m.y + m.h + 8;
    return { x: 0, y, w: W, h: Math.max(100, p.y - 8 - y) };
  }
  function tabRect(i) {
    const p = panelRect();
    const w = (p.w - 40 - 16) / 2;
    return { x: p.x + 20 + i * (w + 16), y: p.y + 18, w, h: 80 };
  }
  function scrollRect() {
    const p = panelRect();
    const y = p.y + 18 + 80 + 16;
    return { x: p.x + 16, y, w: p.w - 32, h: p.y + p.h - 16 - y };
  }
  const cardW = () => (scrollRect().w - 12 - 2 * GAP) / 3;
  const cardRect = (i) => ({ x: (i % 3) * (cardW() + GAP), y: Math.floor(i / 3) * (CARD_H + GAP), w: cardW(), h: CARD_H });
  const rowRect = (i) => ({ x: 0, y: i * (ROW_H + GAP), w: scrollRect().w - 12, h: ROW_H });
  const buyRect = (i) => {
    const r = rowRect(i);
    return { x: r.x + r.w - 20 - 230, y: r.y + (r.h - 84) / 2, w: 230, h: 84 };
  };
  function actionRect(i) {
    const p = panelRect();
    const w = (p.w - 40 - 2 * 16) / 3;
    return { x: p.x + 20 + i * (w + 16), y: p.y + p.h - 20 - 96, w, h: 96 };
  }
  function dialogRect() {
    const s = sr();
    return { x: s.x + 60, y: s.y + s.h / 2 - 190, w: s.w - 120, h: 380 };
  }
  const dialogButton = (i) => {
    const d = dialogRect();
    const w = (d.w - 60 - 20) / 2;
    return { x: d.x + 30 + i * (w + 20), y: d.y + d.h - 30 - 96, w, h: 96 };
  };

  // Screen rect of a thing inside the scroll panel, only if fully in view (guide).
  function inScroll(r) {
    const b = scrollRect();
    const y = b.y + r.y - scroll.scrollY;
    if (y < b.y - 1 || y + r.h > b.y + b.h + 1) return null;
    return { x: b.x + r.x, y, w: r.w, h: r.h };
  }

  function say(textStr, color = '#FFD166', secs = 3) {
    message = { text: textStr, color, until: performance.now() + secs * 1000 };
  }

  // Keep the camera looking at the space between the header and the panel.
  function fitCamera() {
    const wr = worldRect(true);
    const cam = workshop.camera;
    if (cam.viewY !== wr.y || cam.viewH !== wr.h) {
      const cx = cam.x + cam.visibleW / 2;
      const cy = cam.y + cam.visibleH / 2;
      cam.viewX = 0;
      cam.viewY = wr.y;
      cam.setView(W, wr.h);
      cam.centerOn(cx, cy);
    }
  }

  // --- placing and editing ------------------------------------------------------------
  function checkGhost(g, ignoreUid = null) {
    return F.check(g.def, g.col, g.row, g.rot, ignoreUid);
  }

  function showGhost(g, hideUid = null) {
    const res = checkGhost(g, hideUid);
    workshop.setGhost({ ...g, ok: res.ok, reason: res.reason, hideUid });
    return res;
  }

  function startPlacing(defId) {
    const block = campaign.buyBlock(defId);
    if (block) return say(block, RED);
    const wr = worldRect();
    const near = workshop.cellAt({ x: W / 2, y: wr.y + wr.h / 2 });
    const spot = F.findSpot(defId, 0, near) ?? F.findSpot(defId, 1, near);
    if (!spot) return say('No room for this — move or sell something, or buy an expansion', RED);
    placing = { def: defId, col: spot.col, row: spot.row, rot: F.check(defId, spot.col, spot.row, 0).ok ? 0 : 1 };
    mode = 'place';
    editUid = null;
    workshop.setBuildSelected(null);
    showGhost(placing);
  }

  function place() {
    const res = campaign.buildFacility(placing.def, placing.col, placing.row, placing.rot);
    if (!res.ok) return say(res.reason, RED);
    say(`Built: ${FACILITIES[placing.def].name}`, GREEN);
    campaign.save().catch(() => {});
    placing = null;
    workshop.setGhost(null);
    mode = 'catalogue';
  }

  function startEdit(uid) {
    const item = F.get(uid);
    if (!item) return;
    editUid = uid;
    placing = null;
    mode = 'edit';
    workshop.setGhost(null);
    workshop.setBuildSelected(uid);
  }

  function closeEdit() {
    editUid = null;
    placing = null;
    mode = 'catalogue';
    workshop.setGhost(null);
    workshop.setBuildSelected(null);
  }

  function rotate() {
    if (mode === 'place') {
      placing.rot = placing.rot ? 0 : 1;
      showGhost(placing);
      return;
    }
    const item = F.get(editUid);
    const res = campaign.moveFacility(item.uid, item.col, item.row, item.rot ? 0 : 1);
    if (!res.ok) say(`Can't turn it here: ${res.reason}`, RED);
    else campaign.save().catch(() => {});
  }

  function askSell() {
    const item = F.get(editUid);
    const block = campaign.sellBlock(editUid);
    if (block) return say(block, RED);
    const d = FACILITIES[item.def];
    confirm = {
      text: `Sell the ${d.name}?`,
      sub: `You get ${fmt(F.sellValue(item))} credits back (half of ${fmt(d.cost)}).`,
      yes: 'Sell',
      no: 'Keep it',
      onYes: () => {
        const res = campaign.sellFacility(item.uid);
        if (!res.ok) return say(res.reason, RED);
        say(`Sold: ${d.name} (+${fmt(res.refund)})`, GREEN);
        campaign.save().catch(() => {});
        closeEdit();
      },
    };
  }

  function askExpansion(z) {
    const block = campaign.expansionBlock(z.id);
    if (block) return say(block, RED);
    confirm = {
      text: `Buy ${z.name}?`,
      sub: `${z.note} of floor for ${fmt(z.cost)} credits.`,
      yes: 'Buy',
      no: 'Not now',
      onYes: () => {
        const res = campaign.buyExpansion(z.id);
        if (!res.ok) return say(res.reason, RED);
        say(`${z.name} is open — more room to build!`, GREEN, 4);
        campaign.save().catch(() => {});
        tab = 'facilities';
        workshop.centerRoom();
      },
    };
  }

  // --- input ---------------------------------------------------------------------------
  function tapPanel(p) {
    if (mode === 'catalogue') {
      TABS.forEach((t, i) => {
        if (hitRect(p, tabRect(i))) {
          tab = t.id;
          scroll.scrollY = 0;
        }
      });
      if (!scroll.contains(p)) return;
      const c = scroll.toContent(p);
      if (tab === 'facilities') {
        FACILITY_ORDER.forEach((id, i) => {
          if (!hitRect(c, cardRect(i))) return;
          startPlacing(id);
        });
      } else {
        EXPANSIONS.forEach((z, i) => {
          if (hitRect(c, buyRect(i)) || hitRect(c, rowRect(i))) askExpansion(z);
        });
      }
      return;
    }
    if (hitRect(p, actionRect(0))) rotate();
    else if (mode === 'place' && hitRect(p, actionRect(1))) {
      placing = null;
      workshop.setGhost(null);
      mode = 'catalogue';
    } else if (mode === 'place' && hitRect(p, actionRect(2))) place();
    else if (mode === 'edit' && hitRect(p, actionRect(1))) askSell();
    else if (mode === 'edit' && hitRect(p, actionRect(2))) closeEdit();
  }

  function tapWorld(p) {
    if (mode === 'place') {
      const cell = workshop.cellAt(p);
      const s = F.sizeOf(placing.def, placing.rot);
      placing.col = cell.col - Math.floor(s.w / 2);
      placing.row = cell.row - Math.floor(s.h / 2);
      showGhost(placing);
      return;
    }
    const v = workshop.facilityAt(p);
    if (v) startEdit(v.uid);
    else if (mode === 'edit') closeEdit();
  }

  // Grabbed the ghost / the facility being edited? Offset from its corner, so it doesn't jump under the finger.
  function grabOn(p, g) {
    const cell = workshop.cellAt(p);
    const s = F.sizeOf(g.def, g.rot);
    const inside = cell.col >= g.col - 1 && cell.col <= g.col + s.w && cell.row >= g.row - 1 && cell.row <= g.row + s.h;
    return inside ? { dc: cell.col - g.col, dr: cell.row - g.row } : null;
  }

  const screen = {
    topBar,
    scroll,
    tabRect,
    actionRect,
    dialogButton,
    get mode() {
      return mode;
    },
    get placing() {
      return placing;
    },
    get editUid() {
      return editUid;
    },
    get confirm() {
      return confirm;
    },
    get tab() {
      return tab;
    },
    startPlacing,
    startEdit,
    // Guide / test helpers: screen rects.
    cardRectOf(defId) {
      const i = FACILITY_ORDER.indexOf(defId);
      return mode === 'catalogue' && tab === 'facilities' && i >= 0 ? inScroll(cardRect(i)) : null;
    },
    buyRectOf(zoneId) {
      const i = EXPANSIONS.findIndex((z) => z.id === zoneId);
      return mode === 'catalogue' && tab === 'expansions' && i >= 0 ? inScroll(buyRect(i)) : null;
    },
    scrollToCard(defId) {
      const i = FACILITY_ORDER.indexOf(defId);
      if (i >= 0) scroll.scrollY = cardRect(i).y;
    },
    worldRect,

    enter(params = {}) {
      mode = 'catalogue';
      placing = null;
      editUid = null;
      confirm = null;
      drag = null;
      message = null;
      scroll.scrollY = 0;
      tab = params.tab ?? 'facilities';
      workshop.selection.clear();
      workshop.setBuildMode(true);
      workshop.camera.viewY = -1; // force fitCamera to set the view
      fitCamera();
      workshop.centerRoom();
      if (params.selectUid) startEdit(params.selectUid);
    },

    exit() {
      workshop.setBuildMode(false);
      workshop.camera.viewY = 0;
      workshop.camera.setView(W, renderer.height);
    },

    update(dt) {
      workshop.update(dt);
      if (mode === 'edit' && !F.get(editUid)) closeEdit();
    },

    onTap(p) {
      if (confirm) {
        if (hitRect(p, dialogButton(0))) {
          const c = confirm;
          confirm = null;
          c.onYes();
        } else if (hitRect(p, dialogButton(1)) || !hitRect(p, dialogRect())) confirm = null;
        return;
      }
      if (topBar.handleTap(p)) return;
      if (hitRect(p, panelRect())) return tapPanel(p);
      if (hitRect(p, worldRect())) tapWorld(p);
    },

    onDragStart(p) {
      if (confirm || drag) return;
      const start = { x: p.startX, y: p.startY };
      if (topBar.contains(start)) return;
      if (hitRect(start, panelRect())) {
        if (mode === 'catalogue' && scroll.beginDrag(p)) drag = { id: p.id, kind: 'scroll' };
        return;
      }
      if (!hitRect(start, worldRect())) return;
      if (mode === 'place') {
        const grab = grabOn(start, placing);
        if (grab) {
          drag = { id: p.id, kind: 'ghost', grab };
          return screen.onDrag(p);
        }
      }
      if (mode === 'edit') {
        const item = F.get(editUid);
        const grab = item && grabOn(start, item);
        if (grab && workshop.facilityAt(start)?.uid === item.uid) {
          drag = { id: p.id, kind: 'move', grab, g: { def: item.def, col: item.col, row: item.row, rot: item.rot } };
          showGhost(drag.g, item.uid);
          return;
        }
      }
      drag = { id: p.id, kind: 'pan' };
      workshop.camera.beginDrag(p.startX, p.startY);
      workshop.camera.dragTo(p.x, p.y);
    },

    onDrag(p) {
      if (!drag || p.id !== drag.id) return;
      if (drag.kind === 'scroll') scroll.drag(p);
      else if (drag.kind === 'pan') workshop.camera.dragTo(p.x, p.y);
      else {
        const cell = workshop.cellAt(p);
        const g = drag.kind === 'ghost' ? placing : drag.g;
        const col = cell.col - drag.grab.dc;
        const row = cell.row - drag.grab.dr;
        if (col === g.col && row === g.row && workshop.ghost) return;
        g.col = col;
        g.row = row;
        showGhost(g, drag.kind === 'move' ? editUid : null);
      }
    },

    onDragEnd(p) {
      if (!drag || p.id !== drag.id) return;
      const d = drag;
      drag = null;
      if (d.kind === 'scroll') scroll.endDrag(p);
      else if (d.kind === 'pan') workshop.camera.endDrag();
      else if (d.kind === 'move') {
        workshop.setGhost(null);
        const item = F.get(editUid);
        if (item && (d.g.col !== item.col || d.g.row !== item.row)) {
          const res = campaign.moveFacility(item.uid, d.g.col, d.g.row);
          if (res.ok) {
            say(`Moved: ${FACILITIES[item.def].name}`, GREEN, 2);
            campaign.save().catch(() => {});
          } else say(`Can't go there: ${res.reason}`, RED);
        }
      }
    },

    render(ctx) {
      fitCamera();
      ctx.fillStyle = '#0B0E12';
      ctx.fillRect(0, 0, W, renderer.height);
      const wr = worldRect();
      ctx.save();
      ctx.beginPath();
      ctx.rect(wr.x, wr.y, wr.w, wr.h);
      ctx.clip();
      workshop.renderWorld(ctx);
      ctx.restore();
      topBar.render(ctx);
      drawMessage(ctx);
      drawPanel(ctx);
      if (confirm) drawConfirm(ctx);
    },
  };

  // --- drawing ---------------------------------------------------------------------------
  function drawMessage(ctx) {
    const r = msgRect();
    panel(ctx, r, { fill: 'rgba(16,20,24,0.92)', stroke: null, radius: 20 });
    contained(ctx, assets, BUILD_ART.buildIcon, { x: r.x + 14, y: r.y + 6, w: 60, h: 60 });
    let str;
    let color = '#9AA8B5';
    if (message && performance.now() < message.until) ({ text: str, color } = message);
    else if (mode === 'place') str = 'Drag the facility or tap the floor to move it';
    else if (mode === 'edit') str = 'Drag it to move it (free) · tap another to pick it';
    else if (tab === 'expansions') str = 'More floor space for more stations';
    else str = 'Tap a facility to place it · tap a built one to move or sell it';
    text(ctx, str, r.x + 88, r.y + r.h / 2, { size: 28, bold: color !== '#9AA8B5', color, baseline: 'middle', maxWidth: r.w - 104 });
  }

  function drawPanel(ctx) {
    const p = panelRect();
    panel(ctx, p, { fill: 'rgba(22,28,36,0.97)', stroke: '#35414F', radius: 28 });
    if (mode === 'catalogue') return drawCatalogue(ctx);
    const defId = mode === 'place' ? placing.def : F.get(editUid)?.def;
    if (!defId) return;
    const d = FACILITIES[defId];
    contained(ctx, assets, d.art, { x: p.x + 20, y: p.y + 20, w: 170, h: 170 });
    const x = p.x + 210;
    const mw = p.w - 230;
    text(ctx, mode === 'place' ? `Place: ${d.name}` : d.name, x, p.y + 24, { size: 38, bold: true, maxWidth: mw });
    text(ctx, mode === 'place' ? `Costs ${fmt(campaign.facilityCost(defId))} · ${d.w}×${d.h} tiles · you have ${fmt(campaign.economy.balance('credits'))}` : `${d.w}×${d.h} tiles · sells for ${fmt(F.sellValue(F.get(editUid)))}`, x, p.y + 74, { size: 26, color: '#9AA8B5', maxWidth: mw });
    text(ctx, d.blurb, x, p.y + 112, { size: 26, color: '#E8EEF2', maxWidth: mw });
    const g = workshop.ghost;
    if (mode === 'place' && g) text(ctx, g.ok ? '✓ Fits here' : `✗ ${g.reason}`, x, p.y + 154, { size: 28, bold: true, color: g.ok ? GREEN : RED, maxWidth: mw });
    if (mode === 'edit' && g) text(ctx, g.ok ? '✓ Let go to move it here' : `✗ ${g.reason}`, x, p.y + 154, { size: 28, bold: true, color: g.ok ? GREEN : RED, maxWidth: mw });
    const font = 'bold 34px system-ui, sans-serif';
    drawButton(ctx, actionRect(0), 'Rotate', { font });
    if (mode === 'place') {
      drawButton(ctx, actionRect(1), 'Cancel', { font });
      drawButton(ctx, actionRect(2), `Place ${fmt(campaign.facilityCost(defId))}`, { font, active: !!g?.ok, disabled: !g?.ok, accent: GREEN });
    } else {
      const block = campaign.sellBlock(editUid);
      drawButton(ctx, actionRect(1), `Sell +${fmt(F.sellValue(F.get(editUid)))}`, { font, disabled: !!block, accent: RED });
      drawButton(ctx, actionRect(2), 'Done', { font, active: true });
    }
  }

  function drawCatalogue(ctx) {
    TABS.forEach((t, i) => {
      const label = t.id === 'facilities' ? `Facilities (${F.placed.length} built)` : 'Expansions';
      drawButton(ctx, tabRect(i), label, { selected: tab === t.id, font: 'bold 32px system-ui, sans-serif', badge: t.id === 'expansions' && tab !== 'expansions' && EXPANSIONS.some((z) => !campaign.expansionBlock(z.id)) ? '!' : null });
    });
    const items = tab === 'facilities' ? FACILITY_ORDER : EXPANSIONS;
    scroll.contentHeight = tab === 'facilities' ? Math.ceil(items.length / 3) * (CARD_H + GAP) : items.length * (ROW_H + GAP);
    scroll.begin(ctx);
    if (tab === 'facilities') FACILITY_ORDER.forEach((id, i) => drawCard(ctx, id, cardRect(i)));
    else EXPANSIONS.forEach((z, i) => drawExpansion(ctx, z, i));
    scroll.end(ctx);
  }

  function drawCard(ctx, id, r) {
    const d = FACILITIES[id];
    const unlocked = campaign.facilityUnlocked(id);
    const block = campaign.buyBlock(id);
    panel(ctx, r, { fill: unlocked ? 'rgba(34,42,52,0.97)' : 'rgba(26,30,36,0.97)', stroke: unlocked ? (block ? '#35414F' : '#4FC3F7') : '#2A3038', radius: 20 });
    ctx.save();
    if (!unlocked) ctx.globalAlpha = 0.35;
    contained(ctx, assets, d.art, { x: r.x + 12, y: r.y + 10, w: r.w - 24, h: 118 });
    ctx.restore();
    const n = F.count(id);
    if (n) text(ctx, `×${n}`, r.x + r.w - 14, r.y + 12, { size: 26, bold: true, color: GREEN, align: 'right' });
    text(ctx, d.name, r.x + r.w / 2, r.y + 134, { size: 26, bold: true, align: 'center', color: unlocked ? '#FFFFFF' : '#8C98A5', maxWidth: r.w - 16 });
    text(ctx, `${fmt(campaign.facilityCost(id))} · ${d.w}×${d.h}`, r.x + r.w / 2, r.y + 168, { size: 23, align: 'center', color: unlocked && campaign.economy.canAfford('credits', campaign.facilityCost(id)) ? '#FFD166' : '#8C98A5', maxWidth: r.w - 16 });
    if (!unlocked) {
      const rule = describeUnlock(d.unlock);
      drawPadlock(ctx, r.x + 14, r.y + 216, 24, '#FFB74D');
      text(ctx, rule, r.x + 46, r.y + 216, { size: 20, bold: true, color: '#FFB74D', baseline: 'middle', maxWidth: r.w - 56 });
    } else {
      const lines = wrapLines(ctx, d.blurb, r.w - 20, '20px system-ui, sans-serif').slice(0, 2);
      lines.forEach((l, j) => text(ctx, l, r.x + r.w / 2, r.y + 198 + j * 24, { size: 20, align: 'center', color: '#9AA8B5', maxWidth: r.w - 12 }));
      if (block && block !== 'Not enough credits') text(ctx, block, r.x + r.w / 2, r.y + 198 + lines.length * 24, { size: 19, align: 'center', color: RED, maxWidth: r.w - 16 });
    }
  }

  function drawExpansion(ctx, z, i) {
    const r = rowRect(i);
    const owned = F.isOwned(z.id);
    const block = campaign.expansionBlock(z.id);
    panel(ctx, r, { fill: 'rgba(34,42,52,0.97)', stroke: owned ? GREEN : block ? '#35414F' : '#FFB74D', radius: 20 });
    contained(ctx, assets, owned || !block ? BUILD_ART.expansionIcon : BUILD_ART.lockIcon, { x: r.x + 14, y: r.y + 15, w: 120, h: 120 });
    const x = r.x + 150;
    const mw = r.w - 150 - 270;
    text(ctx, `${z.name} · ${z.note}`, x, r.y + 20, { size: 32, bold: true, maxWidth: mw });
    text(ctx, `${fmt(z.cost)} credits · needs ${describeUnlock(z.unlock)}`, x, r.y + 64, { size: 24, color: '#FFD166', maxWidth: mw });
    const state = owned ? 'Open ✓' : !z.buyable ? LOCKED_LATER : block ?? 'Ready to buy';
    text(ctx, state, x, r.y + 102, { size: 24, bold: true, color: owned ? GREEN : block ? '#9AA8B5' : GREEN, maxWidth: mw });
    if (!owned) drawButton(ctx, buyRect(i), z.buyable ? 'Buy' : 'Later', { font: 'bold 34px system-ui, sans-serif', active: !block, disabled: !!block, locked: !z.buyable, accent: GREEN });
  }

  function drawConfirm(ctx) {
    ctx.fillStyle = 'rgba(6,8,12,0.6)';
    ctx.fillRect(0, 0, W, renderer.height);
    const d = dialogRect();
    panel(ctx, d, { fill: 'rgba(26,32,40,0.99)', stroke: '#FFB74D', lineWidth: 5, radius: 28 });
    text(ctx, confirm.text, d.x + d.w / 2, d.y + 50, { size: 44, bold: true, align: 'center', maxWidth: d.w - 60 });
    text(ctx, confirm.sub, d.x + d.w / 2, d.y + 130, { size: 30, align: 'center', color: '#C9D3DD', maxWidth: d.w - 60 });
    drawButton(ctx, dialogButton(0), confirm.yes, { active: true, accent: '#FFB74D', font: 'bold 38px system-ui, sans-serif' });
    drawButton(ctx, dialogButton(1), confirm.no, { font: 'bold 38px system-ui, sans-serif' });
  }

  return screen;
}

// Word-wrap to a pixel width (cached: the catalogue draws the same words every frame).
const wrapCache = new Map();
function wrapLines(ctx, str, width, font) {
  const key = `${width}|${str}`;
  let out = wrapCache.get(key);
  if (out) return out;
  ctx.font = font;
  out = [];
  let line = '';
  for (const word of str.split(' ')) {
    const test = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(test).width > width) {
      out.push(line);
      line = word;
    } else line = test;
  }
  if (line) out.push(line);
  wrapCache.set(key, out);
  return out;
}
