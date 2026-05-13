import { useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer.jsx';
import { ArrowIcon } from '../components/Icons.jsx';
import Seo from '../components/Seo.jsx';

const PRICING_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'transfa.sh',
  description: 'File sharing for AI agents and developers. Free, Pro, and Team plans.',
  url: 'https://transfa.sh/pricing',
  brand: { '@type': 'Brand', name: 'transfa.sh' },
  offers: [
    { '@type': 'Offer', name: 'Free Plan', price: '0', priceCurrency: 'USD', availability: 'https://schema.org/InStock', url: 'https://transfa.sh/dashboard' },
    { '@type': 'Offer', name: 'Pro Plan — Monthly', price: '12', priceCurrency: 'USD', availability: 'https://schema.org/InStock', url: 'https://transfa.sh/dashboard' },
    { '@type': 'Offer', name: 'Pro Plan — Annual', price: '10', priceCurrency: 'USD', availability: 'https://schema.org/InStock', url: 'https://transfa.sh/dashboard', description: 'Billed annually ($120/year)' },
    { '@type': 'Offer', name: 'Team Plan — Monthly', price: '48', priceCurrency: 'USD', availability: 'https://schema.org/InStock', url: 'https://transfa.sh/dashboard' },
    { '@type': 'Offer', name: 'Team Plan — Annual', price: '40', priceCurrency: 'USD', availability: 'https://schema.org/InStock', url: 'https://transfa.sh/dashboard', description: 'Billed annually ($480/year)' },
  ],
};

export default function Pricing() {
  const [annual, setAnnual] = useState(false);
  const price = (m, y) => annual ? y : m;

  return (
    <div className="page">
      <Seo
        title="Pricing"
        description="Flat plans for individuals and teams. Free forever, Pro at $12/mo, Team at $48/mo. No seats, no egress surprises. 14-day trial on paid plans."
        canonical="/pricing"
        ogType="website"
        jsonLd={PRICING_JSON_LD}
      />
      <section style={{ padding: '96px 32px 64px', borderBottom: '1px solid var(--border)' }} className="grid-bg">
        <div className="container" style={{ textAlign: 'center' }}>
          <div className="eyebrow" style={{ justifyContent: 'center' }}>Pricing</div>
          <h1 className="h1" style={{ marginTop: 20, fontSize: 'clamp(48px, 6vw, 80px)' }}>
            Priced for shipping,<br /><span style={{ color: 'var(--accent)' }}>not seats.</span>
          </h1>
          <p className="lead" style={{ margin: '28px auto 0', textAlign: 'center' }}>
            Flat plans. Predictable bills. No "talk to sales" tier until you actually need a DPA.
          </p>
          <div style={{ display: 'inline-flex', marginTop: 32, padding: 4, background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 100 }}>
            <button
              onClick={() => setAnnual(false)}
              className="btn btn-sm"
              style={{ background: !annual ? 'var(--accent)' : 'transparent', color: !annual ? '#000' : 'var(--text-2)', borderColor: 'transparent', borderRadius: 100, padding: '0 16px', height: 32 }}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className="btn btn-sm"
              style={{ background: annual ? 'var(--accent)' : 'transparent', color: annual ? '#000' : 'var(--text-2)', borderColor: 'transparent', borderRadius: 100, padding: '0 16px', height: 32 }}
            >
              Annual <span style={{ marginLeft: 6, color: annual ? '#000' : 'var(--accent)', fontSize: 10 }}>· 2 months free</span>
            </button>
          </div>
        </div>
      </section>

      <section style={{ padding: '64px 32px', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div className="price-grid">
            <PriceCard
              name="free"
              price="$0"
              sub="forever"
              desc="For tinkering, prototypes, and one-off agent scripts."
              features={['2 GB max upload', 'Up to 7-day expiry', '10 uploads / day · 30 req/min', 'Public links only', 'Community Discord', 'Single user, single device']}
              cta="Start free"
              ctaTo="/dashboard"
            />
            <PriceCard
              name="pro"
              price={'$' + price(12, 10)}
              sub="/ month per user"
              desc="For developers and agents shipping in production."
              featured
              features={['50 GB max upload', 'Up to 30-day expiry', 'Unlimited uploads · 600 req/min', 'Password-protected links', 'Custom expiry & one-time links', 'MCP server + Python/Node SDKs', 'Audit log (last 30 days)', 'Priority email support']}
              cta="Start 14-day trial"
              ctaTo="/dashboard"
            />
            <PriceCard
              name="team"
              price={'$' + price(48, 40)}
              sub="/ month per user"
              desc="For agent fleets and engineering orgs."
              features={['100 GB max upload', 'Up to 180-day expiry', '3,000 req/min · 25 concurrent', 'SAML SSO + SCIM', 'Audit log streaming (SIEM)', 'DPA + BAA available', 'Self-host (Helm + Docker)', 'Slack-channel support']}
              cta="Start 14-day trial"
              ctaTo="/dashboard"
            />
          </div>

          <div style={{ marginTop: 24, padding: 20, border: '1px dashed var(--border-strong)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontFamily: 'var(--mono)', color: 'var(--accent)', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase' }}>enterprise</div>
              <div style={{ fontSize: 16, marginTop: 4 }}>Custom volume, custom region, FedRAMP-track. <span className="muted">For more than 50 users or compliance needs.</span></div>
            </div>
            <a className="btn btn-secondary" href="#">Talk to founders <ArrowIcon /></a>
          </div>
        </div>
      </section>

      <section style={{ padding: '96px 32px', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div className="eyebrow">Compare</div>
              <h2 className="h2" style={{ marginTop: 16 }}>Feature by feature.</h2>
            </div>
            <div className="mono muted-2" style={{ fontSize: 12 }}>* limits are per workspace</div>
          </div>

          <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', background: 'var(--bg-1)' }}>
            <table className="compare-table">
              <thead>
                <tr>
                  <th style={{ width: '32%' }}>Plan</th>
                  <th>Free</th>
                  <th style={{ color: 'var(--accent)' }}>Pro</th>
                  <th>Team</th>
                </tr>
              </thead>
              <tbody>
                <RowGroup label="Limits" />
                <Row k="Max upload size" v={['2 GB', '50 GB', '100 GB']} />
                <Row k="Max TTL" v={['7 days', '30 days', '180 days']} />
                <Row k="Uploads / month" v={['300', 'Unlimited', 'Unlimited']} />
                <Row k="Bandwidth (egress) / mo" v={['20 GB', '2 TB', '10 TB']} />
                <Row k="API requests / min" v={['30', '600', '3,000']} />
                <Row k="Concurrent uploads" v={['1', '5', '25']} />

                <RowGroup label="Links" />
                <Row k="Public signed links" v={[true, true, true]} />
                <Row k="Password protection" v={[false, true, true]} />
                <Row k="One-time links" v={[false, true, true]} />
                <Row k="Custom domain (xfer.you.dev)" v={[false, false, true]} />
                <Row k="Branded download page" v={[false, false, true]} />

                <RowGroup label="For agents" />
                <Row k="MCP server" v={[false, true, true]} />
                <Row k="Python · Node · Go SDK" v={[true, true, true]} />
                <Row k="JSON output mode" v={[true, true, true]} />
                <Row k="Idempotency keys" v={[true, true, true]} />
                <Row k="Webhooks" v={[false, true, true]} />

                <RowGroup label="Security & compliance" />
                <Row k="Client-side age encryption" v={[true, true, true]} />
                <Row k="ClamAV virus scanning" v={[true, true, true]} />
                <Row k="Audit log retention" v={['—', '30 days', '1 year']} />
                <Row k="SIEM stream (Datadog, Splunk)" v={[false, false, true]} />
                <Row k="SAML SSO + SCIM" v={[false, false, true]} />
                <Row k="DPA · BAA · SOC 2 report" v={[false, false, true]} />
                <Row k="Self-host (Helm + Docker)" v={[false, false, true]} />

                <RowGroup label="Support" />
                <Row k="Community Discord" v={[true, true, true]} />
                <Row k="Email support · 24h" v={[false, true, true]} />
                <Row k="Shared Slack channel" v={[false, false, true]} />
                <Row k="SLA · 99.9% uptime" v={[false, false, true]} />
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section style={{ padding: '96px 32px', borderBottom: '1px solid var(--border)' }}>
        <div className="container-narrow">
          <div className="eyebrow">Common questions</div>
          <h2 className="h2" style={{ marginTop: 16, marginBottom: 32 }}>About billing.</h2>
          {[
            ['Can I switch plans mid-cycle?', 'Yes. Upgrades take effect immediately and we prorate the difference. Downgrades take effect at your next renewal so you keep the higher limits you already paid for.'],
            ['What counts as an upload?', 'Any successful PUT to /v1/uploads. Resuming a chunked upload that already started counts once. Failed uploads (4xx/5xx) don\'t count. Re-running tf on an unchanged file returns the existing URL and doesn\'t count.'],
            ['Do you bill for egress?', 'No. Bandwidth is included in your plan. If you blow past the included GB, we throttle to 1 MB/s and email you — we don\'t surprise you with a four-figure invoice.'],
            ['Can I pay annually for a discount?', 'Yes. Annual billing is 17% off. Toggle the switch above. We invoice yearly and accept ACH on Team.'],
            ['What happens if I cancel?', 'Your active links keep working until their natural expiry. New uploads are disabled. Your dashboard stays read-only for 90 days, then we purge it.'],
          ].map(([q, a], i) => (
            <details key={i} style={{ borderTop: '1px solid var(--border)', padding: '20px 0' }}>
              <summary style={{ cursor: 'pointer', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 16, fontWeight: 500, letterSpacing: '-0.005em' }}>
                <span style={{ display: 'flex', gap: 14, alignItems: 'baseline' }}>
                  <span className="mono muted-2" style={{ fontSize: 12 }}>0{i + 1}</span>
                  {q}
                </span>
                <span className="mono" style={{ color: 'var(--accent)' }}>+</span>
              </summary>
              <p className="muted" style={{ fontSize: 14, lineHeight: 1.6, marginTop: 12, paddingLeft: 32, maxWidth: '68ch' }}>{a}</p>
            </details>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}

function PriceCard({ name, price, sub, desc, featured, features, cta, ctaTo, onUpgrade }) {
  const [loading, setLoading] = useState(false);

  async function handleClick(e) {
    if (name === 'free' || !onUpgrade) return;
    e.preventDefault();
    setLoading(true);
    await onUpgrade(name);
    setLoading(false);
  }

  return (
    <div className={'price-card' + (featured ? ' featured' : '')} style={{ position: 'relative' }}>
      {featured && <div style={{ position: 'absolute', top: 16, right: 16 }}><span className="pill pill-accent">most picked</span></div>}
      <div className="price-name">{name}</div>
      <div style={{ marginTop: 14 }}>
        <span className="price-amt">{price}</span> <span className="price-amt unit">{sub}</span>
      </div>
      <div className="muted" style={{ fontSize: 14, marginTop: 10, lineHeight: 1.5 }}>{desc}</div>
      <ul className="price-list">
        {features.map(f => <li key={f}><span className="check">▸</span>{f}</li>)}
      </ul>
      <div style={{ marginTop: 'auto' }}>
        <Link
          className={'btn ' + (featured ? 'btn-primary' : 'btn-secondary')}
          style={{ width: '100%', justifyContent: 'center', opacity: loading ? 0.7 : 1 }}
          to={ctaTo}
          onClick={handleClick}
        >
          {loading ? 'loading…' : cta}
        </Link>
      </div>
    </div>
  );
}

function RowGroup({ label }) {
  return <tr><td className="row-header" colSpan={4}>{label}</td></tr>;
}

function Row({ k, v }) {
  return (
    <tr>
      <th>{k}</th>
      {v.map((cell, i) => (
        <td key={i} className="center mono" style={{ color: i === 1 ? 'var(--accent)' : 'var(--text-2)' }}>
          {cell === true ? <span className="check">✓</span> : cell === false ? <span className="dash">—</span> : cell}
        </td>
      ))}
    </tr>
  );
}
