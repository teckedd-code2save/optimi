import type { UrlParser } from '.';
import type { ParsedOpportunity, OpportunityType } from '@/types';

const SYNDICATION_URL = 'https://cdn.syndication.twimg.com/tweet-result';
const OEMBED_URL = 'https://publish.twitter.com/oembed';

function extractTweetId(url: string): string | null {
  try {
    const pathParts = new URL(url).pathname.split('/').filter(Boolean);
    if (pathParts.length >= 3 && pathParts[1] === 'status') {
      return pathParts[2];
    }
  } catch {
    const m = url.match(/\/status\/(\d+)/);
    if (m) return m[1];
  }
  return null;
}

function extractUsername(url: string): string | null {
  try {
    const pathParts = new URL(url).pathname.split('/').filter(Boolean);
    return pathParts[0] || null;
  } catch {
    const m = url.match(/(?:twitter\.com|x\.com)\/([^\/\?]+)/);
    return m ? m[1] : null;
  }
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response | null> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch {
    return null;
  }
}

async function trySyndication(tweetId: string): Promise<{ text: string; author: string | null } | null> {
  const res = await fetchWithTimeout(`${SYNDICATION_URL}?id=${tweetId}&lang=en`, 6000);
  if (!res?.ok) return null;
  try {
    const data = await res.json();
    const text = data?.text || '';
    const author = data?.user?.name || data?.user?.screen_name || null;
    if (text) return { text, author };
  } catch { /* ignore */ }
  return null;
}

async function tryOembed(url: string): Promise<{ text: string; author: string | null } | null> {
  const apiUrl = `${OEMBED_URL}?url=${encodeURIComponent(url)}&omit_script=true&dnt=true`;
  const res = await fetchWithTimeout(apiUrl, 6000);
  if (!res?.ok) return null;
  try {
    const data = await res.json();
    const html: string = data?.html || '';
    const author: string | null = data?.author_name || null;
    // Parse tweet text from oEmbed HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const tweetP = doc.querySelector('p');
    const text = tweetP?.textContent || '';
    if (text) return { text, author };
  } catch { /* ignore */ }
  return null;
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

export const twitterParser: UrlParser = {
  name: 'twitter',
  domains: ['twitter.com', 'x.com', 't.co'],
  canParse: (url: string) => {
    try {
      const hostname = new URL(url).hostname;
      return hostname === 'twitter.com' || hostname === 'x.com' || hostname === 't.co' || hostname.endsWith('.twitter.com');
    } catch {
      return /twitter\.com|x\.com|t\.co/.test(url);
    }
  },
  parse: async (url: string): Promise<ParsedOpportunity> => {
    const username = extractUsername(url);
    const tweetId = extractTweetId(url);

    // Try syndication API first (most reliable)
    if (tweetId) {
      const synd = await trySyndication(tweetId);
      if (synd) {
        const type = classifyFromText(synd.text);
        return {
          title: synd.text.slice(0, 120),
          organization: synd.author || username || null,
          type,
          description: synd.text,
          deadline: null,
          location: null,
          prizes: null,
          requirements: [],
          url,
          confidence: 0.8,
          parserUsed: 'twitter-syndication',
        };
      }
    }

    // Fall back to oEmbed
    const oembed = await tryOembed(url);
    if (oembed) {
      const type = classifyFromText(oembed.text);
      return {
        title: oembed.text.slice(0, 120),
        organization: oembed.author || username || null,
        type,
        description: oembed.text,
        deadline: null,
        location: null,
        prizes: null,
        requirements: [],
        url,
        confidence: 0.75,
        parserUsed: 'twitter-oembed',
      };
    }

    // Ultimate fallback: URL only
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
