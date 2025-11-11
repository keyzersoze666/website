export const workflowStages = [
  {
    id: 'understand',
    number: '01',
    title: 'Understand',
    copy: 'Clarify what needs to happen.',
    duration: 4.8,
  },
  {
    id: 'context',
    number: '02',
    title: 'Check context',
    copy: 'Use approved information.',
    duration: 4.8,
  },
  {
    id: 'review',
    number: '03',
    title: 'Review',
    copy: 'Human judgment, where needed.',
    duration: 2.8,
  },
  {
    id: 'next',
    number: '04',
    title: 'Next step',
    copy: 'A response or a permitted action.',
    duration: 4.8,
  },
] as const;
export const workflowDuration = workflowStages.reduce(
  (total, stage) => total + stage.duration,
  0
);
export const stageStart = (index: number) =>
  workflowStages
    .slice(0, index)
    .reduce((total, stage) => total + stage.duration, 0);
const ease = (value: number) => {
  const t = Math.min(1, Math.max(0, value));
  return t * t * (3 - 2 * t);
};
export const currentLayout = {
  width: 760,
  height: 440,
  left: 36,
  length: 688,
  gate: 0.68,
} as const;
export const currentInputs = [
  { kind: 'voice' },
  { kind: 'text' },
  { kind: 'data' },
] as const;
export const currentStrands = Array.from({ length: 12 }, (_, index) => ({
  index,
  kind: currentInputs[Math.floor(index / 4)]!.kind,
}));
const centerY = (u: number) => 222 - Math.sin(Math.PI * u) * 14;
export function workflowFrame(seconds: number) {
  const time = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const cycleTime = time % workflowDuration;
  let stage = 0;
  while (stage < 3 && cycleTime >= stageStart(stage + 1)) stage++;
  const local =
    (cycleTime - stageStart(stage)) / workflowStages[stage]!.duration;
  const t = ease(local);
  const progress =
    stage === 0
      ? -0.055 + 0.285 * t
      : stage === 1
        ? 0.23 + 0.37 * t
        : stage === 2
          ? local < 0.38
            ? 0.6 + 0.08 * ease(local / 0.38)
            : local < 0.52
              ? 0.68
              : 0.68 + 0.065 * ease((local - 0.52) / 0.48)
          : 0.745 + 0.31 * t;
  // Keep the weave moving gently while its light briefly acknowledges review.
  const flow =
    stage === 0
      ? 0.32 * t
      : stage === 1
        ? 0.32 + 0.33 * t
        : stage === 2
          ? 0.65 + 0.1 * t
          : 0.75 + 0.25 * t;
  const review =
    stage === 2 ? ease(local / 0.18) : stage === 3 ? 1 - ease(local / 0.3) : 0;
  const opening =
    stage === 2
      ? ease((local - 0.28) / 0.55)
      : stage === 3
        ? 1 - ease((local - 0.55) / 0.45)
        : 0;
  const pulseOpacity =
    ease((progress + 0.045) / 0.07) * (1 - ease((progress - 0.975) / 0.07));
  return {
    stage,
    cycleTime,
    progress,
    flow,
    review,
    opening,
    pulseOpacity,
    sweep: stage === 2 ? t : 0,
    sway:
      stage === 2
        ? Math.sin(local * Math.PI * 2) * Math.sin(local * Math.PI)
        : 0,
    glint:
      stage === 2 ? ease(local / 0.12) * (1 - ease((local - 0.88) / 0.12)) : 0,
    glintOffset: stage === 2 ? -local : 0,
  };
}
export function currentPoint(
  index: number,
  u: number,
  flow: number
): [number, number, number] {
  const group = Math.floor(index / 4),
    lane = index % 4;
  const phase = flow * Math.PI * 2;
  const join = ease((u - 0.12) / 0.34),
    release = ease((u - 0.73) / 0.23);
  const voice =
    Math.sin(u * Math.PI * 22 - phase * 2 + lane * 0.12) *
    (10 + 3 * Math.sin(u * Math.PI * 6 - phase));
  const entry =
    (group - 1) * 91 +
    (lane - 1.5) * 10 +
    (group === 0 ? voice : Math.sin(u * 17 - phase + lane) * 3);
  const angle = u * Math.PI * 4.6 + (index * Math.PI) / 6 - phase;
  const woven = Math.sin(angle) * 29;
  const output = (index - 5.5) * 2.6 + Math.sin(u * 5 - phase) * 2;
  const y =
    ((1 - join) * entry + join * woven) * (1 - release) + release * output;
  const depth = Math.cos(angle) * 25 * join * (1 - release);
  return [currentLayout.left + u * currentLayout.length, centerY(u) + y, depth];
}
type Point = readonly number[];
function smoothPath(points: Point[]): string {
  if (!points.length) return '';
  const fmt = (value: number) => value.toFixed(2);
  let path = `M${fmt(points[0]![0]!)},${fmt(points[0]![1]!)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[Math.max(0, i - 1)]!,
      b = points[i]!,
      c = points[i + 1]!,
      d = points[Math.min(points.length - 1, i + 2)]!;
    const controls = [
      b[0]! + (c[0]! - a[0]!) / 6,
      b[1]! + (c[1]! - a[1]!) / 6,
      c[0]! - (d[0]! - b[0]!) / 6,
      c[1]! - (d[1]! - b[1]!) / 6,
      c[0]!,
      c[1]!,
    ];
    path += ' C' + controls.map(fmt).join(',');
  }
  return path;
}
function strandSegment(
  index: number,
  flow: number,
  start: number,
  end: number,
  samples: number
): string {
  return smoothPath(
    Array.from({ length: samples }, (_, i) =>
      currentPoint(index, start + ((end - start) * i) / (samples - 1), flow)
    )
  );
}
export function currentPath(index: number, flow: number): string {
  return strandSegment(index, flow, 0, 1, 65);
}
export function currentEntryPath(index: number, flow: number): string {
  if (index < 4) return currentPath(index, flow);
  const lane = index - 4,
    period = 0.15,
    shift = ((flow * 4 + lane * 0.13) % 1) * period;
  const strokes = [
    [0, 0.012],
    [0.019, 0.025],
    [0.051, 0.009],
    [0.067, 0.018],
    [0.099, 0.014],
    [0.124, 0.0018],
  ];
  const paths: string[] = [];
  for (let word = -1; word < 5; word++)
    for (const [offset, length] of strokes) {
      const u = word * period + shift + offset!;
      if (u < -0.06 || u > 0.46) continue;
      const grown = length! * ease((u + 0.035) / 0.065);
      if (grown > 0.0001)
        paths.push(strandSegment(index, flow, u, u + grown, 3));
    }
  return paths.join(' ');
}
export function currentRecords(flow: number): { links: string; cells: string } {
  const links: string[] = [],
    cells: string[] = [];
  const shift = ((flow * 3) % 1) * 0.16;
  for (let record = -1; record < 4; record++) {
    const base = record * 0.16 + shift;
    if (base < -0.12 || base > 0.43) continue;
    for (let col = 0; col < 3; col++) {
      const u = base + col * 0.032;
      links.push(
        smoothPath(
          Array.from({ length: 4 }, (_, row) => currentPoint(8 + row, u, flow))
        )
      );
      for (let row = 0; row < 4; row++)
        cells.push(
          strandSegment(
            8 + row,
            flow,
            u + 0.007,
            u + 0.007 + 0.009 + ((row + col) % 3) * 0.004,
            3
          )
        );
    }
    for (let row = 0; row < 4; row++)
      links.push(strandSegment(8 + row, flow, base, base + 0.064, 9));
  }
  return { links: links.join(' '), cells: cells.join(' ') };
}
export function reviewArc(front: boolean, opening = 0, sway = 0): string {
  const radius = 66 + opening * 10;
  const gap = 0.035 + opening * 0.24;
  const start = front ? -Math.PI / 2 + gap : Math.PI / 2 + gap;
  const extent = Math.PI - gap * 2;
  const gx = currentLayout.left + currentLayout.gate * currentLayout.length;
  return Array.from({ length: 49 }, (_, i) => {
    const angle = start + (extent * i) / 48;
    const y = Math.sin(angle) * radius;
    return `${i ? 'L' : 'M'}${(gx + Math.cos(angle) * radius * (0.39 + opening * 0.1) + y * (0.09 + sway * 0.12)).toFixed(2)},${(centerY(currentLayout.gate) + y).toFixed(2)}`;
  }).join(' ');
}
export function currentSnapshot(seconds: number) {
  const frame = workflowFrame(seconds);
  return {
    frame,
    paths: currentStrands.map(({ index }) => currentPath(index, frame.flow)),
    back: reviewArc(false, frame.opening, frame.sway),
    front: reviewArc(true, frame.opening, frame.sway),
    entries: currentStrands.map(({ index }) =>
      index < 8 ? currentEntryPath(index, frame.flow) : ''
    ),
    records: currentRecords(frame.flow),
    gateX: currentLayout.left + currentLayout.gate * currentLayout.length,
    gateY: centerY(currentLayout.gate),
  };
}
