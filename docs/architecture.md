# Architecture and maintenance

QWERTY Labs is a custom AI solutions company. The website presents client workflows, AI capabilities, research and development, a research journal, and enquiry forms. The registered entity is QWERTY Labs Private Limited, based in Bengaluru (Bangalore), Karnataka, India.

## Application structure

The application uses Astro static pages, TypeScript and a separate Vercel Node function for enquiries. Node 24.x and the committed npm lockfile define the development environment. Manrope and Source Sans 3 fonts are self-hosted. Journal mathematics is rendered during the build with matching KaTeX renderer, stylesheet and font versions.

| Area         | Routes and source                                                                          |
| ------------ | ------------------------------------------------------------------------------------------ |
| Home         | `/`; `src/pages/index.astro`, `src/data/home.ts`, homepage styles and motion modules       |
| Company      | `/about/`; editable founders in `src/data/founders.json`                                   |
| Solutions    | `/solutions/`; business workflows in `src/data/solutions.ts`                               |
| Capabilities | Five `/capabilities/` routes, sharing one page template and data in `capability-pages.ts`  |
| Research     | `/research-development/proprietary-models/` and `/research-development/workflow-designer/` |
| Journal      | `/blog/` and published Markdown articles in `src/content/blog/`                             |
| Enquiries    | `/contact/`, `/book-a-demo/`, `/enquiry-received/` and `/api/enquiries`                    |
| Legal        | `/privacy/`, `/terms/` and configurable `src/data/legal-details.json`                      |

Shared layouts and components provide the fixed navigation, reading themes, footer, branding and responsive page shells. The compact navigation breakpoint is 1360px. Compatibility redirects remain in `astro.config.mjs`. Saved browser preferences and workflow drafts preserve the previous storage keys through `browser-storage.ts`.

## Visual assets and motion

The company symbol appears beside the company name in the header/footer and above it on About Us. SVG geometry is embedded at build time so branding does not depend on an image-loader or mask request. Journal bylines use the RESEARCH symbol inside a padded white circular frame in both themes. Founder portraits have circular frames alongside name/role headings, with descriptions below. See [asset replacement](asset-replacement.md) for file paths, sizes and founder settings.

The SVG homepage current runs through input, context, review and next-step stages. Its loop is 17.2 seconds, with a 2.8-second review phase. The separate desktop capability explorer loads Three.js lazily and keeps native disclosures and static fallbacks. The confirmation envelope completes in 3.2 seconds. The shared scene loop pauses offscreen/hidden motion, honours reduced-motion preferences and releases resources when leaving. About Us uses a 900ms CSS fade for the complete symbol/name group. Scrolling remains native.

## Journal and workflow designer

Articles keep their publication dates, references, evidence notes, figures, CSV calculations, author profiles and related reading. The journal has three curated reading routes and a chronological archive. Content and citations distinguish illustrative calculations from published measurements. Do not change publication dates or research claims as part of visual maintenance. `validate:journal` checks published articles, references, math rendering, compatible KaTeX CSS/fonts and linked assets. Normal builds use the committed figures and CSV calculations.

The Workflow Designer supports manual graph editing, keyboard controls, named connections, validation, undo/redo, sample walkthroughs, local drafts and JSON/SVG exports. Its invoice example includes parallel checks, exception handling, approvals and bounded retries. It runs no live models or business-system actions. Prompt-based generation and proprietary models remain development goals. Dynamic editor state selectors are used at runtime and should not be removed solely because they are absent from initial HTML.

## Enquiries and legal details

Forms accept a name, work email, company, approved interest and message. Public topic identifiers carry context between pages; personal details stay out of URLs and browser storage. Local Review displays a plain-text summary. The same-origin Vercel API checks request origin, type, size, honeypot, field limits, topic allowlist and Turnstile before forwarding to the authenticated Sheets receiver.

The receiver validates independently, neutralises spreadsheet formulas, deduplicates UUIDs and applies shared locked request limits: five per IP/hour, three per email/hour and one hundred total/day. Keyed rate-counter identifiers are pruned when expired; raw IP addresses are absent from enquiry rows and email alerts. A row is saved before internal email notification. Pending notifications can be retried; ambiguous sends require review to avoid duplicates. The browser confirms only an acknowledged saved row and retains the same UUID for unchanged retries.

Founder details and legal particulars are editable data files. Placeholder names remain hidden until approved details are supplied. Optional missing registration/contact fields and unadopted effective dates are omitted. Terms includes the registration card; Privacy contains the data-handling notice and privacy contact route. Both documents currently show the revised date from `legal-details.json`. See [legal configuration](legal-drafting-notes.md) and [Sheets/email setup](google-sheets-enquiries.md).

## Deployment and verification

`https://qwertylabs.com` is the default Vercel Production origin for canonical URLs, social metadata, structured data, robots, sitemap and form-origin/Turnstile hostname checks. An explicit `SITE_URL` overrides that origin and must be a clean HTTPS origin. Previews and unconfigured local builds disable indexing; `SITE_INDEXABLE=false` disables it before launch. Forms, confirmation, legal pages and 404 remain excluded from search. Public page paths are listed in `src/data/seo.ts`; published articles join the sitemap automatically.

`vercel.json` configures the Node function and security headers. The build adds Content Security Policy script hashes to HTML. Inline styles remain allowed for mathematics and graphics; unsafe inline/eval scripts are not allowed. Cloudflare permissions apply to enquiry pages only. GitHub checks use pinned actions and read-only repository permissions; Dependabot proposes dependency updates. Account authentication, permissions, branch protection and service authorisation are configured separately. See [production setup](production-setup.md).

Run `npm ci`, `npm test`, `npm run check`, `npm run build`, `npm run validate:site` before release. Keep the journal renderer and CSS versions aligned during dependency changes. Mocked tests cover Google, mail and bot-verification behaviour; a real deployment still needs a service-to-service check with its configured domain and credentials. Never commit private environment files or send production form content to logs.
