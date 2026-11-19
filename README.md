# locator-picker

[![CI](https://github.com/TestCoders/locator-picker/actions/workflows/ci.yml/badge.svg)](https://github.com/TestCoders/locator-picker/actions/workflows/ci.yml)

## Doel

Een browserextensie waarmee een tester met één klik op een element een stabiele, leesbare locator naar het clipboard kopieert. Zo gaat het zoeken naar locators van minuten naar seconden.

Bronpagina van het project: <https://testcoders.github.io/hackathon/mvp/testing-toolbox/browser-plugin-locators>

## Installatie (load unpacked)

De extensie staat nog niet in een store. Je bouwt hem lokaal en laadt hem als uitgepakte extensie.

1. Installeer Node.js 20 of nieuwer (inclusief npm).
2. Clone de repository en installeer de dependencies:

   ```sh
   git clone https://github.com/TestCoders/locator-picker.git
   cd locator-picker
   npm install
   ```

3. Bouw de extensie:

   ```sh
   npm run build        # Chrome: .output/chrome-mv3
   npm run build:edge   # Edge:   .output/edge-mv3
   ```

4. Open `chrome://extensions` (of `edge://extensions`) en zet **Ontwikkelaarsmodus** aan.
5. Kies **Uitgepakte extensie laden** en selecteer `.output/chrome-mv3` (of `.output/edge-mv3`).

Na een nieuwe build klik je op het vernieuw-icoon van de extensie in `chrome://extensions`.

Elke CI-run op GitHub levert de build ook als artifact `chrome-mv3` op. Pak die zip uit en laad de map op dezelfde manier.

## Ontwikkelen

```sh
npm run dev          # start Chrome met de extensie geladen en hot reload
npm run dev:edge     # idem voor Edge
```

De code staat in `src/`:

- `src/entrypoints/`: background, content script en popup (WXT-entrypoints)
- `src/engine/`: pure locator-logica zonder browser-API's (volgt)
- `src/shared/`: gedeelde types en berichtcontracten

Zie [ADR 0001](docs/adr/0001-techstack.md) voor de techstack en mapstructuur.

## Testen en controleren

```sh
npm run lint         # ESLint
npm run typecheck    # TypeScript (strict)
npm test             # unit tests met Vitest (jsdom)
npm run test:watch   # unit tests in watch-modus
```

Unit tests staan in `tests/unit/` en eindigen op `.test.ts`.

## CI

GitHub Actions ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) draait lint, typecheck, unit tests en build op elke pull request en op elke push naar `main`. Een lint- of typefout laat de workflow falen. Draai dezelfde commando's lokaal voordat je een pull request opent.
