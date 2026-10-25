import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { showSitePreview } from '../site-preview';

export async function loadCardVersions(coreId: string) {
  const container = document.getElementById('cardVersions')!;
  container.textContent = 'Загрузка версий сайтов…';
  try {
    const res = await fetch(`/api/site/versions/${encodeURIComponent(coreId)}`);
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
