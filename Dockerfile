# Multi-stage Dockerfile for Next.js + FastAPI hybrid application
# Uses Python 3.11 and Node.js 20 (matching package.json requirements)

FROM node:20-slim AS base

# Install Python 3.11, pip, build dependencies, and curl for healthcheck
RUN apt-get update && apt-get install -y \
    python3.11 \
    python3.11-dev \
    python3.11-venv \
    python3-pip \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set up Python 3.11 as default using update-alternatives (handles existing python3 gracefully)
RUN update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 10 && \
    update-alternatives --install /usr/bin/python python /usr/bin/python3.11 10 && \
    update-alternatives --set python3 /usr/bin/python3.11 && \
    update-alternatives --set python /usr/bin/python3.11 && \
    python3.11 -m pip install --upgrade pip --break-system-packages

# Set working directory
WORKDIR /app

# Copy dependency files
COPY package.json package-lock.json ./
COPY requirements.txt ./

# Install Node.js dependencies
RUN npm ci --only=production=false

# Install Python dependencies (use --break-system-packages for container isolation)
RUN pip3 install --break-system-packages --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose ports
# 3001: Next.js dev server
# 8000: FastAPI server
EXPOSE 3001 8000

# Health check for FastAPI (checks if server is responding)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Default command runs both services via concurrently (matching npm run dev)
# FastAPI will bind to 0.0.0.0:8000 (not 127.0.0.1) for Docker networking
CMD ["npm", "run", "dev"]
