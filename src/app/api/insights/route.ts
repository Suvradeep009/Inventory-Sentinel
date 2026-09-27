import { NextResponse } from 'next/server';
import { loadStore } from '@/lib/store';
import { synthesizeDiagnosticsMemo } from '@/lib/gemini';
import { ProductReview } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const query = (body?.query || '').trim();
    const explicitProductId = body?.productId ? Number(body.productId) : undefined;

    if (!query) {
      return NextResponse.json(
        { error: 'Operational inquiry prompt cannot be empty' },
        { status: 400 }
      );
    }

    const store = loadStore();
    const products = store.products;

    // 1. Metadata Pre-Filtering: Isolate product context
    let targetProduct = explicitProductId ? products.find(p => p.id === explicitProductId) : undefined;

    // If not explicitly selected, search if query mentions a product title
    if (!targetProduct) {
      const qLower = query.toLowerCase();
      targetProduct = products.find(p =>
        qLower.includes(p.title.toLowerCase()) ||
        qLower.includes(p.title.toLowerCase().split(' ')[0])
      );
    }

    // 2. Candidate review pool
    let candidateReviews: ProductReview[] = [];
    if (targetProduct) {
      // Strictly pre-filtered to this product's reviews
      candidateReviews = [...targetProduct.reviews];
    } else {
      // Store-wide candidate reviews
      candidateReviews = products.flatMap(p => p.reviews);
    }

    // 3. Relevance ranking
    const queryTerms = query.toLowerCase().split(/\s+/).filter((t: string) => t.length > 2);
    
    const scoredReviews = candidateReviews.map(r => {
      let score = 0;
      const text = `${r.comment} ${r.productTitle} ${r.category} ${r.keyTheme || ''}`.toLowerCase();
      queryTerms.forEach((term: string) => {
        if (text.includes(term)) score += 2;
      });
      // Boost reviews with extreme sentiments (Very Bad or Very Good) for operational diagnostics
      if (r.sentimentTier === 'Very Bad' || r.sentimentTier === 'Very Good') {
        score += 1;
      }
      return { review: r, score };
    });

    scoredReviews.sort((a, b) => b.score - a.score);
    const topReviews = scoredReviews.slice(0, 6).map(item => ({
      author: item.review.reviewerName,
      rating: item.review.rating,
      comment: item.review.comment,
      tier: item.review.sentimentTier,
    }));

    // 4. Synthesize diagnostic memo via Gemini
    const memo = await synthesizeDiagnosticsMemo({
      productContext: targetProduct ? {
        id: targetProduct.id,
        title: targetProduct.title,
        category: targetProduct.category,
        stock: targetProduct.stock,
        price: targetProduct.price,
        positiveRatio: targetProduct.metrics.positiveRatio,
        negativeRatio: targetProduct.metrics.negativeRatio,
        restockSignal: targetProduct.metrics.restockSignal,
        signalReason: targetProduct.metrics.signalReason,
      } : undefined,
      relevantReviews: topReviews,
      userQuery: query,
    });

    return NextResponse.json({
      executiveFinding: memo.executiveFinding,
      sentimentRootCause: memo.sentimentRootCause,
      inventoryActionRecommendation: memo.inventoryActionRecommendation,
      actionDetails: memo.actionDetails,
      relevantComments: topReviews,
      productContext: targetProduct ? {
        id: targetProduct.id,
        title: targetProduct.title,
        category: targetProduct.category,
        stock: targetProduct.stock,
        restockSignal: targetProduct.metrics.restockSignal,
        positiveRatio: targetProduct.metrics.positiveRatio,
        negativeRatio: targetProduct.metrics.negativeRatio,
        signalReason: targetProduct.metrics.signalReason,
      } : null,
    });
  } catch (error: any) {
    console.error('Diagnostic error:', error);
    return NextResponse.json(
      { error: error.message || 'Diagnostic synthesis failed' },
      { status: 500 }
    );
  }
}
