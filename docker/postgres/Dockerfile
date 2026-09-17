FROM postgres:16-alpine

# No baked-in seed data — each project's schema/rows are applied per-request by the
# executor (container.exec, after readiness) from the project's stored schema_sql.
ENV POSTGRES_PASSWORD=sandbox
ENV POSTGRES_DB=sandbox
