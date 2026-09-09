"""
Vercel Serverless Entry Point for Inventory Sentinel.

Vercel Python runtime looks for an `app` ASGI callable in this file.
We patch DB_PATH to /tmp before importing the backend modules so SQLite
writes go to the only writable directory available in the Vercel sandbox.

Note: /tmp is ephemeral per Lambda invocation. The DB is re-seeded on
every cold start (init_db is idempotent - uses CREATE TABLE IF NOT EXISTS).
This is acceptable for a demo / read-heavy workload. For persistent
production data, replace SQLite with a hosted DB (e.g. PlanetScale, Supabase).
"""

import os
import sys
from pathlib import Path

# ── Patch DB path to /tmp before any backend imports ────────────────────────
os.environ.setdefault("INVENTORY_DB_PATH", "/tmp/inventory.db")

# Add backend directory to sys.path so relative imports work
backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

# ── Import the FastAPI app (triggers init_db on startup) ─────────────────────
from main import app  # noqa: E402  (must be after sys.path patch)

# Vercel expects the ASGI app to be named `app` at module level.
# Nothing else is needed – Vercel's @vercel/python adapter handles the rest.
