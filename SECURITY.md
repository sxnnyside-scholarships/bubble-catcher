# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| 1.x (current) | Yes |
| < 1.0 | No |

Only the latest release on the main branch receives security updates. If you are running an older version, upgrade before reporting.

---

## Reporting a Vulnerability

If you discover a security vulnerability in Bubble Catcher, please report it responsibly. Do not open a public GitHub issue for security-sensitive findings.

### How to Report

Send an email to:

**security.sxnnyside@sxnnysideproject.com**

Include the following information:

1. A description of the vulnerability and its potential impact.
2. Steps to reproduce the issue, including any relevant configuration.
3. The version of Bubble Catcher affected (or the commit hash).
4. Any proof-of-concept code or screenshots, if applicable.

### What to Expect

- **Acknowledgment:** We will acknowledge receipt of your report within 48 hours.
- **Assessment:** We will investigate and assess the severity within 7 business days.
- **Resolution:** Critical vulnerabilities will be patched as soon as possible. We aim to release fixes within 14 days of confirmation.
- **Disclosure:** We will coordinate with you on public disclosure timing. We follow a 90-day disclosure deadline from the date of the initial report.

### What Qualifies

- Authentication or authorization bypass.
- SQL injection or command injection in the sandbox layer.
- Container escape or sandbox isolation failures.
- Exposure of Supabase service-role keys or other secrets.
- Cross-site scripting (XSS) in the frontend.
- Denial of service through resource exhaustion in the sandbox.

### What Does Not Qualify

- Issues in third-party dependencies with no demonstrated impact on Bubble Catcher.
- Theoretical attacks without a proof of concept.
- Social engineering or phishing.
- Vulnerabilities requiring physical access to the server.
- Rate limiting or brute force on the Supabase Auth layer (managed by Supabase).

---

## Responsible Disclosure

We ask that you:

- Give us reasonable time to address the vulnerability before public disclosure.
- Do not access, modify, or delete data belonging to other users during testing.
- Do not perform testing that degrades the service for other users.
- Act in good faith to avoid privacy violations and disruption.

We will not pursue legal action against researchers who follow this policy.

---

## Security Contact

**security.sxnnyside@sxnnysideproject.com**
