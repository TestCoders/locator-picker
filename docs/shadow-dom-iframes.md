# Shadow DOM en iframes

De extensie kan elementen kiezen in **open shadow roots** en in **same-origin iframes**, ook genest en door elkaar (issue #23). De hover-highlight en de groene highlight van het gekozen element staan op de juiste plek, ook binnen een iframe.

## Wat het paneel toont

Zit het element in een shadow root of iframe, dan toont het paneel de context, bijvoorbeeld:

> In iframe #checkout › shadow root van pay-form

- **CSS** geldt binnen de binnenste stap: binnen het document van de iframe, of binnen de shadow root.
- **XPath** geldt binnen het document van de iframe. Binnen een shadow root is er geen XPath: browsers evalueren XPath niet met een shadow root als context, en Playwright en Selenium gaan er met XPath niet doorheen. Het paneel meldt dat.
- **Playwright** bevat de hele keten en is direct te gebruiken:

| Context | Snippet |
| --- | --- |
| Iframe | `page.frameLocator('#checkout').getByTestId('pay')` |
| Geneste iframes | `page.frameLocator('#checkout').frameLocator('#inner').getByRole('link', { name: 'Voorwaarden', exact: true })` |
| Open shadow root | `page.locator('product-card').getByTestId('buy')` |
| Shadow root in een iframe | `page.frameLocator('#checkout').locator('pay-form').getByRole('textbox', { name: 'IBAN', exact: true })` |
| Shadow root, geen bruikbare attributen | `page.locator('product-card').locator('price-tag').locator('div > span:nth-of-type(2)')` |

Playwright gaat met CSS en `getBy*` zelf door open shadow roots heen. De snippet zet de host er toch voor, omdat de locator-engine uniciteit binnen de shadow root controleert. Zonder host zou `page.getByTestId('buy')` ook een gelijknamige knop elders op de pagina vinden.

Een shadow host die een custom element is en uniek in zijn root, krijgt alleen zijn tagnaam als selector (`product-card`). Andere hosts en iframes krijgen een CSS-selector zoals elk ander element (`#checkout`, `[data-testid="…"]`).

## Beperkingen

| Situatie | Wat er gebeurt |
| --- | --- |
| **Gesloten shadow root** (`mode: 'closed'`) | Van buitenaf is de inhoud niet bereikbaar. De hover en de klik vallen op de **host**; de locator wijst naar de host. |
| **Cross-origin iframe** (andere origin dan de pagina, bijv. een betaalprovider of een embed) | Het content script kan niet in het document van de iframe. De hover-highlight volgt de muis daar niet, en **de klik gaat gewoon naar de iframe**: de pick-modus houdt hem niet tegen en blijft aan. Druk op Esc om de modus uit te zetten. |
| **Iframe die later laadt of navigeert** | Wordt opgepikt zodra hij geladen is. Tijdens het laden is hij nog niet te kiezen. |
| **`sandbox`-iframe zonder `allow-same-origin`** | Telt als cross-origin. |
| **XPath in een shadow root** | Niet beschikbaar (zie hierboven). Het structurele terugvalpad van de engine wordt daar in Playwright een CSS-selector. |
| **Selenium-snippet** | Houdt nog geen rekening met de context. Selenium heeft daarvoor `driver.switchTo().frame(…)` en `getShadowRoot()` nodig, en die zijn geen onderdeel van één `By`. De page object-export voor Selenium geldt dus alleen voor het hoofddocument. |

## Hoe het werkt

- Het content script draait alleen in het hoofddocument (`all_frames` staat uit). Voor same-origin iframes zet het de listeners voor hover, klik en Esc ook in het document van de iframe (`src/content/frames.ts`), en opnieuw zodra een iframe laadt of navigeert.
- Het echte doel binnen een open shadow root komt uit `event.composedPath()[0]`. Bij een gesloten shadow root eindigt dat pad bij de host.
- Coördinaten uit een iframe worden omgerekend naar het hoofdvenster, inclusief de rand en padding van elke iframe (`frameOffset`, `rectInTop`).
- Elementen uit een iframe komen uit een andere JavaScript-realm: `el instanceof Element` is daar `false`. De code controleert daarom op `nodeType`.
- `contextOf` in `src/engine/context.ts` geeft de keten; `scopedPlaywrightSnippet` maakt er de snippet van.

De E2E-test `tests/e2e/context.spec.ts` dekt alle gevallen hierboven op de testpagina `tests/e2e/site/context.html`, inclusief een gesloten shadow root en een cross-origin iframe. De snippet uit het clipboard wordt ongewijzigd uitgevoerd en moet precies het gekozen element vinden.
