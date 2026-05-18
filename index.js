const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const { paymentMiddleware } = require('x402-express');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;
const PRICE_USDC = process.env.PRICE_USDC || '0.02';
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const PAYMENT_ADDRESS = process.env.PAYMENT_ADDRESS;
const FACILITATOR_URL = process.env.FACILITATOR_URL || 'https://x402.org/facilitator';

const ALLOWED_MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'];
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

// x402 payment verification for /ai.
// paymentMiddleware handles the full lifecycle:
//   • No payment header → 402 with payment requirements (amount, asset, network)
//   • Valid header      → verifies + settles via the facilitator, then calls next()
//   • Invalid header    → 402 with rejection reason
if (PAYMENT_ADDRESS) {
  app.use(
    paymentMiddleware(
      PAYMENT_ADDRESS,
      {
        'POST /ai': {
          price: `$${PRICE_USDC}`,
          network: 'base',
          description: 'SmartRoute AI inference (Groq Llama 3)',
        },
      },
      { url: FACILITATOR_URL }
    )
  );
} else {
  // No wallet address configured — block /ai with a clear error so the
  // operator knows what to fix rather than silently accepting fake payments.
  app.use((req, res, next) => {
    if (req.method === 'POST' && req.path === '/ai') {
      return res.status(500).json({
        error: 'Payment gateway not configured',
        instructions: 'Set the PAYMENT_ADDRESS environment variable to a Base wallet address that will receive USDC payments.',
      });
    }
    next();
  });
}

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

// AI endpoint — payment is enforced by paymentMiddleware above
app.post('/ai', async (req, res) => {
  const { prompt, model } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'prompt is required' });
  }

  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: 'GROQ_API_KEY not configured' });
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

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    if (
      !data.choices ||
      !data.choices[0] ||
      !data.choices[0].message ||
      !data.choices[0].message.content
    ) {
      return res.status(500).json({ error: 'Unexpected response from AI provider' });
    }

    const result = data.choices[0].message.content;

    res.json({
      result,
      model_used: selectedModel,
      charged: `${PRICE_USDC} USDC`
    });

  } catch (err) {
    res.status(500).json({ error: 'Inference failed', details: err.message });
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`SmartRoute402 live on port ${PORT}`);
  });
}

module.exports = app;
