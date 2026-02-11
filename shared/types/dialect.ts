export const SUPPORTED_DIALECTS = ['mysql', 'mariadb', 'postgresql', 'sqlite', 'mssql'] as const;
export const ENTERPRISE_DIALECTS = ['oracle'] as const;
export const ALL_DIALECTS = [...SUPPORTED_DIALECTS, ...ENTERPRISE_DIALECTS] as const;

export type SupportedDialect = (typeof SUPPORTED_DIALECTS)[number];
export type EnterpriseDialect = (typeof ENTERPRISE_DIALECTS)[number];
export type Dialect = (typeof ALL_DIALECTS)[number];

export function isSupportedDialect(dialect: string): dialect is SupportedDialect {
  return SUPPORTED_DIALECTS.includes(dialect as SupportedDialect);
}

export function isEnterpriseDialect(dialect: string): dialect is EnterpriseDialect {
  return ENTERPRISE_DIALECTS.includes(dialect as EnterpriseDialect);
}
