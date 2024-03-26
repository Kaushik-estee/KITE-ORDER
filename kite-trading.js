// trading-api/kite-trading.js

const KiteConnect = require('kiteconnect').KiteConnect;

const apiKey = 'y0umvn72a2yiqlyy';
const accessToken = 'lXAexVcH9dKYVtOJ2m2qGvEzomglQebo';

const kite = new KiteConnect({
  api_key: apiKey,
  access_token: accessToken,
});

const placeLimitOrder = async (orderParams) => {
  try {
    const response = await kite.placeOrder('regular', orderParams);
    console.log('Limit order placed successfully:', response);
    return response; // Return the response for future use if needed
  } catch (error) {
    console.error('Error placing limit order:', error);
    throw error; // Propagate the error to handle it in the API endpoint
  }
};

module.exports = { placeLimitOrder };
