// VIP (Milestone 23, bible §32.4–32.5): what it gives and what it never gives, whether it is active, when it was
// last checked with the store and how much offline time is left before the extras pause (72 hours). While VIP is
// active there is a daily "Claim 5 Tech Chips". When the grace runs out the game plays exactly as normal; only the
// extras pause until the store can be checked again.
//   createVipScreen({ renderer, layout, assets, router, campaign, dialog })
import { THEME } from '../../../../core/Theme.js';
import { createBlockScreen } from '../ui/blockScreen.js';
import { PRODUCTS, VIP, VIP_TEXT, MONETISATION_ART as ART } from '../../data/monetisation.js';
const C = THEME.color;
const HOUR = 3600 * 1000;

function when(t) {
  if (t == null) return 'never';
  const d = new Date(t);
  return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
}
function hoursLeft(ms) {
  if (ms <= 0) return 'none';
  const h = Math.floor(ms / HOUR);
  const m = Math.floor((ms % HOUR) / 60000);
  return h ? `${h} h ${m} min` : `${m} min`;
}

export function createVipScreen({ renderer, layout, assets, router, campaign, dialog }) {
  const M = campaign.monetisation;
  const E = M.entitlements;
  const key = PRODUCTS.robot_workshop_vip.key;
  let working = false;

  async function check() {
    if (working) return;
    working = true;
    const r = await M.commerce.recheck();
    await M.commerce.loadProducts();
    working = false;
    screen.say(r.ok ? 'Checked with the store.' : M.commerce.msg(r.status), r.ok ? C.good : C.gold);
  }

  async function subscribe() {
    if (working) return;
    working = true;
    const r = await M.commerce.buy(key);
    working = false;
    dialog.show({ title: r.ok ? 'VIP' : 'No purchase made', body: r.ok && r.granted ? `${r.message} VIP is active.` : r.message, art: r.ok ? ART.vip : ART.warning, buttons: [{ id: 'ok', label: 'OK', accent: C.progress }] });
  }

  function claim() {
    const r = M.claimDaily();
    screen.say(r.ok ? `+${r.amount} Tech Chips` : r.reason, r.ok ? C.good : C.gold);
  }

  const screen = createBlockScreen({
    renderer,
    layout,
    assets,
    router,
    title: VIP_TEXT.title,
    icon: ART.vip,
    onEnter: () => {
      M.commerce.loadProducts();
    },
    build(b) {
      const now = M.now();
      const active = M.vip;
      const lapsed = !active && E.vipKnown && E.graceLeftMs(now) <= 0;
      const lines = [
        { text: `${VIP_TEXT.lastChecked}: ${when(E.vip.lastValidatedAt)}` },
        { text: `${VIP_TEXT.graceLeft}: ${active ? hoursLeft(E.graceLeftMs(now)) : 'none'} (of ${VIP.graceHours} h)` },
      ];
      if (lapsed) lines.push({ text: VIP_TEXT.graceOut, color: C.gold });
      b.row({ art: ART.vip, title: active ? VIP_TEXT.active : VIP_TEXT.inactive, lines, state: active ? 'gold' : 'normal', right: active ? '★ VIP' : null, rightColor: C.gold });
      if (active) {
        const block = M.claimBlock();
        b.button('claim', { label: block === 'Already claimed today' ? VIP_TEXT.claimed : VIP_TEXT.claim, sub: block ?? 'Once a day while VIP is active', icon: ART.chipsSmall, accent: C.good, disabled: !!block }, claim);
      } else {
        const price = M.commerce.price(key);
        b.button('subscribe', { label: working ? 'Working…' : VIP_TEXT.subscribe, sub: price ?? 'Price from the store', icon: ART.vip, accent: C.purple, disabled: working || !price }, subscribe);
      }
      b.button('check', { label: working ? 'Checking…' : VIP_TEXT.check, sub: 'Recheck your VIP and purchases with the store', icon: ART.restore, accent: C.progress, disabled: working }, check);
      b.heading(VIP_TEXT.gives);
      for (const g of VIP.gives) b.para(`✓ ${g}`, { color: C.text });
      b.heading(VIP_TEXT.doesNotGive);
      for (const g of VIP.doesNotGive) b.para(`✗ ${g}`);
      b.para('VIP is optional: every part of BOTWORKS can be reached without it.');
    },
  });
  screen.claim = claim;
  screen.check = check;
  screen.subscribe = subscribe;
  return screen;
}
