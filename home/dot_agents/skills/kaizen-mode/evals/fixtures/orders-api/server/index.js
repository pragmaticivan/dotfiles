const http = require('node:http');
const { handleCart } = require('./checkout');

const server = http.createServer((req, res) => {
  if (req.method !== 'POST' || req.url !== '/api/orders') {
    res.writeHead(404).end();
    return;
  }
  let body = '';
  req.on('data', (chunk) => (body += chunk));
  req.on('end', () => {
    try {
      const order = handleCart(JSON.parse(body));
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(order));
    } catch (err) {
      console.error(err);
      res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'internal error' }));
    }
  });
});

const port = Number(process.env.PORT || 3000);
server.listen(port, () => console.log(`orders-api listening on ${port}`));
