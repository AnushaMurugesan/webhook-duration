// api/webhook.js
// Store call timers in memory (note: Vercel serverless has limitations with timers)
const callTimers = new Map();

export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get Vapi API key from environment variable
  const VAPI_API_KEY = process.env.VAPI_PRIVATE_KEY;

  if (!VAPI_API_KEY) {
    console.error('VAPI_PRIVATE_KEY not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const event = req.body;
    
    console.log('📨 Received event:', event.type);
    console.log('📋 Event data:', JSON.stringify(event, null, 2));

    // Handle call-started event
    if (event.type === 'call-started') {
      const callId = event.call?.id;
      
      if (!callId) {
        console.error('No call ID found in event');
        return res.status(400).json({ error: 'No call ID' });
      }

      console.log(`✅ Call started: ${callId}`);

      // IMPORTANT: Vercel serverless functions have timeout limitations
      // For production, use a different approach (see alternative below)
      
      // Set timer to end call after 15 seconds
      const timer = setTimeout(async () => {
        console.log(`⏰ 15 seconds reached! Ending call: ${callId}`);

        try {
          const response = await fetch(`https://api.vapi.ai/call/${callId}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${VAPI_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              status: 'ended'
            })
          });

          if (response.ok) {
            console.log(`✅ Call ${callId} ended successfully`);
          } else {
            const errorText = await response.text();
            console.error(`❌ Failed to end call: ${response.status}`, errorText);
          }
        } catch (error) {
          console.error(`❌ Error ending call ${callId}:`, error);
        }

        // Cleanup
        callTimers.delete(callId);
      }, 15000); // 15 seconds

      callTimers.set(callId, { timer, startTime: Date.now() });
      
      return res.status(200).json({ 
        success: true, 
        message: 'Timer set for 15 seconds',
        callId 
      });
    }

    // Handle call-ended event (cleanup)
    if (event.type === 'call-ended') {
      const callId = event.call?.id;
      
      if (callId) {
        const timerData = callTimers.get(callId);
        
        if (timerData) {
          clearTimeout(timerData.timer);
          callTimers.delete(callId);
          console.log(`🧹 Cleaned up timer for call ${callId}`);
        }
      }
      
      return res.status(200).json({ success: true, message: 'Call ended' });
    }

    // Handle other events
    console.log(`ℹ️ Received event type: ${event.type}`);
    return res.status(200).json({ success: true, message: 'Event received' });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}