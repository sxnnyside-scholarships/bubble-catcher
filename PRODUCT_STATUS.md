# Bubble Catcher — Product Roadmap

This document outlines the pending improvements and stabilization targets required before releasing **Stable v1.0.0**.

Current state: Stable v1.0.0 release with working analysis engine and Docker sandbox infrastructure.  
Goal: Production-ready educational SQL platform with robust execution, security, and UX polish.

---

# 🎯 Stable Target: v1.0.0

Focus: Reliability, correctness, execution integrity, and foundational product experience.

---

# 🔴 P0 — Critical (Must Be Completed Before v1.0.0)

## 1. SQL Execution Output Rendering

**Current State**
- Docker containers execute queries.
- SQL output is not properly captured or rendered in the UI.

**Required**
- Capture structured `stdout` and `stderr`.
- Parse tabular results safely.
- Display:
  - Columns
  - Rows
  - Execution time
  - Error messages (cleanly formatted)
- Clearly differentiate:
  - Successful execution
  - SQL syntax error
  - Timeout
  - Killed execution

**Why**
Execution is a core feature. Without visible results, the product feels incomplete.

---

## 2. Authentication Flow Hardening

**Current State**
- Login and registration work.
- Edge cases and timing issues exist.

**Required**
- Prevent API calls before session restoration.
- Improve invalid credential handling.
- Handle expired tokens gracefully.
- Ensure logout resets session state completely.
- Improve UI feedback consistency.

**Why**
Authentication instability directly affects user trust.

---

## 3. Plan Limits Enforcement

**Current State**
- Plan structure exists.
- Enforcement is incomplete.

**Required**
- Enforce project limits (Free plan).
- Execution rate limits per user.
- Query size limits.
- Maximum execution time enforcement.
- Prevent abuse patterns.

**Why**
Necessary for SaaS viability and abuse prevention.

---

# 🟠 P1 — High Impact Improvements

## 4. Saved Queries as Functional Feature

**Current State**
- Queries are stored.
- No meaningful reuse workflow.

**Required**
- Add suggestion chips in editor.
- Quick insert from saved queries.
- Filter by project.
- Display recent queries.
- Enable one-click reuse.

**Why**
Increases productivity and retention.

---

## 5. Theme Differentiation

**Current State**
- Light and Colorful themes lack clear distinction.

**Required**
- Colorful: vibrant, gradients, expressive UI.
- Light: minimal, low-contrast, no gradients.
- Dark: optimized for reduced eye strain.
- Ensure consistent design tokens across themes.

**Why**
Brand identity and visual polish.

---

## 6. Backend Internationalization Preparation

**Current State**
- Backend responses are English-only.

**Required**
- Use structured error codes.
- Let frontend map messages by locale.
- Avoid hardcoded human-readable strings in backend.

**Why**
Supports localization (en/es) properly.

---

# 🟡 P2 — Security & Hardening

## 7. Security Enhancements

**Required**
- Rate limiting (IP + user-based).
- Maximum query length restriction.
- Execution timeout enforcement.
- Strict dialect validation.
- Structured logging.
- Prevent infinite loop or heavy recursion queries.
- Improve CORS configuration.
- Audit execution activity.

**Why**
Prepares system for real-world exposure.

---

## 8. HTTP Status Code Consistency

Ensure proper differentiation:

- 400 — Bad request
- 401 — Unauthorized
- 403 — Plan limit restriction
- 422 — SQL execution error
- 500 — Infrastructure failure only

---

# 🟢 P3 — Observability & Metrics

## 9. Telemetry System

**Current State**
- No real metrics tracking.

**Required**
- Count queries analyzed.
- Count queries executed.
- Track execution time averages.
- Track dialect usage.
- User-level metrics.
- Internal admin dashboard (future).

**Why**
Essential for growth insights and performance tuning.

---

# 🔵 P4 — Branding & Polish

## 10. Replace Site Icon

**Current State**
- Placeholder or generic icon.

**Required**
- Official Bubble Catcher icon.
- Dark/light variants.
- Full favicon set.
- PWA-compatible assets.

**Why**
Professional identity and consistency.

---

# 🧠 Future Versions (Post 1.0.0)

Potential v1.1+ enhancements:

- Advanced rule coverage:
  - ORDER BY without LIMIT
  - LIKE leading wildcard detection
  - GROUP BY inconsistencies
  - Broad DELETE/UPDATE detection
  - Heuristic index recommendations
- Admin dashboard
- Team features (Enterprise)
- Query optimization scoring
- Gamification layer
- Educational mode explanations per rule
- Cost estimation simulation

---

# 📌 Current Development Snapshot

- Analysis engine operational (basic rule set).
- Docker sandbox infrastructure implemented (ephemeral model).
- Multi-dialect structure in place.
- Supabase authentication integrated.
- Monorepo structure stable.
- TypeScript strict mode enabled.

Remaining work primarily involves execution rendering, security hardening, limits enforcement, and UX polish.

---

# 🏁 Definition of Stable v1.0.0

The project may be labeled **Stable 1.0.0** once:

- SQL execution output is fully functional.
- Authentication flow is robust.
- Plan limits are enforced.
- Security baseline is implemented.
- Themes are visually distinct.
- No unexpected 500 errors occur during normal usage.

---

Maintained by Sxnnyside Project.
