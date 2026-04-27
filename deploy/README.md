# Production deploy: guitar.ideajetlab.com on VPS2

This directory holds the configs and recipes for deploying the guitar app to
Hetzner VPS2 (`hetzner-openclaw2`, 46.225.131.167). The app stack is:

- **Caddy** (host-level, already running) — terminates HTTPS via Let's Encrypt,
  serves the static frontend from `/var/www/guitar-app`, and reverse-proxies
  `/api/* /audio/* /stems/* /lyrics/*` to the backend.
- **Postgres 16** (Docker) — `app_users`, `app_user_api_keys`. Volume:
  `guitar_pg_data`.
- **Backend Express** (Docker) — listens on `127.0.0.1:18568`. Mounts the local
  `backend/audio`, `backend/stems`, `backend/lyrics` dirs and
  `songs-metadata.json` from `/root/guitar-app/`.

Existing services on VPS2 (OSCAR, timber, core-*, livekit-*) are NOT affected —
the guitar stack uses its own Docker network `guitar_internal` and own ports.

## One-shot deploy from a fresh checkout

These steps assume you're SSH'd in as `root` on VPS2 with the repo already at
`/root/guitar-app/`.

```bash
cd /root/guitar-app

# 1. .env: copy from example and fill secrets
cp .env.production.example .env
# Generate values for the placeholders:
echo "POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d '/+=\n')" >>/tmp/g.env
echo "JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n=')" >>/tmp/g.env
echo "APP_ENCRYPTION_KEY=$(openssl rand -hex 32)" >>/tmp/g.env
# ...then merge /tmp/g.env into .env, replacing the __GENERATE__ placeholders.
chmod 600 .env

# 2. Build and start postgres + backend
docker compose -f docker-compose.prod.yml --env-file .env up -d --build

# 3. Watch the bootstrap output and capture the printed admin password
docker logs -f guitar-backend
#   look for: [bootstrap] password: <copy this>
#   Ctrl-C once you see "Backend server running"

# 4. Build the frontend (locally on your laptop is fine, or here on the VPS)
cd /root/guitar-app
yarn install
cd product/app
NODE_ENV=production yarn build
# This produces product/app/out/  with static files.

# 5. Stage the static files for Caddy
mkdir -p /var/www/guitar-app
rsync -a --delete product/app/out/ /var/www/guitar-app/
chgrp -R www-data /var/www/guitar-app
chmod -R g+rX /var/www/guitar-app

# 6. Caddy site block
cat /root/guitar-app/deploy/Caddyfile.guitar-app >> /etc/caddy/Caddyfile
caddy fmt --overwrite /etc/caddy/Caddyfile
caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy

# 7. DNS (manual via Namecheap web UI):
#      A  guitar.ideajetlab.com  →  46.225.131.167
#    Wait for propagation (~5 min), then test:  curl -I https://guitar.ideajetlab.com/
```

## Updating after code changes

```bash
cd /root/guitar-app
git pull
docker compose -f docker-compose.prod.yml --env-file .env up -d --build backend
cd product/app && NODE_ENV=production yarn build
rsync -a --delete out/ /var/www/guitar-app/
```

(Caddy doesn't need a reload for static-file updates.)

## Migrating data from your laptop

Run this from your local checkout (not from the VPS):

```bash
# From the repo root locally
rsync -avz --progress \
  backend/audio/ \
  hetzner-openclaw2:/root/guitar-app/backend/audio/

rsync -avz --progress \
  backend/stems/ \
  hetzner-openclaw2:/root/guitar-app/backend/stems/

rsync -avz --progress \
  backend/lyrics/ \
  hetzner-openclaw2:/root/guitar-app/backend/lyrics/

rsync -avz \
  backend/songs-metadata.json \
  hetzner-openclaw2:/root/guitar-app/backend/songs-metadata.json
```

The container picks up new files immediately (volumes are bind-mounted from
the host).
