import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DownloadIcon } from '../components/Icons.jsx';
import Wordmark from '../components/Wordmark.jsx';
import Seo from '../components/Seo.jsx';

const API_BASE = '/api/download';

function formatBytes(bytes) {
  if (bytes >= 1e9) return (bytes / 1e9).toFixed(1) + ' GB';
  if (bytes >= 1e6) return (bytes / 1e6).toFixed(1) + ' MB';
  if (bytes >= 1e3) return (bytes / 1e3).toFixed(1) + ' KB';
  return bytes + ' B';
}

function timeAgo(isoStr) {
  const diff = (Date.now() - new Date(isoStr).getTime()) / 1000;
  if (diff < 60) return Math.floor(diff) + 's ago';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

function getExt(filename) {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : 'BIN';
}

export default function Recipient() {
  const { id } = useParams();
  const [info, setInfo] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState(null);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/info/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data);
        else setInfo(data);
      })
      .catch(() => setError({ error: 'failed to load file info' }))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!downloading) return;
    const t = setInterval(() => {
      setProgress(p => {
        const next = Math.min(100, p + Math.random() * 7 + 3);
        if (next >= 100) clearInterval(t);
        return next;
      });
    }, 220);
    return () => clearInterval(t);
  }, [downloading]);

  async function handleUnlock(e) {
    e.preventDefault();
    if (!password) return;
    try {
      const res = await fetch(`${API_BASE}/verify/${id}?password=${encodeURIComponent(password)}`);
      const d = await res.json();
      if (d.ok) {
        setUnlocked(true);
        setPasswordError(null);
      } else {
        setPasswordError('Incorrect password. Try again.');
      }
    } catch {
      setPasswordError('Could not verify password — try again.');
    }
  }

  function handleDownload() {
    setDownloading(true);
    const a = document.createElement('a');
    const params = (info?.has_password && unlocked) ? `?password=${encodeURIComponent(password)}` : '';
    a.href = `${API_BASE}/${id}${params}`;
    a.download = info?.filename || id;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  if (loading) {
    return (
      <div className="recipient-shell">
        <div style={{ fontFamily: 'var(--mono)', color: 'var(--text-3)', fontSize: 13 }}>loading…</div>
      </div>
    );
  }

  if (error) {
    const isExpired = error.code === 'EXPIRED' || error.error?.includes('expired');
    return (
      <div className="recipient-shell">
        <div style={{ width: '100%', maxWidth: 540 }}>
          <div className="mono" style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', marginBottom: 18 }}>
            <span style={{ color: 'var(--text-4)' }}>→</span> transfa.sh/<span style={{ color: 'var(--accent)' }}>{id}</span>
          </div>
          <div className="file-card" style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 32, color: 'var(--text-3)', marginBottom: 16 }}>410</div>
            <h1 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 12px' }}>{isExpired ? 'Link expired' : 'Not found'}</h1>
            <p className="muted" style={{ fontSize: 14, margin: 0 }}>
              {isExpired ? 'This link has passed its TTL. The file has been purged.' : 'This link does not exist or was revoked.'}
            </p>
          </div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--text-4)', textAlign: 'center', marginTop: 24 }}>
            <Link to="/" style={{ color: 'var(--text-3)' }}>powered by <span style={{ color: 'var(--accent)' }}>transfa.sh</span></Link>
          </div>
        </div>
      </div>
    );
  }

  const expiresAt = new Date(info.expires_at).getTime();
  const remaining = Math.max(0, expiresAt - now);
  const d = Math.floor(remaining / (24 * 3600 * 1000));
  const h = Math.floor((remaining % (24 * 3600 * 1000)) / (3600 * 1000));
  const m = Math.floor((remaining % (3600 * 1000)) / (60 * 1000));
  const s = Math.floor((remaining % (60 * 1000)) / 1000);
  const expiresCountdown = `${d}d ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  const ext = getExt(info.filename);
  const sizeStr = formatBytes(info.bytes);
  const dlParams = (info.has_password && unlocked) ? `?password=${encodeURIComponent(password)}` : '';
  const curlCmd = `curl -L "${window.location.origin}${API_BASE}/${id}${dlParams}" -o "${info.filename}"`;

  return (
    <div className="recipient-shell">
      <Seo
        title={info ? `Download ${info.filename}` : 'Download file'}
        description={info ? `Download ${info.filename} (${formatBytes(info.bytes)}) via transfa.sh — shared file link.` : 'Download a file shared via transfa.sh.'}
        noindex
      />
      <div style={{ width: '100%', maxWidth: 540 }}>
        <div className="mono" style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', marginBottom: 18, letterSpacing: '0.04em' }}>
          <span style={{ color: 'var(--text-4)' }}>→</span> transfa.sh/<span style={{ color: 'var(--accent)' }}>{id}</span>
        </div>

        <div className="file-card">
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div className="file-icon">.{ext.slice(0, 3)}</div>
            <span className={'pill ' + (d < 1 ? 'pill-warn' : 'pill-ok')}>
              <span className="dot" />active
            </span>
          </div>

          <div style={{ marginTop: 28, position: 'relative', zIndex: 1 }}>
            <h1 style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 400, letterSpacing: '-0.01em', margin: 0, wordBreak: 'break-all', lineHeight: 1.3 }}>
              {info.filename.replace(/\.[^.]+$/, '')}.<span style={{ color: 'var(--accent)' }}>{info.filename.split('.').pop()}</span>
            </h1>
            <div className="muted" style={{ fontSize: 14, marginTop: 6, fontFamily: 'var(--mono)' }}>
              {sizeStr}
            </div>
          </div>

          <div className="file-meta-row">
            <div>
              <div className="meta-k">Uploaded</div>
              <div className="meta-v">{timeAgo(info.created_at)}</div>
              <div className="mono muted-2" style={{ fontSize: 11, marginTop: 2 }}>{new Date(info.created_at).toISOString().replace('T', ' ').slice(0, 19)} UTC</div>
            </div>
            <div>
              <div className="meta-k">Expires in</div>
              <div className="meta-v" style={{ color: d < 1 ? 'var(--danger)' : 'var(--accent)' }}>{expiresCountdown}</div>
              <div className="mono muted-2" style={{ fontSize: 11, marginTop: 2 }}>{new Date(info.expires_at).toISOString().replace('T', ' ').slice(0, 19)} UTC</div>
            </div>
            <div>
              <div className="meta-k">SHA-256</div>
              <div className="meta-v" style={{ fontSize: 12 }}>{info.sha256 ? info.sha256.slice(0, 4) + '…' + info.sha256.slice(-4) : '—'}</div>
              <div className="mono muted-2" style={{ fontSize: 11, marginTop: 2, cursor: 'pointer' }}>verify ↗</div>
            </div>
            <div>
              <div className="meta-k">Downloads</div>
              <div className="meta-v">{info.download_count} <span className="muted-2" style={{ fontSize: 12 }}>/ {info.max_downloads ?? '∞'}</span></div>
              <div className="mono muted-2" style={{ fontSize: 11, marginTop: 2 }}>
                {info.last_download_at ? 'last: ' + timeAgo(info.last_download_at) : 'none yet'}
              </div>
            </div>
          </div>

          {info.has_password && !unlocked ? (
            <form onSubmit={handleUnlock} style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ marginBottom: 8, fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-3)', letterSpacing: '0.06em' }}>
                🔒 password protected
              </div>
              {passwordError && (
                <div style={{ marginBottom: 8, padding: '8px 12px', background: 'rgba(255,92,92,0.08)', border: '1px solid rgba(255,92,92,0.3)', borderRadius: 6, fontSize: 13, color: 'var(--danger)', fontFamily: 'var(--mono)' }}>
                  {passwordError}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter password…"
                  autoFocus
                  style={{ flex: 1, background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '0 14px', color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: 14, height: 56, outline: 'none' }}
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ height: 56, padding: '0 24px', fontSize: 15, fontWeight: 500 }}
                  disabled={!password}
                >
                  Unlock
                </button>
              </div>
            </form>
          ) : !downloading ? (
            <button
              className="btn btn-primary btn-lg"
              onClick={handleDownload}
              style={{ width: '100%', justifyContent: 'center', height: 56, fontSize: 16, position: 'relative', zIndex: 1, fontWeight: 500 }}
            >
              <DownloadIcon size={18} /> Download · {sizeStr}
            </button>
          ) : progress < 100 ? (
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ height: 56, borderRadius: 6, border: '1px solid var(--accent-line)', background: 'var(--bg-2)', overflow: 'hidden', position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, width: progress + '%', background: 'var(--accent-soft)', transition: 'width .2s' }} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--mono)', fontSize: 14, color: 'var(--text)' }}>
                  downloading … {progress.toFixed(0)}% · {formatBytes(info.bytes * progress / 100)}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ height: 56, borderRadius: 6, border: '1px solid rgba(70,224,139,0.4)', background: 'rgba(70,224,139,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--mono)', color: 'var(--ok)', fontSize: 14, position: 'relative', zIndex: 1 }}>
              ✓ done · saved to ~/Downloads/{info.filename}
            </div>
          )}

          <div style={{ marginTop: 16, position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button className="copy-btn" onClick={() => navigator.clipboard?.writeText(curlCmd)}>curl ↓</button>
            <div className="mono muted-2" style={{ fontSize: 11 }}>
              {info.uploader_name ? <>sent from <span style={{ color: 'var(--text-2)' }}>{info.uploader_name}</span></> : 'via transfa.sh'}
            </div>
          </div>
        </div>

        <div className="mono" style={{ fontSize: 11, color: 'var(--text-4)', textAlign: 'center', marginTop: 24, lineHeight: 1.8 }}>
          one-time link · scanned · no tracking · no account needed{'\n'}
          <Link to="/" style={{ color: 'var(--text-3)' }}>powered by <span style={{ color: 'var(--accent)' }}>transfa.sh</span></Link>
        </div>
      </div>
    </div>
  );
}
