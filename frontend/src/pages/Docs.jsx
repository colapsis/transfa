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
  { group: 'CLI reference', items: [{ id: 'cli-upload', title: 'tf upload' }, { id: 'cli-list', title: 'tf list' }, { id: 'cli-fetch', title: 'tf fetch' }, { id: 'cli-rm', title: 'tf rm' }, { id: 'cli-download', title: 'tf download' }, { id: 'cli-config', title: 'tf config' }] },
  { group: 'API reference', items: [{ id: 'api-auth', title: 'Authentication' }, { id: 'api-upload', title: 'POST /v1/uploads' }, { id: 'api-get', title: 'GET /v1/uploads/:id' }, { id: 'api-list', title: 'GET /v1/uploads' }] },
  { group: 'Operations', items: [{ id: 'rate-limits', title: 'Rate limits' }, { id: 'errors', title: 'Error codes' }] },
  { group: 'Security', items: [{ id: 'security-model', title: 'Security model' }, { id: 'security-verification', title: 'Integrity verification' }] },
  { group: 'Integrations', items: [
    { id: 'github-actions', title: 'GitHub Actions' },
    { id: 'presigned-upload', title: 'Presigned uploads' },
    { id: 'pipeline-manifest', title: 'Pipeline manifests' },
    { id: 'webhooks', title: 'Webhooks' },
  ]},
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
            Last updated 2026-05-14
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
                ['--grace=<dur>', 'Grace period after expiry — file stays downloadable this long after TTL ends (useful for delayed pipeline steps).', '0'],
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

            <H2 id="cli-download" eyebrow="02 · cli reference">tf download</H2>
            <P>Download a file by ID and verify its integrity. SHA-256 verification runs by default — the download fails loudly if the hash doesn't match, protecting against silent corruption in pipelines.</P>

            <FlagTable
              title="tf download <id>"
              rows={[
                ['--output=<path>', 'Save to this path instead of the original filename.', '(original name)'],
                ['--verify', 'Verify SHA-256 after download — exits 2 on mismatch.', 'true'],
                ['--no-verify', 'Skip integrity check.', '—'],
                ['--password=<pw>', 'Password for protected files.', '—'],
                ['--json', 'Machine-readable output.', '—'],
              ]}
            />

            <CodeWindow title="~ — zsh" lang="bash">
              <Sh><span className="tok-cmd">tf</span> download a7f9k2</Sh>{'\n'}
              <span className="tok-out">  ↓ model.pt  847.2 MB</span>{'\n'}
              <span className="tok-out">  sha256    9f3a...c10e</span>{'\n\n'}
              <span className="tok-out">  downloading  847.2 MB  ▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰  100%</span>{'\n\n'}
              <span className="tok-ok">  ✓ verified  sha256:9f3a8c1d...</span>{'\n'}
              <span className="tok-out">  saved to  model.pt</span>
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

            {/* ── 06 · integrations ─────────────────────────────────────────── */}

            <H2 id="github-actions" eyebrow="06 · integrations">GitHub Actions</H2>
            <P>
              The official <Mono>colapsis/transfa-action@v1</Mono> action wraps the CLI so you can upload build
              artifacts, test reports, and model checkpoints directly from a workflow step — no extra tooling required.
              It streams progress, handles retries on transient errors, and surfaces the download link as a step output
              and job summary annotation.
            </P>

            <H3>Workflow example</H3>
            <CodeWindow title=".github/workflows/ci.yml" lang="yaml">
              {'jobs:\n'}
              {'  build:\n'}
              {'    runs-on: ubuntu-latest\n'}
              {'    steps:\n'}
              {'      - uses: actions/checkout@v4\n\n'}
              {'      - name: Build\n'}
              {'        run: make dist\n\n'}
              {'      - name: Upload test artifacts\n'}
              {'        uses: colapsis/transfa-action@v1\n'}
              {'        id: upload\n'}
              {'        with:\n'}
              {'          file: ./dist/report.pdf\n'}
              {'          api-key: $\{{ secrets.TRANSFA_API_KEY }}\n'}
              {'          expires: 7d\n\n'}
              {'      - name: Post link to PR\n'}
              {'        run: echo "Report → $\{{ steps.upload.outputs.agent-link }}" >> $GITHUB_STEP_SUMMARY\n'}
            </CodeWindow>

            <H3>Inputs</H3>
            <FlagTable
              title="colapsis/transfa-action@v1 — inputs"
              rows={[
                ['file', 'Path to the file to upload (glob not yet supported).', '—'],
                ['api-key', 'Your transfa API key. Store it as an Actions secret.', '—'],
                ['expires', 'TTL before the file is purged. Accepts 1h–30d.', '7d'],
                ['name', 'Override the display filename shown to recipients.', 'file basename'],
                ['max-downloads', 'Revoke the link after this many downloads.', '∞'],
                ['password', 'Gate the download link with a password.', '—'],
                ['base-url', 'Point to a self-hosted instance instead of transfa.sh.', 'https://transfa.sh'],
              ]}
            />

            <H3>Outputs</H3>
            <FlagTable
              title="colapsis/transfa-action@v1 — outputs"
              rows={[
                ['id', 'Short upload ID (e.g. a7f9k2).', '—'],
                ['agent-link', 'Direct download URL for agents and automation.', '—'],
                ['human-link', 'Human-readable viewer page (transfa.sh/f/:id).', '—'],
                ['sha256', 'Hex SHA-256 of the uploaded file.', '—'],
                ['expires-at', 'ISO 8601 expiry timestamp.', '—'],
              ]}
            />

            <P style={{ marginTop: 20 }}>
              <strong>Self-hosted tip:</strong> set <Mono>base-url</Mono> to your instance origin (e.g.{' '}
              <Mono>https://files.corp.example.com</Mono>) and the action will route all traffic there instead of
              transfa.sh. The action validates the TLS certificate, so make sure it is valid.
            </P>

            <H2 id="presigned-upload" eyebrow="06 · integrations">Presigned uploads</H2>
            <P>
              A presigned upload token lets you hand an untrusted client or agent a one-time upload URL without
              exposing your API key. The server mints a short-lived HMAC-signed token that encodes the TTL, download
              cap, and intended filename. The token is self-contained — no server state is created at mint time.
            </P>
            <P>
              Typical pattern: your backend mints the token, passes it to the client (browser, CI runner, LLM agent),
              and the client POSTs the file directly to transfa. Your API key is never visible to the client.
            </P>

            <H3>Step 1 — mint a token</H3>
            <CodeWindow title="mint token" copy='curl -X POST https://transfa.sh/api/upload/presigned -H "Authorization: Bearer tf_live_•••" -H "Content-Type: application/json" -d "{\"ttl\":\"24h\",\"max_downloads\":1,\"filename\":\"report.pdf\",\"expires_in\":600}"' lang="bash">
              <Sh><span className="tok-cmd">curl</span> <span className="tok-flag">-X</span> POST https://transfa.sh/api/upload/presigned \</Sh>{'\n'}
              {'  '}<span className="tok-flag">-H</span> <span className="tok-str">"Authorization: Bearer tf_live_•••"</span> \{'\n'}
              {'  '}<span className="tok-flag">-H</span> <span className="tok-str">"Content-Type: application/json"</span> \{'\n'}
              {'  '}<span className="tok-flag">-d</span> <span className="tok-str">{'\'{"ttl":"24h","max_downloads":1,"filename":"report.pdf","expires_in":600}\''}</span>
            </CodeWindow>
            <CodeWindow title="response · 200" lang="json">
              {'{\n'}
              {'  "token": '}<span className="tok-str">"eyJ0dGwi…"</span>,{'\n'}
              {'  "upload_url": '}<span className="tok-str">"https://transfa.sh/api/upload/presigned/eyJ0dGwi…"</span>,{'\n'}
              {'  "expires_in": '}<span className="tok-num">600</span>,{'\n'}
              {'  "expires_at": '}<span className="tok-str">"2026-05-14T10:24:00Z"</span>{'\n'}
              {'}'}
            </CodeWindow>

            <H3>Step 2 — upload with the token</H3>
            <P>Pass the <Mono>upload_url</Mono> to the client. The client POSTs the file as multipart with no Authorization header — the token in the URL IS the credential.</P>
            <CodeWindow title="upload via presigned URL" lang="bash">
              <Sh><span className="tok-cmd">curl</span> <span className="tok-flag">-X</span> POST <span className="tok-str">"$UPLOAD_URL"</span> \</Sh>{'\n'}
              {'  '}<span className="tok-flag">-F</span> <span className="tok-str">"file=@report.pdf"</span>
            </CodeWindow>
            <P>
              If the token has expired or the HMAC is invalid the server returns <Mono>401 {'{'}"error":"invalid or expired presigned token"{'}'}</Mono>.
              All other plan limits (file size, daily upload cap) still apply.
            </P>

            <H2 id="pipeline-manifest" eyebrow="06 · integrations">Pipeline manifests</H2>
            <P>
              Tagging uploads with run metadata lets you retrieve every artifact from a pipeline run in a single
              request. This is useful for CI pipelines, model training jobs, and any workflow where multiple steps
              produce files that a downstream consumer needs to collect.
            </P>

            <H3>Tagging an upload</H3>
            <P>Add manifest fields to any upload via form fields or <Mono>X-Transfa-*</Mono> headers:</P>
            <FlagTable
              title="manifest fields"
              rows={[
                ['--run-id=<str>', 'Unique identifier for the pipeline run (e.g. GitHub run ID).', '—'],
                ['--step=<str>', 'The step or job name that produced this artifact.', '—'],
                ['--consumer=<str>', 'Downstream service expected to consume this artifact.', '—'],
                ['--intent=<str>', 'Semantic label, e.g. test-report, model-weights, benchmark.', '—'],
              ]}
            />
            <CodeWindow title="upload with manifest" lang="bash">
              <Sh><span className="tok-cmd">tf</span> upload dist/weights.ckpt \</Sh>{'\n'}
              {'  '}<span className="tok-flag">--run-id</span>=<span className="tok-str">$GITHUB_RUN_ID</span> \{'\n'}
              {'  '}<span className="tok-flag">--step</span>=<span className="tok-str">train</span> \{'\n'}
              {'  '}<span className="tok-flag">--consumer</span>=<span className="tok-str">eval-agent</span> \{'\n'}
              {'  '}<span className="tok-flag">--intent</span>=<span className="tok-str">model-weights</span>
            </CodeWindow>

            <H3>Fetching all artifacts for a run</H3>
            <CodeWindow title="run manifest" lang="bash">
              <Sh><span className="tok-cmd">tf</span> run <span className="tok-str">$GITHUB_RUN_ID</span></Sh>{'\n\n'}
              <span className="tok-c"># or via the REST API:</span>{'\n'}
              <Sh><span className="tok-cmd">curl</span> https://transfa.sh/api/run/<span className="tok-str">$GITHUB_RUN_ID</span></Sh>
            </CodeWindow>
            <CodeWindow title="GET /api/run/:run_id — response · 200" lang="json">
              {'{\n'}
              {'  "run_id": '}<span className="tok-str">"12345678"</span>,{'\n'}
              {'  "total": '}<span className="tok-num">3</span>,{'\n'}
              {'  "created_at": '}<span className="tok-str">"2026-05-14T08:00:00Z"</span>,{'\n'}
              {'  "artifacts": [\n'}
              {'    {\n'}
              {'      "id": '}<span className="tok-str">"a7f9k2"</span>,{'\n'}
              {'      "url": '}<span className="tok-str">"https://transfa.sh/f/a7f9k2"</span>,{'\n'}
              {'      "filename": '}<span className="tok-str">"weights.ckpt"</span>,{'\n'}
              {'      "step": '}<span className="tok-str">"train"</span>,{'\n'}
              {'      "consumer": '}<span className="tok-str">"eval-agent"</span>,{'\n'}
              {'      "intent": '}<span className="tok-str">"model-weights"</span>,{'\n'}
              {'      "sha256": '}<span className="tok-str">"9f3a…c10e"</span>,{'\n'}
              {'      "bytes": '}<span className="tok-num">204800000</span>,{'\n'}
              {'      "expires_at": '}<span className="tok-str">"2026-05-21T08:00:00Z"</span>,{'\n'}
              {'      "active": '}<span className="tok-num">true</span>{'\n'}
              {'    }\n'}
              {'  ]\n'}
              {'}'}
            </CodeWindow>

            <H2 id="webhooks" eyebrow="06 · integrations">Webhooks</H2>
            <P>
              Configure a webhook URL on your workspace to receive real-time events when something happens to your
              uploads. Currently the <Mono>upload.downloaded</Mono> event fires on every successful file download.
            </P>

            <H3>Event payload</H3>
            <CodeWindow title="upload.downloaded — POST to your endpoint" lang="json">
              {'{\n'}
              {'  "event": '}<span className="tok-str">"upload.downloaded"</span>,{'\n'}
              {'  "timestamp": '}<span className="tok-str">"2026-05-14T09:14:00Z"</span>,{'\n'}
              {'  "data": {\n'}
              {'    "upload_id": '}<span className="tok-str">"a7f9k2"</span>,{'\n'}
              {'    "filename": '}<span className="tok-str">"report.pdf"</span>,{'\n'}
              {'    "download_count": '}<span className="tok-num">5</span>,{'\n'}
              {'    "max_downloads": '}<span className="tok-num">10</span>,{'\n'}
              {'    "downloader_ip": '}<span className="tok-str">"203.0.113.42"</span>,{'\n'}
              {'    "user_agent": '}<span className="tok-str">"curl/8.4.0"</span>{'\n'}
              {'  }\n'}
              {'}'}
            </CodeWindow>

            <H3>Signature verification</H3>
            <P>
              Every webhook request includes an <Mono>X-Transfa-Signature</Mono> header containing an HMAC-SHA256
              hex digest of the raw request body, keyed with your webhook secret. Always verify this before
              processing the payload.
            </P>
            <CodeWindow title="verify-webhook.js" lang="js">
              {'const crypto = require(\'crypto\');\n\n'}
              {'function verifyWebhook(rawBody, signature, secret) {\n'}
              {'  const expected = crypto\n'}
              {'    .createHmac(\'sha256\', secret)\n'}
              {'    .update(rawBody)\n'}
              {'    .digest(\'hex\');\n'}
              {'  // Use timingSafeEqual to prevent timing attacks\n'}
              {'  return crypto.timingSafeEqual(\n'}
              {'    Buffer.from(expected),\n'}
              {'    Buffer.from(signature)\n'}
              {'  );\n'}
              {'}\n\n'}
              {'// Express example\n'}
              {'app.post(\'/webhook\', express.raw({ type: \'*/*\' }), (req, res) => {\n'}
              {'  const sig = req.headers[\'x-transfa-signature\'];\n'}
              {'  if (!verifyWebhook(req.body, sig, process.env.TRANSFA_WEBHOOK_SECRET)) {\n'}
              {'    return res.status(401).send(\'invalid signature\');\n'}
              {'  }\n'}
              {'  const event = JSON.parse(req.body);\n'}
              {'  console.log(\'received:\', event.event, event.data.upload_id);\n'}
              {'  res.sendStatus(200);\n'}
              {'});\n'}
            </CodeWindow>

            {/* ── 07 · security ─────────────────────────────────────────────── */}

            <H2 id="security-model" eyebrow="07 · security">Security model</H2>
            <P>Every transfa link provides three things:</P>
            <ul style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--text-2)', paddingLeft: 24, margin: '0 0 14px', maxWidth: '70ch' }}>
              <li style={{ marginBottom: 8 }}><strong>Content integrity</strong> — SHA-256 is computed on every upload, returned in the JSON response body, and exposed as the <Mono>X-Transfa-SHA256</Mono> response header on every download.</li>
              <li style={{ marginBottom: 8 }}><strong>Optional access control</strong> — password-gating via <Mono>--password</Mono> requires the recipient to supply the correct passphrase before the download proceeds.</li>
              <li style={{ marginBottom: 8 }}><strong>Hard TTL</strong> — files are purged from object storage at expiry; the URL returns <Mono>410 Gone</Mono> permanently afterwards.</li>
            </ul>
            <P>What a transfa link does <em>not</em> provide:</P>
            <ul style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--text-2)', paddingLeft: 24, margin: '0 0 14px', maxWidth: '70ch' }}>
              <li style={{ marginBottom: 8 }}><strong>No identity verification on the downloader</strong> — anyone who holds the URL can download the file. The link is the credential.</li>
              <li style={{ marginBottom: 8 }}><strong>No end-to-end encryption by default</strong> — files are encrypted at rest in object storage, but the server can read plaintext. Use <Mono>tf --encrypt</Mono> for client-side encryption.</li>
            </ul>
            <P>
              This model is well-suited for internal pipelines, ephemeral build artifacts, and dev-to-staging handoffs where the risk profile is low and convenience matters. It is not a substitute for identity-based ACLs on regulated or sensitive data — for those cases, layer your own access controls on top or use the password gate combined with out-of-band key distribution.
            </P>

            <H2 id="security-verification" eyebrow="07 · security">Integrity verification</H2>
            <P>
              <Mono>tf download --verify</Mono> (on by default) streams the file, computes SHA-256 incrementally, and compares the result against the hash recorded by the server at upload time. If they don't match, the command exits with code <Mono>2</Mono> and prints a clear error — the saved file is also deleted to prevent silent use of a corrupt artifact.
            </P>
            <CodeWindow title="~ — zsh" lang="bash">
              <Sh><span className="tok-cmd">tf</span> download a7f9k2 <span className="tok-flag">--verify</span></Sh>{'\n'}
              <span className="tok-ok">  ✓ verified  sha256:9f3a8c1d…</span>{'\n\n'}
              <span className="tok-c"># skip verification (not recommended in automated pipelines)</span>{'\n'}
              <Sh><span className="tok-cmd">tf</span> download a7f9k2 <span className="tok-flag">--no-verify</span></Sh>
            </CodeWindow>
            <P style={{ marginTop: 24 }}>
              When using the API directly, check the <Mono>X-Transfa-SHA256</Mono> response header and compare it against your own computed hash:
            </P>
            <CodeWindow title="curl + sha256sum" lang="bash">
              <span className="tok-c"># download and capture the server hash in one step</span>{'\n'}
              <Sh><span className="tok-cmd">curl</span> <span className="tok-flag">-sD</span> headers.txt https://transfa.sh/api/download/a7f9k2 <span className="tok-flag">-o</span> model.pt</Sh>{'\n\n'}
              <span className="tok-c"># extract the server-recorded hash</span>{'\n'}
              <Sh>SERVER_HASH=$(<span className="tok-cmd">grep</span> <span className="tok-flag">-i</span> <span className="tok-str">'x-transfa-sha256'</span> headers.txt | <span className="tok-cmd">awk</span> <span className="tok-str">{'"{print $2}"'}</span> | <span className="tok-cmd">tr</span> <span className="tok-flag">-d</span> <span className="tok-str">'\\r'</span>)</Sh>{'\n\n'}
              <span className="tok-c"># compute local hash and compare</span>{'\n'}
              <Sh>LOCAL_HASH=$(<span className="tok-cmd">sha256sum</span> model.pt | <span className="tok-cmd">awk</span> <span className="tok-str">{'"{print $1}"'}</span>)</Sh>{'\n'}
              <Sh>[[ <span className="tok-str">"$SERVER_HASH"</span> == <span className="tok-str">"$LOCAL_HASH"</span> ]] && <span className="tok-cmd">echo</span> <span className="tok-str">"✓ verified"</span> || (<span className="tok-cmd">echo</span> <span className="tok-str">"✗ hash mismatch"</span>; <span className="tok-cmd">exit</span> 2)</Sh>
            </CodeWindow>
          </article>
        </main>
      </div>
      <Footer />
    </div>
  );
}
