# ИНСТРУКЦИЯ ПО ЗАПУСКУ

## Требования
- Node.js 18+ (проверено на v24)
- npm 9+

## Установка
```bash
npm install
```

## Настройка
Скопируй `.env.example` в `server/.env`:
```bash
cp .env.example server/.env
```

Минимальная конфигурация для локальной разработки:
```env
PORT=3000
STORAGE_DRIVER=file
DATA_DIR=./data
MOCK_LLM=true
APP_BASE_URL=http://localhost:3000
```

Для реальной генерации через OpenRouter:
```env
MOCK_LLM=false
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_SPEND_LIMIT_PER_OP_USD=0.10
```

## Запуск в режиме разработки
```bash
npm run dev
```
- Сервер: http://localhost:3000
- Клиент: http://127.0.0.1:5173

## Запуск по отдельности
```bash
# Сервер
cd server && npm run dev

# Клиент
cd client && npm run dev
```

## Сборка и запуск
```bash
npm run build
cd server && node dist/index.js
```

## Тестирование
```bash
npm test        # unit тесты
npm run typecheck
```

## Проверка API
```bash
# Health
curl http://localhost:3000/health

# Список моделей (прокси)
curl http://localhost:3000/api/models

# Создать тестовый/сгенерированный CompanyCore
curl -X POST http://localhost:3000/api/core/create -H "Content-Type: application/json" -d "{\"country\":\"DE\",\"scale\":\"small\"}"
```

## Важные замечания
- Ключ OpenRouter хранится только в `server/.env`, никогда не попадает в клиент
- В мок-режиме (`MOCK_LLM=true`) генерация работает без ключа для тестирования инфраструктуры
- `data/` игнорируется git
- Сгенерированные сайты будут версионироваться (старая версия не перезаписывается)
- Модули будущих направлений должны только читать из `CompanyCore`, не регенерировать core-факты
