# QWERTY Labs website

Company website, research journal and workflow designer for QWERTY Labs. Built with Astro and TypeScript. Pages are static; form submissions use a separate Vercel function.

## Development

Use Node.js 24 and npm.

```sh
npm ci
npm run dev
```

## Checks

```sh
npm test
npm run check
npm run build
npm run validate:site
```

The build writes `dist/` and adds page-specific content security policies.

## Configuration

Copy `.env.example` to `.env.local` for local settings. Vercel Production defaults to `https://qwertylabs.com`. Override `SITE_URL` to change the primary HTTPS origin, then redeploy. The same domain controls canonical URLs, the sitemap and form-origin checks. Previews and unconfigured local builds disable indexing; `SITE_INDEXABLE=false` disables it before launch.

Enquiries need Turnstile keys, the deployed Apps Script URL and a shared secret. Keep the spreadsheet Restricted. Missing configuration fails closed. See [deployment setup](docs/production-setup.md) and [Sheets/email setup](docs/google-sheets-enquiries.md).

## Source

- `src/pages/`, `src/components/`, `src/layouts/`: page content and shared UI.
- `src/data/`: company details, founders, capabilities and enquiry topics.
- `src/content/blog/`: journal manuscripts and references.
- `src/scripts/`, `src/styles/`: browser behaviour and styling.
- `api/`, `integrations/google-sheets/`: protected form delivery and email alerts.
- `public/`, `assets/`: served assets and editable artwork.
- `tests/`, `scripts/`: regression checks, validation and figure calculations.

Maintained by QWERTY Labs. Repository owner: [@keyzersoze666](https://github.com/keyzersoze666). See [architecture](docs/architecture.md) for implementation details, [asset replacement](docs/asset-replacement.md) for branding/photos.
