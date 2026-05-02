import type { UrlParser } from '.';
import type { ParsedOpportunity } from '@/types';

/** Common Devpost path segments that are NOT hackathon slugs. */
const SKIP_SEGMENTS = new Set([
  'hackathons',
  'hackathon',
  'projects',
  'project',
  'software',
  'users',
  'user',
  'teams',
  'team',
  'discussions',
  'jobs',
  'challenges',
  'challenge',
  'collections',
  'collection',
  'dashboard',
  'settings',
  'account',
  'auth',
  'login',
  'register',
  'search',
  'tags',
  'tag',
]);

export const devpostParser: UrlParser = {
  name: 'devpost',
  domains: ['devpost.com', 'devpost.io'],
  canParse: (url: string) => {
    try {
      const hostname = new URL(url).hostname;
      return hostname === 'devpost.com' || hostname === 'devpost.io' || hostname.endsWith('.devpost.com') || hostname.endsWith('.devpost.io');
    } catch {
      return url.includes('devpost.com') || url.includes('devpost.io');
    }
  },
  parse: (url: string): ParsedOpportunity => {
    let hackathonName: string | null = null;
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);

      // Find the first path segment that looks like a hackathon slug.
      // Skip known structural segments like "hackathons", "projects", etc.
      const slug = pathParts.find((p) => !SKIP_SEGMENTS.has(p.toLowerCase()));

      if (slug) {
        hackathonName = slug
          .replace(/-/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase());
      }
    } catch {
      // If URL parsing fails, leave hackathonName as null
    }

    return {
      title: hackathonName ? `${hackathonName} Hackathon` : 'Devpost Hackathon',
      organization: null,
      type: 'hackathon',
      description: null,
      deadline: null,
      location: null,
      prizes: null,
      requirements: [],
      url,
      confidence: hackathonName ? 0.6 : 0.3,
      parserUsed: 'devpost',
    };
  },
};
