// Help: every guide step seen so far, to read again, and a guide on/off switch.
// (To replay the whole guide for testing, open the game with ?guide=reset.)
import { THEME, font } from '../../../../core/Theme.js';
import { ScrollPanel } from '../../../../core/ui/ScrollPanel.js';
import { drawButton } from '../../../../core/ui/Button.js';
import { panel, text, contained, hit } from '../ui/widgets.js';
const COL = THEME.color;

const HEADER_H = 150;
const FOOTER_H = 160;
const BODY = 30;
const LINE = 40;

export function createHelpScreen({ renderer, layout, assets, router, guide }) {
  const W = renderer.width;
  let back = 'workshop';
  const scroll = new ScrollPanel({ getRect: bodyRect, contentHeight: 0 });
  const wrapCache = new Map();

  function backRect() {
    const sr = layout.safeRect;
    return { x: sr.x + 24, y: sr.y + 24, w: 200, h: 110 };
  }
  function bodyRect() {
    const sr = layout.safeRect;
    return { x: sr.x + 24, y: sr.y + HEADER_H, w: sr.w - 48, h: sr.h - HEADER_H - FOOTER_H };
  }
  function toggleRect() {
    const sr = layout.safeRect;
    return { x: sr.x + 24, y: sr.y + sr.h - FOOTER_H + 24, w: sr.w - 48, h: 110 };
  }

  function wrap(ctx, str, width) {
    const key = `${width}|${str}`;
    if (wrapCache.has(key)) return wrapCache.get(key);
    ctx.font = font(BODY);
    const out = [];
    let line = '';
    for (const word of str.split(' ')) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > width && line) {
        out.push(line);
        line = word;
      } else line = test;
    }
    if (line) out.push(line);
    wrapCache.set(key, out);
    return out;
  }

  const screen = {
    scroll,
    toggleRect,
    enter(params = {}) {
      back = params.back ?? (router.previous && router.previous !== 'help' ? router.previous : 'workshop');
      scroll.scrollY = 0;
    },
    onTap(p) {
      if (hit(p, backRect())) router.go(back);
      else if (hit(p, toggleRect())) guide.state.off ? guide.turnOn() : guide.turnOff();
    },
    onDragStart: (p) => scroll.beginDrag(p),
    onDrag: (p) => scroll.drag(p),
    onDragEnd: (p) => scroll.endDrag(p),

    render(ctx) {
      ctx.fillStyle = COL.bg;
      ctx.fillRect(0, 0, W, renderer.height);
      const sr = layout.safeRect;
      drawButton(ctx, backRect(), '‹ Back', { font: font(32, true) });
      contained(ctx, assets, 'ui_icon_27', { x: sr.x + 228, y: sr.y + 28, w: 76, h: 76 });
      text(ctx, 'Help', sr.x + 320, sr.y + 66, { size: 48, bold: true, baseline: 'middle' });

      const w = bodyRect().w - 12;
      const steps = guide.seenSteps;
      let y = 0;
      scroll.begin(ctx);
      if (!steps.length) text(ctx, 'Guide tips you have seen will be listed here.', 4, 10, { size: 30, color: COL.textMuted, maxWidth: w });
      for (const s of steps) {
        const lines = wrap(ctx, s.text, w - 48);
        const h = 24 + 46 + lines.length * LINE + 20;
        panel(ctx, { x: 0, y, w, h });
        text(ctx, s.title, 24, y + 22, { size: 36, bold: true, maxWidth: w - 48 });
        lines.forEach((l, i) => text(ctx, l, 24, y + 70 + i * LINE, { size: BODY, color: COL.text }));
        y += h + 16;
      }
      scroll.contentHeight = Math.max(y, 1);
      scroll.end(ctx);

      drawButton(ctx, toggleRect(), guide.state.off ? 'Turn the guide back on' : 'Turn the guide off', { font: font(32, true) });
    },
  };
  return screen;
}
