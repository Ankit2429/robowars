# Robo Arena

A multiplayer robot battle game — forge custom robots, enter real-time battles, and climb the leaderboard.

**Stack:** React + Vite · Express + Socket.IO · PostgreSQL + Drizzle ORM · Three.js (3D battles)

---

## Setup (Antigravity / VS Code / any platform)

### 1. Prerequisites

- [Node.js 20+](https://nodejs.org/)
- [pnpm](https://pnpm.io/installation) — install with: `npm install -g pnpm`
- A PostgreSQL database (local or hosted)

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and set your database URL:

```
DATABASE_URL=postgres://user:password@localhost:5432/robo_arena
```

> **Create a local database quickly:**
> ```bash
> createdb robo_arena
> ```

### 4. Push the Database Schema

```bash
pnpm --filter @workspace/db run push
```

### 5. Start the App

#### Option A — VS Code / Antigravity (recommended)

Press `Ctrl+Shift+B` (or `Cmd+Shift+B` on Mac) and run the **"Start All (API + Frontend)"** task. Both servers start in parallel automatically.

#### Option B — Two terminals manually

**Terminal 1 — API server:**
```bash
pnpm --filter @workspace/api-server run dev
```

**Terminal 2 — Frontend:**
```bash
pnpm --filter @workspace/robo-arena run dev
```

Then open [http://localhost:5173](http://localhost:5173).

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `PORT` | No | `8080` (API) / `5173` (frontend) | Override the port for either server |

---

## Project Structure

```
├── artifacts/
│   ├── robo-arena/       # React + Vite frontend (port 5173)
│   └── api-server/       # Express + Socket.IO backend (port 8080)
├── lib/
│   └── db/               # Drizzle ORM schema + client
├── .env.example          # Copy this to .env and fill in DATABASE_URL
├── .vscode/              # Tasks, launch configs, and recommended extensions
└── pnpm-workspace.yaml   # Monorepo workspace config
```

---

## VS Code / Antigravity Tasks

These are pre-configured under `.vscode/tasks.json` and available from the Command Palette (`Run Task`):

| Task | What it does |
|---|---|
| **Start All (API + Frontend)** | Starts both servers in parallel (default build task) |
| **Start API Server** | API only on port 8080 |
| **Start Frontend** | Vite dev server on port 5173 |
| **Push DB Schema** | Runs `drizzle-kit push` to sync schema to your DB |
| **Install Dependencies** | Runs `pnpm install` |

---

## All Commands

| Command | Description |
|---|---|
| `pnpm --filter @workspace/robo-arena run dev` | Start the frontend |
| `pnpm --filter @workspace/api-server run dev` | Start the API server |
| `pnpm --filter @workspace/db run push` | Push schema changes to DB |
| `pnpm run build` | Build all packages |
| `pnpm run typecheck` | Type-check all packages |

---

## Features

- **Robot Builder** — customize chassis, weapons, and stats
- **Real-time Battles** — Socket.IO multiplayer with 3D Three.js arena
- **Leaderboard** — live rankings from the database
- **Matchmaking** — automatic queue-based room assignment
