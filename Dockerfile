FROM node:20-alpine

WORKDIR /app

# Install production deps
COPY package*.json ./
RUN npm ci --omit=dev

# Deploy timestamp: 1776841561 — changes per deploy to bust Docker layer cache
COPY dist/ ./dist/

EXPOSE 5000

CMD ["node", "dist/index.cjs"]
