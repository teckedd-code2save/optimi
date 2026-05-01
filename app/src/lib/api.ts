/**
 * Frontend API client for the Optimi backend.
 *
 * The backend is optional. When not configured, the app falls back to
 * client-side parsers and template-based AI generation.
 */

import type { ParsedOpportunity } from '@/types';

export interface AIGenerateRequest {
  template: string;
  tone: string;
  fields: Record<string, string>;
  opportunity?: { title: string; organization?: string; type?: string; description?: string } | null;
  model?: string;
}

export interface AIGenerateResponse {
  content: string;
  model: string;
  word_count: number;
}

export interface AIStatusResponse {
  configured: boolean;
}

export interface ScrapeResponse extends ParsedOpportunity {}

function getBaseUrl(backendUrl: string): string {
  const url = backendUrl.trim();
  if (!url) {
    // If no backend configured, try same-origin /api (for docker-compose setup)
    return '';
  }
  return url.replace(/\/$/, '');
}

export async function checkAIStatus(backendUrl: string): Promise<boolean> {
  try {
    const base = getBaseUrl(backendUrl);
    const res = await fetch(`${base}/api/ai/status`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return false;
    const data: AIStatusResponse = await res.json();
    return data.configured;
  } catch {
    return false;
  }
}

export async function generateAI(
  backendUrl: string,
  req: AIGenerateRequest
): Promise<AIGenerateResponse> {
  const base = await getBaseUrl(backendUrl);
  const res = await fetch(`${base}/api/ai/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error');
    throw new Error(text);
  }
  return res.json();
}

export async function scrapeUrl(backendUrl: string, url: string): Promise<ScrapeResponse> {
  const base = await getBaseUrl(backendUrl);
  const res = await fetch(`${base}/scrape`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error');
    throw new Error(text);
  }
  return res.json();
}
