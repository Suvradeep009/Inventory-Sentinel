'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ProductReview, SentimentTier } from '@/lib/types';
import ProductThumbnail from '@/components/ProductThumbnail';
import { Search, Filter, MessageSquare, Star, ArrowUpDown } from 'lucide-react';

export default function CustomerFeedbackPage() {
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [tierCounts, setTierCounts] = useState<Record<SentimentTier, number>>({
    'Very Bad': 0,
    'Bad': 0,
    'Neutral': 0,
    'Good': 0,
    'Very Good': 0,
  });
  const [tierPercentages, setTierPercentages] = useState<Record<SentimentTier, number>>({
    'Very Bad': 0,
    'Bad': 0,
    'Neutral': 0,
    'Good': 0,
    'Very Good': 0,
  });
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedTier !== 'all') params.append('tier', selectedTier);
      if (searchTerm) params.append('search', searchTerm);

      const res = await fetch(`/api/reviews?${params.toString()}`);
      const data = await res.json();
      if (data.reviews) {
        setReviews(data.reviews);
        setTierCounts(data.tierCounts);
        setTierPercentages(data.tierPercentages);
      }
    } catch (err) {
      console.error('Error loading feedback:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [selectedTier]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchReviews();
  };

  const tiers: SentimentTier[] = ['Very Bad', 'Bad', 'Neutral', 'Good', 'Very Good'];

  const getTierBadge = (tier: SentimentTier) => {
    switch (tier) {
      case 'Very Bad':
        return <span className="badge badge-coral">Very Bad</span>;
      case 'Bad':
        return <span className="badge" style={{ backgroundColor: '#FFC4C4', color: '#000' }}>Bad</span>;
      case 'Neutral':
        return <span className="badge badge-neutral">Neutral</span>;
      case 'Good':
        return <span className="badge" style={{ backgroundColor: '#B8F4D6', color: '#000' }}>Good</span>;
      case 'Very Good':
        return <span className="badge badge-mint">Very Good</span>;
    }
  };

  return (
    <div className="container">
      {/* Header */}
      <div style={{
        borderBottom: 'var(--border-black)',
        paddingBottom: '20px',
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-neutral">CUSTOMER INTELLIGENCE</span>
            <span style={{ fontSize: '12px', color: 'var(--color-ink-muted)' }}>5-TIER SENTIMENT AUDIT</span>
          </div>
          <h1>Customer Feedback Classification</h1>
          <p style={{ color: 'var(--color-ink-muted)', marginTop: '4px', maxWidth: '700px' }}>
            Systematic classification of commercial customer reviews into 5 deterministic tiers. Identify operational defects, packaging failures, and high-demand product favorites.
          </p>
        </div>

        {/* Global Distribution Summary Bar */}
        <div className="panel" style={{ minWidth: '360px', padding: '14px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '11px', fontFamily: 'var(--font-subhead)', fontWeight: 700, textTransform: 'uppercase' }}>
            <span>Store Sentiment Composition</span>
            <span className="font-mono">{reviews.length} Active Records</span>
          </div>
          {/* Segmented Bar */}
          <div style={{
            display: 'flex',
            height: '14px',
            border: '1px solid #000',
            borderRadius: 'var(--radius-tight)',
            overflow: 'hidden',
            marginBottom: '8px'
          }}>
            <div style={{ width: `${tierPercentages['Very Bad']}%`, backgroundColor: 'var(--color-coral)' }} title={`Very Bad: ${tierPercentages['Very Bad']}%`} />
            <div style={{ width: `${tierPercentages['Bad']}%`, backgroundColor: '#FFC4C4' }} title={`Bad: ${tierPercentages['Bad']}%`} />
            <div style={{ width: `${tierPercentages['Neutral']}%`, backgroundColor: '#E0DDD4' }} title={`Neutral: ${tierPercentages['Neutral']}%`} />
            <div style={{ width: `${tierPercentages['Good']}%`, backgroundColor: '#B8F4D6' }} title={`Good: ${tierPercentages['Good']}%`} />
            <div style={{ width: `${tierPercentages['Very Good']}%`, backgroundColor: 'var(--color-mint)' }} title={`Very Good: ${tierPercentages['Very Good']}%`} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontFamily: 'var(--font-mono)' }}>
            <span style={{ color: '#D32F2F', fontWeight: 600 }}>NEG: {tierPercentages['Very Bad'] + tierPercentages['Bad']}%</span>
            <span style={{ color: '#666' }}>NEU: {tierPercentages['Neutral']}%</span>
            <span style={{ color: '#047857', fontWeight: 600 }}>POS: {tierPercentages['Good'] + tierPercentages['Very Good']}%</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="panel" style={{ padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          {/* Tier Filter Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, fontFamily: 'var(--font-subhead)', textTransform: 'uppercase', marginRight: '4px' }}>
              Tier:
            </span>
            <button
              onClick={() => setSelectedTier('all')}
              className={`btn btn-sm ${selectedTier === 'all' ? 'btn-black' : ''}`}
            >
              All ({reviews.length})
            </button>
            {tiers.map(t => (
              <button
                key={t}
                onClick={() => setSelectedTier(t)}
                className={`btn btn-sm ${selectedTier === t ? 'btn-black' : ''}`}
              >
                {t} ({tierCounts[t] || 0})
              </button>
            ))}
          </div>

          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '6px' }}>
            <input
              type="text"
              placeholder="Search feedback, product, theme..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="input-text"
              style={{ width: '260px', padding: '6px 10px', fontSize: '12px' }}
            />
            <button type="submit" className="btn btn-sm btn-black">
              <Search size={12} />
              Filter
            </button>
          </form>
        </div>
      </div>

      {/* 5-Tier Categorized Review Table */}
      <div className="panel" style={{ overflow: 'hidden' }}>
        <div className="panel-header">
          <div className="panel-title">
            <MessageSquare size={14} />
            Classified Customer Feedback Records
          </div>
          <span className="badge badge-neutral font-mono">
            {reviews.length} RECORDS DISPLAYED
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="editorial-table">
            <thead>
              <tr>
                <th style={{ width: '180px' }}>Customer & Date</th>
                <th style={{ width: '220px' }}>Product SKU</th>
                <th style={{ width: '120px' }}>Classification</th>
                <th style={{ width: '100px' }}>Rating</th>
                <th>Feedback Extract</th>
                <th style={{ width: '160px' }}>Key Theme</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: 'var(--color-ink-muted)' }}>
                    Loading customer feedback stream...
                  </td>
                </tr>
              ) : reviews.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: 'var(--color-ink-muted)' }}>
                    No reviews matching current filter criteria.
                  </td>
                </tr>
              ) : (
                reviews.map(r => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.reviewerName}</div>
                      <div className="font-mono" style={{ fontSize: '11px', color: 'var(--color-ink-muted)' }}>
                        {new Date(r.date).toLocaleDateString()}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <ProductThumbnail
                          title={r.productTitle}
                          category={r.category}
                          size={28}
                          productId={r.productId}
                        />
                        <div>
                          <Link href={`/insights?productId=${r.productId}`} title={`Diagnose SKU #${r.productId}`} style={{ color: 'inherit' }}>
                            <div style={{ fontWeight: 600 }}>{r.productTitle}</div>
                          </Link>
                          <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--color-ink-muted)' }}>
                            {r.category} &bull; SKU #{r.productId}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>{getTierBadge(r.sentimentTier)}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span className="font-mono" style={{ fontWeight: 700 }}>{r.rating}.0</span>
                        <Star size={11} fill="#000" color="#000" />
                      </div>
                    </td>
                    <td style={{ lineHeight: 1.4 }}>
                      <span style={{ fontStyle: 'italic', color: 'var(--color-ink)' }}>
                        &ldquo;{r.comment}&rdquo;
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-neutral" style={{ fontSize: '10px' }}>
                        {r.keyTheme || 'Feedback'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
