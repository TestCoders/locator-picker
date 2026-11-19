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
```

### Laden in de browser

1. Draai `npm run build` (of `npm run build:edge`).
2. Open `chrome://extensions` (of `edge://extensions`) en zet **Ontwikkelaarsmodus** aan.
3. Kies **Uitgepakte extensie laden** en selecteer `.output/chrome-mv3` (of `.output/edge-mv3`).

Zie [ADR 0001](docs/adr/0001-techstack.md) voor de techstack en mapstructuur.
