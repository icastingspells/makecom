import { logEvent } from '../logging.js';
import { beginOperation } from './operations.js';
import { isCoreApproved } from '../core/card-actions.js';
import { Router } from 'express';
import { CompanyCoreService } from '../core/company-core.js';
import { createStorage } from '../storage/index.js';
import { aiSiteGenerator, SiteOptionsSchema, SiteGenerationError } from '../generators/ai-site-generator.js';
import { requireOpenRouterSession, MissingSessionError } from './session.js';

const router = Router();
const coreService = new CompanyCoreService();
const storage = createStorage();

router.post('/generate', async (req, res) => {
  let tracking: Awaited<ReturnType<typeof beginOperation>> | undefined;
  let resultId: string | undefined;
  try {
    const apiKey = requireOpenRouterSession(req);
    const parsed = SiteOptionsSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Проверьте компанию, язык, модель и описание оформления', errors: parsed.error.issues.map(i => i.message) });
    const { coreId } = parsed.data;

    const core = await storage.getCore(coreId);
    if (!core) {
      return res.status(404).json({ error: 'Core not found' });
    }
    if (!isCoreApproved(core)) return res.status(409).json({ error: 'Перед генерацией сайта откройте карточку, проверьте данные и утвердите её текущую версию.' });

    coreService.createCore(core);
    const snapshot = coreService.createSnapshot();
    if (!snapshot) {
      return res.status(500).json({ error: 'Failed to create snapshot' });
    }

    // Генерируем сайт ТОЛЬКО из снапшота
    tracking = await beginOperation(req, 'site', parsed.data.model);
    const result = await aiSiteGenerator.generate(snapshot, parsed.data, apiKey, tracking.context);

    await tracking.context.update({ stage: 'saving' });
    await storage.saveSiteVersion(result.version);
    resultId = result.version.id;
    await tracking.finish(true, resultId);
    tracking = undefined;

    res.json({
      version: result.version,
      files: result.files,
      fileList: Object.keys(result.files),
      snapshotHash: snapshot.hash,
      costUsd: result.costUsd, mock: result.mock, translationReviewRequired: true
    });
  } catch (err: any) {
    if (tracking) { await tracking.finish(false, resultId).catch(() => logEvent('generation.journal_failed', {}, 'error')); tracking = undefined; }
    if (err instanceof MissingSessionError) return res.status(401).json({ error: err.message });
    if (err instanceof SiteGenerationError) return res.status(502).json({ error: err.message });
    res.status(500).json({ error: err.message });
  } finally {
    if (tracking) await tracking.finish(false, resultId).catch(() => logEvent('generation.journal_failed', {}, 'error'));
  }
});

router.get('/versions/:coreId', async (req, res) => {
  try {
    const versions = await storage.getSiteVersions(req.params.coreId);
    res.json({ versions });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
