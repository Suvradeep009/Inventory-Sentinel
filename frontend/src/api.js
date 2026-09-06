/**
 * API Client for Inventory Sentinel Backend
 * All fetch wrappers for FastAPI endpoints
 */

const API_BASE = '/api';

async function fetchJSON(url, options = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── System ────────────────────────────────────────────────────────────────

export async function getStatus() {
  const res = await fetchJSON('/status');
  return res.data;
}

export async function getKeyStatus() {
  const res = await fetchJSON('/key-status');
  return res.data;
}

// ── Products ──────────────────────────────────────────────────────────────

export async function getProducts() {
  const res = await fetchJSON('/products');
  return res.data || [];
}

export async function getProduct(id) {
  const res = await fetchJSON(`/products/${id}`);
  return res.data;
}

export async function createProduct(productData) {
  const res = await fetchJSON('/products', {
    method: 'POST',
    body: JSON.stringify(productData),
  });
  return res.data;
}

// ── Reviews ───────────────────────────────────────────────────────────────

export async function getReviews(productId) {
  const res = await fetchJSON(`/products/${productId}/reviews`);
  return res.data || [];
}

export async function addReview(productId, reviewer, text) {
  const res = await fetchJSON('/reviews', {
    method: 'POST',
    body: JSON.stringify({ product_id: productId, reviewer, text }),
  });
  return res.data;
}

// ── Sentiment / NLP ───────────────────────────────────────────────────────

export async function getSentiment(productId) {
  const res = await fetchJSON(`/products/${productId}/sentiment`);
  return res.data;
}

// ── Inventory / Demand Signals ────────────────────────────────────────────

export async function getInventory() {
  const res = await fetchJSON('/inventory');
  return res.data || [];
}

// ── Batch NLP & RAG Direct ────────────────────────────────────────────────

export async function analyzeBatch(reviews) {
  const res = await fetchJSON('/analyze', {
    method: 'POST',
    body: JSON.stringify({ reviews }),
  });
  return res.data || [];
}

export async function ragQuery(query, productId = null) {
  const body = { query };
  if (productId) body.product_id = productId;
  const res = await fetchJSON('/rag', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return res.data;
}

export const queryRag = ragQuery;


// ── File Upload ───────────────────────────────────────────────────────────

/**
 * Upload a file (CSV or JSON) to a products or reviews endpoint.
 * @param {'products'|'reviews'} type
 * @param {File} file
 */
export async function uploadFile(type, file) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/upload/${type}`, {
    method: 'POST',
    body: formData,
    // Do NOT set Content-Type header — browser sets multipart boundary automatically
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}


// ── Live Store Vendor API Integration ─────────────────────────────────────

/**
 * Fetch live store catalog and customer critique corpus.
 * Supports both local routes (e.g. /api/vendor-data) and full external URLs (https://...).
 * @param {string} endpointUrl
 */
export async function fetchVendorData(endpointUrl = '/vendor-data') {
  if (endpointUrl.startsWith('http://') || endpointUrl.startsWith('https://')) {
    const res = await fetch(endpointUrl);
    if (!res.ok) {
      throw new Error(`External API returned HTTP ${res.status}`);
    }
    return res.json();
  }
  const cleanPath = endpointUrl.startsWith('/api') ? endpointUrl.replace('/api', '') : endpointUrl;
  return fetchJSON(cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`);
}

/**
 * Send raw review texts to Gemini NLP engine for sentiment tier classification.
 * @param {string[]} reviews
 */
export async function analyzeReviewsBatch(reviews) {
  return fetchJSON('/analyze', {
    method: 'POST',
    body: JSON.stringify({ reviews }),
  });
}

/**
 * Commit synchronized vendor inventory counts and reviews into SQLite database.
 * @param {{ products: any[], reviews: any[], analyzed?: any[] }} payload
 */
export async function applyVendorData(payload) {
  return fetchJSON('/vendor-data/apply', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
