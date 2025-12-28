import pandas as pd
from .data_provider import get_etf_holdings

def expand_portfolio(portfolio):
    rows = []

    for item in portfolio:
        ticker = item.ticker
        weight = item.weight / 100

        # ETF (simple heuristic)
        if len(ticker) > 4:
            holdings = get_etf_holdings(ticker)
            for _, row in holdings.iterrows():
                rows.append({
                    "stock": row["ticker"],
                    "weight": row["weight"] * weight,
                    "source": ticker
                })
        else:
            rows.append({
                "stock": ticker,
                "weight": weight,
                "source": "DIRECT"
            })

    return pd.DataFrame(rows)
