# Inmersión en MySQL

## Objetivos de Aprendizaje
- Comprender la arquitectura de motores de almacenamiento conectables (*Pluggable Storage Engines*) de MySQL.
- Dominar el funcionamiento interno de **InnoDB** y por qué su índice clustered determina el diseño físico de toda tabla.
- Explicar la importancia de `sql_mode` (`ONLY_FULL_GROUP_BY`, `STRICT_TRANS_TABLES`) en la integridad de las consultas.
- Conocer la diferencia entre escaneos primarios y secundarios (*Bookmark Lookup*) en InnoDB.

---

## ¿Qué es MySQL y cuál es su lugar en el desarrollo web?

**MySQL** es uno de los sistemas gestores de bases de datos relacionales más extendidos del mundo. Desde los días de la pila LAMP (Linux, Apache, MySQL, PHP) hasta gigantes modernos como Meta, Shopify y YouTube, MySQL ha sido el caballo de batalla de la web gracias a su velocidad en lecturas concurrentes, facilidad operativa y robustez transaccional.

> *"La característica distintiva de MySQL es su arquitectura de dos capas: una capa superior de optimización y parsing SQL, y una capa inferior de motores de almacenamiento intercambiables."*

---

## La Arquitectura de Motores de Almacenamiento

A diferencia de PostgreSQL (donde el almacenamiento está unificado), MySQL permite elegir el motor subyacente para cada tabla:

### 1. InnoDB (El Estándar Transaccional)
- **Soporte ACID:** Manejo completo de transacciones con `COMMIT` y `ROLLBACK`.
- **Bloqueos a nivel de fila (*Row-Level Locking*):** Permite alta concurrencia en escrituras simultáneas.
- **Claves Foráneas Reales:** Garantiza integridad referencial.
- **Clustered Index Obligatorio:** La tabla física está organizada directamente sobre el árbol B+ de la Clave Primaria.

### 2. Motores Secundarios (Casos Específicos)
- **MyISAM (Legado):** No soporta transacciones ni claves foráneas. Bloquea la tabla entera al escribir. Obsoleto para producción moderna.
- **MEMORY:** Guarda tablas temporales ultrarrápidas enteramente en memoria RAM (se volatiliza al reiniciar el servidor).
- **CSV:** Permite consultar y escribir directamente sobre archivos de texto separados por comas.

---

## La Anatomía del Índice Clustered en InnoDB

En InnoDB, la tabla **ES** un índice B-Tree:
1. **La Clave Primaria (PK) es el índice clustered:** Los datos completos de cada fila residen físicamente en las hojas del árbol B+ de la PK.
2. **Si no defines una PK:** InnoDB busca la primera clave `UNIQUE NOT NULL`. Si no existe, genera un identificador oculto de 6 bytes (`GEN_CLUST_INDEX`), impidiendo que el desarrollador optimice las consultas.
3. **Índices Secundarios (*Secondary Indexes*):** A diferencia de Postgres (donde el índice apunta al bloque físico en disco), en MySQL un índice secundario guarda **el valor de la Clave Primaria**.
 - *Consecuencia técnica:* Para consultar una columna no indexada a través de un índice secundario, MySQL hace un **doble salto** (*Bookmark Lookup*): primero busca en el índice secundario para obtener la PK, y luego busca en el índice clustered para traer la fila completa.

> [!TIP]
> **Regla de Oro en MySQL:** Las claves primarias en InnoDB deben ser **cortas, monotónicamente crecientes y numéricas** (ej. `BIGINT AUTO_INCREMENT`). Usar un `UUID` aleatorio como PK duplica el tamaño de todos los índices secundarios y provoca costosas divisiones de página (*page splits*) al insertar.

---

## Modos SQL: `sql_mode` y Rigurosidad

Históricamente, MySQL era permisivo (truncaba cadenas silenciosamente o permitía fechas inválidas como `'0000-00-00'`). En MySQL 8.0+, el modo estricto viene activado por defecto:

```sql
-- Verificar modos activos de la sesión:
SELECT @@SESSION.sql_mode;

-- Componentes clave recomendados:
-- STRICT_TRANS_TABLES: Rechaza inserts con valores inválidos o truncados.
-- ONLY_FULL_GROUP_BY: Impide proyectar columnas ambiguas en GROUP BY.
-- NO_ZERO_DATE: Prohíbe fechas vacías.
```

---

## MySQL en el Sandbox de Bubble Catcher

En Bubble Catcher, las consultas para MySQL se ejecutan en un contenedor oficial de **MySQL 8.0**:
- Esquemas de prueba cargados en motor InnoDB con modo estricto habilitado.
- Detección estática con reglas como `select-star`, `cartesian-join` y `group-by-inconsistency`.
- Monitoreo de memoria y destrucción automática del contenedor al concluir la consulta.

---

## Caja de Herramientas para el Docente

### Preguntas Disparadoras para Clase
1. *¿Por qué un `UUIDv4` como clave primaria en MySQL InnoDB perjudica más el rendimiento de escritura que en PostgreSQL? (Respuesta: Debido a que en InnoDB todos los índices secundarios almacenan la PK completa y el B-Tree clustered sufre divisiones continuas al insertar datos no secuenciales).*
2. *¿Qué diferencia existe entre la sintaxis `LIMIT 10 OFFSET 20` y la sintaxis heredada de MySQL `LIMIT 20, 10`? (Atención a la trampa: en `LIMIT 20, 10`, el 20 es el offset y el 10 es la cantidad).*
3. *¿Por qué el motor de almacenamiento MyISAM colapsaba bajo cargas de comercio electrónico con muchos usuarios comprando a la vez?*

### Ejercicio de Laboratorio
Escribe una consulta que intente seleccionar columnas no agregadas en un `GROUP BY` sobre una tabla de ventas en MySQL. Observa cómo el validador estático de Bubble Catcher y el propio motor con `ONLY_FULL_GROUP_BY` rechazan la consulta, y corrígela utilizando funciones agregadas (`MAX` o `GROUP_CONCAT`).
