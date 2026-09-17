# Tipos de Datos y Particularidades de Motores

## Objetivos de Aprendizaje
- Dominar las familias fundamentales de tipos de datos SQL y su representación física en disco y memoria.
- Comprender la diferencia crítica entre precisión exacta (`NUMERIC`/`DECIMAL`) y precisión flotante (`FLOAT`/`DOUBLE`).
- Explicar por qué almacenar marcas temporales con zona horaria (`TIMESTAMPTZ`) es mandatorio en sistemas modernos.
- Detectar y prevenir la invalidación de índices por conversiones de tipo implícitas.

---

## Modelo Mental: La Caja Correcta para Cada Objeto

Elegir un tipo de dato en SQL equivale a elegir el embalaje de transporte:
- Si usas una caja demasiado grande (`BIGINT` para guardar los meses del año `1-12`), desperdicias espacio de almacenamiento y saturas la memoria caché (*buffer pool*) del servidor.
- Si usas el material equivocado (`FLOAT` para dinero), el contenido se degradará con pequeños errores de redondeo acumulativos que descuadran balances contables.
- Si usas una caja sin etiqueta de huso horario (`TIMESTAMP` sin zona), nadie sabrá cuándo ocurrió exactamente el evento en un sistema distribuido global.

---

## Familias Principales de Tipos de Datos

### 1. Numéricos: La Regla de Oro del Dinero
```sql
-- [INCORRECTO] NUNCA USES FLOAT O REAL PARA DINERO:
-- IEEE 754 causa pérdidas de precisión en sumas acumuladas
CREATE TABLE balance_inseguro (
 saldo FLOAT -- Peligroso: 0.10 + 0.20 = 0.30000000000000004
);

-- [OPTIMIZADO] USA SIEMPRE DECIMAL O NUMERIC PARA VALORES EXACTOS:
CREATE TABLE balance_financiero (
 -- 12 dígitos en total, 2 de ellos para centavos (hasta 9,999,999,999.99)
 saldo NUMERIC(12, 2) NOT NULL DEFAULT 0.00
);
```

### 2. Cadenas de Texto: `CHAR` vs `VARCHAR` vs `TEXT`
| Tipo | Longitud | Almacenamiento en Disco | Cuándo Utilizarlo |
|---|---|---|---|
| `CHAR(n)` | Fija | Rellena con espacios hasta `n` | Códigos de país ISO (`'MX'`, `'US'`), hashes SHA-256 |
| `VARCHAR(n)` | Variable hasta `n` | Guarda los caracteres reales + prefijo de longitud | Nombres, correos, títulos con límite de negocio |
| `TEXT` | Variable ilimitada | Almacena longitud variable (punteros TOAST si es gigante) | Artículos, descripciones largas, logs |

> [!TIP]
> En PostgreSQL moderno, `VARCHAR` y `TEXT` tienen exactamente el mismo rendimiento interno. `VARCHAR(n)` se utiliza principalmente como validación de longitud para proteger la interfaz.

### 3. Fechas y Tiempo: El Huso Horario Importa
- `TIMESTAMP`: Almacena fecha y hora en bruto (ingenua, *naive*). Si un servidor en Nueva York guarda `12:00` y un usuario en Tokio la consulta, verá `12:00` sin saber que ocurrió a otra hora.
- `TIMESTAMP WITH TIME ZONE` (`TIMESTAMPTZ`): Normaliza el valor a UTC al persistirlo en disco y lo proyecta en la zona horaria de la sesión del cliente al consultarlo.

```sql
CREATE TABLE auditoria_eventos (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 accion VARCHAR(50) NOT NULL,
 -- Registra el instante exacto e inmutable a nivel global en UTC
 registrado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

---

## Anti-patrón Crítico: Conversión Implícita de Tipos

Uno de los errores más graves de rendimiento en bases de datos es comparar columnas con literales de distinto tipo:

```sql
-- Suponiendo que 'codigo_empleado' es VARCHAR(20) y tiene un índice B-Tree:

-- [INCORRECTO] CONVERSIÓN IMPLÍCITA: Invalida el índice
SELECT * FROM empleados WHERE codigo_empleado = 10452;

-- ¿Qué hace el motor en realidad?
-- Transforma cada fila de la tabla: WHERE CAST(codigo_empleado AS INTEGER) = 10452
-- Resultado: FULL TABLE SCAN sobre millones de registros.
```

```sql
-- [OPTIMIZADO] COMPARACIÓN CON EL TIPO CORRECTO: Usa el índice directamente
SELECT * FROM empleados WHERE codigo_empleado = '10452';
```

*Regla de Bubble Catcher:* `implicit-type-conversion` (Severidad: Warning).

---

## El Caso Especial de SQLite: *Type Affinity*

A diferencia de PostgreSQL o SQL Server (que tienen tipado rígido), **SQLite utiliza afinidad de tipos**:
- Si declaras una columna como `INTEGER`, pero insertas la cadena `'manzana'`, SQLite **permitirá la inserción sin arrojar error**.
- Guarda el tipo de dato en el valor individual, no en la definición de la columna.
- En `libSQL`, se mantienen estas afinidades con extensiones estrictas configurables.

---

## Caja de Herramientas para el Docente

### Preguntas Disparadoras para Clase
1. *¿Por qué calcular `AVG(calificacion)` sobre una columna `INT` en algunos motores produce división entera truncada (ej. `7 / 2 = 3`) y cómo se previene con `CAST`?*
2. *¿Por qué almacenar una fecha de nacimiento como `VARCHAR(10)` (`'DD/MM/YYYY'`) impide el ordenamiento cronológico natural en `ORDER BY`?*
3. *¿Qué ventajas de almacenamiento e indexación ofrece el tipo `JSONB` de PostgreSQL frente a un `TEXT` que contiene JSON en SQLite o MySQL clásico?*

### Ejercicio de Laboratorio
Crea una tabla para un sistema de reservas de hotel con columnas para precio por noche, porcentaje de descuento, fecha de check-in y fecha de check-out. Selecciona los tipos de datos óptimos para garantizar que no existan errores de redondeo en el cálculo del total con impuestos.
