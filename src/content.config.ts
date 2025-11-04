import { defineCollection } from 'astro:content';
import { z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string().min(15),
    description: z.string().min(40).max(240),
    publishedAt: z.coerce.date(),
    author: z.literal('qwerty-labs-research'),
    category: z.enum(['Agentic AI', 'Model Research', 'Engineering']),
    articleType: z.enum([
      'Worked example',
      'Research review',
      'Engineering guide',
      'Use-case blueprint',
      'Research analysis',
    ]),
    tags: z.array(z.string()).min(2),
    cover: z.string().startsWith('/journal/figures/'),
    coverAlt: z.string().min(20),
    evidenceNote: z.string().min(30),
    draft: z.boolean().default(false),
    references: z
      .array(
        z.object({
          id: z.string().regex(/^[a-z0-9-]+$/),
          title: z.string(),
          author: z.string(),
          url: z.string().url(),
          publishedAt: z.coerce.date().optional(),
        })
      )
      .min(3),
  }),
});
export const collections = { blog };
