FROM python:3.10-slim

# Install git for pip installs from GitHub if needed
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy app code
COPY . .

# Expose port
EXPOSE 8080

# Run server
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8080"]
