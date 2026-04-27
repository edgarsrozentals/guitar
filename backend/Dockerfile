FROM node:22-slim

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip python3-venv \
    ffmpeg \
    ca-certificates \
    curl \
  && rm -rf /var/lib/apt/lists/*

# Python virtualenv: yt-dlp + essentia for chord/key/tempo detection
RUN python3 -m venv /opt/venv \
  && /opt/venv/bin/pip install --no-cache-dir --upgrade pip \
  && /opt/venv/bin/pip install --no-cache-dir \
       yt-dlp \
       essentia \
       numpy \
  && ln -s /opt/venv/bin/yt-dlp /usr/local/bin/yt-dlp

WORKDIR /app

# This image is built from the *repo root* (build context = repo root) so we
# can use Yarn 4's workspace-focus to install only backend deps.
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn .yarn
COPY backend/package.json backend/package.json

RUN corepack enable \
  && yarn workspaces focus guitar-app-backend --production

COPY backend/src backend/src
COPY backend/migrations backend/migrations
COPY backend/tsconfig.json backend/tsconfig.json

# server.ts looks for the python venv at backend/../venv/bin/python (i.e. /app/venv/bin/python).
RUN mkdir -p venv/bin \
  && ln -sf /opt/venv/bin/python venv/bin/python \
  && ln -sf /opt/venv/bin/python3 venv/bin/python3

WORKDIR /app/backend

ENV NODE_ENV=production
ENV PORT=4568

EXPOSE 4568

CMD ["yarn", "start"]
