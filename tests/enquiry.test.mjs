import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import * as topics from '../src/data/enquiry-topics.ts';
import { randomUUID } from 'node:crypto';

const source = ts.transpileModule(
  readFileSync(new URL('../src/scripts/enquiry.ts', import.meta.url), 'utf8'),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }
).outputText;

function enquiryPage(
  kind,
  search = '',
  endpoint = '/api/enquiries',
  deliver = async () => {}
) {
  const events = new Map();
  const routes = [];
  const deliveries = [];
  const fields = {
    name: 'Avery',
    company: 'Example Ltd',
    email: 'avery@example.test',
    interest: '',
    message: 'Review our order intake.',
  };
  let valid = true;
  class Input {}
  const element = (name) => ({
    hidden: false,
    disabled: true,
    textContent: '',
    href: '',
    focused: false,
    addEventListener(type, handler) {
      events.set(`${name}:${type}`, handler);
    },
    focus() {
      this.focused = true;
    },
    scrollIntoView() {},
    setAttribute(name, value) {
      this[name] = value;
    },
    removeAttribute(name) {
      delete this[name];
    },
    set innerHTML(_) {
      throw new Error('Enquiry content must remain plain text');
    },
  });
  const interest = element('interest');
  Object.defineProperty(interest, 'value', {
    get: () => fields.interest,
    set: (value) => {
      fields.interest = value;
    },
  });
  const form = Object.assign(element('form'), {
    dataset: {
      enquiryKind: kind === 'demo' ? 'Demo request' : 'Project enquiry',
      deliveryUrl: endpoint,
    },
    reportValidity: () => valid,
    querySelector: () => interest,
  });
  const reviewControl = element('reviewControl');
  const submit = Object.assign(element('submit'), {
    disabled: false,
    textContent: 'Submit enquiry',
  });
  const status = Object.assign(element('status'), { hidden: true });
  const review = Object.assign(element('review'), { hidden: true });
  const prompt = element('prompt');
  const context = element('context');
  const back = element('back');
  const alternate = element('alternate');
  const elements = new Map([
    ['#lead-form', form],
    ['#lead-review', reviewControl],
    ['#enquiry-status', status],
    ['#lead-submit', submit],
    ['#form-review', review],
    ['[data-enquiry-prompt]', prompt],
    ['[data-enquiry-context]', context],
    ['[data-enquiry-return]', back],
    ['[data-enquiry-switch]', alternate],
  ]);
  const unexpected = () => {
    throw new Error('Unexpected network or persistence of enquiry details');
  };
  runInNewContext(source, {
    exports: {},
    require: (name) =>
      name.endsWith('enquiry-delivery')
        ? {
            deliverEnquiry: (...args) => {
              deliveries.push(args);
              return deliver(...args);
            },
          }
        : name.endsWith('enquiry-captcha')
          ? {
              enquiryToken: async () => 'test-challenge',
              resetEnquiryToken: () => {},
            }
          : topics,
    crypto: { randomUUID },
    document: { querySelector: (selector) => elements.get(selector) },
    window: {
      location: { search, assign: (url) => routes.push(url) },
      localStorage: { setItem: unexpected },
      sessionStorage: { setItem: unexpected },
      fetch: unexpected,
    },
    localStorage: { setItem: unexpected },
    sessionStorage: { setItem: unexpected },
    fetch: unexpected,
    URLSearchParams,
    HTMLInputElement: Input,
    FormData: class {
      get(name) {
        return fields[name];
      }
    },
    matchMedia: () => ({ matches: true }),
  });
  const fire = (name, type, extra = {}) => {
    const event = {
      defaultPrevented: false,
      preventDefault() {
        this.defaultPrevented = true;
      },
      ...extra,
    };
    event.done = events.get(`${name}:${type}`)?.(event);
    return event;
  };
  return {
    fields,
    interest,
    context,
    back,
    alternate,
    reviewControl,
    submit,
    status,
    deliveries,
    review,
    prompt,
    routes,
    fire,
    Input,
    setValid: (value) => {
      valid = value;
    },
  };
}

test('topic links accept only known public subjects', () => {
  for (const topic of topics.enquiryTopics) {
    for (const kind of ['contact', 'demo']) {
      const url = new URL(
        topics.enquiryHref(kind, topic.id),
        'https://example.test'
      );
      assert.deepEqual([...url.searchParams.keys()], ['topic']);
      assert.equal(
        topics.findEnquiryTopic(url.searchParams.get('topic')),
        topic
      );
    }
  }
  for (const invalid of [
    undefined,
    '',
    '__proto__',
    'https://outside.test',
    '<script>alert(1)</script>',
    'chatbots&email=person@example.test',
  ]) {
    assert.equal(topics.enquiryHref('contact', invalid), '/contact/');
    assert.equal(topics.findEnquiryTopic(invalid), undefined);
  }
});

for (const kind of ['contact', 'demo']) {
  test(`${kind}: context survives switching forms and visitors can change their topic`, () => {
    const page = enquiryPage(kind, '?topic=speech-to-text');
    assert.equal(page.fields.interest, 'speech-to-text');
    assert.equal(page.back.href, '/capabilities/speech-to-text/');
    assert.equal(page.context.hidden, false);
    assert.equal(
      page.alternate.href,
      topics.enquiryHref(kind === 'demo' ? 'contact' : 'demo', 'speech-to-text')
    );
    page.fields.interest = 'help-me-decide';
    page.fire('interest', 'change');
    assert.equal(page.back.href, '/solutions/');
    assert.equal(
      page.alternate.href,
      topics.enquiryHref(kind === 'demo' ? 'contact' : 'demo', 'help-me-decide')
    );
    const unknown = enquiryPage(
      kind,
      '?topic=https%3A%2F%2Foutside.test&email=person@example.test'
    );
    assert.equal(unknown.fields.interest, '');
    assert.equal(unknown.context.hidden, true);
    assert.equal(
      unknown.alternate.href,
      kind === 'demo' ? '/contact/' : '/book-a-demo/'
    );
  });

  test(`${kind}: review respects validation, safely displays details and clears stale reviews`, () => {
    const page = enquiryPage(kind, '?topic=ai-agents');
    page.setValid(false);
    page.fire('reviewControl', 'click');
    assert.equal(page.review.hidden, true);
    page.setValid(true);
    page.fields.message = '<img src=x onerror=alert(1)> Keep AI capitalised.';
    page.fire('reviewControl', 'click');
    assert.equal(page.review.hidden, false);
    assert.equal(page.review.focused, true);
    assert.match(page.prompt.textContent, /Custom AI agents/);
    assert.ok(page.prompt.textContent.includes(page.fields.message));
    assert.match(
      page.prompt.textContent,
      kind === 'demo' ? /a walkthrough/ : /a project/
    );
    assert.deepEqual(page.routes, []);
    page.fire('form', 'input');
    assert.equal(page.review.hidden, true);
  });

  test(`${kind}: click, Enter and submit validate and navigate without serialising details`, async () => {
    const page = enquiryPage(kind, '?topic=proprietary-models');
    page.setValid(false);
    page.fire('submit', 'click');
    page.fire('form', 'submit');
    page.fire('form', 'keydown', { key: 'Enter', target: new page.Input() });
    assert.deepEqual(page.routes, []);
    page.setValid(true);
    await page.fire('submit', 'click').done;
    const submitted = page.fire('form', 'submit');
    await submitted.done;
    assert.equal(submitted.defaultPrevented, true);
    const entered = page.fire('form', 'keydown', {
      key: 'Enter',
      target: new page.Input(),
    });
    await entered.done;
    assert.equal(entered.defaultPrevented, true);
    assert.deepEqual(page.routes, Array(3).fill('/enquiry-received/'));
    assert.equal(
      page.fire('form', 'keydown', { key: 'Enter', target: {} })
        .defaultPrevented,
      false
    );
    assert.equal(
      page.fire('form', 'keydown', {
        key: 'Enter',
        isComposing: true,
        target: new page.Input(),
      }).defaultPrevented,
      false
    );
    assert.equal(page.routes.length, 3);
    assert.equal(page.deliveries.length, 3);
    assert.equal(page.deliveries[0][1].turnstileToken, 'test-challenge');
  });

  test(`${kind}: configured delivery waits for acceptance and prevents duplicate clicks`, async () => {
    let accept;
    const pending = new Promise((resolve) => {
      accept = resolve;
    });
    const page = enquiryPage(
      kind,
      '?topic=ai-agents',
      '/api/enquiries',
      () => pending
    );
    page.setValid(false);
    await page.fire('submit', 'click').done;
    assert.equal(page.deliveries.length, 0);
    page.setValid(true);
    const first = page.fire('submit', 'click');
    await new Promise(setImmediate);
    page.fire('submit', 'click');
    page.fire('form', 'keydown', { key: 'Enter', target: new page.Input() });
    assert.equal(page.deliveries.length, 1);
    assert.equal(page.submit.disabled, true);
    assert.deepEqual(page.routes, []);
    assert.equal(page.deliveries[0][1].kind, kind);
    assert.equal(page.deliveries[0][1].email, page.fields.email);
    assert.equal(page.deliveries[0][1].interest, 'ai-agents');
    accept();
    await first.done;
    assert.deepEqual(page.routes, ['/enquiry-received/']);
  });

  test(`${kind}: failures keep details and retry the same request without false confirmation`, async () => {
    const page = enquiryPage(
      kind,
      '?topic=chatbots',
      '/api/enquiries',
      async () => {
        throw new Error('Network failed');
      }
    );
    await page.fire('submit', 'click').done;
    assert.deepEqual(page.routes, []);
    assert.equal(page.status.hidden, false);
    assert.equal(page.status.focused, true);
    assert.equal(page.fields.message, 'Review our order intake.');
    assert.equal(page.submit.disabled, false);
    assert.equal(page.submit.textContent, 'Submit enquiry');
    const firstId = page.deliveries[0][1].submissionId;
    await page.fire('submit', 'click').done;
    assert.equal(page.deliveries[1][1].submissionId, firstId);
    page.fields.message = 'A revised enquiry.';
    page.fire('form', 'input');
    assert.equal(page.status.hidden, true);
    await page.fire('submit', 'click').done;
    assert.notEqual(page.deliveries[2][1].submissionId, firstId);
  });
}
