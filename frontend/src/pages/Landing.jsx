import { useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer.jsx';
import CodeWindow, { Sh } from '../components/CodeWindow.jsx';
import { ArrowIcon, GhIcon } from '../components/Icons.jsx';

export default function Landing() {
  return (
    <div className="page">
      <Hero />
      <Logos />
      <HowItWorks />
      <ForAgents />
      <PricingTeaser />
      <FAQ />
      <CTA />
      <Footer />
    </div>
  );
}

function Hero() {
  return (
    <section className="grid-bg" style={{ padding: '96px 32px 64px', borderBottom: '1px solid var(--border)' }}>
      <div className="container" style={{ display: 'grid', gridTemplateColumns: '1.05fr 1fr', gap: 56, alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
            <span className="pill pill-accent"><span className="dot" />v1.4 · streaming uploads</span>
            <span className="pill"><span className="dot" style={{ background: 'var(--text-3)' }} />MCP server included</span>
          </div>
          <h1 className="h1">
            WeTransfer<br />
            <span className="slash">/</span>for<br />
            <span className="accent">agents.</span>
          </h1>
          <p className="lead" style={{ marginTop: 32 }}>
            Dead-simple file sharing for AI agents and developers. One command. Signed link. 7-day expiry. No accounts for recipients, no UI, no nonsense.
          </p>
          <div style={{ marginTop: 36, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <Link className="btn btn-primary btn-lg" to="/docs">
              Read the docs <ArrowIcon />
            </Link>
            <a className="btn btn-secondary btn-lg" href="https://github.com/colapsis/transfa" target="_blank" rel="noreferrer">
              <GhIcon /> Star on GitHub
            </a>
            <span className="muted-2" style={{ fontFamily: 'var(--mono)', fontSize: 12, marginLeft: 4 }}>
              MIT · no telemetry · works offline-first
            </span>
          </div>
        </div>

        <div>
          <CodeWindow title="~ — zsh" copy="curl -fsSL transfa.sh/install | sh" lang="bash">
            <span className="tok-c"># install in 5 seconds</span>{'\n'}
            <Sh><span className="tok-cmd">curl</span> <span className="tok-flag">-fsSL</span> transfa.sh/install | sh</Sh>{'\n'}
            <span className="tok-out">  ▸ transfa v1.4.2 → /usr/local/bin/tf</span>{'\n\n'}
            <span className="tok-c"># send anything, anywhere</span>{'\n'}
            <Sh><span className="tok-cmd">tf</span> dataset.parquet</Sh>{'\n'}
            <span className="tok-out">  uploading  2.4 GB  ▰▰▰▰▰▰▰▰▰▰  100%   18.2 MB/s</span>{'\n'}
            <span className="tok-out">  signed     sha256:</span><span className="tok-dim">9f3a…c10e</span>{'\n'}
            <span className="tok-out">  expires    in 7 days</span>{'\n\n'}
            <span className="tok-cmd">→ https://transfa.sh/</span><span className="tok-str">a7f9k2</span>{'\n'}
            <span className="tok-dim">  copied to clipboard.</span>
          </CodeWindow>

          <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <MiniStat label="median p50 upload" value="18.2 MB/s" />
            <MiniStat label="max file size" value="100 GB" />
            <MiniStat label="setup time" value="5 sec" />
          </div>
        </div>
      </div>
    </section>
  );
}

function MiniStat({ label, value }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '10px 12px', background: 'var(--bg-1)' }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)' }}>{label}</div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 14, color: 'var(--text)', marginTop: 4 }}>{value}</div>
    </div>
  );
}

function Logos() {
  const names = ['Anthropic', 'LangChain', 'Replicate', 'Modal', 'Cursor', 'Hugging Face', 'Vercel', 'Browserbase'];
  return (
    <section style={{ padding: '48px 32px', borderBottom: '1px solid var(--border)' }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', gap: 32, justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div className="mono muted-2" style={{ fontSize: 12, letterSpacing: '0.08em' }}>
          // trusted by ~14,200 builders shipping agents at
        </div>
        <div style={{ display: 'flex', gap: 36, flexWrap: 'wrap', alignItems: 'center' }}>
          {names.map(n => (
            <span key={n} style={{ fontFamily: 'var(--mono)', fontSize: 14, color: 'var(--text-3)', letterSpacing: '-0.01em' }}>{n}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: '01',
      title: 'Install once.',
      body: 'Single static binary. No runtime, no dependencies. Drop into your agent\'s tool list and forget it.',
      code: <><Sh><span className="tok-cmd">brew</span> install transfa</Sh></>,
    },
    {
      n: '02',
      title: 'Pipe anything in.',
      body: 'Files, directories, stdin, even a docker save. Transfa figures out the shape and streams it up.',
      code: <><Sh><span className="tok-cmd">tf</span> ./build/ <span className="tok-flag">--ttl=24h</span></Sh>{'\n'}<Sh><span className="tok-cmd">cat</span> log.json | <span className="tok-cmd">tf</span> <span className="tok-flag">--name</span>=run.json</Sh></>,
    },
    {
      n: '03',
      title: 'Hand off the link.',
      body: 'Recipient gets a signed URL. No login. No tracker. No \'choose a download speed\' screen. Just the file.',
      code: <><span className="tok-cmd">→ https://transfa.sh/</span><span className="tok-str">a7f9k2</span>{'\n'}<span className="tok-dim">  expires in 7d · 0/∞ downloads</span></>,
    },
  ];
  return (
    <section style={{ padding: '120px 32px', borderBottom: '1px solid var(--border)' }}>
      <div className="container">
        <div style={{ maxWidth: 720, marginBottom: 64 }}>
          <div className="eyebrow">How it works</div>
          <h2 className="h2" style={{ marginTop: 16 }}>Three keystrokes from <span style={{ color: 'var(--accent)' }}>./file</span> to a shareable URL.</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {steps.map(s => (
            <div key={s.n} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: 28, borderBottom: '1px solid var(--border)' }}>
                <div className="mono" style={{ color: 'var(--accent)', fontSize: 13, marginBottom: 16 }}>{s.n} /</div>
                <h3 className="h3" style={{ marginBottom: 12, fontSize: 22, letterSpacing: '-0.02em' }}>{s.title}</h3>
                <p className="muted" style={{ fontSize: 14, lineHeight: 1.55, margin: 0 }}>{s.body}</p>
              </div>
              <div style={{ background: 'var(--bg)', padding: '16px 20px', fontFamily: 'var(--mono)', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre', overflow: 'auto' }}>
                {s.code}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ForAgents() {
  const features = [
    { k: 'MCP-native', v: 'Drop-in MCP server. Claude, Cursor, and any MCP host get transfa.upload, transfa.fetch, transfa.list as tools — no glue code.' },
    { k: 'Structured output', v: 'Every command emits machine-parseable JSON with --json. URLs, hashes, expirations, sizes. Agents parse, humans skim.' },
    { k: 'Idempotent', v: 'Re-running tf on the same hash returns the existing link instead of re-uploading. Safe to retry, safe to loop.' },
    { k: 'Streaming stdin', v: 'Pipe ffmpeg, postgres dumps, image generators directly. No temp files, no buffering surprises, no OOM.' },
    { k: 'Signed URLs', v: 'HMAC-signed, optionally one-time, optionally password-gated. The link is the auth — share it like a cookie.' },
    { k: 'Audit log', v: 'Every download is logged with IP, UA, and exact byte range. Pull it via API or stream to your SIEM.' },
  ];
  return (
    <section style={{ padding: '120px 32px', borderBottom: '1px solid var(--border)' }}>
      <div className="container">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 80, alignItems: 'start' }}>
          <div style={{ position: 'sticky', top: 80 }}>
            <div className="eyebrow">Built for autonomy</div>
            <h2 className="h2" style={{ marginTop: 16 }}>An agent should never get stuck on <span style={{ color: 'var(--accent)' }}>"upload this".</span></h2>
            <p className="lead" style={{ marginTop: 24 }}>
              Most file sharing tools assume a human at a browser with a mouse and a CAPTCHA quota. Transfa assumes a process at a terminal with an API budget and a deadline.
            </p>
            <div className="code" style={{ marginTop: 28, fontSize: 13 }}>
              <span className="tok-c"># JSON output mode</span>{'\n'}
              <Sh><span className="tok-cmd">tf</span> file.csv <span className="tok-flag">--json</span></Sh>{'\n'}
              <span className="tok-out">{'{'}</span>{'\n'}
              <span className="tok-out">{'  "url": '}</span><span className="tok-str">"https://transfa.sh/k2j9f8"</span>,{'\n'}
              <span className="tok-out">{'  "sha256": '}</span><span className="tok-str">"9f3a…c10e"</span>,{'\n'}
              <span className="tok-out">{'  "bytes": '}</span><span className="tok-num">12482910</span>,{'\n'}
              <span className="tok-out">{'  "expires_at": '}</span><span className="tok-str">"2026-05-20T14:00Z"</span>{'\n'}
              <span className="tok-out">{'}'}</span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'var(--border)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            {features.map((f, i) => (
              <div key={f.k} style={{ background: 'var(--bg)', padding: 28, minHeight: 180 }}>
                <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 12 }}>0{i + 1}</div>
                <h3 style={{ fontSize: 16, margin: '0 0 10px', letterSpacing: '-0.01em', color: 'var(--accent)' }}>{f.k}</h3>
                <p className="muted" style={{ fontSize: 14, lineHeight: 1.55, margin: 0 }}>{f.v}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function PricingTeaser() {
  const tiers = [
    { name: 'free', price: '$0', desc: 'For tinkering.', items: ['2 GB / upload', '7-day expiry', '10 uploads / day', 'Public links only'] },
    { name: 'pro', price: '$12', desc: 'For builders shipping daily.', featured: true, items: ['50 GB / upload', 'Up to 30-day expiry', 'Unlimited uploads', 'Password-gated links', 'API + MCP access'] },
    { name: 'team', price: '$48', desc: 'For agent fleets in production.', items: ['100 GB / upload', 'Custom expiry', '5 seats included', 'Audit log + SIEM stream', 'SAML SSO + DPA'] },
  ];
  return (
    <section style={{ padding: '120px 32px', borderBottom: '1px solid var(--border)' }}>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: 48, flexWrap: 'wrap', gap: 24 }}>
          <div style={{ maxWidth: 620 }}>
            <div className="eyebrow">Pricing</div>
            <h2 className="h2" style={{ marginTop: 16 }}>Priced per agent, not per seat.</h2>
            <p className="lead" style={{ marginTop: 16 }}>Three tiers. Flat. No surprise egress bills, no "contact sales" buttons.</p>
          </div>
          <Link className="btn btn-secondary" to="/pricing">Full comparison <ArrowIcon /></Link>
        </div>
        <div className="price-grid">
          {tiers.map(t => (
            <div key={t.name} className={'price-card' + (t.featured ? ' featured' : '')} style={{ position: 'relative' }}>
              {t.featured && <div style={{ position: 'absolute', top: 16, right: 16 }}><span className="pill pill-accent">most picked</span></div>}
              <div className="price-name">{t.name}</div>
              <div style={{ marginTop: 12 }}>
                <span className="price-amt">{t.price}</span> <span className="price-amt unit">/ month</span>
              </div>
              <div className="muted" style={{ fontSize: 14, marginTop: 8 }}>{t.desc}</div>
              <ul className="price-list">
                {t.items.map(i => <li key={i}><span className="check">▸</span>{i}</li>)}
              </ul>
              <div style={{ marginTop: 'auto' }}>
                <Link
                  className={'btn ' + (t.featured ? 'btn-primary' : 'btn-secondary')}
                  style={{ width: '100%', justifyContent: 'center' }}
                  to="/dashboard"
                >
                  {t.name === 'free' ? 'Start free' : 'Start 14-day trial'}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const qs = [
    { q: 'Is the agent the recipient or the sender?', a: 'Both. Most teams use transfa to let agents publish artifacts (build outputs, screenshots, dataset slices) for humans, and to let agents fetch large inputs that don\'t fit in a context window. The CLI works identically either direction.' },
    { q: 'What happens after a link expires?', a: 'The file is purged from object storage and the share record is sealed. The URL returns 410 Gone, not 404 — so your agent can distinguish \'this never existed\' from \'this is past TTL\' and react accordingly.' },
    { q: 'How is this different from S3 presigned URLs?', a: 'Presigned URLs are a primitive. Transfa is the product: short URLs, automatic content-type detection, virus scanning, audit log, password gating, MCP server, idempotency, and a CLI that pipes. You can build it yourself; you probably shouldn\'t.' },
    { q: 'Can I self-host?', a: 'Yes. Team plan ships a Docker image and Helm chart. State lives in Postgres + S3-compatible storage (R2, B2, MinIO). No phone-home.' },
    { q: 'Do you scan files?', a: 'Every upload runs through ClamAV before the link is published. Suspicious files are quarantined and the uploader is notified. We do not read file contents for any other purpose.' },
    { q: 'What about end-to-end encryption?', a: 'Opt-in. tf --encrypt generates a passphrase, encrypts client-side with age, and embeds the key in the URL fragment. Our servers never see the plaintext or the key.' },
  ];
  const [open, setOpen] = useState(0);
  return (
    <section style={{ padding: '120px 32px', borderBottom: '1px solid var(--border)' }}>
      <div className="container-narrow">
        <div className="eyebrow">FAQ</div>
        <h2 className="h2" style={{ marginTop: 16, marginBottom: 48 }}>Common questions.</h2>
        <div>
          {qs.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={i} style={{ borderTop: '1px solid var(--border)', borderBottom: i === qs.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <button
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'transparent', border: 0, color: 'var(--text)', padding: '24px 0', textAlign: 'left', cursor: 'pointer' }}
                >
                  <span style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
                    <span className="mono" style={{ color: 'var(--text-3)', fontSize: 13 }}>0{i + 1}</span>
                    <span style={{ fontSize: 18, fontWeight: 500, letterSpacing: '-0.01em' }}>{item.q}</span>
                  </span>
                  <span className="mono" style={{ color: 'var(--accent)', fontSize: 18 }}>{isOpen ? '−' : '+'}</span>
                </button>
                {isOpen && (
                  <div style={{ paddingBottom: 24, paddingLeft: 40, paddingRight: 40, fontSize: 15, lineHeight: 1.6, color: 'var(--text-2)', maxWidth: '70ch' }}>
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section style={{ padding: '120px 32px' }}>
      <div className="container" style={{ textAlign: 'center' }}>
        <h2 className="h2" style={{ fontSize: 'clamp(40px, 6vw, 80px)' }}>
          <span style={{ color: 'var(--text-3)', fontFamily: 'var(--mono)', fontWeight: 400 }}>$ </span>
          <span>brew install </span>
          <span style={{ color: 'var(--accent)' }}>transfa</span>
        </h2>
        <p className="lead" style={{ margin: '24px auto 36px', textAlign: 'center' }}>
          Free tier needs nothing but a terminal. Sign up takes 30 seconds and unlocks a key.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link className="btn btn-primary btn-lg" to="/docs">Start in 5 seconds <ArrowIcon /></Link>
          <Link className="btn btn-secondary btn-lg" to="/pricing">See pricing</Link>
        </div>
      </div>
    </section>
  );
}
