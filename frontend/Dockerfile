# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Stage 1 — deps: install from the lockfile only, so this layer is cached
# until package.json / package-lock.json actually change.
# ---------------------------------------------------------------------------
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci


# ---------------------------------------------------------------------------
# Stage 2 — builder: produce the standalone server bundle.
#
# NEXT_PUBLIC_* values are inlined into the client bundle at BUILD time, so
# they must arrive as build args. Setting them only under `environment:` in
# compose would leave the browser calling the defaults below.
# ---------------------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ARG NEXT_PUBLIC_WS_URL=ws://localhost:8000
ARG NEXT_PUBLIC_GRAFANA_URL=http://localhost:3001

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL \
    NEXT_PUBLIC_GRAFANA_URL=$NEXT_PUBLIC_GRAFANA_URL \
    NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build


# ---------------------------------------------------------------------------
# Stage 3 — runner: only the traced standalone output, run as a non-root user.
# ---------------------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 --ingroup nodejs nextjs

# server.js plus the minimal node_modules Next traced as reachable.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q --spider http://127.0.0.1:3000/ || exit 1

CMD ["node", "server.js"]
