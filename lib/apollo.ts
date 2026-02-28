const APOLLO_BASE = 'https://api.apollo.io/v1';

export interface ApolloSearchParams {
  titles?: string[];
  industries?: string[];
  locations?: string[];
  keywords?: string;
  page?: number;
  perPage?: number;
}

export interface ApolloOrg {
  name: string;
  website_url?: string;
  industry?: string;
}

export interface ApolloPerson {
  id: string;
  name: string;
  first_name: string;
  last_name: string;
  title: string;
  email?: string;
  linkedin_url?: string;
  organization?: ApolloOrg;
  city?: string;
  state?: string;
  country?: string;
  photo_url?: string;
}

export interface ApolloSearchResult {
  people: ApolloPerson[];
  pagination: {
    page: number;
    per_page: number;
    total_entries: number;
    total_pages: number;
  };
}

export async function searchPeople(params: ApolloSearchParams): Promise<ApolloSearchResult> {
  const key = process.env.APOLLO_API_KEY;
  if (!key) throw new Error('APOLLO_API_KEY is not set');

  const body: Record<string, unknown> = {
    page: params.page ?? 1,
    per_page: params.perPage ?? 25,
  };
  if (params.titles?.length)     body.person_titles             = params.titles;
  if (params.industries?.length) body.q_organization_industries  = params.industries;
  if (params.locations?.length)  body.person_locations           = params.locations;
  if (params.keywords)           body.q_keywords                 = params.keywords;

  const res = await fetch(`${APOLLO_BASE}/mixed_people/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'X-Api-Key': key,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Apollo API ${res.status}: ${err}`);
  }

  return res.json();
}
