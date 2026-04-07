/**
 * QWERTY Labs private enquiry receiver. See docs/google-sheets-enquiries.md.
 * Secrets and spreadsheet IDs belong in Script Properties, never in source.
 * Only the authenticated Vercel proxy may submit. Keep the spreadsheet Restricted.
 */
function doPost(event) {
  var lock;
  var locked = false;
  try {
    var values = event && event.parameter;
    var properties = PropertiesService.getScriptProperties();
    var secret = properties.getProperty('ENQUIRY_SHARED_SECRET');
    if (
      !values ||
      !secret ||
      secret.length < 32 ||
      !enquiryEqual_(values.sharedSecret, secret)
    )
      throw new Error('UNAUTHORISED');
    if (event.postData && event.postData.length > 65536)
      throw new Error('INVALID_REQUEST');
    if (
      event.parameters &&
      Object.keys(event.parameters).some(function (key) {
        return event.parameters[key].length !== 1;
      })
    )
      throw new Error('INVALID_REQUEST');
    var submission = enquiryValidate_(values);
    lock = LockService.getScriptLock();
    locked = lock.tryLock(10000);
    if (!locked) throw new Error('BUSY');
    var sheet = enquirySheet_(properties);
    // A lost HTTP acknowledgement must never create another row or email.
    if (sheet.getLastRow() > 1) {
      var found = sheet
        .getRange(2, 2, sheet.getLastRow() - 1, 1)
        .createTextFinder(submission.submissionId)
        .matchEntireCell(true)
        .findNext();
      if (found)
        return enquiryResponse_({
          ok: true,
          submissionId: submission.submissionId,
        });
    }
    var retryAfter = enquiryRateLimit_(
      properties,
      values.clientKey,
      submission.email,
      secret
    );
    if (retryAfter)
      return enquiryResponse_({
        ok: false,
        code: 'RATE_LIMIT',
        retryAfter: retryAfter,
      });
    var row = [
      new Date().toISOString(),
      submission.submissionId,
      submission.kind === 'demo' ? 'Demo request' : 'Project enquiry',
      submission.name,
      submission.email,
      submission.company,
      submission.interest,
      submission.topic,
      submission.message,
      submission.kind === 'demo' ? '/book-a-demo/' : '/contact/',
      'Pending',
      '',
    ].map(enquirySheetText_);
    sheet.appendRow(row);
    SpreadsheetApp.flush();
    // The saved row is authoritative even when MailApp is unavailable or out of quota.
    try {
      enquiryNotify_(sheet, sheet.getLastRow(), row, properties);
    } catch (_) {
      /* Keep the row and status for review. */
    }
    return enquiryResponse_({
      ok: true,
      submissionId: submission.submissionId,
    });
  } catch (_) {
    // Never expose personal data, configuration or stack traces to the caller.
    return enquiryResponse_({ ok: false, code: 'UNAVAILABLE' });
  } finally {
    if (locked) lock.releaseLock();
  }
}

function enquiryValidate_(values) {
  var submission = {
    submissionId: enquiryText_(values.submissionId, 36),
    kind: enquiryText_(values.kind, 7),
    name: enquiryText_(values.name, 120),
    email: enquiryText_(values.email, 254).toLowerCase(),
    company: enquiryText_(values.company, 160),
    interest: enquiryText_(values.interest, 80),
    message: enquiryText_(values.message, 3000, true),
  };
  var topics = enquiryTopics_();
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      submission.submissionId
    ) ||
    ['contact', 'demo'].indexOf(submission.kind) === -1 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submission.email) ||
    !Object.prototype.hasOwnProperty.call(topics, submission.interest) ||
    !/^[0-9a-f]{64}$/.test(values.clientKey || '')
  )
    throw new Error('INVALID_REQUEST');
  submission.topic = topics[submission.interest];
  return submission;
}

function enquiryTopics_() {
  // Keep in sync with src/data/enquiry-topics.ts (covered by repository tests).
  return {
    'customer-support': 'Customer support & voice assistance',
    'document-processing': 'Document & information processing',
    'employee-assistance': 'Internal knowledge & employee assistance',
    'sales-operations': 'Sales operations',
    'field-operations': 'Field operations & voice documentation',
    'speech-content': 'Speech & content',
    'ai-agents': 'Custom AI agents',
    chatbots: 'Chatbots',
    'voice-bots': 'Voicebots',
    'text-to-speech': 'Text to speech',
    'speech-to-text': 'Speech to text',
    'proprietary-models': 'Proprietary model development',
    'workflow-designer': 'Workflow designer',
    combined: 'A combination of capabilities',
    'help-me-decide': 'Help me define the right approach',
  };
}

function enquirySheet_(properties) {
  var spreadsheetId = properties.getProperty('ENQUIRY_SPREADSHEET_ID');
  if (!spreadsheetId) throw new Error('NOT_CONFIGURED');
  var workbook = SpreadsheetApp.openById(spreadsheetId);
  var sheetName = properties.getProperty('ENQUIRY_SHEET_NAME') || 'Enquiries';
  var sheet =
    workbook.getSheetByName(sheetName) || workbook.insertSheet(sheetName);
  var headers = [
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
    'Notification status',
    'Notified at (UTC)',
  ];
  if (sheet.getLastRow() === 0) sheet.appendRow(headers);
  else {
    var existing = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
    if (
      headers.some(function (header, index) {
        return index < 10
          ? existing[index] !== header
          : existing[index] && existing[index] !== header;
      })
    )
      throw new Error('SHEET_HEADERS');
    // Upgrade the previous ten-column sheet without changing historical rows.
    if (!existing[10] || !existing[11])
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  return sheet;
}

function enquiryRateLimit_(properties, clientKey, email, secret) {
  var now = Date.now();
  var hour = Math.floor(now / 3600000);
  var day = Math.floor(now / 86400000);
  var emailKey = Utilities.computeHmacSha256Signature(email, secret)
    .map(function (byte) {
      return ('0' + ((byte + 256) % 256).toString(16)).slice(-2);
    })
    .join('');
  var limits = [
    {
      key: 'enquiry.rate.ip.' + hour + '.' + clientKey,
      maximum: 5,
      expires: (hour + 1) * 3600000,
    },
    {
      key: 'enquiry.rate.email.' + hour + '.' + emailKey,
      maximum: 3,
      expires: (hour + 1) * 3600000,
    },
    {
      key: 'enquiry.rate.day.' + day,
      maximum: 100,
      expires: (day + 1) * 86400000,
    },
  ];
  // Durable, shared counters under the script lock; no function-local rate limiter.
  var stored = enquiryPruneCounters_(properties, now);
  var updates = {};
  for (var index = 0; index < limits.length; index++) {
    var limit = limits[index];
    var count = stored[limit.key] ? JSON.parse(stored[limit.key]).count : 0;
    if (count >= limit.maximum)
      return Math.max(60, Math.ceil((limit.expires - now) / 1000));
    updates[limit.key] = JSON.stringify({
      count: count + 1,
      expires: limit.expires,
    });
  }
  properties.setProperties(updates, false);
  return 0;
}

function enquiryPruneCounters_(properties, now) {
  var stored = properties.getProperties();
  Object.keys(stored).forEach(function (key) {
    if (key.indexOf('enquiry.rate.') !== 0) return;
    try {
      if (JSON.parse(stored[key]).expires <= now) {
        properties.deleteProperty(key);
        delete stored[key];
      }
    } catch (_) {
      properties.deleteProperty(key);
      delete stored[key];
    }
  });
  return stored;
}

function enquiryNotify_(sheet, rowNumber, row, properties) {
  if (row[10] !== 'Pending') return;
  var recipient = properties.getProperty('ENQUIRY_NOTIFICATION_EMAIL') || '';
  if (
    !/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(recipient) ||
    MailApp.getRemainingDailyQuota() < 1
  )
    return;
  // Mark before sending: an interrupted or ambiguous send requires manual review,
  // rather than an automatic resend that could send the same alert twice.
  sheet.getRange(rowNumber, 11).setValue('Sending');
  SpreadsheetApp.flush();
  try {
    var plain = row.map(function (value) {
      return String(value).replace(/^'(?=[=+\-@\t\r\n])/, '');
    });
    MailApp.sendEmail({
      to: recipient,
      replyTo: plain[4],
      name: 'QWERTY Labs website',
      subject: 'QWERTY Labs: new ' + plain[2].toLowerCase(),
      body:
        'A new website enquiry has been saved.\n\n' +
        'Submission ID: ' +
        plain[1] +
        '\nReceived (UTC): ' +
        plain[0] +
        '\nName: ' +
        plain[3] +
        '\nEmail: ' +
        plain[4] +
        '\nCompany: ' +
        plain[5] +
        '\nArea of interest: ' +
        plain[7] +
        '\n\nMessage:\n' +
        plain[8] +
        '\n\nSource: ' +
        plain[9] +
        '\n\nInternal notification. Handle these details as private business correspondence.',
    });
    sheet
      .getRange(rowNumber, 11, 1, 2)
      .setValues([['Sent', new Date().toISOString()]]);
    SpreadsheetApp.flush();
  } catch (_) {
    sheet.getRange(rowNumber, 11).setValue('Needs review');
    SpreadsheetApp.flush();
  }
}

/** Run once as owner to authorise Sheets/Mail and install the five-minute worker. */
function setupEnquiryNotifications() {
  var properties = PropertiesService.getScriptProperties();
  var recipient = properties.getProperty('ENQUIRY_NOTIFICATION_EMAIL') || '';
  if (!/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(recipient))
    throw new Error(
      'Set one internal ENQUIRY_NOTIFICATION_EMAIL in Script Properties.'
    );
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) throw new Error('BUSY');
  try {
    enquirySheet_(properties);
    MailApp.getRemainingDailyQuota(); // Requests permission without sending a test email.
    var exists = ScriptApp.getProjectTriggers().some(function (trigger) {
      return trigger.getHandlerFunction() === 'sendPendingEnquiryNotifications';
    });
    if (!exists)
      ScriptApp.newTrigger('sendPendingEnquiryNotifications')
        .timeBased()
        .everyMinutes(5)
        .create();
  } finally {
    lock.releaseLock();
  }
}

/** Retries only definitely-unsent Pending alerts, up to ten per run. */
function sendPendingEnquiryNotifications() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return;
  try {
    var properties = PropertiesService.getScriptProperties();
    enquiryPruneCounters_(properties, Date.now());
    var sheet = enquirySheet_(properties);
    if (sheet.getLastRow() < 2) return;
    var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 12).getValues();
    var attempted = 0;
    for (var index = 0; index < rows.length && attempted < 10; index++) {
      if (rows[index][10] === 'Pending') {
        enquiryNotify_(sheet, index + 2, rows[index], properties);
        attempted++;
      }
    }
  } finally {
    lock.releaseLock();
  }
}

function enquiryText_(value, maximum, multiline) {
  if (typeof value !== 'string') throw new Error('INVALID_REQUEST');
  var text = value.trim();
  if (
    !text ||
    text.length > maximum ||
    /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(text) ||
    (!multiline && /[\r\n\t]/.test(text))
  )
    throw new Error('INVALID_REQUEST');
  return text;
}

function enquiryEqual_(left, right) {
  if (typeof left !== 'string' || left.length !== right.length) return false;
  var difference = 0;
  for (var index = 0; index < right.length; index++)
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

function enquirySheetText_(value) {
  return /^[=+\-@\t\r\n]/.test(value) ? "'" + value : value;
}

function enquiryResponse_(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(
    ContentService.MimeType.JSON
  );
}
