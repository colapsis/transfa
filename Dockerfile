FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

# Copy server source
COPY server/ ./server/

# Copy pre-built frontend (build before docker build, or see docker-compose.yml)
COPY frontend/dist/ ./frontend/dist/

# Copy public files (llms.txt, openapi.yaml)
COPY public/ ./public/

# Data directory for SQLite DB and uploads
RUN mkdir -p /data/uploads

# Environment defaults (override at runtime)
ENV PORT=3001 \
    BASE_URL=http://localhost:3001 \
    UPLOAD_DIR=/data/uploads \
    DB_PATH=/data/transfa.db \
    NODE_ENV=production

EXPOSE 3001

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:3001/api/auth/validate || exit 1

CMD ["node", "server/index.js"]
