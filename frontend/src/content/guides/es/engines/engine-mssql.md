# Inmersión en Microsoft SQL Server

## Objetivos de Aprendizaje
- Dominar el dialecto **Transact-SQL (T-SQL)** y sus particularidades sintácticas frente al estándar ANSI.
- Comprender la arquitectura de **Índices Clustered y Non-Clustered** con cláusula `INCLUDE`.
- Conocer los mecanismos de aislamiento con control de versiones en `tempdb` (**RCSI** - *Read Committed Snapshot Isolation*).
- Identificar funciones propietarias de T-SQL (`ISNULL`, `GETDATE`, `TOP`) y sus equivalentes estándar.

---

## ¿Qué es SQL Server y cuál es su rol empresarial?

**Microsoft SQL Server** ("MSSQL") es el buque insignia de Microsoft en bases de datos relacionales para grandes corporaciones, banca, manufactura y sistemas ERP empresariales. Integra el dialecto **T-SQL** (*Transact-SQL*), que extiende el SQL clásico con variables locales, condicionales, bloques `TRY...CATCH` y funciones procedimentales avanzadas.

> *"En el ecosistema corporativo, SQL Server se destaca por su integración nativa con Active Directory, auditoría granular, soporte analítico de índices Columnstore y su potente optimizador de consultas basado en costos."*

---

## Particularidades de T-SQL

### 1. Variables y Bloques Procedimentales
A diferencia de dialectos que solo admiten sentencias puramente declarativas, T-SQL permite definir y manipular variables dentro del mismo script:

```sql
-- Declaración y asignación de variables en T-SQL
DECLARE @id_carrera INT = 3;
DECLARE @promedio_corte NUMERIC(4, 2) = 8.50;

SELECT 
 e.nombre, 
 e.matricula, 
 e.promedio
FROM dbo.estudiantes e
WHERE e.carrera_id = @id_carrera 
 AND e.promedio >= @promedio_corte
ORDER BY e.promedio DESC;
```

### 2. Paginación: `TOP` vs `OFFSET...FETCH`
- **Sintaxis Clásica:** `SELECT TOP (10) * FROM empleados;`
- **Sintaxis Moderna (SQL Server 2012+):** Para paginar con desplazamiento (*offset*), T-SQL exige la presencia obligatoria de un `ORDER BY`:
```sql
SELECT id, nombre, salario
FROM dbo.empleados
ORDER BY id ASC
OFFSET 20 ROWS
FETCH NEXT 10 ROWS ONLY;
```

### 3. Delimitadores e Identificadores Propietarios
En T-SQL es común ver identificadores entre **corchetes** en lugar de comillas dobles estándar:
```sql
-- Sintaxis típica de SQL Server con esquema 'dbo' y corchetes:
SELECT [e].[Nombre Completo], [e].[Salario Bruto]
FROM [dbo].[Empleados 2026] AS [e];
```

---

## La Cláusula Maestra: `INCLUDE` en Índices

Una de las ventajas técnicas más potentes de SQL Server es la capacidad de crear **índices de cobertura (*Covering Indexes*)** mediante la cláusula `INCLUDE`:

```sql
-- Crea un índice B-Tree ordenado por cliente_id,
-- pero guarda fecha_pedido y total directamente en las hojas del índice:
CREATE NONCLUSTERED INDEX idx_pedidos_cliente_cubierto
ON dbo.pedidos (cliente_id)
INCLUDE (fecha_pedido, total);
```

### ¿Por qué esto es revolucionario?
1. El árbol B-Tree principal solo ordena por `cliente_id`, manteniéndose **esbelto, pequeño y rápido en memoria**.
2. Las columnas añadidas en `INCLUDE` residen únicamente en las hojas.
3. Para una consulta como `SELECT fecha_pedido, total FROM pedidos WHERE cliente_id = 42;`, SQL Server realiza un **Index Only Scan**, satisfaciendo la consulta sin tocar jamás la tabla física en disco.

---

## Concurrencia: Bloqueos Tradicionales vs. RCSI

Históricamente, SQL Server utilizaba bloqueos de lectura compartidos (*Shared Locks*): los lectores bloqueaban a los escritores.
Para resolver esto, Microsoft introdujo **Read Committed Snapshot Isolation (RCSI)**:
- Utiliza la base de datos de sistema **`tempdb`** como almacén de versiones (*Version Store*).
- Los lectores consultan snapshots consistentes en `tempdb` sin adquirir bloqueos de fila, permitiendo concurrencia masiva similar a PostgreSQL y MySQL InnoDB.

---

## SQL Server en el Sandbox de Bubble Catcher

En Bubble Catcher:
- Las consultas en dialecto MSSQL se ejecutan sobre un contenedor de **Microsoft SQL Server 2022 Developer Edition**.
- Las respuestas tabulares se procesan mediante un formateador especializado que limpia encabezados y separadores de T-SQL.
- *Nota en Apple Silicon (Mac M-Series):* El contenedor de MSSQL se ejecuta mediante emulación x86_64, por lo que las primeras ejecuciones pueden tomar un par de segundos adicionales al iniciar el contenedor.

---

## Caja de Herramientas para el Docente

### Preguntas Disparadoras para Clase
1. *¿Por qué agregar demasiadas columnas a la clave de un índice compuesto es peor que usar la cláusula `INCLUDE` en SQL Server?*
2. *¿Cuál es la diferencia de comportamiento entre la función propietaria de T-SQL `ISNULL(columna, 'N/A')` y la función estándar ANSI `COALESCE(columna, 'N/A')`? (Pista: `ISNULL` hereda el tipo de dato del primer argumento, mientras que `COALESCE` promueve el tipo según precedencia).*
3. *¿Por qué una base de datos con alto volumen de escrituras y `RCSI` habilitado puede saturar el disco donde reside `tempdb`?*

### Ejercicio de Laboratorio
Escribe un script en T-SQL dentro del Playground de Bubble Catcher que utilice un bloque `TRY...CATCH` para capturar un error de violación de clave foránea y retornar un mensaje estructurado con `ERROR_MESSAGE()` y `ERROR_NUMBER()`.
