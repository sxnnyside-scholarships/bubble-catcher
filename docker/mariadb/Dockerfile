FROM mariadb:11

COPY seed/mysql-seed.sql /docker-entrypoint-initdb.d/01-seed.sql

ENV MYSQL_ROOT_PASSWORD=sandbox
ENV MYSQL_DATABASE=sandbox
