# Vercel deployment, security and search setup

The production target is **Vercel**, connected to `keyzersoze666/labs_website`, branch `main`. Use the package name `qwerty-labs-website`, Node **24.x**, Astro, build command `npm run build`, and output directory `dist`. Root `api/enquiries.ts` is a separate Vercel Node function: publishing only the static `dist` directory to another host will not provide form delivery.

The primary domain is **https://qwertylabs.com**. The project owner records domain acquisition in October 2025 and initial website hosting in November 2025. Vercel Production uses this origin when `SITE_URL` is unset. An explicit `SITE_URL` overrides it for a future domain change. Page metadata and form-origin/Turnstile hostname checks share the same configuration. Complete the private service settings below before enabling form delivery; the form refuses to claim success while its service is unconfigured.

## 1. Domain and environment variables

In Vercel → Project → Settings → Environment Variables, set these for **Production**. Keep private values marked sensitive and out of Git. Redeploy after changes: the domain and public challenge key are embedded at build time, and server settings are read by the function.

| Setting                     | Value and purpose                                                                                                                                                     |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SITE_URL`                  | `https://qwertylabs.com`. Optional in Vercel Production, which defaults to this origin. Overrides must be HTTPS origins with no path, query, credentials or fragment. |
| `SITE_INDEXABLE`            | `true` for the final public site; `false` while preparing a temporary domain or before launch.                                                                        |
| `PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key. This is intentionally public.                                                                                                          |
| `TURNSTILE_SECRET_KEY`      | Matching Turnstile secret; server only.                                                                                                                               |
| `GOOGLE_APPS_SCRIPT_URL`    | Deployed Apps Script `/macros/s/…/exec` URL, server only. Never use a spreadsheet sharing URL or the `/dev` URL.                                                      |
| `ENQUIRY_SHARED_SECRET`     | A randomly generated secret, at least 32 characters. Set the identical value in Apps Script Script Properties.                                                        |

Generate a secret locally using a password manager or `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Copy it directly into the two private settings; do not paste it into source, issues, screenshots or public chats. The secret is not a Google account password.

If an older `SITE_URL` is already set in Vercel, change it to `https://qwertylabs.com` or remove it to use the production default. Set `SITE_INDEXABLE=true` for launch; use `false` while preparing the public site. For an intentionally separate temporary production domain, override `SITE_URL` and set `SITE_INDEXABLE=false`. Configure Turnstile for the matching hostname. The CI fixture `example.com` is only for unpublished validation builds.

In Vercel → Domains, connect `qwertylabs.com` as the primary domain and redirect `www.qwertylabs.com` to it. Configure DNS as Vercel instructs and verify HTTPS and redirects on the deployed site. If the domain changes later, update `SITE_URL`, the Turnstile hostname allowlist, and the verification/sitemap properties in Google and Bing; redeploy. Configure an HTTP 301/308 redirect from the old domain to the new one when you control both. **No application source edit is needed to override the domain.**

The setting controls canonical links, Open Graph URLs/images, Organization/WebSite identities, article and breadcrumb URLs, `sitemap.xml`, `robots.txt`, accepted form Origin and Turnstile hostname checks. Paths, titles and company details remain in `src/data/seo.ts`, page frontmatter, and `src/data/legal-details.json`. Add new public routes to `publicPagePaths` in `seo.ts`; published journal articles join the sitemap automatically. Keep noindex pages out of it.

Vercel Preview deployments always emit `noindex` and disallow crawling, and their submission function is disabled. Enable Vercel Deployment Protection for previews as well: robots directives are not access controls. Local builds without a domain also disable indexing. Run `npm run dev` for static UI work; this command does not run Vercel functions. Use the Vercel development workflow if testing the API locally, with dedicated development service settings; mocks cover the backend without contacting Google or sending mail.

## 2. Turnstile and Google Sheets

Create a **Managed** Turnstile widget in the Cloudflare dashboard and allow `qwertylabs.com`. It works with a Vercel-hosted domain; changing DNS providers is not required. Add the public and private keys above. Never use Cloudflare's always-pass test keys in production. The server validates every token with Cloudflare, including its hostname and `enquiry` action.

Follow [Google Sheets and email setup](google-sheets-enquiries.md) to keep the sheet Restricted, install the authenticated receiver, set the internal recipient, authorise MailApp, install the pending-mail worker and deploy a new Apps Script version. Replace any older public receiver deployment with this code or archive it: an old unauthenticated receiver would remain an alternate write path.

The service validates field types, length, email, UUID and interest allowlists; rejects a filled honeypot; checks same-origin requests; and neutralises spreadsheet formula input. Apps Script independently checks the shared secret, validates again, deduplicates IDs, and applies persistent shared limits under a lock: **5 per IP/hour, 3 per email/hour, 100 total/day**, using UTC fixed windows. Limits apply only to accepted new enquiries; unchanged retries reuse the same ID. IP/email identifiers in counters are keyed hashes, expired counters are pruned, and no raw IP enters the sheet or notification email. These are basic abuse limits, not a complete denial-of-service defence. Consider a Vercel WAF/rate-limiting rule for `/api/enquiries` to limit execution costs, using the features available on your plan.

The frontend waits for an exact saved-row acknowledgement through the same-origin function; it does not depend on Google browser CORS behaviour. It keeps details only in the current form. If the network loses the acknowledgement, the message says delivery is unconfirmed. Retry **without editing** to reuse the submission ID. The row may already exist; the receiver will acknowledge it without saving or mailing again. A page reload or edited form creates a new request, so check the sheet before resubmitting after either.

## 3. Repository, hosting and account security

The code adds security headers (HTTPS HSTS, frame blocking, content-type protection, referrer and permissions policies), and a build-generated Content Security Policy that hashes inline scripts. It permits Cloudflare's challenge only where needed. Styles allow inline declarations because KaTeX and the existing interactive graphics need them; JavaScript does not allow `unsafe-inline` or `unsafe-eval`. Per-page hashes are regenerated by `npm run build`; bypassing the finalisation step bypasses that protection. Changing HTML after the build requires regeneration of its hashes.

GitHub Actions runs tests, type checks, the production build, SEO/security output checks, journal math checks and formatting. The workflow has read-only repository permissions and uses pinned action commits. Dependabot opens weekly npm/action update PRs; nothing auto-merges. Keep KaTeX, its renderer and CSS versions aligned and run journal validation on updates.

Journal mathematics is rendered at build time from repository-owned Markdown. Keep the KaTeX renderer, parsing helpers, stylesheet and fonts compatible; run the journal validator after updating the math dependencies. Review dependency alerts before deploying a historical snapshot.

The following controls live in your accounts and must be enabled there; repository files cannot turn them on:

1. Use passkeys or strong two-factor authentication for GitHub, Vercel, Google, Cloudflare and the domain registrar. Keep recovery codes offline; use unique passwords.
2. Review collaborators, organisation members, GitHub Apps/OAuth grants, deploy hooks and API tokens. Remove unused access, use minimum scopes, rotate exposed secrets, and never share personal login credentials.
3. In GitHub branch rules/rulesets protect `main`: require a pull request and the `validate` status check, prevent force pushes/deletion, and apply protections to administrators where appropriate. For a sole maintainer, choose approval rules that do not lock you out. Enable dependency alerts and secret scanning/push protection where your plan supports them.
4. Restrict which repository/branch can deploy production in Vercel. Review Git integration permissions, team roles and environment access. Enable preview Deployment Protection; avoid sharing production secrets with untrusted preview builds. Inspect deployments and account audit/activity records periodically.
5. Keep Google Sheets sharing **Restricted**. Give only the owner/trusted staff access to the sheet, Apps Script project and notification mailbox. Use registrar/domain transfer locks and automatic renewal.

A visitor inspecting the public HTML or JavaScript gets neither repository access nor Vercel account access. Account compromise, excessive collaborator permissions or leaked tokens remain separate risks that code cannot eliminate.

For automatic deployments from this private repository, GitHub must associate the commit author with an account authorised for the Vercel project. Use a verified GitHub commit email or the privacy email provided in GitHub → Settings → Emails, and connect that GitHub account under Vercel → Account Settings → Login Connections. Blank commit emails cannot establish that association. If a deployment is blocked, check the project's collaboration settings and retry after correcting the account or commit identity. See [Vercel's collaboration troubleshooting](https://vercel.com/docs/deployments/troubleshoot-project-collaboration).

## 4. Google, Bing and other search engines

Do this after the final domain is live, public, and `SITE_INDEXABLE=true`:

1. In **Google Search Console**, add a **Domain property**, copy Google's TXT verification value into your domain's DNS, and verify. A Domain property covers HTTPS and www/non-www variants. DNS verification needs no HTML tag or source-code change. If you use a URL-prefix property instead, follow its exact URL scope and verification method.
2. Submit `https://qwertylabs.com/sitemap.xml` in Sitemaps. Use URL Inspection → Test live URL on `/`, `/about/`, `/solutions/`, key capabilities and articles, then request indexing for the most important pages. Check that Google sees the selected canonical and that indexing is allowed.
3. Use Google's Rich Results Test / Schema Markup Validator on the homepage and an article. Organization/WebSite/Breadcrumb/BlogPosting data describes real site content; it does not guarantee a rich result. Monitor Page Indexing, HTTPS, Core Web Vitals and Search Performance, including searches for “QWERTY Labs”.
4. In **Bing Webmaster Tools**, import the verified Search Console property or verify by DNS, then submit the same sitemap. Bing discovery can also help DuckDuckGo, which draws on Bing among other sources. DuckDuckGo has no equivalent mandatory Search Console submission.
5. Link the website from genuine company profiles and relevant independent listings, and use the exact “QWERTY Labs” name consistently. Add real social-profile links to structured data only when those profiles exist and are verified. Continue publishing useful, original material and earning relevant references. If eligible and appropriate, maintain a verified Google Business Profile with accurate business details; do not invent a public office address.

No SEO work or Search Console setting can guarantee the first result. These changes make the site crawlable and its company identity clearer; placement depends on indexing, competition, relevance and external reputation. Keep the existing intentional exclusions: forms, confirmation, legal pages and 404. The sitemap omits them; `robots.txt` allows crawlers to see their `noindex` directives.

No IndexNow secret, analytics tag, social URL or Google verification tag is fabricated. Add such integrations only when the actual account-specific values are available.

## 5. Release verification

Before deployment:

```sh
npm ci
npm test
npm run check
npm run build
npm run validate:site
npm run validate:journal
npm run format:check
```

Use the actual deployment environment for the build; `.env.local` and `.env` are supported and ignored by Git. The CI uses the reserved `https://example.com` origin strictly for its non-published validation build. A local unconfigured build is noindex and has an empty sitemap.

After settings are applied, verify on the **real primary domain**: HTTPS/redirects, canonical host, `robots.txt`, sitemap, social image, contact/demo security check, one saved row and one internal email per enquiry, unchanged retry behaviour, and expected response to invalid fields. Confirm the sheet is still Restricted and that no old public receiver bypass remains. Check Vercel function logs without adding form details/secrets to logs. Review Apps Script Executions and notification statuses if email is delayed. The committed tests use mocks and send no live notifications; they do not replace this final service-to-service test.
