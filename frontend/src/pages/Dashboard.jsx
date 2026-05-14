import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import Seo from '../components/Seo.jsx';

const API_KEY_STORAGE = 'transfa_api_key';

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  if (bytes >= 1e9) return (bytes / 1e9).toFixed(1) + ' GB';
  if (bytes >= 1e6) return (bytes / 1e6).toFixed(1) + ' MB';
  if (bytes >= 1e3) return (bytes / 1e3).toFixed(1) + ' KB';
  return bytes + ' B';
}

function timeAgo(isoStr) {
  if (!isoStr) return '—';
  const diff = (Date.now() - new Date(isoStr).getTime()) / 1000;
  if (diff < 60) return Math.floor(diff) + 's ago';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

function expiryLabel(isoStr) {
  if (!isoStr) return { label: '—', status: 'dead' };
  const diff = (new Date(isoStr).getTime() - Date.now()) / 1000;
  if (diff <= 0) return { label: 'expired', status: 'dead' };
  const d = Math.floor(diff / 86400);
  const h = Math.floor((diff % 86400) / 3600);
  if (diff < 86400) return { label: `in ${h}h`, status: 'warn' };
  return { label: `in ${d}d ${h}h`, status: 'live' };
}

function getFileExt(filename) {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : 'bin';
}

const EXT_COLORS = {
  parquet: '#b3eaff', zip: '#ffb86b', json: '#e8ff47', tar: '#ff7eb6',
  pb: '#b3eaff', fig: '#a78bfa', pdf: '#ff5c5c', safetensors: '#46e08b',
  csv: '#e8ff47', txt: '#b3b3b3', py: '#ffb86b', js: '#ffb86b',
};

function FileTypeBadge({ filename }) {
  const ext = getFileExt(filename);
  const color = EXT_COLORS[ext] || 'var(--text-2)';
  return (
    <div style={{ width: 36, height: 36, borderRadius: 6, background: 'var(--bg-2)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, color, letterSpacing: '0.04em', flexShrink: 0 }}>
      {ext.slice(0, 4).toUpperCase()}
    </div>
  );
}

export default function Dashboard() {
  const [tab, setTab] = useState('uploads');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(API_KEY_STORAGE) || '');
  const [keyInput, setKeyInput] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [newKeyInfo, setNewKeyInfo] = useState(null);
  const [keyCopied, setKeyCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [upgradeBanner, setUpgradeBanner] = useState(() => {
    const p = new URLSearchParams(window.location.search);
    return p.get('upgrade') === 'success';
  });
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [loadCounter, setLoadCounter] = useState(0);

  useEffect(() => {
    if (!apiKey) return;
    setLoading(true);
    setError(null);
    fetch('/api/dashboard', {
      headers: { Authorization: 'Bearer ' + apiKey },
    })
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); setApiKey(''); localStorage.removeItem(API_KEY_STORAGE); }
        else setData(d);
      })
      .catch(() => { setError('connection failed'); setApiKey(''); localStorage.removeItem(API_KEY_STORAGE); })
      .finally(() => setLoading(false));
  }, [apiKey, loadCounter]);

  function handleKeySubmit(e) {
    e.preventDefault();
    const key = keyInput.trim();
    if (!key) return;
    localStorage.setItem(API_KEY_STORAGE, key);
    setApiKey(key);
    setKeyInput('');
    setError(null);
    setNewKeyInfo(null);
  }

  async function generateFreeKey() {
    setGenerating(true);
    try {
      const res = await fetch('/api/auth/key', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'default' }) });
      const d = await res.json();
      if (d.key) {
        setNewKeyInfo({ key: d.key, username: d.username });
        setKeyInput(d.key);
      }
    } catch {
      setError('failed to generate key — server unreachable');
    }
    setGenerating(false);
  }

  function copyKey(key) {
    navigator.clipboard?.writeText(key);
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 1500);
  }

  function signInWithNewKey() {
    if (!newKeyInfo?.key) return;
    localStorage.setItem(API_KEY_STORAGE, newKeyInfo.key);
    setApiKey(newKeyInfo.key);
    setKeyInput('');
    setNewKeyInfo(null);
    setError(null);
  }

  if (!apiKey) {
    return (
      <div style={{ minHeight: 'calc(100vh - 56px)', display: 'grid', placeItems: 'center', padding: 32 }}>
        <Seo title="Sign In" noindex />
        <div style={{ width: '100%', maxWidth: 480 }}>

          {/* New key reveal — shown after generation */}
          {newKeyInfo && (
            <div style={{ marginBottom: 32, padding: 24, border: '1px solid var(--accent-line)', borderRadius: 10, background: 'var(--accent-soft)' }}>
              <div className="mono" style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 12 }}>
                Your API key — save this now
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                <code style={{ flex: 1, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 12px', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text)', wordBreak: 'break-all', display: 'block' }}>
                  {newKeyInfo.key}
                </code>
                <button
                  className={'copy-btn' + (keyCopied ? ' copied' : '')}
                  onClick={() => copyKey(newKeyInfo.key)}
                  style={{ flexShrink: 0, padding: '8px 12px' }}
                >
                  {keyCopied ? 'copied ✓' : 'copy'}
                </button>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--mono)', margin: '0 0 16px', lineHeight: 1.5 }}>
                This key won't be shown again. Your workspace: <span style={{ color: 'var(--text-2)' }}>{newKeyInfo.username}</span>
              </p>
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={signInWithNewKey}>
                Continue to dashboard →
              </button>
            </div>
          )}

          {/* Sign in form */}
          {!newKeyInfo && (
            <>
              <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 8 }}>Sign in</h1>
              <p className="muted" style={{ fontSize: 14, marginBottom: 32 }}>Enter your API key to access your dashboard. Your key is your login.</p>

              {error && <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(255,92,92,0.06)', border: '1px solid rgba(255,92,92,0.3)', borderRadius: 6, fontSize: 13, color: 'var(--danger)' }}>{error}</div>}

              <form onSubmit={handleKeySubmit}>
                <input
                  value={keyInput}
                  onChange={e => setKeyInput(e.target.value)}
                  placeholder="tf_live_••••••••••••••••••••••••••••••••"
                  style={{ width: '100%', background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 14px', color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: 13, outline: 'none', marginBottom: 12 }}
                />
                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} type="submit" disabled={!keyInput.trim()}>
                  Sign in
                </button>
              </form>

              <div style={{ marginTop: 24, padding: '20px 24px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg-1)' }}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>No key yet?</div>
                <p className="muted" style={{ fontSize: 13, margin: '0 0 14px', lineHeight: 1.5 }}>
                  Generate a free key instantly — no email, no password. Free tier includes 20 uploads/day.
                </p>
                <button
                  className="btn btn-secondary"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={generateFreeKey}
                  disabled={generating}
                >
                  {generating ? 'generating…' : 'Get a free key'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ minHeight: 'calc(100vh - 56px)', display: 'grid', placeItems: 'center' }}>
        <div style={{ fontFamily: 'var(--mono)', color: 'var(--text-3)', fontSize: 13 }}>loading…</div>
      </div>
    );
  }

  const user = data?.user || { username: 'anonymous', plan: 'free' };

  // Upgrade success banner (shown after returning from Stripe Checkout)
  const UpgradeBanner = upgradeBanner ? (
    <div style={{ margin: '0 0 24px', padding: '14px 20px', border: '1px solid var(--accent-line)', borderRadius: 8, background: 'var(--accent-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 13 }}>
        <span style={{ color: 'var(--accent)' }}>✓</span> <span style={{ color: 'var(--text)' }}>Upgrade successful.</span> <span style={{ color: 'var(--text-3)' }}>Your plan will update within a few seconds.</span>
      </div>
      <button onClick={() => { setUpgradeBanner(false); window.history.replaceState({}, '', '/dashboard'); }} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 13 }}>✕</button>
    </div>
  ) : null;
  const stats = data?.stats || {};
  const uploads = data?.uploads || [];
  const apiKeys = data?.api_keys || [];

  const usagePct = stats.uploads_limit ? Math.min(100, Math.round((stats.uploads_this_month / stats.uploads_limit) * 100)) : 0;

  return (
    <div style={{ minHeight: 'calc(100vh - 56px)' }}>
      <Seo title="Dashboard" noindex />
      <div className="dash-grid">
        <aside className="dash-side">
          <div className="user">
            <div className="avatar">{user.username.slice(0, 2).toUpperCase()}</div>
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{user.username}</div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>{user.plan} · workspace</div>
            </div>
          </div>

          <div className="sidebar-group" style={{ marginBottom: 0 }}>
            <h3 className="sidebar-title">Workspace</h3>
            {['Uploads', 'API keys', 'MCP server', 'Webhooks', 'Audit log', 'Billing', 'Team', 'Settings'].map((label, i) => {
              const id = ['uploads', 'keys', 'mcp', 'webhooks', 'audit', 'billing', 'team', 'settings'][i];
              return (
                <button
                  key={id}
                  className={'sidebar-link' + (tab === id ? ' active' : '')}
                  onClick={() => setTab(id)}
                  style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: 32, padding: 14, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg)' }}>
            <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>This month</div>
            <div className="usage-bar"><div className="usage-fill" style={{ width: usagePct + '%' }} /></div>
            <div className="usage-meta">
              <span>{stats.uploads_this_month || 0} / {stats.uploads_limit || '—'} uploads</span>
              <span style={{ color: 'var(--accent)' }}>{usagePct}%</span>
            </div>
          </div>

          <div style={{ marginTop: 16, padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg)' }}>
            <div className="mono" style={{ fontSize: 10, color: 'var(--text-4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>API key</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <code style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-3)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {apiKey.slice(0, 16)}…{apiKey.slice(-4)}
              </code>
              <button
                className="copy-btn"
                style={{ fontSize: 10, padding: '2px 6px', flexShrink: 0 }}
                onClick={() => navigator.clipboard?.writeText(apiKey)}
              >copy</button>
            </div>
          </div>
          <div style={{ marginTop: 8 }}>
            <button
              onClick={() => { localStorage.removeItem(API_KEY_STORAGE); setApiKey(''); setData(null); setError(null); }}
              style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-4)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 10px' }}
            >
              sign out →
            </button>
          </div>
        </aside>

        <main className="dash-main">
          {UpgradeBanner}
          <div className="dash-h">
            <div>
              <div className="crumb">workspace / {user.username} / {tab}</div>
              <h1 style={{ textTransform: 'capitalize' }}>{tab}</h1>
            </div>
            {tab === 'uploads' && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary btn-sm">Export CSV</button>
                <button className="btn btn-primary btn-sm" onClick={() => setShowUploadModal(true)}>+ New upload</button>
              </div>
            )}
          </div>

          <div className="stat-row">
            <div className="stat" style={{ background: 'linear-gradient(180deg, rgba(232,255,71,0.04), var(--bg-1))' }}>
              <div className="stat-label">Plan usage · {new Date().toLocaleString('default', { month: 'short' })}</div>
              <div className="stat-value">{stats.uploads_this_month || 0}<span className="unit"> / {stats.uploads_limit || '—'} uploads</span></div>
              <div className="usage-bar"><div className="usage-fill" style={{ width: usagePct + '%' }} /></div>
              <div className="usage-meta">
                <span>{user.plan}</span>
                <span style={{ color: 'var(--accent)' }}>{usagePct}%</span>
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Total storage</div>
              <div className="stat-value">{formatBytes(stats.total_bytes)}</div>
              <div style={{ marginTop: 14, fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>all uploads</div>
            </div>
            <div className="stat">
              <div className="stat-label">Active links</div>
              <div className="stat-value">{stats.active_links || 0}</div>
              <div style={{ marginTop: 14, fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>{stats.expiring_soon || 0} expiring &lt; 24h</div>
            </div>
            <div className="stat">
              <div className="stat-label">Total uploads</div>
              <div className="stat-value">{stats.total_uploads || 0}</div>
              <div style={{ marginTop: 14, fontSize: 12, color: 'var(--ok)', fontFamily: 'var(--mono)' }}>all time</div>
            </div>
          </div>

          <div className="tabs">
            {[['uploads', 'Uploads'], ['keys', 'API keys'], ['billing', 'Billing'], ['settings', 'Settings']].map(([id, label]) => (
              <div key={id} className={'tab' + (tab === id ? ' active' : '')} onClick={() => setTab(id)}>{label}</div>
            ))}
          </div>

          {tab === 'uploads' && <UploadsTab uploads={uploads} apiKey={apiKey} />}
          {tab === 'keys' && <KeysTab apiKeys={apiKeys} apiKey={apiKey} currentKey={apiKey} />}
          {tab === 'billing' && <BillingTab plan={user.plan} apiKey={apiKey} />}
          {tab === 'settings' && <SettingsTab user={user} apiKey={apiKey} />}
          {tab === 'audit' && <AuditTab apiKey={apiKey} />}
          {tab === 'webhooks' && <WebhooksTab plan={user.plan} />}
          {tab === 'team' && <TeamTab plan={user.plan} user={user} />}
          {tab === 'mcp' && <McpTab apiKey={apiKey} currentKey={apiKey} />}
        </main>
      </div>
      {showUploadModal && (
        <UploadModal
          apiKey={apiKey}
          plan={user.plan}
          stats={stats}
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => { setShowUploadModal(false); setLoadCounter(c => c + 1); }}
        />
      )}
    </div>
  );
}

function UploadsTab({ uploads: initialUploads, apiKey }) {
  const [uploads, setUploads] = useState(initialUploads);
  const [openMenu, setOpenMenu] = useState(null);
  const [menuPos, setMenuPos] = useState(null);
  const [copied, setCopied] = useState(null);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    function handleClick(e) {
      if (!e.target.closest('.row-menu-btn')) { setOpenMenu(null); setMenuPos(null); }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function toggleMenu(id, e) {
    if (openMenu === id) { setOpenMenu(null); setMenuPos(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < 160;
    setMenuPos(openUp
      ? { bottom: window.innerHeight - rect.top + 4, right: window.innerWidth - rect.right }
      : { top: rect.bottom + 4, right: window.innerWidth - rect.right }
    );
    setOpenMenu(id);
  }

  function copyLink(id) {
    const url = `${window.location.origin}/f/${id}`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).catch(() => execCopyText(url));
    } else {
      execCopyText(url);
    }
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
    setOpenMenu(null);
  }

  function execCopyText(text) {
    const el = document.createElement('textarea');
    el.value = text;
    el.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  }

  async function deleteUpload(id) {
    setDeleting(id);
    setOpenMenu(null);
    try {
      const res = await fetch(`/api/upload/${id}`, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer ' + apiKey },
      });
      if (res.ok) setUploads(prev => prev.filter(u => u.id !== id));
    } catch {}
    setDeleting(null);
  }

  return (
    <div>
      <div className="section-h">
        <h2>Recent uploads</h2>
      </div>

      {uploads.length === 0 ? (
        <div style={{ padding: '64px 32px', textAlign: 'center', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-3)', fontFamily: 'var(--mono)', fontSize: 13 }}>
          no uploads yet — run <span style={{ color: 'var(--accent)' }}>tf upload &lt;file&gt;</span>
        </div>
      ) : (
        <div className="table-wrap" style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: 'var(--bg-1)' }}>
          <table className="table" style={{ minWidth: 600 }}>
            <thead>
              <tr>
                <th>File</th>
                <th style={{ width: 80 }}>Size</th>
                <th>Link</th>
                <th style={{ width: 110 }}>Expiry</th>
                <th style={{ width: 90 }}>Created</th>
                <th style={{ width: 60 }}>Dl</th>
                <th style={{ width: 40 }} />
              </tr>
            </thead>
            <tbody>
              {uploads.map(u => {
                const { label, status } = expiryLabel(u.expires_at);
                const pillClass = status === 'live' ? 'pill-ok' : status === 'warn' ? 'pill-warn' : 'pill-dead';
                const shareUrl = `${window.location.origin}/f/${u.id}`;
                return (
                  <tr key={u.id} style={{ opacity: deleting === u.id ? 0.4 : 1, transition: 'opacity .2s' }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <FileTypeBadge filename={u.filename} />
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{u.filename}</div>
                          <div className="mono" style={{ fontSize: 11, color: 'var(--text-4)' }}>id · {u.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="mono">{formatBytes(u.size)}</td>
                    <td className="mono">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Link style={{ color: 'var(--accent)' }} to={'/f/' + u.id}>
                          transfa.sh/f/{u.id}
                        </Link>
                        <button
                          className={'copy-btn' + (copied === u.id ? ' copied' : '')}
                          onClick={() => copyLink(u.id)}
                          style={{ fontSize: 10, padding: '2px 6px', flexShrink: 0 }}
                        >
                          {copied === u.id ? '✓' : 'copy'}
                        </button>
                      </div>
                    </td>
                    <td>
                      <span className={'pill ' + pillClass}>
                        <span className="dot" />{label}
                      </span>
                    </td>
                    <td className="mono muted">{timeAgo(u.created_at)}</td>
                    <td className="mono">{u.download_count}</td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm row-menu-btn"
                        style={{ padding: '2px 8px', fontSize: 16, lineHeight: 1 }}
                        onClick={e => toggleMenu(u.id, e)}
                      >
                        •••
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-3)' }}>
            {uploads.length} upload{uploads.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {openMenu && menuPos && (() => {
        const u = uploads.find(x => x.id === openMenu);
        if (!u) return null;
        const shareUrl = `${window.location.origin}/f/${u.id}`;
        return createPortal(
          <div
            style={{
              position: 'fixed',
              ...(menuPos.top !== undefined ? { top: menuPos.top } : { bottom: menuPos.bottom }),
              right: menuPos.right,
              zIndex: 1000,
              background: 'var(--bg-2)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '4px 0', minWidth: 160, boxShadow: '0 8px 24px rgba(0,0,0,.5)',
            }}
          >
            <button
              className="row-menu-btn"
              onClick={() => copyLink(u.id)}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 16px', background: 'none', border: 'none', color: copied === u.id ? 'var(--accent)' : 'var(--text)', fontFamily: 'var(--mono)', fontSize: 13, cursor: 'pointer' }}
            >
              {copied === u.id ? '✓ copied' : 'copy link'}
            </button>
            <a
              className="row-menu-btn"
              href={shareUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => { setOpenMenu(null); setMenuPos(null); }}
              style={{ display: 'block', padding: '8px 16px', color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: 13, textDecoration: 'none' }}
            >
              open ↗
            </a>
            <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />
            <button
              className="row-menu-btn"
              onClick={() => deleteUpload(u.id)}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 16px', background: 'none', border: 'none', color: 'var(--danger)', fontFamily: 'var(--mono)', fontSize: 13, cursor: 'pointer' }}
            >
              delete
            </button>
          </div>,
          document.body
        );
      })()}
    </div>
  );
}

function KeysTab({ apiKeys, apiKey, currentKey, onRefresh }) {
  const [copied, setCopied] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [newGeneratedKey, setNewGeneratedKey] = useState(null);
  const [newKeyCopied, setNewKeyCopied] = useState(false);
  const [revoking, setRevoking] = useState(null);
  const [keys, setKeys] = useState(apiKeys);

  function copy(text, id) {
    navigator.clipboard?.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1200);
  }

  async function generateKey() {
    setGenerating(true);
    try {
      const res = await fetch('/api/dashboard/keys', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'new key' }),
      });
      const d = await res.json();
      if (d.key) {
        setNewGeneratedKey(d.key);
        setKeys(prev => [{ id: d.id, name: d.name, token_preview: d.key.slice(0, 12) + '•'.repeat(16) + d.key.slice(-4), scope: d.scope, uploads_today: 0, created_at: new Date().toISOString(), last_used_at: null, revoked: false }, ...prev]);
      }
    } catch {
      // silently ignore
    }
    setGenerating(false);
  }

  async function revokeKey(keyId) {
    setRevoking(keyId);
    try {
      const res = await fetch('/api/dashboard/keys/revoke', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ key_id: keyId }),
      });
      const d = await res.json();
      if (d.revoked) setKeys(prev => prev.filter(k => k.id !== keyId));
    } catch {
      // silently ignore
    }
    setRevoking(null);
  }

  function copyNewKey() {
    const text = newGeneratedKey;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => execCopy(text));
    } else {
      execCopy(text);
    }
    setNewKeyCopied(true);
    setTimeout(() => setNewKeyCopied(false), 1500);
  }

  function execCopy(text) {
    const el = document.createElement('textarea');
    el.value = text;
    el.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  }

  return (
    <div>
      <div className="section-h">
        <h2>API keys</h2>
        <button className="btn btn-primary btn-sm" onClick={generateKey} disabled={generating}>
          {generating ? 'generating…' : '+ Generate key'}
        </button>
      </div>

      {newGeneratedKey && (
        <div style={{ marginBottom: 20, padding: 20, border: '1px solid var(--accent-line)', borderRadius: 8, background: 'var(--accent-soft)' }}>
          <div className="mono" style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 10 }}>
            New key — save this now, it won't be shown again
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
            <code style={{ flex: 1, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 12px', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text)', wordBreak: 'break-all' }}>
              {newGeneratedKey}
            </code>
            <button
              className={'copy-btn' + (newKeyCopied ? ' copied' : '')}
              onClick={copyNewKey}
              style={{ flexShrink: 0, padding: '8px 12px' }}
            >
              {newKeyCopied ? 'copied ✓' : 'copy'}
            </button>
          </div>
          <div className="mono" style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 10, padding: '8px 12px', background: 'var(--bg)', borderRadius: 6, border: '1px solid var(--border)' }}>
            $ tf auth {newGeneratedKey}
          </div>
          <button
            onClick={() => setNewGeneratedKey(null)}
            style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-4)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            dismiss
          </button>
        </div>
      )}

      <div className="table-wrap" style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: 'var(--bg-1)', marginBottom: 32 }}>
        <table className="table" style={{ minWidth: 580 }}>
          <thead>
            <tr><th>Name</th><th>Token</th><th>Scope</th><th>Used today</th><th>Last used</th><th>Created</th><th /></tr>
          </thead>
          <tbody>
            {keys.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-3)', fontFamily: 'var(--mono)', fontSize: 12 }}>no additional keys</td></tr>
            ) : keys.map(k => (
              <tr key={k.id}>
                <td style={{ fontWeight: 500 }}>{k.name}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <code style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-2)' }}>{k.token_preview}</code>
                    <button className={'copy-btn' + (copied === k.id ? ' copied' : '')} onClick={() => copy(k.token_preview, k.id)}>
                      {copied === k.id ? 'copied' : 'copy'}
                    </button>
                  </div>
                </td>
                <td><span className="pill pill-accent">{k.scope}</span></td>
                <td className="mono">{k.uploads_today}</td>
                <td className="mono muted">{timeAgo(k.last_used_at)}</td>
                <td className="mono muted">{k.created_at ? new Date(k.created_at).toLocaleDateString() : '—'}</td>
                <td>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--danger)', opacity: revoking === k.id ? 0.5 : 1 }}
                    onClick={() => revokeKey(k.id)}
                    disabled={revoking === k.id}
                  >
                    {revoking === k.id ? '…' : 'revoke'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="section-h"><h2>Active API key</h2></div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24 }}>
          <div>
            <h3 style={{ fontSize: 16, margin: '0 0 8px' }}>Current session key</h3>
            <code style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-2)' }}>
              {currentKey.slice(0, 12)}{'•'.repeat(16)}{currentKey.slice(-4)}
            </code>
          </div>
          <span className="pill pill-ok"><span className="dot" />active</span>
        </div>
        <div className="code" style={{ marginTop: 20, fontSize: 13 }}>
          <span className="tok-c">{'// claude_desktop_config.json'}</span>{'\n'}
          {'{\n'}
          {'  '}<span className="tok-str">"mcpServers"</span>: {'{\n'}
          {'    '}<span className="tok-str">"transfa"</span>: {'{\n'}
          {'      '}<span className="tok-str">"url"</span>: <span className="tok-str">"https://mcp.transfa.sh/v1"</span>,{'\n'}
          {'      '}<span className="tok-str">"headers"</span>: {'{ '}<span className="tok-str">"Authorization"</span>: <span className="tok-str">"Bearer tf_live_•••"</span> {'}\n'}
          {'    }\n'}
          {'  }\n'}
          {'}\n'}
        </div>
      </div>
    </div>
  );
}

function BillingTab({ plan, apiKey }) {
  const [annual, setAnnual] = useState(false);
  const [loading, setLoading] = useState(null);
  const [billingStatus, setBillingStatus] = useState(null);
  const [billingError, setBillingError] = useState(null);

  useEffect(() => {
    if (!apiKey) return;
    fetch('/api/billing/status', { headers: { Authorization: 'Bearer ' + apiKey } })
      .then(r => r.json())
      .then(d => { if (!d.error) setBillingStatus(d); })
      .catch(() => {});
  }, [apiKey]);

  async function startCheckout(targetPlan) {
    setBillingError(null);
    setLoading(targetPlan);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: targetPlan, interval: annual ? 'annual' : 'monthly' }),
      });
      const d = await res.json();
      if (d.url) window.location.href = d.url;
      else setBillingError(d.error || 'Checkout failed — try again.');
    } catch (e) {
      setBillingError('Checkout failed: ' + e.message);
    }
    setLoading(null);
  }

  async function openPortal() {
    setBillingError(null);
    setLoading('portal');
    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      });
      const d = await res.json();
      if (d.url) window.location.href = d.url;
      else setBillingError(d.error || 'Subscribe first to manage billing.');
    } catch (e) {
      setBillingError('Portal failed: ' + e.message);
    }
    setLoading(null);
  }

  const sub = billingStatus?.subscription;
  const currentPlan = billingStatus?.plan || plan;
  const isPaid = currentPlan !== 'free';

  return (
    <div>
      <div className="section-h"><h2>Billing</h2></div>

      {billingError && (
        <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(255,92,92,0.06)', border: '1px solid rgba(255,92,92,0.3)', borderRadius: 6, fontSize: 13, color: 'var(--danger)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {billingError}
          <button onClick={() => setBillingError(null)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 12 }}>✕</button>
        </div>
      )}

      {/* Current plan card */}
      <div className="billing-cards" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>
        <div className="card">
          <div className="mono muted-2" style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Current plan</div>
          <div style={{ fontSize: 28, fontWeight: 600, marginTop: 8, textTransform: 'capitalize', display: 'flex', alignItems: 'center', gap: 10 }}>
            {currentPlan}
            {isPaid && <span className="pill pill-ok" style={{ fontSize: 10 }}><span className="dot" />{billingStatus?.status || 'active'}</span>}
          </div>
          <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
            {!isPaid
              ? 'Free forever. Upgrade for more uploads, larger files, and MCP access.'
              : sub?.cancel_at_period_end
                ? `Cancels ${new Date(sub.current_period_end).toLocaleDateString()}.`
                : `Renews ${sub ? new Date(sub.current_period_end).toLocaleDateString() : 'next cycle'}. Cancel anytime.`}
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            {isPaid ? (
              <>
                <button className="btn btn-secondary btn-sm" onClick={openPortal} disabled={loading === 'portal'}>
                  {loading === 'portal' ? 'loading…' : 'Manage subscription'}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={openPortal} disabled={loading === 'portal'}>
                  View invoices
                </button>
              </>
            ) : (
              <Link className="btn btn-secondary btn-sm" to="/pricing">View plans</Link>
            )}
          </div>
        </div>

        <div className="card">
          <div className="mono muted-2" style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {isPaid ? 'Payment method' : 'Upgrade'}
          </div>
          {isPaid ? (
            <>
              <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>Manage your payment method and billing history through the Stripe portal.</p>
              <button className="btn btn-secondary btn-sm" style={{ marginTop: 16 }} onClick={openPortal}>
                Open billing portal
              </button>
            </>
          ) : (
            <>
              <div style={{ display: 'inline-flex', marginTop: 16, padding: 4, background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 100 }}>
                <button onClick={() => setAnnual(false)} className="btn btn-sm" style={{ background: !annual ? 'var(--accent)' : 'transparent', color: !annual ? '#000' : 'var(--text-2)', borderColor: 'transparent', borderRadius: 100, padding: '0 14px', height: 28 }}>Monthly</button>
                <button onClick={() => setAnnual(true)} className="btn btn-sm" style={{ background: annual ? 'var(--accent)' : 'transparent', color: annual ? '#000' : 'var(--text-2)', borderColor: 'transparent', borderRadius: 100, padding: '0 14px', height: 28 }}>
                  Annual <span style={{ fontSize: 10, color: annual ? '#000' : 'var(--accent)', marginLeft: 4 }}>−17%</span>
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
                <button
                  className="btn btn-primary"
                  style={{ justifyContent: 'center' }}
                  onClick={() => startCheckout('pro')}
                  disabled={!!loading}
                >
                  {loading === 'pro' ? 'loading…' : `Upgrade to Pro — $${annual ? '10' : '12'}/mo`}
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ justifyContent: 'center' }}
                  onClick={() => startCheckout('team')}
                  disabled={!!loading}
                >
                  {loading === 'team' ? 'loading…' : `Upgrade to Team — $${annual ? '40' : '48'}/mo`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Plan comparison inline */}
      {!isPaid && (
        <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', background: 'var(--bg-1)', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
            What you unlock
          </div>
          <div className="billing-compare" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: '1px solid var(--border)' }}>
            {[
              { label: 'Free (current)', items: ['500 MB / upload', '20 uploads / day', '48h max TTL', 'Public links only'] },
              { label: 'Pro · $12/mo', items: ['50 GB / upload', 'Unlimited / day', '30d max TTL', 'Password links + MCP'], accent: true },
              { label: 'Team · $48/mo', items: ['100 GB / upload', '5,000 / day', '180d max TTL', 'SSO + audit stream'] },
            ].map(({ label, items, accent }) => (
              <div key={label} style={{ padding: '16px 20px', borderRight: '1px solid var(--border)', background: accent ? 'var(--accent-soft)' : 'transparent' }}>
                <div className="mono" style={{ fontSize: 11, color: accent ? 'var(--accent)' : 'var(--text-3)', marginBottom: 12, letterSpacing: '0.06em' }}>{label}</div>
                {items.map(i => <div key={i} style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 6 }}>▸ {i}</div>)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsTab({ user, apiKey }) {
  const [toggles, setToggles] = useState({ req_password: false, block_tor: false, email_large: true, stream_audit: false });
  const [username, setUsername] = useState(user.username);
  const [savingUsername, setSavingUsername] = useState(false);
  const [usernameMsg, setUsernameMsg] = useState('');
  const [usernameErr, setUsernameErr] = useState('');

  async function saveUsername() {
    if (!username || username === user.username) return;
    setSavingUsername(true);
    setUsernameMsg('');
    setUsernameErr('');
    try {
      const res = await fetch('/api/dashboard/username', {
        method: 'PATCH',
        headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      const d = await res.json();
      if (d.username) {
        setUsernameMsg('✓ saved');
        setTimeout(() => setUsernameMsg(''), 2000);
      } else {
        setUsernameErr(d.error || 'failed');
      }
    } catch {
      setUsernameErr('network error');
    }
    setSavingUsername(false);
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <div className="section-h"><h2>Account</h2></div>

      <div className="settings-row" style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 24, padding: '20px 0', borderBottom: '1px solid var(--border)' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Username</div>
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>Used in upload attribution and audit log.</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            value={username}
            onChange={e => { setUsername(e.target.value); setUsernameMsg(''); setUsernameErr(''); }}
            onKeyDown={e => e.key === 'Enter' && saveUsername()}
            style={{ width: 220, background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 4, padding: '8px 10px', color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: 13, outline: 'none' }}
          />
          <button
            className="btn btn-secondary btn-sm"
            onClick={saveUsername}
            disabled={savingUsername || !username || username === user.username}
          >
            {savingUsername ? '…' : usernameMsg || 'Save'}
          </button>
          {usernameErr && <span style={{ color: 'var(--danger)', fontFamily: 'var(--mono)', fontSize: 12 }}>{usernameErr}</span>}
        </div>
      </div>

      <Field label="Default TTL" value="7d" hint="Applied when no --expires flag is set." />
      <Field label="Plan" value={user.plan} hint="Current plan tier." />

      <div className="section-h" style={{ marginTop: 48 }}><h2>Security</h2></div>
      {Object.entries({ req_password: 'Require password for uploads > 1 GB', block_tor: 'Block tor exits from downloads', email_large: 'Email me on every upload > 10 GB', stream_audit: 'Stream audit log to webhook' }).map(([k, label]) => (
        <ToggleRow key={k} label={label} on={toggles[k]} onChange={v => setToggles(t => ({ ...t, [k]: v }))} />
      ))}

      <div className="section-h" style={{ marginTop: 48 }}><h2 style={{ color: 'var(--danger)' }}>Danger zone</h2></div>
      <div style={{ border: '1px solid rgba(255,92,92,0.3)', borderRadius: 8, padding: 20, background: 'rgba(255,92,92,0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24 }}>
          <div>
            <div style={{ fontWeight: 500 }}>Delete workspace</div>
            <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>Purges all uploads, keys, and audit log. Cannot be undone.</div>
          </div>
          <button className="btn btn-secondary btn-sm" style={{ color: 'var(--danger)', borderColor: 'rgba(255,92,92,0.4)' }}>Delete workspace</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, hint }) {
  return (
    <div className="settings-row" style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 24, padding: '20px 0', borderBottom: '1px solid var(--border)' }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
        <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{hint}</div>
      </div>
      <div>
        <input defaultValue={value} style={{ width: '100%', maxWidth: 360, background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 4, padding: '8px 10px', color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: 13, outline: 'none' }} />
      </div>
    </div>
  );
}

function ToggleRow({ label, on, onChange }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 14 }}>{label}</span>
      <button
        onClick={() => onChange(!on)}
        style={{ width: 40, height: 22, borderRadius: 100, background: on ? 'var(--accent)' : 'var(--bg-3)', border: 0, position: 'relative', cursor: 'pointer', transition: 'background .12s' }}
      >
        <span style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: on ? '#000' : 'var(--text-3)', transition: 'left .12s' }} />
      </button>
    </div>
  );
}

function AuditTab({ apiKey }) {
  const [logs, setLogs] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/audit', { headers: { Authorization: 'Bearer ' + apiKey } })
      .then(r => r.json())
      .then(d => setLogs(d.logs || []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [apiKey]);

  function uaShort(ua) {
    if (!ua || ua === '—') return '—';
    if (ua.includes('curl')) return 'curl';
    if (ua.includes('python')) return 'python';
    if (ua.includes('node')) return 'node';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    return ua.slice(0, 24);
  }

  return (
    <div>
      <div className="section-h">
        <h2>Audit log</h2>
        <span className="mono muted-2" style={{ fontSize: 12 }}>last 100 download events</span>
      </div>

      {loading ? (
        <div style={{ padding: '48px 0', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text-3)' }}>loading…</div>
      ) : logs.length === 0 ? (
        <div style={{ padding: '64px 32px', textAlign: 'center', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-3)', fontFamily: 'var(--mono)', fontSize: 13 }}>
          no downloads recorded yet — events appear here when someone downloads one of your files
        </div>
      ) : (
        <div className="table-wrap" style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: 'var(--bg-1)' }}>
          <table className="table" style={{ minWidth: 580 }}>
            <thead>
              <tr>
                <th>File</th>
                <th>IP</th>
                <th>Client</th>
                <th style={{ width: 140 }}>When</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(l => (
                <tr key={l.id}>
                  <td>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{l.filename}</div>
                    <div className="mono" style={{ fontSize: 11, color: 'var(--text-4)' }}>{l.upload_id}</div>
                  </td>
                  <td className="mono" style={{ fontSize: 12, color: 'var(--text-2)' }}>{l.ip}</td>
                  <td className="mono" style={{ fontSize: 12, color: 'var(--text-3)' }}>{uaShort(l.user_agent)}</td>
                  <td className="mono" style={{ fontSize: 12, color: 'var(--text-3)' }}>{timeAgo(l.downloaded_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-3)' }}>
            {logs.length} event{logs.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  );
}

function WebhooksTab({ plan }) {
  const isPaid = plan === 'pro' || plan === 'team';
  const [url, setUrl] = useState('');
  const [saved, setSaved] = useState(false);

  const events = ['upload.created', 'upload.downloaded', 'upload.expired', 'upload.deleted'];

  return (
    <div style={{ maxWidth: 720 }}>
      <div className="section-h"><h2>Webhooks</h2></div>

      {!isPaid ? (
        <div style={{ padding: 32, border: '1px solid var(--border)', borderRadius: 10, background: 'var(--bg-1)', textAlign: 'center' }}>
          <div className="mono" style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 12 }}>Pro feature</div>
          <h3 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 10px' }}>Webhooks require Pro or Team</h3>
          <p className="muted" style={{ fontSize: 14, margin: '0 0 20px', lineHeight: 1.6 }}>
            Get notified in real time when files are uploaded, downloaded, or expire. POST events to any URL.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 320, margin: '0 auto 24px', textAlign: 'left' }}>
            {events.map(e => (
              <div key={e} className="mono" style={{ fontSize: 13, color: 'var(--text-2)', display: 'flex', gap: 8 }}>
                <span style={{ color: 'var(--accent)' }}>▸</span>{e}
              </div>
            ))}
          </div>
          <Link className="btn btn-primary" to="/pricing">Upgrade to Pro</Link>
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: 24, padding: 20, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg-1)' }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Endpoint URL</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={url}
                onChange={e => { setUrl(e.target.value); setSaved(false); }}
                placeholder="https://your-server.com/webhooks/transfa"
                style={{ flex: 1, background: 'var(--bg-0)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 12px', color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: 13, outline: 'none' }}
              />
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setSaved(true)}
                disabled={!url}
              >
                {saved ? '✓ saved' : 'Save'}
              </button>
            </div>
          </div>
          <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', background: 'var(--bg-1)', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', borderBottom: '1px solid var(--border)' }}>Events</div>
            {events.map(e => (
              <div key={e} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                <span className="mono" style={{ fontSize: 13 }}>{e}</span>
                <span className="pill pill-ok" style={{ fontSize: 10 }}><span className="dot" />active</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TeamTab({ plan, user }) {
  const isTeam = plan === 'team';

  return (
    <div style={{ maxWidth: 720 }}>
      <div className="section-h"><h2>Team</h2></div>

      {!isTeam ? (
        <div style={{ padding: 32, border: '1px solid var(--border)', borderRadius: 10, background: 'var(--bg-1)', textAlign: 'center' }}>
          <div className="mono" style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 12 }}>Team plan feature</div>
          <h3 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 10px' }}>Invite your team</h3>
          <p className="muted" style={{ fontSize: 14, margin: '0 0 20px', lineHeight: 1.6, maxWidth: '48ch', marginLeft: 'auto', marginRight: 'auto' }}>
            Share a workspace, audit log, and upload quota with your whole team. SAML SSO and SCIM provisioning included.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, maxWidth: 400, margin: '0 auto 24px', textAlign: 'left' }}>
            {['Shared workspace', 'SAML SSO + SCIM', 'Team audit log', 'Shared upload quota', 'Slack-channel support', 'DPA available'].map(f => (
              <div key={f} style={{ fontSize: 13, color: 'var(--text-2)', display: 'flex', gap: 8, alignItems: 'baseline' }}>
                <span style={{ color: 'var(--accent)', fontFamily: 'var(--mono)' }}>▸</span>{f}
              </div>
            ))}
          </div>
          <Link className="btn btn-primary" to="/pricing">Upgrade to Team — $48/mo</Link>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span className="muted" style={{ fontSize: 13 }}>1 member</span>
            <button className="btn btn-primary btn-sm">+ Invite member</button>
          </div>
          <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: 'var(--bg-1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
              <div className="avatar">{user.username.slice(0, 2).toUpperCase()}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{user.username}</div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>owner</div>
              </div>
              <span className="pill pill-ok" style={{ marginLeft: 'auto', fontSize: 10 }}><span className="dot" />active</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const PLAN_MAX_SIZES = {
  guest: 10 * 1024 * 1024,
  free: 500 * 1024 * 1024,
  pro: 50 * 1024 * 1024 * 1024,
  team: 100 * 1024 * 1024 * 1024,
};

function UploadModal({ apiKey, plan, stats, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const maxSize = PLAN_MAX_SIZES[plan] || PLAN_MAX_SIZES.free;
  const atLimit = stats.uploads_limit && stats.uploads_this_month >= stats.uploads_limit;

  function handleFile(f) {
    if (!f) return;
    if (f.size > maxSize) {
      setError(`File too large for ${plan} plan (max ${formatBytes(maxSize)})`);
      return;
    }
    setFile(f);
    setError(null);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  }

  function upload() {
    if (!file || uploading) return;
    setUploading(true);
    setProgress(0);
    setError(null);

    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      setUploading(false);
      if (xhr.status === 200 || xhr.status === 201) {
        try {
          setResult(JSON.parse(xhr.responseText));
          setProgress(100);
        } catch {
          setError('Upload failed: invalid response');
        }
      } else {
        try {
          const d = JSON.parse(xhr.responseText);
          setError(d.error || `Upload failed (${xhr.status})`);
        } catch {
          setError(`Upload failed (${xhr.status})`);
        }
      }
    };

    xhr.onerror = () => { setUploading(false); setError('Upload failed: network error'); };

    xhr.open('POST', '/api/upload');
    xhr.setRequestHeader('Authorization', 'Bearer ' + apiKey);
    xhr.send(formData);
  }

  function copyResult() {
    const url = result.url || result.download_url;
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 12, padding: 32, width: '100%', maxWidth: 480, position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 16, background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 4 }}>✕</button>

        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>New upload</div>
        <div className="mono" style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 24 }}>
          {plan} plan · max {formatBytes(maxSize)} per file
          {stats.uploads_limit ? ` · ${stats.uploads_this_month || 0}/${stats.uploads_limit} uploads this month` : ''}
        </div>

        {atLimit && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(255,92,92,0.06)', border: '1px solid rgba(255,92,92,0.3)', borderRadius: 6, fontSize: 13, color: 'var(--danger)' }}>
            Monthly limit reached ({stats.uploads_limit}/{stats.uploads_limit}). <Link to="/pricing" onClick={onClose} style={{ color: 'var(--danger)', textDecoration: 'underline' }}>Upgrade to continue.</Link>
          </div>
        )}

        {!result ? (
          <>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => { if (!file) document.getElementById('modal-file-input').click(); }}
              style={{
                border: `2px dashed ${dragOver ? 'var(--accent)' : file ? 'var(--ok, #46e08b)' : 'var(--border)'}`,
                borderRadius: 8, padding: '32px 24px', textAlign: 'center',
                cursor: file ? 'default' : 'pointer',
                background: dragOver ? 'var(--accent-soft)' : 'var(--bg-0)',
                transition: 'border-color .15s, background .15s',
                marginBottom: 16,
              }}
            >
              <input id="modal-file-input" type="file" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files[0])} />
              {file ? (
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>{file.name}</div>
                  <div className="mono" style={{ fontSize: 12, color: 'var(--text-3)' }}>{formatBytes(file.size)}</div>
                  {!uploading && (
                    <button onClick={(e) => { e.stopPropagation(); setFile(null); setError(null); }} style={{ background: 'none', border: 'none', color: 'var(--text-4)', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 11, marginTop: 8 }}>
                      remove
                    </button>
                  )}
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 4 }}>Drop a file here or click to browse</div>
                  <div className="mono" style={{ fontSize: 11, color: 'var(--text-4)' }}>max {formatBytes(maxSize)}</div>
                </div>
              )}
            </div>

            {uploading && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ height: 6, background: 'var(--bg-2)', borderRadius: 100, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: progress + '%', background: 'var(--accent)', borderRadius: 100, transition: 'width .1s' }} />
                </div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6, textAlign: 'right' }}>{progress}%</div>
              </div>
            )}

            {error && (
              <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(255,92,92,0.06)', border: '1px solid rgba(255,92,92,0.3)', borderRadius: 6, fontSize: 13, color: 'var(--danger)' }}>{error}</div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose} disabled={uploading}>Cancel</button>
              <button
                className="btn btn-primary"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={upload}
                disabled={!file || uploading || !!atLimit}
              >
                {uploading ? `uploading… ${progress}%` : 'Upload'}
              </button>
            </div>
          </>
        ) : (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--accent-soft)', border: '1px solid var(--accent-line)', display: 'grid', placeItems: 'center', margin: '0 auto 12px' }}>
                <span style={{ color: 'var(--accent)', fontSize: 22 }}>✓</span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Upload complete</div>
              <div className="mono" style={{ fontSize: 12, color: 'var(--text-3)' }}>{result.filename}</div>
            </div>

            <div style={{ marginBottom: 20, padding: 16, background: 'var(--bg-0)', border: '1px solid var(--border)', borderRadius: 8 }}>
              <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Share link</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <code style={{ flex: 1, fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--accent)', wordBreak: 'break-all' }}>
                  {result.url}
                </code>
                <button className={'copy-btn' + (copied ? ' copied' : '')} onClick={copyResult}>
                  {copied ? 'copied ✓' : 'copy'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => { setFile(null); setResult(null); setProgress(0); }}>
                Upload another
              </button>
              <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={onSuccess}>Done</button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

function McpTab({ currentKey }) {
  const [copied, setCopied] = useState(null);

  function copy(text, id) {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 1400);
  }

  const masked = currentKey.slice(0, 12) + '•'.repeat(16) + currentKey.slice(-4);

  return (
    <div style={{ maxWidth: 720 }}>
      <div className="section-h"><h2>MCP server</h2></div>

      <div style={{ marginBottom: 24, padding: 20, border: '1px solid var(--accent-line)', borderRadius: 8, background: 'var(--accent-soft)' }}>
        <div className="mono" style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 6 }}>Your MCP endpoint</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <code style={{ flex: 1, fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text)' }}>https://mcp.transfa.sh/v1</code>
          <button className={'copy-btn' + (copied === 'url' ? ' copied' : '')} onClick={() => copy('https://mcp.transfa.sh/v1', 'url')}>
            {copied === 'url' ? 'copied' : 'copy'}
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Claude Desktop</div>
        <div style={{ position: 'relative', background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 8, padding: 20, fontFamily: 'var(--mono)', fontSize: 13, lineHeight: 1.7 }}>
          <button className={'copy-btn' + (copied === 'claude' ? ' copied' : '')} style={{ position: 'absolute', top: 12, right: 12 }} onClick={() => copy(`{\n  "mcpServers": {\n    "transfa": {\n      "url": "https://mcp.transfa.sh/v1",\n      "headers": { "Authorization": "Bearer ${currentKey}" }\n    }\n  }\n}`, 'claude')}>
            {copied === 'claude' ? 'copied' : 'copy'}
          </button>
          <span style={{ color: 'var(--text-3)' }}>{'// ~/Library/Application Support/Claude/claude_desktop_config.json'}</span>{'\n'}
          {'{\n'}
          {'  '}<span style={{ color: 'var(--tok-str)' }}>"mcpServers"</span>{': {\n'}
          {'    '}<span style={{ color: 'var(--tok-str)' }}>"transfa"</span>{': {\n'}
          {'      '}<span style={{ color: 'var(--tok-str)' }}>"url"</span>{': '}<span style={{ color: 'var(--accent)' }}>"https://mcp.transfa.sh/v1"</span>{',\n'}
          {'      '}<span style={{ color: 'var(--tok-str)' }}>"headers"</span>{': { '}<span style={{ color: 'var(--tok-str)' }}>"Authorization"</span>{': '}<span style={{ color: 'var(--accent)' }}>{`"Bearer ${masked}"`}</span>{' }\n'}
          {'    }\n'}
          {'  }\n'}
          {'}'}
        </div>
      </div>

      <div>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Available tools</div>
        <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          {[
            { tool: 'transfa.upload', desc: 'Upload a file and get a signed link back' },
            { tool: 'transfa.fetch', desc: 'Download a file by ID or URL' },
            { tool: 'transfa.list', desc: 'List recent uploads with metadata' },
            { tool: 'transfa.rm', desc: 'Delete an upload by ID' },
          ].map((t, i, arr) => (
            <div key={t.tool} style={{ display: 'flex', gap: 16, padding: '12px 16px', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'baseline' }}>
              <code style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--accent)', flexShrink: 0 }}>{t.tool}</code>
              <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{t.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
