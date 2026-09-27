import { NextResponse } from 'next/server';
import { loadStore } from '@/lib/store';
import { ProductReview, SentimentTier } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tier = searchParams.get('tier');
    const productId = searchParams.get('productId');
    const category = searchParams.get('category');
    const search = searchParams.get('search')?.toLowerCase();

    const store = loadStore();
    let allReviews: ProductReview[] = [];

    for (const p of store.products) {
      allReviews.push(...p.reviews);
    }

    // Filter by tier
    if (tier && tier !== 'all') {
      allReviews = allReviews.filter(r => r.sentimentTier === tier);
    }

    // Filter by product ID
    if (productId && productId !== 'all') {
      allReviews = allReviews.filter(r => r.productId === Number(productId));
    }

    // Filter by category
    if (category && category !== 'all') {
      allReviews = allReviews.filter(r => r.category.toLowerCase() === category.toLowerCase());
    }

    // Filter by search query
    if (search) {
      allReviews = allReviews.filter(r =>
        r.comment.toLowerCase().includes(search) ||
        r.productTitle.toLowerCase().includes(search) ||
        r.reviewerName.toLowerCase().includes(search) ||
        (r.keyTheme && r.keyTheme.toLowerCase().includes(search))
      );
    }

    // Aggregate counts across all reviews in the store
    const totalStoreReviews = store.products.flatMap(p => p.reviews);
    const tierCounts: Record<SentimentTier, number> = {
      'Very Bad': 0,
      'Bad': 0,
      'Neutral': 0,
      'Good': 0,
      'Very Good': 0,
    };

    totalStoreReviews.forEach(r => {
      if (tierCounts[r.sentimentTier] !== undefined) {
        tierCounts[r.sentimentTier]++;
      }
    });

    const totalCount = totalStoreReviews.length;
    const tierPercentages: Record<SentimentTier, number> = {
      'Very Bad': totalCount > 0 ? Math.round((tierCounts['Very Bad'] / totalCount) * 100) : 0,
      'Bad': totalCount > 0 ? Math.round((tierCounts['Bad'] / totalCount) * 100) : 0,
      'Neutral': totalCount > 0 ? Math.round((tierCounts['Neutral'] / totalCount) * 100) : 0,
      'Good': totalCount > 0 ? Math.round((tierCounts['Good'] / totalCount) * 100) : 0,
      'Very Good': totalCount > 0 ? Math.round((tierCounts['Very Good'] / totalCount) * 100) : 0,
    };

    return NextResponse.json({
      reviews: allReviews,
      totalFiltered: allReviews.length,
      totalStore: totalCount,
      tierCounts,
      tierPercentages,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}
