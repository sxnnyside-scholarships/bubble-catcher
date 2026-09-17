FROM mysql:8.0

# No baked-in seed data — each project's schema/rows are applied per-request by the
# executor (container.exec, after readiness) from the project's stored schema_sql.
ENV MYSQL_ROOT_PASSWORD=sandbox
ENV MYSQL_DATABASE=sandbox
