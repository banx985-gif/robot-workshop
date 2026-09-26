// Robot Workshop's station menus (Milestone 17b): what opens when a station, a worker, or a bottom-bar button is
// tapped. Each builder returns a plain menu for core/ui/BottomSheet.js; the buttons open the existing screens, so no
// game rule changes. Every station menu ends with an Upgrade section (what it does, what it could become, build).
//   createStationMenus({ campaign, router, workshop, sheet }) → MenuRegistry
//   kinds: a facility id (F01…F35) · 'worker' · 'build' · 'staff' · 'research' · 'compete' · 'money'
import { MenuRegistry } from '../../../../core/ui/BottomSheet.js';
import { THEME } from '../../../../core/Theme.js';
import { FACILITIES, STATIONS, STATION_UPGRADES, BUILD_ART } from '../../data/facilities.js';
import { PHASES, BUDGET_FOCUS } from '../../data/phases.js';
import { ROLES } from '../../data/staff.js';
import { TRAITS } from '../../data/traits.js';
import { WORK_STATS } from '../../data/stats.js';
import { RESEARCH_ART } from '../../data/research.js';
import { COMPETITION_ART } from '../../data/competitions.js';
import { RECRUIT_ART } from '../../data/recruitment.js';
import { TRAINING_ART } from '../../data/training.js';
import { SYNERGY_ART } from '../../data/synergies.js';
import { SECRET_ART } from '../../data/secrets.js';
import { ACHIEVEMENTS, ACHIEVEMENT_ART } from '../../data/achievements.js';
import { robotArtOf } from '../systems/robotVisual.js';
import { describeUnlock } from '../systems/unlockRules.js';
import { NG_PLUS_ART } from '../../data/ngplus.js';

const C = THEME.color;
const fmt = (n) => Math.round(n).toLocaleString('en-US');
const first = (name) => String(name).split(' ')[0];
// Which project stage a station works (Engineering Desk → Engineering…).
const PHASE_OF = Object.fromEntries(Object.entries(STATIONS).flatMap(([phase, ids]) => ids.map((id) => [id, phase])));

export function createStationMenus({ campaign, router, workshop, sheet, comingSoon = () => {} }) {
  const go = (screen, params) => () => {
    sheet.close();
    router.go(screen, params);
  };
  const job = () => campaign.activeProject;

  // --- shared sections -----------------------------------------------------
  function upgradeSection(view) {
    const d = FACILITIES[view.item.def];
    const lines = [{ text: `What it does: ${d.blurb}` }];
    for (const u of STATION_UPGRADES[d.id] ?? []) {
      const real = FACILITIES[u.id];
      lines.push({ text: `Could become: ${u.name} (${fmt(real ? campaign.facilityCost(u.id) : u.cost)} credits, ${real ? describeUnlock(real.unlock) : u.needs}) — ${u.note}${real ? '' : '. Arrives in a later update.'}`, color: C.textMuted });
    }
    return {
      title: 'Upgrade',
      lines,
      buttons: [
        { id: 'build', label: 'Build & expand', sub: 'Add stations, open floor', icon: BUILD_ART.buildIcon, onTap: go('build') },
        { id: 'move', label: 'Move or sell', sub: 'Pick it up in Build mode', icon: BUILD_ART.buildIcon, accent: C.progress, onTap: go('build', { selectUid: view.uid }) },
      ],
    };
  }

  function projectLines() {
    const j = job();
    if (!j) return [{ text: campaign.canStartProject().ok ? 'Nothing is being built. Start a robot!' : campaign.canStartProject().reason, color: C.textMuted }];
    const phase = PHASES[j.phaseIndex];
    const pct = Math.floor(Math.min(1, j.phaseProgress / j.phaseTarget) * 100);
    const team = campaign.projects.teamOf(j).map((s) => first(s.name));
    return [
      { text: `${j.name}: stage ${j.phaseIndex + 1} of ${PHASES.length}, ${phase.name} — ${pct}%` },
      { text: `Team: ${team.length ? team.join(', ') : 'nobody yet!'} · Faults: ${j.data.faults.length} · ${BUDGET_FOCUS[j.data.budgetFocus].name}`, color: C.textMuted },
      { text: `About ${fmt(campaign.operatingCostPerDay(j))} credits a day to run`, color: C.textMuted },
    ];
  }

  function robotButtons() {
    const j = job();
    const can = campaign.canStartProject();
    const list = j
      ? [{ id: 'project', label: 'Current build', sub: 'Stages, team, budget', icon: robotArtOf({ purpose: j.data.purpose }), onTap: go('project') }]
      : [{ id: 'newRobot', label: 'New robot', sub: can.ok ? 'Parts, team and budget' : 'Not right now', icon: 'ui_icon_11', disabled: !can.ok, onTap: go('builder') }];
    list.push({ id: 'projects', label: 'All projects', sub: 'Bays, on sale, recent', icon: 'ui_icon_06_robot', accent: C.progress, onTap: go('projects') }); // Project List (Milestone 21)
    list.push({ id: 'components', label: 'Parts & looks', icon: SYNERGY_ART.icon, accent: C.progress, onTap: go('components', { back: 'workshop' }) });
    list.push({ id: 'combos', label: 'Combo Archive', icon: SYNERGY_ART.icon, accent: C.progress, onTap: go('combos', { back: 'workshop' }) });
    return list;
  }

  // New Game+ Blueprint Memory (Milestone 20, §30.4): one tap rebuilds a remembered robot once its parts are open.
  function blueprintSection() {
    const list = campaign.ngPlusRun?.blueprints ?? [];
    if (!list.length) return null;
    return {
      title: 'Blueprint Memory',
      buttons: list.map((b) => {
        const block = campaign.blueprintBlock(b.id);
        return {
          id: `blueprint:${b.id}`,
          label: `Rebuild ${b.name}`,
          sub: block ?? 'One tap: same six parts, balanced budget',
          icon: b.art ?? NG_PLUS_ART.blueprint,
          accent: C.purple,
          disabled: !!block,
          onTap: () => {
            if (campaign.rebuildBlueprint(b.id).ok) sheet.close(); // the build starts on the Assembly Bay
          },
        };
      }),
      columns: 1,
    };
  }

  function competeButtons() {
    const ready = campaign.openCompetitions.some((e) => campaign.competitions.records[e.id]?.lastPeriod !== campaign.monthIndex) && campaign.competitionRobots.length > 0;
    return [
      { id: 'competitions', label: 'Competitions', sub: `${campaign.openCompetitions.length} open`, icon: COMPETITION_ART.icon, badge: ready ? '!' : null, onTap: go('competitions') },
      { id: 'rankings', label: 'Rankings', icon: COMPETITION_ART.rankingsIcon, accent: C.progress, onTap: go('rankings') },
      { id: 'trophies', label: 'Trophies', sub: `${campaign.trophies.count} won`, icon: COMPETITION_ART.trophiesIcon, accent: C.gold, onTap: go('trophies') },
      // Milestone 18: achievements, account records and completion.
      { id: 'records', label: 'Records', sub: `${campaign.achievements.count} of ${ACHIEVEMENTS.length} achievements`, icon: ACHIEVEMENT_ART.records, accent: C.progress, badge: campaign.achievements.unseen || null, onTap: go('records', { back: 'workshop' }) },
    ];
  }

  function staffButtons() {
    const special = campaign.recruitment.special && !campaign.hireBlock(campaign.recruitment.special.id);
    return [
      { id: 'roster', label: 'Staff', sub: `${campaign.staff.staff.length} of ${campaign.employeeCap}`, icon: 'ui_icon_05_staff', onTap: go('roster') },
      { id: 'hire', label: 'Hire', sub: special ? 'Someone special is waiting!' : 'The job board', icon: RECRUIT_ART.icon, badge: special ? '!' : null, onTap: go('recruit', { focusSpecial: !!special }) },
      { id: 'training', label: 'Training', icon: TRAINING_ART.icon, accent: C.progress, onTap: go('training') },
    ];
  }

  function researchLines() {
    const res = campaign.research;
    const lines = [{ text: `${fmt(res.rp)} Research Points · ${res.doneCount} topics done` }];
    res.queues.forEach((q, i) => {
      if (!res.queueOpen(i)) return;
      const n = q.nodeId ? res.node(q.nodeId) : null;
      const who = q.staffId ? first(campaign.staff.get(q.staffId)?.name ?? '') : 'nobody';
      lines.push({ text: n ? `Queue ${i + 1}: ${n.name} ${Math.floor(res.fraction(n.id) * 100)}% (${who})` : `Queue ${i + 1}: free — pick a topic`, color: C.textMuted });
    });
    return lines;
  }

  function moneyButtons() {
    const k = campaign.contracts;
    const waiting = campaign.history.records.filter((r) => !r.launchedProductId && !r.deliveredContractId).length;
    return [
      { id: 'finance', label: 'Finance', sub: 'Money, sponsors, ledger', icon: 'ui_icon_01_money', onTap: go('finance') },
      { id: 'products', label: 'Products', sub: `${campaign.products.active.length}/${campaign.products.slotCount} on sale${waiting ? ` · ${waiting} to launch` : ''}`, icon: 'ui_icon_13', badge: waiting && campaign.products.freeSlots ? '!' : null, onTap: go('products') },
      { id: 'contracts', label: 'Contracts', sub: `${k.active.length}/${k.maxActive} taken`, icon: 'ui_icon_14', badge: k.offers.length && k.canAccept ? k.offers.length : null, onTap: go('contracts', { tab: 'offered' }) },
      { id: 'save', label: workshop.topBar.savedNote ?? 'Save now', sub: 'It also saves every month', icon: 'ui_icon_28', accent: C.progress, onTap: () => workshop.topBar.save() },
      // Store and VIP: menu entries only until Milestone 23. New Game+ moved to the main menu (Milestone 21).
      { id: 'store', label: 'Store', sub: 'Coming soon', icon: 'ui_icon_21', accent: C.purple, onTap: () => comingSoon('store') },
      { id: 'vip', label: 'VIP', sub: 'Coming soon', icon: 'ui_icon_22', accent: C.purple, onTap: () => comingSoon('vip') },
    ];
  }

  // --- station menus -------------------------------------------------------------
  function station(view) {
    const d = FACILITIES[view.item.def];
    const phase = PHASE_OF[d.id];
    const menu = { title: d.name, subtitle: d.blurb, art: d.art, sections: [] };
    const who = view.user ? `${first(view.user.name)} is working here` : null;
    const resting = workshop.agents.filter((a) => a.restAt?.view === view).map((a) => first(a.name));
    switch (d.id) {
      case 'F05':
      case 'F01':
        menu.subtitle = job() ? `Building ${job().name}` : 'The robot-building machine';
        menu.sections.push({ title: 'Robot', lines: projectLines(), buttons: robotButtons() });
        if (blueprintSection()) menu.sections.push(blueprintSection());
        break;
      case 'F11':
      case 'F33':
        menu.sections.push({ title: 'Research', lines: researchLines(), buttons: [{ id: 'research', label: 'Research tree', icon: RESEARCH_ART.icon, onTap: go('research') }] });
        break;
      case 'F34':
        menu.sections.push({
          title: 'Secret Lab',
          lines: researchLines(),
          buttons: [
            { id: 'research', label: 'Secret research', icon: RESEARCH_ART.icon, onTap: go('research', { branch: 'secretLab' }) },
            { id: 'rumours', label: 'Rumours', icon: SECRET_ART.marker, accent: C.purple, onTap: go('rumours', { back: 'workshop' }) },
          ],
        });
        break;
      case 'F13':
        menu.sections.push({ title: 'Customers and hiring', buttons: [moneyButtons().find((b) => b.id === 'contracts'), staffButtons().find((b) => b.id === 'hire')] });
        break;
      case 'F12':
      case 'F10':
        menu.sections.push({ title: 'Rest and training', lines: [{ text: resting.length ? `Resting here: ${resting.join(', ')}` : 'Nobody is resting here right now.', color: C.textMuted }], buttons: [staffButtons()[0], staffButtons()[2]] });
        break;
      case 'F15':
      case 'F09': {
        const rec = workshop.displayRecordOf?.(view);
        menu.sections.push({ title: 'Products', lines: [{ text: rec ? `On show: ${rec.name} · +${rec.displayRep ?? 0}/50 reputation so far` : 'Your newest finished robot stands here.', color: C.textMuted }], buttons: [moneyButtons().find((b) => b.id === 'products'), { id: 'launch', label: 'Launch a robot', icon: 'ui_icon_06_robot', accent: C.good, onTap: go('products') }] });
        break;
      }
      case 'F08':
      case 'F35':
        menu.sections.push({ title: 'Competitions', buttons: competeButtons() });
        break;
      case 'F06':
      case 'F14':
      case 'F07':
        menu.sections.push({ title: 'Parts', buttons: robotButtons().filter((b) => b.id !== 'combos') });
        break;
      // Milestone 19: the advanced facilities (F16–F18 and F25 also get their stage section below).
      case 'F19':
      case 'F20':
        menu.sections.push({ title: 'Robot', lines: [...projectLines(), { text: `Project bays: ${campaign.projectBays}`, color: C.textMuted }], buttons: robotButtons() });
        break;
      case 'F21':
      case 'F22':
      case 'F23':
      case 'F24':
      case 'F26':
        menu.sections.push({ title: 'Lab', lines: [{ text: 'Its bonus goes onto every robot you build from now on.', color: C.textMuted }], buttons: robotButtons().filter((b) => b.id !== 'combos') });
        break;
      case 'F25':
        menu.sections.push({ title: 'Competitions', buttons: competeButtons() });
        break;
      case 'F27':
      case 'F28':
      case 'F30':
        menu.sections.push({ title: 'Team', buttons: [staffButtons()[2], staffButtons()[0], staffButtons()[1]] });
        break;
      case 'F29':
        menu.sections.push({ title: 'Rest', lines: [{ text: resting.length ? `Resting here: ${resting.join(', ')}` : 'Nobody is resting here right now.', color: C.textMuted }], buttons: [staffButtons()[0], staffButtons()[2]] });
        break;
      case 'F31':
        menu.sections.push({ title: 'Products', buttons: [moneyButtons().find((b) => b.id === 'products'), { id: 'launch', label: 'Launch a robot', icon: 'ui_icon_06_robot', accent: C.good, onTap: go('products') }] });
        break;
      case 'F32':
        menu.sections.push({ title: 'Sponsors', lines: [{ text: campaign.sponsors.activeDef ? `Sponsor: ${campaign.sponsors.activeDef.name}` : 'No sponsor right now.', color: C.textMuted }], buttons: [moneyButtons().find((b) => b.id === 'finance')] });
        break;
    }
    if (phase && !['assembly', 'research', 'training'].includes(phase)) {
      const j = job();
      const now = j && PHASES[j.phaseIndex].id === phase;
      menu.sections.unshift({
        title: `${PHASES.find((p) => p.id === phase)?.name ?? 'Project'} stage`,
        lines: [{ text: now ? `Working now — ${Math.floor(Math.min(1, j.phaseProgress / j.phaseTarget) * 100)}% done${who ? ` · ${who}` : ''}` : `Used in the ${PHASES.find((p) => p.id === phase)?.name ?? phase} stage of every robot.${who ? ` ${who}.` : ''}`, color: now ? C.text : C.textMuted }],
        buttons: j ? [{ id: 'project', label: 'Current build', icon: 'ui_icon_11', onTap: go('project') }, staffButtons()[0]] : [staffButtons()[0]],
      });
    }
    menu.sections.push(upgradeSection(view));
    return menu;
  }

  // --- a worker ----------------------------------------------------------------
  function worker(agent) {
    const s = campaign.staff.get(agent.staffId);
    if (!s) return null;
    const j = job();
    const onTeam = !!j && j.slots.includes(s.id);
    const res = campaign.research;
    const q = res.queueOfWorker(s.id);
    const desk = res.queueOpen(0);
    const status = ['stressed', 'tired', 'inspired'].filter((k) => s.status?.[k]).map((k) => k[0].toUpperCase() + k.slice(1));
    const busy = (except) => campaign.busyReason(s.id, except);
    const move = (fn) => () => {
      fn();
      campaign.assignments.refresh();
    };
    return {
      title: s.name,
      subtitle: `${ROLES[s.role].name} · Level ${s.level} · ${s.tier[0].toUpperCase() + s.tier.slice(1)}${status.length ? ' · ' + status.join(', ') : ''}`,
      art: s.art,
      accent: C.action,
      sections: [
        {
          lines: [
            { text: WORK_STATS.map((w) => `${w.short} ${s.stats[w.key]}`).join('  ·  ') },
            { text: `Energy ${Math.round(s.energy)} · Morale ${Math.round(s.morale)} · Now: ${workshop.taskLabel(s.id)}`, color: C.textMuted },
            { text: `Traits: ${s.traits.map((t) => TRAITS[t]?.name ?? t).join(', ') || 'none'}`, color: C.textMuted },
          ],
        },
        {
          title: 'Move to…',
          buttons: [
            onTeam
              ? { id: 'unassign', label: 'Off the robot', sub: 'Rest at the Break Table', icon: 'ui_icon_11', accent: C.progress, onTap: move(() => campaign.assignments.unassign(j, s.id)) }
              : { id: 'assign', label: 'Robot team', sub: j ? (busy('project') ?? `Work on ${j.name}`) : 'No robot being built', icon: 'ui_icon_11', disabled: !j || !!busy('project') || !j.slots.includes(null), onTap: move(() => campaign.assignments.assign(j, s.id)) },
            q >= 0
              ? { id: 'unresearch', label: 'Off research', icon: RESEARCH_ART.icon, accent: C.progress, onTap: move(() => res.assign(q, null)) }
              : { id: 'research', label: 'Research Desk', sub: desk ? (busy('research') ?? (res.queues[0].staffId ? 'Swap in for the researcher' : 'Research the current topic')) : 'Build a Research Desk first', icon: RESEARCH_ART.icon, disabled: !desk || !!busy('research'), onTap: move(() => res.assign(0, s.id)) },
            { id: 'train', label: 'Training', sub: campaign.training.trainingOf(s.id) ? 'In training now' : 'Pick a course', icon: TRAINING_ART.icon, onTap: go('training', { staffId: s.id }) },
            { id: 'details', label: 'Full card', sub: 'Career, traits, stats', icon: 'ui_icon_05_staff', accent: C.progress, onTap: go('staffDetail', { staffId: s.id }) },
          ],
        },
      ],
    };
  }

  // --- the bottom bar -------------------------------------------------------------
  const assemblyView = () => workshop.stationOf('F05') ?? workshop.stationOf('F01');
  const reg = new MenuRegistry();
  for (const id of Object.keys(FACILITIES)) reg.register(id, station);
  reg
    .register('worker', worker)
    .register('build', () => {
      const v = assemblyView();
      if (v) return station(v);
      return { title: 'Robots', subtitle: 'Build an Assembly Bay to make robots', art: 'ui_icon_11', sections: [{ lines: projectLines(), buttons: [...robotButtons(), { id: 'build', label: 'Build & expand', icon: BUILD_ART.buildIcon, onTap: go('build') }] }] };
    })
    .register('staff', () => ({ title: 'Staff', subtitle: `${campaign.staff.staff.length} people · cap ${campaign.employeeCap}`, art: 'ui_icon_05_staff', sections: [{ buttons: staffButtons() }] }))
    .register('research', () => {
      const v = workshop.stationOf('F11');
      if (v) return station(v);
      return { title: 'Research', subtitle: 'Build a Research Desk to research new parts', art: RESEARCH_ART.icon, sections: [{ lines: researchLines(), buttons: [{ id: 'research', label: 'Research tree', icon: RESEARCH_ART.icon, onTap: go('research') }, { id: 'build', label: 'Build & expand', icon: BUILD_ART.buildIcon, onTap: go('build') }] }] };
    })
    .register('compete', () => ({ title: 'Compete', subtitle: 'Events, rankings, trophies and records', art: COMPETITION_ART.icon, sections: [{ buttons: competeButtons() }] }))
    .register('money', () => {
      const e = campaign.economy;
      return { title: 'Money', subtitle: `${fmt(e.balance('credits'))} credits · ${e.balance('techChips')} Tech Chips${e.balance('prestigeTokens') ? ` · ${e.balance('prestigeTokens')} Prestige Tokens` : ''}`, art: 'reward_01', sections: [{ buttons: moneyButtons() }] };
    })
    .register('floor', () => ({ title: 'Workshop floor', subtitle: 'Add stations or open more floor', art: BUILD_ART.buildIcon, sections: [{ buttons: [{ id: 'build', label: 'Build mode', sub: 'Place, move and sell', icon: BUILD_ART.buildIcon, onTap: go('build') }] }] }));
  return reg;
}
