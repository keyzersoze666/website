import type { APIRoute } from 'astro';
import { siteConfiguration } from '../config/site';

export const GET: APIRoute = ({ site }) =>
  new Response(
    siteConfiguration().indexable
      ? `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${new URL('/sitemap.xml', site).href}\n`
      : 'User-agent: *\nDisallow: /\n',
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
  );
