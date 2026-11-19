# Demo-script en 1.0-checklist

- Datum: 2026-11-19
- Issue: #20

## Voorbereiding

1. `npm install` en `npm run build` (voor Edge: `npm run build:edge`).
2. Open `chrome://extensions` (of `edge://extensions`), zet **Ontwikkelaarsmodus** aan en kies **Uitgepakte extensie laden** met `.output/chrome-mv3` (of `.output/edge-mv3`).
3. Open de demosite in een nieuwe tab. Tabs die al open stonden, moeten eerst herladen worden.

## Demo-script

Elke stap heeft een verwachte uitkomst. Wijkt de uitkomst af, dan is de stap mislukt.

### 1. Locator kopiëren in één klik

Site: https://the-internet.herokuapp.com/login

| Stap | Verwachte uitkomst |
| --- | --- |
| Klik op het extensie-icoon. | De badge toont **AAN**. |
| Beweeg over het veld **Username**. | Het element krijgt een highlight met een tooltip. |
| Klik op het veld **Username**. | De pagina reageert niet op de klik (het veld krijgt geen focus). Het veld houdt een groene highlight en de badge gaat uit. Rechtsonder verschijnt het resultaatpaneel. |
| Lees het paneel. | CSS `#username`, XPath `//input[@id="username"]` en Playwright `page.locator('#username')`, elk met **1 match**. Strategie: `id`. De indicator is groen (**Stabiel**). Er is geen waarschuwing. |
| Klik bij Playwright op **Kopieer**. | De knop toont **Gekopieerd ✓** binnen 3 seconden na de klik op het element. |
| Plak in een teksteditor. | `page.locator('#username')`. |

### 2. Rol en naam

Zelfde pagina. Zet de pick-modus aan en klik op de knop **Login**.

| Verwachte uitkomst |
| --- |
| Playwright `page.getByRole('button', { name: 'Login', exact: true })`, 1 match, indicator groen. |

### 3. Element zonder bruikbare attributen: rood

Site: https://news.ycombinator.com/login. De pagina heeft twee formulieren met identieke velden.

| Stap | Verwachte uitkomst |
| --- | --- |
| Zet de pick-modus aan en klik op het veld **username** in het tweede formulier (Create Account). | Het paneel opent. |
| Lees de indicator. | Rood (**Instabiel**), met een zin uitleg. |
| Lees de waarschuwing. | **Testhook ontbreekt**, met een voorstel zoals `data-testid="…"`. |
| Lees de locators. | CSS en XPath gebruiken een positie (`form:nth-of-type(2)`, `//form[2]/…`), elk met **1 match**. |

### 4. Testattribuut instellen

| Stap | Verwachte uitkomst |
| --- | --- |
| Rechtsklik op het icoon en kies **Opties**. Kies `data-cy` en sla op. | De keuze blijft na herladen van de optiespagina staan. |
| Pick een element met `data-cy` in een open tab. | De locator gebruikt `[data-cy="…"]`, zonder de tab te herladen. |

### 5. Pick-modus stoppen

| Stap | Verwachte uitkomst |
| --- | --- |
| Zet de pick-modus aan en druk op **Esc**. | De pick-modus gaat uit, de badge verdwijnt. |

## 1.0-checklist

Loopt de succescriteria van de bronpagina na. **Aangetoond** betekent automatisch gecontroleerd. **Open** betekent dat een mens het moet doen.

| Criterium | Status | Bewijs |
| --- | --- | --- |
| Installeerbaar via "load unpacked" en werkend in Chrome of Edge | Aangetoond in Chromium. Edge en de installatie via `chrome://extensions` zijn open. | `npm run test:e2e` laadt `.output/chrome-mv3` in Chromium en slaagt (4 tests). |
| Op drie verschillende websites een werkende, unieke locator | Aangetoond op momentopnamen | `tests/unit/testsites.test.ts`, `docs/testsites.md`. De live sites zijn niet opnieuw gecontroleerd; er is geen SPA in de set. |
| De snippet draait ongewijzigd in een echte test | Aangetoond | `tests/e2e/snippet.spec.ts`: snippet uit het clipboard draait in Playwright en vindt het gekozen element. |
| De indicator toont rood bij een element zonder bruikbare attributen | Aangetoond | `tests/e2e/snippet.spec.ts` (rood met waarschuwing) en `tests/unit/stability.test.ts`. |
| Kopiëren in één klik, live gedemonstreerd | Gedeeltelijk | De E2E-test klikt één keer op **Kopieer** en leest het clipboard. De live demonstratie hierboven is **open**. |
| Demo-script met stappen en verwachte uitkomst | Klaar | Dit document. De uitkomsten in stap 1 en 2 komen uit de testset; stap 3 tot 5 zijn nog niet door een mens doorlopen. |
| Versie 1.0 getagd en README bijgewerkt | README klaar, tag **open** | Zie hieronder. |

### Versie 1.0 taggen

De workflow `.github/workflows/version.yml` verhoogt bij elke merge naar `main` de minor-versie. Een major-versie is een handmatige stap op `main`, na de live demonstratie:

```sh
git checkout main && git pull
npm version major     # 0.x.0 → 1.0.0, commit en tag v1.0.0
git push --follow-tags
```

Controleer eerst dat de checklist hierboven volledig is afgevinkt.

## Bekende beperkingen

- Op sites met gegenereerde ids (bijvoorbeeld Wikipedia) kiest de engine een `id` zoals `#mwAQM`. Die is uniek, maar niet stabiel, en de indicator toont groen. Zie `docs/testsites.md`.
- Shadow DOM en iframes worden nog niet ondersteund (#23).
- Firefox volgt later (#22).
