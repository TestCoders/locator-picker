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
```

### Laden in de browser

1. Draai `npm run build` (of `npm run build:edge`).
2. Open `chrome://extensions` (of `edge://extensions`) en zet **Ontwikkelaarsmodus** aan.
3. Kies **Uitgepakte extensie laden** en selecteer `.output/chrome-mv3` (of `.output/edge-mv3`).

Zie [ADR 0001](docs/adr/0001-techstack.md) voor de techstack en mapstructuur.

### Gebruik

Klik op het extensie-icoon om de pick-modus op de actieve tab aan te zetten; de badge toont dan **AAN**. Nogmaals klikken of **Esc** zet hem weer uit. Navigeren naar een andere pagina zet de modus ook uit.

In pick-modus kiest een klik het element onder de muis; de klik bereikt de pagina niet, dus links, knoppen en formulieren doen niets. Het gekozen element houdt een groene highlight en de pick-modus gaat uit. Zet de modus opnieuw aan om een ander element te kiezen.

Tabs die al open stonden voordat de extensie geladen werd, moeten eerst herladen worden.

## Versies

We volgen [semantic versioning](https://semver.org). Elke gemergde pull request levert automatisch een nieuwe **minor** versie op (`0.1.0` → `0.2.0` → `0.3.0`).

De workflow `.github/workflows/version.yml` draait bij elke push naar `main`, verhoogt `version` in `package.json` en `package-lock.json`, commit als `chore(release): vX.Y.0` en zet de tag `vX.Y.0`. De manifest-versie van de extensie komt uit `package.json`. Verhoog de versie dus niet zelf in een pull request.

Een patch- of major-versie hoog je handmatig op met `npm version patch` of `npm version major` in een eigen commit op `main`.
