export default function Wordmark({ height = 40 }) {
  const width = Math.round(height * (320 / 64));
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 320 64"
      width={width}
      height={height}
      aria-label="transfa.sh"
      role="img"
      style={{ display: 'block' }}
    >
      <rect x="16" y="26" width="12" height="12" fill="#e8ff47" />
      <text
        x="40"
        y="42"
        fontFamily="'Space Mono', ui-monospace, Menlo, monospace"
        fontWeight="700"
        fontSize="26"
        fill="#f5f5f5"
        letterSpacing="-0.5"
      >
        transfa<tspan fill="#6e6e6e">.</tspan><tspan fill="#e8ff47">sh</tspan>
      </text>
    </svg>
  );
}
