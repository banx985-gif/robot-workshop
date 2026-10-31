// Task markers (Milestone 4): small code-drawn badges over a helper's head, one shape per task type (no text), and the
// call bell over a resident. Simple on purpose — the art pass is Milestone 5.
//   drawTaskMarker(ctx, x, y, r, icon, { t, ring })   a round badge centred at (x, y), radius r; icon = data/tasks.js
//                                                     TASK_TYPES[type].icon; ring = the badge's outline colour
//   drawBellMarker(ctx, x, y, r, t)                   the ringing bell (it swings with time t, in seconds)
const INK = '#3B342C';
const COLOURS = {
  bell: '#F2B530', meds: '#E0645A', sun: '#F2B530', moon: '#5E6FB8', bowl: '#C8834E', drop: '#3E9BD6', cross: '#E0645A',
  steps: '#8A6CC0', cup: '#3E9BD6', pot: '#D9822B', star: '#E0913F', heart: '#E0645A', house: '#6FA86A', rest: '#5E6FB8', tired: '#D98A00',
};

export function drawTaskMarker(ctx, x, y, r, icon, { ring = INK } = {}) {
  ctx.save();
  // badge with a little pointer down to the head
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = ring;
  ctx.lineWidth = Math.max(3, r * 0.1);
  ctx.beginPath();
  ctx.moveTo(x - r * 0.3, y + r * 0.9);
  ctx.lineTo(x, y + r * 1.35);
  ctx.lineTo(x + r * 0.3, y + r * 0.9);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.translate(x, y);
  drawIcon(ctx, icon, r * 0.62);
  ctx.restore();
}

export function drawBellMarker(ctx, x, y, r, t = 0) {
  ctx.save();
  const pulse = 1 + 0.08 * Math.sin(t * 9);
  ctx.fillStyle = 'rgba(242, 181, 48, 0.35)';
  ctx.beginPath();
  ctx.arc(x, y, r * 1.3 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFF6D8';
  ctx.strokeStyle = '#C0392B';
  ctx.lineWidth = Math.max(3, r * 0.12);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(t * 12) * 0.35); // it swings
  drawIcon(ctx, 'bell', r * 0.66);
  ctx.restore();
}

// One icon, centred on (0, 0), about 2s across.
function drawIcon(ctx, icon, s) {
  const c = COLOURS[icon] ?? INK;
  ctx.fillStyle = c;
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(2, s * 0.12);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const fillStroke = () => {
    ctx.fill();
    ctx.stroke();
  };
  ctx.beginPath();
  switch (icon) {
    case 'bell':
      ctx.moveTo(-s * 0.8, s * 0.45);
      ctx.quadraticCurveTo(-s * 0.6, s * 0.3, -s * 0.6, -s * 0.2);
      ctx.quadraticCurveTo(-s * 0.55, -s * 0.8, 0, -s * 0.8);
      ctx.quadraticCurveTo(s * 0.55, -s * 0.8, s * 0.6, -s * 0.2);
      ctx.quadraticCurveTo(s * 0.6, s * 0.3, s * 0.8, s * 0.45);
      ctx.closePath();
      fillStroke();
      ctx.beginPath();
      ctx.arc(0, s * 0.62, s * 0.18, 0, Math.PI * 2);
      fillStroke();
      break;
    case 'meds':
      ctx.save();
      ctx.rotate(-Math.PI / 4);
      ctx.roundRect(-s * 0.85, -s * 0.36, s * 1.7, s * 0.72, s * 0.36);
      fillStroke();
      ctx.beginPath();
      ctx.fillStyle = '#FFFFFF';
      ctx.roundRect(0, -s * 0.36, s * 0.85, s * 0.72, [0, s * 0.36, s * 0.36, 0]);
      fillStroke();
      ctx.restore();
      break;
    case 'sun':
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.moveTo(Math.cos(a) * s * 0.6, Math.sin(a) * s * 0.6);
        ctx.lineTo(Math.cos(a) * s * 0.92, Math.sin(a) * s * 0.92);
      }
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.42, 0, Math.PI * 2);
      fillStroke();
      break;
    case 'moon':
      ctx.arc(0, 0, s * 0.8, Math.PI * 0.35, Math.PI * 1.65);
      ctx.arc(s * 0.3, -s * 0.05, s * 0.6, Math.PI * 1.45, Math.PI * 0.55, true);
      ctx.closePath();
      fillStroke();
      break;
    case 'bowl':
      ctx.moveTo(-s * 0.85, -s * 0.05);
      ctx.lineTo(s * 0.85, -s * 0.05);
      ctx.quadraticCurveTo(s * 0.8, s * 0.75, 0, s * 0.75);
      ctx.quadraticCurveTo(-s * 0.8, s * 0.75, -s * 0.85, -s * 0.05);
      fillStroke();
      ctx.beginPath();
      for (const dx of [-0.3, 0.2]) {
        ctx.moveTo(s * dx, -s * 0.3);
        ctx.quadraticCurveTo(s * (dx + 0.2), -s * 0.55, s * dx, -s * 0.8);
      }
      ctx.stroke();
      break;
    case 'drop':
      ctx.moveTo(0, -s * 0.9);
      ctx.quadraticCurveTo(s * 0.75, s * 0.05, s * 0.55, s * 0.4);
      ctx.arc(0, s * 0.3, s * 0.56, 0.2, Math.PI - 0.2);
      ctx.quadraticCurveTo(-s * 0.75, s * 0.05, 0, -s * 0.9);
      fillStroke();
      break;
    case 'cross':
      ctx.moveTo(-s * 0.25, -s * 0.8);
      for (const [px, py] of [[0.25, -0.8], [0.25, -0.25], [0.8, -0.25], [0.8, 0.25], [0.25, 0.25], [0.25, 0.8], [-0.25, 0.8], [-0.25, 0.25], [-0.8, 0.25], [-0.8, -0.25], [-0.25, -0.25]]) ctx.lineTo(px * s, py * s);
      ctx.closePath();
      fillStroke();
      break;
    case 'steps':
      ctx.ellipse(-s * 0.35, s * 0.2, s * 0.26, s * 0.5, -0.2, 0, Math.PI * 2);
      fillStroke();
      ctx.beginPath();
      ctx.ellipse(s * 0.35, -s * 0.25, s * 0.26, s * 0.5, 0.2, 0, Math.PI * 2);
      fillStroke();
      break;
    case 'pot': // (Milestone 15: kitchen prep — a cooking pot with a lid and steam)
      ctx.roundRect(-s * 0.7, -s * 0.2, s * 1.4, s * 0.95, [0, 0, s * 0.35, s * 0.35]);
      fillStroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.95, -s * 0.2);
      ctx.lineTo(s * 0.95, -s * 0.2);
      ctx.stroke();
      ctx.beginPath();
      for (const dx of [-0.25, 0.25]) {
        ctx.moveTo(s * dx, -s * 0.45);
        ctx.quadraticCurveTo(s * (dx + 0.18), -s * 0.65, s * dx, -s * 0.9);
      }
      ctx.stroke();
      break;
    case 'cup':
      ctx.roundRect(-s * 0.65, -s * 0.55, s * 1.05, s * 1.25, [0, 0, s * 0.3, s * 0.3]);
      fillStroke();
      ctx.beginPath();
      ctx.arc(s * 0.45, s * 0.05, s * 0.3, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
      break;
    case 'star':
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const rr = i % 2 ? s * 0.4 : s * 0.9;
        ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath();
      fillStroke();
      break;
    case 'heart':
      ctx.moveTo(0, s * 0.8);
      ctx.bezierCurveTo(-s * 1.1, 0, -s * 0.6, -s * 0.9, 0, -s * 0.35);
      ctx.bezierCurveTo(s * 0.6, -s * 0.9, s * 1.1, 0, 0, s * 0.8);
      fillStroke();
      break;
    case 'house':
      ctx.moveTo(0, -s * 0.85);
      ctx.lineTo(s * 0.85, -s * 0.05);
      ctx.lineTo(s * 0.6, -s * 0.05);
      ctx.lineTo(s * 0.6, s * 0.75);
      ctx.lineTo(-s * 0.6, s * 0.75);
      ctx.lineTo(-s * 0.6, -s * 0.05);
      ctx.lineTo(-s * 0.85, -s * 0.05);
      ctx.closePath();
      fillStroke();
      break;
    // Milestone 5 status icons (not tasks): resting off shift (two small Zs) and tired (a low battery)
    case 'rest':
      ctx.lineWidth = Math.max(3, s * 0.2);
      ctx.strokeStyle = COLOURS.rest;
      for (const [x, y, z] of [[-0.35, 0.1, 0.55], [0.35, -0.45, 0.4]]) {
        ctx.moveTo((x - z / 2) * s, (y - z / 2) * s);
        ctx.lineTo((x + z / 2) * s, (y - z / 2) * s);
        ctx.lineTo((x - z / 2) * s, (y + z / 2) * s);
        ctx.lineTo((x + z / 2) * s, (y + z / 2) * s);
      }
      ctx.stroke();
      break;
    case 'tired':
      ctx.fillStyle = '#FFFFFF';
      ctx.roundRect(-s * 0.85, -s * 0.45, s * 1.5, s * 0.9, s * 0.15);
      fillStroke();
      ctx.beginPath();
      ctx.rect(s * 0.65, -s * 0.2, s * 0.2, s * 0.4);
      ctx.fillStyle = INK;
      ctx.fill();
      ctx.beginPath();
      ctx.rect(-s * 0.7, -s * 0.3, s * 0.35, s * 0.6);
      ctx.fillStyle = COLOURS.tired;
      ctx.fill();
      break;
    default:
      ctx.arc(0, 0, s * 0.5, 0, Math.PI * 2);
      fillStroke();
  }
}
