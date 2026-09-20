# Stage 1: Build React frontend
FROM node:22-alpine AS web
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Python runtime
FROM python:3.12-slim
WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=10000

# Install dependencies and pre-download spaCy model (baked in image, no runtime downloads)
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt && \
    python -m spacy download en_core_web_sm

# Copy backend application, sign library data, and compiled frontend assets
COPY backend/ backend/
COPY data/ data/
COPY --from=web /app/frontend/dist frontend/dist

EXPOSE 10000

CMD ["sh", "-c", "cd backend && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-10000}"]
