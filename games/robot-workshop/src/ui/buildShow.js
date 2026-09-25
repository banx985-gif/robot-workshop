// The robot build you can watch (Milestone 17b): instead of bars filling up, each project stage plays on the
// Assembly Bay. Only the existing art is used — faded, masked, scaled and moved, never drawn on (card rule).
//   1 Concept      a blueprint pop (vfx_04) over a faint hologram of the robot, flickering in
//   2 Engineering  the six chosen part icons fly in from the Parts Rack, one by one, and hover over the bay
//   3 Software     code sparkles (the research glow, small) stream from the Programming Station into the parts
//   4 Assembly     the robot picture is revealed bottom-to-top (a mask wipe) with welding sparks at the edge
//   5 Testing      the finished robot steps off onto the test spot, bobs, and flashes (vfx_09)
// drawBuild(ctx, view) — view: { assets, job, frac (0–1 through the stage), time, bay, rack, screen, test,
//   robotKey, partKeys, reducedFlashes } where bay/rack/screen/test are world points { x, y } and bay has the
//   robot's standing height `robotH`.
import { THEME } from '../../../../core/Theme.js';
import { VFX_ART } from '../../data/feedback.js';
import { RESEARCH_ART } from '../../data/research.js';

export const BUILD_STAGES = ['Concept', 'Engineering', 'Software', 'Assembly', 'Testing'];
const PART_S = 64;

const ease = (k) => 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 3);
const lerp = (a, b, t) => a + (b - a) * t;

// Where the k-th of n parts hovers over the bay (a slow ring).
function ringPoint(v, k, n, spin = 0) {
  const a = (k / n) * Math.PI * 2 + spin;
  return { x: v.bay.x + Math.cos(a) * v.robotH * 0.42, y: v.bay.y - v.robotH * 0.55 + Math.sin(a) * v.robotH * 0.16 };
}

function drawParts(ctx, v, count, spin, alpha = 1) {
  const n = v.partKeys.length;
  ctx.save();
  ctx.globalAlpha = alpha;
  for (let k = 0; k < count; k++) {
    const p = ringPoint(v, k, n, spin);
    v.assets.drawContained(ctx, v.partKeys[k], { x: p.x - PART_S / 2, y: p.y - PART_S / 2 + Math.sin(v.time * 3 + k) * 3, w: PART_S, h: PART_S });
  }
  ctx.restore();
}

function robot(ctx, v, x, y, { alpha = 1, clipFrom = 0 } = {}) {
  const h = v.robotH;
  const w = h * v.assets.aspect(v.robotKey);
  ctx.save();
  ctx.globalAlpha = alpha;
  if (clipFrom > 0) {
    ctx.beginPath();
    ctx.rect(x - w, y - h + h * clipFrom, w * 2, h * (1 - clipFrom) + 4); // mask: only the part below the wipe line
    ctx.clip();
  }
  v.assets.draw(ctx, v.robotKey, x - w / 2, y - h, w, h);
  ctx.restore();
  return { w, h };
}

function glow(ctx, v, x, y, size, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  v.assets.drawContained(ctx, RESEARCH_ART.glow, { x: x - size / 2, y: y - size / 2, w: size, h: size });
  ctx.restore();
}

export function drawBuild(ctx, v) {
  if (!v.job) return;
  const stage = v.job.phaseIndex;
  const f = v.frac;
  const t = v.time;
  const bay = v.bay;
  const flick = v.reducedFlashes ? 1 : 0.8 + 0.2 * Math.sin(t * 17) * Math.sin(t * 5.3);
  // The bay hums while a robot is on it.
  glow(ctx, v, bay.x, bay.y - v.robotH * 0.25, v.robotH * 1.5, 0.35 + 0.15 * Math.sin(t * 2.4));
  switch (stage) {
    case 0: {
      // Concept: the blueprint appears, then the robot's hologram fades in over it.
      const s = v.robotH * (0.9 + 0.35 * ease(f));
      ctx.save();
      ctx.globalAlpha = 0.55 + 0.25 * Math.sin(t * 3);
      v.assets.drawContained(ctx, VFX_ART.blueprintPop, { x: bay.x - s / 2, y: bay.y - v.robotH * 0.55 - s / 2, w: s, h: s });
      ctx.restore();
      robot(ctx, v, bay.x, bay.y, { alpha: (0.12 + 0.33 * ease(f)) * flick });
      break;
    }
    case 1: {
      // Engineering: parts fly in from the rack one by one.
      const n = v.partKeys.length;
      const done = Math.floor(f * n);
      drawParts(ctx, v, done, t * 0.4);
      if (done < n) {
        const k = done;
        const local = f * n - k;
        const to = ringPoint(v, k, n, t * 0.4);
        const from = v.rack;
        const x = lerp(from.x, to.x, ease(local));
        const y = lerp(from.y, to.y, ease(local)) - Math.sin(local * Math.PI) * v.robotH * 0.6;
        v.assets.drawContained(ctx, v.partKeys[k], { x: x - PART_S / 2, y: y - PART_S / 2, w: PART_S, h: PART_S });
      }
      robot(ctx, v, bay.x, bay.y, { alpha: 0.12 * flick });
      break;
    }
    case 2: {
      // Software: code sparkles stream from the programming screens into the floating parts.
      drawParts(ctx, v, v.partKeys.length, t * 0.8);
      for (let i = 0; i < 6; i++) {
        const k = (t * 0.6 + i / 6) % 1;
        const x = lerp(v.screen.x, bay.x, k);
        const y = lerp(v.screen.y, bay.y - v.robotH * 0.55, k) - Math.sin(k * Math.PI) * 60;
        glow(ctx, v, x, y, 46, 0.9 * Math.sin(k * Math.PI));
      }
      glow(ctx, v, v.screen.x, v.screen.y, 120, 0.45 * flick); // the station's screens light up
      robot(ctx, v, bay.x, bay.y, { alpha: (0.12 + 0.2 * f) * flick });
      break;
    }
    case 3: {
      // Assembly: the robot is revealed from the feet up, sparks at the wipe line; the parts are used up.
      const k = ease(f);
      drawParts(ctx, v, Math.ceil(v.partKeys.length * (1 - k)), t * 1.2, 1 - k);
      robot(ctx, v, bay.x, bay.y, { alpha: 0.18 });
      robot(ctx, v, bay.x, bay.y, { clipFrom: 1 - k });
      const y = bay.y - v.robotH * k;
      ctx.save();
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 23);
      v.assets.drawContained(ctx, VFX_ART.smallSparks, { x: bay.x - 60 + Math.sin(t * 7) * 30, y: y - 40, w: 90, h: 90 });
      if (Math.sin(t * 2.1) > 0.7) v.assets.drawContained(ctx, VFX_ART.bigBurst, { x: bay.x - 55, y: y - 50, w: 110, h: 110 });
      ctx.restore();
      break;
    }
    default: {
      // Testing: it steps off the bay onto the test spot and bobs; now and then a check flash.
      const walk = ease(Math.min(1, f / 0.35));
      const x = lerp(bay.x, v.test.x, walk);
      const y = lerp(bay.y, v.test.y, walk) - Math.abs(Math.sin(t * 7)) * (walk < 1 ? 10 : 4);
      robot(ctx, v, x, y);
      const pulse = (t * 0.7) % 1;
      if (!v.reducedFlashes && pulse < 0.25) {
        ctx.save();
        ctx.globalAlpha = 1 - pulse / 0.25;
        const s = v.robotH * 1.3;
        v.assets.drawContained(ctx, VFX_ART.robotDone, { x: x - s / 2, y: y - v.robotH * 0.55 - s / 2, w: s, h: s });
        ctx.restore();
      }
    }
  }
  // Stage label under the bay (world units; big once zoomed in).
  const label = `${stage + 1}/5 ${BUILD_STAGES[stage] ?? ''} · ${Math.floor(f * 100)}%`;
  ctx.save();
  ctx.font = `bold 17px ${THEME.family}`; // world size
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const tw = ctx.measureText(label).width + 22;
  ctx.fillStyle = THEME.color.chip;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(bay.x - tw / 2, bay.y + 18, tw, 30, 15);
  else ctx.rect(bay.x - tw / 2, bay.y + 18, tw, 30);
  ctx.fill();
  ctx.fillStyle = THEME.color.textOnDark;
  ctx.fillText(label, bay.x, bay.y + 33);
  ctx.restore();
}
