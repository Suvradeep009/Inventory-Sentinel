"""NLP Engine for Inventory Sentinel — powered by Google Gemini 1.5 Flash.

Classifies customer reviews into 5 sentiment tiers using structured output
from the Gemini API. Falls back to keyword heuristics if the API is unavailable.

Tiers: VERY_BAD | BAD | NEUTRAL | GOOD | VERY_GOOD

Signal Thresholds (per spec):
    HALT_RESTOCK  : (VERY_BAD% + BAD%)       >= 45%
    INCREASE_ORDER: (GOOD%     + VERY_GOOD%) >= 65%
    HOLD_STEADY   : everything else
"""

import os
import re
import json
import random
import hashlib
import logging
from pathlib import Path
from dotenv import load_dotenv

# Load .env from the backend directory
load_dotenv(Path(__file__).resolve().parent / ".env", override=True)

logger = logging.getLogger(__name__)

# ── API Key Check ─────────────────────────────────────────────────────────────

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
API_KEY_MISSING = not GEMINI_API_KEY or GEMINI_API_KEY in ("YOUR_KEY_HERE", "YOUR_GEMINI_API_KEY_HERE", "<YOUR_GEMINI_API_KEY>")

_gemini_client = None

def _init_client(key: str):
    """Initialize (or reinitialize) the Gemini client with a given key."""
    global _gemini_client, API_KEY_MISSING, GEMINI_API_KEY
    try:
        import google.generativeai as genai
        models_to_try = ["gemini-3.6-flash", "gemini-flash-latest", "gemini-1.5-flash"]
        for m in models_to_try:
            try:
                _gemini_client = genai.GenerativeModel(
                    model_name=m,
                    generation_config={
                        "temperature": 0.1,
                        "response_mime_type": "application/json",
                    },
                )
                logger.info("[NLP] Gemini client initialized with model: %s", m)
                break
            except Exception as me:
                logger.warning("[NLP] Could not init %s: %s", m, me)
        GEMINI_API_KEY = key
        API_KEY_MISSING = False
        return True
    except Exception as exc:
        logger.error("[NLP] Failed to initialize Gemini client: %s", exc)
        _gemini_client = None
        return False

def reinitialize(key: str) -> bool:
    """Hot-reload the Gemini client with a new API key. Clears the sentiment cache."""
    ok = _init_client(key)
    if ok:
        _sentiment_cache.clear()
        logger.info("[NLP] Reinitialized with new API key. Cache cleared.")
    return ok

if not API_KEY_MISSING:
    _init_client(GEMINI_API_KEY)
else:
    logger.warning("[NLP] GEMINI_API_KEY not set — running in heuristic fallback mode.")

# ── In-Memory Sentiment Cache ─────────────────────────────────────────────────
# Keyed by product_id. Holds the full sentiment summary dict.
# Invalidated when a new review is added or uploaded for that product.

_sentiment_cache: dict[int, dict] = {}


def invalidate_cache(product_id: int) -> None:
    """Remove a product's cached sentiment so next call re-queries Gemini."""
    _sentiment_cache.pop(product_id, None)
    logger.info("[NLP] Cache invalidated for product_id=%d", product_id)


# ── Gemini Batch Classification ───────────────────────────────────────────────

_CLASSIFY_SYSTEM = """You are a strict sentiment classifier for customer product reviews.
Classify each review into EXACTLY one of these five tiers:
  VERY_BAD  — severe complaints, product failure, would not recommend
  BAD       — clear disappointment, notable issues, negative overall
  NEUTRAL   — mixed, average, "gets the job done", no strong opinion
  GOOD      — positive experience, satisfied, recommends
  VERY_GOOD — exceptional praise, loves product, would strongly recommend

Return a JSON array with one object per review, in the same order as input.
Each object must have exactly these keys:
  "tier"       : one of [VERY_BAD, BAD, NEUTRAL, GOOD, VERY_GOOD]
  "confidence" : float between 0.0 and 1.0

Example output for 2 reviews:
[
  {"tier": "VERY_BAD", "confidence": 0.95},
  {"tier": "GOOD",     "confidence": 0.82}
]

Do NOT include any explanation, markdown, or extra keys. Return ONLY the JSON array."""


def _classify_batch_gemini(review_texts: list[str]) -> list[dict]:
    """
    Classify a batch of review texts via Gemini 1.5 Flash.
    Returns a list of {"tier": str, "confidence": float} dicts.
    Raises on API error so caller can fall back to heuristic.
    """
    numbered = "\n".join(
        f"{i + 1}. {text}" for i, text in enumerate(review_texts)
    )
    prompt = f"{_CLASSIFY_SYSTEM}\n\nReviews to classify:\n{numbered}"

    response = _gemini_client.generate_content(prompt)
    raw = response.text.strip()

    # Strip markdown code fences if Gemini wraps output
    raw = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.MULTILINE)
    raw = re.sub(r"\s*```$", "", raw, flags=re.MULTILINE)

    results = json.loads(raw)

    # Validate and normalise
    VALID_TIERS = {"VERY_BAD", "BAD", "NEUTRAL", "GOOD", "VERY_GOOD"}
    normalised = []
    for item in results:
        tier = str(item.get("tier", "NEUTRAL")).upper().strip()
        if tier not in VALID_TIERS:
            tier = "NEUTRAL"
        confidence = float(item.get("confidence", 0.7))
        confidence = round(min(0.99, max(0.50, confidence)), 2)
        normalised.append({"tier": tier, "confidence": confidence})

    return normalised


# ── Keyword Heuristic Fallback ────────────────────────────────────────────────

VERY_POSITIVE_WORDS = [
    "amazing", "incredible", "outstanding", "exceptional", "perfect", "flawless",
    "brilliant", "superb", "phenomenal", "love", "best", "excellent", "gorgeous",
    "life-changing", "genius", "blazing", "crystal clear", "top notch", "highly recommend",
    "blown away", "worth every penny", "top quality", "game changer", "fantastic",
]
POSITIVE_WORDS = [
    "great", "good", "solid", "reliable", "comfortable", "convenient", "useful",
    "nice", "sleek", "modern", "effective", "efficient", "sturdy", "versatile",
    "responsive", "intuitive", "well-made", "well padded", "accurate", "precise",
    "easy", "fast", "seamless", "smooth", "premium", "stylish", "impressive",
]
NEGATIVE_WORDS = [
    "bad", "disappointing", "poor", "cheap", "flimsy", "uncomfortable", "annoying",
    "frustrating", "mediocre", "overpriced", "inconsistent", "limited", "shallow",
    "concerning", "faded", "loose", "jammed", "squeaks", "scratchy", "nightmare",
    "broke", "broke after", "fell out", "slides", "wore out", "pills",
]
VERY_NEGATIVE_WORDS = [
    "terrible", "horrible", "worst", "awful", "useless", "waste", "garbage",
    "unusable", "false advertising", "nonexistent", "insulting", "zero",
    "dead", "cracked", "snapped", "stopped working", "died", "disconnecting",
    "complete", "absolutely", "unwatchable", "laughable",
]
NEUTRAL_SIGNALS = [
    "decent", "okay", "average", "middle of the road", "gets the job done",
    "nothing special", "nothing extraordinary", "fine", "not bad",
    "could be better", "acceptable",
]


def _deterministic_seed(text: str) -> int:
    return int(hashlib.md5(text.encode()).hexdigest()[:8], 16)


def _count_matches(text: str, word_bank: list) -> int:
    text_lower = text.lower()
    return sum(1 for word in word_bank if word in text_lower)


def _classify_sentiment_heuristic(review_text: str) -> dict:
    """Keyword-based fallback classifier (no API required)."""
    seed = _deterministic_seed(review_text)
    rng = random.Random(seed)

    vp = _count_matches(review_text, VERY_POSITIVE_WORDS)
    p  = _count_matches(review_text, POSITIVE_WORDS)
    n  = _count_matches(review_text, NEGATIVE_WORDS)
    vn = _count_matches(review_text, VERY_NEGATIVE_WORDS)
    ne = _count_matches(review_text, NEUTRAL_SIGNALS)

    scores = {
        "VERY_GOOD": vp * 3.0 + p * 0.5,
        "GOOD":      p  * 2.5 + vp * 0.8,
        "NEUTRAL":   ne * 3.0 + 1.0,
        "BAD":       n  * 2.5 + vn * 0.8,
        "VERY_BAD":  vn * 3.0 + n * 0.5,
    }

    tier = max(scores, key=scores.get)
    values = list(scores.values())
    if max(values) - min(values) < 1.5:
        tier = "NEUTRAL"

    total = sum(values) + 0.01
    raw_conf = scores[tier] / total
    confidence = round(min(0.98, max(0.55, raw_conf * 1.2 + rng.uniform(0.05, 0.20))), 2)

    return {"tier": tier, "confidence": confidence}


# ── Public API ────────────────────────────────────────────────────────────────

def classify_sentiment(review_text: str) -> dict:
    """
    Classify a single review. Used by the add-review endpoint.
    Returns dict with keys: tier, confidence, scores.
    """
    if _gemini_client:
        try:
            results = _classify_batch_gemini([review_text])
            r = results[0]
            return {"tier": r["tier"], "confidence": r["confidence"], "scores": {}}
        except Exception as exc:
            logger.warning("[NLP] Gemini single classify failed, using heuristic: %s", exc)

    result = _classify_sentiment_heuristic(review_text)
    return {**result, "scores": {}}


def classify_reviews_batch(review_texts: list[str]) -> list[dict]:
    """
    Classify an arbitrary list of review texts via Gemini 1.5 Flash batching.
    Falls back to heuristic if Gemini fails or is unconfigured.
    Returns list of {"text": str, "tier": str, "confidence": float}.
    """
    if not review_texts:
        return []

    results = []
    # Process in chunks of 10 for reliability
    CHUNK_SIZE = 10
    for i in range(0, len(review_texts), CHUNK_SIZE):
        chunk = review_texts[i:i + CHUNK_SIZE]
        chunk_results = None
        if _gemini_client:
            try:
                classified = _classify_batch_gemini(chunk)
                if len(classified) == len(chunk):
                    chunk_results = [
                        {"text": text, "tier": c["tier"], "confidence": c["confidence"]}
                        for text, c in zip(chunk, classified)
                    ]
            except Exception as exc:
                logger.warning("[NLP] Batch classify error on chunk: %s", exc)

        if chunk_results is None:
            chunk_results = []
            for text in chunk:
                h = _classify_sentiment_heuristic(text)
                chunk_results.append({
                    "text": text,
                    "tier": h["tier"],
                    "confidence": h["confidence"],
                })
        results.extend(chunk_results)

    return results



def get_product_sentiment_summary(product_id: int) -> dict:
    """
    Return full sentiment summary for a product. Uses the in-memory cache;
    calls Gemini (or heuristic fallback) if cache is cold.
    """
    if product_id in _sentiment_cache:
        return _sentiment_cache[product_id]

    from database import get_reviews_for_product, get_product

    reviews = get_reviews_for_product(product_id)
    product = get_product(product_id)

    empty = {
        "product_id": product_id,
        "product_name": product["name"] if product else "Unknown",
        "total_reviews": 0,
        "distribution": {"VERY_BAD": 0, "BAD": 0, "NEUTRAL": 0, "GOOD": 0, "VERY_GOOD": 0},
        "percentages":  {"VERY_BAD": 0, "BAD": 0, "NEUTRAL": 0, "GOOD": 0, "VERY_GOOD": 0},
        "overall_score": 0.0,
        "signal": "HOLD_STEADY",
        "reviews": [],
        "engine": "GEMINI_1.5_FLASH" if (_gemini_client and not API_KEY_MISSING) else "HEURISTIC_FALLBACK",
    }

    if not reviews or not product:
        return empty

    review_texts = [r["text"] for r in reviews]
    distribution = {"VERY_BAD": 0, "BAD": 0, "NEUTRAL": 0, "GOOD": 0, "VERY_GOOD": 0}
    classified_reviews = []

    # ── Try Gemini batch first ──
    gemini_results = None
    if _gemini_client:
        try:
            gemini_results = _classify_batch_gemini(review_texts)
        except Exception as exc:
            logger.warning("[NLP] Gemini batch failed for product %d, using heuristic: %s", product_id, exc)

    for i, review in enumerate(reviews):
        if gemini_results and i < len(gemini_results):
            r = gemini_results[i]
            tier = r["tier"]
            confidence = r["confidence"]
        else:
            r = _classify_sentiment_heuristic(review["text"])
            tier = r["tier"]
            confidence = r["confidence"]

        distribution[tier] += 1
        classified_reviews.append({
            "review_id":  review["id"],
            "text":       review["text"],
            "tier":       tier,
            "confidence": confidence,
            "reviewer":   review["reviewer"],
            "timestamp":  review["timestamp"],
        })

    total = len(reviews)
    percentages = {t: round((c / total) * 100, 1) for t, c in distribution.items()}

    tier_weights = {"VERY_BAD": 1, "BAD": 2, "NEUTRAL": 3, "GOOD": 4, "VERY_GOOD": 5}
    overall_score = round(
        sum(distribution[t] * tier_weights[t] for t in distribution) / total, 2
    )

    signal = compute_restock_signal(distribution, total)

    summary = {
        "product_id":   product_id,
        "product_name": product["name"],
        "total_reviews": total,
        "distribution": distribution,
        "percentages":  percentages,
        "overall_score": overall_score,
        "signal":       signal,
        "reviews":      classified_reviews,
        "engine":       "GEMINI_1.5_FLASH" if gemini_results else "HEURISTIC_FALLBACK",
    }

    _sentiment_cache[product_id] = summary
    return summary


def compute_restock_signal(distribution: dict, total: int) -> str:
    """
    Compute the automated restock signal per spec thresholds:
        HALT_RESTOCK  : (VERY_BAD + BAD)       / total >= 0.45
        INCREASE_ORDER: (GOOD + VERY_GOOD)      / total >= 0.65
        HOLD_STEADY   : everything else
    """
    if total == 0:
        return "HOLD_STEADY"

    negative_pct = (distribution.get("VERY_BAD", 0) + distribution.get("BAD", 0)) / total
    positive_pct = (distribution.get("GOOD", 0) + distribution.get("VERY_GOOD", 0)) / total

    if negative_pct >= 0.45:
        return "HALT_RESTOCK"
    elif positive_pct >= 0.65:
        return "INCREASE_ORDER"
    return "HOLD_STEADY"


def get_all_product_sentiments() -> list[dict]:
    """Get sentiment summaries for all products."""
    from database import get_all_products
    products = get_all_products()
    summaries = []
    for product in products:
        summary = get_product_sentiment_summary(product["id"])
        summary["sku"]      = product["sku"]
        summary["category"] = product["category"]
        summary["price"]    = product["price"]
        summary["stock"]    = product["stock"]
        summaries.append(summary)
    return summaries
