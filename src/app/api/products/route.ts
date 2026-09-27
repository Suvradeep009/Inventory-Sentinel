import { NextResponse } from 'next/server';
import { loadStore, getInventoryStats } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const signal = searchParams.get('signal');
    const search = searchParams.get('search')?.toLowerCase();
    const sort = searchParams.get('sort');

    const store = loadStore();
    let products = [...store.products];

    // Filter by category
    if (category && category !== 'all') {
      products = products.filter(p => p.category.toLowerCase() === category.toLowerCase());
    }

    // Filter by restock signal
    if (signal && signal !== 'all') {
      products = products.filter(p => p.metrics.restockSignal === signal);
    }

    // Search by title or category
    if (search) {
      products = products.filter(p =>
        p.title.toLowerCase().includes(search) ||
        p.category.toLowerCase().includes(search)
      );
    }

    // Sorting
    if (sort === 'stock_asc') {
      products.sort((a, b) => a.stock - b.stock);
    } else if (sort === 'stock_desc') {
      products.sort((a, b) => b.stock - a.stock);
    } else if (sort === 'satisfaction_desc') {
      products.sort((a, b) => b.metrics.satisfactionIndex - a.metrics.satisfactionIndex);
    } else if (sort === 'satisfaction_asc') {
      products.sort((a, b) => a.metrics.satisfactionIndex - b.metrics.satisfactionIndex);
    } else if (sort === 'risk_desc') {
      products.sort((a, b) => b.metrics.estimatedCapitalRisk - a.metrics.estimatedCapitalRisk);
    } else if (sort === 'negative_ratio_desc') {
      products.sort((a, b) => b.metrics.negativeRatio - a.metrics.negativeRatio);
    } else if (sort === 'positive_ratio_desc') {
      products.sort((a, b) => b.metrics.positiveRatio - a.metrics.positiveRatio);
    }

    const categories = Array.from(new Set(store.products.map(p => p.category)));
    const stats = getInventoryStats(store.products, store.lastSyncedAt);

    return NextResponse.json({
      products,
      categories,
      stats,
      total: products.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve products' },
      { status: 500 }
    );
  }
}
