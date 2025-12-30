// server.js
require('dotenv').config();
const http = require('http');
const webhookHandler = require('./api/webhook.js').default;

const PORT = 3000;

const server = http.createServer(async (req, res) => {
  if (req.url === '/api/webhook' && req.method === 'POST') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      const mockReq = {
        method: 'POST',
        body: JSON.parse(body)
      };
      
      const mockRes = {
        status: (code) => ({
          json: (data) => {
            res.writeHead(code, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
          }
        })
      };
      
      await webhookHandler(mockReq, mockRes);
    });
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`📍 Webhook endpoint: http://localhost:${PORT}/api/webhook`);
});