# EnglishWise API

**Backend for EnglishWise** — an AI-assisted English-learning platform with role-based access for students, teachers and administrators. Built with Node.js, Express, MongoDB/Mongoose, JWT authentication, Google Gemini and OpenAI.

**Live demo:** [EnglishWise web](https://englishwise-web.onrender.com) · [API health endpoint](https://englishwise-api.onrender.com/) · [React repository](https://github.com/chani-ra/final-react-project-2026)

> The application contains a wider learning environment (courses, quizzes, exercises, chat, tasks, media and progress). This README focuses on the **AI Learning Studio** flow required for the Full Stack evaluation: **Category → Subcategory → User prompt → Generated lesson → Saved history**, including an administrator's cross-user history view.

## Architecture

```text
React/Vite UI  ── JWT + REST/JSON ──►  Express API  ──► MongoDB Atlas
                                     │
                                     ├─ routes/learning.route.js          (authorization)
                                     ├─ controllers/learning.controller.js (HTTP layer)
                                     ├─ validation/learning.validation.js  (Joi input validation)
                                     ├─ service/learning/
                                     │   ├─ catalog.service.js            (categories / subcategories)
                                     │   ├─ learning.service.js           (lesson generation + history)
                                     │   ├─ openaiQuota.service.js        (MongoDB daily reservations)
                                     │   └─ providers/                   (Gemini / OpenAI adapters)
                                     └─ models/learning*.model.js         (Mongoose persistence)
```

The controller is deliberately thin: it validates the request, calls the learning service and returns JSON. The service checks that the subcategory belongs to the selected category, reads the student's level, invokes the chosen AI provider and persists the resulting lesson. The provider adapters keep model-specific API calls out of the controller. Existing chat and personalized-course features remain separate.

## Requirements

- Node.js (use the version configured on the deployment host; Node 24 was used on Render during development).
- npm.
- MongoDB (local or MongoDB Atlas).
- At least one provider credential: `GEMINI_API_KEY` or `OPENAI_API_KEY`.

## Run locally (Windows CMD)

```cmd
npm install
copy .env.example .env
```

Edit **`.env`** with your own MongoDB URL, JWT secrets, CORS origin and at least one provider key. Never commit `.env` or paste credentials into issues or screenshots.

```cmd
npm run dev
```

API: `http://localhost:3000`. Health check: `GET /`.

To run automated backend tests:

```cmd
npm test
```

Tests use Node's built-in test runner, Supertest and MongoDB Memory Server. The memory server can require a first-time MongoDB binary download; its test database is **not** the production Atlas database. The test suite covers authorization, learning catalog, AI response handling, lesson history, per-user isolation and OpenAI daily quotas.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | MongoDB connection string. |
| `JWT_SECRET`, `REFRESH_SECRET` | Secrets used for access/refresh JWTs. |
| `CLIENT_ORIGINS` | Comma-separated allowed frontend origins. |
| `GEMINI_API_KEY` | Enables the Gemini provider. |
| `OPENAI_API_KEY` | Enables the OpenAI provider. Server-only. |
| `GEMINI_LEARNING_MODEL` | Optional model override; defaults to `gemini-2.5-flash`. |
| `OPENAI_LEARNING_MODEL` | Optional model override; defaults to `gpt-4.1-mini`. |
| `OPENAI_LESSONS_DAILY_PER_USER` | Daily per-user OpenAI lesson reservation limit (default `3`). |
| `OPENAI_LESSONS_DAILY_TOTAL` | Daily global OpenAI lesson reservation limit (default `20`). |
| `ADMIN_SETUP_KEY` | Optional first-admin bootstrap protection; keep private. |
| `NODE_ENV` | Set to `production` for deployment. |
| `PORT` | Server port (default `3000`; Render supplies its own). |

The project also has configuration for optional email-related features outside the Learning Studio. Use only the credentials required for features you actually configure. Vite environment variables are public: **never place an AI key in `VITE_*`.**

## Learning Studio API

All `/learning` routes require an access token via `Authorization: Bearer <access_token>`. `requireStudent` allows authenticated student/teacher/admin roles; the cross-user endpoint requires the **admin** role. Valid IDs are MongoDB ObjectIds.

| Method | Path | Behavior |
| --- | --- | --- |
| `GET` | `/learning/categories` | Categories and nested subcategories. |
| `GET` | `/learning/providers` | Gemini/OpenAI status (`available` means a key is configured, **not** verified). |
| `POST` | `/learning/generate` | Generate and persist a lesson. |
| `GET` | `/learning/history?page=1&limit=10` | Paginated history for the signed-in user only. |
| `GET` | `/learning/history/:id` | Read only your own lesson. |
| `GET` | `/learning/admin/history?page=1&limit=10` | Admin history; supports `userId` and `categoryId` filters. |

`POST /learning/generate` expects JSON:

```json
{
  "categoryId": "<category _id from GET /learning/categories>",
  "subcategoryId": "<subcategory _id belonging to that category>",
  "prompt": "Teach me Past Simple with examples and a short exercise.",
  "provider": "openai"
}
```

`provider` is `gemini` or `openai`; omitted provider defaults to Gemini. `prompt` length: **5–800 characters**. A successful creation returns HTTP **201** and `{ "success": true, "lesson": { ... } }`. The saved lesson includes user, category, subcategory, prompt, generated response, level, provider, model and timestamps. See the complete request/response contract in [`docs/openapi.yaml`](docs/openapi.yaml); this is a portable **OpenAPI specification**, not an embedded Swagger UI.

User authentication is available through `/users/register`, `/users/login` and `/users/refresh-token`. The frontend handles these flows. Passwords and tokens are not included in the documentation examples.

## Persistence and access rules

- `LearningCategory`: unique slug, name.
- `LearningSubcategory`: category reference, unique slug within that category.
- `LearningPrompt`: user/category/subcategory references, prompt, response, level, provider, model and timestamps. Indexes support per-user history.
- `LearningDailyQuota`: UTC daily, MongoDB-backed reservation counters for OpenAI requests; prevents exceeding configured per-user/global lesson counts even across server restarts.
- Invalid category/subcategory pairs are rejected. A user cannot query another user's learning history. Admin history requires server-side authorization.
- AI outputs that fail validation (including detected truncated responses) are rejected instead of being stored as completed lessons.
- OpenAI quota reservations happen **before** the paid call. A failed model call may still consume a slot because the provider may have incurred costs. Daily reservation limits **are not a monetary spending cap**; apply project-level spending controls on the OpenAI account as well.

## Production deployment (Render)

The backend runs as a **Web Service** using `npm start` and a MongoDB Atlas database. Set environment variables in Render's **backend** Environment panel (never in the frontend). Set `NODE_ENV=production`; demo account seeding is disabled in this mode, while the catalog's idempotent seed can add missing categories/subcategories without deleting user records. Configure `CLIENT_ORIGINS` to include the exact frontend URL.

Frontend: Render **Static Site**, root directory `react-final`, build `npm ci && npm run build`, publish `dist`; use an SPA rewrite of `/*` to `/index.html`. The frontend's `VITE_API_URL` points to the backend.

**Deployment check:** confirm the new Git commit SHA is the one marked **Live**, then smoke-test login → categories → generate → history → refresh → admin history. A successful local test or Git push alone does not prove a production deployment.

**Media storage limitation:** media uploaded to an ephemeral Render instance is not durable storage. Production persistence would require object storage or a persistent disk; do not treat current playback alone as a durability guarantee.

## Known scope and safeguards

- The Learning Studio produces **text lessons**. A Listening topic does not automatically produce an audio file/player in this module.
- The OpenAI key may be shared with other applications; local daily counters do not control those applications' API costs.
- Dependency advisories must be reviewed and fixed selectively, with regression tests; avoid blindly running `npm audit fix --force`.
- Never commit `.env`, credentials, real student data, uploaded media or production database exports.

## Related repository

The frontend lives in [final-react-project-2026](https://github.com/chani-ra/final-react-project-2026). Its own README contains UI setup and flow details.
