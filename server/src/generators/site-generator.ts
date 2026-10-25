import { CoreSnapshot } from '../core/types.js';
import { SiteVersion } from '../storage/types.js';
import { randomUUID } from 'crypto';

/**
 * Нормализация текста для безопасной вставки в HTML
 * Заменяет typographic dash на обычный дефис, экранирует HTML-сущности
 */
function normalizeText(s: string): string {
  return s
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2212]/g, '-')  // typographic dashes
    .replace(/[\u00A0\u202F\u2007]/g, ' ')                // non-breaking spaces
    .replace(/[\u2018\u2019\u02BC]/g, "'")                // smart quotes
    .replace(/[\u201C\u201D]/g, '"')                      // smart double quotes
    .replace(/\u2026/g, '...')                            // ellipsis
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Генератор сайта из снапшота CompanyCore
 * Берёт ТОЛЬКО факты из снапшота. Не придумывает новые факты
 * Работает только со статичными файлами
 */
export class SiteGenerator {
  /**
   * Сгенерировать статичный сайт из снапшота
   */
  generate(snapshot: CoreSnapshot, options: { lang: 'ru' | 'de'; style: string }) {
    const core = snapshot.core;
    const siteId = randomUUID();
    const t = (s: string | undefined) => normalizeText(s ?? '');

    // Шаблоны строятся ТОЛЬКО из фактов core
    const nav = {
      home: options.lang === 'ru' ? 'Главная' : 'Startseite',
      product: options.lang === 'ru' ? 'Продукт' : 'Produkt',
      company: options.lang === 'ru' ? 'Компания и контакты' : 'Unternehmen & Kontakt'
    };

    const files: Record<string, string> = {};

    // index.html
    files['index.html'] = `<!DOCTYPE html>
<html lang="${options.lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t(core.identity.brandName)} - ${t(core.business.specialization)}</title>
  <meta name="description" content="${t(core.business.clientProblem)}">
  <link rel="stylesheet" href="style.css">
  <link rel="icon" href="favicon.ico">
</head>
<body>
  <nav>
    <a href="index.html">${nav.home}</a>
    <a href="product.html">${nav.product}</a>
    <a href="company.html">${nav.company}</a>
  </nav>
  <main>
    <h1>${t(core.identity.brandName)}</h1>
    <p>${t(core.business.specialization)}</p>
    <h2>${options.lang === 'ru' ? 'Для кого' : 'Zielgruppe'}</h2>
    <p>${t(core.business.targetAudience)}</p>
    <h2>${options.lang === 'ru' ? 'Проблема клиента' : 'Kundenproblem'}</h2>
    <p>${t(core.business.clientProblem)}</p>
    <a href="product.html">${options.lang === 'ru' ? 'Узнать о продукте' : 'Mehr zum Produkt'}</a>
  </main>
</body>
</html>`;

    // product.html
    files['product.html'] = `<!DOCTYPE html>
<html lang="${options.lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t(core.identity.brandName)} - ${options.lang === 'ru' ? 'Продукт' : 'Produkt'}</title>
  <link rel="stylesheet" href="style.css">
  <link rel="icon" href="favicon.ico">
</head>
<body>
  <nav>
    <a href="index.html">${nav.home}</a>
    <a href="product.html">${nav.product}</a>
    <a href="company.html">${nav.company}</a>
  </nav>
  <main>
    <h1>${options.lang === 'ru' ? 'Продукт' : 'Produkt'}</h1>
    <h2>${options.lang === 'ru' ? 'Входные данные' : 'Eingabedaten'}</h2>
    <p>${t(core.product.inputs)}</p>
    <h2>${options.lang === 'ru' ? 'Как работает' : 'Funktionsweise'}</h2>
    <p>${t(core.product.process)}</p>
    <h2>${options.lang === 'ru' ? 'Результат' : 'Ergebnis'}</h2>
    <p>${t(core.product.result)}</p>
    <h2>${options.lang === 'ru' ? 'Ограничения' : 'Einschränkungen'}</h2>
    <p>${t(core.product.limits)}</p>
    <h2>FAQ</h2>
    ${core.faq.map(f => `<h3>${t(f.q)}</h3><p>${t(f.a)}</p>`).join('\n    ')}
  </main>
</body>
</html>`;

    // company.html
    files['company.html'] = `<!DOCTYPE html>
<html lang="${options.lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t(core.identity.brandName)} - ${options.lang === 'ru' ? 'Компания и контакты' : 'Unternehmen & Kontakt'}</title>
  <link rel="stylesheet" href="style.css">
  <link rel="icon" href="favicon.ico">
</head>
<body>
  <nav>
    <a href="index.html">${nav.home}</a>
    <a href="product.html">${nav.product}</a>
    <a href="company.html">${nav.company}</a>
  </nav>
  <main>
    <h1>${options.lang === 'ru' ? 'Компания' : 'Unternehmen'}</h1>
    <h2>${options.lang === 'ru' ? 'История' : 'Geschichte'}</h2>
    <p>${t(core.business.history)}</p>
    <h2>${options.lang === 'ru' ? 'Специализация' : 'Spezialisierung'}</h2>
    <p>${t(core.business.specialization)}</p>
    <h2>${options.lang === 'ru' ? 'Команда' : 'Team'}</h2>
    <p><strong>${t(core.people.ceo.name)}</strong> - ${t(core.people.ceo.title)}<br>${t(core.people.ceo.bio)}</p>
    ${core.people.heads.map(h => `<p><strong>${t(h.name)}</strong> - ${t(h.title)}<br>${t(h.bio)}</p>`).join('\n    ')}
    <h2>${options.lang === 'ru' ? 'Контакты' : 'Kontakt'}</h2>
    <p>${t(core.identity.legalEntityName)}<br>${t(core.contacts.address)}<br>${t(core.contacts.city)}<br>${t(core.contacts.phone)}<br>${t(core.contacts.email)}</p>
  </main>
</body>
</html>`;

    files['style.css'] = `* { box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; }
nav { background: #111; padding: 15px; display: flex; gap: 20px; }
nav a { color: #fff; text-decoration: none; }
main { max-width: 800px; margin: 40px auto; padding: 20px; }
h1 { margin-top: 0; }`;

    files['favicon.ico'] = '';

    const version: SiteVersion = {
      id: siteId,
      coreId: core.id,
      snapshot: structuredClone(snapshot),
      files: { ...files },
      lang: options.lang,
      style: options.style,
      storagePath: `sites/${siteId}.zip`,
      createdAt: new Date().toISOString()
    };

    return { files, version, siteId };
  }
}

export const siteGenerator = new SiteGenerator();
