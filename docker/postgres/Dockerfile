FROM postgres:16-alpine

COPY seed/postgres-seed.sql /docker-entrypoint-initdb.d/01-seed.sql

ENV POSTGRES_PASSWORD=sandbox
ENV POSTGRES_DB=sandbox
