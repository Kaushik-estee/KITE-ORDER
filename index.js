const { KiteTicker } = require('kiteconnect');
const { KiteConnect } = require('kiteconnect');
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const bodyParser = require('body-parser');
const { placeLimitOrder } = require('./kite-trading');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Enable CORS for all routes
app.use(cors());

app.use(cors({
    origin: ['https://kite-new.netlify.app', 'http://localhost:5502', 'http://localhost:5500' , 'http://localhost:5501'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,  // Enable credentials (if needed)
}));

app.use(bodyParser.json());

const tickerMap = {};

const ticker = new KiteTicker({
  api_key: 'y0umvn72a2yiqlyy',
  access_token: '1PwXvjnA7zu69bZc2LHVp9Zbj0L9n4fD',
  
});
const kite = new KiteConnect({
    api_key: 'y0umvn72a2yiqlyy',
    access_token: '1PwXvjnA7zu69bZc2LHVp9Zbj0L9n4fD',
  });
  

wss.on('connection', (ws) => {
  console.log('WebSocket connection opened');

  // Handle messages from clients (instrument tokens)
  ws.on('message', (message) => {
    const instrumentToken = parseInt(message);

    if (isNaN(instrumentToken)) {
      console.error('Invalid instrument token:', message);
      return;
    }

    // Create a new ticker for the instrument if not exists
    if (!tickerMap[instrumentToken]) {
      const instrumentTicker = new KiteTicker({
        api_key: 'y0umvn72a2yiqlyy',
        access_token: '1PwXvjnA7zu69bZc2LHVp9Zbj0L9n4fD',
      });

      // Listen for ticks
      instrumentTicker.on('ticks', (ticks) => {
        const ltp = ticks[0]?.last_price;
        // console.log('Ticks received for', instrumentToken, ':', ltp);

        // Broadcast the live update to all connected clients
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ instrumentToken, ltp }));
          }
        });
      });

      // Listen for connect
      instrumentTicker.on('connect', () => {
        console.log('Connected to ticker with instruments:', [instrumentToken]);
        instrumentTicker.subscribe([instrumentToken]);
        instrumentTicker.setMode(instrumentTicker.modeLTP, [instrumentToken]);
      });

      // Listen for disconnect
      instrumentTicker.on('disconnect', (code, reason) => {
        console.error('WebSocket disconnected:', code, reason);
        // Implement your reconnection logic here
        setTimeout(() => {
          console.log('Attempting to reconnect...');
          instrumentTicker.connect();
        }, 1000); // Retry after 5 seconds
      });

      tickerMap[instrumentToken] = instrumentTicker;
      instrumentTicker.connect();
    }
  });

  // Handle WebSocket closure
  ws.on('close', () => {
    console.log('WebSocket connection closed');
  });
});

app.post('/place-trade', async (req, res) => {
    const orderParams = req.body;
  
    if (!orderParams) {
      return res.status(400).json({ error: 'Order parameters are required in the request body' });
    }
  
    try {
      const orderId = await placeLimitOrder(orderParams); // Assuming placeLimitOrder returns the order ID
      res.status(200).json({ message: 'Trade placed successfully', order_id: orderId });
    } catch (error) {
      console.error('Error placing trade:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  

app.post('/unsubscribe', (req, res) => {
  const instrumentToken = req.body.instrument_token;

  if (!instrumentToken) {
    return res.status(400).json({ error: 'Instrument token is required' });
  }

  const instrumentTicker = tickerMap[instrumentToken];

  if (!instrumentTicker) {
    return res.status(404).json({ error: 'Instrument not subscribed' });
  }

  instrumentTicker.unsubscribe([instrumentToken]);
  delete tickerMap[instrumentToken];

  return res.json({ success: true, instrument_token: instrumentToken });
});
//////////////////////////exit////////////////////
app.post('/cancel-order', async (req, res) => {
    const { order_id } = req.body;
  
    if (!order_id) {
      return res.status(400).json({ error: 'Order ID is required in the request body' });
    }
  
    try {
      const response = await kite.cancelOrder("regular", order_id);
      console.log("Order canceled successfully:", response);
      res.status(200).json({ message: 'Order canceled successfully', response });
    } catch (error) {
      console.error("Error canceling order:", error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
/////////////////////////////////////////////

const port = process.env.PORT || 4000;

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
