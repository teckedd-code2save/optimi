import type { UrlParser } from '.';
import type { ParsedOpportunity } from '@/types';

export const googleFormsParser: UrlParser = {
  name: 'google-forms',
  domains: ['forms.gle', 'docs.google.com', 'google.com'],
  canParse: (url: string) => {
    try {
      const hostname = new URL(url).hostname;
      return hostname === 'forms.gle' ||
        (hostname.includes('google.com') && url.includes('/forms/'));
    } catch {
      return url.includes('forms.gle') || (url.includes('google.com') && url.includes('/forms/'));
    }
  },
  parse: (url: string): ParsedOpportunity => {
    return {
      title: 'Google Form Application',
      organization: null,
      type: 'other',
      description: 'Application form — extract details from the form page.',
      deadline: null,
      location: null,
      prizes: null,
      requirements: [],
      url,
      confidence: 0.3,
      parserUsed: 'google-forms',
    };
  },
};
