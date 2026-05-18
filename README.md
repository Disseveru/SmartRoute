# SmartRoute402

> Pay-per-use AI inference API powered by x402 on Base

## What it does
Send any prompt, pay $0.02 USDC per call.  
No API keys for consumers. No subscriptions.

## API endpoints
- `POST /ai` — payable AI inference route
- `GET /openapi.json` — AgentCash/OpenAPI discovery document
- `GET /.well-known/x402` — x402 well-known metadata

## Request
```json
{
  "prompt": "your question here",
  "model": "llama-3.3-70b-versatile"
}
```

The `model` field is optional. If omitted, `llama-3.3-70b-versatile` is used.

## Payment
Include a valid `x-payment` header for x402.  
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

## Runtime configuration
Set the following environment variables before production use:

- `GROQ_API_KEY` — Groq API key (required)
- `PAYMENT_ADDRESS` — Base wallet that receives x402 payments (required in production)
- `PRICE_USD` — price per call in USD (default `0.02`; legacy `PRICE_USDC` is also accepted)
- `X402_NETWORK` — CAIP-2 network id (default `eip155:8453`)
- `FACILITATOR_URL` — x402 facilitator URL (default `https://x402.org/facilitator`)
- `BASE_URL` — public origin used in OpenAPI `servers` (example: `https://your-api.example.com`)
- `AGENTCASH_OWNERSHIP_PROOF` — ownership proof string for `x-discovery.ownershipProofs` in `/openapi.json`

An ownership proof is the verification token AgentCash uses to confirm the API origin is controlled by you.  
Use the opaque proof string from the AgentCash onboarding flow (for example, `proof_xxx...`) and set it as `AGENTCASH_OWNERSHIP_PROOF`.  
Discovery guidance: https://agentcash.dev/docs/discovery

`AGENTCASH_OWNERSHIP_PROOF` uses a placeholder in local/dev. The OpenAPI document only includes `x-discovery.ownershipProofs` when a real proof is configured, and production startup refuses placeholder values.

## Status
Live on Base mainnet

## Contact
Listed on agentic.market
