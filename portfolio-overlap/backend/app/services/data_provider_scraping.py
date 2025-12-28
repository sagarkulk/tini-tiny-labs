import requests
from bs4 import BeautifulSoup
import pandas as pd
from typing import List, Dict

# -------------------------
# Scrape ETF Holdings
# -------------------------
def scrape_etf_holdings(etf: str) -> pd.DataFrame:
    """
    Scrape ETF holdings from a public website with headers to avoid 403 errors.
    Returns a DataFrame with columns: ['ticker', 'weight'].
    """
    url = f"https://www.etf.com/{etf}"
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/117.0.0.0 Safari/537.36"
        ),
        "Accept-Language": "en-US,en;q=0.9",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Connection": "keep-alive",
        "Referer": "https://www.google.com"
    }

    try:
        resp = requests.get(url, headers=headers, timeout=10)
        resp.raise_for_status()

        soup = BeautifulSoup(resp.text, "html.parser")
        table = soup.find("table")
        rows = table.find_all("tr")

        data = []
        for row in rows[1:]:  # skip header
            cols = row.find_all("td")
            if len(cols) >= 2:
                ticker = cols[0].text.strip()
                weight_text = cols[1].text.strip().replace("%", "")
                weight = float(weight_text) / 100
                data.append({"ticker": ticker, "weight": weight})

        return pd.DataFrame(data)

    except Exception as e:
        print(f"Error scraping holdings for {etf}: {e}")
        return pd.DataFrame(columns=["ticker", "weight"])

# -------------------------
# Scrape Stock Sector
# -------------------------
def scrape_stock_sector(ticker: str) -> str:
    """
    Scrape stock sector from a public website.
    Returns sector string.
    """
    try:
        # Example site (replace with actual stock profile page)
        url = f"https://www.marketwatch.com/investing/stock/{ticker}"
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()

        soup = BeautifulSoup(resp.text, "html.parser")
        # Adjust selector depending on actual HTML structure
        sector_tag = soup.select_one("ul.company__data li:nth-child(2) span.value")
        if sector_tag:
            return sector_tag.text.strip()
        return "Unknown"

    except Exception as e:
        print(f"Error scraping sector for {ticker}: {e}")
        return "Unknown"

# -------------------------
# Scrape Stock Quote
# -------------------------
def scrape_stock_quote(ticker: str) -> Dict[str, float]:
    """
    Scrape stock quote (open, high, low, close, volume).
    """
    try:
        url = f"https://finance.yahoo.com/quote/{ticker}"
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()

        soup = BeautifulSoup(resp.text, "html.parser")
        # This requires parsing the key-value spans for price info
        # Simplified example: scrape only current price
        price_tag = soup.select_one("fin-streamer[data-field='regularMarketPrice']")
        price = float(price_tag.text.replace(",", "")) if price_tag else 0.0
        return {"price": price}
    except Exception as e:
        print(f"Error scraping quote for {ticker}: {e}")
        return {"price": 0.0}

# -------------------------
# Helper: Multiple ETFs
# -------------------------
def get_etf_holdings(etfs: List[str]) -> Dict[str, pd.DataFrame]:
    result = {}
    for etf in etfs:
        result[etf] = scrape_etf_holdings(etf)
    return result

def get_stock_sectors(tickers: List[str]) -> Dict[str, str]:
    result = {}
    for t in tickers:
        result[t] = scrape_stock_sector(t)
    return result

def get_stock_quotes(tickers: List[str]) -> Dict[str, Dict[str, float]]:
    result = {}
    for t in tickers:
        result[t] = scrape_stock_quote(t)
    return result
