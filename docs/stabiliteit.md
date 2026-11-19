# Stabiliteitsindicator: criteria

- Status: Voorgesteld (wacht op goedkeuring van het team)
- Datum: 2026-11-19
- Issue: #13

De bronpagina noemt groen, oranje en rood, maar niet wanneer welke kleur hoort. Dit document legt dat vast, zodat de indicator in de UI en de locator-engine dezelfde regels volgen.

## Uitgangspunt

De kleur zegt hoe waarschijnlijk het is dat de locator blijft werken na een wijziging van de pagina. De kleur hangt af van twee dingen:

1. **Strategie**: waarop de locator leunt (zie `LocatorStrategy` in `src/engine/locator-engine.ts`).
2. **Aantal matches**: hoeveel elementen de locator in het document oplevert (`LocatorResult.matches`).

Aantal matches gaat voor strategie. Een locator die niet precies één element oplevert is nooit groen of oranje.

## Beslistabel

| Strategie | 1 match | 0 matches | 2+ matches |
| --- | --- | --- | --- |
| `test-attribute` (`data-testid`, ...) | groen | rood | rood |
| `id`, stabiel | groen | rood | rood |
| `id`, onstabiel (zie randgevallen) | oranje | rood | rood |
| `role-name` (rol + toegankelijke naam) | groen | rood | rood |
| CSS met stabiel attribuut (`name`, `aria-label`, `placeholder`, `title`, `alt`) | oranje | rood | rood |
| CSS met alleen stabiele class | oranje | rood | rood |
| CSS/XPath met zichtbare tekst | oranje | rood | rood |
| CSS/XPath met `nth-of-type`/positie, of absoluut pad | rood | rood | rood |
| Geen bruikbare attributen (alleen tag en positie) | rood | rood | rood |

Een locator met meerdere stappen krijgt de kleur van zijn **zwakste** stap. Een uniek anker op een voorouder (`#cart button`) telt alleen als de staart zelf geen positie bevat.

## Uitleg per kleur

Eén zin per kleur, zoals de UI hem toont.

- **Groen**: "Deze locator leunt op een bewuste hook of op de rol en naam van het element, dus hij overleeft de meeste wijzigingen aan de pagina."
- **Oranje**: "Deze locator werkt nu, maar leunt op tekst, een attribuut of een class die bij een redesign of vertaling kan veranderen."
- **Rood**: "Deze locator leunt op de positie in de pagina of vindt niet precies één element, dus hij breekt waarschijnlijk bij de eerstvolgende wijziging."

## Rood bij een element zonder bruikbare attributen

Bevestigd: een element zonder testattribuut, id, rol met naam, stabiel attribuut, stabiele class of tekst valt terug op een structureel pad (`xpath`-strategie, of `nth-of-type`). Dat pad hangt van elke voorouder en elke zuster af en breekt zodra de structuur verandert. Het resultaat is altijd **rood**, ook als het pad nu uniek is. De UI hoort bij rood te adviseren om een `data-testid` toe te voegen.

## Randgevallen

### Dynamische class-names

Gegenereerde namen (CSS-modules zoals `Button_root__x7Yz2`, `sc-abc123`, `css-1q2w3e`, lange cijferreeksen) en state-classes (`active`, `is-open`, `hidden`) tellen niet mee als stabiel. Dit zijn dezelfde regels als `isUnstableClass` in `src/engine/css.ts`. Een locator die alleen op zo'n class leunt, is een locator zonder bruikbaar attribuut: **rood**. Een locator op een stabiele class is **oranje**: classes zijn stijl, geen contract.

### `id` met cijfers

Een `id` is onstabiel als hij op een gegenereerde waarde lijkt:

- eindigt op of bevat een lange cijferreeks (3+ cijfers), bijvoorbeeld `input-48213`;
- bevat een UUID of hex-hash van 8+ tekens, bijvoorbeeld `:r1a:` of `a3f9c2e81b`;
- bestaat alleen uit cijfers.

Zo'n `id` is **oranje** (hij is nu uniek, maar verandert bij een rebuild of volgorde-wijziging). Een `id` met korte cijfers die betekenis hebben (`step2`, `h1-title`) blijft **groen**. Open punt voor het team: of oranje hier niet te mild is en rood beter past.

### `nth-child` en `nth-of-type`

Elke positie-selector is **rood**, ook wanneer de rest van het pad stabiel is (`#cart li:nth-of-type(2)` is rood). Het toevoegen, verwijderen of herordenen van één zuster breekt de locator zonder dat het element zelf verandert. De engine gebruikt posities alleen als niets anders onderscheidt; dat is precies het geval dat rood hoort te zijn.

### Overige

- **Tekst** (`normalize-space()="Uitloggen"`): oranje, want vertaling of copy-wijziging breekt hem.
- **Toegankelijke naam** valt in `role-name` onder groen, mits de naam uit een label of `aria-label` komt. Een naam die uit variabele inhoud komt (bijvoorbeeld een bedrag) is oranje. Dit vergt een aparte check in de engine.
- **Shadow DOM**: dezelfde regels, per shadow root.

## Gevolgen voor de implementatie

- `LocatorResult` heeft een veld nodig dat de kleur bepaalt, of een pure functie `stability(result): 'green' | 'orange' | 'red'`.
- De engine moet voor `id` een check op onstabiele waarden krijgen (hergebruik de regels van `isUnstableClass`).
- De CSS- en XPath-generators moeten kunnen melden of het resultaat een positie bevat.

## Goedkeuring

- [ ] Team heeft de tabel, de uitlegzinnen en de randgevallen beoordeeld.
