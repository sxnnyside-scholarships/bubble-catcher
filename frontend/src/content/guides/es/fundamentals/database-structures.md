# Estructuras de Base de Datos y Esquemas

## Objetivos de Aprendizaje
- Comprender la diferencia entre modelo conceptual, lógico y físico en bases de datos relacionales.
- Dominar el diseño de tablas, tipos de claves (Primarias, Foráneas, Candidatas) y restricciones de integridad.
- Aplicar las tres primeras Formas Normales (1FN, 2FN, 3FN) para eliminar redundancia e inconsistencias.
- Identificar anti-patrones clásicos de modelado que degradan el rendimiento en producción.

---

## Modelo Mental: El Archivero Inteligente

Imagina una base de datos relacional no como una hoja de cálculo gigante, sino como un conjunto de **ficheros especializados e hiper-conectados**:
- Cada **tabla** es un cajón dedicado a una única entidad de la realidad (ej. `estudiantes`, `cursos`, `inscripciones`).
- Cada **fila** (o tupla) representa una instancia única e irrepetible en ese cajón.
- La **clave primaria (PK)** es el código de barras irrepetible que identifica esa ficha.
- La **clave foránea (FK)** es un puntero hacia el código de barras de otro cajón, garantizando que no existan huérfanos.

> [!TIP]
> **Regla de Oro del Modelado:** Una tabla debe modelar **un solo concepto**. Si tu tabla `usuarios` contiene columnas como `curso_1`, `curso_2` y `curso_3`, estás rompiendo la estructura relacional y creando problemas para consultar e indexar.

---

## Anatomía Técnica y Restricciones

Un esquema relacional robusto delega la validación de reglas de negocio al propio motor mediante restricciones (*constraints*):

```sql
-- Creación de tabla con restricciones de integridad completas
CREATE TABLE estudiantes (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 matricula VARCHAR(20) NOT NULL UNIQUE,
 nombre VARCHAR(100) NOT NULL,
 correo VARCHAR(255) NOT NULL UNIQUE,
 promedio NUMERIC(4, 2) CHECK (promedio >= 0.00 AND promedio <= 10.00),
 activo BOOLEAN NOT NULL DEFAULT TRUE,
 creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inscripciones (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 estudiante_id UUID NOT NULL,
 curso_codigo VARCHAR(10) NOT NULL,
 periodo VARCHAR(10) NOT NULL,
 calificacion_final NUMERIC(4, 2),
 -- Clave foránea con integridad referencial estricta
 CONSTRAINT fk_inscripcion_estudiante 
 FOREIGN KEY (estudiante_id) 
 REFERENCES estudiantes(id) 
 ON DELETE RESTRICT 
 ON UPDATE CASCADE,
 -- Evita que el mismo alumno se inscriba dos veces en el mismo curso en el mismo periodo
 CONSTRAINT uq_estudiante_curso_periodo 
 UNIQUE (estudiante_id, curso_codigo, periodo)
);
```

### Comportamientos de Clave Foránea (`ON DELETE`)
| Acción | Comportamiento en BD | Caso de Uso Típico |
|---|---|---|
| `RESTRICT` / `NO ACTION` | Bloquea la eliminación del padre si existen hijos asociados | Alumnos con historial académico registrado |
| `CASCADE` | Elimina automáticamente a los hijos al borrar al padre | Detalles de factura al eliminar la factura cabecera |
| `SET NULL` | Deja en `NULL` la columna del hijo | Reasignar tareas cuando se da de baja a un usuario |

---

## Normalización Explicada sin Fórmulas Complejas

La normalización busca **guardar cada dato exactamente una vez**.

### 1. Primera Forma Normal (1FN): Atomicidad
- **Requisito:** Cada celda debe contener un valor atómico (indivisible) y no debe haber grupos repetitivos.
- **Error clásico:** Guardar `'SQL, Java, Docker'` en una sola columna `habilidades`.
- **Solución:** Crear una tabla intermedia `estudiante_habilidades` con una fila por habilidad.

### 2. Segunda Forma Normal (2FN): Dependencia Funcional Completa
- **Requisito:** Cumplir 1FN y que todo atributo que no sea clave dependa de la **totalidad** de la clave primaria (aplica a claves primarias compuestas).
- **Error clásico:** En una tabla con PK `(estudiante_id, curso_id)`, tener la columna `nombre_estudiante`. `nombre_estudiante` solo depende de `estudiante_id`, no del curso.
- **Solución:** Mover `nombre_estudiante` a la tabla `estudiantes`.

### 3. Tercera Forma Normal (3FN): Sin Dependencias Transitivas
- **Requisito:** Cumplir 2FN y que ningún atributo dependa de otro atributo no-clave.
- **Error clásico:** Guardar `codigo_postal`, `ciudad` y `estado` en la tabla `clientes`. La ciudad depende del código postal, no directamente del cliente.
- **Solución:** Crear un catálogo `codigos_postales(cp, ciudad, estado)` y referenciar solo el `cp`.

---

## Anti-patrones Comunes Detectados por Bubble Catcher

1. **Claves Primarias Basadas en Cadenas Cambiantes:**
 - Usar el correo o el nombre como PK es peligroso: si el usuario cambia de correo, debes propagar la actualización a millones de registros con FK.
 - *Mejor práctica:* Usa identificadores inmutables (`UUID` o `BIGINT IDENTITY`).

2. **Entidad-Atributo-Valor (EAV):**
 - Crear tablas con columnas `(entidad_id, clave, valor)` para evitar crear columnas reales. Destruye el tipado fuerte, imposibilita índices eficientes y complica las consultas.
 - *Mejor práctica:* Usa columnas tipadas o campos `JSONB` si el motor lo soporta de forma nativa.

3. **Falta de Restricciones `NOT NULL`:**
 - Dejar columnas opcionales sin justificación genera lógica ternaria con `NULL` (`TRUE`, `FALSE`, `UNKNOWN`), causando errores sutiles en comparaciones.

---

## Comparativa entre Motores

| Característica | PostgreSQL | MySQL / MariaDB | SQLite / libSQL | MSSQL |
|---|---|---|---|---|
| **Tipo Auto-incremental** | `IDENTITY` / `SERIAL` | `AUTO_INCREMENT` | `INTEGER PRIMARY KEY AUTOINCREMENT` | `IDENTITY(1,1)` |
| **UUID Nativo** | Sí (`UUID`) | Emulado (`BINARY(16)` o `CHAR(36)`) | Emulado (`TEXT` o `BLOB`) | `UNIQUEIDENTIFIER` |
| **Integridad de FK por defecto** | Habilitada | Habilitada (en motor InnoDB) | **Deshabilitada** (requiere `PRAGMA foreign_keys=ON`) | Habilitada |
| **Tablas sin PK** | Permitidas (desaconsejadas) | Genera clave oculta (`GEN_CLUST_INDEX`) | Genera `rowid` oculto | Heap (sin clusterizar) |

---

## Caja de Herramientas para el Docente

### Preguntas Disparadoras para Clase
1. *¿Por qué un `UUIDv4` generado aleatoriamente puede fragmentar un índice B-Tree a gran escala frente a un `BIGINT` secuencial o un `UUIDv7` ordenado por tiempo?*
2. *Si un sistema requiere registrar transacciones financieras históricas, ¿por qué `ON DELETE CASCADE` es una violación crítica de auditoría?*
3. *¿Cuándo es aceptable desnormalizar una base de datos a propósito? (Respuesta clave: En almacenes de datos OLAP para reporting donde priman las lecturas agregadas).*

### Ejercicio de Laboratorio
Diseña el esquema DDL para un sistema de biblioteca universitaria con alumnos, libros, ejemplares físicos y préstamos con penalización por día de retraso. Aplica 3FN y define restricciones `CHECK` y `UNIQUE` apropiadas.
