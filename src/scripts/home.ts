import gsap from 'gsap';
import type { SceneController, SceneDriver } from './scene';

const home = document.querySelector<HTMLElement>('.home-page');
const viewport = document.querySelector<HTMLElement>('#scene-viewport');
const slot = document.querySelector<HTMLElement>(
  '[data-home-scene="capability"]'
);
const capabilities = [
  ...document.querySelectorAll<HTMLDetailsElement>('[data-home-capability]'),
];
const motion = document.querySelector<HTMLButtonElement>('#motion-toggle');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

if (home && viewport && slot && capabilities.length) {
  const label = document.querySelector<HTMLElement>('#scene-label');
  const note = document.querySelector<HTMLElement>('#scene-sub');
  let visible = false;
  const driver: SceneDriver = {
    weights: [0, 1, 0, 0, 0, 0],
    chapter: 1,
    paused: reduced.matches,
  };
  let selected =
    capabilities.find((capability) => capability.open) ?? capabilities[0]!;
  let controller: SceneController | undefined;
  let loading = false;
  let disposed = false;
  let morph: gsap.core.Tween | undefined;

  function selectStage(stage: number, immediate = false) {
    if (driver.chapter === stage && !immediate) return;
    morph?.kill();
    driver.chapter = stage;
    viewport!.dataset.stage = String(stage);
    const capability = capabilities.find(
      (entry) => Number(entry.dataset.stage) === stage
    );
    viewport!.setAttribute(
      'aria-label',
      `A visual explanation of ${capability?.dataset.name ?? 'an AI capability'}`
    );
    if (label) label.textContent = capability?.dataset.caption ?? '';
    if (note) note.textContent = capability?.dataset.note ?? '';
    const weights = Array.from({ length: 6 }, (_, index) =>
      index === stage ? 1 : 0
    );
    if (immediate || driver.paused) {
      driver.weights.splice(0, 6, ...weights);
      controller?.invalidate();
    } else {
      morph = gsap.to(driver.weights, {
        ...Object.fromEntries(weights.map((weight, index) => [index, weight])),
        duration: 0.65,
        ease: 'power2.inOut',
        overwrite: true,
        onUpdate: () => controller?.invalidate(),
      });
    }
  }

  function loadScene() {
    if (loading || disposed) return;
    loading = true;
    import('./scene')
      .then(({ createScene }) => {
        if (!disposed) controller = createScene(driver);
      })
      .catch(() => {
        // The native disclosures and their SVG artwork work without WebGL.
      });
  }

  function openCapability(capability: HTMLDetailsElement) {
    selected = capability;
    for (const entry of capabilities) entry.open = entry === capability;
    selectStage(Number(capability.dataset.stage), !visible);
  }
  for (const capability of capabilities) {
    capability.addEventListener('toggle', () => {
      if (capability.open) openCapability(capability);
    });
  }
  function openHash() {
    const capability = capabilities.find(
      (entry) => `#${entry.id}` === window.location.hash
    );
    if (capability) openCapability(capability);
  }
  home.addEventListener('click', (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    const anchor = (event.target as Element).closest<HTMLAnchorElement>(
      'a[href^="#"]'
    );
    const capability = capabilities.find(
      (entry) => `#${entry.id}` === anchor?.getAttribute('href')
    );
    if (capability) openCapability(capability);
    // Native links own scrolling and browser history; reading is never snapped.
  });
  window.addEventListener('hashchange', openHash);

  function setMotion(paused: boolean) {
    driver.paused = paused;
    document.documentElement.classList.toggle('motion-paused', paused);
    motion?.setAttribute('aria-pressed', String(paused));
    motion?.setAttribute(
      'aria-label',
      paused ? 'Play animation' : 'Pause animation'
    );
    const text = motion?.querySelector('span');
    if (text) text.textContent = paused ? 'Play motion' : 'Pause motion';
    home!.querySelectorAll<SVGSVGElement>('svg').forEach((svg) => {
      try {
        if (paused) svg.pauseAnimations();
        else svg.unpauseAnimations();
      } catch {
        /* Static SVG is a valid fallback. */
      }
    });
    if (paused) selectStage(driver.chapter, true);
    controller?.invalidate();
  }
  motion?.addEventListener('click', () => setMotion(!driver.paused));
  if (motion) motion.disabled = false;
  reduced.addEventListener('change', () => setMotion(reduced.matches));
  document.documentElement.classList.add('home-motion');
  setMotion(reduced.matches);
  openHash();
  selectStage(Number(selected.dataset.stage), true);

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.target === slot) {
          visible = entry.isIntersecting;
          if (visible) loadScene();
        } else if (entry.isIntersecting) {
          entry.target.classList.add('is-in-view');
          observer.unobserve(entry.target);
        }
      }
    },
    { rootMargin: '-100px 0px -8% 0px', threshold: [0, 0.1, 0.35, 0.65] }
  );
  observer.observe(slot);
  home
    .querySelectorAll('[data-home-flow]')
    .forEach((flow) => observer.observe(flow));
  window.addEventListener('pagehide', (event) => {
    morph?.kill();
    if (event.persisted) {
      selectStage(driver.chapter, true);
      return;
    }
    disposed = true;
    observer.disconnect();
    controller?.dispose();
  });
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      controller?.invalidate();
    }
  });
}
