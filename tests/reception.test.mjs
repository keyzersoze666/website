import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import * as motion from '../src/scripts/reception-motion.ts';
import { createSceneLoop } from '../src/scripts/scene-loop.ts';

const source = ts.transpileModule(
  readFileSync(new URL('../src/scripts/reception.ts', import.meta.url), 'utf8'),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }
).outputText;

function page({ reducedMotion = false } = {}) {
  class Element extends EventTarget {
    style = {};
    dataset = {};
    disabled = true;
    attributes = new Map();
    setAttribute(key, value) {
      this.attributes.set(key, value);
    }
    click() {
      this.dispatchEvent(new Event('click'));
    }
  }
  const scene = new Element();
  const pause = new Element();
  const replay = new Element();
  const carriers = [new Element(), new Element()];
  const parts = Object.fromEntries(
    [
      'voice',
      'text',
      'data',
      'currents',
      'note',
      'open-flap',
      'closed-flap',
      'confirmation',
    ].map((key) => [key, new Element()])
  );
  scene.getBoundingClientRect = () => ({ top: 100, bottom: 560 });
  scene.querySelectorAll = () => carriers;
  scene.querySelector = (selector) =>
    parts[selector.replace(/^\.envelope-(?:packet-)?/, '')];
  const document = new Element();
  document.hidden = false;
  document.querySelector = (selector) =>
    ({
      '[data-reception-scene]': scene,
      '.reception-motion': pause,
      '.reception-replay': replay,
    })[selector];
  const window = new Element();
  window.innerHeight = 1000;
  const media = new Element();
  media.matches = reducedMotion;
  let observer;
  const pending = new Map();
  let next = 0;
  let draws = 0;
  runInNewContext(source, {
    document,
    window,
    matchMedia: () => media,
    IntersectionObserver: class {
      constructor(callback) {
        this.callback = callback;
        observer = this;
      }
      observe() {}
      disconnect() {
        this.disconnected = true;
      }
    },
    exports: {},
    require: (name) => {
      if (name === './reception-motion') return motion;
      if (name === './scene-loop')
        return {
          createSceneLoop: (draw) =>
            createSceneLoop(
              (delta) => {
                draws++;
                draw(delta);
              },
              (callback) => {
                pending.set(++next, callback);
                return next;
              },
              (id) => pending.delete(id)
            ),
        };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  const frame = (time) => {
    const callbacks = [...pending.values()];
    pending.clear();
    callbacks.forEach((callback) => callback(time));
  };
  const hide = (value) => {
    document.hidden = value;
    document.dispatchEvent(new Event('visibilitychange'));
  };
  const intersect = (value) => observer.callback([{ isIntersecting: value }]);
  return {
    scene,
    pause,
    replay,
    carriers,
    parts,
    media,
    document,
    window,
    pending,
    frame,
    hide,
    intersect,
    get draws() {
      return draws;
    },
    get observer() {
      return observer;
    },
  };
}

const pose = (frame) => [
  frame.envelopeY,
  frame.openFlap,
  frame.closedFlap,
  frame.tick,
  ...frame.packets.flatMap((packet) => [packet.x, packet.y]),
];

test('movement eases into phase boundaries and finishes centred before the tick', () => {
  const startsAndEnds = [0, 0.1, 0.2, 1.3, 1.4, 1.5, 1.9, 2.1, 2.3, 2.98, 3.2];
  for (const time of startsAndEnds) {
    const before = pose(motion.receptionFrame(time - 0.0001));
    const at = pose(motion.receptionFrame(time));
    const after = pose(motion.receptionFrame(time + 0.0001));
    for (let i = 0; i < at.length; i++) {
      const leftVelocity = (at[i] - before[i]) / 0.0001;
      const rightVelocity = (after[i] - at[i]) / 0.0001;
      assert.ok(
        Math.abs(rightVelocity - leftVelocity) < 0.6,
        `velocity discontinuity at ${time}`
      );
    }
  }
  for (let time = 0; time <= motion.receptionDuration; time += 1 / 240) {
    const frame = motion.receptionFrame(time);
    assert.ok(frame.envelopeY <= 80 && frame.envelopeY >= -45 - 1e-10);
    if (frame.tick > 0) assert.equal(frame.envelopeY, -45);
  }
  assert.ok(
    motion.receptionFrame(1.5).packets.every((packet) => packet.opacity === 0)
  );
  assert.deepEqual(motion.receptionFrame(20), motion.receptionFrame(3.2));
});

test('every available refresh is drawn at 60, 120 and 144 Hz with the same final pose', () => {
  const counts = [];
  for (const hz of [60, 120, 144]) {
    const art = page();
    for (let n = 0; n <= Math.ceil(3.3 * hz); n++) art.frame((n * 1000) / hz);
    assert.equal(art.scene.dataset.motion, 'complete');
    assert.equal(art.pending.size, 0);
    assert.equal(art.pause.disabled, true);
    assert.equal(art.replay.disabled, false);
    assert.equal(art.parts.confirmation.style.opacity, '1');
    assert.equal(
      art.carriers[0].style.transform,
      'translate3d(-145px, -45px, 0)'
    );
    assert.equal(
      art.carriers[0].style.transform,
      art.carriers[1].style.transform
    );
    assert.ok(Math.abs(art.draws - (3.2 * hz + 1)) < 3);
    counts.push(art.draws);
  }
  assert.ok(counts[1] > counts[0] * 1.95);
  assert.ok(counts[2] > counts[1]);
});

test('pause, hidden tabs and offscreen states freeze elapsed time; replay and motion preferences reset cleanly', () => {
  const art = page();
  art.frame(0);
  art.frame(16);
  art.frame(32);
  art.pause.click();
  art.frame(48);
  const pausedPose = art.parts.voice.style.transform;
  assert.equal(art.pending.size, 0);
  art.frame(5000);
  assert.equal(art.parts.voice.style.transform, pausedPose);
  art.pause.click();
  art.frame(6000);
  assert.equal(art.parts.voice.style.transform, pausedPose);
  art.frame(6016);
  assert.notEqual(art.parts.voice.style.transform, pausedPose);
  for (const [stop, resume] of [
    [() => art.hide(true), () => art.hide(false)],
    [() => art.intersect(false), () => art.intersect(true)],
  ]) {
    const before = art.parts.voice.style.transform;
    stop();
    assert.equal(art.pending.size, 0);
    resume();
    art.frame(20000);
    assert.equal(art.parts.voice.style.transform, before);
  }
  art.replay.click();
  assert.equal(
    art.parts.voice.style.transform,
    'translate3d(224px, 48px, 0) scale(1)'
  );
  art.media.matches = true;
  art.media.dispatchEvent(new Event('change'));
  assert.equal(art.pending.size, 0);
  assert.equal(art.scene.dataset.motion, 'reduced');
  assert.equal(art.replay.disabled, true);
  assert.equal(art.parts.confirmation.style.opacity, '1');
  art.media.matches = false;
  art.media.dispatchEvent(new Event('change'));
  assert.equal(art.scene.dataset.motion, 'running');
  assert.equal(art.pending.size, 1);
  const leave = new Event('pagehide');
  leave.persisted = false;
  art.window.dispatchEvent(leave);
  assert.equal(art.pending.size, 0);
  assert.equal(art.observer.disconnected, true);
});
