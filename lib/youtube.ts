export type GeneratedVideo = {
  id: string;
  title: string;
  channel: string;
  url: string;
  embedUrl: string;
  thumbnail: string;
};

type SearchResponse = {
  items?: Array<{
    id?: { videoId?: string };
    snippet?: { title?: string; channelTitle?: string; thumbnails?: { high?: { url?: string }; medium?: { url?: string } } };
  }>;
};

function decode(value: string) {
  return value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

export async function findRelevantYouTubeVideos(query: string): Promise<{ videos: GeneratedVideo[]; warning?: string }> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return { videos: [], warning: "YouTube discovery is not configured. Add YOUTUBE_API_KEY in Firebase App Hosting to embed relevant videos automatically." };
  try {
    const endpoint = new URL("https://www.googleapis.com/youtube/v3/search");
    endpoint.searchParams.set("key", apiKey);
    endpoint.searchParams.set("part", "snippet");
    endpoint.searchParams.set("type", "video");
    endpoint.searchParams.set("q", query.slice(0, 120));
    endpoint.searchParams.set("maxResults", "3");
    endpoint.searchParams.set("order", "relevance");
    endpoint.searchParams.set("safeSearch", "strict");
    endpoint.searchParams.set("videoEmbeddable", "true");
    endpoint.searchParams.set("videoSyndicated", "true");
    endpoint.searchParams.set("relevanceLanguage", "en");
    endpoint.searchParams.set("regionCode", "BH");
    const response = await fetch(endpoint, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error(`YouTube API returned HTTP ${response.status}`);
    const payload = await response.json() as SearchResponse;
    const videos = (payload.items || []).flatMap((item) => {
      const id = item.id?.videoId;
      if (!id || !/^[a-zA-Z0-9_-]{11}$/.test(id)) return [];
      return [{
        id,
        title: decode(item.snippet?.title || "YouTube tutorial"),
        channel: decode(item.snippet?.channelTitle || "YouTube"),
        url: `https://www.youtube.com/watch?v=${id}`,
        embedUrl: `https://www.youtube-nocookie.com/embed/${id}`,
        thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      }];
    });
    return { videos };
  } catch (error) {
    return { videos: [], warning: `YouTube videos could not be retrieved: ${error instanceof Error ? error.message : "unknown error"}. Add them during review.` };
  }
}
