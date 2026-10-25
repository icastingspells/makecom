const app = document.getElementById('app') as HTMLElement;
const tabs = document.querySelectorAll('.tab');
const globalStatus = document.getElementById('global-status') as HTMLElement;

const API = 'http://localhost:3000';

let cores: any[] = [];
let selectedCoreId: string | null = null;

function setGlobalStatus(text: string, type: 'info' | 'success' | 'error' = 'info') {
  globalStatus.textContent = text;
  globalStatus.classList.remove('success', 'error');
  if (type === 'success') globalStatus.classList.add('success');
  if (type === 'error') globalStatus.classList.add('error');
}

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    tabs.forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    const target = (tab as HTMLElement).dataset.tab;
    render(target);
  });
});

function render(view: string | undefined) {
  if (!view) view = 'company';
  if (view === 'company') renderCompany();
  else if (view === 'site') renderSite();
  else if (view === 'library') renderLibrary();
}

function renderCompany() {
  app.innerHTML = `
    <section class="grid">
      <article class="panel">
        <header class="panel-header">
          <div class="panel-title-group">
            <h2>Этап А — Генерация карточки компании</h2>
            <p>Создаём структурированную CompanyCore по заданным параметрам</p>
          </div>
        </header>
        <div class="panel-body">
          <div class="form-grid">
            <div class="field">
              <span class="field-label">Страна</span>
              <div class="field-control">
                <input id="country" value="DE" placeholder="DE" />
              </div>
            </div>
            <div class="field">
              <span class="field-label">Масштаб</span>
              <div class="field-control">
                <select id="scale">
                  <option value="small">small</option>
                  <option value="medium">medium</option>
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
                <select id="model"></select>
              </div>
            </div>
            <div class="actions">
              <button class="btn" id="generateCore">
                <span>Сгенерировать карточку</span>
              </button>
              <span class="status" id="core-status">Мок-режим отключён, используется прокси</span>
            </div>
          </div>
          <aside class="result">
            <header class="result-header">
              <div>
                <h3>Результат</h3>
                <span class="result-sub">CompanyCore JSON</span>
              </div>
            </header>
            <div class="result-body">
              <pre id="coreResult">Нажмите «Сгенерировать карточку», чтобы начать</pre>
            </div>
          </aside>
        </div>
      </article>
    </section>
  `;

  loadModels();
  setupCompany();
}

function setupCompany() {
  const btn = document.getElementById('generateCore') as HTMLButtonElement;
  const status = document.getElementById('core-status') as HTMLElement;
  const result = document.getElementById('coreResult') as HTMLElement;

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    status.textContent = 'Генерация карточки через OpenRouter...';
    status.classList.remove('success', 'error');
    setGlobalStatus('Генерируем карточку компании...', 'info');

    const body = {
      country: (document.getElementById('country') as HTMLInputElement).value,
      scale: (document.getElementById('scale') as HTMLSelectElement).value,
      brandName: (document.getElementById('brandName') as HTMLInputElement).value || undefined,
      model: (document.getElementById('model') as HTMLSelectElement).value
    };

    try {
      const res = await fetch(`${API}/api/core/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok) {
        status.textContent = 'Карточка успешно сгенерирована';
        status.classList.add('success');
        setGlobalStatus('Карточка компании готова', 'success');
        result.textContent = JSON.stringify(data, null, 2);
        if (data.core?.id) {
          selectedCoreId = data.core.id;
        }
        loadCores();
      } else {
        status.textContent = data.error || 'Ошибка генерации';
        status.classList.add('error');
        setGlobalStatus('Ошибка при генерации карточки', 'error');
        result.textContent = JSON.stringify(data, null, 2);
      }
    } catch (e: any) {
      status.textContent = e.message;
      status.classList.add('error');
      setGlobalStatus('Ошибка соединения с сервером', 'error');
      result.textContent = e.message;
    } finally {
      btn.disabled = false;
    }
  });
}

async function loadModels() {
  try {
    const res = await fetch(`${API}/api/models`);
    const data = await res.json();
    const sel = document.getElementById('model') as HTMLSelectElement;
    if (!sel) return;
    sel.innerHTML = '';
    (data.models || []).slice(0, 80).forEach((m: any) => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.name || m.id;
      sel.appendChild(opt);
    });
  } catch (e) {
    console.error(e);
  }
}

function renderSite() {
  app.innerHTML = `
    <section class="grid">
      <article class="panel">
        <header class="panel-header">
          <div class="panel-title-group">
            <h2>Этап Б — Генерация сайта из снапшота</h2>
            <p>Сайт строится только из фактов CompanyCore. При смене карточки создаётся новая версия</p>
          </div>
        </header>
        <div class="panel-body">
          <div class="form-grid">
            <div class="field" style="grid-column: 1 / -1;">
              <span class="field-label">Выберите сохранённую компанию</span>
              <div class="field-control">
                <select id="siteCoreSelect"></select>
              </div>
            </div>
            <div class="field">
              <span class="field-label">Язык сайта</span>
              <div class="field-control">
                <select id="lang">
                  <option value="ru">Русский</option>
                  <option value="de">Deutsch</option>
                </select>
              </div>
            </div>
            <div class="field">
              <span class="field-label">Стиль</span>
              <div class="field-control">
                <input id="style" value="default" />
              </div>
            </div>
            <div class="field" style="grid-column: 1 / -1;">
              <span class="field-label">coreId (автозаполняется)</span>
              <div class="field-control">
                <input id="coreId" placeholder="Выберите компанию из списка" />
              </div>
            </div>
            <div class="actions">
              <button class="btn" id="generateSite">
                <span>Сгенерировать сайт</span>
              </button>
              <button class="btn ghost" id="refreshCoresSite">
                <span>Обновить список</span>
              </button>
              <span class="status" id="site-status">Генерация из CoreSnapshot</span>
            </div>
          </div>
          <aside class="result">
            <header class="result-header">
              <div>
                <h3>Результат генерации</h3>
                <span class="result-sub">Список файлов и версия сайта</span>
              </div>
            </header>
            <div class="result-body">
              <pre id="siteResult">Выберите компанию и нажмите «Сгенерировать сайт»</pre>
            </div>
          </aside>
        </div>
      </article>
    </section>
  `;

  setupSite();
  loadCoresForSelect();
}

function setupSite() {
  const btn = document.getElementById('generateSite') as HTMLButtonElement;
  const refresh = document.getElementById('refreshCoresSite') as HTMLButtonElement;
  const status = document.getElementById('site-status') as HTMLElement;
  const result = document.getElementById('siteResult') as HTMLElement;
  const select = document.getElementById('siteCoreSelect') as HTMLSelectElement;
  const coreIdInput = document.getElementById('coreId') as HTMLInputElement;

  select.addEventListener('change', () => {
    coreIdInput.value = select.value;
  });

  refresh.addEventListener('click', loadCoresForSelect);
  loadCoresForSelect();

  btn.addEventListener('click', async () => {
    const coreId = coreIdInput.value.trim();
    if (!coreId) {
      status.textContent = 'Выберите компанию';
      status.classList.add('error');
      return;
    }
    btn.disabled = true;
    status.textContent = 'Создаём снапшот и генерируем сайт...';
    status.classList.remove('success', 'error');
    setGlobalStatus('Генерируем сайт из CompanyCore...', 'info');

    const body = {
      coreId,
      lang: (document.getElementById('lang') as HTMLSelectElement).value,
      style: (document.getElementById('style') as HTMLInputElement).value
    };

    try {
      const res = await fetch(`${API}/api/site/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok) {
        status.textContent = 'Сайт успешно сгенерирован';
        status.classList.add('success');
        setGlobalStatus('Сайт готов', 'success');
        result.textContent = JSON.stringify(data, null, 2);
      } else {
        status.textContent = data.error || 'Ошибка генерации';
        status.classList.add('error');
        setGlobalStatus('Ошибка при генерации сайта', 'error');
        result.textContent = JSON.stringify(data, null, 2);
      }
    } catch (e: any) {
      status.textContent = e.message;
      status.classList.add('error');
      setGlobalStatus('Ошибка соединения с сервером', 'error');
      result.textContent = e.message;
    } finally {
      btn.disabled = false;
    }
  });
}

async function loadCoresForSelect() {
  try {
    const res = await fetch(`${API}/api/core/list`);
    const data = await res.json();
    cores = data.cores || [];
    const select = document.getElementById('siteCoreSelect') as HTMLSelectElement;
    const coreIdInput = document.getElementById('coreId') as HTMLInputElement;
    if (!select) return;
    select.innerHTML = '<option value="">-- Выбрать компанию --</option>';
    cores.forEach((c: any) => {
      const opt = document.createElement('option');
      opt.value = c.id;
      const name = c.core?.identity?.brandName || c.id;
      const country = c.core?.identity?.country || '';
      opt.textContent = `${name} ${country ? '[' + country + ']' : ''} · ${c.id.slice(0, 8)}`;
      select.appendChild(opt);
    });
    if (selectedCoreId) {
      select.value = selectedCoreId;
      if (coreIdInput) coreIdInput.value = selectedCoreId;
    }
  } catch (e) {
    console.error(e);
  }
}

async function loadCores() {
  try {
    const res = await fetch(`${API}/api/core/list`);
    const data = await res.json();
    cores = data.cores || [];
    renderLibrary();
  } catch (e) {
    console.error(e);
  }
}

function renderLibrary() {
  const activeTab = Array.from(tabs).find((t) => t.classList.contains('active')) as HTMLElement;
  if (activeTab?.dataset.tab !== 'library') {
    app.innerHTML = `
      <section class="grid">
        <article class="panel">
          <header class="panel-header">
            <div class="panel-title-group">
              <h2>Библиотека компаний</h2>
              <p>Все сохранённые CompanyCore с возможностью перейти к генерации сайта</p>
            </div>
            <button class="btn ghost" id="reloadLib"><span>Обновить</span></button>
          </header>
          <div class="panel-body">
            <div class="library-grid" id="libGrid"></div>
          </div>
        </article>
      </section>
    `;
    document.getElementById('reloadLib')?.addEventListener('click', loadCores);
  }

  const grid = document.getElementById('libGrid') as HTMLElement;
  if (!grid) return;
  if (cores.length === 0) {
    grid.innerHTML = `<div class="empty">Пока нет сохранённых компаний. Сгенерируйте первую на вкладке «Этап А»</div>`;
    return;
  }
  grid.innerHTML = cores
    .map((c: any) => {
      const core = c.core || {};
      const brand = core.identity?.brandName || 'Без названия';
      const country = core.identity?.country || '';
      const scale = core.identity?.scale || '';
      const spec = core.business?.specialization || '';
      const ceo = core.people?.ceo?.name || '';
      const isActive = selectedCoreId === c.id ? 'active' : '';
      return `
        <button class="card ${isActive}" data-id="${c.id}">
          <div class="card-header">
            <div>
              <h3 class="card-title">${brand}</h3>
              <p class="card-sub">${spec}</p>
            </div>
          </div>
          <div class="pill-row">
            ${country ? `<span class="pill">${country}</span>` : ''}
            ${scale ? `<span class="pill">${scale}</span>` : ''}
            ${ceo ? `<span class="pill">CEO: ${ceo}</span>` : ''}
          </div>
          <div class="card-meta">
            <span>ID: ${c.id.slice(0, 12)}...</span>
            <span>Создано: ${c.createdAt ? new Date(c.createdAt).toLocaleString('ru-RU') : ''}</span>
          </div>
        </button>
      `;
    })
    .join('');

  grid.querySelectorAll('.card').forEach((card) => {
    card.addEventListener('click', () => {
      selectedCoreId = (card as HTMLElement).dataset.id || null;
      renderLibrary();
      setGlobalStatus('Компания выбрана для генерации сайта', 'info');
      tabs.forEach((t) => {
        t.classList.toggle('active', (t as HTMLElement).dataset.tab === 'site');
      });
      render('site');
    });
  });
}

loadCores();
render('company');
