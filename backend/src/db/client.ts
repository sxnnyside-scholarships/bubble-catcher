import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from '../config';
import * as schema from './schema';

/** Single Postgres connection pool + Drizzle instance, shared across all services. */
export const pgClient = postgres(config.databaseUrl, { max: 10 });

export const db = drizzle(pgClient, { schema });
