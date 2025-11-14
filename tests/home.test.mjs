import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const { gsap } = require('gsap');
const source = ts.transpileModule(
  readFileSync(new URL('../src/scripts/home.ts', import.meta.url), 'utf8'),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }
).outputText;
const flush = () => new Promise((resolve) => setImmediate(resolve));

function homePage({ reducedMotion = false, hash = '', available = true } = {}) {
  const listeners = new Map();
  const tweens = [];
  let driver;
  let loads = 0;
  let invalidations = 0;
  let disposals = 0;
  const classes = () => {
    const set = new Set();
    return {
      add: (...names) => names.forEach((n) => set.add(n)),
      remove: (...names) => names.forEach((n) => set.delete(n)),
      contains: (name) => set.has(name),
      toggle: (name, force) => {
        const value = force ?? !set.has(name);
        if (value) set.add(name);
        else set.delete(name);
        return value;
      },
    };
  };
  class Element {
    constructor(id, dataset = {}) {
      this.id = id;
      this.dataset = dataset;
      this.classList = classes();
      this.parentElement = null;
      this.children = [];
      this.attributes = new Map();
      this.open = false;
      this.disabled = true;
    }
    addEventListener(type, callback) {
      const key = `${this.id}:${type}`;
      if (!listeners.has(key)) listeners.set(key, []);
      listeners.get(key).push(callback);
    }
    setAttribute(key, value) {
      this.attributes.set(key, value);
    }
    getAttribute(key) {
      return this.attributes.get(key);
    }
    append(child) {
      if (child.parentElement)
        child.parentElement.children = child.parentElement.children.filter(
          (item) => item !== child
        );
      child.parentElement = this;
      this.children.push(child);
    }
    contains(item) {
      while (item) {
        if (item === this) return true;
        item = item.parentElement;
      }
      return false;
    }
    querySelector(selector) {
      return selector === 'span' ? motionLabel : null;
    }
    closest() {
      return this;
    }
  }
  const capabilitySlot = new Element('capability', { homeScene: 'capability' });
  const viewport = new Element('viewport');
  capabilitySlot.append(viewport);
  const motion = new Element('motion');
  viewport.append(motion);
  const motionLabel = new Element('motionLabel');
  const label = new Element('label');
  const note = new Element('note');
  const flow = new Element('flow');
  const capabilities = [
    'ai-agents',
    'chatbots',
    'voice-bots',
    'text-to-speech',
    'speech-to-text',
  ].map(
    (id, index) =>
      new Element(id, {
        stage: String(index + 1),
        name: id,
        caption: `caption-${index + 1}`,
        note: `note-${index + 1}`,
      })
  );
  capabilities[0].open = true;
  const home = new Element('home');
  const svg = {
    paused: false,
    pauseAnimations() {
      this.paused = true;
    },
    unpauseAnimations() {
      this.paused = false;
    },
  };
  Object.assign(home, {
    querySelectorAll: (selector) => (selector === 'svg' ? [svg] : [flow]),
  });
  const root = new Element('root');
  const elements = new Map([
    ['.home-page', home],
    ['#scene-viewport', viewport],
    ['[data-home-scene="capability"]', capabilitySlot],
    ['#motion-toggle', motion],
    ['#scene-label', label],
    ['#scene-sub', note],
  ]);
  const document = {
    activeElement: null,
    documentElement: root,
    querySelector: (selector) => elements.get(selector),
    querySelectorAll: () => capabilities,
  };
  const window = new Element('window');
  window.location = { hash };
  window.scrollTo = () =>
    assert.fail('The homepage must not move the reading position');
  const reduced = new Element('reduced');
  reduced.matches = reducedMotion;
  let observer;
  class Observer {
    constructor(callback) {
      this.callback = callback;
      this.observed = new Set();
      this.disconnected = false;
      observer = this;
    }
    observe(element) {
      this.observed.add(element);
    }
    unobserve(element) {
      this.observed.delete(element);
    }
    disconnect() {
      this.disconnected = true;
      this.observed.clear();
    }
  }
  runInNewContext(source, {
    exports: {},
    document,
    window,
    matchMedia: () => reduced,
    IntersectionObserver: Observer,
    queueMicrotask,
    require: (name) => {
      if (name === 'gsap')
        return {
          __esModule: true,
          default: {
            to: (target, options) => {
              const tween = gsap.to(target, { ...options, paused: true });
              tweens.push(tween);
              return tween;
            },
          },
        };
      if (name === './scene')
        return {
          createScene: (value) => {
            loads++;
            driver = value;
            return available
              ? {
                  invalidate: () => {
                    invalidations++;
                  },
                  dispose: () => {
                    disposals++;
                  },
                }
              : undefined;
          },
        };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  const fire = (target, type, extra = {}) => {
    const event = {
      target,
      preventDefault: () =>
        assert.fail('Native navigation must remain available'),
      ...extra,
    };
    for (const callback of listeners.get(`${target.id}:${type}`) ?? [])
      callback(event);
  };
  const intersect = (ratio) =>
    observer.callback([
      {
        target: capabilitySlot,
        isIntersecting: ratio > 0,
        intersectionRatio: ratio,
      },
    ]);
  const select = (index) => {
    capabilities[index].open = true;
    fire(capabilities[index], 'toggle');
  };
  return {
    document,
    window,
    home,
    root,
    capabilitySlot,
    viewport,
    motion,
    motionLabel,
    label,
    note,
    capabilities,
    reduced,
    svg,
    flow,
    observer,
    fire,
    intersect,
    select,
    tweens,
    get driver() {
      return driver;
    },
    get loads() {
      return loads;
    },
    get invalidations() {
      return invalidations;
    },
    get disposals() {
      return disposals;
    },
  };
}

test('only the capability explorer loads a renderer, with no scrolling or canvas relocation', async () => {
  const page = homePage();
  assert.equal(page.loads, 0);
  page.intersect(1);
  await flush();
  assert.equal(page.loads, 1);
  page.intersect(1);
  assert.equal(page.viewport.parentElement, page.capabilitySlot);
  assert.deepEqual([...page.driver.weights], [0, 1, 0, 0, 0, 0]);
  page.select(2);
  page.tweens.at(-1).progress(0.4);
  page.select(4);
  page.tweens.at(-1).progress(1);
  assert.equal(page.driver.chapter, 5);
  assert.deepEqual([...page.driver.weights], [0, 0, 0, 0, 0, 1]);
  assert.equal(page.label.textContent, 'caption-5');
  assert.equal(page.capabilities.filter((entry) => entry.open).length, 1);
  assert.equal(page.capabilities[4].open, true);
  page.intersect(0);
  page.intersect(1);
  assert.equal(page.viewport.parentElement, page.capabilitySlot);
  assert.deepEqual([...page.driver.weights], [0, 0, 0, 0, 0, 1]);
  assert.equal(page.loads, 1);
  page.fire(page.window, 'pagehide', { persisted: false });
  gsap.ticker.sleep();
});

test('the fixed capability canvas preserves control and disclosure focus', async () => {
  const page = homePage();
  page.intersect(1);
  await flush();
  page.document.activeElement = page.motion;
  page.intersect(0);
  page.intersect(1);
  assert.equal(page.viewport.parentElement, page.capabilitySlot);
  assert.equal(page.document.activeElement, page.motion);
  page.document.activeElement = page.capabilities[1];
  page.select(1);
  assert.equal(page.document.activeElement, page.capabilities[1]);
  assert.equal(page.viewport.parentElement, page.capabilitySlot);
  page.fire(page.window, 'pagehide', { persisted: false });
  gsap.ticker.sleep();
});

test('initial hashes, overview links and browser history open the correct native disclosure', () => {
  const page = homePage({ hash: '#speech-to-text' });
  assert.equal(page.capabilities[4].open, true);
  const anchor = {
    closest() {
      return this;
    },
    getAttribute: () => '#chatbots',
  };
  page.fire(page.home, 'click', { target: anchor });
  assert.equal(page.capabilities[1].open, true);
  page.fire(page.home, 'click', {
    target: { closest: () => ({ getAttribute: () => '#voice-bots' }) },
    ctrlKey: true,
  });
  assert.equal(page.capabilities[1].open, true);
  page.window.location.hash = '#text-to-speech';
  page.fire(page.window, 'hashchange');
  assert.equal(page.capabilities[3].open, true);
  page.window.location.hash = '#unknown';
  page.fire(page.window, 'hashchange');
  assert.equal(page.capabilities[3].open, true);
  assert.equal(page.loads, 0);
  page.fire(page.window, 'pagehide', { persisted: false });
});

test('reduced motion starts static and Pause completes a partial morph without further motion', async () => {
  const page = homePage({ reducedMotion: true });
  assert.equal(page.motion.getAttribute('aria-pressed'), 'true');
  assert.equal(page.motionLabel.textContent, 'Play motion');
  assert.equal(page.svg.paused, true);
  page.intersect(1);
  await flush();
  page.intersect(1);
  page.select(1);
  assert.equal(page.tweens.length, 0);
  assert.deepEqual([...page.driver.weights], [0, 0, 1, 0, 0, 0]);
  page.fire(page.motion, 'click');
  page.select(3);
  page.tweens.at(-1).progress(0.4);
  assert.ok(page.driver.weights[4] > 0 && page.driver.weights[4] < 1);
  page.fire(page.motion, 'click');
  assert.equal(page.driver.paused, true);
  assert.deepEqual([...page.driver.weights], [0, 0, 0, 0, 1, 0]);
  assert.equal(page.svg.paused, true);
  page.reduced.matches = false;
  page.fire(page.reduced, 'change');
  assert.equal(page.driver.paused, false);
  page.fire(page.window, 'pagehide', { persisted: false });
  gsap.ticker.sleep();
});

test('native content and motion controls remain usable if WebGL is unavailable', async () => {
  const page = homePage({ available: false });
  page.intersect(1);
  await flush();
  page.intersect(1);
  page.select(2);
  assert.equal(page.capabilities[2].open, true);
  page.fire(page.motion, 'click');
  assert.equal(page.root.classList.contains('motion-paused'), true);
  assert.equal(page.svg.paused, true);
  assert.equal(page.loads, 1);
  assert.equal(page.root.classList.contains('scene-ready'), false);
  page.fire(page.window, 'pagehide', { persisted: false });
  gsap.ticker.sleep();
});

test('back-forward cache retains the renderer and an abandoned lazy load creates none', async () => {
  const page = homePage();
  page.intersect(1);
  await flush();
  page.fire(page.window, 'pagehide', { persisted: true });
  assert.equal(page.disposals, 0);
  assert.equal(page.observer.disconnected, false);
  page.fire(page.window, 'pageshow', { persisted: true });
  assert.equal(page.loads, 1);
  page.observer.callback([{ target: page.flow, isIntersecting: true }]);
  assert.equal(page.flow.classList.contains('is-in-view'), true);
  assert.equal(page.observer.observed.has(page.flow), false);
  page.fire(page.window, 'pagehide', { persisted: false });
  assert.equal(page.disposals, 1);
  assert.equal(page.observer.disconnected, true);
  const abandoned = homePage();
  abandoned.intersect(1);
  abandoned.fire(abandoned.window, 'pagehide', { persisted: false });
  await flush();
  assert.equal(abandoned.loads, 0);
});
