export function companyMarkup(): string {
  return `
    <section class="grid">
      <article class="panel">
        <header class="panel-header">
          <div class="panel-title-group">
            <h2>Параметры компании</h2>
            <p>Выберите параметры и модель для генерации.</p>
          </div>
          <div class="actions" style="padding: 0;">
            <button class="btn ghost" id="goToSite"><span>Создать сайт →</span></button>
          </div>
        </header>
        <div class="panel-body">
          <div class="form-grid">
            <div class="field">
              <span class="field-label">Страна</span>
              <div class="field-control">
                <select id="country"><option value="DE">Германия</option></select>
              </div>
            </div>
            <div class="field">
              <span class="field-label">Масштаб</span>
              <div class="field-control">
                <select id="scale">
                  <option value="small">Небольшая компания</option>
                  <option value="medium">Средняя компания</option>
                </select>
              </div>
            </div>
            <div class="field" style="grid-column: 1 / -1;">
              <span class="field-label">Название бренда (опционально)</span>
              <div class="field-control">
                <input id="brandName" placeholder="Оставьте пустым для случайного" />
              </div>
            </div>
            <div class="field" style="grid-column: 1 / -1;">
              <span class="field-label">Модель OpenRouter</span>
              <div class="field-control">
                <input id="modelSearch" type="search" aria-label="Поиск модели OpenRouter" placeholder="Поиск по названию или ID модели" />
              </div>
              <div class="field-control">
                <select id="model" aria-label="Модель OpenRouter"></select>
              </div>
              <span id="modelSearchStatus" role="status"></span>
            </div>
            <div class="actions">
              <button class="btn" id="generateCore">
                <span>Сгенерировать карточку</span>
              </button>
              <span class="status" id="core-status">Карточка сохранится в библиотеке</span>
            </div>
          </div>
          <aside class="result">
            <header class="result-header">
              <div>
                <h3>Новая карточка</h3>
                <span class="result-sub">Здесь появится результат генерации</span>
              </div>
            </header>
            <div class="result-body">
              <pre class="result-placeholder" id="coreResult">Задайте параметры компании и выберите модель. После генерации вы сможете проверить и отредактировать все тексты.</pre>
              <button class="btn ghost hidden" id="openGenerated">Открыть карточку →</button>
            </div>
          </aside>
        </div>
      </article>

    </section>
  `;
}
