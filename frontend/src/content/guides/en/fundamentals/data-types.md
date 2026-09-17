# Data Types & Engine Nuances

## Learning Objectives
- Master fundamental SQL data type families and their physical representations in disk storage and RAM.
- Understand the critical distinction between exact numeric types (`NUMERIC`/`DECIMAL`) and floating-point approximations (`FLOAT`/`DOUBLE`).
- Explain why timezone-aware timestamps (`TIMESTAMPTZ`) are mandatory in modern distributed cloud architectures.
- Detect and prevent silent index invalidation caused by implicit type casting.

---

## Mental Model: The Right Container for the Cargo

Selecting SQL data types is akin to choosing packaging containers in logistics:
- Using a massive container (`BIGINT` to store the months of the year `1-12`) wastes disk space and pollutes the database server's active buffer pool cache.
- Using the wrong material (`FLOAT` for currency) results in fractional rounding drift that silently unbalances accounting ledgers over time.
- Using an unlabeled timestamp (`TIMESTAMP` without offset) makes it impossible to reconstruct chronological ordering in a global distributed system.

---

## Core Data Type Families

### 1. Numeric Types: The Golden Financial Rule
```sql
-- [INCORRECT] NEVER USE FLOAT OR REAL FOR FINANCIAL CALCULATIONS:
-- IEEE 754 binary floating-point representation causes cumulative precision leakage
CREATE TABLE insecure_balance (
 current_funds FLOAT -- Hazardous: 0.10 + 0.20 = 0.30000000000000004
);

-- [OPTIMIZED] ALWAYS CHOOSE DECIMAL OR NUMERIC FOR EXACT PRECISION:
CREATE TABLE financial_balance (
 -- 12 total digits of precision, 2 reserved for cents (up to 9,999,999,999.99)
 current_funds NUMERIC(12, 2) NOT NULL DEFAULT 0.00
);
```

### 2. Character Strings: `CHAR` vs `VARCHAR` vs `TEXT`
| Type | Length Strategy | Storage Mechanism | When to Employ |
|---|---|---|---|
| `CHAR(n)` | Fixed length | Right-padded with spaces up to `n` | ISO country codes (`'US'`, `'MX'`), SHA-256 hashes |
| `VARCHAR(n)` | Variable up to `n` | Stores length byte prefix + raw string | Names, emails, domain-constrained identifiers |
| `TEXT` | Unbounded variable | Variable payload (offloaded via TOAST if large) | Blog posts, audit payloads, system logs |

> [!TIP]
> In modern PostgreSQL, `VARCHAR` and `TEXT` share the exact same internal storage engine mechanism. `VARCHAR(n)` serves primarily as an application-level constraint to prevent unbounded payload submissions.

### 3. Date & Time: Why Timezones Matter
- `TIMESTAMP`: Stores naive date and time. If a server in New York records `12:00` and a user in Tokyo queries it, they see `12:00` with zero awareness of the 13-hour offset.
- `TIMESTAMP WITH TIME ZONE` (`TIMESTAMPTZ`): Normalizes timestamps to UTC upon disk storage and dynamically offsets to the client connection's timezone upon projection.

```sql
CREATE TABLE audit_ledger (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 action_type VARCHAR(50) NOT NULL,
 -- Records an unambiguous, immutable instant in global time (UTC)
 recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

---

## Critical Anti-Pattern: Implicit Type Conversion

One of the most frequent causes of catastrophic database performance drops is comparing columns against mismatched literal types:

```sql
-- Suppose 'staff_code' is defined as VARCHAR(20) and possesses a B-Tree index:

-- [INCORRECT] IMPLICIT TYPE CONVERSION: Renders the index useless
SELECT * FROM staff WHERE staff_code = 10452;

-- What the engine actually executes behind the scenes:
-- Evaluates every record: WHERE CAST(staff_code AS INTEGER) = 10452
-- Result: FULL TABLE SCAN across millions of disk blocks.
```

```sql
-- [OPTIMIZED] PROPER TYPED MATCHING: Directly seeks the B-Tree index
SELECT * FROM staff WHERE staff_code = '10452';
```

*Bubble Catcher Rule:* `implicit-type-conversion` (Severity: Warning).

---

## The Special Case of SQLite: *Type Affinity*

Unlike PostgreSQL or SQL Server which enforce strict static typing, **SQLite uses type affinity**:
- If a column is defined as `INTEGER`, but you insert `'pineapple'`, SQLite **stores the string without throwing an error**.
- The datatype is associated with the individual value itself, not the column definition.
- `libSQL` inherits these affinities while introducing optional strict table modes for enterprise compliance.

---

## Instructor Toolkit

### Classroom Discussion Prompts
1. *Why does calculating `AVG(score)` over an `INT` column in some engines yield truncated integer division (e.g., `7 / 2 = 3`), and how is this explicitly resolved with `CAST`?*
2. *Why does storing birthdates as formatted text (`VARCHAR(10)` as `'DD/MM/YYYY'`) break chronological sorting in `ORDER BY` clauses?*
3. *What physical storage and indexability benefits does PostgreSQL's binary `JSONB` offer over plain text JSON in traditional SQLite or legacy MySQL engines?*

### Hands-On Lab Exercise
Define a schema for a hotel reservation system containing night rates, discount percentages, check-in timestamps, and checkout timestamps. Select the precise data types to ensure zero rounding errors during multi-item tax calculations.
