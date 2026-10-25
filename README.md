# Makecom - Company Profile & Site Generator

Веб-панель для автоматической генерации карточки компании и 3-страничного сайта на её основе.

## Ключевые принципы
- **CompanyCore** - единый источник правды. Все модули читают только из него
- **Факт-реестр** - атомарные факты для кросс-модульной проверки согласованности
- **CoreSnapshot** - снапшот на момент генерации, защита от изменения ядра
- **Модульные контракты** - готовность к расширению до 8 направлений без глобальной переделки
- **Серверный прокси OpenRouter** - ключ только на сервере, лимит расходов, кэш моделей
- **Версионирование сайтов** - при изменении карточки создаётся новая версия

## Стек
- **Backend:** Node.js + TypeScript + Express
- **Frontend:** Vite + TypeScript
- **Хранение:** Файловый адаптер (локально) / Supabase Postgres + Storage (облако)
- **Валидация:** Zod
- **LLM:** OpenRouter

## Структура
```
makecom/
├── server/src/     # Backend (core, validators, storage, services, routes, generators)
├── client/         # Frontend (Vite)
├── docs/           # Документация
└── data/           # Локальное хранилище (gitignored)
```

## Быстрый старт (разработка)
```bash
# Установка зависимостей
npm install

# Настройка окружения
cp .env.example server/.env
# При необходимости настроить server/.env

# Запуск dev-сервера (клиент + сервер)
npm run dev
```

Сервер: http://localhost:3000  
Клиент: http://127.0.0.1:5173

## Переменные окружения (server/.env)
```env
PORT=3000
OPENROUTER_API_KEY=
OPENROUTER_SPEND_LIMIT_PER_OP_USD=0.10
STORAGE_DRIVER=file
DATA_DIR=./data
MOCK_LLM=true  # true для теста без ключа, false для реальной генерации
APP_BASE_URL=http://localhost:3000
```

## Тесты
```bash
npm test
```

## Сборка
```bash
npm run build
```

## Документация
- `docs/ДЛЯ_ЧЕЛОВЕКА_КРАТКОЕ_РУКОВОДСТВО.md` - краткое руководство
- `docs/requirements.md` - требования
- `docs/architecture.md` - архитектура
- `docs/PROJECT_FLOW_EXPLAINED.md` - как работает проект
- `AGENTS.md` - правила для агентов
