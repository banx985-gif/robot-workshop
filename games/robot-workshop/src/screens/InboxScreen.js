// Inbox (Milestone 15): every message the game has sent, newest first — events, milestone moments, sponsors, rank-ups,
// research, contracts. Tap one to reopen it in the event pop-up. A question still waiting for an answer can be
// answered from here (it then leaves the pop-up queue).
import { ScrollPanel } from '../../../../core/ui/ScrollPanel.js';
import { drawButton, hitRect } from '../../../../core/ui/Button.js';
import { createTopBar } from '../ui/TopBar.js';
import { panel, text, wrapText, contained } from '../ui/widgets.js';

const ROW_H = 168;
const GAP = 14;
const HEAD_H = 110;
const LEVEL_COLOR = { minor: '#9AA8B5', medium: '#4FC3F7', major: '#FFD166' };

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
      ctx.fillStyle = '#101418';
      ctx.fillRect(0, 0, W, renderer.height);
      topBar.render(ctx);
      const notes = campaign.notes;
      const hr = headRect();
      text(ctx, 'Inbox', hr.x + 4, hr.y + hr.h / 2, { size: 48, bold: true, baseline: 'middle' });
      text(ctx, `${notes.inbox.length} messages · ${notes.unread} new${notes.pending ? ` · ${notes.pending} waiting` : ''}`, hr.x + 180, hr.y + hr.h / 2, { size: 28, color: '#9AA8B5', baseline: 'middle', maxWidth: hr.w - 180 - 310 });
      drawButton(ctx, readAllRect(), 'Mark all read', { font: 'bold 28px system-ui, sans-serif', disabled: !notes.unread });

      const list = notes.inbox;
      const lr = listRect();
      scroll.contentHeight = Math.max(1, list.length * (ROW_H + GAP));
      scroll.begin(ctx);
      if (!list.length) text(ctx, 'No messages yet. Events, sponsors and big moments will land here.', 12, 20, { size: 30, color: '#9AA8B5', maxWidth: lr.w - 24 });
      // Only the rows on screen are drawn.
      const first = Math.max(0, Math.floor(scroll.scrollY / (ROW_H + GAP)));
      const last = Math.min(list.length, first + Math.ceil(lr.h / (ROW_H + GAP)) + 2);
      const clock = campaign.clock;
      for (let i = first; i < last; i++) {
        const e = list[i];
        const r = rowRect(i);
        const waiting = notes.queue.includes(e.id);
        panel(ctx, r, { fill: e.read ? 'rgba(26,32,40,0.96)' : 'rgba(34,44,58,0.98)', stroke: e.read ? '#35414F' : LEVEL_COLOR[e.level], lineWidth: e.read ? 3 : 4 });
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
        text(ctx, clock.shortLabel(e.day), r.x + r.w - 52, r.y + 20, { size: 22, color: '#7F8C99', align: 'right' });
        text(ctx, e.title, x, r.y + 18, { size: 32, bold: true, color: e.read ? '#E8EEF2' : '#FFFFFF', maxWidth: mw - 190 });
        wrapText(ctx, e.body, x, r.y + 66, mw, { size: 25, maxLines: 2, color: '#C9D3DD' });
        const tag = waiting ? 'Waiting to pop up — tap to open now' : e.folded ? 'Folded into the inbox (too many at once)' : '';
        if (tag) text(ctx, tag, x, r.y + ROW_H - 36, { size: 22, color: waiting ? '#FFD166' : '#7F8C99', maxWidth: mw });
      }
      scroll.end(ctx);
    },
  };
  return screen;
}
