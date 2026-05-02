'use client';
import React, { useEffect, useState } from 'react';
import { AlertTriangle, Clock, RefreshCcw, Trash2, ChevronRight, ShieldAlert } from 'lucide-react';

interface ErrorLog {
  id: string;
  timestamp: string;
  context: string;
  message: string;
  explanation: string;
  suggestion: string;
  stack?: string;
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/logs');
      const data = await res.json();
      setLogs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (!confirm('Hapus semua log?')) return;
    await fetch('/api/admin/logs', { method: 'DELETE' });
    setLogs([]);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#09090b', color: '#f8fafc', padding: '40px 20px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 16 }}>
              <ShieldAlert size={36} color="#ef4444" /> ZENIX Error Control
            </h1>
            <p style={{ color: '#a1a1aa', marginTop: 8 }}>Pantau dan diagnosa masalah sistem ZENIX secara real-time.</p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={fetchLogs} style={{ background: '#27272a', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
              <RefreshCcw size={18} /> Refresh
            </button>
            <button onClick={handleClear} style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '10px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
              <Trash2 size={18} /> Clear Logs
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 100, color: '#a1a1aa' }}>Memuat data log...</div>
        ) : logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 100, background: '#18181b', borderRadius: 24, border: '1px dashed #3f3f46' }}>
            <Clock size={48} color="#3f3f46" style={{ marginBottom: 16 }} />
            <h3 style={{ margin: 0 }}>Belum ada error terdeteksi.</h3>
            <p style={{ color: '#a1a1aa' }}>Sistem berjalan normal sejauh ini.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {logs.map(log => (
              <div key={log.id} style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 20, overflow: 'hidden', transition: 'all 0.2s' }}>
                <div 
                  onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                  style={{ padding: '20px 24px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 20 }}
                >
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <AlertTriangle size={24} color="#ef4444" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: '#ef4444', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>{log.context}</div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{log.message}</div>
                  </div>
                  <div style={{ textAlign: 'right', color: '#a1a1aa', fontSize: 13 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                      <Clock size={14} /> {new Date(log.timestamp).toLocaleTimeString('id-ID')}
                    </div>
                    <div style={{ marginTop: 4 }}>{new Date(log.timestamp).toLocaleDateString('id-ID')}</div>
                  </div>
                  <ChevronRight size={20} color="#3f3f46" style={{ transform: expandedId === log.id ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                </div>

                {expandedId === log.id && (
                  <div style={{ padding: '0 24px 24px', borderTop: '1px solid #27272a', background: 'rgba(0,0,0,0.2)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 24 }}>
                      <div style={{ background: '#27272a', padding: 20, borderRadius: 16 }}>
                        <h4 style={{ margin: '0 0 8px', color: '#ef4444', fontSize: 14 }}>PENJELASAN (HUMAN READABLE)</h4>
                        <p style={{ margin: 0, lineHeight: 1.6, fontSize: 15 }}>{log.explanation}</p>
                      </div>
                      <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: 20, borderRadius: 16 }}>
                        <h4 style={{ margin: '0 0 8px', color: '#10b981', fontSize: 14 }}>SARAN PERBAIKAN</h4>
                        <p style={{ margin: 0, lineHeight: 1.6, fontSize: 15, color: '#10b981' }}>{log.suggestion}</p>
                      </div>
                    </div>
                    
                    {log.stack && (
                      <div style={{ marginTop: 24 }}>
                        <h4 style={{ margin: '0 0 12px', color: '#a1a1aa', fontSize: 13 }}>TECHNICAL STACK TRACE</h4>
                        <pre style={{ margin: 0, background: '#09090b', padding: 16, borderRadius: 12, fontSize: 12, color: '#71717a', overflowX: 'auto', fontFamily: 'monospace' }}>
                          {log.stack}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
