const app = document.getElementById('app');

if (app) {
  app.innerHTML = `
    <div style="font-family: sans-serif; max-width: 800px; margin: 40px auto; padding: 20px;">
      <h1>Makecom - Company & Site Generator</h1>
      <p>Скелет готов. CompanyCore, Storage, Validators, OpenRouter инфраструктура подключены.</p>
      
      <section style="margin-top: 30px; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h2>Этап А - Карточка компании</h2>
        <p>В мок-режиме можно создать тестовый CompanyCore</p>
        <button id="createCore" style="padding: 10px 20px; cursor: pointer;">Создать тестовую карточку компании</button>
        <pre id="coreResult" style="background: #f5f5f5; padding: 10px; overflow: auto; margin-top: 10px;"></pre>
      </section>

      <section style="margin-top: 20px; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h2>Модели OpenRouter</h2>
        <button id="loadModels" style="padding: 10px 20px; cursor: pointer;">Загрузить список моделей</button>
        <pre id="modelsResult" style="background: #f5f5f5; padding: 10px; overflow: auto; margin-top: 10px; max-height: 300px;"></pre>
      </section>
    </div>
  `;

  document.getElementById('createCore')?.addEventListener('click', async () => {
    const res = await fetch('http://localhost:3000/api/core/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country: 'DE', scale: 'small' })
    });
    const data = await res.json();
    document.getElementById('coreResult')!.textContent = JSON.stringify(data, null, 2);
  });

  document.getElementById('loadModels')?.addEventListener('click', async () => {
    const res = await fetch('http://localhost:3000/api/models');
    const data = await res.json();
    document.getElementById('modelsResult')!.textContent = JSON.stringify(data, null, 2);
  });
}
