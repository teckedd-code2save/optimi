import type { UrlParser } from '.';
import type { ParsedOpportunity } from '@/types';

function isIndieHackersUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return hostname === 'indiehackers.com' || hostname === 'www.indiehackers.com';
  } catch {
    return /indiehackers\.com/.test(url);
  }
}

export const indieHackersParser: UrlParser = {
  name: 'indiehackers',
  domains: ['indiehackers.com', 'www.indiehackers.com'],
  canParse: isIndieHackersUrl,
  parse: async (url: string): Promise<ParsedOpportunity> => {

    // Extract slug from URL for title
    let title = 'Indie Hackers Post';
    try {
      const pathParts = new URL(url).pathname.split('/').filter(Boolean);
      const slug = pathParts[pathParts.length - 1];
      if (slug && slug.length > 2) {
        title = slug
          .replace(/[-_]+/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase());
      }
    } catch { /* ignore */ }

    return {
      title,
      organization: 'Indie Hackers',
      type: 'platform',
      description: null,
      deadline: null,
      location: null,
      prizes: null,
      requirements: [],
      url,
      confidence: 0.3,
      parserUsed: 'indiehackers',
    };
  },
};
