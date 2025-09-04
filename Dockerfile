# Multi-stage Dockerfile for Cloud Run

# Build stage: install dependencies
FROM python:3.11-slim-bookworm AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Copy lock/metadata for better layer caching
COPY pyproject.toml requirements.txt ./

# Install only runtime dependencies
RUN python -m pip install --upgrade pip && \
    pip install -r requirements.txt


# Final stage: copy deps + app only
FROM python:3.11-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Copy installed site-packages and scripts from builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code
COPY agent_data/ /app/agent_data/

EXPOSE 8000

CMD ["uvicorn", "agent_data.server:app", "--host", "0.0.0.0", "--port", "8000"]
