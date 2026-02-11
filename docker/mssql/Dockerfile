FROM mcr.microsoft.com/mssql/server:2022-latest

ENV ACCEPT_EULA=Y
ENV SA_PASSWORD=Sandbox123!
ENV MSSQL_PID=Developer

COPY seed/mssql-seed.sql /tmp/seed.sql
COPY --chmod=755 mssql/entrypoint.sh /tmp/entrypoint.sh

CMD ["bash", "/tmp/entrypoint.sh"]
