# Private Google Sheets enquiries and internal email notifications

The website sends contact/demo requests to `/api/enquiries` on **Vercel**. Only that server calls Apps Script, after validating the form and Cloudflare Turnstile. Keep the spreadsheet private; an Apps Script web app executing as its owner can append without making the spreadsheet public.

See [production/domain/security/search setup](production-setup.md) for the complete Vercel configuration. The old public `src/data/enquiry-delivery.json` configuration has been removed. Never add an Apps Script URL, spreadsheet ID, shared secret or private Turnstile key to frontend source or a `PUBLIC_` environment variable.

## 1. Restrict the spreadsheet and install the receiver

1. Create or select the spreadsheet. In Share → General access choose **Restricted**. Remove “Anyone with the link”, publish-to-web access and unnecessary collaborators. Share only with staff who need enquiry records. The Apps Script owner must have edit access.
2. Open Extensions → Apps Script and replace the receiver with [Code.gs](../integrations/google-sheets/Code.gs). Retain unrelated automation only after reviewing it for conflicts. In Project Settings, enable “Show appsscript.json manifest file”, then merge the supplied [manifest](../integrations/google-sheets/appsscript.json). It declares Sheets access, sending mail and installing this project's trigger; it does not request mailbox-reading access.
3. In Project Settings → **Script properties**, add the values below. These are project-wide private configuration, not cells, query parameters or source constants.

| Script property              | Required value                                                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `ENQUIRY_SPREADSHEET_ID`     | The ID between `/d/` and `/edit` in the sheet URL. This is not the entire URL.                                     |
| `ENQUIRY_SHEET_NAME`         | Optional tab name; defaults to `Enquiries`.                                                                        |
| `ENQUIRY_SHARED_SECRET`      | The same random secret (at least 32 characters) as Vercel's server-only variable.                                  |
| `ENQUIRY_NOTIFICATION_EMAIL` | One trusted internal recipient, or an internally controlled group address. The submitter cannot choose this value. |

Script editors can access these properties, so restrict editor access as well. Store enquiries only in a dedicated tab. Empty tabs get headers automatically. Existing tabs with the previous ten headers are upgraded by adding `Notification status` and `Notified at (UTC)` in columns K/L. Historical rows are left intact and are **not** emailed. A conflicting header row causes safe rejection; do not use a tab containing unrelated data.

## 2. Authorise and deploy

1. Select `setupEnquiryNotifications` in the Apps Script editor and click **Run** as the intended owner. Review Google's consent prompt and grant the needed Sheets/send-mail/trigger permissions. This reads the mail quota and installs one five-minute `sendPendingEnquiryNotifications` trigger; it sends **no test email**. The function can be run again without duplicating its trigger. If Google or your Workspace administrator blocks these scopes or anonymous web apps, resolve that account policy or use an alternative backend; do not make the sheet public.
2. Choose Deploy → New deployment → **Web app**. Set Execute as **Me** (the authorised spreadsheet owner) and Who has access **Anyone**, so the Vercel server can reach the receiver without an interactive Google login. This public web-app entry point is protected by the shared secret before spreadsheet access; it does not make the sheet public.
3. Copy the Web app URL ending `/macros/s/…/exec` to Vercel's private `GOOGLE_APPS_SCRIPT_URL`. Do not use the `/dev` testing URL. ContentService redirects are followed by the server, avoiding browser cross-origin acknowledgement issues.
4. For an existing deployment use Deploy → Manage deployments → Edit → **New version** → Deploy after code/permission changes. Saving the editor alone does not update `/exec`. Reauthorise the owner for the new mail scope if prompted. **Archive or update all old unauthenticated receiver deployments**, so they cannot bypass the new protection.
5. Configure the other Vercel values in [production setup](production-setup.md), then redeploy the website. Verify that the function is present as well as the static pages.

On the real primary domain, complete one contact form and one demo form using non-sensitive test details. Check that each produces exactly one row and one internal email. Inspect the `Sent` status/timestamp, expected topic/source page, and confirmation only after acknowledgement. Check that the sheet still cannot be opened by a signed-out visitor. These are deployment checks for you to perform; automated repository tests mock Google and mail.

## 3. Delivery, retries and email status

Rows contain UTC time, submission UUID, request type, name, email, company, approved interest ID/label, message, fixed source path, notification status and notified time. Fields that could become formulas are stored as literal text. Topic labels and source paths are derived from approved values; client-supplied labels/URLs are not trusted. The raw network address is never stored in the sheet or included in the alert.

A row is saved and flushed **before** sending its notification. A failed email never reports the saved enquiry as lost. The internal plain-text alert includes the enquiry details; its Reply-To is the validated work email, so staff can reply normally. It is sent from the Apps Script owner's account, according to Google's account policies and quotas. No email is automatically sent to the submitter.

| Status                  | Meaning and action                                                                                                                                                                                                                  |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Pending`               | Definitely not yet attempted, for example no mail quota or no recipient configured. The five-minute worker retries up to ten Pending rows per run. Configure the recipient and allow quota to recover; it can also be run manually. |
| `Sending`               | The send started but execution may have stopped before recording its result. Check the recipient mailbox and Apps Script Executions. Automatic retries skip this state to avoid duplicate emails.                                   |
| `Sent`                  | MailApp accepted the send and the UTC timestamp was recorded. This does not guarantee final delivery to the inbox; check spam filtering/bounces if needed.                                                                          |
| `Needs review`          | MailApp threw an error; delivery may be uncertain. Inspect Executions and the mailbox. If you establish it was not sent, manually change the status to `Pending` and run the worker. Do not reset it blindly.                       |
| Blank historical status | An enquiry predating this notification setup. The worker does not send old enquiries.                                                                                                                                               |

Identical unchanged form retries reuse the UUID. The receiver returns success for an existing UUID without creating a second row or email, even if the first response was lost. Delivery across Sheets/email is not a single transaction: ambiguous sends need human review, and the code deliberately avoids automatically resending them. Reloading or editing a form creates a new request; check existing rows before resubmitting in those cases.

## 4. Validation and spam limits

Both server and receiver validate required fields, lengths, request kind, UUID, email and the interest allowlist. Browser limits alone are not security. The server checks same-origin JSON requests, bounded request size, an empty honeypot and a genuine Turnstile token bound to the configured hostname/action. The receiver checks the backend-only shared secret before accessing Sheets. It applies shared, durable counters under a script lock: 5 accepted new requests/IP/hour, 3/email/hour and 100/day globally, in fixed UTC windows. Duplicate retries do not spend quota. Counters use keyed hashes, expire automatically and are not written to enquiry rows. Update the constants in `enquiryRateLimit_` only after assessing volume and Google's account quotas; mirror any change in the documentation/tests and redeploy a new receiver version.

This limits spam entering the sheet and notification mailbox. A public Apps Script URL can still be invoked and consume some script execution resources even when authentication fails. Keep the URL server-side, retire obsolete deployments, and use Vercel's available WAF/rate controls to protect the public API. Same-origin checks alone are not bot authentication; Turnstile and the receiver limits are also required.

## 5. Troubleshooting and maintenance

- **Service unavailable:** check Vercel production environment values, redeployment, the function runtime and Apps Script access settings. Check that the shared secret matches exactly and is at least 32 characters. Previews intentionally do not submit.
- **Security check fails:** confirm public/private Turnstile keys belong to the same widget, the exact hostname is allowed, `SITE_URL` matches the browser's primary origin, and the challenge is not blocked. Complete a fresh check after a failed attempt.
- **Delivery unconfirmed but a row exists:** retry without editing the form. ContentService redirects and slow executions can delay acknowledgements; the ID prevents another row. Never treat an opaque browser response or HTTP success alone as evidence of a saved enquiry.
- **Rows exist, email missing:** inspect status K, quota, the internal recipient, spam folder and Apps Script Executions. Confirm the owner ran setup and the trigger exists. Archived/replaced projects or removed owner authorisation can stop the worker.
- **Header mismatch:** use a dedicated `Enquiries` tab with the documented headers. Preserve a private backup before changing historical data.
- **Rate limited:** wait until the returned window expires; the frontend asks the visitor to retry later. Limits include shared-office IPs and a global daily cap, so assess legitimate volume before increasing them.

Rotate the shared secret in Vercel and Script Properties together, then redeploy Vercel. Keep access to the sheet, project, notification mailbox, Vercel logs and exports restricted. Review records and alert copies periodically, remove what is no longer needed under the adopted retention policy, and avoid logging form content or tokens. Google's quotas depend on account type and may change; monitor actual usage rather than assuming unlimited mail.

References: [Apps Script web apps](https://developers.google.com/apps-script/guides/web), [MailApp](https://developers.google.com/apps-script/reference/mail/mail-app), [Apps Script quotas](https://developers.google.com/apps-script/guides/services/quotas), [Turnstile server validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/).
