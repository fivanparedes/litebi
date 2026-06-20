const http = require('http');

const data = JSON.stringify({
  type: 'postgres',
  credentials: {
    host: 'localhost',
    port: 5432,
    database: 'ecommerce',
    user: 'admin',
    password: 'password123'
  },
  query: 'SELECT 1'
});

const req = http.request('http://localhost:3001/api/query', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer litebi-dev-key',
    'Content-Length': data.length
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log('Response:', res.statusCode, body));
});

req.on('error', console.error);
req.write(data);
req.end();
