export function siteMarkup(): string {
  return `
    <section class="grid">
      <article class="panel">
        <header class="panel-header">
          <div class="panel-title-group">
            <h2>Настройки сайта</h2>
            <p>Нейросеть создаст оформление и переведёт тексты из карточки.</p>
          </div>
        </header>
        <div class="panel-body">
          <div class="form-grid">
            <div class="field" style="grid-column: 1 / -1;">
              <span class="field-label">Выберите компанию</span>
              <div class="field-control">
                <select id="siteCoreSelect"></select>
              </div>
              <span class="field-hint">Для создания сайта нужна утверждённая карточка. Проверить и утвердить её можно в <a href="#library">библиотеке</a>.</span>
            </div>
            <div class="field">
              <span class="field-label">Язык</span>
              <div class="field-control">
                <select id="lang">
                  <option value="ru">Русский</option>
                  <option value="de">Deutsch</option>
                </select>
              </div>
            </div>
            <div class="field" style="grid-column:1/-1"><label class="field-label" for="modelSearch">Модель для создания сайта</label><div class="field-control"><input type="search" id="modelSearch" aria-label="Поиск модели OpenRouter" placeholder="Поиск по названию или ID модели" /></div><div class="field-control"><select id="model" aria-label="Модель OpenRouter"></select></div><span id="modelSearchStatus" role="status"></span></div>
            <div class="field" style="grid-column:1/-1"><label class="field-label" for="style">Пожелания к оформлению</label><div class="field-control"><textarea id="style" maxlength="1000" rows="3">Строгий современный B2B-сайт. Светлый фон, графитовые акценты, выразительная типографика и удобная мобильная версия.</textarea></div><span class="field-hint">Модель создаёт HTML/CSS. Имена и контакты берутся из карточки без изменений.</span></div>
            <input type="hidden" id="coreId" />
            <div class="actions">
              <button class="btn" id="generateSite"><span>Создать сайт с AI</span></button>
              <button class="btn ghost" id="refreshCoresSite"><span>Обновить</span></button>
              <button class="btn ghost" id="downloadZip" disabled><span>Скачать ZIP</span></button>
              <span class="status" id="site-status">Каждая генерация создаёт отдельную версию</span>
            </div>
          </div>
          <aside class="result">
            <header class="result-header">
              <div>
                <h3>Готовый сайт</h3>
                <span class="result-sub">Три страницы и файлы оформления</span>
              </div>
            </header>
            <div class="result-body">
              <pre class="result-placeholder" id="siteResult">Выберите компанию из библиотеки. Данные её карточки станут основой нового сайта.</pre>
            </div>
          </aside>
        </div>
      </article>
      <div id="sitePreview" class="hidden"></div>
      <details class="panel code-details hidden" id="siteSourceFiles">
        <summary>Исходные файлы сайта <span>HTML и CSS</span></summary>
        <div class="panel-body" style="grid-template-columns: 1fr; gap: 16px;">
          <div class="field" style="grid-column: 1 / -1;">
            <span class="field-label">Файл</span>
            <div class="field-control">
              <select id="fileSelect"></select>
            </div>
          </div>
          <div class="result" style="grid-column: 1 / -1; min-height: 400px;">
            <header class="result-header">
              <div>
                <h3>Содержимое</h3>
                <span class="result-sub">Исходный код выбранного файла</span>
              </div>
            </header>
            <div class="result-body">
              <pre id="fileContent">Сгенерируйте сайт для предпросмотра</pre>
            </div>
          </div>
        </div>
      </details>
    </section>
  `;
}
