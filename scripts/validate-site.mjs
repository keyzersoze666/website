import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? files(join(directory, entry.name))
      : [join(directory, entry.name)]
  );
}
const output = files('dist');
const homepage = readFileSync('dist/index.html', 'utf8');
const canonicalTag = /<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/i;
const root = new URL(homepage.match(canonicalTag)?.[1] || '');
if (process.env.SITE_URL)
  assert.equal(
    root.origin,
    new URL(process.env.SITE_URL).origin,
    'Built domain must match SITE_URL'
  );
const indexable = new Set();
let pages = 0;
for (const path of output.filter((file) => file.endsWith('.html'))) {
  const html = readFileSync(path, 'utf8');
  if (/<meta[^>]+http-equiv="refresh"/i.test(html)) continue;
  pages++;
  const canonical = new URL(html.match(canonicalTag)?.[1] || '');
  assert.equal(canonical.origin, root.origin, `${path}: canonical origin`);
  assert.equal(
    canonical.search + canonical.hash,
    '',
    `${path}: clean canonical`
  );
  assert.match(html, /<title>[^<]+<\/title>/, `${path}: title`);
  assert.match(
    html,
    /<meta name="description" content="[^"]+"/,
    `${path}: description`
  );
  assert.ok(
    html.includes(`property="og:url" content="${canonical.href}"`),
    `${path}: OG URL`
  );
  assert.ok(
    html.includes(
      `property="og:image" content="${new URL('/brand/social-card.png', root).href}"`
    ),
    `${path}: social image`
  );
  assert.equal(
    [...html.matchAll(/<h1\b/g)].length,
    1,
    `${path}: one primary heading`
  );
  if (!/<meta name="robots" content="noindex, follow"/.test(html))
    indexable.add(canonical.href);
  const policy = html.match(
    /<meta http-equiv="Content-Security-Policy" content="([^"]+)"/
  )?.[1];
  assert.ok(policy, `${path}: CSP`);
  assert.equal(
    policy.includes('https://challenges.cloudflare.com'),
    html.includes('data-enquiry-captcha'),
    `${path}: challenge permissions only on enquiry pages`
  );
  const scriptPolicy = policy
    .split(';')
    .find((directive) => directive.trim().startsWith('script-src'));
  assert.ok(
    !scriptPolicy.includes("'unsafe-inline'") &&
      !scriptPolicy.includes("'unsafe-eval'"),
    `${path}: script policy`
  );
  assert.ok(
    html.indexOf('Content-Security-Policy') < html.indexOf('<script'),
    `${path}: CSP precedes scripts`
  );
  for (const script of html.matchAll(
    /<script\b([^>]*)>([\s\S]*?)<\/script>/gi
  )) {
    if (/\bsrc\s*=/.test(script[1])) continue;
    const hash = createHash('sha256')
      .update(script[2].replace(/\r\n?/g, '\n'))
      .digest('base64');
    assert.ok(
      scriptPolicy.includes(`'sha256-${hash}'`),
      `${path}: inline script hash`
    );
  }
  for (const match of html.matchAll(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g
  )) {
    const data = JSON.parse(match[1]);
    assert.equal(data['@context'], 'https://schema.org');
    assert.ok(Array.isArray(data['@graph']));
  }
}
const sitemap = readFileSync('dist/sitemap.xml', 'utf8');
const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
  (match) => match[1]
);
assert.equal(
  new Set(locations).size,
  locations.length,
  'Unique sitemap entries'
);
assert.deepEqual(
  new Set(locations),
  indexable,
  'Sitemap exactly matches indexable canonical pages'
);
const robots = readFileSync('dist/robots.txt', 'utf8');
if (indexable.size) {
  assert.ok(robots.includes(`Sitemap: ${new URL('/sitemap.xml', root).href}`));
  assert.ok(robots.includes('Disallow: /api/'));
} else assert.match(robots, /Disallow: \/\s*$/);
for (const route of [
  '/contact/',
  '/book-a-demo/',
  '/enquiry-received/',
  '/privacy/',
  '/terms/',
])
  assert.ok(
    !indexable.has(new URL(route, root).href),
    `${route}: search exclusion`
  );
const identities = JSON.parse(
  homepage.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]
)['@graph'];
assert.ok(
  identities.some(
    (item) => item['@type'] === 'Organization' && item.name === 'QWERTY Labs'
  )
);
assert.ok(identities.some((item) => item['@type'] === 'WebSite'));
assert.ok(existsSync('dist/brand/logo-search.svg'));
const png = readFileSync('dist/brand/social-card.png');
assert.equal(png.readUInt32BE(16), 1200);
assert.equal(png.readUInt32BE(20), 630);
for (const path of output.filter((file) =>
  /\.(html|js|css|json|xml|txt)$/.test(file)
)) {
  const content = readFileSync(path, 'utf8');
  assert.ok(
    !content.includes('script.google.com/macros/s/'),
    `${path}: receiver URL must remain server-side`
  );
  for (const key of ['ENQUIRY_SHARED_SECRET', 'TURNSTILE_SECRET_KEY'])
    if (process.env[key])
      assert.ok(
        !content.includes(process.env[key]),
        `${path}: ${key} must remain server-side`
      );
}
const vercel = JSON.parse(readFileSync('vercel.json', 'utf8'));
assert.ok(
  vercel.headers[0].headers.some(
    (header) => header.key === 'X-Frame-Options' && header.value === 'DENY'
  )
);
assert.ok(
  vercel.headers[0].headers.some(
    (header) =>
      header.key === 'Content-Security-Policy' &&
      header.value.includes("frame-ancestors 'none'")
  )
);
console.log(
  `Validated ${pages} pages, ${locations.length} sitemap entries, structured data, social assets, script policies and secret isolation.`
);
