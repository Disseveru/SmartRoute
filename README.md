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
  "model": "gemini-2.0-flash"
}
```

The `model` field is optional. If omitted, `gemini-2.0-flash` is used.

## Payment
Include the `x-payment` header with a valid x402 USDC payment on the Base network.  
Price: **0.02 USDC per request**

## Models available
| Model | Description |
|---|---|
| `gemini-2.0-flash` | Fast responses (default) |
| `gemini-1.5-pro` | More powerful, longer context |

## Response
```json
{
  "result": "AI-generated answer",
  "model_used": "gemini-2.0-flash",
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
| `GEMINI_API_KEY` | Your Google Gemini API key | *(required)* |
| `PORT` | Port the server listens on | `8080` |
| `PRICE_USDC` | Price per request in USDC | `0.02` |

## Status
Live on Base mainnet

## Contact
Listed on agentic.market