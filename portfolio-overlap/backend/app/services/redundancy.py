def compute_redundancy(expanded_df):
    total = expanded_df.groupby("source")["weight"].sum()

    overlap = (
        expanded_df.groupby("stock")
        .filter(lambda x: x["source"].nunique() > 1)
        .groupby("source")["weight"]
        .sum()
    )

    redundancy = (overlap / total).fillna(0) * 100
    return redundancy.round(2).to_dict()
