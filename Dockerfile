FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    curl \
    && rm -rf /var/lib/apt-get/lists/*

# Copy requirements
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend /app/backend
WORKDIR /app/backend

EXPOSE 8000

CMD ["sh", "-c", "PYTHONPATH=. python scripts/seed_cards.py && PYTHONPATH=. uvicorn main:app --host 0.0.0.0 --port 8000"]
