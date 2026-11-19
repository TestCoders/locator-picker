// @vitest-environment jsdom
// Uniekheid op echte websites (issue #18). De pagina's staan als momentopname in
// tests/fixtures/sites, zodat de test offline en deterministisch draait.
// De testset en de keuze van de sites staan in docs/testsites.md.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildResult } from '@/content/result-data';
import { validateLocator } from '@/engine/validate';

function load(file: string): Document {
  const html = readFileSync(resolve(__dirname, '../fixtures/sites', file), 'utf8');
  return new DOMParser().parseFromString(html, 'text/html');
}

/** n-de element met deze tag en exact deze (genormaliseerde) tekst. */
function byText(doc: Document, tag: string, text: string, nth = 0): Element {
  const found = Array.from(doc.querySelectorAll(tag)).filter(
    (el) => (el.textContent ?? '').replace(/\s+/g, ' ').trim() === text,
  );
  const el = found[nth];
  if (!el) throw new Error(`Testset mist <${tag}> "${text}" (#${nth})`);
  return el;
}

function pick(doc: Document, selector: string, nth = 0): Element {
  const el = doc.querySelectorAll(selector)[nth];
  if (!el) throw new Error(`Testset mist ${selector} (#${nth})`);
  return el;
}

type Target = { name: string; find: (doc: Document) => Element };
type Site = { site: string; file: string; targets: Target[] };

// Per site minimaal vijf elementen die als testset gelden.
const SITES: Site[] = [
  {
    site: 'the-internet.herokuapp.com/login',
    file: 'the-internet-login.html',
    targets: [
      { name: 'invoerveld Username', find: (d) => pick(d, 'input[name="username"]') },
      { name: 'invoerveld Password', find: (d) => pick(d, 'input[name="password"]') },
      { name: 'knop Login', find: (d) => pick(d, 'button[type="submit"]') },
      { name: 'label Username', find: (d) => byText(d, 'label', 'Username') },
      { name: 'kop Login Page', find: (d) => byText(d, 'h2', 'Login Page') },
      { name: 'formulier', find: (d) => pick(d, 'form') },
    ],
  },
  {
    site: 'the-internet.herokuapp.com/tables',
    file: 'the-internet-tables.html',
    targets: [
      { name: 'kolomkop Last Name (tabel 1)', find: (d) => byText(d, 'th', 'Last Name', 0) },
      { name: 'cel Smith (tabel 1)', find: (d) => byText(d, 'td', 'Smith', 0) },
      { name: 'cel Smith (tabel 2)', find: (d) => byText(d, 'td', 'Smith', 1) },
      { name: 'edit-link rij 2 (tabel 1)', find: (d) => pick(d, '#table1 tbody tr:nth-child(2) a', 0) },
      { name: 'delete-link rij 3 (tabel 1)', find: (d) => pick(d, '#table1 tbody tr:nth-child(3) a', 1) },
      { name: 'cel $100.00 (tabel 1)', find: (d) => byText(d, 'td', '$100.00', 0) },
    ],
  },
  {
    site: 'en.wikipedia.org (Provinces of the Netherlands)',
    file: 'wikipedia-provinces.html',
    targets: [
      { name: 'kop Provinces of the Netherlands', find: (d) => pick(d, 'h1') },
      { name: 'kolomkop Capital', find: (d) => byText(d, 'th', 'Capital') },
      { name: 'link Drenthe', find: (d) => byText(d, 'a', 'Drenthe') },
      { name: 'link Assen', find: (d) => byText(d, 'a', 'Assen') },
      { name: 'link CDA', find: (d) => byText(d, 'a', 'CDA', 0) },
      { name: 'tabel', find: (d) => pick(d, 'table.wikitable') },
    ],
  },
  {
    site: 'news.ycombinator.com/login',
    file: 'hacker-news-login.html',
    targets: [
      { name: 'gebruikersnaam (login-formulier)', find: (d) => pick(d, 'input[name="acct"]', 0) },
      { name: 'wachtwoord (login-formulier)', find: (d) => pick(d, 'input[name="pw"]', 0) },
      { name: 'gebruikersnaam (account-formulier)', find: (d) => pick(d, 'input[name="acct"]', 1) },
      { name: 'wachtwoord (account-formulier)', find: (d) => pick(d, 'input[name="pw"]', 1) },
      { name: 'knop login', find: (d) => pick(d, 'input[type="submit"]', 0) },
      { name: 'knop create account', find: (d) => pick(d, 'input[type="submit"]', 1) },
      { name: 'link Forgot your password?', find: (d) => byText(d, 'a', 'Forgot your password?') },
    ],
  },
];

describe('testsites: elke locator vindt precies het gekozen element', () => {
  for (const { site, file, targets } of SITES) {
    describe(site, () => {
      const doc = load(file);

      it('heeft minimaal vijf elementen in de testset', () => {
        expect(targets.length).toBeGreaterThanOrEqual(5);
      });

      it.each(targets.map((t) => [t.name, t] as const))('%s', (_name, target) => {
        const element = target.find(doc);
        const result = buildResult(element);

        // CSS en XPath: exact 1 match, en dat is het gekozen element.
        for (const entry of result.entries.filter((e) => e.format !== 'playwright')) {
          const kind = entry.format === 'css' ? 'css' : 'xpath';
          const match = validateLocator({ kind, value: entry.value }, element);
          expect(match, `${entry.label}: ${entry.value}`).toMatchObject({ count: 1, status: 'unique' });
        }
        // Snippet: de onderliggende locator vindt exact 1 element.
        const snippet = result.entries.find((e) => e.format === 'playwright')!;
        expect(snippet.matches, `Playwright: ${snippet.value}`).toBe(1);
      });
    });
  }
});
