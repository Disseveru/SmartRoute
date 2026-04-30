const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;
const PRICE_USDC = process.env.PRICE_USDC || '0.02';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const ALLOWED_MODELS = ['gemini-2.0-flash', 'gemini-1.5-pro'];
const DEFAULT_MODEL = 'gemini-2.0-flash';

// Health check
app.get('/', (req, res) => {
  res.json({
    service: 'SmartRoute402',
    status: 'live',
    price: `${PRICE_USDC} USDC per request`,
    endpoint: '/ai',
    description: 'Pay-per-use AI inference. Send a prompt, get a response.',
    models: ALLOWED_MODELS,
    payment: 'x402 USDC on Base'
  });
});

// Payment check
// Human step required: configure your x402 payment verifier credentials
// in environment variables and replace the stub below with real verification.
// See https://www.x402.org/ for integration details.
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

  // TODO: Replace this stub with real x402 payment verification.
  // Example: call the x402 verifier service to confirm the payment token
  // is valid, has not been replayed, and covers the correct amount (PRICE_USDC).
  // Until then, the presence of the header is accepted as payment.
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

  // Validate model against allowlist to prevent arbitrary strings in the URL
  if (model && !ALLOWED_MODELS.includes(model)) {
    return res.status(400).json({
      error: 'Invalid model',
      allowed_models: ALLOWED_MODELS
    });
  }

  try {
    const selectedModel = model || DEFAULT_MODEL;
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

    if (
      !data.candidates ||
      !data.candidates[0] ||
      !data.candidates[0].content ||
      !data.candidates[0].content.parts ||
      !data.candidates[0].content.parts[0]
    ) {
      return res.status(500).json({ error: 'Unexpected response from AI provider' });
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
