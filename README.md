# Bubble Catcher

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![License](https://img.shields.io/badge/License-MIT-green)
[![CI](https://github.com/sxnnyside-scholarships/bubble-catcher/workflows/CI/badge.svg)](https://github.com/sxnnyside-scholarships/bubble-catcher/actions)

<p align="center">
  <strong>Multi-Engine Sandboxes ✦ AST Quality Analysis ✦ Self-Hosted Education</strong><br>
  <em>Educational relational database platform with isolated query sandboxes and real-time AST anti-pattern detection.</em>
</p>

<p align="center">
  <a href="#about">About</a> ✦
  <a href="#features">Features</a> ✦
  <a href="#installation">Installation</a> ✦
  <a href="#usage">Usage</a> ✦
  <a href="#architecture">Architecture</a> ✦
  <a href="#contributing">Contributing</a>
</p>

---

## About

**Bubble Catcher** is a self-hosted SQL educational laboratory that analyzes Abstract Syntax Trees and executes queries inside isolated engine sandboxes.

Conventional query evaluation tools grade code based solely on whether output rows match expectations, encouraging unindexed joins, wildcard projections, and inefficient patterns that collapse in production. Bubble Catcher parses and validates the SQL syntax tree before and during execution, teaching sargability, index selection, and dialect-specific execution mechanics.

Queries execute within ephemeral sandboxes managed through a restricted socket proxy, capturing execution plans, memory buffers, and runtimes without exposing host infrastructure.

### Philosophy

> _"SQL education should teach architectural mechanics and query sargability, not just syntax matching."_

Bubble Catcher is a Sxnnyside Scholarships project, part of the [Sxnnyside Project](https://sxnnysideproject.com).

## Features

- **AST Anti-Pattern Analysis**: 17 static inspection rules evaluating wildcard projection, cartesian joins, unindexed filters, and non-sargable constructs.
- **Multi-Engine Sandboxes**: Isolated execution environments for PostgreSQL, MySQL, MariaDB, SQLite, LibSQL, and Microsoft SQL Server.
- **Query Golf Competitions**: Optimization leaderboards evaluating execution time, memory buffer hit ratios, and AST cleanliness.
- **Classrooms & Automated Grading**: Course management with assignment templates, initial schema seed statements, and tuple assertion grading.
- **Interactive Execution Plans**: Visual AST breakdown and EXPLAIN ANALYZE node inspects with cost and duration heatmaps.
- **Least-Privilege Docker Proxy**: Socket isolation prohibiting volume escapes, swarm alterations, or host escalation during sandbox runs.
- **Self-Hosted Privacy**: Zero external telemetry reporting, air-gapped support, and native deployment via Docker Compose.

## Installation

### Prerequisites

- Bun (>= 1.4.0)
- Just (>= 1.20)
- Docker Engine (>= 24.0)

### From Source

```bash
git clone https://github.com/sxnnyside-scholarships/bubble-catcher.git
cd bubble-catcher

just install
cp backend/.env.example backend/.env
just db-setup
just dev
```

### Self-Hosted Deployment

For standalone VPS, Coolify, Dokku, or Netlify deployment configurations, see the complete guide in [DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Usage

```bash
# Start backend and frontend development servers
just dev

# Run automated verification suite (formatting, linting, typechecking, tests)
just check

# Compile production bundles
just build
```

## Architecture

```
bubble-catcher/
├── backend/    # Bun API server, authentication, and execution sandbox proxy
├── frontend/   # Vue 3 single-page application and query playgrounds
├── shared/     # Domain models, AST rules, and SQL dialect types
├── docker/     # Sandbox container images for isolated query engines
└── docs/       # Deployment guides, architecture manuals, and specifications
```

## Contributing

Contributions are accepted. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

Before contributing, read the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  <strong>Bubble Catcher</strong> — A Sxnnyside Scholarships Project<br>
  <em>&copy; 2026 Sxnnyside Project</em>
</p>
