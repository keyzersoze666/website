import {
  currentPath,
  currentEntryPath,
  currentRecords,
  currentStrands,
  currentLayout,
  reviewArc,
  type workflowFrame,
} from './hero-workflow-model';
export interface WorkflowCurrent {
  draw(time: number, frame: ReturnType<typeof workflowFrame>): void;
  dispose(): void;
}
export function createWorkflowCurrent(
  root: HTMLElement
): WorkflowCurrent | undefined {
  const svg = root.querySelector<SVGSVGElement>('[data-woven-current]');
  const pulse = root.querySelector<SVGLinearGradientElement>(
    '[data-current-pulse]'
  );
  const traveler = root.querySelector<SVGGElement>('[data-current-traveler]');
  const scan = root.querySelector<SVGPathElement>('[data-current-scan]');
  if (!svg || !pulse || !traveler || !scan) return;
  const paths = currentStrands.map(({ index }) => [
    ...svg.querySelectorAll<SVGPathElement>(`[data-strand="${index}"]`),
  ]);
  const arcs = [...svg.querySelectorAll<SVGPathElement>('[data-current-arc]')];
  const entries = [
    ...svg.querySelectorAll<SVGPathElement>('[data-current-entry]'),
  ];
  const records = [
    ...svg.querySelectorAll<SVGPathElement>('[data-current-records]'),
  ];
  let disposed = false;
  let previous = -1;
  return {
    draw(_time, frame) {
      if (disposed) return;
      // Avoid rewriting geometry when the frame is unchanged or the reader pauses.
      if (frame.flow !== previous) {
        for (const { index } of currentStrands) {
          const path = currentPath(index, frame.flow);
          paths[index]!.forEach((element) => element.setAttribute('d', path));
        }
        previous = frame.flow;
        const entryPaths = Array.from({ length: 8 }, (_, index) =>
          currentEntryPath(index, frame.flow)
        );
        entries.forEach((entry) =>
          entry.setAttribute(
            'd',
            entryPaths[Number(entry.dataset.currentEntry)]!
          )
        );
        const cluster = currentRecords(frame.flow);
        records.forEach((record) =>
          record.setAttribute(
            'd',
            cluster[record.dataset.currentRecords as keyof typeof cluster]
          )
        );
      }
      const x = currentLayout.left + frame.progress * currentLayout.length;
      pulse.setAttribute('x1', String(x - 56));
      pulse.setAttribute('x2', String(x + 24));
      svg.style.setProperty('--current-review', String(frame.review));
      const tint = [194, 247, 223].map((value, index) =>
        Math.round(value + ([228, 200, 150][index]! - value) * frame.review)
      );
      svg.style.setProperty('color', `rgb(${tint.join(',')})`);
      svg.style.setProperty('--current-glint', String(frame.glint));
      svg.style.setProperty(
        '--current-glint-offset',
        String(frame.glintOffset)
      );
      svg.style.setProperty(
        '--current-pulse-opacity',
        String(frame.pulseOpacity)
      );
      arcs.forEach((arc) =>
        arc.setAttribute(
          'd',
          reviewArc(
            arc.dataset.currentArc === 'front',
            frame.opening,
            frame.sway
          )
        )
      );
      const y = 222 - Math.sin(Math.PI * frame.progress) * 14;
      traveler.setAttribute('transform', `translate(${x} ${y})`);
      traveler.setAttribute(
        'opacity',
        String(
          frame.pulseOpacity *
            Math.min(1, Math.max(0, (frame.progress - 0.3) / 0.15))
        )
      );
      const gateX =
        currentLayout.left + currentLayout.gate * currentLayout.length;
      const sy =
        222 -
        Math.sin(Math.PI * currentLayout.gate) * 14 +
        (frame.sweep - 0.5) * 72;
      scan.setAttribute('d', `M${gateX - 20},${sy} L${gateX + 20},${sy}`);
      scan.setAttribute(
        'opacity',
        String(frame.review * (1 - frame.opening) * 0.5)
      );
    },
    dispose() {
      disposed = true;
    },
  };
}
