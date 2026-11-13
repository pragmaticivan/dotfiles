import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const port = Number(process.env.PORT ?? 3000);
const types = { '.html': 'text/html', '.css': 'text/css' };

createServer(async (req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  const file = pathname === '/' || pathname === '/pricing' ? '/pricing.html' : pathname;
  try {
    const body = await readFile(new URL(`./public${file}`, import.meta.url));
    res.writeHead(200, { 'content-type': types[file.slice(file.lastIndexOf('.'))] ?? 'text/plain' });
    res.end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
}).listen(port, () => console.log(`pricing site on http://localhost:${port}/pricing`));
