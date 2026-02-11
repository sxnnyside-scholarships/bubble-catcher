FROM alpine:3.19

RUN apk add --no-cache sqlite

# Keep seed SQL available for in-memory execution at runtime.
# The executor pipes: cat /tmp/seed.sql + user_query | sqlite3 :memory:
COPY seed/sqlite-seed.sql /tmp/seed.sql

ENTRYPOINT ["sh", "-c"]
