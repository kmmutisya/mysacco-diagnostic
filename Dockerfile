FROM node:20-alpine

WORKDIR /app

# Install ALL dependencies (including devDeps needed for build)
COPY package*.json ./
RUN npm ci

# Copy everything (source + pre-built dist)
# CACHE_BUST: updated per deploy to invalidate this layer
ARG CACHE_BUST=1
ENV CACHE_BUST=$CACHE_BUST
COPY . .

# Rebuild fresh from committed source
RUN npm run build

EXPOSE 5000

CMD ["node", "dist/index.cjs"]
