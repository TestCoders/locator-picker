// AI-suggestie voor een veldnaam (issue #25), met de regelgebaseerde naam als
// terugval. Alleen de velden uit buildNamingRequest verlaten de browser.

import type Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { fieldNameError, suggestFieldName, type NamingHints } from './naming';

export const AI_MODEL = 'claude-opus-5-5';

const MAX_TEXT = 80;

/**
 * Precies wat naar Anthropic gaat. Geen URL, geen HTML, geen ingevulde
 * formulierwaarden: alleen deze velden, ingekort tot 80 tekens.
 */
export type NamingRequest = {
  tag: string;
  role: string | null;
  accessibleName: string | null;
  testAttributeValue: string | null;
  id: string | null;
  pageTitle: string | null;
};

/** Beschrijving van de velden voor de uitleg op de optiespagina; houd gelijk aan NamingRequest. */
export const NAMING_REQUEST_FIELDS: readonly { field: keyof NamingRequest; label: string }[] = [
  { field: 'tag', label: 'de tag van het element, bijv. button' },
  { field: 'role', label: 'de rol, bijv. link of textbox' },
  { field: 'accessibleName', label: 'de toegankelijke naam of zichtbare tekst (max. 80 tekens)' },
  { field: 'testAttributeValue', label: 'de waarde van het testattribuut, bijv. login-button' },
  { field: 'id', label: 'het id van het element' },
  { field: 'pageTitle', label: 'de titel van de pagina (max. 80 tekens)' },
];

export type NamingContext = NamingHints & { pageTitle?: string };

export function buildNamingRequest(hints: NamingContext): NamingRequest {
  return {
    tag: truncate(hints.tagName) ?? '',
    role: hints.role ?? null,
    accessibleName: truncate(hints.name),
    testAttributeValue: truncate(hints.testValue),
    id: truncate(hints.id),
    pageTitle: truncate(hints.pageTitle),
  };
}

export type NameSuggestion =
  | { name: string; source: 'ai' }
  | { name: string; source: 'rules'; reason: string };

/** Het deel van de Anthropic-client dat de suggestie gebruikt; in tests te vervangen. */
export type NamingClient = { beta: { messages: Pick<Anthropic['beta']['messages'], 'parse'> } };

const SuggestionSchema = z.object({ name: z.string() });

const SYSTEM_PROMPT = `You name fields in a Playwright page object class (TypeScript).
Given facts about one element on a web page, return one field name.
Rules: camelCase; letters and digits only; start with a lowercase letter; 1 to 4 words;
end with what the element is (Button, Link, Input, Checkbox, Select, Heading, ...);
use the language of the element's visible text; describe the purpose, not the position.`;

export async function suggestFieldNameWithAi(
  hints: NamingContext,
  client: NamingClient | null,
): Promise<NameSuggestion> {
  const rules = (reason: string): NameSuggestion => ({ name: suggestFieldName(hints), source: 'rules', reason });
  if (!client) return rules('AI-suggesties staan uit');

  try {
    const response = await client.beta.messages.parse({
      model: AI_MODEL,
      max_tokens: 2048,
      // Bij een weigering kiest de API zelf een ander model (refusal-fallback).
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: betaZodOutputFormat(SuggestionSchema) },
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: JSON.stringify(buildNamingRequest(hints)) }],
    });

    if (response.stop_reason === 'refusal') return rules('Het model gaf geen suggestie');
    const name = response.parsed_output?.name.trim() ?? '';
    if (fieldNameError(name)) return rules('Het model gaf geen geldige naam');
    return { name, source: 'ai' };
  } catch {
    return rules('AI niet bereikbaar');
  }
}

function truncate(value: string | null | undefined): string | null {
  const text = value?.replace(/\s+/g, ' ').trim();
  if (!text) return null;
  return text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT - 1)}…` : text;
}
