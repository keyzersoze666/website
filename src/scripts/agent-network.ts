export const AGENT_RADIUS = 0.98;
export const AGENT_NODE_RADIUS = 0.17;
export const agentNodes = Array.from({ length: 6 }, (_, index) => {
  const angle = (index * Math.PI) / 3;
  return [
    Math.cos(angle) * AGENT_RADIUS,
    Math.sin(angle) * AGENT_RADIUS,
    0,
  ] as const;
});
export const agentEdges = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
  [5, 0],
  [0, 3],
  [1, 4],
  [2, 5],
] as const;
// Each signal follows connected edges, rather than drifting through empty space.
export const agentRoutes = [
  [0, 1, 2, 5, 0],
  [3, 4, 5, 2, 3],
  [1, 4, 3, 0, 1],
] as const;

export function agentSignal(time: number, index: number) {
  const route = agentRoutes[index % agentRoutes.length]!;
  const phase = (Math.max(0, time) * 0.47 + index * 0.76) % (route.length - 1);
  const segment = Math.floor(phase),
    fraction = phase - segment;
  const source = route[segment]!,
    target = route[segment + 1]!;
  const start = agentNodes[source]!,
    end = agentNodes[target]!;
  const progress = Math.min(1, fraction / 0.84);
  return {
    source,
    target,
    progress,
    arrival: Math.max(0, 1 - Math.abs(fraction - 0.9) / 0.1),
    position: start.map(
      (value, axis) => value + (end[axis]! - value) * progress
    ),
  };
}
