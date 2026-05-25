# Invoxa

Plateforme SaaS moderne et modulaire de gestion métier, devis et facturation multi-entreprises.

## Stack

- Frontend: React, TypeScript, Vite, Tailwind, composants style shadcn/ui
- Backend: NestJS modulaire, REST, Zod, Prisma
- Database: PostgreSQL
- PDF: Puppeteer
- Multi-tenant: `tenantId` obligatoire dans les modèles et contexte de requête

## Lancer

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
pnpm prisma:generate
pnpm prisma:migrate
pnpm dev
```

Le frontend écoute sur `http://localhost:5173` et l'API sur `http://localhost:3000`.

Si le port `3000` est déjà utilisé :

```bash
PORT=3001 pnpm --filter @invoxa/api dev
VITE_API_URL=http://localhost:3001/api pnpm --filter @invoxa/web dev -- --port 5174
```

## Architecture

Le CORE ne contient que les concepts génériques: entreprises, utilisateurs, rôles, CRM, catalogue, devis, factures, paiements, documents, recherche, templates, champs personnalisés et activité.

Les métiers vivent dans `apps/api/src/modules/*` et `apps/web/src/modules/*`. Le module Garage ajoute véhicules, interventions, diagnostics, ordres de réparation, pièces et main-d'oeuvre. Les devis et factures peuvent lier un objet métier via `businessObjectType` et `businessObjectId`, sans dépendance du CORE vers Garage.

## API principale

- `GET /api/app/state` et `PUT /api/app/state` synchronisent l'expérience web avec PostgreSQL.
- `core/crm/customers`, `core/catalog/items`, `core/quotes`, `core/invoices`, `core/payments`, `core/templates` exposent les opérations REST métier.
- `modules/garage/vehicles`, `modules/garage/interventions`, `modules/garage/work-orders`, `modules/garage/parts` portent les données spécifiques garage.
