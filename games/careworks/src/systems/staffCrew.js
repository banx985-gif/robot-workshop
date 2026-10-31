// The staff in the home (Milestone 3): one walker per team member on core/Agent, the Morning shift from the roster,
// Energy / Morale by the game hour (data/balance.js), and helping with Arthur's routine steps. No drawing here, so the
// Node tests run it as it is.
//   createCrew({ grid, state, sys, perks, roster, spotTile, hourNow, bandNow, bus })
//     state = the run's staff state (src/systems/staffTeam.js)   sys = its core/StaffSystem   perks = core/FounderPerks
//   crew.people                       [{ kind: 'staff', id, name, art, line, model, agent, mode, … }]
//   crew.update(g, hours)             g = game-seconds this step, hours = game hours this step
//   crew.canHelp(id, step) → { ok, reason }        the role rule, in plain words (the resident card's picker)
//   crew.isFree(p) · crew.tooTired(p)              Milestone 4: they pick their own tasks (src/systems/homeWorld.js)
//   crew.startTask(id, task, spot) · crew.retarget(id, spot) · crew.resumeTask(id, task, spot, arrived)
//   crew.finishTask(id) · crew.releaseTask(id)     done (task counted) / never mind (back to their post)
//   crew.stateOf(person) → "On shift at the Nurse Station" …
// Milestone 7: three shifts (src/systems/roster.js). Night costs Morale unless it is their preference; their preferred
// shift lifts it a little (data/shifts.js SHIFT_MORALE). Agency workers join for one shift: crew.addPerson(model,
// { agency: true, at }) walks them in from the front entrance, and when their shift ends they walk out again and are
// marked gone (the home world then drops them).
import { Agent } from '../../../../core/Agent.js';
import { POSTS, HELP_SPOTS, PERSON, ENTRANCE } from '../../data/home.js';
import { SHIFT_MORALE } from '../../data/shifts.js';
import { staffById } from '../../data/staff.js';
import { ROLES } from '../../data/roles.js';
import { STAFF_BALANCE as B, WALK } from '../../data/balance.js';
import { TIMER_SCALE } from '../../data/routine.js';
import { FOUNDER_FLAG } from '../../data/setup.js';
import { energyPct, moralePerHour, shiftPct } from './traitEffects.js';

const clamp = (x) => Math.max(0, Math.min(100, x));
const PLACE_WORDS = { 'F01.staff': 'at the Nurse Station', 'F05.staff': 'in the Activity Lounge', 'hall.cwPost': 'in the corridor', 'hall.ahPost': 'in the corridor' };
const joinRoles = (ids) => {
  const names = ids.map((r) => ROLES[r].name);
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}` : names[0];
};
const stepWord = (step) => (step.activity ? step.name : step.name.toLowerCase());

// Milestone 11: trainingSpot(p) → the spot ref a trainee sits at (the Training Room, or their rest spot without one);
// trainingLabel(id) → the course they are on.
// (Milestone 21: energyMult() — × on the Energy used on shift, e.g. the home's Shift Planning research; 1 by default)
export function createCrew({ grid, state, sys, perks, roster, spotTile, hourNow, bandNow, bus = null, trainingSpot = (p) => p.restSpot, trainingLabel = () => 'a course', energyMult = () => 1, restBonus = () => B.energy.restSpotBonus }) {
  const makePerson = (model, i) => {
    const p = {
      kind: 'staff',
      id: model.id,
      name: model.name,
      art: model.art,
      role: model.role,
      line: ROLES[model.role].name,
      model,
      restSpot: `rest.${(i % 5) + 1}`, // five rest spots in front of the Staff Room
      mode: 'post', // post · toHelp · helping · toRest · resting
      postIndex: 0,
      stay: 1 + i * 1.5, // game-seconds before the first move (so they don't all set off together)
      task: null, // Milestone 4: { id (care task id), type, label, room, spot, arrived }
      bandDone: state.bandDone?.[model.id] ?? 0, // tasks finished this band (the AI's workload)
    };
    p.agent = new Agent({ id: model.id, name: model.name, speed: PERSON.speed * WALK.speedMultiplier, noPathTeleportSec: 3 * TIMER_SCALE }); // (Milestone 14: 5× faster)
    const at = state.pos?.[model.id];
    if (at) {
      p.agent.x = at.x;
      p.agent.y = at.y;
    } else {
      const t = spotTile(POSTS[model.role].spots[0]);
      p.agent.placeAtTile(grid, t.col, t.row);
    }
    return p;
  };
  const agencyIds = new Set((state.roster.agency ?? []).map((a) => a.id));
  const people = sys.staff.map((model, i) => {
    const p = makePerson(model, i);
    if (agencyIds.has(model.id)) p.agency = true;
    return p;
  });
  const byId = (id) => people.find((p) => p.id === id) ?? null;
  const onShift = (p) => roster.onShift(p.id);
  const walk = (p, ref, mode, then = null) => {
    const t = spotTile(ref);
    p.mode = mode;
    p.agent.walkTo(grid, t.col, t.row, then);
  };
  const toPost = (p) => {
    const post = POSTS[p.role];
    walk(p, post.spots[p.postIndex], 'toPost', () => {
      p.mode = 'post';
      p.stay = post.stay[p.postIndex];
    });
  };
  // Off shift they are resting from the start (a new home opens before the shift): no walk-in needed.
  for (const p of people) if (!p.agency && !onShift(p) && !state.pos?.[p.id]) {
    const t = spotTile(p.restSpot);
    p.agent.placeAtTile(grid, t.col, t.row);
    p.mode = 'resting';
  }
  // After a reload (Milestone 4): back to what they were doing — resting, walking to rest, or on their way to a post
  // (a task they were on is picked up again by the home world).
  for (const p of people) {
    const was = state.modes?.[p.id];
    if (!was || !state.pos?.[p.id]) continue;
    p.postIndex = was.postIndex ?? 0;
    p.stay = was.stay ?? p.stay;
    if (was.mode === 'leaving') {
      p.mode = 'leaving';
      p.agent.walkTo(grid, ENTRANCE.col, ENTRANCE.row, () => (p.gone = true));
    } else if (was.mode === 'resting') p.mode = 'resting';
    else if (was.mode === 'training') p.mode = 'training';
    else if (was.mode === 'toRest') walk(p, p.restSpot, 'toRest', () => (p.mode = 'resting'));
    else if (was.mode === 'toPost') toPost(p);
  }

  function tickNumbers(p, hours) {
    const m = p.model;
    const working = roster.workingShift(p.id);
    // Milestone 12: traits change the Energy they use on shift ('energy', e.g. Morning Person on Morning)
    if (onShift(p)) m.energy = clamp(m.energy + B.energy.workPerHour * (1 + energyPct(m.traits, working) / 100) * energyMult() * hours);
    else m.energy = clamp(m.energy + B.energy.restPerHour * hours * (p.mode === 'resting' ? restBonus() : 1));
    if (m.energy < B.morale.lowEnergyBelow) m.morale = clamp(m.morale + B.morale.lowEnergyPerHour * hours);
    else {
      const gap = B.morale.settleTo - m.morale;
      const step = Math.min(Math.abs(gap), B.morale.settlePerHour * hours);
      m.morale = clamp(m.morale + Math.sign(gap) * step);
    }
    // Milestone 7: Night costs Morale unless it is their preference; their preferred shift lifts it a little.
    // Milestone 12: a 'shift' trait makes that lift bigger; a 'morale' trait lifts Morale while they work.
    const pref = staffById(p.id)?.shiftPref ?? null;
    if (working === 'night' && pref !== 'night') m.morale = clamp(m.morale + SHIFT_MORALE.nightPerHour * hours);
    else if (working && working === pref) m.morale = clamp(m.morale + SHIFT_MORALE.preferredPerHour * (1 + shiftPct(m.traits) / 100) * hours);
    if (working) m.morale = clamp(m.morale + moralePerHour(m.traits) * hours);
    m.activity = working ? 'working' : 'resting';
    sys.refreshStatus(m);
  }

  const crew = {
    people,
    byId,
    update(g, hours) {
      for (const p of people) {
        tickNumbers(p, hours);
        const shift = onShift(p);
        if (p.leftTeam) {
          if (p.agent.state === 'walking') p.agent.update(g, grid);
          continue;
        }
        // Milestone 11: away training — off the roster, at the Training Room
        if (roster.isTraining?.(p.id)) {
          if (p.mode !== 'toTrain' && p.mode !== 'training') {
            if (p.task) crew.releaseTask(p.id);
            walk(p, trainingSpot(p), 'toTrain', () => (p.mode = 'training'));
          }
          if (p.agent.state === 'walking') p.agent.update(g, grid);
          continue;
        }
        if (p.mode === 'toTrain' || p.mode === 'training') {
          // back from a course: to work, or to rest
          if (shift) {
            p.postIndex = 0;
            toPost(p);
          } else walk(p, p.restSpot, 'toRest', () => (p.mode = 'resting'));
        }
        if (p.agency) {
          // an agency worker's one shift is over: out through the front entrance
          if (!shift && p.mode !== 'leaving') crew.leave(p);
        } else if (!shift && p.mode !== 'toRest' && p.mode !== 'resting') {
          if (p.task) crew.releaseTask(p.id);
          walk(p, p.restSpot, 'toRest', () => (p.mode = 'resting'));
          bus?.emit('staff:offShift', { id: p.id });
        } else if (shift && (p.mode === 'toRest' || p.mode === 'resting')) {
          p.postIndex = 0;
          toPost(p);
          bus?.emit('staff:onShift', { id: p.id });
        }
        if (p.agent.state === 'walking') p.agent.update(g, grid);
        else if (p.mode === 'post' && (p.stay -= g / TIMER_SCALE) <= 0) {
          p.postIndex = (p.postIndex + 1) % POSTS[p.role].spots.length;
          toPost(p);
        }
      }
    },
    canHelp(id, step) {
      const p = byId(id);
      if (!p) return { ok: false, reason: 'They are not on the team.' };
      if (!step.roles?.includes(p.role)) {
        return { ok: false, reason: `${p.name.split(' ')[0]} can't help with ${stepWord(step)}: it needs a ${joinRoles(step.roles ?? [])}.` };
      }
      return { ok: true, reason: null };
    },
    // Free to pick a task (Milestone 4: they pick it themselves, src/systems/homeWorld.js): on shift, not on a task,
    // not going off to rest. tired: Energy is below the line (only a task pinned to them, or a call bell, then).
    isFree: (p) => onShift(p) && !p.task && p.mode !== 'toRest' && p.mode !== 'resting',
    tooTired: (p) => p.model.energy < B.tooTiredBelow,
    // Walk to a task. task = { id, type, label, room }: label says what it is ("medication round"); room = it is his
    // room, not him. p.task.arrived turns true on arrival (the home world watches it).
    startTask(id, task, spot) {
      const p = byId(id);
      if (!p) return;
      p.task = { id: task.id, type: task.type, label: task.label, room: !!task.room, who: task.who, going: task.going, doing: task.doing, spot, arrived: false };
      walk(p, spot, 'toHelp', () => {
        p.mode = 'helping';
        if (p.task) p.task.arrived = true;
      });
    },
    // He moved: follow him to the new spot (a task already begun keeps going on the way).
    retarget(id, spot) {
      const p = byId(id);
      if (!p?.task || p.task.spot === spot) return;
      p.task.spot = spot;
      p.task.arrived = false;
      walk(p, spot, 'toHelp', () => {
        p.mode = 'helping';
        if (p.task) p.task.arrived = true;
      });
    },
    // After a reload: back to what they were doing.
    resumeTask(id, task, spot, arrived) {
      const p = byId(id);
      if (!p) return;
      if (arrived) {
        p.task = { id: task.id, type: task.type, label: task.label, room: !!task.room, who: task.who, going: task.going, doing: task.doing, spot, arrived: true };
        p.mode = 'helping';
      } else crew.startTask(id, task, spot);
    },
    // The task is done: Energy, Morale, their task count (and the Founder's history), then back to their post.
    // share (Milestone 15): a light task (one stop on a drinks round) costs and lifts that share of a whole one.
    finishTask(id, share = 1) {
      const p = byId(id);
      if (!p) return;
      const m = p.model;
      m.energy = clamp(m.energy + B.energy.perTask * share);
      m.morale = clamp(m.morale + B.morale.perTask * share);
      m.counters.tasks = (m.counters.tasks ?? 0) + 1;
      if (m.counters[FOUNDER_FLAG]) state.founder.history.careTasks++;
      p.bandDone = (p.bandDone ?? 0) + 1;
      sys.refreshStatus(m);
      p.task = null;
      bus?.emit('staff:task', { id, tasks: m.counters.tasks });
      if (onShift(p)) toPost(p);
    },
    // Never mind (he said no, it was too late, or the shift ended): back to their post.
    releaseTask(id) {
      const p = byId(id);
      if (!p || !p.task) return;
      p.task = null;
      if (onShift(p)) toPost(p);
    },
    // Milestone 7: an agency worker joins for their shift (from the front entrance, unless a reload puts them back).
    addPerson(model, { agency = false, at = null } = {}) {
      const p = makePerson(model, people.length);
      p.agency = agency;
      if (at) {
        p.agent.x = at.x;
        p.agent.y = at.y;
      } else {
        p.agent.placeAtTile(grid, ENTRANCE.col, ENTRANCE.row);
        p.postIndex = 0;
        toPost(p);
      }
      people.push(p);
      return p;
    },
    leave(p) {
      if (p.task) crew.releaseTask(p.id);
      p.mode = 'leaving';
      p.agent.walkTo(grid, ENTRANCE.col, ENTRANCE.row, () => (p.gone = true));
    },
    remove(id) {
      const i = people.findIndex((p) => p.id === id);
      if (i >= 0) people.splice(i, 1);
    },
    newBand() {
      for (const p of people) p.bandDone = 0;
    },
    stateOf(p) {
      const t = p.task;
      const who = t?.who ?? 'Arthur'; // Milestone 6: whichever resident the task is for
      if (t?.going && p.mode === 'toHelp') return t.going; // (Milestone 15: kitchen prep has no resident)
      if (t?.doing && p.mode === 'helping') return t.doing;
      if (t && p.mode === 'toHelp') return t.type === 'bell' ? `Answering ${who}'s call bell` : t.room ? `Going to ${who}'s room (${t.label})` : `Going to ${who} (${t.label})`;
      if (t && p.mode === 'helping') return t.type === 'bell' ? `At ${who}'s call bell` : t.room ? `In ${who}'s room: ${t.label}` : `With ${who}: ${t.label}`;
      if (p.mode === 'leaving') return p.leftTeam ? 'Leaving the home: no longer on the team' : 'Agency shift over: leaving the home';
      if (p.mode === 'toTrain') return `Going to the Training Room (${trainingLabel(p.id)})`;
      if (p.mode === 'training') return `Training: ${trainingLabel(p.id)}`;
      if (roster.isSick?.(p.id) && (p.mode === 'toRest' || p.mode === 'resting')) return 'Off sick: not working until they feel better'; // (Milestone 25)
      if (p.mode === 'toRest') return 'Off shift: going to the Staff Room';
      if (p.mode === 'resting') return 'Off shift: resting in the Staff Room';
      if (p.mode === 'toPost') return 'On shift: walking the home';
      return `On shift ${PLACE_WORDS[POSTS[p.role].spots[p.postIndex]] ?? 'in the hall'}`;
    },
    modes() {
      return Object.fromEntries(people.map((p) => [p.id, { mode: p.mode, postIndex: p.postIndex, stay: p.stay }]));
    },
    positions() {
      // (Milestone 13: and the rest of the path they are walking, so a reload carries on exactly)
      return Object.fromEntries(people.map((p) => [p.id, { x: p.agent.x, y: p.agent.y, ...(p.agent.state === 'walking' && p.agent.path.length ? { path: p.agent.path.map((pt) => ({ x: pt.x, y: pt.y })) } : {}) }]));
    },
  };
  return crew;
}
