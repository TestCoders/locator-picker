// Page object-klasse voor Playwright in TypeScript (issue #21).
//
// Elke snippet uit de Playwright-generator (#11) begint met `page.` en komt
// ongewijzigd in de constructor te staan, met `page` als parameter.
//
// Pure functie: geen DOM- of extensie-API's.

import { classNameError, fieldNameError } from './naming';

export type PageObjectField = {
  name: string;
  /** Playwright-snippet, bijv. `page.getByTestId('login')`. */
  snippet: string;
};

export type PageObject = {
  className: string;
  fields: readonly PageObjectField[];
};

export type PageObjectError = { field: number | 'className'; message: string };

/** Alle fouten die de export zouden laten falen; leeg als hij geldig is. */
export function validatePageObject(pageObject: PageObject): PageObjectError[] {
  const errors: PageObjectError[] = [];
  const classError = classNameError(pageObject.className);
  if (classError) errors.push({ field: 'className', message: classError });

  const seen = new Map<string, number>();
  pageObject.fields.forEach((field, index) => {
    const error = fieldNameError(field.name);
    if (error) errors.push({ field: index, message: error });
    else if (seen.has(field.name)) errors.push({ field: index, message: `'${field.name}' komt al eerder voor.` });
    seen.set(field.name, index);
  });
  return errors;
}

export function generatePlaywrightPageObject(pageObject: PageObject): string {
  const errors = validatePageObject(pageObject);
  if (errors.length > 0) throw new Error(`Ongeldig page object: ${errors.map((e) => e.message).join(' ')}`);

  const { className, fields } = pageObject;
  const declarations = fields.map((f) => `  readonly ${f.name}: Locator;`);
  const assignments = fields.map((f) => `    this.${f.name} = ${f.snippet};`);

  return [
    "import type { Locator, Page } from '@playwright/test';",
    '',
    `export class ${className} {`,
    '  readonly page: Page;',
    ...declarations,
    '',
    '  constructor(page: Page) {',
    '    this.page = page;',
    ...assignments,
    '  }',
    '}',
    '',
  ].join('\n');
}
