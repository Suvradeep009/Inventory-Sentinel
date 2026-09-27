import { useState, useEffect } from 'react';
import { getProducts, getSentiment, addReview, getKeyStatus } from '../api';
import ReviewTable from '../components/ReviewTable';

const TIERS = [
  { key: 'VERY_BAD',  label: 'Very Bad',  pillClass: 'pill-badge--coral',   border: 'var(--coral-accent)' },
  { key: 'BAD',       label: 'Bad',       pillClass: 'pill-badge--coral',   border: 'var(--coral-light)'  },
  { key: 'NEUTRAL',   label: 'Neutral',   pillClass: 'pill-badge--neutral', border: 'var(--neutral-bone)' },
  { key: 'GOOD',      label: 'Good',      pillClass: 'pill-badge--mint',    border: 'var(--mint-light)'   },
  { key: 'VERY_GOOD', label: 'Very Good', pillClass: 'pill-badge--mint',    border: 'var(--mint-accent)'  },
];

export default function SentimentPage() {
  const [products, setProducts]       = useState([]);
  const [selectedId, setSelectedId]   = useState(null);
  const [sentiment, setSentiment]     = useState(null);
  const [keyInfo, setKeyInfo]         = useState(null);

  // New review state
  const [reviewerName, setReviewerName] = useState('MerchandiseManager');
  const [newReviewText, setNewReviewText] = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [activeTab, setActiveTab]     = useState('ALL');
  const [viewMode, setViewMode]       = useState('COLUMNS'); // 'COLUMNS' | 'TABLE'

  useEffect(() => {
    getKeyStatus().then(setKeyInfo).catch(console.error);
    getProducts().then((data) => {
      setProducts(data);
      if (data.length > 0) setSelectedId(data[0].id);
    }).catch(console.error);
  }, []);

  const loadProductSentiment = (pid) => {
    if (!pid) return;
    getSentiment(pid)
      .then(setSentiment)
      .catch(console.error);
  };

  useEffect(() => {
    if (selectedId) {
      loadProductSentiment(selectedId);
    }
  }, [selectedId]);

  const handleAddReview = async (e) => {
    e.preventDefault();
    if (!selectedId || !newReviewText.trim()) return;

    setSubmitting(true);
    try {
      await addReview(selectedId, reviewerName, newReviewText.trim());
      setNewReviewText('');
      loadProductSentiment(selectedId);
    } catch (err) {
      console.error('Failed to submit review:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const reviews = sentiment?.reviews || [];

  // Group reviews into the 5 strictly bucketed categories
  const bucketedReviews = {
    VERY_BAD:  reviews.filter((r) => r.tier === 'VERY_BAD'),
    BAD:       reviews.filter((r) => r.tier === 'BAD'),
    NEUTRAL:   reviews.filter((r) => r.tier === 'NEUTRAL'),
    GOOD:      reviews.filter((r) => r.tier === 'GOOD'),
    VERY_GOOD: reviews.filter((r) => r.tier === 'VERY_GOOD'),
  };

  const filteredReviews = activeTab === 'ALL'
    ? reviews
    : reviews.filter((r) => r.tier === activeTab);

  const negPct = sentiment
    ? (sentiment.percentages?.VERY_BAD || 0) + (sentiment.percentages?.BAD || 0)
    : 0;
  const posPct = sentiment
    ? (sentiment.percentages?.VERY_GOOD || 0) + (sentiment.percentages?.GOOD || 0)
    : 0;

  const currentProduct = products.find((p) => p.id === selectedId);

  return (
    <div className="page-wrapper">
      {/* Header */}
      <header className="masthead">
        <div className="masthead__top">
          <span>SECTION 02 // CUSTOMER FEEDBACK</span>
          <span>5-TIER SATISFACTION BREAKDOWN</span>
          <span>{keyInfo?.has_key ? '● LIVE MONITORING ACTIVE' : '● STANDARD MODE'}</span>
        </div>
        <h1 className="masthead__title">Customer Feedback</h1>
        <p className="masthead__lead">
          Live categorization of customer reviews into actionable satisfaction tiers.
        </p>
      </header>

      {/* Product Selection Bar */}
      <div
        className="table-card"
        style={{
          padding: '1.25rem 1.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>
            SELECT CATALOG ITEM:
          </span>
          <select
            className="editorial-select"
            value={selectedId || ''}
            onChange={(e) => setSelectedId(Number(e.target.value))}
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                [{p.sku}] {p.name} — ₹{Number(p.price).toLocaleString('en-IN')} ({p.stock} in stock)
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            className={`btn-pill ${viewMode === 'COLUMNS' ? 'btn-pill--black' : 'btn-pill--outline'}`}
            style={{ padding: '0.4rem 1rem', fontSize: '0.74rem' }}
            onClick={() => setViewMode('COLUMNS')}
          >
            5-Column Buckets
          </button>
          <button
            type="button"
            className={`btn-pill ${viewMode === 'TABLE' ? 'btn-pill--black' : 'btn-pill--outline'}`}
            style={{ padding: '0.4rem 1rem', fontSize: '0.74rem' }}
            onClick={() => setViewMode('TABLE')}
          >
            Magazine Data Table
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      {sentiment && (
        <div className="editorial-grid" style={{ marginBottom: '2rem' }}>
          <div className="col-3">
            <div className="stat-card">
              <span className="stat-card__label">Overall Rating</span>
              <div className="stat-card__value" style={{ fontSize: '2.8rem' }}>
                {sentiment.overall_score} <small style={{ fontSize: '1rem', color: 'var(--ink-secondary)' }}>/ 5.0</small>
              </div>
              <p className="stat-card__meta">Weighted average across {sentiment.total_reviews} verified customer reviews.</p>
            </div>
          </div>

          <div className="col-3">
            <div
              className="stat-card"
              style={{
                borderLeft: sentiment.signal === 'HALT_RESTOCK'
                  ? '6px solid var(--coral-accent)'
                  : sentiment.signal === 'INCREASE_ORDER'
                  ? '6px solid var(--mint-accent)'
                  : '6px solid var(--ink-black)',
              }}
            >
              <span className="stat-card__label">Restock Recommendation</span>
              <div style={{ margin: '0.6rem 0' }}>
                <span
                  className={`pill-badge ${
                    sentiment.signal === 'HALT_RESTOCK'
                      ? 'pill-badge--coral'
                      : sentiment.signal === 'INCREASE_ORDER'
                      ? 'pill-badge--mint'
                      : 'pill-badge--neutral'
                  }`}
                  style={{ fontSize: '0.85rem', padding: '6px 16px' }}
                >
                  {sentiment.signal.replace('_', ' ')}
                </span>
              </div>
              <p className="stat-card__meta">
                {sentiment.signal === 'HALT_RESTOCK'
                  ? 'Negative threshold exceeded. Halting warehouse orders.'
                  : sentiment.signal === 'INCREASE_ORDER'
                  ? 'Positive threshold cleared. Recommending order surge.'
                  : 'Balanced feedback profile. Inventory velocity holding steady.'}
              </p>
            </div>
          </div>

          <div className="col-3">
            <div className="stat-card">
              <span className="stat-card__label">Negative Ratio</span>
              <div
                className="stat-card__value"
                style={{
                  fontSize: '2.8rem',
                  color: negPct >= 45 ? 'var(--coral-dark)' : 'inherit',
                }}
              >
                {negPct.toFixed(1)}%
              </div>
              <p className="stat-card__meta">Sum of Very Bad & Bad reviews (Threshold: ≥45%).</p>
            </div>
          </div>

          <div className="col-3">
            <div className="stat-card">
              <span className="stat-card__label">Positive Ratio</span>
              <div
                className="stat-card__value"
                style={{
                  fontSize: '2.8rem',
                  color: posPct >= 65 ? 'var(--mint-dark)' : 'inherit',
                }}
              >
                {posPct.toFixed(1)}%
              </div>
              <p className="stat-card__meta">Sum of Good & Very Good reviews (Threshold: ≥65%).</p>
            </div>
          </div>
        </div>
      )}

      {/* 5-Column Bucketed Grid View */}
      {viewMode === 'COLUMNS' && (
        <section style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', textTransform: 'uppercase' }}>
              Five-Tier Satisfaction Breakdown // {currentProduct?.name || 'Selected Item'}
            </h2>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--ink-secondary)' }}>
              5 SATISFACTION TIERS
            </span>
          </div>

          <div className="sentiment-bucket-grid">
            {TIERS.map(({ key, label, border }) => {
              const items = bucketedReviews[key] || [];
              const pct = sentiment?.percentages?.[key] || 0;

              return (
                <div key={key} className="sentiment-col" style={{ borderTop: `5px solid ${border}` }}>
                  <div className="sentiment-col__header">
                    <div>
                      <div className="sentiment-col__title">{label}</div>
                      <span className="pill-badge pill-badge--neutral" style={{ marginTop: '4px' }}>
                        {pct.toFixed(0)}% SHARE
                      </span>
                    </div>
                    <div className="sentiment-col__count">{items.length}</div>
                  </div>

                  <div style={{ flex: 1, overflowY: 'auto', maxHeight: '480px' }}>
                    {items.length === 0 ? (
                      <div
                        style={{
                          padding: '1.5rem 0.5rem',
                          textAlign: 'center',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.72rem',
                          color: 'var(--ink-muted)',
                        }}
                      >
                        No reviews in this tier
                      </div>
                    ) : (
                      items.map((r, i) => (
                        <div key={r.review_id || r.id || i} className="review-item-card">
                          <p style={{ color: 'var(--ink-black)' }}>"{r.text}"</p>
                          <div className="review-item-card__meta">
                            <span>@{r.reviewer}</span>
                            <span>{(r.confidence * 100).toFixed(0)}% conf</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Magazine Data Table View */}
      {viewMode === 'TABLE' && (
        <section className="table-card">
          <div className="table-card__header">
            <div>
              <h2 className="table-card__title">
                Review History // {currentProduct?.name || 'Catalog Item'}
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--ink-secondary)', marginTop: '2px' }}>
                Customer review history categorized by satisfaction tier.
              </p>
            </div>

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`btn-pill ${activeTab === 'ALL' ? 'btn-pill--black' : 'btn-pill--outline'}`}
                style={{ padding: '0.35rem 0.85rem', fontSize: '0.72rem' }}
                onClick={() => setActiveTab('ALL')}
              >
                All ({reviews.length})
              </button>
              {TIERS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  className={`btn-pill ${activeTab === key ? 'btn-pill--black' : 'btn-pill--outline'}`}
                  style={{ padding: '0.35rem 0.85rem', fontSize: '0.72rem' }}
                  onClick={() => setActiveTab(key)}
                >
                  {label} ({(bucketedReviews[key] || []).length})
                </button>
              ))}
            </div>
          </div>

          <ReviewTable reviews={filteredReviews} />
        </section>
      )}

      {/* Live Review Submission & Classification Form */}
      <section className="stat-card" style={{ padding: '2rem', marginTop: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: 'var(--border-hairline)', paddingBottom: '0.75rem' }}>
          <div>
            <span className="stat-card__label">ADD CUSTOMER REVIEW</span>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', textTransform: 'uppercase' }}>
              Submit Customer Review for Instant Categorization
            </h3>
          </div>
          <span className="pill-badge pill-badge--mint">INSTANT CATEGORIZATION</span>
        </div>

        <form onSubmit={handleAddReview}>
          <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr auto', gap: '1rem', alignItems: 'flex-start' }}>
            <div>
              <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                REVIEWER IDENTIFIER
              </label>
              <input
                type="text"
                className="search-input"
                style={{ borderRadius: 'var(--radius-card-sm)', padding: '0.65rem 1rem', fontSize: '0.88rem' }}
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
                placeholder="Reviewer name"
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                CUSTOMER REVIEW TEXT
              </label>
              <input
                type="text"
                className="search-input"
                style={{ borderRadius: 'var(--radius-card-sm)', padding: '0.65rem 1rem', fontSize: '0.88rem' }}
                value={newReviewText}
                onChange={(e) => setNewReviewText(e.target.value)}
                placeholder="e.g. The scroll wheel ceased functioning within four days of delivery..."
                required
              />
            </div>

            <div style={{ paddingTop: '1.45rem' }}>
              <button
                type="submit"
                className="btn-pill btn-pill--mint"
                disabled={submitting}
              >
                {submitting ? 'Categorizing...' : 'Submit Review'}
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}
