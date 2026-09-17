# Pin via --build-arg MSSQL_BASE_TAG=2022-CU<N>-ubuntu-22.04 for production (see mcr.microsoft.com/en-us/product/mssql/server/tags).
ARG MSSQL_BASE_TAG=2022-latest
FROM mcr.microsoft.com/mssql/server:${MSSQL_BASE_TAG}

ENV ACCEPT_EULA=Y
ENV SA_PASSWORD=Sandbox123!
ENV MSSQL_PID=Developer

COPY seed/mssql-seed.sql /tmp/seed.sql
COPY --chmod=755 mssql/entrypoint.sh /tmp/entrypoint.sh

CMD ["bash", "/tmp/entrypoint.sh"]
