import express from 'express';

const app = express();
app.use(express.json());

const callTimers = new Map();

const PORT = process.env.PORT || 3000;

app.post('/api/webhook', async (req, res) => {
  const VAPI_API_KEY = process.env.VAPI_PRIVATE_KEY;

  if (!VAPI_API_KEY) {
    console.error('❌ VAPI_PRIVATE_KEY not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const event = req.body;

  console.log('📨 Received event:', event.type);
  console.log('📋 Event data:', JSON.stringify(event, null, 2));

  if (event.type === 'call-started') {
    const callId = event.call?.id;

    if (!callId) {
      return res.status(400).json({ error: 'No call ID' });
    }

    if (callTimers.has(callId)) {
      return res.status(200).json({ message: 'Timer already running' });
    }

    console.log(`✅ Call started: ${callId}`);

    const timer = setTimeout(async () => {
      console.log(`⏰ 15 seconds reached! Ending call: ${callId}`);

      try {
        const response = await fetch(`https://api.vapi.ai/call/${callId}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${VAPI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: 'ended' })
        });

        if (response.ok) {
          console.log(`✅ Call ${callId} ended`);
        } else {
          console.error('❌ Failed to end call', await response.text());
        }
      } catch (err) {
        console.error('❌ Error ending call:', err);
      }

      callTimers.delete(callId);
    }, 15000);

    callTimers.set(callId, timer);

    return res.json({ success: true, callId });
  }

  if (event.type === 'call-ended') {
    const callId = event.call?.id;
    if (callId && callTimers.has(callId)) {
      clearTimeout(callTimers.get(callId));
      callTimers.delete(callId);
      console.log(`🧹 Cleaned up timer for ${callId}`);
    }
    return res.json({ success: true });
  }

  return res.json({ success: true, message: 'Event ignored' });
});

app.get('/', (_, res) => {
  res.send('✅ Webhook server is running');
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// Final BackUp
// // server.js
// require('dotenv').config();
// const http = require('http');
// const webhookHandler = require('./api/webhook.js').default;

// const PORT = 3000;

// const server = http.createServer(async (req, res) => {
//   if (req.url === '/api/webhook' && req.method === 'POST') {
//     let body = '';
    
//     req.on('data', chunk => {
//       body += chunk.toString();
//     });
    
//     req.on('end', async () => {
//       const mockReq = {
//         method: 'POST',
//         body: JSON.parse(body)
//       };
      
//       const mockRes = {
//         status: (code) => ({
//           json: (data) => {
//             res.writeHead(code, { 'Content-Type': 'application/json' });
//             res.end(JSON.stringify(data));
//           }
//         })
//       };
      
//       await webhookHandler(mockReq, mockRes);
//     });
//   } else {
//     res.writeHead(404);
//     res.end('Not Found');
//   }
// });

// server.listen(PORT, () => {
//   console.log(`✅ Server running at http://localhost:${PORT}`);
//   console.log(`📍 Webhook endpoint: http://localhost:${PORT}/api/webhook`);
// });