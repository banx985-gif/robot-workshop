// Splash (Milestone 21, bible §6.3): the BOTWORKS title logo over the splash key art, a loading bar while the art
// loads, then the save check. When both are done it hands over to the main menu (a short pause so it can be seen).
//   createSplashScreen({ renderer, layout, assets, load: (progress) => Promise, checkSave: () => Promise<{ loaded, error }>, onDone })
import { THEME } from '../../../../core/Theme.js';
import { text, para, card } from '../ui/widgets.js';
import { MENU_ART, SPLASH_TEXT } from '../../data/menu.js';
const C = THEME.color;
const Z = THEME.size;

export function createSplashScreen({ renderer, layout, assets, load, checkSave, onDone }) {
  const W = renderer.width;
  let progress = 0;
  let status = SPLASH_TEXT.loading;
  let note = null;
  let doneAt = null;
  let started = false;
  let t = 0;

  async function run() {
    try {
      const res = await load((p) => (progress = p));
      if (res?.missing?.length) note = SPLASH_TEXT.artFailed;
    } catch (err) {
      console.error('[splash] art', err);
      note = SPLASH_TEXT.artFailed;
    }
    progress = 1;
    status = SPLASH_TEXT.checking;
    const save = await checkSave();
    status = save.error ? SPLASH_TEXT.failed : save.loaded ? SPLASH_TEXT.found : SPLASH_TEXT.none;
    doneAt = t;
  }

  return {
    get ready() {
      return doneAt != null;
    },
    enter() {
      t = 0;
      if (started) return;
      started = true;
      run();
    },
    update(dt) {
      t += dt;
      if (doneAt != null && t - doneAt > 0.7) {
        doneAt = Infinity; // once
        onDone();
      }
    },
    onBack: () => true, // nothing to go back to while loading
    render(ctx) {
      const H = renderer.height;
      const s = layout.safeRect;
      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, W, H);
      const g = ctx.createRadialGradient(W / 2, H * 0.35, 80, W / 2, H * 0.4, H * 0.8);
      g.addColorStop(0, 'rgba(255,245,226,0.95)');
      g.addColorStop(1, 'rgba(255,245,226,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      // Key art fills the middle; the logo sits over its top. The pictures appear as they load (stand-ins before).
      const artH = Math.min(s.h * 0.55, 1150);
      const artY = s.y + Math.max(120, (s.h - artH - 520) / 2 + 200);
      if (assets.has(MENU_ART.keyArt)) assets.drawContained(ctx, MENU_ART.keyArt, { x: s.x + 40, y: artY, w: s.w - 80, h: artH });
      if (assets.has(MENU_ART.logo)) assets.drawContained(ctx, MENU_ART.logo, { x: s.x + 170, y: Math.max(s.y + 30, artY - 250), w: s.w - 340, h: 380 });
      else text(ctx, 'BOTWORKS', W / 2, artY - 120, { size: 96, bold: true, align: 'center', color: C.actionDark });
      // Loading bar and status.
      const barY = artY + artH + 60;
      const bar = { x: s.x + 120, y: barY, w: s.w - 240, h: 44 };
      card(ctx, { x: bar.x - 8, y: bar.y - 8, w: bar.w + 16, h: bar.h + 16 }, 'normal', { radius: 30 });
      ctx.fillStyle = C.track;
      ctx.fillRect(bar.x, bar.y, bar.w, bar.h);
      ctx.fillStyle = C.action;
      ctx.fillRect(bar.x, bar.y, bar.w * Math.max(0.02, progress), bar.h);
      text(ctx, status, W / 2, barY + 90, { size: Z.body, bold: true, align: 'center', color: C.text, maxWidth: s.w - 80 });
      if (note) para(ctx, note, s.x + 80, barY + 150, s.w - 160, { size: Z.small, align: 'center', color: C.bad });
    },
  };
}
