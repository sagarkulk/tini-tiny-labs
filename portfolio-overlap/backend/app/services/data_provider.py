import pandas as pd
import json
from pathlib import Path
from typing import List, Dict
import requests

# -------------------------
# Config
# -------------------------
USE_MOCK_DATA = True  # True -> mock, False -> real API
API_KEY = "YOUR_FMP_API_KEY"
BASE_URL = "https://financialmodelingprep.com/api/v4"

# Load mock data
MOCK_FILE = Path(__file__).parent / "mock_data.json"
with open(MOCK_FILE, "r") as f:
    MOCK_DATA = json.load(f)

# -------------------------
# ETF Holdings
# -------------------------
def get_etf_holdings(etfs: List[str]) -> Dict[str, pd.DataFrame]:
    result = {}
    for etf in etfs:
        if USE_MOCK_DATA:
            df = pd.DataFrame(MOCK_DATA["etf_holdings"].get(etf, []))
        else:
            try:
                url = f"{BASE_URL}/etf-holdings/{etf}?apikey={API_KEY}"
                resp = requests.get(url, timeout=10)
                resp.raise_for_status()
                data = resp.json()
                if not data or "holdings" not in data:
                    df = pd.DataFrame(columns=["ticker", "weight"])
                else:
                    df = pd.DataFrame(data["holdings"])
                    df = df.rename(columns={"symbol": "ticker", "holdingPercent": "weight"})
                    df["weight"] = df["weight"].fillna(0)/100
                    df = df[["ticker","weight"]]
            except Exception as e:
                print(f"Error fetching {etf}: {e}")
                df = pd.DataFrame(columns=["ticker", "weight"])
        result[etf] = df
    return result

# -------------------------
# Stock Sector
# -------------------------
def get_stock_sector(tickers: List[str]) -> Dict[str, str]:
    result = {}
    for t in tickers:
        if USE_MOCK_DATA:
            result[t] = MOCK_DATA["stock_sectors"].get(t, "Unknown")
        else:
            try:
                url = f"{BASE_URL}/profile/{t}?apikey={API_KEY}"
                resp = requests.get(url, timeout=10)
                resp.raise_for_status()
                data = resp.json()
                result[t] = data[0].get("sector", "Unknown") if data else "Unknown"
            except Exception as e:
                print(f"Error fetching sector for {t}: {e}")
                result[t] = "Unknown"
    return result

# -------------------------
# Stock Quote
# -------------------------
def get_stock_quote(tickers: List[str]) -> Dict[str, dict]:
    result = {}
    for t in tickers:
        if USE_MOCK_DATA:
            result[t] = MOCK_DATA["stock_quotes"].get(t, {})
        else:
            try:
                url = f"{BASE_URL}/quote/{t}?apikey={API_KEY}"
                resp = requests.get(url, timeout=10)
                resp.raise_for_status()
                data = resp.json()
                result[t] = data[0] if data else {}
            except Exception as e:
                print(f"Error fetching quote for {t}: {e}")
                result[t] = {}
    return result

# -------------------------
# Company Profile
# -------------------------
def get_company_profile(tickers: List[str]) -> Dict[str, dict]:
    result = {}
    for t in tickers:
        if USE_MOCK_DATA:
            result[t] = MOCK_DATA["company_profiles"].get(t, {})
        else:
            try:
                url = f"{BASE_URL}/profile/{t}?apikey={API_KEY}"
                resp = requests.get(url, timeout=10)
                resp.raise_for_status()
                data = resp.json()
                result[t] = data[0] if data else {}
            except Exception as e:
                print(f"Error fetching profile for {t}: {e}")
                result[t] = {}
    return result

# -------------------------
# Historical Price
# -------------------------
def get_historical_price(ticker: str, period: str = "1y") -> pd.DataFrame:
    if USE_MOCK_DATA:
        return pd.DataFrame(MOCK_DATA["historical_prices"].get(ticker, []))
    else:
        try:
            url = f"{BASE_URL}/historical-price-full/{ticker}?serietype=line&apikey={API_KEY}"
            resp = requests.get(url, timeout=10)
            resp.raise_for_status()
            data = resp.json()
            df = pd.DataFrame(data.get("historical", []))
            return df
        except Exception as e:
            print(f"Error fetching historical price for {ticker}: {e}")
            return pd.DataFrame()

# -------------------------
# List Available ETFs / Stocks
# -------------------------
def get_etf_list() -> List[str]:
    return list(MOCK_DATA["etf_holdings"].keys())

def get_stock_list() -> List[str]:
    return list(MOCK_DATA["stock_sectors"].keys())
