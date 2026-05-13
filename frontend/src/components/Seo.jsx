import { Helmet } from 'react-helmet-async';

const SITE = 'https://transfa.sh';
const DEFAULT_TITLE = 'transfa.sh — File Sharing for AI Agents & Developers';
const DEFAULT_DESC = 'Dead-simple file sharing for AI agents and developers. One command, signed URL, 7-day expiry. MCP server included. Free tier forever.';
const OG_IMAGE = `${SITE}/og-image.png`;

export default function Seo({ title, description, canonical, noindex = false, ogType = 'website', jsonLd }) {
  const metaTitle = title ? `${title} — transfa.sh` : DEFAULT_TITLE;
  const metaDesc = description || DEFAULT_DESC;
  const canonicalUrl = canonical ? `${SITE}${canonical}` : null;

  return (
    <Helmet>
      <title>{metaTitle}</title>
      <meta name="description" content={metaDesc} />
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      {noindex ? (
        <meta name="robots" content="noindex,nofollow" />
      ) : (
        <meta name="robots" content="index,follow" />
      )}

      {/* Open Graph */}
      <meta property="og:title" content={metaTitle} />
      <meta property="og:description" content={metaDesc} />
      <meta property="og:type" content={ogType} />
      <meta property="og:image" content={OG_IMAGE} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content="transfa.sh — file sharing for AI agents" />
      <meta property="og:site_name" content="transfa.sh" />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={metaTitle} />
      <meta name="twitter:description" content={metaDesc} />
      <meta name="twitter:image" content={OG_IMAGE} />
      <meta name="twitter:image:alt" content="transfa.sh — file sharing for AI agents" />

      {/* JSON-LD */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
}
