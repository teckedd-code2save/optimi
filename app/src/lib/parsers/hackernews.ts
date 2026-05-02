import type { UrlParser } from '.';
import type { ParsedOpportunity, OpportunityType } from '@/types';

function isHackerNewsUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return hostname === 'news.ycombinator.com' || hostname === 'hn.algolia.com';
  } catch {
    return /news\.ycombinator\.com/.test(url);
  }
}

function classifyFromText(text: string): OpportunityType | null {
  const lower = text.toLowerCase();
  const scores: Record<string, number> = {
    hackathon: ['hackathon', 'hack', 'buildathon', 'codeathon', 'demo day', 'coding competition', 'hackfest', 'codefest'].filter(k => lower.includes(k)).length,
    accelerator: ['accelerator', 'cohort', 'batch', 'startup program', 'incubator', 'seed', 'venture', 'vc', 'startup'].filter(k => lower.includes(k)).length,
    grant: ['grant', 'credits', 'funding', 'award', 'scholarship', 'stipend', 'bounty', 'prize pool'].filter(k => lower.includes(k)).length,
    job: ['hiring', 'join our team', 'position', 'job', 'employment', 'full-time', 'part-time', 'contract', 'role', 'recruiting'].filter(k => lower.includes(k)).length,
    platform: ['platform', 'subscribe', 'signup', 'early access', 'waitlist', 'beta'].filter(k => lower.includes(k)).length,
    government: ['passport', 'visa', 'government', 'ministry', 'federal', 'official'].filter(k => lower.includes(k)).length,
  };
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return best && best[1] > 0 ? (best[0] as OpportunityType) : null;
}

export const hackerNewsParser: UrlParser = {
  name: 'hackernews',
  domains: ['news.ycombinator.com', 'hn.algolia.com'],
  canParse: isHackerNewsUrl,
  parse: async (url: string): Promise<ParsedOpportunity> => {
    let storyId: string | null = null;
    try {
      const u = new URL(url);
      if (u.pathname.startsWith('/item')) {
        storyId = u.searchParams.get('id');
      }
    } catch { /* ignore */ }

    // Try Algolia Search API (free, no auth)
    try {
      const query = storyId ? `tags=story&query=${storyId}` : `tags=story&query=${encodeURIComponent(url)}`;
      const res = await fetch(`https://hn.algolia.com/api/v1/search?${query}`);
      if (res.ok) {
        const data = await res.json();
        const hits = data.hits || [];
        if (hits.length > 0) {
          const hit = hits[0];
          const title = hit.title || '';
          const author = hit.author || '';
          const points = hit.points || 0;
          const comments = hit.num_comments || 0;
          const storyUrl = hit.url || url;

          return {
            title: title || 'Hacker News Story',
            organization: author || 'Hacker News',
            type: classifyFromText(title),
            description: `${points} points, ${comments} comments on Hacker News`,
            deadline: null,
            location: null,
            prizes: null,
            requirements: [],
            url: storyUrl,
            confidence: 0.75,
            parserUsed: 'hackernews',
          };
        }
      }
    } catch { /* ignore */ }

    // Fallback
    return {
      title: 'Hacker News Story',
      organization: 'Hacker News',
      type: 'other',
      description: null,
      deadline: null,
      location: null,
      prizes: null,
      requirements: [],
      url,
      confidence: 0.25,
      parserUsed: 'hackernews-fallback',
    };
  },
};
