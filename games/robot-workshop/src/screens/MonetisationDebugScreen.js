// Test store controls (Milestone 23, ?debug=1 only): the pretend provider (core/FakeStoreProvider) made to do each
// thing a real ad network or store can — the next ad or purchase succeeds, is cancelled, fails or finds no
// connection; everything offline; the VIP offline grace run out; the store says VIP ended; the last purchase
// delivered again (it must add nothing); every purchase wiped. Also shows the entitlements, why an interstitial
// could or couldn't show right now, and the pretend store's log.
//   createMonetisationDebugScreen({ renderer, layout, assets, router, campaign, provider, interstitialContext })
import { THEME } from '../../../../core/Theme.js';
import { createBlockScreen } from '../ui/blockScreen.js';
import { MONETISATION_ART as ART, INTERSTITIAL_CAPS } from '../../data/monetisation.js';
const C = THEME.color;
const OUT = [
  { id: 'succeed', label: 'Succeed', accent: C.good },
  { id: 'cancel', label: 'Cancel', accent: C.gold },
  { id: 'fail', label: 'Fail', accent: C.bad },
  { id: 'offline', label: 'Offline', accent: C.progress },
];

export function createMonetisationDebugScreen({ renderer, layout, assets, router, campaign, provider, interstitialContext = () => ({}) }) {
  const M = campaign.monetisation;
  const E = M.entitlements;
  const saved = () => campaign.hasRun ? campaign.save().catch(() => {}) : campaign.saveAccount().catch(() => {});

  const screen = createBlockScreen({
    renderer,
    layout,
    assets,
    router,
    title: 'Test store',
    icon: ART.ad,
    defaultBack: 'store',
    build(b) {
      b.para('Debug only. Nothing here is real: no money, no real ads.', { color: C.purple, bold: true });
      for (const kind of ['ad', 'purchase']) {
        b.heading(`Next ${kind}: ${provider.next[kind]}`);
        for (const o of OUT) b.button(`${kind}:${o.id}`, { label: `Next ${kind}: ${o.label}`, icon: kind === 'ad' ? ART.ad : ART.store, accent: provider.next[kind] === o.id ? C.outline : o.accent }, () => provider.setNext(kind, o.id), 120);
      }
      b.heading('Store and VIP');
      b.button('offline', { label: provider.offline ? 'Go back online' : 'Go offline (everything)', sub: provider.offline ? 'Ads and the store are unreachable now' : 'Ads and the store stop answering', icon: ART.warning, accent: provider.offline ? C.bad : C.progress }, () => (provider.offline = !provider.offline), 140);
      b.button('grace', { label: 'Run out VIP grace', sub: 'As if the last store check was 73 hours ago', icon: ART.vip, accent: C.gold, disabled: !E.vip.active }, () => {
        E.expireGrace(M.now());
        campaign.applyPerks();
        saved();
        screen.say('VIP grace has run out — the extras are paused.', C.gold);
      }, 140);
      b.button('endSub', { label: 'Store: VIP has ended', sub: 'The next store check turns VIP off', icon: ART.vip, accent: C.gold }, () => {
        provider.endSubscription();
        screen.say('The pretend store now says VIP ended.', C.gold);
      }, 140);
      b.button('recheck', { label: 'Recheck with the store now', sub: 'What happens when the app gets back online', icon: ART.restore, accent: C.progress }, async () => {
        const r = await M.commerce.recheck();
        saved();
        screen.say(r.ok ? 'Rechecked.' : `Recheck: ${r.status}`, r.ok ? C.good : C.gold);
      }, 140);
      b.button('replay', { label: 'Replay the last purchase', sub: 'The store delivers it again — it must add nothing', icon: ART.chipsPile, accent: C.purple }, async () => {
        const tx = provider.replayLast();
        if (!tx) return screen.say('No purchase yet.', C.gold);
        const r = await M.commerce.processPending();
        screen.say(`Replayed ${tx.productKey}: ${r.delivered} granted, ${r.duplicates} already added.`, r.delivered ? C.bad : C.good);
      }, 140);
      b.button('reset', { label: 'Reset purchases', sub: 'The pretend store and this account forget every purchase', icon: ART.warning, accent: C.bad }, () => {
        provider.resetPurchases();
        const processed = E.serializeProcessed();
        E.reset();
        E.loadProcessed(processed); // processed ids stay: a replayed old purchase still adds nothing
        campaign.applyPerks();
        saved();
        screen.say('Purchases reset.', C.gold);
      }, 140);
      b.button('quiet', { label: 'Skip the first-10-minutes quiet time', sub: 'So interstitial caps can be tried now', icon: ART.ad, accent: C.progress }, () => {
        M.ads.account.firstSeenAt = M.now() - (INTERSTITIAL_CAPS.firstInstallQuietMin + 1) * 60000;
        saved();
      }, 140);
      b.heading('Now');
      const t = M.now();
      b.para(`Remove Ads: ${E.removeAds ? 'owned' : 'no'} · VIP: ${M.vip ? 'active' : E.vip.active ? 'paused (grace ran out)' : 'no'} · ad-free: ${M.adFree ? 'yes' : 'no'}`, { color: C.text });
      b.para(`Processed purchases: ${E.processed.length} · Tech Chips held for the next run: ${M.heldTechChips}`);
      const why = M.interstitialBlock('competitionResult', interstitialContext());
      b.para(`Interstitial after a result right now: ${why ? `no — ${why}` : 'yes'}`);
      b.para(`Interstitials in the last hour: ${M.ads.account.shown.filter((x) => t - x < 3600000).length} of ${INTERSTITIAL_CAPS.maxPerHour}`);
      b.heading('Log');
      const log = provider.log.slice(-8).reverse();
      if (!log.length) b.para('Nothing yet.');
      for (const l of log) b.para(`${new Date(l.at).toLocaleTimeString('en-GB')} — ${l.text}`, { size: THEME.size.small });
    },
  });
  return screen;
}
