# Inmersión en MariaDB

## Objetivos de Aprendizaje
- Conocer la historia del fork de MariaDB y su relación de compatibilidad con MySQL.
- Identificar los motores de almacenamiento exclusivos que diferencian a MariaDB (Aria, ColumnStore, Spider).
- Dominar características avanzadas como las **Tablas Versionadas por el Sistema** (*System-Versioned Tables*) para auditoría temporal.
- Evaluar cuándo elegir MariaDB frente a MySQL en proyectos de infraestructura y analítica.

---

## El Origen de MariaDB: La Comunidad al Rescate

En 2008, Sun Microsystems compró MySQL, y en 2010 **Oracle Corporation** adquirió Sun. Ante el temor de que MySQL se convirtiera en un producto privativo o perdiera su espíritu abierto, **Michael "Monty" Widenius** (creador original de MySQL) lanzó un fork comunitario y 100% de código abierto bautizado como **MariaDB** (en honor a su segunda hija Maria, al igual que MySQL fue nombrada por su primera hija My).

> *"MariaDB nació como un reemplazo directo (drop-in replacement) de MySQL, pero a lo largo de los años ha evolucionado hacia un motor con su propio optimizador y capacidades avanzadas de analítica híbrida."*

---

## Motores de Almacenamiento Exclusivos

MariaDB mantiene compatibilidad con InnoDB, pero incorpora motores propios de alto calibre:

### 1. Aria (El Sucesor Confiable de MyISAM)
- Diseñado para superar los fallos de corrupción de MyISAM.
- Es resistente a caídas (*crash-safe*): al reiniciar tras un apagón, recupera el estado sin requerir escaneos destructivos de reparación.
- Utilizado por MariaDB internamente para tablas temporales complejas en disco.

### 2. ColumnStore (Analítica Masiva en Tiempo Real)
- Transforma a MariaDB en una base de datos columnar para **Data Warehousing (OLAP)**.
- Mientras InnoDB guarda las filas contiguas en disco (ideal para transacciones individuales), ColumnStore almacena columna por columna.
- **Rendimiento:** Permite calcular `SUM()` o `AVG()` sobre cientos de millones de registros procesando solo las columnas requeridas a velocidad masiva de lectura secuencial.

### 3. Spider (Particionamiento Distribuido)
- Permite dividir (*sharding*) una tabla grande entre diferentes servidores MariaDB remotos y consultarla de forma transparente como si fuera una sola tabla local.

---

## Innovaciones Sintácticas y Temporales

### Tablas Versionadas por el Sistema (*System-Versioned Tables*)
Una de las características más aclamadas de MariaDB es la capacidad de viajar en el tiempo sin escribir lógica manual de auditoría:

```sql
-- Crea una tabla que preserva automáticamente el historial de cada cambio
CREATE TABLE salarios_empleados (
 empleado_id INT NOT NULL,
 salario NUMERIC(10, 2) NOT NULL
) WITH SYSTEM VERSIONING;

-- Actualización normal:
UPDATE salarios_empleados SET salario = 75000.00 WHERE empleado_id = 1;

-- CONSULTA EN EL TIEMPO: ¿Cuánto ganaba el empleado el 1 de enero de 2026?
SELECT * FROM salarios_empleados
FOR SYSTEM_TIME AS OF '2026-01-01 00:00:00'
WHERE empleado_id = 1;
```

### Secuencias ANSI
A diferencia de MySQL (que solo soporta `AUTO_INCREMENT`), MariaDB soporta secuencias independientes ANSI:
```sql
CREATE SEQUENCE seq_facturas START WITH 1000 INCREMENT BY 1;
SELECT NEXTVAL(seq_facturas);
```

---

## MariaDB vs. MySQL Moderno

| Característica | MariaDB 11 | MySQL 8.0+ |
|---|---|---|
| **Gobernanza** | Fundación comunitaria abierta (MariaDB Foundation) | Oracle Corporation |
| **Licencia del Servidor** | GPL v2 | GPL v2 con extensiones comerciales privativas |
| **Almacenamiento Columnar** | Nativo con ColumnStore | Solo mediante servicio cloud (HeatWave en OCI) |
| **Tablas con Versión Temporal** | Soportadas nativamente (`AS OF SYSTEM TIME`) | No soportadas de forma nativa |
| **Operadores Set** | `UNION`, `INTERSECT`, `EXCEPT` completos | Soportados en MySQL 8.0.31+ |

---

## MariaDB en el Sandbox de Bubble Catcher

En Bubble Catcher, MariaDB corre sobre contenedores de **MariaDB 11**:
- Entorno aislado con capacidades de drop y memoria controlada.
- Compatible con esquemas de MySQL pero evaluado con optimizaciones específicas de subconsultas y CTEs.

---

## Caja de Herramientas para el Docente

### Preguntas Disparadoras para Clase
1. *¿Por qué un motor columnar como ColumnStore es drásticamente más rápido para analítica agregada (`AVG`, `SUM`) que un motor orientado a filas como InnoDB?*
2. *¿Cómo simplifica la característica `WITH SYSTEM VERSIONING` el cumplimiento de normativas de auditoría legal y financiera frente a la creación manual de tablas de historial con triggers?*
3. *¿Qué riesgos implica migrar de MySQL a MariaDB hoy en día considerando las sutiles divergencias sintácticas y de funciones JSON entre ambos proyectos?*

### Ejercicio de Laboratorio
Diseña una tabla versionada con `SYSTEM VERSIONING` en MariaDB para rastrear el cambio de precios de productos en una tienda online. Realiza dos actualizaciones de precio y consulta el estado del catálogo en un punto temporal específico del pasado mediante `FOR SYSTEM_TIME AS OF`.
