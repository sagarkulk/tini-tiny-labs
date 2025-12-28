from .data_provider import get_stock_sector

def compute_sector_exposure(stock_totals_df):
    stock_totals_df["sector"] = stock_totals_df["stock"].apply(get_stock_sector)

    sector_df = (
        stock_totals_df
        .groupby("sector", as_index=False)
        .agg(weight=("total_weight", "sum"))
        .sort_values("weight", ascending=False)
    )

    sector_df["weight"] = sector_df["weight"] * 100
    return sector_df
