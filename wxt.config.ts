import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  manifest: {
    name: 'Locator Picker',
    description: 'Kopieer met één klik een stabiele, leesbare locator naar het clipboard.',
    // Minimale rechten. Het content script wordt via content_scripts.matches
    // geïnjecteerd; storage is nodig voor de optiespagina (testattribuut).
    permissions: ['storage'],
    action: {
      default_title: 'Locator Picker',
    },
  },
});
