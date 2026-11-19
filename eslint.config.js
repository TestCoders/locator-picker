import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['.output/', '.wxt/', 'node_modules/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.webextensions },
    },
  },
  {
    // WXT geeft defineBackground, defineContentScript en browser als auto-imports.
    files: ['src/**/*.ts'],
    languageOptions: {
      globals: { defineBackground: 'readonly', defineContentScript: 'readonly', browser: 'readonly' },
    },
  },
);
