const app = document.getElementById('app');

if (app) {
  app.innerHTML = `
    <div style="font-family: sans-serif; max-width: 900px; margin: 40px auto; padding: 20px;">
      <h1>Makecom - Company & Site Generator</h1>
      <p>Этап А: генерация карточки компании. Этап Б: генерация сайта из CompanyCore</p>
      
      <section style="margin-top: 30px; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h2>Этап А - Карточка компании</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
          <label>Страна<input id="country" value="DE" style="width: 100%; padding: 8px;" /></label>
          <label>Масштаб<select id="scale" style="width: 100%; padding: 8px;"><option value="small">small</option><option value="medium">medium</option></select></label>
          <label>Название бренда (опц.)<input id="brandName" style="width: 100%; padding: 8px;" /></label>
          <label>Модель OpenRouter<select id="model" style="width: 100%; padding: 8px;"></select></label>
        </div>
        <button id="generateCore" style="padding: 10px 20px; cursor: pointer;">Сгенерировать карточку компании</button>
        <p id="status" style="color: #666;"></p>
        <pre id="coreResult" style="background: #f5f5f5; padding: 10px; overflow: auto; margin-top: 10px; max-height: 300px;"></pre>
      </section>

      <section style="margin-top: 20px; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h2>Этап Б - Генерация сайта</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 10px;">
          <label>coreId<input id="coreId" style="width: 100%; padding: 8px;" /></label>
          <label>Язык<select id="lang" style="width: 100%; padding: 8px;"><option value="ru">ru</option><option value="de">de</option></select></label>
          <label>Стиль<input id="style" value="default" style="width: 100%; padding: 8px;" /></label>
        </div>
        <button id="generateSite" style="padding: 10px 20px; cursor: pointer;">Сгенерировать сайт из снапшота</button>
        <p id="siteStatus" style="color: #666;"></p>
        <pre id="siteResult" style="background: #f5f5f5; padding: 10px; overflow: auto; margin-top: 10px; max-height: 200px;"></pre>
      </section>

      <section style="margin-top: 20px; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h2>Библиотека</h2>
        <button id="loadCores" style="padding: 10px 20px; cursor: pointer;">Обновить компании</button>
        <pre id="coresList" style="background: #f5f5f5; padding: 10px; overflow: auto; margin-top: 10px; max-height: 300px;"></pre>
      </section>
    </div>
  `;

  async function loadModels() {
    try {
      const res = await fetch('http://localhost:3000/api/models');
      const data = await res.json();
      const sel = document.getElementById('model') as HTMLSelectElement;
      sel.innerHTML = '';
      (data.models || []).forEach((m: any) => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = m.name || m.id;
        sel.appendChild(opt);
      });
    } catch (e) { console.error(e); }
  }

  loadModels();

  document.getElementById('generateCore')?.addEventListener('click', async () => {
    const status = document.getElementById('status')!;
    status.textContent = 'Генерация...';
    const body = {
      country: (document.getElementById('country') as HTMLInputElement).value,
      scale: (document.getElementById('scale') as HTMLSelectElement).value,
      brandName: (document.getElementById('brandName') as HTMLInputElement).value || undefined,
      model: (document.getElementById('model') as HTMLSelectElement).value
    };
    try {
      const res = await fetch('http://localhost:3000/api/core/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      status.textContent = res.ok ? 'Готово' : 'Ошибка';
      document.getElementById('coreResult')!.textContent = JSON.stringify(data, null, 2);
      if (res.ok && data.core?.id) {
        (document.getElementById('coreId') as HTMLInputElement).value = data.core.id;
      }
    } catch (e: any) {
      status.textContent = 'Ошибка';
      document.getElementById('coreResult')!.textContent = e.message;
    }
  });

  document.getElementById('generateSite')?.addEventListener('click', async () => {
    const status = document.getElementById('siteStatus')!;
    status.textContent = 'Генерация сайта...';
    const body = {
      coreId: (document.getElementById('coreId') as HTMLInputElement).value,
      lang: (document.getElementById('lang') as HTMLSelectElement).value,
      style: (document.getElementById('style') as HTMLInputElement).value
    };
    try {
      const res = await fetch('http://localhost:3000/api/site/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      status.textContent = res.ok ? 'Готово' : 'Ошибка';
      document.getElementById('siteResult')!.textContent = JSON.stringify(data, null, 2);
    } catch (e: any) {
      status.textContent = 'Ошибка';
      document.getElementById('siteResult')!.textContent = e.message;
    }
  });

  document.getElementById('loadCores')?.addEventListener('click', async () => {
    const res = await fetch('http://localhost:3000/api/core/list');
    const data = await res.json();
    document.getElementById('coresList')!.textContent = JSON.stringify(data, null, 2);
  });
}
