export default function Wordmark({ size = 16 }) {
  return (
    <span className="brand" style={{ fontSize: size }}>
      <span className="brand-mark" />
      <span className="brand-name">transfa</span>
      <span className="brand-dot">.</span>
      <span className="brand-tld">sh</span>
    </span>
  );
}
