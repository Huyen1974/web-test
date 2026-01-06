FROM directus/directus:11.2.2

USER root
WORKDIR /app

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

COPY scripts ./scripts
COPY web/package.json web/pnpm-lock.yaml ./web/
COPY web/scripts ./web/scripts

RUN set -eux; \
    if command -v corepack >/dev/null 2>&1; then \
        corepack enable; \
        corepack prepare pnpm@9.6.0 --activate; \
    else \
        npm install -g pnpm@9.6.0; \
    fi; \
    cd /app/web; \
    pnpm install --frozen-lockfile

RUN chmod +x /app/scripts/start.sh /app/scripts/restore_appendix_16.sh

CMD ["/bin/sh", "./scripts/start.sh"]
