# =============================================================================
# Directus Build-Time Install (Cold-Start Optimization)
# =============================================================================
# Goal: Install dependencies at build-time to eliminate runtime npm install.
# =============================================================================

# === BUILD STAGE ===
FROM node:22-alpine AS builder

WORKDIR /directus

# Install Directus dependencies at build time
COPY directus/package.json directus/package-lock.json ./
RUN npm ci --omit=dev --legacy-peer-deps

# === RUNTIME STAGE ===
FROM node:22-alpine

WORKDIR /directus

# Runtime dependencies for scripts/start.sh
RUN apk add --no-cache bash python3 curl

# Copy built node_modules and package files
COPY --from=builder /directus /directus

# Copy runtime scripts
COPY scripts/ /directus/scripts/

# Ensure start script is executable (host permissions may not carry over)
RUN chmod +x /directus/scripts/start.sh

EXPOSE 8055

CMD ["sh", "/directus/scripts/start.sh"]
