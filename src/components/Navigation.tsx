'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, MessageSquare, TrendingUp, Search, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Navigation() {
  const pathname = usePathname();
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/sync')
      .then(res => res.json())
      .then(data => {
        if (data.lastSyncedAt) {
          setLastSync(new Date(data.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        }
      })
      .catch(() => {});
  }, []);

  const handleGlobalSync = async () => {
    try {
      setSyncing(true);
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 30 }),
      });
      const data = await res.json();
      if (data.success) {
        setLastSync(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSyncing(false);
    }
  };

  const navItems = [
    { href: '/', label: 'Home Hub', icon: LayoutDashboard },
    { href: '/sentiment', label: 'Customer Feedback', icon: MessageSquare },
    { href: '/demand', label: 'Restock Signals', icon: TrendingUp },
    { href: '/insights', label: 'Smart Search', icon: Search },
  ];

  return (
    <header className="navbar">
      <div className="nav-container">
        <div className="nav-brand">
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="brand-logo">IS-V2</span>
            <span className="brand-title">Inventory Sentinel</span>
          </Link>
          <span className="badge badge-neutral" style={{ marginLeft: '6px', fontSize: '10px' }}>
            COMMERCIAL SUITE
          </span>
        </div>

        <nav className="nav-links">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link ${isActive ? 'active' : ''}`}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Icon size={14} />
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {lastSync && (
            <span className="font-mono" style={{ fontSize: '11px', color: 'var(--color-ink-muted)' }}>
              SYNC: {lastSync}
            </span>
          )}
          <button
            onClick={handleGlobalSync}
            disabled={syncing}
            className="btn btn-mint btn-sm"
            title="Ingest live product and review payload from store database"
          >
            <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing...' : 'Sync Store Data'}
          </button>
        </div>
      </div>
    </header>
  );
}
