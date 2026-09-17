# Inmersión en PostgreSQL

## Objetivos de Aprendizaje
- Comprender la arquitectura de procesos y el modelo objeto-relacional de PostgreSQL.
- Dominar el uso de tipos avanzados nativos: `JSONB`, `UUID`, arreglos e intervalos.
- Conocer los tipos de índices especializados que hacen único a Postgres (B-Tree, GIN, GiST, BRIN).
- Entender el funcionamiento de MVCC y el papel de `VACUUM` en el mantenimiento de tablas.

---

## ¿Qué es PostgreSQL y por qué es el estándar de la industria?

**PostgreSQL** ("Postgres") es un sistema de gestión de bases de datos objeto-relacionales libre y de código abierto con más de 35 años de desarrollo ininterrumpido. A diferencia de otros motores que priorizan la velocidad bruta omitiendo validaciones estrictas, la filosofía de Postgres es la **corrección matemática estricta, la adhesión rigurosa a los estándares ANSI SQL y la extensibilidad sin límites**.

> *"PostgreSQL no es solo una base de datos relacional; es una plataforma de datos programable donde puedes crear tus propios tipos, operadores y métodos de indexación."*

---

## Características y Tipos de Datos Exclusivos

### 1. Documentos Semiestructurados con `JSONB`
PostgreSQL cuenta con dos tipos JSON:
- `JSON`: Almacena el texto crudo; requiere re-parsear en cada consulta.
- `JSONB` (*JSON Binary*): Almacena una representación binaria descompuesta y optimizada. Permite indexar llaves individuales y realizar búsquedas a velocidad de B-Tree:

```sql
CREATE TABLE eventos_plataforma (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 payload JSONB NOT NULL
);

-- Buscar eventos donde el usuario sea 'scholar_99' usando el operador de contención (@>)
SELECT * FROM eventos_plataforma 
WHERE payload @> '{"usuario": "scholar_99"}';

-- Extraer un campo como texto plano (->>)
SELECT payload->>'accion' AS tipo_accion 
FROM eventos_plataforma;
```

### 2. Arreglos Nativos
Postgres permite almacenar arreglos multidimensionales de cualquier tipo escalar:
```sql
CREATE TABLE etiquetas_cursos (
 curso_id VARCHAR(10) PRIMARY KEY,
 etiquetas TEXT[] DEFAULT '{}'
);

-- Búsqueda de cursos que contengan la etiqueta 'sql'
SELECT * FROM etiquetas_cursos WHERE 'sql' = ANY(etiquetas);
```

---

## El Arsenal de Índices de PostgreSQL

Mientras otros motores solo ofrecen B-Tree, PostgreSQL ofrece una variedad adaptada a diferentes dimensiones de datos:

| Tipo de Índice | Estructura Interna | Caso de Uso Óptimo |
|---|---|---|
| **B-Tree** | Árbol balanceado estándar | Búsquedas de igualdad y rangos escalares (`=`, `<`, `BETWEEN`) |
| **GIN** (*Generalized Inverted Index*) | Índice invertido (palabra → documentos) | Búsqueda de texto completo (`tsvector`), documentos `JSONB`, arreglos |
| **GiST** (*Generalized Search Tree*) | Árbol de búsqueda balanceado general | Coordenadas geográficas (`PostGIS`), geometrías, solapamiento de rangos |
| **BRIN** (*Block Range Index*) | Resumen de min/max por bloque físico | Tablas masivas de miles de millones de filas ordenadas cronológicamente (ej. logs) |

---

## MVCC y el Proceso `VACUUM`

En PostgreSQL, cuando se actualiza (`UPDATE`) o elimina (`DELETE`) una fila:
- La tupla original queda marcada como muerta (*dead tuple*), pero sigue ocupando espacio físico en disco para que las transacciones activas previas puedan verla.
- La nueva tupla se escribe al final del bloque.
- El proceso en segundo plano **`autovacuum`** se encarga de:
 1. Recuperar el espacio de las tuplas muertas para que pueda ser reutilizado por nuevos registros.
 2. Actualizar las estadísticas de la tabla (`ANALYZE`) que usa el optimizador de consultas para elegir los mejores planes de ejecución.
 3. Congelar identificadores de transacción (*transaction ID wraparound*).

---

## PostgreSQL en el Sandbox de Bubble Catcher

En Bubble Catcher, las consultas en dialecto PostgreSQL se ejecutan en un contenedor basado en **Alpine Linux con PostgreSQL 16**:
- Se inicializa con datos de prueba educativos y aislamiento total de red.
- Las consultas se analizan previamente con las 17 reglas del motor de Bubble Catcher para detectar anti-patrones antes de ejecutar.
- Memoria limitada y timeout estricto (10s) para asegurar que consultas infinitas no comprometan el entorno.

---

## Caja de Herramientas para el Docente

### Preguntas Disparadoras para Clase
1. *¿Por qué un índice GIN sobre una columna `JSONB` ocupa sustancialmente más memoria RAM que un índice B-Tree convencional y en qué momento justifica su costo?*
2. *Si una base de datos PostgreSQL de alto tráfico no ejecuta `VACUUM` periódicamente, ¿qué efecto tiene la acumulación de tuplas muertas (*table bloat*) en las consultas de lectura?*
3. *¿En qué se diferencia una Common Table Expression (CTE) recursiva con `WITH RECURSIVE` en Postgres de un bucle procedural en lenguajes imperativos?*

### Ejercicio de Laboratorio
Crea una tabla con un campo `JSONB` que almacene resultados de exámenes con notas variables por módulo. Construye un índice GIN sobre la columna y ejecuta una consulta que filtre estudiantes que hayan obtenido más de 90 en el módulo "SQL-Analítico", comprobando en el `EXPLAIN` que se aplique un Bitmap Index Scan.
