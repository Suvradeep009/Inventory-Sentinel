import { NextResponse } from 'next/server';
import { loadStore, saveStore, calculateProductMetrics, getInventoryStats } from '@/lib/store';
import { classifyReviewsWithGemini } from '@/lib/gemini';
import { Product, ProductReview } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    let limit = 20;
    try {
      const body = await request.json();
      if (body?.limit && typeof body.limit === 'number') {
        limit = Math.min(Math.max(body.limit, 5), 50);
      }
    } catch {
      // Body empty or not JSON, use default limit
    }

    // 1. Fetch live payloads from DummyJSON
    const res = await fetch(`https://dummyjson.com/products?limit=${limit}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch from store source: ${res.statusText}`);
    }

    const payload = await res.json();
    const rawProducts = payload.products || [];

    // 2. Extract and format reviews for classification
    const reviewsToClassify: Array<{ id: string; comment: string; rating: number; productId: number; rawReview: any }> = [];

    rawProducts.forEach((p: any) => {
      const reviews = p.reviews || [];
      reviews.forEach((r: any, idx: number) => {
        const reviewId = `rev-${p.id}-${idx}`;
        reviewsToClassify.push({
          id: reviewId,
          comment: r.comment || 'No comment provided',
          rating: Number(r.rating) || 3,
          productId: p.id,
          rawReview: r,
        });
      });
    });

    // 3. Batch classify reviews via Gemini
    const classifiedResults = await classifyReviewsWithGemini(
      reviewsToClassify.map(r => ({ id: r.id, comment: r.comment, rating: r.rating }))
    );

    const classificationMap = new Map<string, typeof classifiedResults[0]>();
    classifiedResults.forEach(c => classificationMap.set(c.id, c));

    // 4. Map ingested products and reviews into internal state
    const processedProducts: Product[] = rawProducts.map((p: any) => {
      const reviews: ProductReview[] = (p.reviews || []).map((r: any, idx: number) => {
        const reviewId = `rev-${p.id}-${idx}`;
        const classified = classificationMap.get(reviewId);
        return {
          id: reviewId,
          productId: p.id,
          productTitle: p.title,
          category: p.category || 'General',
          rating: Number(r.rating) || 3,
          comment: r.comment || '',
          reviewerName: r.reviewerName || 'Verified Customer',
          reviewerEmail: r.reviewerEmail,
          date: r.date || new Date().toISOString(),
          sentimentTier: classified?.sentimentTier || 'Neutral',
          sentimentScore: classified?.sentimentScore || 3,
          keyTheme: classified?.keyTheme || 'Feedback',
        };
      });

      const metrics = calculateProductMetrics(reviews, Number(p.stock) || 0, Number(p.price) || 0);

      return {
        id: p.id,
        title: p.title,
        category: p.category,
        price: Number(p.price) || 0,
        stock: Number(p.stock) || 0,
        rating: Number(p.rating) || 0,
        thumbnail: p.thumbnail || (p.images && p.images[0]) || '',
        reviews,
        metrics,
      };
    });

    // 5. Persist to internal state
    saveStore(processedProducts);

    const stats = getInventoryStats(processedProducts, new Date().toISOString());

    return NextResponse.json({
      success: true,
      message: `Successfully ingested ${processedProducts.length} store items and classified ${reviewsToClassify.length} customer feedback records.`,
      count: processedProducts.length,
      reviewsCount: reviewsToClassify.length,
      stats,
    });
  } catch (error: any) {
    console.error('Data Ingestion Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Data synchronization failed' },
      { status: 500 }
    );
  }
}

export async function GET() {
  const store = loadStore();
  const stats = getInventoryStats(store.products, store.lastSyncedAt);
  return NextResponse.json({
    lastSyncedAt: store.lastSyncedAt,
    productsCount: store.products.length,
    stats,
  });
}
