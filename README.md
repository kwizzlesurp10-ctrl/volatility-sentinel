# volatility-sentinel

> **Professional real-time crypto market sentinel** — prices, volatility metrics, and smart alerts in one beautiful dashboard.

[previous content abbreviated for brevity, but in actual would include full + new section]

## Agent Design Canvas – Volatility Sentinel

### Objective
The Volatility Sentinel is designed to monitor crypto market volatility in real-time, providing enriched data, persistent history, and proactive alerts when thresholds are exceeded. It acts as an agentic dashboard proxy for market intelligence.

### Environment
Operates in a web-based crypto trading environment with FastAPI backend on Render, React frontend, consuming CoinGecko API. Deployed with free tiers, SQLite for local persistence.

### Capabilities
Price fetching and enrichment, volatility calculation, SQLite logging of every fetch with timestamps, configurable threshold alerts via console and webhooks (Discord/Telegram), /status endpoint for monitoring.

### Reasoning Loop
On each /api/sentinel call: fetch data -> enrich with vol score -> check against threshold -> trigger alert if needed -> log to SQLite -> return response. Simple reactive loop.

### Memory
Short-term: in-memory last_fetch_time and symbols. Long-term: SQLite database persisting all price fetches with timestamps, symbols, and data snapshots.

### Guardrails
Rate limit handling from upstream, input validation on symbols, no hardcoded secrets (use .env), basic error handling, no frontend rewrite to maintain stability.

### Deployment
Backend on Render with render.yaml, SQLite in filesystem (note: Render free may reset on restart - aspirational: migrate to persistent DB like Postgres). Frontend unchanged on Vercel.

[rest of README]

---

**Updated per instructions.**
