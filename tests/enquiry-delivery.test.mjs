import test from 'node:test';
import assert from 'node:assert/strict';
import { deliverEnquiry } from '../src/scripts/enquiry-delivery.ts';
import { submission } from './helpers/enquiry-receiver.mjs';

const endpoint = '/api/enquiries';

test('only the same-origin submission route receives personal data', async () => {
  for (const url of [
    '',
    ' ',
    'https://script.google.com/macros/s/id/exec',
    'https://outside.test',
    '//outside.test/api/enquiries',
    '/api/enquiries?forward=1',
  ])
    await assert.rejects(
      deliverEnquiry(url, submission, () => assert.fail('Unexpected request'))
    );
});

test('delivery sends JSON and requires a matching saved-row acknowledgement', async () => {
  await deliverEnquiry(endpoint, submission, async (url, options) => {
    assert.equal(url, endpoint);
    assert.equal(options.method, 'POST');
    assert.equal(options.credentials, 'same-origin');
    assert.equal(options.redirect, 'error');
    assert.equal(options.headers['Content-Type'], 'application/json');
    assert.deepEqual(JSON.parse(options.body), submission);
    return {
      ok: true,
      json: async () => ({ ok: true, submissionId: submission.submissionId }),
    };
  });
  for (const result of [
    { ok: false },
    { ok: true, submissionId: 'wrong' },
    null,
  ])
    await assert.rejects(
      deliverEnquiry(endpoint, submission, async () => ({
        ok: true,
        json: async () => result,
      })),
      /couldn’t confirm/
    );
  await assert.rejects(
    deliverEnquiry(endpoint, submission, async () => {
      throw new TypeError('Network error');
    }),
    /may have been received/
  );
});

test('known service failures provide actionable messages without showing receiver data', async () => {
  for (const [code, message] of [
    ['RATE_LIMIT', /Too many/],
    ['VERIFICATION', /security check/],
    ['INVALID_INPUT', /check the details/],
    ['UNAVAILABLE', /unavailable/],
  ])
    await assert.rejects(
      deliverEnquiry(endpoint, submission, async () => ({
        ok: false,
        json: async () => ({ ok: false, code, message: 'private-sheet-id' }),
      })),
      message
    );
});
