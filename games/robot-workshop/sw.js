// Robot Workshop â€” service worker (offline cache for the installed web app).
//
// NETWORK FIRST: when the phone is online it always fetches the newest files
// (so a new build shows up on the next open) and keeps a copy; when offline
// it plays from that copy.
//
// VERSION is stamped automatically by publish.ps1 on every publish. A new
// version makes the phone install this worker fresh and throw away old copies.
//
// This game imports the shared series engine from ../../core/, which sits
// outside this folder. Requests from the game page still pass through this
// worker, so the engine files are cached too.
const VERSION = '20260925-225203';
const CACHE = 'robot-workshop-' + VERSION;

// The page itself + manifest + icons, so the app opens offline straight away.
const CORE = ['./', './index.html', './manifest.webmanifest', './styles/app.css',
  './assets/branding/pwa/icon-192.png', './assets/branding/pwa/icon-512.png'];
// Every code file (game + shared engine) â€” filled in by publish.ps1 so the whole
// game's code is saved on the very first visit. Art is cached the first time the
// game loads it. (Empty when run locally.)
const PRECACHE = ['./src/app/Campaign.js', './src/app/validateData.js', './src/screens/BuildScreen.js', './src/screens/ClosureScreen.js', './src/screens/CompetitionListScreen.js', './src/screens/CompetitionResultScreen.js', './src/screens/CompetitionSetupScreen.js', './src/screens/CompetitionWatchScreen.js', './src/screens/ComponentsScreen.js', './src/screens/ContractsScreen.js', './src/screens/DebugBuilderScreen.js', './src/screens/FinanceScreen.js', './src/screens/HelpScreen.js', './src/screens/ProductCatalogueScreen.js', './src/screens/ProjectDetailScreen.js', './src/screens/ProjectResultScreen.js', './src/screens/RecruitmentScreen.js', './src/screens/ResearchScreen.js', './src/screens/RobotBuilderScreen.js', './src/screens/StaffDebugScreen.js', './src/screens/StaffDetailScreen.js', './src/screens/StaffRosterScreen.js', './src/screens/TrainingScreen.js', './src/screens/WorkshopScreen.js', './src/systems/Candidates.js', './src/systems/Capability.js', './src/systems/CompetitionRules.js', './src/systems/ContractRules.js', './src/systems/RobotBuildSystem.js', './src/systems/robotVisual.js', './src/systems/Sales.js', './src/systems/signatureHooks.js', './src/systems/unlockRules.js', './src/ui/competitionDraw.js', './src/ui/guideTargets.js', './src/ui/TopBar.js', './src/ui/widgets.js', './src/main.js', './data/balance.js', './data/competitions.js', './data/components.js', './data/contracts.js', './data/economy.js', './data/facilities.js', './data/feedback.js', './data/guide.js', './data/market.js', './data/phases.js', './data/purposes.js', './data/recruitment.js', './data/research.js', './data/reviews.js', './data/segments.js', './data/staff.js', './data/stats.js', './data/training.js', './data/traits.js', './data/tuning.js', './data/unlocks.js', './data/visuals.js', './data/workshop.js', './styles/app.css', '../../core/ui/Button.js', '../../core/ui/CoachMark.js', '../../core/ui/ContextCard.js', '../../core/ui/ScrollList.js', '../../core/ui/ScrollPanel.js', '../../core/ui/StaffCard.js', '../../core/Agent.js', '../../core/AssetManager.js', '../../core/AssignmentSystem.js', '../../core/AudioManager.js', '../../core/CachedLayer.js', '../../core/Camera.js', '../../core/CareerRecords.js', '../../core/CharacterMotion.js', '../../core/Clock.js', '../../core/CompanyRank.js', '../../core/CompetitionSystem.js', '../../core/ContractSystem.js', '../../core/DataValidator.js', '../../core/DebugOverlay.js', '../../core/EconomySystem.js', '../../core/EventBus.js', '../../core/FacilitySystem.js', '../../core/FixedStepLoop.js', '../../core/Grid.js', '../../core/GuideSystem.js', '../../core/Input.js', '../../core/IsoProjection.js', '../../core/JobHistory.js', '../../core/MajorFeedback.js', '../../core/MarketSystem.js', '../../core/Pathing.js', '../../core/ProductSystem.js', '../../core/ProjectSystem.js', '../../core/RecruitmentSystem.js', '../../core/Renderer.js', '../../core/ReputationSystem.js', '../../core/ResearchSystem.js', '../../core/ReviewText.js', '../../core/Rng.js', '../../core/SaveManager.js', '../../core/ScreenRouter.js', '../../core/Selection.js', '../../core/SpriteCache.js', '../../core/StaffModel.js', '../../core/StaffSystem.js', '../../core/StorageAdapter.js', '../../core/StoreStub.js', '../../core/TrainingSystem.js', '../../core/UiLayout.js', '../../core/UnlockActions.js', '../../core/VfxSystem.js'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      // One file failing must not block the rest.
      .then((c) => Promise.allSettled(CORE.concat(PRECACHE).map((u) =>
        c.add(new Request(u, { cache: 'reload' })))))
      .catch(() => { /* offline during install: runtime caching will fill in */ })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('robot-workshop-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(req, { cache: 'no-cache' })
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true })
        .then((hit) => hit || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error())))
  );
});
