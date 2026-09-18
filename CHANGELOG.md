# Changelog

All notable changes to **Bubble Catcher** are documented here.

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.0.0] — 2026-09-18

### Added

- **Modern Vue 3 SPA Architecture**:
  - Re-architected entire frontend to Vue 3 (Composition API), Vite, Tailwind CSS v4, and Pinia.
  - Implemented cohesive bubblemorphism design system with responsive layouts, CSS variables, and zero OS-dependent emojis (SVG icon system with Simple Icons and MingCute).
  - Multi-theme engine supporting Colorful (default bubblemorphism), Light, and Dark modes via `data-theme` and persistent local state.

- **Visual Execution Plan Analyzer (`EXPLAIN ANALYZE`)**:
  - Interactive hierarchical tree visualization transforming raw database execution plans into human-readable node graphs.
  - Relative cost and execution duration heatmaps with intuitive color scales (green to red).
  - Node-specific details: scanned rows, estimated vs. actual cost, loops, execution time, and automated bottleneck warnings.
  - Interactive drilldown modal with raw JSON/text inspector and node property breakdown.

- **Shareable Stateful Permalinks**:
  - Persistent sharing system for queries, schemas, and analysis results via unique short-hash URLs.
  - Dedicated share modal with instant copy-to-clipboard, custom query titles, and collaborative instructor notes.
  - Permalinks route (`/share/:id`) that loads read-only or forkable queries directly into the user's workspace.

- **Query Golf & Gamification Engine**:
  - Competitive query optimization challenges ranking solutions by minimal execution time and lowest buffer read counts.
  - Interactive Golf Scorecard displaying execution efficiency, buffer reads, query length, and performance percentiles.
  - Live leaderboards with user rankings, medal distinctions, and real-time score updates.

- **Classroom & Real-Time Instructor Monitoring**:
  - Complete classroom management workflow: courses, assignments, student roster, and submission evaluations.
  - Live session monitoring modal with real-time student activity tracking, current queries, and execution duration.
  - Student assignment submission, grade management, and instant pedagogical feedback.

- **Self-Hosted Infrastructure & Authentication**:
  - Standalone API backend on Bun + Elysia, utilizing Drizzle ORM and PostgreSQL.
  - Robust authentication flow with Argon2id password hashing, JWT access tokens, and rotating refresh tokens in secure HTTP-only cookies.
  - Session revocation, account lockout protection, and granular role-based access control (Student, Teacher, Admin).

- **Multi-Dialect Docker Sandbox System**:
  - Sandboxed SQL execution containers for PostgreSQL, MySQL, MariaDB, SQLite, LibSQL, and Microsoft SQL Server.
  - Granular resource controls, query timeouts, AST-based heuristic guards preventing destructive operations, and container lifecycle API.

- **Admin Governance & Operations**:
  - Dedicated Admin dashboard with three core operational views: User Management, Sandbox Engine Lifecycle, and System Settings.
  - Registration governance (open, invite-only, closed, domain whitelist).
  - SMTP configuration interface with live connection test verification before saving.
  - Bulk and individual session revocation for enhanced security.

- **Global User Experience States**:
  - Unified `BubbleSkeleton` loading states for progressive content rendering across all views.
  - Standardized `BubbleEmptyState` with descriptive messages and direct call-to-action buttons.
  - Resilient `BubbleErrorState` components with retry hooks.

- **Complete Profile & Settings Views**:
  - Dedicated user profile view with activity statistics, total queries executed, execution plans analyzed, and course enrollments.
  - Full-featured settings view with theme switcher, interface language preferences, editor font size, and session controls.

- **Packaging & CI/CD**:
  - Automated CI workflow running formatting, linting, typechecking, and tests via `extractions/setup-just@v2`.
  - Self-hosted release bundle generator via `just package` producing a clean, ready-to-deploy `.tar.gz` distribution.
  - Automated release workflow configured for GitHub Releases.

### Changed

- Replaced legacy frontend prototype with production-grade Vue 3 implementation.
- Upgraded task runner recipes in `Justfile` to support full automated quality gates (`just check`).
- Updated Docker sandbox build scripts to tag images with version 2.0.0.

### Removed

- Removed legacy prototype codebase (`frontend-legacy/`).
- Removed outdated planning files (`PRODUCT_STATUS.md`, `ARCHITECTURE.md`).
- Removed legacy `v1.0.0` release and tags in favor of consolidated `v2.0.0`.

---

[2.0.0]: https://github.com/sxnnyside-scholarships/bubble-catcher/releases/tag/v2.0.0
