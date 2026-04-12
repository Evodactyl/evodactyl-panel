import { Router } from 'express';
import { serveLocale } from '../controllers/base/localeController.js';

const router = Router();

// Liveness probe. Returns 200 while the process is alive — no auth, no DB
// query, no external calls. Consumed by the install script's health poll
// and the Dockerfile HEALTHCHECK, so it must stay cheap and unauthenticated.
router.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
});

// Locale/translation endpoint — still served by the API because translations
// live in packages/shared and can depend on DB-backed settings.
router.get('/locales/locale.json', serveLocale);

// Sanctum CSRF cookie endpoint — sets XSRF-TOKEN cookie for SPA auth.
// Our csrfProtection middleware sets the cookie on every request, so this
// endpoint just acknowledges it so the frontend's bootstrap sequence works.
router.get('/sanctum/csrf-cookie', (_req, res) => {
    res.status(204).end();
});

export default router;
