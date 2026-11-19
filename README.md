# locator-picker
Een browserextensie opleveren waarmee een tester met één klik op een element een stabiele, leesbare locator naar het clipboard kopieert, zodat locators zoeken van minuten naar seconden gaat.

## Ontwikkelen

Vereist Node.js 20+ en npm.

```sh
npm install
npm run build        # Chrome: .output/chrome-mv3
npm run build:edge   # Edge:   .output/edge-mv3
npm run dev          # Chrome met hot reload
npm run typecheck
npm test             # unit tests (Vitest)
npm run test:e2e     # E2E: bouwt de extensie en draait Playwright
```

### Laden in de browser

1. Draai `npm run build` (of `npm run build:edge`).
2. Open `chrome://extensions` (of `edge://extensions`) en zet **Ontwikkelaarsmodus** aan.
3. Kies **Uitgepakte extensie laden** en selecteer `.output/chrome-mv3` (of `.output/edge-mv3`).

Zie [ADR 0001](docs/adr/0001-techstack.md) voor de techstack en mapstructuur. Een demo-script met verwachte uitkomsten en de 1.0-checklist staan in [docs/demo.md](docs/demo.md).

### Gebruik

Klik op het extensie-icoon om de pick-modus op de actieve tab aan te zetten; de badge toont dan **AAN**. Nogmaals klikken of **Esc** zet hem weer uit. Navigeren naar een andere pagina zet de modus ook uit.

In pick-modus kiest een klik het element onder de muis; de klik bereikt de pagina niet, dus links, knoppen en formulieren doen niets. Het gekozen element houdt een groene highlight en de pick-modus gaat uit. Zet de modus opnieuw aan om een ander element te kiezen.

Na de klik verschijnt rechtsonder het **resultaatpaneel** met de CSS-selector, de XPath en de Playwright-snippet, elk met het aantal matches en een eigen **Kopieer**-knop. De focus staat op de eerste knop: met **Tab** ga je naar de volgende, **Enter** of **Spatie** kopieert en **Esc** sluit het paneel. In de console van de pagina staat per kopie hoe lang het duurde van klik tot clipboard.

Tabs die al open stonden voordat de extensie geladen werd, moeten eerst herladen worden.

### Opties: testattribuut

Klik met de rechtermuisknop op het extensie-icoon en kies **Opties** (of via `chrome://extensions` → Locator Picker → **Details** → **Extensie-opties**). Kies daar welk testattribuut de engine als eerste gebruikt: `data-testid` (standaard), `data-cy` of `data-qa`. De keuze wordt bewaard in `chrome.storage.sync`, blijft na een herstart van de browser en geldt direct in open tabs, zonder herladen. Ontbreekt het gekozen attribuut op een element, dan probeert de engine de andere testattributen.

De Playwright-snippet gebruikt `getByTestId` alleen voor `data-testid`, de standaard van Playwright. Andere attributen worden `page.locator('[data-cy="..."]')`.

### Historie

Elk gekozen element komt in de historie van het domein waarop je het koos. Open de historie via **Opties** (zie hierboven): per domein staan de locators met het nieuwste bovenaan. Elk item heeft knoppen om de CSS-selector, XPath of Playwright-snippet te kopiëren. **Wissen** leegt één domein en **Alles wissen** de hele historie.

- Per domein bewaart de extensie maximaal 50 items. Kies je hetzelfde element opnieuw, dan verhuist het naar boven in plaats van dubbel te staan; bij het 51e item valt het oudste weg.
- De historie staat in `chrome.storage.local`: alleen in deze browser en niet gesynchroniseerd naar andere apparaten.
- Pagina's zonder hostnaam, zoals `file://`, komen niet in de historie.

### Page object exporteren

Klik in het resultaatpaneel op **+ Page object** om de Playwright-locator van het gekozen element te verzamelen. Doe dat voor zoveel elementen als je wilt, ook op andere pagina's en in andere tabs. **Exporteren** opent een pagina met alle verzamelde locators: pas daar de veldnamen en de klassenaam aan, en kopieer of download de klasse.

```ts
import type { Locator, Page } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly loginButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('#email');
    this.loginButton = page.getByTestId('login');
  }
}
```

- De export is **Playwright in TypeScript**. Selenium volgt eventueel later.
- Namen worden voorgesteld uit testattribuut, id of toegankelijke naam plus de rol (`loginButton`, `emailInput`). Ongeldige of dubbele namen blokkeren de export, met een melding bij het veld.
- De lijst staat in `chrome.storage.session`: hij blijft bewaard zolang de browser open is en verdwijnt bij afsluiten.
- Een unit test compileert de export met `tsc` tegen de types van `@playwright/test`. Een E2E-test verzamelt via het paneel, importeert de geëxporteerde klasse en gebruikt hem tegen de testsite.

### AI-naamsuggesties (optioneel)

Op de exportpagina van het page object geeft de knop **AI-suggestie** per veld een naam van Claude (`claude-opus-5-5`, effort `low`), bijvoorbeeld `placeOrderButton`. De naam blijft daarna aanpasbaar.

- **Standaard uit.** Zet het aan bij **Opties → AI-naamsuggesties** en vul je eigen Anthropic API-sleutel in. Bij het aanzetten vraagt de browser toestemming voor `https://api.anthropic.com/*`; bij uitzetten trekt de extensie die weer in.
- **Wat de browser verlaat**, en alleen als je op de knop klikt: de tag, de rol, de toegankelijke naam of zichtbare tekst, de waarde van het testattribuut, het id en de paginatitel (tekst ingekort tot 80 tekens). Nooit de URL, de HTML, ingevulde formulierwaarden of andere elementen. De lijst staat ook op de optiespagina en wordt in `src/engine/page-object/ai-naming.ts` vastgelegd en getest.
- **De sleutel** staat in `chrome.storage.local` (niet gesynchroniseerd) en alleen de background gebruikt hem.
- **Zonder AI** (uit, geen sleutel, geen toestemming, een fout, een weigering of een ongeldige naam) krijg je de regelgebaseerde naam, met de reden erbij.

## Snippets

### Playwright

De Playwright-snippet is **TypeScript/JavaScript**: de expressie is in beide talen gelijk, dus hij werkt in Playwright Test en in losse JS/TS-scripts. Andere talen (Python, Java, .NET) volgen eventueel later.

| Strategie | Snippet |
| --- | --- |
| `data-testid` | `page.getByTestId('save-btn')` |
| Ander testattribuut | `page.locator('[data-cy="go"]')` |
| Rol + naam | `page.getByRole('button', { name: 'Opslaan', exact: true })` |
| `id` | `page.locator('#main')` |
| XPath | `page.locator('xpath=/html/body/div/span[2]')` |

- `exact: true` omdat Playwright de naam anders hoofdletterongevoelig als deeltekst matcht (`'Opslaan'` vindt dan ook `'Opslaan als'`).
- `getByTestId` gebruikt alleen `data-testid`, de standaard van Playwright. Wie in Playwright een ander attribuut instelt met `selectors.setTestIdAttribute()`, geeft dat mee als `testIdAttribute`.
- Argumenten zijn geëscapete JavaScript-strings tussen enkele aanhalingstekens.

### Selenium: Java en C#

De Selenium-snippet bestaat in **Java** en **C#**. Het team heeft voor beide gekozen: Java is de meest gebruikte Selenium-taal, C# is gangbaar bij .NET-teams. De snippet is één regel die direct in een test past en gaat uit van een variabele `driver`.

| Strategie | Java | C# |
| --- | --- | --- |
| Testattribuut | `driver.findElement(By.cssSelector("[data-testid=\"login\"]"))` | `driver.FindElement(By.CssSelector("[data-testid=\"login\"]"))` |
| `id` | `driver.findElement(By.id("email"))` | `driver.FindElement(By.Id("email"))` |
| CSS | `driver.findElement(By.cssSelector("nav > a.logout"))` | `driver.FindElement(By.CssSelector("nav > a.logout"))` |
| XPath | `driver.findElement(By.xpath("//main/p[2]"))` | `driver.FindElement(By.XPath("//main/p[2]"))` |

Quotes, backslashes en besturingstekens worden geëscaped volgens de regels van de taal. Een locator op rol en naam heeft geen `By`-equivalent in Selenium; gebruik dan de CSS- of XPath-variant van hetzelfde element.

De code staat in `src/engine/snippets/selenium.ts`.

## E2E-test

`npm run test:e2e` bouwt de extensie en start Chromium met de extensie geladen. De test opent een lokale testsite (`tests/e2e/site/`), zet de pick-modus aan, kiest een element, klikt in het resultaatpaneel op **Kopieer** bij de Playwright-snippet en leest het clipboard. Die snippet wordt ongewijzigd uitgevoerd in de Playwright-test en moet precies het gekozen element vinden. Voor een element zonder testattribuut, `id`, rol of naam controleert de test dat de indicator rood is.

De eerste keer installeer je Chromium voor Playwright met `npx playwright install chromium`. De workflow `.github/workflows/e2e.yml` draait de test bij elke pull request; als een snippet niet werkt, faalt de workflow.

Twee kanttekeningen:

- Playwright kan het extensie-icoon in de werkbalk niet aanklikken. De test stuurt daarom vanuit de service worker hetzelfde bericht (`TOGGLE_PICK_MODE`) dat de klik op het icoon verstuurt.
- Het paneel staat in een gesloten shadow root. De test leest het uit via het Chrome DevTools Protocol en klikt de kopieerknop aan met de muis op de echte positie.

## Versies

We volgen [semantic versioning](https://semver.org). Elke gemergde pull request levert automatisch een nieuwe **minor** versie op (`0.1.0` → `0.2.0` → `0.3.0`).

De workflow `.github/workflows/version.yml` draait bij elke push naar `main`, verhoogt `version` in `package.json` en `package-lock.json`, commit als `chore(release): vX.Y.0` en zet de tag `vX.Y.0`. De manifest-versie van de extensie komt uit `package.json`. Verhoog de versie dus niet zelf in een pull request.

Een patch- of major-versie hoog je handmatig op met `npm version patch` of `npm version major` in een eigen commit op `main`. De stappen voor **1.0** staan in [docs/demo.md](docs/demo.md#versie-10-taggen).
