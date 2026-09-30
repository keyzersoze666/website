import {
  storageKeys,
  readStoredValue,
  clearStoredValues,
} from './browser-storage';
import {
  components,
  capabilities,
  triggerTypes,
  parseSampleValues,
  type Scenario,
  fields,
  scenarios,
  invoiceTemplate,
  createNode,
  newDraft,
  cloneDraft,
  connect,
  portsFor,
  portLabel,
  validateDraft,
  parseDraft,
  simulate,
  id,
  type WorkflowDraft,
  type WorkflowEdge,
  type NodeKind,
  type NodeConfig,
  type Port,
  type Walkthrough,
} from './workflow-model.ts';

const STORAGE_KEY = storageKeys.workflows;
const WIDTH = 214,
  HEIGHT = 104;
const SVG_NS = 'http://www.w3.org/2000/svg';
function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text?: string,
  className?: string
): HTMLElementTagNameMap[K] {
  const result = document.createElement(tag);
  if (text !== undefined) result.textContent = text;
  if (className) result.className = className;
  return result;
}
function svgElement<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number> = {},
  text?: string
): SVGElementTagNameMap[K] {
  const result = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs))
    result.setAttribute(key, String(value));
  if (text !== undefined) result.textContent = text;
  return result;
}
function button(text: string, action: string): HTMLButtonElement {
  const result = element('button', text);
  result.type = 'button';
  result.dataset.wfAction = action;
  return result;
}
function labelled(label: string, control: HTMLElement): HTMLLabelElement {
  const wrapper = element('label');
  wrapper.append(element('span', label), control);
  return wrapper;
}
function pathFor(
  edge: WorkflowEdge,
  draft: WorkflowDraft
): { path: string; x: number; y: number } {
  const source = draft.nodes.find((n) => n.id === edge.source)!,
    target = draft.nodes.find((n) => n.id === edge.target)!;
  const ports = portsFor(source.kind),
    index = ports.indexOf(edge.port);
  let x1 = source.x + (WIDTH * (index + 1)) / (ports.length + 1),
    y1 = source.y + HEIGHT,
    x2 = target.x + WIDTH / 2,
    y2 = target.y;
  if (
    Math.abs(target.x - source.x) > 260 &&
    Math.abs(target.y - source.y) < 160
  ) {
    const right = target.x > source.x;
    x1 = source.x + (right ? WIDTH : 0);
    y1 = source.y + HEIGHT / 2;
    x2 = target.x + (right ? 0 : WIDTH);
    y2 = target.y + HEIGHT / 2;
    const distance = Math.max(45, Math.abs(x2 - x1) / 2);
    return {
      path: `M ${x1} ${y1} C ${x1 + (right ? distance : -distance)} ${y1}, ${x2 + (right ? -distance : distance)} ${y2}, ${x2} ${y2}`,
      x: (x1 + x2) / 2,
      y: (y1 + y2) / 2 - 8,
    };
  }
  const distance = Math.max(45, Math.abs(y2 - y1) / 2);
  return {
    path: `M ${x1} ${y1} C ${x1} ${y1 + distance}, ${x2} ${y2 - distance}, ${x2} ${y2}`,
    x: (x1 + x2) / 2 + 8,
    y: (y1 + y2) / 2,
  };
}

function initialiseWorkflowDesigner(root: HTMLElement) {
  const query = <T extends HTMLElement>(selector: string) => {
    const found = root.querySelector<T>(selector);
    if (!found) throw new Error(`Missing designer element: ${selector}`);
    return found;
  };
  const canvas = query<HTMLDivElement>('[data-wf-canvas]'),
    world = query<HTMLDivElement>('[data-wf-world]'),
    area = query<HTMLDivElement>('[data-wf-area]');
  const nodesHost = query<HTMLDivElement>('[data-wf-nodes]'),
    edgesHost = root.querySelector<SVGSVGElement>('[data-wf-edges]')!;
  const inspector = query<HTMLDivElement>('[data-wf-inspector]'),
    status = query<HTMLParagraphElement>('[data-wf-status]');
  const nameInput = query<HTMLInputElement>('[data-wf-name]'),
    draftSelect = query<HTMLSelectElement>('[data-wf-drafts]'),
    scenarioSelect = query<HTMLSelectElement>('[data-wf-scenario]');
  const workspace = new Map<
    string,
    { draft: WorkflowDraft; undo: WorkflowDraft[]; redo: WorkflowDraft[] }
  >();
  let draft = newDraft(),
    selected: string | null = null,
    connecting: { source: string; port: Port } | null = null,
    zoom = 1;
  let result: Walkthrough | null = null,
    decisions: Record<string, 'approved' | 'rejected' | 'resolved'> = {},
    validationOpen = false;
  let illustrationScenario = 'matching';
  let customValues: Scenario['values'] | null = null;
  function currentScenario(): Scenario {
    const base =
      scenarios.find((s) => s.id === scenarioSelect.value) ?? scenarios[0];
    return customValues
      ? {
          ...base,
          values: customValues,
          description: 'Using your custom sample values.',
        }
      : base;
  }
  const addToWorkspace = (next: WorkflowDraft) =>
    workspace.set(next.id, { draft: next, undo: [], redo: [] });
  addToWorkspace(draft);
  let storageMessage = '';
  try {
    const saved = readStoredValue(localStorage, 'workflows');
    if (saved) {
      const items = JSON.parse(saved);
      if (!Array.isArray(items) || items.length > 8)
        throw new Error('Invalid saved drafts.');
      for (const item of items) {
        const parsed = parseDraft(JSON.stringify(item));
        addToWorkspace(parsed);
      }
    }
  } catch {
    storageMessage =
      'Saved drafts could not be read. You can still design and export a workflow.';
  }
  const entry = () => workspace.get(draft.id)!;
  const announce = (message: string) => {
    status.textContent = message;
  };
  function clearWalkthrough() {
    result = null;
    decisions = {};
  }
  function commit(next: WorkflowDraft, message = 'Design updated.') {
    entry().undo.push(cloneDraft(draft));
    if (entry().undo.length > 40) entry().undo.shift();
    entry().redo = [];
    draft = next;
    entry().draft = draft;
    clearWalkthrough();
    if (selected && !draft.nodes.some((n) => n.id === selected))
      selected = null;
    connecting = null;
    render();
    announce(message);
  }
  function switchDraft(next: WorkflowDraft) {
    customValues = null;
    draft = next;
    selected = null;
    connecting = null;
    clearWalkthrough();
    validationOpen = false;
    zoom = 0.85;
    render();
    canvas.scrollTop = 0;
    canvas.scrollLeft = 0;
  }
  function bounds() {
    return {
      width: Math.max(900, ...draft.nodes.map((n) => n.x + WIDTH + 70)),
      height: Math.max(580, ...draft.nodes.map((n) => n.y + HEIGHT + 70)),
    };
  }
  function updateScale() {
    const size = bounds();
    world.style.width = `${size.width}px`;
    world.style.height = `${size.height}px`;
    world.style.transform = `scale(${zoom})`;
    area.style.width = `${size.width * zoom}px`;
    area.style.height = `${size.height * zoom}px`;
    edgesHost.setAttribute('width', String(size.width));
    edgesHost.setAttribute('height', String(size.height));
    query<HTMLOutputElement>('[data-wf-zoom]').value =
      `${Math.round(zoom * 100)}%`;
  }
  function renderEdges() {
    edgesHost.replaceChildren();
    for (const edge of draft.edges) {
      const route = pathFor(edge, draft),
        active = result?.edgeIds.includes(edge.id);
      const path = svgElement('path', {
        d: route.path,
        fill: 'none',
        class: `wf-edge${active ? ' is-traversed' : ''}`,
        tabindex: 0,
        role: 'button',
        'aria-label': `Remove connection: ${draft.nodes.find((n) => n.id === edge.source)?.label}, ${portLabel(edge.port)}, to ${draft.nodes.find((n) => n.id === edge.target)?.label}`,
      });
      path.dataset.edge = edge.id;
      edgesHost.append(path);
      if (edge.port !== 'next')
        edgesHost.append(
          svgElement(
            'text',
            { x: route.x, y: route.y, class: 'wf-edge-label' },
            portLabel(edge.port)
          )
        );
    }
  }
  function markSelection() {
    for (const node of nodesHost.querySelectorAll<HTMLElement>('[data-node]')) {
      node.classList.toggle('is-selected', node.dataset.node === selected);
      node.classList.toggle(
        'is-connecting',
        node.dataset.node === connecting?.source
      );
    }
  }
  function renderCanvas() {
    nodesHost.replaceChildren();
    const issues = validationOpen ? validateDraft(draft) : [];
    for (const node of draft.nodes) {
      const definition = components.find((c) => c.kind === node.kind)!;
      const wrapper = element('div', undefined, `wf-node wf-kind-${node.kind}`);
      wrapper.dataset.node = node.id;
      wrapper.style.left = `${node.x}px`;
      wrapper.style.top = `${node.y}px`;
      if (issues.some((i) => i.nodeId === node.id))
        wrapper.classList.add('has-issue');
      const trace = result?.trace.find((item) => item.nodeId === node.id);
      if (trace) wrapper.classList.add(`is-${trace.state}`);
      const select = element('button', undefined, 'wf-node-select');
      select.type = 'button';
      select.dataset.select = node.id;
      select.setAttribute(
        'aria-label',
        `Configure ${node.label}. Use arrow keys to move.`
      );
      select.append(
        element('span', definition.short, 'wf-node-symbol'),
        element('span', node.label, 'wf-node-label')
      );
      const meta = element('div', undefined, 'wf-node-meta');
      meta.append(element('span', definition.label));
      if (trace) meta.append(element('span', trace.state));
      const outputs = element('div', undefined, 'wf-node-ports');
      for (const port of portsFor(node.kind)) {
        const output = element('button', portLabel(port));
        output.type = 'button';
        output.dataset.portSource = node.id;
        output.dataset.port = port;
        output.setAttribute(
          'aria-label',
          `Connect ${node.label}, ${portLabel(port)} output`
        );
        outputs.append(output);
      }
      wrapper.append(select, meta, outputs);
      nodesHost.append(wrapper);
    }
    query<HTMLElement>('[data-wf-empty]').hidden = draft.nodes.length > 0;
    query<HTMLElement>('[data-wf-step-count]').textContent =
      `${draft.nodes.length} step${draft.nodes.length === 1 ? '' : 's'} · ${draft.edges.length} connection${draft.edges.length === 1 ? '' : 's'}`;
    updateScale();
    renderEdges();
    markSelection();
  }
  function textInput(value: string, key: string, multiline = false) {
    const input = multiline ? element('textarea') : element('input');
    input.value = value;
    input.dataset.config = key;
    input.maxLength = 2000;
    if (input instanceof HTMLTextAreaElement) input.rows = 3;
    return input;
  }
  function selectInput(
    options: readonly (readonly [string, string])[],
    value: string,
    key: string
  ) {
    const select = element('select');
    select.dataset.config = key;
    for (const [v, label] of options) {
      const option = element('option', label);
      option.value = v;
      select.append(option);
    }
    select.value = value;
    return select;
  }
  function renderInspector() {
    inspector.replaceChildren();
    const node = draft.nodes.find((n) => n.id === selected);
    if (!node) {
      inspector.append(
        element(
          'p',
          'Select a step to define its task, configuration and connections.'
        )
      );
      return;
    }
    const definition = components.find((c) => c.kind === node.kind)!;
    inspector.append(
      element('span', definition.label, 'wf-inspector-type'),
      element('p', definition.description, 'wf-inspector-description')
    );
    const form = element('form');
    form.dataset.nodeForm = node.id;
    const label = textInput(node.label, 'label');
    label.maxLength = 100;
    form.append(labelled('Step name', label));
    if (node.kind === 'trigger')
      form.append(
        labelled(
          'Trigger type',
          selectInput(
            triggerTypes.map((value) => [value, value] as const),
            node.config.triggerType,
            'triggerType'
          )
        )
      );
    if (['model', 'retrieval', 'tool', 'retry'].includes(node.kind)) {
      form.append(
        labelled(
          'Design input reference',
          textInput(node.config.inputSource, 'inputSource')
        )
      );
      form.append(
        labelled(
          'Target output name',
          textInput(node.config.outputName, 'outputName')
        )
      );
    }
    if (node.kind === 'model') {
      form.append(
        labelled(
          'Model capability',
          selectInput(
            capabilities.map((c) => [c, c] as const),
            node.config.capability,
            'capability'
          )
        )
      );
      form.append(
        labelled(
          'Model / deployment reference',
          textInput(node.config.resource, 'resource')
        )
      );
      form.append(
        element(
          'p',
          'Use a design reference. This workspace has no model connection.',
          'wf-field-note'
        )
      );
    }
    if (
      ['model', 'tool', 'retry', 'output', 'approval', 'trigger'].includes(
        node.kind
      )
    )
      form.append(
        labelled(
          node.kind === 'trigger'
            ? 'Input description'
            : 'Task or target outcome',
          textInput(node.config.instruction, 'instruction', true)
        )
      );
    if (['retrieval', 'tool', 'retry'].includes(node.kind))
      form.append(
        labelled(
          'Knowledge source or business system',
          textInput(node.config.resource, 'resource')
        )
      );
    if (node.kind === 'condition') {
      const sampleField = textInput(node.config.field, 'field');
      sampleField.setAttribute('list', 'wf-field-suggestions');
      form.append(labelled('Sample field', sampleField));
      form.append(
        labelled(
          'Comparison',
          selectInput(
            [
              ['equals', 'Equals'],
              ['notEquals', 'Does not equal'],
              ['greaterThan', 'Greater than'],
              ['lessThan', 'Less than'],
              ['contains', 'Contains'],
            ],
            node.config.operator,
            'operator'
          )
        )
      );
      form.append(labelled('Value', textInput(node.config.value, 'value')));
      form.append(
        element(
          'p',
          'Use true / false for flags and numbers for amounts.',
          'wf-field-note'
        )
      );
    }
    if (node.kind === 'approval')
      form.append(
        labelled(
          'Responsible reviewer',
          textInput(node.config.approver, 'approver')
        )
      );
    if (node.kind === 'wait')
      form.append(
        labelled('Event to wait for', textInput(node.config.waitFor, 'waitFor'))
      );
    if (node.kind === 'retry') {
      const attempts = element('input');
      attempts.type = 'number';
      attempts.min = '1';
      attempts.max = '5';
      attempts.value = String(node.config.maxAttempts);
      attempts.dataset.config = 'maxAttempts';
      form.append(labelled('Maximum sample attempts', attempts));
      form.append(
        labelled(
          'Action identity field',
          selectInput(fields, node.config.deduplicationKey, 'deduplicationKey')
        )
      );
    }
    const apply = element('button', 'Apply configuration', 'wf-primary');
    apply.type = 'submit';
    form.append(apply);
    inspector.append(form);
    const movement = element('div', undefined, 'wf-movement');
    movement.setAttribute('role', 'group');
    movement.setAttribute('aria-label', 'Move selected step');
    for (const [text, dx, dy] of [
      ['Up', 0, -40],
      ['Left', -40, 0],
      ['Right', 40, 0],
      ['Down', 0, 40],
    ] as const) {
      const b = button(text, 'move');
      b.dataset.dx = String(dx);
      b.dataset.dy = String(dy);
      movement.append(b);
    }
    inspector.append(movement);
    if (portsFor(node.kind).length) {
      const connections = element('section', undefined, 'wf-connections');
      connections.append(element('h4', 'Connections'));
      for (const edge of draft.edges.filter((e) => e.source === node.id)) {
        const row = element('div', undefined, 'wf-connection-row');
        row.append(
          element(
            'span',
            `${portLabel(edge.port)}: ${draft.nodes.find((n) => n.id === edge.target)?.label}`
          )
        );
        const remove = button('Remove', 'remove-edge');
        remove.dataset.edge = edge.id;
        row.append(remove);
        connections.append(row);
      }
      const connectForm = element('form');
      connectForm.dataset.connectionForm = node.id;
      const output = element('select');
      output.name = 'port';
      for (const port of portsFor(node.kind)) {
        const o = element('option', portLabel(port));
        o.value = port;
        output.append(o);
      }
      const target = element('select');
      target.name = 'target';
      target.append(element('option', 'Choose a destination'));
      target.options[0].value = '';
      for (const candidate of draft.nodes.filter(
        (n) => n.id !== node.id && n.kind !== 'trigger'
      )) {
        const o = element('option', candidate.label);
        o.value = candidate.id;
        target.append(o);
      }
      const add = element('button', 'Add connection');
      add.type = 'submit';
      connectForm.append(
        labelled('Output', output),
        labelled('Destination', target),
        add
      );
      connections.append(connectForm);
      inspector.append(connections);
    }
    inspector.append(button('Delete step', 'delete'));
  }
  function renderIssues() {
    const section = query<HTMLElement>('[data-wf-validation]');
    section.hidden = !validationOpen;
    if (!validationOpen) return;
    const issues = validateDraft(draft),
      host = query<HTMLElement>('[data-wf-issues]');
    host.replaceChildren();
    if (!issues.length) {
      host.append(
        element(
          'p',
          'The design is connected and ready for a sample walkthrough. Live integration details still need project configuration.'
        )
      );
      return;
    }
    host.append(
      element(
        'p',
        `${issues.length} item${issues.length === 1 ? '' : 's'} to resolve.`
      )
    );
    const list = element('ul');
    for (const issue of issues) {
      const li = element('li');
      if (issue.nodeId) {
        const b = button(issue.message, 'focus');
        b.dataset.nodeId = issue.nodeId;
        li.append(b);
      } else li.textContent = issue.message;
      list.append(li);
    }
    host.append(list);
  }
  function renderSample() {
    const scenario = currentScenario();
    query<HTMLElement>('[data-wf-scenario-description]').textContent =
      scenario.description;
    query<HTMLTextAreaElement>('[data-wf-custom-values]').value =
      JSON.stringify(scenario.values, null, 2);
    const host = query<HTMLElement>('[data-wf-sample-values]');
    host.replaceChildren();
    for (const [key, value] of Object.entries(scenario.values)) {
      const item = element('div');
      item.append(element('dt', key), element('dd', String(value)));
      host.append(item);
    }
    const trace = query<HTMLElement>('[data-wf-trace]');
    trace.replaceChildren();
    if (!result) {
      trace.append(
        element(
          'p',
          'Open an example or finish a design, then start a sample walkthrough.'
        )
      );
      return;
    }
    if (result.error) {
      trace.append(element('p', result.error, 'wf-error-message'));
      return;
    }
    trace.append(
      element(
        'p',
        result.complete
          ? 'Sample walkthrough complete. No real action was taken.'
          : `${result.pending.length} sample review or wait step(s) need a decision.`,
        'wf-trace-summary'
      )
    );
    const list = element('ol');
    for (const item of result.trace) {
      const li = element('li', undefined, `wf-trace-${item.state}`);
      const focus = button(item.label, 'focus');
      focus.dataset.nodeId = item.nodeId;
      li.append(focus, element('p', item.detail));
      if (item.state === 'waiting') {
        const node = draft.nodes.find((n) => n.id === item.nodeId)!;
        const actions = element('div', undefined, 'wf-review-actions');
        const values =
          node.kind === 'approval'
            ? [
                ['Approve sample', 'approved'],
                ['Reject sample', 'rejected'],
              ]
            : [['Resolve sample wait', 'resolved']];
        for (const [label, value] of values) {
          const b = button(label, 'decision');
          b.dataset.nodeId = item.nodeId;
          b.dataset.decision = value;
          actions.append(b);
        }
        li.append(actions);
      }
      list.append(li);
    }
    trace.append(list);
  }
  function render() {
    nameInput.value = draft.name;
    draftSelect.replaceChildren();
    for (const item of workspace.values()) {
      const option = element('option', item.draft.name || 'Untitled workflow');
      option.value = item.draft.id;
      draftSelect.append(option);
    }
    draftSelect.value = draft.id;
    query<HTMLButtonElement>('[data-wf-action="undo"]').disabled =
      !entry().undo.length;
    query<HTMLButtonElement>('[data-wf-action="redo"]').disabled =
      !entry().redo.length;
    renderCanvas();
    renderInspector();
    renderIssues();
    renderSample();
  }
  function focusNode(nodeId: string, focus = true) {
    selected = nodeId;
    markSelection();
    renderInspector();
    const node = draft.nodes.find((n) => n.id === nodeId);
    if (node) {
      canvas.scrollLeft = Math.max(
        0,
        (node.x + WIDTH / 2) * zoom - (canvas.clientWidth || 600) / 2
      );
      canvas.scrollTop = Math.max(0, node.y * zoom - 100);
      if (focus)
        nodesHost
          .querySelector<HTMLButtonElement>(`[data-select="${nodeId}"]`)
          ?.focus({ preventScroll: true });
    }
  }
  function addComponent(kind: NodeKind, x?: number, y?: number) {
    if (draft.nodes.length >= 80) {
      announce('A draft supports up to 80 steps.');
      return;
    }
    const next = cloneDraft(draft);
    const node = createNode(
      kind,
      x ?? 60 + (draft.nodes.length % 3) * 260,
      y ?? 70 + Math.floor(draft.nodes.length / 3) * 160
    );
    node.x = Math.max(0, Math.min(9500, node.x));
    node.y = Math.max(0, Math.min(9500, node.y));
    next.nodes.push(node);
    selected = node.id;
    commit(next, `${node.label} added. Configure it, then connect its output.`);
    focusNode(node.id);
  }
  function addConnection(source: string, target: string, port: Port) {
    try {
      commit(connect(draft, source, target, port), 'Connection added.');
    } catch (error) {
      announce(
        error instanceof Error
          ? error.message
          : 'Connection could not be added.'
      );
    }
  }
  function runWalkthrough() {
    validationOpen = true;
    const scenario = currentScenario();
    result = simulate(draft, scenario, decisions);
    renderCanvas();
    renderIssues();
    renderSample();
    announce(
      result.error
        ? `Check the design: ${result.error}`
        : result.complete
          ? 'Sample walkthrough completed. No live action was taken.'
          : 'Sample walkthrough is waiting for a decision.'
    );
  }
  function loadExample(scenario = 'matching', walk = false) {
    const next = invoiceTemplate();
    addToWorkspace(next);
    switchDraft(next);
    zoom = 0.7;
    updateScale();
    scenarioSelect.value = scenario;
    renderSample();
    announce(
      'Invoice example opened as a separate draft. Other drafts remain available in Open draft.'
    );
    if (walk) runWalkthrough();
  }
  function changeZoom(next: number) {
    const centreX =
        (canvas.scrollLeft + (canvas.clientWidth || 600) / 2) / zoom,
      centreY = (canvas.scrollTop + (canvas.clientHeight || 500) / 2) / zoom;
    zoom = Math.max(0.25, Math.min(1.5, next));
    updateScale();
    canvas.scrollLeft = Math.max(
      0,
      centreX * zoom - (canvas.clientWidth || 600) / 2
    );
    canvas.scrollTop = Math.max(
      0,
      centreY * zoom - (canvas.clientHeight || 500) / 2
    );
  }
  function download(data: string, type: string, extension: string) {
    const url = URL.createObjectURL(new Blob([data], { type }));
    const link = element('a');
    link.href = url;
    link.download = `${
      draft.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'workflow'
    }.${extension}`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    announce(`${extension.toUpperCase()} exported to your device.`);
  }
  function exportDiagram() {
    const size = bounds(),
      svg = svgElement('svg', {
        xmlns: SVG_NS,
        width: size.width,
        height: size.height + 65,
        viewBox: `0 0 ${size.width} ${size.height + 65}`,
      });
    svg.append(
      svgElement('rect', {
        width: size.width,
        height: size.height + 65,
        fill: '#faf9f5',
      })
    );
    svg.append(
      svgElement(
        'text',
        {
          x: 25,
          y: 32,
          fill: '#202e28',
          'font-family': 'Arial, sans-serif',
          'font-size': 20,
        },
        `${draft.name} — SAMVIT Labs workflow design`
      )
    );
    const group = svgElement('g', { transform: 'translate(0 55)' });
    for (const edge of draft.edges) {
      const route = pathFor(edge, draft);
      group.append(
        svgElement('path', {
          d: route.path,
          stroke: '#82988a',
          'stroke-width': 2,
          fill: 'none',
        })
      );
      if (edge.port !== 'next')
        group.append(
          svgElement(
            'text',
            {
              x: route.x,
              y: route.y,
              fill: '#225d47',
              'font-size': 12,
              'font-family': 'Arial, sans-serif',
            },
            portLabel(edge.port)
          )
        );
    }
    for (const node of draft.nodes) {
      group.append(
        svgElement('rect', {
          x: node.x,
          y: node.y,
          width: WIDTH,
          height: HEIGHT,
          rx: 8,
          fill: '#fefdf9',
          stroke: '#225d47',
        })
      );
      group.append(
        svgElement(
          'text',
          {
            x: node.x + 14,
            y: node.y + 24,
            fill: '#627067',
            'font-size': 11,
            'font-family': 'Arial, sans-serif',
          },
          components.find((c) => c.kind === node.kind)!.label
        )
      );
      const words = node.label.split(' ');
      let line = '',
        lines: string[] = [];
      for (const word of words) {
        if ((line + ' ' + word).trim().length > 25 && line) {
          lines.push(line);
          line = word;
        } else line = (line + ' ' + word).trim();
      }
      if (line) lines.push(line);
      lines.slice(0, 3).forEach((text, index) =>
        group.append(
          svgElement(
            'text',
            {
              x: node.x + 14,
              y: node.y + 47 + index * 18,
              fill: '#202e28',
              'font-size': 14,
              'font-family': 'Arial, sans-serif',
            },
            text
          )
        )
      );
    }
    svg.append(group);
    download(
      new XMLSerializer().serializeToString(svg),
      'image/svg+xml',
      'svg'
    );
  }
  function saveDraft() {
    try {
      const raw = JSON.parse(
        readStoredValue(localStorage, 'workflows') || '[]'
      );
      const saved: WorkflowDraft[] = Array.isArray(raw)
        ? raw.flatMap((item) => {
            try {
              return [parseDraft(JSON.stringify(item))];
            } catch {
              return [];
            }
          })
        : [];
      const next = saved.filter((item) => item.id !== draft.id);
      next.push(cloneDraft(draft));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next.slice(-8)));
      announce(
        'Draft saved in this browser. The eight most recently saved drafts are retained.'
      );
    } catch {
      announce(
        'Browser storage is unavailable or full. Export JSON to keep your draft.'
      );
    }
  }
  root.addEventListener('click', (event) => {
    const target =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>('button,[data-edge]')
        : null;
    if (!target || target.hasAttribute('disabled')) return;
    if (target.dataset.add) {
      addComponent(target.dataset.add as NodeKind);
      return;
    }
    if (target.dataset.portSource) {
      connecting = {
        source: target.dataset.portSource,
        port: target.dataset.port as Port,
      };
      selected = connecting.source;
      markSelection();
      renderInspector();
      announce(
        `Select the destination for the ${portLabel(connecting.port)} output. Escape cancels.`
      );
      return;
    }
    if (target.dataset.select) {
      if (connecting) {
        addConnection(
          connecting.source,
          target.dataset.select,
          connecting.port
        );
        connecting = null;
        markSelection();
      } else {
        selected = target.dataset.select;
        markSelection();
        renderInspector();
      }
      return;
    }
    if (target.dataset.edge && !target.dataset.wfAction) {
      const next = cloneDraft(draft);
      next.edges = next.edges.filter((e) => e.id !== target.dataset.edge);
      commit(next, 'Connection removed. Undo restores it.');
      return;
    }
    const action = target.dataset.wfAction;
    if (action === 'new') {
      const next = newDraft(`Workflow ${workspace.size + 1}`);
      addToWorkspace(next);
      switchDraft(next);
      announce('New draft opened. Your other drafts remain available.');
    }
    if (action === 'example') loadExample();
    if (action === 'undo' || action === 'redo') {
      const from = action === 'undo' ? entry().undo : entry().redo,
        to = action === 'undo' ? entry().redo : entry().undo;
      if (from.length) {
        to.push(cloneDraft(draft));
        draft = from.pop()!;
        entry().draft = draft;
        connecting = null;
        clearWalkthrough();
        render();
        announce(action === 'undo' ? 'Change undone.' : 'Change restored.');
      }
    }
    if (action === 'save') saveDraft();
    if (action === 'configure') {
      if (!selected) {
        announce('Select a step on the canvas first.');
        return;
      }
      inspector.closest('aside')?.scrollIntoView({
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'instant'
          : 'smooth',
        block: 'start',
      });
      inspector
        .querySelector<HTMLInputElement>('input')
        ?.focus({ preventScroll: true });
    }
    if (action === 'apply-sample') {
      try {
        customValues = parseSampleValues(
          query<HTMLTextAreaElement>('[data-wf-custom-values]').value
        );
        clearWalkthrough();
        renderSample();
        renderCanvas();
        announce(
          'Custom sample values applied. Start the walkthrough to evaluate your conditions.'
        );
      } catch (error) {
        announce(
          error instanceof Error ? error.message : 'Invalid sample values.'
        );
      }
    }
    if (action === 'reset-sample') {
      customValues = null;
      clearWalkthrough();
      renderSample();
      renderCanvas();
      announce('Selected scenario values restored.');
    }
    if (action === 'validate') {
      validationOpen = true;
      renderIssues();
      renderCanvas();
      announce(`${validateDraft(draft).length} design issue(s) found.`);
    }
    if (action === 'delete' && selected) {
      const next = cloneDraft(draft);
      next.nodes = next.nodes.filter((n) => n.id !== selected);
      next.edges = next.edges.filter(
        (e) => e.source !== selected && e.target !== selected
      );
      selected = null;
      commit(next, 'Step and its connections removed. Undo restores them.');
    }
    if (action === 'move' && selected) {
      const next = cloneDraft(draft),
        node = next.nodes.find((n) => n.id === selected)!;
      node.x = Math.max(0, Math.min(9500, node.x + Number(target.dataset.dx)));
      node.y = Math.max(0, Math.min(9500, node.y + Number(target.dataset.dy)));
      commit(next, 'Step moved.');
    }
    if (action === 'remove-edge') {
      const next = cloneDraft(draft);
      next.edges = next.edges.filter((e) => e.id !== target.dataset.edge);
      commit(next, 'Connection removed.');
    }
    if (action === 'focus' && target.dataset.nodeId)
      focusNode(target.dataset.nodeId);
    if (action === 'zoom-in') changeZoom(zoom + 0.1);
    if (action === 'zoom-out') changeZoom(zoom - 0.1);
    if (action === 'fit') {
      const size = bounds();
      zoom = Math.max(
        0.25,
        Math.min(
          1,
          (canvas.clientWidth || 600) / size.width,
          (canvas.clientHeight || 500) / size.height
        )
      );
      updateScale();
      canvas.scrollLeft = 0;
      canvas.scrollTop = 0;
    }
    if (action === 'export-json')
      download(JSON.stringify(draft, null, 2), 'application/json', 'json');
    if (action === 'export-svg') exportDiagram();
    if (action === 'import')
      query<HTMLInputElement>('[data-wf-import]').click();
    if (action === 'walkthrough') {
      decisions = {};
      runWalkthrough();
    }
    if (action === 'decision' && target.dataset.nodeId) {
      decisions[target.dataset.nodeId] = target.dataset.decision as
        'approved' | 'rejected' | 'resolved';
      runWalkthrough();
    }
    if (action === 'clear-saved') {
      try {
        clearStoredValues(localStorage, 'workflows');
        announce(
          'Saved browser copies cleared. Open workspace drafts remain available.'
        );
      } catch {
        announce('Browser storage is unavailable.');
      }
    }
  });
  root.addEventListener('submit', (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    event.preventDefault();
    if (form.dataset.nodeForm) {
      const next = cloneDraft(draft),
        node = next.nodes.find((n) => n.id === form.dataset.nodeForm)!;
      for (const input of form.querySelectorAll<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >('[data-config]')) {
        const key = input.dataset.config!;
        if (key === 'label')
          node.label =
            input.value.trim() ||
            components.find((c) => c.kind === node.kind)!.label;
        else if (key === 'maxAttempts') {
          const value = Number(input.value);
          if (!Number.isInteger(value) || value < 1 || value > 5) {
            announce('Use between one and five attempts.');
            return;
          }
          node.config.maxAttempts = value;
        } else
          (node.config[key as keyof NodeConfig] as string) = input.value.trim();
      }
      commit(next, 'Configuration applied.');
    }
    if (form.dataset.connectionForm) {
      const data = new FormData(form);
      if (!data.get('target')) {
        announce('Choose a destination step.');
        return;
      }
      addConnection(
        form.dataset.connectionForm,
        String(data.get('target')),
        data.get('port') as Port
      );
    }
  });
  nameInput.addEventListener('change', () => {
    const next = cloneDraft(draft);
    next.name = nameInput.value.trim() || 'Untitled workflow';
    commit(next, 'Workflow renamed.');
  });
  draftSelect.addEventListener('change', () => {
    const item = workspace.get(draftSelect.value);
    if (item) switchDraft(item.draft);
  });
  scenarioSelect.addEventListener('change', () => {
    customValues = null;
    const wasRunning = !!result;
    clearWalkthrough();
    if (wasRunning) runWalkthrough();
    else {
      renderCanvas();
      renderSample();
    }
  });
  query<HTMLInputElement>('[data-wf-import]').addEventListener(
    'change',
    async (event) => {
      const input = event.target as HTMLInputElement,
        file = input.files?.[0];
      if (!file) return;
      try {
        if (file.size > 250000)
          throw new Error('Choose a workflow JSON file smaller than 250 KB.');
        const next = parseDraft(await file.text());
        next.id = id('draft');
        addToWorkspace(next);
        switchDraft(next);
        announce('Workflow imported as a separate draft.');
      } catch (error) {
        announce(
          error instanceof Error
            ? error.message
            : 'Workflow could not be imported.'
        );
      } finally {
        input.value = '';
      }
    }
  );
  root.addEventListener('dragstart', (event) => {
    const target =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>('[data-add]')
        : null;
    if (!target || !event.dataTransfer) return;
    event.dataTransfer.setData(
      'application/x-samvit-labs-component',
      target.dataset.add!
    );
    event.dataTransfer.effectAllowed = 'copy';
  });
  canvas.addEventListener('dragover', (event) => {
    if (
      event.dataTransfer?.types.includes('application/x-samvit-labs-component')
    ) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    }
  });
  canvas.addEventListener('drop', (event) => {
    const kind = event.dataTransfer?.getData(
      'application/x-samvit-labs-component'
    );
    if (!components.some((c) => c.kind === kind)) return;
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    addComponent(
      kind as NodeKind,
      (event.clientX - rect.left + canvas.scrollLeft) / zoom - WIDTH / 2,
      (event.clientY - rect.top + canvas.scrollTop) / zoom - 30
    );
  });
  let drag: {
    nodeId: string;
    pointer: number;
    startX: number;
    startY: number;
    x: number;
    y: number;
    before: WorkflowDraft;
    moved: boolean;
  } | null = null;
  nodesHost.addEventListener('pointerdown', (event) => {
    const target =
      event.target instanceof Element
        ? event.target.closest<HTMLButtonElement>('[data-select]')
        : null;
    if (!target || connecting || event.button !== 0) return;
    const node = draft.nodes.find((n) => n.id === target.dataset.select)!;
    selected = node.id;
    markSelection();
    renderInspector();
    drag = {
      nodeId: node.id,
      pointer: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      x: node.x,
      y: node.y,
      before: cloneDraft(draft),
      moved: false,
    };
    target.setPointerCapture(event.pointerId);
  });
  nodesHost.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.pointer) return;
    const dx = (event.clientX - drag.startX) / zoom,
      dy = (event.clientY - drag.startY) / zoom;
    if (Math.abs(dx) + Math.abs(dy) < 4 && !drag.moved) return;
    drag.moved = true;
    event.preventDefault();
    const node = draft.nodes.find((n) => n.id === drag!.nodeId)!;
    node.x = Math.max(0, Math.min(9500, drag.x + dx));
    node.y = Math.max(0, Math.min(9500, drag.y + dy));
    const wrapper = nodesHost.querySelector<HTMLElement>(
      `[data-node="${node.id}"]`
    )!;
    wrapper.style.left = `${node.x}px`;
    wrapper.style.top = `${node.y}px`;
    updateScale();
    renderEdges();
  });
  function endDrag() {
    if (!drag) return;
    if (drag.moved) {
      entry().undo.push(drag.before);
      if (entry().undo.length > 40) entry().undo.shift();
      entry().redo = [];
      entry().draft = draft;
      clearWalkthrough();
      render();
      announce('Step moved.');
    }
    drag = null;
  }
  nodesHost.addEventListener('pointerup', endDrag);
  nodesHost.addEventListener('pointercancel', endDrag);
  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      connecting = null;
      markSelection();
      announce('Connection cancelled.');
    }
    const target = event.target instanceof Element ? event.target : null;
    if (
      target?.hasAttribute('data-edge') &&
      (event.key === 'Enter' || event.key === ' ')
    ) {
      event.preventDefault();
      const next = cloneDraft(draft);
      next.edges = next.edges.filter(
        (e) => e.id !== target.getAttribute('data-edge')
      );
      commit(next, 'Connection removed. Undo restores it.');
    }
    if (
      target?.hasAttribute('data-select') &&
      ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)
    ) {
      event.preventDefault();
      const next = cloneDraft(draft),
        node = next.nodes.find(
          (n) => n.id === target.getAttribute('data-select')
        )!,
        amount = event.shiftKey ? 40 : 12;
      node.x = Math.max(
        0,
        Math.min(
          9500,
          node.x +
            (event.key === 'ArrowRight'
              ? amount
              : event.key === 'ArrowLeft'
                ? -amount
                : 0)
        )
      );
      node.y = Math.max(
        0,
        Math.min(
          9500,
          node.y +
            (event.key === 'ArrowDown'
              ? amount
              : event.key === 'ArrowUp'
                ? -amount
                : 0)
        )
      );
      selected = node.id;
      commit(next, 'Step moved.');
      nodesHost
        .querySelector<HTMLButtonElement>(`[data-select="${node.id}"]`)
        ?.focus({ preventScroll: true });
    }
  });
  document
    .querySelectorAll<HTMLButtonElement>('[data-illustration-scenario]')
    .forEach((b) =>
      b.addEventListener('click', () => {
        illustrationScenario = b.dataset.illustrationScenario!;
        document
          .querySelectorAll('[data-illustration-scenario]')
          .forEach((item) =>
            item.setAttribute('aria-pressed', String(item === b))
          );
        document
          .querySelectorAll<HTMLElement>('[data-case-path]')
          .forEach((item) =>
            item.classList.toggle(
              'is-highlighted',
              item.dataset.casePath === illustrationScenario ||
                (illustrationScenario === 'combined' &&
                  ['partial', 'price'].includes(item.dataset.casePath!))
            )
          );
        const description = document.querySelector(
          '[data-illustration-description]'
        );
        if (description)
          description.textContent = scenarios.find(
            (s) => s.id === illustrationScenario
          )!.description;
      })
    );
  document
    .querySelector<HTMLButtonElement>('[data-open-invoice]')
    ?.addEventListener('click', () => {
      loadExample(illustrationScenario, true);
      root.scrollIntoView({
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'instant'
          : 'smooth',
        block: 'start',
      });
      query<HTMLButtonElement>('[data-wf-action="example"]').focus({
        preventScroll: true,
      });
    });
  root
    .querySelectorAll<HTMLButtonElement | HTMLInputElement | HTMLSelectElement>(
      '[data-enable]'
    )
    .forEach((control) => (control.disabled = false));
  render();
  if (storageMessage) announce(storageMessage);
}

const root = document.querySelector<HTMLElement>('[data-workflow-designer]');
if (root) initialiseWorkflowDesigner(root);
