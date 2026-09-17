# Funciones Integradas y Agregaciones

## Objetivos de Aprendizaje
- Dominar las funciones de agregación (`COUNT`, `SUM`, `AVG`, `MIN`, `MAX`) y su interacción con valores `NULL`.
- Comprender la diferencia vital entre `COUNT(*)` y `COUNT(columna)`.
- Dominar el poder de las **Funciones de Ventana** (`OVER`, `PARTITION BY`, `ROW_NUMBER`, `RANK`) para cálculos analíticos sin colapsar filas.
- Manejar valores nulos con solidez usando `COALESCE` y `NULLIF`.

---

## Modelo Mental: El Embudo vs. La Lupa

Imagina dos formas de analizar datos:
1. **Agregación clásica (`GROUP BY`):** Es un **embudo**. Si viertes 100 filas de ventas agrupadas por departamento, salen 5 filas resumen. Las filas originales se colapsan y desaparecen.
2. **Funciones de Ventana (`OVER`):** Es una **lupa deslizante**. Cada fila original conserva su identidad, pero mira a través de la ventana a sus filas vecinas (su departamento) para calcular su promedio o su ranking relativo sin colapsar la tabla.

---

## El Gran Detalle: `COUNT(*)` vs `COUNT(columna)`

Uno de los errores conceptuales más frecuentes en evaluaciones de bases de datos:

```sql
-- Supongamos la tabla 'becas' con 5 registros:
-- id | estudiante_id | monto
-- 1 | 101 | 5000.00
-- 2 | 102 | 7500.00
-- 3 | 103 | NULL
-- 4 | 104 | 5000.00
-- 5 | NULL | 8000.00

SELECT 
 COUNT(*) AS total_filas, -- Devuelve: 5 (cuenta tuplas completas)
 COUNT(monto) AS becas_con_monto, -- Devuelve: 4 (ignora fila 3 porque monto es NULL)
 COUNT(DISTINCT monto) AS montos_unicos -- Devuelve: 3 (5000, 7500, 8000)
FROM becas;
```

> [!TIP]
> `COUNT(*)` es el estándar idiomático para contar registros totales. Los optimizadores de motores como PostgreSQL o MySQL tienen caminos ultra-optimizados para `COUNT(*)` frente a `COUNT(1)`.

---

## Funciones de Ventana: Analítica Avanzada

Las funciones de ventana permiten responder preguntas de negocio complejas sin recurrir a subconsultas anidadas lentas:

### ¿Cuál es el estudiante con mejor promedio de cada carrera?
```sql
WITH ranking_carreras AS (
 SELECT 
 e.nombre,
 e.carrera_id,
 e.promedio,
 -- Asigna 1, 2, 3... reiniciando en cada carrera ordenado por promedio
 ROW_NUMBER() OVER (
 PARTITION BY e.carrera_id 
 ORDER BY e.promedio DESC
 ) AS posicion_en_carrera
 FROM estudiantes e
)
SELECT nombre, carrera_id, promedio
FROM ranking_carreras
WHERE posicion_en_carrera = 1;
```

### Diferencia entre `ROW_NUMBER()`, `RANK()` y `DENSE_RANK()`
Si dos estudiantes empatan con promedio de `9.5`:
| Función | Comportamiento en Empates | Secuencia Resultante |
|---|---|---|
| `ROW_NUMBER()` | Desempata arbitrariamente según orden físico | `1, 2, 3, 4` |
| `RANK()` | Asigna el mismo número y salta los siguientes | `1, 2, 2, 4` (salta el 3) |
| `DENSE_RANK()` | Asigna el mismo número sin saltar posiciones | `1, 2, 2, 3` (compacto) |

---

## Manejo Seguro de Nulos: `COALESCE` y `NULLIF`

```sql
-- COALESCE: Devuelve el primer valor no-nulo de la lista
SELECT 
 nombre, 
 COALESCE(telefono_movil, telefono_fijo, 'Sin teléfono') AS contacto
FROM contactos;

-- NULLIF: Previene el temido error "division by zero"
-- Si el divisor es 0, NULLIF(ventas, 0) devuelve NULL, y dividir entre NULL da NULL (sin explotar)
SELECT 
 periodo,
 ingresos / NULLIF(gastos, 0) AS ratio_eficiencia
FROM balance;
```

---

## Anti-patrones Detectados por Bubble Catcher

1. **`COUNT(*)` en Tablas Gigantescas sin Filtro `WHERE`:**
 - En motores con control de concurrencia multiversión (MVCC) como PostgreSQL, `COUNT(*)` sin `WHERE` debe inspeccionar la visibilidad de cada tupla en disco.
 - *Regla Bubble Catcher:* `count-without-where` (Severidad: Info).

2. **Inconsistencias en `GROUP BY`:**
 - Seleccionar columnas que no forman parte del `GROUP BY` ni están dentro de una función agregada (comportamiento no estándar permitido en versiones antiguas de MySQL con `ONLY_FULL_GROUP_BY` deshabilitado).
 - *Regla Bubble Catcher:* `group-by-inconsistency` (Severidad: Warning).

---

## Comparativa de Motores

| Característica | PostgreSQL | MySQL (8.0+) | SQLite (3.25+) | MSSQL |
|---|---|---|---|---|
| **Funciones de Ventana** | Soporte total | Soporte total | Soportadas desde 3.25 | Soporte total |
| **Concatenación de Texto** | Operador `\|\|` o `CONCAT()` | `CONCAT()` | Operador `\|\|` | Operador `+` o `CONCAT()` |
| **Agregación de Cadenas** | `STRING_AGG(col, ',')` | `GROUP_CONCAT(col)` | `GROUP_CONCAT(col, ',')` | `STRING_AGG(col, ',')` |
| **Filtro dentro del agregado** | `COUNT(*) FILTER (WHERE x > 0)` | No (requiere `CASE`) | `FILTER (...)` | No (requiere `CASE`) |

---

## Caja de Herramientas para el Docente

### Preguntas Disparadoras para Clase
1. *Si una columna contiene los valores `[10, 20, NULL]`, ¿cuál es el resultado exacto de `AVG(columna)` y por qué no es `10`? (Respuesta: Es 15, porque `AVG` divide entre 2 registros no-nulos, no entre 3).*
2. *¿Por qué no es posible utilizar una función de ventana directamente dentro de la cláusula `WHERE` de la misma consulta?*
3. *¿Cómo se calcula un total acumulado mensual (*running total*) usando únicamente `SUM(monto) OVER (ORDER BY mes)`?*

### Ejercicio de Laboratorio
Escribe una consulta que calcule el salario acumulado mes a mes para cada departamento a lo largo del año 2026, mostrando el salario del empleado actual, el total acumulado del departamento y el porcentaje que representa el salario actual respecto al total departamental.
