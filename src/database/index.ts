import { NodePgDatabase } from 'drizzle-orm/node-postgres';

import * as schema from './schema';

export { schema };

export type IDbatabase = NodePgDatabase<typeof schema>;
export const DB_TAG = 'db_tag';
