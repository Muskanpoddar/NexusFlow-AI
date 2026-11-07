
# NexusFlow AI

NexusFlow is a workspace app for projects, tasks and teams, with an AI assistant
that answers questions using the data of the workspace you are currently in.

## Stack

| Layer     | Technology                                     |
| --------- | ---------------------------------------------- |
| Frontend  | React 19, Vite 8, Tailwind CSS 4, TypeScript   |
| Backend   | Express 5, TypeScript (ESM), Zod, JWT, bcrypt   |
| Database  | PostgreSQL with Prisma 7                        |
| AI        | MiniMax chat completions, with a built-in fallback |

## Getting started

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env      # then fill in DATABASE_URL and JWT_SECRET
npm run prisma:generate   # the client is generated into src/generated (gitignored)
npm run db:migrate        # applies the migrations in prisma/migrations
npm run dev               # http://localhost:5000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev               # http://localhost:5173
```

Point the frontend at another API with `VITE_API_URL` in `frontend/.env`.

## Environment

| Variable                         | Used for                                        |
| -------------------------------- | ----------------------------------------------- |
| `DATABASE_URL`                   | PostgreSQL connection string                    |
| `JWT_SECRET`                     | Access token signing, at least 32 characters    |
| `CORS_ORIGIN`                    | Allowed frontend origin                         |
| `FRONTEND_URL`                   | Base URL of the password reset link             |
| `PASSWORD_RESET_TOKEN_TTL_MINUTES` | Lifetime of a reset link                      |
| `RESEND_API_KEY`, `RESEND_FROM`  | Mail delivery of reset links (Resend)            |
| `MINIMAX_API_KEY`, `MINIMAX_MODEL`, `MINIMAX_API_URL` | AI provider              |

Without a `RESEND_API_KEY` the reset link is written to the server log instead
of being emailed. Without a `MINIMAX_API_KEY` the assistant answers from the
workspace snapshot instead of calling a model, so the chat and its history keep
working offline from the provider.

## Checks

| Command                    | What it covers                                        |
| -------------------------- | ----------------------------------------------------- |
| `npm run typecheck`        | Backend types                                          |
| `npm run check:ai`         | Backend prompts, provider and answer parsing           |
| `npm run check:integration`| Every endpoint against PostgreSQL, then cleans up      |
| `npm run lint`             | Frontend lint                                          |
| `npm run check:ai`         | Frontend assistant engine and service                  |
| `npm run check:auth`       | Frontend session handling                              |
| `npm run check:ui`         | Server side render of the screens                      |

The integration check creates throwaway users and workspaces in the configured
database and deletes exactly those rows again when it finishes.

## API

All endpoints answer with `{ success, message?, data?, errors? }`.

| Area        | Endpoints                                                                       |
| ----------- | ------------------------------------------------------------------------------- |
| Auth        | `POST /api/auth/register`, `login`, `forgot-password`, `reset-password`, `PATCH /api/auth/me`, `POST /api/auth/change-password` |
| Workspaces  | `GET`, `POST /api/workspaces`, `GET/POST/PATCH/DELETE /api/workspaces/:id/members` |
| Projects    | `GET`, `POST /api/projects/workspaces/:workspaceId`, `PATCH`, `DELETE`, member assignment |
| Tasks       | `GET`, `POST /api/tasks/workspaces/:workspaceId/projects/:projectId`, `PATCH`, `DELETE` |
| Activity    | `GET /api/activities/workspaces/:workspaceId`                                   |
| AI          | `POST /api/ai/chat`, `GET /api/ai/workspaces/:id/conversations`, `GET /api/ai/conversations/:id/messages` |
