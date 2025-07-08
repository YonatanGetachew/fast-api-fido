# Use official slim image
FROM python:3.10-slim

WORKDIR /app

# Install git for pip install from GitHub
RUN apt-get update && apt-get install -y git

# Install dependencies
COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

# Copy source code
COPY . .

# Expose port
ENV PORT=8080
EXPOSE 8080

# Start FastAPI app with uvicorn
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8080"]



