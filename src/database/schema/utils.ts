import { sql } from 'drizzle-orm';
import * as t from 'drizzle-orm/pg-core';
export const bytea = t.customType<{ data: Buffer }>({
  dataType() {
    return 'bytea';
  },
  toDriver(value: Buffer): Buffer {
    return value;
  },
  fromDriver(value: unknown): Buffer {
    return value as Buffer;
  },
});

export const timestamptz = (name: string, options: t.PgTimestampConfig = {}) =>
  t.timestamp(name, { withTimezone: true, mode: 'date', ...options });

export const timestamptzDefaultNow = (
  name: string,
  options: t.PgTimestampConfig = {},
) => timestamptz(name, options).defaultNow().notNull();

export const createdAt = timestamptzDefaultNow('created_at');
export const createdUpdatedFields = {
  createdAt,
  updatedAt: timestamptzDefaultNow('updated_at').$onUpdateFn(() => new Date()),
};

export const priceColumn = (name: string) =>
  t.decimal(name, { precision: 30, scale: 0 });

export const uuidv7Default = (name: string) =>
  t.uuid(name).default(sql`uuidv7()`);
