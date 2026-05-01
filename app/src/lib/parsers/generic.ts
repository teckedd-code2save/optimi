import type { UrlParser } from '.';
import type { ParsedOpportunity, OpportunityType } from '@/types';

/* ------------------------------------------------------------------ */
/*  CORS proxy fallbacks                                               */
/* ------------------------------------------------------------------ */
const PROXIES = [
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
];

async function fetchHtml(url: string): Promise<string | null> {
  // Try direct fetch (rarely works due to CORS, but worth trying)
  try {
    const res = await fetch(url, { method: 'GET', redirect: 'follow' });
    if (res.ok) return await res.text();
  } catch { /* ignore */ }

  // Try CORS proxies
  for (const makeProxy of PROXIES) {
    try {
      const res = await fetch(makeProxy(url), { redirect: 'follow' });
      if (res.ok) return await res.text();
    } catch { /* ignore */ }
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

  // Image (not used yet but extracted)
  // const image = doc.querySelector('meta[property="og:image"]')?.getAttribute('content');

  // Deadline detection
  const pageText = `${title ?? ''} ${description ?? ''}`;
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
    description: cleanText(description),
    deadline,
    location,
    prizes,
    requirements,
    url,
    confidence: title && description ? 0.75 : title ? 0.5 : 0.25,
    parserUsed: 'generic',
  };
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
    hackathon: ['hackathon', 'hack', 'buildathon', 'codeathon', 'demo day', 'coding competition'].filter(k => lower.includes(k)).length,
    accelerator: ['accelerator', 'cohort', 'batch', 'startup program', 'incubator', 'seed', 'venture', 'vc'].filter(k => lower.includes(k)).length,
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
    return {
      title: null,
      organization: extractOrgFromUrl(url),
      type: null,
      description: null,
      deadline: null,
      location: null,
      prizes: null,
      requirements: [],
      url,
      confidence: 0.1,
      parserUsed: 'generic-fallback',
    };
  },
};
