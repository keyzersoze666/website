export type NodeKind =
  | 'trigger'
  | 'model'
  | 'retrieval'
  | 'tool'
  | 'condition'
  | 'parallel'
  | 'join'
  | 'approval'
  | 'wait'
  | 'retry'
  | 'output';
export type Port =
  'next' | 'true' | 'false' | 'approved' | 'rejected' | 'failed';
type Operator =
  'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'contains';
export const triggerTypes = ['Message', 'Document text', 'Audio', 'Schedule'];
export interface NodeConfig {
  triggerType: string;
  inputSource: string;
  outputName: string;
  instruction: string;
  capability: string;
  resource: string;
  field: string;
  operator: Operator;
  value: string;
  approver: string;
  maxAttempts: number;
  waitFor: string;
  deduplicationKey: string;
}
interface WorkflowNode {
  id: string;
  kind: NodeKind;
  label: string;
  x: number;
  y: number;
  config: NodeConfig;
}
export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  port: Port;
}
export interface WorkflowDraft {
  version: 1;
  id: string;
  name: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}
interface ComponentDefinition {
  kind: NodeKind;
  label: string;
  group: string;
  short: string;
  description: string;
}
export const components: ComponentDefinition[] = [
  {
    kind: 'trigger',
    label: 'Request trigger',
    group: 'Inputs',
    short: 'IN',
    description: 'A message, document text, audio or scheduled request.',
  },
  {
    kind: 'model',
    label: 'Model step',
    group: 'Models & context',
    short: 'AI',
    description: 'Define a text or speech task and its target output.',
  },
  {
    kind: 'retrieval',
    label: 'Retrieve context',
    group: 'Models & context',
    short: 'KB',
    description: 'Read approved documents or business records.',
  },
  {
    kind: 'tool',
    label: 'System action',
    group: 'Actions',
    short: 'DO',
    description: 'Describe an action in a business system.',
  },
  {
    kind: 'condition',
    label: 'Condition',
    group: 'Logic',
    short: 'IF',
    description: 'Route a value down a Yes or No branch.',
  },
  {
    kind: 'parallel',
    label: 'Parallel paths',
    group: 'Logic',
    short: 'SP',
    description: 'Start several independent checks.',
  },
  {
    kind: 'join',
    label: 'Wait for all paths',
    group: 'Logic',
    short: 'JN',
    description: 'Continue once every incoming path has completed.',
  },
  {
    kind: 'approval',
    label: 'Human approval',
    group: 'People & recovery',
    short: 'OK',
    description: 'Pause for an approval or rejection.',
  },
  {
    kind: 'wait',
    label: 'Wait for information',
    group: 'People & recovery',
    short: 'WT',
    description: 'Pause until a sample event is resolved.',
  },
  {
    kind: 'retry',
    label: 'Retriable action',
    group: 'People & recovery',
    short: 'RT',
    description: 'Try a sample action with a bounded retry policy.',
  },
  {
    kind: 'output',
    label: 'Outcome',
    group: 'Outputs',
    short: 'OUT',
    description: 'Finish with a result, handoff or exception.',
  },
];
export const capabilities = [
  'Text understanding',
  'Structured extraction',
  'Response drafting',
  'Code assistance',
  'Speech recognition',
  'Speech synthesis',
];
export const fields = [
  ['duplicate', 'Possible duplicate'],
  ['quantityMismatch', 'Quantity mismatch'],
  ['priceMismatch', 'Price mismatch'],
  ['amount', 'Invoice amount'],
  ['invoiceReference', 'Invoice reference'],
  ['request', 'Request text'],
] as const;
export const invoicePrompt =
  'When a supplier invoice arrives, extract its details. Check the supplier and possible duplicates, then match the invoice against purchase orders and delivery records. Route quantity differences to receiving and price differences to procurement. Hold the entry until exceptions are resolved, and require finance approval above the configured limit. Create the authorised ERP entry, record the decisions and retry temporary failures without creating duplicates.';
export const id = (prefix = 'step') =>
  `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`}`;
export function newDraft(name = 'Untitled workflow'): WorkflowDraft {
  return { version: 1, id: id('draft'), name, nodes: [], edges: [] };
}
export const cloneDraft = (draft: WorkflowDraft): WorkflowDraft =>
  JSON.parse(JSON.stringify(draft));
export function createNode(
  kind: NodeKind,
  x = 100,
  y = 100,
  nodeId = id()
): WorkflowNode {
  const definition = components.find((c) => c.kind === kind);
  if (!definition) throw new Error('Unknown component.');
  return {
    id: nodeId,
    kind,
    label: definition.label,
    x,
    y,
    config: {
      triggerType: 'Message',
      inputSource: 'request',
      outputName: 'result',
      instruction: '',
      capability: 'Text understanding',
      resource: '',
      field: 'amount',
      operator: 'greaterThan',
      value: '5000',
      approver: '',
      maxAttempts: 3,
      waitFor: 'Information received',
      deduplicationKey: 'invoiceReference',
    },
  };
}
export function portsFor(kind: NodeKind): Port[] {
  if (kind === 'output') return [];
  if (kind === 'condition') return ['true', 'false'];
  if (kind === 'approval') return ['approved', 'rejected'];
  if (kind === 'retry' || kind === 'tool') return ['next', 'failed'];
  return ['next'];
}
export const portLabel = (port: Port) =>
  ({
    next: 'Next',
    true: 'Yes',
    false: 'No',
    approved: 'Approved',
    rejected: 'Rejected',
    failed: 'Failed',
  })[port];
export function connect(
  draft: WorkflowDraft,
  source: string,
  target: string,
  port: Port
): WorkflowDraft {
  const from = draft.nodes.find((n) => n.id === source),
    to = draft.nodes.find((n) => n.id === target);
  if (!from || !to || source === target)
    throw new Error('Choose two different existing steps.');
  if (!portsFor(from.kind).includes(port) || to.kind === 'trigger')
    throw new Error('These steps cannot be connected this way.');
  if (
    draft.edges.some(
      (e) =>
        e.source === source &&
        e.port === port &&
        (e.target === target || from.kind !== 'parallel')
    )
  )
    throw new Error(
      'This output is already connected. Remove its connection first.'
    );
  const result = cloneDraft(draft);
  result.edges.push({ id: id('edge'), source, target, port });
  if (hasCycle(result))
    throw new Error(
      'This connection creates a cycle. Use a bounded retry or wait step instead.'
    );
  return result;
}
function hasCycle(draft: WorkflowDraft): boolean {
  const active = new Set<string>(),
    done = new Set<string>();
  function visit(nodeId: string): boolean {
    if (active.has(nodeId)) return true;
    if (done.has(nodeId)) return false;
    active.add(nodeId);
    for (const edge of draft.edges.filter((e) => e.source === nodeId))
      if (visit(edge.target)) return true;
    active.delete(nodeId);
    done.add(nodeId);
    return false;
  }
  return draft.nodes.some((n) => visit(n.id));
}
interface DesignIssue {
  nodeId?: string;
  message: string;
}
export function validateDraft(draft: WorkflowDraft): DesignIssue[] {
  const issues: DesignIssue[] = [];
  const triggers = draft.nodes.filter((n) => n.kind === 'trigger');
  if (triggers.length !== 1)
    issues.push({ message: 'Use exactly one request trigger.' });
  if (!draft.nodes.some((n) => n.kind === 'output'))
    issues.push({ message: 'Add an outcome to finish the workflow.' });
  if (hasCycle(draft))
    issues.push({
      message:
        'A connection cycle needs to be replaced by a bounded retry or wait step.',
    });
  const reached = new Set<string>();
  function visit(nodeId: string) {
    if (reached.has(nodeId)) return;
    reached.add(nodeId);
    draft.edges
      .filter((e) => e.source === nodeId)
      .forEach((e) => visit(e.target));
  }
  triggers.forEach((n) => visit(n.id));
  for (const node of draft.nodes) {
    const add = (message: string) =>
      issues.push({ nodeId: node.id, message: `${node.label}: ${message}` });
    if (!reached.has(node.id)) add('connect this step to the trigger.');
    const incoming = draft.edges.filter((e) => e.target === node.id),
      outgoing = draft.edges.filter((e) => e.source === node.id);
    if (node.kind === 'join' && incoming.length < 2)
      add('connect at least two incoming paths.');
    if (node.kind === 'parallel' && outgoing.length < 2)
      add('connect at least two outgoing paths.');
    for (const port of portsFor(node.kind))
      if (!outgoing.some((e) => e.port === port))
        add(`connect the ${portLabel(port)} output.`);
    if (
      (node.kind === 'model' ||
        node.kind === 'tool' ||
        node.kind === 'retry') &&
      !node.config.instruction.trim()
    )
      add('describe the task or action.');
    if (
      (node.kind === 'retrieval' ||
        node.kind === 'tool' ||
        node.kind === 'retry') &&
      !node.config.resource.trim()
    )
      add('name the intended knowledge source or system.');
    if (node.kind === 'approval' && !node.config.approver.trim())
      add('name the responsible reviewer.');
    if (node.kind === 'condition') {
      if (!node.config.field.trim()) add('name the sample field to inspect.');
      if (!node.config.value.trim()) add('supply a comparison value.');
      if (
        ['greaterThan', 'lessThan'].includes(node.config.operator) &&
        !Number.isFinite(Number(node.config.value))
      )
        add('use a numeric comparison value.');
    }
    if (
      node.kind === 'retry' &&
      (!Number.isInteger(node.config.maxAttempts) ||
        node.config.maxAttempts < 1 ||
        node.config.maxAttempts > 5)
    )
      add('set between one and five attempts.');
  }
  return issues;
}
export function parseDraft(text: string): WorkflowDraft {
  if (text.length > 250000) throw new Error('The workflow file is too large.');
  const raw = JSON.parse(text);
  const string = (v: unknown, max = 2000): v is string =>
    typeof v === 'string' && v.length <= max;
  const identifier = (v: unknown): v is string =>
    string(v, 80) && /^[a-zA-Z][\w-]*$/.test(v);
  if (
    !raw ||
    raw.version !== 1 ||
    !identifier(raw.id) ||
    !string(raw.name, 100) ||
    !Array.isArray(raw.nodes) ||
    raw.nodes.length > 80 ||
    !Array.isArray(raw.edges) ||
    raw.edges.length > 240
  )
    throw new Error(
      'Choose a supported version 1 workflow file (up to 80 steps).'
    );
  const draft: WorkflowDraft = {
    version: 1,
    id: raw.id,
    name: raw.name,
    nodes: [],
    edges: [],
  };
  const seen = new Set<string>();
  for (const n of raw.nodes) {
    if (
      !n ||
      !identifier(n.id) ||
      seen.has(n.id) ||
      !components.some((c) => c.kind === n.kind) ||
      !string(n.label, 100) ||
      !Number.isFinite(n.x) ||
      !Number.isFinite(n.y) ||
      n.x < 0 ||
      n.y < 0 ||
      n.x > 10000 ||
      n.y > 10000
    )
      throw new Error(
        'A workflow step has an invalid type, identifier or position.'
      );
    const base = createNode(n.kind, n.x, n.y, n.id);
    seen.add(n.id);
    base.label = n.label;
    if (!n.config || typeof n.config !== 'object')
      throw new Error('A step is missing its configuration.');
    for (const key of Object.keys(base.config) as (keyof NodeConfig)[]) {
      if (n.config[key] === undefined) continue;
      if (key === 'maxAttempts') {
        if (
          !Number.isInteger(n.config[key]) ||
          n.config[key] < 1 ||
          n.config[key] > 5
        )
          throw new Error('Invalid retry limit.');
        base.config.maxAttempts = n.config[key];
      } else {
        if (!string(n.config[key]))
          throw new Error('Invalid step configuration.');
        (base.config[key] as string) = n.config[key];
      }
    }
    if (
      !['equals', 'notEquals', 'greaterThan', 'lessThan', 'contains'].includes(
        base.config.operator
      ) ||
      !capabilities.includes(base.config.capability)
    )
      throw new Error('Unsupported model capability or condition operator.');
    draft.nodes.push(base);
  }
  const edgeIds = new Set<string>(),
    endpoints = new Set<string>();
  for (const e of raw.edges) {
    if (!e || typeof e !== 'object')
      throw new Error('A connection is invalid.');
    const source = draft.nodes.find((n) => n.id === e.source),
      target = draft.nodes.find((n) => n.id === e.target);
    if (
      !e ||
      !identifier(e.id) ||
      edgeIds.has(e.id) ||
      !source ||
      !target ||
      source.id === target.id ||
      target.kind === 'trigger' ||
      !portsFor(source.kind).includes(e.port)
    )
      throw new Error('A connection is invalid.');
    const key = `${e.source}:${e.port}`;
    if (
      endpoints.has(`${key}:${e.target}`) ||
      (source.kind !== 'parallel' && endpoints.has(key))
    )
      throw new Error('A workflow output has duplicate connections.');
    edgeIds.add(e.id);
    endpoints.add(key);
    endpoints.add(`${key}:${e.target}`);
    draft.edges.push({
      id: e.id,
      source: e.source,
      target: e.target,
      port: e.port,
    });
  }
  return draft;
}
export interface Scenario {
  id: string;
  name: string;
  description: string;
  values: Record<string, string | number | boolean>;
  temporaryFailures: number;
}
export const scenarios: Scenario[] = [
  {
    id: 'matching',
    name: 'Matching invoice',
    description: 'Records agree. The amount requires finance approval.',
    values: {
      duplicate: false,
      quantityMismatch: false,
      priceMismatch: false,
      amount: 12400,
      invoiceReference: 'INV-2048',
      request: 'Invoice for delivered goods',
    },
    temporaryFailures: 0,
  },
  {
    id: 'partial',
    name: 'Partial delivery',
    description:
      'Only part of the order has arrived. Receiving review is required.',
    values: {
      duplicate: false,
      quantityMismatch: true,
      priceMismatch: false,
      amount: 12400,
      invoiceReference: 'INV-2048',
      request: 'Invoice with a partial delivery',
    },
    temporaryFailures: 0,
  },
  {
    id: 'price',
    name: 'Price discrepancy',
    description: 'The invoice price differs from the purchase order.',
    values: {
      duplicate: false,
      quantityMismatch: false,
      priceMismatch: true,
      amount: 12400,
      invoiceReference: 'INV-2048',
      request: 'Invoice with a price difference',
    },
    temporaryFailures: 0,
  },
  {
    id: 'combined',
    name: 'Multiple exceptions',
    description:
      'A partial delivery and a price difference need separate reviews.',
    values: {
      duplicate: false,
      quantityMismatch: true,
      priceMismatch: true,
      amount: 12400,
      invoiceReference: 'INV-2048',
      request: 'Invoice referencing two orders with different exceptions',
    },
    temporaryFailures: 0,
  },
  {
    id: 'duplicate',
    name: 'Possible duplicate',
    description:
      'The reference has already appeared. Posting stops for review.',
    values: {
      duplicate: true,
      quantityMismatch: false,
      priceMismatch: false,
      amount: 12400,
      invoiceReference: 'INV-2048',
      request: 'Possible duplicate invoice',
    },
    temporaryFailures: 0,
  },
  {
    id: 'retry',
    name: 'Temporary system failure',
    description:
      'The first sample posting attempt fails; a bounded retry recovers.',
    values: {
      duplicate: false,
      quantityMismatch: false,
      priceMismatch: false,
      amount: 2400,
      invoiceReference: 'INV-2048',
      request: 'Invoice with a temporary ERP failure',
    },
    temporaryFailures: 1,
  },
  {
    id: 'failure',
    name: 'System remains unavailable',
    description:
      'All sample attempts fail and the workflow follows its recovery path.',
    values: {
      duplicate: false,
      quantityMismatch: false,
      priceMismatch: false,
      amount: 2400,
      invoiceReference: 'INV-2048',
      request: 'Invoice with an unavailable ERP',
    },
    temporaryFailures: 5,
  },
];
export function evaluateCondition(
  config: NodeConfig,
  values: Scenario['values']
): boolean {
  const actual = Object.hasOwn(values, config.field)
    ? values[config.field]
    : undefined;
  if (actual === undefined)
    throw new Error(`The sample has no value for ${config.field}.`);
  if (config.operator === 'greaterThan' || config.operator === 'lessThan') {
    if (typeof actual !== 'number' || !Number.isFinite(Number(config.value)))
      throw new Error('Numeric conditions require numeric values.');
    return config.operator === 'greaterThan'
      ? actual > Number(config.value)
      : actual < Number(config.value);
  }
  if (config.operator === 'contains')
    return String(actual).toLowerCase().includes(config.value.toLowerCase());
  const matches = String(actual).toLowerCase() === config.value.toLowerCase();
  return config.operator === 'notEquals' ? !matches : matches;
}
interface TraceEntry {
  nodeId: string;
  label: string;
  detail: string;
  state: 'completed' | 'waiting' | 'failed';
}
export interface Walkthrough {
  trace: TraceEntry[];
  edgeIds: string[];
  pending: string[];
  complete: boolean;
  error?: string;
}
export function simulate(
  draft: WorkflowDraft,
  scenario: Scenario,
  decisions: Record<string, 'approved' | 'rejected' | 'resolved'> = {}
): Walkthrough {
  const result: Walkthrough = {
    trace: [],
    edgeIds: [],
    pending: [],
    complete: false,
  };
  const issues = validateDraft(draft);
  if (issues.length) return { ...result, error: issues[0].message };
  const completed = new Set<string>(),
    arrived = new Map<string, Set<string>>();
  const queue = draft.nodes
    .filter((n) => n.kind === 'trigger')
    .map((n) => n.id);
  let outcomes = 0,
    visits = 0;
  while (queue.length && visits++ < 500) {
    const nextId = queue.shift();
    const node = draft.nodes.find((n) => n.id === nextId)!;
    if (completed.has(node.id)) continue;
    if (
      node.kind === 'join' &&
      draft.edges
        .filter((e) => e.target === node.id)
        .some((e) => !arrived.get(node.id)?.has(e.id))
    )
      continue;
    let ports: Port[] = ['next'],
      detail = node.config.instruction || 'Continue to the next step.';
    if (node.kind === 'trigger')
      detail = `Sample input: ${scenario.values.request ?? 'Custom sample values'}`;
    if (node.kind === 'model')
      detail = `Illustrative ${node.config.capability.toLowerCase()} step. Target: ${node.config.instruction}`;
    if (node.kind === 'retrieval')
      detail = `Sample context from ${node.config.resource}. No system is contacted.`;
    if (node.kind === 'parallel') detail = 'Start each connected path.';
    if (node.kind === 'join')
      detail = 'All incoming sample paths have completed.';
    if (node.kind === 'condition') {
      try {
        const yes = evaluateCondition(node.config, scenario.values);
        ports = [yes ? 'true' : 'false'];
        detail = `${node.config.field} = ${scenario.values[node.config.field]}; follow ${yes ? 'Yes' : 'No'}.`;
      } catch (e) {
        return {
          ...result,
          error: e instanceof Error ? e.message : 'Condition failed.',
        };
      }
    }
    if (node.kind === 'approval' || node.kind === 'wait') {
      const decision = decisions[node.id];
      if (!decision) {
        result.pending.push(node.id);
        result.trace.push({
          nodeId: node.id,
          label: node.label,
          state: 'waiting',
          detail:
            node.kind === 'approval'
              ? `Waiting for ${node.config.approver} (sample approval).`
              : `Waiting for ${node.config.waitFor} (sample event).`,
        });
        continue;
      }
      if (node.kind === 'approval' && decision === 'resolved')
        return {
          ...result,
          error: 'Choose approve or reject for this review.',
        };
      if (node.kind === 'wait' && decision !== 'resolved')
        return { ...result, error: 'Resolve the sample wait to continue.' };
      ports =
        node.kind === 'approval'
          ? [decision as 'approved' | 'rejected']
          : ['next'];
      detail =
        node.kind === 'approval'
          ? `Sample decision: ${decision}.`
          : 'Sample information received; continue.';
    }
    if (node.kind === 'tool')
      detail = `Would perform: ${node.config.instruction} in ${node.config.resource}. No live action is taken.`;
    if (node.kind === 'retry') {
      const failures = scenario.temporaryFailures,
        attempts = Math.min(failures + 1, node.config.maxAttempts),
        failed = failures >= node.config.maxAttempts;
      ports = [failed ? 'failed' : 'next'];
      detail = failed
        ? `All ${attempts} sample attempts failed; follow Failed.`
        : `${failures} failed sample attempt(s), then success on attempt ${attempts}. One intended action, keyed by ${scenario.values[node.config.deduplicationKey] ?? node.config.deduplicationKey}.`;
    }
    if (node.kind === 'output') {
      ports = [];
      outcomes++;
      detail = node.config.instruction || 'Sample outcome reached.';
    }
    completed.add(node.id);
    result.trace.push({
      nodeId: node.id,
      label: node.label,
      detail,
      state:
        node.kind === 'retry' && ports[0] === 'failed' ? 'failed' : 'completed',
    });
    for (const edge of draft.edges.filter(
      (e) => e.source === node.id && ports.includes(e.port)
    )) {
      result.edgeIds.push(edge.id);
      if (!arrived.has(edge.target)) arrived.set(edge.target, new Set());
      arrived.get(edge.target)!.add(edge.id);
      queue.push(edge.target);
    }
  }
  if (visits >= 500) result.error = 'The sample exceeded its execution limit.';
  result.complete =
    outcomes > 0 && result.pending.length === 0 && !result.error;
  if (!result.complete && !result.pending.length && !result.error)
    result.error =
      'The sample could not reach an outcome. Check joins and branch connections.';
  return result;
}
export function invoiceTemplate(): WorkflowDraft {
  const draft = newDraft('Invoice to approved ERP entry');
  const add = (
    nodeId: string,
    kind: NodeKind,
    label: string,
    x: number,
    y: number,
    config: Partial<NodeConfig> = {}
  ) => {
    const node = createNode(kind, x, y, nodeId);
    node.label = label;
    Object.assign(node.config, config);
    draft.nodes.push(node);
  };
  add('invoice', 'trigger', 'Invoice received', 370, 40);
  add('extract', 'model', 'Extract invoice fields', 370, 180, {
    capability: 'Structured extraction',
    instruction:
      'Extract supplier, references, line items, quantities and amounts. Flag uncertain fields.',
  });
  add('parallel', 'parallel', 'Run checks in parallel', 370, 320);
  add('supplier', 'retrieval', 'Supplier & duplicate records', 70, 470, {
    resource: 'Supplier master and invoice ledger',
  });
  add('orders', 'retrieval', 'Orders & delivery records', 370, 470, {
    resource: 'Purchase orders and goods receipts',
  });
  add('contract', 'retrieval', 'Contract & price records', 670, 470, {
    resource: 'Approved contract and line-item prices',
  });
  add('join', 'join', 'Collect the checks', 370, 620);
  add('duplicate', 'condition', 'Possible duplicate?', 370, 760, {
    field: 'duplicate',
    operator: 'equals',
    value: 'true',
  });
  add('duplicate-review', 'output', 'Duplicate review queue', 670, 760, {
    instruction:
      'Hold the invoice for duplicate review. No posting is prepared.',
  });
  add('quantity', 'condition', 'Quantity differs?', 370, 900, {
    field: 'quantityMismatch',
    operator: 'equals',
    value: 'true',
  });
  add('receiving', 'approval', 'Receiving review', 70, 990, {
    approver: 'Receiving team',
    instruction: 'Resolve delivery differences before continuing.',
  });
  add('price', 'condition', 'Price differs?', 370, 1080, {
    field: 'priceMismatch',
    operator: 'equals',
    value: 'true',
  });
  add('procurement', 'approval', 'Procurement review', 670, 1170, {
    approver: 'Procurement owner',
    instruction: 'Resolve the price discrepancy.',
  });
  add('finance-limit', 'condition', 'Above approval limit?', 370, 1260, {
    field: 'amount',
    operator: 'greaterThan',
    value: '5000',
  });
  add('finance', 'approval', 'Finance approval', 70, 1350, {
    approver: 'Finance approver',
    instruction: 'Approve the validated draft entry.',
  });
  add('erp', 'retry', 'Prepare authorised ERP entry', 370, 1440, {
    resource: 'Client ERP (design placeholder)',
    instruction:
      'Create one authorised entry using the invoice reference as an idempotency key.',
    maxAttempts: 3,
  });
  add('complete', 'output', 'Entry prepared & recorded', 370, 1600, {
    instruction:
      'Sample complete: the intended entry and its review trail are ready. No live record was created.',
  });
  add('rejected', 'output', 'Return for correction', 70, 1600, {
    instruction: 'Hold processing and return the invoice for correction.',
  });
  add('recovery', 'output', 'Operational recovery queue', 670, 1600, {
    instruction:
      'Preserve the validated information and hand off the failed posting for review.',
  });
  const edge = (source: string, target: string, port: Port = 'next') =>
    draft.edges.push({ id: `edge-${source}-${target}`, source, target, port });
  edge('invoice', 'extract');
  edge('extract', 'parallel');
  edge('parallel', 'supplier');
  edge('parallel', 'orders');
  edge('parallel', 'contract');
  edge('supplier', 'join');
  edge('orders', 'join');
  edge('contract', 'join');
  edge('join', 'duplicate');
  edge('duplicate', 'duplicate-review', 'true');
  edge('duplicate', 'quantity', 'false');
  edge('quantity', 'receiving', 'true');
  edge('quantity', 'price', 'false');
  edge('receiving', 'price', 'approved');
  edge('receiving', 'rejected', 'rejected');
  edge('price', 'procurement', 'true');
  edge('price', 'finance-limit', 'false');
  edge('procurement', 'finance-limit', 'approved');
  edge('procurement', 'rejected', 'rejected');
  edge('finance-limit', 'finance', 'true');
  edge('finance-limit', 'erp', 'false');
  edge('finance', 'erp', 'approved');
  edge('finance', 'rejected', 'rejected');
  edge('erp', 'complete');
  edge('erp', 'recovery', 'failed');
  return draft;
}

export function parseSampleValues(text: string): Scenario['values'] {
  if (text.length > 20000) throw new Error('Keep sample values below 20 KB.');
  const raw = JSON.parse(text);
  if (
    !raw ||
    typeof raw !== 'object' ||
    Array.isArray(raw) ||
    Object.keys(raw).length > 50
  )
    throw new Error(
      'Use a JSON object with up to 50 text, number or true/false fields.'
    );
  const result: Scenario['values'] = {};
  for (const [key, value] of Object.entries(raw)) {
    if (
      !/^[a-zA-Z][\w.]{0,60}$/.test(key) ||
      ['constructor', 'prototype', '__proto__'].includes(key)
    )
      throw new Error(
        'Use simple field names such as amount, priority or request.'
      );
    if (
      (typeof value === 'string' && value.length <= 2000) ||
      (typeof value === 'number' && Number.isFinite(value)) ||
      typeof value === 'boolean'
    )
      result[key] = value;
    else
      throw new Error(
        'Sample values must be text, finite numbers or true/false flags.'
      );
  }
  return result;
}
