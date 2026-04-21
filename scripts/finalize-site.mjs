import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

function protect(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      protect(path);
      continue;
    }
    if (!entry.name.endsWith('.html')) continue;
    const html = readFileSync(path, 'utf8').replace(
      /<meta http-equiv="Content-Security-Policy"[^>]*>/gi,
      ''
    );
    const challengeSource = html.includes('data-enquiry-captcha')
      ? ' https://challenges.cloudflare.com'
      : '';
    const hashes = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
      .filter((match) => !/\bsrc\s*=/i.test(match[1]))
      .map(
        (match) =>
          `'sha256-${createHash('sha256').update(match[2].replace(/\r\n?/g, '\n')).digest('base64')}'`
      );
    // Math and graphics use inline styles; executable scripts stay hash-bound.
    const policy = [
      "default-src 'self'",
      `script-src 'self'${challengeSource} ${[...new Set(hashes)].join(' ')}`,
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self'",
      "img-src 'self' data:",
      `connect-src 'self'${challengeSource}`,
      `frame-src ${challengeSource.trim() || "'none'"}`,
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'none'",
      "form-action 'self'",
    ].join('; ');
    writeFileSync(
      path,
      html.replace(
        /<head\b[^>]*>\s*<meta\s+charset[^>]*>/i,
        (head) =>
          `${head}<meta http-equiv="Content-Security-Policy" content="${policy}">`
      )
    );
  }
}
protect('dist');
console.log(
  'Added page-specific script hashes and content security policies to built HTML.'
);
