// Lokale http-server voor de testsite, gedeeld door de Chrome- en Firefox-E2E.
// Content scripts draaien niet op file://-URL's zonder extra toestemming.
// 127.0.0.1 is een veilige context, dus het clipboard werkt.

import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';

const SITE_DIR = path.resolve(import.meta.dirname, 'site');

/** Start de server en geeft de URL en een functie om te stoppen. */
export async function startSiteServer(): Promise<{ url: string; close: () => Promise<void> }> {
  const server = createServer(async (req, res) => {
    const name = req.url === '/' ? 'index.html' : path.basename(req.url ?? '');
    try {
      const body = await readFile(path.join(SITE_DIR, name));
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}/`,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}
