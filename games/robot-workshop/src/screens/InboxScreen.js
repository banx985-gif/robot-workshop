// Inbox (Milestone 15): every message the game has sent, newest first — events, milestone moments, sponsors, rank-ups,
// research, contracts. Tap one to reopen it in the event pop-up. Rumours opens the Rumour Archive (secrets, M16). A question still waiting for an answer can be
// answered from here (it then leaves the pop-up queue).
import { THEME, font } from '../../../../core/Theme.js';
import { ScrollPanel } from '../../../../core/ui/ScrollPanel.js';
import { drawButton, hitRect } from '../../../../core/ui/Button.js';
import { createTopBar } from '../ui/TopBar.js';
import { panel, text, contained, emptyState, stateHeight } from '../ui/widgets.js';
const COL = THEME.color;

const ROW_H = 252; // title, up to three lines of body text and the "waiting" tag, all at the §33.2 sizes
const GAP = 14;
const HEAD_H = 140;
const LEVEL_COLOR = { minor: COL.textMuted, medium: COL.progress, major: COL.gold };

export function createInboxScreen({ renderer, layout, assets, campaign, router, goProject, hud, openEntry }) {
  const W = renderer.width;
  const topBar = createTopBar({
    layout,
    campaign,
    hud,
    nav: [
      { id: 'project', label: 'Project', onTap: goProject },
      { id: 'workshop', label: 'Workshop', onTap: () => router.go('workshop') },
    ],
  });
  let emptyHit = null; // the empty state's button (Milestone 21)
  const scroll = new ScrollPanel({ getRect: listRect, contentHeight: 0 });

  function headRect() {
    const sr = layout.safeRect;
    const t = topBar.rect();
    return { x: sr.x + 24, y: t.y + t.h + 16, w: sr.w - 48, h: HEAD_H - 16 };
  }

  function listRect() {
    const sr = layout.safeRect;
    const h = headRect();
    const y = h.y + h.h + 16;
    return { x: sr.x + 24, y, w: sr.w - 48, h: sr.y + sr.h - 24 - y };
  }

  function readAllRect() {
    const h = headRect();
    return { x: h.x + h.w - 290, y: h.y + 6, w: 290, h: h.h - 12 };
  }

  function rumoursRect() {
    const h = headRect();
    return { x: h.x + h.w - 290 - 16 - 220, y: h.y + 6, w: 220, h: h.h - 12 };
  }

  // A message body wrapped to at most three lines at body size; a longer one ends with "…" (it opens in full on tap).
  function bodyLines(ctx, str, w, max = 3) {
    ctx.font = font(THEME.size.body);
    const words = String(str).split(' ');
    const out = [];
    let cur = '';
    let i = 0;
    for (; i < words.length; i++) {
      const t = cur ? `${cur} ${words[i]}` : words[i];
      if (ctx.measureText(t).width > w && cur) {
        out.push(cur);
        cur = words[i];
        if (out.length === max) break;
      } else cur = t;
    }
    if (out.length < max) {
      if (cur) out.push(cur);
      return out;
    }
    let last = out[max - 1];
    while (last.includes(' ') && ctx.measureText(`${last}…`).width > w) last = last.slice(0, last.lastIndexOf(' '));
    out[max - 1] = `${last}…`;
    return out;
  }

  const rowRect = (i) => ({ x: 0, y: i * (ROW_H + GAP), w: listRect().w, h: ROW_H });

  const screen = {
    topBar,
    scroll,
    rowRect,
    enter() {
      scroll.scrollY = 0;
    },
    onTap(p) {
      if (topBar.handleTap(p)) return;
      if (emptyHit && scroll.contains(p) && hitRect(scroll.toContent(p), emptyHit.r)) return emptyHit.go();
      if (hitRect(p, rumoursRect())) return router.go('rumours', { back: 'inbox' });
      if (hitRect(p, readAllRect())) {
        campaign.notes.markAllRead();
        return;
      }
      if (!scroll.contains(p)) return;
      const c = scroll.toContent(p);
      const i = Math.floor(c.y / (ROW_H + GAP));
      const e = campaign.notes.inbox[i];
      if (e && c.y - i * (ROW_H + GAP) <= ROW_H) {
        campaign.notes.markRead(e.id);
        openEntry(e);
      }
    },
    onDragStart: (p) => scroll.beginDrag(p),
    onDrag: (p) => scroll.drag(p),
    onDragEnd: (p) => scroll.endDrag(p),

    render(ctx) {
      ctx.fillStyle = COL.bg;
      ctx.fillRect(0, 0, W, renderer.height);
      topBar.render(ctx);
      const notes = campaign.notes;
      const hr = headRect();
      text(ctx, 'Inbox', hr.x + 4, hr.y + hr.h / 2, { size: THEME.size.title - 8, bold: true, baseline: 'middle' });
      text(ctx, `${notes.inbox.length} messages · ${notes.unread} new${notes.pending ? ` · ${notes.pending} waiting` : ''}`, hr.x + 180, hr.y + hr.h / 2, { size: THEME.size.small, color: COL.textMuted, baseline: 'middle', maxWidth: hr.w - 180 - 310 - 236 });
      drawButton(ctx, rumoursRect(), 'Rumours', { accent: COL.purple, font: font(34, true) });
      drawButton(ctx, readAllRect(), 'Mark all read', { font: font(34, true), disabled: !notes.unread });

      const list = notes.inbox;
      const lr = listRect();
      scroll.contentHeight = Math.max(1, list.length * (ROW_H + GAP));
      scroll.begin(ctx);
      emptyHit = null;
      if (!list.length) {
        const s = { art: 'ui_icon_14', text: 'No messages yet — events, sponsors and big moments will land here.', button: { label: 'Back to the workshop' } };
        const h = stateHeight(lr.w - 12, s);
        scroll.contentHeight = h + 10;
        emptyHit = { r: emptyState(ctx, assets, { x: 0, y: 0, w: lr.w - 12, h }, s), go: () => router.go('workshop') };
      }
      // Only the rows on screen are drawn.
      const first = Math.max(0, Math.floor(scroll.scrollY / (ROW_H + GAP)));
      const last = Math.min(list.length, first + Math.ceil(lr.h / (ROW_H + GAP)) + 2);
      const clock = campaign.clock;
      for (let i = first; i < last; i++) {
        const e = list[i];
        const r = rowRect(i);
        const waiting = notes.queue.includes(e.id);
        panel(ctx, r, { fill: e.read ? COL.panel : COL.panelInfo, stroke: e.read ? COL.line : LEVEL_COLOR[e.level], lineWidth: e.read ? 3 : 4 });
        const key = e.art ?? e.icon;
        if (key) contained(ctx, assets, key, { x: r.x + 14, y: r.y + 14, w: 140, h: ROW_H - 28 });
        const x = r.x + 172;
        const mw = r.w - 172 - 24;
        if (!e.read) {
          ctx.fillStyle = LEVEL_COLOR[e.level];
          ctx.beginPath();
          ctx.arc(r.x + r.w - 30, r.y + 34, 10, 0, Math.PI * 2);
          ctx.fill();
        }
        text(ctx, clock.shortLabel(e.day), r.x + r.w - 52, r.y + 20, { size: THEME.size.small, color: COL.textMuted, align: 'right' });
        text(ctx, e.title, x, r.y + 16, { size: THEME.size.body, bold: true, color: COL.text, maxWidth: mw - 200 });
        bodyLines(ctx, e.body, mw).forEach((l, j) => text(ctx, l, x, r.y + 64 + j * 44, { size: THEME.size.body, color: COL.textMuted, maxWidth: mw }));
        const tag = waiting ? 'Waiting to pop up — tap to open now' : e.folded ? 'Folded into the inbox (too many at once)' : '';
        if (tag) text(ctx, tag, x, r.y + ROW_H - 44, { size: THEME.size.small, color: waiting ? COL.gold : COL.textMuted, maxWidth: mw });
      }
      scroll.end(ctx);
    },
  };
  return screen;
}
