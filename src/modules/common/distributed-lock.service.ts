import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { uuidv7 } from 'uuidv7';
import { Injectable, Logger } from '@nestjs/common';

import { tryCatch } from '@debridge/helpers/try-catch.helper';

/**
 * Usually, to ensure that a cron job doesn't start twice, I add a task to a BULL queue with a fixed jobId in the cron job itself.
 * But there's no BULL here, and installing BULL purely for the sake of one lock would be overkill.
 *
 * @see https://medium.com/geekfarmer/managing-distributed-cron-jobs-in-nestjs-from-basic-to-production-ready-solutions-7caed0cc14cf BullMQ with Unique Jobs
 */
@Injectable()
export class DistributedLockService {
  private readonly logger = new Logger(DistributedLockService.name);

  constructor(@InjectRedis() private readonly redis: Redis) {}

  /**
   * Attempts to acquire a distributed lock.
   *
   * @param lockKey - Unique identifier for the lock
   * @param ttlMs - Time-to-live for the lock in milliseconds (default: 30s)
   * @param identifier - Unique identifier for this lock holder (default: random UUID)
   * @returns Lock identifier if acquired, null if lock is already held
   */
  public async acquireLock(
    lockKey: string,
    ttlMs: number = 30000,
    identifier?: string,
  ): Promise<string | null> {
    const lockIdentifier = identifier ?? this.generateIdentifier();

    // SET NX (only if not exists) with PX (milliseconds expiration)
    const { data: result, error } = await tryCatch(
      this.redis.set(lockKey, lockIdentifier, 'PX', ttlMs, 'NX'),
    );

    if (error) {
      this.logger.error(`Failed to acquire lock ${lockKey}:`, error);
      throw error;
    }

    if (result === 'OK') {
      this.logger.debug(
        `Lock acquired: ${lockKey} (identifier: ${lockIdentifier})`,
      );
      return lockIdentifier;
    }

    this.logger.debug(`Lock already held: ${lockKey}`);
    return null;
  }

  /**
   * Releases a distributed lock if the identifier matches.
   * Uses Lua script to ensure atomic check-and-delete.
   *
   * @param lockKey - Unique identifier for the lock
   * @param identifier - Lock identifier from acquireLock
   * @returns true if lock was released, false if lock was not held by this identifier
   */
  public async releaseLock(
    lockKey: string,
    identifier: string,
  ): Promise<boolean> {
    // Lua script to atomically check identifier and delete if matches
    const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;

    const { data: result, error } = await tryCatch(
      this.redis.eval(script, 1, lockKey, identifier),
    );

    if (error) {
      this.logger.error(`Failed to release lock ${lockKey}:`, error);
      throw error;
    }

    if (result === 1) {
      this.logger.debug(
        `Lock released: ${lockKey} (identifier: ${identifier})`,
      );
      return true;
    }

    this.logger.warn(
      `Lock not released (identifier mismatch or expired): ${lockKey}`,
    );
    return false;
  }

  /**
   * Extends the TTL of an existing lock if the identifier matches.
   *
   * @param lockKey - Unique identifier for the lock
   * @param identifier - Lock identifier from acquireLock
   * @param ttlMs - New TTL in milliseconds
   * @returns true if TTL was extended, false if lock was not held by this identifier
   */
  public async extendLock(
    lockKey: string,
    identifier: string,
    ttlMs: number,
  ): Promise<boolean> {
    // Lua script to atomically check identifier and extend TTL if matches
    const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("pexpire", KEYS[1], ARGV[2])
        else
          return 0
        end
      `;

    const { data: result, error } = await tryCatch(
      this.redis.eval(script, 1, lockKey, identifier, ttlMs.toString()),
    );

    if (error) {
      this.logger.error(`Failed to extend lock ${lockKey}:`, error);
      throw error;
    }

    if (result === 1) {
      this.logger.debug(
        `Lock TTL extended: ${lockKey} (identifier: ${identifier}, ttl: ${ttlMs}ms)`,
      );
      return true;
    }

    this.logger.warn(
      `Lock TTL not extended (identifier mismatch or expired): ${lockKey}`,
    );
    return false;
  }

  /**
   * Executes a function with a distributed lock.
   * Automatically acquires and releases the lock.
   *
   * @param lockKey - Unique identifier for the lock
   * @param fn - Function to execute while holding the lock
   * @param ttlMs - Time-to-live for the lock in milliseconds (default: 30s)
   * @returns Result of fn() if lock was acquired, null if lock could not be acquired
   */
  public async withLock<T>(
    lockKey: string,
    fn: () => Promise<T>,
    ttlMs: number = 30000,
  ): Promise<T | null> {
    const identifier = await this.acquireLock(lockKey, ttlMs);

    if (!identifier) {
      return null;
    }

    try {
      return await fn();
    } finally {
      await this.releaseLock(lockKey, identifier);
    }
  }

  /**
   * Generates a unique identifier for lock ownership.
   */
  private generateIdentifier(): string {
    return uuidv7();
  }
}
