# =============================================================================
# Directus with Cold-Start Restoration (Python-only approach)
# =============================================================================
# Architecture: Uses Python scripts for schema/content restoration to avoid
# Alpine/glibc incompatibility issues with Node.js native bindings.
#
# Note: TypeScript-based restoration scripts (e1-07, e1-08, e1-11) are NOT
# included here due to platform incompatibility. They should be run via
# GitHub Actions workflow after deployment (ops-restore workflow).
# =============================================================================

FROM directus/directus:11.2.2

USER root
WORKDIR /app

# Install Python3 and curl for restoration scripts
RUN set -eux; \
    if command -v apk >/dev/null 2>&1; then \
        apk add --no-cache bash python3 curl; \
    elif command -v apt-get >/dev/null 2>&1; then \
        apt-get update && apt-get install -y --no-install-recommends bash python3 curl; \
        rm -rf /var/lib/apt/lists/*; \
    else \
        echo "Unsupported base image: no apk/apt-get available"; \
        exit 1; \
    fi

# Copy only Python-based restoration scripts (no web dependencies)
COPY scripts/directus ./scripts/directus
COPY scripts/start.sh ./scripts/start.sh

RUN chmod +x /app/scripts/start.sh

# Entrypoint runs optional restoration then starts Directus
CMD ["/bin/sh", "./scripts/start.sh"]
