"""XGBoost model loader and prediction service."""

import pickle
import numpy as np
import pandas as pd
from pathlib import Path
from app.config import settings

# Use centralized config for model directory
BASE = settings.MODEL_DIR

_model = None
_preprocessor = None
_feature_list = None
_threshold = None

# Prevent concurrent requests from racing model initialization.
import threading

_model_load_lock = threading.Lock()


def _load():

    global _model, _preprocessor, _feature_list, _threshold
    import logging
    logger = logging.getLogger("nirikshak.predictor")

    # Double-check under the lock.
    if _model is not None and _preprocessor is not None:
        return

    with _model_load_lock:
        if _model is not None and _preprocessor is not None:
            return

        logger.info("Loading model from %s", BASE)
        with open(BASE / "nirikshak_ai_model.pkl", "rb") as f:
            _model = pickle.load(f)
        with open(BASE / "preprocessor.pkl", "rb") as f:
            _preprocessor = pickle.load(f)
        _feature_list = list(_model.feature_names_in_)
        with open(BASE / "threshold.pkl", "rb") as f:
            _threshold = pickle.load(f)
        logger.info(
            "Model loaded successfully. Features: %d, Threshold: %s",
            len(_feature_list),
            _threshold,
        )



def get_model():
    if _model is None:
        _load()
    return _model


def preprocess(df: pd.DataFrame) -> pd.DataFrame:
    """Apply the same preprocessing pipeline used during training.
    
    Returns a DataFrame with exactly the 124 features the model expects,
    all numeric and filled with 0 for any missing values.
    """
    if _model is None:
        _load()

    # Convert all columns to numeric, coerce non-numeric to NaN
    df = df.apply(pd.to_numeric, errors='coerce')

    # Fill missing values using preprocessor medians
    fill_data = {}
    for col, med in _preprocessor.items():
        if col in df.columns:
            fill_data[col] = df[col].fillna(med).values
        else:
            fill_data[col] = np.full(len(df), med)
    df = pd.DataFrame(fill_data, index=df.index)

    # Row-level aggregate features
    num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    num_df = df[num_cols]

    eng = pd.DataFrame(index=df.index)
    eng["row_mean"] = num_df.mean(axis=1)
    eng["row_std"] = num_df.std(axis=1).fillna(0)
    eng["row_max"] = num_df.max(axis=1)
    eng["row_min"] = num_df.min(axis=1)
    eng["row_range"] = eng["row_max"] - eng["row_min"]
    eng["missing_count"] = df.isnull().sum(axis=1)

    f2956 = df.get("F2956", pd.Series(0.0, index=df.index))
    f3043 = df.get("F3043", pd.Series(0.0, index=df.index))
    f2082 = df.get("F2082", pd.Series(0.0, index=df.index))
    f2122 = df.get("F2122", pd.Series(0.0, index=df.index))
    f2678 = df.get("F2678", pd.Series(0.0, index=df.index))
    f670 = df.get("F670", pd.Series(0.0, index=df.index))
    f115 = df.get("F115", pd.Series(0.0, index=df.index))

    eng["ratio_F2956_F3043"] = f2956 / f3043.replace(0, np.nan).fillna(1)
    eng["diff_F2956_F3043"] = f2956 - f3043
    eng["ratio_F2082_F2122"] = f2082 / f2122.replace(0, np.nan).fillna(1)
    eng["diff_F2082_F2122"] = f2082 - f2122
    eng["sum_F2082_F2122"] = f2082 + f2122
    eng["F670_squared"] = f670 ** 2
    eng["F670_x_F115"] = f670 * f115
    eng["ratio_F2678_F2956"] = f2678 / f2956.replace(0, np.nan).fillna(1)
    eng["diff_F2678_F2956"] = f2678 - f2956

    df = pd.concat([df, eng], axis=1)

    # Select exactly the features model expects, fill any missing with 0
    rows = len(df)
    X_data = {}
    for feat in _feature_list:
        if feat in df.columns:
            col = df[feat]
            # Handle duplicate columns — take first occurrence
            if isinstance(col, pd.DataFrame):
                col = col.iloc[:, 0]
            X_data[feat] = col.values
        else:
            X_data[feat] = np.zeros(rows)
    X = pd.DataFrame(X_data, index=df.index).fillna(0.0)

    return X


def predict(df: pd.DataFrame) -> np.ndarray:
    X = preprocess(df)
    return get_model().predict_proba(X.values)[:, 1]