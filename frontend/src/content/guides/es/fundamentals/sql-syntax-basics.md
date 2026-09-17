# Sintaxis Básica de SQL y Orden de Ejecución

## Objetivos de Aprendizaje
- Comprender la diferencia fundamental entre cómo se escribe una consulta SQL y el orden real en que el motor la ejecuta.
- Explicar por qué ciertos alias creados en `SELECT` no pueden utilizarse en la cláusula `WHERE`.
- Dominar los tipos de combinación `JOIN` y prever el comportamiento de valores nulos.
- Diferenciar con precisión conceptual y práctica el filtrado con `WHERE` frente a `HAVING`.

---

## El Gran Secreto: Orden Escrito vs. Orden Lógico de Ejecución

Uno de los mayores dolores de cabeza para los estudiantes es escribir una consulta que parece gramaticalmente correcta pero produce un error inmediato del compilador SQL:

```sql
-- [INCORRECTO] ERROR COMÚN: "column 'monto_con_iva' does not exist"
SELECT 
 producto_id, 
 precio * 1.16 AS monto_con_iva
FROM ventas
WHERE monto_con_iva > 500.00;
```

**¿Por qué falla?** Porque SQL es un lenguaje declarativo. Aunque escribes `SELECT` al principio, el motor procesa las cláusulas en un orden completamente diferente:

```
┌────────────────────────────────────────────────────────┐
│ ORDEN LÓGICO DE EJECUCIÓN │
├─────┬───────────┬──────────────────────────────────────┤
│ 1 │ FROM │ Carga las tablas fuente y combinadas │
│ 2 │ ON / JOIN │ Evalúa las condiciones de unión │
│ 3 │ WHERE │ Filtra filas individuales │
│ 4 │ GROUP BY │ Agrupa las filas en buckets │
│ 5 │ HAVING │ Filtra grupos ya calculados │
│ 6 │ SELECT │ Proyecta columnas y crea alias │
│ 7 │ DISTINCT │ Elimina duplicados proyectados │
│ 8 │ ORDER BY │ Ordena el conjunto resultante final │
│ 9 │ LIMIT │ Trunca la cantidad de filas a enviar │
└─────┴───────────┴──────────────────────────────────────┘
```

> [!TIP]
> Dado que `WHERE` (Paso 3) se procesa mucho antes de que `SELECT` (Paso 6) cree el alias `monto_con_iva`, el motor aún no sabe qué significa ese nombre. En cambio, en `ORDER BY` (Paso 8) sí puedes usar el alias porque ocurre después de `SELECT`.

---

## Anatomía de las Combinaciones (`JOIN`)

Las combinaciones cruzan datos entre dos tablas basándose en una condición lógica relacional:

```sql
-- 1. INNER JOIN: Solo registros con coincidencia en ambas tablas
SELECT e.nombre, c.nombre AS carrera
FROM estudiantes e
INNER JOIN carreras c ON e.carrera_id = c.id;

-- 2. LEFT JOIN: Todos los estudiantes, tengan o no carrera asignada
SELECT e.nombre, COALESCE(c.nombre, 'Sin Carrera') AS carrera
FROM estudiantes e
LEFT JOIN carreras c ON e.carrera_id = c.id;

-- 3. Identificar registros huérfanos (Anti-Join con LEFT JOIN)
SELECT e.nombre
FROM estudiantes e
LEFT JOIN inscripciones i ON e.id = i.estudiante_id
WHERE i.id IS NULL;
```

### Tabla de Decisión de Combinaciones
| Tipo de JOIN | Incluye de Tabla A | Incluye de Tabla B | Filas no coincidentes |
|---|---|---|---|
| `INNER JOIN` | Solo coincidentes | Solo coincidentes | Se descartan |
| `LEFT JOIN` | **Todas las filas** | Solo coincidentes | Rellena con `NULL` para B |
| `RIGHT JOIN` | Solo coincidentes | **Todas las filas** | Rellena con `NULL` para A |
| `FULL OUTER JOIN` | **Todas las filas** | **Todas las filas** | Rellena con `NULL` donde falte |

---

## `WHERE` vs. `HAVING`: La Diferencia Vital

Una de las preguntas más comunes en entrevistas técnicas y exámenes de sistemas:

- **`WHERE` (Pre-agregación):** Filtra **filas individuales** antes de agruparlas. No puede contener funciones agregadas como `SUM()` o `AVG()`.
- **`HAVING` (Post-agregación):** Filtra **grupos de filas** después de que `GROUP BY` ha consolidado los buckets.

```sql
-- Ejemplo que combina ambos filtros con propósito claro:
SELECT 
 departamento_id, 
 COUNT(*) AS total_empleados, 
 AVG(salario) AS salario_promedio
FROM empleados
WHERE activo = TRUE -- 1. Filtra empleados activos ANTES de agrupar
GROUP BY departamento_id -- 2. Agrupa por departamento
HAVING COUNT(*) >= 5 -- 3. Conserva solo departamentos con 5 o más empleados
 AND AVG(salario) > 45000.00 -- y cuyo promedio supere los 45k
ORDER BY salario_promedio DESC;
```

---

## Anti-patrones Detectados por Bubble Catcher

1. **`SELECT *` en Consultas de Aplicación:**
 - Transfiere datos innecesarios a través de la red, invalida índices de cobertura (*covering indexes*) y rompe clientes si se agrega una columna pesada (ej. `BYTEA` o `TEXT`).
 - *Regla Bubble Catcher:* `select-star` (Severidad: Warning).

2. **Producto Cartesiano Inadvertido (`Cartesian Join`):**
 - Escribir `SELECT * FROM tabla_a, tabla_b` sin condición `WHERE a.id = b.a_id`. Si A tiene 10,000 filas y B tiene 10,000 filas, genera 100,000,000 de filas en memoria, colapsando el contenedor sandbox.
 - *Regla Bubble Catcher:* `cartesian-join` (Severidad: Warning).

3. **`ORDER BY` sin `LIMIT` en Tablas Voluminosas:**
 - Obliga al motor a ordenar en disco (usando buffers temporales) millones de registros para una consulta interactiva en pantalla.
 - *Regla Bubble Catcher:* `order-without-limit` (Severidad: Info).

---

## Comparativa de Paginación entre Motores

| Motor | Sintaxis de Paginación Estándar |
|---|---|
| **PostgreSQL** | `LIMIT 20 OFFSET 40` o estándar ANSI `OFFSET 40 ROWS FETCH NEXT 20 ROWS ONLY` |
| **MySQL / MariaDB** | `LIMIT 20 OFFSET 40` o `LIMIT 40, 20` |
| **SQLite / libSQL** | `LIMIT 20 OFFSET 40` |
| **MSSQL (SQL Server)** | Requiere `ORDER BY` + `OFFSET 40 ROWS FETCH NEXT 20 ROWS ONLY` (o `TOP (20)` sin offset) |

---

## Caja de Herramientas para el Docente

### Preguntas Disparadoras para Clase
1. *¿Por qué una consulta con `SELECT DISTINCT` puede ocultar un `JOIN` mal estructurado en lugar de solucionar el problema de raíz?*
2. *Si una consulta tiene `WHERE activo = TRUE` y luego `HAVING activo = TRUE`, ¿cuál es el impacto en el plan de ejecución y el buffer de memoria del motor?*
3. *¿Por qué un `FULL OUTER JOIN` no está soportado de forma directa en SQLite y cómo se emula formalmente con `UNION`?*

### Ejercicio de Laboratorio
Escribe una consulta que obtenga el top 3 de carreras con mayor promedio general de calificaciones, considerando únicamente a los alumnos matriculados en 2026 que tengan al menos 3 materias aprobadas. Utiliza el Playground de Bubble Catcher para validar el orden de ejecución y asegurar que ninguna regla estática arroje alertas.
