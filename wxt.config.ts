import { defineConfig } from 'wxt';

// Add-on-ID voor Firefox (issue #22). Vast, want storage.sync en een
// publicatie op addons.mozilla.org hangen eraan.
export const GECKO_ID = 'locator-picker@testcoders.nl';

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  // Ook Firefox als Manifest V3 (WXT kiest daar standaard V2), zodat beide
  // browsers dezelfde API's gebruiken, zoals browser.action.
  manifestVersion: 3,
  manifest: ({ browser }) => ({
    name: 'Locator Picker',
    description: 'Kopieer met één klik een stabiele, leesbare locator naar het clipboard.',
    // Minimale rechten. Het content script wordt via content_scripts.matches
    // geïnjecteerd; storage is nodig voor de optiespagina (testattribuut).
    permissions: ['storage'],
    action: {
      default_title: 'Locator Picker',
    },
    ...(browser === 'firefox' && {
      browser_specific_settings: {
        gecko: {
          id: GECKO_ID,
          // 140 (ESR): nodig voor data_collection_permissions. Vanaf 127
          // verleent Firefox de host-rechten van een MV3-extensie bij
          // installatie, zodat het content script direct draait.
          strict_min_version: '140.0',
          // Verplicht voor nieuwe add-ons op addons.mozilla.org; de extensie
          // verzamelt en verstuurt geen gegevens.
          data_collection_permissions: { required: ['none'] },
        },
      },
    }),
  }),
});
