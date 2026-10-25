// Phase-one generation remains limited to Germany and small/medium businesses.
export const companyCatalog = {
  countries: [
    { value: 'DE', label: 'Германия', supported: true },
    { value: 'AT', label: 'Австрия', supported: false },
    { value: 'CH', label: 'Швейцария', supported: false },
    { value: 'NL', label: 'Нидерланды', supported: false },
    { value: 'FR', label: 'Франция', supported: false },
    { value: 'BE', label: 'Бельгия', supported: false },
    { value: 'LU', label: 'Люксембург', supported: false },
    { value: 'IE', label: 'Ирландия', supported: false },
    { value: 'SE', label: 'Швеция', supported: false },
    { value: 'DK', label: 'Дания', supported: false }
  ],
  scales: [
    { value: 'micro', label: 'Микрокомпания', supported: false },
    { value: 'small', label: 'Небольшая компания', supported: true },
    { value: 'medium', label: 'Средняя компания', supported: true },
    { value: 'large', label: 'Крупная компания', supported: false },
    { value: 'enterprise', label: 'Международная группа', supported: false }
  ],
  brands: ['Nordquell', 'Datenhain', 'Wertblick', 'Faktorpfad', 'Klarbogen', 'Marktweise', 'Quellenwerk', 'Rheinblick Analytics', 'Wertspur', 'Datenlotse', 'Fokusfeld', 'Analysepfad'],
  directions: ['ИИ для анализа финансовой отчётности', 'ИИ для анализа альтернативных инвестиционных данных', 'ИИ для исследования кредитных рисков', 'ИИ для мониторинга корпоративных событий', 'ИИ для анализа отраслей и цепочек поставок', 'ИИ для исследования устойчивости инвестиционных портфелей'],
  serviceTypes: ['Исследовательские отчёты для профессиональных инвесторов', 'Мониторинг данных и аналитические уведомления', 'Подготовка и нормализация данных для аналитических команд', 'Сервис сравнительного анализа компаний', 'Аналитическая поддержка инвестиционной проверки', 'Поиск и систематизация источников для инвестиционных исследований']
};
