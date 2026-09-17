# Bubble Catcher

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![License](https://img.shields.io/badge/License-MIT-green)
[![CI](https://github.com/sxnnyside-scholarships/bubble-catcher/workflows/CI/badge.svg)](https://github.com/sxnnyside-scholarships/bubble-catcher/actions)

<p align="center">
  <strong>Educational SQL Analysis ✦ Sandboxed Execution ✦ Multi-Dialect</strong><br>
  <em>Safe SQL query analysis and disposable container sandboxes for students, educators, and developers.</em>
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

**Bubble Catcher** is an educational SQL analysis and sandboxed execution platform. It parses SQL queries, detects inefficiencies and unsafe patterns through a rule-based static analysis engine, suggests safer rewrites, and executes queries inside ephemeral Docker containers isolated from the host system.

SQL education tools typically fall into two categories: static linters that flag errors without execution, and online sandboxes that execute queries without analysis. Bubble Catcher bridges both: it analyzes your query before execution, explains what the AST analysis found, and runs the query inside disposable containers so you can inspect results safely.

The platform supports multiple SQL dialects, letting learners compare how identical concepts behave across PostgreSQL, MySQL, MariaDB, SQLite, and MSSQL.

### Philosophy

> _"Safe SQL exploration through AST static analysis and disposable container sandboxes."_

Bubble Catcher is a Sxnnyside Scholarships project, part of the [Sxnnyside Project](https://sxnnysideproject.com).

---

## Features

- **AST-Based Static Analysis**: Rule engine with 17 static analysis rules detecting Cartesian joins, unbounded scans, and anti-patterns.
- **Isolated Docker Sandboxes**: Ephemeral containers with dropped capabilities, memory/CPU caps, and network isolation (`NetworkMode: none`).
- **Multi-Dialect Support**: Native execution environments for PostgreSQL, MySQL, MariaDB, SQLite, and MSSQL.
- **Self-Hosted Architecture**: Self-contained PostgreSQL storage with Drizzle ORM, trigger migrations, and local JWT authentication.
- **Tactile User Interface**: Responsive Vue 3 frontend featuring Bubblemorphism aesthetics, SQL syntax highlighting, and interactive results.
- **Quality Gate Automation**: Unified command surface with `just` and Biome linter/formatter enforcing strict correctness.

---

## Installation

### Prerequisites

- Bun (>= 1.4.0)
- Just (>= 1.20)
- Docker Desktop (running)

### From Source

```bash
git clone https://github.com/sxnnyside-scholarships/bubble-catcher.git
cd bubble-catcher

just install
```

Configure your local backend environment:

```bash
cp backend/.env.example backend/.env
```

Apply database migrations and triggers:

```bash
cd backend && bun run db:setup
```

Build Docker sandbox images:

```bash
just docker-build
```

---

## Usage

Start the complete development environment (backend on `:3001` and frontend on `:5173`):

```bash
just dev
```

Run the automated quality gate (formatting, linting, typechecking, and tests):

```bash
just check
```

Compile production bundles:

```bash
just build
```

---

## Architecture

```
bubble-catcher/
├── backend/          # Bun + Elysia API server with self-hosted auth & Drizzle ORM
├── frontend/         # Vue 3 + Vite + Tailwind v4 + Pinia SPA
├── frontend-legacy/  # SvelteKit legacy prototype (archived reference implementation)
├── shared/           # Pure TypeScript domain models and AST analysis types
└── docker/           # Sandbox container definitions for multi-dialect execution
```

For a detailed breakdown, see [ARCHITECTURE.md](ARCHITECTURE.md).

### Monorepo Structure

- **`backend/`** — Bun-managed API service.
- **`frontend/`** — Bun-managed Vue 3 single page application.
- **`frontend-legacy/`** — SvelteKit legacy prototype retained as an architectural reference.
- **`shared/`** — Shared TypeScript models and AST rule definitions (`@shared/*`).
- **`docker/`** — Dialect definitions, entrypoints, and seed data.

---

## Contributing

Contributions are accepted. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

Before contributing, read the [Code of Conduct](CODE_OF_CONDUCT.md).

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  <strong>Bubble Catcher</strong> — A Sxnnyside Scholarships Project<br>
  <em>&copy; 2026 Sxnnyside Project</em>
</p>
