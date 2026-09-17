# SQLite Deep Dive

## Learning Objectives
- Comprehend the embedded, serverless architecture of SQLite.
- Master the **Type Affinity** system and its departure from rigid relational typing models.
- Explain multi-reader concurrency using **Write-Ahead Logging (WAL)** and file-level locking.
- Prevent foreign key corruption bugs by mastering the mandatory `PRAGMA foreign_keys = ON;` directive.

---

## What is SQLite and Why Is It Everywhere?

**SQLite** is the most widely deployed software module in computing history. It is embedded inside billions of smartphones (iOS & Android), web browsers (Chrome & Safari), desktop applications, smart vehicles, and aerospace systems.

SQLite is not a standalone server daemon communicating across TCP/IP sockets (like Postgres on port `:5432` or MySQL on `:3306`). Instead, it is **a compact, self-contained C library linked directly into the host application process**.

The entirety of the database—tables, indexes, triggers, and content—is encapsulated in **a single ordinary disk file**, universally cross-compatible between 32-bit and 64-bit architectures.

> *"SQLite does not compete with Oracle or PostgreSQL; SQLite competes with fopen()."* — Dr. Richard Hipp (architect of SQLite).

---

## Dynamic Storage & Type Affinity

Unlike traditional engines that reject data violating column definitions, SQLite uses **Type Affinity**. Physical values are classified into 5 core storage classes:
1. `NULL`: Evaluates to missing or undefined.
2. `INTEGER`: Signed integer stored across 1, 2, 3, 4, 6, or 8 bytes depending on numerical magnitude.
3. `REAL`: 8-byte IEEE 754 floating-point value.
4. `TEXT`: UTF-8, UTF-16BE, or UTF-16LE encoded string.
5. `BLOB`: Raw binary data stored exactly as inputted.

```sql
-- Perfectly valid in default SQLite:
CREATE TABLE flexible_records (
 id INTEGER PRIMARY KEY,
 age INTEGER
);

-- Standard integer insertion:
INSERT INTO flexible_records VALUES (1, 25);

-- Inserting plain text into an INTEGER column succeeds without error!
INSERT INTO flexible_records VALUES (2, 'twenty-five');

-- Inspect the underlying storage class of each row:
SELECT id, age, typeof(age) FROM flexible_records;
-- Row 1: integer
-- Row 2: text
```

> [!WARNING]
> For software engineering students accustomed to strict compiler type validation, this can cause subtle data corruption bugs. Starting in SQLite 3.37+, you can enforce strict static validation using the `STRICT` table directive:
> `CREATE TABLE users (id INT, email TEXT) STRICT;`

---

## Concurrency & The WAL Architecture

In legacy Rollback Journal mode:
- Writing (`INSERT/UPDATE/DELETE`) locks the entire database file exclusively; no other thread can read or write.

Under modern **Write-Ahead Logging (WAL)** mode:
```sql
PRAGMA journal_mode = WAL;
```
- Appends mutations sequentially to a companion `-wal` file.
- **Multiple concurrent readers can query snapshots simultaneously without blocking the writer**, and the writer never stalls active readers.
- Only a **single writer can execute at any given instant**, making SQLite ideal for read-heavy edge workloads.

---

## The Historic Foreign Key Trap

For backwards compatibility with code written prior to 2009, **SQLite disables foreign key constraint enforcement by default**.

```sql
-- [INCORRECT] Executed without explicit configuration:
CREATE TABLE courses (id INT PRIMARY KEY);
CREATE TABLE students (id INT, course_id INT REFERENCES courses(id));

-- Silently accepts orphan references to non-existent courses!
INSERT INTO students VALUES (1, 9999); -- Accepted silently!

-- [OPTIMIZED] MANDATORY INITIALIZATION ON EVERY NEW CONNECTION:
PRAGMA foreign_keys = ON;
```

---

## SQLite Inside Bubble Catcher Sandbox

In Bubble Catcher:
- SQLite runs within lightweight execution sandboxes using `:memory:` or volatile RAM-backed temporary files.
- Delivers sub-millisecond execution round-trips with zero network socket or authentication overhead.

---

## Instructor Toolkit

### Classroom Discussion Prompts
1. *Why is SQLite the universal standard for client-side persistence in mobile and desktop applications compared to remote client-server architectures like MySQL?*
2. *What catastrophic file corruption occurs when mounting an SQLite database file over networked filesystems like NFS or SMB under concurrent writes?*
3. *How does the `WITHOUT ROWID` optimization reduce B-Tree storage overhead on tables featuring composite primary keys?*

### Hands-On Lab Exercise
Write an SQL script in the Bubble Catcher Playground defining two relational tables with an explicit foreign key. Demonstrate the difference in database state when inserting orphan records before and after issuing `PRAGMA foreign_keys = ON;`.
