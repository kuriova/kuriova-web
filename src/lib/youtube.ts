/**
 * Latest videos from a channel's public RSS feeds, read once per build.
 * No API key and no quota. Each feed holds the 15 newest items.
 */

export interface Video {
  id: string;
  title: string;
  /** ISO 8601 */
  published: string;
  url: string;
  thumbnail: string;
}

const feeds = new Map<string, Promise<Video[]>>();

export async function getLatestVideos(channelId: string | undefined, limit = 3): Promise<Video[]> {
  if (!channelId) return [];
  let feed = feeds.get(channelId);
  if (!feed) {
    feed = fetchFeed(channelId);
    feeds.set(channelId, feed);
  }
  return (await feed).slice(0, limit);
}

async function fetchFeed(channelId: string): Promise<Video[]> {
  // UULF… is the channel's auto-generated "long-form uploads" playlist: the channel
  // feed mixes in Shorts, which crop badly in a 16:9 row. The playlist 404s until the
  // first long-form upload, and it is undocumented, so fall back to the channel feed.
  const longForm = await fetchXml(`playlist_id=UULF${channelId.slice(2)}`);
  if (longForm) return parseFeed(longForm);
  const all = await fetchXml(`channel_id=${channelId}`);
  return all ? parseFeed(all) : [];
}

/** The feed's XML, or null when YouTube answers 404. */
async function fetchXml(query: string): Promise<string | null> {
  const url = `https://www.youtube.com/feeds/videos.xml?${query}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (err) {
    const message = `Could not read the YouTube feed ${url}: ${(err as Error).message}`;
    // On Vercel, fail the build so the last good deployment stays live
    // instead of replacing real videos with "coming soon".
    if (import.meta.env.VERCEL) throw new Error(message);
    console.warn(`${message}. Building with no videos.`);
    return null;
  }
}

export function parseFeed(xml: string): Video[] {
  const videos: Video[] = [];
  for (const [, entry = ''] of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const id = entry.match(/<yt:videoId>([\w-]{11})<\/yt:videoId>/)?.[1];
    const title = entry.match(/<title>([\s\S]*?)<\/title>/)?.[1];
    const published = entry.match(/<published>([^<]+)<\/published>/)?.[1];
    if (!id || !title || !published) continue;
    videos.push({
      id,
      title: decodeEntities(title.trim()),
      published,
      url: `https://www.youtube.com/watch?v=${id}`,
      // Built from the id: the feed's own thumbnail hosts (i1–i4.ytimg.com) are not in the CSP.
      thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    });
  }
  return videos.sort((a, b) => b.published.localeCompare(a.published));
}

const NAMED: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (match, ref: string) => {
    if (ref[0] !== '#') return NAMED[ref] ?? match;
    const code = ref[1] === 'x' || ref[1] === 'X' ? parseInt(ref.slice(2), 16) : parseInt(ref.slice(1), 10);
    return Number.isFinite(code) ? String.fromCodePoint(code) : match;
  });
}
