import type { UrlParser } from '.';
import type { ParsedOpportunity, OpportunityType } from '@/types';

function isRedditUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return hostname === 'reddit.com' || hostname === 'www.reddit.com' || hostname === 'old.reddit.com';
  } catch {
    return /reddit\.com/.test(url);
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

export const redditParser: UrlParser = {
  name: 'reddit',
  domains: ['reddit.com', 'www.reddit.com', 'old.reddit.com'],
  canParse: isRedditUrl,
  parse: async (url: string): Promise<ParsedOpportunity> => {
    // Try Reddit JSON API
    try {
      const jsonUrl = url.replace(/\?.*/, '').replace(/\/$/, '') + '.json';
      const res = await fetch(jsonUrl, { headers: { 'User-Agent': 'Optimi/1.0' } });
      if (res.ok) {
        const data = await res.json();
        const postData = data?.[0]?.data?.children?.[0]?.data;
        if (postData) {
          const title = postData.title || '';
          const selftext = postData.selftext || '';
          const subreddit = postData.subreddit || '';
          const author = postData.author || '';
          const externalUrl = postData.url_overridden_by_dest;

          const description = selftext || title;
          const type = classifyFromText(`${title} ${selftext}`);

          return {
            title: title || 'Reddit Post',
            organization: `r/${subreddit}` || author || null,
            type,
            description,
            deadline: null,
            location: null,
            prizes: null,
            requirements: [],
            url: externalUrl && externalUrl !== url ? externalUrl : url,
            confidence: selftext ? 0.75 : 0.6,
            parserUsed: 'reddit',
          };
        }
      }
    } catch { /* ignore */ }

    // Fallback: URL-based
    let title = 'Reddit Post';
    try {
      const pathParts = new URL(url).pathname.split('/').filter(Boolean);
      if (pathParts.length >= 4 && pathParts[0] === 'r') {
        title = `Post in r/${pathParts[1]}`;
      }
    } catch { /* ignore */ }

    return {
      title,
      organization: null,
      type: 'other',
      description: null,
      deadline: null,
      location: null,
      prizes: null,
      requirements: [],
      url,
      confidence: 0.25,
      parserUsed: 'reddit-fallback',
    };
  },
};
