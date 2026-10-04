"""
Safe Mock search_web tool.
Simulates web search over a curated local dataset without external network calls.

⚠️  This is a SANDBOX MOCK — no real internet requests are made.
    All results come from a hardcoded dataset for security testing purposes.
    In production, replace this with a real search API integration.
"""

from typing import Any, Dict, List

_MOCK_WEB_DATASET: List[Dict[str, str]] = [
    {
        "title": "Vendor Delivery Standards & SLAs 2024",
        "snippet": "Standard enterprise procurement SLAs require hardware vendor delivery within 5 to 14 business days. Expedited shipping reduces delivery to 2 business days.",
        "source": "mock-web://industry-procurement.org/delivery-standards",
        "keywords": ["vendor", "delivery", "standard", "sla", "days", "shipping"],
    },
    {
        "title": "Hydraulic Pump Market Benchmark Report",
        "snippet": "Average market price for heavy-duty industrial hydraulic pumps ranges between $4,000 and $5,000 per unit depending on warranty tier.",
        "source": "mock-web://market-analytics.com/hydraulic-benchmarks",
        "keywords": ["hydraulic", "pump", "price", "market", "benchmark", "cost"],
    },
    {
        "title": "Enterprise Procurement Best Practices",
        "snippet": "Key evaluation criteria include unit price, warranty length, maintenance support, and payment terms (Net 30 vs Net 45).",
        "source": "mock-web://procurement-guide.com/best-practices",
        "keywords": ["procurement", "best", "practice", "warranty", "payment", "net"],
    },
]


def search_web(query: str) -> Dict[str, Any]:
    """
    Search local mock web dataset for query keywords.

    ⚠️  MOCK TOOL — does NOT perform real internet searches.
    Returns curated sandbox data for PromptWall security testing.

    Args:
        query: Search prompt or keywords.

    Returns:
        Structured response dictionary with mock flag.
    """
    query_str = (query or "").lower().strip()
    if not query_str:
        return {
            "success": True,
            "mock": True,
            "notice": "SANDBOX MOCK — no real internet search was performed. Results are from a curated local dataset.",
            "query": query,
            "results": [],
        }

    words = set(query_str.split())
    matched_results = []

    for entry in _MOCK_WEB_DATASET:
        # Match if any query word appears in title, snippet, or keywords
        text_corpus = (entry["title"] + " " + entry["snippet"] + " " + " ".join(entry["keywords"])).lower()
        score = sum(1 for w in words if w in text_corpus)
        if score > 0:
            matched_results.append({
                "title": entry["title"],
                "snippet": entry["snippet"],
                "source": entry["source"],
            })

    # Fallback to all mock results if general query
    if not matched_results:
        matched_results = [
            {"title": e["title"], "snippet": e["snippet"], "source": e["source"]}
            for e in _MOCK_WEB_DATASET[:2]
        ]

    return {
        "success": True,
        "mock": True,
        "notice": "SANDBOX MOCK — no real internet search was performed. Results are from a curated local dataset.",
        "query": query,
        "results": matched_results,
    }
