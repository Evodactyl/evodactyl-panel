---
title: What is Evodactyl?
description: An overview of the Evodactyl Panel — what it is, who it is for, and how it differs from the original Pterodactyl Panel.
---

Evodactyl is an open-source **game server management panel**. It runs game servers inside Docker containers on
separate worker nodes (via the **Wings** daemon), and gives administrators and end users a unified web UI and
HTTP API to create, operate, monitor, and bill for those servers.

It is a full rewrite of the legacy [Pterodactyl Panel][pterodactyl] — same model, different stack:

| Capability             | Pterodactyl 1.x (Laravel)        | Evodactyl 2.x                  |
| ---------------------- | -------------------------------- | ------------------------------ |
| Language / runtime     | PHP 8.3 on php-fpm               | TypeScript on Bun              |
| HTTP framework         | Laravel 10                       | Express 5                      |
| ORM                    | Eloquent                         | Prisma 6                       |
| Frontend               | React 17 + webpack               | React 18 + Vite                |
| Queue worker           | Laravel queues + Horizon         | In-process `node-cron`         |
| Scheduler              | System `cron` → `artisan`        | In-process `node-cron`         |
| Session store          | Laravel sessions                 | MySQL / Redis / memory         |
| Admin CLI              | `php artisan p:*`                | `bun run cli <command>`        |
| Deployment unit        | Laravel webapp behind nginx/fpm  | Single Bun process behind any reverse proxy |
| Wire protocol to Wings | JWT (unchanged)                  | JWT (unchanged)                |

Wings itself is **unchanged** — Evodactyl signs the same JWTs it always did, so an existing Wings daemon
continues to work against an Evodactyl Panel with no changes.

## What you get

- **A panel for administrators.** Create and manage locations, nodes, nests, eggs, mounts, users, allocations,
  database hosts, servers, and API keys. Everything the legacy admin UI had.
- **A panel for end users.** Start / stop / restart servers, edit files, manage databases, pull backups, run
  scheduled tasks, invite subusers, and more.
- **An HTTP API.** An Application API for orchestrating the panel, a Client API for end-user actions, and a
  Remote API that Wings talks to.
- **A CLI.** A small collection of admin commands (`user:make`, `environment:setup`, `seed`, and more) that
  replace what `php artisan p:*` used to provide.

## What you need

- A Linux host to run the Panel (Docker or bare metal with Bun 1.2+)
- A MySQL 8 / MariaDB 10.5+ database
- Optionally, Redis for sessions and caching
- A reverse proxy (nginx, Caddy, or Apache) terminating TLS in front of the Panel
- One or more **Wings** nodes — see the [Wings section](/evodactyl-panel/wings/) when you are ready to install the daemon

The next page lays out the supported operating systems. After that, you follow the Getting Started track in
order, and by the end of it you will have a running Panel connected to a Wings node.

[pterodactyl]: https://github.com/pterodactyl/panel
