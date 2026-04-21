import test from 'node:test';
import assert from 'node:assert/strict';
import { siteConfiguration } from '../src/config/site.ts';

test('production uses the company domain and permits a clean HTTPS override', () => {
  assert.deepEqual(siteConfiguration({ VERCEL_ENV: 'production' }), {
    url: 'https://qwertylabs.com/',
    indexable: true,
  });
  for (const SITE_URL of [
    'http://example.com',
    'https://example.com/path',
    'https://user@example.com',
    'https://example.com?query=1',
    'https://example.com#fragment',
    'invalid',
  ])
    assert.throws(() => siteConfiguration({ SITE_URL }));
  assert.deepEqual(
    siteConfiguration({
      SITE_URL: 'https://example.com',
      VERCEL_ENV: 'production',
    }),
    { url: 'https://example.com/', indexable: true }
  );
});

test('local, preview, and prelaunch deployments cannot advertise indexing', () => {
  assert.equal(siteConfiguration({}).indexable, false);
  assert.equal(siteConfiguration({ VERCEL_ENV: 'preview' }).indexable, false);
  assert.equal(
    siteConfiguration({ VERCEL_ENV: 'production', SITE_INDEXABLE: 'false' })
      .indexable,
    false
  );
  assert.equal(
    siteConfiguration({
      SITE_URL: 'https://example.com',
      VERCEL_ENV: 'preview',
    }).indexable,
    false
  );
  assert.equal(
    siteConfiguration({
      SITE_URL: 'https://example.com',
      SITE_INDEXABLE: 'false',
    }).indexable,
    false
  );
});
