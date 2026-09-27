import './globals.css';
import Navigation from '@/components/Navigation';
import { ReactNode } from 'react';

export const metadata = {
  title: 'Inventory Sentinel V2 | Commercial AI Inventory Platform',
  description: 'Automated retail replenishment, customer feedback intelligence, and procurement restock signals.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Navigation />
        <main>{children}</main>
        <footer style={{
          borderTop: 'var(--border-black)',
          backgroundColor: 'var(--bg-subtle)',
          padding: '24px 20px',
          marginTop: '60px',
          fontFamily: 'var(--font-subhead)',
          fontSize: '12px',
          color: 'var(--color-ink-muted)'
        }}>
          <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontWeight: 700, color: 'var(--color-ink)', textTransform: 'uppercase' }}>
                INVENTORY SENTINEL ENTERPRISE V2
              </span>
              <span>&bull;</span>
              <span>AUTOMATED INVENTORY INTELLIGENCE</span>
              <span>&bull;</span>
              <span className="font-mono">STATUS: OPERATIONAL</span>
            </div>
            <div>
              <span>RESTOCK POLICY: HALT &ge; 45% NEGATIVE &bull; SURGE &ge; 65% POSITIVE</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
