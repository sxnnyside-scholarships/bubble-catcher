# Built-in Functions & Aggregations

## Learning Objectives
- Master aggregate functions (`COUNT`, `SUM`, `AVG`, `MIN`, `MAX`) and their interactions with `NULL` values.
- Understand the critical distinction between `COUNT(*)` and `COUNT(column_name)`.
- Harness the analytical power of **Window Functions** (`OVER`, `PARTITION BY`, `ROW_NUMBER`, `RANK`) to calculate ranking and cumulative totals without row collapse.
- Safely handle nullability and division operations using `COALESCE` and `NULLIF`.

---

## Mental Model: The Funnel vs. The Sliding Lens

Think of data transformation in two distinct dimensions:
1. **Classical Aggregation (`GROUP BY`):** Functions as a **funnel**. If you feed in 100 sales rows grouped across 5 departments, exactly 5 summarized rows emerge. The original rows collapse and vanish.
2. **Window Functions (`OVER`):** Functions as a **sliding lens**. Each individual row preserves its identity, but peers through an analytical window at its peer partitions (its department) to compute rankings or running totals without squashing table fidelity.

---

## The Crucial Nuance: `COUNT(*)` vs `COUNT(column)`

A quintessential question on database engineering assessments:

```sql
-- Consider the 'scholarships' table with 5 rows:
-- id | student_id | award_amount
-- 1 | 101 | 5000.00
-- 2 | 102 | 7500.00
-- 3 | 103 | NULL
-- 4 | 104 | 5000.00
-- 5 | NULL | 8000.00

SELECT 
 COUNT(*) AS total_row_count, -- Returns: 5 (tallies entire physical tuples)
 COUNT(award_amount) AS non_null_awards, -- Returns: 4 (disregards row 3 because amount is NULL)
 COUNT(DISTINCT award_amount) AS unique_awards -- Returns: 3 (5000, 7500, 8000)
FROM scholarships;
```

> [!TIP]
> `COUNT(*)` is the universal ANSI standard for row counting. Modern query optimizers in PostgreSQL, MySQL, and SQLite contain internal fast-paths optimized specifically for `COUNT(*)`.

---

## Window Functions: Next-Level SQL Analytics

Window functions unlock complex business queries without resort to cumbersome, slow self-joins:

### Finding the Top Performing Student in Each Department
```sql
WITH departmental_rankings AS (
 SELECT 
 s.full_name,
 s.department_id,
 s.gpa,
 -- Evaluates ranks restarting for each department partitioned bucket
 ROW_NUMBER() OVER (
 PARTITION BY s.department_id 
 ORDER BY s.gpa DESC
 ) AS rank_in_dept
 FROM students s
)
SELECT full_name, department_id, gpa
FROM departmental_rankings
WHERE rank_in_dept = 1;
```

### Tie-Breaking: `ROW_NUMBER()`, `RANK()`, and `DENSE_RANK()`
If two students tie with an identical GPA of `9.5`:
| Function | Tie Handling Behavior | Resulting Sequence |
|---|---|---|
| `ROW_NUMBER()` | Arbitrarily breaks tie based on storage order | `1, 2, 3, 4` |
| `RANK()` | Assigns identical rank, skips next positions | `1, 2, 2, 4` (skips 3) |
| `DENSE_RANK()` | Assigns identical rank without skipping positions | `1, 2, 2, 3` (dense) |

---

## Resilient Null Safety: `COALESCE` & `NULLIF`

```sql
-- COALESCE: Evaluates arguments and returns the first non-null expression
SELECT 
 full_name, 
 COALESCE(mobile_phone, office_phone, 'Unreachable') AS primary_contact
FROM contacts;

-- NULLIF: Elegantly eliminates division-by-zero crashes
-- If expenses equals 0, NULLIF(expenses, 0) evaluates to NULL; division by NULL yields NULL safely
SELECT 
 reporting_quarter,
 gross_revenue / NULLIF(total_expenses, 0) AS efficiency_ratio
FROM financial_quarterly_ledgers;
```

---

## Anti-Patterns Flagged by Bubble Catcher

1. **Unbounded `COUNT(*)` on Massive Tables:**
 - Under multiversion concurrency control (MVCC) engines like PostgreSQL, scanning `COUNT(*)` without a filter must evaluate tuple visibility across entire disk pages.
 - *Bubble Catcher Rule:* `count-without-where` (Severity: Info).

2. **`GROUP BY` Ambiguity & Non-Aggregated Projections:**
 - Projecting non-aggregated columns that are not included in the `GROUP BY` clause (a non-standard legacy vulnerability historically permitted when MySQL's `ONLY_FULL_GROUP_BY` was disabled).
 - *Bubble Catcher Rule:* `group-by-inconsistency` (Severity: Warning).

---

## Engine Implementation Comparison

| Feature | PostgreSQL | MySQL (8.0+) | SQLite (3.25+) | MSSQL |
|---|---|---|---|---|
| **Window Functions** | Full support | Full support | Supported since 3.25 | Full support |
| **String Concatenation** | Operator `\|\|` or `CONCAT()` | `CONCAT()` | Operator `\|\|` | Operator `+` or `CONCAT()` |
| **Group String Aggregation** | `STRING_AGG(col, ',')` | `GROUP_CONCAT(col)` | `GROUP_CONCAT(col, ',')` | `STRING_AGG(col, ',')` |
| **Filter Inside Aggregates** | `COUNT(*) FILTER (WHERE x > 0)` | No (requires `CASE`) | Supported `FILTER (...)` | No (requires `CASE`) |

---

## Instructor Toolkit

### Classroom Discussion Prompts
1. *If a column has values `[10, 20, NULL]`, what is the exact mathematical return of `AVG(column)` and why is it not `10`? (Answer: 15, because `AVG` divides by the 2 non-null observations, not 3).*
2. *Why is it syntactically impossible to evaluate a window function directly within a `WHERE` clause in the same query block?*
3. *How is a running total computed across time using `SUM(transaction_amount) OVER (ORDER BY created_at)`?*

### Hands-On Lab Exercise
Formulate a query that computes the running payroll total month-over-month for each department throughout 2026. Project the individual employee salary, the departmental running cumulative total, and the percentage this employee contributes to the final departmental expenditure.
