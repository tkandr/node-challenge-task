# Interviewer Expectations

This document analyzes feedback from the interviewer (GitHub: @scrobot) on previous submissions to understand what makes a successful solution.

**Source**: Analysis of closed PRs #1-#10 with scrobot's review comments.

---

## Critical Success Factors

### 1. Production-Ready Observability (MANDATORY)
The interviewer consistently emphasizes that the service must be production-ready with full observability:

- **Metrics**: RED/USE metrics are explicitly expected
  - Rate, Errors, Duration (RED)
  - Utilization, Saturation, Errors (USE)
- **Health Checks**: Both liveness and readiness probes
- **Structured Logging**: Not just console.log, but proper structured logging
- **Why it matters**: "не увидел observability(мониторинги, метрики), хелфчеки" was cited as a major gap

### 2. Horizontal Scalability (CRITICAL)
Service must be able to run multiple instances concurrently:

- **Problem**: Several solutions could only run in 1 instance
- **Quote**: "Сервис не готов к масштабированию, и сможет работать только в 1 инстансе"
- **Quote**: "Это будет работать только внутри одного инстанса" (about in-memory locking)
- **Solution**: Use distributed locking (Redis/PostgreSQL advisory locks), not in-memory flags

### 3. Transactional Outbox Pattern (REQUIRED)
Must implement proper transactional outbox for Kafka messages:

- **Quote**: "за реализацию transactional outbox - плюс"
- **Quote**: "Паттерн реализован эталонно, не к чему придраться"
- **Implementation**: Store Kafka messages in DB within same transaction, separate worker publishes them
- **Why**: Prevents data inconsistency if Kafka is down but DB update succeeds

### 4. Fail-Fast Philosophy
Service should fail immediately on critical errors:

- **Quote**: "за fail fast - респект"
- **Application**: Validate configuration at startup, don't start with invalid config
- **Example**: Use strict environment variable validation (Zod schemas)

---

## Database & ORM Expectations

### Migrate Away from TypeORM
TypeORM is intentionally left as a problem to fix:

- **Quote**: "typeorm оставлен из идейных соображений? Почему например не мигрировать на prisma, drizzle?"
- **Quote**: "Оставить TypeOrm - это осознанный выбор? Почему не prisma?"
- **Recommendation**: Migrate to **Drizzle** or Prisma (we chose Drizzle)

### Database Schema Refactoring

#### Normalize the Schema
Current denormalized structure is intentional anti-pattern:

- **Quote**: "Самое мое большое ожидание - это переработка схемы"
- **Token Entity is overloaded**: Chain and Logo data should be separate tables
- **Logo optimization**: "USDC токенов существует буквально сотни, и у них у всех 1 лого"

#### Add Price Feed History
Storing only current price is insufficient:

- **Quote**: "Держать только актуальный price - ненадежно. Я бы добавил еще price feed"
- **Quote**: "здесь был заложена логическая ошибка: Неправильная архитектура для цен. Только текущая цена, нет истории"
- **Solution**: Separate `PriceFeed` table with historical prices

#### Add Database Indexes
- **Quote**: "Не вижу индексов в миграции"
- **Required**: Add indexes on frequently queried columns (chainId, symbol, etc.)

#### Use BigNumber for Decimals
- **Quote**: "parseFloat - это же потеря precision в итоге, если не ошибаюсь. Если в бд decimal, то тут BigNumber нужен"
- **Why**: Financial precision is critical in token price handling

---

## Performance & Scalability Issues

### Avoid OOM Errors

#### Batch Processing
- **Quote**: "А если там 10млн токенов? Точно ли такой метод нужен, который выгрузит все БД в память и положит по ООМ?"
- **Quote**: "Легкий путь словить ООМ. А если там 100млн токенов?"
- **Solution**: Use pagination/streaming, not `.find()` without limits

#### Batch Inserts in Seeder
- **Quote**: "если, условно, через пару лет, у этого сервиса в сидере появится условно много токенов(да хотя бы 1000), то при инициализации сидер будет вызывать инсерты 1000 раз"
- **Solution**: Use batch insert operations

### Database Connection Pool Management
- **Quote**: "При 1000 токенах = 1000 concurrent DB connections"
- **Problem**: Don't create concurrent DB operations for every token
- **Solution**: Process in batches with connection pool limits

### Avoid N+1 Queries
- **Quote**: "Eager loading по умолчанию ведет к N+1 queries при bulk operations"
- **Solution**: Use explicit joins only when needed

### Event Loop Blocking
- **Quote**: "Поллинг на event loop - верный способ словить залипание"
- **Problem**: Polling mechanisms that block the event loop
- **Solution**: Use proper async patterns, message queues

---

## Code Quality & Architecture

### Use NestJS Properly

#### Task Scheduling
- **Quote**: "Почему `setInterval` а не https://docs.nestjs.com/techniques/task-scheduling?"
- **Solution**: Use `@nestjs/schedule` instead of raw `setInterval`

#### Performance
- **Quote**: "Не вижу причин не использовать Fastify по дефолту"
- **Recommendation**: Consider migrating from Express to Fastify for better performance

### Configuration Management

#### Use YAML Config
- **Quote**: "В каком-то смысле это вкусовщина, но я считаю прям best practice, когда вся конфигурация формируется в application.yaml, а не в .env"
- **Preference**: YAML over .env files

#### Avoid Magic Numbers
- **Quote**: "magic numbers" (multiple occurrences)
- **Quote**: "Вижу явный code smell - Magic numbers"
- **Solution**: Extract all hardcoded values to configuration

#### No Environment Access in Constructors
- **Quote**: "Явный антипаттерн `Direct environment access в constructor`"
- **Solution**: Use NestJS ConfigService injection

### Kafka Configuration
- **Quote**: "не вижу в конфигурации serializer/deserializer кафки. Также, неплохо было бы уметь настраивать retry, ssl, batch.size, acknwoledgement, etc."
- **Required**: Comprehensive Kafka producer configuration options

---

## Validation & Type Safety

### Use Zod Everywhere
- **Quote**: "а почему не через zod?"
- **Quote**: "ну вот кажется что `zod.transform` сделал бы красивее и как-то более solid"
- **Application**: Use Zod for all DTOs, not just some models

### Input Validation
- **Quote**: "Без валидации просто сохранить? А если там что-то неугодное?) Почти невозможно, но вдруг sql-инъекция?"
- **Principle**: Validate all inputs before database operations

---

## Testing Strategy

### Focus on Integration Tests
- **Quote**: "Тесты в основном только юнит. Надежность контрактов это обеспечит, легко будет рефакторить, какие-то супер локальные кейсы отлаживать но 99% проблем на уровне интеграции"
- **Principle**: Integration tests > Unit tests for this service

### Don't Mock What You're Testing
- **Quote**: "ну вот тут могу сказать что это скорее минус. Данный код не тестирует ровным счетом ничего. Лучше вообще не покрывать тестами, чем мокать кафку"
- **Strong Opinion**: Use real Kafka in tests (Testcontainers), not mocks

---

## Error Handling & Resilience

### Circuit Breaker Pattern
- **Quote**: "Стилистическая придирка - не вижу смысла паттерн CircuitBreaker выделять прямо на уровне абстракции. Грязновато выглядит. CircuitBreaker - это часть http-протокола. И нужно его внедрять на уровне http-клиента"
- **Where**: HTTP client level, not service level abstraction

### Global Exception Filter
- **Quote**: "Отличная практика! Внедрить GlobalExceptionFilter и формировать словарь ошибок повышает maintainability"
- **Plus**: "Хороший подход. Идеально было бы еще и кастомную иерархию ошибок завести, и на словарь статусов смаппить"
- **Implementation**: Custom error hierarchy with HTTP status code mapping

### Graceful Shutdown
- **Quote**: "За GracefulShutdown - респект. Хорошая практика"
- **Required**: Proper shutdown handling (close DB connections, Kafka producers, etc.)

---

## Code Style Preferences

### Readability Over Verbosity
- **Quote**: "код слишком verbose) Перегружен, сложно читать, методы очень длинные"
- **Quote**: "Хотя нода/тс предполагает наличие ФП. `while (retryCount < maxRetries)` можно обернуть в промисы, rxJs/effect/fp-ts/Ramda подключить"
- **Preference**: Functional programming style, less imperative code

### Abstraction Levels
- **Quote**: "Опять вопрос абстракции - в чем смысл PrismaService? Это же должна быть часть DAO, Repository паттерна"
- **Quote**: "кафка это всего лишь протокол асинхронной доставки. Завтра мы решаем мигрировать на ZeroMQ и опять надо делать глобальный рефакторинг"
- **Principle**: Abstract infrastructure concerns properly (Repository pattern, Message abstraction)

### Domain-Driven Design
- **Quote**: "маппинг и разделение моделей - очень неявный... Есть Entity для БД, Message для кафки, но каких-то промежуточных моделей(по DDD) типа DTO я не увидел"
- **Expected**: Clear separation - Entity, DTO, Message models

---

## Documentation
- **Quote**: "За документацию - плюс"
- **Appreciated**: Good documentation is noticed and valued

---

## AI Usage Policy
- **Quote**: "Плюс что использовался AI. Это круто. Однако, местами, кажется будто реализация не прошла проверку"
- **Quote**: "Код явно сгенерировал AI, а валидацию разработчик не провел. Использовать AI - это буквально требование в нашей компании, но обязательное второе требование - никогда ему не доверять и все перепроверять"
- **Company Policy**: AI is REQUIRED but must be validated thoroughly
- **Key**: AI-generated code must be reviewed and understood by developer

---

## Overall Rating Factors

### What Gets 4/5:
- Solid implementation with production-ready patterns
- Proper error handling and resilience
- Good use of modern tools
- One critical bug or missing observability

### What Fails:
- Missing observability (metrics, health checks, logging)
- Can't scale horizontally
- OOM errors under load
- Poor database design
- Mocking critical infrastructure in tests

### What Gets Respect:
- Transactional outbox implemented well
- Fail-fast configuration validation
- Graceful shutdown handling
- Integration tests with real infrastructure
- Clean error hierarchy and global exception filter
- Good documentation
