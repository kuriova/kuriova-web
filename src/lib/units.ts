import { getCollection, type CollectionEntry } from 'astro:content';
import { site } from '../site';

export type Unit = CollectionEntry<'units'>['data'];
export type PlatformKey = keyof Unit['links'];

export const PLATFORMS: { key: PlatformKey; label: string }[] = [
  { key: 'youtube', label: 'YouTube' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'x', label: 'X' },
];

export interface PlatformLink {
  key: PlatformKey;
  label: string;
  url: string;
}

export async function getUnits(): Promise<Unit[]> {
  const entries = await getCollection('units');
  return entries
    .map((e) => e.data)
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}

export async function getLiveUnits(): Promise<Unit[]> {
  return (await getUnits()).filter((u) => u.status === 'live');
}

/** The unit the header "Watch" button and the home video row point at. */
export async function getFeaturedUnit(): Promise<Unit> {
  const [first] = await getLiveUnits();
  if (!first) throw new Error('No unit has "status": "live"; the home page needs one.');
  return first;
}

export function platformLinks(unit: Unit): PlatformLink[] {
  return PLATFORMS.flatMap(({ key, label }) => {
    const url = unit.links[key];
    return url ? [{ key, label, url }] : [];
  });
}

/** "Kuriova Science" → "Science", for the lockup subline. */
export function subline(unit: Unit): string {
  return unit.name.replace(/^Kuriova\s+/i, '');
}

/** Every public profile, for the Organization sameAs list. */
export function profileUrls(units: Unit[]): string[] {
  return [...site.sameAs, ...units.flatMap((u) => platformLinks(u).map((l) => l.url))];
}

export function unitTitle(unit: Unit): string {
  return unit.title ?? `${unit.name}: videos and channels`;
}
