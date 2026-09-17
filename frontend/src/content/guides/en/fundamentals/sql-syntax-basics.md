# SQL Syntax Basics & Execution Order

## Learning Objectives
- Understand the profound distinction between written SQL query syntax and its actual logical execution pipeline.
- Explain why column aliases declared in the `SELECT` clause cannot be referenced inside the `WHERE` clause.
- Master relational `JOIN` operations and anticipate nullability outcomes across table sets.
- Clearly differentiate between row-level filtering with `WHERE` and group-level aggregation filtering with `HAVING`.

---

## The Big Secret: Written Order vs. Logical Execution Order

A common frustration for computer science students is writing a query that appears grammatically sound but immediately produces a compiler error:

```sql
-- [INCORRECT] COMMON BEGINNER ERROR: "column 'total_with_tax' does not exist"
SELECT 
 item_id, 
 price * 1.16 AS total_with_tax
FROM orders
WHERE total_with_tax > 500.00;
```

**Why does this fail?** SQL is a declarative language. Although you write `SELECT` first, the database engine processes query clauses in an entirely different logical order:

```
┌────────────────────────────────────────────────────────┐
│ LOGICAL EXECUTION PIPELINE │
├─────┬───────────┬──────────────────────────────────────┤
│ 1 │ FROM │ Identify source and joined tables │
│ 2 │ ON / JOIN │ Evaluate join predicate conditions │
│ 3 │ WHERE │ Filter individual candidate rows │
│ 4 │ GROUP BY │ Collapse rows into aggregated buckets│
│ 5 │ HAVING │ Filter aggregated group buckets │
│ 6 │ SELECT │ Compute projections and bind aliases │
│ 7 │ DISTINCT │ Eliminate duplicate projected tuples │
│ 8 │ ORDER BY │ Sort the final projected output set │
│ 9 │ LIMIT │ Slice the output to requested count │
└─────┴───────────┴──────────────────────────────────────┘
```

> [!TIP]
> Because `WHERE` (Step 3) executes long before `SELECT` (Step 6) binds the alias `total_with_tax`, the query planner has no awareness of that identifier yet. Conversely, `ORDER BY` (Step 8) executes *after* `SELECT`, which is why using declared aliases inside `ORDER BY` works seamlessly.

---

## Relational Combinations (`JOIN` Operations)

Join operations combine records across distinct relations based on relational predicate expressions:

```sql
-- 1. INNER JOIN: Returns records matching the predicate in both tables
SELECT s.full_name, d.department_name
FROM students s
INNER JOIN departments d ON s.department_id = d.id;

-- 2. LEFT JOIN: Retains every student, whether or not assigned to a department
SELECT s.full_name, COALESCE(d.department_name, 'Unassigned') AS department_name
FROM students s
LEFT JOIN departments d ON s.department_id = d.id;

-- 3. Anti-Join pattern: Finding unlinked records
SELECT s.full_name
FROM students s
LEFT JOIN enrollments e ON s.id = e.student_id
WHERE e.id IS NULL;
```

### Relational Join Matrix
| Join Type | In Left Relation (A) | In Right Relation (B) | Non-Matching Rows |
|---|---|---|---|
| `INNER JOIN` | Matching only | Matching only | Discarded |
| `LEFT JOIN` | **All rows** | Matching only | Padded with `NULL` for B |
| `RIGHT JOIN` | Matching only | **All rows** | Padded with `NULL` for A |
| `FULL OUTER JOIN` | **All rows** | **All rows** | Padded with `NULL` where absent |

---

## `WHERE` vs. `HAVING`: The Architectural Difference

A frequent technical interview benchmark in database engineering:

- **`WHERE` (Pre-Aggregation Filter):** Discards **individual rows** before group partitioning occurs. It cannot evaluate aggregate expressions such as `SUM()` or `AVG()`.
- **`HAVING` (Post-Aggregation Filter):** Discards **entire groups** after `GROUP BY` has consolidated them.

```sql
-- Comprehensive query illustrating clean separation of filtering stages:
SELECT 
 department_id, 
 COUNT(*) AS active_faculty_count, 
 AVG(salary) AS average_salary
FROM faculty
WHERE is_active = TRUE -- 1. Pre-filters individual records
GROUP BY department_id -- 2. Partitions into department buckets
HAVING COUNT(*) >= 5 -- 3. Keeps only departments with >= 5 faculty
 AND AVG(salary) > 65000.00 -- and an average compensation exceeding 65k
ORDER BY average_salary DESC;
```

---

## Anti-Patterns Flagged by Bubble Catcher

1. **`SELECT *` in Production Application Code:**
 - Overfetches network bandwidth, invalidates index-only covering scans, and breaks consumer schemas when high-footprint binary or text columns are added.
 - *Bubble Catcher Rule:* `select-star` (Severity: Warning).

2. **Accidental Cartesian Product (`Cartesian Join`):**
 - Writing comma-separated tables (`FROM table_a, table_b`) without a binding predicate. Joining two 10,000-row tables yields 100,000,000 intermediate combinations, exhausting memory limits in our sandboxes.
 - *Bubble Catcher Rule:* `cartesian-join` (Severity: Warning).

3. **Unbounded `ORDER BY`:**
 - Forcing the storage engine to sort millions of tuples into disk tempfiles for a query displayed in an interactive frontend view.
 - *Bubble Catcher Rule:* `order-without-limit` (Severity: Info).

---

## Pagination Across Engines

| Engine | Standard Pagination Syntax |
|---|---|
| **PostgreSQL** | `LIMIT 20 OFFSET 40` or ANSI `OFFSET 40 ROWS FETCH NEXT 20 ROWS ONLY` |
| **MySQL / MariaDB** | `LIMIT 20 OFFSET 40` or `LIMIT 40, 20` |
| **SQLite / libSQL** | `LIMIT 20 OFFSET 40` |
| **MSSQL (SQL Server)** | Requires `ORDER BY` + `OFFSET 40 ROWS FETCH NEXT 20 ROWS ONLY` (or `TOP (20)` without offset) |

---

## Instructor Toolkit

### Classroom Discussion Prompts
1. *Why does inserting a `SELECT DISTINCT` clause often mask an improperly formulated join rather than addressing the core root cause?*
2. *If a query specifies `WHERE is_active = TRUE` and also includes `HAVING is_active = TRUE`, how does that redundancy impact database buffer pool allocations?*
3. *Why does SQLite omit native support for `FULL OUTER JOIN`, and how is it mathematically synthesized via `LEFT JOIN` and `UNION`?*

### Hands-On Lab Exercise
Formulate a query that extracts the top 3 academic departments with the highest grade averages, considering only students matriculated in 2026 who completed at least 3 accredited courses. Validate your query plan inside the Bubble Catcher Playground.
