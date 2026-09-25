// "Major feedback" (bible §33.4): the biggest moments — a finished product, a rank up, a trophy —
// pause the game and wait for the player to tap before anything moves on.
// Moments queue up (max 20, bible §40); while one is showing it takes every tap.
// The game supplies the words and an optional drawFn for its own art; this draws the dim layer,
// the banner card and the "tap to continue" hint.
//   show({ title, subtitle, accent, drawFn(ctx, t), onShow(), onAck() })
// Plug into ScreenRouter as its modal so input reaches this first.
export class MajorFeedback {
  constructor({ layout, width = 1080, height = 1920, pause = () => {}, minShowSec = 0.8, maxQueue = 20, font = 'system-ui, sans-serif', hint = 'Tap to continue' }) {
    this.layout = layout;
    this.width = width;
    this.height = height;
    this.pause = pause;
    this.minShowSec = minShowSec;
    this.maxQueue = maxQueue;
    this.font = font;
    this.hint = hint;
    this.queue = [];
    this.current = null;
    this.time = 0; // seconds the current moment has been showing
    this.shown = 0; // how many have been acknowledged
  }

  get active() {
    return this.current !== null;
  }

  show(moment) {
    if (this.current && this.queue.length >= this.maxQueue) return false;
    this.pause();
    if (this.current) this.queue.push(moment);
    else this._start(moment);
    return true;
  }

  _start(moment) {
    this.current = moment;
    this.time = 0;
    moment.onShow?.();
  }

  // Real time (runs while the game is paused).
  update(dt) {
    if (this.current) this.time += dt;
  }

  get canAck() {
    return this.active && this.time >= this.minShowSec;
  }

  // Returns true when the tap closed the moment.
  acknowledge() {
    if (!this.canAck) return false;
    const done = this.current;
    this.current = null;
    this.shown++;
    if (this.queue.length) {
      this.pause();
      this._start(this.queue.shift());
    }
    done.onAck?.();
    return true;
  }

  // Input while active: any tap acknowledges (after the short guard time). Drags do nothing.
  onTap() {
    this.acknowledge();
  }

  render(ctx) {
    const m = this.current;
    if (!m) return;
    const t = this.time;
    const W = this.width;
    const H = this.height;
    ctx.save();
    // Dim layer with a soft vignette.
    ctx.globalAlpha = Math.min(1, t / 0.25);
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.12, W / 2, H / 2, H * 0.62);
    g.addColorStop(0, 'rgba(8,10,14,0.15)');
    g.addColorStop(1, 'rgba(8,10,14,0.72)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
    m.drawFn?.(ctx, t);

    // Banner card near the bottom of the safe area.
    const sr = this.layout.safeRect;
    const cw = Math.min(sr.w - 64, 940);
    const ch = m.subtitle ? 250 : 190;
    const slide = Math.max(0, 1 - t / 0.3);
    const x = sr.x + (sr.w - cw) / 2;
    const y = sr.y + sr.h - ch - 70 + slide * slide * 120;
    const accent = m.accent || '#7CFFB2';
    ctx.globalAlpha = Math.min(1, t / 0.2);
    ctx.fillStyle = 'rgba(22,28,36,0.97)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, cw, ch, 32);
    else ctx.rect(x, y, cw, ch);
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = accent;
    ctx.font = `bold 64px ${this.font}`;
    ctx.fillText(m.title, W / 2, y + 66, cw - 60);
    if (m.subtitle) {
      ctx.fillStyle = '#E8EEF2';
      ctx.font = `36px ${this.font}`;
      ctx.fillText(m.subtitle, W / 2, y + 136, cw - 60);
    }
    if (this.canAck) {
      ctx.globalAlpha = 0.55 + 0.45 * Math.sin(t * 4) ** 2;
      ctx.fillStyle = '#FFD166';
      ctx.font = `bold 34px ${this.font}`;
      ctx.fillText(this.hint, W / 2, y + ch - 44, cw - 60);
    }
    ctx.restore();
  }
}
