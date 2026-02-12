# Bubble Catcher — Roadmap

![Version](https://img.shields.io/badge/version-1.0.0-blueviolet)

## Development Passes

### P0 — Stability & Foundation ✅

- Project scaffolding (Bun + Elysia + SvelteKit + Supabase)
- Docker sandbox architecture with ephemeral containers
- Authentication flow (Supabase Auth + JWT middleware)
- Profile auto-provisioning with race-condition handling
- Core analysis engine (AST-based static analysis)
- 11 built-in analysis rules
- 5 SQL dialect support (MySQL, PostgreSQL, SQLite, MariaDB, MSSQL)
- Monaco Editor integration
- Error handling middleware
- Seed data for all dialects

### P1 — Features ✅

- Saved queries (save, search, reinsert)
- Three-theme system (Colorful / Light / Dark)
- Internationalization (English + Spanish)
- User preferences persistence (theme + locale)
- Pricing page with plan tiers
- Dashboard with project stats

### P1.5 — Polish ✅

- Monaco Editor reactivity fix (Svelte 5 `$state` compatibility)
- Rule i18n (all 11 rules translated to Spanish)
- Dialect audit across analysis rules
- Vibrant theme refinement
- Premium rule gating (plan-based access control)
- Suggested rewrite UX upgrade

### Debug Pass ✅

- Sandbox Docker executor stability fix
- Monaco `$state` reactivity fix
- Suggested rewrite insertion UX

### P2 — Security & Hardening ✅

- Structured JSON logging with query hashing (SHA-256)
- Heuristic SQL query guard (regex-based pre-flight validation)
- IP-based rate limiting middleware
- User-level rate limiting with retry-after headers
- Request context propagation (requestId + clientIp)
- Execution audit trail (bubble_execution_audit table + RLS)
- CORS origin validation
- HTTP status code consistency (400/401/403/404/409/422/429/500)
- Plan limits enforcement (Free: 5s/20 exec/min, Premium: 15s/100 exec/min)
- Docker pre-flight availability checks

### P3 — Telemetry & Observability ✅

- Telemetry table (bubble_telemetry) with RLS
- Backend telemetry recording on analysis + execution events
- Telemetry summary endpoint (per-user aggregation)
- Dashboard integration (stat cards, dialect usage chart, success rate)
- Structured response logging

### P4 — Branding & Icon System ✅

- Theme-aware favicon variants (dark, light, transparent)
- ThemeIcon reactive component
- PWA meta tags (apple-touch-icon, mask-icon, theme-color)
- Sidebar logo integration

### P5 — Final Stabilization (v1.0.0) ✅

- Settings page improvements (locale neutrality, support buttons, legal links)
- Patreon integration link
- Bug report mailto template
- Premium-only support request with conditional rendering
- Privacy Policy and Terms & Conditions links
- README v1.0.0 finalization with version badges
- Roadmap documentation

---

## Future (Post v1.0.0)

- Oracle dialect support (enterprise plan)
- Custom seed data upload per project
- Query plan visualization (EXPLAIN integration)
- Collaborative project sharing
- Additional analysis rules (window function misuse, index suggestions)
- AI-powered query rewrite suggestions
- Team management and SSO (enterprise)
- Dedicated sandbox containers (enterprise)
