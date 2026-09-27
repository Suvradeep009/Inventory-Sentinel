import { useState, useEffect } from 'react';
import { getInventory } from '../api';
import SignalCard from '../components/SignalCard';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

const editorialTooltipStyle = {
  backgroundColor: '#FAF8F2',
  border: '1px solid #111111',
  borderRadius: '8px',
  fontFamily: 'var(--font-mono)',
  fontSize: '12px',
  boxShadow: '2px 2px 0px #111111',
  color: '#111111',
  padding: '10px 14px',
};

export default function DemandPage() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filterSignal, setFilterSignal] = useState('ALL');
  const [actionAlert, setActionAlert]   = useState(null);

  useEffect(() => {
    getInventory()
      .then(setInventory)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleAction = (actionType, item) => {
    if (actionType === 'HALT') {
      setActionAlert({
        type: 'halt',
        message: `RESTOCK HALT DISPATCHED // Purchase orders frozen for "${item.product_name}" (SKU: ${item.sku}) due to ${item.negative_pct}% negative feedback.`,
      });
    } else {
      setActionAlert({
        type: 'increase',
        message: `ORDER SURGE APPROVED // Purchase order volume accelerated +35% for "${item.product_name}" (SKU: ${item.sku}) backed by ${item.positive_pct}% positive acclamation.`,
      });
    }
    setTimeout(() => setActionAlert(null), 6000);
  };

  if (loading) {
    return (
      <div className="page-wrapper">
        <div style={{ padding: '4rem 0', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '1rem' }}>
          Updating inventory restock signals...
        </div>
      </div>
    );
  }

  const signalCounts = { HALT_RESTOCK: 0, INCREASE_ORDER: 0, HOLD_STEADY: 0 };
  inventory.forEach((item) => {
    signalCounts[item.signal] = (signalCounts[item.signal] || 0) + 1;
  });

  const filteredInventory = filterSignal === 'ALL'
    ? inventory
    : inventory.filter((item) => item.signal === filterSignal);

  // Geometric chart data: map negative % (Coral) and positive % (Mint) alongside inventory stock
  const chartData = inventory.map((item) => ({
    name: item.product_name.split(' ').slice(0, 2).join(' '),
    sku: item.sku,
    stock: item.stock,
    negative_pct: item.negative_pct,
    positive_pct: item.positive_pct,
    score: item.overall_score,
  }));

  return (
    <div className="page-wrapper">
      {/* Header */}
      <header className="masthead">
        <div className="masthead__top">
          <span>SECTION 03 // RESTOCK SIGNALS</span>
          <span>AUTOMATED INVENTORY RECOMMENDATIONS</span>
          <span>THRESHOLD DIRECTIVES ACTIVE</span>
        </div>
        <h1 className="masthead__title">Restock Signals</h1>
        <p className="masthead__lead">
          Automated purchase recommendations driven by customer satisfaction trends.
        </p>
      </header>

      {/* Action Notification Toast */}
      {actionAlert && (
        <div
          className={`recommendation-box ${actionAlert.type === 'halt' ? 'recommendation-box--halt' : ''}`}
          style={{ marginBottom: '2rem' }}
        >
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
            {actionAlert.message}
          </span>
        </div>
      )}

      {/* Threshold Directives Banner */}
      <div className="editorial-grid" style={{ marginBottom: '2.5rem' }}>
        <div className="col-4">
          <div
            className="stat-card"
            style={{
              borderLeft: '6px solid var(--coral-accent)',
              cursor: 'pointer',
              backgroundColor: filterSignal === 'HALT_RESTOCK' ? 'var(--coral-light)' : 'var(--bg-card)',
            }}
            onClick={() => setFilterSignal(filterSignal === 'HALT_RESTOCK' ? 'ALL' : 'HALT_RESTOCK')}
          >
            <div className="stat-card__header">
              <span className="stat-card__label">HALT RESTOCK ALERT</span>
              <span className="pill-badge pill-badge--coral">NEG ≥ 45%</span>
            </div>
            <div className="stat-card__value" style={{ color: 'var(--coral-dark)' }}>
              {signalCounts.HALT_RESTOCK}
            </div>
            <p className="stat-card__meta">
              Products exceeding 45% negative review ratio. Automated restocks halted.
            </p>
          </div>
        </div>

        <div className="col-4">
          <div
            className="stat-card"
            style={{
              borderLeft: '6px solid var(--mint-accent)',
              cursor: 'pointer',
              backgroundColor: filterSignal === 'INCREASE_ORDER' ? 'var(--mint-light)' : 'var(--bg-card)',
            }}
            onClick={() => setFilterSignal(filterSignal === 'INCREASE_ORDER' ? 'ALL' : 'INCREASE_ORDER')}
          >
            <div className="stat-card__header">
              <span className="stat-card__label">INCREASE ORDER SURGE</span>
              <span className="pill-badge pill-badge--mint">POS ≥ 65%</span>
            </div>
            <div className="stat-card__value" style={{ color: 'var(--mint-dark)' }}>
              {signalCounts.INCREASE_ORDER}
            </div>
            <p className="stat-card__meta">
              Products clearing 65% positive threshold. Recommend +35% procurement increase.
            </p>
          </div>
        </div>

        <div className="col-4">
          <div
            className="stat-card"
            style={{
              borderLeft: '6px solid var(--ink-black)',
              cursor: 'pointer',
              backgroundColor: filterSignal === 'HOLD_STEADY' ? 'var(--bg-muted)' : 'var(--bg-card)',
            }}
            onClick={() => setFilterSignal(filterSignal === 'HOLD_STEADY' ? 'ALL' : 'HOLD_STEADY')}
          >
            <div className="stat-card__header">
              <span className="stat-card__label">HOLD STEADY BASELINE</span>
              <span className="pill-badge pill-badge--neutral">NORMAL RANGE</span>
            </div>
            <div className="stat-card__value">{signalCounts.HOLD_STEADY}</div>
            <p className="stat-card__meta">
              Balanced performance within acceptable deviation. Maintain scheduled reorder cycles.
            </p>
          </div>
        </div>
      </div>

      {/* Flat Geometric Bar Chart Section */}
      <section className="table-card" style={{ padding: '2rem', marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', textTransform: 'uppercase' }}>
              Customer Satisfaction vs. Stock Levels
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--ink-secondary)', marginTop: '2px' }}>
              Comparison of negative feedback (Coral) and positive feedback (Mint Green) across catalog lines.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '1rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '12px', height: '12px', backgroundColor: 'var(--coral-accent)', borderRadius: '2px', border: '1px solid #111' }} />
              Negative Ratio (Bad/Very Bad)
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '12px', height: '12px', backgroundColor: 'var(--mint-accent)', borderRadius: '2px', border: '1px solid #111' }} />
              Positive Ratio (Good/Very Good)
            </span>
          </div>
        </div>

        <div style={{ width: '100%', height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(17, 17, 17, 0.1)" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: '#111111', fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600 }}
                axisLine={{ stroke: '#111111' }}
                tickLine={{ stroke: '#111111' }}
              />
              <YAxis
                unit="%"
                domain={[0, 100]}
                tick={{ fill: '#111111', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                axisLine={{ stroke: '#111111' }}
                tickLine={{ stroke: '#111111' }}
              />
              <Tooltip contentStyle={editorialTooltipStyle} />
              <Bar dataKey="negative_pct" name="Negative %" fill="#FF9E9E" stroke="#111111" strokeWidth={1} />
              <Bar dataKey="positive_pct" name="Positive %" fill="#88E6B8" stroke="#111111" strokeWidth={1} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Filter Tabs & Alert Cards Grid */}
      <section style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', textTransform: 'uppercase' }}>
            Catalog Restock Recommendations ({filteredInventory.length})
          </h2>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className={`btn-pill ${filterSignal === 'ALL' ? 'btn-pill--black' : 'btn-pill--outline'}`}
              style={{ padding: '0.4rem 1rem', fontSize: '0.74rem' }}
              onClick={() => setFilterSignal('ALL')}
            >
              All Products ({inventory.length})
            </button>
            <button
              type="button"
              className={`btn-pill ${filterSignal === 'HALT_RESTOCK' ? 'btn-pill--coral' : 'btn-pill--outline'}`}
              style={{ padding: '0.4rem 1rem', fontSize: '0.74rem' }}
              onClick={() => setFilterSignal('HALT_RESTOCK')}
            >
              Halt Restock ({signalCounts.HALT_RESTOCK})
            </button>
            <button
              type="button"
              className={`btn-pill ${filterSignal === 'INCREASE_ORDER' ? 'btn-pill--mint' : 'btn-pill--outline'}`}
              style={{ padding: '0.4rem 1rem', fontSize: '0.74rem' }}
              onClick={() => setFilterSignal('INCREASE_ORDER')}
            >
              Increase Order ({signalCounts.INCREASE_ORDER})
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '1.5rem' }}>
          {filteredInventory.map((item) => (
            <SignalCard key={item.product_id} item={item} onAction={handleAction} />
          ))}
        </div>
      </section>
    </div>
  );
}
