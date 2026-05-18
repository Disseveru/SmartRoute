const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const { paymentMiddlewareFromConfig } = require('@x402/express');
const { HTTPFacilitatorClient } = require('@x402/core/server');
const { ExactEvmScheme } = require('@x402/evm/exact/server');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;
const PRICE_USDC_FALLBACK = process.env.PRICE_USDC;
const PRICE_USD = process.env.PRICE_USD || PRICE_USDC_FALLBACK || '0.02';
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const ALLOWED_MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'];
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const OWNERSHIP_PROOF_PLACEHOLDER = 'REPLACE_WITH_OWNERSHIP_PROOF';
const PAYMENT_ADDRESS = process.env.PAYMENT_ADDRESS || ZERO_ADDRESS;
const FACILITATOR_URL = process.env.FACILITATOR_URL || 'https://x402.org/facilitator';
const X402_NETWORK = process.env.X402_NETWORK || 'eip155:8453';
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const AGENTCASH_OWNERSHIP_PROOF = process.env.AGENTCASH_OWNERSHIP_PROOF || OWNERSHIP_PROOF_PLACEHOLDER;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const OWNERSHIP_PROOFS = AGENTCASH_OWNERSHIP_PROOF === OWNERSHIP_PROOF_PLACEHOLDER
  ? []
  : [AGENTCASH_OWNERSHIP_PROOF];
const PAYMENT_REQUIRED_TEMPLATE = {
  error: 'Payment Required',
  price: PRICE_USD,
  currency: 'USDC',
  network: X402_NETWORK,
  instructions: 'Include a valid x402 payment header.'
};

if (!/^0x[a-fA-F0-9]{40}$/.test(PAYMENT_ADDRESS)) {
  throw new Error('PAYMENT_ADDRESS must be a valid EVM address (0x-prefixed, exactly 40 hexadecimal characters).');
}

if (IS_PRODUCTION && PAYMENT_ADDRESS === ZERO_ADDRESS) {
  throw new Error('PAYMENT_ADDRESS must be configured in production. Refusing to use the zero address.');
}

if (IS_PRODUCTION && AGENTCASH_OWNERSHIP_PROOF === OWNERSHIP_PROOF_PLACEHOLDER) {
  throw new Error('AGENTCASH_OWNERSHIP_PROOF must be configured in production.');
}

if (!IS_PRODUCTION && PAYMENT_ADDRESS === ZERO_ADDRESS) {
  console.warn('PAYMENT_ADDRESS is not configured. Set a real Base wallet before production deployment.');
}

if (!IS_PRODUCTION && AGENTCASH_OWNERSHIP_PROOF === OWNERSHIP_PROOF_PLACEHOLDER) {
  console.warn('AGENTCASH_OWNERSHIP_PROOF is still a placeholder. Set a real ownership proof before production.');
}

const httpFacilitatorClient = new HTTPFacilitatorClient({ url: FACILITATOR_URL });
const facilitatorClient = {
  verify: async (...args) => {
    try {
      return await httpFacilitatorClient.verify(...args);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`x402 payment verification failed: ${message}`);
    }
  },
  settle: async (...args) => {
    try {
      return await httpFacilitatorClient.settle(...args);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`x402 payment settlement failed: ${message}`);
    }
  },
  getSupported: async () => ({
    kinds: [{ x402Version: 2, scheme: 'exact', network: X402_NETWORK }],
    extensions: [],
    signers: {}
  })
};

app.use(paymentMiddlewareFromConfig(
  {
    'POST /ai': {
      accepts: {
        scheme: 'exact',
        price: `$${PRICE_USD}`,
        network: X402_NETWORK,
        payTo: PAYMENT_ADDRESS
      },
      description: 'SmartRoute AI inference (Groq Llama 3)',
      unpaidResponseBody: () => ({
        contentType: 'application/json',
        body: PAYMENT_REQUIRED_TEMPLATE
      }),
      extensions: {
        bazaar: {
          schema: {
            type: 'object',
            properties: {
              input: {
                type: 'object',
                properties: {
                  body: {
                    type: 'object',
                    properties: {
                      prompt: { type: 'string', minLength: 1, description: 'Prompt text to send to Groq.' },
                      model: { type: 'string', enum: ALLOWED_MODELS, description: 'Optional Groq model name.' }
                    },
                    required: ['prompt']
                  }
                }
              },
              output: {
                type: 'object',
                properties: {
                  example: {
                    type: 'object',
                    properties: {
                      result: { type: 'string' },
                      model_used: { type: 'string' },
                      charged: { type: 'string' }
                    },
                    required: ['result', 'model_used', 'charged']
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  facilitatorClient,
  [{ network: X402_NETWORK, server: new ExactEvmScheme() }]
));

app.get('/', (req, res) => {
  res.json({
    service: 'SmartRoute402',
    status: 'live',
    price: `${PRICE_USD} USDC per request`,
    endpoint: '/ai',
    openapi: '/openapi.json',
    description: 'Pay-per-use AI inference. Send a prompt, get a response.',
    models: ALLOWED_MODELS,
    payment: 'x402 USDC on Base'
  });
});

app.get('/.well-known/x402', (req, res) => {
  res.json({
    service: 'SmartRoute402',
    openapi: '/openapi.json',
    paymentRoute: 'POST /ai',
    x402: {
      scheme: 'exact',
      network: X402_NETWORK,
      payTo: PAYMENT_ADDRESS,
      price: `$${PRICE_USD}`
    }
  });
});

app.get('/openapi.json', (req, res) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'SmartRoute402 API',
      version: '1.0.0',
      description: 'Pay-per-use AI inference API.',
      'x-guidance': 'Use POST /ai with JSON body { "prompt": "<text>", "model": "llama-3.3-70b-versatile" }. This route requires x402 payment.'
    },
    ...(OWNERSHIP_PROOFS.length > 0 ? { 'x-discovery': { ownershipProofs: OWNERSHIP_PROOFS } } : {}),
    servers: [{ url: BASE_URL }],
    paths: {
      '/ai': {
        post: {
          operationId: 'generateAiResponse',
          summary: 'Generate AI response',
          tags: ['AI'],
          'x-payment-info': {
            price: { mode: 'fixed', currency: 'USD', amount: PRICE_USD },
            protocols: [{ x402: { scheme: 'exact', network: X402_NETWORK } }],
            extensions: {
              bazaar: {
                schema: {
                  type: 'object',
                  properties: {
                    input: {
                      type: 'object',
                      properties: {
                        body: {
                          type: 'object',
                          properties: {
                            prompt: { type: 'string', minLength: 1, description: 'Prompt text to send to Groq.' },
                            model: { type: 'string', enum: ALLOWED_MODELS, description: 'Optional Groq model name.' }
                          },
                          required: ['prompt']
                        }
                      }
                    },
                    output: {
                      type: 'object',
                      properties: {
                        example: {
                          type: 'object',
                          properties: {
                            result: { type: 'string' },
                            model_used: { type: 'string' },
                            charged: { type: 'string' }
                          },
                          required: ['result', 'model_used', 'charged']
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    prompt: { type: 'string', minLength: 1, description: 'Prompt text to send to Groq.' },
                    model: { type: 'string', enum: ALLOWED_MODELS, description: 'Optional Groq model name.' }
                  },
                  required: ['prompt']
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      result: { type: 'string' },
                      model_used: { type: 'string' },
                      charged: { type: 'string' }
                    },
                    required: ['result', 'model_used', 'charged']
                  }
                }
              }
            },
            '400': { description: 'Bad Request' },
            '402': { description: 'Payment Required' },
            '500': { description: 'Server error' }
          }
        }
      }
    }
  });
});

app.post('/ai', async (req, res) => {
  const { prompt, model } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'prompt is required' });
  }

  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: 'GROQ_API_KEY not configured' });
  }

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
      charged: `${PRICE_USD} USDC`
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
