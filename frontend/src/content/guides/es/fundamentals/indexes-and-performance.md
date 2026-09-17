# Índices y Optimización de Rendimiento

## Objetivos de Aprendizaje
- Comprender la estructura física y lógica de los árboles B-Tree y por qué reducen el costo de búsqueda de $O(N)$ a $O(\log N)$.
- Dominar la diferencia entre índices agrupados (*Clustered*) y no agrupados (*Non-Clustered*).
- Aplicar la regla del prefijo más a la izquierda (*Leftmost Prefix Rule*) en índices compuestos.
- Interpretar planes de ejecución con `EXPLAIN ANALYZE` y reconocer cuellos de botella reales en disco y memoria.

---

## Modelo Mental: El Índice de un Libro Técnico

Imagina un libro de computación de 1,200 páginas:
- **Sin índice:** Si buscas el concepto "Deadlock", debes leer página por página desde la 1 hasta la 1,200. En bases de datos, esto se llama **Sequential Scan (Seq Scan)** o escaneo completo de tabla.
- **Con índice al final del libro:** Vas a la letra "D", encuentras "Deadlock: pág. 412, 890", y vas directo a esas páginas. Esto es un **Index Scan**.
- **El costo del índice:** Cada vez que el autor añade o borra un párrafo del libro, tiene que recalcular y reescribir todo el índice alfabético al final. Por eso, **los índices aceleran las lecturas (`SELECT`), pero penalizan las escrituras (`INSERT`, `UPDATE`, `DELETE`)**.

---

## Anatomía de un B-Tree (Árbol Balanceado)

La gran mayoría de los índices en PostgreSQL, MySQL, SQL Server y SQLite son **B-Trees**:
- La raíz y los nodos intermedios actúan como señales de tráfico que guían la búsqueda.
- Las hojas en el nivel inferior contienen los valores ordenados y punteros hacia la fila física en disco (*Tuple ID / ROWID*).
- Búsqueda en tabla de 10,000,000 filas:
 - Sin índice: Hasta 10,000,000 lecturas de bloque.
 - Con B-Tree: Entre 3 y 4 lecturas de nodo en memoria.

```sql
-- Creación de índice simple en columna de búsqueda frecuente
CREATE INDEX idx_usuarios_correo ON usuarios(correo);

-- Índice compuesto (múltiples columnas)
CREATE INDEX idx_pedidos_cliente_fecha ON pedidos(cliente_id, fecha_pedido);
```

### La Regla del Prefijo Más a la Izquierda (*Leftmost Prefix*)
Si creas un índice en `(cliente_id, fecha_pedido)`:
- Acelera: `WHERE cliente_id = 42`
- Acelera: `WHERE cliente_id = 42 AND fecha_pedido >= '2026-01-01'`
- **NO acelera:** `WHERE fecha_pedido >= '2026-01-01'` (porque falta la primera columna del índice).

---

## Descifrando el Plan de Ejecución (`EXPLAIN`)

Antes de optimizar una consulta a ciegas, pídele al motor su plan de ejecución:

```sql
EXPLAIN ANALYZE
SELECT id, total 
FROM pedidos 
WHERE cliente_id = 105;
```

### Términos Clave que Debes Reconocer
1. **Seq Scan (Scan Secuencial):** Lee toda la tabla. Normal en tablas chicas (<1,000 filas), crítico en tablas grandes.
2. **Index Scan:** Busca en el B-Tree y luego viaja al archivo de datos principal para traer las columnas no indexadas.
3. **Index Only Scan (Escaneo Cubierto):** El sueño del DBA. Todas las columnas requeridas por el `SELECT` están dentro del propio índice. El motor **ni siquiera toca la tabla principal en disco**.
4. **Bitmap Index Scan:** Lee el índice, construye un mapa de bits en memoria de qué páginas de disco contienen coincidencias y luego lee esas páginas en orden físico secuencial.

---

## Anti-patrones que Destruyen Índices

1. **Comodín al Inicio (`Leading Wildcard`):**
 ```sql
 -- [INCORRECTO] INVALIDA EL ÍNDICE: El motor no puede usar el orden alfabético del B-Tree
 SELECT * FROM clientes WHERE apellido LIKE '%ez';

 -- [OPTIMIZADO] PERMITE USAR EL ÍNDICE: Búsqueda por prefijo
 SELECT * FROM clientes WHERE apellido LIKE 'Gon%';
 ```
 *Regla Bubble Catcher:* `leading-wildcard` (Severidad: Warning).

2. **Funciones en Columnas Indexadas:**
 ```sql
 -- [INCORRECTO] INVALIDA EL ÍNDICE: Debe aplicar UPPER() fila por fila
 SELECT * FROM usuarios WHERE UPPER(correo) = 'DOCENTE@UNIVERSIDAD.EDU';

 -- [OPTIMIZADO] SOLUCIÓN: Usar un índice funcional o almacenar en minúsculas
 CREATE INDEX idx_usuarios_correo_lower ON usuarios(LOWER(correo));
 SELECT * FROM usuarios WHERE LOWER(correo) = 'docente@universidad.edu';
 ```

3. **Sobrecarga de Índices (*Over-indexing*):**
 - Crear un índice para cada columna de una tabla "por si acaso". En tablas transaccionales de alto tráfico, fragmenta los bloques y degrada drásticamente la tasa de transacciones por segundo (TPS).

---

## Índices Clustered vs. Non-Clustered

| Motor | Soporte de Índice Clustered | Comportamiento |
|---|---|---|
| **MySQL (InnoDB)** | Obligatorio | La tabla física **es** el índice B-Tree de la Clave Primaria. |
| **MSSQL** | Predeterminado | La Clave Primaria crea un índice agrupado a menos que se indique `NONCLUSTERED`. |
| **PostgreSQL** | Comando manual (`CLUSTER`) | Reordena físicamente la tabla una vez, pero no mantiene el orden con nuevos inserts. |
| **SQLite** | `WITHOUT ROWID` | Modifica la tabla para comportarse como índice clustered sobre su PK. |

---

## Caja de Herramientas para el Docente

### Preguntas Disparadoras para Clase
1. *¿Por qué en una tabla pequeña de 150 filas el optimizador elige un Seq Scan aunque exista un índice B-Tree creado? (Respuesta: Porque leer un solo bloque en disco es más rápido que consultar el índice y luego el bloque).*
2. *¿Qué es la "selectividad" de un índice y por qué un índice en una columna booleana `activo (TRUE/FALSE)` suele ser ineficiente?*
3. *¿Qué diferencia técnica existe entre un índice B-Tree y un índice GiST o GIN en PostgreSQL para búsquedas de texto completo o coordenadas geográficas?*

### Ejercicio de Laboratorio
En una tabla con 500,000 registros de ventas, ejecuta una consulta de búsqueda filtrando por rango de fechas y cliente. Genera el `EXPLAIN` antes y después de crear un índice compuesto cubierto (*covering index*). Documenta la reducción del tiempo de costo (`cost=...`) y buffers leídos.
