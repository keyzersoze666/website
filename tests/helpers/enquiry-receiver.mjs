import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { createHmac } from 'node:crypto';

export const sharedSecret = 'test-only-secret-with-at-least-32-characters';
export const submission = {
  submissionId: '81935438-bd02-4e45-80fb-792c1034d1cd',
  kind: 'contact',
  name: 'Avery',
  email: 'avery@example.test',
  company: 'Example Ltd',
  interest: 'chatbots',
  topic: 'Chatbots',
  message: 'An enquiry with & + and <tags>.',
  website: '',
  turnstileToken: 'test-challenge',
};
const source = readFileSync(
  new URL('../../integrations/google-sheets/Code.gs', import.meta.url),
  'utf8'
);

export function receiver(options = {}) {
  const rows = (options.rows || []).map((row) => [...row]);
  const emails = [];
  const triggers = [];
  const counters = { opens: 0, flushes: 0, releases: 0, attempts: 0 };
  const clock = { now: Date.parse('2026-04-07T12:10:00Z') };
  const properties = new Map(
    Object.entries({
      ENQUIRY_SPREADSHEET_ID: 'private-sheet-id',
      ENQUIRY_SHARED_SECRET: sharedSecret,
      ENQUIRY_NOTIFICATION_EMAIL: 'internal@example.test',
      ...options.properties,
    })
  );
  const range = (start, column, count = 1, columns = 1) => ({
    getValues: () =>
      Array.from({ length: count }, (_, offset) =>
        Array.from(
          { length: columns },
          (_, cell) => rows[start - 1 + offset]?.[column - 1 + cell] ?? ''
        )
      ),
    setValue: (value) => {
      rows[start - 1][column - 1] = value;
    },
    setValues: (values) =>
      values.forEach((row, offset) =>
        row.forEach((value, cell) => {
          rows[start - 1 + offset][column - 1 + cell] = value;
        })
      ),
    createTextFinder: (value) => ({
      matchEntireCell: () => ({
        findNext: () =>
          rows
            .slice(start - 1, start - 1 + count)
            .find((row) => row[column - 1] === value),
      }),
    }),
  });
  const sheet = {
    getLastRow: () => rows.length,
    appendRow: (row) => rows.push([...row]),
    getRange: range,
  };
  const context = {
    Date: class extends Date {
      constructor(...args) {
        super(...(args.length ? args : [clock.now]));
      }
      static now() {
        return clock.now;
      }
    },
    ContentService: {
      MimeType: { JSON: 'json' },
      createTextOutput: (text) => ({ setMimeType: () => JSON.parse(text) }),
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (key) => properties.get(key) || null,
        getProperties: () => Object.fromEntries(properties),
        deleteProperty: (key) => properties.delete(key),
        setProperties: (updates) =>
          Object.entries(updates).forEach(([key, value]) =>
            properties.set(key, value)
          ),
      }),
    },
    LockService: {
      getScriptLock: () => ({
        tryLock: () => !options.busy,
        releaseLock: () => {
          counters.releases++;
        },
      }),
    },
    SpreadsheetApp: {
      openById: () => {
        counters.opens++;
        return { getSheetByName: () => sheet, insertSheet: () => sheet };
      },
      flush: () => {
        counters.flushes++;
      },
    },
    Utilities: {
      computeHmacSha256Signature: (text, secret) => [
        ...createHmac('sha256', secret).update(text).digest(),
      ],
    },
    MailApp: {
      getRemainingDailyQuota: () => options.quota ?? 100,
      sendEmail: (mail) => {
        counters.attempts++;
        if (options.mailFailure) throw new Error('Mail failure');
        emails.push(mail);
      },
    },
    ScriptApp: {
      getProjectTriggers: () =>
        triggers.map((handler) => ({ getHandlerFunction: () => handler })),
      newTrigger: (handler) => ({
        timeBased: () => ({
          everyMinutes: (minutes) => ({
            create: () => {
              if (minutes !== 5) throw new Error('Unexpected interval');
              triggers.push(handler);
            },
          }),
        }),
      }),
    },
  };
  runInNewContext(source, context);
  return {
    post: (values = submission) =>
      context.doPost({
        parameter: {
          ...values,
          sharedSecret: values.sharedSecret ?? sharedSecret,
          clientKey: values.clientKey ?? 'a'.repeat(64),
        },
      }),
    rawPost: (event) => context.doPost(event),
    worker: () => context.sendPendingEnquiryNotifications(),
    setup: () => context.setupEnquiryNotifications(),
    topics: () => JSON.parse(JSON.stringify(context.enquiryTopics_())),
    rows,
    emails,
    triggers,
    counters,
    properties,
    clock,
  };
}
