# Database Structures & Schemas

## Learning Objectives
- Distinguish between conceptual, logical, and physical data modeling in relational systems.
- Master the design of tables, key constraints (Primary, Foreign, Candidate), and integrity checks.
- Apply the first three Normal Forms (1NF, 2NF, 3NF) to eliminate data redundancy and anomalies.
- Identify common schema design anti-patterns that cripple production performance.

---

## Mental Model: The Hyper-Connected Filing Cabinet

Think of a relational database not as a giant spreadsheet, but as a system of **specialized, interconnected filing drawers**:
- Each **table** is a drawer dedicated to a single real-world entity (e.g., `students`, `courses`, `enrollments`).
- Each **row** (or tuple) represents an individual, unique record inside that drawer.
- The **Primary Key (PK)** is the immutable barcode stamped on each record.
- The **Foreign Key (FK)** is an exact reference pointing to the barcode in another drawer, ensuring no orphaned data can ever exist.

> [!TIP]
> **Golden Rule of Data Modeling:** A table must represent **one single concept**. If your `users` table contains columns like `course_1`, `course_2`, and `course_3`, you are breaking relational integrity and creating serious querying headaches.

---

## Technical Anatomy & Constraints

A robust relational schema enforces business rules directly at the engine layer through declarative constraints:

```sql
-- Production-ready schema with complete integrity constraints
CREATE TABLE students (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 student_number VARCHAR(20) NOT NULL UNIQUE,
 full_name VARCHAR(100) NOT NULL,
 email VARCHAR(255) NOT NULL UNIQUE,
 gpa NUMERIC(4, 2) CHECK (gpa >= 0.00 AND gpa <= 10.00),
 is_active BOOLEAN NOT NULL DEFAULT TRUE,
 created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE enrollments (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 student_id UUID NOT NULL,
 course_code VARCHAR(10) NOT NULL,
 term VARCHAR(10) NOT NULL,
 final_grade NUMERIC(4, 2),
 -- Strict foreign key enforcement
 CONSTRAINT fk_enrollment_student 
 FOREIGN KEY (student_id) 
 REFERENCES students(id) 
 ON DELETE RESTRICT 
 ON UPDATE CASCADE,
 -- Prevent duplicate enrollments for the same student in the same course and term
 CONSTRAINT uq_student_course_term 
 UNIQUE (student_id, course_code, term)
);
```

### Foreign Key Actions (`ON DELETE`)
| Action | Engine Behavior | Common Use Case |
|---|---|---|
| `RESTRICT` / `NO ACTION` | Rejects parent deletion if child records exist | Students with recorded academic transcripts |
| `CASCADE` | Automatically deletes child records when parent is deleted | Invoice line items when deleting an uncommitted draft invoice |
| `SET NULL` | Sets the child foreign key column to `NULL` | Reassigning tickets when an agent account is deactivated |

---

## Normalization Demystified

Normalization is the mathematical discipline of **storing each fact exactly once**.

### 1. First Normal Form (1NF): Atomicity
- **Requirement:** Each cell must contain an atomic (indivisible) value, and repeating groups are prohibited.
- **Classic Pitfall:** Storing `'SQL, Java, Docker'` in a single `skills` column.
- **Remedy:** Create a separate junction table `student_skills` with one row per skill.

### 2. Second Normal Form (2NF): Full Functional Dependency
- **Requirement:** Meet 1NF and ensure every non-key attribute depends on the **entire** composite primary key.
- **Classic Pitfall:** In a table keyed on `(student_id, course_id)`, placing `student_name`. The name depends solely on `student_id`, not the course.
- **Remedy:** Relocate `student_name` into the `students` table.

### 3. Third Normal Form (3NF): No Transitive Dependencies
- **Requirement:** Meet 2NF and ensure non-key attributes depend only on the primary key, with no transitive chains.
- **Classic Pitfall:** Storing `zip_code`, `city`, and `state` inside `customers`. City is functionally determined by the zip code, not the customer.
- **Remedy:** Isolate a lookup table `postal_codes(zip_code, city, state)` and reference only the `zip_code`.

---

## Common Anti-Patterns Flagged by Bubble Catcher

1. **Volatile Primary Keys:**
 - Using email addresses or usernames as primary keys is risky: changing an email cascades through millions of indexed foreign keys.
 - *Best Practice:* Use immutable surrogate keys (`UUID` or `BIGINT IDENTITY`).

2. **Entity-Attribute-Value (EAV):**
 - Storing data as `(entity_id, attribute_name, attribute_value)` to avoid schema migrations. It destroys strict types, prevents relational indexing, and turns simple queries into dozens of self-joins.
 - *Best Practice:* Use typed relational columns, or structured `JSONB` with JSON schema validation if your engine supports it.

3. **Missing `NOT NULL` Constraints:**
 - Permitting NULL values on columns that should always have a value triggers three-valued logic (`TRUE`, `FALSE`, `UNKNOWN`), producing subtle calculation bugs.

---

## Engine Comparison Matrix

| Feature | PostgreSQL | MySQL / MariaDB | SQLite / libSQL | MSSQL |
|---|---|---|---|---|
| **Auto-increment Key** | `IDENTITY` / `SERIAL` | `AUTO_INCREMENT` | `INTEGER PRIMARY KEY AUTOINCREMENT` | `IDENTITY(1,1)` |
| **Native UUID** | Yes (`UUID`) | Emulated (`BINARY(16)` or `CHAR(36)`) | Emulated (`TEXT` or `BLOB`) | `UNIQUEIDENTIFIER` |
| **Default FK Enforcement** | Active | Active (InnoDB engine) | **Disabled by default** (requires `PRAGMA foreign_keys=ON`) | Active |
| **Tables without PK** | Allowed (discouraged) | Generates hidden clustered key (`GEN_CLUST_INDEX`) | Generates hidden `rowid` | Heap table (unclustered) |

---

## Instructor Toolkit

### Classroom Discussion Questions
1. *Why can a randomly generated `UUIDv4` cause B-Tree index fragmentation at scale compared to an auto-incrementing `BIGINT` or a time-ordered `UUIDv7`?*
2. *In a banking ledger system, why is `ON DELETE CASCADE` considered a severe compliance and audit violation?*
3. *When is intentional denormalization appropriate in software engineering? (Key takeaway: In OLAP analytical reporting warehouses where read-heavy aggregations dominate).*

### Laboratory Exercise
Design the relational DDL schema for a university library management system with students, book titles, physical copies, and borrowing loans with late-fee penalty tracking. Apply 3NF and define appropriate `CHECK` and `UNIQUE` constraints.
