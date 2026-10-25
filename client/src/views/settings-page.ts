import { mountQuotaCheck } from '../generation-operations';

export function renderSettings(app: HTMLElement, pageHeading: (title: string, description: string, eyebrow: string) => void) {
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
