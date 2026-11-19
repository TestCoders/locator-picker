import { CollectionView } from '@/collection/collection-view';
import { copyText } from '@/content/clipboard';
import { aiEnabledSetting } from '@/shared/ai-settings';
import { requestNameSuggestion } from '@/shared/ai-suggest';

const app = document.getElementById('app');
if (app) {
  void new CollectionView(app, {
    copy: copyText,
    download: (fileName, content) => {
      const url = URL.createObjectURL(new Blob([content], { type: 'text/typescript' }));
      const link = Object.assign(document.createElement('a'), { href: url, download: fileName });
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    },
    confirm: (question) => window.confirm(question),
    suggestName: requestNameSuggestion,
    watchAiEnabled: (callback) => {
      void aiEnabledSetting.getValue().then(callback);
      return aiEnabledSetting.watch((enabled) => callback(enabled ?? false));
    },
  }).start();
}
