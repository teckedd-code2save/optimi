import type { UrlParser } from '.';
import type { ParsedOpportunity } from '@/types';

export const devpostParser: UrlParser = {
  name: 'devpost',
  domains: ['devpost.com', 'devpost.io'],
  canParse: (url: string) => {
    try {
      const hostname = new URL(url).hostname;
      return hostname.includes('devpost.com') || hostname.includes('devpost.io');
    } catch {
      return url.includes('devpost.com') || url.includes('devpost.io');
    }
  },
  parse: (url: string): ParsedOpportunity => {
    // Extract hackathon name from URL
    // e.g., https://devpost.com/hackathons/runway-ml-hackathon
    let hackathonName: string | null = null;
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      const hackathonSlug = pathParts.find((p) => p.includes('hackathon')) || pathParts[pathParts.length - 1];
      if (hackathonSlug) {
        hackathonName = hackathonSlug
          .replace(/-/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase());
      }
    } catch {
      // If URL parsing fails
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
      confidence: 0.6,
      parserUsed: 'devpost',
    };
  },
};
