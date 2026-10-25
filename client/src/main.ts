import { mountGenerationControls, fetchGeneration, renderOperations, mountQuotaCheck } from './generation-operations';
import { mountCompanyInputs } from './company-inputs';
import { editorMarkup } from './editor-view';
import { showSitePreview } from './site-preview';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const app = document.getElementById('app') as HTMLElement;
const tabs = document.querySelectorAll('.tab');
const globalStatus = document.getElementById('global-status') as HTMLElement;

const API = '';

let cores: any[] = [];
let selectedCoreId: string | null = null;
let lastSiteData: any = null;
let currentCoreData: any = null;
let editorInputController = new AbortController();
let activeRoute = '';

function hasUnsavedChanges(): boolean {
  if (!currentCoreData || !document.getElementById('c_brand')) return false;
  return Object.entries(gatherCoreFromEditor()).some(([key, value]) => JSON.stringify(value) !== JSON.stringify(currentCoreData[key]));
}

window.addEventListener('beforeunload', event => {
  if (hasUnsavedChanges()) { event.preventDefault(); event.returnValue = ''; }
});

function setGlobalStatus(text: string, type: 'info' | 'success' | 'error' = 'info') {
  globalStatus.textContent = text;
  globalStatus.classList.remove('success', 'error');
  if (type === 'success') globalStatus.classList.add('success');
  if (type === 'error') globalStatus.classList.add('error');
}

function navigate(view: string) { location.hash = view; }

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

function pageHeading(title: string, description: string, eyebrow: string, back = false) {
  const heading = document.createElement('div');
  heading.className = 'page-heading';
  heading.innerHTML = `<div><div class="eyebrow">${escapeHtml(eyebrow)}</div><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p></div>${back ? '<button class="btn ghost" id="backToLibrary">← В библиотеку</button>' : ''}`;
  app.prepend(heading);
  document.getElementById('page-title')!.textContent = title;
  app.querySelectorAll('.field').forEach(field => {
    const caption = field.querySelector('span.field-label');
    const control = field.querySelector<HTMLInputElement | HTMLSelectElement>('input, select');
    if (caption && control?.id) {
      const label = document.createElement('label');
      label.className = 'field-label'; label.htmlFor = control.id; label.textContent = caption.textContent;
      caption.replaceWith(label);
    }
  });
}

tabs.forEach((tab) => tab.addEventListener('click', () => navigate((tab as HTMLElement).dataset.tab || 'company')));

async function renderRoute() {
  const route = location.hash.slice(1) || 'company';
  if (activeRoute && route !== activeRoute && hasUnsavedChanges() && !window.confirm('В карточке есть несохранённые изменения. Покинуть страницу без сохранения?')) {
    history.replaceState(null, '', `#${activeRoute}`);
    return;
  }
  activeRoute = route;
  window.scrollTo(0, 0);
  editorInputController.abort();
  editorInputController = new AbortController();
  const match = /^cards\/([^/]+)$/.exec(route);
  tabs.forEach(t => {
    const active = (t as HTMLElement).dataset.tab === (match ? 'library' : route);
    t.classList.toggle('active', active);
    if (active) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
  });
  if (!match) { render(route); return; }
  currentCoreData = null;
  app.textContent = 'Загрузка карточки…';
  try {
    selectedCoreId = decodeURIComponent(match[1]);
    const res = await fetch(`${API}/api/core/${encodeURIComponent(selectedCoreId)}`);
    const data = await res.json();
    if (location.hash.slice(1) !== route) return;
    if (!res.ok) throw new Error(data.error || 'Не удалось загрузить карточку');
    currentCoreData = data.core;
    renderCoreEditor();
  } catch (err: any) {
    if (location.hash.slice(1) !== route) return;
    app.innerHTML = '<p id="card-error"></p><button id="card-back">Вернуться в библиотеку</button>';
    document.getElementById('card-error')!.textContent = err.message;
    document.getElementById('card-back')!.addEventListener('click', () => navigate('library'));
  }
}
window.addEventListener('hashchange', () => { void renderRoute(); });

function render(view: string | undefined) {
  if (!view) view = 'company';
  if (view === 'company') renderCompany();
  else if (view === 'site') renderSite();
  else if (view === 'library') renderLibrary();
  else if (view === 'settings') renderSettings();
  else if (view === 'operations') { renderOperations(app); pageHeading('История и расходы', 'Ход генераций, попытки и подтверждённая стоимость.', 'Рабочее пространство'); }
}

function renderSettings() {
  app.innerHTML = `<article class="panel"><header class="panel-header"><div class="panel-title-group"><h2>OpenRouter</h2><p>Ваш ключ используется для генерации компаний и сайтов.</p></div></header><div class="panel-body" style="grid-template-columns:1fr"><form id="tokenForm" class="form-grid"><div class="field" style="grid-column:1/-1"><label class="field-label" for="openRouterToken">Ключ API OpenRouter</label><div class="field-control"><input type="password" id="openRouterToken" autocomplete="off" spellcheck="false" placeholder="sk-or-…" required /></div><span class="field-hint">Хранится в зашифрованной HttpOnly cookie текущей сессии. Не записывается в базу, файлы или localStorage. Сервер получает ключ только для выполнения запросов.</span></div><div class="actions"><button class="btn" type="submit">Подключить</button><button class="btn ghost" type="button" id="clearToken">Удалить ключ из сессии</button></div><span class="status" id="tokenStatus" role="status"></span></form></div></article>`;
  const quota = mountQuotaCheck();
  pageHeading('Подключение', 'Управляйте ключом для текущей сессии браузера.', 'Настройки');
  const status = document.getElementById('tokenStatus')!;
  const input = document.getElementById('openRouterToken') as HTMLInputElement;
  const form = document.getElementById('tokenForm') as HTMLFormElement;
  const remove = document.getElementById('clearToken') as HTMLButtonElement;
  let sessionRevision = 0;
  void fetch('/api/session').then(r => r.json()).then(data => { if (!status.isConnected || sessionRevision !== 0) return; status.classList.toggle('is-connected', !!data.connected); status.textContent = data.connected ? 'Ключ добавлен в эту сессию. Содержимое ключа не возвращается в браузер.' : data.mock ? 'Включён тестовый режим без платных запросов.' : 'Ключ пока не добавлен.'; if (data.connected) void quota?.refresh(); }).catch(() => { if (sessionRevision !== 0 || !status.isConnected) return; status.classList.remove('is-connected'); status.textContent = 'Не удалось проверить подключение'; });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    sessionRevision++;
    remove.disabled = true;
    const button = form.querySelector<HTMLButtonElement>('[type=submit]')!; button.disabled = true;
    quota?.clear();
    try {
      const body = JSON.stringify({ token: input.value.trim() }); input.value = '';
      const res = await fetch('/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
      const data = await res.json(); if (!res.ok) throw new Error(data.error);
      status.textContent = 'Ключ добавлен в сессию. Можно создавать компании и сайты.';
      status.classList.add('is-connected');
      void quota?.refresh();
    } catch (err: unknown) { status.classList.remove('is-connected'); status.textContent = err instanceof Error ? err.message : 'Не удалось подключить ключ'; }
    finally { button.disabled = false; remove.disabled = false; }
  });
  remove.addEventListener('click', async () => {
    sessionRevision++;
    const connect = form.querySelector<HTMLButtonElement>('[type=submit]')!; connect.disabled = true; remove.disabled = true;
    try { const res = await fetch('/api/session', { method: 'DELETE' }); if (!res.ok) throw new Error(); input.value = ''; status.classList.remove('is-connected'); status.textContent = 'Ключ удалён из сессии.'; quota?.clear(); }
    catch { status.textContent = 'Не удалось удалить ключ. Повторите попытку.'; }
    finally { connect.disabled = false; remove.disabled = false; }
  });
}

function renderCompany() {
  app.innerHTML = `
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

  pageHeading('Новая компания', 'Создайте основу для будущего сайта: профиль компании, команду и описание продукта.', '01 / Создание');
  mountCompanyInputs();
  document.getElementById('openGenerated')?.addEventListener('click', () => { if (selectedCoreId) navigate(`cards/${selectedCoreId}`); });
  mountGenerationControls();
  loadModels();
  setupCompany();
  const goToSite = document.getElementById('goToSite') as HTMLButtonElement;
  goToSite?.addEventListener('click', () => {
    tabs.forEach((t) => {
      t.classList.toggle('active', (t as HTMLElement).dataset.tab === 'site');
    });
    navigate('site');
    setGlobalStatus('Выберите утверждённую карточку для создания сайта', 'info');
  });
}

function setupCompany() {
  const btn = document.getElementById('generateCore') as HTMLButtonElement;
  const status = document.getElementById('core-status') as HTMLElement;
  const result = document.getElementById('coreResult') as HTMLElement;

  btn.addEventListener('click', async () => {
    const model = document.getElementById('model') as HTMLSelectElement;
    if (model.disabled || !model.value) {
      status.textContent = 'Выберите доступную модель';
      return;
    }
    btn.disabled = true;
    status.textContent = 'Генерация уникальной карточки...';
    status.classList.remove('success', 'error');
    setGlobalStatus('Генерируем карточку компании...', 'info');

    const body = {
      country: (document.getElementById('country') as HTMLInputElement).value,
      scale: (document.getElementById('scale') as HTMLSelectElement).value,
      brandName: (document.getElementById('brandName') as HTMLInputElement).value || undefined,
      businessDirection: (document.getElementById('businessDirection') as HTMLInputElement).value.trim() || undefined,
      b2bServiceType: (document.getElementById('b2bServiceType') as HTMLInputElement).value.trim() || undefined,
      model: (document.getElementById('model') as HTMLSelectElement).value
    };

    try {
      const res = await fetchGeneration(`${API}/api/core/create`, body);
      const data = await res.json();
      if (res.ok) {
        status.textContent = 'Карточка сгенерирована';
        status.classList.add('success');
        setGlobalStatus('Карточка готова', 'success');
        result.textContent = `${data.core.identity.brandName}\n${data.core.identity.legalEntityName}\n${data.core.contacts.city}\nСтоимость: ${typeof data.costUsd === 'number' ? '$' + data.costUsd.toFixed(6) : 'см. историю: итог не подтверждён'}`;
        document.getElementById('openGenerated')?.classList.remove('hidden');
        if (data.core?.id) {
          selectedCoreId = data.core.id;
          currentCoreData = data.core;

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

function renderCoreEditor() {
  app.innerHTML = editorMarkup();
  pageHeading(currentCoreData.identity.brandName, 'Редактируйте данные компании. Изменения используются при создании новых версий сайта.', 'Библиотека / Карточка компании', true);
  app.querySelectorAll<HTMLAnchorElement>('[data-section]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    document.getElementById(link.dataset.section!)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }));
  document.getElementById('backToLibrary')?.addEventListener('click', () => navigate('library'));
  document.getElementById('editorToSite')?.addEventListener('click', () => navigate('site'));
  const faqEditor = document.getElementById('faqEditor')!;
  for (let i = 0; i < 5; i++) {
    const label = document.createElement('label');
    label.textContent = `Вопрос ${i + 1}`;
    const question = document.createElement('input');
    question.id = `faq_q_${i}`;
    const answerLabel = document.createElement('label');
    answerLabel.textContent = `Ответ ${i + 1}`;
    const answer = document.createElement('textarea');
    answer.id = `faq_a_${i}`;
    label.htmlFor = question.id;
    answerLabel.htmlFor = answer.id;
    label.className = answerLabel.className = 'field-label';
    const pair = document.createElement('div'); pair.className = 'faq-pair';
    for (const [caption, control] of [[label, question], [answerLabel, answer]] as const) {
      const field = document.createElement('div'); field.className = 'field';
      const wrapper = document.createElement('div'); wrapper.className = 'field-control';
      wrapper.append(control); field.append(caption, wrapper); pair.append(field);
    }
    faqEditor.append(pair);
  }
  if (currentCoreData) fillCoreEditor(currentCoreData);
  setupCardActions();
  const review = document.getElementById('confirmFacts') as HTMLInputElement;
  app.addEventListener('input', (event) => {
    if (event.target !== review) review.checked = false;
    refreshApprovalStatus();
  }, { signal: editorInputController.signal });
  setupCoreEditor();
  void loadCardVersions(currentCoreData.id);
}

function refreshApprovalStatus() {
  const label = document.getElementById('cardApprovalStatus');
  if (!label || !currentCoreData) return;
  const dirty = hasUnsavedChanges();
  const approved = currentCoreData.meta.approval?.version === currentCoreData.meta.version;
  label.textContent = dirty ? 'Есть несохранённые изменения. Сохраните их и утвердите новую версию.' : approved ? `Карточка утверждена · версия ${currentCoreData.meta.version} · ${new Date(currentCoreData.meta.approval.approvedAt).toLocaleString('ru-RU')}` : `Черновик · версия ${currentCoreData.meta.version}. Перед созданием сайта проверьте факты и утвердите карточку.`;
  (document.getElementById('approveCore') as HTMLButtonElement).disabled = dirty || approved;
  (document.getElementById('editorToSite') as HTMLButtonElement).disabled = dirty || !approved;
}

function setupCardActions() {
  const status = document.getElementById('core-edit-status')!;
  const approve = document.getElementById('approveCore') as HTMLButtonElement;
  const exportButton = document.getElementById('exportCore') as HTMLButtonElement;
  refreshApprovalStatus();
  approve.addEventListener('click', async () => {
    if (hasUnsavedChanges()) { status.textContent = 'Сначала сохраните изменения.'; return; }
    if (!(document.getElementById('confirmFacts') as HTMLInputElement).checked) { status.textContent = 'Отметьте, что вы проверили согласованность фактов.'; return; }
    const id = selectedCoreId;
    approve.disabled = true;
    try {
      const response = await fetch(`${API}/api/core/${encodeURIComponent(id!)}/approve`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expectedVersion: currentCoreData.meta.version, consistencyReviewed: true }) });
      const data = await response.json();
      if (!response.ok) throw new Error([data.error, ...(data.errors || [])].join('\n'));
      if (selectedCoreId === id && approve.isConnected) {
        currentCoreData = data.core;
        (document.getElementById('confirmFacts') as HTMLInputElement).checked = false;
        status.textContent = 'Карточка утверждена. Можно создавать сайт.';
        refreshApprovalStatus();
      }
      await loadCores();
    } catch (error) { status.textContent = error instanceof Error ? error.message : 'Не удалось утвердить карточку'; if (approve.isConnected) refreshApprovalStatus(); }
  });
  exportButton.addEventListener('click', async () => {
    if (hasUnsavedChanges()) { status.textContent = 'Сохраните изменения перед скачиванием JSON.'; return; }
    const id = selectedCoreId; exportButton.disabled = true;
    try {
      const response = await fetch(`${API}/api/core/${encodeURIComponent(id!)}/export`);
      if (!response.ok) throw new Error('Не удалось скачать карточку');
      saveAs(await response.blob(), `company-${id}.json`);
      status.textContent = 'Сохранённая карточка скачана в JSON.';
    } catch (error) { status.textContent = error instanceof Error ? error.message : 'Не удалось скачать карточку'; }
    finally { exportButton.disabled = false; }
  });
}

async function loadCardVersions(coreId: string) {
  const container = document.getElementById('cardVersions')!;
  container.textContent = 'Загрузка версий сайтов…';
  try {
    const res = await fetch(`${API}/api/site/versions/${encodeURIComponent(coreId)}`);
    if (!res.ok) throw new Error();
    const data = await res.json();
    if (!container.isConnected) return;
    container.replaceChildren();
    for (const version of data.versions || []) {
      const row = document.createElement('p');
      row.className = 'version-row';
      const info = document.createElement('span');
      info.textContent = `${version.lang === 'ru' ? 'Русский' : 'Немецкий'} · ${new Date(version.createdAt).toLocaleString('ru-RU')}`;
      const id = document.createElement('small'); id.textContent = `Версия ${version.id.slice(0, 8)}${version.generation ? ' · ' + (version.generation.kind === 'ai' ? 'AI: ' : 'Тест: ') + version.generation.model : ''}`;
      info.append(id); row.append(info);
      const previewContainer = document.createElement('div'); previewContainer.className = 'version-preview hidden';
      previewContainer.id = `version-preview-${version.id}`;
      if (version.files) {
        const preview = document.createElement('button'); preview.className = 'btn ghost'; preview.textContent = 'Открыть превью';

        preview.setAttribute('aria-expanded', 'false'); preview.setAttribute('aria-controls', previewContainer.id);
        preview.addEventListener('click', () => {
          if (!previewContainer.classList.contains('hidden')) {
            previewContainer.replaceChildren(); previewContainer.classList.add('hidden');
            preview.textContent = 'Открыть превью'; preview.setAttribute('aria-expanded', 'false');
          } else {
            showSitePreview(previewContainer, version.files);
            preview.textContent = 'Скрыть превью'; preview.setAttribute('aria-expanded', 'true');
            previewContainer.scrollIntoView({ block: 'start' });
          }
        });
        row.append(preview);

        const download = document.createElement('button');
        download.className = 'btn ghost';
        download.textContent = 'Скачать ZIP';
        download.addEventListener('click', async () => {
          const zip = new JSZip();
          for (const [name, content] of Object.entries(version.files)) zip.file(name, content as string);
          saveAs(await zip.generateAsync({ type: 'blob' }), `site_${version.id}.zip`);
        });
        row.append(download);
      } else row.append('Файлы старой версии не были сохранены.');
      container.append(row);
      if (version.files) container.append(previewContainer);
    }
    if (!data.versions?.length) container.append('Сайтов пока нет. Создайте первый сайт на основе этой карточки.');
  } catch { container.textContent = 'Не удалось загрузить версии сайтов'; }
}

function setupCoreEditor() {
  const saveBtn = document.getElementById('saveCore') as HTMLButtonElement;
  const status = document.getElementById('core-edit-status') as HTMLElement;
  saveBtn.addEventListener('click', async () => {
    if (!hasUnsavedChanges()) { status.textContent = 'Нет изменений для сохранения. Если факты проверены, утвердите карточку.'; return; }
    if (!selectedCoreId || !currentCoreData) {
      status.textContent = 'Нет карточки для сохранения';
      status.classList.add('error');
      return;
    }
    if (!(document.getElementById('confirmFacts') as HTMLInputElement).checked) {
      status.textContent = 'Проверьте согласованность фактов и отметьте подтверждение перед сохранением.';
      status.classList.add('error');
      return;
    }
    status.textContent = 'Сохранение...';
    status.classList.remove('success', 'error');
    const editingId = selectedCoreId;
    try {
      saveBtn.disabled = true;
      const core = gatherCoreFromEditor();
      const res = await fetch(`${API}/api/core/${encodeURIComponent(editingId)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...core, expectedVersion: currentCoreData.meta.version, consistencyReviewed: true })
      });
      const data = await res.json();
      if (!res.ok) throw new Error([data.error, ...(data.errors || [])].filter(Boolean).join('\n'));
      if (selectedCoreId === editingId && document.getElementById('saveCore') === saveBtn) currentCoreData = data.core;
      refreshApprovalStatus();
      await loadCores();
      status.textContent = 'Изменения сохранены. Для обновления сайта создайте новую версию.';
      if (document.getElementById('saveCore') === saveBtn) (document.getElementById('confirmFacts') as HTMLInputElement).checked = false;
      status.classList.add('success');
    } catch (e: any) {
      status.textContent = e.message;
      status.classList.add('error');
    } finally {
      saveBtn.disabled = false;
    }
  });
}

function fillCoreEditor(core: any) {
  for (let i = 0; i < 5; i++) {
    (document.getElementById(`faq_q_${i}`) as HTMLInputElement).value = core.faq?.[i]?.q || '';
    (document.getElementById(`faq_a_${i}`) as HTMLTextAreaElement).value = core.faq?.[i]?.a || '';
  }
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
    faq: Array.from({ length: 5 }, (_, i) => ({
      q: (document.getElementById(`faq_q_${i}`) as HTMLInputElement).value,
      a: (document.getElementById(`faq_a_${i}`) as HTMLTextAreaElement).value
    })),
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
  const sel = document.getElementById('model') as HTMLSelectElement;
  const search = document.getElementById('modelSearch') as HTMLInputElement;
  const status = document.getElementById('modelSearchStatus')!;
  sel.disabled = true;
  status.textContent = 'Загрузка моделей…';
  try {
    const res = await fetch(`${API}/api/models`);
    if (!res.ok) throw new Error('Не удалось загрузить модели');
    const data = await res.json();
    if (!sel.isConnected) return;
    const siteMode = !!document.getElementById('generateSite');
    type Model = { id: string; name?: string; pricing?: { prompt?: string; completion?: string; request?: string }; supported_parameters?: string[]; output_modalities?: string[]; max_completion_tokens?: number };
    const models: Model[] = (data.models || []).filter((m: Model) => (!m.max_completion_tokens || m.max_completion_tokens >= (siteMode ? 12000 : 4000)) && m.supported_parameters?.includes('structured_outputs') && m.output_modalities?.includes('text') && !m.output_modalities?.includes('image'));
    const freeOnly = document.getElementById('freeModelsOnly') as HTMLInputElement;
    const isFree = (model: Model) => model.pricing?.prompt !== undefined && model.pricing?.completion !== undefined && Number(model.pricing.prompt) === 0 && Number(model.pricing.completion) === 0 && Number(model.pricing.request ?? 0) === 0;
    let selectedModel = (siteMode ? models.find(m => m.id === 'google/gemini-2.5-flash')?.id : undefined) || models[0]?.id || '';
    sel.addEventListener('change', () => { selectedModel = sel.value; });
    const filter = () => {
      const query = search.value.trim().toLocaleLowerCase();
      const matches = models.filter(m => (!freeOnly.checked || isFree(m)) && `${m.name || ''} ${m.id}`.toLocaleLowerCase().includes(query));
      sel.replaceChildren();
      for (const model of matches) sel.add(new Option(`${model.name || model.id} · ${model.id}${isFree(model) ? ' · Бесплатно' : ''}`, model.id));
      if (matches.some(m => m.id === selectedModel)) sel.value = selectedModel;
      else selectedModel = sel.value;
      sel.disabled = !matches.length;
      status.textContent = matches.length ? `Найдено: ${matches.length} из ${models.length}` : 'Модели не найдены. Измените запрос.';
    };
    search.addEventListener('input', filter);
    freeOnly.addEventListener('change', filter);
    filter();
  } catch {
    status.textContent = 'Не удалось загрузить модели. Откройте страницу повторно.';
  }
}

function renderSite() {
  app.innerHTML = `
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

  pageHeading('Создать сайт', 'Соберите сайт на основе проверенной карточки. Скачайте готовые файлы одним архивом.', '02 / Сайт компании');
  setupSite();
  mountGenerationControls();
  loadModels();
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
    const model = document.getElementById('model') as HTMLSelectElement;
    if (model.disabled || !model.value) { status.textContent = 'Выберите доступную модель'; return; }
    btn.disabled = true;
    download.disabled = true;
    status.textContent = 'Нейросеть создаёт страницы и переводит тексты. Затем сервер подготовит файлы…';
    status.classList.remove('success', 'error');
    setGlobalStatus('Генерируем сайт из CompanyCore...', 'info');

    const body = {
      coreId,
      lang: (document.getElementById('lang') as HTMLSelectElement).value,
      style: (document.getElementById('style') as HTMLTextAreaElement).value,
      model: model.value
    };

    try {
      const res = await fetchGeneration(`${API}/api/site/generate`, body);
      const data = await res.json();
      if (res.ok) {
        lastSiteData = data;
        showSitePreview(document.getElementById('sitePreview')!, data.files);
        document.getElementById('siteSourceFiles')!.classList.remove('hidden');
        status.textContent = data.mock ? 'Тестовый режим: сайт создан шаблоном, без запроса к нейросети.' : 'AI-сайт создан. Перед публикацией проверьте перевод и сохранение смысла.';
        status.classList.add('success');
        setGlobalStatus('Сайт готов', 'success');
        result.textContent = `Сайт готов к скачиванию.\nФайлов: ${data.fileList.length}\nЯзык: ${body.lang === 'ru' ? 'Русский' : 'Немецкий'}\nМодель: ${body.model}\nСтоимость: ${typeof data.costUsd === 'number' ? '$' + data.costUsd.toFixed(5) : 'нет данных'}\nВерсия: ${data.version.id.slice(0, 8)}`;
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
    if (coreIdInput) coreIdInput.value = '';
    cores.forEach((c: any) => {
      const opt = document.createElement('option');
      opt.value = c.id;
      const name = (c.core || c).identity?.brandName || c.id;
      const country = (c.core || c).inputs?.country || '';
      const core = c.core || c;
      const approved = core.meta?.approval?.version === core.meta?.version && !!core.meta?.approval;
      opt.disabled = !approved;
      opt.textContent = `${name} ${country ? '[' + country + ']' : ''} · ${c.id.slice(0, 8)}${approved ? ' · утверждена' : ' · нужно утвердить'}`;
      select.appendChild(opt);
    });
    if (selectedCoreId && cores.some(c => c.id === selectedCoreId && (c.core || c).meta?.approval?.version === (c.core || c).meta?.version && (c.core || c).meta?.approval)) {
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
    if (location.hash === '#library') renderLibrary();
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
            <h2>Сохранённые компании <span class="library-count">${cores.length}</span></h2>
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
  pageHeading('Библиотека', 'Все компании в одном месте. Карточки можно редактировать и использовать для создания сайтов.', 'Компании и результаты');
  const create = document.createElement('button'); create.className = 'btn'; create.textContent = '+ Новая компания';
  create.addEventListener('click', () => navigate('company'));
  app.querySelector('.page-heading')!.append(create);
  document.getElementById('reloadLib')?.addEventListener('click', loadCores);
  const search = document.getElementById('librarySearch') as HTMLInputElement;
  search.addEventListener('input', () => {
    const query = search.value.trim().toLocaleLowerCase();
    let visible = 0;
    app.querySelectorAll<HTMLButtonElement>('.card').forEach(card => {
      const match = (card.dataset.search || '').includes(query);
      card.hidden = !match; if (match) visible++;
    });
    document.getElementById('librarySearchStatus')!.textContent = visible ? `Найдено: ${visible}` : 'Компании не найдены. Попробуйте другой запрос.';
  });

  const grid = document.getElementById('libGrid') as HTMLElement;
  if (!grid) return;
  if (cores.length === 0) {
    grid.innerHTML = `<div class="empty">Здесь будут ваши компании.<br />Нажмите «Новая компания», чтобы создать первую карточку.</div>`;
    return;
  }
  grid.innerHTML = cores
    .map((c: any) => {
      const core = c.core || c;
      const brand = core.identity?.brandName || 'Без названия';
      const country = core.inputs?.country || '';
      const scale = core.inputs?.scale === 'small' ? 'Небольшая' : core.inputs?.scale === 'medium' ? 'Средняя' : '';
      const spec = core.business?.specialization || '';
      const ceo = core.people?.ceo?.name || '';
      const isActive = selectedCoreId === c.id ? 'active' : '';
      return `
        <button class="card ${isActive}" data-id="${escapeHtml(c.id)}" data-search="${escapeHtml([brand, spec, core.contacts?.city || ''].join(' ').toLocaleLowerCase())}">
          <div class="card-header">
            <div>
              <h3 class="card-title">${escapeHtml(brand)}</h3>
              <p class="card-sub">${escapeHtml(spec)}</p>
            </div>
          </div>
          <div class="pill-row">
            <span class="pill">${core.meta?.approval && core.meta.approval.version === core.meta.version ? 'Утверждена' : 'Черновик'}</span>
            ${country ? `<span class="pill">${escapeHtml(country)}</span>` : ''}
            ${scale ? `<span class="pill">${escapeHtml(scale)}</span>` : ''}
            ${ceo ? `<span class="pill">CEO: ${escapeHtml(ceo)}</span>` : ''}
          </div>
          <div class="card-meta">
            <span>${c.createdAt ? new Date(c.createdAt).toLocaleDateString('ru-RU') : ''}</span>
            <span class="card-open">Открыть карточку →</span>
          </div>
        </button>
      `;
    })
    .join('');

  grid.querySelectorAll('.card').forEach((card) => {
    card.addEventListener('click', () => {
      const id = (card as HTMLElement).dataset.id;
      if (id) navigate(`cards/${encodeURIComponent(id)}`);
    });
  });
}

void loadCores();
void renderRoute();
