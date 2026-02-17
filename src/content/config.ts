import { defineCollection, z } from 'astro:content';

const bulletins = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.date(),
    slug: z.string().optional(),
    summary: z.string(),
  }),
});

export const collections = {
  bulletins,
};
