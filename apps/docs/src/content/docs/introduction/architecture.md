---
title: Architecture
description: How the Evodactyl Panel, the Wings daemon, and your game servers fit together.
---

Evodactyl has three tiers:

```
         ┌─────────────────┐           ┌────────────────────┐
         │                 │           │                    │
User ───►│  Evodactyl Panel│◄─ JWT ───►│    Wings (daemon)  │◄── SFTP / WebSocket
         │  (Bun/Express)  │           │    (Go, per node)  │
         │                 │           │                    │
         └────────┬────────┘           └─────────┬──────────┘
                  │                              │
                  │                              │ spawn + supervise
                  ▼                              ▼
           ┌────────────┐                  ┌──────────┐
           │   MySQL    │                  │  Docker  │
           │  (+ Redis) │                  │ container│
           └────────────┘                  └──────────┘
```

## Panel

The Panel is a single Bun process. It serves:

1. The **SPA bundle** (`apps/web/dist`), which is the React admin + client UI, via `express.static`.
2. The **HTTP API** (`apps/api/src/routes`), which contains three surfaces: `application` (admin), `client`
   (end-user), and `remote` (Wings-facing).
3. The **scheduled task runner**, which replaces the legacy Laravel cron + queue worker. It runs inside the
   same Bun process as the HTTP server, via `node-cron`.

All persistent state lives in MySQL (accessed through Prisma). Sessions can be stored in MySQL, Redis, or
memory. There is no separate queue worker and no separate cron process.

## Wings

Wings is a separate Go daemon that runs on each node that hosts game servers. The Panel and Wings communicate
over JWT-signed HTTP and WebSocket: the Panel issues a JWT, Wings validates it with the shared daemon token,
and Wings then spawns / stops / watches the game-server Docker containers on its host. Wings also exposes an
SFTP server so end users can edit files inside their container.

Wings is **unchanged** by the Evodactyl rewrite. The same Wings binary that worked with Pterodactyl 1.x works
with Evodactyl — we sign the same claims and we speak the same wire protocol.

## Database

A single MySQL (or MariaDB) database holds everything: users, servers, nodes, eggs, nests, allocations,
databases, backups, schedules, tasks, audit logs, settings, and session data. The schema lives in
`packages/db/prisma/schema.prisma`. Migrations live under `packages/db/prisma/migrations/`.

If you are migrating from Pterodactyl 1.x, the very first migration is a baseline that matches the last
Laravel schema exactly, so you can point Evodactyl at an existing Pterodactyl database and mark the baseline
applied with `migrate:resolve-baseline`.
