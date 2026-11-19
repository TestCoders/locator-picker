// Stabiliteitsindicator (issue #14): implementeert de beslistabel uit docs/stabiliteit.md.
//
// Pure functie: geen DOM- of extensie-API's.

import type { LocatorResult } from './locator-engine';

export type StabilityLevel = 'green' | 'orange' | 'red';

/**
 * Waarop een locator leunt, per rij van de beslistabel. Bij meerdere stappen
 * telt de zwakste stap.
 */
export type StabilityBasis =
  | 'test-attribute'
  | 'stable-id'
  | 'unstable-id'
  | 'role-name'
  | 'stable-attribute'
  | 'stable-class'
  | 'text'
  | 'unstable-class'
  | 'position'
  | 'none';

export type Stability = {
  level: StabilityLevel;
  /** Korte tekst naast of in plaats van de kleur, zodat kleur niet het enige signaal is. */
  label: string;
  /** Icoon-teken, ook zichtbaar zonder kleur te onderscheiden. */
  icon: string;
  /** Eén zin uitleg. */
  explanation: string;
};

const LEVELS: Record<StabilityLevel, Omit<Stability, 'level'>> = {
  green: {
    label: 'Stabiel',
    icon: '✔',
    explanation:
      'Deze locator leunt op een bewuste hook of op de rol en naam van het element, dus hij overleeft de meeste wijzigingen aan de pagina.',
  },
  orange: {
    label: 'Matig',
    icon: '▲',
    explanation:
      'Deze locator werkt nu, maar leunt op tekst, een attribuut of een class die bij een redesign of vertaling kan veranderen.',
  },
  red: {
    label: 'Fragiel',
    icon: '✖',
    explanation:
      'Deze locator leunt op de positie in de pagina of vindt niet precies één element, dus hij breekt waarschijnlijk bij de eerstvolgende wijziging.',
  },
};

const LEVEL_BY_BASIS: Record<StabilityBasis, StabilityLevel> = {
  'test-attribute': 'green',
  'stable-id': 'green',
  'unstable-id': 'orange',
  'role-name': 'green',
  'stable-attribute': 'orange',
  'stable-class': 'orange',
  text: 'orange',
  'unstable-class': 'red',
  position: 'red',
  none: 'red',
};

/** Kolom van de beslistabel: alleen precies één match kan groen of oranje zijn. */
export function stabilityLevel(basis: StabilityBasis, matches: number): StabilityLevel {
  return matches === 1 ? LEVEL_BY_BASIS[basis] : 'red';
}

export function stabilityFor(basis: StabilityBasis, matches: number): Stability {
  const level = stabilityLevel(basis, matches);
  return { level, ...LEVELS[level] };
}

// UUID, React `useId` (`:r1a:`), reeks van 3+ cijfers of hex-hash van 8+ tekens met een cijfer.
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const REACT_ID = /^:[a-z0-9]+:$/i;
const LONG_DIGITS = /\d{3,}/;
const HEX_HASH = /(?=[a-f]*\d)[0-9a-f]{8,}/i;
const ONLY_DIGITS = /^\d+$/;

/** True als een `id` op een gegenereerde waarde lijkt. */
export function isUnstableId(id: string): boolean {
  return (
    ONLY_DIGITS.test(id) || UUID.test(id) || REACT_ID.test(id) || LONG_DIGITS.test(id) || HEX_HASH.test(id)
  );
}

/** Basis van een resultaat van `buildLocator`. */
export function basisOf(result: LocatorResult): StabilityBasis {
  switch (result.strategy) {
    case 'test-attribute':
      return 'test-attribute';
    case 'id':
      return isUnstableId(result.id) ? 'unstable-id' : 'stable-id';
    case 'role-name':
      return 'role-name';
    case 'xpath':
      // De engine valt alleen op een structureel pad terug als niets anders uniek is.
      return 'position';
  }
}

export function assessStability(result: LocatorResult): Stability {
  return stabilityFor(basisOf(result), result.matches);
}
