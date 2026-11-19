import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import type { NameSuggestion, NamingClient } from '@/engine/page-object/ai-naming';
import { aiEnabledSetting, apiKeySetting } from '@/shared/ai-settings';
import { handleSuggestNameMessage } from '@/shared/ai-suggest';

const hints = { tagName: 'a', role: 'link', name: 'Over ons' };
const message = { type: 'SUGGEST_NAME', hints };

let createClient: ReturnType<typeof vi.fn>;
let permitted: boolean;

function ask(): Promise<NameSuggestion> {
  return new Promise((resolve) => handleSuggestNameMessage(message, resolve, createClient as (key: string) => NamingClient));
}

beforeEach(() => {
  fakeBrowser.reset();
  permitted = true;
  vi.spyOn(fakeBrowser.permissions, 'contains').mockImplementation(async () => permitted);
  const parse = vi.fn().mockResolvedValue({ stop_reason: 'end_turn', parsed_output: { name: 'aboutUsLink' } });
  createClient = vi.fn(() => ({ beta: { messages: { parse } } }));
});

describe('naamsuggestie in de background', () => {
  it('staat standaard uit: regelgebaseerd, zonder AI-aanroep', async () => {
    expect(await ask()).toEqual({ name: 'overOnsLink', source: 'rules', reason: 'AI-suggesties staan uit' });
    expect(createClient).not.toHaveBeenCalled();
  });

  it('zonder sleutel: regelgebaseerd', async () => {
    await aiEnabledSetting.setValue(true);
    expect(await ask()).toMatchObject({ source: 'rules', reason: 'Geen API-sleutel ingesteld' });
    expect(createClient).not.toHaveBeenCalled();
  });

  it('zonder toestemming voor api.anthropic.com: regelgebaseerd', async () => {
    await aiEnabledSetting.setValue(true);
    await apiKeySetting.setValue('sk-ant-test');
    permitted = false;
    expect(await ask()).toMatchObject({ source: 'rules', reason: 'Geen toestemming voor api.anthropic.com' });
    expect(createClient).not.toHaveBeenCalled();
  });

  it('aan, met sleutel en toestemming: vraagt het model', async () => {
    await aiEnabledSetting.setValue(true);
    await apiKeySetting.setValue(' sk-ant-test ');
    expect(await ask()).toEqual({ name: 'aboutUsLink', source: 'ai' });
    expect(createClient).toHaveBeenCalledWith('sk-ant-test');
  });

  it('negeert andere berichten', () => {
    expect(handleSuggestNameMessage({ type: 'IETS_ANDERS' }, vi.fn())).toBeUndefined();
  });
});
