# Testsites en uniekheid

- Datum: 2026-11-19
- Issue: #18

Het succescriterium is dat de picker op drie verschillende publieke websites een werkende, unieke locator levert. Dit document legt de keuze van de sites vast, de testset per site en hoe uniekheid wordt aangetoond.

## Gekozen sites

| Site | Pagina's | Opbouw | Waarom |
| --- | --- | --- | --- |
| [the-internet.herokuapp.com](https://the-internet.herokuapp.com) | `/login`, `/tables` | Formulier en datatabellen | Een testsite met nette `id`s en een tabel zonder class of id (`table1`). Basisgeval en tabelgeval. |
| [en.wikipedia.org](https://en.wikipedia.org/wiki/Provinces_of_the_Netherlands) | Provinces of the Netherlands | Grote datatabel met links | Echte contentsite; elk element heeft een gegenereerd `id` (`mwAQM`). |
| [news.ycombinator.com](https://news.ycombinator.com/login) | `/login` | Tabelopmaak, twee formulieren | Weinig attributen en twee formulieren met identieke velden. Dwingt posities af. |

Een SPA is bewust niet gekozen: de momentopname is statische HTML, en een SPA vraagt dat een browser de scripts van de site uitvoert. Zie "Beperkingen".

## Testset

Per site staan minimaal vijf elementen in `tests/unit/testsites.test.ts`.

| Site | Element | Beste strategie |
| --- | --- | --- |
| the-internet `/login` | invoerveld Username | `id` |
| | invoerveld Password | `id` |
| | knop Login | rol + naam |
| | label Username | `xpath` (structureel) |
| | kop Login Page | rol + naam |
| | formulier | `id` |
| the-internet `/tables` | kolomkop Last Name (tabel 1) | `xpath` (structureel) |
| | cel Smith (tabel 1) | `xpath` (structureel) |
| | cel Smith (tabel 2) | `xpath` (structureel) |
| | edit-link rij 2 (tabel 1) | `xpath` (structureel) |
| | delete-link rij 3 (tabel 1) | `xpath` (structureel) |
| | cel $100.00 (tabel 1) | `xpath` (structureel) |
| Wikipedia | kop Provinces of the Netherlands | `id` |
| | kolomkop Capital | `id` (gegenereerd) |
| | link Drenthe | `id` (gegenereerd) |
| | link Assen | `id` (gegenereerd) |
| | link CDA | `id` (gegenereerd) |
| | tabel | `id` (gegenereerd) |
| Hacker News `/login` | gebruikersnaam, login-formulier | `xpath` (structureel) |
| | wachtwoord, login-formulier | `xpath` (structureel) |
| | gebruikersnaam, account-formulier | `xpath` (structureel) |
| | wachtwoord, account-formulier | `xpath` (structureel) |
| | knop login | rol + naam |
| | knop create account | rol + naam |
| | link Forgot your password? | rol + naam |

## Hoe uniekheid wordt aangetoond

Voor elk element bouwt de test het resultaat zoals het resultaatpaneel dat toont (`buildResult`) en controleert:

- **CSS en XPath:** `validateLocator` vindt exact 1 match (`count: 1`), en dat is het gekozen element (`status: 'unique'`).
- **Playwright-snippet:** de onderliggende locator vindt exact 1 element (`matches === 1`).

Een locator die 1 element vindt, maar een ander dan gekozen, faalt dus ook. De uitkomst staat in de test, niet in een screenshot, en draait mee in `npm test`.

## Momentopnamen

De pagina's staan als statische HTML in `tests/fixtures/sites`, opgehaald op 2026-11-19. Scripts, stylesheets en commentaar zijn eruit gehaald. De Wikipedia-pagina is ingekort tot de kop en de eerste rijen van de provinciestabel. Zo draait de test offline en deterministisch, ook als een site verandert of niet bereikbaar is.

## Bevindingen

- **Wikipedia:** alle elementen zijn uniek, maar de engine kiest een `id` zoals `mwAQM`. Dat is een gegenereerde waarde die bij een volgende parse van de pagina kan veranderen. Uniek is dus niet hetzelfde als stabiel. `isUnstableId` herkent deze ids niet als onstabiel, dus `assessStability` (#14) geeft hier groen.
- **Hacker News:** twee formulieren met identieke velden. De engine valt terug op posities (`form[2]`), wat volgens `docs/stabiliteit.md` rood hoort te zijn.
- **the-internet `/tables`:** een tabel zonder hooks levert structurele paden op.

## Beperkingen

- De momentopnamen bewijzen uniekheid op de HTML zoals die op 2026-11-19 was. Ze bewijzen niet dat de locators in een echte browser werken, en geen enkele pagina draait scripts.
- Er is geen SPA in de testset. Hiervoor is een browser nodig die de scripts van de site draait, wat hier niet is gedaan.
- De momentopnamen zijn niet ververst tegen de live sites. Herhalen kan door de pagina's opnieuw op te halen en de fixtures te vervangen.
