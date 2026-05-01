import type { UrlParser } from '.';
import type { ParsedOpportunity } from '@/types';

export const twitterParser: UrlParser = {
  name: 'twitter',
  domains: ['twitter.com', 'x.com', 't.co'],
  canParse: (url: string) => {
    try {
      const hostname = new URL(url).hostname;
      return hostname === 'twitter.com' || hostname === 'x.com' || hostname === 't.co';
    } catch {
      return url.includes('twitter.com') || url.includes('x.com') || url.includes('t.co');
    }
  },
  parse: (url: string): ParsedOpportunity => {
    // Extract username and tweet ID from URL pattern
    let username: string | null = null;
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      if (pathParts.length >= 1) {
        username = pathParts[0];
      }
    } catch {
      // Fallback regex
      const match = url.match(/(?:twitter\.com|x\.com)\/([^\/\?]+)/);
      if (match) username = match[1];
    }

    return {
      title: username ? `Post by @${username}` : 'X/Twitter Post',
      organization: username || null,
      type: 'other',
      description: null,
      deadline: null,
      location: null,
      prizes: null,
      requirements: [],
      url,
      confidence: 0.3,
      parserUsed: 'twitter',
    };
  },
};
