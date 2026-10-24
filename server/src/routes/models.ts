import { Router } from 'express';
import { openRouterService } from '../services/openrouter.js';

const router = Router();

// Получить список моделей (прокси, без ключа на клиент)
router.get('/', async (_req, res) => {
  try {
    const models = await openRouterService.getModels();
    // Возвращаем только безопасные поля
    const safe = models.map(m => ({
      id: m.id,
      name: m.name,
      pricing: m.pricing,
      context_length: m.context_length
    }));
    res.json({ models: safe });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
