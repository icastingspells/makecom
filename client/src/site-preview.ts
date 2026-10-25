export function showSitePreview(container: HTMLElement, files: Record<string, string>): void {
  const pages = ['index.html', 'product.html', 'company.html'].filter(name => typeof files[name] === 'string');
  container.classList.remove('hidden');
  container.innerHTML = `<article class="panel"><header class="panel-header"><div class="panel-title-group"><h2>Предпросмотр сайта</h2><p>Проверьте оформление, перевод и навигацию перед скачиванием.</p></div><button class="btn ghost" type="button" data-preview-size>Мобильный вид</button></header><div class="preview-toolbar"><label>Страница <select aria-label="Страница предпросмотра"></select></label></div><div class="preview-surface"><iframe title="Предпросмотр сгенерированного сайта" sandbox="allow-same-origin" referrerpolicy="no-referrer"></iframe></div></article>`;
  const select = container.querySelector('select')!;
  const frame = container.querySelector('iframe')!;
  const surface = container.querySelector('.preview-surface')!;
  pages.forEach((page, index) => select.add(new Option(['Главная', 'Продукт', 'Компания и контакты'][index], page)));
  const render = (page: string) => {
    if (!pages.includes(page)) return;
    select.value = page;
    const document = new DOMParser().parseFromString(files[page], 'text/html');
    document.querySelectorAll('script, iframe, object, embed, base, link, meta[http-equiv]').forEach(node => node.remove());
    const policy = document.createElement('meta'); policy.httpEquiv = 'Content-Security-Policy';
    policy.content = "default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'";
    const style = document.createElement('style'); style.textContent = files['style.css'] || '';
    document.head.prepend(policy); document.head.append(style);
    frame.onload = () => {
      frame.contentDocument?.addEventListener('click', event => {
        const anchor = (event.target as Element).closest('a'); if (!anchor) return;
        event.preventDefault();
        const href = anchor.getAttribute('href') || '';
        if (href.startsWith('#')) frame.contentDocument?.getElementById(href.slice(1))?.scrollIntoView();
        else {
          const target = href.split('#')[0];
          if (pages.includes(target)) render(target);
        }
      });
      frame.contentDocument?.addEventListener('submit', event => event.preventDefault());
    };
    frame.srcdoc = '<!DOCTYPE html>' + document.documentElement.outerHTML;
  };
  select.addEventListener('change', () => render(select.value));
  container.querySelector<HTMLButtonElement>('[data-preview-size]')!.addEventListener('click', event => {
    const mobile = surface.classList.toggle('mobile');
    (event.currentTarget as HTMLButtonElement).textContent = mobile ? 'Широкий вид' : 'Мобильный вид';
  });
  if (pages.length) render(pages[0]);
}
