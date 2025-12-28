def compute_stock_overlap(expanded_df):
    source_count = expanded_df.groupby("stock")["source"].nunique()
    overlapping = source_count[source_count > 1].index

    overlap_df = expanded_df[expanded_df["stock"].isin(overlapping)]
    overlap_weight = overlap_df["weight"].sum()

    return {
        "overlap_percentage": round(overlap_weight * 100, 2),
        "overlapping_stocks": overlapping.tolist()
    }
