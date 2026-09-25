// Where each guide target is on screen right now (screen units), or null if it is not showing.
// Names are used by data/guide.js. Rects are read live every frame, so they follow scrolling,
// camera moves and every screen shape.
export function createGuideTargets({ router, campaign }) {
  const cur = () => router.current;
  const on = (name) => router.currentName === name;
  const topBtn = (id) => cur()?.topBar?.buttons().find((b) => b.id === id)?.rect ?? null;

  // A rect inside a scroll panel → screen rect, only if it is fully in view.
  function inPanel(screen, r) {
    const body = screen.scroll.getRect();
    const y = body.y + r.y - screen.scroll.scrollY;
    if (y < body.y - 1 || y + r.h > body.y + body.h + 1) return null;
    return { x: body.x + r.x, y, w: r.w, h: r.h };
  }

  const targets = {
    mina: () => {
      if (!on('workshop')) return null;
      const a = cur().agentFor('ENG01') ?? cur().agents[0];
      return a ? cur().screenRectOf(a) : null;
    },
    staffCard: () => (on('workshop') && cur().card.isOpen ? cur().card.rect() : null),
    topBar: () => (on('workshop') ? cur().topBar.rect() : null),
    projectButton: () => (on('workshop') ? topBtn('project') : null),
    builderPart: () => (on('builder') ? inPanel(cur(), cur().tileRect(0)) : null),
    balanced: () => (on('builder') ? inPanel(cur(), cur().focusRect(1)) : null),
    startButton: () => (on('builder') ? cur().startRect() : null),
    progress: () => {
      if (!campaign.activeProject) return null;
      if (on('workshop')) return cur().stripRect();
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
      return cur()?.topBar?.productsRect?.() ?? null;
    },
    resultDone: () => (on('result') ? cur().doneRect() : null),
    productsButton: () => cur()?.topBar?.productsRect?.() ?? null,
    contractsButton: () => cur()?.topBar?.contractsRect?.() ?? null,
    helpButton: () => cur()?.topBar?.helpRect?.() ?? null,
    // Building (Milestone 8)
    buildButton: () => (on('workshop') && !cur().card.isOpen ? cur().buildButtonRect() : null),
    engineeringDeskCard: () => (on('build') && !cur().confirm ? cur().cardRectOf('F02') : null),
    placeButton: () => (on('build') && cur().mode === 'place' && !cur().confirm ? cur().actionRect(2) : null),
    expansionsTab: () => (on('build') && cur().mode === 'catalogue' && !cur().confirm ? cur().tabRect(1) : null),
    buyExpansion1: () => (on('build') && !cur().confirm ? cur().buyRectOf('X1') : null),
    // Research (Milestone 9)
    researchDeskCard: () => (on('build') && !cur().confirm ? cur().cardRectOf('F11') : null),
    researchButton: () => (on('workshop') && !cur().card.isOpen ? cur().researchButtonRect() : null),
    researchPick: () => (on('research') ? cur().pickTargetRect('MO-R1') : null), // the guide suggests Mobility 1 (opens Delivery)
    researchStart: () => (on('research') ? cur().startButtonRect() : null),
    // Hiring and training (Milestone 10)
    rosterButton: () => (on('workshop') && !cur().card.isOpen ? topBtn('roster') : null),
    hireButton: () => (on('roster') ? cur().headerButton(0) : null),
    tessaHire: () => {
      if (!on('recruit')) return null;
      const c = campaign.recruitment.cards.find((x) => x.staffId === 'DES01');
      return c ? cur().hireRectOf(c.id) : null;
    },
    trainingButton: () => (on('roster') ? cur().headerButton(1) : null),
    coursePick: () => (on('training') ? cur().pickTargetRect('codeCamp') : null),
    trainingStart: () => (on('training') ? cur().startButtonRect() : null),
  };

  return (name) => {
    try {
      return targets[name]?.() ?? null;
    } catch {
      return null; // a screen that is not fully set up yet
    }
  };
}
