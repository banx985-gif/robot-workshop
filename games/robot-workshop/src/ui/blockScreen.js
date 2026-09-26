// A simple full screen made of stacked blocks (Milestone 23: Store, VIP and the monetisation debug panel): a header
// with ‹ Back, an icon and a title, then a scrolling column of headings, paragraphs, list rows (a picture on the left,
// optionally a button in the corner) and big icon buttons — the same pieces and sizes as every other BOTWORKS screen.
//   createBlockScreen({ renderer, layout, assets, router, title, icon, defaultBack, build(b), onEnter(params), onExit() })
//   build(b) is called every frame with a builder:
//     b.heading(str) · b.para(str, { size, color, bold }) · b.gap(n)
//     b.row(row, button?)      row: core/ui/Kit listRow spec; button: { key, label, accent, disabled, onTap }
//     b.button(key, spec, onTap, h = 150)    spec: core/ui/Kit iconButton spec
//     b.w (column width)
//   screen.say(text, color) shows a short line over the bottom of the screen; screen.hitRect(key) (tests).
import { THEME, font, lineH } from '../../../../core/Theme.js';
import { ScrollPanel } from '../../../../core/ui/ScrollPanel.js';
import { drawButton, hitRect } from '../../../../core/ui/Button.js';
import { text, panel, para, listRow, listRowHeight, iconButton } from './widgets.js';
const C = THEME.color;
const Z = THEME.size;
const HEAD_H = 140;
const ROW_BTN_H = 110;

export function createBlockScreen({ renderer, layout, assets, router, title, icon, defaultBack = 'workshop', build, onEnter = null, onExit = null }) {
  const W = renderer.width;
  const scroll = new ScrollPanel({ getRect: bodyRect, contentHeight: 0 });
  let back = defaultBack;
  let hits = [];
  let message = null;
  const sr = () => layout.safeRect;
  const backRect = () => ({ x: sr().x + 24, y: sr().y + 24 + 15, w: 200, h: 110 });
  function bodyRect() {
    const s = sr();
    const y = s.y + 24 + HEAD_H;
    return { x: s.x + 24, y, w: s.w - 48, h: s.y + s.h - 24 - y };
  }

  function builder(ctx, w) {
    let y = 8;
    const b = {
      w,
      get y() {
        return y;
      },
      gap(n = 18) {
        y += n;
      },
      heading(str) {
        text(ctx, str, 4, y, { size: Z.heading, bold: true, maxWidth: w - 8 });
        y += lineH(Z.heading, 1.35);
      },
      para(str, { size = Z.body, color = C.textMuted, bold = false } = {}) {
        y += para(ctx, str, 4, y, w - 8, { size, color, bold }) + 12;
      },
      row(row, button = null) {
        const h = listRowHeight(w, row) + (button ? ROW_BTN_H + 16 : 0);
        const r = { x: 0, y, w, h };
        listRow(ctx, assets, r, row);
        if (button) {
          const bw = Math.min(360, w * 0.45);
          const br = { x: r.x + r.w - 20 - bw, y: r.y + r.h - 20 - ROW_BTN_H, w: bw, h: ROW_BTN_H };
          drawButton(ctx, br, button.label, { accent: button.accent, disabled: !!button.disabled, font: font(Z.button, true) });
          hits.push({ key: button.key, r: br, onTap: button.disabled ? button.onDisabled : button.onTap });
        }
        y += h + 18;
        return r;
      },
      button(key, spec, onTap, h = 150) {
        const r = { x: 0, y, w, h };
        iconButton(ctx, assets, r, spec);
        hits.push({ key, r, onTap: spec.disabled ? spec.onDisabled : onTap });
        y += h + 18;
        return r;
      },
    };
    return b;
  }

  const screen = {
    scroll,
    get back() {
      return back;
    },
    say(str, color = C.gold, secs = 3.5) {
      message = { text: str, color, until: performance.now() + secs * 1000 };
    },
    hitRect(key) {
      const h = hits.find((x) => x.key === key);
      if (!h) return null;
      const b = bodyRect();
      return { x: b.x + h.r.x, y: b.y + h.r.y - scroll.scrollY, w: h.r.w, h: h.r.h };
    },
    tap(key) {
      hits.find((x) => x.key === key)?.onTap?.();
    },
    enter(params = {}) {
      back = params.back ?? router.backTarget?.name ?? defaultBack;
      scroll.scrollY = 0;
      message = null;
      onEnter?.(params);
    },
    exit() {
      onExit?.();
    },
    onTap(p) {
      if (hitRect(p, backRect())) return router.go(back);
      if (!scroll.contains(p)) return;
      const q = scroll.toContent(p);
      hits.find((h) => hitRect(q, h.r))?.onTap?.();
    },
    onDragStart: (p) => scroll.beginDrag(p),
    onDrag: (p) => scroll.drag(p),
    onDragEnd: (p) => scroll.endDrag(p),
    render(ctx) {
      const s = sr();
      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, W, renderer.height);
      drawButton(ctx, backRect(), '‹ Back', { font: font(Z.button, true) });
      assets.drawContained(ctx, icon, { x: s.x + 240, y: s.y + 44, w: 100, h: 100 });
      text(ctx, typeof title === 'function' ? title() : title, s.x + 356, s.y + 24 + 15 + 55, { size: Z.title, bold: true, baseline: 'middle', maxWidth: s.w - 380 });
      hits = [];
      scroll.begin(ctx);
      const b = builder(ctx, bodyRect().w - 12);
      build(b);
      scroll.contentHeight = b.y + 30;
      scroll.end(ctx);
      if (message && performance.now() < message.until) {
        const body = bodyRect();
        const tw = body.w - 60 - 48;
        const th = para(null, message.text, 0, 0, tw, { size: Z.body, bold: true, maxLines: 3 });
        const r = { x: body.x + 30, y: body.y + body.h - th - 60, w: body.w - 60, h: th + 40 };
        panel(ctx, r, { fill: C.panel, stroke: message.color, radius: 20, lineWidth: 5 });
        para(ctx, message.text, r.x + 24, r.y + 20, tw, { size: Z.body, bold: true, color: message.color, align: 'center', maxLines: 3 });
      }
    },
  };
  return screen;
}
