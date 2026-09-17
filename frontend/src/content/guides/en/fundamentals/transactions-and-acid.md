# Transactions & ACID Properties

## Learning Objectives
- Formally and practically comprehend the four foundational pillars of **ACID** (Atomicity, Consistency, Isolation, Durability).
- Master transactional workflow control using `BEGIN`, `COMMIT`, `ROLLBACK`, and `SAVEPOINT`.
- Analyze the four standard ANSI SQL isolation levels and the specific concurrency anomalies they mitigate.
- Understand **MVCC** (*Multiversion Concurrency Control*) and techniques for deadlock avoidance in multi-user workloads.

---

## Mental Model: The Bulletproof Bank Transfer

Consider transferring $100 from Account A to Account B:
1. Deduct $100 from Account A.
2. Credit $100 to Account B.

What happens if the physical database server loses power between Step 1 and Step 2? **The money vanishes into the ether.**
A **transaction** is an unbreakable covenant: it packages multiple mutations into an indivisible atomic unit. Either every single operation succeeds and commits, or the entire operation is rolled back, leaving the system as if nothing ever occurred.

---

## The Four Pillars of ACID

```
 ┌───────────────┬─────────────────────────────────────────────────────────────┐
 │ A - ATOMICITY │ "All-or-nothing". If any statement fails, full ROLLBACK. │
 ├───────────────┼─────────────────────────────────────────────────────────────┤
 │ C - CONSIST. │ The database transitions from one valid state to another, │
 │ │ strictly respecting FK, UNIQUE, and CHECK constraints. │
 ├───────────────┼─────────────────────────────────────────────────────────────┤
 │ I - ISOLATION │ Concurrently running transactions cannot corrupt each other.│
 ├───────────────┼─────────────────────────────────────────────────────────────┤
 │ D - DURABIL. │ Once committed, data mutations permanently survive hardware │
 │ │ outages via the Write-Ahead Log (WAL). │
 └───────────────┴─────────────────────────────────────────────────────────────┘
```

### Standard Transaction Syntax
```sql
BEGIN TRANSACTION;

-- Step 1: Debit source account
UPDATE accounts 
SET balance = balance - 100.00 
WHERE id = 'source-account-uuid' AND balance >= 100.00;

-- Step 2: Credit destination account
UPDATE accounts 
SET balance = balance + 100.00 
WHERE id = 'destination-account-uuid';

-- If all statements executed cleanly, commit to durable storage
COMMIT;

-- In event of application exception:
-- ROLLBACK;
```

---

## Isolation Levels & Concurrency Anomalies

When concurrent clients read and write simultaneously, ANSI SQL specifies 4 isolation tiers to regulate anomalies:

### Undesirable Concurrency Phenomena
- **Dirty Read:** Transaction 2 reads uncommitted modifications made by Transaction 1 (which subsequently rolls back).
- **Non-Repeatable Read:** Transaction 1 reads a record, Transaction 2 mutates and commits that record; Transaction 1 re-reads the same row and observes mutated values.
- **Phantom Read:** Transaction 1 executes a range query (`WHERE balance > 1000`). Transaction 2 inserts a new record satisfying the condition and commits. Transaction 1 re-executes the query and encounters a new "phantom" row.

### ANSI SQL Isolation Matrix
| Isolation Level | Dirty Read | Non-Repeatable Read | Phantom Read | Performance Overhead |
|---|---|---|---|---|
| **Read Uncommitted** | Permitted (Anomaly) | Permitted (Anomaly) | Permitted (Anomaly) | Maximum raw speed (unsafe) |
| **Read Committed** *(Default: Postgres, Oracle, SQL Server)* | Prevented | Permitted (Anomaly) | Permitted (Anomaly) | Optimal balance for OLTP |
| **Repeatable Read** *(Default: MySQL InnoDB)* | Prevented | Prevented | Prevented (in InnoDB) | Moderate snapshot tracking cost |
| **Serializable** | Prevented | Prevented | Prevented | Zero anomaly tolerance; retry loops required |

---

## MVCC: Readers Do Not Block Writers

In modern relational engines (PostgreSQL, MySQL InnoDB, SQLite WAL):
- When an `UPDATE` occurs, the engine **does not overwrite the existing data block in place**.
- It creates a **new version** of the tuple annotated with transaction visibility metadata (`xmin`/`xmax` in Postgres, or undo segment chains in MySQL).
- Reading queries observe the point-in-time snapshot of the database when their transaction started, with zero lock waiting.
- Background asynchronous workers (*Vacuum* in Postgres, *Purge threads* in InnoDB) garbage-collect superseded tuple versions once all concurrent transactions complete.

---

## Deadlocks: The Circular Dependency Trap

A **Deadlock** occurs when two transactions hold exclusive locks that the other requires:
- **Transaction 1:** Holds lock on Row A; waits for lock on Row B.
- **Transaction 2:** Holds lock on Row B; waits for lock on Row A.
- **Engine Resolution:** The engine's lock manager detects the circular wait graph, terminates one transaction with a serialization failure error, and permits the other to finish.

> [!TIP]
> **Deadlock Mitigation Rule:** In client application services, **always acquire locks on resources in a deterministic, sorted order** (e.g., sorting entity IDs before executing batch updates).

---

## Instructor Toolkit

### Classroom Discussion Prompts
1. *Why does enabling `Serializable` isolation require application code to implement idempotency and automatic retry loops?*
2. *What is a Write-Ahead Log (WAL), and why is appending log entries sequentially to disk orders of magnitude faster than random writes to data tablespaces?*
3. *How do `SAVEPOINT` statements allow fine-grained transactional error handling without abandoning all prior operations in a long-running batch?*

### Hands-On Lab Exercise
Establish two concurrent client sessions in the Bubble Catcher Playground. Execute simultaneous funds transfers between two accounts in opposite sequential order to deliberately provoke a deadlock exception and observe the engine's error diagnostic trace.
