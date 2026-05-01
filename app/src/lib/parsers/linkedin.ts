import type { UrlParser } from '.';
import type { ParsedOpportunity } from '@/types';

export const linkedinParser: UrlParser = {
  name: 'linkedin',
  domains: ['linkedin.com', 'linked.in'],
  canParse: (url: string) => {
    try {
      const hostname = new URL(url).hostname;
      return hostname.includes('linkedin.com') || hostname.includes('linked.in');
    } catch {
      return url.includes('linkedin.com') || url.includes('linked.in');
    }
  },
  parse: (url: string): ParsedOpportunity => {
    // Handle linkedin.com/safety/go/ redirects — extract the real URL
    let resolvedUrl = url;
    try {
      const urlObj = new URL(url);
      if (urlObj.pathname.includes('/safety/go/')) {
        const target = urlObj.searchParams.get('url');
        if (target) {
          resolvedUrl = decodeURIComponent(target);
        }
      }
    } catch {
      // If URL parsing fails, use original
    }

    // Extract job posting ID or post ID from URL
    const isJob = url.includes('/jobs/') || url.includes('/job/');
    const isPost = url.includes('/posts/') || url.includes('/feed/');

    let title: string | null = null;
    let type: ParsedOpportunity['type'] = 'other';

    if (isJob) {
      title = 'LinkedIn Job Opportunity';
      type = 'job';
    } else if (isPost) {
      title = 'LinkedIn Post';
      type = 'other';
    } else {
      title = 'LinkedIn Opportunity';
    }

    return {
      title,
      organization: null,
      type,
      description: null,
      deadline: null,
      location: null,
      prizes: null,
      requirements: [],
      url: resolvedUrl,
      confidence: 0.4,
      parserUsed: 'linkedin',
    };
  },
};
