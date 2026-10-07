import { createServer } from 'node:http';
import { orders } from './orders.ts';

const server = createServer((req, res) => {
  const ua = req.headers['user-agent'] ?? '-';
  console.log(`${new Date().toISOString()} ${req.method} ${req.url} "${ua}"`);
  res.setHeader('content-type', 'application/json');

  if (req.method === 'GET' && req.url === '/v1/orders') {
    res.setHeader('deprecation', 'true');
    res.end(JSON.stringify(orders.map((o) => ({ id: o.id, total: o.total_cents / 100, state: o.status }))));
    return;
  }
  if (req.method === 'GET' && req.url === '/v2/orders') {
    res.end(JSON.stringify({ data: orders }));
    return;
  }
  res.statusCode = 404;
  res.end('{"error":"not found"}');
});

server.listen(Number(process.env.PORT ?? 8080));
