export default function EmptyState({
  message = 'What would you like to know about your products?',
  sub = '',
}) {
  return (
    <div className="empty-state">
      <div className="empty-state__text">{message}</div>
      {sub && <div className="empty-state__sub">{sub}</div>}
    </div>
  );
}
