// Same-origin iframes (issue #23). Het content script draait alleen in het
// hoofddocument; voor iframes met dezelfde origin kan het van daaruit bij het
// document van de iframe. Cross-origin iframes zijn niet bereikbaar.

/** Het venster van een iframe, of null als het cross-origin (of nog leeg) is. */
export function accessibleWindow(frame: HTMLIFrameElement | HTMLFrameElement): Window | null {
  try {
    const win = frame.contentWindow;
    // Toegang tot het document gooit een fout bij een andere origin.
    return win && win.document ? win : null;
  } catch {
    return null;
  }
}

/** Het venster zelf plus alle bereikbare iframes erin, ook geneste. */
export function accessibleFrames(win: Window): Window[] {
  const result = [win];
  for (const frame of Array.from(win.document.querySelectorAll('iframe, frame'))) {
    const child = accessibleWindow(frame as HTMLIFrameElement);
    if (child) result.push(...accessibleFrames(child));
  }
  return result;
}

/**
 * Positie van het viewport van `win` binnen het viewport van het hoofdvenster,
 * om een rect of muispositie uit een iframe naar het hoofdvenster om te rekenen.
 */
export function frameOffset(win: Window): { x: number; y: number } {
  let x = 0;
  let y = 0;
  let current: Window = win;
  for (;;) {
    let frame: Element | null;
    try {
      frame = current.frameElement;
    } catch {
      break;
    }
    if (!frame) break;
    const rect = frame.getBoundingClientRect();
    const style = frame.ownerDocument.defaultView!.getComputedStyle(frame);
    // De inhoud begint binnen de rand en de padding van de iframe.
    x += rect.left + frame.clientLeft + parseFloat(style.paddingLeft || '0');
    y += rect.top + frame.clientTop + parseFloat(style.paddingTop || '0');
    current = frame.ownerDocument.defaultView!;
  }
  return { x, y };
}

/** Rect van een element in coördinaten van het hoofdvenster, ook vanuit een iframe. */
export function rectInTop(el: Element): DOMRect {
  const rect = el.getBoundingClientRect();
  const win = el.ownerDocument.defaultView;
  if (!win) return rect;
  const { x, y } = frameOffset(win);
  return new DOMRect(rect.left + x, rect.top + y, rect.width, rect.height);
}

/**
 * Roept `attach` aan voor het venster en elke bereikbare iframe, ook voor
 * iframes die later laden of naar een nieuwe pagina gaan (een nieuw document
 * heeft geen listeners meer). Alle listeners horen bij `signal`.
 */
export function watchFrames(top: Window, attach: (win: Window) => void, signal: AbortSignal): void {
  const attached = new WeakSet<Document>();

  const visit = (win: Window) => {
    for (const frameWin of accessibleFrames(win)) {
      if (attached.has(frameWin.document)) continue;
      attached.add(frameWin.document);
      attach(frameWin);
      // `load` van een iframe bubbelt niet, maar is in de capture-fase te zien.
      frameWin.addEventListener(
        'load',
        (event) => {
          const target = event.target as Element | null;
          if (target?.nodeType !== Node.ELEMENT_NODE || !/^i?frame$/i.test(target.localName)) return;
          const child = accessibleWindow(target as HTMLIFrameElement);
          if (child) visit(child);
        },
        { capture: true, signal },
      );
    }
  };
  visit(top);
}

/** True voor een element, ook uit een andere realm (iframe). */
export function isElement(value: unknown): value is Element {
  return typeof value === 'object' && value !== null && (value as Node).nodeType === Node.ELEMENT_NODE;
}
