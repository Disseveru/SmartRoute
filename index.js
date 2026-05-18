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
const PRICE_USDC = process.env.PRICE_USDC || '0.02';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const PAYMENT_ADDRESS = process.env.PAYMENT_ADDRESS || '0x0000000000000000000000000000000000000000';
const FACILITATOR_URL = process.env.FACILITATOR_URL || 'https://facilitator.x402.org';
const X402_NETWORK = process.env.X402_NETWORK || 'eip155:8453';
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const AGENTCASH_OWNERSHIP_PROOF = process.env.AGENTCASH_OWNERSHIP_PROOF || 'REPLACE_WITH_OWNERSHIP_PROOF';

const httpFacilitatorClient = new HTTPFacilitatorClient({ url: FACILITATOR_URL });
const facilitatorClient = {
  verify: (...args) => httpFacilitatorClient.verify(...args),
  settle: (...args) => httpFacilitatorClient.settle(...args),
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
        price: `$${PRICE_USDC}`,
        network: X402_NETWORK,
        payTo: PAYMENT_ADDRESS
      },
      description: 'Pay-per-use AI inference. Send a prompt, get a response.',
      unpaidResponseBody: () => ({
        contentType: 'application/json',
        body: {
          error: 'Payment Required',
          price: PRICE_USDC,
          currency: 'USDC',
          network: X402_NETWORK,
          instructions: 'Include a valid x402 payment header.'
        }
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
                      prompt: { type: 'string', minLength: 1, description: 'Prompt text to send to Gemini.' },
                      model: { type: 'string', description: 'Optional Gemini model name.' }
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

// Health check
app.get('/', (req, res) => {
  res.json({
    service: 'SmartRoute402',
    status: 'live',
    price: `${PRICE_USDC} USDC per request`,
    endpoint: '/ai',
    openapi: '/openapi.json',
    description: 'Pay-per-use AI inference. Send a prompt, get a response.',
    models: ['gemini-2.0-flash', 'gemini-1.5-pro'],
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
      price: `$${PRICE_USDC}`
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
      'x-guidance': 'Use POST /ai with JSON body { "prompt": "<text>", "model": "gemini-2.0-flash" }. This route requires x402 payment.'
    },
    'x-discovery': {
      ownershipProofs: [AGENTCASH_OWNERSHIP_PROOF]
    },
    servers: [{ url: BASE_URL }],
    paths: {
      '/ai': {
        post: {
          operationId: 'generateAiResponse',
          summary: 'Generate AI response',
          tags: ['AI'],
          'x-payment-info': {
            price: { mode: 'fixed', currency: 'USD', amount: PRICE_USDC },
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
                            prompt: { type: 'string', minLength: 1, description: 'Prompt text to send to Gemini.' },
                            model: { type: 'string', description: 'Optional Gemini model name.' }
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
                    prompt: { type: 'string', minLength: 1, description: 'Prompt text to send to Gemini.' },
                    model: { type: 'string', description: 'Optional Gemini model name.' }
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

// AI endpoint
app.post('/ai', async (req, res) => {
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
