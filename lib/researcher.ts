/**
 * Fetches a company's homepage to gather context for personalized outreach.
 * Returns a best-effort research string — never throws, always fails gracefully.
 */
export async function researchCompany(companyName: string): Promise<string> {
  try {
    const slug = companyName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, '-');

    // Common domain patterns for pharma/biotech companies
    const candidates = [
      `https://www.${slug}.com`,
      `https://${slug}.com`,
      `https://www.${slug}.io`,
    ];

    for (const url of candidates) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const res = await fetch(url, {
          signal: controller.signal,
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; research-bot/1.0)' },
        });
        clearTimeout(timeout);

        if (!res.ok) continue;

        const html = await res.text();
        // Strip HTML tags, collapse whitespace
        const text = html
          .replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/<style[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 3000);

        if (text.length > 200) {
          return `[Company website: ${url}]\n${text}`;
        }
      } catch {
        continue;
      }
    }
  } catch {
    // Silently fail — we'll still generate an email without research
  }

  return '';
}
