import Footer from '../components/Footer.jsx';
import Seo from '../components/Seo.jsx';

export default function Contact() {
  return (
    <div className="page">
      <Seo
        title="Contact"
        description="Get in touch with the transfa.sh team. Support via Telegram, security reports, and enterprise inquiries."
        canonical="/contact"
        ogType="website"
      />

      <section style={{ padding: '96px 32px 64px', borderBottom: '1px solid var(--border)' }} className="grid-bg">
        <div className="container" style={{ maxWidth: 760 }}>
          <div className="eyebrow" style={{ justifyContent: 'center', textAlign: 'center' }}>Contact</div>
          <h1 className="h1" style={{ marginTop: 20, textAlign: 'center', fontSize: 'clamp(40px, 6vw, 72px)' }}>
            Questions, ideas,<br />
            <span style={{ color: 'var(--accent)' }}>anything — just ask.</span>
          </h1>
        </div>
      </section>

      <section style={{ padding: '64px 32px', borderBottom: '1px solid var(--border)' }}>
        <div className="container" style={{ maxWidth: 760 }}>
          <div style={{ display: 'grid', gap: 16 }}>

            {/* Support */}
            <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 32, background: 'var(--bg-1)', display: 'flex', gap: 28, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ width: 48, height: 48, borderRadius: 10, background: 'var(--accent-soft)', border: '1px solid var(--accent-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 8 }}>Questions &amp; Support</div>
                <h2 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 8px' }}>Reach out anytime</h2>
                <p className="muted" style={{ fontSize: 14, lineHeight: 1.6, margin: '0 0 16px' }}>
                  Questions about plans, CLI issues, API behavior, or just want to say hi — we read everything and reply fast.
                </p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <a
                    href="https://t.me/henloki"
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-primary"
                    style={{ display: 'inline-flex' }}
                  >
                    @henloki on Telegram
                    <svg style={{ marginLeft: 8 }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  </a>
                  <a href="mailto:transfa.sh@gmail.com" className="btn btn-secondary" style={{ display: 'inline-flex' }}>
                    transfa.sh@gmail.com
                  </a>
                </div>
              </div>
            </div>

            {/* Enterprise */}
            <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 32, background: 'var(--bg-1)', display: 'flex', gap: 28, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ width: 48, height: 48, borderRadius: 10, background: 'rgba(120,120,255,0.08)', border: '1px solid rgba(120,120,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-2)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 8 }}>Enterprise</div>
                <h2 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 8px' }}>Custom volume, DPA, FedRAMP</h2>
                <p className="muted" style={{ fontSize: 14, lineHeight: 1.6, margin: '0 0 16px' }}>
                  More than 50 users, compliance requirements, or need a dedicated region? Reach out and we'll set something up.
                </p>
                <a href="https://t.me/henloki" target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ display: 'inline-flex' }}>
                  Talk to founders
                </a>
              </div>
            </div>

          </div>
        </div>
      </section>

      <section style={{ padding: '64px 32px', borderBottom: '1px solid var(--border)' }}>
        <div className="container" style={{ maxWidth: 760 }}>
          <div className="eyebrow" style={{ marginBottom: 24 }}>Response times</div>
          <div className="response-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {[
              { label: 'Questions & Support', time: '< 12h', note: 'Telegram · email' },
              { label: 'Enterprise', time: '< 24h', note: 'Telegram @henloki' },
            ].map(({ label, time, note }) => (
              <div key={label} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '20px 24px', background: 'var(--bg-1)' }}>
                <div className="mono muted-2" style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
                <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.04em', color: 'var(--accent)', lineHeight: 1 }}>{time}</div>
                <div className="mono muted" style={{ fontSize: 12, marginTop: 8 }}>{note}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
