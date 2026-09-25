// Robot Workshop's messages (Milestone 15): turns what happens in play into inbox entries, toasts and queued pop-ups
// (core/NotificationSystem.js), and fires the illustrated milestone events (data/events.js) at their moments.
// No drawing here: main.js shows a queued pop-up from its kind + data, so the queue can be saved and reloaded.
//   kinds: 'event' (a text event, data.uid), 'milestone' (data.uid), 'robotDone' (data.number), 'combo' (data.id),
//          'rankUp' (data.rank), 'researchMilestone', 'sponsorEnded', 'secret' (data.id), and plain notes (no pop-up).
import { EVENTS_BY_ID, EVENT_ICONS } from '../../data/events.js';
import { SPONSORS_BY_ID } from '../../data/sponsors.js';
import { SYNERGIES_BY_ID } from '../../data/synergies.js';
import { RANK_NOTES } from '../../data/economy.js';
import { FEATURES, RESEARCH_ART } from '../../data/research.js';
import { COMPETITION_ART } from '../../data/competitions.js';
import { TUTORIAL_HIRES } from '../../data/recruitment.js';
import { rewardText } from '../systems/Synergies.js';
import { SECRET_ART } from '../../data/secrets.js';

const MODIFIER_WORDS = {
  materialCostPct: 'Parts',
  salesUnitsPct: 'Sales',
  'progressPct.all': 'Project work',
  contractPayoutPct: 'Contract pay',
  competitionPrizePct: 'Prize cash',
};
const WHO = { one: '', team: 'Team ', all: 'Everyone: ' };
const signed = (n) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toLocaleString('en-US')}`;

// {staff}, {rival}, {sponsor}… filled from what the event rolled.
export function fillText(str, params = {}) {
  return String(str ?? '').replace(/\{(\w+)\}/g, (m, k) => (params[k] != null ? String(params[k]) : m));
}

// One effect in a few words. chance: before answering only the risk shows; afterwards what actually happened.
export function effectText(e, { resolved = false, staffName = '' } = {}) {
  switch (e.type) {
    case 'credits':
      return `${signed(e.amount)} credits`;
    case 'rep':
      return `${signed(e.amount)} Rep`;
    case 'rp':
      return `${signed(e.amount)} RP`;
    case 'morale':
      return `${e.who === 'one' ? `${staffName} ` : WHO[e.who] ?? ''}Morale ${signed(e.amount)}`.trim();
    case 'energy':
      return `${e.who === 'one' ? `${staffName} ` : WHO[e.who] ?? ''}Energy ${signed(e.amount)}`.trim();
    case 'modifier':
      return `${MODIFIER_WORDS[e.key] ?? e.key} ${e.value > 0 ? '+' : '−'}${Math.abs(e.value)}% for ${e.days} days`;
    case 'chance':
      if (!resolved) return `A gamble (${Math.round(e.p * 100)}% it goes well)`;
      return e.then.length ? e.then.map((x) => effectText(x, { resolved, staffName })).join(' · ') : 'Nothing came of it';
    case 'sponsorOffer':
      return 'Offer waiting on Finance';
    default:
      return '';
  }
}

export function effectsText(list, opts) {
  return list.map((e) => effectText(e, opts)).filter(Boolean).join(' · ');
}

export function eventTitle(def, inst) {
  return fillText(def.title, inst.params);
}

// The words for an event: its text, then what happened (or, for a choice, what the player picked).
export function eventBody(def, inst) {
  const opts = { resolved: true, staffName: inst.params.staff ?? '' };
  const text = fillText(def.text, inst.params);
  const auto = effectsText(inst.effects ?? [], opts);
  if (def.kind !== 'choice') return auto ? `${text} ${auto}.` : text;
  if (inst.status === 'open') return `${text} (waiting for your answer)`;
  const c = def.choices[inst.choice];
  const got = effectsText(inst.choices[inst.choice] ?? [], opts);
  return `${text} ${inst.auto ? 'Picked for you' : 'You chose'}: ${c?.label ?? '?'}${got ? ` — ${got}` : ''}.`;
}

export function eventIcon(def, inst) {
  if (def.art) return def.art;
  if (inst?.params?.sponsorId) {
    const s = SPONSORS_BY_ID[inst.params.sponsorId];
    return s?.art ?? s?.icon ?? EVENT_ICONS.crate;
  }
  return EVENT_ICONS[def.icon] ?? EVENT_ICONS.warning;
}

export function sponsorIcon(s) {
  return s?.art ?? s?.icon ?? EVENT_ICONS.crate;
}

export function wireMessages({ bus, campaign, ready = () => true }) {
  const notes = campaign.notes;
  const day = () => campaign.clock.totalDays;
  const post = (msg) => notes.post({ day: day(), ...msg });

  // A choice event that folds into the inbox unanswered gets its default answer (the safe one).
  notes.onFold = (entry) => {
    if (entry.kind !== 'event' && entry.kind !== 'milestone') return;
    const inst = campaign.events.instance(entry.data?.uid);
    if (inst?.status === 'open') {
      campaign.events.choose(inst.uid, null, { day: day(), auto: true });
      entry.body = eventBody(EVENTS_BY_ID[inst.id], inst);
    }
  };

  // --- events ---
  bus.on('event:fired', ({ instance: inst, def }) => {
    const title = eventTitle(def, inst);
    if (def.kind === 'milestone') {
      const guideShows = def.shownBy === 'guide';
      post({ kind: 'milestone', level: 'major', title, body: fillText(def.text, inst.params), art: def.art, data: { uid: inst.uid, id: def.id }, popup: !guideShows, toast: false });
    } else if (def.kind === 'choice') {
      post({ kind: 'event', level: 'major', title, body: eventBody(def, inst), icon: eventIcon(def, inst), data: { uid: inst.uid, id: def.id }, popup: true });
    } else {
      post({ kind: 'event', level: 'minor', title, body: eventBody(def, inst), icon: eventIcon(def, inst), data: { uid: inst.uid, id: def.id } });
    }
    campaign.save().catch(() => {}); // the event and its rolled numbers are committed
  });
  // An answered event: its inbox entry now says what was picked.
  bus.on('event:resolved', ({ instance: inst, def }) => {
    const e = notes.inbox.find((x) => x.data?.uid === inst.uid);
    if (e) e.body = eventBody(def, inst);
  });

  // --- the illustrated milestone events (§24.1) ---
  bus.on('guide:show', ({ step }) => step.id === 'S1' && campaign.fireMilestone('EV_M01'));
  bus.on('product:launch', () => campaign.fireMilestone('EV_M02'));
  bus.on('contract:offered', ({ contract }) => {
    if (campaign.flags.firstContractSeen || !ready()) return;
    campaign.flags.firstContractSeen = true;
    campaign.fireMilestone('EV_M03', { customer: contract.customer });
  });
  bus.on('competition:invite', ({ event, first }) => {
    if (!ready()) return;
    if (event.id === 'C09') {
      campaign.fireMilestone('EV_M06', { event: event.name });
      return;
    }
    if (!first) {
      post({ kind: 'note', level: 'medium', title: `New event: ${event.name}!`, body: 'It has invited your workshop — see Compete.', icon: COMPETITION_ART.icon });
      return;
    }
    const kai = campaign.recruitment.special?.staffId === TUTORIAL_HIRES.kai.staffId;
    if (!kai) bus.emit('guide:pilotReady', {}); // Kai is here already (or not coming): no hiring steps
    const note = kai ? 'Kai West, a test pilot, wants to join (cheap) — see Roster. Then tap Compete.' : 'Tap Compete in the workshop to enter.';
    campaign.fireMilestone('EV_M04', { event: event.name, note });
  });
  bus.on('trophy:awarded', ({ trophy }) => {
    if (!ready()) return;
    post({ kind: 'note', level: 'medium', title: `Trophy: ${trophy.name}!`, body: 'It is in your Trophy Case.', icon: COMPETITION_ART.trophiesIcon, toast: false });
    if (trophy.id === 'nationalCup') campaign.fireMilestone('EV_M05');
  });

  // --- the one-off moments that used to pop up on their own: now they queue ---
  bus.on('project:complete', ({ record }) => {
    const r = record.result;
    const deal = record.contract ? (record.contract.ok ? ' · contract met!' : ' · missed its contract') : '';
    post({ kind: 'robotDone', level: 'major', title: 'Robot finished!', body: `${record.name} · Review ${r.review.toFixed(1)} / 10 · Quality ${r.quality.toFixed(1)}${deal}`, icon: 'ui_icon_06_robot', data: { number: record.number }, popup: true });
    for (const f of record.newSynergies ?? []) {
      const rule = SYNERGIES_BY_ID[f.id];
      if (rule) post({ kind: 'combo', level: 'major', title: 'New combo discovered!', body: `${rule.name} — ${rewardText(rule, 0) || 'a special build'}. See the Combo Archive.`, icon: 'ui_icon_12', data: { id: f.id, firstEver: f.firstEver }, popup: true });
    }
  });
  bus.on('reputation:rankUp', ({ rank }) => {
    if (!ready()) return;
    post({ kind: 'rankUp', level: 'major', title: `Company Rank ${rank.id}!`, body: RANK_NOTES[rank.id] ?? 'Your workshop is growing.', icon: 'ui_icon_03_reputation', data: { rank: rank.id }, popup: true });
  });
  bus.on('research:milestone', ({ milestone, fired }) => {
    if (!ready() || !fired.length) return;
    const f = FEATURES[fired.at(-1).id];
    post({ kind: 'researchMilestone', level: 'major', title: `${milestone.count} research topics done!`, body: `${fired.map((a) => FEATURES[a.id]?.name ?? a.id).join(' + ')}: ${f?.note ?? ''}`, icon: RESEARCH_ART.icon, popup: true });
  });
  bus.on('research:complete', ({ node }) => ready() && post({ kind: 'note', level: 'medium', title: `${node.name} researched!`, body: 'See Research for what it opened.', icon: RESEARCH_ART.icon }));
  bus.on('contract:failed', ({ contract, reason }) => ready() && post({ kind: 'note', level: 'medium', title: `Contract failed: ${contract.title}`, body: reason === 'deadline' ? 'The deadline passed.' : 'It was cancelled.', icon: EVENT_ICONS.warning }));
  bus.on('contract:success', ({ contract }) => ready() && post({ kind: 'note', level: 'minor', title: `Contract done: ${contract.title}`, body: `${contract.customer} paid ${(contract.result?.paid ?? contract.payout).toLocaleString('en-US')} credits.`, icon: EVENT_ICONS.customer, toast: false }));
  bus.on('staff:hired', ({ staff, debug }) => ready() && !debug && post({ kind: 'note', level: 'minor', title: `${staff.name} joined the team`, body: 'Say hello in the workshop.', icon: staff.art, toast: false }));

  // --- secrets (Milestone 16): a discovery is a big moment; a new clue stage is a small rumour note ---
  bus.on('secret:unlocked', ({ rule, eased }) => {
    if (!ready()) return;
    post({ kind: 'secret', level: 'major', title: `Secret discovered: ${rule.name}`, body: `${eased ? 'Found again (an easier path this time). ' : ''}Its exact conditions are now in the Rumour Archive.`, icon: SECRET_ART.marker, data: { id: rule.id }, popup: true });
  });
  bus.on('secret:clue', ({ rule, stage, missing }) => {
    if (!ready()) return;
    const clue = rule.clueStages?.[stage - 1]?.text ?? 'A rumour…';
    post({ kind: 'note', level: 'minor', title: stage >= 2 ? 'A clue' : 'A rumour', body: stage >= 2 && missing?.length ? `${clue} (Missing: ${missing.join(', ')})` : clue, icon: SECRET_ART.marker, data: { secretId: rule.id, stage } });
  });

  // --- sponsors ---
  bus.on('sponsor:signed', ({ def, deal }) => post({ kind: 'note', level: 'medium', title: `Deal signed: ${def.name}`, body: `${def.benefitText}. Six months — ${def.obligationText.toLowerCase()} to keep it going.`, icon: sponsorIcon(def), data: { sponsorId: def.id, renewals: deal.renewals }, toast: false }));
  bus.on('sponsor:met', ({ def }) => post({ kind: 'note', level: 'medium', title: `${def.name}: deal goal met ✓`, body: 'They will offer to renew when the deal ends.', icon: sponsorIcon(def) }));
  bus.on('sponsor:broken', ({ def }) => post({ kind: 'note', level: 'medium', title: `${def.name}: deal goal missed`, body: 'The benefit keeps going until the deal ends — no penalty.', icon: EVENT_ICONS.warning }));
  bus.on('sponsor:ended', ({ def, record, renewal }) => {
    const met = record.result === 'met';
    post({
      kind: 'sponsorEnded',
      level: 'medium',
      title: `${def.name} deal ended`,
      body: met ? `Goal met — they offer to renew for six more months. See Finance.` : `The goal was not met, so the benefit ends here. No debt, no penalty.`,
      icon: sponsorIcon(def),
      data: { sponsorId: def.id, result: record.result, renewal: !!renewal },
      popup: true,
    });
  });
}
