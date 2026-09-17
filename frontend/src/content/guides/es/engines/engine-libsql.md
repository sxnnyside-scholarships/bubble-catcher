# Inmersión en libSQL

## Objetivos de Aprendizaje
- Comprender qué es **libSQL**, su relación con SQLite y por qué fue creado por la comunidad de Turso.
- Dominar el concepto de **Réplicas Embebidas** (*Embedded Replicas*) para arquitecturas distribuidas y Edge Computing.
- Conocer los protocolos de comunicación modernos sobre SQLite (HTTP, WebSockets y protocolo Hrana).
- Explicar las capacidades nativas de **Búsqueda Vectorial** (*Vector Search*) para aplicaciones con Inteligencia Artificial.

---

## ¿Qué es libSQL y por qué era necesario?

SQLite es una obra maestra de la ingeniería, pero su gobernanza sigue el principio de *"Open Source, not Open Contribution"*: el código es libre para su uso, pero el equipo central de SQLite no acepta parches, PRs de GitHub ni contribuciones externas de la comunidad.

En 2022, **Turso** lanzó **libSQL**: un fork de código abierto y contribución comunitaria diseñado para llevar la simplicidad y velocidad de SQLite a la era de la **computación Serverless, el Edge y la Inteligencia Artificial**.

> *"libSQL toma el motor ultra-rápido de SQLite y le añade replicación distribuida, conectividad de red sobre WebSockets/HTTP y soporte nativo para embeddings vectoriales."*

---

## Las Innovaciones Clave de libSQL

### 1. Réplicas Embebidas (*Embedded Replicas*)
El santo grial de la latencia en aplicaciones web globales:
- En lugar de que cada servidor viaje a una base de datos central en Virginia o Frankfurt (tardando 100-200ms por consulta):
- Cada nodo en el Edge (Cloudflare Workers, Vercel, servidores locales) mantiene **un archivo local sincronizado**.
- **Las lecturas ocurren localmente en 0.2 ms.**
- **Las escrituras se propagan automáticamente al servidor primario**, que replica el cambio hacia todos los nodos mediante el Write-Ahead Log.

### 2. Conectividad HTTP / WebSockets (sqld y protocolo Hrana)
- SQLite tradicional requiere enlazar librerías binarias compiladas en C. En entornos serverless efímeros (como funciones serverless en JavaScript), esto es difícil de empaquetar y consume memoria.
- libSQL incluye **sqld** (*libSQL Server*), que expone el motor a través de un protocolo ultraligero sobre WebSockets y HTTP llamado **Hrana**, permitiendo consultar la base de datos con un simple `fetch()`.

### 3. Búsqueda Vectorial Integrada (*Vector Search*)
libSQL incorpora tipos de datos vectoriales nativos para construir sistemas RAG (*Retrieval-Augmented Generation*) sin requerir servicios externos costosos:

```sql
-- Creación de tabla con vector de 1536 dimensiones (estándar de OpenAI)
CREATE TABLE documentos_ia (
 id INT PRIMARY KEY,
 contenido TEXT NOT NULL,
 embedding F32_BLOB(1536)
);

-- Búsqueda de los 3 documentos más similares usando distancia coseno
SELECT id, contenido
FROM documentos_ia
ORDER BY vector_distance_cos(embedding, '[0.012, -0.045, ...]')
LIMIT 3;
```

---

## libSQL vs. SQLite Clásico

| Dimensión | libSQL | SQLite Clásico |
|---|---|---|
| **Modelo de Gobernanza** | Código abierto y contribución comunitaria activa | Código abierto cerrado a contribuciones externas |
| **Acceso por Red** | Nativo vía HTTP / WebSockets (`sqld`) | Requiere drivers locales en C embebidos |
| **Replicación** | Nativa distribuida cliente-servidor | Manual mediante herramientas externas (LiteFS, rqlite) |
| **Búsqueda Vectorial** | Extensión nativa de vectores | No soportada de fábrica (requiere sqlite-vss) |
| **Compatibilidad SQL** | 100% compatible con la sintaxis de SQLite | Estándar canónico |

---

## libSQL en el Sandbox de Bubble Catcher

En Bubble Catcher:
- libSQL se ejecuta emulando tanto el motor de ejecución nativo como validaciones de compatibilidad sintáctica con SQLite.
- Permite a estudiantes experimentar con la sintaxis del edge computing sin necesidad de aprovisionar infraestructura en la nube.

---

## Caja de Herramientas para el Docente

### Preguntas Disparadoras para Clase
1. *¿Por qué el modelo de gobernanza de SQLite motivó a la industria a crear un fork comunitario en lugar de colaborar en el repositorio oficial?*
2. *¿Cómo cambia la arquitectura de software cuando una aplicación lee datos de una réplica local en memoria en lugar de hacer llamadas de red a un clúster RDS o Aurora?*
3. *¿En qué consiste el cálculo de distancia coseno entre embeddings vectoriales y por qué es fundamental para la búsqueda semántica en bases de datos modernas?*

### Ejercicio de Laboratorio
Diseña una consulta SQL en libSQL que almacene fragmentos de un manual de programación con un vector numérico simplificado. Simula una consulta de búsqueda semántica ordenando por distancia vectorial y analiza la estructura del plan de ejecución.
