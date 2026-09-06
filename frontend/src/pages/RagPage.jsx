import { useState, useEffect } from 'react';
import { queryRag, getProducts, getKeyStatus } from '../api';
import SentimentBadge from '../components/SentimentBadge';

const HARDWARE_SAMPLE_QUERIES = [
  'Is the Battery having premature failure or degradation issues?',
  'Should we restock the Inverter for commercial clients?',
  'What is customer sentiment regarding the Generator?',
  'Does the Charger meet fast-charging specifications?',
  'Are there surge protection complaints on the Power unit?',
];

export default function RagPage() {
  const [products, setProducts]               = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [queryInput, setQueryInput]           = useState('');
  const [activeResult, setActiveResult]       = useState(null);
  const [isSearching, setIsSearching]         = useState(false);
  const [keyInfo, setKeyInfo]                 = useState(null);

  useEffect(() => {
    getProducts().then(setProducts).catch(console.error);
    getKeyStatus().then(setKeyInfo).catch(console.error);
  }, []);

  const executeQuery = async (queryText) => {
    const q = (queryText || queryInput).trim();
    if (!q || isSearching) return;

    setIsSearching(true);
    setActiveResult({
      query: q,
      status: 'ANALYZING_SENTIMENT',
      answer: '',
      chunks: [],
      target_product: null,
    });

    try {
      const res = await queryRag(q, selectedProductId);
      const fullAnswer = res.answer || 'No analysis available.';

      // Conversational executive streaming
      let charIdx = 0;
      const interval = setInterval(() => {
        charIdx += 8;
        if (charIdx >= fullAnswer.length) {
          charIdx = fullAnswer.length;
          clearInterval(interval);
          setIsSearching(false);
        }
        setActiveResult({
          query: q,
          status: charIdx >= fullAnswer.length ? 'COMPLETE' : 'SYNTHESIZING',
          answer: fullAnswer.substring(0, charIdx),
          chunks: res.chunks || [],
          target_product: res.target_product || null,
          engine: res.engine || 'GEMINI_ANALYST',
        });
      }, 14);

    } catch (err) {
      setActiveResult({
        query: q,
        status: 'ERROR',
        answer: `Inquiry could not be processed: ${err.message}`,
        chunks: [],
      });
      setIsSearching(false);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    executeQuery();
  };

  return (
    <div className="page-wrapper">
      {/* Editorial Header */}
      <header className="masthead">
        <div className="masthead__top">
          <span>SECTION 04 // RAG EXECUTIVE INTELLIGENCE</span>
          <span>HARDWARE & POWER GROUNDED SYNTHESIS</span>
          <span>{keyInfo?.has_key ? '● GEMINI INFERENCE ACTIVE' : '● EXECUTIVE SYNTHESIS'}</span>
        </div>
        <h1 className="masthead__title">Insights Directory</h1>
        <p className="masthead__lead">
          Conversational executive synthesis grounded in verified customer review archives.
          Applies strict product metadata pre-filtering to eliminate cross-catalog contamination.
        </p>
      </header>

      {/* Modern Search Desk */}
      <section className="search-directory-box">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span className="stat-card__label">EQUIPMENT QUERY DESK</span>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', textTransform: 'uppercase', marginTop: '4px' }}>
              Query Hardware Sentiment & Restock Feasibility
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--ink-secondary)' }}>
              EQUIPMENT SCOPE:
            </span>
            <select
              className="editorial-select"
              value={selectedProductId || ''}
              onChange={(e) => setSelectedProductId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Auto-Detect from Query (All Hardware)</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>[{p.order_id || p.sku}] {p.name}</option>
              ))}
            </select>
          </div>
        </div>

        <form onSubmit={handleFormSubmit} className="search-input-group">
          <input
            type="text"
            className="search-input"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            placeholder="Ask about specific hardware (e.g. 'Is the Battery showing premature failure?')..."
            disabled={isSearching}
          />
          <button
            type="submit"
            className="btn-saas btn-saas--mint"
            disabled={isSearching}
          >
            {isSearching ? 'Analyzing...' : '[ Run Analysis ]'}
          </button>
        </form>

        {/* Sample Inquiries */}
        <div className="sample-queries">
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--ink-secondary)', marginRight: '4px' }}>
            SUGGESTED INQUIRIES:
          </span>
          {HARDWARE_SAMPLE_QUERIES.map((sq, i) => (
            <button
              key={i}
              type="button"
              className="sample-query-pill"
              onClick={() => {
                setQueryInput(sq);
                executeQuery(sq);
              }}
            >
              "{sq}"
            </button>
          ))}
        </div>
      </section>

      {/* De-Technicalized Conversational Executive Summary */}
      {activeResult && (
        <section className="dispatch-card">
          <div className="dispatch-card__mast">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span className="status-badge status-badge--neutral">
                {activeResult.status === 'COMPLETE' ? 'Executive Ready' : 'Synthesizing'}
              </span>
              {activeResult.target_product && (
                <span className="order-id-tag">
                  Target: {activeResult.target_product}
                </span>
              )}
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--ink-secondary)' }}>
                Query: "{activeResult.query}"
              </span>
            </div>
            <span className="status-badge status-badge--neutral">
              ANALYST DISPATCH
            </span>
          </div>

          <h3 className="dispatch-card__headline">
            Executive Sentiment Synthesis
          </h3>

          <div
            className="dispatch-card__answer"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '1.05rem',
              lineHeight: 1.7,
              color: 'var(--ink-black)',
            }}
          >
            {activeResult.answer || 'Extracting feedback records and synthesizing executive summary...'}
          </div>

          {/* Natural Operational Advisory Box */}
          {activeResult.status === 'COMPLETE' && (
            <div
              className={`recommendation-box ${
                activeResult.answer.toLowerCase().includes('pause') ||
                activeResult.answer.toLowerCase().includes('halt') ||
                activeResult.answer.toLowerCase().includes('defect') ||
                activeResult.answer.toLowerCase().includes('fail')
                  ? 'recommendation-box--halt'
                  : ''
              }`}
            >
              <span style={{ fontSize: '18px' }}>⚡</span>
              <div>
                <strong>OPERATIONAL ADVISORY: </strong>
                <span>
                  {activeResult.answer.toLowerCase().includes('pause') ||
                  activeResult.answer.toLowerCase().includes('halt') ||
                  activeResult.answer.toLowerCase().includes('defect') ||
                  activeResult.answer.toLowerCase().includes('fail')
                    ? 'Elevated failure sentiment detected. Quality assurance audit required before release of next purchase tranche.'
                    : 'Customer sentiment confirms operational stability. Equipment reorder schedules approved for continuation.'}
                </span>
              </div>
            </div>
          )}

          {/* Clean, Non-Technical Customer Feedback Excerpts (Raw Chunks & Confidences are hidden) */}
          {activeResult.chunks && activeResult.chunks.length > 0 && (
            <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: 'var(--border-hairline)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <span className="stat-card__label">SUPPORTING CUSTOMER FEEDBACK EXCERPTS</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--ink-secondary)' }}>
                  VERIFIED PRODUCT REVIEWS
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                {activeResult.chunks.map((c, idx) => (
                  <div
                    key={idx}
                    style={{
                      backgroundColor: 'var(--bg-paper)',
                      border: 'var(--border-hairline)',
                      borderRadius: 'var(--radius-card-sm)',
                      padding: '1.1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 700, color: 'var(--ink-secondary)' }}>
                          {c.product_name}
                        </span>
                        <SentimentBadge tier={c.tier} />
                      </div>
                      <p style={{ fontSize: '0.88rem', color: 'var(--ink-black)', fontStyle: 'italic', lineHeight: 1.5 }}>
                        "{c.text}"
                      </p>
                    </div>

                    <div style={{ marginTop: '0.75rem', paddingTop: '0.45rem', borderTop: '1px dashed rgba(17,17,17,0.18)', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--ink-muted)' }}>
                      Verified purchaser • @{c.reviewer || 'operator'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* About Us / Dual-Engine Architecture Manifesto */}
      <section className="inverted-block" style={{ marginTop: '3rem' }}>
        <span className="inverted-block__tag">ARCHITECTURE & MANIFESTO</span>
        <h2 className="inverted-block__title">
          About Sentinel: The Dual-Engine Intelligence Platform.
        </h2>
        <p className="inverted-block__text">
          Inventory Sentinel operates on a dual-engine architecture designed to eliminate intuition-driven inventory waste.
          By marrying real-time review sentiment with inventory velocity, the system guarantees that capital only chases customer delight.
        </p>

        <div className="inverted-block__grid">
          <div>
            <div className="inverted-block__stat-val" style={{ color: 'var(--mint-accent)' }}>ENGINE I</div>
            <div className="inverted-block__stat-label">Structured NLP Classification</div>
            <p style={{ fontSize: '0.82rem', color: '#AAA', marginTop: '6px', lineHeight: 1.4 }}>
              Batches critiques into Google Gemini, enforcing rigid JSON schema parsing across five granular tiers.
            </p>
          </div>

          <div>
            <div className="inverted-block__stat-val" style={{ color: 'var(--mint-accent)' }}>ENGINE II</div>
            <div className="inverted-block__stat-label">Metadata Pre-Filtered RAG</div>
            <p style={{ fontSize: '0.82rem', color: '#AAA', marginTop: '6px', lineHeight: 1.4 }}>
              Extracts target product metadata to isolate review corpora before scoring, eliminating cross-product noise.
            </p>
          </div>

          <div>
            <div className="inverted-block__stat-val" style={{ color: 'var(--coral-accent)' }}>RULESET</div>
            <div className="inverted-block__stat-label">Automated Threshold Halts</div>
            <p style={{ fontSize: '0.82rem', color: '#AAA', marginTop: '6px', lineHeight: 1.4 }}>
              ≥45% negative sentiment freezes restocks; ≥65% positive sentiment triggers purchase order acceleration.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
