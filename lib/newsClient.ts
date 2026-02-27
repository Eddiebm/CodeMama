/**
 * newsClient.ts
 * Fetches news articles via Google News RSS (no API key required).
 * Includes a lightweight in-memory cache (5-min TTL) to avoid hammering Google.
 */

import Parser from 'rss-parser';

const parser = new Parser({
  timeout: 8000,
  customFields: {
    item: ['media:content', 'media:thumbnail'],
  },
});

// ---- Cache ---------------------------------------------------------------
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, { data: NewsItem[]; fetchedAt: number }>();

function fromCache(key: string): NewsItem[] | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.fetchedAt > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.data;
}

function toCache(key: string, data: NewsItem[]) {
  cache.set(key, { data, fetchedAt: Date.now() });
}

// ---- Types ---------------------------------------------------------------
export interface NewsItem {
  title: string;
  link: string;
  pubDate: string;   // ISO string
  source: string;    // publisher name
  snippet: string;   // short teaser
}

// ---- Helpers -------------------------------------------------------------
function buildGoogleNewsUrl(query: string): string {
  const encoded = encodeURIComponent(query);
  return `https://news.google.com/rss/search?q=${encoded}&hl=en-US&gl=US&ceid=US:en`;
}

function stripHtml(html: string): string {
  return (html || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
}

async function fetchNews(query: string, maxItems = 8): Promise<NewsItem[]> {
  const cacheKey = `${query}|${maxItems}`;
  const cached = fromCache(cacheKey);
  if (cached) return cached;

  try {
    const url = buildGoogleNewsUrl(query);
    const feed = await parser.parseURL(url);

    const items: NewsItem[] = (feed.items || []).slice(0, maxItems).map(item => ({
      title:   stripHtml(item.title || ''),
      link:    item.link || '',
      pubDate: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
      source:  (item.creator || (item as any)['dc:creator'] || extractSource(item.link || '')),
      snippet: stripHtml(item.contentSnippet || item.content || '').slice(0, 200),
    }));

    toCache(cacheKey, items);
    return items;
  } catch (err) {
    console.error('[newsClient] fetch error for query:', query, err);
    return [];
  }
}

function extractSource(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return 'Unknown';
  }
}

// ---- Public API ----------------------------------------------------------

/**
 * Fetch recent news for a specific company / partner.
 * Searches for "<company> oncology" to filter noise.
 */
export async function fetchCompanyNews(companyName: string, maxItems = 6): Promise<NewsItem[]> {
  const query = `"${companyName}" oncology OR pharma OR biotech OR cancer`;
  return fetchNews(query, maxItems);
}

/**
 * Fetch industry-level news for solid tumor oncology partnerships and M&A.
 */
export type IndustryTopic = 'partnerships' | 'mna' | 'clinical' | 'ovarian' | 'all';

const INDUSTRY_QUERIES: Record<IndustryTopic, string> = {
  partnerships: 'solid tumor oncology licensing partnership deal pharma biotech 2025 OR 2026',
  mna:          'pharma biotech oncology acquisition merger deal solid tumor 2025 OR 2026',
  clinical:     'solid tumor clinical trial results breakthrough ovarian cancer endometrial cervical',
  ovarian:      'ovarian cancer HGSOC clinical trial partnership licensing deal 2025 OR 2026',
  all:          'solid tumor oncology pharma biotech partnership licensing deal clinical 2025 OR 2026',
};

export async function fetchIndustryNews(topic: IndustryTopic = 'all', maxItems = 12): Promise<NewsItem[]> {
  return fetchNews(INDUSTRY_QUERIES[topic], maxItems);
}

/**
 * Fetch news for multiple companies in parallel (used for news portal).
 * Returns a map of companyName → NewsItem[].
 */
export async function fetchBatchCompanyNews(
  companies: string[],
  maxItemsEach = 3,
): Promise<Record<string, NewsItem[]>> {
  const results = await Promise.allSettled(
    companies.map(name => fetchCompanyNews(name, maxItemsEach).then(items => ({ name, items }))),
  );

  const out: Record<string, NewsItem[]> = {};
  for (const r of results) {
    if (r.status === 'fulfilled') {
      out[r.value.name] = r.value.items;
    }
  }
  return out;
}
