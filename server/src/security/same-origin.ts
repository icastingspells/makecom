import { RequestHandler } from 'express';

export function sameOriginApiGuard(appBaseUrl: string): RequestHandler {
  return (req, res, next) => {
    const origin = req.get('origin');
    const sameOrigin = origin === `${req.protocol}://${req.get('host')}` || origin === appBaseUrl;
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && ((origin && !sameOrigin) || req.get('sec-fetch-site') === 'cross-site')) {
      res.status(403).json({ error: 'Cross-site requests are not allowed' });
      return;
    }
    res.setHeader('Cache-Control', 'no-store');
    next();
  };
}
