import { Router } from 'express';
import { CompanyCoreService } from '../core/company-core.js';
import { createStorage } from '../storage/index.js';
import { siteGenerator } from '../generators/site-generator.js';
import { CrossModuleValidator } from '../validators/cross-module.js';

const router = Router();
const coreService = new CompanyCoreService();
const storage = createStorage();
const crossValidator = new CrossModuleValidator();

router.post('/generate', async (req, res) => {
  try {
    const { coreId, lang = 'ru', style = 'default' } = req.body;

    if (!coreId) {
      return res.status(400).json({ error: 'coreId required' });
    }

    const core = await storage.getCore(coreId);
    if (!core) {
      return res.status(404).json({ error: 'Core not found' });
    }

    coreService.createCore(core);
    const snapshot = coreService.createSnapshot();
    if (!snapshot) {
      return res.status(500).json({ error: 'Failed to create snapshot' });
    }

    // Генерируем сайт ТОЛЬКО из снапшота
    const result = siteGenerator.generate(snapshot, { lang, style });

    // Базовая кросс-валидация - убеждаемся что не перегенерировали core
    const check = crossValidator.validateNoCoreRegeneration(snapshot, result.files);
    if (!check.valid) {
      return res.status(400).json({ error: 'Cross-module validation failed', errors: check.errors });
    }

    await storage.saveSiteVersion(result.version);

    res.json({
      version: result.version,
      files: result.files,
      fileList: Object.keys(result.files),
      snapshotHash: snapshot.hash
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
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
