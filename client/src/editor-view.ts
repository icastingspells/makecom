type Field = [id: string, label: string, multiline?: boolean];

function fields(items: Field[]): string {
  return `<div class="form-grid-full">${items.map(([id, label, multiline]) => `
    <div class="field" ${multiline ? 'style="grid-column:1/-1"' : ''}>
      <label class="field-label" for="${id}">${label}</label>
      <div class="field-control">${multiline ? `<textarea id="${id}" rows="4"></textarea>` : `<input id="${id}" />`}</div>
    </div>`).join('')}</div>`;
}

function section(id: string, number: string, title: string, description: string, content: string): string {
  return `<section class="editor-section" id="${id}"><div class="section-heading"><span class="section-number">${number}</span><div><h2>${title}</h2><p>${description}</p></div></div>${content}</section>`;
}

export function editorMarkup(): string {
  const people = fields([
    ['c_ceo_name', 'Руководитель компании'], ['c_ceo_title', 'Должность'], ['c_ceo_bio', 'Опыт и биография', true],
    ['c_h1_name', 'Первый руководитель отдела'], ['c_h1_title', 'Должность'], ['c_h1_bio', 'Опыт и биография', true],
    ['c_h2_name', 'Второй руководитель отдела'], ['c_h2_title', 'Должность'], ['c_h2_bio', 'Опыт и биография', true]
  ]);
  return `<div class="editor-layout">
    <nav class="editor-nav" aria-label="Разделы карточки">
      <a href="#" data-section="identity">01 · Компания</a><a href="#" data-section="contacts">02 · Контакты</a>
      <a href="#" data-section="team">03 · Команда</a><a href="#" data-section="business">04 · Деятельность</a>
      <a href="#" data-section="product">05 · Продукт</a><a href="#" data-section="faq">06 · Вопросы и ответы</a>
      <a href="#" data-section="versions">07 · Версии сайтов</a>
    </nav>
    <div class="editor-sections">
      ${section('identity', '01', 'Компания', 'Название бренда и юридического лица.', fields([['c_brand', 'Название бренда'], ['c_legal', 'Юридическое наименование']]))}
      ${section('contacts', '02', 'Контакты', 'Эти данные используются на страницах сайта.', fields([['c_city', 'Город'], ['c_phone', 'Телефон'], ['c_address', 'Адрес', true], ['c_email', 'Электронная почта']]))}
      ${section('team', '03', 'Команда', 'Руководитель компании и два руководителя отделов.', people)}
      ${section('business', '04', 'Деятельность', 'История компании, специализация и аудитория.', fields([['c_history', 'История компании', true], ['c_spec', 'Специализация', true], ['c_audience', 'Целевая аудитория', true], ['c_problem', 'Какую проблему клиента решает компания', true]]))}
      ${section('product', '05', 'Продукт', 'Опишите, как работает услуга и что получает клиент.', fields([['c_inputs', 'Входные данные', true], ['c_process', 'Процесс работы', true], ['c_result', 'Результат для клиента', true], ['c_limits', 'Ограничения', true]]))}
      ${section('faq', '06', 'Вопросы и ответы', 'Пять ответов на частые вопросы о продукте.', '<div id="faqEditor"></div>')}
      <div class="editor-footer">
        <label class="review-label"><input id="confirmFacts" type="checkbox" /><span>Я проверил согласованность данных<small>Тексты, ответы и телефон соответствуют компании и её городу. Формат полей проверяется автоматически.</small></span></label>
        <p class="status" id="cardApprovalStatus" role="status"></p>
        <div class="actions"><button class="btn" id="saveCore">Сохранить изменения</button><button class="btn ghost" id="approveCore">Утвердить карточку</button><button class="btn ghost" id="exportCore">Скачать JSON</button><button class="btn ghost" id="editorToSite">Создать сайт</button></div>
        <span class="status" id="core-edit-status" role="status">Изменения применятся к новым сайтам. Прежние версии сохранятся.</span>
      </div>
      ${section('versions', '07', 'Версии сайтов', 'Сайты, созданные на основе этой компании.', '<div id="cardVersions" aria-live="polite"></div>')}
    </div>
  </div>`;
}
