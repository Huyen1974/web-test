# =============================================================================
# Nuxt 3 SSR Server for Cloud Run
# =============================================================================
# Architecture: Builds a production SSR server that can be deployed to Cloud Run
# and proxied via Firebase Hosting for a true SSR experience.
#
# Preset: node-server (standalone Node.js server, perfect for Cloud Run)
# =============================================================================

FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9 --activate

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build for production SSR
# NITRO_PRESET=node-server creates a standalone Node.js server
ENV NITRO_PRESET=node-server
ENV NODE_ENV=production

# Build-time env vars (will be overridden at runtime)
ARG NUXT_PUBLIC_SITE_URL=https://ai.incomexsaigoncorp.vn
ARG NUXT_PUBLIC_DIRECTUS_URL=https://directus.incomexsaigoncorp.vn

RUN pnpm run build

# =============================================================================
# Production Stage
# =============================================================================
FROM node:20-alpine AS production

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nuxtjs

# Copy built output
COPY --from=builder --chown=nuxtjs:nodejs /app/.output /app/.output

USER nuxtjs

# Cloud Run uses PORT env var (default 8080)
ENV HOST=0.0.0.0
ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 8080

# Start the SSR server
CMD ["node", ".output/server/index.mjs"]
