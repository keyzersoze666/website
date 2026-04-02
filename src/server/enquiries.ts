import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import { siteConfiguration } from '../config/site.ts';
import { enquiryTopics } from '../data/enquiry-topics.ts';

type Environment = Record<string, string | undefined>;
const maximumBodyBytes = 24_000;
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function text(value: unknown, maximum: number, multiline = false) {
  if (typeof value !== 'string') throw new Error('INVALID_INPUT');
  const result = value.trim();
  if (
    !result ||
    result.length > maximum ||
    /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(result) ||
    (!multiline && /[\r\n\t]/.test(result))
  )
    throw new Error('INVALID_INPUT');
  return result;
}

function validateEnquiry(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new Error('INVALID_INPUT');
  const values = input as Record<string, unknown>;
  if (
    values.website !== '' ||
    typeof values.turnstileToken !== 'string' ||
    !values.turnstileToken ||
    values.turnstileToken.length > 2048
  )
    throw new Error('INVALID_INPUT');
  const submissionId = text(values.submissionId, 36);
  const kind = text(values.kind, 7);
  const email = text(values.email, 254).toLowerCase();
  const interest = text(values.interest, 80);
  const topic = enquiryTopics.find((entry) => entry.id === interest);
  if (
    !uuid.test(submissionId) ||
    !['contact', 'demo'].includes(kind) ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !topic
  )
    throw new Error('INVALID_INPUT');
  return {
    submissionId,
    kind,
    name: text(values.name, 120),
    email,
    company: text(values.company, 160),
    interest,
    topic: topic.label,
    message: text(values.message, 3000, true),
  };
}

function configuration(env: Environment) {
  const site = new URL(siteConfiguration(env).url);
  const receiver = new URL(env.GOOGLE_APPS_SCRIPT_URL || '');
  if (
    env.VERCEL_ENV === 'preview' ||
    site.protocol !== 'https:' ||
    site.pathname !== '/' ||
    site.username ||
    site.password ||
    site.search ||
    site.hash ||
    receiver.protocol !== 'https:' ||
    receiver.hostname !== 'script.google.com' ||
    receiver.port ||
    receiver.username ||
    receiver.password ||
    receiver.search ||
    receiver.hash ||
    !/^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(receiver.pathname) ||
    !env.TURNSTILE_SECRET_KEY?.trim() ||
    !env.ENQUIRY_SHARED_SECRET ||
    env.ENQUIRY_SHARED_SECRET.length < 32
  )
    throw new Error('NOT_CONFIGURED');
  return {
    site,
    receiver,
    secret: env.ENQUIRY_SHARED_SECRET,
    turnstileSecret: env.TURNSTILE_SECRET_KEY,
  };
}

function response(status: number, body: object, retryAfter?: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...(status === 405 ? { Allow: 'POST' } : {}),
      ...(retryAfter ? { 'Retry-After': String(retryAfter) } : {}),
    },
  });
}

export async function handleEnquiry(
  request: Request,
  env: Environment = process.env,
  fetcher: typeof fetch = fetch
): Promise<Response> {
  if (request.method !== 'POST')
    return response(405, { ok: false, code: 'METHOD' });
  let config: ReturnType<typeof configuration>;
  try {
    config = configuration(env);
  } catch {
    return response(503, { ok: false, code: 'UNAVAILABLE' });
  }
  if (
    request.headers.get('origin') !== config.site.origin ||
    request.headers.get('sec-fetch-site') === 'cross-site'
  )
    return response(403, { ok: false, code: 'ORIGIN' });
  if (
    request.headers.get('content-type')?.split(';')[0].trim() !==
    'application/json'
  )
    return response(415, { ok: false, code: 'CONTENT_TYPE' });
  const declaredLength = Number(request.headers.get('content-length') || 0);
  if (
    !Number.isFinite(declaredLength) ||
    declaredLength < 0 ||
    declaredLength > maximumBodyBytes
  )
    return response(413, { ok: false, code: 'SIZE' });
  let submission: ReturnType<typeof validateEnquiry>;
  let values: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw, 'utf8') > maximumBodyBytes)
      return response(413, { ok: false, code: 'SIZE' });
    values = JSON.parse(raw);
    submission = validateEnquiry(values);
  } catch {
    return response(400, { ok: false, code: 'INVALID_INPUT' });
  }
  const address = (
    request.headers.get('x-vercel-forwarded-for') ||
    request.headers.get('x-forwarded-for') ||
    ''
  )
    .split(',')[0]
    .trim();
  // Vercel replaces these headers. Do not trust caller-provided IPs off-platform.
  const ip =
    env.VERCEL === '1' && isIP(address)
      ? address
      : env.VERCEL
        ? ''
        : '127.0.0.1';
  if (!ip) return response(503, { ok: false, code: 'UNAVAILABLE' });
  try {
    const verification = await fetcher(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        body: new URLSearchParams({
          secret: config.turnstileSecret,
          response: String(values.turnstileToken),
          remoteip: ip,
        }),
        signal: AbortSignal.timeout(10_000),
      }
    );
    const proof = await verification.json();
    if (
      !verification.ok ||
      proof.success !== true ||
      proof.hostname !== config.site.hostname ||
      proof.action !== 'enquiry'
    )
      return response(400, { ok: false, code: 'VERIFICATION' });
  } catch {
    return response(503, { ok: false, code: 'VERIFICATION' });
  }
  try {
    const clientKey = createHmac('sha256', config.secret)
      .update(`ip:${ip}`)
      .digest('hex');
    // Apps Script exposes form parameters, not arbitrary request headers.
    // Keep this secret in the server-to-server body, outside browser code.
    const upstream = await fetcher(config.receiver.href, {
      method: 'POST',
      redirect: 'follow',
      body: new URLSearchParams({
        ...submission,
        sharedSecret: config.secret,
        clientKey,
      }),
      signal: AbortSignal.timeout(35_000),
    });
    const saved = await upstream.json();
    if (
      upstream.ok &&
      saved.ok === true &&
      saved.submissionId === submission.submissionId
    )
      return response(200, { ok: true, submissionId: submission.submissionId });
    if (upstream.ok && saved.ok === false && saved.code === 'RATE_LIMIT')
      return response(
        429,
        { ok: false, code: 'RATE_LIMIT' },
        Math.min(86400, Math.max(60, Number(saved.retryAfter) || 3600))
      );
  } catch {
    /* A lost acknowledgement does not prove the row was not saved. */
  }
  return response(502, { ok: false, code: 'DELIVERY_UNCONFIRMED' });
}

export { maximumBodyBytes };
