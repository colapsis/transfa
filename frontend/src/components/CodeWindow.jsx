import { useState } from 'react';

export function Sh({ children }) {
  return (
    <span>
      <span className="tok-prompt">$ </span>
      {children}
    </span>
  );
}

export default function CodeWindow({ title = '~/projects', children, copy, lang = 'shell' }) {
  const [copied, setCopied] = useState(false);

  function doCopy() {
    if (!copy) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(copy).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }).catch(() => execCopy());
    } else {
      execCopy();
    }
  }

  function execCopy() {
    const el = document.createElement('textarea');
    el.value = copy;
    el.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0';
    document.body.appendChild(el);
    el.focus();
    el.select();
    try {
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
    document.body.removeChild(el);
  }

  return (
    <div className="code-window">
      <div className="code-bar">
        <div className="code-bar-left">
          <div className="code-dots">
            <span className="code-dot" />
            <span className="code-dot" />
            <span className="code-dot" />
          </div>
          <span style={{ marginLeft: 6 }}>{title}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-4)' }}>{lang}</span>
          {copy && (
            <button
              className={'copy-btn' + (copied ? ' copied' : '')}
              onClick={doCopy}
            >
              {copied ? 'copied' : 'copy'}
            </button>
          )}
        </div>
      </div>
      <div className="code-body">{children}</div>
    </div>
  );
}
