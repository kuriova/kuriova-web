import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Slugs that already belong to a page or file at the site root.
const RESERVED = ['links', 'privacy', 'terms', '404', 'partners', 'brand', 'sitemap', 'robots'];

const url = z.url({ protocol: /^https$/ });

/**
 * One file per channel or venture in src/content/units/.
 * Adding a file adds a home card, a footer column, a /links section and,
 * once status is "live", a page at /<slug>.
 */
const units = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/units' }),
  schema: z
    .strictObject({
      slug: z
        .string()
        .regex(/^[a-z0-9-]+$/, 'lowercase letters, digits and hyphens only')
        .refine((s) => !RESERVED.includes(s), 'this slug is taken by a site page'),
      name: z.string().min(1),
      status: z.enum(['live', 'soon']),
      /** Sort order on the home page and in /links; lower comes first. */
      order: z.number().int().default(100),
      /** Brand bible accent. Accents only ever sit on Obsidian or Carbon. */
      accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'a six-digit hex colour'),
      tagline: z.string().min(1),
      /** Page title for /<slug>. Defaults to "<name>: videos and channels". */
      title: z.string().optional(),
      pillars: z.array(z.string()).default([]),
      /** The UC… id; the latest videos come from this channel's RSS feed. */
      youtubeChannelId: z
        .string()
        .regex(/^UC[\w-]{22}$/, 'a YouTube channel id starting with UC')
        .optional(),
      links: z
        .strictObject({
          youtube: url.optional(),
          instagram: url.optional(),
          tiktok: url.optional(),
          facebook: url.optional(),
          x: url.optional(),
        })
        .default({}),
    })
    .refine((u) => u.status !== 'live' || (u.links.youtube && u.youtubeChannelId), {
      message: 'a live unit needs links.youtube and youtubeChannelId',
    }),
});

export const collections = { units };
