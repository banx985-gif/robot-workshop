// The home's two bars (Milestone 5, style guide §2, bible §4) — the shared core/ui TopBar and BottomBar with CAREWORKS
// content. Plain data only; src/main.js wires them.
//
// Bottom bar: five slots in the series order (make the product · people · research · compete · money). opens = which
// sheet the slot opens (bottomRoute below): 'residents' (the resident list, Arthur for now), 'roster' (the team), or
// 'placeholder' with the words saying what will live there.
export const BOTTOM_SLOTS = [
  { id: 'care', label: 'Care', icon: 'care_ui_01', opens: 'residents' },
  { id: 'staff', label: 'Staff', icon: 'care_ui_02', opens: 'roster' },
  {
    id: 'develop', label: 'Develop', icon: 'care_ui_03', opens: 'placeholder',
    title: 'Develop', text: 'Build Mode, the home’s stage, research (Milestone 21) and the specialist programs; more will live here as the home grows.',
  },
  {
    id: 'quality', label: 'Quality', icon: 'care_ui_04', opens: 'placeholder',
    title: 'Quality', text: 'The five headline scores, Rank, accreditation, the peer-home benchmark and inspections (Milestone 26: src/main.js openQuality), with compliments & complaints, and Records: the Memory Book (Milestone 27). More of your account records will live here too.',
  },
  {
    id: 'business', label: 'Business', icon: 'care_ui_05', opens: 'placeholder',
    title: 'Business', text: 'Funding, community partners, the ledger and saving will live here.',
  },
];

// Where a bottom-bar slot goes: { sheet, slot } (null for an unknown id).
export function bottomRoute(id) {
  const s = BOTTOM_SLOTS.find((x) => x.id === id);
  return s ? { sheet: s.opens, slot: s } : null;
}

// Top bar: the stats chip's icons (numbers only until the economy, Milestone 22). Rank (Milestone 26) shows "—" only with no home open.
export const TOP_ICONS = { credits: 'care_reward_01', careTokens: 'care_reward_02' };
export const RANK_NONE = '—';

// Icons inside the Care sheet: the (placeholder) Admissions row, and the call bell (UI icon only — the bell in the
// home stays code-drawn).
export const CARE_ICONS = { admissions: 'care_ui_06', bell: 'care_ui_09' };

// The top bar's placeholder sheets, and why 2× / 4× are locked.
export const TOP_SHEETS = {
  inbox: { title: 'Inbox', text: 'Letters from families, partners and inspectors will arrive here.' },
  help: { title: 'Help', text: 'Guides to running the home will live here. For now: tap a person or a room to open their card; drag to look round; pinch to zoom.' },
};
export const SPEED_LOCKED = 'Faster speeds unlock later, once the home has more to run.';

// List rows show a head-and-shoulders crop of the full-body art (fractions of the picture), so faces read on a phone.
export const PORTRAIT_CROP = { x: 0.28, y: 0.04, w: 0.44, h: 0.44 };
