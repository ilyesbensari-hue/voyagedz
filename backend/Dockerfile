# ==========================================
# Voyage DZ - Backend Dockerfile
# ==========================================
# Multi-stage build pour optimiser la taille de l'image

# Stage 1: Base
FROM node:18-alpine AS base

# Metadata
LABEL maintainer="Voyage DZ"
LABEL description="Backend API for Voyage DZ tourism platform"

# Set working directory
WORKDIR /app

# Install SQLite dependencies (required for better-sqlite3)
RUN apk add --no-cache python3 make g++ sqlite

# ==========================================
# Stage 2: Dependencies
FROM base AS dependencies

# Copy package files
COPY package*.json ./

# Install dependencies (use install instead of ci since no package-lock)
RUN npm install --production

# ==========================================
# Stage 3: Production
FROM base AS production

# Copy node_modules from dependencies stage
COPY --from=dependencies /app/node_modules ./node_modules

# Copy application files
COPY . .

# Create directories
RUN mkdir -p uploads data

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/cities', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Initialize database on first run and start server
CMD ["sh", "-c", "if [ ! -f ./data/database.sqlite ]; then npm run init-db; fi && npm start"]
