# Local Development

Evodactyl Panel is a Bun-based Turborepo monorepo. The frontend (`apps/web`)
is a React SPA, the backend (`apps/api`) is an Express 5 server running on
Bun with Prisma against MySQL, and the docs site (`apps/docs`) is an Astro +
Starlight static site.

## Prerequisites

* [Bun](https://bun.sh) v1.2.0 or newer
* MySQL 8.x or MariaDB 10.5+
* Redis (optional, used for sessions and queues)

## Install Dependencies

```bash
bun install
```

This installs all workspace dependencies into a single hoisted `node_modules`
at the repo root.

## Development Loop

```bash
# Start everything (web + api) in watch mode
bun run dev

# Or target a specific workspace
bun run --filter=@evodactyl/web dev
bun run --filter=@evodactyl/api dev
```

`turbo` orchestrates the two processes. The web dev server lives on `:5173`
and proxies `/api/*` to the api server on `:3000`.

## Building for Production

```bash
bun run build
```

This runs `vite build` for `apps/web` and typechecks `apps/api`. Production
artifacts land in `apps/web/dist` and are served by the api via
`express.static` when deployed as a single process.

## Database

Schema lives in `packages/db/prisma/schema.prisma`. Migrations live under
`packages/db/prisma/migrations/`.

```bash
# Generate the Prisma client after pulling or editing the schema
bun run --filter=@evodactyl/db generate

# Apply pending migrations
bun run --filter=@evodactyl/db migrate

# Create a new migration while iterating locally
bun run --filter=@evodactyl/db migrate:dev

# Seed default nests and eggs
bun run --filter=@evodactyl/db seed
```

For a fresh environment (existing database created by the old Laravel app),
mark the baseline as applied so Prisma does not try to re-create tables:

```bash
bun run --filter=@evodactyl/db migrate:resolve-baseline
```

## CLI (admin tasks)

The api workspace ships a small CLI for admin tasks that used to live in
`artisan`:

```bash
bun run --filter=@evodactyl/api cli user:make
bun run --filter=@evodactyl/api cli user:delete --user=someone@example.com
bun run --filter=@evodactyl/api cli environment:setup
bun run --filter=@evodactyl/api cli seed
```

## Running Wings

Wings is unchanged by the Evodactyl rewrite and remains a separate daemon
project. Build and run a local Wings as usual; the Panel signs JWTs with the
same claim structure Wings expects.

## Running the Docs

```bash
bun run --filter=@evodactyl/docs dev
```

The docs site runs on `:4321` by default. Production builds:

```bash
bun run --filter=@evodactyl/docs build
```

Published site: <https://evodactyl.github.io/panel/>.
