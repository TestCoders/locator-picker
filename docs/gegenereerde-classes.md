# Gegenereerde class-namen

- Datum: 2026-11-19
- Issue: #26

Een locator op `.css-1q2w3e` breekt bij de volgende build, omdat CSS-in-JS en CSS-modules die namen opnieuw genereren. De picker herkent zulke classes en gebruikt ze niet in de CSS-selector. De code staat in `src/engine/class-heuristic.ts`.

## Heuristiek

Een class geldt als gegenereerd bij een van deze vier patronen:

| # | Patroon | Voorbeelden |
| --- | --- | --- |
| 1 | Framework-prefix (`sc`, `css`, `jsx`, `emotion`, `jss`, `svelte`, `astro`, `styled`, `tw`) met een hash. Na de prefix moet een cijfer of hoofdletter staan. | `css-1q2w3e`, `sc-bdVaJa`, `jsx-123456`, `emotion-0`, `jss12`, `svelte-1a2b3c` |
| 2 | CSS-modules: `__` plus 5 of meer tekens, of `_hash_` aan het eind. | `Button_root__x7Yz2`, `button_primary__3xKj9`, `Button_root_x7Yz2_1` |
| 3 | Een reeks van 3 of meer cijfers. | `col-1234`, `item-20240101` |
| 4 | Een kale hash: 5 tot 16 letters en cijfers, met minstens 3 wissels tussen cijfer en letter. | `a1b2c3`, `x7Yz2` |

De heuristiek herkent bewust **niet**, omdat ze betekenis hebben:

`btn-primary`, `col-md-6`, `fa-2x`, `grid12`, `MuiButton-root`, `navbar`, `radius`, `large-6`, `ng-star-inserted`, `css-grid`, `tw-container`, `sc-title`, `h1`, `mb-24`.

State-classes (`active`, `is-open`, `has-error`, `hidden`, ...) worden altijd vermeden. Dat staat los van deze heuristiek en kan niet worden uitgezet.

De voorbeelden hierboven staan als tests in `tests/unit/class-heuristic.test.ts`.

## Wat de picker doet

- De CSS-selector gebruikt geen gegenereerde class. Een stabiele class naast een gegenereerde blijft bruikbaar (`p.title` bij `class="css-1q2w3e title"`).
- Het resultaatpaneel meldt welke gegenereerde classes zijn overgeslagen.
- De Playwright-snippet en de XPath gebruiken geen classes en veranderen dus niet.

## Indicator

`docs/stabiliteit.md` beoordeelt een locator die alleen op een gegenereerde class leunt als **rood**. Doordat de picker zo'n locator nooit aanbiedt, komt dat geval niet voor: een element met alleen gegenereerde classes valt terug op een ander attribuut of op een positie, en de indicator beoordeelt dat resultaat. De stabiliteitsregels zelf zijn niet gewijzigd.

## Valse positieven uitzetten

Een class die onterecht wordt overgeslagen, bijvoorbeeld een `x7Yz2` die een bewuste naam is, is te herstellen op de optiespagina: haal het vinkje **Gegenereerde classes herkennen en vermijden** weg. De picker gebruikt dan ook gegenereerde classes. State-classes blijft hij vermijden. De keuze staat in `chrome.storage.sync` en geldt direct in open tabs.

Het uitzetten geldt voor alle sites; er is geen uitzondering per class of per domein.

## Beperkingen

- Het is een heuristiek: een gegenereerde naam die niet op een van de patronen lijkt, wordt gebruikt, en een betekenisvolle naam die erop lijkt, wordt overgeslagen (`h2o3`).
- Alleen de CSS-selector gebruikt classes. `buildLocator` (Playwright, Selenium) kiest nooit een class.
