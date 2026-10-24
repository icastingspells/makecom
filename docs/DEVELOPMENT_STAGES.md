# ЭТАПЫ РАЗРАБОТКИ

Разработка будет идти поэтапно. Бизнес-логику генерации добавлю только после заложения механизмов согласованности.

## Этап 0: Скелет (Выполнен)
- [x] Структура папок
- [x] package.json (root/server/client)
- [x] tsconfig
- [x] .gitignore, .env.example
- [x] Базовые заглушки
- [x] Git init, ветки main/dev, первый коммит

## Этап 1: CompanyCore и Fact Registry
**Цель:** Единый источник правды

**Задачи:**
- [ ] `server/src/core/types.ts` - типы CompanyCore, Fact, CoreSnapshot
- [ ] `server/src/core/fact-registry.ts` - реестр атомарных фактов
- [ ] `server/src/core/company-core.ts` - сервис работы с CompanyCore
- [ ] `server/src/core/index.ts` - экспорт

**Критерии готовности:**
- Типы описывают identity/contacts/people/business/product/faq/facts/extensions
- Fact Registry позволяет добавлять/получать факты
- Нельзя модифицировать core-факты через модули (только чтение)

## Этап 2: Storage Layer
**Цель:** Абстракция хранения с поддержкой file и supabase

**Задачи:**
- [ ] `server/src/storage/types.ts` - интерфейс IStorage
- [ ] `server/src/storage/file-adapter.ts` - файловый адаптер для локальной разработки
- [ ] `server/src/storage/supabase-adapter.ts` - адаптер для Supabase (заглушка с TODO, без реальных ключей)
- [ ] `server/src/storage/index.ts` - фабрика выбора адаптера по env

**Критерии готовности:**
- Единый интерфейс для компаний/версий/модулей
- Переключение через `STORAGE_DRIVER`
- Работает с CompanyCore

## Этап 3: Валидаторы (Core + Cross-module)
**Цель:** Механизмы согласованности

**Задачи:**
- [ ] `server/src/validators/core-schema.ts` - Zod схема CompanyCore
- [ ] `server/src/validators/core-validator.ts` - базовая валидация
- [ ] `server/src/validators/cross-module.ts` - проверка соответствия модуля core
- [ ] `server/src/validators/joint.ts` - совместная валидация комплекта
- [ ] `server/src/validators/index.ts`

**Критерии готовности:**
- Валидация обязательных полей
- Проверка отсутствия регенерации core-фактов
- Совместная проверка работает

## Этап 4: Module Contracts и базовая инфраструктура
**Цель:** Фундамент под будущие модули

**Задачи:**
- [ ] `server/src/modules/types.ts` - интерфейс модуля, контракт
- [ ] `server/src/modules/registry.ts` - реестр модулей
- [ ] `server/src/config/env.ts` - валидация env
- [ ] `server/src/services/openrouter.ts` - прокси + кэш моделей + оценка стоимости + лимит (заглушки)

**Критерии готовности:**
- Модуль может только читать из Core
- OpenRouter сервис готов к интеграции с лимитом
- Env валидируется

## Этап 5: Базовые роуты и интеграция
**Цель:** Минимальный API каркас

**Задачи:**
- [ ] `server/src/routes/health.ts`
- [ ] `server/src/routes/core.ts` - работа с CompanyCore
- [ ] `server/src/routes/models.ts` - прокси моделей OpenRouter
- [ ] Подключить роуты в `index.ts`

**Критерии готовности:**
- Health работает
- Базовые эндпоинты отвечают
- Интеграция с Core/Storage

## Текущий фокус
**Сейчас:** Этап 1 - CompanyCore и Fact Registry

## Правила работы по этапам
1. Делаем только текущий этап
2. Пишем читаемый код с комментариями в сложных местах
3. Следуем `docs/CODE_STYLE_AND_RULES.md`
4. Не трогаем бизнес-логику генерации до завершения Этапов 1-4
5. После каждого этапа - краткий коммит в текущей ветке
