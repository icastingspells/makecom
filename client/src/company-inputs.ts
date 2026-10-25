type Choice = { value: string; label: string; supported: boolean };
type Catalog = { countries: Choice[]; scales: Choice[]; brands: string[]; directions: string[]; serviceTypes: string[] };

export function mountCompanyInputs() {
  const brand = document.getElementById('brandName') as HTMLInputElement;
  brand.maxLength = 200;
  const container = document.createElement('div');
  container.className = 'company-catalog-fields';
  container.style.cssText = 'display:contents';
  container.innerHTML = `<div class="field" style="grid-column:1/-1"><label class="field-label" for="businessDirection">Направление бизнеса</label><div class="field-control"><input id="businessDirection" list="directionOptions" maxlength="1000" placeholder="Выберите из подсказок или введите своё" /></div><datalist id="directionOptions"></datalist></div><div class="field" style="grid-column:1/-1"><label class="field-label" for="b2bServiceType">Тип B2B-сервиса</label><div class="field-control"><input id="b2bServiceType" list="serviceOptions" maxlength="1000" placeholder="Выберите из подсказок или введите своё" /></div><datalist id="serviceOptions"></datalist></div><p class="field-hint" id="catalogStatus" style="grid-column:1/-1" role="status">Загрузка каталога…</p>`;
  brand.closest('.field')!.after(container);
  const status = container.querySelector('#catalogStatus')!;
  const buttons: HTMLButtonElement[] = [];
  const randomButton = (id: string, values: string[], label: string) => {
    const control = document.getElementById(id) as HTMLInputElement | HTMLSelectElement;
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'btn ghost'; button.textContent = 'Случайно'; button.setAttribute('aria-label', `Случайно: ${label}`);
    button.addEventListener('click', () => {
      const random = crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
      control.value = values[Math.floor(random * values.length)];
      status.textContent = `${label}: выбран вариант из каталога. Можно изменить перед генерацией.`;
    });
    control.closest('.field')!.append(button); buttons.push(button);
  };
  void fetch('/api/core/catalogs').then(response => { if (!response.ok) throw new Error(); return response.json(); }).then(({ catalog }: { catalog: Catalog }) => {
    if (!container.isConnected) return;
    for (const [id, choices] of [['country', catalog.countries], ['scale', catalog.scales]] as const) {
      const control = document.getElementById(id) as HTMLSelectElement;
      const previous = control.value;
      control.replaceChildren(...choices.map(choice => {
        const option = new Option(choice.label + (choice.supported ? '' : ' — позже'), choice.value);
        option.disabled = !choice.supported; return option;
      }));
      control.value = choices.find(choice => choice.value === previous && choice.supported)?.value ?? choices.find(choice => choice.supported)!.value;
      randomButton(id, choices.filter(choice => choice.supported).map(choice => choice.value), id === 'country' ? 'Страна' : 'Масштаб');
    }
    for (const [id, values] of [['directionOptions', catalog.directions], ['serviceOptions', catalog.serviceTypes]] as const) {
      container.querySelector('#' + id)!.replaceChildren(...values.map(value => new Option(value, value)));
    }
    randomButton('brandName', catalog.brands, 'Название бренда');
    randomButton('businessDirection', catalog.directions, 'Направление бизнеса');
    randomButton('b2bServiceType', catalog.serviceTypes, 'Тип B2B-сервиса');
    const all = document.createElement('button'); all.type = 'button'; all.className = 'btn ghost'; all.textContent = 'Случайные параметры';
    all.addEventListener('click', () => { buttons.forEach(button => button.click()); status.textContent = 'Выбраны случайные параметры из каталога. Проверьте их перед генерацией. Модель и бюджет сохранены.'; });
    status.before(all);
    status.textContent = 'Сейчас поддерживаются Германия, небольшие и средние компании. Случайный выбор использует только доступные варианты. Заданное название бренда фиксируется в запросе; каталог не проверяет товарные знаки.';
  }).catch(() => { if (container.isConnected) status.textContent = 'Каталог недоступен. Параметры можно ввести вручную; доступны Германия, небольшие и средние компании.'; });
}
