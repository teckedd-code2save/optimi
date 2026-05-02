import type { UrlParser } from '.';
import type { ParsedOpportunity, OpportunityType } from '@/types';

function isGitHubUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return hostname === 'github.com' || hostname === 'www.github.com';
  } catch {
    return /github\.com/.test(url);
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

function parseGitHubUrl(url: string): { owner: string; repo: string; number: string } | null {
  const m = url.match(/github\.com\/([^\/]+)\/([^\/]+)\/(?:issues|pull)\/(\d+)/);
  if (m) {
    return { owner: m[1], repo: m[2], number: m[3] };
  }
  return null;
}

export const githubParser: UrlParser = {
  name: 'github',
  domains: ['github.com', 'www.github.com'],
  canParse: (url: string) => isGitHubUrl(url) && (/\/issues\//.test(url) || /\/pull\//.test(url)),
  parse: async (url: string): Promise<ParsedOpportunity> => {
    const parsed = parseGitHubUrl(url);
    if (!parsed) {
      return {
        title: 'GitHub Issue/PR',
        organization: 'GitHub',
        type: 'other',
        description: null,
        deadline: null,
        location: null,
        prizes: null,
        requirements: [],
        url,
        confidence: 0.2,
        parserUsed: 'github-fallback',
      };
    }

    try {
      const apiUrl = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/issues/${parsed.number}`;
      const res = await fetch(apiUrl);
      if (res.ok) {
        const data = await res.json();
        const title = data.title || '';
        const body = data.body || '';
        const author = data.user?.login || '';
        const isPr = data.pull_request ? true : false;

        return {
          title: title || `${isPr ? 'PR' : 'Issue'} #${parsed.number}`,
          organization: `${parsed.owner}/${parsed.repo}`,
          type: classifyFromText(`${title} ${body}`),
          description: body || `GitHub ${isPr ? 'PR' : 'issue'} by @${author}`,
          deadline: null,
          location: null,
          prizes: null,
          requirements: [],
          url,
          confidence: body ? 0.8 : 0.6,
          parserUsed: 'github',
        };
      }
    } catch { /* ignore */ }

    return {
      title: `GitHub ${parsed.owner}/${parsed.repo} #${parsed.number}`,
      organization: `${parsed.owner}/${parsed.repo}`,
      type: 'other',
      description: null,
      deadline: null,
      location: null,
      prizes: null,
      requirements: [],
      url,
      confidence: 0.3,
      parserUsed: 'github-fallback',
    };
  },
};
