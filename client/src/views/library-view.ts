export function libraryMarkup(count: number): string {
  return `
    <section class="grid">
      <article class="panel">
        <header class="panel-header">
          <div class="panel-title-group">
            <h2>Сохранённые компании <span class="library-count">${count}</span></h2>
            <p>Откройте карточку, чтобы проверить данные или создать сайт.</p>
          </div>
          <button class="btn ghost" id="reloadLib"><span>Обновить</span></button>
        </header>
        <div class="panel-body">
          <div class="field" style="grid-column:1/-1"><label class="field-label" for="librarySearch">Поиск компании</label><div class="field-control"><input type="search" id="librarySearch" placeholder="Название, город или специализация" /></div></div>
          <div class="library-grid" id="libGrid"></div>
          <span class="field-hint" id="librarySearchStatus" role="status" style="grid-column:1/-1"></span>
        </div>
      </article>
    </section>
  `;
}
