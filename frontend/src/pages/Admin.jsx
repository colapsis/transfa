import { useState, useEffect, useCallback } from 'react';

const API = '/api/admin';

function fmt(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0, n = bytes;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return n.toFixed(i > 0 ? 1 : 0) + ' ' + units[i];
}

function fmtDate(ts) {
  if (!ts) return '—';
  return new Date(ts * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
}

function Progress({ label, value, max, color = 'var(--accent)' }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
        <span>{label}</span>
        <span className="mono" style={{ color }}>{value} / {max} <span className="muted">({pct}%)</span></span>
      </div>
      <div style={{ height: 6, background: 'var(--bg-2)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: pct + '%', background: color, borderRadius: 99, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '20px 24px', background: 'var(--bg-1)' }}>
      <div className="mono muted-2" style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.04em', color: 'var(--text-1)', lineHeight: 1 }}>{value}</div>
      {sub && <div className="mono muted" style={{ fontSize: 12, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

export default function Admin() {
  const [token, setToken] = useState(() => sessionStorage.getItem('admin_token') || '');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [system, setSystem] = useState(null);
  const [audit, setAudit] = useState(null);
  const [statsError, setStatsError] = useState('');

  const logout = () => {
    fetch(API + '/logout', { method: 'POST', headers: { Authorization: 'Bearer ' + token } }).catch(() => {});
    sessionStorage.removeItem('admin_token');
    setToken('');
    setStats(null);
    setSystem(null);
    setAudit(null);
  };

  const loadStats = useCallback(async (tok) => {
    setStatsError('');
    try {
      const r = await fetch(API + '/stats', { headers: { Authorization: 'Bearer ' + tok } });
      if (r.status === 401) { logout(); return; }
      setStats(await r.json());
    } catch { setStatsError('Failed to load stats'); }
  }, []);

  const loadSystem = useCallback(async (tok) => {
    try {
      const r = await fetch(API + '/system', { headers: { Authorization: 'Bearer ' + tok } });
      if (r.status === 401) { logout(); return; }
      setSystem(await r.json());
    } catch { /* silent */ }
  }, []);

  const loadAudit = useCallback(async (tok) => {
    try {
      const r = await fetch(API + '/audit?limit=200', { headers: { Authorization: 'Bearer ' + tok } });
      if (r.status === 401) { logout(); return; }
      setAudit(await r.json());
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    if (!token) return;
    loadStats(token);
    loadSystem(token);
    loadAudit(token);
    const t = setInterval(() => { loadStats(token); loadSystem(token); loadAudit(token); }, 30000);
    return () => clearInterval(t);
  }, [token]);

  async function handleLogin(e) {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const r = await fetch(API + '/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      });
      const data = await r.json();
      if (!r.ok) { setLoginError(data.error || 'Login failed'); return; }
      sessionStorage.setItem('admin_token', data.token);
      setToken(data.token);
    } catch { setLoginError('Network error'); }
    finally { setLoginLoading(false); }
  }

  if (!token) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-0)' }}>
        <div style={{ width: 360, padding: 40, border: '1px solid var(--border)', borderRadius: 12, background: 'var(--bg-1)' }}>
          <div className="mono" style={{ color: 'var(--accent)', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>admin</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 28 }}>transfa.sh</h1>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-2)', marginBottom: 6 }}>Username</label>
              <input
                type="text"
                autoComplete="username"
                value={loginForm.username}
                onChange={e => setLoginForm(f => ({ ...f, username: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-0)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-1)', fontSize: 14, boxSizing: 'border-box' }}
                required
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-2)', marginBottom: 6 }}>Password</label>
              <input
                type="password"
                autoComplete="current-password"
                value={loginForm.password}
                onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-0)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-1)', fontSize: 14, boxSizing: 'border-box' }}
                required
              />
            </div>
            {loginError && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 14 }}>{loginError}</div>}
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loginLoading}>
              {loginLoading ? 'signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const planColors = { free: 'var(--text-3)', pro: 'var(--accent)', team: '#a78bfa', enterprise: '#f59e0b' };
  const goals = { users: 100, uploads: 1000, storageTB: 1 };

  const totalUsers = stats ? stats.usersByPlan.reduce((s, r) => s + r.count, 0) : 0;
  const totalUploads = stats?.totals?.total_uploads || 0;
  const totalBytes = stats?.totals?.total_bytes || 0;
  const totalGB = totalBytes / 1e9;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-0)', color: 'var(--text-1)' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--border)', padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="mono" style={{ color: 'var(--accent)', fontSize: 13 }}>transfa.sh</span>
          <span style={{ color: 'var(--border)' }}>/</span>
          <span className="mono" style={{ fontSize: 13, color: 'var(--text-2)' }}>admin</span>
        </div>
        <button className="btn btn-secondary" style={{ height: 32, padding: '0 14px', fontSize: 12 }} onClick={logout}>Sign out</button>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid var(--border)', padding: '0 32px', display: 'flex', gap: 4 }}>
        {['overview', 'users', 'audit', 'system'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: '14px 16px',
              fontSize: 13, fontFamily: 'var(--mono)', color: tab === t ? 'var(--text-1)' : 'var(--text-3)',
              borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {t}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
          <button
            onClick={() => { loadStats(token); loadSystem(token); loadAudit(token); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 12, fontFamily: 'var(--mono)', padding: '0 8px' }}
          >
            ↻ refresh
          </button>
        </div>
      </div>

      <div style={{ padding: '32px', maxWidth: 1200, margin: '0 auto' }}>
        {statsError && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 16 }}>{statsError}</div>}

        {/* OVERVIEW TAB */}
        {tab === 'overview' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
              <StatCard label="Total Users" value={totalUsers} sub={`today +${stats?.uploadsToday ?? '…'} uploads`} />
              <StatCard label="Total Uploads" value={totalUploads.toLocaleString()} sub={`${stats?.totals?.active_uploads ?? 0} active`} />
              <StatCard label="Storage Used" value={fmt(totalBytes)} sub={`${(totalGB / 1000).toFixed(3)} TB`} />
              <StatCard label="Total Downloads" value={(stats?.totals?.total_downloads || 0).toLocaleString()} sub={`today +${stats?.downloadsToday ?? '…'}`} />
            </div>

            {/* Plans breakdown */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
              <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 24, background: 'var(--bg-1)' }}>
                <div className="mono" style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 20 }}>Users by plan</div>
                {stats ? stats.usersByPlan.map(r => (
                  <div key={r.plan} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
                    <span style={{ color: planColors[r.plan] || 'var(--text-2)', fontFamily: 'var(--mono)' }}>{r.plan}</span>
                    <span style={{ fontWeight: 600 }}>{r.count}</span>
                  </div>
                )) : <div className="muted mono" style={{ fontSize: 13 }}>loading…</div>}
              </div>

              <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 24, background: 'var(--bg-1)' }}>
                <div className="mono" style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 20 }}>Goals</div>
                {stats ? (
                  <>
                    <Progress label="Users" value={totalUsers} max={goals.users} />
                    <Progress label="Uploads" value={totalUploads} max={goals.uploads} color="#a78bfa" />
                    <Progress label="Storage (GB)" value={Math.round(totalGB)} max={goals.storageTB * 1000} color="#f59e0b" />
                  </>
                ) : <div className="muted mono" style={{ fontSize: 13 }}>loading…</div>}
              </div>
            </div>

            {/* Top uploaders */}
            {stats?.topUploaders?.length > 0 && (
              <div style={{ border: '1px solid var(--border)', borderRadius: 10, background: 'var(--bg-1)', overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
                  <span className="mono" style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)' }}>Top uploaders</span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Username', 'Plan', 'Uploads', 'Storage'].map(h => (
                        <th key={h} style={{ padding: '10px 24px', textAlign: 'left', fontWeight: 500, color: 'var(--text-3)', fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stats.topUploaders.map((u, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 24px', fontFamily: 'var(--mono)' }}>{u.username}</td>
                        <td style={{ padding: '10px 24px', color: planColors[u.plan] || 'var(--text-2)', fontFamily: 'var(--mono)', fontSize: 12 }}>{u.plan}</td>
                        <td style={{ padding: '10px 24px', fontFamily: 'var(--mono)' }}>{u.upload_count}</td>
                        <td style={{ padding: '10px 24px', fontFamily: 'var(--mono)' }}>{fmt(u.total_bytes)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* USERS TAB */}
        {tab === 'users' && (
          <div style={{ border: '1px solid var(--border)', borderRadius: 10, background: 'var(--bg-1)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="mono" style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)' }}>Recent users</span>
              <span className="mono muted-2" style={{ fontSize: 12 }}>{totalUsers} total</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 560 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['ID', 'Username', 'Email', 'Plan', 'Joined'].map(h => (
                      <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontWeight: 500, color: 'var(--text-3)', fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats?.recentUsers ? stats.recentUsers.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 20px', fontFamily: 'var(--mono)', color: 'var(--text-3)', fontSize: 12 }}>{u.id}</td>
                      <td style={{ padding: '10px 20px', fontFamily: 'var(--mono)' }}>{u.username}</td>
                      <td style={{ padding: '10px 20px', color: 'var(--text-2)', fontSize: 12 }}>{u.email || '—'}</td>
                      <td style={{ padding: '10px 20px', color: planColors[u.plan] || 'var(--text-2)', fontFamily: 'var(--mono)', fontSize: 12 }}>{u.plan}</td>
                      <td style={{ padding: '10px 20px', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-3)' }}>{fmtDate(u.created_at)}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)', fontFamily: 'var(--mono)', fontSize: 13 }}>loading…</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* AUDIT TAB */}
        {tab === 'audit' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span className="mono muted" style={{ fontSize: 12 }}>
                {audit?.events ? `${audit.events.length} events` : 'loading…'}
              </span>
              <button
                className="btn btn-secondary"
                style={{ height: 28, padding: '0 12px', fontSize: 12 }}
                onClick={() => loadAudit(token)}
              >
                ↻ refresh
              </button>
            </div>
            <div style={{ border: '1px solid var(--border)', borderRadius: 10, background: 'var(--bg-1)', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 680 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Type', 'When', 'File', 'Size', 'Uploader', 'IP'].map(h => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: 'var(--text-3)', fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {audit?.events ? audit.events.map((e, i) => {
                      const typeColor = e.type === 'upload' ? 'var(--ok)' : e.type === 'download' ? 'var(--accent)' : 'var(--danger)';
                      const when = new Date(e.ts * 1000);
                      const whenStr = when.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + when.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                      const ua = e.user_agent ? e.user_agent.slice(0, 40) + (e.user_agent.length > 40 ? '…' : '') : null;
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '8px 16px' }}>
                            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: typeColor, background: typeColor + '18', padding: '2px 8px', borderRadius: 4, letterSpacing: '0.04em' }}>{e.type}</span>
                          </td>
                          <td style={{ padding: '8px 16px', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{whenStr}</td>
                          <td style={{ padding: '8px 16px', fontFamily: 'var(--mono)', fontSize: 12, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <span title={e.original_filename}>{e.original_filename || '—'}</span>
                          </td>
                          <td style={{ padding: '8px 16px', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{fmt(e.size)}</td>
                          <td style={{ padding: '8px 16px', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-2)' }}>{e.uploader_name || <span style={{ color: 'var(--text-3)' }}>guest</span>}</td>
                          <td style={{ padding: '8px 16px', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-3)' }}>
                            {e.ip ? (
                              <span title={e.user_agent || ''}>{e.ip}</span>
                            ) : '—'}
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)', fontFamily: 'var(--mono)', fontSize: 13 }}>loading…</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {audit?.events?.length === 0 && (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', fontFamily: 'var(--mono)', fontSize: 13 }}>no events yet</div>
              )}
            </div>
          </div>
        )}

        {/* SYSTEM TAB */}
        {tab === 'system' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>
              {/* Disk */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 24, background: 'var(--bg-1)' }}>
                <div className="mono" style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 16 }}>Disk (/)</div>
                {system?.disk ? (
                  <>
                    <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.04em', marginBottom: 4 }}>{system.disk.used} <span style={{ fontSize: 16, color: 'var(--text-3)' }}>/ {system.disk.total}</span></div>
                    <div className="mono muted" style={{ fontSize: 12, marginBottom: 12 }}>{system.disk.available} available · {system.disk.pct}</div>
                    <div style={{ height: 6, background: 'var(--bg-2)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: system.disk.pct, background: parseInt(system.disk.pct) > 85 ? 'var(--danger)' : 'var(--accent)', borderRadius: 99 }} />
                    </div>
                  </>
                ) : <div className="muted mono" style={{ fontSize: 13 }}>loading…</div>}
              </div>

              {/* Memory */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 24, background: 'var(--bg-1)' }}>
                <div className="mono" style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 16 }}>Memory</div>
                {system?.memory ? (
                  <>
                    <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.04em', marginBottom: 4 }}>{system.memory.used} <span style={{ fontSize: 16, color: 'var(--text-3)' }}>/ {system.memory.total} MB</span></div>
                    <div className="mono muted" style={{ fontSize: 12, marginBottom: 12 }}>{system.memory.available} MB available</div>
                    <div style={{ height: 6, background: 'var(--bg-2)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: Math.round((system.memory.used / system.memory.total) * 100) + '%', background: (system.memory.used / system.memory.total) > 0.85 ? 'var(--danger)' : '#a78bfa', borderRadius: 99 }} />
                    </div>
                  </>
                ) : <div className="muted mono" style={{ fontSize: 13 }}>loading…</div>}
              </div>

              {/* Load */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 24, background: 'var(--bg-1)' }}>
                <div className="mono" style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 16 }}>Load average</div>
                {system?.load ? (
                  <>
                    <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.04em', marginBottom: 8 }}>{system.load['1m']}</div>
                    <div className="mono muted" style={{ fontSize: 12 }}>5m: {system.load['5m']} · 15m: {system.load['15m']}</div>
                    {system.uptime && <div className="mono muted" style={{ fontSize: 12, marginTop: 8 }}>{system.uptime}</div>}
                  </>
                ) : <div className="muted mono" style={{ fontSize: 13 }}>loading…</div>}
              </div>
            </div>

            {/* PM2 Processes */}
            {system?.processes?.length > 0 && (
              <div style={{ border: '1px solid var(--border)', borderRadius: 10, background: 'var(--bg-1)', overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
                  <span className="mono" style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)' }}>PM2 processes</span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Name', 'Status', 'PID', 'Memory', 'CPU', 'Restarts'].map(h => (
                        <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontWeight: 500, color: 'var(--text-3)', fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {system.processes.map((p, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 20px', fontFamily: 'var(--mono)' }}>{p.name}</td>
                        <td style={{ padding: '10px 20px' }}>
                          <span style={{ color: p.status === 'online' ? 'var(--ok)' : 'var(--danger)', fontFamily: 'var(--mono)', fontSize: 12 }}>{p.status}</span>
                        </td>
                        <td style={{ padding: '10px 20px', fontFamily: 'var(--mono)', color: 'var(--text-3)', fontSize: 12 }}>{p.pid || '—'}</td>
                        <td style={{ padding: '10px 20px', fontFamily: 'var(--mono)', fontSize: 12 }}>{p.memory ? fmt(p.memory) : '—'}</td>
                        <td style={{ padding: '10px 20px', fontFamily: 'var(--mono)', fontSize: 12 }}>{p.cpu != null ? p.cpu + '%' : '—'}</td>
                        <td style={{ padding: '10px 20px', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-3)' }}>{p.restarts ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {system && (
              <div className="mono muted-2" style={{ fontSize: 11, marginTop: 16 }}>
                Last updated: {new Date(system.timestamp).toLocaleTimeString()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
