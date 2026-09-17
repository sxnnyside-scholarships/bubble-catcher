# Indexes & Performance Optimization

## Learning Objectives
- Comprehend the internal structure of B-Tree balanced trees and how they reduce lookup complexity from $O(N)$ to $O(\log N)$.
- Differentiate between Clustered and Non-Clustered index storage layouts.
- Apply the **Leftmost Prefix Rule** effectively in multi-column composite indexes.
- Decipher execution query plans (`EXPLAIN ANALYZE`) and diagnose actual disk I/O and memory bottlenecks.

---

## Mental Model: The Index at the Back of a Textbook

Imagine a 1,200-page computer architecture textbook:
- **Without an index:** Looking up the term "Deadlock" requires reading page by page from 1 through 1,200. In database terminology, this is a **Sequential Scan (Seq Scan)** or Full Table Scan.
- **With a back-of-book index:** You flip to the letter "D", find "Deadlock: pp. 412, 890", and jump directly to those specific pages. This is an **Index Scan**.
- **The operational cost:** Every time the author inserts or deletes a paragraph, the entire alphabetized back-of-book index must be rebuilt and re-typeset. Therefore, **indexes accelerate read operations (`SELECT`), but incur a write tax on mutations (`INSERT`, `UPDATE`, `DELETE`)**.

---

## Anatomy of a B-Tree (Balanced Tree)

The overwhelming majority of database indexes across PostgreSQL, MySQL, SQL Server, and SQLite are structured as **B-Trees**:
- The root and branch nodes serve as directory signposts directing the search trajectory.
- The leaf nodes at the lowest level store sorted key values paired with physical storage pointers (*Tuple ID / ROWID*).
- Scanning a 10,000,000 row table:
 - Without an index: Up to 10,000,000 sequential block reads.
 - With a B-Tree: Typically 3 to 4 cached node traversals in memory.

```sql
-- Standard single-column B-Tree index
CREATE INDEX idx_users_email ON users(email);

-- Composite multi-column index
CREATE INDEX idx_orders_customer_date ON orders(customer_id, order_date);
```

### The Leftmost Prefix Rule
When an index is constructed on `(customer_id, order_date)`:
- Accelerated: `WHERE customer_id = 42`
- Accelerated: `WHERE customer_id = 42 AND order_date >= '2026-01-01'`
- **NOT accelerated:** `WHERE order_date >= '2026-01-01'` (because the leading column of the index prefix is omitted).

---

## Reading Execution Plans (`EXPLAIN`)

Never guess why a query is slow—ask the query optimizer directly:

```sql
EXPLAIN ANALYZE
SELECT id, total_amount 
FROM orders 
WHERE customer_id = 105;
```

### Essential Plan Nodes
1. **Seq Scan (Sequential Scan):** Reads the entire heap relation. Acceptable for tiny lookup tables (<1,000 rows); disastrous on large transaction tables.
2. **Index Scan:** Traverses the B-Tree leaf level, then visits the main heap relation to fetch unindexed projected columns.
3. **Index Only Scan (Covering Scan):** The pinnacle of DBA optimization. Every column requested by the query is satisfied directly from the B-Tree leaf node without accessing the disk heap.
4. **Bitmap Index Scan:** Reads index pointers, synthesizes an in-memory page bitmap, and reads physical disk blocks in contiguous sequential order.

---

## Anti-Patterns That Invalidate Indexes

1. **Leading Wildcard Expressions:**
 ```sql
 -- [INCORRECT] RENDERS INDEX USELESS: Cannot leverage sorted B-Tree order
 SELECT * FROM customers WHERE last_name LIKE '%son';

 -- [OPTIMIZED] LEVERAGES B-TREE INDEX: Prefix lookup
 SELECT * FROM customers WHERE last_name LIKE 'John%';
 ```
 *Bubble Catcher Rule:* `leading-wildcard` (Severity: Warning).

2. **Wrapping Indexed Columns in Functions:**
 ```sql
 -- [INCORRECT] RENDERS INDEX USELESS: Must evaluate UPPER() row by row
 SELECT * FROM users WHERE UPPER(email) = 'FACULTY@ACADEMIA.EDU';

 -- [OPTIMIZED] REMEDY: Use functional index or store normalized lowercase
 CREATE INDEX idx_users_lower_email ON users(LOWER(email));
 SELECT * FROM users WHERE LOWER(email) = 'faculty@academia.edu';
 ```

3. **Over-Indexing Tables:**
 - Slapping an index on every single column. On write-heavy OLTP tables, this triggers aggressive page splits and degrades transaction throughput (TPS).

---

## Clustered vs. Non-Clustered Storage Layout

| Engine | Clustered Index Architecture | Behavior |
|---|---|---|
| **MySQL (InnoDB)** | Mandatory | The physical table storage **is** the Primary Key B-Tree. |
| **MSSQL** | Default | The Primary Key automatically creates a clustered index unless declared `NONCLUSTERED`. |
| **PostgreSQL** | One-time command (`CLUSTER`) | Physically sorts table once; does not preserve continuous sorted layout on subsequent inserts. |
| **SQLite** | `WITHOUT ROWID` | Reorganizes table to behave as a clustered index over its primary key. |

---

## Instructor Toolkit

### Classroom Discussion Prompts
1. *Why does a query optimizer choose a sequential scan over a table with only 150 rows even when an indexed column is in the predicate? (Answer: Reading one disk block is faster than reading an index page plus the heap block).*
2. *What is "cardinality/selectivity", and why is an index on a boolean column (`is_active: TRUE/FALSE`) rarely utilized by the planner?*
3. *What physical distinctions separate a standard B-Tree from PostgreSQL's specialized GiST or GIN indexes for full-text search and geospatial vectors?*

### Hands-On Lab Exercise
On a dataset with 500,000 order records, run a query filtered by customer and date range. Inspect the execution plan with `EXPLAIN` before and after adding a multi-column covering index. Document the delta in estimated cost and buffer read counts.
