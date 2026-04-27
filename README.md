# SmartRoute402

> Pay-per-use AI inference API powered by x402 on Base

## What it does
Send any prompt, pay $0.02 USDC per call. 
No API keys. No subscriptions. Just pay and go.

Built for AI agents, developers, and anyone who 
wants instant AI without the setup.

## Endpoint
POST https://smartroute-production.up.railway.app/ai

## Request
{
  "prompt": "your question here",
  "model": "llama3-8b-8192"
}

## Payment
Include x-payment header with x402 USDC payment on Base network.
Price: 0.02 USDC per request

## Models available
- llama3-8b-8192 (fast, default)
- llama3-70b-8192 (powerful)
- mixtral-8x7b-32768 (long context)

## Status
Live on Base mainnet via Coinbase CDP

## Contact
Listed on agentic.market# SmartRoute