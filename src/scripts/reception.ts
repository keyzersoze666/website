import { createSceneLoop } from './scene-loop';
import {
  receptionDuration,
  receptionFrame,
  receptionPackets,
} from './reception-motion';

const scene = document.querySelector<HTMLElement>('[data-reception-scene]');
const pause = document.querySelector<HTMLButtonElement>('.reception-motion');
const replay = document.querySelector<HTMLButtonElement>('.reception-replay');

if (scene && pause && replay) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const carriers = [
    ...scene.querySelectorAll<SVGGElement>('.envelope-carrier'),
  ];
  const packets = receptionPackets.map(({ kind }) =>
    scene.querySelector<SVGGElement>(`.envelope-packet-${kind}`)!
  );
  const trails = scene.querySelector<SVGGElement>('.envelope-currents')!;
  const note = scene.querySelector<SVGGElement>('.envelope-note')!;
  const open = scene.querySelector<SVGGElement>('.envelope-open-flap')!;
  const closed = scene.querySelector<SVGGElement>('.envelope-closed-flap')!;
  const tick = scene.querySelector<SVGGElement>('.envelope-confirmation')!;
  let elapsed = 0;
  let paused = false;
  let complete = false;
  let away = false;
  const bounds = scene.getBoundingClientRect();
  let visible = bounds.bottom > 0 && bounds.top < window.innerHeight;

  function render() {
    const frame = receptionFrame(elapsed);
    carriers.forEach((el) => {
      el.style.transform = `translate3d(-145px, ${frame.envelopeY}px, 0)`;
    });
    packets.forEach((el, index) => {
      const packet = frame.packets[index]!;
      el.style.transform = `translate3d(${packet.x}px, ${packet.y}px, 0) scale(${packet.scale})`;
      el.style.opacity = String(packet.opacity);
    });
    trails.style.opacity = String(frame.trails);
    note.style.transform = `translate3d(0, ${45 * frame.note}px, 0)`;
    note.style.opacity = String(1 - frame.note);
    open.style.transform = `scaleY(${frame.openFlap})`;
    closed.style.transform = `scaleY(${frame.closedFlap})`;
    tick.style.opacity = String(frame.tick);
    tick.style.transform = `scale(${0.92 + 0.08 * frame.tick})`;
  }

  const loop = createSceneLoop((delta) => {
    if (!paused && !complete)
      elapsed = Math.min(receptionDuration, elapsed + delta);
    render();
    if (elapsed >= receptionDuration && !complete) {
      complete = true;
      sync();
    }
  });

  function sync() {
    scene!.dataset.motion = reduced.matches
      ? 'reduced'
      : complete
        ? 'complete'
        : paused || document.hidden || !visible || away
          ? 'paused'
          : 'running';
    pause!.disabled = reduced.matches || complete;
    pause!.setAttribute('aria-pressed', String(paused));
    pause!.textContent = reduced.matches
      ? 'Reduced motion'
      : complete
        ? 'Animation complete'
        : paused
          ? 'Resume animation'
          : 'Pause animation';
    replay!.disabled = reduced.matches;
    loop.setPaused(paused || complete);
    loop.setActive(
      !reduced.matches && !complete && !document.hidden && visible && !away
    );
  }

  function play() {
    paused = false;
    complete = reduced.matches;
    elapsed = complete ? receptionDuration : 0;
    render();
    // Reset the frame timestamp when Replay is clicked during an active run.
    loop.setActive(false);
    sync();
  }
  pause.addEventListener('click', () => {
    if (complete || reduced.matches) return;
    paused = !paused;
    sync();
  });
  replay.addEventListener('click', play);
  reduced.addEventListener('change', play);
  document.addEventListener('visibilitychange', sync);
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry!.isIntersecting;
    sync();
  });
  observer.observe(scene);
  window.addEventListener('pagehide', (event) => {
    away = true;
    sync();
    if (!event.persisted) {
      observer.disconnect();
      loop.dispose();
    }
  });
  window.addEventListener('pageshow', () => {
    away = false;
    sync();
  });
  play();
}
