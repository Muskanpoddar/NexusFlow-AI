
# NexusFlow AI

NexusFlow is a workspace app for projects, tasks and teams. An account can own
several workspaces, every workspace has its own projects, tasks, members and
activity feed, and an AI assistant answers questions about the workspace you
are currently in.

## What is implemented

### Accounts and access

- Email and password accounts with a JWT bearer session. The lifetime comes
  from `JWT_EXPIRES_IN`.
- Password reset by mail: the link is single use and expires after
  `PASSWORD_RESET_TOKEN_TTL_MINUTES`.
- A user can belong to several workspaces and switch between them. The
  workspace switcher keeps its own notification marker per workspace.
- Roles are owner, admin, manager and member. Only an owner can hand out the
  admin role, and the owner role itself can neither be changed nor removed.

### Team invitations, for addresses that have no account yet

An owner or admin invites any email address, also one that never used
NexusFlow before.

1. The invitation is stored with a SHA-256 hashed, single use token that
   expires after `INVITATION_TTL_HOURS`.
2. The link is mailed through Resend when `RESEND_API_KEY` is set. Without a
   mailer the link is written to the server log and shown in the modal, so
   the flow works without a mail service.
3. The team screen lists the pending invitations with their role and expiry,
   and every one of them can be revoked.
4. The invitee opens `/?inviteToken=…`. Without a session they get a landing
   page with "Create an account" and "I already have an account", with a
   session the app accepts the invitation right away.
5. Registering with the invited address joins the workspace immediately, so
   the invitee never has to come back to the link.
6. Accepting again is idempotent for the same account and refused for a
   different one.

### Projects, tasks and members

- Projects carry a status (planning, active, on hold, completed), a priority
  (low, medium, high, urgent), a category, a start and due date, an owner and
  a description.
- Tasks carry a status (todo, in progress, done), the same four priorities, a
  due date, a description and an assignee from the workspace.
- Workspace members are added, promoted and removed. Project members are
  assigned separately from the workspace members, so somebody can work on a
  project without being on every project of the workspace.
- Every change is written to the activity feed of that workspace.

### The AI assistant

- A question is answered from a snapshot of the workspace: its projects, the
  open tasks, the members and their load. The snapshot, the question and the
  last ten messages of the conversation go to Anthropic Claude.
- The model answers with one JSON object, which becomes the headline, the
  narrative, the sections and the follow up questions.
- Nine intents are recognised: overview, project health, overdue tasks,
  workload, priorities, unassigned, weekly report, project summary and risk
  report.
- Without `ANTHROPIC_API_KEY`, or when the provider fails, the answer is
  computed locally from the same snapshot, so the chat and its history keep
  working. The response says which of the two produced it in `source`.
- The web app has its own engine that answers from the loaded workspace data.
  The answer from the API is merged over it, so the screen is useful even
  while the API is unreachable.

### The screens

| Screen         | What it holds                                                        |
| -------------- | -------------------------------------------------------------------- |
| Overview       | Totals for projects, completed and pending tasks and members, plus the activity feed |
| Projects       | List, search, filter by status and category, create and edit projects   |
| Project detail | The tasks of one project, its members and its progress                 |
| My Tasks       | Every task of the workspace as a board or a list, with a search and a priority filter, urgent included |
| AI Assistant   | The chat, with the project health, task insight and workload cards    |
| Team Members   | The member directory, the per project assignment and the pending invitations |
| Profile        | Name, email and password                                              |
| Settings       | Four preference toggles, kept in the browser                          |
| Help & Support | The support cards, the frequently asked questions and the keyboard shortcuts |

The bell in the header shows a dot only while activity arrived since the
panel was last opened.

## Stack

| Layer    | Technology                                                            |
| -------- | --------------------------------------------------------------------- |
| Frontend | React 19, Vite 8, Tailwind CSS 4, TypeScript                          |
| Backend  | Express 5, TypeScript (ESM), Zod, JWT, bcrypt                         |
| Database | PostgreSQL with Prisma 7                                               |
| AI       | Anthropic Claude (`claude-opus-5-5`) through the Anthropic SDK, with a local fallback |

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

| Variable                           | Used for                                         |
| ---------------------------------- | ------------------------------------------------ |
| `DATABASE_URL`                     | PostgreSQL connection string                     |
| `JWT_SECRET`                       | Access token signing, at least 32 characters     |
| `JWT_EXPIRES_IN`                   | Access token lifetime, e.g. `15m`                |
| `CORS_ORIGIN`                      | Allowed frontend origin(s), comma separated      |
| `FRONTEND_URL`                     | Base URL of the links we mail out                |
| `PASSWORD_RESET_TOKEN_TTL_MINUTES` | Lifetime of a reset link                         |
| `INVITATION_TTL_HOURS`             | Lifetime of a team invitation link               |
| `RESEND_API_KEY`, `RESEND_FROM`    | Mail delivery of reset and invitation links      |
| `ANTHROPIC_API_KEY`                | Anthropic API key for the assistant              |
| `ANTHROPIC_MODEL`                  | Anthropic model, defaults to `claude-opus-5-5`   |
| `ANTHROPIC_API_URL`                | Anthropic base URL, defaults to `api.anthropic.com` |

Without a `RESEND_API_KEY` the reset and invitation links are written to the
server log instead of being emailed. Without an `ANTHROPIC_API_KEY` the
assistant answers from the workspace snapshot instead of calling a model, so
the chat and its history keep working offline from the provider. A provider
error falls back to the same snapshot.

`.env` holds the secrets and is gitignored. Only `.env.example` is committed.

## Layout

```
backend/
  prisma/            schema and migrations
  scripts/           the checks and the cleanup helper
  src/lib/           prisma client, mailer, link builder
  src/modules/       auth, workspaces, projects, tasks, activity, ai
frontend/
  scripts/           the checks
  src/features/      auth, dashboard, projects, tasks, team, ai-assistant, settings
  src/pages/         the screens
  src/store/         the workspace store
```

## Checks

| Command                        | What it covers                                       |
| ------------------------------ | ---------------------------------------------------- |
| `npm run typecheck`            | Backend types                                         |
| `npm run check:ai`             | Backend prompts, provider and answer parsing          |
| `npm run check:integration`    | Every endpoint against PostgreSQL, then cleans up     |
| `npm run db:cleanup-test-data` | Removes the throwaway accounts of earlier check runs  |
| `npm run lint`                 | Frontend lint                                         |
| `npm run check:ai`             | Frontend assistant engine and service                 |
| `npm run check:auth`           | Frontend session handling                             |
| `npm run check:ui`             | Server side render of the screens                     |

The integration check creates throwaway users and workspaces in the configured
database and deletes exactly those rows again when it finishes, even when a
check fails. `npm run db:cleanup-test-data` removes the accounts of runs that
were interrupted.

## API

All endpoints answer with `{ success, message?, data?, errors? }`. Everything
except the register, login and password reset calls needs the bearer token.

| Area        | Endpoints                                                                                                   |
| ----------- | ------------------------------------------------------------------------------------------------------------ |
| Auth        | `POST /api/auth/register`, `login`, `forgot-password`, `reset-password`, `change-password`, `GET/PATCH /api/auth/me` |
| Workspaces  | `GET`, `POST /api/workspaces`, `GET/POST/PATCH/DELETE /api/workspaces/:id/members`                             |
| Invitations | `GET/POST /api/workspaces/:id/invitations`, `DELETE /api/workspaces/:id/invitations/:invitationId`, `POST /api/workspaces/invitations/accept` |
| Projects    | `GET/POST /api/projects/workspaces/:workspaceId`, `GET/PATCH/DELETE .../:projectId`, `POST/DELETE .../:projectId/members` |
| Tasks       | `GET/POST /api/tasks/workspaces/:workspaceId/projects/:projectId`, `GET/PATCH/DELETE .../:taskId`                 |
| Activity    | `GET /api/activities/workspaces/:workspaceId`                                                                  |
| AI          | `POST /api/ai/chat`, `GET /api/ai/workspaces/:id/conversations`, `GET /api/ai/conversations/:id/messages`        |

## Known limits

- The Anthropic key in `backend/.env` has to be a key that works against
  `ANTHROPIC_API_URL`. Without a working key the assistant answers from the
  snapshot and the chat keeps working.
- The provider request uses the server side fallback beta and adaptive
  thinking. An endpoint that does not support them needs those two fields
  removed from `src/modules/ai/ai.provider.ts`.
- Mail delivery is only real with a `RESEND_API_KEY`; without it the links
  land in the server log.
- The preference toggles in Settings live in the browser, they are not sent
  to the server.
