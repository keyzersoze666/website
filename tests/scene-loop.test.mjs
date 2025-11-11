import test from 'node:test';
import assert from 'node:assert/strict';
import { createSceneLoop } from '../src/scripts/scene-loop.ts';

function animation() {
  let next = 0;
  const pending = new Map();
  const draws = [];
  const loop = createSceneLoop(
    (delta) => draws.push(delta),
    (callback) => {
      pending.set(++next, callback);
      return next;
    },
    (id) => pending.delete(id)
  );
  return {
    loop,
    pending,
    draws,
    frame(time) {
      const callbacks = [...pending.values()];
      pending.clear();
      callbacks.forEach((callback) => callback(time));
    },
  };
}

test('offscreen artwork schedules no frames; paused artwork redraws only when needed', () => {
  const art = animation();
  art.loop.invalidate();
  assert.equal(art.pending.size, 0);
  art.loop.setActive(true);
  art.frame(1000);
  assert.deepEqual(art.draws, [0]);
  assert.equal(art.pending.size, 0);
  art.loop.invalidate();
  art.loop.invalidate();
  assert.equal(art.pending.size, 1);
  art.frame(1016);
  assert.equal(art.draws.length, 2);
  assert.equal(art.pending.size, 0);
  art.loop.setActive(false);
  art.loop.invalidate();
  assert.equal(art.pending.size, 0);
});

test('motion stops when out of view and resumes without jumping elapsed time', () => {
  const art = animation();
  art.loop.setPaused(false);
  art.loop.setActive(true);
  art.frame(1000);
  art.frame(1016);
  assert.deepEqual(art.draws, [0, 0.016]);
  assert.equal(art.pending.size, 1);
  art.loop.setActive(false);
  assert.equal(art.pending.size, 0);
  art.loop.setActive(true);
  art.frame(999000);
  assert.equal(art.draws.at(-1), 0);
  art.frame(1009000);
  assert.equal(art.draws.at(-1), 0.06);
  art.loop.setPaused(true);
  art.frame(1009016);
  assert.equal(art.pending.size, 0);
  art.loop.dispose();
  art.loop.invalidate();
  art.loop.setActive(true);
  art.loop.setPaused(false);
  assert.equal(art.pending.size, 0);
});
