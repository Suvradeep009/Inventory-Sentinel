'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Product, DiagnosticQueryResponse } from '@/lib/types';
import ProductThumbnail from '@/components/ProductThumbnail';
import { Search, Send, ShieldAlert, ArrowUpRight, CheckCircle2, MessageSquare, HelpCircle, Sparkles, Filter, CornerDownLeft } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'system';
  text?: string;
  diagnostic?: DiagnosticQueryResponse;
  timestamp: string;
}

function SmartSearchContent() {
  const searchParams = useSearchParams();
  const initialProductId = searchParams.get('productId') || 'all';

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>(initialProductId);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        if (data.products) {
          setProducts(data.products);
          
          // Initial greeting message tailored to pre-filter
          const paramId = searchParams.get('productId');
          if (paramId) {
            const found = data.products.find((p: Product) => p.id === Number(paramId));
            if (found) {
              setSelectedProductId(paramId);
              setMessages([
                {
                  id: 'msg-welcome-isolated',
                  sender: 'system',
                  text: `Diagnostic context isolated for SKU #${found.id}: ${found.title} (${found.category.toUpperCase()}). Current status: ${found.metrics.restockSignal === 'HALT_RESTOCK' ? 'RESTOCK HALTED (45%+ NEGATIVE)' : found.metrics.restockSignal === 'INCREASE_ORDERS' ? 'SURGE RESTOCK (65%+ POSITIVE)' : 'STABLE'}. What operational inquiries do you have for this item?`,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                },
              ]);
              return;
            }
          }

          setMessages([
            {
              id: 'msg-welcome',
              sender: 'system',
              text: 'Commercial Product Diagnostics Terminal ready. You can query customer sentiment root causes, investigate automated restock signals, or evaluate return risks. Select a specific SKU above for isolated pre-filtered analysis, or query store-wide.',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ]);
        }
      })
      .catch(console.error);
  }, [searchParams]);

  const selectedProduct = products.find(p => p.id === Number(selectedProductId));

  const handleSendQuery = async (queryText?: string) => {
    const query = queryText || inputQuery;
    if (!query.trim() || loading) return;

    const userMsgId = `user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    if (!queryText) setInputQuery('');
    setLoading(true);

    try {
      const res = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          productId: selectedProductId !== 'all' ? Number(selectedProductId) : undefined,
        }),
      });

      const data: DiagnosticQueryResponse = await res.json();
      const sysMsgId = `sys-${Date.now()}`;
      const sysMsg: ChatMessage = {
        id: sysMsgId,
        sender: 'system',
        diagnostic: data,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages(prev => [...prev, sysMsg]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'system',
          text: `Diagnostic synthesis encountered an issue: ${err.message}. Please retry or check connection.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const sampleQueries = selectedProduct ? [
    `Why is ${selectedProduct.title} classified as ${selectedProduct.metrics.restockSignal}?`,
    `What are customer complaints regarding ${selectedProduct.title}?`,
    `What is the recommended procurement order volume for SKU #${selectedProduct.id}?`,
    `Summarize customer sentiment root causes for this product`,
  ] : [
    'Why is Essence Mascara restock halted?',
    'Which cosmetics have surge reorder momentum?',
    'What are customers saying about product packaging and durability?',
    'Provide an executive diagnosis of Product #2 (Eyeshadow Palette)',
  ];

  return (
    <div className="container">
      {/* Header */}
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
            <span className="badge badge-coral">DIAGNOSTIC TERMINAL</span>
            <span style={{ fontSize: '12px', color: 'var(--color-ink-muted)' }}>CONTEXTUAL MERCHANDISE SYNTHESIS</span>
          </div>
          <h1>Smart Search & Product Diagnostics</h1>
          <p style={{ color: 'var(--color-ink-muted)', marginTop: '4px', maxWidth: '720px' }}>
            Interactive executive intelligence terminal. Pre-filter by specific product SKU to isolate relevant consumer reviews, understand root causes behind restock signals, and receive actionable procurement guidance.
          </p>
        </div>

        {/* Product Pre-Filter Selector */}
        <div className="panel" style={{ padding: '12px 16px', minWidth: '340px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <Filter size={12} />
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-subhead)', fontWeight: 700, textTransform: 'uppercase' }}>
              Metadata Pre-Filter:
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {selectedProduct && (
              <ProductThumbnail
                src={selectedProduct.thumbnail}
                title={selectedProduct.title}
                category={selectedProduct.category}
                size={34}
                productId={selectedProduct.id}
                isButton={false}
              />
            )}
            <select
              value={selectedProductId}
              onChange={e => setSelectedProductId(e.target.value)}
              className="input-select"
              style={{ flex: 1, fontSize: '12px' }}
            >
              <option value="all">All Products (Store-Wide Search)</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  SKU #{p.id}: {p.title} ({p.metrics.restockSignal === 'HALT_RESTOCK' ? 'HALT' : p.metrics.restockSignal === 'INCREASE_ORDERS' ? 'SURGE' : 'STABLE'})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Suggested Inquiries */}
      <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, fontFamily: 'var(--font-subhead)', textTransform: 'uppercase', color: 'var(--color-ink-muted)' }}>
          Suggested Inquiries:
        </span>
        {sampleQueries.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSendQuery(q)}
            disabled={loading}
            className="btn btn-sm"
            style={{ fontSize: '11px', textTransform: 'none', fontWeight: 500, backgroundColor: 'var(--bg-subtle)' }}
          >
            &ldquo;{q}&rdquo;
          </button>
        ))}
      </div>

      {/* Terminal Conversation Container */}
      <div className="panel" style={{ display: 'flex', flexDirection: 'column', height: '620px', marginBottom: '20px' }}>
        <div className="panel-header" style={{ borderBottom: '2px solid #000' }}>
          <div className="panel-title">
            <Sparkles size={14} />
            Executive Merchandise Diagnostic Feed
          </div>
          <span className="badge badge-neutral font-mono">
            {selectedProductId !== 'all' ? `FILTER: SKU #${selectedProductId}` : 'SCOPE: STORE-WIDE'}
          </span>
        </div>

        {/* Message Thread */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {messages.map(msg => (
            <div
              key={msg.id}
              style={{
                alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: msg.sender === 'user' ? '70%' : '90%',
              }}
            >
              {/* User Query Bubble */}
              {msg.sender === 'user' ? (
                <div style={{
                  backgroundColor: 'var(--color-ink)',
                  color: '#FFFFFF',
                  padding: '12px 18px',
                  borderRadius: 'var(--radius-tight)',
                  border: '1px solid #000',
                  boxShadow: 'var(--shadow-flat)',
                  fontFamily: 'var(--font-subhead)',
                  fontWeight: 600,
                  fontSize: '13px'
                }}>
                  {msg.text}
                  <div style={{ fontSize: '10px', color: '#999', marginTop: '4px', textAlign: 'right' }} className="font-mono">
                    {msg.timestamp}
                  </div>
                </div>
              ) : (
                /* System Diagnostic Memo */
                <div style={{
                  backgroundColor: 'var(--bg-panel)',
                  border: '1px solid #000',
                  borderRadius: 'var(--radius-tight)',
                  boxShadow: 'var(--shadow-flat)',
                  overflow: 'hidden'
                }}>
                  {msg.text ? (
                    <div style={{ padding: '14px 18px', fontSize: '13px', lineHeight: 1.5 }}>
                      {msg.text}
                    </div>
                  ) : msg.diagnostic ? (
                    <div>
                      {/* Diagnostic Card Header */}
                      <div style={{
                        padding: '10px 16px',
                        backgroundColor: msg.diagnostic.inventoryActionRecommendation === 'HALT_PURCHASE'
                          ? 'var(--color-coral-light)'
                          : msg.diagnostic.inventoryActionRecommendation === 'SURGE_ORDER'
                          ? 'var(--color-mint-light)'
                          : 'var(--bg-subtle)',
                        borderBottom: '1px solid #000',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span style={{ fontFamily: 'var(--font-subhead)', fontWeight: 800, fontSize: '12px', textTransform: 'uppercase' }}>
                          Executive Diagnostic Synthesis
                        </span>
                        {msg.diagnostic.inventoryActionRecommendation === 'HALT_PURCHASE' && (
                          <span className="badge badge-coral">HALT PURCHASE ORDER</span>
                        )}
                        {msg.diagnostic.inventoryActionRecommendation === 'SURGE_ORDER' && (
                          <span className="badge badge-mint">SURGE REORDER ALLOCATION</span>
                        )}
                        {msg.diagnostic.inventoryActionRecommendation === 'MAINTAIN_STOCK' && (
                          <span className="badge badge-neutral">MAINTAIN CURRENT POSTURE</span>
                        )}
                      </div>

                      {/* Product Snapshot Bar (if context available) */}
                      {msg.diagnostic.productContext && (
                        <div style={{
                          padding: '10px 16px',
                          borderBottom: '1px solid #E5E0D4',
                          backgroundColor: '#FAF8F3',
                          fontSize: '11px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '14px',
                          flexWrap: 'wrap'
                        }}>
                          <ProductThumbnail
                            title={msg.diagnostic.productContext.title}
                            category={msg.diagnostic.productContext.category}
                            size={28}
                            productId={msg.diagnostic.productContext.id}
                            isButton={true}
                          />
                          <span style={{ fontWeight: 700 }}>SKU: {msg.diagnostic.productContext.title}</span>
                          <span>Category: <span style={{ textTransform: 'uppercase' }}>{msg.diagnostic.productContext.category}</span></span>
                          <span className="font-mono">Stock on Hand: {msg.diagnostic.productContext.stock} units</span>
                          <span className="font-mono" style={{ color: msg.diagnostic.productContext.negativeRatio >= 0.45 ? '#D32F2F' : 'inherit' }}>
                            Neg Ratio: {(msg.diagnostic.productContext.negativeRatio * 100).toFixed(1)}%
                          </span>
                        </div>
                      )}

                      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {/* 1. Executive Finding */}
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: 700, fontFamily: 'var(--font-subhead)', textTransform: 'uppercase', color: 'var(--color-ink-muted)', marginBottom: '4px' }}>
                            Executive Finding
                          </div>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-ink)', lineHeight: 1.4 }}>
                            {msg.diagnostic.executiveFinding}
                          </div>
                        </div>

                        {/* 2. Root Cause */}
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: 700, fontFamily: 'var(--font-subhead)', textTransform: 'uppercase', color: 'var(--color-ink-muted)', marginBottom: '4px' }}>
                            Customer Sentiment Root Cause
                          </div>
                          <div style={{ fontSize: '13px', color: '#222', lineHeight: 1.4 }}>
                            {msg.diagnostic.sentimentRootCause}
                          </div>
                        </div>

                        {/* 3. Operational Inventory Action */}
                        <div style={{
                          padding: '10px 14px',
                          border: '1px solid #000',
                          borderRadius: 'var(--radius-tight)',
                          backgroundColor: '#FAF8F3'
                        }}>
                          <div style={{ fontSize: '11px', fontWeight: 700, fontFamily: 'var(--font-subhead)', textTransform: 'uppercase', color: 'var(--color-ink-muted)', marginBottom: '2px' }}>
                            Operational Procurement Directive
                          </div>
                          <div style={{ fontSize: '12px', fontWeight: 600 }}>
                            {msg.diagnostic.actionDetails}
                          </div>
                        </div>

                        {/* 4. Verbatim Customer Feedback Evidence */}
                        {msg.diagnostic.relevantComments && msg.diagnostic.relevantComments.length > 0 && (
                          <div>
                            <div style={{ fontSize: '11px', fontWeight: 700, fontFamily: 'var(--font-subhead)', textTransform: 'uppercase', color: 'var(--color-ink-muted)', marginBottom: '6px' }}>
                              Relevant Customer Feedback Extracts
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {msg.diagnostic.relevantComments.map((c, i) => (
                                <div key={i} style={{
                                  padding: '8px 12px',
                                  border: '1px solid #E0DDD4',
                                  borderRadius: 'var(--radius-tight)',
                                  backgroundColor: '#FFFFFF',
                                  fontSize: '12px',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  gap: '10px'
                                }}>
                                  <span style={{ fontStyle: 'italic' }}>&ldquo;{c.comment}&rdquo;</span>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                    <span style={{ fontSize: '11px', color: 'var(--color-ink-muted)' }}>{c.author}</span>
                                    <span className={`badge ${c.tier === 'Very Bad' ? 'badge-coral' : c.tier === 'Very Good' ? 'badge-mint' : 'badge-neutral'}`} style={{ fontSize: '9px' }}>
                                      {c.tier}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}
                  <div style={{ padding: '4px 16px 8px 16px', fontSize: '10px', color: 'var(--color-ink-muted)', textAlign: 'right' }} className="font-mono">
                    SYNTHESIS COMPLETED &bull; {msg.timestamp}
                  </div>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div style={{
              alignSelf: 'flex-start',
              padding: '12px 18px',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid #000',
              borderRadius: 'var(--radius-tight)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '12px',
              fontFamily: 'var(--font-subhead)',
              fontWeight: 600
            }}>
              <span className="animate-pulse" style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#000', borderRadius: '50%' }} />
              Pre-filtering metadata & synthesizing executive diagnostic brief...
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div style={{
          padding: '14px 16px',
          borderTop: '2px solid #000',
          backgroundColor: 'var(--bg-subtle)',
          display: 'flex',
          gap: '10px'
        }}>
          <input
            type="text"
            placeholder="Ask a commercial diagnostic question about stock, complaints, or restock status..."
            value={inputQuery}
            onChange={e => setInputQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSendQuery();
            }}
            disabled={loading}
            className="input-text"
            style={{ flex: 1, padding: '10px 14px', fontSize: '13px' }}
          />
          <button
            onClick={() => handleSendQuery()}
            disabled={loading || !inputQuery.trim()}
            className="btn btn-mint"
            style={{ padding: '10px 18px' }}
          >
            <Send size={14} />
            Evaluate
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SmartSearchDiagnosticsPage() {
  return (
    <Suspense fallback={
      <div className="container" style={{ padding: '40px 20px', textAlign: 'center', fontFamily: 'var(--font-subhead)' }}>
        Loading Diagnostic Terminal...
      </div>
    }>
      <SmartSearchContent />
    </Suspense>
  );
}
