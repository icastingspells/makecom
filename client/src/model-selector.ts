export async function loadModels() {
  const sel = document.getElementById('model') as HTMLSelectElement;
  const search = document.getElementById('modelSearch') as HTMLInputElement;
  const status = document.getElementById('modelSearchStatus')!;
  sel.disabled = true;
  status.textContent = 'Загрузка моделей…';
  try {
    const res = await fetch('/api/models');
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
