// Instellingen voor AI-naamsuggesties (issue #25). Standaard uit. De sleutel
// staat in storage.local: hij wordt niet gesynchroniseerd naar andere apparaten.

import { storage } from 'wxt/utils/storage';

export const ANTHROPIC_ORIGIN = 'https://api.anthropic.com/*';

export const aiEnabledSetting = storage.defineItem<boolean>('local:aiNameSuggestions', { fallback: false });
export const apiKeySetting = storage.defineItem<string>('local:anthropicApiKey', { fallback: '' });
