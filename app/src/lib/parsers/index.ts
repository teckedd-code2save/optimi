import type { ParsedOpportunity } from '@/types';
import { linkedinParser } from './linkedin';
import { twitterParser } from './twitter';
import { devpostParser } from './devpost';
import { genericParser } from './generic';
import { googleFormsParser } from './googleForms';
import { knownUrlParser } from './knownUrls';
import { redditParser } from './reddit';
import { indieHackersParser } from './indiehackers';
import { hackerNewsParser } from './hackernews';
import { githubParser } from './github';

export interface UrlParser {
  name: string;
  domains: string[];
  canParse: (url: string) => boolean;
  parse: (url: string) => ParsedOpportunity | Promise<ParsedOpportunity>;
}

export const PARSERS: UrlParser[] = [
  knownUrlParser,
  linkedinParser,
  googleFormsParser,
  hackerNewsParser,
  githubParser,
  redditParser,
  indieHackersParser,
  devpostParser,
  twitterParser,
  genericParser, // fallback, must be last
];

export { linkedinParser, twitterParser, devpostParser, genericParser, googleFormsParser, knownUrlParser, redditParser, indieHackersParser, hackerNewsParser, githubParser };

export function parseUrl(url: string): ParsedOpportunity | Promise<ParsedOpportunity> {
  const parser = PARSERS.find((p) => p.canParse(url));
  if (parser) {
    return parser.parse(url);
  }
  return genericParser.parse(url);
}
