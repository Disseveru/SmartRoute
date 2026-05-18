# SmartRoute402

> Pay-per-use AI inference API powered by x402 on Base

## What it does
Send any prompt, pay $0.02 USDC per call. 
No API keys. No subscriptions. Just pay and go.

Built for AI agents, developers, and anyone who 
wants instant AI without the setup.

## API endpoints
- `POST /ai` — payable AI inference route
- `GET /openapi.json` — AgentCash/OpenAPI discovery document
- `GET /.well-known/x402` — x402 well-known metadata

## Request
{
  "prompt": "your question here",
  "model": "gemini-2.0-flash"
}

## Payment
Include a valid x402 payment header.
Price: 0.02 USDC per request

## Models available
- gemini-2.0-flash (fast, default)
- gemini-1.5-pro (powerful)

## Runtime configuration
Set the following environment variables before production use:

- `GEMINI_API_KEY` — Gemini API key
- `PAYMENT_ADDRESS` — Base wallet that receives x402 payments
- `PRICE_USDC` — price per call in USD (default `0.02`)
- `X402_NETWORK` — CAIP-2 network id (default `eip155:8453`)
- `FACILITATOR_URL` — x402 facilitator URL (default `https://facilitator.x402.org`)
- `BASE_URL` — public origin used in OpenAPI `servers` (example: `https://your-api.example.com`)
- `AGENTCASH_OWNERSHIP_PROOF` — ownership proof string for `x-discovery.ownershipProofs` in `/openapi.json`

`AGENTCASH_OWNERSHIP_PROOF` is set to a placeholder by default so integration is non-blocking until final proof is available.

## Status
Live on Base mainnet via Coinbase CDP

## Contact
Listed on agentic.market# SmartRoute
