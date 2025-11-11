import {
  stageStart,
  workflowFrame,
  workflowStages,
} from './hero-workflow-model';
import { createSceneLoop } from './scene-loop';
import type { WorkflowCurrent } from './hero-workflow-current';

export function createHeroWorkflow(root: HTMLElement) {
  const pause = root.querySelector<HTMLButtonElement>('[data-flow-pause]');
  const restart = root.querySelector<HTMLButtonElement>('[data-flow-replay]');
  const pauseLabel = root.querySelector<HTMLElement>('[data-flow-pause-label]');
  const title = root.querySelector<HTMLElement>('[data-flow-title]');
  const copy = root.querySelector<HTMLElement>('[data-flow-copy]');
  const stages = [
    ...root.querySelectorAll<HTMLButtonElement>('[data-flow-stage]'),
  ];
  if (!pause || !restart || !pauseLabel || !title || !copy) return;
  stages.forEach((button) => {
    button.disabled = false;
  });
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let elapsed = 0;
  let current = -1;
  let visible = false;
  let manuallyPaused = false;
  let loading = false;
  let failed = false;
  let disposed = false;
  let currentArt: WorkflowCurrent | undefined;
  function present(stage: number) {
    if (current === stage) return;
    current = stage;
    root.dataset.phase = String(stage);
    title!.textContent = workflowStages[stage]!.title;
    copy!.textContent = workflowStages[stage]!.copy;
    for (const button of stages) {
      const active = button.dataset.flowStage === workflowStages[stage]!.id;
      button.classList.toggle('is-current', active);
      if (active) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    }
  }
  const loop = createSceneLoop((delta) => {
    if (!manuallyPaused && !reduced.matches && !failed) elapsed += delta;
    const frame = workflowFrame(elapsed);
    present(frame.stage);
    currentArt?.draw(elapsed, frame);
  });
  function syncControls() {
    pause!.disabled = reduced.matches || failed;
    restart!.disabled = reduced.matches;
    pauseLabel!.textContent = manuallyPaused ? 'Resume' : 'Pause';
    pause!.setAttribute(
      'aria-label',
      `${manuallyPaused ? 'Resume' : 'Pause'} woven current animation`
    );
    pause!.setAttribute('aria-pressed', String(manuallyPaused));
  }
  function unavailable() {
    failed = true;
    syncPlayback();
  }
  function loadCurrent() {
    if (loading || disposed || failed || reduced.matches) return;
    loading = true;
    import('./hero-workflow-current')
      .then(({ createWorkflowCurrent }) => {
        if (disposed) return;
        if (reduced.matches || !visible || document.hidden) {
          loading = false;
          return;
        }
        currentArt = createWorkflowCurrent(root);
        if (!currentArt) failed = true;
        syncPlayback();
        loop.invalidate();
      })
      .catch(unavailable);
  }
  function syncPlayback() {
    if (disposed) return;
    loop.setPaused(manuallyPaused || reduced.matches || failed);
    loop.setActive(visible && !document.hidden);
    if (visible && !reduced.matches) loadCurrent();
    syncControls();
  }
  const toggle = () => {
    manuallyPaused = !manuallyPaused;
    syncPlayback();
  };
  const replay = () => {
    if (reduced.matches) return;
    elapsed = 0;
    manuallyPaused = false;
    present(0);
    syncPlayback();
    loop.invalidate();
  };
  const select = (event: Event) => {
    const button = event.currentTarget as HTMLButtonElement;
    const index = workflowStages.findIndex(
      (stage) => stage.id === button.dataset.flowStage
    );
    if (index < 0) return;
    elapsed = stageStart(index);
    present(index);
    loop.invalidate();
  };
  const preferenceChanged = () => {
    if (reduced.matches) {
      elapsed = stageStart(workflowFrame(elapsed).stage);
      present(workflowFrame(elapsed).stage);
    }
    syncPlayback();
    loop.invalidate();
  };
  const observer = new IntersectionObserver(
    (entries) => {
      visible = !!entries[0]?.isIntersecting;
      syncPlayback();
    },
    { threshold: [0, 0.2], rootMargin: '-88px 0px 0px 0px' }
  );
  observer.observe(root);
  pause.addEventListener('click', toggle);
  restart.addEventListener('click', replay);
  stages.forEach((button) => button.addEventListener('click', select));
  reduced.addEventListener('change', preferenceChanged);
  document.addEventListener('visibilitychange', syncPlayback);
  const onHide = (event: PageTransitionEvent) => {
    if (event.persisted) loop.setActive(false);
    else dispose();
  };
  window.addEventListener('pagehide', onHide);
  window.addEventListener('pageshow', syncPlayback);
  function dispose() {
    if (disposed) return;
    disposed = true;
    loop.dispose();
    observer.disconnect();
    currentArt?.dispose();
    pause?.removeEventListener('click', toggle);
    restart?.removeEventListener('click', replay);
    stages.forEach((button) => button.removeEventListener('click', select));
    reduced.removeEventListener('change', preferenceChanged);
    document.removeEventListener('visibilitychange', syncPlayback);
    window.removeEventListener('pagehide', onHide);
    window.removeEventListener('pageshow', syncPlayback);
  }
  present(0);
  syncControls();
  return { dispose };
}
