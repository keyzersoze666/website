import test from 'node:test';
import assert from 'node:assert/strict';
import {
  invoiceTemplate,
  validateDraft,
  simulate,
  scenarios,
  cloneDraft,
  connect,
  parseDraft,
  createNode,
  newDraft,
  evaluateCondition,
} from '../src/scripts/workflow-model.ts';
const scenario = (id) => scenarios.find((item) => item.id === id);
const approves = {
  receiving: 'approved',
  procurement: 'approved',
  finance: 'approved',
};

test('the invoice template validates and waits for the required approval', () => {
  const draft = invoiceTemplate();
  assert.deepEqual(validateDraft(draft), []);
  const run = simulate(draft, scenario('matching'));
  assert.deepEqual(run.pending, ['finance']);
  assert.ok(run.trace.find((item) => item.nodeId === 'join'));
  assert.equal(run.trace.filter((item) => item.nodeId === 'join').length, 1);
  assert.ok(!run.trace.some((item) => item.nodeId === 'erp'));
});
test('multiple exceptions require each review before posting can be reached', () => {
  const draft = invoiceTemplate(),
    sample = scenario('combined');
  assert.deepEqual(simulate(draft, sample).pending, ['receiving']);
  assert.deepEqual(simulate(draft, sample, { receiving: 'approved' }).pending, [
    'procurement',
  ]);
  assert.deepEqual(
    simulate(draft, sample, { receiving: 'approved', procurement: 'approved' })
      .pending,
    ['finance']
  );
  const finished = simulate(draft, sample, approves);
  assert.equal(finished.complete, true);
  assert.ok(finished.trace.some((item) => item.nodeId === 'complete'));
  assert.equal(
    finished.trace.filter((item) => item.nodeId === 'erp').length,
    1
  );
});
test('duplicate and rejected cases cannot reach ERP posting', () => {
  const duplicate = simulate(invoiceTemplate(), scenario('duplicate'));
  assert.equal(duplicate.complete, true);
  assert.ok(duplicate.trace.some((item) => item.nodeId === 'duplicate-review'));
  assert.ok(!duplicate.trace.some((item) => item.nodeId === 'erp'));
  const rejected = simulate(invoiceTemplate(), scenario('price'), {
    procurement: 'rejected',
  });
  assert.equal(rejected.complete, true);
  assert.ok(rejected.trace.some((item) => item.nodeId === 'rejected'));
  assert.ok(!rejected.trace.some((item) => item.nodeId === 'erp'));
});
test('retry exhaustion follows recovery while a transient failure creates one intended action', () => {
  const recovered = simulate(invoiceTemplate(), scenario('retry'));
  assert.equal(recovered.complete, true);
  assert.match(
    recovered.trace.find((item) => item.nodeId === 'erp').detail,
    /success on attempt 2/
  );
  assert.equal(
    recovered.trace.filter((item) => item.nodeId === 'erp').length,
    1
  );
  const failed = simulate(invoiceTemplate(), scenario('failure'));
  assert.ok(failed.trace.some((item) => item.nodeId === 'recovery'));
  assert.ok(!failed.trace.some((item) => item.nodeId === 'complete'));
});
test('a configured approval threshold changes the branch', () => {
  const draft = invoiceTemplate();
  draft.nodes.find((item) => item.id === 'finance-limit').config.value =
    '20000';
  const run = simulate(draft, scenario('matching'));
  assert.equal(run.complete, true);
  assert.ok(!run.trace.some((item) => item.nodeId === 'finance'));
});
test('connections reject cycles, invalid outputs and duplicate ports without changing the draft', () => {
  const draft = invoiceTemplate(),
    snapshot = JSON.stringify(draft);
  assert.throws(() => connect(draft, 'duplicate', 'invoice', 'true'));
  assert.throws(() => connect(draft, 'join', 'supplier', 'next'));
  assert.throws(() => connect(draft, 'invoice', 'quantity', 'next'));
  assert.throws(() => connect(draft, 'complete', 'quantity', 'next'));
  assert.equal(JSON.stringify(draft), snapshot);
});
test('unfinished and unreachable steps produce actionable validation errors', () => {
  const draft = invoiceTemplate();
  draft.nodes.push(createNode('approval', 200, 200, 'unconnected'));
  const issues = validateDraft(draft);
  assert.ok(
    issues.some(
      (item) =>
        item.nodeId === 'unconnected' && item.message.includes('trigger')
    )
  );
  assert.ok(
    issues.some(
      (item) =>
        item.nodeId === 'unconnected' && item.message.includes('reviewer')
    )
  );
  assert.ok(simulate(draft, scenario('matching')).error);
});
test('workflow import validates structure and bounds and preserves literal text safely', () => {
  const original = invoiceTemplate();
  original.nodes[0].label = '<img src=x onerror=alert(1)>';
  const roundtrip = parseDraft(JSON.stringify(original));
  assert.equal(roundtrip.nodes[0].label, original.nodes[0].label);
  assert.deepEqual(roundtrip, original);
  const bad = cloneDraft(original);
  bad.nodes[0].kind = 'executeJavascript';
  assert.throws(() => parseDraft(JSON.stringify(bad)));
  const huge = cloneDraft(original);
  huge.nodes[0].config.maxAttempts = 999;
  assert.throws(() => parseDraft(JSON.stringify(huge)));
  const edges = cloneDraft(original);
  edges.edges[0].target = 'missing';
  assert.throws(() => parseDraft(JSON.stringify(edges)));
  assert.throws(() => parseDraft('x'.repeat(250001)));
});
test('manual wait steps pause and resume using a sample event', () => {
  let draft = newDraft();
  draft.nodes = [
    createNode('trigger', 0, 0, 'start'),
    createNode('wait', 0, 140, 'wait'),
    createNode('output', 0, 280, 'end'),
  ];
  draft = connect(draft, 'start', 'wait', 'next');
  draft = connect(draft, 'wait', 'end', 'next');
  assert.deepEqual(simulate(draft, scenario('matching')).pending, ['wait']);
  assert.equal(
    simulate(draft, scenario('matching'), { wait: 'resolved' }).complete,
    true
  );
});
test('conditions interpret values without evaluating user code', () => {
  const config = createNode('condition').config;
  assert.equal(evaluateCondition(config, { amount: 6000 }), true);
  config.value = 'process.exit()';
  assert.throws(() => evaluateCondition(config, { amount: 6000 }));
  config.operator = 'contains';
  config.field = 'request';
  config.value = 'Invoice';
  assert.equal(
    evaluateCondition(config, { request: 'An invoice arrived' }),
    true
  );
});

test('custom sample fields can drive a manually configured branch', async () => {
  const { parseSampleValues } =
    await import('../src/scripts/workflow-model.ts');
  let draft = newDraft();
  const condition = createNode('condition', 0, 100, 'choice');
  Object.assign(condition.config, {
    field: 'priority',
    operator: 'equals',
    value: 'urgent',
  });
  draft.nodes = [
    createNode('trigger', 0, 0, 'start'),
    condition,
    createNode('output', 0, 200, 'urgent'),
    createNode('output', 200, 200, 'normal'),
  ];
  draft = connect(draft, 'start', 'choice', 'next');
  draft = connect(draft, 'choice', 'urgent', 'true');
  draft = connect(draft, 'choice', 'normal', 'false');
  const values = parseSampleValues(
    '{"priority":"urgent","request":"Please review this request"}'
  );
  const run = simulate(draft, { ...scenario('matching'), values });
  assert.equal(run.complete, true);
  assert.ok(run.trace.some((item) => item.nodeId === 'urgent'));
  assert.ok(!run.trace.some((item) => item.nodeId === 'normal'));
  assert.throws(() => parseSampleValues('{"nested":{"value":1}}'));
  assert.throws(() => parseSampleValues('{"constructor":"invalid"}'));
  assert.throws(() => parseSampleValues('[]'));
});
