import type { SupportedDialect } from '@shared/types';

export interface GuideLink {
  label: string;
  url: string;
  icon: 'web' | 'fileCode' | 'github';
}

export type GuideCategory = 'fundamentals' | 'engines';

export interface LocalizedMeta {
  title: string;
  summary: string;
}

export interface GuideArticle {
  slug: string;
  category: GuideCategory;
  dialect?: SupportedDialect;
  icon?: string;
  en: LocalizedMeta;
  es: LocalizedMeta;
  links: GuideLink[];
}

export const FUNDAMENTALS_ARTICLES: GuideArticle[] = [
  {
    slug: 'database-structures',
    category: 'fundamentals',
    icon: 'storage',
    en: {
      title: 'Database Structures & Schemas',
      summary: 'Tables, columns, primary/foreign keys, integrity constraints, and normalization (1NF, 2NF, 3NF).',
    },
    es: {
      title: 'Estructuras de Base de Datos y Esquemas',
      summary:
        'Tablas, columnas, claves primarias/foráneas, restricciones de integridad y normalización (1FN, 2FN, 3FN).',
    },
    links: [],
  },
  {
    slug: 'sql-syntax-basics',
    category: 'fundamentals',
    icon: 'code',
    en: {
      title: 'SQL Syntax Basics & Execution Order',
      summary: 'Written vs. logical execution order (FROM to LIMIT), JOIN types, and WHERE vs. HAVING.',
    },
    es: {
      title: 'Sintaxis Básica de SQL y Orden de Ejecución',
      summary: 'Orden de ejecución lógico vs. escrito (de FROM a LIMIT), tipos de JOIN y diferencias WHERE vs. HAVING.',
    },
    links: [],
  },
  {
    slug: 'data-types',
    category: 'fundamentals',
    icon: 'table',
    en: {
      title: 'Data Types & Engine Nuances',
      summary: 'Numeric precision (DECIMAL vs. FLOAT), timestamps with timezone, text types, and implicit cast traps.',
    },
    es: {
      title: 'Tipos de Datos y Particularidades de Motores',
      summary:
        'Precisión numérica (DECIMAL vs. FLOAT), marcas temporales con huso horario, textos y trampas de conversión.',
    },
    links: [],
  },
  {
    slug: 'built-in-functions',
    category: 'fundamentals',
    icon: 'flash',
    en: {
      title: 'Built-in Functions & Aggregations',
      summary:
        'Aggregates (COUNT, SUM, AVG), NULL behavior in COUNT(*), window functions (ROW_NUMBER, RANK), and COALESCE.',
    },
    es: {
      title: 'Funciones Integradas y Agregaciones',
      summary: 'Agregaciones (COUNT, SUM, AVG), comportamiento de NULL en COUNT(*), funciones de ventana y COALESCE.',
    },
    links: [],
  },
  {
    slug: 'indexes-and-performance',
    category: 'fundamentals',
    icon: 'rocket',
    en: {
      title: 'Indexes & Performance Optimization',
      summary: 'B-Tree mechanics, clustered vs. non-clustered, leftmost prefix rule, and reading EXPLAIN plans.',
    },
    es: {
      title: 'Índices y Optimización de Rendimiento',
      summary:
        'Mecánica de árboles B-Tree, clustered vs. non-clustered, regla del prefijo izquierdo y lectura de EXPLAIN.',
    },
    links: [],
  },
  {
    slug: 'transactions-and-acid',
    category: 'fundamentals',
    icon: 'transfer',
    en: {
      title: 'Transactions & ACID Properties',
      summary:
        'Atomicity, Consistency, Isolation, Durability, ANSI isolation levels, MVCC snapshots, and deadlock avoidance.',
    },
    es: {
      title: 'Transacciones y Propiedades ACID',
      summary:
        'Atomicidad, Consistencia, Aislamiento, Durabilidad, niveles de aislamiento ANSI, MVCC y prevención de deadlocks.',
    },
    links: [],
  },
];

export const ENGINE_ARTICLES: GuideArticle[] = [
  {
    slug: 'engine-postgresql',
    category: 'engines',
    dialect: 'postgresql',
    en: {
      title: 'PostgreSQL',
      summary:
        'An open-source object-relational database known for strict standards compliance, JSONB, and extensibility.',
    },
    es: {
      title: 'PostgreSQL',
      summary:
        'Motor objeto-relacional de código abierto reconocido por su cumplimiento de estándares, JSONB y extensibilidad.',
    },
    links: [
      { label: 'Official Site', url: 'https://www.postgresql.org/', icon: 'web' },
      { label: 'Documentation', url: 'https://www.postgresql.org/docs/', icon: 'fileCode' },
      { label: 'Source (GitHub mirror)', url: 'https://github.com/postgres/postgres', icon: 'github' },
    ],
  },
  {
    slug: 'engine-mysql',
    category: 'engines',
    dialect: 'mysql',
    en: {
      title: 'MySQL',
      summary:
        'The widely deployed open-source relational engine with pluggable storage, InnoDB clustered index, and SQL modes.',
    },
    es: {
      title: 'MySQL',
      summary:
        'Motor relacional ampliamente desplegado con almacenamiento conectable, índice clustered en InnoDB y sql_mode.',
    },
    links: [
      { label: 'Official Site', url: 'https://www.mysql.com/', icon: 'web' },
      { label: 'Documentation', url: 'https://dev.mysql.com/doc/', icon: 'fileCode' },
      { label: 'Source (GitHub mirror)', url: 'https://github.com/mysql/mysql-server', icon: 'github' },
    ],
  },
  {
    slug: 'engine-mariadb',
    category: 'engines',
    dialect: 'mariadb',
    en: {
      title: 'MariaDB',
      summary:
        'A community-driven fork of MySQL featuring Aria, ColumnStore analytics, and native system-versioned tables.',
    },
    es: {
      title: 'MariaDB',
      summary:
        'Fork comunitario de MySQL con motor Aria, analítica en ColumnStore y tablas versionadas por el sistema.',
    },
    links: [
      { label: 'Official Site', url: 'https://mariadb.org/', icon: 'web' },
      { label: 'Documentation', url: 'https://mariadb.com/kb/en/', icon: 'fileCode' },
      { label: 'Source (GitHub)', url: 'https://github.com/MariaDB/server', icon: 'github' },
    ],
  },
  {
    slug: 'engine-sqlite',
    category: 'engines',
    dialect: 'sqlite',
    en: {
      title: 'SQLite',
      summary:
        'A self-contained, serverless database engine running inside process memory or a single portable file on disk.',
    },
    es: {
      title: 'SQLite',
      summary:
        'Motor sin servidor autocontenido que se ejecuta en la memoria del proceso o en un único archivo portátil en disco.',
    },
    links: [
      { label: 'Official Site', url: 'https://www.sqlite.org/', icon: 'web' },
      { label: 'Documentation', url: 'https://www.sqlite.org/docs.html', icon: 'fileCode' },
      { label: 'Source (GitHub mirror)', url: 'https://github.com/sqlite/sqlite', icon: 'github' },
    ],
  },
  {
    slug: 'engine-libsql',
    category: 'engines',
    dialect: 'libsql',
    en: {
      title: 'libSQL',
      summary:
        'An open-contribution fork of SQLite built for edge computing, embedded replicas, and native vector search.',
    },
    es: {
      title: 'libSQL',
      summary:
        'Fork de contribución abierta de SQLite diseñado para edge computing, réplicas embebidas y búsqueda vectorial nativa.',
    },
    links: [
      { label: 'Official Site', url: 'https://turso.tech/libsql', icon: 'web' },
      { label: 'Source (GitHub)', url: 'https://github.com/tursodatabase/libsql', icon: 'github' },
    ],
  },
  {
    slug: 'engine-mssql',
    category: 'engines',
    dialect: 'mssql',
    en: {
      title: 'Microsoft SQL Server',
      summary:
        "Microsoft's enterprise relational platform powered by T-SQL, covering indexes with INCLUDE, and RCSI isolation.",
    },
    es: {
      title: 'Microsoft SQL Server',
      summary:
        'Plataforma relacional empresarial de Microsoft con T-SQL, índices de cobertura con INCLUDE y aislamiento RCSI.',
    },
    links: [
      { label: 'Official Site', url: 'https://www.microsoft.com/en-us/sql-server', icon: 'web' },
      { label: 'Documentation', url: 'https://learn.microsoft.com/en-us/sql/sql-server/', icon: 'fileCode' },
      { label: 'Samples (GitHub)', url: 'https://github.com/microsoft/sql-server-samples', icon: 'github' },
    ],
  },
];

export const ALL_GUIDES: GuideArticle[] = [...FUNDAMENTALS_ARTICLES, ...ENGINE_ARTICLES];

/** Dynamically bundle markdown files at compile time via Vite's raw glob import */
const rawMarkdownFiles = import.meta.glob<string>('./guides/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

export function findGuideBySlug(slug: string): GuideArticle | undefined {
  return ALL_GUIDES.find((article) => article.slug === slug);
}

export function getGuideContent(slug: string, locale: string = 'en'): string {
  const targetLang = locale.startsWith('es') ? 'es' : 'en';

  // 1. Search in target locale
  for (const [path, content] of Object.entries(rawMarkdownFiles)) {
    if (path.includes(`/${targetLang}/`) && path.endsWith(`/${slug}.md`)) {
      return content;
    }
  }

  // 2. Fallback to English if not found
  for (const [path, content] of Object.entries(rawMarkdownFiles)) {
    if (path.includes('/en/') && path.endsWith(`/${slug}.md`)) {
      return content;
    }
  }

  return '';
}
