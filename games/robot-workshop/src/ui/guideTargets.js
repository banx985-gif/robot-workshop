// Where each guide target is on screen right now (screen units), or null if it is not showing.
// Names are used by data/guide.js. Rects are read live every frame, so they follow scrolling,
// camera moves and every screen shape.
// Milestone 17b: the workshop is the home screen. Steps that open a menu point at the bottom-bar button (or the
// station) while the sheet is closed, then at the matching button in the sheet once it is open.
export function createGuideTargets({ router, campaign, sheet = null }) {
  const cur = () => router.current;
  const on = (name) => router.currentName === name;
  const topBtn = (id) => cur()?.topBar?.buttons().find((b) => b.id === id)?.rect ?? null;
  // A bottom-bar menu, then one of its buttons.
  function via(kind, buttonId) {
    if (!on('workshop')) return null;
    if (sheet?.active) {
      sheet.scrollTo(buttonId);
      return sheet.buttonRect(buttonId);
    }
    return cur().bottomBar.buttonRect(kind);
  }
  // A station in the room (brought into view first), for steps about the room itself.
  function stationRect(defId) {
    if (!on('workshop') || sheet?.active) return null;
    return cur().stationScreenRect(defId) ?? (cur().focusStation(defId) ? cur().stationScreenRect(defId) : null);
  }

  // A rect inside a scroll panel → screen rect, only if it is fully in view.
  function inPanel(screen, r) {
    const body = screen.scroll.getRect();
    const y = body.y + r.y - screen.scroll.scrollY;
    if (y < body.y - 1 || y + r.h > body.y + body.h + 1) return null;
    return { x: body.x + r.x, y, w: r.w, h: r.h };
  }

  const renderW = () => 1080;
  const targets = {
    mina: () => {
      if (!on('workshop') || sheet?.active) return null;
      const a = cur().agentFor('ENG01') ?? cur().agents[0];
      if (!a) return null;
      const r = cur().screenRectOf(a);
      const t = cur().topBar.rect();
      const b = cur().bottomBar.rect();
      if (r.y < t.y + t.h + 20 || r.y + r.h > b.y - 20 || r.x < 0 || r.x + r.w > renderW()) cur().focusOn(a); // bring all of Mina into view
      return cur().screenRectOf(a);
    },
    staffCard: () => (on('workshop') && sheet?.active ? sheet.rect() : null),
    topBar: () => (on('workshop') ? cur().topBar.rect() : null),
    projectButton: () => via('build', campaign.activeProject ? 'project' : 'newRobot'),
    builderPart: () => (on('builder') ? inPanel(cur(), cur().tileRect(0)) : null),
    balanced: () => (on('builder') ? inPanel(cur(), cur().focusRect(1)) : null),
    startButton: () => (on('builder') ? cur().startRect() : null),
    progress: () => {
      if (!campaign.activeProject) return null;
      if (on('workshop')) return stationRect('F05') ?? stationRect('F01');
      if (on('project')) return inPanel(cur(), cur().phaseRect());
      return null;
    },
    // Launch: on the result screen the Launch button; on Products the first "Launch…" row; else the Products button.
    launch: () => {
      if (on('result')) {
        const rec = cur().record;
        if (!rec || rec.launchedProductId || rec.deliveredContractId || !campaign.products.freeSlots) return null;
        return inPanel(cur(), cur().launchRect());
      }
      if (on('products')) {
        const waiting = campaign.history.records.some((r) => !r.launchedProductId && !r.deliveredContractId);
        return waiting ? inPanel(cur(), cur().rowButtonRect(0)) : null;
      }
      return via('money', 'products');
    },
    resultDone: () => (on('result') ? cur().doneRect() : null),
    productsButton: () => via('money', 'products'),
    contractsButton: () => via('money', 'contracts'),
    helpButton: () => cur()?.topBar?.helpRect?.() ?? null,
    // Building (Milestone 8)
    buildButton: () => via('build', 'build'),
    engineeringDeskCard: () => (on('build') && !cur().confirm ? cur().cardRectOf('F02') : null),
    placeButton: () => (on('build') && cur().mode === 'place' && !cur().confirm ? cur().actionRect(2) : null),
    expansionsTab: () => (on('build') && cur().mode === 'catalogue' && !cur().confirm ? cur().tabRect(1) : null),
    buyExpansion1: () => (on('build') && !cur().confirm ? cur().buyRectOf('X1') : null),
    // Research (Milestone 9)
    researchDeskCard: () => (on('build') && !cur().confirm ? cur().cardRectOf('F11') : null),
    researchButton: () => via('research', 'research'),
    researchPick: () => (on('research') ? cur().pickTargetRect('MO-R1') : null), // the guide suggests Mobility 1 (opens Delivery)
    researchStart: () => (on('research') ? cur().startButtonRect() : null),
    // Hiring and training (Milestone 10)
    rosterButton: () => via('staff', 'roster'),
    hireButton: () => (on('roster') ? cur().headerButton(0) : null),
    tessaHire: () => {
      if (!on('recruit')) return null;
      const c = campaign.recruitment.cards.find((x) => x.staffId === 'DES01');
      return c ? cur().hireRectOf(c.id) : null;
    },
    trainingButton: () => (on('roster') ? cur().headerButton(1) : null),
    coursePick: () => (on('training') ? cur().pickTargetRect('codeCamp') : null),
    trainingStart: () => (on('training') ? cur().startButtonRect() : null),
    // Competitions (Milestone 12)
    kaiHire: () => {
      if (!on('recruit')) return null;
      const c = campaign.recruitment.cards.find((x) => x.staffId === 'PIL01');
      return c ? cur().hireRectOf(c.id) : null;
    },
    competeButton: () => via('compete', 'competitions'),
    compEnterC01: () => (on('competitions') ? cur().enterRectOf('C01') : null),
    compBalanced: () => (on('compSetup') ? cur().strategyRect(1) : null),
    compEnterButton: () => (on('compSetup') ? cur().enterRect() : null),
    compResultDone: () => (on('compResult') ? cur().doneRect() : null),
    // Combos (Milestone 14)
    comboPanel: () => (on('builder') ? inPanel(cur(), cur().comboRect()) : null),
    // Sponsors (Milestone 15)
    moneyBar: () => (on('workshop') && !sheet?.active ? cur().topBar.moneyRect() : null),
    sponsorOffer: () => {
      if (!on('finance')) return null;
      const r = cur().sponsorOfferRect();
      return r ? inPanel(cur(), r) : null;
    },
  };

  return (name) => {
    try {
      return targets[name]?.() ?? null;
    } catch {
      return null; // a screen that is not fully set up yet
    }
  };
}
