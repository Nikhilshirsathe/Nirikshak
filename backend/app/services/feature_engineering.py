import pandas as pd


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Takes a raw transaction DataFrame and returns enriched feature set.
    Add your feature logic here.
    """
    # Velocity: count transactions per account in last 30 days
    df["velocity_30d"] = df.groupby("accountSource")["id"].transform("count")

    # Amount deviation from account average
    df["avg_amount"] = df.groupby("accountSource")["amount"].transform("mean")
    df["amount_deviation"] = df["amount"] - df["avg_amount"]

    # Placeholder for cross-border frequency, IP risk, device history
    df["cross_border_freq"] = 0
    df["ip_risk_score"] = 0.0
    df["device_history_flag"] = 0

    return df
