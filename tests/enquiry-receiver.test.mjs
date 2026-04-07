import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  receiver,
  submission,
  sharedSecret,
} from './helpers/enquiry-receiver.mjs';
import { enquiryTopics } from '../src/data/enquiry-topics.ts';

const headers = [
  'Received at (UTC)',
  'Submission ID',
  'Request type',
  'Name',
  'Email',
  'Company',
  'Interest ID',
  'Area of interest',
  'Message',
  'Source page',
];

test('the receiver authenticates before touching private spreadsheet data', () => {
  const server = receiver();
  for (const secret of ['', 'wrong', 'a'.repeat(1000)])
    assert.equal(
      server.post({ ...submission, sharedSecret: secret }).ok,
      false
    );
  assert.equal(server.rawPost({}).ok, false);
  assert.equal(server.counters.opens, 0);
  assert.equal(server.emails.length, 0);
  assert.equal(
    JSON.stringify(
      server.post({ ...submission, sharedSecret: 'wrong' })
    ).includes('private-sheet-id'),
    false
  );
});

test('the receiver validates independently and shares the exact topic allowlist', () => {
  assert.deepEqual(
    receiver().topics(),
    Object.fromEntries(enquiryTopics.map(({ id, label }) => [id, label]))
  );
  for (const changes of [
    { email: 'bad' },
    { name: 'a\nb' },
    { message: 'x'.repeat(3001) },
    { interest: '__proto__' },
    { kind: 'other' },
    { submissionId: 'bad' },
    { clientKey: 'bad' },
  ]) {
    const server = receiver();
    assert.equal(server.post({ ...submission, ...changes }).ok, false);
    assert.equal(server.rows.length, 0);
  }
  const server = receiver();
  assert.equal(
    server.rawPost({
      parameter: { ...submission, sharedSecret, clientKey: 'a'.repeat(64) },
      parameters: { email: ['a', 'b'] },
    }).ok,
    false
  );
});

test('a saved enquiry is text-safe, acknowledged, and emails only the configured internal recipient', () => {
  const server = receiver();
  assert.deepEqual(
    server.post({
      ...submission,
      name: '=IMPORTXML("outside")',
      message: '+SUM(1,2)',
      topic: 'untrusted topic',
      notificationEmail: 'attacker@example.test',
    }),
    { ok: true, submissionId: submission.submissionId }
  );
  assert.equal(server.rows.length, 2);
  assert.equal(server.rows[1][3], '\'=IMPORTXML("outside")');
  assert.equal(server.rows[1][8], "'+SUM(1,2)");
  assert.equal(server.rows[1][7], 'Chatbots');
  assert.equal(server.rows[1][10], 'Sent');
  assert.match(server.rows[1][11], /Z$/);
  assert.equal(server.emails.length, 1);
  assert.equal(server.emails[0].to, 'internal@example.test');
  assert.equal(server.emails[0].replyTo, submission.email);
  assert.match(server.emails[0].body, /\+SUM\(1,2\)/);
  assert.equal(server.emails[0].htmlBody, undefined);
  assert.equal(server.post().ok, true);
  assert.equal(server.rows.length, 2);
  assert.equal(server.emails.length, 1);
  server.worker();
  assert.equal(server.emails.length, 1);
});

test('mail failures never turn a saved enquiry into a frontend failure or duplicate email', () => {
  const server = receiver({ mailFailure: true });
  assert.equal(server.post().ok, true);
  assert.equal(server.rows[1][10], 'Needs review');
  server.post();
  server.worker();
  assert.equal(server.counters.attempts, 1);
});

test('quota-limited and unconfigured mail stays Pending and the worker can deliver it once', () => {
  const options = { quota: 0 };
  const server = receiver(options);
  assert.equal(server.post().ok, true);
  assert.equal(server.rows[1][10], 'Pending');
  options.quota = 100;
  server.worker();
  server.worker();
  assert.equal(server.emails.length, 1);
  assert.equal(server.rows[1][10], 'Sent');
  const missing = receiver({ properties: { ENQUIRY_NOTIFICATION_EMAIL: '' } });
  assert.equal(missing.post().ok, true);
  assert.equal(missing.rows[1][10], 'Pending');
  assert.throws(() => missing.setup(), /ENQUIRY_NOTIFICATION_EMAIL/);
});

test('notification setup requests permissions without sending, installs one worker, and migrates old sheets', () => {
  const old = [
    new Date().toISOString(),
    'old-id',
    'Project enquiry',
    'Old',
    'old@example.test',
    'Company',
    'chatbots',
    'Chatbots',
    'Old message',
    '/contact/',
  ];
  const server = receiver({ rows: [headers, old] });
  server.setup();
  server.setup();
  server.worker();
  assert.equal(server.rows[0].length, 12);
  assert.deepEqual(server.rows[1], old);
  assert.deepEqual(server.triggers, ['sendPendingEnquiryNotifications']);
  assert.equal(server.emails.length, 0);
  assert.equal(server.post().ok, true);
  assert.equal(server.emails.length, 1);
});

test('shared IP/email/hour and global/day limits persist and expire; retries do not spend quota', () => {
  const server = receiver();
  for (let count = 0; count < 3; count++)
    assert.equal(
      server.post({ ...submission, submissionId: randomUUID() }).ok,
      true
    );
  assert.equal(
    server.post({ ...submission, submissionId: randomUUID() }).code,
    'RATE_LIMIT'
  );
  const retry = { ...submission, submissionId: server.rows[1][1] };
  assert.equal(server.post(retry).ok, true);
  for (let count = 0; count < 2; count++)
    assert.equal(
      server.post({
        ...submission,
        submissionId: randomUUID(),
        email: `other${count}@example.test`,
      }).ok,
      true
    );
  assert.equal(
    server.post({
      ...submission,
      submissionId: randomUUID(),
      email: 'third@example.test',
    }).code,
    'RATE_LIMIT'
  );
  server.clock.now += 3600000;
  assert.equal(
    server.post({ ...submission, submissionId: randomUUID() }).ok,
    true
  );
  const keys = [...server.properties.keys()].filter((key) =>
    key.startsWith('enquiry.rate.')
  );
  assert.equal(
    keys.some((key) => key.includes(submission.email)),
    false
  );
  for (let count = 0; count < 94; count++)
    assert.equal(
      server.post({
        ...submission,
        submissionId: randomUUID(),
        email: `person${count}@example.test`,
        clientKey: count.toString(16).padStart(64, '0'),
      }).ok,
      true
    );
  assert.equal(
    server.post({
      ...submission,
      submissionId: randomUUID(),
      email: 'extra@example.test',
      clientKey: 'f'.repeat(64),
    }).code,
    'RATE_LIMIT'
  );
  server.clock.now += 86400000;
  server.worker();
  assert.equal(
    [...server.properties.keys()].filter((key) =>
      key.startsWith('enquiry.rate.')
    ).length,
    0
  );
});

test('configuration, lock and header errors do not accept or email enquiries', () => {
  for (const options of [
    { properties: { ENQUIRY_SPREADSHEET_ID: '' } },
    { busy: true },
    { rows: [['Unrelated data']] },
  ]) {
    const server = receiver(options);
    assert.equal(server.post().ok, false);
    assert.equal(server.emails.length, 0);
  }
});
