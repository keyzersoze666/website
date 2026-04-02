import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleEnquiry, maximumBodyBytes } from '../src/server/enquiries.ts';

export default async function handler(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse
) {
  try {
    const declared = Number(req.headers['content-length'] || 0);
    if (
      !Number.isFinite(declared) ||
      declared < 0 ||
      declared > maximumBodyBytes
    ) {
      res.writeHead(413, { 'Cache-Control': 'no-store' }).end();
      return;
    }
    let body: string | undefined;
    if (req.method === 'POST') {
      if (req.body !== undefined)
        body =
          typeof req.body === 'string'
            ? req.body
            : Buffer.isBuffer(req.body)
              ? req.body.toString('utf8')
              : JSON.stringify(req.body);
      else {
        const chunks: Buffer[] = [];
        let bytes = 0;
        for await (const chunk of req) {
          const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          bytes += buffer.length;
          if (bytes > maximumBodyBytes) {
            res.writeHead(413, { 'Cache-Control': 'no-store' }).end();
            return;
          }
          chunks.push(buffer);
        }
        body = Buffer.concat(chunks).toString('utf8');
      }
      if (Buffer.byteLength(body || '', 'utf8') > maximumBodyBytes) {
        res.writeHead(413, { 'Cache-Control': 'no-store' }).end();
        return;
      }
    }
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers))
      if (value !== undefined)
        headers.set(key, Array.isArray(value) ? value.join(',') : value);
    const result = await handleEnquiry(
      new Request('https://internal.invalid/api/enquiries', {
        method: req.method,
        headers,
        body,
      })
    );
    res.writeHead(result.status, Object.fromEntries(result.headers));
    res.end(await result.text());
  } catch {
    res.writeHead(503, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    });
    res.end(JSON.stringify({ ok: false, code: 'UNAVAILABLE' }));
  }
}
