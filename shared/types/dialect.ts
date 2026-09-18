export const SUPPORTED_DIALECTS = ['mysql', 'mariadb', 'postgresql', 'sqlite', 'libsql', 'mssql'] as const;

export type SupportedDialect = (typeof SUPPORTED_DIALECTS)[number];
export type Dialect = SupportedDialect;

export function isSupportedDialect(dialect: string): dialect is SupportedDialect {
  return SUPPORTED_DIALECTS.includes(dialect as SupportedDialect);
}

/** Dialects managed as persistent database server containers. */
export const SERVER_BASED_DIALECTS = ['postgresql', 'mysql', 'mariadb', 'mssql'] as const;
export type ServerBasedDialect = (typeof SERVER_BASED_DIALECTS)[number];

export function isServerBasedDialect(dialect: string): dialect is ServerBasedDialect {
  return (SERVER_BASED_DIALECTS as readonly string[]).includes(dialect);
}

/** Response shape for available engine dialects. */
export interface DialectsResponse {
  enabled: SupportedDialect[];
}
