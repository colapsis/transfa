import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

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
  // Key reveal state after generation
  const [newKeyInfo, setNewKeyInfo] = useState(null); // { key, username }
  const [keyCopied, setKeyCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

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
  }, [apiKey]);

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
  const stats = data?.stats || {};
  const uploads = data?.uploads || [];
  const apiKeys = data?.api_keys || [];

  const usagePct = stats.uploads_limit ? Math.min(100, Math.round((stats.uploads_this_month / stats.uploads_limit) * 100)) : 0;

  return (
    <div style={{ minHeight: 'calc(100vh - 56px)' }}>
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
          <div className="dash-h">
            <div>
              <div className="crumb">workspace / {user.username} / {tab}</div>
              <h1 style={{ textTransform: 'capitalize' }}>{tab}</h1>
            </div>
            {tab === 'uploads' && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary btn-sm">Export CSV</button>
                <button className="btn btn-primary btn-sm">+ New upload</button>
              </div>
            )}
            {tab === 'keys' && (
              <button className="btn btn-primary btn-sm" onClick={async () => {
                const res = await fetch('/api/dashboard/keys', { method: 'POST', headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'new key' }) });
                const d = await res.json();
                if (d.key) alert('New key: ' + d.key);
              }}>+ Generate key</button>
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
          {tab === 'billing' && <BillingTab plan={user.plan} />}
          {tab === 'settings' && <SettingsTab user={user} />}
        </main>
      </div>
    </div>
  );
}

function UploadsTab({ uploads, apiKey }) {
  return (
    <div>
      <div className="section-h">
        <h2>Recent uploads</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            placeholder="filter by name, id…"
            style={{ width: 260, background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 4, padding: '6px 10px', color: 'var(--text)', fontSize: 12, fontFamily: 'var(--mono)', outline: 'none' }}
          />
          <button className="btn btn-secondary btn-sm">Filter</button>
        </div>
      </div>

      {uploads.length === 0 ? (
        <div style={{ padding: '64px 32px', textAlign: 'center', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-3)', fontFamily: 'var(--mono)', fontSize: 13 }}>
          no uploads yet — run <span style={{ color: 'var(--accent)' }}>transfa upload &lt;file&gt;</span>
        </div>
      ) : (
        <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: 'var(--bg-1)' }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 36 }}><input type="checkbox" /></th>
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
                return (
                  <tr key={u.id}>
                    <td><input type="checkbox" /></td>
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
                      <Link style={{ color: 'var(--accent)' }} to={'/f/' + u.id}>
                        transfa.sh/{u.id}
                      </Link>
                    </td>
                    <td>
                      <span className={'pill ' + pillClass}>
                        <span className="dot" />{label}
                      </span>
                    </td>
                    <td className="mono muted">{timeAgo(u.created_at)}</td>
                    <td className="mono">{u.download_count}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm" style={{ padding: 4 }}>•••</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--border)', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-3)' }}>
            <span>Showing {uploads.length}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost btn-sm">← prev</button>
              <button className="btn btn-ghost btn-sm">next →</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KeysTab({ apiKeys, apiKey, currentKey }) {
  const [copied, setCopied] = useState(null);

  function copy(text, id) {
    navigator.clipboard?.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1200);
  }

  return (
    <div>
      <div className="section-h">
        <h2>API keys</h2>
      </div>

      <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: 'var(--bg-1)', marginBottom: 32 }}>
        <table className="table">
          <thead>
            <tr><th>Name</th><th>Token</th><th>Scope</th><th>Used today</th><th>Last used</th><th>Created</th><th /></tr>
          </thead>
          <tbody>
            {apiKeys.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-3)', fontFamily: 'var(--mono)', fontSize: 12 }}>no additional keys</td></tr>
            ) : apiKeys.map(k => (
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
                <td><button className="btn btn-ghost btn-sm">revoke</button></td>
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

function BillingTab({ plan }) {
  return (
    <div>
      <div className="section-h"><h2>Billing</h2></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>
        <div className="card">
          <div className="mono muted-2" style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Current plan</div>
          <div style={{ fontSize: 28, fontWeight: 600, marginTop: 8, textTransform: 'capitalize' }}>
            {plan} {plan === 'pro' && <><span style={{ color: 'var(--accent)' }}>·</span> $12/mo</>}
            {plan === 'team' && <><span style={{ color: 'var(--accent)' }}>·</span> $48/mo</>}
            {plan === 'free' && <><span style={{ color: 'var(--accent)' }}>·</span> $0</>}
          </div>
          <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
            {plan === 'free' ? 'Free forever. Upgrade to unlock more.' : 'Renews next billing cycle. Cancel anytime.'}
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <Link className="btn btn-secondary btn-sm" to="/pricing">Manage plan</Link>
            <button className="btn btn-ghost btn-sm">View invoices</button>
          </div>
        </div>
        <div className="card">
          <div className="mono muted-2" style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Payment method</div>
          {plan === 'free' ? (
            <p className="muted" style={{ fontSize: 14, marginTop: 12 }}>No payment method on file.</p>
          ) : (
            <>
              <div style={{ fontSize: 18, fontWeight: 500, marginTop: 12, fontFamily: 'var(--mono)' }}>•••• •••• •••• 4242</div>
              <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>Visa · expires 09/29</p>
              <button className="btn btn-secondary btn-sm" style={{ marginTop: 16 }}>Update card</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SettingsTab({ user }) {
  const [toggles, setToggles] = useState({ req_password: false, block_tor: false, email_large: true, stream_audit: false });

  return (
    <div style={{ maxWidth: 720 }}>
      <div className="section-h"><h2>Account</h2></div>
      <Field label="Username" value={user.username} hint="Used in upload attribution and audit log." />
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
    <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 24, padding: '20px 0', borderBottom: '1px solid var(--border)' }}>
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
