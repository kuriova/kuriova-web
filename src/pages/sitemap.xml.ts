import type { APIRoute } from 'astro';
import { getLiveUnits } from '../lib/units';
import { site } from '../site';

export const GET: APIRoute = async () => {
  const units = await getLiveUnits();
  const paths = ['/', ...units.map((u) => `/${u.slug}`), '/links', '/contact', '/privacy', '/terms'];
  const urls = paths.map((p) => `  <url><loc>${new URL(p, site.url).href}</loc></url>`).join('\n');
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
