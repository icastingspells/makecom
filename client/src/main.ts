import { loadCardVersions } from './views/card-versions';
import { fillCoreEditor, gatherCoreFromEditor } from './editor-fields';
import { loadModels } from './model-selector';
import { renderSettings } from './views/settings-page';
import { companyMarkup } from './views/company-view';
import { siteMarkup } from './views/site-view';
import { libraryMarkup } from './views/library-view';
import { mountGenerationControls, fetchGeneration, renderOperations } from './generation-operations';
import { mountCompanyInputs } from './company-inputs';
import { editorMarkup } from './editor-view';
import { showSitePreview } from './site-preview';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const app = document.getElementById('app') as HTMLElement;
const tabs = document.querySelectorAll('.tab');
const globalStatus = document.getElementById('global-status') as HTMLElement;

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
    const res = await fetch(`/api/core/${encodeURIComponent(selectedCoreId)}`);
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
  else if (view === 'settings') renderSettings(app, pageHeading);
  else if (view === 'operations') { renderOperations(app); pageHeading('История и расходы', 'Ход генераций, попытки и подтверждённая стоимость.', 'Рабочее пространство'); }
}


function renderCompany() {
  app.innerHTML = companyMarkup();

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
      const res = await fetchGeneration(`/api/core/create`, body);
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
      const response = await fetch(`/api/core/${encodeURIComponent(id!)}/approve`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expectedVersion: currentCoreData.meta.version, consistencyReviewed: true }) });
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
      const response = await fetch(`/api/core/${encodeURIComponent(id!)}/export`);
      if (!response.ok) throw new Error('Не удалось скачать карточку');
      saveAs(await response.blob(), `company-${id}.json`);
      status.textContent = 'Сохранённая карточка скачана в JSON.';
    } catch (error) { status.textContent = error instanceof Error ? error.message : 'Не удалось скачать карточку'; }
    finally { exportButton.disabled = false; }
  });
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
      const res = await fetch(`/api/core/${encodeURIComponent(editingId)}`, {
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

function renderSite() {
  app.innerHTML = siteMarkup();

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
      const res = await fetchGeneration(`/api/site/generate`, body);
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
    const res = await fetch(`/api/core/list`);
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
    const res = await fetch(`/api/core/list`);
    const data = await res.json();
    cores = data.cores || [];
    if (location.hash === '#library') renderLibrary();
  } catch (e) {
    console.error(e);
  }
}

function renderLibrary() {
  app.innerHTML = libraryMarkup(cores.length);
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
