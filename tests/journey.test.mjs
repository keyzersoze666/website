import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { sculpturePositions } from '../src/scripts/sculpture-shapes.ts';
import {
  agentNodes,
  agentEdges,
  agentRoutes,
  agentSignal,
  AGENT_RADIUS,
} from '../src/scripts/agent-network.ts';
const require = createRequire(import.meta.url);
const { gsap } = require('gsap');

test('particle transitions finish without additional scroll input, including interrupted transitions', () => {
  const weights = [1, 0, 0, 0, 0, 0];
  const first = gsap.to(weights, {
    0: 0,
    1: 1,
    duration: 0.65,
    ease: 'power2.inOut',
    paused: true,
  });
  first.progress(0.45);
  assert.ok(weights[0] > 0 && weights[1] > 0);
  first.kill();
  const target = gsap.to(weights, {
    0: 0,
    1: 0,
    2: 0,
    3: 0,
    4: 1,
    5: 0,
    duration: 0.65,
    ease: 'power2.inOut',
    paused: true,
  });
  target.progress(0.5);
  assert.ok(
    Math.abs(weights.reduce((sum, value) => sum + value, 0) - 1) < 0.00001
  );
  target.progress(1);
  assert.deepEqual(weights.slice(), [0, 0, 0, 0, 1, 0]);
  target.kill();
  gsap.ticker.sleep();
});

test('all six sculptures have finite, distinct geometry', () => {
  const shapes = sculpturePositions(2400, [
    [-0.8, -0.5],
    [0.8, 0.5],
    [0, 0],
  ]);
  assert.equal(shapes.length, 6);
  for (const shape of shapes) {
    assert.equal(shape.length, 7200);
    assert.ok(shape.every(Number.isFinite));
    assert.ok(shape.some((value) => Math.abs(value) > 0.6));
  }
  for (let i = 1; i < shapes.length; i++)
    assert.notDeepEqual(shapes[0], shapes[i]);
  assert.ok(
    sculpturePositions(1).every((shape) => shape.every(Number.isFinite))
  );
});

test('six agents form a connected regular hexagon with three internal paths', () => {
  assert.equal(agentNodes.length, 6);
  assert.equal(agentEdges.length, 9);
  for (let i = 0; i < 6; i++) {
    const node = agentNodes[i],
      next = agentNodes[(i + 1) % 6];
    assert.ok(Math.abs(Math.hypot(node[0], node[1]) - AGENT_RADIUS) < 1e-10);
    assert.ok(
      Math.abs(
        Math.hypot(next[0] - node[0], next[1] - node[1]) - AGENT_RADIUS
      ) < 1e-10
    );
  }
  const visited = new Set([0]);
  for (let pass = 0; pass < 6; pass++)
    for (const [a, b] of agentEdges) {
      if (visited.has(a) || visited.has(b)) {
        visited.add(a);
        visited.add(b);
      }
    }
  assert.equal(visited.size, 6);
});

test('light signals stay on connected paths and illuminate the receiving agent', () => {
  for (let index = 0; index < agentRoutes.length; index++)
    for (let time = 0; time < 60; time += 0.13) {
      const signal = agentSignal(time, index),
        start = agentNodes[signal.source],
        end = agentNodes[signal.target];
      assert.ok(
        agentEdges.some(
          ([a, b]) =>
            (a === signal.source && b === signal.target) ||
            (b === signal.source && a === signal.target)
        )
      );
      assert.ok(signal.progress >= 0 && signal.progress <= 1);
      assert.ok(signal.arrival >= 0 && signal.arrival <= 1);
      assert.ok(signal.position.every(Number.isFinite));
      assert.ok(
        Math.abs(
          (signal.position[0] - start[0]) * (end[1] - start[1]) -
            (signal.position[1] - start[1]) * (end[0] - start[0])
        ) < 1e-10
      );
    }
  const arrival = agentSignal(0.9 / 0.47, 0);
  assert.deepEqual(arrival.position, Array.from(agentNodes[arrival.target]));
  assert.ok(arrival.arrival > 0.999);
});
