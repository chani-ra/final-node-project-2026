# EnglishWise — Backend API

**A modular Node.js API for an AI-assisted English learning platform.**

EnglishWise supports students, teachers, and administrators with authenticated learning workflows, course content, progress tracking, and AI-powered study tools. This repository contains the **Express/MongoDB backend**, deployed separately from the React frontend.

**[Live application](https://englishwise-web.onrender.com/)** · **[API endpoint](https://englishwise-api.onrender.com/)** · **[Frontend repository](https://github.com/chani-ra/final-react-project-2026)** · **[OpenAPI specification](docs/openapi.yaml)**

## What this API provides

| Area | Capabilities |
| --- | --- |
| **Accounts and permissions** | Registration, login, access/refresh tokens, role-based authorization. |
| **Learning content** | Courses, lessons, songs, exercises, quizzes, student progress, and personalized course workflows. |
| **AI assistance** | AI Learning Studio, chat, personal coach, daily guide, and learning-related AI services. |
| **Student tools** | Tasks, dictionary, conversations, and learning history. |
| **Teacher/admin tools** | Content management, grading workflows, user management, messages, reviews, and AI request history. |

## AI Learning Studio — end-to-end lesson flow

The API provides a complete workflow for choosing a topic, generating an AI lesson, saving it to MongoDB, and retrieving it through student and administrator history views:

```text
Student registers / logs in (JWT)
     ↓
GET /learning/categories — category + related subcategories
     ↓
Student selects topic and writes a prompt
     ↓
POST /learning/generate — authenticated + rate limited
     ↓
Joi validates the request; service verifies the category relationship
     ↓
Gemini or OpenAI produces a text lesson for the student's level
     ↓
MongoDB persists user + topic + prompt + response + model + timestamp
     ↓
GET /learning/history — student revisits only their own lessons
     ↓
GET /learning/admin/history — admin reviews users' saved history
```

The React form implementing this workflow is in `src/features/student/learning/` in the [frontend repository](https://github.com/chani-ra/final-react-project-2026). It calls the endpoints documented in [`docs/openapi.yaml`](docs/openapi.yaml). The additional EnglishWise learning tools extend this core workflow while keeping the lesson-generation API focused.

### Learning Studio data model

| Domain entity | Implementation |
| --- | --- |
| User (`id`, name, phone) | `models/users.model.js` (`User`: MongoDB `_id`, `username`, `phone`, plus account/profile fields). |
| Categories (`id`, name) | `models/learningCategory.model.js` (`LearningCategory`). |
| Subcategories (`id`, name, `category_id`) | `models/learningSubcategory.model.js` (`LearningSubcategory.category` ObjectId reference). |
| Prompts (`user_id`, category, subcategory, prompt, response, created_at) | `models/learningPrompt.model.js` (`LearningPrompt` with referenced user/topic, saved response, timestamps and provider/model metadata). |
| Personal history / admin listing | Paginated authenticated student route and protected administrator route. |

MongoDB/Mongoose uses ObjectId references and schema validation rather than relational foreign-key constraints. Category/subcategory consistency is checked in the service layer, with a compound unique index on subcategory slug within its parent category.

## Personalized course creation and learning agents

**Adaptive course creation is separate from AI generation.** During registration, `controllers/auth.controller.js` calls `service/personalizedCourse.service.js` to create a private course. A rule-based matching/scoring process selects existing lessons, songs, exercises, and quizzes based on the student's level, age, hobbies, and goals. The course is linked to the student, and course progress is initialized. Students can also create another personalized course or refresh a course to find suitable additional content.

**Tool-using AI agents** are implemented in `agents/coach.agent.js`, `agents/dailyGuide.agent.js`, and `agents/agentRunner.js`. Using Gemini function calling, the agents may invoke tools defined in `tools/studentLearning.tools.js` to read the authenticated student's recent **quiz results, grammar corrections, course progress, and tasks**. The shared runner enforces a maximum of three tool calls per run and prevents repeated use of the same tool. The coach and daily guide produce structured, personalized recommendations; AI-unavailable fallback behavior is provided where supported. These agents are **request-driven**, not continuously monitoring students in the background.

## Technology

- **Runtime:** Node.js, Express 5, JavaScript (ES modules).
- **Database:** MongoDB with Mongoose models and indexes.
- **Validation and authentication:** Joi, JWT access/refresh tokens, middleware-based authorization, and route rate limits.
- **AI:** Google Gemini and OpenAI through server-side provider adapters.
- **Testing:** Node.js test runner, Supertest, and MongoDB Memory Server.
- **Deployment:** Render Web Service with MongoDB Atlas.

## Getting started

**Requirements:** Node.js and npm, a local MongoDB server or Atlas connection, and a configured key for at least one AI provider when testing AI generation.

From the **backend repository root** (`final-node-project-2026`), use **Windows CMD**:

```cmd
npm ci
copy .env.example .env
notepad .env
npm run dev
```

Update `.env` with your own connection string and distinct JWT secrets. The example file contains **placeholders only**; never commit your real `.env` file.

The server runs on **http://localhost:3000/** by default. A GET request to `/` returns a basic server response; it is **not** a comprehensive dependency health check.

For normal start-up without nodemon:

```cmd
npm start
```

### Environment configuration

The [`.env.example`](.env.example) provides sample configuration values without real secrets. Key settings:

| Name | Meaning |
| --- | --- |
| `NODE_ENV`, `PORT` | Environment and HTTP port. |
| `MONGODB_URI` | MongoDB connection URI. |
| `CLIENT_ORIGINS` | Comma-separated exact frontend origins allowed by CORS. |
| `JWT_SECRET`, `REFRESH_SECRET` | Distinct, strong secrets for JWT flows. |
| `GEMINI_API_KEY`, `OPENAI_API_KEY` | Server-side AI provider credentials. |
| `GEMINI_LEARNING_MODEL`, `OPENAI_LEARNING_MODEL` | Optional model configuration (defaults: `gemini-2.5-flash`, `gpt-4.1-mini`). |
| `OPENAI_LESSONS_DAILY_PER_USER`, `OPENAI_LESSONS_DAILY_TOTAL` | Request reservation limits (defaults: `3` per user and `20` globally per UTC day). |
| `ADMIN_SETUP_KEY` | Optional protected first-admin setup. |
| `EMAIL_*` | Optional mail/SMTP configuration for email-related functionality. |

A local frontend at `http://localhost:5173` needs that origin in `CLIENT_ORIGINS`. In Render, use the deployed frontend URL instead (or a comma-separated list when both are required). **Do not expose API keys in `VITE_*` variables.**

## Architecture

A separation of HTTP handling, validation, business logic, integrations, and persistence keeps the AI lesson workflow testable:

```text
React / Vite client
       │ HTTPS + REST/JSON + JWT
       ▼
Express routes + authentication/authorization middleware
       ▼
Controllers + Joi request validation
       ▼
Application services ────────────────► Gemini / OpenAI provider adapters
       │
       ▼
Mongoose models ─────────────────────► MongoDB
```

AI Learning Studio implementation:

| Path | Purpose |
| --- | --- |
| `routes/learning.route.js` | Authenticated routes and role checks. |
| `controllers/learning.controller.js` | HTTP input/output coordination. |
| `validation/learning.validation.js` | Request validation. |
| `service/learning/catalog.service.js` | Category and subcategory catalog. |
| `service/learning/learning.service.js` | AI generation workflow and persisted history. |
| `service/learning/providers/` | Gemini/OpenAI integrations and response checks. |
| `service/learning/openaiQuota.service.js` | Daily OpenAI reservation limits in MongoDB. |
| `models/learning*.model.js` | Learning catalog, lesson history, and quota persistence. |

Other modules use dedicated routes/controllers/models and, where appropriate, service layers. AI provider secrets never need to be sent to the browser.

## Learning Studio REST API

All endpoints below use `Authorization: Bearer <access_token>`. The personal routes are scoped to the authenticated account; administrator history requires the **admin** role.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/learning/categories` | Return categories and nested subcategories. |
| `GET` | `/learning/providers` | List configured providers (configuration is not a live key-validation test). |
| `POST` | `/learning/generate` | Generate and persist an AI lesson. |
| `GET` | `/learning/history?page=1&limit=10` | Paginated personal history. |
| `GET` | `/learning/history/:id` | Read one lesson owned by the current user. |
| `GET` | `/learning/admin/history?page=1&limit=10` | Admin-only history with optional filters. |

Example request body for `POST /learning/generate`:

```json
{
  "categoryId": "<id from /learning/categories>",
  "subcategoryId": "<subcategory id belonging to that category>",
  "prompt": "Teach me Past Simple with examples and a short practice exercise.",
  "provider": "gemini"
}
```

The prompt must be **5–800 characters**. The provider may be `gemini` or `openai`; when omitted, it defaults to Gemini. On success, the API returns HTTP `201` and a saved `lesson` object. The record includes the user, selected topic, original prompt, generated text, level, provider/model metadata, and timestamps.

The complete response and error contracts are in [`docs/openapi.yaml`](docs/openapi.yaml). It is an **OpenAPI file**, not a hosted Swagger UI.

### Data integrity and authorization

- Categories and subcategories have validated relationships; mismatches are rejected.
- A user cannot request another student's AI lesson history by supplying a different user ID.
- The administrator history endpoint is protected on the server, independently of React route guards.
- Invalid or incomplete AI output is rejected instead of being saved as a successful completed lesson.
- OpenAI lesson limits reserve slots in MongoDB before provider calls. They are **request-count quotas, not a monetary spending cap**; calls that fail may still consume a reservation.

## Assumptions and design decisions

- **Core workflow:** Learning Studio manages lesson requests, generated responses, and saved history in a focused service. Courses, media, quizzes, messaging, and other AI tools are complementary features within the larger application.
- **Two different personalization approaches:** the course created at registration selects **existing** published content using deterministic scoring based on profile attributes; the on-demand coach and daily guide use **Gemini function calling** to consult scoped student-learning tools. Neither should be described as a continuously autonomous system.
- **Prompt persistence:** a successfully generated, validated **text** lesson is saved with the originating authenticated user and selected topic; the service does not store an incomplete or empty AI result as a successful lesson.
- **Account boundaries:** student-history queries always use the authenticated user ID; arbitrary user filtering is available only on the admin-protected endpoint.
- **AI configuration:** one available provider can be sufficient to demonstrate the flow. Gemini is the default; OpenAI is an optional selectable provider when configured. API keys and credentials belong in server environment variables.
- **Database choice:** MongoDB/Mongoose is used for document persistence and ObjectId-based relationships rather than an SQL ORM. Learning categories can be created/seeded by the application on startup.
- **Deployment:** MongoDB Atlas persists records independently of the Render service instance. Media written only to ephemeral local storage is not guaranteed to survive redeployments.

## Automated tests

```cmd
npm test
```

The Node.js test runner, Supertest, and MongoDB Memory Server cover representative authentication, authorization, API, history isolation, catalog, AI failure, and quota cases. MongoDB Memory Server may need a one-time database-binary download. Tests use an isolated database, not production Atlas.

## Deploying on Render

Configure this project as a **Render Web Service** using `npm start` and a MongoDB Atlas connection. Set sensitive values in Render **Environment**, not in tracked files. Set `NODE_ENV=production` and allow the deployed React origin through `CLIENT_ORIGINS`.

At startup, the backend connects to MongoDB and seeds missing Learning Studio catalog entries; non-production startup can also add demo data. Verify deployment by checking the **Live commit SHA**, then testing login, categories, lesson generation, personal history, and admin access.

The React application is a separate **Render Static Site** with `VITE_API_URL` pointing to this API. Changes to frontend code do not themselves change backend services or database records.

## Important limitations

- Learning Studio generates **text lessons**; a listening topic does not automatically create audio.
- Audio/video files written to a free, ephemeral Render instance are **not durable across redeploys/restarts**. Long-term media storage requires persistent/object storage.
- Provider key configuration does not guarantee that an account has working quota or billing.
- Model request quotas do not protect against all usage costs, especially outside this application's quota system.
- For a public repository, never commit `.env`, tokens, database exports, or real student data.

## Quick verification

1. Log in as a student using a test account prepared outside this README.
2. Load the category catalog, choose a valid subcategory, and generate a lesson.
3. Refresh and reopen the saved lesson from personal history.
4. Log in as an administrator and view the protected cross-user history.
5. Review the [API contract](docs/openapi.yaml), run `npm test`, and inspect the route → controller → service → model separation.

**Frontend:** [EnglishWise React repository](https://github.com/chani-ra/final-react-project-2026).
