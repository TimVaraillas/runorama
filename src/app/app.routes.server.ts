import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    // Rendu SSR à la demande : les données proviennent de MongoDB au runtime,
    // le prerendering statique n'est donc pas adapté ici.
    path: '**',
    renderMode: RenderMode.Server,
  },
];
