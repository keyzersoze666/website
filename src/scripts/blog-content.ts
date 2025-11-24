import { getCollection, type CollectionEntry } from 'astro:content';

export async function publishedPosts(): Promise<CollectionEntry<'blog'>[]> {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  return posts.sort(
    (a, b) => b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf()
  );
}
export function readingMinutes(body = ''): number {
  const prose = body
    .replace(/<[^>]*>/g, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\$\$[\s\S]*?\$\$/g, ' ')
    .replace(/\[[^\]]*\]\([^)]*\)/g, ' ');
  return Math.max(1, Math.ceil(prose.trim().split(/\s+/).length / 200));
}
export function formatPostDate(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}
export const postHref = (post: CollectionEntry<'blog'>) => `/blog/${post.id}/`;
