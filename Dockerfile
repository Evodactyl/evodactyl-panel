# syntax=docker/dockerfile:1.7

# Stage 1: install all workspace dependencies once.
FROM oven/bun:1.3-alpine AS deps
WORKDIR /app
COPY package.json bun.lock bunfig.toml turbo.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
COPY packages/config/package.json packages/config/
# No --frozen-lockfile: this is a build-from-source flow on the end-user's
# host, not a reproducible-CI build. Let Bun resolve fresh against whatever
# patch version the 1.3-alpine base image happens to ship. Adding
# --frozen-lockfile here was the cause of "lockfile had changes, but lockfile
# is frozen" failures on hosts whose Bun version differed from the committer's.
RUN bun install

# Stage 2: build the SPA bundle and generate the Prisma client.
FROM deps AS build
WORKDIR /app
COPY . .
RUN bunx prisma generate --schema=packages/db/prisma/schema.prisma \
    && bun run --filter=@evodactyl/web build

# Stage 3: runtime image.
#
# Bun is fast enough at executing TypeScript directly that we do not compile
# the api at all — we just copy the source tree + hoisted node_modules and
# point ENTRYPOINT at `bun run apps/api/src/index.ts`. Prisma's generated
# client lives under node_modules/@prisma/client and is portable across
# glibc/musl alpine images.
FROM oven/bun:1.3-alpine AS runtime
WORKDIR /app

RUN apk add --no-cache ca-certificates tini \
    && addgroup -S panel && adduser -S panel -G panel

COPY --from=build --chown=panel:panel /app/node_modules ./node_modules
COPY --from=build --chown=panel:panel /app/package.json ./package.json
COPY --from=build --chown=panel:panel /app/bun.lock ./bun.lock
COPY --from=build --chown=panel:panel /app/bunfig.toml ./bunfig.toml
COPY --from=build --chown=panel:panel /app/apps/api ./apps/api
COPY --from=build --chown=panel:panel /app/apps/web/dist ./apps/web/dist
COPY --from=build --chown=panel:panel /app/packages ./packages

USER panel
ENV NODE_ENV=production
ENV APP_ENV=production
ENV PORT=8080
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget -qO- http://127.0.0.1:8080/api/health || exit 1

# Use tini as PID 1 so signals propagate correctly to Bun.
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["bun", "run", "apps/api/src/index.ts"]
