# QWERTY Labs

A website for custom AI solutions, business workflows and research.

## Development

Use Node.js 24 and npm.

```sh
npm ci
npm run dev
```

Before release, run the tests, type checks, production build and formatting check:

```sh
npm test
npm run check
npm run build
npm run format:check
```

Application pages live in `src/pages`, reusable elements in `src/components`, shared shells in `src/layouts`, content in `src/data`, and styles in `src/styles`. Public artwork lives in `public`. Company details and founder profiles are editable data files.
