import { useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer.jsx';
import CodeWindow, { Sh } from '../components/CodeWindow.jsx';
import { SearchIcon } from '../components/Icons.jsx';
import Seo from '../components/Seo.jsx';

function Mono({ children }) {
  return <code style={{ fontFamily: 'var(--mono)', fontSize: 13, background: 'var(--bg-2)', padding: '2px 6px', borderRadius: 4, color: 'var(--accent)' }}>{children}</code>;
}
function P({ children, style }) {
  return <p style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--text-2)', margin: '0 0 14px', maxWidth: '70ch', ...style }}>{children}</p>;
}
function H2({ id, children, eyebrow }) {
  return (
    <div id={id} style={{ marginTop: 64, marginBottom: 20, scrollMarginTop: 80 }}>
      {eyebrow && <div className="mono" style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 8 }}>{eyebrow}</div>}
      <h2 style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>{children}</h2>
    </div>
  );
}
function H3({ id, children }) {
  return <h3 id={id} style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em', margin: '32px 0 12px', scrollMarginTop: 80 }}>{children}</h3>;
}

function FlagTable({ title, rows }) {
  return (
    <div className="docs-flag-table" style={{ marginTop: 20 }}>
      <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', minWidth: 400 }}>
        <div style={{ background: 'var(--bg-1)', padding: '12px 18px', fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--accent)', borderBottom: '1px solid var(--border)' }}>{title}</div>
        <table className="table" style={{ background: 'var(--bg)' }}>
        <thead>
          <tr><th style={{ width: 200 }}>Flag</th><th>Description</th><th style={{ width: 80 }}>Default</th></tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="mono" style={{ color: 'var(--accent)' }}>{r[0]}</td>
              <td className="muted" style={{ fontSize: 13 }}>{r[1]}</td>
              <td className="mono">{r[2]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </div>
  );
}

function RateTable() {
  const rows = [
    ['Uploads per minute', '10', '60', '300'],
    ['Concurrent uploads', '1', '5', '25'],
    ['Max file size', '2 GB', '50 GB', '100 GB'],
    ['Max TTL', '7 days', '30 days', '180 days'],
    ['API requests / min', '30', '600', '3,000'],
    ['MCP tool calls / min', '—', '120', '600'],
  ];
  return (
    <div className="docs-flag-table" style={{ marginTop: 20 }}>
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', minWidth: 400 }}>
      <table className="compare-table">
        <thead>
          <tr>
            <th style={{ width: 220 }}>Resource</th>
            <th>Free</th>
            <th style={{ color: 'var(--accent)' }}>Pro</th>
            <th>Team</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <th>{r[0]}</th>
              <td className="mono">{r[1]}</td>
              <td className="mono" style={{ color: 'var(--accent)' }}>{r[2]}</td>
              <td className="mono">{r[3]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </div>
  );
}

const SECTIONS = [
  { group: 'Getting started', items: [{ id: 'introduction', title: 'Introduction' }, { id: 'installation', title: 'Installation' }, { id: 'quickstart', title: 'Quick start' }] },
  { group: 'CLI reference', items: [{ id: 'cli-upload', title: 'tf upload' }, { id: 'cli-list', title: 'tf list' }, { id: 'cli-fetch', title: 'tf fetch' }, { id: 'cli-rm', title: 'tf rm' }, { id: 'cli-config', title: 'tf config' }] },
  { group: 'API reference', items: [{ id: 'api-auth', title: 'Authentication' }, { id: 'api-upload', title: 'POST /v1/uploads' }, { id: 'api-get', title: 'GET /v1/uploads/:id' }, { id: 'api-list', title: 'GET /v1/uploads' }] },
  { group: 'Operations', items: [{ id: 'rate-limits', title: 'Rate limits' }, { id: 'errors', title: 'Error codes' }, { id: 'webhooks', title: 'Webhooks' }] },
];

export default function Docs() {
  const [active, setActive] = useState('installation');

  return (
    <div className="page">
      <Seo
        title="Docs & API Reference"
        description="Full CLI reference, REST API docs, Python/Node/Go SDK, MCP server setup, rate limits, and authentication guide for transfa file sharing."
        canonical="/docs"
      />
      <div className="layout-sidebar">
        <aside className="sidebar">
          <div className="docs-sidebar-meta" style={{ marginBottom: 32, padding: '0 10px' }}>
            <div className="mono" style={{ fontSize: 12, color: 'var(--text-3)' }}>docs · v1.6.0</div>
            <div style={{ position: 'relative', marginTop: 12 }}>
              <input
                placeholder="Search docs…"
                style={{ width: '100%', background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px 8px 30px', color: 'var(--text)', fontFamily: 'var(--sans)', fontSize: 13, outline: 'none' }}
              />
              <span style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-3)', display: 'flex' }}><SearchIcon /></span>
              <span className="kbd" style={{ position: 'absolute', right: 8, top: 8 }}>⌘K</span>
            </div>
          </div>

          {SECTIONS.map(({ group, items }) => (
            <div key={group} className="sidebar-group">
              <h3 className="sidebar-title">{group}</h3>
              {items.map(it => (
                <a
                  key={it.id}
                  href={'#' + it.id}
                  className={'sidebar-link' + (active === it.id ? ' active' : '')}
                  onClick={(e) => {
                    e.preventDefault();
                    setActive(it.id);
                    const el = document.getElementById(it.id);
                    if (el) {
                      const top = el.getBoundingClientRect().top + window.scrollY - 100;
                      window.scrollTo({ top, behavior: 'smooth' });
                    }
                  }}
                >
                  {it.title}
                </a>
              ))}
            </div>
          ))}

          <div className="docs-sidebar-meta" style={{ marginTop: 32, padding: '0 10px', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-4)' }}>
            Last updated 2026-05-11
          </div>
        </aside>

        <main>
          <div style={{ marginBottom: 56 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-3)', marginBottom: 12 }}>
              Documentation <span style={{ color: 'var(--text-4)' }}>/</span> Getting started <span style={{ color: 'var(--text-4)' }}>/</span> Installation
            </div>
            <h1 style={{ fontSize: 44, letterSpacing: '-0.03em', fontWeight: 600, margin: 0, lineHeight: 1.05 }}>
              Get transfa running in 5 seconds.
            </h1>
            <p className="lead" style={{ marginTop: 20 }}>
              A single static binary. No daemon, no runtime dependency, no global config. Install it, generate a key, ship a file.
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <span className="pill pill-ok"><span className="dot" />stable</span>
              <span className="pill">macOS · Linux · Windows · Docker</span>
              <span className="pill">17 MB binary</span>
            </div>
          </div>

          <article>
            <H2 id="installation" eyebrow="01 · install">Installation</H2>
            <P>The fastest path is the install script. It installs the CLI globally via npm and drops the <Mono>tf</Mono> command into your PATH.</P>
            <CodeWindow title="install" copy="curl -fsSL https://transfa.sh/install | sh" lang="bash">
              <Sh><span className="tok-cmd">curl</span> <span className="tok-flag">-fsSL</span> https://transfa.sh/install | sh</Sh>
            </CodeWindow>

            <H3 id="package-managers">Package managers</H3>
            <P>If you'd rather use your existing tooling:</P>
            <CodeWindow title="package managers" lang="bash">
              <span className="tok-c"># macOS / Linuxbrew</span>{'\n'}
              <Sh><span className="tok-cmd">brew</span> install transfa</Sh>{'\n\n'}
              <span className="tok-c"># npm (global CLI)</span>{'\n'}
              <Sh><span className="tok-cmd">npm</span> install <span className="tok-flag">-g</span> transfa</Sh>{'\n\n'}
              <span className="tok-c"># Docker</span>{'\n'}
              <Sh><span className="tok-cmd">docker</span> run <span className="tok-flag">--rm</span> <span className="tok-flag">-v</span> $PWD:/data ghcr.io/transfa/cli</Sh>
            </CodeWindow>

            <H2 id="quickstart" eyebrow="02 · quickstart">Quick start</H2>
            <P>After install, run <Mono>tf auth</Mono> to get a free API key instantly — no browser or sign-up required.</P>
            <CodeWindow title="auth" copy="tf auth" lang="bash">
              <Sh><span className="tok-cmd">tf</span> auth</Sh>{'\n'}
              <span className="tok-out">  ✓ new API key generated</span>{'\n'}
              <span className="tok-out">  key:  tf_live_••••••••••••••••</span>{'\n'}
              <span className="tok-out">  plan: free</span>{'\n'}
              <span className="tok-out">  saved to ~/.transfa/config.json</span>
            </CodeWindow>

            <P style={{ marginTop: 24 }}>Send a file. The default TTL is 7 days. The link is copied to your clipboard.</P>
            <CodeWindow title="upload" copy="transfa upload dataset.parquet" lang="bash">
              <Sh><span className="tok-cmd">transfa</span> upload dataset.parquet</Sh>{'\n'}
              <span className="tok-out">  ▸ dataset.parquet  2.4 GB</span>{'\n'}
              <span className="tok-out">  uploading  ▰▰▰▰▰▰▰▰▰▰  100%   18.2 MB/s</span>{'\n'}
              <span className="tok-out">  signed     sha256:</span><span className="tok-dim">9f3a…c10e</span>{'\n\n'}
              <span className="tok-cmd">→ https://transfa.sh/</span><span className="tok-str">a7f9k2</span>{'\n'}
              <span className="tok-dim">  expires 2026-05-20 · copied to clipboard</span>
            </CodeWindow>

            <H2 id="cli-upload" eyebrow="03 · CLI">CLI reference</H2>
            <P>The CLI is one binary, <Mono>transfa</Mono> (alias <Mono>tf</Mono>), with core verbs. Every verb accepts <Mono>--json</Mono> for machine output and <Mono>--quiet</Mono> for silent runs.</P>

            <FlagTable
              title="transfa upload [file]"
              rows={[
                ['--expires=<dur>', 'Time-to-live before purge. 1h–30d. Default 7d.', '7d'],
                ['--name=<str>', 'Override the filename shown to the recipient.', '—'],
                ['--password=<s>', 'Gate the link with a password.', '—'],
                ['--max=<n>', 'Maximum download count before the link locks.', '∞'],
                ['--once', 'Shortcut for --max=1.', 'off'],
                ['--json', 'Emit structured JSON instead of progress UI.', 'off'],
                ['--quiet', 'Print the URL and nothing else.', 'off'],
              ]}
            />

            <H3 id="cli-list">transfa list</H3>
            <CodeWindow title="list" lang="bash">
              <Sh><span className="tok-cmd">transfa</span> list <span className="tok-flag">--limit=5</span></Sh>{'\n'}
              <span className="tok-out">  ID         FILE                 SIZE      AGE     EXPIRES   DOWNLOADS</span>{'\n'}
              <span className="tok-out">  a7f9k2     dataset.parquet     2.4 GB     3h      6d 21h   4</span>{'\n'}
              <span className="tok-out">  m1x8qz     screenshots.zip     412 MB     1d      6d       17</span>{'\n'}
              <span className="tok-out">  b2c4vd     run.json            8.4 KB     2d      5d       1</span>
            </CodeWindow>

            <H2 id="api-auth" eyebrow="04 · API">API reference</H2>
            <P>All endpoints live under <Mono>https://transfa.sh/api</Mono>. Authenticate with a bearer token.</P>

            <CodeWindow title="curl" copy='curl -X POST https://transfa.sh/api/upload -H "Authorization: Bearer tf_live_•••" -F "file=@report.pdf" -F "ttl=7d"' lang="bash">
              <Sh><span className="tok-cmd">curl</span> <span className="tok-flag">-X</span> POST https://transfa.sh/api/upload \</Sh>{'\n'}
              <span className="tok-out">    </span><span className="tok-flag">-H</span> <span className="tok-str">"Authorization: Bearer tf_live_•••"</span> \{'\n'}
              <span className="tok-out">    </span><span className="tok-flag">-F</span> <span className="tok-str">"file=@report.pdf"</span> \{'\n'}
              <span className="tok-out">    </span><span className="tok-flag">-F</span> <span className="tok-str">"ttl=7d"</span>
            </CodeWindow>

            <H3 id="api-upload">Response · 201 Created</H3>
            <CodeWindow title="JSON" lang="json">
              {'{\n'}
              {'  "id": '}<span className="tok-str">"a7f9k2"</span>,{'\n'}
              {'  "url": '}<span className="tok-str">"https://transfa.sh/a7f9k2"</span>,{'\n'}
              {'  "filename": '}<span className="tok-str">"report.pdf"</span>,{'\n'}
              {'  "bytes": '}<span className="tok-num">1290482</span>,{'\n'}
              {'  "sha256": '}<span className="tok-str">"9f3a…c10e"</span>,{'\n'}
              {'  "expires_at": '}<span className="tok-str">"2026-05-14T09:14:00Z"</span>,{'\n'}
              {'  "download_count": '}<span className="tok-num">0</span>{'\n'}
              {'}'}
            </CodeWindow>

            <H2 id="rate-limits" eyebrow="05 · limits">Rate limits</H2>
            <P>Limits are per-workspace and reset rolling. The CLI auto-retries with exponential backoff on 429s.</P>
            <RateTable />

            <P style={{ marginTop: 28 }}>Hitting a hard limit returns:</P>
            <CodeWindow title="response · 429" lang="http">
              <span className="tok-key">HTTP</span>/1.1 <span className="tok-num">429</span> Too Many Requests{'\n'}
              <span className="tok-flag">Retry-After</span>: 42{'\n'}
              <span className="tok-flag">X-RateLimit-Limit</span>: 60{'\n'}
              <span className="tok-flag">X-RateLimit-Remaining</span>: 0{'\n'}
              <span className="tok-flag">X-RateLimit-Reset</span>: 1715594400
            </CodeWindow>

            <div style={{ marginTop: 80, padding: 28, border: '1px solid var(--accent-line)', background: 'var(--accent-soft)', borderRadius: 10 }}>
              <div className="mono" style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 8 }}>Next</div>
              <h3 style={{ margin: 0, fontSize: 22, letterSpacing: '-0.02em' }}>Wire transfa into your agent →</h3>
              <p className="muted" style={{ marginTop: 8, marginBottom: 16, fontSize: 14, maxWidth: '60ch' }}>
                The MCP server exposes upload, fetch, list and rm as native tools. Point your host at <Mono>tf mcp serve</Mono> and you're done.
              </p>
              <Link className="btn btn-primary btn-sm" to="/docs">MCP integration guide →</Link>
            </div>
          </article>
        </main>
      </div>
      <Footer />
    </div>
  );
}
