const request = require('supertest');

jest.mock('@x402/express', () => ({
  paymentMiddlewareFromConfig: (routes) => (req, res, next) => {
    const routeKey = `${req.method.toUpperCase()} ${req.path}`;
    if (!routes[routeKey]) return next();
    if (!req.headers['x-payment']) {
      return res.status(402).json({
        error: 'Payment Required',
        price: process.env.PRICE_USD || process.env.PRICE_USDC || '0.02',
        currency: 'USDC',
        network: process.env.X402_NETWORK || 'eip155:8453'
      });
    }
    next();
  }
}));

jest.mock('@x402/core/server', () => ({
  HTTPFacilitatorClient: class {
    async verify() {
      return { success: true };
    }
    async settle() {
      return { success: true };
    }
  }
}));

jest.mock('@x402/evm/exact/server', () => ({
  ExactEvmScheme: class {}
}));

jest.mock('node-fetch');
const fetch = require('node-fetch');

let app;
beforeAll(() => {
  process.env.GROQ_API_KEY = 'test-key';
  process.env.PAYMENT_ADDRESS = '0x1234567890123456789012345678901234567890';
  app = require('./index');
});

afterEach(() => {
  jest.resetAllMocks();
});

function mockGroqResponse(content) {
  return {
    status: 200,
    json: async () => ({
      choices: [{ message: { content } }]
    })
  };
}

describe('GET /', () => {
  it('returns service info with status live and models', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('live');
    expect(res.body.models).toEqual([
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'mixtral-8x7b-32768'
    ]);
    expect(res.body.endpoint).toBe('/ai');
  });
});

describe('POST /ai - payment guard', () => {
  it('returns 402 when x-payment header is missing', async () => {
    const res = await request(app)
      .post('/ai')
      .send({ prompt: 'hello' });
    expect(res.status).toBe(402);
    expect(res.body.error).toBe('Payment Required');
  });
});

describe('POST /ai - input validation', () => {
  it('returns 400 when prompt is missing', async () => {
    const res = await request(app)
      .post('/ai')
      .set('x-payment', 'token')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('prompt is required');
  });

  it('returns 400 for a model not on the allowlist', async () => {
    const res = await request(app)
      .post('/ai')
      .set('x-payment', 'token')
      .send({ prompt: 'hello', model: 'evil-model' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid model');
    expect(res.body.allowed_models).toBeDefined();
  });

  it('accepts every model on the allowlist', async () => {
    const models = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'];
    for (const model of models) {
      fetch.mockResolvedValueOnce(mockGroqResponse('ok'));
      const res = await request(app)
        .post('/ai')
        .set('x-payment', 'token')
        .send({ prompt: 'hi', model });
      expect(res.status).toBe(200);
      expect(res.body.model_used).toBe(model);
    }
  });
});

describe('POST /ai - successful inference', () => {
  it('returns result and model_used with default model when none specified', async () => {
    fetch.mockResolvedValueOnce(mockGroqResponse('The answer is 42.'));

    const res = await request(app)
      .post('/ai')
      .set('x-payment', 'token')
      .send({ prompt: 'What is the answer?' });

    expect(res.status).toBe(200);
    expect(res.body.result).toBe('The answer is 42.');
    expect(res.body.model_used).toBe('llama-3.3-70b-versatile');
    expect(res.body.charged).toMatch(/USDC/);
  });

  it('calls the correct Groq API URL with auth header', async () => {
    fetch.mockResolvedValueOnce(mockGroqResponse('pong'));

    await request(app)
      .post('/ai')
      .set('x-payment', 'any-token')
      .send({ prompt: 'ping' });

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, opts] = fetch.mock.calls[0];
    expect(url).toBe('https://api.groq.com/openai/v1/chat/completions');
    expect(opts.headers.Authorization).toBe('Bearer test-key');
  });
});

describe('POST /ai - error handling', () => {
  it('returns 500 when Groq returns an error object', async () => {
    fetch.mockResolvedValueOnce({
      json: async () => ({ error: { message: 'rate limit exceeded' } })
    });

    const res = await request(app)
      .post('/ai')
      .set('x-payment', 'token')
      .send({ prompt: 'hello' });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('rate limit exceeded');
  });

  it('returns 500 when Groq response has no choices', async () => {
    fetch.mockResolvedValueOnce({ json: async () => ({}) });

    const res = await request(app)
      .post('/ai')
      .set('x-payment', 'token')
      .send({ prompt: 'hello' });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Unexpected response from AI provider');
  });

  it('returns 500 when fetch throws a network error', async () => {
    fetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const res = await request(app)
      .post('/ai')
      .set('x-payment', 'token')
      .send({ prompt: 'hello' });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Inference failed');
    expect(res.body.details).toBe('ECONNREFUSED');
  });
});
