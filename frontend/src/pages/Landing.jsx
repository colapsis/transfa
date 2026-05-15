import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer.jsx';
import CodeWindow, { Sh } from '../components/CodeWindow.jsx';
import { ArrowIcon, GhIcon } from '../components/Icons.jsx';
import Seo from '../components/Seo.jsx';

const LANDING_JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': 'https://transfa.sh/#website',
      url: 'https://transfa.sh',
      name: 'transfa.sh',
      description: 'File sharing for AI agents and developers',
    },
    {
      '@type': 'Organization',
      '@id': 'https://transfa.sh/#org',
      name: 'Transfa Labs',
      url: 'https://transfa.sh',
      logo: { '@type': 'ImageObject', url: 'https://transfa.sh/og-image.png' },
      sameAs: ['https://github.com/colapsis/transfa'],
    },
    {
      '@type': 'SoftwareApplication',
      '@id': 'https://transfa.sh/#app',
      name: 'transfa',
      alternateName: 'tf',
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'macOS, Linux, Windows',
      url: 'https://transfa.sh',
      description: 'Dead-simple file sharing CLI for AI agents and developers. One command, signed URL, 7-day expiry.',
      downloadUrl: 'https://transfa.sh/install',
      softwareVersion: '1.4.2',
      isAccessibleForFree: true,
      offers: [
        { '@type': 'Offer', price: '0', priceCurrency: 'USD', name: 'Free Plan' },
        { '@type': 'Offer', price: '12', priceCurrency: 'USD', name: 'Pro Plan', description: '$12/month billed monthly, $10/month billed annually' },
        { '@type': 'Offer', price: '48', priceCurrency: 'USD', name: 'Team Plan', description: '$48/month billed monthly, $40/month billed annually' },
      ],
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Is the agent the recipient or the sender?',
          acceptedAnswer: { '@type': 'Answer', text: 'Both. Most teams use transfa to let agents publish artifacts (build outputs, screenshots, dataset slices) for humans, and to let agents fetch large inputs that don\'t fit in a context window. The CLI works identically either direction.' },
        },
        {
          '@type': 'Question',
          name: 'What happens after a link expires?',
          acceptedAnswer: { '@type': 'Answer', text: 'The file is purged from object storage and the share record is sealed. The URL returns 410 Gone, not 404 — so your agent can distinguish "this never existed" from "this is past TTL" and react accordingly.' },
        },
        {
          '@type': 'Question',
          name: 'How is this different from S3 presigned URLs?',
          acceptedAnswer: { '@type': 'Answer', text: 'Presigned URLs are a primitive — you still need to handle signing, IAM, SDK setup, content-type detection, audit logging, and distribution. Transfa is the assembled product. If you already have S3 wired into your pipeline, keep it. If you\'re in a fresh environment or writing an agent that needs to pass files between steps, one `npm install` beats fifteen minutes of IAM policy debugging.' },
        },
        {
          '@type': 'Question',
          name: 'Is a transfa link actually secure?',
          acceptedAnswer: { '@type': 'Answer', text: 'Honest answer: it depends on what you mean. The link provides content integrity (SHA-256), optional access control (password), and a hard TTL. It does not provide identity verification on the receiving end — anyone with the URL can download. For internal pipelines, ephemeral artifacts, and dev-to-staging handoffs, that\'s usually fine. For regulated data or anything where you need to know who fetched it, layer your own ACLs on top or use the password gate.' },
        },
        {
          '@type': 'Question',
          name: 'Can I self-host transfa?',
          acceptedAnswer: { '@type': 'Answer', text: 'Yes. Team plan ships a Docker image and Helm chart. State lives in Postgres + S3-compatible storage (R2, B2, MinIO). No phone-home.' },
        },
        {
          '@type': 'Question',
          name: 'Does transfa scan uploaded files for viruses?',
          acceptedAnswer: { '@type': 'Answer', text: 'Every upload runs through ClamAV before the link is published. Suspicious files are quarantined and the uploader is notified. We do not read file contents for any other purpose.' },
        },
        {
          '@type': 'Question',
          name: 'Does transfa support end-to-end encryption?',
          acceptedAnswer: { '@type': 'Answer', text: 'Opt-in. tf --encrypt generates a passphrase, encrypts client-side with age, and embeds the key in the URL fragment. Our servers never see the plaintext or the key.' },
        },
      ],
    },
  ],
};

export default function Landing() {
  return (
    <div className="page">
      <Seo
        canonical="/"
        jsonLd={LANDING_JSON_LD}
      />
      <Hero />
      <HeroUpload />
      <Logos />
      <HowItWorks />
      <GitHubActions />
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
    <section className="grid-bg hero-section" style={{ padding: '96px 32px 64px', borderBottom: '1px solid var(--border)' }}>
      <div className="container hero-grid" style={{ display: 'grid', gridTemplateColumns: '1.05fr 1fr', gap: 56, alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
            <span className="pill pill-accent"><span className="dot" />no account needed</span>
            <span className="pill"><span className="dot" style={{ background: 'var(--text-3)' }} />MCP server included</span>
          </div>
          <h1 className="h1">
            WeTransfer<br />
            <span className="slash">/</span>for<br />
            <span className="accent">agents.</span>
          </h1>
          <p className="lead" style={{ marginTop: 32 }}>
            One command sends any file and returns a signed link. No account, no browser, no config. Just works.
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
          <CodeWindow title="~ — zsh" copy="npm install -g transfa" lang="bash">
            <span className="tok-c"># install once</span>{'\n'}
            <Sh><span className="tok-cmd">npm</span> install <span className="tok-flag">-g</span> transfa</Sh>{'\n\n'}
            <span className="tok-c"># upload — no account, no auth, nothing</span>{'\n'}
            <Sh><span className="tok-cmd">tf</span> upload report.pdf</Sh>{'\n'}
            <span className="tok-out">  uploading  4.2 MB  ▰▰▰▰▰▰▰▰▰▰  100%   24.1 MB/s</span>{'\n'}
            <span className="tok-out">  expires    2026-05-15T09:14:00.000Z</span>{'\n\n'}
            <span className="tok-ok">→ Agent Link</span>{'  '}<span className="tok-str">https://transfa.sh/api/download/a7f9k2</span>{'\n'}
            <span className="tok-dim">→ Human Link</span>{'  '}https://transfa.sh/f/a7f9k2{'\n\n'}
            <span className="tok-dim">  key saved → ~/.transfa/config.json</span>
          </CodeWindow>

          <div className="mini-stats" style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <MiniStat label="no account needed" value="zero auth" />
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

function detectSource() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('utm_source')) return params.get('utm_source');
    if (document.referrer) {
      const host = new URL(document.referrer).hostname.replace(/^www\./, '');
      if (host.includes('smithery.ai'))            return 'smithery';
      if (host.includes('reddit.com'))             return 'reddit';
      if (host.includes('news.ycombinator.com'))   return 'hackernews';
      if (host.includes('github.com'))             return 'github';
      if (host.includes('twitter.com') || host.includes('x.com')) return 'twitter';
      if (host.includes('linkedin.com'))           return 'linkedin';
      if (host.includes('producthunt.com'))        return 'producthunt';
      if (host.includes('google.'))               return 'google';
      return host;
    }
  } catch {}
  return 'direct';
}

function fmtSize(b) {
  if (b < 1024) return b + ' B';
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1024 / 1024).toFixed(1) + ' MB';
}

function HeroUpload() {
  const [status, setStatus] = useState('idle'); // idle | dragging | uploading | done | error
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [filename, setFilename] = useState('');
  const [filesize, setFilesize] = useState(0);
  const [copied, setCopied] = useState(null);
  const inputRef = useRef(null);

  function handleFile(file) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Guest uploads are limited to 10 MB — install the CLI for up to 100 GB.');
      setStatus('error');
      return;
    }
    setFilename(file.name);
    setFilesize(file.size);
    setStatus('uploading');
    setProgress(0);

    const fd = new FormData();
    fd.append('file', file);
    fd.append('source', detectSource());
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload');
    xhr.upload.onprogress = e => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status === 201 || xhr.status === 200) {
        setResult(JSON.parse(xhr.responseText));
        setStatus('done');
      } else {
        try { setErrorMsg(JSON.parse(xhr.responseText).error || 'Upload failed'); }
        catch { setErrorMsg('Upload failed'); }
        setStatus('error');
      }
    };
    xhr.onerror = () => { setErrorMsg('Network error — check your connection.'); setStatus('error'); };
    xhr.send(fd);
  }

  function onDrop(e) {
    e.preventDefault();
    setStatus('idle');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function onDragOver(e) { e.preventDefault(); setStatus('dragging'); }

  function onDragLeave(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) setStatus('idle');
  }

  function copy(key, text) {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  function reset() {
    setStatus('idle'); setResult(null); setErrorMsg('');
    setProgress(0); setFilename(''); setFilesize(0);
    if (inputRef.current) inputRef.current.value = '';
  }

  const isIdle = status === 'idle' || status === 'error';

  return (
    <section style={{ padding: '80px 32px', borderBottom: '1px solid var(--border)' }}>
      <div className="container" style={{ maxWidth: 680 }}>
        <div className="eyebrow" style={{ marginBottom: 16 }}>Try it now</div>
        <h2 className="h2" style={{ marginBottom: 40 }}>
          Drop any file. <span style={{ color: 'var(--accent)' }}>Get a link.</span>
        </h2>

        {status !== 'done' ? (
          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onClick={() => isIdle && inputRef.current?.click()}
            style={{
              border: `2px dashed ${status === 'dragging' ? 'var(--accent)' : status === 'error' ? 'var(--danger)' : 'var(--border)'}`,
              borderRadius: 12,
              padding: '56px 32px',
              textAlign: 'center',
              background: status === 'dragging' ? 'var(--accent-soft)' : 'var(--bg-1)',
              cursor: isIdle ? 'pointer' : 'default',
              transition: 'border-color 0.15s, background 0.15s',
            }}
          >
            {status === 'uploading' ? (
              <div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 14, marginBottom: 20 }}>
                  <span style={{ color: 'var(--text)' }}>{filename}</span>
                  <span style={{ color: 'var(--text-3)', marginLeft: 12 }}>{fmtSize(filesize)}</span>
                </div>
                <div style={{ height: 4, background: 'var(--bg-3)', borderRadius: 99, overflow: 'hidden', maxWidth: 360, margin: '0 auto 12px' }}>
                  <div style={{ height: '100%', width: progress + '%', background: 'var(--accent)', borderRadius: 99, transition: 'width 0.1s linear' }} />
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-3)' }}>{progress}%</div>
              </div>
            ) : (
              <div>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={status === 'error' ? 'var(--danger)' : status === 'dragging' ? 'var(--accent)' : 'var(--text-3)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16 }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                {status === 'error' ? (
                  <>
                    <div style={{ color: 'var(--danger)', fontSize: 15, marginBottom: 8 }}>{errorMsg}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Click to try again</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 17, fontWeight: 500, marginBottom: 8 }}>
                      {status === 'dragging' ? 'Release to upload' : 'Drop any file to get a link'}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>
                      or click to browse · up to 10 MB · no account needed
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        ) : (
          <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', background: 'var(--bg-1)' }}>
            {/* success header */}
            <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ color: 'var(--ok)', fontSize: 18 }}>✓</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 14 }}>{result.filename}</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-3)', marginLeft: 4 }}>{fmtSize(result.bytes)}</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-3)', marginLeft: 'auto' }}>
                expires {new Date(result.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>

            {/* links */}
            {[
              { key: 'agent', label: '→ Agent Link', url: result.download_url, dim: false },
              { key: 'share', label: '→ Human Link', url: result.url, dim: true },
            ].map(({ key, label, url, dim }) => (
              <div key={key} style={{ padding: '14px 28px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, background: dim ? 'transparent' : 'var(--bg)' }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: dim ? 'var(--text-3)' : 'var(--ok)', minWidth: 90 }}>{label}</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: dim ? 'var(--text-2)' : 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</span>
                <button
                  onClick={() => copy(key, url)}
                  style={{ flexShrink: 0, background: copied === key ? 'var(--accent-soft)' : 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 12px', fontFamily: 'var(--mono)', fontSize: 11, color: copied === key ? 'var(--accent)' : 'var(--text-2)', cursor: 'pointer', transition: 'all 0.15s' }}
                >
                  {copied === key ? 'copied!' : 'copy'}
                </button>
              </div>
            ))}

            {/* footer */}
            <div style={{ padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-4)' }}>
                sha256: {result.sha256?.slice(0, 8)}…{result.sha256?.slice(-4)}
              </span>
              <button
                onClick={reset}
                style={{ background: 'none', border: 'none', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--accent)', cursor: 'pointer', padding: 0 }}
              >
                + upload another
              </button>
            </div>
          </div>
        )}

        <input ref={inputRef} type="file" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
      </div>
    </section>
  );
}

function Logos() {
  const row1 = ['Anthropic', 'LangChain', 'Replicate', 'Modal', 'Cursor', 'Hugging Face', 'Vercel', 'Browserbase'];
  const row2 = ['Vercel', 'Modal', 'Browserbase', 'Anthropic', 'Replicate', 'Cursor', 'LangChain', 'Hugging Face'];
  // Triple each row so there are no gaps at any viewport width during the loop
  const t1 = [...row1, ...row1, ...row1];
  const t2 = [...row2, ...row2, ...row2];

  return (
    <section className="logos-section">
      <p className="logos-eyebrow">
        trusted by ~14,200 builders shipping agents at
      </p>

      <div className="logos-stage">
        <div className="logos-fade logos-fade-l" />
        <div className="logos-fade logos-fade-r" />

        <div className="logos-track logos-track-fwd">
          {t1.map((name, i) => (
            <span key={i} className="logos-chip">
              <span className="logos-dot" />
              {name}
            </span>
          ))}
        </div>

        <div className="logos-track logos-track-rev">
          {t2.map((name, i) => (
            <span key={i} className="logos-chip">
              <span className="logos-dot" />
              {name}
            </span>
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
      body: 'One npm install. No runtime, no dependencies. Drop into your agent\'s tool list and forget it.',
      code: <><Sh><span className="tok-cmd">npm</span> install <span className="tok-flag">-g</span> transfa</Sh></>,
    },
    {
      n: '02',
      title: 'Pipe anything in.',
      body: 'Files, stdin, anything. The CLI streams it up and signs the content.',
      code: <><Sh><span className="tok-cmd">tf</span> upload model.pt <span className="tok-flag">--expires=24h</span></Sh>{'\n'}<Sh><span className="tok-cmd">cat</span> run.json | <span className="tok-cmd">tf</span> upload - <span className="tok-flag">--name</span>=run.json</Sh></>,
    },
    {
      n: '03',
      title: 'Hand off the link.',
      body: 'Recipient gets a signed URL. No login. No tracker. No \'choose a download speed\' screen. Works from the CLI, CI pipelines, and GitHub Actions.',
      code: <><span className="tok-ok">→ Agent Link</span>{'  '}<span className="tok-str">https://transfa.sh/api/download/a7f9k2</span>{'\n'}<span className="tok-dim">→ Human Link  https://transfa.sh/f/a7f9k2</span>{'\n'}<span className="tok-c"># or: uses: colapsis/transfa-action@v1</span></>,
    },
  ];
  return (
    <section className="section-pad" style={{ padding: '120px 32px', borderBottom: '1px solid var(--border)' }}>
      <div className="container">
        <div style={{ maxWidth: 720, marginBottom: 64 }}>
          <div className="eyebrow">How it works</div>
          <h2 className="h2" style={{ marginTop: 16 }}>Three keystrokes from <span style={{ color: 'var(--accent)' }}>./file</span> to a shareable URL.</h2>
        </div>
        <div className="how-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
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

function GitHubActions() {
  return (
    <section style={{ padding: '120px 32px', borderBottom: '1px solid var(--border)' }}>
      <div className="container">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 80, alignItems: 'center' }}>
          <div>
            <div className="eyebrow">CI/CD</div>
            <h2 className="h2" style={{ marginTop: 16 }}>
              Ship artifacts from <span style={{ color: 'var(--accent)' }}>any CI run.</span>
            </h2>
            <p className="lead" style={{ marginTop: 24 }}>
              One step uploads any file and writes signed links directly into your job summary, Slack notifications, or downstream steps. No shell scripting, no credentials juggling.
            </p>
            <ul style={{ marginTop: 28, listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                ['agent-link', 'Direct download URL for scripts and agents'],
                ['human-link', 'Browser-friendly share page for teammates'],
                ['sha256',     'Content hash for artifact integrity checks'],
                ['expires-at', 'ISO timestamp for downstream TTL logic'],
              ].map(([out, desc]) => (
                <li key={out} style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--accent)', minWidth: 90 }}>{out}</span>
                  <span style={{ fontSize: 14, color: 'var(--text-3)' }}>{desc}</span>
                </li>
              ))}
            </ul>
          </div>

          <CodeWindow title=".github/workflows/ci.yml" lang="yaml">
            <span className="tok-c">- name: Upload build artifact</span>{'\n'}
            {'  '}<span className="tok-cmd">uses</span>{': '}<span className="tok-str">colapsis/transfa-action@v1</span>{'\n'}
            {'  '}<span className="tok-cmd">id</span>{': '}<span className="tok-out">upload</span>{'\n'}
            {'  '}<span className="tok-cmd">with</span>:{'\n'}
            {'    '}<span className="tok-cmd">file</span>{': '}<span className="tok-str">./dist/report.pdf</span>{'\n'}
            {'    '}<span className="tok-cmd">api-key</span>{': '}<span className="tok-str">{'${{ secrets.TRANSFA_API_KEY }}'}</span>{'\n'}
            {'    '}<span className="tok-cmd">expires</span>{': '}<span className="tok-str">7d</span>{'\n\n'}
            <span className="tok-c">- name: Post to summary</span>{'\n'}
            {'  '}<span className="tok-cmd">run</span>{': '}{'|'}{'\n'}
            {'    '}<span className="tok-str">{'echo "### Artifact" >> $GITHUB_STEP_SUMMARY'}</span>{'\n'}
            {'    '}<span className="tok-str">{'echo "${{ steps.upload.outputs.agent-link }}" >> $GITHUB_STEP_SUMMARY'}</span>{'\n\n'}
            <span className="tok-c"># outputs available in downstream steps:</span>{'\n'}
            <span className="tok-dim">{'# steps.upload.outputs.agent-link'}</span>{'\n'}
            <span className="tok-dim">{'# steps.upload.outputs.human-link'}</span>{'\n'}
            <span className="tok-dim">{'# steps.upload.outputs.sha256'}</span>{'\n'}
            <span className="tok-dim">{'# steps.upload.outputs.expires-at'}</span>
          </CodeWindow>
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
    { k: 'GitHub Actions native', v: 'One step uploads any artifact and sets agent-link, human-link, sha256, and expires-at outputs. Post to PR summaries, Slack, or downstream jobs — zero glue.' },
    { k: 'Audit log', v: 'Every download is logged with IP, UA, and exact byte range. Pull it via API or stream to your SIEM.' },
  ];
  return (
    <section className="section-pad" style={{ padding: '120px 32px', borderBottom: '1px solid var(--border)' }}>
      <div className="container">
        <div className="for-agents-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 80, alignItems: 'start' }}>
          <div className="for-agents-sticky" style={{ position: 'sticky', top: 80 }}>
            <div className="eyebrow">Built for autonomy</div>
            <h2 className="h2" style={{ marginTop: 16 }}>An agent should never get stuck on <span style={{ color: 'var(--accent)' }}>"upload this".</span></h2>
            <p className="lead" style={{ marginTop: 24 }}>
              Most file sharing tools assume a human at a browser with a mouse and a CAPTCHA quota. Transfa assumes a process at a terminal with an API budget and a deadline.
            </p>
            <div className="code" style={{ marginTop: 28, fontSize: 13 }}>
              <span className="tok-c"># JSON output mode</span>{'\n'}
              <Sh><span className="tok-cmd">tf</span> upload file.csv <span className="tok-flag">--json</span></Sh>{'\n'}
              <span className="tok-out">{'{'}</span>{'\n'}
              <span className="tok-out">{'  "download_url": '}</span><span className="tok-str">"https://transfa.sh/api/download/k2j9f8"</span>,{'\n'}
              <span className="tok-out">{'  "url": '}</span><span className="tok-str">"https://transfa.sh/f/k2j9f8"</span>,{'\n'}
              <span className="tok-out">{'  "sha256": '}</span><span className="tok-str">"9f3a…c10e"</span>,{'\n'}
              <span className="tok-out">{'  "bytes": '}</span><span className="tok-num">12482910</span>,{'\n'}
              <span className="tok-out">{'  "expires_at": '}</span><span className="tok-str">"2026-05-20T14:00Z"</span>{'\n'}
              <span className="tok-out">{'}'}</span>
            </div>
          </div>
          <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'var(--border)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
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
    { name: 'free', price: '$0', desc: 'For tinkering.', note: 'No signup? Just upload — guest mode gives you 10 MB, 5 files/day.', items: ['500 MB / upload', 'Up to 48h expiry', '20 uploads / day', 'Public links only'] },
    { name: 'pro', price: '$12', desc: 'For builders shipping daily.', featured: true, items: ['50 GB / upload', 'Up to 30-day expiry', 'Unlimited storage', 'Password-gated links', 'API + MCP access'] },
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
                  {t.name === 'free' ? 'Start free' : 'Start 3-day trial'}
                </Link>
                {t.note && (
                  <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-4)', fontFamily: 'var(--mono)', lineHeight: 1.5 }}>
                    {t.note}
                  </div>
                )}
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
    { q: 'How is this different from S3 presigned URLs?', a: 'Presigned URLs are a primitive — you still need to handle signing, IAM, SDK setup, content-type detection, audit logging, and distribution. Transfa is the assembled product. If you already have S3 wired into your pipeline, keep it. If you\'re in a fresh environment or writing an agent that needs to pass files between steps, one `npm install` beats fifteen minutes of IAM policy debugging.' },
    { q: 'Is a transfa link actually secure?', a: 'Honest answer: it depends on what you mean. The link provides content integrity (SHA-256), optional access control (password), and a hard TTL. It does not provide identity verification on the receiving end — anyone with the URL can download. For internal pipelines, ephemeral artifacts, and dev-to-staging handoffs, that\'s usually fine. For regulated data or anything where you need to know who fetched it, layer your own ACLs on top or use the password gate.' },
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
          <span>tf upload </span>
          <span style={{ color: 'var(--accent)' }}>anything</span>
        </h2>
        <p className="lead" style={{ margin: '24px auto 36px', textAlign: 'center' }}>
          No key required to start. Run <code style={{ fontFamily: 'var(--mono)', fontSize: '0.9em' }}>tf upload</code> and get a link in seconds.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link className="btn btn-primary btn-lg" to="/docs">Start in 5 seconds <ArrowIcon /></Link>
          <Link className="btn btn-secondary btn-lg" to="/pricing">See pricing</Link>
        </div>
      </div>
    </section>
  );
}
