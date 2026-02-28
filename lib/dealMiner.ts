import Parser from 'rss-parser';
import { getAI } from './ai';

const rssParser = new Parser({
  customFields: {
    item: [['source', 'source', { keepArray: false }]],
  },
});

// ── Types ───────────────────────────────────────────────────────────────────

export interface DealContact {
  name: string;
  title: string;
  company: string;
}

export interface DealArticle {
  title: string;
  url: string;
  pubDate: string;
  source: string;
  contacts: DealContact[];
  dealSummary: string;
  error?: string;
}

// ── Step 1: Search Google News RSS ─────────────────────────────────────────

async function searchGoogleNews(query: string, maxItems: number): Promise<{ title: string; url: string; pubDate: string; source: string }[]> {
  const encoded = encodeURIComponent(query);
  const rssUrl = `https://news.google.com/rss/search?q=${encoded}&hl=en&gl=US&ceid=US:en`;

  try {
    const feed = await rssParser.parseURL(rssUrl);
    return feed.items.slice(0, maxItems).map(item => ({
      title: (item.title || '').replace(/ - [^-]+$/, '').trim(), // strip " - Business Wire" suffix
      url: item.link || '',
      pubDate: item.pubDate || '',
      source: typeof item.source === 'object'
        ? (item.source as any)?._?.url || (item.source as any)?.$ ?.url || ''
        : (item.source as string) || '',
    }));
  } catch (err: any) {
    throw new Error(`RSS fetch failed: ${err.message}`);
  }
}

// ── Step 2: Fetch article text (follow Google redirect → actual article) ───

async function fetchArticleText(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GPCEBot/1.0; +https://coareholdings.com)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) return '';

    const html = await res.text();

    // Strip scripts, styles, nav, footer boilerplate
    const clean = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Return first 5000 chars — enough for any press release
    return clean.slice(0, 5_000);
  } catch {
    return '';
  }
}

// ── Step 3: Extract contacts with Claude ───────────────────────────────────

async function extractContacts(title: string, text: string): Promise<{ contacts: DealContact[]; dealSummary: string } | null> {
  if (!text || text.length < 100) return null;

  const ai = getAI();

  const prompt = `You are reading a pharma/biotech press release about a licensing or partnership deal.

Article title: ${title}

Article text:
${text}

Extract every named individual mentioned. For each person return:
- name: full name
- title: their job title or role exactly as stated
- company: the company they represent

Focus on: Business Development leads, SVP/VP/Director BD, Chief Business Officer, licensing executives, any executive quoted about the deal.

Return ONLY valid JSON, no markdown, no explanation:
{"contacts":[{"name":"string","title":"string","company":"string"}],"dealSummary":"one sentence max describing what companies agreed to and in what therapy area"}

If no named individuals are found, return: {"contacts":[],"dealSummary":"Deal details not extractable"}`;

  try {
    const msg = await ai.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '';

    // Parse JSON — try direct first, then regex extract
    try {
      return JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]);
      return null;
    }
  } catch {
    return null;
  }
}

// ── Delay helper ───────────────────────────────────────────────────────────

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

// ── Main export ────────────────────────────────────────────────────────────

export async function mineDeals(query: string, maxArticles = 10): Promise<DealArticle[]> {
  const items = await searchGoogleNews(query, maxArticles);

  const results: DealArticle[] = [];

  for (const item of items) {
    if (!item.url) continue;

    const text = await fetchArticleText(item.url);
    const extracted = await extractContacts(item.title, text);

    results.push({
      title: item.title,
      url: item.url,
      pubDate: item.pubDate,
      source: item.source,
      contacts: extracted?.contacts ?? [],
      dealSummary: extracted?.dealSummary ?? '',
      error: !text ? 'Could not fetch article' : undefined,
    });

    await delay(400); // pace Claude + HTTP calls
  }

  return results;
}
