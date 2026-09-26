// Main Menu (Milestone 21, bible §5, §6.3): Continue, New Game, New Game+, Records, Settings, Credits over the BOTWORKS
// key art. New Game+ stays greyed (with its rule) until this run has reached the Year 16 ending; New Game asks before
// replacing a run in progress. A save that could not be read shows an error card with Try again / New Game.
// The back button here leaves the game (nothing to go back to).
//   createMainMenuScreen({ renderer, layout, assets, campaign, router, dialog, actions: { continueGame, newGame, retry }, loadError: () => err|null })
import { THEME } from '../../../../core/Theme.js';
import { ScrollPanel } from '../../../../core/ui/ScrollPanel.js';
import { hitRect } from '../../../../core/ui/Button.js';
import { iconButton, errorState, stateHeight } from '../ui/widgets.js';
import { MENU_ART, MAIN_MENU, COMPANY } from '../../data/menu.js';
import { RANKS } from '../../data/economy.js';
const C = THEME.color;

const BTN_H = 150;
const GAP = 20;

export function createMainMenuScreen({ renderer, layout, assets, campaign, router, dialog, actions, loadError = () => null }) {
  const W = renderer.width;
  const scroll = new ScrollPanel({ getRect: bodyRect, contentHeight: 0 });
  let wasPaused = true;

  const sr = () => layout.safeRect;
  const LOGO_H = 330;
  function bodyRect() {
    const s = sr();
    const y = s.y + 24 + LOGO_H + 10;
    return { x: s.x + 40, y, w: s.w - 80, h: s.y + s.h - 24 - y };
  }

  // The buttons, top to bottom (content coordinates are laid out in layoutItems).
  function items() {
    const c = campaign;
    const run = c.hasRun;
    const accent = COMPANY.accents.find((a) => a.id === c.company?.accent)?.color;
    const ngBlock = run ? c.ngPlusBlock() : MAIN_MENU.ngPlus.lockedSub;
    return [
      { id: 'continue', label: MAIN_MENU.continue.label, sub: run ? `${c.company.name} · Year ${c.clock.year} · Rank ${RANKS[c.reputation.highestRankIndex].id}${c.ngPlusRuns ? ` · NG+${c.ngPlusRuns}` : ''}` : MAIN_MENU.continue.none, icon: MENU_ART.continue, disabled: !run, stripe: run ? accent : null, onTap: actions.continueGame },
      { id: 'newGame', label: MAIN_MENU.newGame.label, sub: MAIN_MENU.newGame.sub, icon: MENU_ART.newGame, accent: run ? C.progress : C.action, onTap: newGame },
      { id: 'ngPlus', label: ngBlock ? MAIN_MENU.ngPlus.label : `${MAIN_MENU.ngPlus.label} (NG+${c.nextNgPlusLevel})`, sub: ngBlock ? MAIN_MENU.ngPlus.lockedSub : 'Legacy Staff, blueprints and more', icon: MENU_ART.ngPlusIcon, accent: C.purple, locked: !!ngBlock, onTap: () => !ngBlock && router.go('ngplus', { back: 'menu' }) },
      { id: 'records', label: MAIN_MENU.records.label, sub: MAIN_MENU.records.sub, icon: MENU_ART.records, accent: C.progress, onTap: () => router.go('records', { back: 'menu' }) },
      { id: 'settings', label: MAIN_MENU.settings.label, sub: MAIN_MENU.settings.sub, icon: MENU_ART.settings, accent: C.progress, onTap: () => router.go('settings', { back: 'menu' }) },
      { id: 'credits', label: MAIN_MENU.credits.label, sub: MAIN_MENU.credits.sub, icon: MENU_ART.credits, accent: C.progress, onTap: () => router.go('credits', { back: 'menu' }) },
    ];
  }

  function newGame() {
    if (!campaign.hasRun) return actions.newGame();
    dialog.confirm({ title: MAIN_MENU.replaceTitle, body: MAIN_MENU.replaceBody, art: MENU_ART.warning, yes: 'New Game', no: 'Cancel', danger: true, onYes: actions.newGame });
  }

  // Content layout: an error card (if the save would not read), then the buttons.
  function layoutItems() {
    const w = bodyRect().w;
    const out = [];
    let y = 0;
    const err = loadError();
    if (err) {
      const s = errorCard();
      const h = stateHeight(w, s);
      out.push({ kind: 'error', r: { x: 0, y, w, h }, s });
      y += h + GAP;
    }
    for (const it of items()) {
      out.push({ kind: 'button', r: { x: 0, y, w, h: BTN_H }, it });
      y += BTN_H + GAP;
    }
    return { out, h: y };
  }

  const errorCard = () => ({ art: MENU_ART.warning, title: MAIN_MENU.loadErrorTitle, text: MAIN_MENU.loadErrorBody, button: { label: 'Try again' } });

  const screen = {
    scroll,
    // Tests / checks: a button's screen rect by id.
    buttonRect(id) {
      const b = bodyRect();
      const L = layoutItems().out.find((x) => x.it?.id === id || (id === 'retry' && x.kind === 'error'));
      if (!L) return null;
      const r = id === 'retry' ? { x: L.r.x + 30, y: L.r.y + L.r.h - 140, w: L.r.w - 60, h: 116 } : L.r;
      return { x: b.x + r.x, y: b.y + r.y - scroll.scrollY, w: r.w, h: r.h };
    },
    enter() {
      scroll.scrollY = 0;
      if (campaign.hasRun) {
        wasPaused = campaign.clock.paused;
        campaign.clock.pause();
      }
    },
    get resumeOnContinue() {
      return !wasPaused;
    },
    onBack: () => false, // the root: let the phone leave the game
    onTap(p) {
      if (!scroll.contains(p)) return;
      const q = scroll.toContent(p);
      for (const L of layoutItems().out) {
        if (!hitRect(q, L.r)) continue;
        if (L.kind === 'error') {
          const b = { x: L.r.x + 30, y: L.r.y + L.r.h - 140, w: L.r.w - 60, h: 116 };
          if (hitRect(q, b)) actions.retry();
          return;
        }
        if (!L.it.disabled && !L.it.locked) L.it.onTap();
        else if (L.it.locked) dialog.show({ title: MAIN_MENU.ngPlus.label, body: MAIN_MENU.ngPlus.lockedSub, art: MENU_ART.lock, buttons: [{ id: 'ok', label: 'OK', accent: C.progress }] });
        return;
      }
    },
    onDragStart: (p) => scroll.beginDrag(p),
    onDrag: (p) => scroll.drag(p),
    onDragEnd: (p) => scroll.endDrag(p),
    render(ctx) {
      const H = renderer.height;
      const s = sr();
      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, W, H);
      // The key art behind everything, softened so the buttons read.
      ctx.save();
      ctx.globalAlpha = 0.35;
      assets.drawContained(ctx, MENU_ART.keyArt, { x: 0, y: s.y + 200, w: W, h: H - s.y - 200 });
      ctx.restore();
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, 'rgba(255,245,226,0.85)');
      g.addColorStop(1, 'rgba(216,191,152,0.25)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      assets.drawContained(ctx, MENU_ART.logo, { x: s.x + 160, y: s.y + 24, w: s.w - 320, h: LOGO_H });
      const L = layoutItems();
      scroll.contentHeight = L.h;
      scroll.begin(ctx);
      for (const it of L.out) {
        if (it.kind === 'error') errorState(ctx, assets, it.r, it.s);
        else iconButton(ctx, assets, it.r, it.it);
      }
      scroll.end(ctx);
    },
  };
  return screen;
}
