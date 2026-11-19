import { CollectionView } from '@/collection/collection-view';
import { copyText } from '@/content/clipboard';

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
  }).start();
}
