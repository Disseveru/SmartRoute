# SmartRoute402

> Pay-per-use AI inference API powered by x402 on Base

## What it does
Send any prompt, pay $0.02 USDC per call.  
No API keys. No subscriptions. Just pay and go.

Built for AI agents, developers, and anyone who wants instant AI without the setup.

## Endpoint
```
POST https://smartroute-production.up.railway.app/ai
```

## Request
```json
{
  "prompt": "your question here",
  "model": "llama-3.3-70b-versatile"
}
```

The `model` field is optional. If omitted, `llama-3.3-70b-versatile` is used.

## Payment
Include the `x-payment` header with a valid x402 USDC payment on the Base network.  
Price: **0.02 USDC per request**

## Models available
| Model | Description |
|---|---|
| `llama-3.3-70b-versatile` | Powerful & accurate (default) |
| `llama-3.1-8b-instant` | Ultra-fast, lightweight |
| `mixtral-8x7b-32768` | Long context (32k tokens) |

## Response
```json
{
  "result": "AI-generated answer",
  "model_used": "llama-3.3-70b-versatile",
  "charged": "0.02 USDC"
}
```

## Health check
```
GET https://smartroute-production.up.railway.app/
```

Returns service info, available models, and pricing.

## Environment variables (for self-hosting)
See `.env.example` for all required variables.

| Variable | Description | Default |
|---|---|---|
| `GROQ_API_KEY` | Your Groq API key (free at console.groq.com) | *(required)* |
| `PORT` | Port the server listens on | `8080` |
| `PRICE_USDC` | Price per request in USDC | `0.02` |

## Status
Live on Base mainnet

## Contact
Listed on agentic.market