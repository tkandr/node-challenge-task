# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **job application test task** implementing a Token Price Service using NestJS. The project intentionally contains anti-patterns and bugs as part of the challenge. The goal is to refactor it into a **production-ready service** with:
- Metrics and monitoring
- Health checks
- "Fail fast" error handling
- Transactional outbox pattern for Kafka messages

**Important**: The interviewer expects you to make architectural decisions and improvements beyond what's documented in the README. For example, while the current implementation uses TypeORM, the plan is to migrate to **Drizzle ORM** for better type safety, performance, and developer experience. Don't treat the README as a fixed specification - it's a starting point for improvements.

**⚠️ CRITICAL: Read [INTERVIEWER_EXPECTATIONS.md](INTERVIEWER_EXPECTATIONS.md) before starting work!**

This document contains detailed analysis of the interviewer's feedback on previous submissions. It covers:
- What makes a solution successful vs. what causes failure
- Critical requirements (observability, horizontal scalability, transactional outbox)
- Performance pitfalls to avoid (OOM errors, N+1 queries)
- Code quality expectations and architecture patterns
- The interviewer's specific preferences and anti-patterns to avoid

## Development Commands

### Essential Commands
```bash
# Install dependencies
npm install

# Start the application (requires Docker dependencies running)
npm start

# Start in development mode with hot reload
npm start:dev

# Start in debug mode
npm start:debug

# Build the application
npm build

# Run tests (uses Testcontainers - Docker required)
npm test

# Run tests in watch mode
npm test:watch

# Run tests with coverage
npm test:cov
```

### Database Commands
```bash
# Run migrations
npm run migration:run

# Generate new migration from entity changes
npm run migration:generate -- src/migrations/MigrationName

# Create empty migration file
npm run migration:create -- src/migrations/MigrationName

# Revert last migration
npm run migration:revert

# Seed database with initial data
npm run db:seed
```

### Docker Commands
```bash
# Start PostgreSQL and Kafka dependencies
docker compose up -d

# Stop dependencies
docker compose down

# Stop and remove volumes (clean slate)
docker compose down -v
```

### Linting and Formatting
```bash
# Lint code
npm run lint

# Format code with Prettier
npm run format
```

## Architecture Overview

### NestJS Dependency Injection Structure
The application uses NestJS DI throughout:
- **AppModule** ([src/app.module.ts](src/app.module.ts)) - Root module that imports:
  - DrizzlePostgresModule for database access
  - RedisModule for distributed locking
  - MessagingModule for message producer abstraction
  - ScheduleModule for cron jobs
- Services are provided through NestJS providers array and depend on interfaces, not concrete implementations
- **MessagingModule** provides the MESSAGE_PRODUCER token, allowing easy switching between messaging implementations

### Core Service Flow
1. **Application starts** → [src/main.ts](src/main.ts)
2. **AppModule** validates critical service connections (fail-fast pattern):
   - PostgreSQL: Executes test query to verify connectivity
   - Redis: Performs PING command to verify connectivity
   - Kafka: Connects to brokers with 10-second timeout
   - **If any service is unavailable, the application exits immediately with error code 1**
3. **TokenPriceUpdateService** → Runs on cron schedule (default: every 5 seconds)
4. **OutboxProcessorService** → Runs on cron schedule (default: every 2 seconds)
5. **Price Update Flow (with Transactional Outbox)**:
   - Fetch chain tokens in batches (default: 100 per batch)
   - For each token, get new price from MockPriceService
   - Within a single database transaction:
     - Update current price in chain_tokens table
     - Insert price change log entry
     - Store Kafka message in outbox_events table (status: PENDING)
   - Transaction commits atomically - if any step fails, everything rolls back
6. **Outbox Processing Flow**:
   - OutboxProcessorService fetches PENDING events from outbox_events in FIFO order
   - Publishes each event via IMessageProducer interface (currently Kafka implementation)
   - On success: marks event as SENT
   - On failure: increments retry count (max 5 retries), then marks as FAILED

### Data Model (Normalized Schema with Drizzle ORM)
- **chains** ([src/database/schema/token-prices.schema.ts](src/database/schema/token-prices.schema.ts)) - Blockchain networks
- **tokens** - Abstract token metadata (symbol, name, logo URLs) shared across chains
- **chain_tokens** - Token deployments on specific chains with current price
- **price_change_log** - Historical price tracking for time-series analysis
- **outbox_events** ([src/database/schema/outbox.schema.ts](src/database/schema/outbox.schema.ts)) - Transactional outbox for guaranteed Kafka message delivery
  - Indexed on (status, createdAt) for efficient FIFO processing
  - Supports retry logic with retry count and error tracking
  - Status enum: PENDING, SENT, FAILED

#### Seeded Test Data
The database is automatically seeded with realistic test data via migration [0002_seed-tokens-data.sql](src/database/migrations/0002_seed-tokens-data.sql):
- **9 chains**: Ethereum (chainId: 1), Polygon (137), Arbitrum (42161), Optimism (10), Base (8453), Avalanche (43114), BNB Chain (56), Bitcoin, Solana
- **19 tokens**: ETH, USDC, USDT, WBTC, DAI, MATIC, ARB, OP, AVAX, BNB, LINK, UNI, BTC, SOL, RAY, ORCA, JUP, BONK, JTO
- **50+ chain_tokens**: Token deployments across different chains (e.g., USDC on Ethereum, Polygon, Arbitrum, etc.)
- **All IDs use fixed UUIDv7 values** for deterministic, predictable testing - tests can reference exact IDs
- **Example fixed IDs**:
  - Ethereum chain: `019a027e-d779-7444-9b8b-23779e6550d7`
  - USDC token: `019a027e-d7f3-7444-9b8b-731d87a05de1`
  - USDC on Ethereum (0xa0b86991...): `019a027e-d7f3-7444-9b8b-731d87a05de1` (token_id), `019a027e-d779-7444-9b8b-23779e6550d7` (chain_id)
- Prices are set to realistic values in satoshi format (e.g., $1.00 USDC = 100000000, $2500 ETH = 250000000000)

### Messaging Architecture
- **MessagingModule** ([src/messaging/messaging.module.ts](src/messaging/messaging.module.ts)) - Provides a generic message producer abstraction
- **IMessageProducer** ([src/messaging/message-producer.interface.ts](src/messaging/message-producer.interface.ts)) - Generic interface for message producers
  - Allows switching between different messaging protocols (Kafka, ZeroMQ, RabbitMQ) without changing business logic
  - Services depend on the interface, not the concrete implementation
  - Switch implementations by changing a single line in MessagingModule
- **KafkaProducerService** ([src/messaging/kafka-producer.service.ts](src/messaging/kafka-producer.service.ts)) - Default Kafka implementation
  - Connects to `localhost:9092` by default
  - Sends messages to `token-price-updates` topic
  - Messages are validated with Zod schema before sending
  - Configured with GZIP compression and idempotent producer settings
- **Now integrated with transactional outbox pattern** - messages are published by OutboxProcessorService via the IMessageProducer interface, not directly by price update service

### Database
- Uses **Drizzle ORM** with PostgreSQL for type safety and performance
- Schema definitions in [src/database/schema/](src/database/schema/)
- Migrations generated with Drizzle Kit: `npm run migration:generate -- src/migrations/MigrationName`
- Default connection: `localhost:5432`, user: `postgres`, password: `postgres`, database: `tokens`
- Connection pooling configured via Drizzle Postgres module

### Testing Strategy
- Integration tests use **Testcontainers** to spin up real PostgreSQL and Kafka containers
- Tests are in [src/test/integration/](src/test/integration/)
- **Important**: Tests can take 2+ minutes to run due to container startup time

## Production Readiness Status

### Implemented Features

1. **Transactional Outbox Pattern** ✅:
   - Messages stored in outbox_events table within same transaction as price updates ([src/services/token-price-update.service.ts](src/services/token-price-update.service.ts))
   - Separate OutboxProcessorService publishes messages from outbox to Kafka ([src/services/outbox-processor.service.ts](src/services/outbox-processor.service.ts))
   - Ensures at-least-once delivery and prevents message loss on Kafka failures
   - Retry logic with max 5 attempts
   - FIFO ordering maintained via indexed (status, createdAt) queries

2. **Horizontal Scalability** ✅:
   - Distributed locking via Redis ([src/services/distributed-lock.service.ts](src/services/distributed-lock.service.ts))
   - Multiple instances can run concurrently - only one processes at a time
   - Locks for both price updates and outbox processing

3. **Batch Processing** ✅:
   - Configurable batch sizes to prevent OOM errors
   - Price updates: default 100 tokens per batch
   - Outbox processing: default 100 events per batch

4. **Health Checks** ✅:
   - **HealthModule** ([src/health/health.module.ts](src/health/health.module.ts)) - Kubernetes-compatible health endpoints
   - `GET /health/live` - Liveness probe (is the process running?)
   - `GET /health/ready` - Readiness probe (are all dependencies healthy?)
   - Checks PostgreSQL, Redis, and Kafka connectivity
   - Fail-fast on startup: App exits immediately if critical services are unavailable
   - Kubernetes example configuration included in module documentation

5. **Fail-Fast Error Handling** ✅:
   - AppModule validates all critical dependencies on startup
   - PostgreSQL: Executes test query with timeout
   - Redis: Performs PING command
   - Kafka: Connects to brokers with 10-second timeout
   - Application exits with error code 1 if any dependency is unavailable
   - Orchestrator (K8s) handles restart and retry logic

### Remaining Enhancements Needed

1. **Metrics & Observability**:
   - Price update counts and duration
   - Outbox processing metrics (pending/sent/failed counts)
   - Kafka message send success/failure rates
   - Database operation latencies

## Configuration

All configuration is managed via environment variables with sensible defaults:

### Cron Job Configuration
- `PRICE_UPDATE_CRON_SCHEDULE` - Cron schedule for price updates (default: `*/5 * * * * *` - every 5 seconds)
- `PRICE_UPDATE_LOCK_TTL_MS` - Lock TTL in milliseconds (default: 30000)
- `PRICE_UPDATE_BATCH_SIZE` - Batch size for token processing (default: 100)
- `OUTBOX_PROCESSOR_CRON_SCHEDULE` - Cron schedule for outbox processing (default: `*/2 * * * * *` - every 2 seconds)
- `OUTBOX_PROCESSOR_LOCK_TTL_MS` - Lock TTL in milliseconds (default: 20000)
- `OUTBOX_PROCESSOR_BATCH_SIZE` - Batch size for outbox event processing (default: 100)

### Database Configuration
- `DB_CONNECTION_STRING` - PostgreSQL connection string (default: `postgresql://postgres:postgres@localhost:5432/tokens`)

### Redis Configuration
- `REDIS_HOST` - Redis host (default: `localhost`)
- `REDIS_PORT` - Redis port (default: 6379)
- `REDIS_PASSWORD` - Redis password (optional)

## Code Style Notes

- All class methods must have explicit access modifiers (`public`, `private`, `protected`)
- Use async/await for all asynchronous operations
- Validate external data with Zod schemas (see [src/models/token-price-update-message.ts](src/models/token-price-update-message.ts))
