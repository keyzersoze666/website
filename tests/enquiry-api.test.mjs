import test from 'node:test';
import assert from 'node:assert/strict';
import { handleEnquiry } from '../src/server/enquiries.ts';
import { submission, sharedSecret } from './helpers/enquiry-receiver.mjs';

const env = {
  SITE_URL: 'https://example.com',
  VERCEL: '1',
  VERCEL_ENV: 'production',
  GOOGLE_APPS_SCRIPT_URL:
    'https://script.google.com/macros/s/test-deployment/exec',
  ENQUIRY_SHARED_SECRET: sharedSecret,
  TURNSTILE_SECRET_KEY: 'test-secret',
};
function request(values = submission, headers = {}, method = 'POST') {
  return new Request('https://example.com/api/enquiries', {
    method,
    headers: {
      origin: env.SITE_URL,
      'content-type': 'application/json',
      'x-vercel-forwarded-for': '192.0.2.4',
      ...headers,
    },
    ...(method === 'POST' ? { body: JSON.stringify(values) } : {}),
  });
}
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status });

test('the production domain default governs form origins and Turnstile hostnames', async () => {
  const config = { ...env, SITE_URL: undefined };
  for (const [origin, hostname, expectedStatus, expectedCalls] of [
    ['https://qwertylabs.com', 'qwertylabs.com', 200, 2],
    ['https://qwertylabs.com', 'example.com', 400, 1],
    ['https://example.com', 'qwertylabs.com', 403, 0],
  ]) {
    let calls = 0;
    const result = await handleEnquiry(
      request(submission, { origin }),
      config,
      async () =>
        ++calls === 1
          ? json({ success: true, hostname, action: 'enquiry' })
          : json({ ok: true, submissionId: submission.submissionId })
    );
    assert.equal(result.status, expectedStatus);
    assert.equal(calls, expectedCalls);
  }
});

test('the API checks method, deployment secrets, origin, type, length and input before any external calls', async () => {
  const cases = [
    [request({}, {}, 'GET'), env, 405],
    [request(), { ...env, ENQUIRY_SHARED_SECRET: '' }, 503],
    [request(), { ...env, VERCEL_ENV: 'preview' }, 503],
    [
      request(),
      { ...env, GOOGLE_APPS_SCRIPT_URL: 'https://outside.test' },
      503,
    ],
    [request(submission, { origin: 'https://outside.test' }), env, 403],
    [request(submission, { 'sec-fetch-site': 'cross-site' }), env, 403],
    [request(submission, { 'content-type': 'text/plain' }), env, 415],
    [request(submission, { 'content-length': '30000' }), env, 413],
    [request({ ...submission, message: 'x'.repeat(25000) }), env, 413],
    [request({ ...submission, email: 'bad' }), env, 400],
    [request({ ...submission, website: 'spam' }), env, 400],
    [request({ ...submission, interest: 'unknown' }), env, 400],
    [request({ ...submission, turnstileToken: '' }), env, 400],
    [request(submission, { 'x-vercel-forwarded-for': 'spoofed' }), env, 503],
  ];
  for (const [input, config, status] of cases) {
    const result = await handleEnquiry(input, config, () =>
      assert.fail('External call before validation')
    );
    assert.equal(result.status, status);
    assert.equal(result.headers.get('cache-control'), 'no-store');
  }
});

test('only a verified token for the correct hostname and action can reach Sheets', async () => {
  for (const proof of [
    { success: false },
    { success: true, hostname: 'outside.test', action: 'enquiry' },
    { success: true, hostname: 'example.com', action: 'other' },
  ]) {
    let calls = 0;
    const result = await handleEnquiry(request(), env, async () => {
      calls++;
      return json(proof);
    });
    assert.equal(result.status, 400);
    assert.equal(calls, 1);
  }
});

test('the server verifies Turnstile, hashes platform IPs, derives topics, and authenticates Sheets', async () => {
  const calls = [];
  const result = await handleEnquiry(
    request({ ...submission, topic: 'untrusted' }),
    env,
    async (url, options) => {
      calls.push({ url, options });
      if (calls.length === 1)
        return json({
          success: true,
          hostname: 'example.com',
          action: 'enquiry',
        });
      assert.equal(url, env.GOOGLE_APPS_SCRIPT_URL);
      const fields = Object.fromEntries(options.body);
      assert.equal(fields.sharedSecret, sharedSecret);
      assert.match(fields.clientKey, /^[0-9a-f]{64}$/);
      assert.equal(JSON.stringify(fields).includes('192.0.2.4'), false);
      assert.equal(fields.topic, 'Chatbots');
      assert.equal(fields.turnstileToken, undefined);
      return json({ ok: true, submissionId: submission.submissionId });
    }
  );
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), {
    ok: true,
    submissionId: submission.submissionId,
  });
  assert.equal(calls[0].options.body.get('secret'), env.TURNSTILE_SECRET_KEY);
  assert.equal(calls[0].options.body.get('remoteip'), '192.0.2.4');
});

test('receiver rate limits and uncertain acknowledgements are returned without secrets', async () => {
  for (const [saved, status] of [
    [{ ok: false, code: 'RATE_LIMIT', retryAfter: 600 }, 429],
    [{ ok: false }, 502],
    [{ ok: true, submissionId: 'wrong' }, 502],
  ]) {
    let count = 0;
    const result = await handleEnquiry(request(), env, async () =>
      ++count === 1
        ? json({ success: true, hostname: 'example.com', action: 'enquiry' })
        : json(saved)
    );
    assert.equal(result.status, status);
    if (status === 429) assert.equal(result.headers.get('retry-after'), '600');
    assert.equal((await result.text()).includes(sharedSecret), false);
  }
  let calls = 0;
  const lost = await handleEnquiry(request(), env, async () => {
    if (++calls === 1)
      return json({
        success: true,
        hostname: 'example.com',
        action: 'enquiry',
      });
    throw new Error('Timed out after saving');
  });
  assert.equal(lost.status, 502);
  assert.equal((await lost.json()).code, 'DELIVERY_UNCONFIRMED');
});
