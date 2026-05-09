from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import httpx
from typing import List, Dict, Any
import sqlite3
import os
from datetime import datetime
import json

app = FastAPI(
    title="Volatility Sentinel Proxy",
    description="CORS-free proxy + volatility enrichment for CoinGecko data with persistence and alerts",
    version="1.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

COINGECKO_BASE = "https://api.coingecko.com/api/v3"

# Config from .env
VOLATILITY_THRESHOLD = float(os.getenv("VOLATILITY_THRESHOLD", "8.0"))
ALERT_WEBHOOK_URL = os.getenv("ALERT_WEBHOOK_URL")
DB_PATH = "prices.db"

last_fetch_time: str = None
last_symbols: List[str] = []

 def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS price_fetches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        symbols TEXT NOT NULL,
        enriched_data TEXT,
        max_volatility REAL DEFAULT 0
    )''')
    conn.commit()
    conn.close()

init_db()

async def log_price_fetch(symbols: str, enriched: List[Dict], max_vol: float):
    global last_fetch_time, last_symbols
    last_fetch_time = datetime.now().isoformat()
    last_symbols = [s.strip().lower() for s in symbols.split(",") if s.strip()]
    timestamp = last_fetch_time
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("INSERT INTO price_fetches (timestamp, symbols, enriched_data, max_volatility) VALUES (?, ?, ?, ?)", 
              (timestamp, symbols, json.dumps(enriched), max_vol))
    conn.commit()
    conn.close()

async def send_alert(coin_id: str, vol_score: float):
    msg = f"🚨 VOLATILITY ALERT: {coin_id.upper()} has volatility score {vol_score:.1f} (threshold: {VOLATILITY_THRESHOLD})"
    print(msg)
    if ALERT_WEBHOOK_URL:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                await client.post(ALERT_WEBHOOK_URL, json={"content": msg})
        except Exception as e:
            print(f"Webhook error: {str(e)}")

@app.get("/api/sentinel")
async def get_sentinel(symbols: str = Query(..., description="Comma-separated CoinGecko IDs e.g. bitcoin,ethereum,solana")) -> Dict[str, Any]:
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
        except Exception as e:
            # error handling same as before
            if isinstance(e, httpx.HTTPStatusError) and e.response.status_code == 429:
                raise HTTPException(status_code=429, detail="CoinGecko rate limit exceeded. Try again in 60s.")
            raise HTTPException(status_code=502, detail=str(e))

    enriched: List[Dict[str, Any]] = []
    max_volatility = 0.0
    for coin_id, data in raw.items():
        price = data.get("usd")
        change_24h = data.get("usd_24h_change")
        vol_24h = data.get("usd_24h_vol")

        if price is None or change_24h is None:
            continue

        volatility_score = min(100.0, abs(change_24h) * 2.8)
        if volatility_score > max_volatility:
            max_volatility = volatility_score

        enriched.append({
            "id": coin_id,
            "symbol": coin_id.upper()[:6],
            "price": round(price, 2),
            "change_24h": round(change_24h, 2),
            "volatility_score": round(volatility_score, 1),
            "volume_24h": round(vol_24h / 1_000_000, 2) if vol_24h else None,
            "last_updated": "just now"
        })

        if volatility_score > VOLATILITY_THRESHOLD:
            await send_alert(coin_id, volatility_score)

    # Persist to SQLite
    await log_price_fetch(symbols, enriched, max_volatility)

    return {
        "success": True,
        "count": len(enriched),
        "data": enriched,
        "meta": {
            "source": "coingecko",
            "refetch_interval_seconds": 30,
            "volatility_method": "scaled_24h_change",
            "threshold": VOLATILITY_THRESHOLD
        }
    }

@app.get("/status")
async def status():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT COUNT(*) FROM price_fetches")
    count = c.fetchone()[0]
    conn.close()
    return {
        "last_fetch_time": last_fetch_time or "Never",
        "current_symbols": last_symbols,
        "volatility_state": "active",
        "threshold": VOLATILITY_THRESHOLD,
        "db_records": count,
        "alert_webhook": bool(ALERT_WEBHOOK_URL)
    }

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "volatility-sentinel-proxy", "version": "1.1.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
