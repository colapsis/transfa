# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in transfa, please report it **privately** so we can fix it before public disclosure.

**Do not open a public GitHub issue for security vulnerabilities.**

### How to report

Email: **transfa.sh@gmail.com**

Please include:
- A description of the vulnerability and its potential impact
- Steps to reproduce or proof-of-concept (if safe to provide)
- Any suggested mitigations you have in mind

We aim to acknowledge reports within **48 hours** and provide a fix or mitigation timeline within **7 days** for critical issues.

### Scope

We're interested in:
- Authentication or authorization bypasses
- File access without a valid link
- Data leakage between users
- Remote code execution
- Denial-of-service via API abuse (provide request samples, not live attacks)

Out of scope:
- Rate limit bypasses that don't expose user data
- Issues requiring physical access to the server
- Attacks against third-party services we integrate with (Stripe, etc.)
- Social engineering

### Responsible disclosure

We ask that you:
- Give us reasonable time to fix the issue before public disclosure
- Avoid accessing or modifying data that isn't yours
- Not run automated scanners against the production service without prior consent

We will credit researchers who responsibly report valid vulnerabilities (unless you prefer anonymity).

## Supported versions

Only the latest production deployment at **transfa.sh** is actively maintained.
