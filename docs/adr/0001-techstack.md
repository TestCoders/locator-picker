# ADR 0001: Techstack en projectstructuur

- Status: Voorgesteld
- Datum: 2026-11-19
- Issue: #1

## Context

We bouwen een browserextensie waarmee een tester met één klik op een element een stabiele, leesbare locator naar het clipboard kopieert. De bronpagina legt geen techstack vast. Dit ADR legt de keuzes vast voordat de eerste code geschreven wordt.

Eisen die de keuze sturen:

- Chrome eerst (Manifest V3), Firefox later (issue #22). Cross-browser bouwen moet dus goedkoop zijn.
- De locator-engine (selector, XPath, snippet-generators) bevat de meeste logica en moet los van de browser unit-testbaar zijn.
- Klein team, weinig tijd: weinig eigen buildconfiguratie, snelle feedbackloop.

## Besluit

| Onderdeel | Keuze |
| --- | --- |
| Taal | TypeScript (strict) |
| Extensie-API | Manifest V3 |
| Framework / bundler | WXT (bovenop Vite) |
| UI (popup, paneel, opties) | Vanilla TypeScript, geen UI-framework in de MVP |
| Unit tests | Vitest met jsdom (of happy-dom) voor DOM-tests |
| E2E tests | Playwright met de extensie geladen (issue #19) |
| Linter | ESLint (flat config) met `typescript-eslint` |
| Formatter | Prettier |
| Package manager | npm |
| CI | GitHub Actions: lint, typecheck, test, build (issue #3) |

## Mapstructuur

WXT bepaalt de entrypoint-structuur. Logica die niet van de browser afhangt staat apart in `src/engine`.

```
locator-picker/
├── docs/adr/                 # architectuurbeslissingen
├── src/
│   ├── entrypoints/
│   │   ├── background.ts     # service worker: icoon-klik, pick-modus aan/uit
│   │   ├── content.ts        # content script: hover, highlight, klik-selectie
│   │   ├── popup/            # popup of resultaatpaneel (CSS, XPath, snippet)
│   │   └── options/          # optiespagina (testattribuut instellen)
│   ├── engine/               # pure functies, geen browser-API's
│   │   ├── strategy.ts       # locator-prioriteit
│   │   ├── css.ts            # CSS-selector genereren
│   │   ├── xpath.ts          # XPath genereren
│   │   ├── validate.ts       # match-validatie in het document
│   │   └── snippets/         # Playwright- en Selenium-generators
│   └── shared/               # types, berichtcontracten, instellingen
├── tests/
│   ├── unit/                 # Vitest
│   └── e2e/                  # Playwright
├── wxt.config.ts
├── tsconfig.json
├── vitest.config.ts
├── eslint.config.js
└── package.json
```

Verantwoordelijkheden:

- **background**: reageert op het extensie-icoon en bewaart de pick-status. Bevat geen locator-logica.
- **content script**: draait in de pagina, regelt hover-highlight, tooltip en het blokkeren van de paginaklik. Roept `engine` aan.
- **popup/paneel**: toont het resultaat en kopieert naar het clipboard.
- **opties**: beheert instellingen via `chrome.storage`.
- **engine**: pure TypeScript die een `Element` of document krijgt en een locator teruggeeft. Dit is de enige plek waar locator-logica woont.

## Alternatieven

- **Vite met `@crxjs/vite-plugin`**: lichter, maar het onderhoud van de plugin is wisselvallig en Firefox-ondersteuning moet je zelf regelen.
- **Plasmo**: veel voorzieningen, maar meer magie, eigen conventies en een zwaardere afhankelijkheid dan nodig voor deze omvang.
- **Handmatige Vite- of webpack-configuratie**: maximale controle, maar we besteden tijd aan manifest-generatie en HMR die WXT gratis levert.
- **Jest in plaats van Vitest**: werkt, maar vraagt extra configuratie voor TypeScript en ESM. Vitest deelt de Vite-config met WXT.
- **React of Svelte voor de UI**: de UI is klein (één paneel, één optiespagina). Een framework voegt bundelgrootte en complexiteit toe zonder duidelijke winst. We heroverwegen dit als het paneel groeit.

## Consequenties

- WXT levert manifest-generatie, hot reload en Firefox-builds uit dezelfde codebase. Issue #22 wordt daardoor klein.
- We zijn afhankelijk van WXT. Het project is jong, dus we pinnen de versie en volgen de changelog.
- Door de engine puur te houden zijn bijna alle locator-regels met Vitest te testen zonder browser. Alleen de integratie vraagt een E2E-test.
- Geen UI-framework betekent iets meer handwerk in het paneel, maar een kleinere extensie en minder dependencies.
- Shadow DOM en iframes (issue #23) vragen later aanpassing in content script en engine, maar de structuur blokkeert dat niet.

## Goedkeuring

Dit ADR gaat pas naar `Geaccepteerd` nadat het team de pull request heeft goedgekeurd.
