import 'dotenv/config';

import { Config } from 'drizzle-kit';

import { dbConfigObj } from '@debridge/config/db.config';

const config = {
  schema: './src/database/schema/index.ts',
  out: './src/database/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: dbConfigObj.connectionString,
  },
} satisfies Config;

export default config;
