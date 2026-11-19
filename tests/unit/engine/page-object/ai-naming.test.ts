import { describe, expect, it, vi } from 'vitest';
import {
  AI_MODEL,
  buildNamingRequest,
  NAMING_REQUEST_FIELDS,
  suggestFieldNameWithAi,
  type NamingClient,
  type NamingContext,
} from '@/engine/page-object/ai-naming';

const HINTS: NamingContext = {
  tagName: 'button',
  role: 'button',
  name: 'Bestelling   plaatsen',
  testValue: 'place-order',
  id: 'order',
  pageTitle: 'Afrekenen – Webshop',
};

function fakeClient(response: object | Error): { client: NamingClient; parse: ReturnType<typeof vi.fn> } {
  const parse = vi.fn(() => (response instanceof Error ? Promise.reject(response) : Promise.resolve(response)));
  return { client: { beta: { messages: { parse } } } as unknown as NamingClient, parse };
}

describe('buildNamingRequest: wat de browser verlaat', () => {
  it('bevat alleen de vaste velden, opgeschoond', () => {
    expect(buildNamingRequest(HINTS)).toEqual({
      tag: 'button',
      role: 'button',
      accessibleName: 'Bestelling plaatsen',
      testAttributeValue: 'place-order',
      id: 'order',
      pageTitle: 'Afrekenen – Webshop',
    });
  });

  it('neemt geen onbekende velden mee, ook niet als ze in de hints staan', () => {
    const request = buildNamingRequest({ ...HINTS, url: 'https://geheim.example', html: '<form>' } as NamingContext);
    expect(Object.keys(request).sort()).toEqual(NAMING_REQUEST_FIELDS.map((f) => f.field).sort());
  });

  it('kort lange tekst in tot 80 tekens', () => {
    const request = buildNamingRequest({ ...HINTS, name: 'x'.repeat(200), pageTitle: 'y'.repeat(200) });
    expect(request.accessibleName).toHaveLength(80);
    expect(request.pageTitle).toHaveLength(80);
  });

  it('lege waarden worden null', () => {
    expect(buildNamingRequest({ tagName: 'div', name: '  ' })).toMatchObject({ accessibleName: null, id: null, role: null });
  });
});

describe('suggestFieldNameWithAi', () => {
  it('geeft de naam van het model en stuurt alleen het verzoek mee', async () => {
    const { client, parse } = fakeClient({ stop_reason: 'end_turn', parsed_output: { name: 'placeOrderButton' } });

    expect(await suggestFieldNameWithAi(HINTS, client)).toEqual({ name: 'placeOrderButton', source: 'ai' });

    const params = parse.mock.calls[0]![0];
    expect(params.model).toBe(AI_MODEL);
    expect(params.output_config.effort).toBe('low');
    expect(params.fallbacks).toBe('default');
    expect(params.betas).toEqual(['server-side-fallback-2026-07-01']);
    expect(params.messages).toEqual([{ role: 'user', content: JSON.stringify(buildNamingRequest(HINTS)) }]);
  });

  it('valt terug op de regelgebaseerde naam zonder client', async () => {
    expect(await suggestFieldNameWithAi(HINTS, null)).toEqual({
      name: 'placeOrderButton',
      source: 'rules',
      reason: 'AI-suggesties staan uit',
    });
  });

  it.each([
    ['een ongeldige naam', { stop_reason: 'end_turn', parsed_output: { name: 'place order!' } }, 'Het model gaf geen geldige naam'],
    ['een gereserveerd woord', { stop_reason: 'end_turn', parsed_output: { name: 'class' } }, 'Het model gaf geen geldige naam'],
    ['geen output', { stop_reason: 'end_turn', parsed_output: null }, 'Het model gaf geen geldige naam'],
    ['een weigering', { stop_reason: 'refusal', parsed_output: null }, 'Het model gaf geen suggestie'],
    ['een fout', new Error('401'), 'AI niet bereikbaar'],
  ])('valt terug op regels bij %s', async (_case, response, reason) => {
    const { client } = fakeClient(response);
    expect(await suggestFieldNameWithAi(HINTS, client)).toEqual({ name: 'placeOrderButton', source: 'rules', reason });
  });
});
