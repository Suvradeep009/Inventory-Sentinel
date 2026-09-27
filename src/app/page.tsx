'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { RefreshCw, AlertTriangle, ArrowUpRight, ShieldAlert, ShoppingBag, ArrowRight, CheckCircle2, Sliders } from 'lucide-react';
import { Product, InventoryStats } from '@/lib/types';
import ProductThumbnail from '@/components/ProductThumbnail';

export default function HomeHubPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncLimit, setSyncLimit] = useState(30);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/products');
      const data = await res.json();
      if (data.products) {
        setProducts(data.products);
        setStats(data.stats);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleSyncStoreData = async () => {
    try {
      setSyncing(true);
      setSyncMessage('Contacting live product repository and analyzing customer feedback...');
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: syncLimit }),
      });
      const data = await res.json();
      if (data.success) {
        setSyncMessage(`Synced ${data.count} items and classified ${data.reviewsCount} customer reviews.`);
        await fetchDashboardData();
      } else {
        setSyncMessage(`Sync warning: ${data.error || 'Check network connection'}`);
      }
    } catch (err: any) {
      setSyncMessage(`Synchronization error: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const haltProducts = products.filter(p => p.metrics.restockSignal === 'HALT_RESTOCK');
  const surgeProducts = products.filter(p => p.metrics.restockSignal === 'INCREASE_ORDERS');

  return (
    <div className="container">
      {/* Editorial Header Banner */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        borderBottom: 'var(--border-black)',
        paddingBottom: '20px',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-yellow">LIVE REPLENISHMENT DESK</span>
            <span style={{ fontSize: '12px', color: 'var(--color-ink-muted)' }}>INTELLIGENT SUPPLY CHAIN ENGINE</span>
          </div>
          <h1>Home Hub & Data Synchronization</h1>
          <p style={{ color: 'var(--color-ink-muted)', marginTop: '4px', maxWidth: '680px' }}>
            Real-time commercial merchandise monitoring. Ingest live store catalogs, evaluate 5-tier customer sentiment streams, and govern automated replenishment decisions.
          </p>
        </div>

        {/* Sync Store Data Module */}
        <div className="panel" style={{ minWidth: '340px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontFamily: 'var(--font-subhead)', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase' }}>
              Data Ingestion Control
            </span>
            <span className="badge badge-neutral" style={{ fontSize: '10px' }}>
              SOURCE: LIVE PAYLOAD
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label htmlFor="sync-limit-select" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>SKU Limit:</label>
              <select
                id="sync-limit-select"
                value={syncLimit}
                onChange={e => setSyncLimit(Number(e.target.value))}
                className="input-select"
                style={{ flex: 1, padding: '4px 8px', fontSize: '12px' }}
                disabled={syncing}
              >
                <option value={10}>10 Items</option>
                <option value={20}>20 Items</option>
                <option value={30}>30 Items</option>
                <option value={50}>50 Items</option>
              </select>
            </div>
            <button
              onClick={handleSyncStoreData}
              disabled={syncing}
              className="btn btn-mint"
              style={{ padding: '8px 14px' }}
            >
              <RefreshCw size={13} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
              {syncing ? 'Ingesting...' : 'Sync Store Data'}
            </button>
          </div>

          {syncMessage && (
            <div style={{
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              padding: '6px 8px',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid #000000',
              borderRadius: 'var(--radius-tight)',
              color: syncing ? '#B45309' : '#047857'
            }}>
              {syncMessage}
            </div>
          )}
        </div>
      </div>

      {/* KPI Ticker Row */}
      <div className="grid-4" style={{ marginBottom: '24px' }}>
        <div className="kpi-card">
          <div className="kpi-label">Monitored SKUs</div>
          <div className="kpi-value">{stats ? stats.totalSkus : products.length}</div>
          <div className="kpi-sub">
            {stats ? `${stats.totalStockUnits.toLocaleString()} units on hand` : 'Active inventory'}
          </div>
        </div>

        <div className="kpi-card" style={{ borderLeft: '6px solid var(--color-coral)' }}>
          <div className="kpi-label">Halt Restock Alerts</div>
          <div className="kpi-value" style={{ color: '#D32F2F' }}>
            {stats ? stats.haltRestockCount : haltProducts.length}
          </div>
          <div className="kpi-sub">
            Negative ratio &ge; 45% (Orders blocked)
          </div>
        </div>

        <div className="kpi-card" style={{ borderLeft: '6px solid var(--color-mint)' }}>
          <div className="kpi-label">Surge Order Triggers</div>
          <div className="kpi-value" style={{ color: '#047857' }}>
            {stats ? stats.increaseOrdersCount : surgeProducts.length}
          </div>
          <div className="kpi-sub">
            Positive ratio &ge; 65% (+50% reorder)
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Satisfaction Index</div>
          <div className="kpi-value">
            {stats ? `${stats.averageSatisfactionIndex}/100` : '--'}
          </div>
          <div className="kpi-sub">
            Store-wide consumer feedback rating
          </div>
        </div>
      </div>

      {/* Main Operational Split */}
      <div className="grid-2" style={{ marginBottom: '24px' }}>
        {/* Critical Halt Column */}
        <div className="panel">
          <div className="panel-header" style={{ borderBottom: '2px solid #000' }}>
            <div className="panel-title" style={{ color: '#D32F2F' }}>
              <ShieldAlert size={16} />
              Immediate Restock Holds (&ge; 45% Negative)
            </div>
            <span className="badge badge-coral">{haltProducts.length} AT RISK</span>
          </div>

          <div className="panel-body" style={{ padding: 0 }}>
            {haltProducts.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-ink-muted)' }}>
                No active restock halts. All product satisfaction metrics within acceptable bounds.
              </div>
            ) : (
              <table className="editorial-table">
                <thead>
                  <tr>
                    <th>SKU / Product</th>
                    <th>Stock</th>
                    <th>Negative Ratio</th>
                    <th>Risk Capital</th>
                    <th>Directive</th>
                  </tr>
                </thead>
                <tbody>
                  {haltProducts.slice(0, 5).map(p => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <ProductThumbnail
                            src={p.thumbnail}
                            title={p.title}
                            category={p.category}
                            size={32}
                            productId={p.id}
                          />
                          <div>
                            <Link href={`/insights?productId=${p.id}`} title={`Diagnose SKU #${p.id}`} style={{ color: 'inherit' }}>
                              {p.title}
                            </Link>
                            <div>
                              <span style={{ fontSize: '10px', color: 'var(--color-ink-muted)', textTransform: 'uppercase' }}>
                                {p.category} &bull; SKU #{p.id}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="font-mono">{p.stock}</td>
                      <td className="font-mono" style={{ color: '#D32F2F', fontWeight: 700 }}>
                        {(p.metrics.negativeRatio * 100).toFixed(1)}%
                      </td>
                      <td className="font-mono">${p.metrics.estimatedCapitalRisk.toLocaleString()}</td>
                      <td>
                        <Link
                          href={`/insights?productId=${p.id}`}
                          className="btn btn-sm btn-coral"
                          style={{ padding: '3px 8px', fontSize: '10px' }}
                          title="Open diagnostic investigation for this held SKU"
                        >
                          HALT &bull; DIAGNOSE &rarr;
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div style={{ padding: '12px 16px', borderTop: 'var(--border-black)', backgroundColor: 'var(--bg-subtle)' }}>
            <Link href="/demand" className="btn btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
              View All Restock Calculations <ArrowRight size={12} />
            </Link>
          </div>
        </div>

        {/* High Demand Momentum Column */}
        <div className="panel">
          <div className="panel-header" style={{ borderBottom: '2px solid #000' }}>
            <div className="panel-title" style={{ color: '#047857' }}>
              <ArrowUpRight size={16} />
              Surge Replenishment Opportunities (&ge; 65% Positive)
            </div>
            <span className="badge badge-mint">{surgeProducts.length} TOP PERFORMERS</span>
          </div>

          <div className="panel-body" style={{ padding: 0 }}>
            {surgeProducts.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-ink-muted)' }}>
                No surge candidates detected. Sync store data to analyze customer satisfaction.
              </div>
            ) : (
              <table className="editorial-table">
                <thead>
                  <tr>
                    <th>SKU / Product</th>
                    <th>Stock</th>
                    <th>Positive Ratio</th>
                    <th>Recommended Order</th>
                    <th>Directive</th>
                  </tr>
                </thead>
                <tbody>
                  {surgeProducts.slice(0, 5).map(p => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <ProductThumbnail
                            src={p.thumbnail}
                            title={p.title}
                            category={p.category}
                            size={32}
                            productId={p.id}
                          />
                          <div>
                            <Link href={`/insights?productId=${p.id}`} title={`Diagnose SKU #${p.id}`} style={{ color: 'inherit' }}>
                              {p.title}
                            </Link>
                            <div>
                              <span style={{ fontSize: '10px', color: 'var(--color-ink-muted)', textTransform: 'uppercase' }}>
                                {p.category} &bull; SKU #{p.id}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="font-mono">{p.stock}</td>
                      <td className="font-mono" style={{ color: '#047857', fontWeight: 700 }}>
                        {(p.metrics.positiveRatio * 100).toFixed(1)}%
                      </td>
                      <td className="font-mono" style={{ fontWeight: 700 }}>
                        +{p.metrics.recommendedOrderQty} units
                      </td>
                      <td>
                        <Link
                          href={`/insights?productId=${p.id}`}
                          className="btn btn-sm btn-mint"
                          style={{ padding: '3px 8px', fontSize: '10px' }}
                          title="Open procurement evaluation for this surge SKU"
                        >
                          SURGE &bull; REORDER &rarr;
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div style={{ padding: '12px 16px', borderTop: 'var(--border-black)', backgroundColor: 'var(--bg-subtle)' }}>
            <Link href="/sentiment" className="btn btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
              Inspect Customer Feedback Streams <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid-3">
        <Link href="/sentiment" className="panel" style={{ padding: '20px', display: 'block', transition: 'transform 0.15s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="badge badge-neutral">TABULAR INTELLIGENCE</span>
            <ArrowRight size={14} />
          </div>
          <h3 style={{ fontSize: '16px', marginBottom: '6px' }}>Customer Feedback</h3>
          <p style={{ color: 'var(--color-ink-muted)', fontSize: '12px' }}>
            Audit 5-tier review classifications across Very Bad, Bad, Neutral, Good, and Very Good. Filter by product and theme.
          </p>
        </Link>

        <Link href="/demand" className="panel" style={{ padding: '20px', display: 'block', transition: 'transform 0.15s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="badge badge-mint">RESTOCK LOGIC</span>
            <ArrowRight size={14} />
          </div>
          <h3 style={{ fontSize: '16px', marginBottom: '6px' }}>Restock Signals</h3>
          <p style={{ color: 'var(--color-ink-muted)', fontSize: '12px' }}>
            Review mathematical threshold models driving automated purchase allocations and halt triggers with geometric visualizations.
          </p>
        </Link>

        <Link href="/insights" className="panel" style={{ padding: '20px', display: 'block', transition: 'transform 0.15s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="badge badge-coral">DIAGNOSTIC TERMINAL</span>
            <ArrowRight size={14} />
          </div>
          <h3 style={{ fontSize: '16px', marginBottom: '6px' }}>Smart Search</h3>
          <p style={{ color: 'var(--color-ink-muted)', fontSize: '12px' }}>
            Interactive diagnostic terminal. Pre-filter by product ID and receive structured executive briefing memos.
          </p>
        </Link>
      </div>
    </div>
  );
}
