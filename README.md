# PromoManager 🎟️

> SaaS platform for managing school promotion events — raffles, parties, tournaments, food sales, and bingo.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI + SQLAlchemy (async) + PostgreSQL |
| Auth | JWT (python-jose) + bcrypt |
| Migrations | Alembic |
| Frontend | React + Vite + TypeScript + TailwindCSS |
| State | TanStack Query |
| Dev env | Docker Compose |

---

## Project Structure

```
promomanager/
├── docker-compose.yml
├── backend/
│   ├── alembic/               # DB migrations
│   │   ├── env.py
│   │   └── versions/
│   ├── app/
│   │   ├── main.py            # App factory
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── deps.py    # Shared dependencies (auth)
│   │   │       ├── router.py  # Aggregated router
│   │   │       └── endpoints/ # One file per domain
│   │   ├── core/
│   │   │   ├── config.py      # Settings (pydantic-settings)
│   │   │   ├── security.py    # JWT + hashing
│   │   │   └── exceptions.py  # HTTP exceptions
│   │   ├── db/
│   │   │   ├── session.py     # Engine + get_db dependency
│   │   │   └── base_model.py  # UUID pk + timestamps mixin
│   │   ├── models/            # SQLAlchemy ORM models
│   │   ├── schemas/           # Pydantic request/response schemas
│   │   └── services/          # Business logic layer
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── api/               # Axios + React Query hooks
    │   ├── components/        # Reusable UI components
    │   ├── pages/             # Route-level page components
    │   ├── store/             # Global state (auth)
    │   └── types/             # TypeScript interfaces
    └── package.json
```

---

## Quick Start (Docker)

```bash
# 1. Clone and enter project
git clone <repo>
cd promomanager

# 2. Configure backend env
cp backend/.env.example backend/.env
# Edit backend/.env — set SECRET_KEY (use: openssl rand -hex 32)

# 3. Start all services
docker compose up --build

# 4. Run migrations
docker compose exec api alembic upgrade head

# 5. Open
#   API docs:  http://localhost:8000/api/docs
#   Frontend:  http://localhost:5173
```

## Local Dev (without Docker)

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # configure DATABASE_URL
alembic upgrade head
uvicorn app.main:app --reload

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

---

## API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Create account |
| POST | `/api/v1/auth/login` | Get JWT token |
| GET | `/api/v1/organizations` | List my orgs |
| POST | `/api/v1/organizations` | Create org |
| POST | `/api/v1/organizations/{id}/invite` | Invite member |
| GET | `/api/v1/events` | List events by org |
| POST | `/api/v1/events` | Create event |
| GET | `/api/v1/raffles/{event_id}` | Get raffle grid |
| POST | `/api/v1/raffles/{event_id}/sell` | Sell a number |
| POST | `/api/v1/draws/{event_id}` | Run raffle draw |
| GET | `/api/v1/member-sales/{event_id}` | Member accountability |

---

## Modules

- **Auth** — JWT login/register, secure password hashing
- **Organizations** — Create orgs, invite via email/link, role management
- **Events** — Raffle, Party, Food Sale, Tournament, Bingo
- **Finances** — Income/expense records with auto balance per event
- **Raffles** — Grid of numbered tickets, buyer registration, sold status
- **Member Sales** — Per-member tracking: sold qty, expected vs paid amounts
- **Draws** — Random winner selection with history
