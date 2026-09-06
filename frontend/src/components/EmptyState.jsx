export default function EmptyState({ message = 'INVENTORY_EMPTY // AWAITING_DATA', sub = '' }) {
  return (
    <div className="empty-state">
      <div className="empty-state__text">{message}</div>
      {sub && <div className="empty-state__sub">{sub}</div>}
    </div>
  );
}
