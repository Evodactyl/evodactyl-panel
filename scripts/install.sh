#!/usr/bin/env bash
#
# Evodactyl Panel — interactive installer.
#
# Recommended usage: download first, then run.
#
#   curl -fsSL -o install.sh https://raw.githubusercontent.com/Evodactyl/evodactyl-panel/main/scripts/install.sh
#   sudo bash install.sh
#
# The pipe form also works on most hosts:
#
#   curl -fsSL https://raw.githubusercontent.com/Evodactyl/evodactyl-panel/main/scripts/install.sh | sudo bash
#
# It relies on reopening /dev/tty for interactive prompts, which can fail
# under some sudo configs, SSH sessions without a controlling terminal, or
# containers. The script detects that and prints a clear fallback.
#
# Environment overrides (optional):
#   EVODACTYL_INSTALL_DIR   default /srv/evodactyl
#   EVODACTYL_REPO          default https://github.com/Evodactyl/evodactyl-panel.git
#   EVODACTYL_BRANCH        default main

set -euo pipefail

# Reopen stdin on the controlling TTY so `curl ... | sudo bash` still gets
# interactive prompts. If /dev/tty can't be opened (sudo blocks it, no TTY
# allocated, running under a CI runner, etc.), bail loudly with a fallback
# instead of dying silently under `set -e`.
if [ ! -t 0 ]; then
    if [ -e /dev/tty ] && exec < /dev/tty 2>/dev/null; then
        : # TTY reopened; interactive prompts will work
    else
        cat <<'TTY_FAIL' >&2
✗ This script needs an interactive terminal to prompt for configuration,
  but stdin isn't a TTY and /dev/tty isn't accessible. That's common under
  some sudo configs, SSH sessions without TTY allocation, or containers.

  Download the script and run it directly instead:

      curl -fsSL -o install.sh https://raw.githubusercontent.com/Evodactyl/evodactyl-panel/main/scripts/install.sh
      sudo bash install.sh

TTY_FAIL
        exit 1
    fi
fi

# ───── preflight ─────
command -v docker >/dev/null             || { echo "✗ docker is required"; exit 1; }
docker compose version >/dev/null 2>&1   || { echo "✗ docker compose v2 is required"; exit 1; }
command -v openssl >/dev/null            || { echo "✗ openssl is required"; exit 1; }
command -v git >/dev/null                || { echo "✗ git is required";     exit 1; }
[ "$(id -u)" -eq 0 ]                     || { echo "✗ run as root (or via sudo)"; exit 1; }

INSTALL_DIR="${EVODACTYL_INSTALL_DIR:-/srv/evodactyl}"
REPO_URL="${EVODACTYL_REPO:-https://github.com/Evodactyl/evodactyl-panel.git}"
REPO_BRANCH="${EVODACTYL_BRANCH:-main}"

# ───── helpers ─────
ask() {
    # ask VAR "label" [default]
    local __var="$1" __label="$2" __default="${3:-}" __reply
    while :; do
        if [ -n "$__default" ]; then
            printf "  %s [%s]: " "$__label" "$__default"
        else
            printf "  %s: " "$__label"
        fi
        IFS= read -r __reply || __reply=""
        [ -z "$__reply" ] && __reply="$__default"
        if [ -z "$__reply" ]; then echo "    ! cannot be empty"; continue; fi
        printf -v "$__var" '%s' "$__reply"
        return
    done
}
ask_secret() {
    # ask_secret VAR "label"
    local __var="$1" __label="$2" __a __b
    while :; do
        printf "  %s: " "$__label";    IFS= read -rs __a || __a=""; echo
        printf "  confirm: ";          IFS= read -rs __b || __b=""; echo
        if [ -z "$__a" ];        then echo "    ! cannot be empty";  continue; fi
        if [ "$__a" != "$__b" ]; then echo "    ! did not match";    continue; fi
        if [ ${#__a} -lt 8 ];    then echo "    ! min 8 characters"; continue; fi
        if ! echo "$__a" | grep -qE '[A-Z]' \
            || ! echo "$__a" | grep -qE '[a-z]' \
            || ! echo "$__a" | grep -qE '[0-9]'; then
            echo "    ! must contain upper, lower, and a digit"; continue
        fi
        printf -v "$__var" '%s' "$__a"
        return
    done
}
confirm() {
    # confirm "label" [y|n]
    local __label="$1" __default="${2:-n}" __reply
    printf "  %s [%s/%s] " "$__label" \
        "$([ "$__default" = y ] && echo Y || echo y)" \
        "$([ "$__default" = n ] && echo N || echo n)"
    IFS= read -r __reply || __reply=""
    [ -z "$__reply" ] && __reply="$__default"
    case "$__reply" in y|Y|yes|YES) return 0 ;; *) return 1 ;; esac
}

# ───── detect defaults ─────
if [ -r /etc/timezone ]; then
    DEFAULT_TZ=$(cat /etc/timezone)
elif command -v timedatectl >/dev/null 2>&1; then
    DEFAULT_TZ=$(timedatectl show -p Timezone --value 2>/dev/null || echo UTC)
else
    DEFAULT_TZ="UTC"
fi

cat <<'BANNER'

  ╔══════════════════════════════════════╗
  ║   Evodactyl Panel — one-paste install ║
  ╚══════════════════════════════════════╝

BANNER

echo "▶ Panel configuration"
ask PANEL_URL      "Panel URL (https://panel.example.com)"
ask PANEL_TIMEZONE "Timezone" "$DEFAULT_TZ"

echo
echo "▶ First administrator account"
ask        ADMIN_EMAIL     "Admin email"
ask        ADMIN_USERNAME  "Admin username"
ask        ADMIN_FIRST     "First name"
ask        ADMIN_LAST      "Last name"
ask_secret ADMIN_PASSWORD  "Admin password"

echo
echo "▶ Mail (optional)"
if confirm "Configure SMTP now?" n; then
    ask        MAIL_HOST            "SMTP host"
    ask        MAIL_PORT            "SMTP port" "587"
    ask        MAIL_USERNAME        "SMTP username"
    ask_secret MAIL_PASSWORD        "SMTP password"
    ask        MAIL_FROM_ADDRESS    "From address" "noreply@$(echo "$PANEL_URL" | sed -E 's#^[a-z]+://##; s#/.*##')"
else
    MAIL_HOST="smtp.example.com"
    MAIL_PORT="25"
    MAIL_USERNAME=""
    MAIL_PASSWORD=""
    MAIL_FROM_ADDRESS="noreply@example.com"
    echo "  → skipped (configure later in Admin → Settings → Mail)"
fi

echo
echo "▶ Generating secrets"
APP_KEY="base64:$(openssl rand -base64 32)"
DB_PASSWORD=$(openssl rand -hex 24)
DB_ROOT_PASSWORD=$(openssl rand -hex 24)
echo "  ✓ APP_KEY, DB_PASSWORD, DB_ROOT_PASSWORD"

echo
echo "▶ Cloning Evodactyl source into ${INSTALL_DIR}"
mkdir -p "$(dirname "$INSTALL_DIR")"
if [ -d "$INSTALL_DIR/.git" ]; then
    echo "  ↻ existing checkout found, pulling latest"
    git -C "$INSTALL_DIR" fetch --depth 1 origin "$REPO_BRANCH"
    git -C "$INSTALL_DIR" checkout -B "$REPO_BRANCH" "origin/$REPO_BRANCH"
else
    git clone --depth 1 --branch "$REPO_BRANCH" "$REPO_URL" "$INSTALL_DIR"
fi
cd "$INSTALL_DIR"
echo "  ✓ source at $INSTALL_DIR ($(git rev-parse --short HEAD))"

echo
echo "▶ Writing docker-compose.yml + secrets"
cat > docker-compose.yml <<YAML
services:
  database:
    image: mariadb:11
    restart: always
    volumes:
      - "./.evodactyl/database:/var/lib/mysql"
    environment:
      MYSQL_DATABASE: "panel"
      MYSQL_USER: "evodactyl"
      MYSQL_PASSWORD: "${DB_PASSWORD}"
      MYSQL_ROOT_PASSWORD: "${DB_ROOT_PASSWORD}"
    healthcheck:
      test: ["CMD", "healthcheck.sh", "--connect", "--innodb_initialized"]
      interval: 10s
      timeout: 5s
      retries: 12

  cache:
    image: redis:7-alpine
    restart: always
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 12

  panel:
    # Build the image from this repo. Evodactyl does not publish pre-built
    # images — you build your own from source. The first build takes a few
    # minutes; subsequent runs are cached.
    build:
      context: .
      dockerfile: Dockerfile
    image: evodactyl/panel:local
    restart: always
    ports:
      - "8080:8080"
    depends_on:
      database:
        condition: service_healthy
      cache:
        condition: service_healthy
    environment:
      APP_ENV: "production"
      APP_DEBUG: "false"
      APP_NAME: "Evodactyl"
      APP_URL: "${PANEL_URL}"
      APP_TIMEZONE: "${PANEL_TIMEZONE}"
      APP_KEY: "${APP_KEY}"
      PORT: "8080"
      DB_HOST: "database"
      DB_PORT: "3306"
      DB_DATABASE: "panel"
      DB_USERNAME: "evodactyl"
      DB_PASSWORD: "${DB_PASSWORD}"
      DATABASE_URL: "mysql://evodactyl:${DB_PASSWORD}@database:3306/panel"
      REDIS_HOST: "cache"
      REDIS_PORT: "6379"
      SESSION_DRIVER: "redis"
      SESSION_COOKIE: "evodactyl_session"
      HASHIDS_LENGTH: "8"
      MAIL_HOST: "${MAIL_HOST}"
      MAIL_PORT: "${MAIL_PORT}"
      MAIL_USERNAME: "${MAIL_USERNAME}"
      MAIL_PASSWORD: "${MAIL_PASSWORD}"
      MAIL_ENCRYPTION: "tls"
      MAIL_FROM_ADDRESS: "${MAIL_FROM_ADDRESS}"
      MAIL_FROM_NAME: "Evodactyl Panel"
YAML
chmod 600 docker-compose.yml

mkdir -p .evodactyl
cat > .evodactyl/secrets <<SECRETS
# Evodactyl install secrets — BACK THESE UP off-host.
# Losing APP_KEY makes every encrypted column in the database unrecoverable.
APP_KEY=${APP_KEY}
DB_PASSWORD=${DB_PASSWORD}
DB_ROOT_PASSWORD=${DB_ROOT_PASSWORD}
SECRETS
chmod 600 .evodactyl/secrets
echo "  ✓ docker-compose.yml (mode 600)"
echo "  ✓ .evodactyl/secrets (mode 600)"

echo
echo "▶ Building the panel image (this takes a few minutes on first run)"
docker compose build panel

echo
echo "▶ Pulling database and cache images"
docker compose pull database cache

echo
echo "▶ Starting stack"
docker compose up -d

echo
echo "▶ Waiting for the panel to become healthy"
tries=0
until docker compose exec -T panel bun -e 'fetch("http://127.0.0.1:8080/api/health").then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))' >/dev/null 2>&1; do
    tries=$((tries + 1))
    if [ "$tries" -gt 60 ]; then
        echo "  ✗ panel did not become healthy; check: docker compose logs panel"
        exit 1
    fi
    printf '.'
    sleep 2
done
echo
echo "  ✓ healthy"

echo
echo "▶ Running database migrations"
docker compose exec -T panel bun run --filter=@evodactyl/db migrate

echo
echo "▶ Seeding default nests and eggs"
docker compose exec -T panel bun run --filter=@evodactyl/api cli seed

echo
echo "▶ Creating the first admin user"
docker compose exec -T panel bun run --filter=@evodactyl/api cli user:make \
    --email="$ADMIN_EMAIL" \
    --username="$ADMIN_USERNAME" \
    --name-first="$ADMIN_FIRST" \
    --name-last="$ADMIN_LAST" \
    --password="$ADMIN_PASSWORD" \
    --admin=true

cat <<DONE

  ════════════════════════════════════════════
   ✓ Evodactyl is running

   Panel URL:    ${PANEL_URL}
   Admin login:  ${ADMIN_USERNAME}
   Install dir:  ${INSTALL_DIR}  ← git checkout (edit files here, re-run build)
   Secrets:      ${INSTALL_DIR}/.evodactyl/secrets  ← BACK THIS UP off-host

   Next steps:
     1. Put a reverse proxy (nginx/Caddy/Apache) in front of :8080 and terminate TLS.
     2. Install Wings on a node host and pair it with this panel.
     3. To update later: cd ${INSTALL_DIR} && git pull && docker compose up -d --build

   CRITICAL: APP_KEY is the encryption key for every encrypted column in the
   database. Copy ${INSTALL_DIR}/.evodactyl/secrets somewhere safe NOW.
   Losing it is unrecoverable — not even a database backup can restore encrypted data.
  ════════════════════════════════════════════

DONE
