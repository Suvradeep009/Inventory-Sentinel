export type SentimentTier = 'Very Bad' | 'Bad' | 'Neutral' | 'Good' | 'Very Good';

export type RestockSignal = 'HALT_RESTOCK' | 'INCREASE_ORDERS' | 'STABLE';

export interface ProductReview {
  id: string;
  productId: number;
  productTitle: string;
  category: string;
  rating: number;
  comment: string;
  reviewerName: string;
  reviewerEmail?: string;
  date: string;
  sentimentTier: SentimentTier;
  sentimentScore: number; // 1 to 5 scale
  keyTheme?: string;
}

export interface Product {
  id: number;
  title: string;
  category: string;
  price: number;
  stock: number;
  rating: number;
  thumbnail: string;
  reviews: ProductReview[];
  metrics: {
    totalReviews: number;
    veryBadCount: number;
    badCount: number;
    neutralCount: number;
    goodCount: number;
    veryGoodCount: number;
    negativeRatio: number; // (veryBad + bad) / total
    positiveRatio: number; // (veryGood + good) / total
    neutralRatio: number;
    satisfactionIndex: number; // 0 to 100
    restockSignal: RestockSignal;
    signalReason: string;
    recommendedOrderQty: number;
    estimatedCapitalRisk: number;
  };
}

export interface InventoryStats {
  totalSkus: number;
  totalStockUnits: number;
  totalCustomerReviews: number;
  haltRestockCount: number;
  increaseOrdersCount: number;
  stableCount: number;
  averageSatisfactionIndex: number;
  lastSyncedAt: string | null;
}

export interface DiagnosticQueryRequest {
  productId?: number;
  query: string;
}

export interface DiagnosticQueryResponse {
  executiveFinding: string;
  sentimentRootCause: string;
  inventoryActionRecommendation: 'HALT_PURCHASE' | 'SURGE_ORDER' | 'MAINTAIN_STOCK';
  actionDetails: string;
  relevantComments: Array<{
    author: string;
    rating: number;
    comment: string;
    tier: SentimentTier;
  }>;
  productContext?: {
    id: number;
    title: string;
    category: string;
    stock: number;
    restockSignal: RestockSignal;
    positiveRatio: number;
    negativeRatio: number;
  };
}
