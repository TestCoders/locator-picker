// Leest het resultaatpaneel uit. Het paneel staat in een gesloten shadow root,
// waar Playwright-locators niet in kunnen. Het Chrome DevTools Protocol kan dat
// wel: DOM.getDocument met pierce: true geeft ook gesloten shadow roots terug.

import type { CDPSession, Page } from '@playwright/test';

type CdpNode = {
  nodeId: number;
  nodeType: number;
  nodeName: string;
  nodeValue?: string;
  attributes?: string[];
  children?: CdpNode[];
  shadowRoots?: CdpNode[];
};

export type PanelSnapshot = {
  /** Waarde per formaat, zoals getoond in het paneel. */
  values: Record<string, string>;
  /** data-level van de stabiliteitsindicator, of null als die ontbreekt. */
  stabilityLevel: string | null;
  stabilityText: string;
  warningText: string | null;
};

export class Panel {
  private constructor(
    private readonly page: Page,
    private readonly cdp: CDPSession,
  ) {}

  static async attach(page: Page): Promise<Panel> {
    return new Panel(page, await page.context().newCDPSession(page));
  }

  /** Wacht tot het paneel er is en geeft de inhoud terug. */
  async read(): Promise<PanelSnapshot> {
    const root = await this.waitForPanel();
    const values: Record<string, string> = {};
    for (const code of findAll(root, (n) => n.nodeName === 'CODE')) {
      const id = attr(code, 'id') ?? '';
      values[id.replace(/^value-/, '')] = textOf(code);
    }
    const stability = findAll(root, (n) => hasClass(n, 'stability'))[0];
    const warning = findAll(root, (n) => hasClass(n, 'warning'))[0];
    return {
      values,
      stabilityLevel: stability ? (attr(stability, 'data-level') ?? null) : null,
      stabilityText: stability ? textOf(stability) : '',
      warningText: warning ? textOf(warning) : null,
    };
  }

  /** Klikt met de muis op de kopieerknop van een formaat, zoals een gebruiker. */
  async clickCopy(format: string): Promise<void> {
    await this.clickButton((n) => attr(n, 'data-format') === format, `kopieerknop voor ${format}`);
  }

  /** Klikt op '+ Page object' (#21). */
  async clickCollect(): Promise<void> {
    await this.clickButton((n) => hasClass(n, 'collect'), 'knop + Page object');
  }

  /** Tekst van de knop '+ Page object', bijv. 'Toegevoegd (2)'. */
  async collectText(): Promise<string> {
    const root = await this.waitForPanel();
    const button = findAll(root, (n) => n.nodeName === 'BUTTON' && hasClass(n, 'collect'))[0];
    return button ? textOf(button) : '';
  }

  private async clickButton(predicate: (n: CdpNode) => boolean, description: string): Promise<void> {
    const root = await this.waitForPanel();
    const button = findAll(root, (n) => n.nodeName === 'BUTTON' && predicate(n))[0];
    if (!button) throw new Error(`geen ${description}`);
    await this.cdp.send('DOM.scrollIntoViewIfNeeded', { nodeId: button.nodeId });
    const { model } = await this.cdp.send('DOM.getBoxModel', { nodeId: button.nodeId });
    const [x1, y1, , , x3, y3] = model.content;
    await this.page.mouse.click((x1! + x3!) / 2, (y1! + y3!) / 2);
  }

  private async waitForPanel(): Promise<CdpNode> {
    const deadline = Date.now() + 5_000;
    for (;;) {
      const { root } = (await this.cdp.send('DOM.getDocument', { depth: -1, pierce: true })) as { root: CdpNode };
      const host = findAll(root, (n) => n.nodeName === 'LOCATOR-PICKER-PANEL')[0];
      const shadow = host?.shadowRoots?.[0];
      if (shadow) return shadow;
      if (Date.now() > deadline) throw new Error('resultaatpaneel verscheen niet');
      await this.page.waitForTimeout(100);
    }
  }
}

function findAll(node: CdpNode, predicate: (n: CdpNode) => boolean): CdpNode[] {
  const found: CdpNode[] = [];
  const visit = (n: CdpNode) => {
    if (predicate(n)) found.push(n);
    for (const child of [...(n.shadowRoots ?? []), ...(n.children ?? [])]) visit(child);
  };
  visit(node);
  return found;
}

function attr(node: CdpNode, name: string): string | undefined {
  const list = node.attributes ?? [];
  for (let i = 0; i < list.length; i += 2) if (list[i] === name) return list[i + 1];
  return undefined;
}

function hasClass(node: CdpNode, cls: string): boolean {
  return (attr(node, 'class') ?? '').split(/\s+/).includes(cls);
}

function textOf(node: CdpNode): string {
  if (node.nodeType === 3) return node.nodeValue ?? '';
  return (node.children ?? []).map(textOf).join('');
}
