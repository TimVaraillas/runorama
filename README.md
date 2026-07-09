# 🏃 Runorama

Application **Angular 22 SSR** pour **créer des séances de course à pied** (blocs de
travail + allures) **exportables vers les montres Garmin**, et les **planifier sur un
calendrier**.

## Stack technique

| Domaine         | Choix                                            |
| --------------- | ------------------------------------------------ |
| Framework       | Angular 22 (standalone, signals, SSR)            |
| Rendu           | Server-Side Rendering (Express + `@angular/ssr`) |
| CSS             | Tailwind CSS v4 (`@tailwindcss/postcss`)         |
| Icônes          | FontAwesome (`@fortawesome/angular-fontawesome`) |
| Composants      | Atomic Design (atoms / molecules / organisms…)   |
| Documentation   | Storybook 10 + Compodoc                          |
| Base de données | MongoDB via Mongoose (côté serveur SSR)          |

## Prérequis

- Node.js **≥ 22.22.3** (via `nvm use 22`)
- Une instance MongoDB accessible (locale ou distante)

## Configuration


| Variable      | Description              | Défaut                               |
| ------------- | ------------------------ | ------------------------------------ |
| `MONGODB_URI` | URI de connexion MongoDB | `mongodb://127.0.0.1:27017/runorama` |
| `PORT`        | Port du serveur SSR      | `4000`                               |

## Scripts

```bash
npm start                     # Serveur de dev Angular (http://localhost:4200)
npm run build                 # Build de production (browser + serveur SSR)
npm run serve:ssr:runorama    # Lance le serveur SSR compilé (API + rendu)
npm run storybook             # Documentation des composants (http://localhost:6006)
npm run build-storybook       # Build statique de Storybook
npm test                      # Tests unitaires (Vitest)
```

## Structure du projet

```
src/
├─ app/
│  ├─ core/                    # Cœur métier, agnostique de l'UI
│  │  ├─ models/               # Types du domaine (Workout, PlannedSession…)
│  │  └─ utils/                # Utilitaires (formatage allure/durée/distance)
│  ├─ features/                # Logique par fonctionnalité
│  │  ├─ workouts/services/    # WorkoutService (API séances)
│  │  └─ planning/services/    # PlanningService (API calendrier)
│  ├─ pages/                   # Pages routées (dashboard, workouts, calendar)
│  └─ components/              # Design System — Atomic Design
│     ├─ atoms/                # Button, Icon, Badge, ZoneChip
│     ├─ molecules/            # StatCard
│     ├─ organisms/            # Header
│     └─ templates/            # MainLayout
├─ server/                     # Code serveur (SSR + API)
│  ├─ db/                      # Connexion Mongoose
│  ├─ models/                  # Schémas Mongoose
│  ├─ routes/                  # Router API Express (/api)
│  └─ services/                # Export Garmin
├─ server.ts                   # Entrée Express SSR + montage de l'API
└─ styles.css                  # Styles globaux + thème Tailwind
```

## API REST

Montée sous `/api` par le serveur SSR :

| Méthode | Route                       | Description                         |
| ------- | --------------------------- | ----------------------------------- |
| GET     | `/api/workouts`             | Liste des séances                   |
| POST    | `/api/workouts`             | Créer une séance                    |
| GET     | `/api/workouts/:id`         | Détail d'une séance                 |
| PUT     | `/api/workouts/:id`         | Modifier une séance                 |
| DELETE  | `/api/workouts/:id`         | Supprimer une séance                |
| GET     | `/api/workouts/:id/garmin`  | **Export au format Garmin Connect** |
| GET     | `/api/planned-sessions`     | Séances planifiées (`?from&to`)     |
| POST    | `/api/planned-sessions`     | Planifier une séance                |
| PUT     | `/api/planned-sessions/:id` | Modifier une planification          |
| DELETE  | `/api/planned-sessions/:id` | Retirer du calendrier               |

## Modèle de séance & export Garmin

Une séance est une liste d'`elements` : soit un **pas simple** (`WorkoutStep`),
soit un **bloc répété** (`WorkoutRepeat`). Chaque pas porte une **cible** (allure,
FC, cadence) et une **condition de fin** (distance, temps, bouton lap).

Le service `toGarminWorkout` (`src/server/services/garmin-export.ts`) convertit
ce modèle vers la structure JSON attendue par l'API Garmin Connect
(`workoutSegments` / `ExecutableStepDTO` / `RepeatGroupDTO`).

## Notes

- `.npmrc` fixe `legacy-peer-deps=true` : Storybook 10 déclare une peer dependency
  sur `@angular-devkit/architect < 0.2200.0` alors qu'Angular 22 fournit `0.2200.x`.
  L'API utilisée est stable, l'installation est donc forcée.
- Le rendu est en mode **SSR à la demande** (pas de prerendering statique), car les
  données proviennent de MongoDB au runtime.
