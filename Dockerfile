# Use an official Python base image
FROM python:3.12-slim

# Install Node.js and npm (for building frontend)
RUN apt-get update && apt-get install -y curl gnupg && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y portaudio19-dev && \
    apt-get install -y nodejs git build-essential && \
    apt-get clean

# Install Hatch
RUN pip install --no-cache-dir hatch

# Set working directory
WORKDIR /app

# Copy project files
COPY pyproject.toml .
COPY LICENSE .
COPY README.md .
COPY src ./src


# Install backend environment using Hatch
RUN hatch env create

# Build frontend with Vite
WORKDIR /app/src/web
RUN npm install && npm run build

# Back to root
WORKDIR /app

# Expose port for FastAPI
EXPOSE 8000

# Start FastAPI with Hatch
CMD ["hatch", "run", "uvicorn", "aas.main:app", "--host", "0.0.0.0", "--port", "8000"]
