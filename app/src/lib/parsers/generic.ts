import type { UrlParser } from '.';
import type { ParsedOpportunity, OpportunityType } from '@/types';

/* ------------------------------------------------------------------ */
/*  CORS proxy fallbacks                                               */
/* ------------------------------------------------------------------ */
const PROXIES = [
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
];

const DIRECT_TIMEOUT = 3000;
const PROXY_TIMEOUT = 6000;

/** Error phrases returned by proxies instead of real page content. */
const PROXY_ERROR_PHRASES = [
  'access denied',
  'rate limit',
  'could not request',
  'error',
  'blocked',
  'too many requests',
  'forbidden',
];

function isProxyErrorPage(text: string): boolean {
  const lower = text.toLowerCase();
  return PROXY_ERROR_PHRASES.some((p) => lower.includes(p));
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response | null> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { method: 'GET', redirect: 'follow', signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch {
    return null;
  }
}

async function tryFetch(url: string, timeoutMs: number): Promise<string | null> {
  const res = await fetchWithTimeout(url, timeoutMs);
  if (!res?.ok) return null;
  const text = await res.text();
  if (text.length < 200 || isProxyErrorPage(text)) return null;
  return text;
}

async function fetchHtml(url: string): Promise<string | null> {
  // 1. Try direct fetch (fast, rarely works due to CORS)
  const direct = await tryFetch(url, DIRECT_TIMEOUT);
  if (direct) return direct;

  // 2. Try CORS proxies in parallel (first to succeed wins)
  const proxyUrls = PROXIES.map((make) => make(url));
  const results = await Promise.allSettled(
    proxyUrls.map((u) => tryFetch(u, PROXY_TIMEOUT))
  );
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value) {
      return r.value;
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  HTML parsing helpers                                               */
/* ------------------------------------------------------------------ */
function extractFromHtml(html: string, url: string): Partial<ParsedOpportunity> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Title
  const title =
    doc.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
    doc.querySelector('title')?.textContent ||
    null;

  // Description
  const description =
    doc.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
    doc.querySelector('meta[name="description"]')?.getAttribute('content') ||
    null;

  // Site name / org
  const siteName =
    doc.querySelector('meta[property="og:site_name"]')?.getAttribute('content') ||
    null;

  // Body text extraction — critical for deadline/prize/location detection
  const bodyText = extractBodyText(doc);

  // Combine all text sources for keyword searching
  const pageText = `${title ?? ''} ${description ?? ''} ${bodyText ?? ''}`;

  // Deadline detection
  const deadline = extractDeadline(pageText);

  // Type classification
  const type = classifyType(pageText);

  // Prizes
  const prizes = extractPrizes(pageText);

  // Location
  const location = extractLocation(pageText);

  // Requirements
  const requirements = extractRequirements(pageText);

  return {
    title: cleanText(title),
    organization: siteName ? cleanText(siteName) : extractOrgFromUrl(url),
    type,
    description: cleanText(description) || cleanText(bodyText)?.slice(0, 500) || null,
    deadline,
    location,
    prizes,
    requirements,
    url,
    confidence: title && description ? 0.75 : title ? 0.5 : bodyText ? 0.35 : 0.25,
    parserUsed: 'generic',
  };
}

/** Extract readable text from the document body, skipping nav/footer/script. */
function extractBodyText(doc: Document): string | null {
  const body = doc.body;
  if (!body) return null;

  // Clone so we don't mutate the parsed doc
  const clone = body.cloneNode(true) as HTMLElement;

  // Remove non-content elements
  const selectors = [
    'script', 'style', 'nav', 'footer', 'header', 'aside',
    '[role="banner"]', '[role="navigation"]', '[role="contentinfo"]',
    '.cookie-banner', '.advertisement', '.ads', '#cookie-banner',
  ];
  selectors.forEach((sel) => {
    clone.querySelectorAll(sel).forEach((el) => el.remove());
  });

  // Prefer article/main content area if available
  const contentArea = clone.querySelector('article, main, [role="main"], .content, #content');
  const el = contentArea || clone;
  const text = (el as HTMLElement).innerText || el.textContent || '';

  return text.replace(/\s+/g, ' ').trim().slice(0, 8000) || null;
}

function cleanText(text: string | null): string | null {
  if (!text) return null;
  return text.replace(/\s+/g, ' ').trim().slice(0, 2000) || null;
}

function extractOrgFromUrl(url: string): string | null {
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      // For subdomains like usaii-global-ai-hackathon-2026.devpost.com,
      // prefer the second-level domain (devpost) rather than the subdomain
      const sld = parts[parts.length - 2];
      if (sld && sld.length > 1) {
        return sld.charAt(0).toUpperCase() + sld.slice(1);
      }
      return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    }
    return hostname;
  } catch {
    return null;
  }
}

function extractDeadline(text: string): string | null {
  // ISO dates: 2026-05-17
  const isoMatch = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (isoMatch) return isoMatch[1];

  // US style: May 17, 2026
  const usMatch = text.match(/\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4})\b/i);
  if (usMatch) {
    try {
      const d = new Date(usMatch[1]);
      if (!isNaN(d.getTime())) {
        return d.toISOString().slice(0, 10);
      }
    } catch { /* ignore */ }
  }

  return null;
}

function classifyType(text: string): OpportunityType | null {
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

function extractPrizes(text: string): string | null {
  const matches = [
    ...text.matchAll(/\$[\d,]+(?:\s*(?:USD|usd))?(?:\s*(?:prize|reward|grant|credit|pool))?/gi),
    ...text.matchAll(/(?:prize\s*pool\s*(?:of\s*)?[\d,]+)/gi),
    ...text.matchAll(/\d+\s*(?:million|billion|k)\s*(?:USD|dollars)?/gi),
  ];
  const unique = Array.from(new Set(matches.map(m => m[0]))).slice(0, 3);
  return unique.length ? unique.join(', ') : null;
}

function extractLocation(text: string): string | null {
  const m = text.match(/(?:location|venue|where)\s*[:\s]+(.+?)(?:\n|\.|$)/i);
  return m ? m[1].trim() : null;
}

function extractRequirements(text: string): string[] {
  const m = text.match(/(?:who can apply|eligibility|requirements?|criteria)\s*[:\s]*(.+?)(?:\n\n|$)/is);
  if (!m) return [];
  return m[1]
    .split(/[\n•\-\*]+/)
    .map(s => s.trim())
    .filter(s => s.length > 5 && s.length < 200)
    .slice(0, 10);
}

/** When we can't fetch the page, try to infer metadata from the URL itself. */
function inferFromUrl(url: string): ParsedOpportunity {
  let title: string | null = null;
  let type: OpportunityType | null = null;

  try {
    const u = new URL(url);
    const pathParts = u.pathname.split('/').filter(Boolean);
    const lastPart = pathParts[pathParts.length - 1] || '';

    // Try to build a title from the last path segment
    if (lastPart && lastPart.length > 2 && !lastPart.includes('.')) {
      title = lastPart
        .replace(/[-_]+/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
    }

    // Infer type from path keywords
    const pathAndHost = (u.pathname + ' ' + u.hostname).toLowerCase();
    if (pathAndHost.includes('hackathon') || pathAndHost.includes('hack')) {
      type = 'hackathon';
    } else if (pathAndHost.includes('grant') || pathAndHost.includes('scholarship') || pathAndHost.includes('funding')) {
      type = 'grant';
    } else if (pathAndHost.includes('accelerator') || pathAndHost.includes('startup') || pathAndHost.includes('cohort')) {
      type = 'accelerator';
    } else if (pathAndHost.includes('job') || pathAndHost.includes('career') || pathAndHost.includes('hiring')) {
      type = 'job';
    } else if (pathAndHost.includes('passport') || pathAndHost.includes('visa') || pathAndHost.includes('government')) {
      type = 'government';
    } else if (pathAndHost.includes('platform') || pathAndHost.includes('beta') || pathAndHost.includes('waitlist')) {
      type = 'platform';
    }
  } catch {
    // ignore
  }

  return {
    title,
    organization: extractOrgFromUrl(url),
    type,
    description: null,
    deadline: null,
    location: null,
    prizes: null,
    requirements: [],
    url,
    confidence: title || type ? 0.25 : 0.15,
    parserUsed: 'generic-fallback',
  };
}

/* ------------------------------------------------------------------ */
/*  Parser export                                                      */
/* ------------------------------------------------------------------ */
export const genericParser: UrlParser = {
  name: 'generic',
  domains: [],
  canParse: () => true, // fallback
  parse: async (url: string): Promise<ParsedOpportunity> => {
    const html = await fetchHtml(url);
    if (html) {
      return extractFromHtml(html, url) as ParsedOpportunity;
    }
    // Fallback: URL-based minimal extraction
    return inferFromUrl(url);
  },
};
