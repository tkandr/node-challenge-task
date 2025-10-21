import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { MessagingModule } from '../messaging';

import { DatabaseHealthIndicator } from './indicators/database.health';
import { KafkaHealthIndicator } from './indicators/kafka.health';
import { RedisHealthIndicator } from './indicators/redis.health';
import { HealthController } from './health.controller';

/**
 * Health check module providing Kubernetes-compatible endpoints.
 *
 * Provides two endpoints:
 * - GET /health/live - Liveness probe (process is running)
 * - GET /health/ready - Readiness probe (all dependencies are healthy)
 *
 * These endpoints are designed to work with Kubernetes:
 * ```yaml
 * livenessProbe:
 *   httpGet:
 *     path: /health/live
 *     port: 3000
 *   initialDelaySeconds: 30
 *   periodSeconds: 10
 *
 * readinessProbe:
 *   httpGet:
 *     path: /health/ready
 *     port: 3000
 *   initialDelaySeconds: 5
 *   periodSeconds: 5
 * ```
 */
@Module({
  imports: [TerminusModule, MessagingModule],
  controllers: [HealthController],
  providers: [
    DatabaseHealthIndicator,
    RedisHealthIndicator,
    KafkaHealthIndicator,
  ],
})
export class HealthModule {}
