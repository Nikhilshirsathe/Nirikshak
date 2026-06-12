import numpy as np
import pandas as pd
import shap
from typing import List, Dict
from app.services import predictor


def explain_row(row_df: pd.DataFrame) -> List[Dict]:
    model = predictor.get_model()

    # Use the same preprocessing pipeline as predict() to ensure
    # all columns are numeric and the feature set matches exactly.
    X = predictor.preprocess(row_df)

    explainer = shap.TreeExplainer(model)

    # For binary classifiers SHAP can return different shapes depending on SHAP version.
    # We normalize to a flat vector of length n_features.
    shap_values = explainer.shap_values(X)

    if shap_values is None:
        raise ValueError("SHAP returned None. The model may not be supported by TreeExplainer.")

    # Common case: list where index 1 corresponds to positive class
    if isinstance(shap_values, list):
        sv = shap_values[1] if len(shap_values) > 1 else shap_values[0]
    else:
        sv = shap_values

    # Normalize to (1, n_features) then squeeze to (n_features,)
    if hasattr(sv, "ndim") and sv.ndim == 2:
        vals = sv[0]
    elif hasattr(sv, "ndim") and sv.ndim == 1:
        vals = sv
    else:
        # Last resort: try to flatten
        vals = np.array(sv).reshape(-1)

    if len(vals) != len(predictor._feature_list):
        raise ValueError(f"SHAP value length {len(vals)} does not match feature list length {len(predictor._feature_list)}")

    pairs = sorted(zip(predictor._feature_list, vals), key=lambda x: abs(x[1]), reverse=True)[:10]

    result = []
    for feat, val in pairs:
        result.append({
            "feature": feat,
            "impact_value": round(float(val), 4),
            "impact_type": "positive" if val > 0 else "negative",
            "display_value": f"+{val:.4f}" if val > 0 else f"{val:.4f}",
        })
    return result