# Copilot Instructions for HorsSentier

This repository is an Angular 21 standalone application with SSR via `@angular/ssr`.

## Use this guidance first
- Read `AGENTS.md` for the project-specific architecture, build/test commands, and coding conventions.
- Prefer existing Angular CLI conventions and avoid introducing custom build scripts.
- Keep formatting consistent with `package.json` Prettier settings:
  - `singleQuote: true`
  - `printWidth: 100`
  - Use `angular` parser for `.html` files.

## Key development commands
- `npm start` — run development server (`ng serve`).
- `npm run build` — build browser and server output.
- `npm test` — run unit tests.
- `npm run serve:ssr:hors-sentier` — run SSR server after production build.

## Important patterns
- Use standalone components and `bootstrapApplication`; do not add legacy NgModule scaffolding unless expressly requested.
- SSR config is split between browser and server in `src/app/app.config.ts`, `src/app/app.config.server.ts`, `src/main.server.ts`, and `src/server.ts`.
- Static assets are served from `dist/browser` after build.

## Component structure and vision
- Components are organized in atomic design style: atoms, molecules, organisms, templates, pages
- Pages are the top-level components that correspond to routes and are responsible for orchestrating the layout and composition of other components.
- The application should be as modular and reusable as possible, with an emphasis on ease of maintenance and scalability. To this end, create as many components as possible.

## Documentation link
- `AGENTS.md` — main repository guidance for AI agents.
