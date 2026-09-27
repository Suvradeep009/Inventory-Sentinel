import SentimentBadge from './SentimentBadge';

export default function ReviewTable({ reviews }) {
  if (!reviews || reviews.length === 0) {
    return (
      <div style={{ padding: '2.5rem', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--ink-secondary)' }}>
        No customer reviews recorded for this product yet.
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="editorial-table">
        <thead>
          <tr>
            <th style={{ width: '40px' }}>No.</th>
            <th style={{ width: '130px' }}>Reviewer</th>
            <th>Customer Review</th>
            <th style={{ width: '140px' }}>Satisfaction Tier</th>
            <th style={{ width: '90px' }}>Confidence</th>
          </tr>
        </thead>
        <tbody>
          {reviews.map((r, idx) => (
            <tr key={r.review_id || r.id || idx}>
              <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-muted)' }}>
                {String(idx + 1).padStart(2, '0')}
              </td>
              <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                @{r.reviewer || 'anonymous'}
              </td>
              <td style={{ lineHeight: 1.5, color: 'var(--ink-black)' }}>
                "{r.text}"
              </td>
              <td>
                <SentimentBadge tier={r.tier} />
              </td>
              <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                {(r.confidence * 100).toFixed(0)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
