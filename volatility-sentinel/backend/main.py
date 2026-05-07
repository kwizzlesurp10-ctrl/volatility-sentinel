from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import httpx
from typing import List, Dict, Any
import math

app = FastAPI(
    title="Volatility Sentinel Proxy",
    description="CORS-free proxy + volatility enrichment for CoinGecko data",
    version="1.0.0"
)

# CORS for local dev + Render (adjust in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production: restrict to your Vercel domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

COINGECKO_BASE = "https://api.coingecko.com/api/v3"

@app.get("/api/sentinel")
async def get_sentinel(symbols: str = Query(..., description="Comma-separated CoinGecko IDs e.g. bitcoin,ethereum,solana")) -> Dict[str, Any]:
    """
    Returns enriched market data with volatility metrics.
    Volatility score = min(100, |24h_change| * 2.8) — simple but effective visual indicator.
    """
    ids = [s.strip().lower() for s in symbols.split(",") if s.strip()]
    if not ids:
        raise HTTPException(status_code=400, detail="At least one symbol required")

    params = {
        "ids": ",".join(ids),
        "vs_currencies": "usd",
        "include_24hr_change": "true",
        "include_24hr_vol": "true",
        "precision": "2"
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.get(f"{COINGECKO_BASE}/simple/price", params=params)
            resp.raise_for_status()
            raw = resp.json()
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429:
                raise HTTPException(status_code=429, detail="CoinGecko rate limit exceeded. Try again in 60s.")
            raise HTTPException(status_code=502, detail=f"CoinGecko error: {e.response.text}")
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Upstream error: {str(e)}")

    enriched: List[Dict[str, Any]] = []
    for coin_id, data in raw.items():
        price = data.get("usd")
        change_24h = data.get("usd_24h_change")
        vol_24h = data.get("usd_24h_vol")

        if price is None or change_24h is None:
            continue

        # Volatility score (0-100) — scaled 24h change magnitude
        volatility_score = min(100.0, abs(change_24h) * 2.8)

        enriched.append({
            "id": coin_id,
            "symbol": coin_id.upper()[:6],  # short display
            "price": round(price, 2),
            "change_24h": round(change_24h, 2),
            "volatility_score": round(volatility_score, 1),
            "volume_24h": round(vol_24h / 1_000_000, 2) if vol_24h else None,  # in millions USD
            "last_updated": "just now"
        })

    return {
        "success": True,
        "count": len(enriched),
        "data": enriched,
        "meta": {
            "source": "coingecko",
            "refetch_interval_seconds": 30,
            "volatility_method": "scaled_24h_change"
        }
    }

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "volatility-sentinel-proxy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
