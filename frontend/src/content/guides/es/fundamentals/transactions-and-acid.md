# Transacciones y Propiedades ACID

## Objetivos de Aprendizaje
- Comprender formal y prácticamente los cuatro pilares de **ACID** (Atomicidad, Consistencia, Aislamiento, Durabilidad).
- Dominar el control de transacciones con `BEGIN`, `COMMIT`, `ROLLBACK` y puntos de guardado (`SAVEPOINT`).
- Analizar los cuatro niveles de aislamiento estándar ANSI SQL y los fenómenos de concurrencia que previenen.
- Entender el concepto de **MVCC** (*Multiversion Concurrency Control*) y la prevención de bloqueos mutuos (*Deadlocks*).

---

## Modelo Mental: La Transferencia Bancaria Imposible de Romper

Imagina transferir $100 de la Cuenta A a la Cuenta B:
1. Restar $100 de A.
2. Sumar $100 a B.

¿Qué ocurre si el servidor se apaga repentinamente entre el paso 1 y el paso 2? **El dinero desaparecería**.
Una **transacción** es un contrato sagrado: agrupa múltiples operaciones en una sola unidad lógica indivisible. O se ejecutan todas con éxito, o el sistema revierte el estado como si nada hubiera ocurrido jamás.

---

## Los Cuatro Pilares de ACID

```
 ┌───────────────┬─────────────────────────────────────────────────────────────┐
 │ A - ATOMICITY │ "Todo o nada". Si una instrucción falla, se hace ROLLBACK. │
 ├───────────────┼─────────────────────────────────────────────────────────────┤
 │ C - CONSIST. │ La base de datos pasa de un estado válido a otro válido, │
 │ │ respetando todas las restricciones (FK, UNIQUE, CHECK). │
 ├───────────────┼─────────────────────────────────────────────────────────────┤
 │ I - ISOLATION │ Transacciones simultáneas no se interfieren mutuamente. │
 ├───────────────┼─────────────────────────────────────────────────────────────┤
 │ D - DURABIL. │ Una vez hecho COMMIT, los cambios sobreviven a caídas │
 │ │ eléctricas (gracias al Write-Ahead Logging / WAL). │
 └───────────────┴─────────────────────────────────────────────────────────────┘
```

### Sintaxis Estándar de Transacción
```sql
BEGIN TRANSACTION;

-- Paso 1: Débito
UPDATE cuentas 
SET saldo = saldo - 100.00 
WHERE id = 'cuenta-origen-uuid' AND saldo >= 100.00;

-- Paso 2: Crédito
UPDATE cuentas 
SET saldo = saldo + 100.00 
WHERE id = 'cuenta-destino-uuid';

-- Si todo salió bien, consolidar en disco
COMMIT;

-- Si algo falló durante la ejecución:
-- ROLLBACK;
```

---

## Niveles de Aislamiento y Fenómenos de Concurrencia

Cuando múltiples usuarios leen y escriben al mismo tiempo, el estándar SQL define 4 niveles de aislamiento:

### Los Fenómenos Indeseados
- **Dirty Read (Lectura Sucia):** La transacción 2 lee datos modificados por la transacción 1 que aún no han hecho `COMMIT` (y que luego hacen `ROLLBACK`).
- **Non-Repeatable Read (Lectura No Repetible):** La transacción 1 lee una fila, la transacción 2 modifica esa fila y hace `COMMIT`. La transacción 1 vuelve a leer y encuentra datos diferentes.
- **Phantom Read (Lectura Fantasma):** La transacción 1 ejecuta un rango (`WHERE saldo > 1000`). La transacción 2 inserta una nueva fila en ese rango y hace `COMMIT`. La transacción 1 vuelve a consultar y aparece una fila "fantasma".

### Matriz de Aislamiento ANSI SQL
| Nivel de Aislamiento | Lectura Sucia | Lectura No Repetible | Lectura Fantasma | Costo en Rendimiento |
|---|---|---|---|---|
| **Read Uncommitted** | Permitida | Permitida | Permitida | Máximo rendimiento (inseguro) |
| **Read Committed** *(Default en Postgres/Oracle/SQLServer)* | Bloqueada | Permitida | Permitida | Balance óptimo para OLTP |
| **Repeatable Read** *(Default en MySQL InnoDB)* | Bloqueada | Bloqueada | Bloqueada (en InnoDB) | Mayor uso de snapshots de memoria |
| **Serializable** | Bloqueada | Bloqueada | Bloqueada | Máxima seguridad, alto riesgo de abortos |

---

## MVCC: Por Qué los Lectores no Bloquean a los Escritores

En motores modernos (PostgreSQL, MySQL InnoDB, SQLite WAL):
- Cuando escribes un `UPDATE`, el motor **no sobrescribe la fila original en el archivo**.
- Crea una **nueva versión** de la fila con metadatos de visibilidad temporal (`xmin`/`xmax` en Postgres o punteros al *Undo Log* en MySQL).
- Los usuarios que están leyendo continúan viendo la versión previa sin esperar bloqueos de lectura.
- Un proceso en segundo plano (*Vacuum* o *Purge Threads*) limpia las versiones antiguas cuando ya ninguna transacción activa las necesita.

---

## Deadlocks: La Trampa Mortal

Un **Deadlock** ocurre cuando dos transacciones esperan mutuamente por recursos bloqueados por la otra:
- **Transacción 1:** Bloquea fila A y necesita fila B.
- **Transacción 2:** Bloquea fila B y necesita fila A.
- **Resolución:** El motor detecta el ciclo de espera, aborta una de las dos transacciones con error de *Deadlock*, y permite que la otra continúe.

> [!TIP]
> **Regla de Oro contra Deadlocks:** En tu código de aplicación, **adquiere siempre los bloqueos en el mismo orden determinista** (ej. ordenar siempre los IDs antes de hacer `UPDATE`).

---

## Caja de Herramientas para el Docente

### Preguntas Disparadoras para Clase
1. *¿Por qué el nivel de aislamiento `Serializable` puede provocar que tu aplicación reciba errores frecuentes de "Could not serialize access" y requiera mecanismos de reintento (*retry loops*)?*
2. *¿Qué es el archivo Write-Ahead Log (WAL) y por qué escribir en el WAL de forma secuencial es órdenes de magnitud más rápido que modificar páginas aleatorias de la base de datos?*
3. *¿Por qué un `SAVEPOINT` es útil en arquitecturas transaccionales complejas para manejar excepciones sin descartar toda la transacción?*

### Ejercicio de Laboratorio
Abre dos conexiones terminales o pestañas en el Playground de Bubble Catcher simulando dos sesiones concurrentes. Configura una transferencia bancaria simultánea entre las mismas dos cuentas en orden inverso y provoca intencionalmente un Deadlock para observar el log de detección del motor.
