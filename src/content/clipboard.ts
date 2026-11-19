// Tekst naar het clipboard. navigator.clipboard werkt alleen in een veilige
// context (https) met focus; op http-pagina's valt het terug op execCommand.
// Beide werken alleen tijdens een gebruikersactie, zoals de klik op een kopieerknop.

export async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    // Terugval hieronder.
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  Object.assign(textarea.style, { position: 'fixed', top: '0', left: '-9999px', opacity: '0' });
  const previousFocus = document.activeElement;
  document.documentElement.append(textarea);
  textarea.focus();
  textarea.select();
  try {
    if (!document.execCommand('copy')) throw new Error('Kopiëren werd geweigerd');
  } finally {
    textarea.remove();
    if (previousFocus instanceof HTMLElement) previousFocus.focus();
  }
}
