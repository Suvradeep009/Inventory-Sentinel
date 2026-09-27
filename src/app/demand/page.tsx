'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Product } from '@/lib/types';
import ProductThumbnail from '@/components/ProductThumbnail';
import { TrendingUp, AlertOctagon, CheckCircle2, ShieldAlert, ArrowUpRight, DollarSign, Package, RefreshCw } from 'lucide-react';

export default function RestockSignalsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSignal, setFilterSignal] = useState<string>('all');
  const [dispatchedSuccess, setDispatchedSuccess] = useState<string | null>(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/products');
      const data = await res.json();
      if (data.products) {
        setProducts(data.products);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const haltCount = products.filter(p => p.metrics.restockSignal === 'HALT_RESTOCK').length;
  const surgeCount = products.filter(p => p.metrics.restockSignal === 'INCREASE_ORDERS').length;
  const stableCount = products.filter(p => p.metrics.restockSignal === 'STABLE').length;

  const filteredProducts = products.filter(p => {
    if (filterSignal === 'all') return true;
    return p.metrics.restockSignal === filterSignal;
  });

  const totalRecommendedOrderUnits = products
    .filter(p => p.metrics.restockSignal === 'INCREASE_ORDERS')
    .reduce((sum, p) => sum + p.metrics.recommendedOrderQty, 0);

  const totalCapitalAtRisk = products
    .filter(p => p.metrics.restockSignal === 'HALT_RESTOCK')
    .reduce((sum, p) => sum + p.metrics.estimatedCapitalRisk, 0);

  const handleSimulateDispatch = () => {
    const surgeItems = products.filter(p => p.metrics.restockSignal === 'INCREASE_ORDERS');
    setDispatchedSuccess(`Automated Purchase Orders generated for ${surgeItems.length} surge items (${totalRecommendedOrderUnits} total units). Supplier contracts locked.`);
    setTimeout(() => setDispatchedSuccess(null), 6000);
  };

  return (
    <div className="container">
      {/* Editorial Header */}
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
            <span className="badge badge-mint">DECISION ENGINE</span>
            <span style={{ fontSize: '12px', color: 'var(--color-ink-muted)' }}>MATHEMATICAL RESTOCK GOVERNANCE</span>
          </div>
          <h1>Restock Signals & Demand Forecasting</h1>
          <p style={{ color: 'var(--color-ink-muted)', marginTop: '4px', maxWidth: '720px' }}>
            Visual threshold mathematics driving automated procurement allocations. Reorders are immediately halted when customer negative ratio &ge; 45%, and increased by 50% when positive ratio &ge; 65%.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={handleSimulateDispatch}
            className="btn btn-mint"
            disabled={surgeCount === 0}
          >
            <CheckCircle2 size={14} />
            Simulate Purchase Dispatch ({totalRecommendedOrderUnits} Units)
          </button>
        </div>
      </div>

      {dispatchedSuccess && (
        <div style={{
          backgroundColor: 'var(--color-mint-light)',
          border: '1px solid #000000',
          borderRadius: 'var(--radius-tight)',
          padding: '12px 16px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontWeight: 600,
          fontFamily: 'var(--font-subhead)',
          boxShadow: 'var(--shadow-flat)'
        }}>
          <CheckCircle2 size={18} color="#047857" />
          <span>{dispatchedSuccess}</span>
        </div>
      )}

      {/* Threshold Mathematics Visual Meter */}
      <div className="panel" style={{ padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '15px' }}>Automated Restock Threshold Rule Model</h3>
            <p style={{ fontSize: '12px', color: 'var(--color-ink-muted)' }}>
              Deterministic boundary conditions governing automated purchase authorization
            </p>
          </div>
          <span className="badge badge-neutral font-mono">GOVERNANCE ENFORCED</span>
        </div>

        {/* Geometric Threshold Diagram */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '45fr 20fr 35fr',
          gap: '2px',
          border: '2px solid #000',
          borderRadius: 'var(--radius-tight)',
          overflow: 'hidden',
          marginBottom: '16px'
        }}>
          {/* Halt Zone */}
          <div style={{
            backgroundColor: 'var(--color-coral)',
            padding: '14px 16px',
            borderRight: '2px solid #000',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-subhead)', fontWeight: 800, fontSize: '13px' }}>HALT ZONE</span>
              <span className="badge badge-neutral font-mono">&ge; 45% NEGATIVE</span>
            </div>
            <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: 600 }}>
              Order Quantity: <span className="font-mono">0 UNITS (FROZEN)</span>
            </div>
            <div style={{ fontSize: '11px', color: '#661111', marginTop: '2px' }}>
              Protects working capital against high-return product lines.
            </div>
          </div>

          {/* Balanced Zone */}
          <div style={{
            backgroundColor: 'var(--bg-muted)',
            padding: '14px 16px',
            borderRight: '2px solid #000',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-subhead)', fontWeight: 800, fontSize: '13px' }}>BALANCED</span>
              <span className="badge badge-neutral font-mono">BASELINE</span>
            </div>
            <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: 600 }}>
              Pace: <span className="font-mono">STANDARD BUFFER</span>
            </div>
            <div style={{ fontSize: '11px', color: '#444', marginTop: '2px' }}>
              Regular replenishment to maintain 30-day baseline safety stock.
            </div>
          </div>

          {/* Surge Zone */}
          <div style={{
            backgroundColor: 'var(--color-mint)',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-subhead)', fontWeight: 800, fontSize: '13px' }}>SURGE ZONE</span>
              <span className="badge badge-neutral font-mono">&ge; 65% POSITIVE</span>
            </div>
            <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: 600 }}>
              Order Quantity: <span className="font-mono">+50% ACCELERATION</span>
            </div>
            <div style={{ fontSize: '11px', color: '#004D2C', marginTop: '2px' }}>
              Capitalises on verified customer sentiment to capture market demand.
            </div>
          </div>
        </div>

        {/* Statistical Overview Pills */}
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '12px', height: '12px', backgroundColor: 'var(--color-coral)', border: '1px solid #000', display: 'inline-block' }} />
            <span style={{ fontSize: '12px', fontWeight: 600 }}>Active Halt Holds: {haltCount} SKUs</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '12px', height: '12px', backgroundColor: 'var(--bg-muted)', border: '1px solid #000', display: 'inline-block' }} />
            <span style={{ fontSize: '12px', fontWeight: 600 }}>Balanced Replenishment: {stableCount} SKUs</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '12px', height: '12px', backgroundColor: 'var(--color-mint)', border: '1px solid #000', display: 'inline-block' }} />
            <span style={{ fontSize: '12px', fontWeight: 600 }}>Surge Reorders: {surgeCount} SKUs</span>
          </div>
        </div>
      </div>

      {/* Geometric Decision Matrix Chart */}
      <div className="panel" style={{ padding: '20px', marginBottom: '24px' }}>
        <div className="panel-title" style={{ marginBottom: '14px' }}>
          <TrendingUp size={14} />
          Restock Decision Matrix: Stock-on-Hand vs Satisfaction Index
        </div>

        {/* Geometric SVG Matrix Graph */}
        <div style={{
          border: '1px solid #000',
          backgroundColor: '#FAF8F3',
          padding: '20px',
          borderRadius: 'var(--radius-tight)',
          position: 'relative'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-muted)', marginBottom: '8px' }}>
            <span>Y-AXIS: CUSTOMER SATISFACTION INDEX (0 - 100)</span>
            <span>X-AXIS: INVENTORY ON HAND (UNITS)</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {products.slice(0, 8).map(p => {
              const satisfaction = p.metrics.satisfactionIndex;
              const isHalt = p.metrics.restockSignal === 'HALT_RESTOCK';
              const isSurge = p.metrics.restockSignal === 'INCREASE_ORDERS';
              const barColor = isHalt ? 'var(--color-coral)' : isSurge ? 'var(--color-mint)' : 'var(--bg-muted)';

              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ProductThumbnail
                    src={p.thumbnail}
                    title={p.title}
                    category={p.category}
                    size={24}
                    productId={p.id}
                  />
                  <div style={{ width: '170px', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <Link href={`/insights?productId=${p.id}`} title={`Diagnose SKU #${p.id}`} style={{ color: 'inherit' }}>
                      {p.title}
                    </Link>
                  </div>
                  <div style={{ flex: 1, backgroundColor: '#EBE6DA', height: '24px', border: '1px solid #000', borderRadius: '2px', display: 'flex', position: 'relative' }}>
                    <div
                      style={{
                        width: `${Math.min(100, Math.max(8, satisfaction))}%`,
                        backgroundColor: barColor,
                        height: '100%',
                        borderRight: '1px solid #000',
                        display: 'flex',
                        alignItems: 'center',
                        paddingLeft: '8px',
                        fontSize: '11px',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700
                      }}
                    >
                      {satisfaction}/100
                    </div>
                  </div>
                  <div style={{ width: '80px', textAlign: 'right', fontSize: '12px' }} className="font-mono">
                    {p.stock} units
                  </div>
                  <div style={{ width: '130px', textAlign: 'right' }}>
                    {isHalt ? (
                      <span className="badge badge-coral">HALT (0 QTY)</span>
                    ) : isSurge ? (
                      <span className="badge badge-mint">+{p.metrics.recommendedOrderQty} SURGE</span>
                    ) : (
                      <span className="badge badge-neutral">+{p.metrics.recommendedOrderQty} NORM</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Actionable Reorder Plan Table */}
      <div className="panel">
        <div className="panel-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="panel-title">Automated Purchase Orders & Restock Audit</span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={() => setFilterSignal('all')}
                className={`btn btn-sm ${filterSignal === 'all' ? 'btn-black' : ''}`}
              >
                All ({products.length})
              </button>
              <button
                onClick={() => setFilterSignal('HALT_RESTOCK')}
                className={`btn btn-sm ${filterSignal === 'HALT_RESTOCK' ? 'btn-black' : ''}`}
              >
                Halt ({haltCount})
              </button>
              <button
                onClick={() => setFilterSignal('INCREASE_ORDERS')}
                className={`btn btn-sm ${filterSignal === 'INCREASE_ORDERS' ? 'btn-black' : ''}`}
              >
                Surge ({surgeCount})
              </button>
              <button
                onClick={() => setFilterSignal('STABLE')}
                className={`btn btn-sm ${filterSignal === 'STABLE' ? 'btn-black' : ''}`}
              >
                Stable ({stableCount})
              </button>
            </div>
          </div>
          <span className="badge badge-neutral font-mono">
            {filteredProducts.length} ITEMS
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="editorial-table">
            <thead>
              <tr>
                <th>Product SKU</th>
                <th>Stock on Hand</th>
                <th>Negative Ratio</th>
                <th>Positive Ratio</th>
                <th>Restock Signal</th>
                <th>Order Qty</th>
                <th>Automated Decision Rationale</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(p => {
                const isHalt = p.metrics.restockSignal === 'HALT_RESTOCK';
                const isSurge = p.metrics.restockSignal === 'INCREASE_ORDERS';

                return (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <ProductThumbnail
                          src={p.thumbnail}
                          title={p.title}
                          category={p.category}
                          size={28}
                          productId={p.id}
                        />
                        <div>
                          <Link href={`/insights?productId=${p.id}`} title={`Diagnose SKU #${p.id}`} style={{ color: 'inherit' }}>
                            {p.title}
                          </Link>
                          <div>
                            <span style={{ fontSize: '10px', color: 'var(--color-ink-muted)', textTransform: 'uppercase' }}>
                              SKU #{p.id} &bull; {p.category}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="font-mono">{p.stock}</td>
                    <td className="font-mono" style={{ color: isHalt ? '#D32F2F' : 'inherit', fontWeight: isHalt ? 700 : 400 }}>
                      {(p.metrics.negativeRatio * 100).toFixed(1)}%
                    </td>
                    <td className="font-mono" style={{ color: isSurge ? '#047857' : 'inherit', fontWeight: isSurge ? 700 : 400 }}>
                      {(p.metrics.positiveRatio * 100).toFixed(1)}%
                    </td>
                    <td>
                      {isHalt ? (
                        <span className="badge badge-coral">HALT RESTOCK</span>
                      ) : isSurge ? (
                        <span className="badge badge-mint">INCREASE ORDERS</span>
                      ) : (
                        <span className="badge badge-neutral">STABLE</span>
                      )}
                    </td>
                    <td className="font-mono" style={{ fontWeight: 700 }}>
                      {isHalt ? (
                        <span style={{ color: '#D32F2F' }}>0 (Blocked)</span>
                      ) : (
                        <span>+{p.metrics.recommendedOrderQty} units</span>
                      )}
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--color-ink-muted)' }}>
                      {p.metrics.signalReason}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
