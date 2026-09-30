import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { parseFrontmatter } from '@astrojs/markdown-remark';

const root = resolve(import.meta.dirname, '..');
const require = createRequire(import.meta.url);
const katexVersion = require('katex').version;
const rendererKatexVersion = createRequire(require.resolve('rehype-katex'))(
  'katex'
).version;
assert.equal(
  katexVersion,
  rendererKatexVersion,
  'KaTeX stylesheet/font dependency must match the rehype-katex renderer version'
);
const options = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((arg) => arg.startsWith('--') && arg.includes('='))
    .map((arg) => arg.slice(2).split('='))
);
const contentDir = resolve(root, 'src/content/blog');
const articles = readdirSync(contentDir)
  .filter((name) => name.endsWith('.md'))
  .map((name) => {
    const { frontmatter: data, content } = parseFrontmatter(
      readFileSync(resolve(contentDir, name), 'utf8')
    );
    return { slug: name.slice(0, -3), data, content };
  })
  .filter((article) => !article.data.draft)
  .sort((a, b) => new Date(b.data.publishedAt) - new Date(a.data.publishedAt));
if (options.count)
  assert.equal(
    articles.length,
    Number(options.count),
    'Unexpected published article count'
  );
const attrs = (text) =>
  Object.fromEntries(
    [...text.matchAll(/([\w:-]+)\s*=\s*["']([^"']*)["']/g)].map((match) => [
      match[1],
      match[2],
    ])
  );
for (const article of articles) {
  const date = new Date(article.data.publishedAt);
  assert.ok(!Number.isNaN(date.valueOf()), `Invalid date: ${article.slug}`);
  if (options.from)
    assert.ok(
      date >= new Date(options.from),
      `Date before allowed window: ${article.slug}`
    );
  if (options.to)
    assert.ok(
      date <= new Date(`${options.to}T23:59:59Z`),
      `Date after allowed window: ${article.slug}`
    );
  assert.equal(article.data.author, 'qwerty-labs-research');
  assert.ok(
    article.content.trim().split(/\s+/).length >= 1000,
    `Article too short: ${article.slug}`
  );
  assert.ok(article.data.references.length >= 3);
  const refIds = article.data.references.map((ref) => ref.id);
  assert.equal(new Set(refIds).size, refIds.length, 'Duplicate reference IDs');
  for (const ref of article.data.references) {
    assert.ok(['http:', 'https:'].includes(new URL(ref.url).protocol));
    if (ref.publishedAt)
      assert.ok(
        new Date(ref.publishedAt) <= date,
        `Reference postdates article: ${article.slug}/${ref.id}`
      );
  }
  const citations = [
    ...article.content.matchAll(
      /<a\b([^>]*\bclass="citation"[^>]*)>([\s\S]*?)<\/a>/g
    ),
  ].map((match) => ({
    attrs: attrs(match[1]),
    number: Number(match[2].replace(/[^\d]/g, '')),
  }));
  assert.equal(
    citations.length,
    refIds.length,
    `Missing or duplicated source citation: ${article.slug}`
  );
  citations.forEach((citation, index) => {
    assert.equal(
      citation.number,
      index + 1,
      `Citations out of order: ${article.slug}`
    );
    assert.equal(citation.attrs.id, `cite-${refIds[index]}`);
    assert.equal(citation.attrs.href, `#ref-${refIds[index]}`);
  });
  const figures = [...article.content.matchAll(/<img\b([^>]*)>/g)];
  assert.ok(figures.length >= 2, `Insufficient figures: ${article.slug}`);
  for (const figure of figures) {
    const a = attrs(figure[1]);
    assert.ok(a.alt?.length >= 20);
    assert.ok(
      existsSync(resolve(root, 'public', a.src.slice(1))),
      `Missing figure: ${a.src}`
    );
  }
  assert.ok(article.content.includes('$$'), 'No display equation');
}

function csv(name) {
  const lines = readFileSync(
    resolve(root, `public/journal/figures/${name}.csv`),
    'utf8'
  )
    .trim()
    .split(/\r?\n/);
  const parse = (line) => {
    const row = [];
    let field = '',
      quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (quoted && line[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = !quoted;
      } else if (ch === ',' && !quoted) {
        row.push(field);
        field = '';
      } else field += ch;
    }
    row.push(field);
    return row;
  };
  const header = parse(lines.shift());
  return lines.map((line) =>
    Object.fromEntries(
      parse(line).map((value, index) => [header[index], value])
    )
  );
}
const approx = (actual, expected) =>
  assert.ok(
    Math.abs(Number(actual) - expected) < 1e-6,
    `${actual} != ${expected}`
  );
const roi = csv('roi-weekly-cost');
approx(roi[0].total_usd, ((1000 * 24) / 60) * 30);
approx(roi[1].human_cost_usd, ((1000 * (0.8 * 7 + 0.2 * 35)) / 60) * 30);
approx(roi[1].total_usd, Number(roi[1].human_cost_usd) + 1400);
for (const row of csv('model-weight-storage'))
  approx(
    row.ideal_decimal_gb,
    (Number(row.parameters) * Number(row.bits_per_weight)) / 8 / 1e9
  );
for (const row of csv('isolation-test-confidence'))
  approx(
    row.upper_failure_fraction_95pct,
    1 - 0.05 ** (1 / Number(row.independent_trials))
  );
for (const row of csv('support-compound-reliability'))
  approx(
    row.end_to_end_success,
    Number(row.per_step_success) ** Number(row.steps)
  );
for (const row of csv('power-versus-energy'))
  approx(
    row.energy_joules,
    Number(row.power_watts) * Number(row.duration_seconds)
  );

for (const row of csv('small-model-routing-cost'))
  approx(row.expected_cost_units, 2 + 12 * Number(row.fallback_fraction));
for (const row of csv('quantisation-levels')) {
  const original = Number(row.original_weight);
  const restored = Number(row.reconstructed_weight);
  assert.ok(Math.abs(original - restored) <= 1 / 14 + 1e-6);
  assert.ok(Math.abs(restored * 7 - Math.round(restored * 7)) < 4e-6);
}
for (const row of csv('quantisation-metadata'))
  approx(
    row.ideal_decimal_gb,
    (Number(row.parameters) *
      (Number(row.payload_bits) +
        Number(row.metadata_bits_per_group) / Number(row.group_size))) /
      8 /
      1e9
  );
for (const row of csv('rag-retrieval-ceiling'))
  approx(
    row.end_to_end_fraction,
    Number(row.evidence_retrieval_fraction) *
      Number(row.acceptance_given_evidence)
  );
for (const row of csv('multi-agent-parallelism')) {
  const relative =
    Number(row.serial_fraction) +
    Number(row.parallel_fraction) / Number(row.workers) +
    Number(row.overhead_per_extra_worker) * (Number(row.workers) - 1);
  approx(row.relative_time, relative);
  approx(row.speedup, 1 / relative);
}
const invoice = csv('invoice-handling-time');
approx(
  invoice.reduce((sum, row) => sum + Number(row.fraction), 0),
  1
);
for (const row of invoice) {
  approx(row.cases, 1000 * Number(row.fraction));
  approx(
    row.human_hours,
    (Number(row.cases) * Number(row.human_minutes_each)) / 60
  );
}
approx(
  invoice.reduce((sum, row) => sum + Number(row.human_hours), 0),
  (1000 * 5.5) / 60
);
approx(
  csv('voice-response-budget').reduce(
    (sum, row) => sum + Number(row.duration_ms),
    0
  ),
  1000
);

const outcomes = csv('agent-evaluation-scorecard');
approx(
  outcomes.reduce((sum, row) => sum + Number(row.cases), 0),
  500
);
assert.deepEqual(
  outcomes.map((row) => Number(row.cases)),
  [320, 15, 125, 40]
);
for (const row of csv('agent-repeat-reliability')) {
  const p = Number(row.single_trial_success),
    k = Number(row.trials);
  approx(row.at_least_one, 1 - (1 - p) ** k);
  approx(row.every_trial, p ** k);
}
for (const row of csv('distillation-break-even')) {
  approx(row.teacher_units, 10 * Number(row.accepted_tasks));
  approx(row.student_units, 1200 + 2 * Number(row.accepted_tasks));
}
for (const row of csv('kv-cache-budget'))
  approx(
    row.ideal_gib,
    (2 *
      Number(row.layers) *
      Number(row.kv_heads) *
      Number(row.head_dimension) *
      Number(row.tokens) *
      Number(row.sequences) *
      Number(row.bytes_per_value)) /
      2 ** 30
  );
const sales = csv('sales-workflow-time');
approx(
  sales.reduce((sum, row) => sum + Number(row.baseline_minutes), 0),
  12
);
approx(
  sales.reduce((sum, row) => sum + Number(row.assisted_minutes), 0),
  5
);
assert.deepEqual(
  csv('training-data-audit').map((row) => Number(row.documents_retained)),
  [100000, 78000, 70000, 62000]
);
for (const row of csv('duplicate-split-leakage')) {
  const p = Number(row.train_fraction),
    m = Number(row.family_size);
  approx(row.cross_split_probability, 1 - p ** m - (1 - p) ** m);
}
for (const row of csv('speculative-decoding-cost')) {
  const k = Number(row.draft_tokens),
    alpha = Number(row.conditional_acceptance);
  const expected = (1 - alpha ** (k + 1)) / (1 - alpha);
  const cost = 1 + 0.1 * (k - 1) + 0.1 * k;
  approx(row.expected_tokens_advanced, expected);
  approx(row.round_cost_units, cost);
  approx(row.speedup, expected / cost);
}
for (const row of csv('canary-failure-observation'))
  approx(
    row.observation_probability,
    1 - (1 - Number(row.failure_probability)) ** Number(row.requests)
  );

if (process.argv.includes('--built')) {
  const dist = resolve(root, 'dist');
  const assetOrigin = 'https://journal-assets.invalid';
  const checkedStylesheets = new Map();
  function checkMathStylesheet(href, slug) {
    const stylesheetUrl = new URL(href, `${assetOrigin}/blog/${slug}/`);
    if (stylesheetUrl.origin !== assetOrigin) return false;
    const pathname = decodeURIComponent(stylesheetUrl.pathname);
    if (checkedStylesheets.has(pathname))
      return checkedStylesheets.get(pathname);
    const css = readFileSync(resolve(dist, pathname.slice(1)), 'utf8');
    const cssVersion = css.match(
      /\.katex-version:{1,2}after\s*\{[^}]*\bcontent:\s*["']([^"']+)["']/
    )?.[1];
    if (!cssVersion) {
      checkedStylesheets.set(pathname, false);
      return false;
    }
    assert.equal(
      cssVersion,
      katexVersion,
      `Built KaTeX stylesheet version differs from the renderer: ${pathname}`
    );
    for (const match of css.matchAll(/url\(\s*["']?([^"')\s]+)["']?\s*\)/g)) {
      if (!/\.(?:woff2?|ttf|otf)(?:[?#]|$)/i.test(match[1])) continue;
      const fontUrl = new URL(match[1], stylesheetUrl);
      assert.equal(
        fontUrl.origin,
        assetOrigin,
        `Math stylesheet references a font outside the site: ${fontUrl.href}`
      );
      assert.ok(
        existsSync(
          resolve(dist, decodeURIComponent(fontUrl.pathname).slice(1))
        ),
        `Missing bundled font: ${fontUrl.pathname}`
      );
    }
    checkedStylesheets.set(pathname, true);
    return true;
  }
  const index = readFileSync(resolve(dist, 'blog/index.html'), 'utf8');
  assert.ok(
    !/<(?:input|select)\b|data-filter/.test(index),
    'Landing page contains a filter or search control'
  );
  // Editorial reading routes can repeat articles outside the chronological cards.
  const links = [...index.matchAll(/<a\b([^>]+)>/g)]
    .map((match) => attrs(match[1]))
    .filter((link) => link.class?.split(/\s+/).includes('journal-card-link'))
    .map((link) => link.href?.match(/^\/blog\/([^/]+)\/$/)?.[1]);
  assert.deepEqual(
    links,
    articles.map((article) => article.slug),
    'Blog listing order differs from article dates'
  );
  assert.equal(
    [...index.matchAll(/<article\b[^>]*class="[^"]*journal-card\b/g)].length,
    articles.length
  );
  for (const article of articles) {
    const path = resolve(dist, `blog/${article.slug}/index.html`),
      html = readFileSync(path, 'utf8');
    const stylesheets = [...html.matchAll(/<link\b([^>]+)>/g)]
      .map((match) => attrs(match[1]))
      .filter((link) => link.rel?.split(/\s+/).includes('stylesheet'));
    assert.ok(
      stylesheets
        .map(
          (link) => link.href && checkMathStylesheet(link.href, article.slug)
        )
        .some(Boolean),
      `Article has no matching bundled KaTeX stylesheet: ${article.slug}`
    );
    const json = [
      ...html.matchAll(
        /<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g
      ),
    ]
      .flatMap((match) => {
        const value = JSON.parse(match[1]);
        return value['@graph'] || [value];
      })
      .find((item) => item['@type'] === 'BlogPosting');
    assert.equal(json?.headline, article.data.title);
    assert.equal(json?.author.name, 'QWERTY Labs Research');
    assert.equal(
      json?.datePublished,
      new Date(article.data.publishedAt).toISOString()
    );
    assert.equal([...html.matchAll(/<h1\b/g)].length, 1);
    assert.ok(
      /class="[^"]*katex-display/.test(html),
      `Equation was not rendered: ${article.slug}`
    );
    assert.ok(
      !html.includes('katex-error'),
      `Math rendering failed: ${article.slug}`
    );
    assert.ok(
      html.includes('data-svg-src="/journal/team-profile.svg"') &&
        html.includes('data-article-body')
    );
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
    assert.equal(
      new Set(ids).size,
      ids.length,
      `Duplicate HTML IDs: ${article.slug}`
    );
    for (const match of html.matchAll(/\bhref="#([^"]+)"/g))
      assert.ok(
        ids.includes(decodeURIComponent(match[1])),
        `Broken anchor ${match[1]} in ${article.slug}`
      );
    for (const match of html.matchAll(/\b(?:src|href)="(\/[^"#?]*)/g)) {
      const url = decodeURIComponent(match[1]);
      if (url.startsWith('//')) continue;
      const file = resolve(dist, url.slice(1));
      assert.ok(
        existsSync(file) || existsSync(resolve(file, 'index.html')),
        `Missing local asset or page ${url} in ${article.slug}`
      );
    }
    assert.ok(html.includes('<table'), 'Missing rendered table');
  }
}
console.log(
  `Journal checks passed: ${articles.length} complete articles, dates, ordered citations, figures, calculation data${process.argv.includes('--built') ? ', static pages, equations, compatible math styles/fonts, author metadata and links' : ''}.`
);
