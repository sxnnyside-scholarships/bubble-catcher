# Contributing to Bubble Catcher

Thank you for your interest in contributing to Bubble Catcher! This document provides guidelines for contributing to the project.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [How to Contribute](#how-to-contribute)
- [Writing Analysis Rules](#writing-analysis-rules)
- [Testing Sandbox Changes](#testing-sandbox-changes)
- [Commit Message Format](#commit-message-format)
- [Pull Request Process](#pull-request-process)
- [Branch Naming Conventions](#branch-naming-conventions)

---

## Code of Conduct

This project adheres to the Contributor Covenant Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to support.sxnnyside@sxnnysideproject.com.

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for details.

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) >= 1.0
- [Node.js](https://nodejs.org) >= 20
- [Docker Desktop](https://docker.com) (running)
- A [Supabase](https://supabase.com) project (for backend auth testing)

### Fork and Clone

1. Fork the repository on GitHub.
2. Clone your fork:

```bash
git clone https://github.com/<your-username>/bubble-catcher.git
cd bubble-catcher
```

3. Add the upstream remote:

```bash
git remote add upstream https://github.com/HoujouSxnnyside/bubble-catcher.git
```

### Install Dependencies

```bash
make install
```

This installs dependencies for both backend and frontend.

### Configure Environment

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Edit both `.env` files with your Supabase credentials.

### Build Docker Images

```bash
make docker-build
```

This builds all five sandbox images (SQLite, PostgreSQL, MySQL, MariaDB, MSSQL).

### Run the Development Environment

```bash
make dev
```

This starts the backend (port 3001) and frontend (port 5173) concurrently.

---

## Development Workflow

1. Sync your fork with upstream:

```bash
git fetch upstream
git checkout main
git merge upstream/main
```

2. Create a new feature branch:

```bash
git checkout -b feature/your-feature-name
```

3. Make your changes.

4. Test your changes locally:

```bash
# Backend type-check
cd backend && bun run typecheck

# Frontend type-check
cd frontend && npm run check

# Test Docker sandbox (if applicable)
make docker-check
```

5. Commit your changes following the commit message format.

6. Push your branch:

```bash
git push origin feature/your-feature-name
```

7. Open a pull request against the `main` branch.

---

## How to Contribute

### Reporting Bugs

- Check if the issue already exists in [GitHub Issues](https://github.com/sxnnyside/bubble-catcher/issues).
- If not, open a new issue with:
  - A clear title and description.
  - Steps to reproduce the issue.
  - Expected vs. actual behavior.
  - Logs or screenshots, if applicable.
  - Your environment (OS, Bun/Node version, Docker version).

### Suggesting Features

- Open a [feature request issue](https://github.com/sxnnyside/bubble-catcher/issues/new).
- Explain the use case and why it would be valuable.
- Provide examples or mockups if possible.

### Improving Documentation

Documentation improvements are always welcome. If you find typos, unclear explanations, or missing information, feel free to submit a pull request.

### Adding Translations

To add a new language:

1. Create a new file `frontend/src/lib/i18n/<code>.ts` (e.g., `fr.ts` for French).
2. Export an object that satisfies the `Translations` interface.
3. Import it in `frontend/src/lib/i18n/index.ts` and add it to the `translations` record.
4. Update the database schema to allow the new locale in the `preferred_locale` check constraint.

---

## Writing Analysis Rules

Analysis rules inspect the SQL AST and return structured issues. Each rule implements the `AnalysisRule` interface.

### Rule Structure

Create a file in `backend/src/analysis/rules/` following the naming convention `<rule-name>.rule.ts`:

```typescript
import type { AnalysisIssue } from '@shared/types';
import type { AnalysisRule } from '../rule.interface';
import type { AST } from 'node-sql-parser';

export class MyNewRule implements AnalysisRule {
  readonly id = 'my-new-rule';
  readonly name = 'My New Rule';
  readonly description = 'Detects something specific in SQL queries';

  analyze(ast: AST, originalQuery: string): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];
    
    // Walk the AST and detect patterns
    this.visitNode(ast, issues);
    
    return issues;
  }

  private visitNode(node: unknown, issues: AnalysisIssue[]): void {
    if (!node || typeof node !== 'object') return;
    
    const record = node as Record<string, unknown>;
    
    // Check for specific AST patterns
    if (record['type'] === 'select') {
      // Example: detect some pattern
      issues.push({
        ruleId: this.id,
        severity: 'warning',
        message: 'Short description of the issue',
        explanation: 'Detailed explanation for the learner',
        suggestedRewrite: 'SELECT ... -- improved version',
        line: null,
        column: null,
      });
    }
    
    // Recurse into child nodes as needed
  }
}
```

### Register the Rule

1. Export the class from `backend/src/analysis/rules/index.ts`:

```typescript
export { MyNewRule } from './my-new-rule.rule';
```

2. Register it in the `AnalysisEngine` constructor in `backend/src/analysis/engine.ts`:

```typescript
this.rules = [
  // ...existing rules
  new MyNewRule(),
];
```

### Rule Guidelines

- **Severity levels:**
  - `error` -- Unsafe or query-breaking patterns.
  - `warning` -- Performance or best-practice issues.
  - `info` -- Optimization suggestions.
- **Messages:** Keep them short (one sentence).
- **Explanations:** Provide educational context. Explain why the pattern is problematic and what the learner should understand.
- **Suggested rewrites:** Optional. Include only if you can provide a concrete, correct alternative.
- **False positives:** Rules operate on heuristics. Document known limitations in the rule's description or comments.

### Testing Rules

Test your rule against various SQL queries to ensure it:

- Detects the intended pattern.
- Does not produce excessive false positives.
- Handles subqueries and nested structures correctly.
- Works across all supported dialects (if applicable).

---

## Testing Sandbox Changes

If you modify the sandbox executor or Docker images:

### Rebuild Images

```bash
cd docker
bash build-images.sh
```

### Smoke Test Each Dialect

Test with simple queries to verify container creation, readiness, and output parsing:

```bash
# SQLite
docker run --rm bubble-catcher-sqlite:latest \
  "cat /tmp/seed.sql - <<'EOF' | sqlite3 -header -separator $'\t' :memory:
SELECT * FROM users LIMIT 3;
EOF"

# PostgreSQL (requires manual container start + readiness check)
docker run -d --name pg-test -e POSTGRES_PASSWORD=sandbox -e POSTGRES_DB=sandbox bubble-catcher-postgres:latest
sleep 5
docker exec pg-test pg_isready -h 127.0.0.1 -U postgres
docker exec pg-test psql -h 127.0.0.1 -U postgres -d sandbox -c "SELECT * FROM users LIMIT 3;"
docker rm -f pg-test
```

Repeat for MySQL, MariaDB, and MSSQL.

### Integration Test via API

Start the backend and use `curl` to execute queries:

```bash
curl -X POST http://localhost:3001/api/v1/execution/execute \
  -H "Authorization: Bearer <valid-jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "<project-uuid>",
    "sql": "SELECT * FROM users LIMIT 5;",
    "dialect": "postgresql"
  }'
```

Verify the response includes `status: "success"` and correct row data.

---

## Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org) specification:

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### Types

- `feat` -- A new feature.
- `fix` -- A bug fix.
- `docs` -- Documentation changes.
- `style` -- Code style changes (formatting, no logic change).
- `refactor` -- Code restructuring without changing behavior.
- `perf` -- Performance improvements.
- `test` -- Adding or updating tests.
- `chore` -- Maintenance tasks (dependencies, build scripts).

### Scopes

- `backend` -- Backend code (Elysia, sandbox, analysis).
- `frontend` -- Frontend code (SvelteKit, components).
- `docker` -- Sandbox Docker images.
- `docs` -- Documentation files.
- `shared` -- Shared types.
- `infra` -- Infrastructure (Makefile, CI/CD).

### Examples

```
feat(backend): add ORDER BY without LIMIT rule

Detects ORDER BY clauses without a corresponding LIMIT, which
forces the database to sort the entire result set.

Closes #42
```

```
fix(docker): use mariadb-admin instead of mysqladmin for MariaDB 11

MariaDB 11 renamed the mysqladmin binary to mariadb-admin.
Updated the healthCheck command in docker-executor.ts.
```

```
docs(readme): clarify sandbox two-path architecture

Added a diagram and detailed explanation of the server-based
vs non-server execution paths.
```

---

## Pull Request Process

### Before Submitting

1. Ensure your code passes type-checking:

```bash
cd backend && bun run typecheck
cd frontend && npm run check
```

2. Test your changes locally (see [Testing Sandbox Changes](#testing-sandbox-changes)).

3. Update documentation if you changed behavior or added features.

4. Rebase your branch on the latest `main`:

```bash
git fetch upstream
git rebase upstream/main
```

### Submitting the PR

1. Push your branch to your fork.
2. Open a pull request against the `main` branch of the upstream repository.
3. Fill out the pull request template (if provided).
4. Link any related issues (e.g., "Closes #42").

### PR Checklist

- [ ] My code follows the project's code style.
- [ ] I have performed a self-review of my code.
- [ ] I have commented my code where necessary.
- [ ] I have updated the documentation (if applicable).
- [ ] My changes do not introduce new warnings or errors.
- [ ] I have tested my changes locally.
- [ ] I have rebased on the latest `main` branch.

### Review Process

- Maintainers will review your PR and may request changes.
- Address feedback by pushing new commits to your branch (do not force-push during review).
- Once approved, a maintainer will merge your PR.

---

## Branch Naming Conventions

Use descriptive branch names that reflect the type of change:

| Type | Pattern | Example |
|---|---|---|
| Feature | `feature/<short-description>` | `feature/add-oracle-support` |
| Bug fix | `fix/<issue-or-description>` | `fix/auth-token-validation` |
| Documentation | `docs/<description>` | `docs/improve-sandbox-readme` |
| Refactor | `refactor/<description>` | `refactor/extract-parser-utils` |
| Chore | `chore/<description>` | `chore/update-dependencies` |

---

## Questions or Help?

If you have questions about contributing, feel free to:

- Open a [GitHub Discussion](https://github.com/sxnnyside/bubble-catcher/discussions).
- Email us at support.sxnnyside@sxnnysideproject.com.

---

Thank you for contributing to Bubble Catcher!
