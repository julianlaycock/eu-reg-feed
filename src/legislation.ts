/**
 * Recognising references to EU legal acts in publication titles and summaries.
 *
 * A regulatory event is only useful to a consumer if it can be tied back to the
 * legislation it implements or interprets — that link is also the join key to
 * other open EU datasets (EUR-Lex, and through it parliamentary trackers such as
 * Parltrack and HowTheyVote).
 *
 * What is done here is deliberately narrow: recognise the *citation* a regulator
 * writes ("Regulation (EU) 2019/2088", "Directive 2014/65/EU") and record it in
 * a structured form. Resolving that citation to a CELEX number or an ELI URI
 * requires a EUR-Lex lookup, so `celex` and `eli` are left unset rather than
 * guessed — a wrong identifier is worse than an absent one.
 */

import type { AffectedLegislation } from './types.js';

interface CitationPattern {
  regex: RegExp;
  act: 'Regulation' | 'Directive' | 'Decision';
}

const PATTERNS: CitationPattern[] = [
  // Post-2015 style: Regulation (EU) 2019/2088, Regulation (EU) No 575/2013
  { regex: /\b(Regulation)\s*\((?:EU|EC|EEC)\)\s*(?:No\.?\s*)?(\d{1,4}\/\d{2,4})\b/gi, act: 'Regulation' },
  { regex: /\b(Directive)\s*\((?:EU|EC|EEC)\)\s*(?:No\.?\s*)?(\d{1,4}\/\d{2,4})\b/gi, act: 'Directive' },
  { regex: /\b(Decision)\s*\((?:EU|EC|EEC)\)\s*(?:No\.?\s*)?(\d{1,4}\/\d{2,4})\b/gi, act: 'Decision' },
  // Pre-2015 style: Directive 2014/65/EU, Regulation 648/2012/EU
  { regex: /\b(Regulation)\s*(\d{1,4}\/\d{2,4})\/(?:EU|EC|EEC)\b/gi, act: 'Regulation' },
  { regex: /\b(Directive)\s*(\d{1,4}\/\d{2,4})\/(?:EU|EC|EEC)\b/gi, act: 'Directive' },
];

/** Short names regulators use far more often than the formal citation. */
const SHORT_NAMES: Array<{ match: RegExp; name: string }> = [
  { match: /\bMiFID\s*II\b/i, name: 'MiFID II (Directive 2014/65/EU)' },
  { match: /\bMiFIR\b/i, name: 'MiFIR (Regulation (EU) No 600/2014)' },
  { match: /\bAIFMD\b/i, name: 'AIFMD (Directive 2011/61/EU)' },
  { match: /\bUCITS\b/i, name: 'UCITS Directive (Directive 2009/65/EC)' },
  { match: /\bEMIR\b/i, name: 'EMIR (Regulation (EU) No 648/2012)' },
  { match: /\bDORA\b/i, name: 'DORA (Regulation (EU) 2022/2554)' },
  { match: /\bMiCA(?:R)?\b/i, name: 'MiCA (Regulation (EU) 2023/1114)' },
  { match: /\bSFDR\b/i, name: 'SFDR (Regulation (EU) 2019/2088)' },
  { match: /\bCRR\s*(?:III|3)?\b/i, name: 'CRR (Regulation (EU) No 575/2013)' },
  { match: /\bCRD\s*(?:IV|V|4|5)?\b/i, name: 'CRD (Directive 2013/36/EU)' },
  { match: /\bPSD\s*(?:2|II)\b/i, name: 'PSD2 (Directive (EU) 2015/2366)' },
  { match: /\bAMLD?\s*(?:5|6|V|VI)\b/i, name: 'Anti-Money Laundering Directive' },
];

/**
 * Extract the legal acts referenced in a piece of regulator text.
 *
 * Returns at most `limit` distinct references, in the order they appear, with
 * `celex`/`eli` unset — see the module comment for why.
 */
export function extractLegislation(text: string | null | undefined, limit = 5): AffectedLegislation[] {
  if (!text) return [];

  const found = new Map<string, AffectedLegislation>();

  for (const { regex, act } of PATTERNS) {
    // Each pattern carries the global flag, so reset before reuse.
    regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      // Keep the citation as the regulator wrote it, but key on act + number so
      // "Regulation (EU) No 575/2013" and "Regulation 575/2013/EU" are one entry.
      const key = `${act} ${match[2]}`.toLowerCase();
      const name = match[0].replace(/\s+/g, ' ').trim();
      if (!found.has(key)) found.set(key, { name });
      if (found.size >= limit) return [...found.values()];
    }
  }

  for (const { match, name } of SHORT_NAMES) {
    if (match.test(text) && !found.has(name.toLowerCase())) {
      found.set(name.toLowerCase(), { name });
      if (found.size >= limit) break;
    }
  }

  return [...found.values()];
}
