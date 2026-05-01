import type { UrlParser } from '.';
import type { ParsedOpportunity, OpportunityType } from '@/types';

/**
 * Known URLs with verified landing pages.
 * These are real URLs that we can confidently extract metadata for.
 */
const KNOWN_URLS: Record<string, ParsedOpportunity> = {
  'usaii-global-ai-hackathon-2026.devpost.com': {
    title: 'USAII Global Hackathon 2026',
    organization: 'USAII',
    type: 'hackathon' as OpportunityType,
    description: 'Global virtual AI hackathon empowering students to build solutions for real-world good.',
    deadline: '2026-06-06',
    location: 'Online',
    prizes: '$15,000 in cash prizes + USAII AI Certification Scholarships',
    requirements: ['Student or recent graduate', 'Team of 2-5 members', 'Project must use AI'],
    url: 'https://usaii-global-ai-hackathon-2026.devpost.com/',
    confidence: 1.0,
    parserUsed: 'known-url',
  },
  'speedrun.a16z.com': {
    title: 'a16z Speedrun SR007',
    organization: 'Andreessen Horowitz',
    type: 'accelerator' as OpportunityType,
    description: '10-week accelerator for AI and gaming startups. $750K investment on a $10M cap.',
    deadline: '2026-05-17',
    location: 'San Francisco, CA',
    prizes: '$750K at $10M cap',
    requirements: ['Early-stage AI or gaming startup', 'Working prototype', 'Technical founder(s)'],
    url: 'https://speedrun.a16z.com/apply',
    confidence: 1.0,
    parserUsed: 'known-url',
  },
  'cloud.google.com/startup': {
    title: 'Google for Startups Cloud Credits',
    organization: 'Google',
    type: 'grant' as OpportunityType,
    description: 'Up to $200,000 in Google Cloud credits for eligible startups.',
    deadline: '2026-06-01',
    location: 'Global',
    prizes: 'Up to $200K cloud credits',
    requirements: ['Seed to Series A stage', 'Less than 5 years old', 'Not previously received GCP credits'],
    url: 'https://cloud.google.com/startup',
    confidence: 1.0,
    parserUsed: 'known-url',
  },
  'passport.mfa.gov.gh': {
    title: 'Ghana Passport Online Application',
    organization: 'Ministry of Foreign Affairs, Ghana',
    type: 'government' as OpportunityType,
    description: 'Online passport application or renewal for Ghanaian citizens.',
    deadline: null,
    location: 'Ghana',
    prizes: null,
    requirements: ['Ghanaian citizen', 'Birth certificate', 'Passport photos', 'Witness (clergyman/public servant)'],
    url: 'https://passport.mfa.gov.gh/',
    confidence: 1.0,
    parserUsed: 'known-url',
  },
};

export const knownUrlParser: UrlParser = {
  name: 'known-url',
  domains: Object.keys(KNOWN_URLS),
  canParse: (url: string) => {
    try {
      const hostname = new URL(url).hostname;
      return Object.keys(KNOWN_URLS).some((key) => hostname.includes(key.split('/')[0]));
    } catch {
      return Object.keys(KNOWN_URLS).some((key) => url.includes(key));
    }
  },
  parse: (url: string) => {
    const match = Object.entries(KNOWN_URLS).find(([key]) => url.includes(key));
    if (match) {
      return { ...match[1], url };
    }
    return {
      title: null,
      organization: null,
      type: null,
      description: null,
      deadline: null,
      location: null,
      prizes: null,
      requirements: [],
      url,
      confidence: 0,
      parserUsed: 'known-url',
    };
  },
};
