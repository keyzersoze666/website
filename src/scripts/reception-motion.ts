export const receptionDuration = 3.2;

type Point = readonly [number, number];
type Packet = {
  kind: string;
  start: number;
  points: readonly [Point, Point, Point, Point];
};

export const receptionPackets: readonly Packet[] = [
  {
    kind: 'voice',
    start: 0,
    points: [
      [224, 48],
      [224, 146],
      [272, 228],
      [292, 324],
    ],
  },
  {
    kind: 'text',
    start: 0.1,
    points: [
      [310, 26],
      [310, 134],
      [310, 232],
      [310, 332],
    ],
  },
  {
    kind: 'data',
    start: 0.2,
    points: [
      [396, 52],
      [396, 152],
      [348, 232],
      [328, 324],
    ],
  },
];

export const receptionPath = ({ points: [a, b, c, d] }: Packet) =>
  `M${a.join(' ')}C${b.join(' ')} ${c.join(' ')} ${d.join(' ')}`;

// Zero velocity and acceleration at each phase boundary prevent sudden starts
// and stops. The result depends on elapsed time, never a fixed frame count.
function ease(time: number, start: number, end: number) {
  const t = Math.max(0, Math.min(1, (time - start) / (end - start)));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

export function receptionFrame(time: number) {
  const t = Math.max(0, Math.min(receptionDuration, time));
  return {
    packets: receptionPackets.map(({ start, points }) => {
      const progress = ease(t, start, start + 1.3);
      const position = (axis: 0 | 1) =>
        (1 - progress) ** 3 * points[0][axis] +
        3 * (1 - progress) ** 2 * progress * points[1][axis] +
        3 * (1 - progress) * progress ** 2 * points[2][axis] +
        progress ** 3 * points[3][axis];
      return {
        x: position(0),
        y: position(1),
        opacity:
          ease(t, start, start + 0.14) *
          (1 - ease(t, start + 1.06, start + 1.3)),
        scale: 1 - 0.3 * ease(t, start + 0.95, start + 1.3),
      };
    }),
    trails: 0.16 * ease(t, 0, 0.18) * (1 - ease(t, 1.28, 1.6)),
    note: ease(t, 1.2, 1.62),
    openFlap: 1 - ease(t, 1.5, 1.9),
    closedFlap: ease(t, 1.9, 2.3),
    envelopeY: 80 - 125 * ease(t, 2.1, 2.98),
    tick: ease(t, 2.98, receptionDuration),
  };
}
