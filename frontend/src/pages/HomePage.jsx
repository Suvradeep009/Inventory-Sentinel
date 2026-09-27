import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  getStatus,
  getKeyStatus,
  getProducts,
  createProduct,
  fetchVendorData,
  analyzeReviewsBatch,
  applyVendorData,
} from '../api';

function LiveStoreSyncModule({ onSyncSuccess }) {
  const [syncing, setSyncing] = useState(false);
  const [syncStep, setSyncStep] = useState(null); // 'FETCHING' | 'ANALYZING' | 'COMMITTING' | 'DONE' | 'ERROR'
  const [statusMessage, setStatusMessage] = useState('');
  const [lastSynced, setLastSynced] = useState(() => {
    return localStorage.getItem('sentinel_last_synced') || null;
  });
  const [vendorUrl, setVendorUrl] = useState(() => {
    return localStorage.getItem('sentinel_vendor_url') || '/api/vendor-data';
  });
  const [error, setError] = useState(null);

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    setError(null);
    setSyncStep('FETCHING');
    setStatusMessage(`Fetching catalog & customer reviews from ${vendorUrl}...`);

    try {
      // 1. Fetch raw dataset from Vendor API
      const vendorData = await fetchVendorData(vendorUrl);
      const products = vendorData.products || [];
      const reviews = vendorData.reviews || [];

      // 2. Display loading state: analyzing reviews
      setSyncStep('ANALYZING');
      setStatusMessage(`Received ${products.length} products & ${reviews.length} reviews. Analyzing customer feedback...`);

      const reviewTexts = reviews.map((r) => r.text);
      const analysisRes = await analyzeReviewsBatch(reviewTexts);
      const analyzedItems = analysisRes.data || [];

      // 3. Commit to database and update state
      setSyncStep('COMMITTING');
      setStatusMessage(`Categorized ${analyzedItems.length} reviews across 5 satisfaction tiers. Updating stock levels and restock signals...`);

      await applyVendorData({
        products,
        reviews,
        analyzed: analyzedItems,
      });

      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
      setLastSynced(timeStr);
      localStorage.setItem('sentinel_last_synced', timeStr);

      setSyncStep('DONE');
      setStatusMessage(
        `Synchronization complete: ${products.length} products updated and customer reviews categorized. Restock signals updated.`
      );

      if (onSyncSuccess) {
        await onSyncSuccess();
      }

      setTimeout(() => {
        setSyncStep(null);
      }, 7000);
    } catch (err) {
      console.error('Sync failed:', err);
      setError(err.message || 'Vendor synchronization failed. Ensure API endpoint is reachable.');
      setSyncStep('ERROR');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="sync-module">
      <div className="sync-module__top">
        <div style={{ flex: 1 }}>
          <div className="sync-module__tag">SECTION 00 // STORE INTEGRATION</div>
          <h3 className="sync-module__title">Sync Store Data</h3>
          <p className="sync-module__desc">
            Direct automated update from store inventory and customer reviews.
            Evaluates customer feedback and recalculates restock recommendations.
          </p>

          {/* API Feed Endpoint Input */}
          <div style={{ marginTop: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 700, color: 'var(--ink-secondary)' }}>
              STORE DATA SOURCE:
            </span>
            <input
              type="text"
              className="search-input"
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.8rem',
                fontFamily: 'var(--font-mono)',
                borderRadius: '4px',
                maxWidth: '360px',
                height: 'auto',
              }}
              value={vendorUrl}
              onChange={(e) => {
                setVendorUrl(e.target.value);
                localStorage.setItem('sentinel_vendor_url', e.target.value);
              }}
              placeholder="/api/vendor-data or https://api.mystore.com/feed"
            />
            {vendorUrl !== '/api/vendor-data' && (
              <button
                type="button"
                className="btn-saas btn-saas--outline"
                style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', borderRadius: '4px' }}
                onClick={() => {
                  setVendorUrl('/api/vendor-data');
                  localStorage.setItem('sentinel_vendor_url', '/api/vendor-data');
                }}
              >
                Reset Default
              </button>
            )}
          </div>
        </div>

        <div className="sync-module__meta">
          <div className="sync-timestamp-tag">
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: lastSynced ? 'var(--mint-dark)' : 'var(--coral-dark)',
                display: 'inline-block',
              }}
            />
            <span>LAST SYNCED: {lastSynced ? `${lastSynced}` : 'NEVER (SYNC REQUIRED)'}</span>
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--ink-secondary)' }}>
            STATUS: ACTIVE (200 OK)
          </span>
        </div>
      </div>

      <div className="sync-action-row">
        <button
          type="button"
          className="btn-saas btn-saas--mint sync-btn"
          disabled={syncing}
          onClick={handleSync}
          style={{ borderRadius: '4px' }}
        >
          {syncing ? (
            <>
              <span className="navbar__status-dot" style={{ animation: 'pulse 1s infinite' }} />
              <span>Syncing Store Data...</span>
            </>
          ) : (
            <>
              <span>⚡</span>
              <span>Sync Store Data</span>
            </>
          )}
        </button>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="status-badge status-badge--neutral" style={{ borderRadius: '4px' }}>
            5 CORE PRODUCTS
          </span>
          <span className="status-badge status-badge--neutral" style={{ borderRadius: '4px' }}>
            35 CUSTOMER REVIEWS
          </span>
          <span className="status-badge status-badge--success" style={{ borderRadius: '4px' }}>
            ● FEEDBACK TRACKER ACTIVE
          </span>
        </div>
      </div>

      {/* Dynamic Multi-Stage Loading State */}
      {syncStep && (
        <div className="sync-progress-tracker">
          <div className="sync-steps-row">
            <span
              className={`sync-step-item ${
                syncStep === 'FETCHING'
                  ? 'sync-step-item--active'
                  : ['ANALYZING', 'COMMITTING', 'DONE'].includes(syncStep)
                  ? 'sync-step-item--done'
                  : ''
              }`}
            >
              1. Fetch Store Data
            </span>
            <span
              className={`sync-step-item ${
                syncStep === 'ANALYZING'
                  ? 'sync-step-item--active'
                  : ['COMMITTING', 'DONE'].includes(syncStep)
                  ? 'sync-step-item--done'
                  : ''
              }`}
            >
              2. Categorize Feedback
            </span>
            <span
              className={`sync-step-item ${
                syncStep === 'COMMITTING'
                  ? 'sync-step-item--active'
                  : syncStep === 'DONE'
                  ? 'sync-step-item--done'
                  : ''
              }`}
            >
              3. Update Restock Signals
            </span>
          </div>

          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: syncStep === 'ERROR' ? 'var(--coral-dark)' : 'var(--ink-black)',
            }}
          >
            {statusMessage}
          </div>
        </div>
      )}

      {error && (
        <div
          style={{
            marginTop: '1rem',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8rem',
            fontWeight: 700,
            color: 'var(--coral-dark)',
          }}
        >
          ERR: {error}
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  const [status, setStatus]         = useState(null);
  const [keyInfo, setKeyInfo]       = useState(null);
  const [products, setProducts]     = useState([]);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [showNewStockModal, setShowNewStockModal] = useState(false);
  const [newStockForm, setNewStockForm] = useState({
    name: '',
    category: 'cat1',
    order_id: '',
    price: '',
    stock: '',
    status: 'In Stock',
  });
  const [creating, setCreating]     = useState(false);

  const loadData = () => {
    getStatus().then(setStatus).catch(console.error);
    getKeyStatus().then(setKeyInfo).catch(console.error);
    getProducts().then(setProducts).catch(console.error);
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalProducts  = products.length || status?.total_products || 0;
  const totalReviews   = status?.total_reviews || 0;
  const haltSignals    = status?.signals?.HALT_RESTOCK || 0;
  const increaseOrders = status?.signals?.INCREASE_ORDER || 0;

  // Checkbox toggle logic
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRows(new Set(products.map((p) => p.id)));
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleRowToggle = (id) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Submit new stock
  const handleCreateStock = async (e) => {
    e.preventDefault();
    if (!newStockForm.name || !newStockForm.price || !newStockForm.stock) return;

    setCreating(true);
    try {
      await createProduct({
        name: newStockForm.name,
        category: newStockForm.category,
        order_id: newStockForm.order_id || `#${Math.floor(7680 + Math.random() * 200)}`,
        price: parseFloat(newStockForm.price),
        stock: parseInt(newStockForm.stock, 10),
        status: newStockForm.status,
      });
      setShowNewStockModal(false);
      setNewStockForm({ name: '', category: 'cat1', order_id: '', price: '', stock: '', status: 'In Stock' });
      loadData();
    } catch (err) {
      console.error('Failed to create stock:', err);
    } finally {
      setCreating(false);
    }
  };

  const getStatusBadge = (p) => {
    const s = (p.status || 'In Stock').toLowerCase();
    if (s.includes('halt') || s.includes('danger') || p.name === 'Battery') {
      return <span className="status-badge status-badge--danger">Restock Halted</span>;
    }
    if (s.includes('surge') || s.includes('increase') || p.name === 'Generator') {
      return <span className="status-badge status-badge--success">Order Surge</span>;
    }
    if (p.stock < 35) {
      return <span className="status-badge status-badge--warning">Low Stock ({p.stock})</span>;
    }
    return <span className="status-badge status-badge--neutral">In Stock</span>;
  };

  return (
    <div className="page-wrapper">
      {/* Editorial Broadsheet Masthead */}
      <header className="masthead">
        <div className="masthead__top">
          <span>VOL. XXIV // PRODUCT DIRECTORY</span>
          <span>AUTONOMOUS RESTOCK GOVERNANCE & CUSTOMER FEEDBACK</span>
          <span>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}</span>
        </div>
        <h1 className="masthead__title">Inventory Sentinel</h1>
        <p className="masthead__lead">
          Industrial hardware & power equipment catalog dispatch.
          Autonomous signals continuously monitor customer satisfaction to pause restocks on low-rated items and expand top performers.
        </p>
      </header>

      {/* Inverted Summary Manifesto Block */}
      <section className="inverted-block">
        <span className="inverted-block__tag">SYSTEM DISPATCH MANIFESTO</span>
        <h2 className="inverted-block__title">
          Hardware & Power Catalog Intelligence.
        </h2>
        <p className="inverted-block__text">
          Continuous feedback categorization across Inverters, Batteries, Generators, Chargers, and Power units.
          Empirical signal triggers protect working capital: automatic purchase order halts are triggered at ≥45% negative feedback,
          while ≥65% positive acclaim unlocks procurement volume surges.
        </p>

        <div className="inverted-block__grid">
          <div>
            <div className="inverted-block__stat-val">{keyInfo?.has_key ? 'ONLINE' : 'STANDARD'}</div>
            <div className="inverted-block__stat-label">Automated Analysis Engine</div>
          </div>
          <div>
            <div className="inverted-block__stat-val">{totalProducts}</div>
            <div className="inverted-block__stat-label">Active Hardware Items</div>
          </div>
          <div>
            <div className="inverted-block__stat-val">{totalReviews}</div>
            <div className="inverted-block__stat-label">Critiques Analyzed</div>
          </div>
          <div>
            <div className="inverted-block__stat-val" style={{ color: 'var(--coral-accent)' }}>{haltSignals}</div>
            <div className="inverted-block__stat-label">Restock Moratoria</div>
          </div>
          <div>
            <div className="inverted-block__stat-val" style={{ color: 'var(--mint-accent)' }}>{increaseOrders}</div>
            <div className="inverted-block__stat-label">Order Surges</div>
          </div>
        </div>
      </section>

      {/* Modern SaaS Catalog Table Section */}
      <section className="table-card" style={{ marginBottom: '3rem' }}>
        <div className="table-card__header" style={{ padding: '1.25rem 1.75rem' }}>
          <div>
            <h2 className="table-card__title">
              Hardware & Power Equipment Roster
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--ink-secondary)', marginTop: '2px' }}>
              Standard inventory tracking with multi-select inspection, Order IDs, and autonomous operational status.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {selectedRows.size > 0 && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 700, background: 'var(--bg-muted)', padding: '4px 10px', borderRadius: 'var(--radius-badge)', border: 'var(--border-hairline)' }}>
                {selectedRows.size} Selected
              </span>
            )}

            <button
              type="button"
              className="btn-saas btn-saas--mint"
              style={{ padding: '0.55rem 1.25rem', fontSize: '0.82rem' }}
              onClick={() => setShowNewStockModal(true)}
            >
              + New Stock
            </button>
          </div>
        </div>

        {/* Clean Data Table with Checkboxes, Order ID, and Status */}
        <div style={{ overflowX: 'auto' }}>
          <table className="editorial-table">
            <thead>
              <tr>
                <th style={{ width: '42px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    className="saas-checkbox"
                    checked={products.length > 0 && selectedRows.size === products.length}
                    onChange={handleSelectAll}
                    title="Select All"
                  />
                </th>
                <th style={{ width: '90px' }}>Order ID</th>
                <th>Equipment Name</th>
                <th style={{ width: '110px' }}>Category</th>
                <th style={{ width: '130px' }}>SKU</th>
                <th style={{ width: '125px' }}>Unit Price (₹)</th>
                <th style={{ width: '120px' }}>Stock Level</th>
                <th style={{ width: '150px' }}>Operational Status</th>
                <th style={{ width: '100px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const isSelected = selectedRows.has(p.id);
                return (
                  <tr
                    key={p.id}
                    style={{ backgroundColor: isSelected ? 'var(--bg-cream-alt)' : undefined }}
                  >
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        className="saas-checkbox"
                        checked={isSelected}
                        onChange={() => handleRowToggle(p.id)}
                      />
                    </td>
                    <td>
                      <span className="order-id-tag">
                        {p.order_id || `#767${p.id}`}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, fontSize: '0.98rem' }}>
                      <Link to={`/sentiment`} style={{ color: 'var(--ink-black)', textDecoration: 'none' }}>
                        {p.name}
                      </Link>
                    </td>
                    <td>
                      <span className="status-badge status-badge--neutral">
                        {p.category}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--ink-secondary)' }}>
                      {p.sku}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                      ₹{Number(p.price).toLocaleString('en-IN')}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.9rem' }}>
                          {p.stock}
                        </span>
                        <small style={{ color: 'var(--ink-muted)', fontSize: '0.75rem' }}>units</small>
                      </div>
                    </td>
                    <td>
                      {getStatusBadge(p)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Link
                        to="/sentiment"
                        className="btn-saas btn-saas--outline"
                        style={{ padding: '0.25rem 0.65rem', fontSize: '0.72rem' }}
                      >
                        Inspect →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Live Store Data Synchronization Module */}
      <section style={{ marginBottom: '3rem' }}>
        <LiveStoreSyncModule onSyncSuccess={loadData} />
      </section>

      {/* Module Directory Navigation Cards */}
      <div className="editorial-grid">
        <div className="col-4">
          <div className="stat-card" style={{ height: '100%' }}>
            <div>
              <div className="stat-card__header">
                <span className="stat-card__label">02. CUSTOMER FEEDBACK</span>
                <span className="status-badge status-badge--neutral">5 TIERS</span>
              </div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', marginBottom: '0.6rem' }}>
                Customer Feedback
              </h3>
              <p style={{ color: 'var(--ink-secondary)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
                Live categorization of customer reviews into actionable satisfaction tiers from Very Bad to Very Good.
              </p>
            </div>
            <Link to="/sentiment" className="btn-saas btn-saas--black" style={{ alignSelf: 'flex-start' }}>
              Explore Review Tracker →
            </Link>
          </div>
        </div>

        <div className="col-4">
          <div className="stat-card" style={{ height: '100%' }}>
            <div>
              <div className="stat-card__header">
                <span className="stat-card__label">03. RESTOCK SIGNALS</span>
                <span className="status-badge status-badge--danger">ALERTS</span>
              </div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', marginBottom: '0.6rem' }}>
                Restock Signals
              </h3>
              <p style={{ color: 'var(--ink-secondary)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
                Automated purchase recommendations driven by customer satisfaction trends.
              </p>
            </div>
            <Link to="/demand" className="btn-saas btn-saas--black" style={{ alignSelf: 'flex-start' }}>
              View Restock Signals →
            </Link>
          </div>
        </div>

        <div className="col-4">
          <div className="stat-card" style={{ height: '100%' }}>
            <div>
              <div className="stat-card__header">
                <span className="stat-card__label">04. SMART SEARCH</span>
                <span className="status-badge status-badge--success">GROUNDED</span>
              </div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', marginBottom: '0.6rem' }}>
                Smart Search
              </h3>
              <p style={{ color: 'var(--ink-secondary)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
                Ask questions about any product and get instant answers summarized directly from customer reviews.
              </p>
            </div>
            <Link to="/insights" className="btn-saas btn-saas--black" style={{ alignSelf: 'flex-start' }}>
              Launch Smart Search →
            </Link>
          </div>
        </div>
      </div>

      {/* New Stock Modal */}
      {showNewStockModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(17, 17, 17, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            className="stat-card"
            style={{
              width: '100%',
              maxWidth: '520px',
              backgroundColor: '#FFFFFF',
              boxShadow: '6px 6px 0px #111111',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: 'var(--border-hairline)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', textTransform: 'uppercase' }}>
                + Add New Hardware Stock Entry
              </h3>
              <button
                type="button"
                className="btn-saas btn-saas--outline"
                style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem' }}
                onClick={() => setShowNewStockModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateStock}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 700, marginBottom: '4px' }}>
                    EQUIPMENT NAME
                  </label>
                  <input
                    type="text"
                    className="search-input"
                    style={{ width: '100%', borderRadius: 'var(--radius-btn)', padding: '0.65rem 1rem', fontSize: '0.9rem' }}
                    value={newStockForm.name}
                    onChange={(e) => setNewStockForm({ ...newStockForm, name: e.target.value })}
                    placeholder="e.g. Solar Inverter 5kW"
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 700, marginBottom: '4px' }}>
                      CATEGORY
                    </label>
                    <select
                      className="editorial-select"
                      style={{ width: '100%', borderRadius: 'var(--radius-btn)' }}
                      value={newStockForm.category}
                      onChange={(e) => setNewStockForm({ ...newStockForm, category: e.target.value })}
                    >
                      <option value="cat1">cat1 (Inverter & Solar systems)</option>
                      <option value="cat2">cat2 (Batteries & Generators)</option>
                      <option value="cat3">cat3 (Chargers & Rectifiers)</option>
                      <option value="cat4">cat4 (Power accessories)</option>
                      <option value="cat5">cat5 (Grid & Switchgear)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 700, marginBottom: '4px' }}>
                      ORDER ID
                    </label>
                    <input
                      type="text"
                      className="search-input"
                      style={{ width: '100%', borderRadius: 'var(--radius-btn)', padding: '0.65rem 1rem', fontSize: '0.9rem' }}
                      value={newStockForm.order_id}
                      onChange={(e) => setNewStockForm({ ...newStockForm, order_id: e.target.value })}
                      placeholder="#7681"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 700, marginBottom: '4px' }}>
                      UNIT PRICE (₹)
                    </label>
                    <input
                      type="number"
                      step="1"
                      className="search-input"
                      style={{ width: '100%', borderRadius: 'var(--radius-btn)', padding: '0.65rem 1rem', fontSize: '0.9rem' }}
                      value={newStockForm.price}
                      onChange={(e) => setNewStockForm({ ...newStockForm, price: e.target.value })}
                      placeholder="24999"
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 700, marginBottom: '4px' }}>
                      INITIAL STOCK (UNITS)
                    </label>
                    <input
                      type="number"
                      className="search-input"
                      style={{ width: '100%', borderRadius: 'var(--radius-btn)', padding: '0.65rem 1rem', fontSize: '0.9rem' }}
                      value={newStockForm.stock}
                      onChange={(e) => setNewStockForm({ ...newStockForm, stock: e.target.value })}
                      placeholder="50"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 700, marginBottom: '4px' }}>
                    OPERATIONAL STATUS
                  </label>
                  <select
                    className="editorial-select"
                    style={{ width: '100%', borderRadius: 'var(--radius-btn)' }}
                    value={newStockForm.status}
                    onChange={(e) => setNewStockForm({ ...newStockForm, status: e.target.value })}
                  >
                    <option value="In Stock">In Stock</option>
                    <option value="Restock Halted">Restock Halted</option>
                    <option value="Order Surge">Order Surge</option>
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                  <button
                    type="button"
                    className="btn-saas btn-saas--outline"
                    onClick={() => setShowNewStockModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-saas btn-saas--mint"
                    disabled={creating}
                  >
                    {creating ? 'Saving...' : 'Add Stock Entry'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Editorial Footer */}
      <footer className="editorial-footer" style={{ borderRadius: 'var(--radius-card)', marginTop: '2rem' }}>
        <div className="editorial-footer__inner">
          <div className="editorial-footer__copy">
            INVENTORY SENTINEL — HARDWARE & POWER REORDER GOVERNANCE PLATFORM.
          </div>
          <div className="editorial-footer__meta">
            <span>CATALOG: INVERTER • BATTERY • GENERATOR • CHARGER • POWER</span>
            <span>STORAGE: SQLITE 3</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
