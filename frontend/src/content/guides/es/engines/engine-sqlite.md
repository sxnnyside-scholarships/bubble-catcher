# Inmersión en SQLite

## Objetivos de Aprendizaje
- Comprender la arquitectura embebida y sin servidor (*Serverless*) de SQLite.
- Dominar el sistema de **Afinidad de Tipos** (*Type Affinity*) y sus diferencias con los motores relacionales rígidos.
- Explicar el modo de concurrencia **WAL** (*Write-Ahead Logging*) y los bloqueos a nivel de archivo.
- Recordar la activación manual de claves foráneas mediante `PRAGMA foreign_keys = ON;`.

---

## ¿Qué es SQLite y por qué está en miles de millones de dispositivos?

**SQLite** es el motor de base de datos más utilizado y desplegado en la historia de la informática. No es un servicio que corre en un servidor remoto escuchando en un puerto de red (como Postgres en `:5432` o MySQL en `:3306`), sino **una librería compacta escrita en C que se compila y ejecuta directamente dentro del mismo proceso de tu aplicación**.

Todo el estado de la base de datos (tablas, índices, triggers, datos) se almacena en **un único archivo ordinario en disco**, idéntico y portable entre sistemas operativos (Windows, macOS, Linux, iOS, Android).

> *"SQLite no compite contra Oracle o PostgreSQL; SQLite compite contra fopen()."* — Dr. Richard Hipp (creador de SQLite).

---

## La Peculiaridad del Tipado: *Type Affinity*

A diferencia de la mayoría de los motores que imponen tipado estricto por columna, SQLite utiliza un sistema flexible basado en **afinidad de tipos**. Solo existen 5 clases de almacenamiento físico (*Storage Classes*):
1. `NULL`: Valor ausente.
2. `INTEGER`: Entero con signo almacenado en 1, 2, 3, 4, 6 u 8 bytes según su magnitud.
3. `REAL`: Número en punto flotante de 8 bytes (IEEE 754).
4. `TEXT`: Cadena de caracteres en codificación UTF-8, UTF-16BE o UTF-16LE.
5. `BLOB`: Secuencia binaria exacta tal cual se insertó.

```sql
-- En SQLite esto es perfectamente legal:
CREATE TABLE datos_flexibles (
 id INTEGER PRIMARY KEY,
 edad INTEGER
);

-- Inserta un entero normal:
INSERT INTO datos_flexibles VALUES (1, 25);

-- ¡Inserta texto en una columna INTEGER sin arrojar error!
INSERT INTO datos_flexibles VALUES (2, 'veinticinco');

-- Consulta el tipo de almacenamiento real de cada fila:
SELECT id, edad, typeof(edad) FROM datos_flexibles;
-- Fila 1: integer
-- Fila 2: text
```

> [!WARNING]
> Para estudiantes de sistemas formados en tipado estricto, esto puede resultar desconcertante. Para forzar rigidez moderna en SQLite 3.37+, se puede declarar la tabla con la cláusula `STRICT`:
> `CREATE TABLE usuarios (id INT, correo TEXT) STRICT;`

---

## Concurrencia y el Modo WAL (*Write-Ahead Logging*)

En el modo tradicional de SQLite (Rollback Journal):
- Mientras alguien escribe (`INSERT/UPDATE`), nadie puede leer ni escribir (bloqueo exclusivo del archivo entero).

En el modo moderno **WAL**:
```sql
PRAGMA journal_mode = WAL;
```
- Las escrituras se añaden secuencialmente a un archivo temporal `-wal`.
- **Múltiples lectores concurrentes pueden leer sin bloquear al escritor**, y el escritor no bloquea a los lectores.
- Sigue habiendo un **único escritor a la vez**, por lo que SQLite es ideal para lecturas masivas y escrituras moderadas en un solo nodo.

---

## La Trampa Histórica de las Claves Foráneas

Por razones de compatibilidad con versiones de hace más de 20 años, **SQLite desactiva la validación de claves foráneas de forma predeterminada**.

```sql
-- [INCORRECTO] Si ejecutas esto sin configurar nada:
CREATE TABLE cursos (id INT PRIMARY KEY);
CREATE TABLE alumnos (id INT, curso_id INT REFERENCES cursos(id));

-- Insertará el alumno con curso_id = 999 aunque no exista en cursos!
INSERT INTO alumnos VALUES (1, 999); -- ¡Permitido silenciosamente!

-- [OPTIMIZADO] DEBES ACTIVARLO EN CADA CONEXIÓN:
PRAGMA foreign_keys = ON;
```

---

## SQLite en el Sandbox de Bubble Catcher

En Bubble Catcher:
- Las consultas en SQLite se ejecutan directamente en un contenedor ultra-ligero con `sqlite3 :memory:` o sobre archivos efímeros montados en RAM.
- La ejecución es casi instantánea (sub-milisegundo) al no haber sobrecarga de red de red TCP/IP ni autenticación de sockets.

---

## Caja de Herramientas para el Docente

### Preguntas Disparadoras para Clase
1. *¿Por qué SQLite es la elección estándar para aplicaciones móviles (iOS/Android) y software de escritorio frente a montar un servidor cliente-servidor como MySQL?*
2. *¿Qué ocurre si dos procesos en dos máquinas distintas montan la misma base de datos SQLite a través de una red compartida NFS o SMB? (Respuesta: Riesgo extremo de corrupción de bloqueos de archivo).*
3. *¿Por qué la directiva `WITHOUT ROWID` en tablas con clave primaria compuesta optimiza tanto el almacenamiento como la velocidad en SQLite?*

### Ejercicio de Laboratorio
Escribe un script SQL en el Playground de Bubble Catcher que defina dos tablas con relación de clave foránea. Demuestra la diferencia de comportamiento al intentar violar la integridad referencial antes y después de ejecutar `PRAGMA foreign_keys = ON;`.
