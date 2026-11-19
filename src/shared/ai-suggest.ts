// Naamsuggestie via de background (issue #25). Alleen de background leest de
// API-sleutel en praat met api.anthropic.com; pagina's en content scripts niet.

import Anthropic from '@anthropic-ai/sdk';
import {
  suggestFieldNameWithAi,
  type NameSuggestion,
  type NamingClient,
  type NamingContext,
} from '@/engine/page-object/ai-naming';
import { suggestFieldName } from '@/engine/page-object/naming';
import { aiEnabledSetting, ANTHROPIC_ORIGIN, apiKeySetting } from './ai-settings';

export type SuggestNameMessage = { type: 'SUGGEST_NAME'; hints: NamingContext };

export function isSuggestNameMessage(value: unknown): value is SuggestNameMessage {
  return typeof value === 'object' && value !== null && 'type' in value && value.type === 'SUGGEST_NAME';
}

/** Vanuit de exportpagina: vraagt de background om een naam. */
export async function requestNameSuggestion(hints: NamingContext): Promise<NameSuggestion> {
  const message: SuggestNameMessage = { type: 'SUGGEST_NAME', hints };
  const response = (await browser.runtime.sendMessage(message)) as NameSuggestion | undefined;
  return response ?? { name: suggestFieldName(hints), source: 'rules', reason: 'Geen antwoord van de extensie' };
}

type ClientFactory = (apiKey: string) => NamingClient;

// De sleutel is van de gebruiker zelf en blijft in de extensie; webpagina's
// kunnen er niet bij. Daarom mag de SDK hier buiten een server draaien.
const defaultClient: ClientFactory = (apiKey) => new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

/** onMessage-listener voor de background. */
export function handleSuggestNameMessage(
  message: unknown,
  sendResponse: (response: NameSuggestion) => void,
  createClient: ClientFactory = defaultClient,
): true | undefined {
  if (!isSuggestNameMessage(message)) return undefined;
  void suggest(message.hints, createClient).then(sendResponse);
  return true;
}

async function suggest(hints: NamingContext, createClient: ClientFactory): Promise<NameSuggestion> {
  const rules = (reason: string): NameSuggestion => ({ name: suggestFieldName(hints), source: 'rules', reason });
  if (!(await aiEnabledSetting.getValue())) return rules('AI-suggesties staan uit');
  const apiKey = (await apiKeySetting.getValue()).trim();
  if (!apiKey) return rules('Geen API-sleutel ingesteld');
  if (!(await browser.permissions.contains({ origins: [ANTHROPIC_ORIGIN] }))) {
    return rules('Geen toestemming voor api.anthropic.com');
  }
  return suggestFieldNameWithAi(hints, createClient(apiKey));
}
