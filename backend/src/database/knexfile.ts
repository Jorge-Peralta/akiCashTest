import { config as loadEnv } from 'dotenv';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Knex } from 'knex';

// ESM has no `__dirname` global, so it's derived from `import.meta.url`.
const __dirname = dirname(fileURLToPath(import.meta.url));

// The Knex CLI changes process.cwd() to this file's directory before
// requiring it, so a bare `import 'dotenv/config'` looks for `.env` in
// src/database instead of the backend root. Resolve from __dirname instead.
loadEnv({ path: join(__dirname, '..', '..', '.env') });

/**
 * Shared Knex configuration.
 *
 * Used in two places:
 *  - The `knex` CLI (migrations), via `--knexfile src/database/knexfile.ts`.
 *  - `KnexModule` (src/database/knex.module.ts), which builds the same
 *    connection options through `@nestjs/config` for the running Nest app.
 *
 * Both read the same env vars (see `.env.example`), so there is a single
 * source of truth for DB connection settings.
 */
const config: Knex.Config = {
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'akicash',
  },
  migrations: {
    directory: join(__dirname, 'migrations'),
    extension: 'ts',
  },
  pool: { min: 0, max: 10 },
};

export default config;
