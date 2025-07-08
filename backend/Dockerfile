FROM python:3.10-slim

# Install git + any build tools required for dependencies
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/requirements.txt ./

RUN pip install --no-cache-dir -r requirements.txt

COPY backend ./

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8080"]



