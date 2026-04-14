import type { APIRoute } from 'astro';
import { publicPagePaths } from '../data/seo';
import { publishedPosts, postHref } from '../scripts/blog-content';
import { siteConfiguration } from '../config/site';

export const GET: APIRoute = async ({ site }) => {
  const paths = siteConfiguration().indexable
    ? [...publicPagePaths, ...(await publishedPosts()).map(postHref)]
    : [];
  const escape = (text: string) =>
    text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
    [...new Set(paths)]
      .map(
        (path) => `<url><loc>${escape(new URL(path, site).href)}</loc></url>`
      )
      .join('') +
    '</urlset>\n';
  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
