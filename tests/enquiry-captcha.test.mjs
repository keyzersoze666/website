import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const source = ts.transpileModule(
  readFileSync(
    new URL('../src/scripts/enquiry-captcha.ts', import.meta.url),
    'utf8'
  ),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }
).outputText;
function page(key = 'public-test-key') {
  const scripts = [];
  const timers = new Map();
  const options = [];
  const exports = {};
  let token = 'verified-test-token';
  let resets = 0;
  const window = {
    turnstile: {
      render: (_, settings) => {
        options.push(settings);
        return 'widget';
      },
      getResponse: () => token,
      reset: () => {
        token = '';
        resets++;
      },
    },
  };
  runInNewContext(source, {
    exports,
    window,
    setTimeout: (fn) => {
      const id = timers.size + 1;
      timers.set(id, fn);
      return id;
    },
    clearTimeout: (id) => timers.delete(id),
    document: {
      querySelector: (selector) =>
        selector === '[data-enquiry-captcha]'
          ? { dataset: { sitekey: key } }
          : {},
      createElement: () => ({
        remove() {
          this.removed = true;
        },
      }),
      head: { append: (script) => scripts.push(script) },
    },
  });
  return { exports, scripts, timers, options, resets: () => resets };
}

test('the challenge uses only the public key, requires a token, and resets between attempts', async () => {
  const client = page();
  assert.equal(client.scripts.length, 1);
  assert.equal(
    client.scripts[0].src,
    'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
  );
  client.scripts[0].onload();
  assert.equal(await client.exports.enquiryToken(), 'verified-test-token');
  assert.equal(client.options[0].action, 'enquiry');
  assert.equal(client.options[0]['response-field'], false);
  client.exports.resetEnquiryToken();
  assert.equal(client.resets(), 1);
  await assert.rejects(
    client.exports.enquiryToken(),
    /complete the security check/
  );
});

test('unconfigured, blocked and stalled challenges fail closed without an endless pending submission', async () => {
  const empty = page('');
  assert.equal(empty.scripts.length, 0);
  await assert.rejects(empty.exports.enquiryToken(), /unavailable/);
  for (const cause of ['error', 'timeout']) {
    const client = page();
    if (cause === 'error') client.scripts[0].onerror();
    else [...client.timers.values()][0]();
    await assert.rejects(client.exports.enquiryToken(), /reload the page/);
    assert.equal(client.scripts[0].removed, true);
  }
});
