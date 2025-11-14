// The geometry follows draft-02: a trefoil, agent nodes, chat, voice, speaker, and text.
import { agentNodes, agentEdges, AGENT_NODE_RADIUS } from './agent-network.ts';
export type LetterPoint = readonly [number, number];
const TAU = Math.PI * 2;
export function sculpturePositions(
  count: number,
  letters: readonly LetterPoint[] = []
): Float32Array[] {
  const shapes = Array.from({ length: 6 }, () => new Float32Array(count * 3));
  const put = (stage: number, i: number, x: number, y: number, z: number) =>
    shapes[stage]!.set([x, y, z], i * 3);
  for (let i = 0; i < count; i++) {
    const u = i / Math.max(count - 1, 1),
      a = i * 2.3999632297,
      noise = Math.sin(i * 53.17);
    const theta = u * TAU,
      band = 0.115 * Math.cos(a),
      r = 0.77 + 0.27 * Math.cos(3 * theta);
    put(
      0,
      i,
      (r + band) * Math.cos(2 * theta),
      (r + band) * Math.sin(2 * theta),
      0.38 * Math.sin(3 * theta) + 0.115 * Math.sin(a)
    );
    // Six agent spheres share a hexagonal perimeter and three internal connections.
    if (u < 0.8) {
      const f = (u / 0.8) * agentNodes.length,
        group = Math.min(agentNodes.length - 1, Math.floor(f)),
        local = f - group,
        node = agentNodes[group]!;
      const y = 1 - 2 * local,
        radius = Math.sqrt(Math.max(0, 1 - y * y)) * AGENT_NODE_RADIUS;
      put(
        1,
        i,
        node[0] + Math.cos(a) * radius,
        node[1] + y * AGENT_NODE_RADIUS,
        Math.sin(a) * radius
      );
    } else {
      const f = ((u - 0.8) / 0.2) * agentEdges.length,
        group = Math.min(agentEdges.length - 1, Math.floor(f)),
        v = f - group;
      const edge = agentEdges[group]!,
        start = agentNodes[edge[0]]!,
        end = agentNodes[edge[1]]!;
      put(
        1,
        i,
        start[0] + (end[0] - start[0]) * v,
        start[1] + (end[1] - start[1]) * v,
        noise * 0.025
      );
    }
    if (u < 0.74) {
      const angle = (u / 0.74) * TAU;
      put(
        2,
        i,
        Math.sign(Math.cos(angle)) * Math.abs(Math.cos(angle)) ** 0.42 * 1.04,
        Math.sign(Math.sin(angle)) * Math.abs(Math.sin(angle)) ** 0.42 * 0.68,
        noise * 0.1
      );
    } else if (u < 0.9) {
      const group = Math.floor(((u - 0.74) / 0.16) * 2.999);
      put(
        2,
        i,
        (group - 1) * 0.48 + Math.cos(a) * 0.065,
        Math.sin(a) * 0.065,
        noise * 0.1
      );
    } else {
      const f = (u - 0.9) / 0.1;
      put(
        2,
        i,
        f < 0.5 ? -0.63 - f * 0.6 : -0.93 + (f - 0.5) * 1.35,
        -0.68 - (f < 0.5 ? f * 0.55 : (1 - f) * 0.55),
        noise * 0.09
      );
    }
    const x = (u - 0.5) * 2.8,
      envelope = Math.exp(-x * x * 0.6);
    put(
      3,
      i,
      x,
      (Math.sin(x * 7) * 0.43 + Math.sin(x * 12) * 0.18 + Math.cos(a) * 0.2) *
        envelope,
      Math.sin(a) * 0.25 * envelope
    );
    if (u < 0.5) {
      const edges = [
        [
          [-0.9, -0.23],
          [-0.57, -0.23],
        ],
        [
          [-0.57, -0.23],
          [-0.08, -0.7],
        ],
        [
          [-0.08, -0.7],
          [-0.08, 0.7],
        ],
        [
          [-0.08, 0.7],
          [-0.57, 0.23],
        ],
        [
          [-0.57, 0.23],
          [-0.9, 0.23],
        ],
        [
          [-0.9, 0.23],
          [-0.9, -0.23],
        ],
      ];
      const f = (u / 0.5) * 6,
        k = Math.min(5, Math.floor(f)),
        v = f - k,
        e = edges[k]!;
      put(
        4,
        i,
        e[0]![0]! + (e[1]![0]! - e[0]![0]!) * v,
        e[0]![1]! + (e[1]![1]! - e[0]![1]!) * v,
        noise * 0.08
      );
    } else {
      const f = (u - 0.5) * 6,
        group = Math.min(2, Math.floor(f)),
        angle = (f - group - 0.5) * 2.05,
        radius = 0.48 + group * 0.26;
      put(
        4,
        i,
        -0.07 + Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        noise * 0.065
      );
    }
    const letter = letters[Math.floor(u * Math.max(letters.length - 1, 0))];
    put(5, i, letter?.[0] ?? x, letter?.[1] ?? Math.sin(x) * 0.6, noise * 0.12);
  }
  return shapes;
}
