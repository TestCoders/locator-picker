// "De export compileert zonder aanpassing": de gegenereerde klasse gaat door
// de echte TypeScript-compiler, tegen de types van @playwright/test.

import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { generatePlaywrightPageObject } from '@/engine/page-object/playwright';
import { playwrightSnippet } from '@/engine/snippets/playwright';

const run = promisify(execFile);
const ROOT = path.resolve(import.meta.dirname, '../../../..');
const TSC = path.join(ROOT, 'node_modules/.bin/tsc');

let dir: string;

beforeAll(async () => {
  // Binnen de repo, zodat '@playwright/test' uit node_modules gevonden wordt.
  dir = await mkdtemp(path.join(ROOT, 'node_modules/.cache-page-object-'));
});

afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

async function compile(source: string): Promise<{ ok: boolean; output: string }> {
  const file = path.join(dir, `PageObject${Math.random().toString(36).slice(2)}.ts`);
  await writeFile(file, source);
  try {
    await run(TSC, [
      '--noEmit',
      '--strict',
      '--target', 'es2022',
      '--module', 'preserve',
      '--moduleResolution', 'bundler',
      '--verbatimModuleSyntax',
      '--skipLibCheck',
      // De tsconfig van het project niet gebruiken: alleen deze opties en dit bestand.
      '--ignoreConfig',
      file,
    ]);
    return { ok: true, output: '' };
  } catch (error) {
    const { stdout = '', stderr = '' } = error as { stdout?: string; stderr?: string };
    return { ok: false, output: stdout + stderr };
  }
}

describe('gegenereerd page object compileert', () => {
  it('met snippets uit de Playwright-generator voor elke strategie', async () => {
    const snippets = [
      playwrightSnippet({ strategy: 'test-attribute', attribute: 'data-testid', value: "it's", locator: '', matches: 1 }),
      playwrightSnippet({ strategy: 'test-attribute', attribute: 'data-cy', value: 'go', locator: '[data-cy="go"]', matches: 1 }),
      playwrightSnippet({ strategy: 'id', id: 'email', locator: '#email', matches: 1 }),
      playwrightSnippet({ strategy: 'role-name', role: 'button', name: 'Opslaan "nu"', locator: '', matches: 1 }),
      playwrightSnippet({ strategy: 'xpath', locator: '/html/body/div[2]/span', matches: 1 }),
    ];
    const source = generatePlaywrightPageObject({
      className: 'CheckoutPage',
      fields: snippets.map((snippet, i) => ({ name: `field${i}`, snippet })),
    });

    const result = await compile(source);
    expect(result.output).toBe('');
    expect(result.ok).toBe(true);
  }, 60_000);

  it('controle: de compiler vangt een fout echt op', async () => {
    const source = generatePlaywrightPageObject({
      className: 'BrokenPage',
      fields: [{ name: 'oops', snippet: "page.getByTestIdd('x')" }],
    });

    const result = await compile(source);
    expect(result.ok).toBe(false);
    expect(result.output).toMatch(/getByTestIdd/);
  }, 60_000);
});
