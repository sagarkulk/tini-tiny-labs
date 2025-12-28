from typing import List
from fastapi import FastAPI, Query
from pydantic import BaseModel
from app.models import PortfolioRequest
from app.services.expansion import expand_portfolio
from app.services.overlap import compute_stock_overlap
from app.services.redundancy import compute_redundancy
import pandas as pd

app = FastAPI(title="Portfolio Overlap Engine")

# -------------------------
# Models for endpoints
# -------------------------
class ETFRequestMultiple(BaseModel):
    etfs: List[str]

class StockRequestMultiple(BaseModel):
    tickers: List[str]

class QuoteRequest(BaseModel):
    tickers: List[str]

class ProfileRequest(BaseModel):
    tickers: List[str]

class HistoricalPriceRequest(BaseModel):
    ticker: str
    period: str = "1y"

# -------------------------
# Helper: Select data provider based on URL param
# -------------------------
def get_provider(source: str):
    source = source.lower()
    if source == "mock" or source == "api":
        # mock and real API can use the same provider module
        from app.services import data_provider as dp
    elif source == "scraping":
        from app.services import data_provider_scraping as dp
    else:
        from app.services import data_provider as dp
    return dp

# -------------------------
# Root / Health Check
# -------------------------
@app.get("/")
def root():
    return {"status": "ok", "message": "Portfolio Overlap API is running"}

# -------------------------
# Portfolio Analysis
# -------------------------
@app.post("/analyze")
def analyze_portfolio(request: PortfolioRequest, source: str = Query("mock", description="Data source: mock, api, scraping")):
    dp = get_provider(source)
    expanded = expand_portfolio(request.positions)

    stock_totals = (
        expanded.groupby("stock", as_index=False)
        .agg(total_weight=("weight", "sum"))
        .sort_values("total_weight", ascending=False)
    )

    overlap = compute_stock_overlap(expanded)
    redundancy = compute_redundancy(expanded)

    return {
        "top_holdings": stock_totals.head(10).to_dict(orient="records"),
        "overlap": overlap,
        "redundancy": redundancy,
    }

# -------------------------
# ETF Holdings
# -------------------------
@app.post("/etf/holdings")
def etf_holdings(request: ETFRequestMultiple, source: str = Query("mock")):
    dp = get_provider(source)
    holdings = dp.get_etf_holdings(request.etfs)
    return {etf: df.to_dict(orient="records") for etf, df in holdings.items()}

# -------------------------
# Stock Sector
# -------------------------
@app.post("/stock/sector")
def stock_sector(request: StockRequestMultiple, source: str = Query("mock")):
    dp = get_provider(source)
    return dp.get_stock_sectors(request.tickers)

# -------------------------
# Stock Quote
# -------------------------
@app.post("/stock/quote")
def stock_quote(request: QuoteRequest, source: str = Query("mock")):
    dp = get_provider(source)
    return dp.get_stock_quotes(request.tickers)

# -------------------------
# Company Profile
# -------------------------
@app.post("/company/profile")
def company_profile(request: ProfileRequest, source: str = Query("mock")):
    dp = get_provider(source)
    if hasattr(dp, "get_company_profile"):
        return dp.get_company_profile(request.tickers)
    return {"error": "Company profile not implemented for this data provider"}

# -------------------------
# Historical Price
# -------------------------
@app.post("/historical-price")
def historical_price(request: HistoricalPriceRequest, source: str = Query("mock")):
    dp = get_provider(source)
    if hasattr(dp, "get_historical_price"):
        df = dp.get_historical_price(request.ticker, request.period)
        return df.to_dict(orient="records")
    return {"error": "Historical price not implemented for this data provider"}

# -------------------------
# List Available ETFs / Stocks
# -------------------------
@app.get("/etf/list")
def etf_list(source: str = Query("mock")):
    dp = get_provider(source)
    if hasattr(dp, "get_etf_list"):
        return dp.get_etf_list()
    return []

@app.get("/stock/list")
def stock_list(source: str = Query("mock")):
    dp = get_provider(source)
    if hasattr(dp, "get_stock_list"):
        return dp.get_stock_list()
    return []
