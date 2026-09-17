#!/bin/bash
# Start SQL Server in the background
/opt/mssql/bin/sqlservr &

# Wait for SQL Server to be ready
echo "Waiting for SQL Server to start..."
sleep 15

for i in {1..30}; do
  /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "Sandbox123!" -Q "SELECT 1" -C > /dev/null 2>&1
  if [ $? -eq 0 ]; then
    echo "SQL Server is ready."
    break
  fi
  echo "Waiting... ($i)"
  sleep 2
done

# No baked-in seed data — each project's schema/rows are applied per-request by the
# executor (container.exec, after readiness) from the project's stored schema_sql.

# Keep the container running
wait
