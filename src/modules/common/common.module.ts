import { Global, Module } from '@nestjs/common';

import { DistributedLockService } from './distributed-lock.service';

/**
 * CommonModule provides global infrastructure services.
 * Marked as @Global() so these services are available throughout the application
 * without needing to import the module in every feature module.
 *
 * Services:
 * - DistributedLockService: Redis-based distributed locking for horizontal scalability
 */
@Global()
@Module({
  providers: [DistributedLockService],
  exports: [DistributedLockService],
})
export class CommonModule {}
