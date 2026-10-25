type Attempt = { number: number; status: string; costUsd?: number; promptTokens?: number; completionTokens?: number };
type Operation = { id: string; kind: string; model: string; status: string; stage: string; createdAt: string; limitUsd: number; estimatedAttemptUsd?: number; mock: boolean; retryAt?: string; resultId?: string; attempts: Attempt[] };
const money = (value: number) => '$' + value.toFixed(6);
const stages: Record<string, string> = { preflight: 'Проверка модели и бюджета', request: 'Ожидание ответа модели', retry: 'Ожидание повторной попытки', validation: 'Разбор формата ответа', saving: 'Сохранение результата', done: 'Готово' };
const statuses: Record<string, string> = { running: 'В процессе', succeeded: 'Завершено', failed: 'Ошибка', interrupted: 'Прервано перезапуском сервера' };

export function operationCost(operation: Operation): string {
  if (operation.mock) return 'Тестовый режим · без расходов';
  if (!operation.attempts.length) return 'Запросов к модели ещё не было · $0';
  const reported = operation.attempts.filter(a => a.status === 'reported').reduce((sum, a) => sum + (a.costUsd ?? 0), 0);
  const estimated = operation.attempts.filter(a => a.status === 'estimated').reduce((sum, a) => sum + (a.costUsd ?? 0), 0);
  const unknown = operation.attempts.some(a => a.status === 'unknown' || a.status === 'requesting');
  const parts = [`Подтверждено OpenRouter: ${money(reported)}`];
  if (operation.attempts.some(a => a.status === 'estimated')) parts.push(`Оценка по токенам: ${money(estimated)}`);
  if (unknown) parts.push('Есть попытки с неизвестной стоимостью; итог пока неполный');
  return parts.join(' · ');
}

export function mountGenerationControls() {
  const select = document.getElementById('model');
  if (!select) return;
  const controls = document.createElement('div');
  controls.className = 'generation-controls';
  controls.innerHTML = `<label class="filter-toggle"><input id="freeModelsOnly" type="checkbox" /> Только бесплатные модели</label><label class="field-label" for="operationBudget">Лимит на генерацию, USD</label><input id="operationBudget" type="number" min="0" step="0.01" value="0.10" aria-describedby="budgetHint" /><span class="field-hint" id="budgetHint">Лимит включает повторные попытки. Предварительный расчёт не является списанием.</span><div id="generationProgress" class="generation-progress" role="status" aria-live="polite"></div>`;
  select.closest('.field')!.after(controls);
  void fetch('/api/operations/limits').then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(data => {
    const input = controls.querySelector<HTMLInputElement>('#operationBudget')!;
    if (Number.isFinite(data.maxCostUsd) && data.maxCostUsd > 0) { input.max = String(data.maxCostUsd); input.value = String(Math.min(Number(input.value), data.maxCostUsd)); controls.querySelector('#budgetHint')!.textContent += ` Серверный максимум: ${money(data.maxCostUsd)}.`; }
  }).catch(() => { controls.querySelector('#budgetHint')!.textContent += ' Сервер дополнительно проверит свой лимит.'; });
}

export async function fetchGeneration(url: string, body: unknown): Promise<Response> {
  const budget = document.getElementById('operationBudget') as HTMLInputElement;
  if (!budget.checkValidity() || !budget.value.trim()) { budget.reportValidity(); throw new Error('Укажите допустимый лимит расходов'); }
  const progress = document.getElementById('generationProgress')!;
  const operationId = crypto.randomUUID();
  let stopped = false;
  const started = Date.now();
  const poll = async () => {
    if (stopped) return;
    try {
      const response = await fetch('/api/operations/' + operationId, { signal: AbortSignal.timeout(5000) });
      if (response.ok) {
        const { operation }: { operation: Operation } = await response.json();
        const elapsed = Math.round((Date.now() - started) / 1000);
        progress.textContent = `${statuses[operation.status]} · ${stages[operation.stage]} · ${elapsed} с\nПопыток: ${operation.attempts.length} · Лимит: ${money(operation.limitUsd)}${operation.estimatedAttemptUsd !== undefined ? ` · Оценка одной попытки до ${money(operation.estimatedAttemptUsd)}` : ''}\n${operationCost(operation)}${operation.retryAt ? `\nПовтор не раньше ${new Date(operation.retryAt).toLocaleTimeString('ru-RU')}` : ''}`;
      }
    } catch { if (progress.isConnected) progress.textContent = 'Не удалось обновить прогресс. Запрос генерации продолжает выполняться; результат появится в истории.'; }
    if (!stopped && progress.isConnected) timer = window.setTimeout(poll, 1200);
  };
  let timer = window.setTimeout(poll, 300);
  progress.textContent = 'Подготовка операции…';
  try {
    return await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Operation-Id': operationId, 'X-Operation-Budget': budget.value, 'X-Free-Only': String((document.getElementById('freeModelsOnly') as HTMLInputElement).checked) }, body: JSON.stringify(body) });
  } finally {
    window.clearTimeout(timer);
    // One final read after the route has saved its terminal status.
    await poll();
    stopped = true;
    window.clearTimeout(timer);
  }
}

export function renderOperations(host: HTMLElement) {
  host.innerHTML = `<article class="panel"><header class="panel-header"><div class="panel-title-group"><h2>Генерации и расходы</h2><p>Стоимость сохраняется и при ошибке проверки результата. История содержит только метаданные.</p></div><button class="btn ghost" id="refreshOperations">Обновить</button></header><div class="operations-body"><p id="operationsTotal" role="status">Загрузка…</p><div id="operationsList"></div></div></article>`;
  const list = host.querySelector('#operationsList')!;
  const total = host.querySelector('#operationsTotal')!;
  let timer: number | undefined;
  const load = async () => {
    window.clearTimeout(timer);
    try {
      const response = await fetch('/api/operations');
      if (!response.ok) throw new Error();
      const { operations }: { operations: Operation[] } = await response.json();
      if (!list.isConnected) return;
      const confirmed = operations.reduce((sum, op) => sum + op.attempts.filter(a => a.status === 'reported').reduce((s, a) => s + (a.costUsd ?? 0), 0), 0);
      const incomplete = operations.some(op => op.attempts.some(a => ['unknown', 'requesting', 'estimated'].includes(a.status)));
      total.textContent = `Операций: ${operations.length} · Подтверждённые расходы: ${money(confirmed)}${incomplete ? ' · Итог неполный: есть оценки или неизвестные списания' : ''}. Расходы до появления журнала сюда не входят.`;
      list.replaceChildren();
      if (!operations.length) list.textContent = 'Пока нет генераций. Новые операции появятся здесь автоматически.';
      for (const operation of operations) {
        const row = document.createElement('article'); row.className = 'operation-row';
        const title = document.createElement('h3'); title.textContent = `${operation.kind === 'site' ? 'Сайт' : 'Карточка компании'} · ${statuses[operation.status]}`;
        const details = document.createElement('p'); details.textContent = `${new Date(operation.createdAt).toLocaleString('ru-RU')} · ${operation.model}\n${stages[operation.stage]} · Попыток: ${operation.attempts.length} · Лимит: ${money(operation.limitUsd)}\n${operationCost(operation)}`;
        row.append(title, details);
        for (const attempt of operation.attempts) {
          const line = document.createElement('p'); line.className = 'field-hint';
          line.textContent = `Попытка ${attempt.number}: ${({ reported: 'стоимость OpenRouter', estimated: 'оценка по тарифу', unknown: 'стоимость неизвестна', requesting: 'ответ ожидается', rejected: 'запрос отклонён' } as Record<string,string>)[attempt.status]}${attempt.costUsd !== undefined ? ' · ' + money(attempt.costUsd) : ''}${attempt.completionTokens !== undefined ? ` · Токены: ${attempt.promptTokens ?? '?'} вход / ${attempt.completionTokens} выход` : ''}`;
          row.append(line);
        }
        if (operation.resultId && operation.kind === 'company') { const link = document.createElement('a'); link.href = '#cards/' + encodeURIComponent(operation.resultId); link.textContent = 'Открыть карточку →'; row.append(link); }
        list.append(row);
      }
      if (operations.some(op => op.status === 'running')) timer = window.setTimeout(load, 2000);
    } catch { total.textContent = 'Не удалось загрузить историю. Повторите обновление.'; }
  };
  host.querySelector('#refreshOperations')!.addEventListener('click', load);
  void load();
}

export function mountQuotaCheck() {
  const form = document.getElementById('tokenForm');
  if (!form) return;
  const button = document.createElement('button'); button.type = 'button'; button.className = 'btn ghost'; button.textContent = 'Обновить лимиты ключа';
  const output = document.createElement('div'); output.className = 'key-limits'; output.id = 'keyLimits'; output.setAttribute('role', 'status'); output.setAttribute('aria-live', 'polite');
  form.append(button, output);
  let activeRequest: AbortController | undefined;
  const clear = () => {
    activeRequest?.abort(); activeRequest = undefined; button.disabled = false;
    output.textContent = 'После подключения здесь появятся лимиты ключа.';
  };
  const refresh = async () => {
    activeRequest?.abort();
    const request = new AbortController(); activeRequest = request;
    button.disabled = true; output.textContent = 'Получение лимитов OpenRouter…';
    try {
      const response = await fetch('/api/operations/quota', { signal: AbortSignal.any([request.signal, AbortSignal.timeout(20000)]) }); const data = await response.json();
      if (activeRequest !== request || !output.isConnected) return;
      if (!response.ok) throw new Error(data.error);
      if (data.mock) { output.textContent = 'Тестовый режим: лимиты не запрашивались.'; return; }
      const value = (amount: unknown) => typeof amount === 'number' && Number.isFinite(amount) ? money(amount) : 'Не сообщено';
      const reset = ({ none: 'Без периодического сброса', daily: 'Ежедневно', weekly: 'Еженедельно', monthly: 'Ежемесячно' } as Record<string,string>)[data.limitReset] ?? 'Не сообщено';
      const rows = [
        ['Лимит ключа', data.limitState === 'unlimited' ? 'Не установлен' : value(data.limitUsd)],
        ['Остаток лимита ключа', value(data.remainingUsd)],
        ['Расходы ключа', value(data.usageUsd)],
        ['Сброс лимита', reset],
        ['Расходы за день', value(data.usageDailyUsd)],
        ['Расходы за неделю', value(data.usageWeeklyUsd)],
        ['Расходы за месяц', value(data.usageMonthlyUsd)],
        ['Бесплатные запросы сегодня', data.freeDaily ? `${data.freeDaily.remaining ?? '?'} осталось из ${data.freeDaily.limit ?? '?'} · использовано ${data.freeDaily.used ?? '?'}` : 'Квота не сообщена']
      ];
      const heading = document.createElement('h3'); heading.textContent = 'Лимиты OpenRouter API';
      const list = document.createElement('dl');
      for (const [label, content] of rows) { const term = document.createElement('dt'); term.textContent = label; const detail = document.createElement('dd'); detail.textContent = content; list.append(term, detail); }
      const note = document.createElement('p'); note.className = 'field-hint'; note.textContent = 'Это лимиты данного ключа, а не общий баланс аккаунта. Отсутствие лимита ключа не означает неограниченный баланс. Минутные ограничения и доступность провайдера действуют дополнительно.';
      output.replaceChildren(heading, list, note);
    } catch (error) { if (activeRequest === request && output.isConnected) output.textContent = error instanceof Error ? error.message : 'Не удалось получить лимиты'; }
    finally { if (activeRequest === request) { activeRequest = undefined; button.disabled = false; } }
  };
  button.addEventListener('click', () => { void refresh(); });
  clear();
  return { refresh, clear };
}
