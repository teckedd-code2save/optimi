import type { ParsedOpportunity } from '@/types';
import { linkedinParser } from './linkedin';
import { twitterParser } from './twitter';
import { devpostParser } from './devpost';
import { genericParser } from './generic';
import { googleFormsParser } from './googleForms';
import { knownUrlParser } from './knownUrls';

export interface UrlParser {
  name: string;
  domains: string[];
  canParse: (url: string) => boolean;
  parse: (url: string) => ParsedOpportunity | Promise<ParsedOpportunity>;
}

export const PARSERS: UrlParser[] = [
  knownUrlParser,
  linkedinParser,
  twitterParser,
  devpostParser,
  googleFormsParser,
  genericParser, // fallback, must be last
];

export { linkedinParser, twitterParser, devpostParser, genericParser, googleFormsParser, knownUrlParser };

export function parseUrl(url: string): ParsedOpportunity | Promise<ParsedOpportunity> {
  const parser = PARSERS.find((p) => p.canParse(url));
  if (parser) {
    return parser.parse(url);
  }
  return genericParser.parse(url);
}
