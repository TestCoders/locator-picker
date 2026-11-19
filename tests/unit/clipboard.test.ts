// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyText } from '@/content/clipboard';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function stubClipboard(writeText: (text: string) => Promise<void>): void {
  vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
}

describe('copyText', () => {
  it('gebruikt navigator.clipboard als dat kan', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);
    await copyText('#main');
    expect(writeText).toHaveBeenCalledWith('#main');
  });

  it('valt terug op execCommand als navigator.clipboard weigert', async () => {
    stubClipboard(vi.fn().mockRejectedValue(new DOMException('NotAllowedError')));
    let copied: string | undefined;
    document.execCommand = vi.fn(() => {
      copied = (document.activeElement as HTMLTextAreaElement).value;
      return true;
    });

    await copyText('//button');

    expect(copied).toBe('//button');
    expect(document.querySelector('textarea')).toBeNull();
  });

  it('geeft een fout als beide manieren falen', async () => {
    stubClipboard(vi.fn().mockRejectedValue(new Error('nee')));
    document.execCommand = vi.fn(() => false);
    await expect(copyText('x')).rejects.toThrow();
  });
});
