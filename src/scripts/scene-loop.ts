export function createSceneLoop(
  draw: (delta: number) => void,
  request: typeof requestAnimationFrame = requestAnimationFrame,
  cancel: typeof cancelAnimationFrame = cancelAnimationFrame
) {
  let active = false;
  let paused = true;
  let disposed = false;
  let dirty = true;
  let frame = 0;
  let previous: number | undefined;

  function schedule() {
    if (!disposed && active && !frame && (dirty || !paused))
      frame = request(tick);
  }
  function tick(now: number) {
    frame = 0;
    if (disposed || !active) return;
    const delta =
      previous === undefined
        ? 0
        : Math.min(Math.max(0, (now - previous) / 1000), 0.06);
    previous = now;
    dirty = false;
    draw(delta);
    schedule();
  }
  return {
    invalidate() {
      dirty = true;
      schedule();
    },
    setActive(value: boolean) {
      if (active === value) return;
      active = value;
      previous = undefined;
      if (!active) {
        cancel(frame);
        frame = 0;
      } else {
        dirty = true;
        schedule();
      }
    },
    setPaused(value: boolean) {
      if (paused === value) return;
      paused = value;
      previous = undefined;
      dirty = true;
      schedule();
    },
    dispose() {
      disposed = true;
      cancel(frame);
      frame = 0;
    },
  };
}
