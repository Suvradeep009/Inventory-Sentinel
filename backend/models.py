"""Pydantic schemas for Inventory Sentinel API."""

from pydantic import BaseModel
from typing import Optional


class Product(BaseModel):
    id: int
    name: str
    sku: str
    category: str
    price: float
    stock: int
    order_id: Optional[str] = None
    status: Optional[str] = None


class ProductCreate(BaseModel):
    name: str
    category: str
    order_id: Optional[str] = None
    price: float
    stock: int
    sku: Optional[str] = None
    status: Optional[str] = "In Stock"


class Review(BaseModel):
    id: int
    product_id: int
    reviewer: str
    text: str
    timestamp: str


class ReviewCreate(BaseModel):
    product_id: int
    reviewer: str
    text: str


class SentimentResult(BaseModel):
    review_id: int
    text: str
    tier: str  # VERY_BAD, BAD, NEUTRAL, GOOD, VERY_GOOD
    confidence: float
    reviewer: str


class SentimentSummary(BaseModel):
    product_id: int
    product_name: str
    total_reviews: int
    distribution: dict  # tier -> count
    percentages: dict  # tier -> percentage
    overall_score: float
    signal: str  # HALT_RESTOCK, INCREASE_ORDER, HOLD_STEADY


class InventoryItem(BaseModel):
    product: Product
    sentiment_score: float
    signal: str
    negative_pct: float
    positive_pct: float


class RagQuery(BaseModel):
    query: str
    product_id: Optional[int] = None


class RagChunk(BaseModel):
    text: str
    source: str
    relevance: float


class RagResponse(BaseModel):
    query: str
    chunks: list[RagChunk]
    answer: str


class BatchAnalyzeRequest(BaseModel):
    reviews: list[str]


class BatchAnalyzeItem(BaseModel):
    text: str
    tier: str
    confidence: float


class RagRequest(BaseModel):
    query: str
    product_id: Optional[int] = None


class VendorSyncRequest(BaseModel):
    products: list[dict]
    reviews: list[dict]
    analyzed: Optional[list[dict]] = None

