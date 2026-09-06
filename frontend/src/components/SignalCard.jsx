export default function SignalCard({ item, onAction }) {
  const signal = item.signal;

  const cardClass =
    signal === 'HALT_RESTOCK'   ? 'alert-card--halt'     :
    signal === 'INCREASE_ORDER' ? 'alert-card--increase' :
                                  'alert-card--hold';

  const pillClass =
    signal === 'HALT_RESTOCK'   ? 'pill-badge--coral'    :
    signal === 'INCREASE_ORDER' ? 'pill-badge--mint'     :
                                  'pill-badge--neutral';

  const signalLabel =
    signal === 'HALT_RESTOCK'   ? 'HALT RESTOCK'    :
    signal === 'INCREASE_ORDER' ? 'INCREASE ORDER' :
                                  'HOLD STEADY';

  const isHalt = item.negative_pct >= 45;
  const isIncrease = item.positive_pct >= 65;

  return (
    <div className={`alert-card ${cardClass}`}>
      <div className="alert-card__top">
        <div>
          <span className="alert-card__sku">{item.sku} // {item.category}</span>
          <h3 className="alert-card__name">{item.product_name}</h3>
        </div>
        <span className={`pill-badge ${pillClass}`}>
          {signalLabel}
        </span>
      </div>

      <div className="alert-card__stats">
        <div className="alert-card__stat-item">
          <span className="alert-card__stat-lbl">Inventory</span>
          <span className="alert-card__stat-val">{item.stock} <small style={{ fontSize: '0.8rem', fontWeight: 600 }}>units</small></span>
        </div>
        <div className="alert-card__stat-item">
          <span className="alert-card__stat-lbl">Negative (Bad)</span>
          <span
            className="alert-card__stat-val"
            style={{ color: isHalt ? 'var(--coral-dark)' : 'inherit' }}
          >
            {item.negative_pct}%
          </span>
        </div>
        <div className="alert-card__stat-item">
          <span className="alert-card__stat-lbl">Positive (Good)</span>
          <span
            className="alert-card__stat-val"
            style={{ color: isIncrease ? 'var(--mint-dark)' : 'inherit' }}
          >
            {item.positive_pct}%
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--ink-secondary)' }}>
          ₹{Number(item.price).toLocaleString('en-IN')} • {item.total_reviews} Reviews • Score {item.overall_score}/5.0
        </span>
        {signal === 'HALT_RESTOCK' && (
          <button
            type="button"
            className="btn-saas btn-saas--coral"
            style={{ padding: '0.4rem 0.9rem', fontSize: '0.72rem' }}
            onClick={() => onAction && onAction('HALT', item)}
          >
            Halt Restock
          </button>
        )}
        {signal === 'INCREASE_ORDER' && (
          <button
            type="button"
            className="btn-saas btn-saas--mint"
            style={{ padding: '0.4rem 0.9rem', fontSize: '0.72rem' }}
            onClick={() => onAction && onAction('INCREASE', item)}
          >
            +35% Order
          </button>
        )}
      </div>
    </div>
  );
}
