/** Derives a safe, deterministic database name for a project's isolated namespace inside the shared,
 * admin-managed server container (see sandbox/lifecycle.service.ts). One project = one database, so
 * two students' schemas can never collide inside the same running Postgres/MySQL/MariaDB/MSSQL instance. */
export function projectDatabaseName(projectId: string): string {
  const hex = projectId.replace(/-/g, '').toLowerCase();
  return `proj_${hex}`;
}
