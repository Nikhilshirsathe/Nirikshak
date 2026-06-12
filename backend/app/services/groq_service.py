"""Groq LLM service for AI chatbot and audit report generation."""

import os
import json
from typing import List, Dict, Any, Optional
from groq import Groq

_client: Optional[Groq] = None
_MODEL = "llama-3.3-70b-versatile"  # Fast, high-quality model


def _get_client() -> Groq:
    global _client
    if _client is None:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY not set in environment / .env")
        _client = Groq(api_key=api_key)
    return _client


def chat_stream(messages: List[Dict[str, str]]):
    """Streamed chat completion.  Yields content chunks."""
    client = _get_client()
    stream = client.chat.completions.create(
        model=_MODEL,
        messages=messages,
        temperature=0.2,
        max_tokens=2048,
        stream=True,
    )
    for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            yield delta


def chat(messages: List[Dict[str, str]]) -> str:
    """Non-streaming chat completion.  Returns full text."""
    client = _get_client()
    completion = client.chat.completions.create(
        model=_MODEL,
        messages=messages,
        temperature=0.2,
        max_tokens=4096,
    )
    return completion.choices[0].message.content or ""


def generate_report_summary(
    report_type: str,
    account_id: Optional[str],
    transactions: List[Dict[str, Any]],
    stats: Dict[str, Any],
    shap_data: Optional[List[Dict]] = None,
    include_risk: bool = True,
    include_shap: bool = True,
    pii_redact: bool = True,
) -> str:
    """Generate an AI-powered audit report summary using Groq."""
    
    # Build a compact representation of the data
    tx_count = len(transactions)
    flagged = sum(1 for t in transactions if t.get("probability", 0) >= 0.5)
    high_risk = sum(1 for t in transactions if t.get("probability", 0) >= 0.8)
    categories = {}
    for t in transactions:
        cat = t.get("category", "Unknown")
        categories[cat] = categories.get(cat, 0) + 1
    cat_summary = ", ".join(f"{k}: {v}" for k, v in sorted(categories.items(), key=lambda x: -x[1])[:5])

    shap_text = ""
    if shap_data and include_shap:
        top_features = sorted(shap_data, key=lambda x: abs(x.get("impact_value", 0)), reverse=True)[:5]
        shap_text = "Top SHAP features:\n" + "\n".join(
            f"  {s['feature']}: {s['display_value']} ({s['impact_type']})"
            for s in top_features
        )

    system_prompt = """You are a financial compliance audit report writer for Nirikshak AI, an AML platform. 
Write a professional, concise audit report summary. Use formal language suitable for regulatory submission.
Output in plain text with clear section headings (no markdown). Include:
1. EXECUTIVE SUMMARY
2. KEY FINDINGS
3. RISK ANALYSIS
4. RECOMMENDATIONS

Only include sections relevant to the data provided."""

    user_prompt = f"""Generate an audit report with the following data:

Report Type: {report_type}
{'Account ID: ' + account_id if account_id else 'Full Dataset Report'}

Statistics:
- Total Transactions: {tx_count}
- Flagged Accounts: {flagged}
- High Risk (>=80%): {high_risk}
- Category Distribution: {cat_summary}

{shap_text}

{'PII Redaction is ACTIVE - mask account numbers and personal identifiers.' if pii_redact else 'PII Redaction is DISABLED.'}
"""

    return chat([
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ])


def answer_question(
    question: str,
    transactions: List[Dict[str, Any]],
    stats: Dict[str, Any],
    feature_list: Optional[List[str]] = None,
) -> str:
    """Answer a user question about the dataset, mule accounts, or features."""

    tx_count = len(transactions)
    flagged = sum(1 for t in transactions if t.get("probability", 0) >= 0.5)
    high_risk = sum(1 for t in transactions if t.get("probability", 0) >= 0.8)
    avg_risk = round(sum(t.get("riskScore", 0) for t in transactions) / max(tx_count, 1), 2)
    categories = set(t.get("category", "Unknown") for t in transactions)
    statuses = set(t.get("status", "Unknown") for t in transactions)

    features_hint = ""
    if feature_list:
        features_hint = f"Model uses these {len(feature_list)} features: {', '.join(feature_list[:10])}..."

    system_prompt = """You are an AI AML analyst assistant for Nirikshak AI. 
Answer questions about the uploaded transaction dataset, mule account detection, risk scores, 
SHAP explainability, and model features. Be concise, factual, and use data provided. 
If you don't know something, say so. Do not make up statistics."""

    user_prompt = f"""Dataset context:
- {tx_count} transactions analyzed
- {flagged} flagged as suspicious (>=50% risk)
- {high_risk} high risk (>=80%)
- Average risk score: {avg_risk}%
- Categories found: {', '.join(categories)}
- Statuses found: {', '.join(statuses)}
{features_hint}

User question: {question}"""

    return chat([
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ])