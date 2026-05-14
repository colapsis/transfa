import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Seo from '../components/Seo.jsx';

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  if (bytes >= 1e9) return (bytes / 1e9).toFixed(1) + ' GB';
  if (bytes >= 1e6) return (bytes / 1e6).toFixed(1) + ' MB';
  if (bytes >= 1e3) return (bytes / 1e3).toFixed(1) + ' KB';
  return bytes + ' B';
}

function expiresIn(isoStr) {
  const diff = (new Date(isoStr).getTime() - Date.now()) / 1000;
  if (diff <= 0) return { label: 'expired', ok: false };
  const d = Math.floor(diff / 86400);
  const h = Math.floor((diff % 86400) / 3600);
  return { label: d > 0 ? `${d}d ${h}h` : `${h}h`, ok: diff > 86400 };
}

function getExt(filename) {
  const parts = (filename || '').split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : 'bin';
}

const EXT_COLORS = {
  parquet: '#b3eaff', zip: '#ffb86b', json: '#e8ff47', tar: '#ff7eb6',
  pb: '#b3eaff', pdf: '#ff5c5c', safetensors: '#46e08b',
  csv: '#e8ff47', txt: '#b3b3b3', py: '#ffb86b', js: '#ffb86b',
};

export default function Profile() {
  const { username } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`/api/u/${encodeURIComponent(username)}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError('Failed to load profile'))
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) {
    return (
      <div style={{ minHeight: 'calc(100vh - 56px)', display: 'grid', placeItems: 'center' }}>
        <div style={{ fontFamily: 'var(--mono)', color: 'var(--text-3)', fontSize: 13 }}>loading…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: 'calc(100vh - 56px)', display: 'grid', placeItems: 'center' }}>
        <Seo title="Not found" noindex />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 32, color: 'var(--text-3)', marginBottom: 12 }}>404</div>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 8px' }}>User not found</h1>
          <p className="muted" style={{ fontSize: 14 }}>No active uploads for <span style={{ color: 'var(--accent)' }}>{username}</span>.</p>
          <Link to="/" style={{ color: 'var(--text-3)', fontFamily: 'var(--mono)', fontSize: 12, marginTop: 24, display: 'block' }}>← transfa.sh</Link>
        </div>
      </div>
    );
  }

  const uploads = data.uploads || [];

  return (
    <div style={{ minHeight: 'calc(100vh - 56px)', padding: '48px 24px' }}>
      <Seo
        title={`${username} — transfa.sh`}
        description={`${uploads.length} active file${uploads.length !== 1 ? 's' : ''} shared by ${username} on transfa.sh`}
      />
      <div style={{ maxWidth: 680, margin: '0 auto' }}>

        {/* Profile header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 40 }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'var(--accent)', color: '#000',
            display: 'grid', placeItems: 'center',
            fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 18,
          }}>
            {username.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0, letterSpacing: '-0.02em' }}>{username}</h1>
            <div className="mono muted" style={{ fontSize: 12, marginTop: 4 }}>
              {uploads.length} active file{uploads.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* File list */}
        {uploads.length === 0 ? (
          <div style={{ padding: '64px 32px', textAlign: 'center', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-3)', fontFamily: 'var(--mono)', fontSize: 13 }}>
            no active uploads
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {uploads.map(u => {
              const ext = getExt(u.filename);
              const color = EXT_COLORS[ext] || 'var(--text-3)';
              const { label: expLabel, ok: expOk } = expiresIn(u.expires_at);
              return (
                <Link
                  key={u.id}
                  to={`/f/${u.id}`}
                  style={{ textDecoration: 'none' }}
                >
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 18px',
                    border: '1px solid var(--border)', borderRadius: 8,
                    background: 'var(--bg-1)',
                    transition: 'border-color .15s, background .15s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--bg-2)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-1)'; }}
                  >
                    {/* File type badge */}
                    <div style={{
                      width: 38, height: 38, borderRadius: 6, flexShrink: 0,
                      background: 'var(--bg-2)', border: '1px solid var(--border)',
                      display: 'grid', placeItems: 'center',
                      fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700,
                      color, letterSpacing: '0.04em',
                    }}>
                      {ext.slice(0, 4).toUpperCase()}
                    </div>

                    {/* Name + size */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {u.filename}
                      </div>
                      <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                        {formatBytes(u.size)} · {u.download_count} dl
                      </div>
                    </div>

                    {/* Expiry */}
                    <div className="mono" style={{ fontSize: 11, color: expOk ? 'var(--text-3)' : 'var(--danger)', flexShrink: 0 }}>
                      {expLabel}
                    </div>

                    <div style={{ color: 'var(--text-4)', fontSize: 16, flexShrink: 0 }}>→</div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: 48, textAlign: 'center' }}>
          <Link to="/" style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-4)' }}>
            powered by <span style={{ color: 'var(--accent)' }}>transfa.sh</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
