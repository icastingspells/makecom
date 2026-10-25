import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const app = document.getElementById('app') as HTMLElement;
const tabs = document.querySelectorAll('.tab');
const globalStatus = document.getElementById('global-status') as HTMLElement;

const API = 'http://localhost:3000';

let cores: any[] = [];
let selectedCoreId: string | null = null;
let lastSiteData: any = null;
let currentCoreData: any = null;

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
            <h2>Этап А — Карточка компании</h2>
            <p>Генерация, просмотр и редактирование CompanyCore</p>
          </div>
          <div class="actions" style="padding: 0;">
            <button class="btn" id="goToSite"><span>Перейти к генерации сайта</span></button>
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
              <span class="status" id="core-status">Генерация через реальный OpenRouter</span>
            </div>
          </div>
          <aside class="result">
            <header class="result-header">
              <div>
                <h3>Краткий результат</h3>
                <span class="result-sub">ID и основная информация</span>
              </div>
            </header>
            <div class="result-body">
              <pre id="coreResult">Нажмите «Сгенерировать карточку», чтобы начать</pre>
            </div>
          </aside>
        </div>
      </article>
      <article class="panel">
        <header class="panel-header">
          <div class="panel-title-group">
            <h2>Просмотр и редактирование карточки</h2>
            <p>Полная карточка компании со всеми полями</p>
          </div>
          <div class="actions" style="padding: 0;">
            <button class="btn ghost" id="loadFullCore"><span>Загрузить выбранную</span></button>
            <button class="btn" id="saveCore"><span>Сохранить изменения</span></button>
          </div>
        </header>
        <div class="panel-body" style="grid-template-columns: 1fr;">
          <div class="form-grid-full">
            <div class="field">
              <span class="field-label">Brand Name</span>
              <div class="field-control"><input id="c_brand" /></div>
            </div>
            <div class="field">
              <span class="field-label">Legal Entity Name</span>
              <div class="field-control"><input id="c_legal" /></div>
            </div>
            <div class="field">
              <span class="field-label">City</span>
              <div class="field-control"><input id="c_city" /></div>
            </div>
            <div class="field">
              <span class="field-label">Phone</span>
              <div class="field-control"><input id="c_phone" /></div>
            </div>
            <div class="field" style="grid-column: 1 / -1;">
              <span class="field-label">Address</span>
              <div class="field-control"><input id="c_address" /></div>
            </div>
            <div class="field" style="grid-column: 1 / -1;">
              <span class="field-label">Email</span>
              <div class="field-control"><input id="c_email" /></div>
            </div>
            <div class="field">
              <span class="field-label">CEO Name</span>
              <div class="field-control"><input id="c_ceo_name" /></div>
            </div>
            <div class="field">
              <span class="field-label">CEO Title</span>
              <div class="field-control"><input id="c_ceo_title" /></div>
            </div>
            <div class="field" style="grid-column: 1 / -1;">
              <span class="field-label">CEO Bio</span>
              <div class="field-control"><textarea id="c_ceo_bio" style="width: 100%; min-height: 80px; border: none; background: transparent; color: var(--text); padding: 10px 14px; font-family: inherit;"></textarea></div>
            </div>
            <div class="field">
              <span class="field-label">Head 1 Name</span>
              <div class="field-control"><input id="c_h1_name" /></div>
            </div>
            <div class="field">
              <span class="field-label">Head 1 Title</span>
              <div class="field-control"><input id="c_h1_title" /></div>
            </div>
            <div class="field" style="grid-column: 1 / -1;">
              <span class="field-label">Head 1 Bio</span>
              <div class="field-control"><textarea id="c_h1_bio" style="width: 100%; min-height: 80px; border: none; background: transparent; color: var(--text); padding: 10px 14px; font-family: inherit;"></textarea></div>
            </div>
            <div class="field">
              <span class="field-label">Head 2 Name</span>
              <div class="field-control"><input id="c_h2_name" /></div>
            </div>
            <div class="field">
              <span class="field-label">Head 2 Title</span>
              <div class="field-control"><input id="c_h2_title" /></div>
            </div>
            <div class="field" style="grid-column: 1 / -1;">
              <span class="field-label">Head 2 Bio</span>
              <div class="field-control"><textarea id="c_h2_bio" style="width: 100%; min-height: 80px; border: none; background: transparent; color: var(--text); padding: 10px 14px; font-family: inherit;"></textarea></div>
            </div>
            <div class="field" style="grid-column: 1 / -1;">
              <span class="field-label">History</span>
              <div class="field-control"><textarea id="c_history" style="width: 100%; min-height: 100px; border: none; background: transparent; color: var(--text); padding: 10px 14px; font-family: inherit;"></textarea></div>
            </div>
            <div class="field" style="grid-column: 1 / -1;">
              <span class="field-label">Specialization</span>
              <div class="field-control"><textarea id="c_spec" style="width: 100%; min-height: 80px; border: none; background: transparent; color: var(--text); padding: 10px 14px; font-family: inherit;"></textarea></div>
            </div>
            <div class="field" style="grid-column: 1 / -1;">
              <span class="field-label">Target Audience</span>
              <div class="field-control"><textarea id="c_audience" style="width: 100%; min-height: 80px; border: none; background: transparent; color: var(--text); padding: 10px 14px; font-family: inherit;"></textarea></div>
            </div>
            <div class="field" style="grid-column: 1 / -1;">
              <span class="field-label">Client Problem</span>
              <div class="field-control"><textarea id="c_problem" style="width: 100%; min-height: 80px; border: none; background: transparent; color: var(--text); padding: 10px 14px; font-family: inherit;"></textarea></div>
            </div>
            <div class="field" style="grid-column: 1 / -1;">
              <span class="field-label">Product Inputs</span>
              <div class="field-control"><textarea id="c_inputs" style="width: 100%; min-height: 80px; border: none; background: transparent; color: var(--text); padding: 10px 14px; font-family: inherit;"></textarea></div>
            </div>
            <div class="field" style="grid-column: 1 / -1;">
              <span class="field-label">Product Process</span>
              <div class="field-control"><textarea id="c_process" style="width: 100%; min-height: 80px; border: none; background: transparent; color: var(--text); padding: 10px 14px; font-family: inherit;"></textarea></div>
            </div>
            <div class="field" style="grid-column: 1 / -1;">
              <span class="field-label">Product Result</span>
              <div class="field-control"><textarea id="c_result" style="width: 100%; min-height: 80px; border: none; background: transparent; color: var(--text); padding: 10px 14px; font-family: inherit;"></textarea></div>
            </div>
            <div class="field" style="grid-column: 1 / -1;">
              <span class="field-label">Product Limits</span>
              <div class="field-control"><textarea id="c_limits" style="width: 100%; min-height: 80px; border: none; background: transparent; color: var(--text); padding: 10px 14px; font-family: inherit;"></textarea></div>
            </div>
            <div class="actions">
              <span class="status" id="core-edit-status">Выберите компанию из библиотеки или сгенерируйте новую</span>
            </div>
          </div>
        </div>
      </article>
    </section>
  `;

  loadModels();
  setupCompany();
  setupCoreEditor();
  const goToSite = document.getElementById('goToSite') as HTMLButtonElement;
  goToSite?.addEventListener('click', () => {
    tabs.forEach((t) => {
      t.classList.toggle('active', (t as HTMLElement).dataset.tab === 'site');
    });
    render('site');
    setTimeout(() => {
      if (selectedCoreId) {
        const coreIdInput = document.getElementById('coreId') as HTMLInputElement;
        const select = document.getElementById('siteCoreSelect') as HTMLSelectElement;
        if (coreIdInput) coreIdInput.value = selectedCoreId;
        if (select) select.value = selectedCoreId;
      }
      setGlobalStatus('Переход к генерации сайта с выбранной карточкой', 'info');
    }, 50);
  });
}

function setupCompany() {
  const btn = document.getElementById('generateCore') as HTMLButtonElement;
  const status = document.getElementById('core-status') as HTMLElement;
  const result = document.getElementById('coreResult') as HTMLElement;

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    status.textContent = 'Генерация уникальной карточки...';
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
        status.textContent = 'Карточка сгенерирована';
        status.classList.add('success');
        setGlobalStatus('Карточка готова', 'success');
        result.textContent = `ID: ${data.core.id}\nBrand: ${data.core.identity.brandName}\nLegal: ${data.core.identity.legalEntityName}\nCity: ${data.core.contacts.city}`;
        if (data.core?.id) {
          selectedCoreId = data.core.id;
          currentCoreData = data.core;
          fillCoreEditor(data.core);
        }
        loadCores();
      } else {
        status.textContent = data.error || 'Ошибка генерации';
        status.classList.add('error');
        setGlobalStatus('Ошибка при генерации', 'error');
        result.textContent = JSON.stringify(data, null, 2);
      }
    } catch (e: any) {
      status.textContent = e.message;
      status.classList.add('error');
      setGlobalStatus('Ошибка соединения', 'error');
      result.textContent = e.message;
    } finally {
      btn.disabled = false;
    }
  });
}

function setupCoreEditor() {
  const loadBtn = document.getElementById('loadFullCore') as HTMLButtonElement;
  const saveBtn = document.getElementById('saveCore') as HTMLButtonElement;
  const status = document.getElementById('core-edit-status') as HTMLElement;

  loadBtn.addEventListener('click', async () => {
    if (!selectedCoreId) {
      status.textContent = 'Сначала выберите компанию в библиотеке';
      status.classList.add('error');
      return;
    }
    try {
      const res = await fetch(`${API}/api/core/${selectedCoreId}`);
      if (!res.ok) {
        status.textContent = 'Не удалось загрузить карточку';
        status.classList.add('error');
        return;
      }
      const data = await res.json();
      currentCoreData = data.core;
      fillCoreEditor(data.core);
      status.textContent = 'Карточка загружена';
      status.classList.remove('error');
      status.classList.add('success');
    } catch (e: any) {
      status.textContent = e.message;
      status.classList.add('error');
    }
  });

  saveBtn.addEventListener('click', async () => {
    if (!selectedCoreId || !currentCoreData) {
      status.textContent = 'Нет карточки для сохранения';
      status.classList.add('error');
      return;
    }
    status.textContent = 'Сохранение...';
    status.classList.remove('success', 'error');
    try {
      const core = gatherCoreFromEditor();
      currentCoreData = { ...currentCoreData, ...core };
      status.textContent = 'Изменения применены (локально). Сохранение в хранилище будет добавлено позже.';
      status.classList.add('success');
    } catch (e: any) {
      status.textContent = e.message;
      status.classList.add('error');
    }
  });
}

function fillCoreEditor(core: any) {
  (document.getElementById('c_brand') as HTMLInputElement).value = core.identity?.brandName || '';
  (document.getElementById('c_legal') as HTMLInputElement).value = core.identity?.legalEntityName || '';
  (document.getElementById('c_city') as HTMLInputElement).value = core.contacts?.city || '';
  (document.getElementById('c_phone') as HTMLInputElement).value = core.contacts?.phone || '';
  (document.getElementById('c_address') as HTMLInputElement).value = core.contacts?.address || '';
  (document.getElementById('c_email') as HTMLInputElement).value = core.contacts?.email || '';
  (document.getElementById('c_ceo_name') as HTMLInputElement).value = core.people?.ceo?.name || '';
  (document.getElementById('c_ceo_title') as HTMLInputElement).value = core.people?.ceo?.title || '';
  (document.getElementById('c_ceo_bio') as HTMLTextAreaElement).value = core.people?.ceo?.bio || '';
  (document.getElementById('c_h1_name') as HTMLInputElement).value = core.people?.heads?.[0]?.name || '';
  (document.getElementById('c_h1_title') as HTMLInputElement).value = core.people?.heads?.[0]?.title || '';
  (document.getElementById('c_h1_bio') as HTMLTextAreaElement).value = core.people?.heads?.[0]?.bio || '';
  (document.getElementById('c_h2_name') as HTMLInputElement).value = core.people?.heads?.[1]?.name || '';
  (document.getElementById('c_h2_title') as HTMLInputElement).value = core.people?.heads?.[1]?.title || '';
  (document.getElementById('c_h2_bio') as HTMLTextAreaElement).value = core.people?.heads?.[1]?.bio || '';
  (document.getElementById('c_history') as HTMLTextAreaElement).value = core.business?.history || '';
  (document.getElementById('c_spec') as HTMLTextAreaElement).value = core.business?.specialization || '';
  (document.getElementById('c_audience') as HTMLTextAreaElement).value = core.business?.targetAudience || '';
  (document.getElementById('c_problem') as HTMLTextAreaElement).value = core.business?.clientProblem || '';
  (document.getElementById('c_inputs') as HTMLTextAreaElement).value = core.product?.inputs || '';
  (document.getElementById('c_process') as HTMLTextAreaElement).value = core.product?.process || '';
  (document.getElementById('c_result') as HTMLTextAreaElement).value = core.product?.result || '';
  (document.getElementById('c_limits') as HTMLTextAreaElement).value = core.product?.limits || '';
}

function gatherCoreFromEditor() {
  return {
    identity: {
      brandName: (document.getElementById('c_brand') as HTMLInputElement).value,
      legalEntityName: (document.getElementById('c_legal') as HTMLInputElement).value
    },
    contacts: {
      city: (document.getElementById('c_city') as HTMLInputElement).value,
      address: (document.getElementById('c_address') as HTMLInputElement).value,
      phone: (document.getElementById('c_phone') as HTMLInputElement).value,
      email: (document.getElementById('c_email') as HTMLInputElement).value
    },
    people: {
      ceo: {
        name: (document.getElementById('c_ceo_name') as HTMLInputElement).value,
        title: (document.getElementById('c_ceo_title') as HTMLInputElement).value,
        bio: (document.getElementById('c_ceo_bio') as HTMLTextAreaElement).value
      },
      heads: [
        {
          name: (document.getElementById('c_h1_name') as HTMLInputElement).value,
          title: (document.getElementById('c_h1_title') as HTMLInputElement).value,
          bio: (document.getElementById('c_h1_bio') as HTMLTextAreaElement).value
        },
        {
          name: (document.getElementById('c_h2_name') as HTMLInputElement).value,
          title: (document.getElementById('c_h2_title') as HTMLInputElement).value,
          bio: (document.getElementById('c_h2_bio') as HTMLTextAreaElement).value
        }
      ]
    },
    business: {
      history: (document.getElementById('c_history') as HTMLTextAreaElement).value,
      specialization: (document.getElementById('c_spec') as HTMLTextAreaElement).value,
      targetAudience: (document.getElementById('c_audience') as HTMLTextAreaElement).value,
      clientProblem: (document.getElementById('c_problem') as HTMLTextAreaElement).value
    },
    product: {
      inputs: (document.getElementById('c_inputs') as HTMLTextAreaElement).value,
      process: (document.getElementById('c_process') as HTMLTextAreaElement).value,
      result: (document.getElementById('c_result') as HTMLTextAreaElement).value,
      limits: (document.getElementById('c_limits') as HTMLTextAreaElement).value
    }
  };
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
            <p>Сайт строится только из фактов CompanyCore</p>
          </div>
        </header>
        <div class="panel-body">
          <div class="form-grid">
            <div class="field" style="grid-column: 1 / -1;">
              <span class="field-label">Выберите компанию</span>
              <div class="field-control">
                <select id="siteCoreSelect"></select>
              </div>
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
            <div class="field">
              <span class="field-label">Стиль</span>
              <div class="field-control">
                <input id="style" value="default" />
              </div>
            </div>
            <div class="field" style="grid-column: 1 / -1;">
              <span class="field-label">coreId</span>
              <div class="field-control">
                <input id="coreId" placeholder="Выберите компанию" />
              </div>
            </div>
            <div class="actions">
              <button class="btn" id="generateSite"><span>Сгенерировать сайт</span></button>
              <button class="btn ghost" id="refreshCoresSite"><span>Обновить</span></button>
              <button class="btn ghost" id="downloadZip" disabled><span>Скачать ZIP</span></button>
              <span class="status" id="site-status">Только из снапшота</span>
            </div>
          </div>
          <aside class="result">
            <header class="result-header">
              <div>
                <h3>Файлы сайта</h3>
                <span class="result-sub">index.html / product.html / company.html / style.css</span>
              </div>
            </header>
            <div class="result-body">
              <pre id="siteResult">Выберите компанию и сгенерируйте сайт</pre>
            </div>
          </aside>
        </div>
      </article>
      <article class="panel">
        <header class="panel-header">
          <div class="panel-title-group">
            <h2>Предпросмотр файлов</h2>
            <p>Содержимое сгенерированных HTML/CSS</p>
          </div>
        </header>
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
                <span class="result-sub">Только факты из CompanyCore</span>
              </div>
            </header>
            <div class="result-body">
              <pre id="fileContent">Сгенерируйте сайт для предпросмотра</pre>
            </div>
          </div>
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
  const download = document.getElementById('downloadZip') as HTMLButtonElement;
  const status = document.getElementById('site-status') as HTMLElement;
  const result = document.getElementById('siteResult') as HTMLElement;
  const select = document.getElementById('siteCoreSelect') as HTMLSelectElement;
  const coreIdInput = document.getElementById('coreId') as HTMLInputElement;
  const fileSelect = document.getElementById('fileSelect') as HTMLSelectElement;
  const fileContent = document.getElementById('fileContent') as HTMLElement;

  select.addEventListener('change', () => {
    coreIdInput.value = select.value;
  });

  refresh.addEventListener('click', loadCoresForSelect);

  fileSelect.addEventListener('change', () => {
    if (lastSiteData?.files && fileSelect.value) {
      fileContent.textContent = lastSiteData.files[fileSelect.value] || '';
    }
  });

  btn.addEventListener('click', async () => {
    const coreId = coreIdInput.value.trim();
    if (!coreId) {
      status.textContent = 'Выберите компанию';
      status.classList.add('error');
      return;
    }
    btn.disabled = true;
    download.disabled = true;
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
        lastSiteData = data;
        status.textContent = 'Сайт сгенерирован';
        status.classList.add('success');
        setGlobalStatus('Сайт готов', 'success');
        result.textContent = JSON.stringify({ version: data.version, fileList: data.fileList, snapshotHash: data.snapshotHash }, null, 2);
        if (fileSelect) {
          fileSelect.innerHTML = '';
          (data.fileList || []).forEach((f: string) => {
            const opt = document.createElement('option');
            opt.value = f;
            opt.textContent = f;
            fileSelect.appendChild(opt);
          });
          if (fileSelect.value && data.files) {
            fileContent.textContent = data.files[fileSelect.value] || '';
          }
        }
        download.disabled = false;
      } else {
        status.textContent = data.error || 'Ошибка генерации';
        status.classList.add('error');
        setGlobalStatus('Ошибка при генерации сайта', 'error');
        result.textContent = JSON.stringify(data, null, 2);
      }
    } catch (e: any) {
      status.textContent = e.message;
      status.classList.add('error');
      setGlobalStatus('Ошибка соединения', 'error');
      result.textContent = e.message;
    } finally {
      btn.disabled = false;
    }
  });

  download.addEventListener('click', async () => {
    if (!lastSiteData?.files) return;
    const zip = new JSZip();
    Object.entries(lastSiteData.files).forEach(([name, content]) => {
      zip.file(name, content as string);
    });
    const blob = await zip.generateAsync({ type: 'blob' });
    const brand = cores.find(c => c.id === (document.getElementById('coreId') as HTMLInputElement).value)?.core?.identity?.brandName || 'site';
    saveAs(blob, `${brand.replace(/[^a-zA-Z0-9]/g, '_')}_${lastSiteData.version?.id?.slice(0, 8)}.zip`);
    setGlobalStatus('ZIP скачан', 'success');
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
  app.innerHTML = `
    <section class="grid">
      <article class="panel">
        <header class="panel-header">
          <div class="panel-title-group">
            <h2>Библиотека компаний</h2>
            <p>Кликните по карточке для выбора и перехода к генерации сайта</p>
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

  const grid = document.getElementById('libGrid') as HTMLElement;
  if (!grid) return;
  if (cores.length === 0) {
    grid.innerHTML = `<div class="empty">Пока нет сохранённых компаний</div>`;
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
    card.addEventListener('click', async () => {
      selectedCoreId = (card as HTMLElement).dataset.id || null;
      try {
        const res = await fetch(`${API}/api/core/${selectedCoreId}`);
        if (res.ok) {
          const data = await res.json();
          currentCoreData = data.core;
        }
      } catch {}
      tabs.forEach((t) => {
        t.classList.toggle('active', (t as HTMLElement).dataset.tab === 'company');
      });
      render('company');
      setTimeout(() => {
        if (currentCoreData) {
          fillCoreEditor(currentCoreData);
        }
        const editStatus = document.getElementById('core-edit-status') as HTMLElement;
        if (editStatus) {
          editStatus.textContent = 'Карточка загружена для просмотра и редактирования';
          editStatus.classList.remove('error');
          editStatus.classList.add('success');
        }
        setGlobalStatus('Открыта карточка компании для редактирования', 'info');
      }, 50);
    });
  });
}

loadCores();
render('company');
