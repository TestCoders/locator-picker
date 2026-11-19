# Firefox

De extensie bouwt voor Firefox vanuit dezelfde codebase als voor Chrome en Edge (issue #22). WXT maakt per browser een eigen manifest; de broncode is gelijk.

```sh
npm run build:firefox      # .output/firefox-mv3
npm run dev:firefox        # Firefox met hot reload
npm run zip:firefox        # .output/locator-picker-<versie>-firefox.zip
npm run lint:firefox       # bouwen + web-ext lint (de linter van Mozilla)
npm run test:e2e:firefox   # E2E in echte Firefox
```

## Laden in Firefox

1. Draai `npm run build:firefox`.
2. Open `about:debugging#/runtime/this-firefox`.
3. Kies **Tijdelijke add-on laden…** en selecteer `.output/firefox-mv3/manifest.json`.

Een tijdelijke add-on verdwijnt als Firefox sluit. Blijvend installeren kan alleen met een door Mozilla ondertekende versie (`web-ext sign`, als *unlisted* of via addons.mozilla.org).

## Verschillen met Chrome

| Onderwerp | Chrome / Edge | Firefox |
| --- | --- | --- |
| Manifest | Manifest V3 | Ook Manifest V3. WXT kiest voor Firefox standaard V2; `manifestVersion: 3` in `wxt.config.ts` zet dat recht, zodat beide browsers `browser.action` gebruiken. |
| Background | Service worker (`background.service_worker`) | Event page (`background.scripts`). WXT regelt dit; de code in `background.ts` is gelijk. Ook in Firefox kan de background stoppen en herstarten; de pick-status staat daarom in het content script. |
| Add-on-ID | Niet nodig | `browser_specific_settings.gecko.id` = `locator-picker@testcoders.nl`. Nodig voor `storage.sync` (de optiespagina) en voor publicatie. Het ID ligt vast zodra de add-on gepubliceerd is. |
| Minimale versie | Geen | `strict_min_version` 140 (ESR). Nodig voor `data_collection_permissions`. |
| Gegevensverzameling | Geen veld | `data_collection_permissions: { required: ['none'] }`: verplicht voor nieuwe add-ons op addons.mozilla.org. De extensie verzamelt niets. |
| Host-rechten | Verleend bij installatie | Sinds Firefox 127 ook verleend bij installatie, maar de gebruiker kan ze per site intrekken in `about:addons`. Zonder recht draait het content script niet en reageert het icoon niet. |
| Extensie-icoon | In het puzzelmenu, vast te pinnen | In het menu **Extensies** (puzzelstuk), vast te pinnen op de werkbalk. |
| Optiespagina | Dialoog op `chrome://extensions` | Tab in `about:addons` (`options_ui`, `open_in_tab: false`). |
| Laden voor ontwikkeling | **Uitgepakte extensie laden**, blijft staan | **Tijdelijke add-on laden** in `about:debugging`, weg na herstart. |
| Firefox voor Android | n.v.t. | Niet ondersteund en niet getest. `web-ext lint` geeft daarover één waarschuwing. |

De extensie gebruikt alleen API's die in beide browsers bestaan: `action` (badge, titel, klik), `runtime.onMessage`/`sendMessage`, `tabs.sendMessage`/`onUpdated` en `storage.sync`. Het clipboard loopt via `navigator.clipboard.writeText` met `execCommand('copy')` als terugval, in beide browsers tijdens de klik op een kopieerknop.

## Testen in Firefox

Playwright kan in Firefox geen extensies laden. De Firefox-E2E (`tests/e2e-firefox/`) gebruikt daarom Selenium met geckodriver en laadt de zip als tijdelijke add-on. Playwright is daar alleen de testrunner.

Wat de test controleert, op dezelfde testsite als de Chrome-E2E:

- pick-modus aan, hover toont de highlight, Esc zet de modus uit;
- een klik kiest het element en bereikt de pagina niet;
- CSS, XPath en de Playwright-snippet worden via het paneel gekopieerd, en Firefox vindt met de CSS en XPath precies het gekozen element;
- de stabiliteit is groen voor een testattribuut en rood voor een element zonder bruikbare attributen;
- een ander testattribuut op de optiespagina geldt direct (`storage.sync` met het add-on-ID).

Twee dingen gaan anders dan in Chrome, omdat Firefox geen Chrome DevTools Protocol heeft:

- **Het paneel bedient de test met het toetsenbord.** Niets kan van buitenaf in de gesloten shadow root kijken. Het paneel zet de focus op de eerste kopieerknop; Tab en Enter kopiëren de formaten, zoals bij een toetsenbordgebruiker. De test leest daarna het clipboard.
- **Berichten gaan via een extensiepagina.** De test opent `options.html` in een eigen tab en stuurt van daaruit `TOGGLE_PICK_MODE` en `GET_PICKED_ELEMENT` naar het content script, zoals de background bij een klik op het icoon. WebDriver mag niet naar `moz-extension://` navigeren; de tab wordt daarom geopend vanuit de chrome-context van Firefox, waarvoor geckodriver met `--allow-system-access` start.

Lokaal: installeer Firefox en geckodriver (macOS: `brew install --cask firefox` en `brew install geckodriver`) en open Firefox één keer via Finder, zodat macOS de app vrijgeeft. In CI test de workflow `build.yml` op de nieuwste Firefox ESR, de laagst ondersteunde versie.
