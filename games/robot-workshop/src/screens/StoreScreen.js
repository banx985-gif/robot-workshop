// Store (Milestone 23, bible §32.2–32.3, §6.3 — replaces M21's "Coming soon"): Remove Ads, the three Tech Chip packs,
// Restore Purchases and a link to VIP. Prices always come from the store (core/CommerceService); with no store (a
// normal web build for now) the screen says so and nothing can be bought. No loot boxes: a pack is always exactly
// its amount. Everything here is optional.
//   createStoreScreen({ renderer, layout, assets, router, campaign, dialog, debugEnabled })
import { THEME } from '../../../../core/Theme.js';
import { createBlockScreen } from '../ui/blockScreen.js';
import { PRODUCTS, CHIP_PACKS, MONETISATION_ART as ART, STORE_TEXT } from '../../data/monetisation.js';
const C = THEME.color;

export function createStoreScreen({ renderer, layout, assets, router, campaign, dialog, debugEnabled = false }) {
  const M = campaign.monetisation;
  let st = { loading: false, ok: false, message: null };
  let working = null; // the product being bought / 'restore'

  async function load() {
    st = { loading: true, ok: false, message: null };
    const r = await M.commerce.loadProducts();
    st = { loading: false, ok: r.ok, message: r.message };
  }

  async function buy(key) {
    if (working) return;
    working = key;
    const p = PRODUCTS[key];
    const r = await M.commerce.buy(key);
    working = null;
    let body = r.message;
    if (r.ok && r.granted && p.grant) body = `${r.message} +${p.grant.amount} Tech Chips${campaign.hasRun ? ` (you now have ${campaign.economy.balance('techChips')})` : ` — ${STORE_TEXT.noRun}`}`;
    else if (r.ok && r.granted && p.entitlement === 'removeAds') body = `${r.message} No more automatic ads.`;
    else if (r.ok && r.granted && p.entitlement === 'vip') body = `${r.message} VIP is active.`;
    dialog.show({ title: r.ok ? (r.granted ? 'Purchase complete' : 'Already added') : 'No purchase made', body, art: r.ok ? p.icon : ART.warning, buttons: [{ id: 'ok', label: 'OK', accent: C.progress }] });
  }

  async function restore() {
    if (working) return;
    working = 'restore';
    const r = await M.commerce.restore();
    working = null;
    dialog.show({ title: r.ok ? STORE_TEXT.restore : 'Could not restore', body: r.message, art: r.ok ? ART.restore : ART.warning, buttons: [{ id: 'ok', label: 'OK', accent: C.progress }] });
  }

  const priceLine = (key) => M.commerce.price(key) ?? (st.loading ? '…' : STORE_TEXT.noPrice);

  const screen = createBlockScreen({
    renderer,
    layout,
    assets,
    router,
    title: STORE_TEXT.title,
    icon: ART.store,
    onEnter: () => {
      load();
    },
    build(b) {
      b.para(STORE_TEXT.intro, { color: C.text });
      if (M.providerId === 'debug') b.para(STORE_TEXT.pretend, { color: C.purple, bold: true });
      if (st.loading) b.para(STORE_TEXT.loading);
      else if (!st.ok) b.row({ art: ART.warning, title: 'Store not available', lines: [st.message ?? ''], state: 'bad' }, { key: 'retry', label: 'Try again', accent: C.progress, onTap: load });
      // Remove Ads
      const ra = PRODUCTS.robot_workshop_remove_ads;
      const owned = M.removeAds;
      b.row(
        { art: ra.icon, title: ra.name, lines: [ra.blurb], right: owned ? 'Owned' : priceLine(ra.key), rightColor: owned ? C.good : C.progress, state: owned ? 'good' : 'normal' },
        { key: `buy:${ra.key}`, label: owned ? STORE_TEXT.owned : working === ra.key ? 'Buying…' : STORE_TEXT.buy, accent: C.action, disabled: owned || !st.ok || !!working, onTap: () => buy(ra.key) },
      );
      // Tech Chips
      b.heading('Tech Chips');
      b.para(STORE_TEXT.noLootBoxes);
      for (const key of CHIP_PACKS) {
        const p = PRODUCTS[key];
        b.row({ art: p.icon, title: p.name, lines: [p.blurb], right: priceLine(key) }, { key: `buy:${key}`, label: working === key ? 'Buying…' : STORE_TEXT.buy, accent: C.action, disabled: !st.ok || !!working, onTap: () => buy(key) });
      }
      b.para(campaign.hasRun ? STORE_TEXT.chipsKept : STORE_TEXT.noRun);
      b.gap(6);
      b.button('restore', { label: working === 'restore' ? 'Restoring…' : STORE_TEXT.restore, sub: STORE_TEXT.restoreSub, icon: ART.restore, accent: C.progress, disabled: !!working }, restore);
      b.button('vip', { label: STORE_TEXT.vipLink, sub: M.vip ? 'Active — see what it gives' : STORE_TEXT.vipLinkSub, icon: ART.vip, accent: C.purple }, () => router.go('vip', { back: 'store' }));
      if (debugEnabled) b.button('debug', { label: 'Test store controls', sub: 'Debug: next ad / purchase outcome, VIP grace…', icon: ART.ad, accent: C.gold }, () => router.go('monetisationDebug', { back: 'store' }));
    },
  });
  screen.load = load;
  screen.buy = buy;
  screen.restore = restore;
  return screen;
}
