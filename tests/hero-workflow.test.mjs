import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import * as model from '../src/scripts/hero-workflow-model.ts';
import { createSceneLoop } from '../src/scripts/scene-loop.ts';
const source = ts.transpileModule(
  readFileSync(
    new URL('../src/scripts/hero-workflow.ts', import.meta.url),
    'utf8'
  ),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }
).outputText;
const flush = () => new Promise((resolve) => setImmediate(resolve));

function artwork({ reducedMotion = false, available = true } = {}) {
  class Element {
    constructor(dataset = {}) {
      this.dataset = dataset;
      this.events = new Map();
      this.attributes = new Map();
      this.classes = new Set();
      this.classList = {
        add: (key) => this.classes.add(key),
        remove: (key) => this.classes.delete(key),
        contains: (key) => this.classes.has(key),
        toggle: (key, value) => {
          if (value) this.classes.add(key);
          else this.classes.delete(key);
        },
      };
    }
    addEventListener(type, callback) {
      if (!this.events.has(type)) this.events.set(type, new Set());
      this.events.get(type).add(callback);
    }
    removeEventListener(type, callback) {
      this.events.get(type)?.delete(callback);
    }
    setAttribute(key, value) {
      this.attributes.set(key, value);
    }
    removeAttribute(key) {
      this.attributes.delete(key);
    }
    fire(type, extra = {}) {
      for (const callback of this.events.get(type) ?? [])
        callback({ currentTarget: this, ...extra });
    }
  }
  const root = new Element();
  const pause = new Element();
  const restart = new Element();
  const label = new Element();
  const title = new Element();
  const copy = new Element();
  const stages = model.workflowStages.map(
    (stage) => new Element({ flowStage: stage.id })
  );
  root.querySelector = (key) =>
    ({
      '[data-flow-pause]': pause,
      '[data-flow-replay]': restart,
      '[data-flow-pause-label]': label,
      '[data-flow-title]': title,
      '[data-flow-copy]': copy,
    })[key];
  root.querySelectorAll = () => stages;
  const document = new Element();
  document.hidden = false;
  document.activeElement = null;
  const window = new Element();
  const reduced = new Element();
  reduced.matches = reducedMotion;
  let observer;
  let loads = 0;
  let disposals = 0;
  const draws = [];
  const pending = new Map();
  let next = 0;
  const request = (callback) => {
    pending.set(++next, callback);
    return next;
  };
  const cancel = (id) => pending.delete(id);
  class Observer {
    constructor(callback) {
      this.callback = callback;
      this.disconnected = false;
      observer = this;
    }
    observe() {}
    disconnect() {
      this.disconnected = true;
    }
  }
  const exports = {};
  runInNewContext(source, {
    exports,
    document,
    window,
    IntersectionObserver: Observer,
    matchMedia: () => reduced,
    require: (name) => {
      if (name === './hero-workflow-model') return model;
      if (name === './scene-loop')
        return {
          createSceneLoop: (draw) => createSceneLoop(draw, request, cancel),
        };
      if (name === './hero-workflow-current')
        return {
          createWorkflowCurrent: () => {
            loads++;
            return available
              ? {
                  draw: (time, frame) => {
                    draws.push({
                      time,
                      stage: frame.stage,
                      progress: frame.progress,
                      flow: frame.flow,
                      opening: frame.opening,
                    });
                  },
                  dispose: () => {
                    disposals++;
                  },
                }
              : undefined;
          },
        };
      throw new Error('Unexpected import ' + name);
    },
  });
  const controller = exports.createHeroWorkflow(root);
  return {
    root,
    pause,
    restart,
    label,
    title,
    copy,
    stages,
    document,
    window,
    reduced,
    observer,
    draws,
    pending,
    controller,
    frame(now) {
      const callbacks = [...pending.values()];
      pending.clear();
      callbacks.forEach((callback) => callback(now));
    },
    visible(value) {
      observer.callback([{ isIntersecting: value }]);
    },
    get loads() {
      return loads;
    },
    get disposals() {
      return disposals;
    },
  };
}

test('voice, text and data retain distinct entries and converge into a common bounded weave', () => {
  assert.deepEqual(
    model.currentInputs.map((input) => input.kind),
    ['voice', 'text', 'data']
  );
  assert.equal(model.currentStrands.length, 12);
  for (let phase = 0; phase <= 1; phase += 0.07) {
    for (const strand of model.currentStrands) {
      for (let u = 0; u <= 1; u += 0.01) {
        const [x, y, z] = model.currentPoint(strand.index, u, phase);
        assert.ok([x, y, z].every(Number.isFinite));
        assert.ok(
          x >= 35 && x <= 725 && y > 65 && y < 355 && Math.abs(z) <= 25.01
        );
      }
      const start = model.currentPoint(strand.index, 0, phase),
        end = model.currentPoint(strand.index, 1, phase);
      assert.ok(Math.abs(end[1] - 222) < 19);
      assert.deepEqual(start, model.currentPoint(strand.index, 0, phase));
    }
  }
  const voice = model.currentPoint(0, 0.05, 0)[1];
  const text = model.currentPoint(4, 0.05, 0)[1];
  const data = model.currentPoint(8, 0.05, 0)[1];
  assert.ok(text - voice > 65 && data - text > 65);
  const gateY = model.currentSnapshot(0).gateY;
  for (const strand of model.currentStrands) {
    assert.ok(
      Math.abs(
        model.currentPoint(strand.index, model.currentLayout.gate, 0.65)[1] -
          gateY
      ) < 30
    );
  }
});

test('the light moves forward, holds for review, opens the ring and wraps with matching geometry', () => {
  assert.ok(Math.abs(model.workflowDuration - 17.2) < 1e-10);
  for (let stage = 0; stage < 4; stage++)
    assert.equal(model.workflowFrame(model.stageStart(stage)).stage, stage);
  let previous = -1;
  for (let time = 0; time < model.workflowDuration; time += 0.013) {
    const frame = model.workflowFrame(time);
    assert.ok(frame.progress >= previous);
    previous = frame.progress;
    for (const property of ['flow', 'review', 'opening', 'pulseOpacity'])
      assert.ok(frame[property] >= 0 && frame[property] <= 1);
  }
  const reviewStart = model.stageStart(2);
  const held = model.workflowFrame(reviewStart + 2.8 * 0.44);
  const later = model.workflowFrame(reviewStart + 2.8 * 0.49);
  assert.ok(Math.abs(held.progress - model.currentLayout.gate) < 1e-12);
  assert.equal(later.progress, held.progress);
  assert.ok(later.flow > held.flow);
  assert.equal(model.workflowStages[2].duration, 2.8);
  assert.ok(held.glint > 0 && later.glintOffset < held.glintOffset);
  assert.ok(held.opening > 0 && later.opening > held.opening);

  assert.ok(model.workflowFrame(model.stageStart(3) - 0.1).opening > 0.98);
  const end = model.workflowFrame(model.workflowDuration - 1e-7),
    start = model.workflowFrame(model.workflowDuration);
  assert.equal(end.pulseOpacity, 0);
  assert.equal(start.pulseOpacity, 0);
  for (const strand of model.currentStrands) {
    for (let u = 0; u < 1; u += 0.05) {
      const a = model.currentPoint(strand.index, u, end.flow),
        b = model.currentPoint(strand.index, u, start.flow);
      a.forEach((value, axis) => assert.ok(Math.abs(value - b[axis]) < 1e-6));
    }
  }
  assert.deepEqual(
    model.currentSnapshot(0),
    model.currentSnapshot(model.workflowDuration * 2)
  );
});

test('the animation keeps looping, supports pause/resume and lets a reader select a stage', async () => {
  const page = artwork();
  assert.equal(page.loads, 0);
  page.visible(true);
  await flush();
  assert.equal(page.loads, 1);
  for (let now = 0; now <= 42000; now += 40) page.frame(now);
  const visited = [...new Set(page.draws.map((frame) => frame.stage))];
  assert.deepEqual(visited, [0, 1, 2, 3]);
  assert.ok(page.draws.at(-1).time > 40);
  assert.ok(page.draws.some((frame) => frame.opening > 0 && frame.opening < 1));
  page.pause.fire('click');
  page.frame(50000);
  const time = page.draws.at(-1).time;
  page.frame(50040);
  assert.equal(page.draws.at(-1).time, time);
  assert.equal(page.pending.size, 0);
  assert.equal(page.label.textContent, 'Resume');
  page.document.activeElement = page.stages[2];
  page.stages[2].fire('click');
  page.frame(50016);
  assert.equal(page.root.dataset.phase, '2');
  assert.equal(page.title.textContent, 'Review');
  assert.equal(page.document.activeElement, page.stages[2]);
  assert.equal(page.draws.at(-1).stage, 2);
  page.pause.fire('click');
  page.frame(80000);
  assert.equal(page.draws.at(-1).time, model.stageStart(2));
  page.frame(80040);
  assert.ok(page.draws.at(-1).time > model.stageStart(2));
  page.restart.fire('click');
  page.frame(80080);
  assert.ok(page.draws.at(-1).time < 0.1);
  assert.equal(page.draws.at(-1).stage, 0);
  assert.equal(page.root.dataset.phase, '0');
  page.controller.dispose();
  assert.equal(page.pending.size, 0);
  assert.equal(page.disposals, 1);
});

test('reduced motion loads no motion module and allows static stage selection', async () => {
  const page = artwork({ reducedMotion: true });
  page.visible(true);
  await flush();
  page.frame(0);
  assert.equal(page.loads, 0);
  assert.equal(page.pending.size, 0);
  assert.equal(page.pause.disabled, true);
  page.stages[3].fire('click');
  page.frame(20);
  assert.equal(page.root.dataset.phase, '3');
  assert.equal(page.title.textContent, 'Next step');
  assert.equal(page.pending.size, 0);
  page.reduced.matches = false;
  page.reduced.fire('change');
  await flush();
  page.frame(40);
  assert.equal(page.loads, 1);
  assert.equal(page.pending.size, 1);
  page.reduced.matches = true;
  page.reduced.fire('change');
  page.frame(60);
  assert.equal(page.pending.size, 0);
  assert.equal(
    page.draws.at(-1).time,
    model.stageStart(Number(page.root.dataset.phase))
  );
  page.controller.dispose();
});

test('visibility and cache pauses preserve time; leaving cancels work and abandoned loading', async () => {
  const page = artwork();
  page.visible(true);
  await flush();
  page.frame(0);
  page.frame(40);
  const time = page.draws.at(-1).time;
  page.visible(false);
  assert.equal(page.pending.size, 0);
  page.visible(true);
  page.frame(90000);
  assert.equal(page.draws.at(-1).time, time);
  page.document.hidden = true;
  page.document.fire('visibilitychange');
  assert.equal(page.pending.size, 0);
  page.document.hidden = false;
  page.document.fire('visibilitychange');
  page.frame(180000);
  assert.equal(page.draws.at(-1).time, time);
  page.window.fire('pagehide', { persisted: true });
  assert.equal(page.pending.size, 0);
  assert.equal(page.disposals, 0);
  page.window.fire('pageshow', { persisted: true });
  page.frame(240000);
  assert.equal(page.draws.at(-1).time, time);
  page.window.fire('pagehide', { persisted: false });
  assert.equal(page.disposals, 1);
  assert.equal(page.pending.size, 0);
  assert.equal(page.observer.disconnected, true);
  const abandoned = artwork();
  abandoned.visible(true);
  abandoned.window.fire('pagehide', { persisted: false });
  await flush();
  assert.equal(abandoned.loads, 0);
});

test('an in-flight module load respects a new motion preference before creating the motion renderer', async () => {
  const page = artwork();
  page.visible(true);
  page.reduced.matches = true;
  page.reduced.fire('change');
  await flush();
  assert.equal(page.loads, 0);
  page.frame(0);
  assert.equal(page.pending.size, 0);
  page.reduced.matches = false;
  page.reduced.fire('change');
  await flush();
  assert.equal(page.loads, 1);
  page.controller.dispose();
});

test('a renderer load failure leaves the static current and labelled stages usable', async () => {
  const page = artwork({ available: false });
  page.visible(true);
  await flush();
  page.frame(0);
  assert.equal(page.pause.disabled, true);
  assert.equal(page.pending.size, 0);
  page.stages[1].fire('click');
  page.frame(20);
  assert.equal(page.root.dataset.phase, '1');
  assert.equal(page.title.textContent, 'Check context');
  page.controller.dispose();
});

test('the SVG renderer advances every filament and ring, then leaves the drawing intact on disposal', () => {
  const rendered = ts.transpileModule(
    readFileSync(
      new URL('../src/scripts/hero-workflow-current.ts', import.meta.url),
      'utf8'
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }
  ).outputText;
  let writes = 0;
  class Node {
    constructor(dataset = {}) {
      this.dataset = dataset;
      this.attributes = new Map();
      this.style = {
        setProperty: (key, value) => {
          this.attributes.set(key, value);
          writes++;
        },
      };
    }
    setAttribute(key, value) {
      this.attributes.set(key, value);
      writes++;
    }
  }
  const nodes = Array.from({ length: 12 }, () =>
    Array.from({ length: 5 }, () => new Node())
  );
  const arcs = [
    new Node({ currentArc: 'back' }),
    new Node({ currentArc: 'front' }),
  ];
  const svg = new Node();
  const entries = Array.from(
    { length: 8 },
    (_, i) => new Node({ currentEntry: String(i) })
  );
  const records = [
    new Node({ currentRecords: 'links' }),
    new Node({ currentRecords: 'cells' }),
  ];
  svg.querySelectorAll = (selector) =>
    selector === '[data-current-arc]'
      ? arcs
      : selector === '[data-current-entry]'
        ? entries
        : selector === '[data-current-records]'
          ? records
          : nodes[Number(selector.match(/\d+/)[0])];
  const pulse = new Node(),
    traveler = new Node(),
    scan = new Node();
  const root = {
    querySelector: (key) =>
      ({
        '[data-woven-current]': svg,
        '[data-current-pulse]': pulse,
        '[data-current-traveler]': traveler,
        '[data-current-scan]': scan,
      })[key],
  };
  const exports = {};
  runInNewContext(rendered, { exports, require: () => model });
  assert.equal(
    exports.createWorkflowCurrent({ querySelector: () => null }),
    undefined
  );
  const art = exports.createWorkflowCurrent(root);
  const first = model.workflowFrame(7);
  art.draw(7, first);
  for (let strand = 0; strand < 12; strand++)
    for (const path of nodes[strand])
      assert.equal(
        path.attributes.get('d'),
        model.currentPath(strand, first.flow)
      );
  entries.forEach((entry, index) =>
    assert.equal(
      entry.attributes.get('d'),
      model.currentEntryPath(index, first.flow)
    )
  );
  assert.equal(
    records[1].attributes.get('d'),
    model.currentRecords(first.flow).cells
  );
  const review = model.workflowFrame(10.9);
  art.draw(10.9, review);
  assert.equal(traveler.attributes.get('opacity'), '1');
  assert.ok(Number(scan.attributes.get('opacity')) > 0);
  assert.equal(
    arcs[1].attributes.get('d'),
    model.reviewArc(true, review.opening, review.sway)
  );
  assert.ok(Number(svg.attributes.get('--current-glint')) > 0);
  const settledPath = nodes[0][0].attributes.get('d');
  art.draw(13, model.workflowFrame(13));
  assert.notEqual(nodes[0][0].attributes.get('d'), settledPath);
  art.draw(15, model.workflowFrame(15));
  assert.notEqual(arcs[1].attributes.get('d'), model.reviewArc(true, 0));
  art.dispose();
  const count = writes;
  art.draw(18, model.workflowFrame(18));
  assert.equal(writes, count);
});

test('voice Bézier segments have continuous tangents, and writing and records remain distinct across the loop', () => {
  for (const index of [0, 1, 2, 3]) {
    const path = model.currentEntryPath(index, 0.21);
    const values = [...path.matchAll(/-?\d+\.\d+/g)].map((match) =>
      Number(match[0])
    );
    assert.ok(path.includes(' C'));
    let end = values.slice(0, 2);
    const segments = [];
    for (let i = 2; i < values.length; i += 6) {
      const segment = values.slice(i, i + 6);
      segments.push({ start: end, values: segment });
      end = segment.slice(4);
    }
    for (let i = 1; i < segments.length; i++) {
      const before = segments[i - 1].values,
        after = segments[i].values;
      for (const axis of [0, 1])
        assert.ok(
          Math.abs(
            before[4 + axis] -
              before[2 + axis] -
              (after[axis] - before[4 + axis])
          ) < 0.035
        );
    }
  }
  for (let phase = 0; phase <= 1; phase += 0.05) {
    const writing = model.currentEntryPath(4, phase),
      records = model.currentRecords(phase);
    assert.ok((writing.match(/M/g) || []).length > 8);
    assert.ok(records.links && records.cells);
    assert.notEqual(writing, model.currentPath(4, phase));
    assert.notEqual(writing, records.cells);
    for (const path of [writing, records.links, records.cells])
      assert.ok(!/NaN|Infinity/.test(path));
  }
  assert.equal(model.currentEntryPath(4, 0), model.currentEntryPath(4, 1));
  assert.deepEqual(model.currentRecords(0), model.currentRecords(1));
});
