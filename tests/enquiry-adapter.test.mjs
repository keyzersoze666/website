import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import handler from '../api/enquiries.ts';
import { submission, sharedSecret } from './helpers/enquiry-receiver.mjs';

function response() {
  return {
    status: undefined,
    headers: undefined,
    body: '',
    writeHead(status, headers) {
      this.status = status;
      this.headers = headers;
      return this;
    },
    end(body = '') {
      this.body = body;
      return this;
    },
  };
}

test('the Vercel Node adapter accepts parsed or streamed JSON, bounds bodies, and preserves safe API responses', async () => {
  const config = {
    SITE_URL: 'https://example.com',
    VERCEL: '1',
    VERCEL_ENV: 'production',
    GOOGLE_APPS_SCRIPT_URL: 'https://script.google.com/macros/s/test/exec',
    ENQUIRY_SHARED_SECRET: sharedSecret,
    TURNSTILE_SECRET_KEY: 'test-secret',
  };
  const previous = Object.fromEntries(
    Object.keys(config).map((key) => [key, process.env[key]])
  );
  const originalFetch = globalThis.fetch;
  Object.assign(process.env, config);
  let calls = 0;
  globalThis.fetch = async (url) => {
    calls++;
    return Response.json(
      String(url).includes('siteverify')
        ? { success: true, hostname: 'example.com', action: 'enquiry' }
        : { ok: true, submissionId: submission.submissionId }
    );
  };
  const headers = {
    origin: config.SITE_URL,
    'content-type': 'application/json',
    'x-vercel-forwarded-for': '192.0.2.4',
  };
  try {
    for (const input of [
      submission,
      JSON.stringify(submission),
      Buffer.from(JSON.stringify(submission)),
    ]) {
      const res = response();
      await handler({ method: 'POST', headers, body: input }, res);
      assert.equal(res.status, 200);
      assert.equal(res.headers['cache-control'], 'no-store');
      assert.equal(JSON.parse(res.body).submissionId, submission.submissionId);
    }
    const stream = Object.assign(Readable.from([JSON.stringify(submission)]), {
      method: 'POST',
      headers,
    });
    const res = response();
    await handler(stream, res);
    assert.equal(res.status, 200);
    assert.equal(calls, 8);
    const oversized = response();
    await handler(
      Object.assign(Readable.from(['x'.repeat(24001)]), {
        method: 'POST',
        headers,
      }),
      oversized
    );
    assert.equal(oversized.status, 413);
    const declared = response();
    await handler(
      {
        method: 'POST',
        headers: { ...headers, 'content-length': '30000' },
        body: '{}',
      },
      declared
    );
    assert.equal(declared.status, 413);
    assert.equal(calls, 8);
    const get = response();
    await handler({ method: 'GET', headers }, get);
    assert.equal(get.status, 405);
    assert.equal(get.headers.allow, 'POST');
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
