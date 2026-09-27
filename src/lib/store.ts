import fs from 'fs';
import path from 'path';
import { Product, ProductReview, RestockSignal, InventoryStats } from './types';

const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'inventory_v2.json');

// Threshold Mathematics Rules:
// 1. Halt restocks if negative ratio (Very Bad + Bad) >= 45% (0.45)
// 2. Increase orders if positive ratio (Very Good + Good) >= 65% (0.65)
// 3. Otherwise maintain standard replenishment
export function calculateProductMetrics(reviews: ProductReview[], stock: number, price: number): Product['metrics'] {
  const total = reviews.length;
  let veryBad = 0;
  let bad = 0;
  let neutral = 0;
  let good = 0;
  let veryGood = 0;

  for (const r of reviews) {
    if (r.sentimentTier === 'Very Bad') veryBad++;
    else if (r.sentimentTier === 'Bad') bad++;
    else if (r.sentimentTier === 'Neutral') neutral++;
    else if (r.sentimentTier === 'Good') good++;
    else if (r.sentimentTier === 'Very Good') veryGood++;
  }

  const negativeRatio = total > 0 ? (veryBad + bad) / total : 0;
  const positiveRatio = total > 0 ? (veryGood + good) / total : 0;
  const neutralRatio = total > 0 ? neutral / total : 0;

  // Calculate Satisfaction Index on a 0-100 scale
  // Very Bad = 0, Bad = 25, Neutral = 50, Good = 75, Very Good = 100
  const satisfactionIndex = total > 0
    ? Math.round(((veryBad * 0) + (bad * 25) + (neutral * 50) + (good * 75) + (veryGood * 100)) / total)
    : 50;

  let restockSignal: RestockSignal = 'STABLE';
  let signalReason = 'Customer sentiment within standard operational variance.';
  let recommendedOrderQty = 0;

  if (negativeRatio >= 0.45) {
    restockSignal = 'HALT_RESTOCK';
    signalReason = `Negative feedback ratio is ${(negativeRatio * 100).toFixed(1)}% (Threshold \u2265 45%). Purchasing suspended to prevent return losses.`;
    recommendedOrderQty = 0; // Frozen
  } else if (positiveRatio >= 0.65) {
    restockSignal = 'INCREASE_ORDERS';
    signalReason = `Positive feedback ratio is ${(positiveRatio * 100).toFixed(1)}% (Threshold \u2265 65%). High demand velocity indicates reorder surge (+50%).`;
    const targetBuffer = 120;
    recommendedOrderQty = Math.max(25, Math.round((targetBuffer - stock) * 1.5));
  } else {
    restockSignal = 'STABLE';
    signalReason = `Positive ratio ${(positiveRatio * 100).toFixed(1)}% / Negative ratio ${(negativeRatio * 100).toFixed(1)}%. Normal replenishment pace.`;
    const targetBuffer = 60;
    recommendedOrderQty = Math.max(10, targetBuffer - stock);
  }

  // Capital at risk if product has high negative feedback or low turnover
  const estimatedCapitalRisk = restockSignal === 'HALT_RESTOCK'
    ? Math.round(stock * price)
    : Math.round(stock * price * (negativeRatio * 0.5));

  return {
    totalReviews: total,
    veryBadCount: veryBad,
    badCount: bad,
    neutralCount: neutral,
    goodCount: good,
    veryGoodCount: veryGood,
    negativeRatio,
    positiveRatio,
    neutralRatio,
    satisfactionIndex,
    restockSignal,
    signalReason,
    recommendedOrderQty,
    estimatedCapitalRisk,
  };
}

// Initial seed catalog to provide immediate rich data
const INITIAL_SEEDED_PRODUCTS: Product[] = [
  {
    id: 1,
    title: "Essence Mascara Lash Princess",
    category: "beauty",
    price: 9.99,
    stock: 99,
    rating: 2.56,
    thumbnail: "https://cdn.dummyjson.com/product-images/beauty/essence-mascara-lash-princess/thumbnail.webp",
    reviews: [
      {
        id: "rev-1-1",
        productId: 1,
        productTitle: "Essence Mascara Lash Princess",
        category: "beauty",
        rating: 1,
        comment: "Would not recommend! Flakes into eyes and causes severe irritation.",
        reviewerName: "Eleanor Collins",
        date: "2025-04-30T09:41:02.053Z",
        sentimentTier: "Very Bad",
        sentimentScore: 1,
        keyTheme: "Eye irritation"
      },
      {
        id: "rev-1-2",
        productId: 1,
        productTitle: "Essence Mascara Lash Princess",
        category: "beauty",
        rating: 2,
        comment: "Formula dried out within two days of opening. Very disappointed.",
        reviewerName: "Lucas Gordon",
        date: "2025-05-02T10:15:00.000Z",
        sentimentTier: "Bad",
        sentimentScore: 2,
        keyTheme: "Formula dried out"
      },
      {
        id: "rev-1-3",
        productId: 1,
        productTitle: "Essence Mascara Lash Princess",
        category: "beauty",
        rating: 4,
        comment: "Decent volume for the low price, brush is a bit large.",
        reviewerName: "Sarah Jenkins",
        date: "2025-05-10T14:20:00.000Z",
        sentimentTier: "Good",
        sentimentScore: 4,
        keyTheme: "Budget value"
      }
    ],
    metrics: {
      totalReviews: 3,
      veryBadCount: 1,
      badCount: 1,
      neutralCount: 0,
      goodCount: 1,
      veryGoodCount: 0,
      negativeRatio: 0.667, // 66.7% >= 45% -> HALT
      positiveRatio: 0.333,
      neutralRatio: 0,
      satisfactionIndex: 33,
      restockSignal: "HALT_RESTOCK",
      signalReason: "Negative feedback ratio is 66.7% (Threshold \u2265 45%). Purchasing suspended to prevent return losses.",
      recommendedOrderQty: 0,
      estimatedCapitalRisk: 989
    }
  },
  {
    id: 2,
    title: "Eyeshadow Palette with Mirror",
    category: "beauty",
    price: 19.99,
    stock: 24,
    rating: 4.86,
    thumbnail: "https://cdn.dummyjson.com/product-images/beauty/eyeshadow-palette-with-mirror/thumbnail.webp",
    reviews: [
      {
        id: "rev-2-1",
        productId: 2,
        productTitle: "Eyeshadow Palette with Mirror",
        category: "beauty",
        rating: 5,
        comment: "Great product! Pigments are gorgeous, velvety, and blend like butter.",
        reviewerName: "Savannah Gomez",
        date: "2025-04-30T09:41:02.053Z",
        sentimentTier: "Very Good",
        sentimentScore: 5,
        keyTheme: "Velvety pigment"
      },
      {
        id: "rev-2-2",
        productId: 2,
        productTitle: "Eyeshadow Palette with Mirror",
        category: "beauty",
        rating: 5,
        comment: "Awesome product! Compact mirror is solid and shadows stay on all day.",
        reviewerName: "Christian Perez",
        date: "2025-05-01T11:00:00.000Z",
        sentimentTier: "Very Good",
        sentimentScore: 5,
        keyTheme: "Long-lasting wear"
      },
      {
        id: "rev-2-3",
        productId: 2,
        productTitle: "Eyeshadow Palette with Mirror",
        category: "beauty",
        rating: 4,
        comment: "Good daily wear shades. Shippers packed it securely with bubble wrap.",
        reviewerName: "Nicholas Bailey",
        date: "2025-05-03T16:40:00.000Z",
        sentimentTier: "Good",
        sentimentScore: 4,
        keyTheme: "Secure packaging"
      }
    ],
    metrics: {
      totalReviews: 3,
      veryBadCount: 0,
      badCount: 0,
      neutralCount: 0,
      goodCount: 1,
      veryGoodCount: 2,
      negativeRatio: 0.0,
      positiveRatio: 1.0, // 100% >= 65% -> INCREASE
      neutralRatio: 0.0,
      satisfactionIndex: 92,
      restockSignal: "INCREASE_ORDERS",
      signalReason: "Positive feedback ratio is 100.0% (Threshold \u2265 65%). High demand velocity indicates reorder surge (+50%).",
      recommendedOrderQty: 144,
      estimatedCapitalRisk: 0
    }
  },
  {
    id: 3,
    title: "Powder Canister Matte Finish",
    category: "beauty",
    price: 14.99,
    stock: 45,
    rating: 3.82,
    thumbnail: "https://cdn.dummyjson.com/product-images/beauty/powder-canister/thumbnail.webp",
    reviews: [
      {
        id: "rev-3-1",
        productId: 3,
        productTitle: "Powder Canister Matte Finish",
        category: "beauty",
        rating: 3,
        comment: "Decent powder, does reduce shine but can look cakey in dry weather.",
        reviewerName: "Marcus Vance",
        date: "2025-05-04T12:00:00.000Z",
        sentimentTier: "Neutral",
        sentimentScore: 3,
        keyTheme: "Mixed texture"
      },
      {
        id: "rev-3-2",
        productId: 3,
        productTitle: "Powder Canister Matte Finish",
        category: "beauty",
        rating: 4,
        comment: "Good value and controls oil during long shifts at the office.",
        reviewerName: "Aaliyah Roy",
        date: "2025-05-06T09:30:00.000Z",
        sentimentTier: "Good",
        sentimentScore: 4,
        keyTheme: "Oil control"
      },
      {
        id: "rev-3-3",
        productId: 3,
        productTitle: "Powder Canister Matte Finish",
        category: "beauty",
        rating: 3,
        comment: "Nothing special, standard packaging and powder puff is flimsy.",
        reviewerName: "David Cole",
        date: "2025-05-08T18:10:00.000Z",
        sentimentTier: "Neutral",
        sentimentScore: 3,
        keyTheme: "Flimsy applicator"
      }
    ],
    metrics: {
      totalReviews: 3,
      veryBadCount: 0,
      badCount: 0,
      neutralCount: 2,
      goodCount: 1,
      veryGoodCount: 0,
      negativeRatio: 0.0,
      positiveRatio: 0.333,
      neutralRatio: 0.667,
      satisfactionIndex: 58,
      restockSignal: "STABLE",
      signalReason: "Positive ratio 33.3% / Negative ratio 0.0%. Normal replenishment pace.",
      recommendedOrderQty: 15,
      estimatedCapitalRisk: 0
    }
  },
  {
    id: 4,
    title: "Red Lipstick Luxe Satin",
    category: "beauty",
    price: 12.99,
    stock: 18,
    rating: 2.10,
    thumbnail: "https://cdn.dummyjson.com/product-images/beauty/red-lipstick/thumbnail.webp",
    reviews: [
      {
        id: "rev-4-1",
        productId: 4,
        productTitle: "Red Lipstick Luxe Satin",
        category: "beauty",
        rating: 1,
        comment: "Broke at the base the very first time I twisted it up! Complete waste of money.",
        reviewerName: "Chloe Martin",
        date: "2025-05-02T13:45:00.000Z",
        sentimentTier: "Very Bad",
        sentimentScore: 1,
        keyTheme: "Broken packaging"
      },
      {
        id: "rev-4-2",
        productId: 4,
        productTitle: "Red Lipstick Luxe Satin",
        category: "beauty",
        rating: 2,
        comment: "Color smears easily and stains teeth. Will return this item.",
        reviewerName: "Emma Watson",
        date: "2025-05-05T14:15:00.000Z",
        sentimentTier: "Bad",
        sentimentScore: 2,
        keyTheme: "Color smearing"
      }
    ],
    metrics: {
      totalReviews: 2,
      veryBadCount: 1,
      badCount: 1,
      neutralCount: 0,
      goodCount: 0,
      veryGoodCount: 0,
      negativeRatio: 1.0, // 100% >= 45% -> HALT
      positiveRatio: 0.0,
      neutralRatio: 0.0,
      satisfactionIndex: 12,
      restockSignal: "HALT_RESTOCK",
      signalReason: "Negative feedback ratio is 100.0% (Threshold \u2265 45%). Purchasing suspended to prevent return losses.",
      recommendedOrderQty: 0,
      estimatedCapitalRisk: 234
    }
  },
  {
    id: 5,
    title: "Red Nail Polish Gloss",
    category: "beauty",
    price: 8.99,
    stock: 12,
    rating: 4.75,
    thumbnail: "https://cdn.dummyjson.com/product-images/beauty/red-nail-polish/thumbnail.webp",
    reviews: [
      {
        id: "rev-5-1",
        productId: 5,
        productTitle: "Red Nail Polish Gloss",
        category: "beauty",
        rating: 5,
        comment: "Brilliant salon shine! Dried in 60 seconds without streaks.",
        reviewerName: "Jessica Lee",
        date: "2025-05-07T11:05:00.000Z",
        sentimentTier: "Very Good",
        sentimentScore: 5,
        keyTheme: "Fast drying"
      },
      {
        id: "rev-5-2",
        productId: 5,
        productTitle: "Red Nail Polish Gloss",
        category: "beauty",
        rating: 5,
        comment: "Highly recommend! Rich color in one coat and lasted a full week.",
        reviewerName: "Zoe Foster",
        date: "2025-05-09T17:22:00.000Z",
        sentimentTier: "Very Good",
        sentimentScore: 5,
        keyTheme: "High durability"
      }
    ],
    metrics: {
      totalReviews: 2,
      veryBadCount: 0,
      badCount: 0,
      neutralCount: 0,
      goodCount: 0,
      veryGoodCount: 2,
      negativeRatio: 0.0,
      positiveRatio: 1.0, // 100% >= 65% -> INCREASE
      neutralRatio: 0.0,
      satisfactionIndex: 100,
      restockSignal: "INCREASE_ORDERS",
      signalReason: "Positive feedback ratio is 100.0% (Threshold \u2265 65%). High demand velocity indicates reorder surge (+50%).",
      recommendedOrderQty: 162,
      estimatedCapitalRisk: 0
    }
  }
];

interface StoreData {
  products: Product[];
  lastSyncedAt: string;
}

let _memoryStore: StoreData | null = null;

const BUNDLED_DATA_FILE = path.join(process.cwd(), '.data', 'inventory_v2.json');
const WRITABLE_DIR = process.env.VERCEL ? path.join('/tmp', '.data') : path.join(process.cwd(), '.data');
const WRITABLE_FILE = path.join(WRITABLE_DIR, 'inventory_v2.json');

function ensureDataDir(): void {
  try {
    if (!fs.existsSync(WRITABLE_DIR)) {
      fs.mkdirSync(WRITABLE_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn('Could not create writable data dir:', err);
  }
}

export function loadStore(): StoreData {
  if (_memoryStore && _memoryStore.products.length > 0) {
    return _memoryStore;
  }

  // 1. Try reading from writable /tmp path
  try {
    if (fs.existsSync(WRITABLE_FILE)) {
      const raw = fs.readFileSync(WRITABLE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.products) && parsed.products.length > 0) {
        _memoryStore = parsed;
        return parsed;
      }
    }
  } catch {
    // Ignore and fallback
  }

  // 2. Try reading from bundled static path in repository
  try {
    if (fs.existsSync(BUNDLED_DATA_FILE)) {
      const raw = fs.readFileSync(BUNDLED_DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.products) && parsed.products.length > 0) {
        _memoryStore = parsed;
        return parsed;
      }
    }
  } catch {
    // Ignore and fallback
  }

  // 3. Fallback to hardcoded initial seeded products
  const initialData: StoreData = {
    products: INITIAL_SEEDED_PRODUCTS,
    lastSyncedAt: new Date().toISOString(),
  };
  _memoryStore = initialData;
  saveStore(initialData.products);
  return initialData;
}

export function saveStore(products: Product[]): void {
  const data: StoreData = {
    products,
    lastSyncedAt: new Date().toISOString(),
  };
  _memoryStore = data;

  ensureDataDir();
  try {
    fs.writeFileSync(WRITABLE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not persist store to disk (in-memory store active):', err);
  }
}

export function getInventoryStats(products: Product[], lastSyncedAt: string | null): InventoryStats {
  let totalStock = 0;
  let totalReviews = 0;
  let haltCount = 0;
  let increaseCount = 0;
  let stableCount = 0;
  let satisfactionSum = 0;

  for (const p of products) {
    totalStock += p.stock;
    totalReviews += p.reviews.length;
    satisfactionSum += p.metrics.satisfactionIndex;
    if (p.metrics.restockSignal === 'HALT_RESTOCK') haltCount++;
    else if (p.metrics.restockSignal === 'INCREASE_ORDERS') increaseCount++;
    else stableCount++;
  }

  return {
    totalSkus: products.length,
    totalStockUnits: totalStock,
    totalCustomerReviews: totalReviews,
    haltRestockCount: haltCount,
    increaseOrdersCount: increaseCount,
    stableCount: stableCount,
    averageSatisfactionIndex: products.length > 0 ? Math.round(satisfactionSum / products.length) : 0,
    lastSyncedAt,
  };
}
