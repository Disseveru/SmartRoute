const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;
const PRICE_USDC = process.env.PRICE_USDC || '0.02';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Health check
app.get('/', (req, res) => {
  res.json({
    service: 'SmartRoute402',
    status: 'live',
    price: `${PRICE_USDC} USDC per request`,
    endpoint: '/ai',
    description: 'Pay-per-use AI inference. Send a prompt, get a response.',
    models: ['gemini-2.0-flash', 'gemini-1.5-pro'],
    payment: 'x402 USDC on Base'
  });
});

// Payment check
function requirePayment(req, res, next) {
  const paymentHeader = req.headers['x-payment'];
  if (!paymentHeader) {
    return res.status(402).json({
      error: 'Payment Required',
      price: PRICE_USDC,
      currency: 'USDC',
      network: 'base',
      instructions: 'Include x-payment header with valid x402 payment'
    });
  }
  next();
}

// AI endpoint
app.post('/ai', requirePayment, async (req, res) => {
  const { prompt, model } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'prompt is required' });
  }

  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  }

  try {
    const selectedModel = model || 'gemini-2.0-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    const result = data.candidates[0].content.parts[0].text;

    res.json({
      result,
      model_used: selectedModel,
      charged: `${PRICE_USDC} USDC`
    });

  } catch (err) {
    res.status(500).json({ error: 'Inference failed', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`SmartRoute402 live on port ${PORT}`);
});
