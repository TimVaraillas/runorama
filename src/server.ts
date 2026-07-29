import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import cookieParser from 'cookie-parser';
import { join } from 'node:path';
import 'dotenv/config';
import { createApiRouter } from './server/routes/api.route';
import { createAuthRouter } from './server/routes/auth.route';
import { attachUser } from './server/auth/auth.middleware';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * API REST de Runorama (nutrition).
 * Limite relevée à 5 Mo pour accepter les photos de produits en base64.
 */
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());
// Attache l'utilisateur authentifié (si cookie JWT valide) à chaque requête API.
app.use('/api', attachUser);
app.use('/api/auth', createAuthRouter());
app.use('/api', createApiRouter());

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

/**
 * Gestionnaire d'erreurs global de l'API.
 */
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error('[API] Erreur non gérée :', err);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  },
);

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
