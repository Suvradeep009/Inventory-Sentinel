"""FastAPI application for Inventory Sentinel.

Provides REST API endpoints for inventory management, NLP sentiment analysis,
and RAG-based query answering. Also serves the built React frontend as static
files so everything runs from a single server.
"""

import csv
import io
import json
import os
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse

# Load environment variables from backend/.env
load_dotenv(Path(__file__).resolve().parent / ".env", override=True)

import database
from nlp_engine import (
    classify_sentiment,
    classify_reviews_batch,
    get_product_sentiment_summary,
    get_all_product_sentiments,
    invalidate_cache,
    API_KEY_MISSING as NLP_KEY_MISSING,
)
from datetime import datetime
from rag_engine import generate_answer, API_KEY_MISSING as RAG_KEY_MISSING
from models import ReviewCreate, RagQuery, BatchAnalyzeRequest, RagRequest, ProductCreate, VendorSyncRequest

# Path to the built React frontend
FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend" / "dist"

# ── Initialize ───────────────────────────────────────────────────────────────

app = FastAPI(title="Inventory Sentinel API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    """Initialize database and seed data on startup."""
    database.init_db()


# ── System / Key Status ───────────────────────────────────────────────────────


@app.get("/api/key-status")
def key_status():
    """Return whether the Gemini API key is configured."""
    has_key = not NLP_KEY_MISSING
    return {
        "data": {
            "has_key": has_key,
            "engine": "GEMINI_1.5_FLASH" if has_key else "HEURISTIC_FALLBACK",
            "message": "ONLINE" if has_key else "[ERR: MISSING_API_KEY] // Set GEMINI_API_KEY in backend/.env",
        }
    }


@app.get("/api/status")
def system_status():
    """Return system statistics."""
    products = database.get_all_products()
    reviews = database.get_all_reviews()
    summaries = get_all_product_sentiments()

    halt_count     = sum(1 for s in summaries if s["signal"] == "HALT_RESTOCK")
    increase_count = sum(1 for s in summaries if s["signal"] == "INCREASE_ORDER")
    hold_count     = sum(1 for s in summaries if s["signal"] == "HOLD_STEADY")

    return {
        "data": {
            "total_products": len(products),
            "total_reviews":  len(reviews),
            "signals": {
                "HALT_RESTOCK":   halt_count,
                "INCREASE_ORDER": increase_count,
                "HOLD_STEADY":    hold_count,
            },
            "version": "1.0.0",
            "status":  "OPERATIONAL",
            "engine":  "GEMINI_1.5_FLASH" if not NLP_KEY_MISSING else "HEURISTIC_FALLBACK",
        }
    }


# ── Product Endpoints ────────────────────────────────────────────────────────


@app.get("/api/products")
def list_products():
    """Return all products."""
    products = database.get_all_products()
    if not products:
        return {"data": [], "message": "INVENTORY_EMPTY // AWAITING_DATA"}
    return {"data": products}


@app.get("/api/products/{product_id}")
def get_product(product_id: int):
    """Return a single product."""
    product = database.get_product(product_id)
    if not product:
        raise HTTPException(status_code=404, detail=f"PRODUCT_NOT_FOUND // ID={product_id}")
    return {"data": product}


@app.post("/api/products")
def create_product(p: ProductCreate):
    """Create a new product stock entry."""
    import random
    conn = database.get_connection()
    cursor = conn.cursor()
    sku = p.sku or f"PWR-{p.name[:3].upper()}-{random.randint(100, 999)}"
    order_id = p.order_id or f"#{random.randint(7681, 7999)}"
    cursor.execute(
        "INSERT INTO products (name, sku, category, order_id, price, stock, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (p.name, sku, p.category, order_id, p.price, p.stock, p.status or "In Stock"),
    )
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return {"data": database.get_product(new_id), "message": "STOCK_CREATED"}



# ── Review Endpoints ─────────────────────────────────────────────────────────


@app.get("/api/products/{product_id}/reviews")
def get_reviews(product_id: int):
    """Return all reviews for a product."""
    product = database.get_product(product_id)
    if not product:
        raise HTTPException(status_code=404, detail=f"PRODUCT_NOT_FOUND // ID={product_id}")

    reviews = database.get_reviews_for_product(product_id)
    if not reviews:
        return {"data": [], "message": "NO_REVIEWS // AWAITING_INPUT"}
    return {"data": reviews}


@app.post("/api/reviews")
def add_review(review: ReviewCreate):
    """Add a new review, invalidate sentiment cache, return sentiment classification."""
    product = database.get_product(review.product_id)
    if not product:
        raise HTTPException(status_code=404, detail=f"PRODUCT_NOT_FOUND // ID={review.product_id}")

    new_review = database.add_review(review.product_id, review.reviewer, review.text)

    # Invalidate cache so next GET /sentiment re-queries Gemini
    invalidate_cache(review.product_id)

    sentiment = classify_sentiment(review.text)

    return {
        "data": {**new_review, "sentiment": sentiment},
        "message": f"REVIEW_ADDED // CLASSIFIED_AS={sentiment['tier']}",
    }


# ── Sentiment / NLP Endpoints ───────────────────────────────────────────────


@app.get("/api/products/{product_id}/sentiment")
def get_sentiment(product_id: int):
    """Return NLP sentiment analysis for a product's reviews."""
    product = database.get_product(product_id)
    if not product:
        raise HTTPException(status_code=404, detail=f"PRODUCT_NOT_FOUND // ID={product_id}")

    summary = get_product_sentiment_summary(product_id)
    return {"data": summary}


# ── Inventory / Demand Signal Endpoints ──────────────────────────────────────


@app.get("/api/inventory")
def get_inventory():
    """Return full inventory with sentiment signals for all products."""
    summaries = get_all_product_sentiments()
    if not summaries:
        return {"data": [], "message": "INVENTORY_EMPTY // AWAITING_DATA"}

    inventory = []
    for s in summaries:
        neg_pct = s["percentages"].get("VERY_BAD", 0) + s["percentages"].get("BAD", 0)
        pos_pct = s["percentages"].get("VERY_GOOD", 0) + s["percentages"].get("GOOD", 0)
        inventory.append({
            "product_id":    s["product_id"],
            "product_name":  s["product_name"],
            "sku":           s["sku"],
            "category":      s["category"],
            "price":         s["price"],
            "stock":         s["stock"],
            "total_reviews": s["total_reviews"],
            "overall_score": s["overall_score"],
            "signal":        s["signal"],
            "negative_pct":  round(neg_pct, 1),
            "positive_pct":  round(pos_pct, 1),
            "distribution":  s["distribution"],
            "percentages":   s["percentages"],
            "engine":        s.get("engine", "UNKNOWN"),
        })

    return {"data": inventory}


# ── Batch NLP & RAG Direct Endpoints ─────────────────────────────────────────


@app.post("/api/analyze")
def analyze_batch(req: BatchAnalyzeRequest):
    """
    Accept batched reviews, send to Gemini API with strict structured schema,
    classifying text into the 5 designated sentiment tiers + confidence score.
    """
    if not req.reviews:
        return {"data": [], "count": 0}

    classified = classify_reviews_batch(req.reviews)
    return {
        "data": classified,
        "count": len(classified),
        "engine": "GEMINI_1.5_FLASH" if not NLP_KEY_MISSING else "HEURISTIC_FALLBACK",
    }


@app.post("/api/rag")
@app.post("/api/rag/query")
def rag_query(query: RagRequest):
    """
    Process a RAG query: in-memory cosine/keyword retrieval to pull top-3
    most relevant review snippets, grounded Gemini 1.5 Flash answer.
    """
    if not query.query.strip():
        raise HTTPException(status_code=400, detail="QUERY_EMPTY // PROVIDE_INPUT")

    result = generate_answer(query.query, query.product_id)
    return {"data": result}


# ── Simulated Vendor API (Dataset Provider) ──────────────────────────────────

VENDOR_PRODUCTS = [
    {
        "name": "Inverter",
        "sku": "PWR-INV-001",
        "category": "cat1",
        "order_id": "#7676",
        "price": 24999.0,
        "stock": 65,
        "status": "In Stock",
    },
    {
        "name": "Battery",
        "sku": "PWR-BAT-002",
        "category": "cat2",
        "order_id": "#7677",
        "price": 16499.0,
        "stock": 140,
        "status": "Restock Halted",
    },
    {
        "name": "Generator",
        "sku": "PWR-GEN-003",
        "category": "cat2",
        "order_id": "#7678",
        "price": 52999.0,
        "stock": 35,
        "status": "Order Surge",
    },
    {
        "name": "Charger",
        "sku": "PWR-CHG-004",
        "category": "cat3",
        "order_id": "#7679",
        "price": 4299.0,
        "stock": 290,
        "status": "In Stock",
    },
    {
        "name": "Power",
        "sku": "PWR-SUP-005",
        "category": "cat4",
        "order_id": "#7680",
        "price": 8499.0,
        "stock": 195,
        "status": "In Stock",
    },
]

VENDOR_REVIEWS = [
    # 7 reviews for Inverter (predominantly positive / reliable)
    {
        "id": 101,
        "product_name": "Inverter",
        "reviewer": "rajesh_tech",
        "text": "Pure sine wave output is clean and runs our sensitive lab electronics without any line distortion.",
        "timestamp": "2026-09-02T10:15:00",
    },
    {
        "id": 102,
        "product_name": "Inverter",
        "reviewer": "vikram_powersystems",
        "text": "Very solid 3000W inverter. Powers our workshop tools smoothly with zero voltage drop.",
        "timestamp": "2026-09-02T14:30:00",
    },
    {
        "id": 103,
        "product_name": "Inverter",
        "reviewer": "sunita_eng",
        "text": "Cooling fan is a bit noisy when drawing over 2000W continuous, but temperature stays under 50C.",
        "timestamp": "2026-09-03T09:00:00",
    },
    {
        "id": 104,
        "product_name": "Inverter",
        "reviewer": "deepak_solar",
        "text": "Installed in our solar backup setup. Seamless power transition during municipal grid cuts.",
        "timestamp": "2026-09-03T16:20:00",
    },
    {
        "id": 105,
        "product_name": "Inverter",
        "reviewer": "arun_contractor",
        "text": "High efficiency conversion rate. Measured 94% efficiency under steady half-load testing.",
        "timestamp": "2026-09-04T11:45:00",
    },
    {
        "id": 106,
        "product_name": "Inverter",
        "reviewer": "kavita_electrical",
        "text": "Solid aluminium casing dissipates heat effectively. The remote monitoring display is accurate.",
        "timestamp": "2026-09-04T18:10:00",
    },
    {
        "id": 107,
        "product_name": "Inverter",
        "reviewer": "manoj_backup",
        "text": "Good protection circuitry. The low-voltage cutoff saved our battery bank from over-discharging.",
        "timestamp": "2026-09-05T08:30:00",
    },
    # 7 reviews for Battery (heavily negative: tests HALT RESTOCK threshold >= 45% negative)
    {
        "id": 108,
        "product_name": "Battery",
        "reviewer": "suresh_grid",
        "text": "Severe capacity degradation after only 35 cycles. Cells will not balance above 70% state of charge.",
        "timestamp": "2026-09-01T12:00:00",
    },
    {
        "id": 109,
        "product_name": "Battery",
        "reviewer": "priya_consultant",
        "text": "BMS unit cuts out prematurely under moderate 40A load. Defective internal thermal sensors.",
        "timestamp": "2026-09-02T11:20:00",
    },
    {
        "id": 110,
        "product_name": "Battery",
        "reviewer": "anand_facilities",
        "text": "Battery completely failed to hold charge overnight in mild 12C ambient temperatures. Unacceptable.",
        "timestamp": "2026-09-03T07:45:00",
    },
    {
        "id": 111,
        "product_name": "Battery",
        "reviewer": "rohit_testing",
        "text": "Severe cell swelling observed after two months of standard trickle charging. Safety hazard.",
        "timestamp": "2026-09-03T15:10:00",
    },
    {
        "id": 112,
        "product_name": "Battery",
        "reviewer": "meera_greenenergy",
        "text": "Discharge curve drops off a cliff past 50% capacity. Terrible build quality on this production run.",
        "timestamp": "2026-09-04T13:40:00",
    },
    {
        "id": 113,
        "product_name": "Battery",
        "reviewer": "harish_engineer",
        "text": "Internal resistance measured dangerously high across two cells. Returning for full warranty refund.",
        "timestamp": "2026-09-05T10:00:00",
    },
    {
        "id": 114,
        "product_name": "Battery",
        "reviewer": "tarun_gridguard",
        "text": "Lab test showed only 62Ah on a supposedly 100Ah unit. Does not meet rated amp-hour specifications.",
        "timestamp": "2026-09-05T16:50:00",
    },
    # 7 reviews for Generator (heavily positive: tests INCREASE ORDER threshold >= 65% positive)
    {
        "id": 115,
        "product_name": "Generator",
        "reviewer": "neha_industrial",
        "text": "Incredible fuel efficiency. Ran continuously for 16 hours on a single tank under 50% load.",
        "timestamp": "2026-09-01T09:30:00",
    },
    {
        "id": 116,
        "product_name": "Generator",
        "reviewer": "pooja_operations",
        "text": "Electric start fired up on the very first try even in freezing winter conditions. Superb engineering.",
        "timestamp": "2026-09-02T08:15:00",
    },
    {
        "id": 117,
        "product_name": "Generator",
        "reviewer": "swati_logistics",
        "text": "Extremely quiet inverter generator. You can stand next to it and hold a normal conversation.",
        "timestamp": "2026-09-02T17:00:00",
    },
    {
        "id": 118,
        "product_name": "Generator",
        "reviewer": "karan_energy",
        "text": "Dual-fuel capability works flawlessly between gasoline and propane without sputtering.",
        "timestamp": "2026-09-03T12:30:00",
    },
    {
        "id": 119,
        "product_name": "Generator",
        "reviewer": "amit_sharma",
        "text": "Clean THD under 2.5%, safely powering sensitive IT server racks during emergency outages.",
        "timestamp": "2026-09-04T09:45:00",
    },
    {
        "id": 120,
        "product_name": "Generator",
        "reviewer": "siddharth_m",
        "text": "Heavy duty build quality, durable wheels, and comfortable folding pull handle. A masterclass.",
        "timestamp": "2026-09-04T15:20:00",
    },
    {
        "id": 121,
        "product_name": "Generator",
        "reviewer": "vikram_powersystems",
        "text": "Best backup generator in its class. Worth every rupee for residential and commercial resilience.",
        "timestamp": "2026-09-05T11:15:00",
    },
    # 7 reviews for Charger (balanced quality)
    {
        "id": 122,
        "product_name": "Charger",
        "reviewer": "rajesh_tech",
        "text": "Multi-stage smart charging algorithm revived our depleted deep-cycle banks quickly.",
        "timestamp": "2026-09-01T14:10:00",
    },
    {
        "id": 123,
        "product_name": "Charger",
        "reviewer": "sunita_eng",
        "text": "Compact footprint and stays pleasantly cool thanks to the internal active thermal vent.",
        "timestamp": "2026-09-02T13:00:00",
    },
    {
        "id": 124,
        "product_name": "Charger",
        "reviewer": "deepak_solar",
        "text": "Clear digital status readout showing charging stage, current amperage, and terminal voltage.",
        "timestamp": "2026-09-03T11:30:00",
    },
    {
        "id": 125,
        "product_name": "Charger",
        "reviewer": "arun_contractor",
        "text": "Solid charger for everyday workshop use. Reliable clamps with heavy-gauge insulation.",
        "timestamp": "2026-09-03T19:00:00",
    },
    {
        "id": 126,
        "product_name": "Charger",
        "reviewer": "kavita_electrical",
        "text": "Charges lead-acid and lithium chemistry profiles accurately. Mode selector is straightforward.",
        "timestamp": "2026-09-04T10:20:00",
    },
    {
        "id": 127,
        "product_name": "Charger",
        "reviewer": "manoj_backup",
        "text": "Good value charger that delivers steady 25A current without thermal throttling.",
        "timestamp": "2026-09-05T09:10:00",
    },
    {
        "id": 128,
        "product_name": "Charger",
        "reviewer": "suresh_grid",
        "text": "Cord could be a foot longer for vehicle bays, but the charging logic itself is flawless.",
        "timestamp": "2026-09-05T14:40:00",
    },
    # 7 reviews for Power (balanced industrial)
    {
        "id": 129,
        "product_name": "Power",
        "reviewer": "priya_consultant",
        "text": "Clean isolated power supply that eliminated all ground loop hum in our testing setup.",
        "timestamp": "2026-09-01T16:00:00",
    },
    {
        "id": 130,
        "product_name": "Power",
        "reviewer": "anand_facilities",
        "text": "Heavy duty surge suppression clamped a municipal spike without damaging downstream units.",
        "timestamp": "2026-09-02T10:50:00",
    },
    {
        "id": 131,
        "product_name": "Power",
        "reviewer": "rohit_testing",
        "text": "Consistent voltage rails across all 12V and 24V terminal outputs. Exceptional regulation.",
        "timestamp": "2026-09-03T08:20:00",
    },
    {
        "id": 132,
        "product_name": "Power",
        "reviewer": "meera_greenenergy",
        "text": "Industrial grade chassis with DIN-rail mounting brackets included. Very convenient install.",
        "timestamp": "2026-09-03T17:40:00",
    },
    {
        "id": 133,
        "product_name": "Power",
        "reviewer": "harish_engineer",
        "text": "High MTBF rating shows in the component selection. Premium Japanese capacitors throughout.",
        "timestamp": "2026-09-04T12:00:00",
    },
    {
        "id": 134,
        "product_name": "Power",
        "reviewer": "tarun_gridguard",
        "text": "Tested under 100% continuous load for 72 hours. Case remained warm but well within safe tolerance.",
        "timestamp": "2026-09-05T13:20:00",
    },
    {
        "id": 135,
        "product_name": "Power",
        "reviewer": "neha_industrial",
        "text": "Terminal screws were slightly stiff out of the box, but electrical stability is completely rock solid.",
        "timestamp": "2026-09-05T18:00:00",
    },
]


@app.get("/api/vendor-data")
def get_vendor_data():
    """
    Simulated External Vendor Dataset API.
    Returns structured hardware catalog with mock stock levels and 35 varied
    customer critiques across all qualitative polarity tiers.
    """
    return {
        "provider": "Apex Power & Grid External Vendor Feed (v2.4)",
        "timestamp": datetime.now().isoformat(),
        "products": VENDOR_PRODUCTS,
        "reviews": VENDOR_REVIEWS,
        "total_products": len(VENDOR_PRODUCTS),
        "total_reviews": len(VENDOR_REVIEWS),
    }


@app.post("/api/vendor-data/apply")
def apply_vendor_data(req: VendorSyncRequest):
    """
    Ingest live vendor catalog counts and customer critiques into SQLite,
    clearing the sentiment cache to immediately update demand signals.
    """
    result = database.sync_vendor_dataset(req.products, req.reviews)
    for pid in result["synced_product_ids"]:
        invalidate_cache(pid)

    import nlp_engine
    nlp_engine._sentiment_cache.clear()

    return {
        "message": "VENDOR_DATA_APPLIED // SQLite & Sentiment Cache Synchronized",
        "products_synced": result["products_synced"],
        "reviews_synced": result["reviews_synced"],
        "timestamp": datetime.now().isoformat(),
    }


# ── Upload Endpoints ─────────────────────────────────────────────────────────


@app.post("/api/upload/products")
async def upload_products(file: UploadFile = File(...)):
    """Upload products via CSV or JSON file."""
    content = await file.read()
    text = content.decode("utf-8")

    rows = []
    if file.filename.endswith(".json"):
        rows = json.loads(text)
    elif file.filename.endswith(".csv"):
        reader = csv.DictReader(io.StringIO(text))
        rows = list(reader)
    else:
        raise HTTPException(status_code=400, detail="INVALID_FORMAT // ACCEPTED: .csv, .json")

    inserted = database.upload_products_csv(rows)
    return {"message": f"UPLOAD_COMPLETE // {inserted} products inserted", "inserted": inserted}


@app.post("/api/upload/reviews")
async def upload_reviews(file: UploadFile = File(...)):
    """Upload reviews via CSV or JSON file. Invalidates sentiment cache for affected products."""
    content = await file.read()
    text = content.decode("utf-8")

    rows = []
    if file.filename.endswith(".json"):
        rows = json.loads(text)
    elif file.filename.endswith(".csv"):
        reader = csv.DictReader(io.StringIO(text))
        rows = list(reader)
    else:
        raise HTTPException(status_code=400, detail="INVALID_FORMAT // ACCEPTED: .csv, .json")

    inserted = database.upload_reviews_csv(rows)

    # Invalidate cache for every affected product
    affected_ids = {int(row["product_id"]) for row in rows if "product_id" in row}
    for pid in affected_ids:
        invalidate_cache(pid)

    return {"message": f"UPLOAD_COMPLETE // {inserted} reviews inserted", "inserted": inserted}


# ── Serve Frontend Static Files ──────────────────────────────────────────────

if FRONTEND_DIR.exists():
    assets_dir = FRONTEND_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="static-assets")


@app.get("/{full_path:path}")
async def serve_frontend(request: Request, full_path: str):
    """Serve the React SPA for all non-API routes."""
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="NOT_FOUND")

    index_file = FRONTEND_DIR / "index.html"
    if index_file.exists():
        return HTMLResponse(content=index_file.read_text(encoding="utf-8"))

    return HTMLResponse(
        content="<pre>> FRONTEND_NOT_BUILT // Run 'npm run build' in frontend/</pre>",
        status_code=503,
    )
